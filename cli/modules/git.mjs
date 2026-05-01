import { writeFileSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { PROJECT_FOLDER, REVIEW_FOLDER, setWorktreeFolder } from './common.mjs';

const git = args => execFileSync('git', args, { cwd: PROJECT_FOLDER, encoding: 'utf8' });

export function getCurrentBranch() {
  return git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
}

export function resolveBaseBranch() {
  for (const candidate of ['main', 'master', 'develop']) {
    try {
      git(['rev-parse', '--verify', candidate]);
      return candidate;
    } catch {
      // branch doesn't exist, try next
    }
  }
  throw new Error(
    'Could not determine base branch (tried main, master, develop). Pass one explicitly as a third argument.'
  );
}

export function logCommitRange(range) {
  const log = git(['log', '--oneline', range]).trim();
  const commits = log ? log.split('\n') : [];
  console.log(`📋 Commits in range (${commits.length}):\n${commits.map(c => `  ${c}`).join('\n')}`);
}

export function saveCommitRangeDiff(range) {
  const diff = git(['diff', range]);
  const filePath = join(REVIEW_FOLDER, 'diff.txt');
  writeFileSync(filePath, diff);
  console.log(`📝 Saved range diff (${diff.length} chars)`);
  return filePath;
}

export function saveCommitRangeChangedFiles(range) {
  const files = git(['diff', '--name-only', range]).trim().split('\n').filter(Boolean);
  const filePath = join(REVIEW_FOLDER, 'changed-files.json');
  writeFileSync(filePath, JSON.stringify(files, null, 2));
  console.log(`🗂️ Saved changed files list (${files.length} files)`);
  return filePath;
}

export function saveStagedDiff() {
  const diff = git(['diff', '--cached']);
  if (diff.length === 0)
    throw new Error('No staged changes found, please stage your changes first with `git add`.');
  const filePath = join(REVIEW_FOLDER, 'diff.txt');
  writeFileSync(filePath, diff);
  console.log(`📝 Saved staged diff (${diff.length} chars)`);
  return filePath;
}

export function saveStagedChangedFiles() {
  const files = git(['diff', '--cached', '--name-only']).trim().split('\n').filter(Boolean);
  const filePath = join(REVIEW_FOLDER, 'changed-files.json');
  writeFileSync(filePath, JSON.stringify(files, null, 2));
  console.log(`🗂️ Saved staged files list (${files.length} files)`);
  return filePath;
}

export function saveCommitDiff(commitHash) {
  const diff = git(['show', commitHash]);
  const filePath = join(REVIEW_FOLDER, 'diff.txt');
  writeFileSync(filePath, diff);
  console.log(`📝 Saved commit diff (${diff.length} chars)`);
  return filePath;
}

export function saveCommitChangedFiles(commitHash) {
  const files = git(['diff-tree', '--no-commit-id', '--name-only', '-r', commitHash])
    .trim()
    .split('\n')
    .filter(Boolean);
  const filePath = join(REVIEW_FOLDER, 'changed-files.json');
  writeFileSync(filePath, JSON.stringify(files, null, 2));
  console.log(`🗂️ Saved commit files list (${files.length} files)`);
  return filePath;
}

export function saveBranchDiff(baseBranch) {
  const branch = getCurrentBranch();
  const mergeBase = git(['merge-base', branch, baseBranch]).trim();
  const diff = git(['diff', mergeBase, 'HEAD']);
  const filePath = join(REVIEW_FOLDER, 'diff.txt');
  writeFileSync(filePath, diff);
  console.log(`📝 Saved branch diff (${diff.length} chars)`);
  return filePath;
}

export function saveBranchChangedFiles(baseBranch) {
  const branch = getCurrentBranch();
  const mergeBase = git(['merge-base', branch, baseBranch]).trim();
  const files = git(['diff', '--name-only', mergeBase, 'HEAD']).trim().split('\n').filter(Boolean);
  const filePath = join(REVIEW_FOLDER, 'changed-files.json');
  writeFileSync(filePath, JSON.stringify(files, null, 2));
  console.log(`🗂️ Saved branch files list (${files.length} files)`);
  return filePath;
}

export function createWorktree(sha) {
  const worktreePath = join(REVIEW_FOLDER, 'codebase');
  console.log('🔄️ Fetching latest from remote...');
  git(['fetch']);
  console.log('🌳 Creating worktree for review...');
  git(['worktree', 'add', worktreePath, sha]);
  console.log(`🌳 Worktree created at ${worktreePath} (${sha})`);
  return worktreePath;
}

export function removeWorktree(worktreePath) {
  console.log('🌳 Removing worktree...');
  git(['worktree', 'remove', worktreePath, '--force']);
  setWorktreeFolder(null);
  console.log('🧹 Worktree removed');
}
