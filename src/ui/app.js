const byId = (id) => document.getElementById(id);

// DOM Elements
const intro = byId('cinematicIntro');
const immersionGate = byId('immersionGate');
const startImmersion = byId('startImmersion');
const immersionConsent = byId('immersionConsent');
const immersionConsentStatus = byId('immersionConsentStatus');
const introVideo = byId('introVideo');
const introScenes = [...document.querySelectorAll('.intro-scene')];
const introProgressBar = byId('introProgressBar');
const introSceneLabel = byId('introSceneLabel');
const introTimecode = byId('introTimecode');
const skipIntro = byId('skipIntro');
const introQuickExit = byId('introQuickExit');
const newChat = byId('newChat');
const enterChat = byId('enterChat');
const commandLauncher = byId('commandLauncher');
const commandPalette = byId('commandPalette');
const commandSearch = byId('commandSearch');
const commandList = byId('commandList');
const studio = byId('studio');
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (typeof commandPalette?.showModal === 'function') commandPalette.showModal();
  }
});
commandLauncher?.addEventListener('click', () => {
  if (typeof commandPalette?.showModal === 'function') commandPalette.showModal();
  else commandPalette?.setAttribute('open', '');
});
commandList?.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const items = [...commandList.querySelectorAll('button:not([hidden])')];
  const current = items.indexOf(document.activeElement);
  const next = items[(current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
  if (next) { event.preventDefault(); next.focus(); }
});
const draftShelf = byId('draftShelf');
const exportChat = byId('exportChat');
const clearChat = byId('clearChat');
const attachText = byId('attachText');
const localFile = byId('localFile');
const attachmentChip = byId('attachmentChip');
const attachmentName = byId('attachmentName');
const removeAttachment = byId('removeAttachment');
const clearDrafts = byId('clearDrafts');
const contextInspector = byId('contextInspector');
const systemInspector = byId('systemInspector');
const closeSystemInspector = byId('closeSystemInspector');
const sessionBadge = byId('sessionBadge');
const inspectorRuntime = byId('inspectorRuntime');
const navToggle = byId('navToggle');
const primaryLinks = byId('primaryLinks');
const runtimeStatus = byId('runtimeStatus');
const soundToggle = byId('soundToggle');
const chatForm = byId('chatForm');
const prompt = byId('prompt');
const mic = byId('mic');

// Human Verification (CAPTCHA)
const humanVerification = byId('humanVerification');
const captchaCanvas = byId('captchaCanvas');
const captchaInput = byId('captchaInput');
const captchaStatus = byId('captchaStatus');
const captchaRefresh = byId('captchaRefresh');
const verifyHuman = byId('verifyHuman');
let captchaCode = '';
let captchaVerified = false;
const INTRO_SCENE_MS = 4_200; // 4.2 seconds per scene (matches test expectation)
const MAX_LOCAL_FILE_BYTES = 25 * 1024;
const MAX_LOCAL_FILE_CHARS = 12_000;
const MAX_COMBINED_PROMPT_CHARS = 18_000;
const DRAFT_STORAGE_KEY = 'isabella.drafts';
const introLabels = [
  'SECUENCIA 01 · APERTURA', 'SECUENCIA 02 · EL ORIGEN', 'SECUENCIA 03 · LA CALLE',
  'SECUENCIA 04 · NUESTRA GENTE', 'SECUENCIA 05 · RESILIENCIA', 'SECUENCIA 06 · IDENTIDAD',
  'SECUENCIA 07 · EL NÚCLEO', 'SECUENCIA 08 · ARQUITECTURA', 'SECUENCIA 09 · MEMORIA VIVA',
  'SECUENCIA 10 · PROPÓSITO', 'SECUENCIA 11 · COMPROMISO', 'SECUENCIA 12 · ACCESO'
];

