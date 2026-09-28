import {
  Exam,
  Subject,
  Topic,
  Question,
  QuestionType,
  DifficultyLevel,
  GitHubImportCandidate,
  GitHubDuplicateStatus,
  StructuredExplanation,
} from "@/types/database";
import { getAIProvider, ExtractedCandidateItem } from "@/lib/ai";

export const GITHUB_IMPORT_LIMITS = {
  maxFilesScanned: Number(process.env.GITHUB_IMPORT_MAX_FILES || 50),
  maxSingleFileBytes: Number(process.env.GITHUB_IMPORT_MAX_FILE_BYTES || 512 * 1024), // 512 KB
  maxTotalExtractBytes: Number(process.env.GITHUB_IMPORT_MAX_TOTAL_BYTES || 2 * 1024 * 1024), // 2 MB
  maxCandidatesPerBatch: Number(process.env.GITHUB_IMPORT_MAX_CANDIDATES || 200),
  chunkSizeChars: 8000,
  fetchTimeoutMs: 15000,
};

export const SUPPORTED_GITHUB_EXTENSIONS = [".csv", ".json", ".txt", ".md", ".markdown"] as const;

const IGNORED_PATH_SEGMENTS = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "vendor",
  ".github",
  ".vscode",
  "coverage",
  "__pycache__",
];

const IGNORED_FILENAMES = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "tsconfig.json",
  "jsconfig.json",
  "next.config.js",
  "next.config.mjs",
  "license",
  "license.md",
  "license.txt",
  "changelog.md",
  "contributing.md",
  "code_of_conduct.md",
  "security.md",
]);

const BINARY_OR_CODE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".bmp",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".dat",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".mp3",
  ".wav",
  ".avi",
  ".mov",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".pyc",
  ".java",
  ".class",
  ".jar",
  ".go",
  ".rs",
  ".c",
  ".cpp",
  ".h",
  ".cs",
  ".php",
  ".rb",
  ".swift",
  ".kt",
  ".css",
  ".scss",
  ".less",
  ".html",
  ".htm",
  ".xml",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".lock",
  ".sh",
  ".bat",
  ".ps1",
]);

export interface ValidatedGitHubRepo {
  valid: boolean;
  error?: string;
  owner?: string;
  repo?: string;
  repository?: string; // "owner/repo"
  branch?: string;
  subpath?: string;
  normalizedUrl?: string;
}

/**
 * Strict URL & SSRF Validator for GitHub Repository URLs (Section 11).
 * Only permits https://github.com/<owner>/<repo>
 * Blocks localhost, 127.0.0.1, private IPs, cloud metadata IPs, non-GitHub hosts, credentials, and path traversal.
 */
