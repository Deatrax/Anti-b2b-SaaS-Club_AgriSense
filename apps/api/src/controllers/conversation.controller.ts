// C — a specific conversation's history. A field can have many conversations (§ multi-chat);
// this is how the sidebar's "recent chats" / "all chats" open one exact thread by id, rather
// than always falling back to the field's most recent one (that's getFieldChatHistory).
import type { Request, Response, NextFunction } from 'express';
import { ConversationModel } from '../models/conversation.model';
import { TraceModel } from '../models/trace.model';

export async function getConversation(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'conversation id is required' });
    return;
  }
  try {
    const conversation = await ConversationModel.getById(id);
    if (!conversation) {
      res.status(404).json({ error: 'conversation not found' });
      return;
    }
    const [messages, traces] = await Promise.all([
      ConversationModel.recentMessages(id, 200),
      TraceModel.listByConversation(id),
    ]);
    res.json({ conversation, messages, traces });
  } catch (err) {
    next(err);
  }
}
