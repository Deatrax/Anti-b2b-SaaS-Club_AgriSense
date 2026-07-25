// sms.channel.test.ts — the SMS fast path (Plan B). generateText/retrieve are mocked so
// each test scripts the model/RAG output directly; the msisdn→user/farm/field bootstrap,
// idempotency cache, and truncation logic are real.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FieldState } from '@agrisense/shared';

const generateText = vi.fn();
vi.mock('ai', () => ({ generateText }));

const selectModel = vi.fn(() => ({}) as never);
vi.mock('../src/controllers/chat.controller', () => ({ selectModel }));

const findByPhone = vi.fn();
const createUser = vi.fn();
vi.mock('../src/models/user.model', () => ({ UserModel: { findByPhone, create: createUser } }));

const listByUser = vi.fn();
const createFarm = vi.fn();
const getFarm = vi.fn();
vi.mock('../src/models/farm.model', () => ({ FarmModel: { listByUser, create: createFarm, get: getFarm } }));

const listByFarm = vi.fn();
const createField = vi.fn();
const getState = vi.fn();
vi.mock('../src/models/field.model', () => ({ FieldModel: { listByFarm, create: createField, getState } }));

const getForField = vi.fn();
const createConversation = vi.fn();
const addMessage = vi.fn(async () => ({ id: 'msg-1' }));
const recentMessages = vi.fn();
vi.mock('../src/models/conversation.model', () => ({
  ConversationModel: { getForField, create: createConversation, addMessage, recentMessages },
}));

const retrieve = vi.fn();
vi.mock('../src/services/rag/retrieve', () => ({ retrieve }));

const { answerSms } = await import('../src/services/channels/sms.channel');

const bareField: FieldState = {
  identity: {
    id: 'field-1', farmId: 'farm-1', name: null, areaHa: null, soilType: null,
    waterSource: null, lat: null, lon: null, budgetBdt: null,
  },
  missingFields: ['location', 'area_ha', 'soil_type', 'water_source', 'budget_bdt', 'target_season'],
  activeCycle: null,
};

function textResult(text: string) {
  return { text };
}

beforeEach(() => {
  vi.clearAllMocks();
  getFarm.mockResolvedValue({ id: 'farm-1', user_id: 'user-1', name: null, district: null, lat: null, lon: null, aez: null });
  getState.mockResolvedValue(bareField);
  getForField.mockResolvedValue({ id: 'conv-1' });
  recentMessages.mockResolvedValue([{ id: 'm1', conversationId: 'conv-1', role: 'user', content: 'hi', toolCalls: null, isProactive: false, createdAt: '' }]);
  retrieve.mockResolvedValue({ query: 'x', hits: [] });
  generateText.mockResolvedValue(textResult('ভালো থাকুন।'));
});

describe('answerSms — msisdn bootstrap', () => {
  it('auto-provisions a bare user/farm/field for a first-contact msisdn', async () => {
    findByPhone.mockResolvedValue(null);
    createUser.mockResolvedValue({ id: 'user-new', phone: '8801700000000', name: null, lang: 'bn' });
    listByUser.mockResolvedValue([]);
    createFarm.mockResolvedValue({ id: 'farm-new', user_id: 'user-new', name: null, district: null, lat: null, lon: null, aez: null });
    listByFarm.mockResolvedValue([]);
    createField.mockResolvedValue({ id: 'field-new', farmId: 'farm-new', name: null, areaHa: null, soilType: null, waterSource: null, lat: null, lon: null, budgetBdt: null });
    getState.mockResolvedValue({ ...bareField, identity: { ...bareField.identity, id: 'field-new', farmId: 'farm-new' } });

    const out = await answerSms({ msisdn: '8801700000000', message: 'আমার জমিতে পোকা', requestId: 'req-new-1' });

    expect(createUser).toHaveBeenCalledWith('8801700000000');
    expect(createFarm).toHaveBeenCalledWith('user-new', expect.objectContaining({ name: expect.any(String) }));
    expect(createField).toHaveBeenCalledWith('farm-new');
    expect(out.status).toBe('ok');
  });

  it('reuses an existing user/farm/field for a known msisdn, never creating duplicates', async () => {
    findByPhone.mockResolvedValue({ id: 'user-1', phone: '8801800000000', name: null, lang: 'bn' });
    listByUser.mockResolvedValue([{ id: 'farm-1', user_id: 'user-1', name: null, district: null, lat: null, lon: null, aez: null }]);
    listByFarm.mockResolvedValue([{ ...bareField }]);

    await answerSms({ msisdn: '8801800000000', message: 'hello', requestId: 'req-existing-1' });

    expect(createUser).not.toHaveBeenCalled();
    expect(createFarm).not.toHaveBeenCalled();
    expect(createField).not.toHaveBeenCalled();
  });
});