export function validateGitHubRepoUrl(
  rawUrl: string,
  inputBranch?: string | null,
  inputSubpath?: string | null
): ValidatedGitHubRepo {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) {
    return { valid: false, error: "GitHub Repository URL is required." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: "Invalid URL format. Expected https://github.com/<owner>/<repository>.",
    };
  }

  // 1. Protocol must be strictly HTTPS
  if (parsed.protocol !== "https:") {
    return {
      valid: false,
      error: "Insecure protocol rejected. Only https://github.com/<owner>/<repository> URLs are allowed.",
    };
  }

  // 2. Reject embedded credentials
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: "URLs containing embedded credentials are not allowed.",
    };
  }

  // 3. Reject custom ports
  if (parsed.port && parsed.port !== "443") {
    return {
      valid: false,
      error: "Non-standard ports are not allowed.",
    };
  }

  const host = parsed.hostname.toLowerCase();

  // 4. Explicit SSRF blocklist check (localhost, loopback, private IPv4/IPv6, metadata)
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host === "::1" ||
    host === "169.254.169.254" ||
    host === "metadata.google.internal" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  ) {
    return {
      valid: false,
      error: "SSRF protection: Private IP addresses, localhost, and internal metadata hosts are strictly forbidden.",
    };
  }

  // 5. Hostname must be strictly github.com (or www.github.com)
  if (host !== "github.com" && host !== "www.github.com") {
    return {
      valid: false,
      error: `Unsupported host "${host}". Only public repositories on github.com are allowed.`,
    };
  }

  // 6. Decode and inspect path for traversal
  let decodedPath = "";
  try {
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch {
    return { valid: false, error: "Malformed URL path encoding." };
  }

  if (
    decodedPath.includes("..") ||
    decodedPath.includes("\\") ||
    decodedPath.includes("\0")
  ) {
    return {
      valid: false,
      error: "Path traversal sequences are not allowed in repository URL.",
    };
  }

  const segments = parsed.pathname
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length < 2) {
    return {
      valid: false,
      error: "Repository URL must include both owner and repository name (e.g. https://github.com/owner/repo).",
    };
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");

  // Validate owner & repo characters
  if (!/^[a-zA-Z0-9._-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
    return {
      valid: false,
      error: "Invalid GitHub owner or repository name.",
    };
  }

  if (owner === "." || owner === ".." || repo === "." || repo === "..") {
    return {
      valid: false,
      error: "Invalid GitHub owner or repository identifier.",
    };
  }

  // Extract optional branch & subpath if URL is /owner/repo/tree/branch/subpath
  let urlBranch: string | undefined;
  let urlSubpath: string | undefined;
  if (segments.length >= 4 && (segments[2] === "tree" || segments[2] === "blob")) {
    urlBranch = segments[3];
    if (segments.length > 4) {
      urlSubpath = segments.slice(4).join("/");
    }
  }

  const branch = (inputBranch || urlBranch || "main").trim();
  if (!/^[a-zA-Z0-9._/-]+$/.test(branch) || branch.includes("..")) {
    return {
      valid: false,
      error: "Invalid branch name.",
    };
  }

  let subpath = (inputSubpath ?? urlSubpath ?? "").trim().replace(/^\/+|\/+$/g, "");
  if (subpath.includes("..") || subpath.includes("\\") || subpath.includes("\0")) {
    return {
      valid: false,
      error: "Path traversal sequences ('..') are forbidden in folder/path filter.",
    };
  }

  return {
    valid: true,
    owner,
    repo,
    repository: `${owner}/${repo}`,
    branch,
    subpath,
    normalizedUrl: `https://github.com/${owner}/${repo}`,
  };
}

export interface DiscoveredRepoFile {
  path: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  estimatedQuestions: number;
  content?: string;
}

export interface IgnoredRepoFile {
  path: string;
  reason: string;
}

export interface GitHubRepoAnalysisSummary {
  repository: string;
  branch: string;
  subpath: string;
  commitSha: string | null;
  discoveredFilesCount: number;
  supportedFilesCount: number;
  ignoredFilesCount: number;
  supportedFiles: DiscoveredRepoFile[];
  ignoredFiles: IgnoredRepoFile[];
  potentialQuestionsFound: number;
  estimatedProcessingBytes: number;
  warnings: string[];
  errors: string[];
}

/**
 * Classifies whether a repository file path is supported or should be ignored.
 */
export function classifyRepositoryFile(
  filePath: string,
  sizeBytes: number,
  subpathFilter?: string
): {
  supported: boolean;
  extension: string;
  filename: string;
  reason?: string;
} {
  const normalizedPath = filePath.replace(/^\/+/, "");
  const parts = normalizedPath.split("/");
  const filename = parts[parts.length - 1] || normalizedPath;
  const lowerFilename = filename.toLowerCase();
  const dotIdx = lowerFilename.lastIndexOf(".");
  const extension = dotIdx !== -1 ? lowerFilename.slice(dotIdx) : "";

  if (subpathFilter) {
    const cleanSub = subpathFilter.replace(/^\/+|\/+$/g, "");
    if (
      cleanSub &&
      normalizedPath !== cleanSub &&
      !normalizedPath.startsWith(`${cleanSub}/`)
    ) {
      return {
        supported: false,
        extension,
        filename,
        reason: `Outside target folder "${cleanSub}"`,
      };
    }
  }

  for (const seg of parts.slice(0, -1)) {
    if (IGNORED_PATH_SEGMENTS.includes(seg.toLowerCase()) || seg.startsWith(".")) {
      return {
        supported: false,
        extension,
        filename,
        reason: `Ignored directory (${seg})`,
      };
    }
  }

  if (IGNORED_FILENAMES.has(lowerFilename)) {
    return {
      supported: false,
      extension,
      filename,
      reason: "Repository configuration or metadata file",
    };
  }

  if (BINARY_OR_CODE_EXTENSIONS.has(extension)) {
    return {
      supported: false,
      extension,
      filename,
      reason: `Unsupported binary or code file (${extension})`,
    };
  }

  if (
    !SUPPORTED_GITHUB_EXTENSIONS.includes(
      extension as (typeof SUPPORTED_GITHUB_EXTENSIONS)[number]
    )
  ) {
    return {
      supported: false,
      extension,
      filename,
      reason: extension ? `Unsupported extension (${extension})` : "File has no extension",
    };
  }

  if (sizeBytes > GITHUB_IMPORT_LIMITS.maxSingleFileBytes) {
    return {
      supported: false,
      extension,
      filename,
      reason: `Oversized file (${(sizeBytes / 1024).toFixed(1)} KB exceeds ${(
        GITHUB_IMPORT_LIMITS.maxSingleFileBytes / 1024
      ).toFixed(0)} KB limit)`,
    };
  }

  if (sizeBytes === 0) {
    return {
      supported: false,
      extension,
      filename,
      reason: "Empty file (0 bytes)",
    };
  }

  return {
    supported: true,
    extension,
    filename,
  };
}

/**
 * Built-in curated fixture repository files for instant admin demonstration & deterministic testing.
 */
const BUILTIN_SAMPLE_REPOS: Record<
  string,
  Array<{ path: string; sizeBytes: number; content: string }>
> = {
  "mockmaster-official/upsc-ssc-question-bank": [
    {
      path: "polity/fundamental_rights_pyq.csv",
      sizeBytes: 1420,
      content: `question_text,option_a,option_b,option_c,option_d,correct_answer,explanation_why,explanation_concept,source_year,source_paper,question_type,difficulty,exam,subject,topic
"Which Article of the Constitution of India safeguards one's right to marry the person of one's choice?","Article 19","Article 21","Article 25","Article 29","B","In the Hadiya case (Shafin Jahan v. Asokan K.M., 2018), the Supreme Court held that the right to marry a person of one's choice is integral to Article 21 (Right to Life and Personal Liberty).","Article 21 — Right to Life and Personal Liberty",2019,"UPSC CSE Prelims GS Paper I","PYQ","moderate","UPSC CSE","Indian Polity","Fundamental Rights"
"Under the Indian Constitution, concentration of wealth violates which of the following?","The Right to Equality","The Directive Principles of State Policy","The Right to Freedom","The Concept of Welfare","B","Article 39(c) under the Directive Principles of State Policy (Part IV) directs the State to ensure that the operation of the economic system does not result in the concentration of wealth and means of production to the common detriment.","Directive Principles of State Policy (Article 39)",2021,"UPSC CSE Prelims GS Paper I","PYQ","easy","UPSC CSE","Indian Polity","Directive Principles"`,
    },
    {
      path: "economy/monetary_policy_questions.json",
      sizeBytes: 1380,
      content: JSON.stringify(
        {
          questions: [
            {
              question_text:
                "If the Reserve Bank of India decides to adopt an expansionist monetary policy, which of the following would it NOT do?",
              option_a: "Cut and optimize the Statutory Liquidity Ratio",
              option_b: "Increase the Marginal Standing Facility Rate",
              option_c: "Cut the Bank Rate and Repo Rate",
              option_d: "Conduct Open Market Operations to buy government securities",
              correct_answer: "B",
              explanation: {
                why: "Increasing the Marginal Standing Facility (MSF) rate makes borrowing costlier for commercial banks, which is a contractionary (tight) monetary policy measure rather than expansionist.",
                concept: "Monetary Policy Instruments of RBI",
                exam_perspective: "Frequently tested in UPSC CSE and RBI/IBPS exams.",
                remember: "Rate hike = Contractionary; Rate cut = Expansionary.",
              },
              exam: "UPSC CSE",
              subject: "Indian Economy",
              topic: "Monetary Policy & Banking",
              source_year: 2020,
              source_paper: "UPSC CSE Prelims",
              question_type: "PYQ",
              difficulty: "moderate",
            },
            {
              question_text:
                "Consider the following statements regarding the Monetary Policy Committee (MPC) in India: Which body appoints the external members of the MPC?",
              option_a: "Reserve Bank of India Governor alone",
              option_b: "Central Government on the recommendations of a Search-cum-Selection Committee",
              option_c: "Indian Banks' Association",
              option_d: "Finance Commission of India",
              correct_answer: "B",
              explanation: {
                why: "Under Section 45ZB of the RBI Act, 1934, the three external members of the 6-member Monetary Policy Committee are appointed by the Central Government based on recommendations of a Search-cum-Selection Committee headed by the Cabinet Secretary.",
                concept: "Statutory Framework of Monetary Policy Committee",
                remember: "MPC has 6 members: 3 from RBI + 3 appointed by Central Govt.",
              },
              exam: "UPSC CSE",
              subject: "Indian Economy",
              topic: "Monetary Policy & Banking",
              question_type: "MODEL",
              difficulty: "moderate",
            },
          ],
        },
        null,
        2
      ),
    },
    {
      path: "science/general_science_notes.md",
      sizeBytes: 980,
      content: `# General Science & Environment Practice MCQs

1. Which of the following organisms perform waggle dance for others of their kin to indicate the direction and the distance to a source of their food?
A) Butterflies
B) Dragonflies
C) Honeybees
D) Wasps
Answer: C
Explanation: Worker honeybees perform the figure-eight waggle dance to communicate both the direction (relative to the sun) and distance of nectar/pollen sources to hive mates.

2. Which of the following is the primary greenhouse gas emitted through human agricultural activities involving synthetic nitrogen fertilizers?
A) Nitrous Oxide (N2O)
B) Sulphur Hexafluoride (SF6)
C) Carbon Monoxide (CO)
D) Ozone (O3)
Explanation: Nitrous oxide is emitted during agricultural soil management and synthetic fertilizer application.`,
    },
    {
      path: "node_modules/pkg/index.js",
      sizeBytes: 450,
      content: "module.exports = {};",
    },
    {
      path: "assets/diagram.png",
      sizeBytes: 24500,
      content: "BINARY_IMAGE_PLACEHOLDER",
    },
  ],
};

/**
 * Safe outbound fetch strictly restricted to api.github.com and raw.githubusercontent.com
 * with redirect: "error" to prevent SSRF via open redirects.
 */
async function safeGitHubFetch(url: string): Promise<Response> {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    (parsed.hostname !== "api.github.com" &&
      parsed.hostname !== "raw.githubusercontent.com")
  ) {
    throw new Error(`Blocked outbound request to untrusted host: ${parsed.hostname}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GITHUB_IMPORT_LIMITS.fetchTimeoutMs);

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "MockMaster-Question-Importer/1.0",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
      redirect: "error",
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export function estimateQuestionCountInText(content: string, extension: string): number {
  const trimmed = content.trim();
  if (!trimmed) return 0;

  if (extension === ".csv") {
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    return Math.max(0, lines.length - 1);
  }

  if (extension === ".json") {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.length;
      if (Array.isArray(parsed?.questions)) return parsed.questions.length;
      if (Array.isArray(parsed?.data)) return parsed.data.length;
    } catch {
      return 0;
    }
  }

  // Markdown / TXT: count numbered question patterns or option A/B/C/D blocks
  const matches = trimmed.match(/(?:^|\n)\s*(?:Q?\d+[\.\)]|\*\*Q\d+)/gi);
  if (matches && matches.length > 0) return matches.length;
  const optMatches = trimmed.match(/(?:^|\n)\s*[A][\.\)]\s+/gm);
  return optMatches ? optMatches.length : 1;
}

export interface AnalyzeRepoOptions {
  repoUrl: string;
  branch?: string | null;
  subpath?: string | null;
  mockFiles?: Array<{ path: string; sizeBytes?: number; content: string }>;
}

/**
 * Step 1: Analyze GitHub Repository tree & files without writing to the question bank.
 */
export async function analyzeGitHubRepository(
  options: AnalyzeRepoOptions
): Promise<{
  valid: boolean;
  summary?: GitHubRepoAnalysisSummary;
  error?: string;
}> {
  const validation = validateGitHubRepoUrl(
    options.repoUrl,
    options.branch,
    options.subpath
  );
  if (!validation.valid || !validation.owner || !validation.repo || !validation.repository) {
    return {
      valid: false,
      error: validation.error || "Invalid GitHub repository URL.",
    };
  }

  const repository = validation.repository;
  let branch = validation.branch || "main";
  const subpath = validation.subpath || "";
  let commitSha: string | null = null;
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check if mockFiles were provided (for deterministic tests) or if it matches our built-in sample repo
  const rawTreeFiles: Array<{ path: string; sizeBytes: number; content?: string }> = [];

  if (options.mockFiles && process.env.NODE_ENV !== "production") {
    for (const f of options.mockFiles) {
      rawTreeFiles.push({
        path: f.path,
        sizeBytes: f.sizeBytes ?? Buffer.byteLength(f.content || "", "utf8"),
        content: f.content,
      });
    }
    commitSha = "test-commit-sha-7f8a9b";
  } else if (BUILTIN_SAMPLE_REPOS[repository.toLowerCase()]) {
    for (const f of BUILTIN_SAMPLE_REPOS[repository.toLowerCase()]) {
      rawTreeFiles.push({
        path: f.path,
        sizeBytes: f.sizeBytes,
        content: f.content,
      });
    }
    commitSha = "sample-sha-9e21c4b";
  } else {
    // Live GitHub API Tree inspection
    try {
      let treeRes = await safeGitHubFetch(
        `https://api.github.com/repos/${validation.owner}/${validation.repo}/git/trees/${encodeURIComponent(
          branch
        )}?recursive=1`
      );

      if (treeRes.status === 404 && branch === "main") {
        // Fallback to "master" if "main" wasn't found
        const masterRes = await safeGitHubFetch(
          `https://api.github.com/repos/${validation.owner}/${validation.repo}/git/trees/master?recursive=1`
        );
        if (masterRes.ok) {
          treeRes = masterRes;
          branch = "master";
        }
      }

      if (!treeRes.ok) {
        if (treeRes.status === 404) {
          return {
            valid: false,
            error: `GitHub repository "${repository}" (branch "${branch}") not found or is private. Only public GitHub repositories are supported.`,
          };
        }
        if (treeRes.status === 403 || treeRes.status === 429) {
          return {
            valid: false,
            error: "GitHub API rate limit reached. Please try again in a few minutes or configure GITHUB_TOKEN.",
          };
        }
        return {
          valid: false,
          error: `GitHub API returned status ${treeRes.status} while inspecting repository.`,
        };
      }

      const treeData = (await treeRes.json()) as {
        sha?: string;
        truncated?: boolean;
        tree?: Array<{ path?: string; type?: string; size?: number }>;
      };

      commitSha = treeData.sha || null;
      if (treeData.truncated) {
        warnings.push(
          "Repository contains a very large file tree; scanning is capped to the first 50 supported files."
        );
      }

      for (const item of treeData.tree || []) {
        if (item.type === "blob" && item.path) {
          rawTreeFiles.push({
            path: item.path,
            sizeBytes: typeof item.size === "number" ? item.size : 1024,
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reach GitHub API";
      return {
        valid: false,
        error: `Could not connect to GitHub repository: ${msg}`,
      };
    }
  }

  const supportedFiles: DiscoveredRepoFile[] = [];
  const ignoredFiles: IgnoredRepoFile[] = [];
  let totalEstimatedBytes = 0;

  for (const item of rawTreeFiles) {
    const classification = classifyRepositoryFile(item.path, item.sizeBytes, subpath);
    if (!classification.supported) {
      ignoredFiles.push({
        path: item.path,
        reason: classification.reason || "Ignored file",
      });
      continue;
    }

    if (supportedFiles.length >= GITHUB_IMPORT_LIMITS.maxFilesScanned) {
      ignoredFiles.push({
        path: item.path,
        reason: `Skipped: Max file scan limit (${GITHUB_IMPORT_LIMITS.maxFilesScanned} files) reached`,
      });
      continue;
    }

    if (totalEstimatedBytes + item.sizeBytes > GITHUB_IMPORT_LIMITS.maxTotalExtractBytes) {
      ignoredFiles.push({
        path: item.path,
        reason: `Skipped: Total batch processing limit (${(
          GITHUB_IMPORT_LIMITS.maxTotalExtractBytes /
          (1024 * 1024)
        ).toFixed(1)} MB) reached`,
      });
      continue;
    }

    totalEstimatedBytes += item.sizeBytes;
    const estQuestions = item.content
      ? estimateQuestionCountInText(item.content, classification.extension)
      : Math.max(1, Math.round(item.sizeBytes / 450));

    supportedFiles.push({
      path: item.path,
      filename: classification.filename,
      extension: classification.extension,
      sizeBytes: item.sizeBytes,
      estimatedQuestions: estQuestions,
      content: item.content,
    });
  }

  if (supportedFiles.length === 0) {
    warnings.push(
      "No supported question files (.csv, .json, .md, .markdown, .txt) were found in the specified repository path."
    );
  }

  const potentialQuestionsFound = supportedFiles.reduce(
    (sum, f) => sum + f.estimatedQuestions,
    0
  );

  return {
    valid: true,
    summary: {
      repository,
      branch,
      subpath,
      commitSha,
      discoveredFilesCount: rawTreeFiles.length,
      supportedFilesCount: supportedFiles.length,
      ignoredFilesCount: ignoredFiles.length,
      supportedFiles,
      ignoredFiles,
      potentialQuestionsFound,
      estimatedProcessingBytes: totalEstimatedBytes,
      warnings,
      errors,
    },
  };
}

/**
 * Normalizes question text for duplicate detection (Unicode NFKC, lowercase, punctuation stripped, whitespace collapsed).
 */
export function normalizeGitHubQuestionText(text: string): string {
  return (text || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes token Jaccard similarity between two normalized question strings (0.0 to 1.0).
 */
export function computeQuestionSimilarity(normA: string, normB: string): number {
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  const tokensA = new Set(normA.split(" ").filter((t) => t.length > 2));
  const tokensB = new Set(normB.split(" ").filter((t) => t.length > 2));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? Math.round((intersection / union) * 100) / 100 : 0;
}

/**
 * 3-Way Duplicate Detection against:
 * 1. Existing database questions
 * 2. Current import batch
 * 3. Previous GitHub import batches
 */
export function classifyCandidateDuplicate(
  normalizedText: string,
  existingDbQuestions: Array<{ id: string; norm: string }>,
  currentBatchCandidates: Array<{ id: string; norm: string }>,
  previousBatchCandidates: Array<{ id: string; norm: string }>
): {
  status: GitHubDuplicateStatus;
  matchId: string | null;
  similarity: number;
} {
  if (!normalizedText) {
    return { status: "new", matchId: null, similarity: 0 };
  }

  let highestSim = 0;
  let bestMatchId: string | null = null;

  const allPools = [
    ...existingDbQuestions,
    ...currentBatchCandidates,
    ...previousBatchCandidates,
  ];

  for (const item of allPools) {
    if (!item.norm) continue;
    if (item.norm === normalizedText) {
      return {
        status: "duplicate",
        matchId: item.id,
        similarity: 1.0,
      };
    }
    const sim = computeQuestionSimilarity(normalizedText, item.norm);
    if (sim > highestSim) {
      highestSim = sim;
      bestMatchId = item.id;
    }
  }

  if (highestSim >= 0.72) {
    return {
      status: "possible_duplicate",
      matchId: bestMatchId,
      similarity: highestSim,
    };
  }

  return {
    status: "new",
    matchId: null,
    similarity: highestSim,
  };
}

/**
 * Deterministic CSV line parser supporting quoted fields.
 */
function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeAnswerLetter(raw: unknown): "A" | "B" | "C" | "D" | null {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase();
  if (s === "A" || s === "OPTION A" || s === "(A)" || s === "1") return "A";
  if (s === "B" || s === "OPTION B" || s === "(B)" || s === "2") return "B";
  if (s === "C" || s === "OPTION C" || s === "(C)" || s === "3") return "C";
  if (s === "D" || s === "OPTION D" || s === "(D)" || s === "4") return "D";
  return null;
}

function parseValidYear(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const num = Number(raw);
  if (Number.isInteger(num) && num >= 1970 && num <= 2026) {
    return num;
  }
  return null;
}

/**
 * Extracts candidate questions from CSV content.
 */
export function extractFromCsvContent(content: string): ExtractedCandidateItem[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9_]/g, "_")
  );

  const findCol = (names: string[]) => headers.findIndex((h) => names.includes(h));

  const qIdx = findCol(["question_text", "question", "stem", "q"]);
  const aIdx = findCol(["option_a", "a", "opt_a", "choice_a"]);
  const bIdx = findCol(["option_b", "b", "opt_b", "choice_b"]);
  const cIdx = findCol(["option_c", "c", "opt_c", "choice_c"]);
  const dIdx = findCol(["option_d", "d", "opt_d", "choice_d"]);
  const ansIdx = findCol(["correct_answer", "answer", "ans", "correct_option", "key"]);
  const whyIdx = findCol(["explanation_why", "explanation", "rationale", "solution", "why"]);
  const conceptIdx = findCol(["explanation_concept", "concept"]);
  const yearIdx = findCol(["source_year", "year", "exam_year"]);
  const paperIdx = findCol(["source_paper", "paper"]);
  const typeIdx = findCol(["question_type", "type"]);
  const diffIdx = findCol(["difficulty", "level"]);
  const examIdx = findCol(["exam", "exam_name", "exam_slug"]);
  const subIdx = findCol(["subject", "subject_name", "subject_slug"]);
  const topIdx = findCol(["topic", "topic_name", "topic_slug"]);

  if (qIdx === -1) return [];

  const items: ExtractedCandidateItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i]);
    const questionText = cols[qIdx] || "";
    if (!questionText) continue;

    const ans = ansIdx !== -1 ? normalizeAnswerLetter(cols[ansIdx]) : null;
    const rawYear = yearIdx !== -1 ? parseValidYear(cols[yearIdx]) : null;
    const rawType =
      typeIdx !== -1 && String(cols[typeIdx]).toUpperCase() === "PYQ"
        ? "PYQ"
        : rawYear
        ? "PYQ"
        : "MODEL";

    const rawDiff = diffIdx !== -1 ? String(cols[diffIdx]).toLowerCase() : "moderate";
    const difficulty: DifficultyLevel =
      rawDiff === "easy" || rawDiff === "hard" ? rawDiff : "moderate";

    items.push({
      question_text: questionText,
      option_a: aIdx !== -1 ? cols[aIdx] || "" : "",
      option_b: bIdx !== -1 ? cols[bIdx] || "" : "",
      option_c: cIdx !== -1 ? cols[cIdx] || "" : "",
      option_d: dIdx !== -1 ? cols[dIdx] || "" : "",
      correct_answer: ans,
      requires_answer_verification: ans === null,
      explanation: {
        why: whyIdx !== -1 && cols[whyIdx] ? cols[whyIdx] : "",
        concept: conceptIdx !== -1 && cols[conceptIdx] ? cols[conceptIdx] : "",
      },
      exam: examIdx !== -1 ? cols[examIdx] || null : null,
      subject: subIdx !== -1 ? cols[subIdx] || null : null,
      topic: topIdx !== -1 ? cols[topIdx] || null : null,
      source_year: rawYear,
      source_paper: paperIdx !== -1 ? cols[paperIdx] || null : null,
      source_line: i + 1,
      question_type: rawType,
      difficulty,
      confidence: ans ? 0.94 : 0.65,
    });
  }

  return items;
}

