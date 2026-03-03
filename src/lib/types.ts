export interface Profile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface BrainDump {
  id: string;
  user_id: string;
  raw_text: string;
  created_at: string;
}

export interface AmberSession {
  id: string;
  user_id: string;
  raw_text: string;
  display_title: string;
  status: 'accepted' | 'rejected' | 'pending' | string;
  created_at: string;
  amber_tasks?: AmberTask[];
}

export interface AmberTask {
  id: string;
  session_id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  sequence_order: number;
  calendar_event_id: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface ExecutionTask {
  id: string;
  user_id: string;
  brain_dump_id: string;
  title: string;
  description: string;
  estimated_time_minutes: number;
  sequence_order: number;
  scheduled_event_id: string | null;
  created_at: string;
}

/** Derived title from brain dump raw_text (first non-empty line) */
export function noteTitle(raw_text: string): string {
  const first = raw_text
    .split('\n')
    .map((l) => l.replace(/^#+\s*/, '').trim())
    .find((l) => l.length > 0);
  return first ?? 'Untitled';
}

/** Short preview snippet for note list */
export function notePreview(raw_text: string, maxLen = 60): string {
  const lines = raw_text.split('\n').map((l) => l.trim()).filter(Boolean);
  const body = lines.slice(1).join(' ');
  return body.length > maxLen ? body.slice(0, maxLen) + '…' : body;
}