describe('answerSms — grounding', () => {
  beforeEach(() => {
    findByPhone.mockResolvedValue({ id: 'user-1', phone: '8801800000000', name: null, lang: 'bn' });
    listByUser.mockResolvedValue([{ id: 'farm-1', user_id: 'user-1', name: null, district: null, lat: null, lon: null, aez: 9 }]);
    listByFarm.mockResolvedValue([{ ...bareField }]);
  });

  it('grounds retrieval in the active cycle crop/stage when known, not just the raw message', async () => {
    getState.mockResolvedValue({
      identity: { ...bareField.identity, soilType: 'clay' },
      missingFields: [],
      activeCycle: { id: 'c1', fieldId: 'field-1', crop: 'aman_rice', variety: null, season: 'aman', sowingDate: null, expectedHarvest: null, status: 'active', stage: 'tillering', dayIndex: 20, actualYieldKg: null },
    });
    getFarm.mockResolvedValue({ id: 'farm-1', user_id: 'user-1', name: null, district: null, lat: null, lon: null, aez: 9 });

    await answerSms({ msisdn: '8801800000000', message: 'পোকা লেগেছে কী করব?', requestId: 'req-ground-1' });

    expect(retrieve).toHaveBeenCalledWith({
      crop: 'aman_rice',
      stage: 'tillering',
      topic: 'পোকা লেগেছে কী করব?',
      soilType: 'clay',
      aez: 9,
    });
  });

  it('still answers when retrieve() itself throws, degrading to an empty-hits context', async () => {
    retrieve.mockRejectedValueOnce(new Error('embedding API down'));

    const out = await answerSms({ msisdn: '8801800000000', message: 'question', requestId: 'req-retrieve-fail-1' });

    expect(out.status).toBe('ok');
    expect(generateText).toHaveBeenCalledOnce();
  });
});

describe('answerSms — idempotency', () => {
  beforeEach(() => {
    findByPhone.mockResolvedValue({ id: 'user-1', phone: '8801800000000', name: null, lang: 'bn' });
    listByUser.mockResolvedValue([{ id: 'farm-1', user_id: 'user-1', name: null, district: null, lat: null, lon: null, aez: null }]);
    listByFarm.mockResolvedValue([{ ...bareField }]);
  });

  it('returns the cached reply on a repeated requestId without recomputing', async () => {
    const first = await answerSms({ msisdn: '8801800000000', message: 'same question', requestId: 'req-idem-1' });
    const second = await answerSms({ msisdn: '8801800000000', message: 'same question', requestId: 'req-idem-1' });

    expect(second).toEqual(first);
    expect(generateText).toHaveBeenCalledOnce();
  });

  it('does not cache a failed turn, so a retry with the same requestId gets a fresh attempt', async () => {
    getState.mockRejectedValueOnce(new Error('db unreachable'));
    const first = await answerSms({ msisdn: '8801800000000', message: 'q', requestId: 'req-idem-fail-1' });
    expect(first.status).toBe('error');

    const second = await answerSms({ msisdn: '8801800000000', message: 'q', requestId: 'req-idem-fail-1' });
    expect(second.status).toBe('ok');
    expect(generateText).toHaveBeenCalledOnce();
  });
});

describe('answerSms — SMS constraints', () => {
  beforeEach(() => {
    findByPhone.mockResolvedValue({ id: 'user-1', phone: '8801800000000', name: null, lang: 'bn' });
    listByUser.mockResolvedValue([{ id: 'farm-1', user_id: 'user-1', name: null, district: null, lat: null, lon: null, aez: null }]);
    listByFarm.mockResolvedValue([{ ...bareField }]);
  });

  it('hard-truncates a long reply to the character budget on a word boundary', async () => {
    const longReply = Array.from({ length: 60 }, (_, i) => `শব্দ${i}`).join(' ');
    generateText.mockResolvedValue(textResult(longReply));

    const out = await answerSms({ msisdn: '8801800000000', message: 'q', requestId: 'req-truncate-1' });

    expect(out.reply.length).toBeLessThanOrEqual(280);
    expect(out.reply.endsWith('…')).toBe(true);
    expect(out.reply.endsWith(' …')).toBe(false);
  });

  it('never throws out of answerSms — an internal failure returns a fast, honest error', async () => {
    getState.mockRejectedValue(new Error('boom'));

    const out = await answerSms({ msisdn: '8801800000000', message: 'q', requestId: 'req-error-1' });

    expect(out).toEqual({ reply: '', status: 'error' });
  });
});