/**
 * Extracts candidate questions from JSON content.
 */
export function extractFromJsonContent(content: string): ExtractedCandidateItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const obj = parsed as Record<string, unknown>;
  const rawList: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(obj?.questions)
    ? (obj.questions as unknown[])
    : Array.isArray(obj?.data)
    ? (obj.data as unknown[])
    : Array.isArray(obj?.items)
    ? (obj.items as unknown[])
    : [];

  const items: ExtractedCandidateItem[] = [];

  rawList.forEach((raw, idx) => {
    if (!raw || typeof raw !== "object") return;
    const rec = raw as Record<string, unknown>;

    const questionText = String(
      rec.question_text || rec.question || rec.stem || rec.text || ""
    ).trim();
    if (!questionText) return;

    const optsObj =
      rec.options && typeof rec.options === "object" && !Array.isArray(rec.options)
        ? (rec.options as Record<string, unknown>)
        : null;
    const optsArr = Array.isArray(rec.options) ? (rec.options as unknown[]) : null;

    const optionA = String(
      rec.option_a ?? optsObj?.A ?? optsObj?.a ?? optsArr?.[0] ?? ""
    ).trim();
    const optionB = String(
      rec.option_b ?? optsObj?.B ?? optsObj?.b ?? optsArr?.[1] ?? ""
    ).trim();
    const optionC = String(
      rec.option_c ?? optsObj?.C ?? optsObj?.c ?? optsArr?.[2] ?? ""
    ).trim();
    const optionD = String(
      rec.option_d ?? optsObj?.D ?? optsObj?.d ?? optsArr?.[3] ?? ""
    ).trim();

    let ans = normalizeAnswerLetter(
      rec.correct_answer ?? rec.answer ?? rec.correctOption ?? rec.key
    );

    // If answer was provided as the full option text, match it to A/B/C/D
    if (!ans && typeof rec.answer === "string") {
      const ansText = rec.answer.trim().toLowerCase();
      if (ansText && ansText === optionA.toLowerCase()) ans = "A";
      else if (ansText && ansText === optionB.toLowerCase()) ans = "B";
      else if (ansText && ansText === optionC.toLowerCase()) ans = "C";
      else if (ansText && ansText === optionD.toLowerCase()) ans = "D";
    }

    const sourceYear = parseValidYear(rec.source_year ?? rec.year);
    const rawType = String(rec.question_type ?? rec.type ?? "").toUpperCase();
    const questionType: QuestionType =
      rawType === "PYQ" || sourceYear !== null ? "PYQ" : "MODEL";

    const rawDiff = String(rec.difficulty || "moderate").toLowerCase();
    const difficulty: DifficultyLevel =
      rawDiff === "easy" || rawDiff === "hard" ? rawDiff : "moderate";

    let explanation: ExtractedCandidateItem["explanation"] = {
      why: "",
      concept: "",
    };
    if (typeof rec.explanation === "string") {
      explanation = { why: rec.explanation, concept: "" };
    } else if (rec.explanation && typeof rec.explanation === "object") {
      const expObj = rec.explanation as Record<string, unknown>;
      explanation = {
        why: String(expObj.why || expObj.rationale || ""),
        concept: String(expObj.concept || ""),
        exam_perspective: String(expObj.exam_perspective || ""),
        remember: String(expObj.remember || ""),
        related_concept: String(expObj.related_concept || ""),
      };
    }

    items.push({
      question_text: questionText,
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      correct_answer: ans,
      requires_answer_verification: ans === null,
      explanation,
      exam: rec.exam ? String(rec.exam) : null,
      subject: rec.subject ? String(rec.subject) : null,
      topic: rec.topic ? String(rec.topic) : null,
      source_year: sourceYear,
      source_paper: rec.source_paper ? String(rec.source_paper) : null,
      source_line: idx + 1,
      question_type: questionType,
      difficulty,
      confidence: ans ? 0.92 : 0.62,
    });
  });

  return items;
}

