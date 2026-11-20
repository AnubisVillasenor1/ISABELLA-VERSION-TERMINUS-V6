import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { V0StreamResult, V0StreamUpdate } from 'v0';
import { registerV0BuilderRoutes, type V0BuilderClient } from '../../src/routes/v0-builder';
import { FixedWindowRateLimiter } from '../../src/security/rate-limit';

type RunningServer = { server: Server; url: string };

const createdServers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    createdServers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        })
    )
  );
});

function makeStream(chatId: string, content: string): V0StreamResult {
  const update = {
    status: 'streaming',
    event: { object: 'message.parts.chunk' },
    chat: { id: chatId, title: 'TAMV · Prueba' },
    message: { role: 'assistant', content },
    parts: [],
  } as unknown as V0StreamUpdate;
  const final = { ...update, status: 'done' } as unknown as V0StreamResult['final'];

  return {
    stream: (async function* () {
      yield update;
    })(),
    final: Promise.resolve(final),
    toResponse: () => new Response(),
  } as V0StreamResult;
}

async function startServer(client: V0BuilderClient, isConfigured = true): Promise<RunningServer> {
  const app = express();
  app.use(express.json());
  registerV0BuilderRoutes({
    app,
    client,
    authorizeApiToken: (req, res) => {
      if (req.get('authorization') === 'Bearer test-operator-token') return true;
      res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      return false;
    },
    enforceRateLimit: () => true,
    limiter: new FixedWindowRateLimiter(4, 60_000),
    isConfigured: () => isConfigured,
  });

  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  createdServers.push(server);
  const address = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${address.port}` };
}

function testClient(stream: V0StreamResult) {
  let createInput: unknown;
  let sendInput: unknown;
  const createStream = vi.fn(async (input: unknown) => {
    createInput = input;
    return stream;
  });
  const sendStream = vi.fn(async (input: unknown) => {
    sendInput = input;
    return stream;
  });
  const client = {
    chats: { createStream },
    messages: { sendStream },
  } as unknown as V0BuilderClient;

  return { client, createStream, sendStream, getCreateInput: () => createInput, getSendInput: () => sendInput };
}

const operatorHeaders = {
  authorization: 'Bearer test-operator-token',
  'content-type': 'application/json',
};

const costAcknowledgement = { acknowledgedCost: true };

describe('Isabella v0 builder routes', () => {
  it('requires the operator token before calling v0', async () => {
    const mock = testClient(makeStream('chat_test_123', 'Draft ready'));
    const { url } = await startServer(mock.client);
    const response = await fetch(`${url}/api/isabella/v0/chats`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Build an app', ...costAcknowledgement }),
    });

    expect(response.status).toBe(401);
    expect(mock.createStream).not.toHaveBeenCalled();
  });

  it('requires explicit cost acknowledgement before generation', async () => {
    const mock = testClient(makeStream('chat_test_123', 'Draft ready'));
    const { url } = await startServer(mock.client);
    const response = await fetch(`${url}/api/isabella/v0/chats`, {
      method: 'POST',
      headers: operatorHeaders,
      body: JSON.stringify({ message: 'Build an app' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ error: 'COST_ACKNOWLEDGEMENT_REQUIRED' });
    expect(mock.createStream).not.toHaveBeenCalled();
  });

  it('creates a private, isolated TAMV draft and returns the streamed chat id', async () => {
    const mock = testClient(makeStream('chat_test_123', 'A first draft is ready.'));
    const { url } = await startServer(mock.client);
    const response = await fetch(`${url}/api/isabella/v0/chats`, {
      method: 'POST',
      headers: operatorHeaders,
      body: JSON.stringify({ message: 'Build a TAMV landing page', ...costAcknowledgement }),
    });
    const streamText = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(streamText).toContain('event: workspace');
    expect(streamText).toContain('event: done');
    expect(streamText).toContain('chat_test_123');
    expect(streamText).toContain('A first draft is ready.');
    expect(mock.createStream).toHaveBeenCalledTimes(1);
    expect(mock.getCreateInput()).toMatchObject({
      message: 'Build a TAMV landing page',
      privacy: 'private',
      mcpServerIds: [],
      modelConfiguration: { modelId: 'v0-mini', imageGenerations: false },
      credentialAccess: { sharedNpm: false, vercel: false, github: false },
    });
  });

  it('continues only the supplied chat id through the v0 messages API', async () => {
    const mock = testClient(makeStream('chat_test_123', 'The draft was refined.'));
    const { url } = await startServer(mock.client);
    const response = await fetch(`${url}/api/isabella/v0/chats/chat_test_123/messages`, {
      method: 'POST',
      headers: operatorHeaders,
      body: JSON.stringify({ message: 'Refine the hero', ...costAcknowledgement }),
    });
    const streamText = await response.text();

    expect(response.status).toBe(200);
    expect(streamText).toContain('The draft was refined.');
    expect(mock.sendStream).toHaveBeenCalledTimes(1);
    expect(mock.getSendInput()).toMatchObject({
      chatId: 'chat_test_123',
      message: 'Refine the hero',
      mcpServerIds: [],
      modelConfiguration: { modelId: 'v0-mini', imageGenerations: false },
    });
  });

  it('fails closed when the v0 API key is not configured', async () => {
    const mock = testClient(makeStream('chat_test_123', 'Draft ready'));
    const { url } = await startServer(mock.client, false);
    const response = await fetch(`${url}/api/isabella/v0/chats`, {
      method: 'POST',
      headers: operatorHeaders,
      body: JSON.stringify({ message: 'Build an app', ...costAcknowledgement }),
    });
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ error: 'V0_API_NOT_CONFIGURED' });
    expect(mock.createStream).not.toHaveBeenCalled();
  });
});
