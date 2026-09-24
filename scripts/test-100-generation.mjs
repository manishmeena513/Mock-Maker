import assert from 'assert';
import { SEED_EXAMS, SEED_SUBJECTS, SEED_TOPICS, SEED_QUESTIONS } from '../src/lib/data/seedData.ts';

console.log("=== VERIFYING 100-QUESTION GENERATION & ANSWER DISTRIBUTION ===");

// 1. Replicate shuffleQuestionOptions from mock.ts
function shuffleQuestionOptions(q) {
  const options = [
    { key: "A", text: q.option_a, isCorrect: q.correct_answer === "A" },
    { key: "B", text: q.option_b, isCorrect: q.correct_answer === "B" },
    { key: "C", text: q.option_c, isCorrect: q.correct_answer === "C" },
    { key: "D", text: q.option_d, isCorrect: q.correct_answer === "D" },
  ];

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const keys = ["A", "B", "C", "D"];
  let newCorrect = "A";

  options.forEach((opt, idx) => {
    if (opt.isCorrect) {
      newCorrect = keys[idx];
    }
  });

  return {
    ...q,
    option_a: options[0].text,
    option_b: options[1].text,
    option_c: options[2].text,
    option_d: options[3].text,
    correct_answer: newCorrect,
  };
}

// 2. Replicate Multi-Tier Selection from mock.ts
function generateMockQuestions({ examSlug, topicIds, requestedTotal }) {
  const exam = SEED_EXAMS.find(e => e.slug === examSlug);
  assert(exam, `Exam not found: ${examSlug}`);

  const targetPyqCount = Math.round(requestedTotal * 0.8);
  const targetModelCount = requestedTotal - targetPyqCount;

  const usedIds = new Set();
  const selectedPyqs = [];
  const selectedModels = [];

  // Filter helper
  const filterPool = (opts) => {
    return SEED_QUESTIONS.filter(q => {
      if (opts.examId && q.exam_id !== opts.examId) return false;
      if (opts.topicIds && opts.topicIds.length > 0 && !opts.topicIds.includes(q.topic_id)) return false;
      if (opts.type && q.type !== opts.type) return false;
      return true;
    });
  };

  // Tier 1: Exact matches
  const exactPyqs = filterPool({ examId: exam.id, topicIds, type: "PYQ" });
  exactPyqs.forEach(q => {
    if (selectedPyqs.length < targetPyqCount && !usedIds.has(q.id)) {
      selectedPyqs.push(q);
      usedIds.add(q.id);
    }
  });

  const exactModels = filterPool({ examId: exam.id, topicIds, type: "MODEL" });
  exactModels.forEach(q => {
    if (selectedModels.length < targetModelCount && !usedIds.has(q.id)) {
      selectedModels.push(q);
      usedIds.add(q.id);
    }
  });

  // Tier 3: Expand to full Exam pool if short of requestedTotal
  if (selectedPyqs.length + selectedModels.length < requestedTotal) {
    const allExamPyqs = filterPool({ examId: exam.id, type: "PYQ" });
    allExamPyqs.forEach(q => {
      if (selectedPyqs.length < targetPyqCount && !usedIds.has(q.id)) {
        selectedPyqs.push(q);
        usedIds.add(q.id);
      }
    });

    const allExamModels = filterPool({ examId: exam.id, type: "MODEL" });
    allExamModels.forEach(q => {
      if (selectedModels.length + selectedPyqs.length < requestedTotal && !usedIds.has(q.id)) {
        selectedModels.push(q);
        usedIds.add(q.id);
      }
    });
  }

  // Tier 4: Fill remaining
  if (selectedPyqs.length + selectedModels.length < requestedTotal) {
    const allExamQuestions = filterPool({ examId: exam.id });
    for (const q of allExamQuestions) {
      if (selectedPyqs.length + selectedModels.length >= requestedTotal) break;
      if (!usedIds.has(q.id)) {
        if (q.type === "PYQ") selectedPyqs.push(q);
        else selectedModels.push(q);
        usedIds.add(q.id);
      }
    }
  }

  const allSelected = [...selectedPyqs, ...selectedModels];
  // Shuffle options for all questions
  const shuffled = allSelected.map(q => shuffleQuestionOptions(q));
  return shuffled;
}

