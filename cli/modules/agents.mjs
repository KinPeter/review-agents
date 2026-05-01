import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AGENTS_FOLDER, CONFIG, REVIEW_FOLDER } from './common.mjs';
import { claudePrompt } from './claude.mjs';
import { kiloPrompt } from './kilocode.mjs';

let agentPrompt = null;

export function setupAgent() {
  if (!CONFIG.agent) {
    console.log('⚠️ No agent specified in config, defaulting to Claude');
    agentPrompt = claudePrompt;
    console.log('🤖 Agent set to: Claude');
    return;
  }

  switch (CONFIG.agent) {
    case 'claude':
      agentPrompt = claudePrompt;
      console.log('🤖 Agent set to: Claude');
      break;
    case 'kilocode':
      agentPrompt = kiloPrompt;
      console.log('🤖 Agent set to: KiloCode');
      break;
    case 'opencode':
      console.log('⚠️ OpenCode agent not yet implemented, defaulting to Claude');
      agentPrompt = claudePrompt;
      break;
    case 'copilot':
      console.log('⚠️ Copilot agent not yet implemented, defaulting to Claude');
      agentPrompt = claudePrompt;
      break;
    default:
      console.log(`⚠️ Unknown agent ${CONFIG.agent}, defaulting to Claude`);
      agentPrompt = claudePrompt;
      console.log('🤖 Agent set to: Claude');
  }
}

export async function runClassifierAgent() {
  const template = readFileSync(join(AGENTS_FOLDER, 'review-classifier.md'), 'utf8');
  const prompt = template.replaceAll('{{REVIEW_FOLDER}}', REVIEW_FOLDER);
  console.log('🤖 Running classifier agent...');
  const output = await agentPrompt(prompt);
  return parseAgentList(output);
}

function parseAgentList(output) {
  const match = output.match(/AGENTS_START\s*([\s\S]*?)\s*AGENTS_END/);
  if (!match) {
    throw new Error('Classifier agent did not return a valid list of agents');
  }
  return JSON.parse(match[1]);
}

export async function runRecommendedAgents(agentNames, ticketFile, commentsFile) {
  const allNames = [
    ...agentNames,
    ...(ticketFile ? ['jira-validator'] : []),
    ...(commentsFile ? ['pr-comments'] : []),
  ];
  const total = allNames.length;
  let completed = 0;

  console.log(`📋 Running ${total} agents in parallel...`);

  const promises = allNames.map(name =>
    runAgentByName(name).then(result => {
      completed++;
      console.log(`✅ ${completed}/${total} agents finished (${name})`);
      return result;
    })
  );

  return Promise.all(promises);
}

async function runAgentByName(agentName) {
  const templatePath = join(AGENTS_FOLDER, `review-${agentName}.md`);
  if (!existsSync(templatePath)) {
    console.log(`⚠️ Agent template not found for ${agentName}, skipping`);
    return null;
  }

  const template = readFileSync(templatePath, 'utf8');
  const prompt = template.replaceAll('{{REVIEW_FOLDER}}', REVIEW_FOLDER);
  console.log(`🤖 Running agent: ${agentName}...`);
  const output = await agentPrompt(prompt);

  const outputPath = join(REVIEW_FOLDER, `output-${agentName}.md`);
  writeFileSync(outputPath, output);
  console.log(`📝 Saved ${agentName} agent output to ${outputPath}`);

  return { agentName, outputPath };
}

export async function runSummarizerAgent() {
  const template = readFileSync(join(AGENTS_FOLDER, 'review-summarizer.md'), 'utf8');
  const prompt = template.replaceAll('{{REVIEW_FOLDER}}', REVIEW_FOLDER);
  console.log('🤖 Running summarizer agent...');
  const output = await agentPrompt(prompt);

  const outputPath = join(REVIEW_FOLDER, 'review-summary.md');
  writeFileSync(outputPath, output);
  console.log(`📝 Saved summary to ${outputPath}`);
  return outputPath;
}
