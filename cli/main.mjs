import {
  runClassifierAgent,
  runRecommendedAgents,
  runAgentsByNames,
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
import { fetchAndSaveJiraTicket, parseJiraTicketIdFromBranch } from './modules/jira.mjs';

async function main() {
  loadConfig();
  const { mode, target, baseBranch, agent, topics } = parseArgs(process.argv);
  setupAgent(agent);

  console.log(`🚀 Starting review in ${mode} mode${target ? ` for ${target}` : ''}`);
  createReviewFolder(mode);

  switch (mode) {
    case 'pr':
      await processPrReview(topics, target);
      break;
    case 'branch':
      await processBranchReview(topics, baseBranch);
      break;
    case 'staged':
      await processStagedReview(topics);
      break;
    case 'commits':
    case 'range':
      await processCommitRangeReview(topics, target);
      break;
    case 'commit':
      await processCommitReview(topics, target);
      break;
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}

async function processPrReview(topics, prNumber) {
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

async function processBranchReview(topics, baseBranch) {
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

async function processStagedReview(topics) {
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

async function processCommitRangeReview(topics, range) {
  console.log(`📜 Reviewing commit range: ${range}`);

  const diffFile = saveCommitRangeDiff(range);
  const changedFilesFile = saveCommitRangeChangedFiles(range);

  saveContext({ diffFile, changedFilesFile, ticketFile: null });

  if (topics?.length) {
    await reviewByTopics(topics);
  } else {
    await classifyAndReview();
  }
}

async function processCommitReview(topics, commitHash) {
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
  await summarizeAndComplete(reviews);
}

async function reviewByTopics(topics) {
  const reviews = await runAgentsByNames(topics);
  await summarizeAndComplete(reviews);
}

async function summarizeAndComplete(reviews) {
  if (reviews.length === 0) {
    console.log('⚠️ No output was produced by the agents!');
    return;
  }

  if (reviews.length > 1) {
    await runSummarizerAgent();
  }
  console.log('🎉 Review complete! Check the review folder for results.');
}

main().catch(err => {
  console.error('❌ Error:', err?.message ?? err);
  process.exit(1);
});
