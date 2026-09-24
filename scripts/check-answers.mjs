import fs from 'fs';
const content = fs.readFileSync('src/lib/data/seedData.ts', 'utf8');
const counts = { A: 0, B: 0, C: 0, D: 0 };
const re = /"correct_answer":\s*"([ABCD])"/g;
let match;
while ((match = re.exec(content)) !== null) {
  counts[match[1]]++;
}
console.log('Answer distribution in seed data:', counts);