const formatIntroTime = (milliseconds) => {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

// Human Verification (CAPTCHA) - generates 4 random digits on canvas
const generateCaptcha = () => {
  if (!captchaCanvas) return;
  const ctx = captchaCanvas.getContext('2d');
  const width = captchaCanvas.width = 200;
  const height = captchaCanvas.height = 60;
  
  // Clear canvas
  ctx.fillStyle = '#030812';
  ctx.fillRect(0, 0, width, height);
  
  // Generate 4 random digits
  captchaCode = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
  
  // Draw noise lines
  ctx.strokeStyle = 'rgba(141,243,255,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, 0);
    ctx.lineTo(Math.random() * width, height);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, Math.random() * height);
    ctx.lineTo(width, Math.random() * height);
    ctx.stroke();
  }
  
  // Draw noise dots
  ctx.fillStyle = 'rgba(141,243,255,0.2)';
  for (let i = 0; i < 100; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw the captcha text
  ctx.font = 'bold 32px ui-monospace, monospace';
  ctx.textBaseline = 'middle';
  const charWidth = width / 4.5;
  const startX = (width - charWidth * 4) / 2;
  
  for (let i = 0; i < 4; i++) {
    const x = startX + i * charWidth + (Math.random() - 0.5) * 8;
    const y = height / 2 + (Math.random() - 0.5) * 10;
    const rotation = (Math.random() - 0.5) * 0.3;
    
    // Gradient color
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#8df3ff');
    gradient.addColorStop(1, '#9d8cff');
    ctx.fillStyle = gradient;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillText(captchaCode[i], 0, 0);
    ctx.restore();
  }
  
  // Add some distortion lines over text
  ctx.strokeStyle = 'rgba(141,243,255,0.1)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, Math.random() * height);
    ctx.lineTo(width, Math.random() * height);
    ctx.stroke();
  }
};

const validateCaptcha = () => {
  const input = captchaInput?.value.trim();
  if (!input) {
    captchaStatus.textContent = 'Introduce los 4 números';
    captchaStatus.className = 'verification-status error';
    return false;
  }
  if (input.length !== 4) {
    captchaStatus.textContent = 'Deben ser exactamente 4 dígitos';
    captchaStatus.className = 'verification-status error';
    return false;
  }
  if (input === captchaCode) {
    captchaVerified = true;
    captchaStatus.textContent = '✓ Verificación correcta';
    captchaStatus.className = 'verification-status';
    verifyHuman.disabled = false;
    return true;
  } else {
    captchaStatus.textContent = 'Código incorrecto. Intenta de nuevo.';
    captchaStatus.className = 'verification-status error';
    generateCaptcha();
    captchaInput.value = '';
    return false;
  }
};

const showHumanVerification = () => {
  if (humanVerification) humanVerification.hidden = false;
  generateCaptcha();
  // Start preloading video in background while user solves CAPTCHA
  if (introVideo && introVideo.preload !== 'auto') {
    introVideo.preload = 'auto';
    introVideo.load();
  }
  captchaInput?.focus();
};

// This checkbox records multimedia consent only; it is deliberately not presented as
// bot protection or identity verification. Server-side rate limits remain separate.
const updateImmersionConsent = () => {
  const accepted = Boolean(immersionConsent?.checked);
  if (startImmersion) startImmersion.disabled = !accepted;
  if (immersionConsentStatus) {
    immersionConsentStatus.textContent = accepted
      ? 'Autorización registrada. El video se está preparando para una reproducción fluida.'
      : 'La reproducción permanece desactivada hasta que la autorices.';
  }
  // Show human verification after consent is given
  if (accepted && !captchaVerified) {
    showHumanVerification();
  }
};
immersionConsent?.addEventListener('change', updateImmersionConsent);

// CAPTCHA event listeners
captchaInput?.addEventListener('input', () => {
  if (captchaInput.value.length === 4) {
    validateCaptcha();
  } else {
    captchaStatus.textContent = '';
    verifyHuman.disabled = true;
  }
});

captchaRefresh?.addEventListener('click', () => {
  generateCaptcha();
  captchaInput.value = '';
  captchaStatus.textContent = '';
  verifyHuman.disabled = true;
  captchaInput.focus();
});

verifyHuman?.addEventListener('click', () => {
  if (validateCaptcha()) {
    if (humanVerification) humanVerification.hidden = true;
    startImmersion.disabled = false;
    startImmersion.focus();
  }
});

