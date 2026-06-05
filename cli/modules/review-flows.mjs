import {
  runClassifierAgent,
  runRecommendedAgents,
  runAgentsByNames,
  runSummarizerAgent,
  runReconcilerAgent,
} from './agents.mjs';
import { saveContext } from './common.mjs';
import {
  createWorktree,
  logCommitRange,
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
} from './git.mjs';
import {
  checkGhCli,
  fetchPrData,
  fetchAndSavePrComments,
  parseJiraTicketIdFromPr,
  savePrChangedFiles,
  savePrDiff,
} from './github.mjs';
import { fetchAndSaveJiraTicket, parseJiraTicketIdFromBranch } from './jira.mjs';

export async function processPrReview(topics, prNumber) {
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
    if (topics?.length) {
      await reviewByTopics(topics);
    } else {
      await classifyAndReview(ticketFile, commentsFile);
    }
  } finally {
    removeWorktree(worktreePath);
  }
}

export async function processBranchReview(topics, baseBranch) {
  const resolvedBase = baseBranch ?? resolveBaseBranch();
  console.log(`🌿 Base branch: ${resolvedBase}`);

  const diffFile = saveBranchDiff(resolvedBase);
  const changedFilesFile = saveBranchChangedFiles(resolvedBase);

  const ticketId = parseJiraTicketIdFromBranch();
  const ticketFile = await fetchAndSaveJiraTicket(ticketId);

  saveContext({ diffFile, changedFilesFile, ticketFile });

  if (topics?.length) {
    await reviewByTopics(topics);
  } else {
    await classifyAndReview(ticketFile);
  }
}

export async function processStagedReview(topics) {
  console.log('📦 Reviewing staged changes...');

  const diffFile = saveStagedDiff();
  const changedFilesFile = saveStagedChangedFiles();

  saveContext({ diffFile, changedFilesFile, ticketFile: null });

  if (topics?.length) {
    await reviewByTopics(topics);
  } else {
    await classifyAndReview();
  }
}

export async function processCommitRangeReview(topics, range) {
  console.log(`📜 Reviewing commit range: ${range}`);

  logCommitRange(range);
  const diffFile = saveCommitRangeDiff(range);
  const changedFilesFile = saveCommitRangeChangedFiles(range);

  saveContext({ diffFile, changedFilesFile, ticketFile: null });

  if (topics?.length) {
    await reviewByTopics(topics);
  } else {
    await classifyAndReview();
  }
}

export async function processCommitReview(topics, commitHash) {
  console.log(`📜 Reviewing commit: ${commitHash}`);

  const diffFile = saveCommitDiff(commitHash);
  const changedFilesFile = saveCommitChangedFiles(commitHash);

  saveContext({ diffFile, changedFilesFile, ticketFile: null });

  if (topics?.length) {
    await reviewByTopics(topics);
  } else {
    await classifyAndReview();
  }
}

async function classifyAndReview(ticketFile = null, commentsFile = null) {
  const recommendedAgentNames = await runClassifierAgent();
  const reviews = await runRecommendedAgents(recommendedAgentNames, ticketFile, commentsFile);
  await summarizeAndComplete(reviews, commentsFile);
}

async function reviewByTopics(topics) {
  const reviews = await runAgentsByNames(topics);
  await summarizeAndComplete(reviews);
}

async function summarizeAndComplete(reviews, commentsFile = null) {
  if (reviews.length === 0) {
    console.log('⚠️ No output was produced by the agents!');
    return;
  }

  if (reviews.length > 1) {
    await runSummarizerAgent();
  }

  if (commentsFile) {
    await runReconcilerAgent();
  }

  console.log('🎉 Review complete! Check the review folder for results.');
}
