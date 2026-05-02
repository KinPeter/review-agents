import { spawn } from 'child_process';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AGENTS_FOLDER, CONFIG, REVIEW_FOLDER, PROJECT_FOLDER, WORKTREE_FOLDER } from './common.mjs';

const AGENT_CONFIGS = [
  { id: 'claude', cli: 'claude', args: ['--print', '--dangerously-skip-permissions'], logName: 'Claude' },
  { id: 'kilocode', cli: 'kilo', args: ['run', '--auto'], logName: 'KiloCode' },
  { id: 'opencode', cli: 'opencode', args: ['run', '--dangerously-skip-permissions'], logName: 'OpenCode' },
  { id: 'copilot', cli: 'copilot', args: ['--yolo', '--no-ask-user', '-s'], logName: 'Copilot' },
];

function createAgentPrompt(config) {
  return (prompt) => new Promise((resolve, reject) => {
    const proc = spawn(config.cli, config.args, {
      cwd: WORKTREE_FOLDER ?? PROJECT_FOLDER,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdin.write(prompt);
    proc.stdin.end();

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    proc.on('close', code => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${config.logName} exited with code ${code}: ${stderr.trim()}`));
      }
    });
  });
}

let agentPrompt = null;

export function setupAgent(agent) {
  if (agent) {
    setAgentPrompt(agent);
    return;
  }
  if (!CONFIG.agent) {
    const defaultConfig = AGENT_CONFIGS.find(c => c.id === 'kilocode');
    agentPrompt = createAgentPrompt(defaultConfig);
    console.log('⚠️ No agent specified in config, defaulting to KiloCode');
    console.log('🤖 Agent set to: KiloCode');
    return;
  }
  setAgentPrompt(CONFIG.agent);
}

function setAgentPrompt(agent) {
  const agentConfig = AGENT_CONFIGS.find(c => c.id === agent);

  if (agentConfig) {
    agentPrompt = createAgentPrompt(agentConfig);
    console.log(`🤖 Agent set to: ${agentConfig.logName}`);
    return;
  }

  console.log(`⚠️ Unknown agent ${agent}, defaulting to KiloCode`);
  const defaultConfig = AGENT_CONFIGS.find(c => c.id === 'kilocode');
  agentPrompt = createAgentPrompt(defaultConfig);
  console.log(`🤖 Agent set to: ${defaultConfig.logName}`);
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

  return runAgentsByNames(allNames);
}

export async function runAgentsByNames(agentNames) {
  const total = agentNames.length;
  let completed = 0;

  console.log(`📋 Running ${total} agents in parallel...`);

  const promises = agentNames.map(name =>
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