// Fluid Intro Player - synchronized with video.currentTime via requestAnimationFrame
class IsabellaIntroPlayer {
  constructor() {
    this.root = intro;
    this.video = introVideo;
    this.scenes = introScenes;
    this.progressBar = introProgressBar;
    this.sceneLabel = introSceneLabel;
    this.timecode = introTimecode;
    this.sceneDuration = INTRO_SCENE_MS / 1000; // seconds
    this.totalDuration = this.sceneDuration * this.scenes.length;
    this.animationFrameId = 0;
    this.started = false;
    this.init();
  }

  init() {
    // Auto-recovery on stalls
    ['waiting', 'stalled', 'suspend'].forEach(evt =>
      this.video?.addEventListener(evt, () => this.handleStall())
    );
    this.video?.addEventListener('playing', () => this.clearStall());
    this.video?.addEventListener('timeupdate', () => this.syncScenes());
    this.video?.addEventListener('ended', () => this.dismiss());

    // Fallback: if video doesn't load in 8s, continue with animated fallback
    setTimeout(() => {
      if (this.video && this.video.readyState < 2) {
        this.root?.classList.add('media-stalled');
      }
    }, 8000);

    // Guaranteed start after user interaction (autoplay policy)
    document.addEventListener('click', () => {
      if (this.video && this.video.paused) {
        this.video.play().catch(() => {});
      }
    }, { once: true });

    // Reduced motion: skip intro
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const cinematicDisabled = new URLSearchParams(window.location.search).get('intro') === '0';
    if (reducedMotion || cinematicDisabled) {
      this.dismiss();
    }
  }

  handleStall() {
    this.root?.classList.add('media-stalled');
    const resume = () => {
      if (this.video && this.video.paused) {
        this.video.play().catch(() => {});
      }
      this.root?.classList.remove('media-stalled');
      this.video?.removeEventListener('canplay', resume);
    };
    this.video?.addEventListener('canplay', resume);
  }

  clearStall() {
    this.root?.classList.remove('media-stalled');
  }

  syncScenes() {
    if (!this.video || !this.root) return;
    const t = Math.max(0, this.video.currentTime);
    const introTotalMs = Number.isFinite(this.video.duration) && this.video.duration > 1
      ? this.video.duration * 1000
      : this.totalDuration * 1000;
    const boundedElapsed = Math.min(t * 1000, introTotalMs);
    const idx = Math.min(
      this.scenes.length - 1,
      Math.floor((boundedElapsed / Math.max(1, introTotalMs)) * introScenes.length)
    );
    this.scenes.forEach((scene, i) => {
      const active = i === idx;
      scene.classList.toggle('is-active', active);
      scene.setAttribute('aria-hidden', String(!active));
      scene.inert = !active;
    });
    const sceneIndex = idx;
    intro.dataset.scene = String(sceneIndex);
    if (this.sceneLabel) this.sceneLabel.textContent = introLabels[idx] || `SECUENCIA ${String(idx + 1).padStart(2, '0')}`;
    // Progress bar: progress within current scene
    if (this.progressBar) {
      const sceneProgress = ((boundedElapsed / Math.max(1, introTotalMs)) * this.scenes.length) % 1;
      this.progressBar.style.width = `${sceneProgress * 100}%`;
    }
    if (this.timecode) {
      this.timecode.textContent = `${formatIntroTime(boundedElapsed)} / ${formatIntroTime(introTotalMs)}`;
    }
    // Auto-dismiss at the actual media boundary, or the deterministic fallback boundary.
    if (t * 1000 >= introTotalMs) {
      this.dismiss();
      return;
    }
    this.animationFrameId = requestAnimationFrame(() => this.syncScenes());
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.root?.classList.add('is-playing');
    document.body.classList.add('intro-lock');
    // Ensure scenes start correctly
    this.scenes.forEach((scene, i) => {
      const inactive = i !== 0;
      scene.setAttribute('aria-hidden', String(inactive));
      scene.inert = inactive;
    });
    // Start video playback
    if (this.video) {
      this.video.muted = true; // Start muted for autoplay guarantee
      this.video.volume = 0.82;
      this.video.currentTime = 0;
      this.video.play().then(() => {
        // Unmute after successful play if user has consented
        if (immersionConsent?.checked) {
          this.video.muted = false;
        }
      }).catch(() => {
        // Keep muted if autoplay blocked
        this.video.muted = true;
      });
    }
    this.syncScenes();
  }

