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

export function createReviewFolder(mode) {}

export function parseArgs(argv) {}

export function saveContext(context) {}

export function loadConfig() {}
