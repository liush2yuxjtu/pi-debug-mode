import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const required = [
  ['node', 'node'],
  ['npm', 'npm'],
  ['pi', '/bin/pi'],
  ['trufflehog', '/bin/trufflehog'],
];
const checks = [];

function checkBinary(name, command = name, args = ['--version']) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  const ok = !result.error && result.status === 0;
  checks.push({
    name,
    required: true,
    ok,
    version: ok ? output.trim().split('\n')[0] : '',
    detail: ok
      ? output.trim().split('\n')[0]
      : (result.error?.message ?? output.trim() ?? ('exit ' + result.status)),
  });
}

for (const [name, command] of required) checkBinary(name, command);
checkBinary(
  'tsc',
  existsSync('node_modules/.bin/tsc') ? 'node_modules/.bin/tsc' : 'tsc',
);

for (const check of checks) {
  process.stdout.write(
    '[' + (check.ok ? 'PASS' : 'FAIL') + '] ' +
      check.name + ': ' + check.detail + '\n',
  );
}

const failures = checks.filter((check) => !check.ok);
process.stdout.write(
  (failures.length === 0 ? 'PASS' : 'BLOCKED') +
    ' prerequisites: ' +
    (checks.length - failures.length) + '/' + checks.length + ' available\n',
);
if (failures.length > 0) process.exitCode = 2;
