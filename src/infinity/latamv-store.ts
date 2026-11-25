import type { LatamvAssessmentResult } from './latamv-governance';

export interface LatamvAssessmentRecord {
  readonly assessment_id: string;
  readonly system_name: string;
  readonly system_version: string;
  readonly jurisdictions: readonly string[];
  readonly assessment: LatamvAssessmentResult;
  readonly assessment_hash: string;
  readonly created_at: string;
}

export interface LatamvAssessmentStore {
  save(assessment: LatamvAssessmentResult): Promise<LatamvAssessmentRecord>;
  list(limit: number): Promise<readonly LatamvAssessmentRecord[]>;
  get(assessmentId: string): Promise<LatamvAssessmentRecord | null>;
}

export interface LatamvStoreConfig {
  readonly supabaseUrl: string;
  readonly serviceRoleKey: string;
  readonly requestTimeoutMs?: number;
}

async function request<T>(
  config: LatamvStoreConfig,
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {}
): Promise<T> {
  const baseUrl = config.supabaseUrl.trim().replace(/\/+$/, '');
  const serviceRoleKey = config.serviceRoleKey.trim();
  if (!baseUrl || !serviceRoleKey) {
    throw new Error('LATAMV_STORAGE_NOT_CONFIGURED');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs ?? 8_000);
  try {
    const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
      method: init.method ?? 'GET',
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': 'application/json',
        prefer: 'return=representation',
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const error = new Error(`LATAMV_STORAGE_HTTP_${response.status}${detail ? `:${detail}` : ''}`);
      Object.assign(error, { status: response.status });
      throw error;
    }
    if (response.status === 204) return [] as T;
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export class SupabaseLatamvAssessmentStore implements LatamvAssessmentStore {
  constructor(private readonly config: LatamvStoreConfig) {}

  async save(assessment: LatamvAssessmentResult): Promise<LatamvAssessmentRecord> {
    const rows = await request<LatamvAssessmentRecord[]>(this.config, 'latamv_assessments', {
      method: 'POST',
      body: [{
        assessment_id: assessment.assessmentId,
        system_name: assessment.system.name,
        system_version: assessment.system.version,
        jurisdictions: assessment.jurisdictions.map(({ id }) => id),
        assessment,
        assessment_hash: assessment.hash.value,
      }],
    });
    if (!rows[0]) throw new Error('LATAMV_STORAGE_EMPTY_INSERT');
    return rows[0];
  }

  async list(limit: number): Promise<readonly LatamvAssessmentRecord[]> {
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const query = new URLSearchParams({
      select: 'assessment_id,system_name,system_version,jurisdictions,assessment,assessment_hash,created_at',
      order: 'created_at.desc',
      limit: String(safeLimit),
    });
    return request<LatamvAssessmentRecord[]>(this.config, `latamv_assessments?${query}`);
  }

  async get(assessmentId: string): Promise<LatamvAssessmentRecord | null> {
    const query = new URLSearchParams({
      select: 'assessment_id,system_name,system_version,jurisdictions,assessment,assessment_hash,created_at',
      assessment_id: `eq.${assessmentId}`,
      limit: '1',
    });
    const rows = await request<LatamvAssessmentRecord[]>(this.config, `latamv_assessments?${query}`);
    return rows[0] ?? null;
  }
}

export function createLatamvAssessmentStoreFromEnv(env: NodeJS.ProcessEnv = process.env): LatamvAssessmentStore {
  return new SupabaseLatamvAssessmentStore({
    supabaseUrl: env.SUPABASE_URL ?? '',
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  });
}
