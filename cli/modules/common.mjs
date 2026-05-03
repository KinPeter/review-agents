import { homedir } from 'os';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';

const SCRIPTS_FOLDER = dirname(fileURLToPath(import.meta.url));

export const USER_HOME = homedir();
export const AGENTS_FOLDER = join(SCRIPTS_FOLDER, '..', '..', 'agents');
export const CONFIG_FILE = join(USER_HOME, '.pk-review.json');
export const PROJECT_FOLDER = process.cwd();
export const REVIEW_BASE_FOLDER = join(USER_HOME, '.pk-review');
export const VALID_MODES = ['pr', 'branch', 'commit', 'commits', 'range', 'staged'];
export const VALID_AGENTS = ['claude', 'copilot', 'kilocode', 'opencode'];
export const VALID_TOPICS = [
  'python',
  'testing',
  'security',
  'react',
  'styling',
  'nestjs',
  'js-ts',
  'ngrx',
  'express',
  'docs',
  'architecture',
  'angular',
];

export let CONFIG = {};
export let REVIEW_FOLDER = '';
export let WORKTREE_FOLDER = null;

export function setWorktreeFolder(path) {
  WORKTREE_FOLDER = path;
}

export function createReviewFolder(mode) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folderName = `${timestamp}_${mode}_${basename(PROJECT_FOLDER)}`;

  mkdirSync(REVIEW_BASE_FOLDER, { recursive: true });
  REVIEW_FOLDER = join(REVIEW_BASE_FOLDER, folderName);
  mkdirSync(REVIEW_FOLDER);

  console.log(`📁 Created review folder: ${REVIEW_FOLDER}`);
}

export function parseArgs(argv) {
  const args = argv.slice(2);
  const positionalArgs = [];
  let agent = undefined;
  let topics = undefined;
  let showHelp = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === 'help') {
      showHelp = true;
    } else if (arg.startsWith('--agent=')) {
      const value = arg.slice(8);
      if (!VALID_AGENTS.includes(value)) {
        throw new Error(`Invalid agent: ${value}. Valid agents are: ${VALID_AGENTS.join(', ')}`);
      }
      agent = value;
    } else if (arg.startsWith('--topics=')) {
      const value = arg.slice(9);
      const topicList = value
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
      const invalidTopics = topicList.filter(t => !VALID_TOPICS.includes(t));
      if (invalidTopics.length > 0) {
        throw new Error(
          `Invalid topic(s): ${invalidTopics.join(', ')}. Valid topics are: ${VALID_TOPICS.join(', ')}`
        );
      }
      topics = topicList;
    } else {
      positionalArgs.push(arg);
    }
  }

  const [arg, second] = positionalArgs;
  const mode = arg ?? 'branch';

  if (showHelp) {
    return {
      mode,
      target: undefined,
      baseBranch: undefined,
      agent: undefined,
      topics: undefined,
      showHelp: true,
    };
  }

  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Invalid mode: ${mode}. Valid modes are: ${VALID_MODES.join(', ')}`);
  }

  if (mode === 'pr' && !second) {
    throw new Error('PR mode requires a PR number as the second argument');
  }

  if (mode === 'commit' && !second) {
    throw new Error('Commit mode requires a commit hash as the second argument');
  }

  if ((mode === 'commits' && !second) || (mode === 'range' && !second)) {
    throw new Error(
      'Commits mode requires a commit range as the second argument in format "hash1..hash2"'
    );
  }

  if (
    (mode === 'commits' && !second.includes('..')) ||
    (mode === 'range' && !second.includes('..'))
  ) {
    throw new Error(
      'Commits mode requires a commit range as the second argument in format "hash1..hash2"'
    );
  }

  const target = mode === 'branch' ? undefined : second;
  const baseBranch = mode === 'branch' ? second : undefined;

  return { mode, target, baseBranch, agent, topics, showHelp };
}

export function saveContext(context) {
  const contextPath = join(REVIEW_FOLDER, 'context.json');
  writeFileSync(contextPath, JSON.stringify(context, null, 2));
  console.log(`🗃️ Context saved`);
  return contextPath;
}

export function loadConfig() {
  if (!existsSync(CONFIG_FILE)) {
    throw new Error(`Config file not found at ${CONFIG_FILE}`);
  }
  try {
    CONFIG = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse config file: ${err.message}`);
  }
}