// TEST 1: Request 100 questions for UPSC with single topic selected
console.log("\n[Test 1] Testing 100-Question Generation when single topic is selected...");
const singleTopicId = "t1000000-0000-0000-0000-000000000001"; // Fundamental Rights
const testQuestions = generateMockQuestions({
  examSlug: "upsc-cse",
  topicIds: [singleTopicId],
  requestedTotal: 100,
});

console.log(`- Total Questions Generated: ${testQuestions.length} (Target: 100)`);
assert.strictEqual(testQuestions.length, 100, "Must generate exactly 100 questions!");
console.log("✓ Successfully generated exactly 100 questions even when starting with a single topic!");

// TEST 2: Answer Distribution Across Generated Questions
console.log("\n[Test 2] Testing Answer Distribution across the 100 questions...");
const counts = { A: 0, B: 0, C: 0, D: 0 };
testQuestions.forEach(q => {
  counts[q.correct_answer] = (counts[q.correct_answer] || 0) + 1;
});

console.log(`- Option A: ${counts.A}% (${counts.A}/100)`);
console.log(`- Option B: ${counts.B}% (${counts.B}/100)`);
console.log(`- Option C: ${counts.C}% (${counts.C}/100)`);
console.log(`- Option D: ${counts.D}% (${counts.D}/100)`);

// Each option should be in a healthy statistical range (10% - 40% for 100-sample, centered at 25%)
assert(counts.A >= 10 && counts.A <= 40, `Option A (${counts.A}) should be balanced`);
assert(counts.B >= 10 && counts.B <= 40, `Option B (${counts.B}) should be balanced`);
assert(counts.C >= 10 && counts.C <= 40, `Option C (${counts.C}) should be balanced`);
assert(counts.D >= 10 && counts.D <= 40, `Option D (${counts.D}) should be balanced`);
console.log("✓ Options are randomized and evenly distributed across A, B, C, D (unpredictable)!");

// TEST 3: Multiple Simulations to Verify Consistent Randomization
console.log("\n[Test 3] Running 10 simulations to verify random option distribution...");
const multiCounts = { A: 0, B: 0, C: 0, D: 0 };
for (let sim = 0; sim < 10; sim++) {
  const simQuestions = generateMockQuestions({
    examSlug: "upsc-cse",
    topicIds: [singleTopicId],
    requestedTotal: 100,
  });
  simQuestions.forEach(q => {
    multiCounts[q.correct_answer]++;
  });
}
console.log(`- Total 1000 simulated questions answer distribution:`);
console.log(`  A: ${(multiCounts.A / 10).toFixed(1)}%`);
console.log(`  B: ${(multiCounts.B / 10).toFixed(1)}%`);
console.log(`  C: ${(multiCounts.C / 10).toFixed(1)}%`);
console.log(`  D: ${(multiCounts.D / 10).toFixed(1)}%`);

assert(multiCounts.A > 200 && multiCounts.A < 300, "A should be ~250 out of 1000");
assert(multiCounts.B > 200 && multiCounts.B < 300, "B should be ~250 out of 1000");
assert(multiCounts.C > 200 && multiCounts.C < 300, "C should be ~250 out of 1000");
assert(multiCounts.D > 200 && multiCounts.D < 300, "D should be ~250 out of 1000");
console.log("✓ Statistical distribution across 1000 questions is centered on ~25% per option!");

console.log("\n========================================================");
console.log(">>> ALL 100-QUESTION & ANSWER DISTRIBUTION TESTS PASSED! <<<");
console.log("========================================================");
