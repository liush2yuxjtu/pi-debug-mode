import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = dirname(fileURLToPath(import.meta.url));
const directories = process.argv.slice(2);
if (directories.length !== 1 && directories.length !== 3) throw Error('需要一个 all 结果目录，或 train、validation、heldout 三个结果目录');
const runs = [];
const hashes = { baseline: new Set(), candidate: new Set() };
for (const directory of directories) {
  const data = JSON.parse(await readFile(join(directory, 'benchmark.json'), 'utf8'));
  const mapping = JSON.parse(await readFile(join(directory, 'mapping.json'), 'utf8'));
  if (data.infrastructureFailure) throw Error('运行故障不能生成完整基准');
  for (const row of data.runs) {
    const { identity, sha256, promptChars } = mapping[row.label];
    hashes[identity].add(sha256);
    runs.push({ ...row, identity, sha256, promptChars });
  }
}
for (const group of Object.values(hashes)) if (group.size !== 1) throw Error('跨分组提示不一致');
for (const identity of ['baseline', 'candidate']) {
  const group = runs.filter(r => r.identity === identity);
  if (group.length !== 20 || new Set(group.map(r => r.id)).size !== 20) throw Error('必须恰好覆盖20个不同用例');
}
const summary = Object.fromEntries(['baseline', 'candidate'].map(identity => {
  const group = runs.filter(r => r.identity === identity);
  return [identity, {
    passed: group.filter(r => r.passed).length, total: group.length,
    totalTokens: group.reduce((sum, r) => sum + r.tokens, 0),
    duration_ms: group.reduce((sum, r) => sum + r.duration_ms, 0),
    promptChars: group[0].promptChars,
    sha256: group[0].sha256,
    splits: Object.fromEntries(['train', 'validation', 'heldout'].map(split => [split, group.filter(r => r.split === split && r.passed).length])),
  }];
}));
const report = { version: 1, model: 'openai-codex/gpt-5.6-luna', thinking: 'minimal', fixtureOnly: true, repetitions: 1, candidateAccepted: summary.candidate.passed === 20 && summary.candidate.splits.heldout >= summary.baseline.splits.heldout, summary, runs };
await writeFile(join(root, 'benchmark.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ summary, candidateAccepted: report.candidateAccepted }, null, 2));
