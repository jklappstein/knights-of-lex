import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');

const suites = {
  focus: ['validate:no-phaser-in-authority', 'validate:gameplay-rng'],
  'agent-gates': ['validate:no-phaser-in-authority', 'validate:gameplay-rng', 'validate:no-any'],
};

const validators = {
  'validate:no-phaser-in-authority': validateNoPhaserInAuthority,
  'validate:gameplay-rng': validateGameplayRng,
  'validate:no-any': validateNoAny,
};

function walkDir(dir, extensions) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
      results.push(...walkDir(full, extensions));
    } else if (stat.isFile() && extensions.some((ext) => entry.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

function validateNoPhaserInAuthority() {
  const packages = ['sim', 'content-runtime', 'content-schema', 'lexicon-runtime', 'shared-types', 'test-support'];
  let failed = false;

  for (const pkg of packages) {
    const srcDir = join(root, 'packages', pkg, 'src');
    try {
      const files = walkDir(srcDir, ['.ts']);
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (content.includes('phaser') || content.includes('Phaser')) {
          console.error(`FAIL: Phaser import in authority package: ${relative(root, file)}`);
          failed = true;
        }
      }
    } catch {
      // package may not exist yet
    }
  }
  return !failed;
}

function validateGameplayRng() {
  const packages = ['sim'];
  let failed = false;

  for (const pkg of packages) {
    const srcDir = join(root, 'packages', pkg, 'src');
    try {
      const files = walkDir(srcDir, ['.ts']);
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (content.includes('Math.random()')) {
          console.error(`FAIL: Math.random() in authority package: ${relative(root, file)}`);
          failed = true;
        }
      }
    } catch {
      // skip
    }
  }
  return !failed;
}

function validateNoAny() {
  const dirs = [join(root, 'packages'), join(root, 'apps')];
  let failed = false;
  const anyPattern = /:\s*any\b|as\s+any\b|<any>|Array<any>/;

  for (const dir of dirs) {
    try {
      const files = walkDir(dir, ['.ts']);
      for (const file of files) {
        if (file.includes('.test.')) continue;
        const content = readFileSync(file, 'utf-8');
        if (anyPattern.test(content)) {
          console.error(`FAIL: any usage detected: ${relative(root, file)}`);
          failed = true;
        }
      }
    } catch {
      // skip
    }
  }
  return !failed;
}

const suiteName = process.argv[2] ?? 'focus';
const suite = suites[suiteName];

if (!suite) {
  console.error(`Unknown suite: ${suiteName}`);
  process.exit(1);
}

let allPassed = true;
for (const validator of suite) {
  const fn = validators[validator];
  if (!fn) {
    console.error(`Unknown validator: ${validator}`);
    allPassed = false;
    continue;
  }
  const passed = fn();
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${validator}`);
  if (!passed) allPassed = false;
}

process.exit(allPassed ? 0 : 1);
