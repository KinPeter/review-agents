import { setupAgent } from './modules/agents.mjs';
import { createReviewFolder, loadConfig, parseArgs } from './modules/common.mjs';
import {
  processBranchReview,
  processCommitRangeReview,
  processCommitReview,
  processPrReview,
  processStagedReview,
} from './modules/review-flows.mjs';

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

main().catch(err => {
  console.error('❌ Error:', err?.message ?? err);
  process.exit(1);
});
