// M — conversations + messages. A field can have many conversations (§ multi-chat) —
// recentMessages() feeds the loop's context window (§C.2); recentMessagesExcluding() feeds
// cross-conversation memory so the agent doesn't re-ask what a farmer already told it in a
// different thread on the same field.
import { query } from '../config/db';
import type { Message } from '@agrisense/shared';

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  tool_calls: unknown;
  is_proactive: boolean;
  created_at: string;
}

function toMessage(r: MessageRow): Message {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role as Message['role'],
    content: r.content,
    toolCalls: r.tool_calls,
    isProactive: r.is_proactive,
    createdAt: r.created_at,
  };
}

export interface ConversationSummary {
  id: string;
  farmId: string;
  fieldId: string | null;
  title: string | null;
  createdAt: string;
}

export const ConversationModel = {
  /** The field's default conversation — most recently started — used when the caller hasn't
   * picked a specific thread (embedded chat panels, proactive notices). */
  async getForField(fieldId: string): Promise<{ id: string } | null> {
    const [row] = await query<{ id: string }>(
      'select id from conversations where field_id = $1 order by created_at desc limit 1',
      [fieldId],
    );
    return row ?? null;
  },

  async getById(conversationId: string): Promise<ConversationSummary | null> {
    const [row] = await query<{ id: string; farm_id: string; field_id: string | null; title: string | null; created_at: string }>(
      'select id, farm_id, field_id, title, created_at from conversations where id = $1',
      [conversationId],
    );
    return row ? { id: row.id, farmId: row.farm_id, fieldId: row.field_id, title: row.title, createdAt: row.created_at } : null;
  },

  /** Tier 0 is at least one conversation per field (§3.4) — a field may accumulate several
   * over time; each "new chat" is its own row, not a reused one. */
  async create(farmId: string, fieldId?: string, title?: string): Promise<ConversationSummary> {
    const [row] = await query<{ id: string; farm_id: string; field_id: string | null; title: string | null; created_at: string }>(
      'insert into conversations (farm_id, field_id, title) values ($1, $2, $3) returning id, farm_id, field_id, title, created_at',
      [farmId, fieldId ?? null, title ?? null],
    );
    return { id: row!.id, farmId: row!.farm_id, fieldId: row!.field_id, title: row!.title, createdAt: row!.created_at };
  },

  async updateField(conversationId: string, fieldId: string): Promise<void> {
    await query('update conversations set field_id = $1 where id = $2', [fieldId, conversationId]);
  },

  async recentMessages(conversationId: string, limit = 20): Promise<Message[]> {
    const rows = await query<MessageRow>(
      'select * from messages where conversation_id = $1 order by created_at desc limit $2',
      [conversationId, limit],
    );
    return rows.reverse().map(toMessage); // chronological for the model
  },

  /** Cross-conversation memory: the field's most recent messages from OTHER conversations,
   * chronological — so starting a new thread still carries what the farmer already said. */
  async recentMessagesForFieldExcluding(fieldId: string, excludeConversationId: string, limit = 10): Promise<Message[]> {
    const rows = await query<MessageRow>(
      `select m.* from messages m
       join conversations c on c.id = m.conversation_id
       where c.field_id = $1 and c.id != $2
       order by m.created_at desc
       limit $3`,
      [fieldId, excludeConversationId, limit],
    );
    return rows.reverse().map(toMessage);
  },

  async recentMessagesForFarmExcluding(farmId: string, excludeConversationId: string, limit = 20): Promise<Message[]> {
    const rows = await query<MessageRow>(
      `select m.* from messages m
       join conversations c on c.id = m.conversation_id
       where c.farm_id = $1 and c.id != $2
       order by m.created_at desc
       limit $3`,
      [farmId, excludeConversationId, limit],
    );
    return rows.reverse().map(toMessage);
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

  /** Agent speaks unprompted after a replan (§B.4) — lands in the field's most recent thread. */
  async postProactive(fieldId: string, content: string): Promise<void> {
    const conv = await this.getForField(fieldId);
    if (!conv) return;
    await this.addMessage(conv.id, 'assistant', content, undefined, true);
  },

  /** "Recent chats" for the sidebar — every conversation across the farm's fields that has
   * at least one message (§ multi-chat: a field may have several), newest last-message first. */
  async listRecentForFarm(
    farmId: string,
    limit: number,
    offset: number,
  ): Promise<{ chats: RecentChat[]; total: number }> {
    const rows = await query<{
      conversation_id: string;
      field_id: string;
      field_name: string | null;
      role: string;
      content: string;
      created_at: string;
    }>(
      `select c.id as conversation_id, c.field_id, f.name as field_name, m.role, m.content, m.created_at
       from conversations c
       left join fields f on f.id = c.field_id
       join lateral (
         select role, content, created_at from messages
         where conversation_id = c.id
         order by created_at desc limit 1
       ) m on true
       where c.farm_id = $1
       order by m.created_at desc
       limit $2 offset $3`,
      [farmId, limit, offset],
    );
    const [countRow] = await query<{ count: number }>(
      `select count(*)::int as count
       from conversations c
       join lateral (select 1 from messages where conversation_id = c.id limit 1) m on true
       where c.farm_id = $1`,
      [farmId],
    );
    return {
      chats: rows.map((r) => ({
        fieldId: r.field_id,
        fieldName: r.field_name,
        conversationId: r.conversation_id,
        lastMessage: { role: r.role, content: r.content, createdAt: r.created_at },
      })),
      total: countRow?.count ?? 0,
    };
  },
};

export interface RecentChat {
  fieldId: string | null;
  fieldName: string | null;
  conversationId: string;
  lastMessage: { role: string; content: string; createdAt: string };
}
