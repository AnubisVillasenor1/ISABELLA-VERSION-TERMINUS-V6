import { describe, expect, it } from 'vitest';
import { Ed25519Signer, EventLog, stableOperationId } from '../../src/infinity';
import { merkleRoot } from '../../src/infinity/durable-recovery';

describe('Ed25519 Signer', () => {
  it('signs and verifies', () => {
    const signer = new Ed25519Signer();
    const data = 'hello tamv';
    const sig = signer.sign(data);
    expect(sig).toHaveLength(128);
    expect(Ed25519Signer.verify(signer.publicHex(), data, sig)).toBe(true);
    expect(Ed25519Signer.verify(signer.publicHex(), 'tampered', sig)).toBe(false);
  });

  it('verifies with wrong signature length gracefully', () => {
    const signer = new Ed25519Signer();
    expect(Ed25519Signer.verify(signer.publicHex(), 'data', '00')).toBe(false);
  });
});

describe('Event Log', () => {
  it('appends events with hash chain and verifies', () => {
    const log = new EventLog();
    const e1 = log.append({ eventId: 'e1', kind: 'test', tenantId: 't1', workflowId: 'w1', stepId: 's1', payload: { x: 1 }, actorDid: 'did:tamv:worker', timestamp: '2026-01-01T00:00:00Z' });
    const e2 = log.append({ eventId: 'e2', kind: 'test', tenantId: 't1', workflowId: 'w1', stepId: 's2', payload: { x: 2 }, actorDid: 'did:tamv:worker', timestamp: '2026-01-01T00:00:01Z' });
    expect(log.size()).toBe(2);
    expect(log.verifyChain()).toBe(true);
    expect(e1.previousHash).toBe('0'.repeat(64));
    expect(e2.previousHash).toBe(e1.digest);
  });

  it('rejects duplicate event_id', () => {
    const log = new EventLog();
    log.append({ eventId: 'e1', kind: 'test', tenantId: 't1', workflowId: 'w1', stepId: 's1', payload: {}, actorDid: 'did:tamv:worker', timestamp: '2026-01-01T00:00:00Z' });
    expect(() => log.append({ eventId: 'e1', kind: 'test', tenantId: 't1', workflowId: 'w1', stepId: 's1', payload: {}, actorDid: 'did:tamv:worker', timestamp: '2026-01-01T00:00:00Z' })).toThrow(/duplicate event_id/);
  });

  it('computes merkle root', () => {
    const log = new EventLog();
    log.append({ eventId: 'e1', kind: 'test', tenantId: 't1', workflowId: 'w1', stepId: 's1', payload: { x: 1 }, actorDid: 'did:tamv:worker', timestamp: '2026-01-01T00:00:00Z' });
    const root = log.merkleRoot();
    expect(root).toMatch(/^[0-9a-f]{64}$/);
    expect(log.merkleRoot()).toBe(root); // deterministic
  });

  it('merkleRoot returns null for empty log', () => {
    const log = new EventLog();
    expect(log.merkleRoot()).toBeNull();
  });
});

describe('stableOperationId', () => {
  it('is deterministic and stable', () => {
    const id1 = stableOperationId('tenant1', 'wf1', 'step1', { a: 1 }, 'did:tamv:worker');
    const id2 = stableOperationId('tenant1', 'wf1', 'step1', { a: 1 }, 'did:tamv:worker');
    expect(id1).toBe(id2);
    expect(id1).toHaveLength(128);
    // Different payload → different id
    const id3 = stableOperationId('tenant1', 'wf1', 'step1', { a: 2 }, 'did:tamv:worker');
    expect(id3).not.toBe(id1);
  });
});

describe('merkleRoot', () => {
  it('computes root for multiple hashes', () => {
    const hashes = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)];
    const root = merkleRoot(hashes);
    expect(root).toMatch(/^[0-9a-f]{64}$/);
    expect(merkleRoot(hashes)).toBe(root); // deterministic
  });

  it('returns null for empty', () => {
    expect(merkleRoot([])).toBeNull();
  });

  it('handles single hash', () => {
    const h = 'a'.repeat(64);
    expect(merkleRoot([h])).toBe(h);
  });
});
