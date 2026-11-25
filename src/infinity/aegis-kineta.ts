/**
 * ISABELLA VILLASEÑOR AI™ — AEGIS-KINETA CORE (native).
 * state: draft | engine-generated.
 *
 * Blueprint técnico del Motor Ciberfísico de Isabella NextGen.
 * Implementa la parte de software (M5, M6 y esquema de telemetría).
 * M1-M4 requieren hardware físico (ESP32, sensores, cámaras, MuJoCo, YOLO).
 *
 * Módulos de software implementados:
 *   - Telemetry Schema: esquema de telemetría (MQTT topics, payload JSON)
 *   - Diagnostic Engine: detección de anomalías en series de tiempo
 *   - Vision Guard Metadata: metadatos de análisis visual (sin YOLO real)
 *   - Agent Mesh Integration: orquestación multiagente (ya implementado en mesh.ts)
 *   - Governance & Evidence: CROWN + BookPI + TJG + TPG (ya implementado)
 *
 * Módulos de hardware (NO implementados, requieren hardware físico):
 *   - M1: Percepción & Telemetría (ESP32, sensores, MQTT)
 *   - M2: Simulación Física (MuJoCo/MJX, Gazebo, URDF)
 *   - M3: Visión Perimetral (YOLOv3/v8, OpenCV, edge)
 *   - M4: Diagnóstico & Recall (modelos CNN/LSTM, API NHTSA)
 *
 * `executionPerformed` es siempre `false`. `hardwareRequired` es `true`
 * para M1-M4.
 */
import { digest, SkillInputError } from './skills';

// ── Telemetry Schema ───────────────────────────────────────────────────────

export const TELEMETRY_TOPICS = {
  vibration: 'tamv/telemetry/vibration',
  temperature: 'tamv/telemetry/temperature',
  gps: 'tamv/telemetry/gps',
  audio: 'tamv/telemetry/audio',
  video: 'tamv/telemetry/video',
  actuator: 'tamv/telemetry/actuator',
  recall: 'tamv/telemetry/recall',
} as const;

export type TelemetryTopic = keyof typeof TELEMETRY_TOPICS;

export interface TelemetryPayload {
  readonly topic: TelemetryTopic;
  readonly deviceId: string;
  readonly timestamp: string;
  readonly value: number | string | Readonly<Record<string, unknown>>;
  readonly unit: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface TelemetrySchema {
  readonly topic: string;
  readonly frequency: string;
  readonly format: string;
  readonly fields: readonly string[];
}

export const TELEMETRY_SCHEMAS: Readonly<Record<TelemetryTopic, TelemetrySchema>> = {
  vibration: { topic: TELEMETRY_TOPICS.vibration, frequency: '100 Hz', format: 'JSON', fields: ['x', 'y', 'z', 'magnitude', 'rms'] },
  temperature: { topic: TELEMETRY_TOPICS.temperature, frequency: '1 Hz', format: 'JSON', fields: ['celsius', 'sensorId'] },
  gps: { topic: TELEMETRY_TOPICS.gps, frequency: '1 Hz', format: 'JSON', fields: ['lat', 'lon', 'alt', 'speed', 'heading'] },
  audio: { topic: TELEMETRY_TOPICS.audio, frequency: '44.1 kHz', format: 'PCM/WAV', fields: ['samples', 'sampleRate', 'channels'] },
  video: { topic: TELEMETRY_TOPICS.video, frequency: '30 fps', format: 'H.264', fields: ['frame', 'resolution', 'codec'] },
  actuator: { topic: TELEMETRY_TOPICS.actuator, frequency: '1 kHz', format: 'JSON', fields: ['pwm', 'position', 'current', 'temperature'] },
  recall: { topic: TELEMETRY_TOPICS.recall, frequency: 'on-demand', format: 'JSON', fields: ['vin', 'recallId', 'description', 'severity'] },
};

export function validateTelemetryPayload(payload: unknown): TelemetryPayload {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new SkillInputError('INVALID_PAYLOAD', 'payload debe ser objeto');
  }
  const p = payload as Record<string, unknown>;
  const topic = p.topic;
  if (typeof topic !== 'string' || !(topic in TELEMETRY_TOPICS)) {
    throw new SkillInputError('INVALID_TOPIC', `topic debe ser ${Object.keys(TELEMETRY_TOPICS).join(', ')}`);
  }
  const deviceId = typeof p.deviceId === 'string' ? p.deviceId.trim().slice(0, 120) : '';
  if (!deviceId) throw new SkillInputError('INVALID_DEVICE', 'deviceId es requerido');
  const timestamp = typeof p.timestamp === 'string' && Number.isFinite(Date.parse(p.timestamp)) ? new Date(p.timestamp).toISOString() : new Date().toISOString();
  return {
    topic: topic as TelemetryTopic,
    deviceId,
    timestamp,
    value: (p.value as number | string | Record<string, unknown>) ?? 0,
    unit: typeof p.unit === 'string' ? p.unit.slice(0, 40) : '',
    metadata: typeof p.metadata === 'object' && p.metadata !== null && !Array.isArray(p.metadata) ? (p.metadata as Record<string, unknown>) : undefined,
  };
}

