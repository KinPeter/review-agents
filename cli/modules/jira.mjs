import { writeFileSync } from 'fs';
import { join } from 'path';
import { REVIEW_FOLDER, CONFIG } from './common.mjs';
import { getCurrentBranch } from './git.mjs';

export function parseJiraTicketIdFromBranch() {
  const branchName = getCurrentBranch();
  const match = branchName.match(/([A-Z]+-\d+)/);
  return match ? match[1] : null;
}

export async function fetchJiraTicket(ticketId) {
  const { jiraBaseUrl, jiraEmail, jiraApiToken } = getJiraConfig();
  const credentials = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
  const url = `${jiraBaseUrl}/rest/api/3/issue/${ticketId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Jira ticket: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchAndSaveJiraTicket(ticketId) {
  if (!ticketId) {
    console.log('⚠️ No Jira ticket ID found in branch name');
    return null;
  }
  console.log(`🎫 Fetching Jira ticket ${ticketId}...`);
  try {
    const ticket = await fetchJiraTicket(ticketId);
    const filePath = join(REVIEW_FOLDER, 'ticket.json');
    writeFileSync(filePath, JSON.stringify(ticket, null, 2));
    console.log(`📄 Saved Jira ticket ${ticketId}`);
    return filePath;
  } catch (err) {
    console.warn(`⚠️ Failed to fetch Jira ticket ${ticketId}: ${err.message}`);
    return null;
  }
}

function getJiraConfig() {
  for (const key of ['jiraBaseUrl', 'jiraEmail', 'jiraApiToken']) {
    if (!CONFIG[key]) throw new Error(`Missing required Jira config: ${key}`);
  }
  return {
    jiraBaseUrl: CONFIG.jiraBaseUrl,
    jiraEmail: CONFIG.jiraEmail,
    jiraApiToken: CONFIG.jiraApiToken,
  };
}
