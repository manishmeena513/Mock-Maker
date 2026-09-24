# MockMaster — Competitive Exam Mock Test Platform

> **Authentic, High-Yield Mock Preparation for UPSC CSE, UPPSC, and SSC CGL.**
> Powered by an exact **80% Verified PYQs + 20% AI Model Questions** ratio engine.

---

## 🏛️ Platform Overview & Philosophy

MockMaster is a production-grade competitive exam preparation platform built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, and **Supabase PostgreSQL**.

Unlike conventional question banks that either recycle outdated test series or flood aspirants with hallucinated AI trivia, MockMaster adheres to strict authenticity:

1. **Authenticity Guarantee:** User mock tests strictly draw **80% genuine, verified Past Year Questions (PYQs)** with real exam years and paper citations, paired with **20% pre-approved, curriculum-aligned Model Questions**.
2. **Zero Fabricated PYQs:** AI-generated questions are strictly typed as `MODEL`, never assigned synthetic historical years, and require human administrative verification before entering student test pools.
3. **No Gamification:** Strict commitment against streaks, XP, level badges, game animations, and artificial engagement loops. The focus is exclusively on serious, disciplined exam mastery.
4. **Non-Destructive Mistake Learning:** Past test records, scores, and analytics remain immutable. Practice retests and mistake drills spin up isolated, lightweight learning sessions without corrupting historical performance.

---

## 🚀 Key Features

### Phase 1 — Core Mock Engine
- **Exam Syllabi & Dynamic Configurator:** Full syllabus coverage for UPSC CSE, UPPSC, and SSC CGL. Custom test configuration by exam, subjects, topics, question count (5 to 100), and test mode.
- **80:20 Ratio Engine:** Math-exact split `round(total * 0.8)` for PYQs and remainder for Model questions. Multi-tier fallback guarantees requested size even for narrow topic selections.
- **Answer Randomization:** Balanced 25% distribution across keys (A, B, C, D) preventing predictability.
- **Exam Mode vs Practice Mode:**
  - **Practice Mode:** Immediate rationale, concept explanations, and mistake tagging after answering each question.
  - **Exam Mode:** Simulates actual exam conditions with persistent countdown timer, question palette with accessibility symbols (not color-only), answer state preservation in localStorage, and one-way final submission.
- **Accurate Negative Marking:**
  - **UPSC CSE:** +2.0 marks correct, -0.66 wrong, 0 unattempted.
  - **UPPSC:** +1.33 marks correct, -0.44 wrong, 0 unattempted.
  - **SSC CGL:** +2.0 marks correct, -0.50 wrong, 0 unattempted.

### Phase 2 — Bulk Importer & AI Generation
- **Bulk Question Import (ZIP + CSV):** Admin can upload single CSVs or ZIP archives containing multi-nested CSVs.
  - Zip Slip & Path Traversal protection.
  - In-memory streaming (serverless safe, no disk pollution).
  - 25MB ZIP and 50MB CSV payload protection.
  - Zod row-level validation and duplicate detection against the question bank.
  - Strict integrity: all imported items start as `verification_status = 'pending'`.
- **Modular AI Question Engine:** Provider abstraction supporting Google Gemini (default) and OpenAI (stub). Prompts are grounded in authentic exam patterns with strict JSON schema validation.

### Phase 3 — Production Hardening & Advanced Experience
- **Performance Indexes:** PostgreSQL migration (`006_phase3_performance_and_indexes.sql`) covering compound indexes on `(exam_id, subject_id)`, `(verification_status, type)`, and question seen logs.
- **Server-Side Security & RLS:** `verifyAdminAuthorization` queries the `user_roles` database table server-side; client tokens are never trusted for admin actions.
- **Mistake Taxonomy Classifier:** 7 standard competitive exam mistake categories:
  `conceptual`, `factual`, `misread`, `calculation`, `guessing`, `time_pressure`, `other`.
- **Personal Revision Hub (`/revision`):** 3-tab student workspace for Saved Questions, Mistake Pool (filtered by gap category), and Weak Concepts with 1-click Retest Drills.
- **Question Bank Explorer (`/search`):** URL-synchronized server-side pagination with multi-faceted filtering. Never loads full question bank into client memory.
- **Quality Control Admin Dashboard (`/admin/dashboard`):** Real-time monitoring across 8 quality metrics: Total Questions, Approved PYQs, Pending PYQs, Approved Model, Pending Model, Rejected Items, Import Batches, and AI Activity.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5 (Strict Mode)
- **Styling:** Tailwind CSS v4
- **Database / Auth:** Supabase (PostgreSQL with Row Level Security)
- **AI SDK:** `@google/generative-ai` (Gemini 2.5 Flash)
- **Validation:** Zod 4
- **Parsing:** JSZip, PapaParse
- **Icons:** Lucide React

---

## ⚙️ Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Provider Configuration
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key

# Import Limits
IMPORT_MAX_ZIP_SIZE_MB=25
IMPORT_MAX_EXTRACTED_SIZE_MB=50
IMPORT_MAX_FILES_PER_ZIP=50
IMPORT_MAX_ROWS_PER_CSV=5000
```

> **Note on Local Development:** If Supabase credentials are placeholder or omitted, MockMaster automatically activates an in-memory fallback store populated with 512 balanced seed questions.

---

## 🧪 Automated Test Suites

MockMaster includes 4 comprehensive automated test suites covering every layer of the platform:

```bash
# Run all test suites sequentially
pnpm run test:all

# Phase 1: Core 80:20 engine, seed authenticity, marking schemes
pnpm run test:phase1

# Phase 2: ZIP/CSV parsing, Zip Slip security, duplicate detection, AI provider
pnpm run test:phase2

# 100-Question Multi-Tier Fallback & Statistical Answer Distribution
pnpm run test:100

# Phase 3: Idempotent exam submission, mistake taxonomy, revision drills, analytics
pnpm run test:phase3
```

---

## 📦 Building for Production

```bash
# Type check and build Next.js App Router application
pnpm run build

# Start the production server on port 3000
pnpm run start
```

---

## 🔒 Security & Architecture Highlights

1. **Serverless Payload Safety:** File upload endpoints enforce payload guards before extracting or buffering to prevent memory exhaustion in serverless runtimes.
2. **Double-Submit Protection:** Mock test finalization is guarded both in database state (`eq("status", "in_progress")`) and memory locks, preventing score tampering or duplicate completion timestamps.
3. **Reload-Proof Exam Timer:** Elapsed time is synchronized against `started_at` timestamp on each mount; page refreshes do not grant free time.
4. **WCAG Accessibility:** Question palette uses geometric and symbolic indicators (`✓`, `✕`, `●`, `★`, `○`) alongside high-contrast colors so color-blind aspirants have identical parity.
