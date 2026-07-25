// sms.controller.test.ts — POST /agent/sms (Plan B CONTRACT). answerSms is mocked; this
// verifies the controller's own contract: the response shape and the hard deadline race
// that must return before the webhook's own ~8-10s timeout.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';

const answerSms = vi.fn();
vi.mock('../src/services/channels/sms.channel', () => ({ answerSms }));

const { postAgentSms } = await import('../src/controllers/sms.controller');

function makeReqRes(body: unknown) {
  const req = { body } as Request;
  const json = vi.fn();
  const res = { json } as unknown as Response;
  return { req, res, json };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('postAgentSms', () => {
  it('returns the channel result verbatim when it resolves before the deadline', async () => {
    answerSms.mockResolvedValue({ reply: 'ভালো আছে', status: 'ok' });
    const { req, res, json } = makeReqRes({ msisdn: '8801812345678', message: 'hi', requestId: 'r1' });

    await postAgentSms(req, res);

    expect(json).toHaveBeenCalledWith({ reply: 'ভালো আছে', status: 'ok' });
  });

  it('passes msisdn/message/requestId through to the channel unchanged', async () => {
    answerSms.mockResolvedValue({ reply: 'ok', status: 'ok' });
    const { req, res } = makeReqRes({ msisdn: '8801812345678', message: 'আমার ধানে পোকা', requestId: 'r2', lang: 'bn', subscribed: true });

    await postAgentSms(req, res);

    expect(answerSms).toHaveBeenCalledWith({ msisdn: '8801812345678', message: 'আমার ধানে পোকা', requestId: 'r2' });
  });

  it('returns a fast, empty error instead of hanging when the channel exceeds the deadline', async () => {
    vi.useFakeTimers();
    answerSms.mockReturnValue(new Promise(() => {})); // never resolves — simulates a hung turn
    const { req, res, json } = makeReqRes({ msisdn: '8801812345678', message: 'hi', requestId: 'r3' });

    const done = postAgentSms(req, res);
    await vi.advanceTimersByTimeAsync(7000);
    await done;

    expect(json).toHaveBeenCalledWith({ reply: '', status: 'error' });
  });
});