/**
 * Extracts candidate questions from Markdown or plain text blocks.
 */
export function extractFromMarkdownOrText(content: string): ExtractedCandidateItem[] {
  const items: ExtractedCandidateItem[] = [];
  const lines = content.split(/\r?\n/);

  let currentQ: {
    questionLines: string[];
    options: Record<"A" | "B" | "C" | "D", string>;
    answer: "A" | "B" | "C" | "D" | null;
    explanation: string;
    startLine: number;
    year: number | null;
  } | null = null;

  const flushCurrent = () => {
    if (!currentQ) return;
    const questionText = currentQ.questionLines.join(" ").trim();
    if (
      questionText.length >= 8 &&
      (currentQ.options.A || currentQ.options.B || currentQ.options.C || currentQ.options.D)
    ) {
      items.push({
        question_text: questionText,
        option_a: currentQ.options.A || "",
        option_b: currentQ.options.B || "",
        option_c: currentQ.options.C || "",
        option_d: currentQ.options.D || "",
        correct_answer: currentQ.answer,
        requires_answer_verification: currentQ.answer === null,
        explanation: {
          why: currentQ.explanation || "",
          concept: "",
        },
        source_year: currentQ.year,
        source_line: currentQ.startLine,
        question_type: currentQ.year ? "PYQ" : "MODEL",
        difficulty: "moderate",
        confidence: currentQ.answer ? 0.88 : 0.58,
      });
    }
    currentQ = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith("#")) continue;

    // Detect start of a numbered question: "1. ...", "Q1. ...", "Q1) ..."
    const qMatch = rawLine.match(/^(?:Q\s*)?(\d+)[\.\)]\s+(.+)$/i);
    if (qMatch) {
      flushCurrent();
      const qText = qMatch[2].trim();
      const yearMatch = qText.match(/\[(?:UPSC|SSC|IBPS|PYQ)?\s*(19\d\d|20[0-2]\d)\]/i);
      currentQ = {
        questionLines: [qText],
        options: { A: "", B: "", C: "", D: "" },
        answer: null,
        explanation: "",
        startLine: i + 1,
        year: yearMatch ? parseValidYear(yearMatch[1]) : null,
      };
      continue;
    }

    if (!currentQ) continue;

    // Detect Option A/B/C/D line: "A) ...", "A. ...", "(A) ...", "- A) ..."
    const optMatch = rawLine.match(/^(?:[-*]\s*)?\(?([A-Da-d])[\.\)]\s+(.+)$/);
    if (optMatch) {
      const letter = optMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
      currentQ.options[letter] = optMatch[2].trim();
      continue;
    }

    // Detect Answer line: "Answer: B", "Ans: (C)", "Correct Answer: A"
    const ansMatch = rawLine.match(/^(?:Correct\s+)?(?:Answer|Ans|Key)\s*[:\-]\s*\(?([A-Da-d])\)?/i);
    if (ansMatch) {
      currentQ.answer = normalizeAnswerLetter(ansMatch[1]);
      continue;
    }

    // Detect Explanation line: "Explanation: ...", "Solution: ...", "Why: ..."
    const expMatch = rawLine.match(/^(?:Explanation|Solution|Rationale|Why)\s*[:\-]\s*(.+)$/i);
    if (expMatch) {
      currentQ.explanation = expMatch[1].trim();
      continue;
    }

    // Append continuation line to question stem if options haven't started yet
    if (!currentQ.options.A && !currentQ.options.B) {
      currentQ.questionLines.push(rawLine);
    } else if (currentQ.explanation) {
      currentQ.explanation += " " + rawLine;
    }
  }

  flushCurrent();
  return items;
}

