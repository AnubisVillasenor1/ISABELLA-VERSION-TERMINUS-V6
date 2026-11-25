import { afterEach, describe, expect, it, vi } from 'vitest';
import { assessLatamv } from '../../src/infinity/latamv-governance';
import {
  SupabaseLatamvAssessmentStore,
  type LatamvAssessmentRecord,
} from '../../src/infinity/latamv-store';

afterEach(() => vi.unstubAllGlobals());

const assessment = assessLatamv({
  assessmentId: 'assessment-1',
  systemName: 'Isabella',
  systemVersion: 'V6',
  jurisdictions: ['MX'],
  assessedAt: '2026-11-24T12:00:00.000Z',
  controls: [],
});

const record: LatamvAssessmentRecord = {
  assessment_id: assessment.assessmentId,
  system_name: assessment.system.name,
  system_version: assessment.system.version,
  jurisdictions: ['MX'],
  assessment,
  assessment_hash: assessment.hash.value,
  created_at: '2026-11-24T12:00:01.000Z',
};

const config = { supabaseUrl: 'https://project.supabase.co/', serviceRoleKey: 'server-secret' };

describe('Supabase LATAMV assessment store', () => {
  it('appends assessments using server-only credentials and returns persisted time', async () => {
    const fetchMock = vi.fn(
      async (..._args: Parameters<typeof fetch>) =>
        new Response(JSON.stringify([record]), { status: 201 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const store = new SupabaseLatamvAssessmentStore(config);

    await expect(store.save(assessment)).resolves.toEqual(record);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://project.supabase.co/rest/v1/latamv_assessments');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer server-secret');
    expect(JSON.parse(String(init?.body))).toEqual([
      {
        assessment_id: 'assessment-1',
        system_name: 'Isabella',
        system_version: 'V6',
        jurisdictions: ['MX'],
        assessment,
        assessment_hash: assessment.hash.value,
      },
    ]);
  });

  it('bounds list size and safely encodes assessment identifiers', async () => {
    const fetchMock = vi.fn(
      async (..._args: Parameters<typeof fetch>) =>
        new Response(JSON.stringify([record]), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const store = new SupabaseLatamvAssessmentStore(config);

    await store.list(1000);
    await store.get('id & other');

    const listUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(listUrl.searchParams.get('limit')).toBe('100');
    const getUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(getUrl.searchParams.get('assessment_id')).toBe('eq.id & other');
  });

  it('fails closed when storage credentials are missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const store = new SupabaseLatamvAssessmentStore({ supabaseUrl: '', serviceRoleKey: '' });

    await expect(store.list(10)).rejects.toThrow('LATAMV_STORAGE_NOT_CONFIGURED');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
