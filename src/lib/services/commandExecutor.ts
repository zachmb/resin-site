/**
 * Command executor service
 * Handles execution of claw: commands with configured integrations
 */

import { parseCommands } from '$lib/utils/commandParser';

export interface ExecutionResult {
  success: boolean;
  message: string;
  command: string;
}

interface CommandConfig {
  command_type: string;
  config: Record<string, string>;
  enabled: boolean;
}

/**
 * Execute all commands found in note content
 */
export async function executeNoteCommands(
  noteContent: string,
  configs: CommandConfig[]
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];
  const parsed = parseCommands(noteContent);

  if (!parsed.hasCommands) {
    return results;
  }

  const enabledConfigs = configs.reduce((acc, c) => {
    acc[c.command_type] = c;
    return acc;
  }, {} as Record<string, CommandConfig>);

  for (const command of parsed.commands) {
    const config = enabledConfigs[command.type];

    if (!config || !config.enabled) {
      results.push({
        success: false,
        message: `Command "${command.type}" is not configured`,
        command: command.fullCommand
      });
      continue;
    }

    const result = await executeCommand(command, config, parsed.contentWithoutCommands);
    results.push(result);
  }

  return results;
}

/**
 * Execute a single command with its configuration
 */
async function executeCommand(
  command: any,
  config: CommandConfig,
  noteContent: string
): Promise<ExecutionResult> {
  try {
    switch (command.type) {
      case 'send-email':
        return await executeSendEmail(command, config, noteContent);
      case 'webhook':
        return await executeWebhook(command, config, noteContent);
      case 'slack':
        return await executeSlack(command, config, noteContent);
      case 'telegram':
        return await executeTelegram(command, config, noteContent);
      case 'discord':
        return await executeDiscord(command, config, noteContent);
      case 'twitter':
        return await executeTwitter(command, config, noteContent);
      case 'notion':
        return await executeNotion(command, config, noteContent);
      default:
        return {
          success: false,
          message: `Unknown command type: ${command.type}`,
          command: command.fullCommand
        };
    }
  } catch (error) {
    console.error(`Error executing command ${command.type}:`, error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      command: command.fullCommand
    };
  }
}

/**
 * Send email via configured email service
 */
async function executeSendEmail(
  command: any,
  config: CommandConfig,
  noteContent: string
): Promise<ExecutionResult> {
  const email = config.config.email_address || command.args[0];

  if (!email) {
    return {
      success: false,
      message: 'No email address specified',
      command: command.fullCommand
    };
  }

  try {
    const response = await fetch('/api/commands/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        content: noteContent,
        subject: 'Note from Resin'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return {
      success: true,
      message: `Email sent to ${email}`,
      command: command.fullCommand
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Post to webhook
 */
async function executeWebhook(
  command: any,
  config: CommandConfig,
  noteContent: string
): Promise<ExecutionResult> {
  const url = config.config.url || command.args[0];

  if (!url) {
    return {
      success: false,
      message: 'No webhook URL specified',
      command: command.fullCommand
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: noteContent,
        timestamp: new Date().toISOString(),
        source: 'Resin'
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }

    return {
      success: true,
      message: `Posted to webhook: ${url}`,
      command: command.fullCommand
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Send to Slack
 */
async function executeSlack(
  command: any,
  config: CommandConfig,
  noteContent: string
): Promise<ExecutionResult> {
  const webhookUrl = config.config.webhook_url;

  if (!webhookUrl) {
    return {
      success: false,
      message: 'Slack webhook URL not configured',
      command: command.fullCommand
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: noteContent,
        channel: config.config.channel
      })
    });

    if (!response.ok) {
      throw new Error(`Slack returned ${response.status}`);
    }

    return {
      success: true,
      message: `Posted to Slack${config.config.channel ? ` in ${config.config.channel}` : ''}`,
      command: command.fullCommand
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Send to Telegram
 */
async function executeTelegram(
  command: any,
  config: CommandConfig,
  noteContent: string
): Promise<ExecutionResult> {
  const botToken = config.config.bot_token;
  const chatId = config.config.chat_id;

  if (!botToken || !chatId) {
    return {
      success: false,
      message: 'Telegram bot token or chat ID not configured',
      command: command.fullCommand
    };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: noteContent,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      throw new Error(`Telegram API returned ${response.status}`);
    }

    return {
      success: true,
      message: 'Message sent to Telegram',
      command: command.fullCommand
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Post to Discord
 */
async function executeDiscord(
  command: any,
  config: CommandConfig,
  noteContent: string
): Promise<ExecutionResult> {
  const webhookUrl = config.config.webhook_url;

  if (!webhookUrl) {
    return {
      success: false,
      message: 'Discord webhook URL not configured',
      command: command.fullCommand
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: noteContent,
        username: 'Resin'
      })
    });

    if (!response.ok) {
      throw new Error(`Discord returned ${response.status}`);
    }

    return {
      success: true,
      message: 'Posted to Discord',
      command: command.fullCommand
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Post to Twitter/X (simplified - would need OAuth in production)
 */
async function executeTwitter(
  command: any,
  config: CommandConfig,
  noteContent: string
): Promise<ExecutionResult> {
  // Twitter API posting would require OAuth and API keys
  // This is a placeholder for the full implementation
  return {
    success: false,
    message: 'Twitter posting requires additional OAuth setup - coming soon',
    command: command.fullCommand
  };
}

/**
 * Save to Notion
 */
async function executeNotion(
  command: any,
  config: CommandConfig,
  noteContent: string
): Promise<ExecutionResult> {
  const apiKey = config.config.api_key;
  const databaseId = config.config.database_id;

  if (!apiKey || !databaseId) {
    return {
      success: false,
      message: 'Notion API key or database ID not configured',
      command: command.fullCommand
    };
  }

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          Title: {
            title: [{ text: { content: 'Note from Resin' } }]
          },
          Content: {
            rich_text: [{ text: { content: noteContent } }]
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Notion returned ${response.status}`);
    }

    return {
      success: true,
      message: 'Saved to Notion database',
      command: command.fullCommand
    };
  } catch (error) {
    throw error;
  }
}