/**
 * Second Validation Pass (Section 14):
 * Inspects candidate completeness, distinct options, answer/explanation consistency, and PYQ provenance.
 */
export function runSecondPassValidation(candidate: {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D" | null;
  explanation: StructuredExplanation;
  question_type: QuestionType;
  source_year: number | null;
  source_paper: string | null;
  confidence: number;
}): {
  warnings: string[];
  errors: string[];
  adjustedConfidence: number;
  requiresAnswerVerification: boolean;
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  let confidence = candidate.confidence || 0.85;

  if (!candidate.question_text || candidate.question_text.trim().length < 10) {
    errors.push("Question stem is too short or incomplete (minimum 10 characters).");
    confidence = Math.min(confidence, 0.3);
  }

  const opts = [
    candidate.option_a.trim(),
    candidate.option_b.trim(),
    candidate.option_c.trim(),
    candidate.option_d.trim(),
  ];

  if (opts.some((o) => !o)) {
    errors.push("All 4 options (A, B, C, D) must be non-empty.");
    confidence = Math.min(confidence, 0.35);
  } else {
    const uniqueOpts = new Set(opts.map((o) => o.toLowerCase()));
    if (uniqueOpts.size < 4) {
      errors.push("Options A, B, C, D must be mutually distinct (duplicate options detected).");
      confidence = Math.min(confidence, 0.4);
    }
  }

  const requiresAnswerVerification = candidate.correct_answer === null;
  if (requiresAnswerVerification) {
    warnings.push(
      "Missing or unverified correct_answer — flagged as requires_answer_verification for admin review."
    );
    confidence = Math.min(confidence, 0.65);
  }

  if (!candidate.explanation?.why || candidate.explanation.why.trim().length < 10) {
    warnings.push("Explanation is brief or missing; fallback concept rationale generated.");
    confidence = Math.max(0.1, confidence - 0.08);
  }

  if (candidate.question_type === "PYQ" && !candidate.source_year && !candidate.source_paper) {
    warnings.push(
      "Candidate is marked as PYQ without explicit source_year or source_paper provenance."
    );
    confidence = Math.min(confidence, 0.75);
  }

  return {
    warnings,
    errors,
    adjustedConfidence: Math.round(Math.max(0.1, Math.min(0.99, confidence)) * 100) / 100,
    requiresAnswerVerification,
  };
}

