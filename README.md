# PK Review Agents CLI

An AI-powered code review CLI that leverages specialized review agents to analyze code changes across multiple dimensions.

## Overview

PK Review Agents CLI automates code reviews by running targeted subagents based on the types of files and changes in your PR, branch, or commits. It uses AI CLI agents to perform the actual review work and aggregates results into a comprehensive summary.

## Supported AI CLI Agents

The CLI supports 4 different AI agents for performing reviews:

- **Copilot** - GitHub Copilot CLI
- **Claude** - Anthropic's Claude CLI
- **KiloCode** - KiloCode CLI
- **OpenCode** - OpenCode CLI

## Modes

The CLI supports multiple review modes:

| Mode                | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `pr`                | Review a PR by number                                              |
| `branch`            | Review current branch against a base branch (default: main/master) |
| `commit`            | Review a specific commit                                           |
| `commits` / `range` | Review a commit range (hash1..hash2)                               |
| `staged`            | Review staged changes only                                         |

## Review Subagents

The CLI uses a classifier to automatically determine which specialized review agents to run based on your code changes. Available subagents:

| Agent          | Focus Area                                                   |
| -------------- | ------------------------------------------------------------ |
| `js-ts`        | JavaScript and TypeScript code quality, smells and pitfalls  |
| `angular`      | Angular framework patterns, best practices and anti-patterns |
| `ngrx`         | NgRx state management patterns and correctness               |
| `react`        | React library patterns, best practices and anti-patterns     |
| `testing`      | Unit, integration or E2E tests with any framework            |
| `styling`      | CSS/SCSS design system compliance and accessibility          |
| `nestjs`       | NestJS backend framework patterns and best practices         |
| `express`      | Express/Node.js backend patterns                             |
| `python`       | Python language code quality and pitfalls                    |
| `docs`         | Documentation changes, freshness and code comments           |
| `security`     | Security vulnerabilities, secrets and OWASP top 10 risks     |
| `architecture` | Overall architecture, layering and design patterns           |

### Pipeline Agents

These agents run automatically as part of the review pipeline — they aren't triggered by the classifier but orchestrate the overall review flow:

| Agent            | Role                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------- |
| `classifier`     | Analyzes the diff and determines which review agents to run                             |
| `jira-validator` | Validates PR changes against Jira ticket acceptance criteria                            |
| `pr-comments`    | Reviews and categorizes existing PR comments                                            |
| `summarizer`     | Aggregates all agent outputs into a unified review summary                              |
| `reconciler`     | Cross-references the review summary against PR comments to produce a reconciled summary |

## Review Pipeline

The review process follows a multi-stage pipeline:

1. **Classification** — The classifier analyzes the diff and changed files to determine which specialized review agents are needed.
2. **Review** — The recommended agents run in parallel, each producing an `output-{agent}.md` file.
3. **Summarization** — The summarizer aggregates all individual agent outputs into a single `review-summary.md`.
4. **Reconciliation** _(PR reviews only)_ — If the review has associated PR comments (from human reviewers or bot reviewers), the reconciler cross-references the summary against the comments. It removes findings that have been resolved, emphasizes critical issues raised by other reviewers, demotes minor preferences, and produces a reconciled `review-reconciliation.md`.

## Installation

1. Clone or download this repository
2. Create the config file (see Configuration section)
3. Run the CLI:

```bash
node /path/to/review-agents/cli/main.mjs <args>
```

The CLI only uses basic Node.js features and doesn't require any additional dependencies.

**Tip:** Add a shell alias for convenience:

```bash
alias review="node /path/to/review-agents/cli/main.mjs"
```

Add this to your `~/.bashrc`, `~/.zshrc`, or equivalent shell config file.

### Requirements

- Node.js 18+
- One of the supported AI CLI agents installed and in PATH
- Git
- GitHub CLI installed and authenticated (for PR reviews)
- JIRA credentials configured (for Jira ticket validation)

## Usage

```bash
review pr 123
review branch main
review branch feature origin/main
review commit abc123
review commits abc123..def456
review staged
```

### Options

- `--agent=<name>` - Choose AI agent (claude, copilot, kilocode, opencode)
- `--topics=<list>` - Focus on specific topics (comma-separated)

### Examples

```bash
# Review PR using the configured default agent
review pr 123

# Review branch using Claude
review branch main --agent=claude

# Review with specific topics only
review staged --topics=python,security
```

## Configuration

Create a `~/.pk-review.json` config file:

```json
{
  "agent": "opencode",
  "jiraBaseUrl": "https://your-org.atlassian.net",
  "jiraEmail": "your-name@gmail.com",
  "jiraApiToken": "your-jira-api-token"
}
```

## Output Files

All review outputs are stored in `~/.pk-review/`. Each review session creates a new folder with the naming format:

```
{timestamp}_{mode}_{project-name}
```

For example: `1714678321_branch_myapp`

### Folder Contents

- `output-{agent}.md` - Output from each review subagent
- `review-summary.md` - Aggregated summary from all agents
- `review-reconciliation.md` - Reconciled summary after cross-referencing with PR comments (PR reviews only)
- temporary context files required for the review process

## TODOs, future plans

- [ ] Support Bitbucket for PR reviews
- [ ] Support GitLab for PR reviews
- [ ] Support Codex CLI AI agent
- [ ] Support for more AI agents (Gemini, Mistral, etc.)
