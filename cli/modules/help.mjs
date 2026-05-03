import { VALID_MODES, VALID_AGENTS, VALID_TOPICS } from './common.mjs';

const MODE_DESCRIPTIONS = {
  pr: 'Review a PR by number',
  branch: 'Review current branch against a base branch (default: main/master)',
  commit: 'Review a specific commit',
  commits: 'Review a commit range (hash1..hash2)',
  range: 'Alias for commits mode',
  staged: 'Review staged changes only',
  help: 'Show this help message',
};

const MODE_EXAMPLES = {
  pr: 'review pr 123',
  branch: 'review branch main',
  commit: 'review commit abc123',
  commits: 'review commits abc123..def456',
  staged: 'review staged',
};

export function showHelp() {
  const modeRows = VALID_MODES.filter(m => m !== 'help').map(m => {
    const usage = getModeUsage(m);
    const modeStr = `  ${m} ${usage}`;
    return { modeStr, desc: MODE_DESCRIPTIONS[m] };
  });

  const maxModeLen = Math.max(...modeRows.map(r => r.modeStr.length));

  console.log(
    `
🤖 PK Review Tool - AI-Powered Code Review Assistant

🚀 Usage: review [mode] [target] [options]

🔍 Modes:
${modeRows.map(r => `${r.modeStr.padEnd(maxModeLen)} - ${r.desc}`).join('\n')}
  help                 - Show this help message

⚙️ Options:
  --agent=<name>       - AI agent (${VALID_AGENTS.join(', ')})
  --topics=<list>      - Focus areas (comma-separated)

📌 Available topics:
  ${VALID_TOPICS.join(', ')}

💡 Examples:
  review pr 123
  review branch main
  review commit abc123
  review commits abc123..def456
  review staged
  review branch feature origin/main
  review --agent=claude --topics=python,security pr 123
`.trim()
  );
}

function getModeUsage(mode) {
  switch (mode) {
    case 'pr':
      return '<number>';
    case 'branch':
      return '[base-branch]';
    case 'commit':
      return '<hash>';
    case 'commits':
    case 'range':
      return '<range>';
    case 'staged':
      return '';
    default:
      return '';
  }
}