export interface ProcessGitHubImportParams {
  repoUrl: string;
  branch?: string | null;
  subpath?: string | null;
  defaultQuestionType?: "PYQ" | "MODEL" | "AUTO";
  defaultExamId?: string | null;
  defaultSubjectId?: string | null;
  defaultTopicId?: string | null;
  batchId: string;
  existingQuestions: Question[];
  previousCandidates: GitHubImportCandidate[];
  taxonomy: {
    exams: Exam[];
    subjects: Subject[];
    topics: Topic[];
  };
  mockFiles?: Array<{ path: string; sizeBytes?: number; content: string }>;
}

/**
 * Step 2: Process GitHub Repository files with deterministic parsers + Gemini AI extraction,
 * Second-Pass Validation, and 3-Way Duplicate Detection.
 */
export async function processGitHubRepositoryImport(
  params: ProcessGitHubImportParams
): Promise<{
  valid: boolean;
  error?: string;
  summary?: GitHubRepoAnalysisSummary;
  candidates: GitHubImportCandidate[];
}> {
  const analysis = await analyzeGitHubRepository({
    repoUrl: params.repoUrl,
    branch: params.branch,
    subpath: params.subpath,
    mockFiles: params.mockFiles,
  });

  if (!analysis.valid || !analysis.summary) {
    return {
      valid: false,
      error: analysis.error || "Repository analysis failed.",
      candidates: [],
    };
  }

  const summary = analysis.summary;
  const aiProvider = getAIProvider();

  // Resolve default taxonomy objects
  const defaultExam =
    params.taxonomy.exams.find(
      (e) => e.id === params.defaultExamId || e.slug === params.defaultExamId
    ) || params.taxonomy.exams[0];

  const defaultSubject =
    params.taxonomy.subjects.find(
      (s) => s.id === params.defaultSubjectId || s.slug === params.defaultSubjectId
    ) ||
    params.taxonomy.subjects.find((s) => s.exam_id === defaultExam?.id) ||
    params.taxonomy.subjects[0];

  const defaultTopic =
    params.taxonomy.topics.find(
      (t) => t.id === params.defaultTopicId || t.slug === params.defaultTopicId
    ) ||
    params.taxonomy.topics.find((t) => t.subject_id === defaultSubject?.id) ||
    params.taxonomy.topics[0];

  // Prepare 3-way duplicate comparison pools
  const existingDbPool = params.existingQuestions.map((q) => ({
    id: q.id,
    norm: normalizeGitHubQuestionText(q.question_text),
  }));

  const previousBatchPool = params.previousCandidates
    .filter((c) => c.batch_id !== params.batchId)
    .map((c) => ({
      id: c.id,
      norm: c.normalized_question_text || normalizeGitHubQuestionText(c.question_text),
    }));

  const currentBatchPool: Array<{ id: string; norm: string }> = [];
  const candidates: GitHubImportCandidate[] = [];
  const [owner, repo] = summary.repository.split("/");

  for (const file of summary.supportedFiles) {
    if (candidates.length >= GITHUB_IMPORT_LIMITS.maxCandidatesPerBatch) {
      summary.warnings.push(
        `Reached maximum candidate extraction limit (${GITHUB_IMPORT_LIMITS.maxCandidatesPerBatch} questions per batch).`
      );
      break;
    }

    let fileContent = file.content;
    if (fileContent === undefined) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(
          summary.branch
        )}/${file.path
          .split("/")
          .map((s) => encodeURIComponent(s))
          .join("/")}`;
        const res = await safeGitHubFetch(rawUrl);
        if (!res.ok) {
          summary.warnings.push(`Could not fetch ${file.path} (HTTP ${res.status}).`);
          continue;
        }
        fileContent = await res.text();
      } catch (err) {
        summary.warnings.push(
          `Failed to read ${file.path}: ${err instanceof Error ? err.message : "Network error"}`
        );
        continue;
      }
    }

    if (!fileContent || !fileContent.trim()) {
      summary.warnings.push(`Skipped empty file: ${file.path}`);
      continue;
    }

    let rawExtracted: ExtractedCandidateItem[] = [];
    if (file.extension === ".csv") {
      rawExtracted = extractFromCsvContent(fileContent);
    } else if (file.extension === ".json") {
      rawExtracted = extractFromJsonContent(fileContent);
      if (rawExtracted.length === 0) {
        summary.errors.push(`File ${file.path} contained invalid or unrecognized JSON structure.`);
      }
    } else {
      rawExtracted = extractFromMarkdownOrText(fileContent);
    }

    // If deterministic parser found nothing or unstructured text needs Gemini AI extraction
    if (rawExtracted.length === 0 && fileContent.trim().length > 20) {
      const chunk = fileContent.slice(0, GITHUB_IMPORT_LIMITS.chunkSizeChars);
      const aiExtracted = await aiProvider.extractQuestionsFromChunk({
        content: chunk,
        filename: file.filename,
        sourcePath: file.path,
        sourceRepository: summary.repository,
        defaultExam: defaultExam?.name || null,
        defaultSubject: defaultSubject?.name || null,
        defaultTopic: defaultTopic?.name || null,
        defaultQuestionType: params.defaultQuestionType || "AUTO",
      });
      rawExtracted = aiExtracted;
    }

    for (let idx = 0; idx < rawExtracted.length; idx++) {
      if (candidates.length >= GITHUB_IMPORT_LIMITS.maxCandidatesPerBatch) break;

      const item = rawExtracted[idx];
      const questionText = (item.question_text || "").trim();
      if (!questionText) continue;

      const normalizedText = normalizeGitHubQuestionText(questionText);

      // Resolve taxonomy matching
      const matchedExam =
        (item.exam &&
          params.taxonomy.exams.find(
            (e) =>
              e.name.toLowerCase() === item.exam!.toLowerCase() ||
              e.slug.toLowerCase() === item.exam!.toLowerCase()
          )) ||
        defaultExam;

      const matchedSubject =
        (item.subject &&
          params.taxonomy.subjects.find(
            (s) =>
              s.name.toLowerCase() === item.subject!.toLowerCase() ||
              s.slug.toLowerCase() === item.subject!.toLowerCase()
          )) ||
        defaultSubject;

      const matchedTopic =
        (item.topic &&
          params.taxonomy.topics.find(
            (t) =>
              t.name.toLowerCase() === item.topic!.toLowerCase() ||
              t.slug.toLowerCase() === item.topic!.toLowerCase()
          )) ||
        defaultTopic;

      // Determine QuestionType (NEVER invent source_year)
      const explicitYear = parseValidYear(item.source_year);
      let qType: QuestionType = "MODEL";
      if (params.defaultQuestionType === "PYQ") {
        qType = "PYQ";
      } else if (params.defaultQuestionType === "MODEL") {
        qType = "MODEL";
      } else if (item.question_type === "PYQ" || explicitYear !== null) {
        qType = "PYQ";
      }

      // If MODEL, never attach a fake year
      const finalSourceYear = qType === "PYQ" ? explicitYear : null;
      const finalSourcePaper = qType === "PYQ" ? item.source_paper || null : null;

      // Build structured explanation
      const rawExp = item.explanation;
      const structuredExplanation: StructuredExplanation =
        typeof rawExp === "string"
          ? {
              why:
                rawExp.trim() ||
                `Verified explanation for ${matchedTopic?.name || "this question"}.`,
              concept: matchedTopic?.name || "Core Examination Concept",
              exam_perspective: `Relevant for ${matchedExam?.name || "Competitive Exams"}.`,
              remember: "Review the official provision and eliminate extreme distractors.",
              related_concept: matchedSubject?.name || "General Studies",
            }
          : {
              why:
                rawExp?.why?.trim() ||
                `Verified explanation for ${matchedTopic?.name || "this question"}.`,
              concept:
                rawExp?.concept?.trim() ||
                matchedTopic?.name ||
                "Core Examination Concept",
              exam_perspective:
                rawExp?.exam_perspective?.trim() ||
                `Relevant for ${matchedExam?.name || "Competitive Exams"}.`,
              remember:
                rawExp?.remember?.trim() ||
                "Verify key terms and statutory/conceptual conditions.",
              related_concept:
                rawExp?.related_concept?.trim() ||
                matchedSubject?.name ||
                "General Studies",
            };

      const candidateId = `gh-cand-${params.batchId}-${candidates.length + 1}`;
      const correctAns = normalizeAnswerLetter(item.correct_answer);

      // Second validation pass
      const validationResult = runSecondPassValidation({
        question_text: questionText,
        option_a: (item.option_a || "").trim(),
        option_b: (item.option_b || "").trim(),
        option_c: (item.option_c || "").trim(),
        option_d: (item.option_d || "").trim(),
        correct_answer: correctAns,
        explanation: structuredExplanation,
        question_type: qType,
        source_year: finalSourceYear,
        source_paper: finalSourcePaper,
        confidence: item.confidence ?? (correctAns ? 0.9 : 0.6),
      });

      // 3-Way Duplicate Detection
      const dupCheck = classifyCandidateDuplicate(
        normalizedText,
        existingDbPool,
        currentBatchPool,
        previousBatchPool
      );

      currentBatchPool.push({ id: candidateId, norm: normalizedText });

      const now = new Date().toISOString();
      const sourceUrl = `https://github.com/${summary.repository}/blob/${summary.branch}/${file.path}`;

      candidates.push({
        id: candidateId,
        batch_id: params.batchId,
        question_text: questionText,
        normalized_question_text: normalizedText,
        option_a: (item.option_a || "").trim(),
        option_b: (item.option_b || "").trim(),
        option_c: (item.option_c || "").trim(),
        option_d: (item.option_d || "").trim(),
        correct_answer: correctAns,
        requires_answer_verification: validationResult.requiresAnswerVerification,
        explanation: structuredExplanation,
        exam_id: matchedExam?.id || null,
        subject_id: matchedSubject?.id || null,
        topic_id: matchedTopic?.id || null,
        exam_name: matchedExam?.name || "UPSC CSE",
        subject_name: matchedSubject?.name || "General Studies",
        topic_name: matchedTopic?.name || "Core Syllabus",
        question_type: qType,
        difficulty: item.difficulty || "moderate",
        source_repository: summary.repository,
        source_branch: summary.branch,
        source_path: file.path,
        source_filename: file.filename,
        source_line: item.source_line || idx + 1,
        source_year: finalSourceYear,
        source_paper: finalSourcePaper,
        source_url: sourceUrl,
        source_commit: summary.commitSha,
        confidence: validationResult.adjustedConfidence,
        duplicate_status: dupCheck.status,
        duplicate_match_id: dupCheck.matchId,
        duplicate_similarity: dupCheck.similarity,
        verification_status: "pending", // ALWAYS starts as pending!
        validation_warnings: validationResult.warnings,
        validation_errors: validationResult.errors,
        promoted_question_id: null,
        created_at: now,
        updated_at: now,
      });
    }
  }

  return {
    valid: true,
    summary,
    candidates,
  };
}
