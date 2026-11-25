/**
 * ISABELLA VILLASEÑOR AI™ — Agent Session Monitor (native).
 * state: draft | engine-generated.
 *
 * Monitorea datos de sesión de cada agente conectado: identidad, estado,
 * latencia, errores y última actividad. Determinista, in-memory (referencia).
 * Inspiración: .cagent/session.db — patrón de monitoreo de sesiones de agente.
 *
 * `executionPerformed` es siempre `false`: el monitor observa, no ejecuta.
 */
import { digest, SkillInputError } from './skills';

export type AgentStatus = 'idle' | 'running' | 'error' | 'offline';

export interface AgentSession {
  readonly agentId: string;
  readonly name: string;
  readonly status: AgentStatus;
  readonly connectedAt: string;
  readonly lastActivity: string;
  readonly latencyMs: number;
  readonly errorCount: number;
  readonly tasksCompleted: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface AgentSessionSnapshot {
  readonly totalAgents: number;
  readonly byStatus: Readonly<Record<AgentStatus, number>>;
  readonly sessions: readonly AgentSession[];
  readonly digest: string;
  readonly executionPerformed: false;
  readonly networkUsed: false;
}

export class AgentSessionMonitor {
  private readonly sessions = new Map<string, AgentSession>();

  register(agentId: string, name: string, metadata: Readonly<Record<string, unknown>> = {}): AgentSession {
    if (!agentId.trim()) throw new SkillInputError('INVALID_AGENT_ID', 'agentId es requerido');
    const now = new Date().toISOString();
    const session: AgentSession = {
      agentId: agentId.trim().slice(0, 120),
      name: name.trim().slice(0, 120) || agentId.trim().slice(0, 120),
      status: 'idle',
      connectedAt: now,
      lastActivity: now,
      latencyMs: 0,
      errorCount: 0,
      tasksCompleted: 0,
      metadata: { ...metadata },
    };
    this.sessions.set(session.agentId, session);
    return session;
  }

  update(agentId: string, patch: { status?: AgentStatus; latencyMs?: number; error?: boolean; taskCompleted?: boolean }): AgentSession | null {
    const session = this.sessions.get(agentId);
    if (!session) return null;
    const now = new Date().toISOString();
    const updated: AgentSession = {
      ...session,
      status: patch.status ?? session.status,
      lastActivity: now,
      latencyMs: patch.latencyMs ?? session.latencyMs,
      errorCount: patch.error ? session.errorCount + 1 : session.errorCount,
      tasksCompleted: patch.taskCompleted ? session.tasksCompleted + 1 : session.tasksCompleted,
    };
    this.sessions.set(agentId, updated);
    return updated;
  }

  unregister(agentId: string): boolean {
    return this.sessions.delete(agentId);
  }

  get(agentId: string): AgentSession | null {
    return this.sessions.get(agentId) ?? null;
  }

  snapshot(): AgentSessionSnapshot {
    const sessions = [...this.sessions.values()];
    const byStatus: Record<AgentStatus, number> = { idle: 0, running: 0, error: 0, offline: 0 };
    for (const s of sessions) byStatus[s.status] += 1;
    return {
      totalAgents: sessions.length,
      byStatus,
      sessions,
      digest: digest({ sessions: sessions.map((s) => `${s.agentId}:${s.status}:${s.tasksCompleted}`) }),
      executionPerformed: false,
      networkUsed: false,
    };
  }

  describe(): Readonly<Record<string, unknown>> {
    return {
      totalAgents: this.sessions.size,
      statuses: ['idle', 'running', 'error', 'offline'],
      executionPerformed: false,
      networkUsed: false,
      note: 'Monitor in-memory de sesiones de agente; no ejecuta ni modifica agentes.',
    };
  }
}

export function describeAgentSessionMonitor(): Readonly<Record<string, unknown>> {
  return {
    features: ['register', 'update', 'unregister', 'snapshot', 'describe'],
    storage: 'in-memory (reference)',
    executionPerformed: false,
    networkUsed: false,
    note: 'Monitorea sesiones de agentes conectados; no ejecuta ni modifica agentes.',
  };
}