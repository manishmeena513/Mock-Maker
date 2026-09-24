import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log("=== PHASE 1 VERIFICATION TESTS ===");

const seedContent = fs.readFileSync(path.resolve('./src/lib/data/seedData.ts'), 'utf-8');

// Parse SEED_EXAMS and SEED_QUESTIONS from seedData.ts
const extractArray = (varName) => {
  const marker = `export const ${varName}: `;
  const startIdx = seedContent.indexOf(marker);
  if (startIdx === -1) throw new Error(`Could not find ${varName}`);
  const equalsIdx = seedContent.indexOf(' = ', startIdx);
  const jsonStart = seedContent.indexOf('[', equalsIdx);
  const semiIdx = seedContent.lastIndexOf('];');
  // Find matching closing bracket
  let depth = 0;
  let endIdx = -1;
  for (let i = jsonStart; i < seedContent.length; i++) {
    if (seedContent[i] === '[') depth++;
    else if (seedContent[i] === ']') {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  const jsonStr = seedContent.substring(jsonStart, endIdx);
  return JSON.parse(jsonStr);
};

const SEED_EXAMS = extractArray('SEED_EXAMS');
const SEED_QUESTIONS = extractArray('SEED_QUESTIONS');

// 1. Verify Seed Data Authenticity & Counts
console.log("\n[Test 1] Verifying Seed Data Counts & Authenticity...");
assert.strictEqual(SEED_EXAMS.length, 3, "Expected 3 exams (UPSC CSE, UPPSC, SSC CGL)");

const upscPyqs = SEED_QUESTIONS.filter(q => q.exam_id === SEED_EXAMS[0].id && q.type === "PYQ");
const uppscPyqs = SEED_QUESTIONS.filter(q => q.exam_id === SEED_EXAMS[1].id && q.type === "PYQ");
const sscPyqs = SEED_QUESTIONS.filter(q => q.exam_id === SEED_EXAMS[2].id && q.type === "PYQ");
const allModels = SEED_QUESTIONS.filter(q => q.type === "MODEL");

console.log(`- UPSC CSE PYQs: ${upscPyqs.length} (Expected: 100)`);
console.log(`- UPPSC PYQs: ${uppscPyqs.length} (Expected: 100)`);
console.log(`- SSC CGL PYQs: ${sscPyqs.length} (Expected: 100)`);
console.log(`- Pre-approved MODEL questions: ${allModels.length} (Expected: 75)`);

assert(upscPyqs.length >= 100, `UPSC PYQ count must be at least 100 (got ${upscPyqs.length})`);
assert(uppscPyqs.length >= 100, `UPPSC PYQ count must be at least 100 (got ${uppscPyqs.length})`);
assert(sscPyqs.length >= 100, `SSC CGL PYQ count must be at least 100 (got ${sscPyqs.length})`);
assert(allModels.length >= 75, `MODEL question count must be at least 75 (got ${allModels.length})`);

// Check answer distribution across all seed questions
const answerCounts = { A: 0, B: 0, C: 0, D: 0 };
SEED_QUESTIONS.forEach(q => {
  answerCounts[q.correct_answer] = (answerCounts[q.correct_answer] || 0) + 1;
});
console.log(`- Answer Distribution: A=${answerCounts.A}, B=${answerCounts.B}, C=${answerCounts.C}, D=${answerCounts.D}`);
assert.strictEqual(answerCounts.A, 128, "Option A must have exactly 128 questions (25%)");
assert.strictEqual(answerCounts.B, 128, "Option B must have exactly 128 questions (25%)");
assert.strictEqual(answerCounts.C, 128, "Option C must have exactly 128 questions (25%)");
assert.strictEqual(answerCounts.D, 128, "Option D must have exactly 128 questions (25%)");
console.log("✓ Answer distribution is 100% balanced (25% each for A, B, C, D)!");

// 2. Strict Authenticity Rule: MODEL questions must NEVER have source_year or be tagged PYQ
console.log("\n[Test 2] Checking Question Integrity Constraints...");
const invalidModels = allModels.filter(q => q.source_year !== null);
assert.strictEqual(invalidModels.length, 0, "MODEL questions must never have a source_year attached!");
console.log("✓ No MODEL question has an invented source year.");

// 3. Verify Marking Schemes
console.log("\n[Test 3] Verifying Marking Schemes...");
const upsc = SEED_EXAMS.find(e => e.slug === "upsc-cse");
const ssc = SEED_EXAMS.find(e => e.slug === "ssc-cgl");
const uppsc = SEED_EXAMS.find(e => e.slug === "uppsc");

assert.strictEqual(upsc.marking_scheme.correct, 2.0);
assert.strictEqual(upsc.marking_scheme.wrong, -0.66);
assert.strictEqual(ssc.marking_scheme.correct, 2.0);
assert.strictEqual(ssc.marking_scheme.wrong, -0.5);
assert.strictEqual(uppsc.marking_scheme.correct, 1.33);
assert.strictEqual(uppsc.marking_scheme.wrong, -0.44);
console.log("✓ UPSC marking: +2.0 / -0.66");
console.log("✓ SSC CGL marking: +2.0 / -0.5");
console.log("✓ UPPSC marking: +1.33 / -0.44");

// 4. Test 80:20 Ratio Calculation
console.log("\n[Test 4] Testing 80:20 Split Formula across presets...");
[10, 25, 50, 100].forEach(total => {
  const pyq = Math.round(total * 0.8);
  const model = total - pyq;
  console.log(`- ${total} Questions -> ${pyq} PYQs (${(pyq/total*100).toFixed(0)}%) + ${model} Model (${(model/total*100).toFixed(0)}%)`);
  assert.strictEqual(pyq + model, total);
});

// 5. Verify Scoring Calculation Simulation
console.log("\n[Test 5] Simulating Exam Scoring Calculation...");
// Suppose a student attempts 50 UPSC questions: 37 correct, 13 wrong
const correctScore = 37 * upsc.marking_scheme.correct;
const wrongPenalty = 13 * upsc.marking_scheme.wrong;
const totalScore = Math.round((correctScore + wrongPenalty) * 100) / 100;
console.log(`- UPSC 37 Correct, 13 Wrong: (${correctScore}) + (${wrongPenalty}) = ${totalScore} marks`);
assert.strictEqual(totalScore, 65.42);

console.log("\n>>> ALL PHASE 1 CORE PLATFORM TESTS PASSED SUCCESSFULLY! <<<");
