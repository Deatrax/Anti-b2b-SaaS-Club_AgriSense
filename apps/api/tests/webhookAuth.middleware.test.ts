// webhookAuth.middleware.test.ts — gates /agent/sms (Plan B CONTRACT). Fails closed: no
// configured secret rejects every request, matched header is the only way through.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const env: { AGENT_WEBHOOK_SECRET?: string } = {};
vi.mock('../src/config/env', () => ({ env }));

const { requireWebhookSecret } = await import('../src/middleware/webhookAuth.middleware');

function makeReqRes(header?: string) {
  const req = { header: () => header } as unknown as Request;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next, status, json };
}

beforeEach(() => {
  delete env.AGENT_WEBHOOK_SECRET;
  vi.clearAllMocks();
});

describe('requireWebhookSecret', () => {
  it('rejects with 401 when no secret is configured, even with a header present', () => {
    const { req, res, next, status, json } = makeReqRes('anything');

    requireWebhookSecret(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 401 when the header does not match the configured secret', () => {
    env.AGENT_WEBHOOK_SECRET = 'correct-secret';
    const { req, res, next, status } = makeReqRes('wrong-secret');

    requireWebhookSecret(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 401 when the header is missing entirely', () => {
    env.AGENT_WEBHOOK_SECRET = 'correct-secret';
    const { req, res, next, status } = makeReqRes(undefined);

    requireWebhookSecret(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when the header matches the configured secret exactly', () => {
    env.AGENT_WEBHOOK_SECRET = 'correct-secret';
    const { req, res, next, status } = makeReqRes('correct-secret');

    requireWebhookSecret(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });
});
