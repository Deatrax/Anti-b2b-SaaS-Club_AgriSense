// M — conversations + messages. recentMessages() feeds the loop's context window (§C.2).
import { query } from '../config/db';
import type { Message } from '@agrisense/shared';

export const ConversationModel = {
  async getForField(fieldId: string): Promise<{ id: string } | null> {
    const [row] = await query<{ id: string }>(
      'select id from conversations where field_id = $1 order by created_at limit 1',
      [fieldId],
    );
    return row ?? null;
  },

  /** Tier 0 is one conversation per field (§3.4) — chat.controller get-or-creates via this. */
  async create(fieldId: string, title?: string): Promise<{ id: string }> {
    const [row] = await query<{ id: string }>(
      'insert into conversations (field_id, title) values ($1, $2) returning id',
      [fieldId, title ?? null],
    );
    return row!;
  },

  async recentMessages(conversationId: string, limit = 20): Promise<Message[]> {
    const rows = await query<Message>(
      'select * from messages where conversation_id = $1 order by created_at desc limit $2',
      [conversationId, limit],
    );
    return rows.reverse(); // chronological for the model
  },

  async addMessage(
    conversationId: string,
    role: string,
    content: string,
    toolCalls?: unknown,
    isProactive = false,
  ): Promise<{ id: string }> {
    const [row] = await query<{ id: string }>(
      'insert into messages (conversation_id, role, content, tool_calls, is_proactive) values ($1,$2,$3,$4,$5) returning id',
      [conversationId, role, content, toolCalls ? JSON.stringify(toolCalls) : null, isProactive],
    );
    return row!;
  },

  /** Agent speaks unprompted after a replan (§B.4). */
  async postProactive(fieldId: string, content: string): Promise<void> {
    const conv = await this.getForField(fieldId);
    if (!conv) return;
    await this.addMessage(conv.id, 'assistant', content, undefined, true);
  },
};