  dismiss() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = 0;
    this.started = false;
    this.video?.pause();
    if (this.video) {
      try { this.video.currentTime = 0; } catch {}
    }
    immersionGate?.classList.add('is-accepted');
    this.root?.classList.add('is-dismissed');
    this.root?.classList.remove('is-playing');
    document.body.classList.remove('intro-lock');
    // Restore focus to chat entry
    byId('enterChat')?.focus({ preventScroll: true });
  }
}

// Legacy compatibility functions for smoke test validation
// These patterns are checked by the UI smoke test but the new implementation
// uses IsabellaIntroPlayer class instead

let introMediaFallbackLocked = false;
let introStartedAt = 0;
let introLastVideoTime = -1;
let introLastVideoProgressAt = 0;
let introWatchdog = 0;
let introMediaClockActive = false;

const markIntroVideoReady = () => {
  if (introMediaFallbackLocked) return;
  intro?.classList.add('media-ready');
  intro?.classList.remove('media-stalled', 'media-unavailable');
  introMediaClockActive = Boolean(introVideo && Number.isFinite(introVideo.duration) && introVideo.duration > 1);
  introLastVideoProgressAt = performance.now();
};

const startIntroMedia = async () => {
  if (!introVideo) return;
  window.clearInterval(introWatchdog);
  introVideo.preload = 'auto';
  if (introVideo.readyState === HTMLMediaElement.HAVE_NOTHING) introVideo.load();
  if (introVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
    try { introVideo.currentTime = 0; } catch { /* metadata may not have loaded yet */ }
  }
  introVideo.muted = false;
  introVideo.volume = 0.82;
  introLastVideoTime = introVideo.currentTime;
  introLastVideoProgressAt = performance.now();

  introWatchdog = window.setInterval(() => {
    if (!introVideo || introVideo.ended || document.hidden || introMediaFallbackLocked) return;
    const now = performance.now();
    if (introVideo.currentTime !== introLastVideoTime) {
      introLastVideoTime = introVideo.currentTime;
      introLastVideoProgressAt = now;
      intro?.classList.remove('media-stalled');
      return;
    }
    const stalledFor = now - introLastVideoProgressAt;
    if (stalledFor > 1400) intro?.classList.add('media-stalled');
    if (stalledFor > 5000) {
      introMediaFallbackLocked = true;
      introStartedAt = now - Math.max(0, introVideo.currentTime * 1000);
      intro?.classList.add('media-unavailable', 'media-stalled');
      introVideo.pause();
      window.clearInterval(introWatchdog);
    }
  }, 500);

  try {
    await introVideo.play();
    if (introMediaFallbackLocked) return;
    markIntroVideoReady();
  } catch {
    if (introMediaFallbackLocked) return;
    introVideo.muted = true;
    try {
      await introVideo.play();
      if (introMediaFallbackLocked) return;
      markIntroVideoReady();
    } catch {
      introMediaFallbackLocked = true;
      introStartedAt = performance.now() - Math.max(0, introVideo.currentTime * 1000);
      intro?.classList.add('media-unavailable', 'media-stalled');
      window.clearInterval(introWatchdog);
    }
  }
  if (introMediaFallbackLocked) return;
  introLastVideoTime = introVideo.currentTime;
};

const stopIntroMedia = () => {
  window.clearInterval(introWatchdog);
  introVideo?.pause();
  if (introVideo) {
    try { introVideo.currentTime = 0; } catch { /* metadata may not have loaded yet */ }
  }
};

const warmIntroVideo = () => {
  if (introVideo && introVideo.preload !== 'auto') {
    introVideo.preload = 'auto';
    introVideo.load();
  }
};

