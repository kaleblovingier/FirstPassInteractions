// Fast, offline guard against accidentally committing common credential formats.
// This complements (and does not replace) GitHub secret scanning / provider rotation.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const patterns = [
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b/g],
  ['Stripe live secret', /\bsk_live_[A-Za-z0-9]{16,}\b/g],
  ['OpenAI API key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g],
  ['Private key material', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
];
const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const excluded = /^(?:data|artifacts|screenshots|\.snapshots|node_modules|\.git)\//;
const textExtensions = /(?:\.(?:js|mjs|cjs|jsx|ts|tsx|json|yaml|yml|toml|env|sh|html)|^\.env(?:\.|$))$/i;
let scanned = 0;
let failed = 0;
for (const path of paths) {
  if (excluded.test(path) || !textExtensions.test(path)) continue;
  if (statSync(path).size > 1024 * 1024) continue;
  const contents = readFileSync(path, 'utf8');
  scanned += 1;
  for (const [name, re] of patterns) {
    re.lastIndex = 0;
    for (const match of contents.matchAll(re)) {
      const line = contents.slice(0, match.index).split('\n').length;
      console.error('::error file=' + path + ',line=' + line + '::Potential ' + name + ' detected; rotate if real.');
      failed += 1;
    }
  }
}
console.log('Secret pattern check inspected ' + scanned + ' tracked text files; ' + failed + ' alerts.');
if (failed) process.exitCode = 1;
