/**
 * Parses custom commands from note content.
 * Commands are prefixed with "claw:" followed by the command type and arguments.
 *
 * Examples:
 * - "claw: send-email user@example.com"
 * - "claw: webhook https://example.com/webhook"
 * - "claw: slack notify #channel This is a message"
 */

export interface ParsedCommand {
  type: string;
  args: string[];
  fullCommand: string;
  rawContent: string;
}

export interface CommandMetadata {
  hasCommands: boolean;
  commands: ParsedCommand[];
  contentWithoutCommands: string;
}

/**
 * Parses all claw: commands from the given content
 */
export function parseCommands(content: string): CommandMetadata {
  const lines = content.split('\n');
  const commands: ParsedCommand[] = [];
  const contentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if line starts with "claw:"
    if (trimmed.toLowerCase().startsWith('claw:')) {
      const commandContent = trimmed.slice(5).trim(); // Remove "claw:" prefix
      const parts = commandContent.split(/\s+/);
      const commandType = parts[0]?.toLowerCase() || '';
      const args = parts.slice(1);

      if (commandType) {
        commands.push({
          type: commandType,
          args,
          fullCommand: `claw: ${commandContent}`,
          rawContent: line
        });
      }
    } else {
      contentLines.push(line);
    }
  }

  return {
    hasCommands: commands.length > 0,
    commands,
    contentWithoutCommands: contentLines.join('\n').trim()
  };
}

/**
 * Identifies the action icon and label for a command type
 */
export function getCommandMetadata(commandType: string): {
  icon: string;
  label: string;
  description: string;
  color: string;
} {
  const commandMap: Record<string, any> = {
    'send-email': {
      icon: '📧',
      label: 'Send Email',
      description: 'Send the note content to an email address',
      color: 'blue'
    },
    'webhook': {
      icon: '🔗',
      label: 'Webhook',
      description: 'Post the note to a webhook URL',
      color: 'purple'
    },
    'slack': {
      icon: '💬',
      label: 'Slack',
      description: 'Send to Slack channel or user',
      color: 'indigo'
    },
    'telegram': {
      icon: '✈️',
      label: 'Telegram',
      description: 'Send to Telegram chat',
      color: 'cyan'
    },
    'discord': {
      icon: '🎮',
      label: 'Discord',
      description: 'Post to Discord channel',
      color: 'violet'
    },
    'twitter': {
      icon: '𝕏',
      label: 'Post to X',
      description: 'Post the note as a tweet',
      color: 'gray'
    },
    'notion': {
      icon: '📝',
      label: 'Notion',
      description: 'Save to Notion database',
      color: 'neutral'
    }
  };

  return commandMap[commandType] || {
    icon: '⚙️',
    label: commandType.charAt(0).toUpperCase() + commandType.slice(1),
    description: 'Custom automation command',
    color: 'gray'
  };
}

/**
 * Checks if a command is registered/available
 */
export function isCommandAvailable(commandType: string): boolean {
  const availableCommands = [
    'send-email',
    'webhook',
    'slack',
    'telegram',
    'discord',
    'twitter',
    'notion'
  ];
  return availableCommands.includes(commandType.toLowerCase());
}
