import fs from 'fs';
import { SEED_EXAMS, SEED_SUBJECTS, SEED_TOPICS, SEED_QUESTIONS } from '../src/lib/data/seedData.ts';

for (const exam of SEED_EXAMS) {
  console.log(`\n=== Exam: ${exam.name} ===`);
  const examQuestions = SEED_QUESTIONS.filter(q => q.exam_id === exam.id);
  console.log(`Total questions for exam: ${examQuestions.length}`);

  const subs = SEED_SUBJECTS.filter(s => s.exam_id === exam.id);
  for (const sub of subs) {
    const subQ = examQuestions.filter(q => q.subject_id === sub.id);
    console.log(`  Subject "${sub.name}": ${subQ.length} questions`);
    const tops = SEED_TOPICS.filter(t => t.subject_id === sub.id);
    for (const top of tops) {
      const topQ = subQ.filter(q => q.topic_id === top.id);
      console.log(`    Topic "${top.name}": ${topQ.length} questions`);
    }
  }
}