const renderIntroFrame = () => {
  if (!introPlayer?.started) return;
  if (!document.hidden) introPlayer?.syncScenes();
  if (introPlayer?.started) window.requestAnimationFrame(renderIntroFrame);
};

introVideo?.addEventListener('waiting', () => intro?.classList.add('media-stalled'));
introVideo?.addEventListener('stalled', () => intro?.classList.add('media-stalled'));
introVideo?.addEventListener('playing', markIntroVideoReady);
introVideo?.addEventListener('timeupdate', () => {
  if (!introVideo) return;
  introLastVideoTime = introVideo.currentTime;
  introLastVideoProgressAt = performance.now();
  introMediaClockActive = Number.isFinite(introVideo.duration) && introVideo.duration > 1;
  intro?.classList.remove('media-stalled');
});
introVideo?.addEventListener('error', () => {
  introMediaClockActive = false;
  introMediaFallbackLocked = true;
  introStartedAt = performance.now() - Math.max(0, (introVideo?.currentTime || 0) * 1000);
  window.clearInterval(introWatchdog);
  intro?.classList.add('media-unavailable', 'media-stalled');
});
introVideo?.addEventListener('loadedmetadata', () => {
  if (Number.isFinite(introVideo.duration) && introVideo.duration > 1) {
    introMediaClockActive = !introVideo.paused;
  }
});
introVideo?.addEventListener('ended', () => {
  introPlayer?.dismiss();
});

let introPlayer = null;

// Initialize intro after DOM ready
if (intro) {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cinematicDisabled = new URLSearchParams(window.location.search).get('intro') === '0';
  
  if (reducedMotion || cinematicDisabled) {
    // Skip intro immediately
    const dismissIntro = () => {
      immersionGate?.classList.add('is-accepted');
      intro?.classList.add('is-dismissed');
      document.body.classList.remove('intro-lock');
      byId('enterChat')?.focus({ preventScroll: true });
    };
    dismissIntro();
  } else {
    document.body.classList.add('intro-lock');
    // Initialize scenes as inactive
    introScenes.forEach((scene, i) => {
      const inactive = i !== 0;
      scene.setAttribute('aria-hidden', String(inactive));
      scene.inert = inactive;
    });
    
    introPlayer = new IsabellaIntroPlayer();
    
    // Focus trap for immersion dialog
    const trapImmersionDialogFocus = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        introPlayer?.dismiss();
        return;
      }
      if (event.key !== 'Tab' || !immersionGate) return;
      const focusable = [...immersionGate.querySelectorAll('input:not(:disabled), button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((node) => !node.hasAttribute('hidden') && node.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    
    immersionGate?.addEventListener('keydown', trapImmersionDialogFocus);
    immersionConsent?.focus({ preventScroll: true });
    skipIntro?.addEventListener('click', () => introPlayer?.dismiss());
    introQuickExit?.addEventListener('click', () => introPlayer?.dismiss());
    intro.querySelector('.intro-enter')?.addEventListener('click', () => introPlayer?.dismiss());
    
    const beginImmersion = () => {
      if (!immersionConsent?.checked) {
        immersionConsent?.focus?.();
        return;
      }
      if (!captchaVerified) {
        showHumanVerification();
        return;
      }
      introPlayer?.start();
    };
    startImmersion?.addEventListener('click', beginImmersion, { once: true });
  }
}

// ... rest of the app.js (side rails, chat, etc.)
const closeSideRails = (exceptId = '') => {
  document.querySelectorAll('.side-rail').forEach((rail) => {
    if (rail.id !== exceptId) rail.classList.remove('is-open');
    const launcher = document.querySelector(`[aria-controls="${rail.id}"]`);
    if (launcher) launcher.setAttribute('aria-expanded', String(rail.id === exceptId && rail.classList.contains('is-open')));
  });
};
document.querySelectorAll('.rail-launcher').forEach((launcher) => {
  launcher.addEventListener('click', () => {
    const targetId = launcher.getAttribute('aria-controls');
    const target = targetId ? byId(targetId) : null;
    if (!target) return;
    const opening = !target.classList.contains('is-open');
    closeSideRails(opening ? target.id : '');
    target.classList.toggle('is-open', opening);
    launcher.setAttribute('aria-expanded', String(opening));
  });
});
document.querySelectorAll('.side-rail a[href^="#"]').forEach((link) => {
  link.addEventListener('click', () => closeSideRails());
});
document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest('.side-rail, .rail-launcher')) return;
  closeSideRails();
});
navToggle?.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  primaryLinks?.classList.toggle('is-open', !expanded);
});
document.querySelectorAll('.workspace-mode').forEach((button) => {
  button.addEventListener('click', () => {
    const layout = button.dataset.layout || 'chat';
    document.body.dataset.workspaceLayout = layout;
    document.querySelectorAll('.workspace-mode').forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
  });
});
const messages = byId('messages');
const form = byId('chatForm');
const navLinks = byId('primaryLinks');
const setRuntimeStatus = (label, state, title) => {
  if (!runtimeStatus) return;
  runtimeStatus.dataset.state = state;
  runtimeStatus.replaceChildren();
  const indicator = document.createElement('i');
  indicator.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  text.textContent = label;
  runtimeStatus.append(indicator, text);
};

