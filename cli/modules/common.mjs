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
export const VALID_MODES = ['pr', 'branch', 'commit', 'commits', 'staged'];

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
  const [arg, second] = argv.slice(2);
  const mode = arg ?? 'branch';

  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Invalid mode: ${mode}. Valid modes are: ${VALID_MODES.join(', ')}`);
  }

  if (mode === 'pr' && !second) {
    throw new Error('PR mode requires a PR number as the second argument');
  }

  if (mode === 'commit' && !second) {
    throw new Error('Commit mode requires a commit hash as the second argument');
  }

  if (mode === 'commits' && !second) {
    throw new Error(
      'Commits mode requires a commit range as the second argument in format "hash1..hash2"'
    );
  }

  if (mode === 'commits' && !second.includes('..')) {
    throw new Error(
      'Commits mode requires a commit range as the second argument in format "hash1..hash2"'
    );
  }

  const target = mode === 'branch' ? undefined : second;
  const baseBranch = mode === 'branch' ? second : undefined;

  return { mode, target, baseBranch };
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
