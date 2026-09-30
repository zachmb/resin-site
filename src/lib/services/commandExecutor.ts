/**
 * Command executor service
 * Handles execution of claw: commands with configured integrations
 */

import { parseCommands } from '$lib/utils/commandParser';
import { lookup } from 'node:dns/promises';

const MAX_COMMAND_CONTENT_LENGTH = 6000;
const OUTBOUND_FETCH_TIMEOUT_MS = 8000;
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/g;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,254}$/i;
const TELEGRAM_BOT_TOKEN_RE = /^\d{6,16}:[A-Za-z0-9_-]{24,96}$/;
const TELEGRAM_CHAT_ID_RE = /^-?\d{1,20}$|^@[A-Za-z0-9_]{5,64}$/;
const NOTION_TOKEN_RE = /^[A-Za-z0-9_=-]{32,256}$/;
const NOTION_DATABASE_ID_RE = /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BLOCKED_IPV4_RE = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0)/;
const BLOCKED_IPV6_RE = /^(::1$|::$|fc|fd|fe80:)/i;

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

function cleanCommandContent(value: string): string {
  return value.replace(CONTROL_CHAR_RE, ' ').trim().slice(0, MAX_COMMAND_CONTENT_LENGTH);
}

function commandLabel(command: any): string {
  return typeof command?.type === 'string' ? command.type : 'unknown';
}

function safeResult(success: boolean, message: string, command: any): ExecutionResult {
  return { success, message, command: commandLabel(command) };
}

function isBlockedOutboundHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  return host === 'localhost' || BLOCKED_IPV4_RE.test(host) || BLOCKED_IPV6_RE.test(host) || host.startsWith('::ffff:');
}

function isPublicResolvedAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized.includes(':')) {
    return !(
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith('::ffff:') ||
      normalized.startsWith('2001:db8:')
    );
  }

  const octets = normalized.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [first, second] = octets;
  return !(
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

async function requireSafeOutboundUrl(rawUrl: string | undefined, serviceName: string): Promise<string> {
  if (!rawUrl) throw new Error(`${serviceName} URL not configured`);

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`${serviceName} URL is invalid`);
  }

  if (url.protocol !== 'https:' || isBlockedOutboundHostname(url.hostname)) {
    throw new Error(`${serviceName} URL is not allowed`);
  }

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicResolvedAddress(address))) {
    throw new Error(`${serviceName} URL is not allowed`);
  }

  return url.toString();
}

function outboundSignal(): AbortSignal {
  return AbortSignal.timeout(OUTBOUND_FETCH_TIMEOUT_MS);
}

/**
 * Execute all commands found in note content
 */
export async function executeNoteCommands(
  noteContent: string,
  configs: CommandConfig[]
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];
  const parsed = parseCommands(cleanCommandContent(noteContent));

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
      results.push(safeResult(false, `Command "${command.type}" is not configured`, command));
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
      case 'notion':
        return await executeNotion(command, config, noteContent);
      default:
        return safeResult(false, `Unknown command type: ${command.type}`, command);
    }
  } catch {
    console.warn(`[commands] Command failed: ${commandLabel(command)}`);
    return safeResult(false, 'Command failed. Check the integration settings and try again.', command);
  }
}

/**
 * Send email via configured email service
 */
async function executeSendEmail(
  command: any,
  config: CommandConfig,
  _noteContent: string
): Promise<ExecutionResult> {
  const email = config.config.email_address;

  if (!email || !EMAIL_RE.test(email)) {
    return safeResult(false, 'Email command is not fully configured', command);
  }

  return safeResult(false, 'Email commands are not enabled yet. Your note was saved, but no email was sent.', command);
}

/**
 * Post to webhook
 */
async function executeWebhook(
  command: any,
  config: CommandConfig,
  noteContent: string
): Promise<ExecutionResult> {
  const url = await requireSafeOutboundUrl(config.config.url, 'Webhook');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'error',
      signal: outboundSignal(),
      body: JSON.stringify({
        content: noteContent,
        timestamp: new Date().toISOString(),
        source: 'Resin'
      })
    });

    if (!response.ok) {
      throw new Error('Webhook request failed');
    }

    return safeResult(true, 'Posted to webhook', command);
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
  const webhookUrl = await requireSafeOutboundUrl(config.config.webhook_url, 'Slack webhook');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'error',
      signal: outboundSignal(),
      body: JSON.stringify({
        text: noteContent,
        channel: config.config.channel
      })
    });

    if (!response.ok) {
      throw new Error('Slack request failed');
    }

    return safeResult(true, 'Posted to Slack', command);
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

  if (!botToken || !chatId || !TELEGRAM_BOT_TOKEN_RE.test(botToken) || !TELEGRAM_CHAT_ID_RE.test(chatId)) {
    return safeResult(false, 'Telegram bot token or chat ID not configured', command);
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'error',
      signal: outboundSignal(),
      body: JSON.stringify({
        chat_id: chatId,
        text: noteContent
      })
    });

    if (!response.ok) {
      throw new Error('Telegram request failed');
    }

    return safeResult(true, 'Message sent to Telegram', command);
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
  const webhookUrl = await requireSafeOutboundUrl(config.config.webhook_url, 'Discord webhook');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'error',
      signal: outboundSignal(),
      body: JSON.stringify({
        content: noteContent,
        username: 'Resin'
      })
    });

    if (!response.ok) {
      throw new Error('Discord request failed');
    }

    return safeResult(true, 'Posted to Discord', command);
  } catch (error) {
    throw error;
  }
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

  if (!apiKey || !databaseId || !NOTION_TOKEN_RE.test(apiKey) || !NOTION_DATABASE_ID_RE.test(databaseId)) {
    return safeResult(false, 'Notion API key or database ID not configured', command);
  }

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      redirect: 'error',
      signal: outboundSignal(),
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
      throw new Error('Notion request failed');
    }

    return safeResult(true, 'Saved to Notion database', command);
  } catch (error) {
    throw error;
  }
}