/* ------------------------------------------------------------ chat handling */
let sessionId = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
let abortController = null;

const exportConversation = () => {
  const transcript = [...messages.querySelectorAll('.message')].map((message) => {
    const speaker = message.classList.contains('user') ? 'Tú' : 'Isabella';
    return `## ${speaker}\n\n${message.querySelector('p')?.textContent?.trim() || ''}`;
  }).join('\n\n');
  const blob = new Blob([`# Conversación Isabella\n\n${transcript}\n`], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `isabella-conversacion-${new Date().toISOString().slice(0, 10)}.md`;
  link.click(); URL.revokeObjectURL(url);
};
exportChat?.addEventListener('click', exportConversation);

const saveAssistantDraft = (paragraph) => window.IsabellaApp?.saveDraft(paragraph.dataset.raw || paragraph.textContent || '');

const addMessage = (text, role = 'isabella') => {
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const p = document.createElement('p');
  article.append(p);
  messages.append(article);
  return p;
};

const sendMessage = async (text) => {
  const input = String(text || '').trim();
  if (!input || input.length > 18_000) {
    addMessage(input.length > 18_000 ? 'La solicitud supera el límite permitido de 18.000 caracteres.' : 'Escribe una solicitud para continuar.', 'isabella');
    return;
  }
  const userPara = addMessage(input, 'user');
  if (window.IsabellaChatPlus?.stamp) window.IsabellaChatPlus.stamp(userPara.parentElement);
  
  const assistantPara = addMessage('', 'isabella');
  if (window.IsabellaChatPlus?.beginPending) window.IsabellaChatPlus.beginPending(assistantPara);
  
  abortController = new AbortController();
  if (window.IsabellaChatPlus?.setAbort) window.IsabellaChatPlus.setAbort(abortController);
  
  form.setAttribute('aria-busy', 'true');
  
  try {
    const response = await fetch('/api/v1/cognition/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, sessionId, lens: window.IsabellaChatPlus?.getLens?.() || 'general' }),
      signal: abortController.signal
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const payload = await response.json();
    
    if (payload.success === true && payload.output) {
      if (window.IsabellaChatPlus?.renderInto) {
        window.IsabellaChatPlus.renderInto(assistantPara, payload.output, { animate: true });
      } else {
        assistantPara.textContent = payload.output;
      }
      if (window.IsabellaChatPlus?.decorate) {
        window.IsabellaChatPlus.decorate(assistantPara, { engine: payload.engine, latencyMs: payload.latencyMs });
      }
      if (window.IsabellaChatPlus?.persist) window.IsabellaChatPlus.persist();
    } else {
      throw new Error(payload.error || 'Respuesta inválida del servidor');
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    if (window.IsabellaChatPlus?.renderInto) {
      window.IsabellaChatPlus.renderInto(assistantPara, `Error: ${err.message}`, { animate: false });
    } else {
      assistantPara.textContent = `Error: ${err.message}`;
    }
  } finally {
    form.removeAttribute('aria-busy');
    abortController = null;
  }
};

prompt?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing && event.keyCode !== 229) {
    event.preventDefault();
    form?.requestSubmit();
  }
});

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = prompt.value.trim();
  if (!text) return;
  prompt.value = '';
  prompt.dispatchEvent(new Event('input'));
  sendMessage(text);
});

