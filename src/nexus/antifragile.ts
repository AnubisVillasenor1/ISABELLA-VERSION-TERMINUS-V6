/**
 * Nexus Antifragile Monitor — circuitos, salud y propuestas de reparación.
 * state: draft | engine-generated.
 *
 * Patrón extraído de la práctica de sistemas distribuidos (Hyperspace P2P,
 * resiliencia de SuperAGI) sin copiar código: un componente degradado no debe
 * arrastrar al resto, y una reparación automática nunca se ejecuta sin humano.
 *
 * - Cada componente tiene ventana deslizante y cortacircuitos con enfriamiento.
 * - `guard()` degrada a un sustituto determinista y registra el resultado.
 * - `proposeRepairs()` propone; no ejecuta ni cambia configuración.
 */
import { createHash } from 'node:crypto';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface HealthSignal {
  readonly name: string;
  readonly ok: boolean;
  readonly latencyMs: number;
  readonly at: number;
}

export interface ComponentHealth {
  readonly name: string;
  readonly state: CircuitState;
  readonly successRate: number;
  readonly samples: number;
  readonly consecutiveFailures: number;
  readonly openedUntil: number;
  readonly latencyP95Ms: number;
}

export interface RepairProposal {
  readonly id: string;
  readonly component: string;
  readonly action: string;
  readonly rationale: string;
  readonly risk: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly requiresHumanApproval: true;
}

export interface MonitorReport {
  readonly generatedAt: number;
  readonly score: number;
  readonly level: 'healthy' | 'degraded' | 'critical';
  readonly components: readonly ComponentHealth[];
  readonly actions: readonly string[];
  readonly proposals: readonly RepairProposal[];
  readonly disclaimer: string;
}

export interface GuardedResult<T> {
  readonly value: T;
  readonly source: 'primary' | 'fallback';
  readonly degraded: boolean;
  readonly circuit: CircuitState;
}

export interface AntifragileOptions {
  readonly windowSize?: number;
  readonly failureThreshold?: number;
  readonly cooldownMs?: number;
  readonly now?: () => number;
}

interface ComponentState {
  samples: HealthSignal[];
  consecutiveFailures: number;
  openedUntil: number;
}

const MAX_COMPONENTS = 128;

export class AntifragileMonitor {
  private readonly components = new Map<string, ComponentState>();
  private readonly windowSize: number;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(options: AntifragileOptions = {}) {
    this.windowSize = clampInt(options.windowSize, 20, 1, 500);
    this.failureThreshold = clampInt(options.failureThreshold, 3, 1, 100);
    this.cooldownMs = clampInt(options.cooldownMs, 15_000, 1, 3_600_000);
    this.now = options.now ?? Date.now;
  }

  record(name: string, ok: boolean, latencyMs = 0): CircuitState {
    const state = this.stateOf(name);
    state.samples.push({
      name,
      ok,
      latencyMs: Number.isFinite(latencyMs) ? Math.max(0, latencyMs) : 0,
      at: this.now(),
    });
    if (state.samples.length > this.windowSize) state.samples.shift();
    if (ok) {
      state.consecutiveFailures = 0;
      if (state.openedUntil > 0) state.openedUntil = 0;
    } else {
      state.consecutiveFailures += 1;
      if (state.consecutiveFailures >= this.failureThreshold) {
        state.openedUntil = this.now() + this.cooldownMs;
        state.consecutiveFailures = 0;
      }
    }
    return this.circuitFor(name);
  }

  circuitFor(name: string): CircuitState {
    const state = this.components.get(name);
    if (!state || state.openedUntil === 0) return 'closed';
    if (this.now() >= state.openedUntil) return 'half-open';
    return 'open';
  }

  /** En `half-open` se permite un único sondeo; el llamador decide si lo usa. */
  canAttempt(name: string): boolean {
    return this.circuitFor(name) !== 'open';
  }

