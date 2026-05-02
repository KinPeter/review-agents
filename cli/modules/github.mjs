import { execFileSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { PROJECT_FOLDER, REVIEW_FOLDER } from './common.mjs';

const gh = args => execFileSync('gh', args, { cwd: PROJECT_FOLDER, encoding: 'utf-8' });

export function checkGhCli() {
  try {
    gh(['--version']);
  } catch (e) {
    throw new Error('GitHub CLI (gh) is not installed or not in PATH');
  }

  try {
    gh(['auth', 'status']);
  } catch (e) {
    throw new Error('You are not logged in to GitHub CLI. Please run `gh auth login`');
  }

  console.log('✅ GitHub CLI is available and authenticated');
}

export function fetchPrData(prNumber) {
  const json = gh([
    'pr',
    'view',
    prNumber,
    '--json',
    'number,title,body,headRefName,headRefOid,baseRefName,files',
  ]);
  const data = JSON.parse(json);
  console.log(`🔍 PR# ${data.number}: ${data.title}`);
  return data;
}

export function savePrDiff(prNumber) {
  const diff = gh(['pr', 'diff', prNumber]);
  const filePath = join(REVIEW_FOLDER, 'diff.txt');
  writeFileSync(filePath, diff);
  console.log(`📝 Saved PR diff (${diff.length} chars)`);
  return filePath;
}

export function savePrChangedFiles(prFiles) {
  const files = prFiles.map(f => f.path);
  const filePath = join(REVIEW_FOLDER, 'changed-files.json');
  writeFileSync(filePath, JSON.stringify(files, null, 2));
  console.log(`🗂️ Saved changed files list (${files.length} files)`);
  return filePath;
}

export function fetchAndSavePrComments(prNumber) {
  const prJson = gh(['pr', 'view', prNumber, '--json', 'comments,reviews']);
  const { comments, reviews } = JSON.parse(prJson);

  const repoJson = gh(['repo', 'view', '--json', 'nameWithOwner']);
  const { nameWithOwner } = JSON.parse(repoJson);
  const inlineJson = gh(['api', `repos/${nameWithOwner}/pulls/${prNumber}/comments`, '--paginate']);
  const inlineComments = JSON.parse(inlineJson);

  const conversationCount = comments?.length ?? 0;
  const reviewCount = reviews?.length ?? 0;
  const inlineCommentCount = inlineComments?.length ?? 0;
  const totalCount = conversationCount + reviewCount + inlineCommentCount;

  if (totalCount === 0) {
    console.log('✅ No comments found on PR');
    return null;
  }

  const filePath = join(REVIEW_FOLDER, 'comments.json');
  writeFileSync(filePath, JSON.stringify({ comments, reviews, inlineComments }, null, 2));
  console.log(`💬 Saved PR comments (${totalCount} comments)`);
  return filePath;
}

export function parseJiraTicketIdFromPr(prTitle, headRefName) {
  for (const source of [prTitle, headRefName]) {
    const match = source?.match(/([A-Z]+-\d+)/);
    if (match) return match[1];
  }
  return null;
}