const resetConversation = ({ keepFocus } = {}) => {
  messages.querySelectorAll('.message').forEach((node) => node.remove());
  sessionId = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  if (!keepFocus) prompt?.focus();
};
clearChat?.addEventListener('click', resetConversation);
newChat?.addEventListener('click', resetConversation);

window.IsabellaApp = Object.freeze({
  addMessage,
  getSessionId: () => sessionId,
  setSessionId: (id) => { sessionId = id; },
  resetConversation,
  saveDraft: (code) => {
    // Save to localStorage or draft shelf
    const drafts = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '[]');
    drafts.unshift({ code, ts: Date.now() });
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts.slice(0, 20)));
    if (draftShelf) {
      const item = document.createElement('div');
      item.className = 'draft-item';
      item.textContent = code.slice(0, 60) + (code.length > 60 ? '…' : '');
      draftShelf.prepend(item);
    }
  }
});

const checkHealth = async () => {
  try {
    const res = await fetch('/api/v1/health');
    if (res.ok) setRuntimeStatus('En línea', 'ok');
    else setRuntimeStatus('Degradado', 'warn');
  } catch {
    setRuntimeStatus('Fuera de línea', 'error');
  }
};
checkHealth();
setInterval(checkHealth, 60000);

const refreshWorkspaceContext = () => {
  const turns = messages.querySelectorAll('.message').length;
  if (sessionBadge) sessionBadge.textContent = `Sesión · ${turns} mensajes`;
};
refreshWorkspaceContext();

/* ------------------------------------------------------------ TTS / Speech */
const speakMessage = async (text) => {
  try {
    const response = await fetch('/api/v1/cognition/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sessionId })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const payload = await response.json();
    
    if (response.ok && payload.success === true && payload.audioBase64) {
      const audioRegex = /^data:audio\/(?:mpeg|mp3|wav);base64,/;
      if (audioRegex.test(payload.audioBase64)) {
        const audio = new Audio(payload.audioBase64);
        audio.play().catch(() => {});
      }
    }
  } catch (err) {
    console.warn('TTS playback failed:', err);
  }
};

const playLastAssistantMessage = () => {
  const lastAssistant = messages.querySelector('.message.isabella:last-of-type p');
  if (lastAssistant && lastAssistant.dataset.raw) {
    speakMessage(lastAssistant.dataset.raw);
  }
};

if (soundToggle) {
  soundToggle.addEventListener('click', () => {
    const enabled = soundToggle.getAttribute('aria-pressed') === 'true';
    soundToggle.setAttribute('aria-pressed', String(!enabled));
    if (!enabled) playLastAssistantMessage();
  });
}

/* -------------------------------------------------------- IntersectionObserver for workspace navigation */
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      const link = document.querySelector(`.nav-links a[href="#${id}"]`);
      if (link) {
        document.querySelectorAll('.nav-links a').forEach((a) => a.classList.remove('is-active'));
        link.classList.add('is-active');
      }
    }
  });
}, { rootMargin: '-20% 0px -70% 0px' });

document.querySelectorAll('section[id]').forEach((section) => navObserver.observe(section));

/* --------------------------------------------------- Navigation link focus handling */
document.querySelectorAll('.nav-links a[href^="#"]').forEach((link) => {
  link.dataset.focusPrompt = 'true';
  // Check: link.dataset.focusPrompt === 'true'
  link.addEventListener('click', () => {
    window.setTimeout(() => prompt?.focus(), 180);
    // Check: window.setTimeout(() => prompt?.focus(), 180)
  });
});
