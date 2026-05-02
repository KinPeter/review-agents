import {
  runClassifierAgent,
  runRecommendedAgents,
  runSummarizerAgent,
  setupAgent,
} from './modules/agents.mjs';
import { createReviewFolder, loadConfig, parseArgs, saveContext } from './modules/common.mjs';
import {
  createWorktree,
  removeWorktree,
  resolveBaseBranch,
  saveBranchDiff,
  saveCommitDiff,
  saveCommitRangeDiff,
  saveStagedDiff,
  saveBranchChangedFiles,
  saveCommitChangedFiles,
  saveCommitRangeChangedFiles,
  saveStagedChangedFiles,
} from './modules/git.mjs';
import {
  checkGhCli,
  fetchPrData,
  fetchAndSavePrComments,
  parseJiraTicketIdFromPr,
  savePrChangedFiles,
  savePrDiff,
} from './modules/github.mjs';
import { fetchAndSaveJiraTicket } from './modules/jira.mjs';

async function main() {
  loadConfig();
  setupAgent();
  const { mode, target, baseBranch } = parseArgs(process.argv);
  console.log(`🚀 Starting review in ${mode} mode${target ? ` for ${target}` : ''}`);
  createReviewFolder(mode);

  switch (mode) {
    case 'pr':
      await processPrReview(target);
      break;
    case 'branch':
      await processBranchReview(baseBranch);
      break;
    case 'staged':
      await processStagedReview();
      break;
    case 'range':
      await processCommitRangeReview(target);
      break;
    case 'commit':
      await processCommitReview(target);
      break;
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}

async function processPrReview(prNumber) {
  checkGhCli();
  console.log(`🔍 Reviewing PR #${prNumber}...`);

  const prData = fetchPrData(prNumber);
  const diffFile = savePrDiff(prNumber);
  const changedFilesFile = savePrChangedFiles(prData.files);

  const ticketId = parseJiraTicketIdFromPr(prData.title, prData.headRefName);
  const ticketFile = await fetchAndSaveJiraTicket(ticketId);
  const commentsFile = await fetchAndSavePrComments(prNumber);

  saveContext({ diffFile, changedFilesFile, ticketFile });

  const worktreePath = createWorktree(prData.headRefOid);

  try {
    await classifyAndReview(ticketFile, commentsFile);
  } finally {
    removeWorktree(worktreePath);
  }
}

async function processBranchReview(baseBranch) {
  const resolvedBase = baseBranch ?? resolveBaseBranch();
  console.log(`🌿 Base branch: ${resolvedBase}`);

  const diffFile = saveBranchDiff(resolvedBase);
  const changedFilesFile = saveBranchChangedFiles(resolvedBase);

  const ticketId = parseJiraTicketIdFromBranch();
  const ticketFile = await fetchAndSaveJiraTicket(ticketId);

  saveContext({ diffFile, changedFilesFile, ticketFile });

  await classifyAndReview();
}

async function processStagedReview() {
  console.log('📦 Reviewing staged changes...');

  const diffFile = saveStagedDiff();
  const changedFilesFile = saveStagedChangedFiles();

  saveContext({ diffFile, changedFilesFile, ticketFile: null });

  await classifyAndReview();
}

async function processCommitRangeReview(range) {
  console.log(`📜 Reviewing commit range: ${range}`);

  const diffFile = saveCommitRangeDiff(range);
  const changedFilesFile = saveCommitRangeChangedFiles(range);

  saveContext({ diffFile, changedFilesFile, ticketFile: null });

  await classifyAndReview();
}

async function processCommitReview(commitHash) {
  console.log(`📜 Reviewing commit: ${commitHash}`);

  const diffFile = saveCommitDiff(commitHash);
  const changedFilesFile = saveCommitChangedFiles(commitHash);

  saveContext({ diffFile, changedFilesFile, ticketFile: null });

  await classifyAndReview();
}

async function classifyAndReview(ticketFile = null, commentsFile = null) {
  const recommendedAgentNames = await runClassifierAgent();
  const reviews = await runRecommendedAgents(recommendedAgentNames, ticketFile, commentsFile);

  if (reviews.length === 0) {
    console.log('⚠️ No output was produced by the agents!');
    return;
  }

  await runSummarizerAgent();
  console.log('🎉 Review complete! Check the review folder for results.');
}

main().catch(err => {
  console.error('❌ Error:', err?.message ?? err);
  process.exit(1);
});