// ── Diagnostic Engine ──────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  readonly timestamp: number;
  readonly value: number;
}

export interface AnomalyResult {
  readonly isAnomaly: boolean;
  readonly score: number; // 0-1, higher = more anomalous
  readonly method: 'z-score' | 'threshold' | 'none';
  readonly detail: string;
}

export function detectAnomaly(series: readonly TimeSeriesPoint[], threshold = 2.5): AnomalyResult {
  if (series.length < 3) {
    return { isAnomaly: false, score: 0, method: 'none', detail: 'serie insuficiente (< 3 puntos)' };
  }
  const values = series.map((p) => p.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  if (std === 0) {
    return { isAnomaly: false, score: 0, method: 'z-score', detail: 'desviación estándar cero' };
  }
  const last = values[values.length - 1];
  const zScore = Math.abs((last - mean) / std);
  const isAnomaly = zScore > threshold;
  return {
    isAnomaly,
    score: Math.min(1, zScore / (threshold * 2)),
    method: 'z-score',
    detail: `z-score=${zScore.toFixed(2)}, threshold=${threshold}, mean=${mean.toFixed(2)}, std=${std.toFixed(2)}`,
  };
}

export interface RecallAlert {
  readonly vin: string;
  readonly recallId: string;
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly source: string;
}

export function parseRecallAlert(raw: unknown): RecallAlert | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const vin = typeof r.vin === 'string' ? r.vin.trim() : '';
  const recallId = typeof r.recallId === 'string' ? r.recallId.trim() : '';
  if (!vin || !recallId) return null;
  const severity = r.severity === 'low' || r.severity === 'medium' || r.severity === 'high' || r.severity === 'critical' ? r.severity : 'medium';
  return {
    vin,
    recallId,
    description: typeof r.description === 'string' ? r.description.slice(0, 500) : '',
    severity,
    source: typeof r.source === 'string' ? r.source.slice(0, 100) : 'unknown',
  };
}

// ── Vision Guard Metadata ──────────────────────────────────────────────────

export interface VisionGuardMetadata {
  readonly frameId: string;
  readonly timestamp: string;
  readonly detections: readonly { label: string; confidence: number; bbox: readonly number[] }[];
  readonly helmetDetected: boolean;
  readonly vehicleCount: number;
  readonly personCount: number;
  readonly analysisPerformed: false; // No real YOLO/OpenCV
  readonly executionPerformed: false;
}

export function createVisionGuardMetadata(
  frameId: string,
  detections: readonly { label: string; confidence: number; bbox?: readonly number[] }[]
): VisionGuardMetadata {
  const normalized = detections.map((d) => ({
    label: d.label.slice(0, 80),
    confidence: Math.max(0, Math.min(1, d.confidence)),
    bbox: d.bbox ? [...d.bbox] : [0, 0, 0, 0],
  }));
  return {
    frameId: frameId.slice(0, 120),
    timestamp: new Date().toISOString(),
    detections: normalized,
    helmetDetected: normalized.some((d) => d.label.toLowerCase().includes('helmet') && d.confidence > 0.5),
    vehicleCount: normalized.filter((d) => d.label.toLowerCase().includes('vehicle') || d.label.toLowerCase().includes('car')).length,
    personCount: normalized.filter((d) => d.label.toLowerCase().includes('person')).length,
    analysisPerformed: false,
    executionPerformed: false,
  };
}

// ── AEGIS-KINETA Module Registry ──────────────────────────────────────────

export const AEGIS_MODULES = {
  M1: { name: 'Percepción & Telemetría', status: 'specified', hardware: true, software: false },
  M2: { name: 'Simulación Física', status: 'specified', hardware: true, software: false },
  M3: { name: 'Visión Perimetral', status: 'specified', hardware: true, software: false },
  M4: { name: 'Diagnóstico & Recall', status: 'specified', hardware: true, software: false },
  M5: { name: 'Agent Mesh Cognitivo', status: 'partial', hardware: false, software: true },
  M6: { name: 'Gobernanza & Evidencia', status: 'partial', hardware: false, software: true },
} as const;

export function describeAegisKineta(): Readonly<Record<string, unknown>> {
  return {
    modules: AEGIS_MODULES,
    softwareImplemented: ['M5', 'M6', 'telemetry-schema', 'diagnostic-engine', 'vision-guard-metadata'],
    hardwareRequired: ['M1', 'M2', 'M3', 'M4'],
    executionPerformed: false,
    note: 'Blueprint de ingeniería. M1-M4 requieren hardware físico. M5-M6 tienen prototipos parciales.',
  };
}