  /**
   * Ejecuta `primary`; si falla o el circuito está abierto, usa `fallback`.
   * El resultado declara su origen: nunca se presenta un sustituto como primario.
   */
  async guard<T>(
    name: string,
    primary: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<GuardedResult<T>> {
    const circuit = this.circuitFor(name);
    if (circuit === 'open') {
      const value = await fallback();
      return { value, source: 'fallback', degraded: true, circuit };
    }
    const startedAt = this.now();
    try {
      const value = await primary();
      this.record(name, true, this.now() - startedAt);
      return { value, source: 'primary', degraded: false, circuit };
    } catch {
      this.record(name, false, this.now() - startedAt);
      const value = await fallback();
      return { value, source: 'fallback', degraded: true, circuit: this.circuitFor(name) };
    }
  }

  health(name: string): ComponentHealth | null {
    const state = this.components.get(name);
    if (!state) return null;
    return this.describe(name, state);
  }

  report(): MonitorReport {
    const components = [...this.components.keys()]
      .map((name) => this.health(name))
      .filter((entry): entry is ComponentHealth => entry !== null);

    if (components.length === 0) {
      return {
        generatedAt: this.now(),
        score: 100,
        level: 'healthy',
        components: [],
        actions: ['Sin señales registradas: salud no medida, no certificada.'],
        proposals: [],
        disclaimer:
          'Un proceso sin señales reporta 100 por ausencia de fallos, no por evidencia de salud.',
      };
    }

    const score = Math.round(
      (components.reduce((total, component) => {
        const circuitFactor = component.state === 'open' ? 0.5 : 1;
        return total + component.successRate * circuitFactor;
      }, 0) /
        components.length) *
        100
    );
    const level: MonitorReport['level'] =
      score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'critical';
    return {
      generatedAt: this.now(),
      score,
      level,
      components,
      actions: this.actionsFor(components),
      proposals: this.proposeRepairs(),
      disclaimer:
        'Este monitoreo es local y en proceso: no es un certificado de producción ni sustituye observabilidad externa.',
    };
  }

  proposeRepairs(): RepairProposal[] {
    const proposals: RepairProposal[] = [];
    for (const [name, state] of this.components) {
      const health = this.describe(name, state);
      const needsHelp = health.state === 'open' || health.successRate < 0.5;
      if (!needsHelp) continue;
      proposals.push({
        id: `repair_${createHash('sha256').update(`${name}:${health.state}`).digest('hex').slice(0, 16)}`,
        component: name,
        action:
          health.state === 'open'
            ? 'Verificar dependencia y reiniciar el circuito solo tras confirmar recuperación.'
            : 'Revisar la causa raíz antes de aumentar el tráfico al componente.',
        rationale: `Tasa de éxito ${Math.round(health.successRate * 100)}% con ${health.samples} muestras.`,
        risk: health.state === 'open' ? 'HIGH' : 'MEDIUM',
        requiresHumanApproval: true,
      });
    }
    return proposals;
  }

  private stateOf(name: string): ComponentState {
    const existing = this.components.get(name);
    if (existing) return existing;
    if (this.components.size >= MAX_COMPONENTS) {
      throw new RangeError('MONITOR_COMPONENT_CAPACITY_EXCEEDED');
    }
    const created: ComponentState = { samples: [], consecutiveFailures: 0, openedUntil: 0 };
    this.components.set(name, created);
    return created;
  }

  private describe(name: string, state: ComponentState): ComponentHealth {
    const samples = state.samples;
    const successes = samples.filter((sample) => sample.ok).length;
    const successRate = samples.length === 0 ? 1 : successes / samples.length;
    const latencies = samples.map((sample) => sample.latencyMs).sort((a, b) => a - b);
    const p95Index =
      latencies.length === 0
        ? 0
        : Math.min(latencies.length - 1, Math.ceil(latencies.length * 0.95) - 1);
    return {
      name,
      state: this.circuitFor(name),
      successRate: Number(successRate.toFixed(4)),
      samples: samples.length,
      consecutiveFailures: state.consecutiveFailures,
      openedUntil: state.openedUntil,
      latencyP95Ms: latencies[p95Index] ?? 0,
    };
  }

  private actionsFor(components: readonly ComponentHealth[]): string[] {
    const actions: string[] = [];
    for (const component of components) {
      if (component.state === 'open') {
        actions.push(`Circuito abierto en \`${component.name}\`: se usa sustituto hasta enfriar.`);
      } else if (component.successRate < 0.5) {
        actions.push(
          `Tasa de éxito baja en \`${component.name}\` (${Math.round(component.successRate * 100)}%).`
        );
      }
      if (component.latencyP95Ms > 2_000) {
        actions.push(`Latencia p95 alta en \`${component.name}\` (${component.latencyP95Ms} ms).`);
      }
    }
    return actions.length > 0
      ? actions
      : ['Todos los componentes medidos operan dentro de sus umbrales.'];
  }
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function createAntifragileMonitor(options?: AntifragileOptions): AntifragileMonitor {
  return new AntifragileMonitor(options);
}
