import { spawn } from 'child_process';
import { PROJECT_FOLDER, WORKTREE_FOLDER } from './common.mjs';

export function opencodePrompt(prompt) {
  return new Promise((resolve, reject) => {
    const proc = spawn('opencode', ['run', '--dangerously-skip-permissions'], {
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
        reject(new Error(`OpenCode exited with code ${code}: ${stderr.trim()}`));
      }
    });
  });
}
