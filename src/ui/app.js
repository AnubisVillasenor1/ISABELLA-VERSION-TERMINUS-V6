const byId = (id) => document.getElementById(id);

const intro = byId('cinematicIntro');
const immersionGate = byId('immersionGate');
const startImmersion = byId('startImmersion');
const introVideo = byId('introVideo');
const introScenes = [...document.querySelectorAll('.intro-scene')];
const introProgressBar = byId('introProgressBar');
const introSceneLabel = byId('introSceneLabel');
const introTimecode = byId('introTimecode');
const skipIntro = byId('skipIntro');
const INTRO_SCENE_MS = 4_200;
let introTotalMs = INTRO_SCENE_MS * introScenes.length;
const introLabels = [
  'SECUENCIA 01 · APERTURA', 'SECUENCIA 02 · EL ORIGEN', 'SECUENCIA 03 · LA CALLE',
  'SECUENCIA 04 · NUESTRA GENTE', 'SECUENCIA 05 · RESILIENCIA', 'SECUENCIA 06 · IDENTIDAD',
  'SECUENCIA 07 · EL NÚCLEO', 'SECUENCIA 08 · ARQUITECTURA', 'SECUENCIA 09 · MEMORIA VIVA',
  'SECUENCIA 10 · PROPÓSITO', 'SECUENCIA 11 · COMPROMISO', 'SECUENCIA 12 · ACCESO'
];
let introStartedAt = 0;
let introTimer = 0;
let introPausedAt = 0;
let introWatchdog = 0;
let introLastVideoTime = -1;
let introLastVideoProgressAt = 0;
const formatIntroTime = (milliseconds) => {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
const markIntroVideoReady = () => {
  intro?.classList.add('media-ready');
  intro?.classList.remove('media-stalled');
  introLastVideoProgressAt = performance.now();
};
const startIntroMedia = async () => {
  if (!introVideo) return;
  window.clearInterval(introWatchdog);
  introVideo.currentTime = 0;
  introVideo.muted = false;
  introVideo.volume = 1;
  const playVideo = async () => {
    try {
      await introVideo.play();
      markIntroVideoReady();
    } catch {
      introVideo.muted = true;
      await introVideo.play().then(markIntroVideoReady).catch(() => intro?.classList.add('media-unavailable'));
    }
  };
  await playVideo();
  introLastVideoTime = introVideo.currentTime;
  introWatchdog = window.setInterval(() => {
    if (!introVideo || introVideo.paused || introVideo.ended) return;
    const now = performance.now();
    if (introVideo.currentTime !== introLastVideoTime) {
      introLastVideoTime = introVideo.currentTime;
      introLastVideoProgressAt = now;
      intro?.classList.remove('media-stalled');
      return;
    }
    if (now - introLastVideoProgressAt > 1200) {
      intro?.classList.add('media-stalled');
      void playVideo();
      introLastVideoProgressAt = now;
    }
  }, 500);
};
const stopIntroMedia = () => {
  window.clearInterval(introWatchdog);
  introVideo?.pause();
  if (introVideo) introVideo.currentTime = 0;
};
introVideo?.addEventListener('loadedmetadata', () => {
  if (Number.isFinite(introVideo.duration) && introVideo.duration > 1) {
    introTotalMs = Math.max(INTRO_SCENE_MS * introScenes.length, introVideo.duration * 1000);
  }
});
introVideo?.addEventListener('ended', () => {
  dismissIntro();
});
const dismissIntro = () => {
  window.clearInterval(introTimer);
  stopIntroMedia();
  immersionGate?.classList.add('is-accepted');
  intro?.classList.add('is-dismissed');
  document.body.classList.remove('intro-lock');
};
const advanceIntro = (elapsed = performance.now() - introStartedAt) => {
  if (!intro || !introScenes.length) return;
  const boundedElapsed = Math.max(0, Math.min(elapsed, introTotalMs));
  const sceneIndex = Math.min(introScenes.length - 1, Math.floor(boundedElapsed / INTRO_SCENE_MS));
  intro.dataset.scene = String(sceneIndex);
  introScenes.forEach((scene, index) => {
    const active = index === sceneIndex;
    scene.classList.toggle('is-active', active);
    scene.setAttribute('aria-hidden', String(!active));
  });
  if (introSceneLabel) introSceneLabel.textContent = introLabels[sceneIndex] || `SECUENCIA ${String(sceneIndex + 1).padStart(2, '0')}`;
  if (introProgressBar) introProgressBar.style.width = `${(boundedElapsed / introTotalMs) * 100}%`;
  if (introTimecode) introTimecode.textContent = `${formatIntroTime(boundedElapsed)} / ${formatIntroTime(introTotalMs)}`;
  if (boundedElapsed >= introTotalMs) dismissIntro();
};
if (intro) {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cinematicDisabled = new URLSearchParams(window.location.search).get('intro') === '0';
  const cinematicRequested = !cinematicDisabled;
  // The cinematic sequence is the initial experience. Users can bypass it with
  // reduced-motion preferences or the explicit ?intro=0 escape hatch.
  if (reducedMotion || cinematicDisabled || !cinematicRequested) {
    dismissIntro();
  } else {
    document.body.classList.add('intro-lock');
    introScenes.forEach((scene, index) => scene.setAttribute('aria-hidden', String(index !== 0)));
    skipIntro?.addEventListener('click', dismissIntro);
    intro.querySelector('.intro-enter')?.addEventListener('click', dismissIntro);
    const beginImmersion = () => {
      immersionGate?.classList.add('is-accepted');
      void startIntroMedia();
      introStartedAt = performance.now();
      introTimer = window.setInterval(() => {
        if (document.hidden) {
          if (!introPausedAt) introPausedAt = performance.now();
          return;
        }
        if (introPausedAt) { introStartedAt += performance.now() - introPausedAt; introPausedAt = 0; }
        advanceIntro();
      }, 80);
      advanceIntro(0);
    };
    startImmersion?.addEventListener('click', beginImmersion, { once: true });
  }
}
document.querySelectorAll('.rail-launcher').forEach((launcher) => {
  launcher.addEventListener('click', () => {
    const targetId = launcher.getAttribute('aria-controls');
    const target = targetId ? byId(targetId) : null;
    const isOpen = target?.classList.toggle('is-open') ?? false;
    launcher.setAttribute('aria-expanded', String(isOpen));
  });
});
document.querySelectorAll('.side-rail a[href^="#"]').forEach((link) => {
  link.addEventListener('click', () => {
    const rail = link.closest('.side-rail');
    const launcher = rail ? document.querySelector(`[aria-controls="${rail.id}"]`) : null;
    rail?.classList.remove('is-open');
    launcher?.setAttribute('aria-expanded', 'false');
  });
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
const prompt = byId('prompt');
const mic = byId('mic');
const soundToggle = byId('soundToggle');
const navToggle = byId('navToggle');
const navLinks = byId('primaryLinks');
const runtimeStatus = byId('runtimeStatus');
const setRuntimeStatus = (label, state, title) => {
  if (!runtimeStatus) return;
  runtimeStatus.dataset.state = state;
  runtimeStatus.replaceChildren();
  const indicator = document.createElement('i');
  indicator.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  text.textContent = label;
  runtimeStatus.append(indicator, text);
  runtimeStatus.title = title;
};
const sessionBadge = byId('sessionBadge');
const voiceCapability = byId('voiceCapability');
const contextInspector = byId('contextInspector');
const contextExport = byId('contextExport');
const systemInspector = byId('systemInspector');
const closeSystemInspector = byId('closeSystemInspector');
const inspectorRuntime = byId('inspectorRuntime');
const inspectorSession = byId('inspectorSession');
const inspectorVoice = byId('inspectorVoice');
const inspectorAttachment = byId('inspectorAttachment');
const submitButton = form?.querySelector('button[type="submit"]');
let voiceMode = false;
let soundOn = false;
let isSending = false;
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let sessionId = window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let activeAttachment = null;
// The public view is a VIEWER: it may only reach an external model when a free/open
// provider is configured AND the public route is open without a bearer token. Otherwise
// it uses the disclosed local sovereign engine. This mirrors server-side readiness.
let canUseExternalEngine = false;
const ENGINE_LABELS = {
  sovereign: 'MOTOR · LOCAL SOBERANO',
  'sovereign-fallback': 'MOTOR · RESPALDO LOCAL',
  'openrouter-free': 'MOTOR · OPENROUTER (GRATIS)',
  'huggingface-free': 'MOTOR · HUGGING FACE (GRATIS)',
  'open-science': 'MOTOR · PASARELA ABIERTA',
  'keyless-free': 'MOTOR · PROVEEDOR LIBRE SIN CLAVE',
  gemini: 'MOTOR · GEMINI',
  gateway: 'MOTOR · VERCEL AI GATEWAY',
  blocked: 'MOTOR · BLOQUEADO POR GOBERNANZA'
};
const BAND_LABELS = { GREEN: 'FLUJO VERDE', YELLOW: 'FLUJO AMARILLO', ORANGE: 'FLUJO NARANJA', RED: 'FLUJO ROJO' };
const selectEngine = () => 'auto';

const setResponseMeta = (paragraph, meta) => {
  if (!paragraph || !meta) return;
  const row = paragraph.closest('.message')?.querySelector('.response-badges');
  if (!row) return;
  row.replaceChildren();
  const engine = typeof meta.engine === 'string' ? meta.engine : '';
  if (engine) {
    const chip = document.createElement('span');
    chip.className = `meta-chip engine-chip engine-${engine}`;
    chip.textContent = ENGINE_LABELS[engine] || `MOTOR · ${engine.toUpperCase()}`;
    row.append(chip);
  }
  const band = typeof meta.trafficLight?.band === 'string' ? meta.trafficLight.band : '';
  if (band) {
    const chip = document.createElement('span');
    chip.className = `meta-chip band-chip band-${band.toLowerCase()}`;
    chip.textContent = `${BAND_LABELS[band] || band}${meta.trafficLight.humanReviewRequired ? ' · REVISIÓN HUMANA' : ''}`;
    row.append(chip);
  }
  if (engine.startsWith('sovereign') || engine === 'gateway' || engine === 'open-science' || engine === 'keyless-free') {
    const note = document.createElement('span');
    note.className = 'meta-chip engine-note';
    note.textContent = engine === 'gateway' || engine === 'open-science' || engine === 'keyless-free' ? 'AGENTE EXTERNO · RESPUESTA GENERATIVA' : meta.modelConfigured ? 'PROVEEDOR DISPONIBLE · FALLBACK LOCAL' : 'MODO LOCAL (SIN PROVEEDOR EXTERNO)';
    row.append(note);
  }
  row.hidden = row.childElementCount === 0;
};

const refreshWorkspaceContext = () => {
  const shortSession = sessionId.slice(-6).toUpperCase();
  if (sessionBadge) sessionBadge.textContent = `SESSION · ${shortSession}`;
  if (inspectorSession) inspectorSession.textContent = `ACTIVE · ${shortSession}`;
  if (inspectorVoice) inspectorVoice.textContent = ('speechSynthesis' in window || Recognition) ? 'BROWSER' : 'TEXT ONLY';
  if (inspectorAttachment) inspectorAttachment.textContent = activeAttachment?.name ? activeAttachment.name.slice(0, 22) : 'NONE';
};

const addMessage = (text, role) => {
  if (!messages) return null;
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? 'TÚ' : 'IS';
  const content = document.createElement('div');
  const speaker = document.createElement('span');
  speaker.className = 'speaker';
  speaker.textContent = `${role === 'user' ? 'TÚ' : 'ISABELLA'} · AHORA`;
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  content.append(speaker, paragraph);
  if (role !== 'user') {
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'message-copy';
    copyButton.textContent = 'COPIAR';
    copyButton.setAttribute('aria-label', 'Copiar respuesta de Isabella');
    copyButton.addEventListener('click', async () => {
      const value = paragraph.textContent || '';
      try {
        await navigator.clipboard.writeText(value);
        copyButton.textContent = 'COPIADO';
      } catch {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(paragraph);
        selection?.removeAllRanges();
        selection?.addRange(range);
        copyButton.textContent = 'TEXTO SELECCIONADO';
      }
      copyButton.disabled = true;
      window.setTimeout(() => {
        copyButton.textContent = 'COPIAR';
        copyButton.disabled = false;
      }, 1800);
    });
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'message-save';
    saveButton.textContent = 'GUARDAR';
    saveButton.setAttribute('aria-label', 'Guardar respuesta en Studio local');
    saveButton.addEventListener('click', () => saveDraft(paragraph.textContent || ''));
    const readButton = document.createElement('button');
    readButton.type = 'button';
    readButton.className = 'message-read';
    readButton.textContent = 'ESCUCHAR';
    readButton.setAttribute('aria-label', 'Leer respuesta en voz alta');
    readButton.addEventListener('click', () => {
      soundOn = true;
      if (soundToggle) {
        soundToggle.textContent = 'VOZ: ON';
        soundToggle.setAttribute('aria-pressed', 'true');
      }
      speak(paragraph.textContent || '');
    });
    content.append(copyButton, saveButton, readButton);
    const badgeRow = document.createElement('span');
    badgeRow.className = 'response-badges';
    badgeRow.hidden = true;
    content.append(badgeRow);
  }
  article.append(avatar, content);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
  return paragraph;
};

const priorHistory = () => {
  if (!messages) return [];
  return [...messages.querySelectorAll('.message')]
    .slice(-8)
    .map((node) => ({
      role: node.classList.contains('user') ? 'user' : 'assistant',
      content: node.querySelector('p')?.textContent?.trim() || ''
    }))
    .filter((turn) => turn.content)
    .map((turn) => ({ role: turn.role, content: turn.content.slice(0, 2_000) }));
};

const ISABELLA_VOICE_LANGUAGES = ['es-MX', 'es-419', 'es-US', 'es-ES'];
const ISABELLA_VOICE_NAMES = ['Sabina', 'Paulina', 'Monica', 'Mónica', 'Marisol', 'Helena', 'Luciana', 'Dalia'];
let isabellaVoice = null;
const chooseIsabellaVoice = () => {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (isabellaVoice && voices.some((voice) => voice.voiceURI === isabellaVoice.voiceURI)) return isabellaVoice;
  const ranked = voices.map((voice) => {
    const language = voice.lang.replace('_', '-');
    const languageScore = ISABELLA_VOICE_LANGUAGES.indexOf(language);
    const namedVoiceScore = ISABELLA_VOICE_NAMES.some((name) => voice.name.toLowerCase().includes(name.toLowerCase())) ? 100 : 0;
    const spanishScore = language.toLowerCase().startsWith('es-') ? 20 : 0;
    return { voice, score: namedVoiceScore + (languageScore >= 0 ? 40 - languageScore * 5 : spanishScore) + (voice.localService ? 2 : 0) };
  }).filter(({ voice }) => voice.lang.toLowerCase().startsWith('es-')).sort((a, b) => b.score - a.score);
  isabellaVoice = ranked[0]?.voice || null;
  if (isabellaVoice) document.documentElement.dataset.isabellaVoice = isabellaVoice.voiceURI;
  return isabellaVoice;
};
if ('speechSynthesis' in window) {
  chooseIsabellaVoice();
  window.speechSynthesis.addEventListener('voiceschanged', chooseIsabellaVoice);
}
const speak = (text) => {
  if (!soundOn) return;
  if (!('speechSynthesis' in window)) {
    addMessage('La síntesis de voz no está disponible en este navegador. La respuesta permanece disponible como texto.', 'isabella');
    return;
  }
  const voice = chooseIsabellaVoice();
  if (!voice) {
    addMessage('La síntesis de voz no tiene una voz española disponible en este navegador; la respuesta queda disponible en texto.', 'isabella');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.96;
  utterance.pitch = 1.04;
  window.speechSynthesis.speak(utterance);
};

const sendCurrentMessage = async () => {
  if (!form || !prompt || isSending) return;
  const visibleInput = prompt.value.trim();
  const attachment = activeAttachment;
  if (!visibleInput && !attachment) {
    prompt.focus();
    return;
  }
  const actualPrompt = visibleInput || 'Analiza el archivo adjunto y resume los puntos clave, riesgos y preguntas abiertas.';
  const input = attachment
    ? `${actualPrompt}\n\n[CONTEXTO DE ARCHIVO LOCAL: ${attachment.name}]\n${attachment.content}`
    : actualPrompt;
  if (input.length > 18_000) {
    addMessage('La solicitud combinada supera el límite seguro de 18,000 caracteres para esta ruta. Reduce el texto del mensaje o el archivo adjunto y vuelve a intentarlo.', 'isabella');
    return;
  }
  const history = priorHistory();
  addMessage(`${actualPrompt}${attachment ? `\n\nArchivo adjunto: ${attachment.name}` : ''}`, 'user');
  prompt.value = '';
  clearActiveAttachment();
  resizePrompt();
  const pendingNode = addMessage('Procesando tu intención…', 'isabella');
  isSending = true;
  form.setAttribute('aria-busy', 'true');
  if (submitButton) submitButton.disabled = true;
  if (mic) mic.disabled = true;
  try {
    const requestCognition = (modelEngine) => fetch('/api/v1/cognition/route', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', 'x-session-id': sessionId },
      body: JSON.stringify({ input, modelEngine, focusLens: 'general', history })
    });
    const engine = selectEngine();
    let response = await requestCognition(engine);
    let body = await response.json().catch(() => ({}));
    // Never strand the viewer: if the provider route is closed (auth/not configured),
    // transparently fall back to the local sovereign engine and disclose it.
    if (!response.ok && engine !== 'sovereign' && [401, 402, 403, 503].includes(response.status)) {
      response = await requestCognition('sovereign');
      body = await response.json().catch(() => ({}));
    }
    const responseText = body.generativeNarrative || body.answer || body.error;
    if (!response.ok) {
      throw new Error(typeof responseText === 'string' ? responseText : `El servicio respondió HTTP ${response.status}.`);
    }
    if (pendingNode) {
      pendingNode.textContent = typeof responseText === 'string' && responseText.trim()
        ? responseText
        : 'El servicio respondió, pero no entregó texto. Inténtalo de nuevo.';
      setResponseMeta(pendingNode, {
        engine: body.responseEngine,
        trafficLight: body.trafficLight,
        modelConfigured: body.modelConfigured,
        openModelConfigured: body.openModelConfigured
      });
    }
    if (typeof responseText === 'string' && responseText.trim()) speak(responseText);
  } catch (error) {
    if (pendingNode) pendingNode.textContent = error instanceof Error && error.message
      ? `No pude completar la solicitud: ${error.message.slice(0, 240)}`
      : 'La conexión con el nodo se interrumpió. Inténtalo de nuevo.';
  } finally {
    isSending = false;
    form.removeAttribute('aria-busy');
    if (submitButton) submitButton.disabled = false;
    if (mic) mic.disabled = false;
    prompt.focus();
  }
};
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.nativeEvent?.isComposing || event.keyCode === 229) return;
  if (event.submitter?.disabled || isSending) return;
  void sendCurrentMessage();
});

byId('enterChat')?.addEventListener('click', () => {
  byId('chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.setTimeout(() => prompt?.focus(), 350);
});

const closeNav = () => {
  navLinks?.classList.remove('is-open');
  navToggle?.setAttribute('aria-expanded', 'false');
  navToggle?.setAttribute('aria-label', 'Abrir navegación');
};
navToggle?.addEventListener('click', () => {
  const opening = navToggle.getAttribute('aria-expanded') !== 'true';
  navToggle.setAttribute('aria-expanded', String(opening));
  navToggle.setAttribute('aria-label', opening ? 'Cerrar navegación' : 'Abrir navegación');
  navLinks?.classList.toggle('is-open', opening);
});
const navigateToHash = (selector, event) => {
  if (!selector || !selector.startsWith('#')) return false;
  const target = document.getElementById(selector.slice(1));
  if (!target) return false;
  event?.preventDefault();
  closeNav();
  document.querySelectorAll('.side-rail.is-open').forEach((rail) => rail.classList.remove('is-open'));
  document.querySelectorAll('.rail-launcher[aria-expanded="true"]').forEach((launcher) => launcher.setAttribute('aria-expanded', 'false'));
  target.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  window.history.replaceState(null, '', selector);
  return true;
};
document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest('a[href^="#"]');
  if (link) navigateToHash(link.getAttribute('href'), event);
});

// Keep every navigation surface on the same interaction path. Some embedded
// preview shells intercept native hash navigation, so the app owns the scroll
// and history update instead of relying on browser defaults.
const bindNavigationSurface = (selector) => {
  document.querySelectorAll(selector).forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (href?.startsWith('#')) navigateToHash(href, event);
    });
  });
};
bindNavigationSurface('.topbar a[href^="#"], .side-rail a[href^="#"], .hero a[href^="#"], .access-section a[href^="#"], .intro-enter[href^="#"]');
if (window.location.hash) {
  window.requestAnimationFrame(() => navigateToHash(window.location.hash));
}
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeNav();
    document.querySelectorAll('.side-rail.is-open').forEach((rail) => rail.classList.remove('is-open'));
    document.querySelectorAll('.rail-launcher[aria-expanded="true"]').forEach((launcher) => launcher.setAttribute('aria-expanded', 'false'));
  }
});
document.addEventListener('click', (event) => {
  if (navToggle?.getAttribute('aria-expanded') !== 'true') return;
  const target = event.target;
  if (target instanceof Node && !navToggle.contains(target) && !navLinks?.contains(target)) closeNav();
});

const navAnchors = [...(navLinks?.querySelectorAll('a[href^="#"]') || [])];
const navTargets = navAnchors.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
if ('IntersectionObserver' in window && navTargets.length) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navAnchors.forEach((link) => {
      const active = link.hash === `#${visible.target.id}`;
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-18% 0px -62% 0px', threshold: [0, 0.15, 0.4, 0.7] });
  navTargets.forEach((target) => observer.observe(target));
}

const updateRuntimeStatus = async () => {
  if (!runtimeStatus) return;
  try {
    const response = await fetch('/api/v1/health', { headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setRuntimeStatus('NODO CERO · API DISPONIBLE', 'ready', 'El endpoint de salud respondió correctamente. Esto no garantiza disponibilidad de inferencia externa.');
    if (inspectorRuntime) inspectorRuntime.textContent = 'READY';
  } catch {
    setRuntimeStatus('NODO CERO · ESTADO LIMITADO', 'degraded', 'No se pudo verificar el endpoint de salud.');
    if (inspectorRuntime) inspectorRuntime.textContent = 'LIMITED';
  }
};
refreshWorkspaceContext();
void updateRuntimeStatus();

// Learn, once, whether an external free/open model is actually reachable from this
// viewer. The disclosure is honored exactly: no provider key or hidden route is assumed.
const hydrateEngineConfig = async () => {
  try {
    const response = await fetch('/api/v1/cognition/native-runtime', { headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) return;
    const body = await response.json();
    const provider = body?.provider ?? {};
  canUseExternalEngine = provider.modelConfigured === true && provider.publicRouteRequiresToken !== true;
  if (inspectorRuntime && canUseExternalEngine) inspectorRuntime.textContent = 'READY · AGENT';
  } catch {
    // Keep the local sovereign engine; it always works without network or credentials.
  }
};
void hydrateEngineConfig();

document.querySelectorAll('.mode').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.mode').forEach((item) => {
      item.classList.toggle('active', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    voiceMode = button.dataset.mode === 'voice';
    if (voiceMode) {
      soundOn = true;
      if (soundToggle) {
        soundToggle.textContent = 'VOZ: ON';
        soundToggle.setAttribute('aria-pressed', 'true');
      }
      voiceCapability?.classList.add('is-active');
      if (mic) mic.title = 'Dicta un mensaje; en modo voz se enviará al terminar el reconocimiento.';
      if (!Recognition) addMessage('El reconocimiento de voz depende del navegador y no está disponible aquí. Puedes continuar por texto.', 'isabella');
    } else if (mic) {
      mic.title = 'Dictar mensaje';
    }
  });
});
soundToggle?.addEventListener('click', () => {
  soundOn = !soundOn;
  soundToggle.textContent = `VOZ: ${soundOn ? 'ON' : 'OFF'}`;
  voiceCapability?.classList.toggle('is-active', soundOn);
  if (inspectorVoice) inspectorVoice.textContent = soundOn && ('speechSynthesis' in window) ? 'ON' : (('speechSynthesis' in window || Recognition) ? 'BROWSER' : 'TEXT ONLY');
  soundToggle.setAttribute('aria-pressed', String(soundOn));
  if (!soundOn && 'speechSynthesis' in window) window.speechSynthesis.cancel();
});

if (Recognition && mic) {
  const recognition = new Recognition();
  let recognitionActive = false;
  recognition.lang = 'es-MX';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.onstart = () => {
    recognitionActive = true;
    mic.textContent = '…';
    mic.setAttribute('aria-label', 'Escuchando; activar para detener');
    mic.setAttribute('aria-pressed', 'true');
  };
  mic.addEventListener('click', () => {
    try {
      if (recognitionActive) {
        recognition.stop();
        return;
      }
      recognition.start();
    } catch {
      addMessage('El micrófono ya está activo o el navegador rechazó el inicio. Revisa los permisos e inténtalo de nuevo.', 'isabella');
    }
  });
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim();
    if (!transcript || !prompt) return;
    prompt.value = transcript;
    prompt.focus();
    if (voiceMode) form?.requestSubmit();
  };
  recognition.onerror = (event) => {
    const reason = event.error === 'not-allowed' ? 'Permite el acceso al micrófono en la configuración del navegador.' :
      event.error === 'no-speech' ? 'No detecté voz. Inténtalo de nuevo.' :
      'No se pudo completar el reconocimiento de voz.';
    addMessage(reason, 'isabella');
  };
  recognition.onend = () => {
    recognitionActive = false;
    mic.textContent = '◉';
    mic.setAttribute('aria-label', 'Activar micrófono');
    mic.setAttribute('aria-pressed', 'false');
  };
} else if (mic) {
  mic.title = 'Reconocimiento de voz no disponible en este navegador';
  mic.addEventListener('click', () => {
    addMessage('Este navegador no expone reconocimiento de voz nativo. Puedes usar el canal de texto.', 'isabella');
  });
}



// HyperCore Ω² — malla cuántica decorativa del hero (canvas 2D autocontenido,
// sin dependencias externas). No publica métricas: es ornamento visual honesto.
(() => {
  const canvas = byId('quantumMesh');
  if (!canvas || typeof canvas.getContext !== 'function') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const palette = ['#dfeaf3', '#8df3ff', '#79b8df', '#b8c9d8'];
  let width = 0;
  let height = 0;
  let nodes = [];
  let frame = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const density = Math.max(16, Math.min(54, Math.floor((width * height) / 26000)));
    nodes = Array.from({ length: density }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: 0.7 + Math.random() * 1.5,
      color: palette[index % palette.length]
    }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    for (const node of nodes) {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
    }
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distance = Math.hypot(dx, dy);
        if (distance > 132) continue;
        ctx.globalAlpha = (1 - distance / 132) * 0.16;
        ctx.strokeStyle = nodes[i].color;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    for (const node of nodes) {
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fill();
    }
    frame = window.requestAnimationFrame(draw);
  };
  resize();
  frame = window.requestAnimationFrame(draw);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    } else if (!document.hidden && !frame) {
      frame = window.requestAnimationFrame(draw);
    }
  });
})();


// Workspace v2026: teclado global, borradores locales, exportación y adjuntos de texto.
// No se crean sesiones persistentes ni se simulan proveedores externos.
const DRAFT_STORAGE_KEY = 'isabella-genesis-local-drafts-v1';
const localFileInput = byId('localFile');
const attachTextButton = byId('attachText');
const attachmentChip = byId('attachmentChip');
const attachmentName = byId('attachmentName');
const removeAttachmentButton = byId('removeAttachment');
const commandPalette = byId('commandPalette');
const commandSearch = byId('commandSearch');
const commandList = byId('commandList');
const commandLauncher = byId('commandLauncher');
const closeCommandPalette = byId('closeCommandPalette');
const draftShelf = byId('draftShelf');
const MAX_LOCAL_FILE_BYTES = 25 * 1024;
const MAX_LOCAL_FILE_CHARS = 12_000;
const newSessionSeed = () => window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const initialWelcomeMarkup = messages?.querySelector('.message')?.outerHTML || '';

const resizePrompt = () => {
  if (!prompt) return;
  prompt.style.height = 'auto';
  prompt.style.height = `${Math.min(prompt.scrollHeight, 180)}px`;
};
prompt?.addEventListener('input', resizePrompt);
prompt?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    form?.requestSubmit();
  }
});

const clearActiveAttachment = () => {
  activeAttachment = null;
  if (attachmentChip) attachmentChip.hidden = true;
  if (attachmentName) attachmentName.textContent = '';
  if (localFileInput) localFileInput.value = '';
  refreshWorkspaceContext();
};
attachTextButton?.addEventListener('click', () => localFileInput?.click());
removeAttachmentButton?.addEventListener('click', clearActiveAttachment);
localFileInput?.addEventListener('change', async () => {
  const file = localFileInput.files?.[0];
  if (!file) return;
  const allowedExtension = /\.(txt|md|csv|json|log)$/i.test(file.name);
  if (!allowedExtension || file.size > MAX_LOCAL_FILE_BYTES) {
    clearActiveAttachment();
    addMessage('No se adjuntó el archivo. Esta versión acepta .txt, .md, .csv, .json o .log de hasta 25 KB; los PDF y documentos binarios no están habilitados en este flujo.', 'isabella');
    return;
  }
  try {
    const content = await file.text();
    if (!content.trim() || content.length > MAX_LOCAL_FILE_CHARS) {
      clearActiveAttachment();
      addMessage('El archivo está vacío o supera el límite de texto procesable de esta interfaz.', 'isabella');
      return;
    }
    activeAttachment = { name: file.name.slice(0, 160), content };
    if (attachmentName) attachmentName.textContent = activeAttachment.name;
    if (attachmentChip) attachmentChip.hidden = false;
    refreshWorkspaceContext();
    prompt?.focus();
  } catch {
    clearActiveAttachment();
    addMessage('No pude leer ese archivo en este navegador. Intenta guardarlo como texto UTF-8 y volver a adjuntarlo.', 'isabella');
  }
});

document.querySelectorAll('[data-starter]').forEach((starter) => {
  starter.addEventListener('click', () => {
    const template = starter.getAttribute('data-starter') || '';
    if (prompt) {
      prompt.value = template;
      resizePrompt();
    }
    byId('chat')?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => prompt?.focus(), 180);
  });
});

const readDrafts = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry.id === 'string' && typeof entry.content === 'string').slice(0, 30) : [];
  } catch {
    return [];
  }
};
const downloadTextFile = (filename, content, type = 'text/markdown;charset=utf-8') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
};
const safeFilename = (value) => value.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'isabella';
const copyToClipboard = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const helper = document.createElement('textarea');
    helper.value = value;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.append(helper);
    helper.select();
    const copied = document.execCommand?.('copy') === true;
    helper.remove();
    return copied;
  }
};
const renderDraftShelf = () => {
  if (!draftShelf) return;
  const drafts = readDrafts();
  draftShelf.replaceChildren();
  if (!drafts.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-shelf';
    empty.textContent = 'Tus respuestas guardadas aparecerán aquí. Usa «Guardar» debajo de una respuesta para conservarla.';
    draftShelf.append(empty);
    return;
  }
  drafts.forEach((draft) => {
    const article = document.createElement('article');
    article.className = 'draft-card';
    const heading = document.createElement('h3');
    heading.textContent = draft.title || 'Respuesta guardada';
    const meta = document.createElement('p');
    meta.className = 'draft-meta';
    meta.textContent = new Date(draft.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
    const preview = document.createElement('p');
    preview.className = 'draft-preview';
    preview.textContent = draft.content.length > 260 ? `${draft.content.slice(0, 260)}…` : draft.content;
    const actions = document.createElement('div');
    actions.className = 'draft-actions';
    const makeAction = (label, action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => action(draft));
      return button;
    };
    actions.append(
      makeAction('Copiar', async (item) => {
        const copied = await copyToClipboard(item.content);
        if (!copied) {
          downloadTextFile(`${safeFilename(item.title)}.md`, item.content);
        }
      }),
      makeAction('Descargar', (item) => downloadTextFile(`${safeFilename(item.title)}.md`, item.content)),
      makeAction('Eliminar', (item) => {
        try {
          window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(readDrafts().filter((saved) => saved.id !== item.id)));
          renderDraftShelf();
        } catch {
          addMessage('El navegador no permitió modificar el almacenamiento local.', 'isabella');
        }
      })
    );
    article.append(heading, meta, preview, actions);
    draftShelf.append(article);
  });
};
const saveDraft = (content) => {
  const normalized = String(content || '').trim();
  if (!normalized || normalized === 'Procesando tu intención…') return;
  const drafts = readDrafts();
  const title = normalized.split('\n').map((line) => line.replace(/^#+\s*/, '').trim()).find(Boolean)?.slice(0, 90) || 'Respuesta guardada';
  const entry = {
    id: newSessionSeed(),
    title,
    content: normalized.slice(0, 40_000),
    createdAt: new Date().toISOString()
  };
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify([entry, ...drafts].slice(0, 30)));
    renderDraftShelf();
    byId('studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    addMessage('No pude guardar esta respuesta en el almacenamiento de este navegador. Puedes usar «Copiar» o «Exportar .md».', 'isabella');
  }
};
const exportConversation = () => {
  const entries = [...(messages?.querySelectorAll('.message') || [])].map((node) => {
    const role = node.classList.contains('user') ? 'Tú' : 'Isabella';
    const content = node.querySelector('p')?.textContent?.trim() || '';
    return content ? `## ${role}\n\n${content}` : '';
  }).filter(Boolean);
  if (!entries.length) {
    addMessage('Todavía no hay mensajes para exportar.', 'isabella');
    return;
  }
  const content = `# Conversación con Isabella\n\nExportada desde esta sesión el ${new Date().toLocaleString('es-MX')}\n\n${entries.join('\n\n---\n\n')}\n`;
  downloadTextFile(`isabella-conversacion-${new Date().toISOString().slice(0, 10)}.md`, content);
};
const resetConversation = () => {
  if (!messages) return;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  messages.innerHTML = initialWelcomeMarkup;
  sessionId = newSessionSeed();
  prompt && (prompt.value = '');
  clearActiveAttachment();
  refreshWorkspaceContext();
  resizePrompt();
  prompt?.focus();
};
byId('newChat')?.addEventListener('click', resetConversation);
byId('clearChat')?.addEventListener('click', resetConversation);
contextExport?.addEventListener('click', exportConversation);

const closeInspector = () => {
  if (systemInspector?.open) systemInspector.close();
};
contextInspector?.addEventListener('click', () => {
  refreshWorkspaceContext();
  if (typeof systemInspector?.showModal === 'function') systemInspector.showModal();
});
closeSystemInspector?.addEventListener('click', closeInspector);
systemInspector?.addEventListener('click', (event) => {
  if (event.target === systemInspector) closeInspector();
});
byId('exportChat')?.addEventListener('click', exportConversation);
byId('clearDrafts')?.addEventListener('click', () => {
  if (!readDrafts().length) return;
  if (!window.confirm('¿Eliminar todos los borradores guardados en este navegador?')) return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    renderDraftShelf();
  } catch {
    addMessage('El navegador no permitió limpiar los borradores locales.', 'isabella');
  }
});
renderDraftShelf();

const openCommandPalette = () => {
  if (!commandPalette) return;
  if (typeof commandPalette.showModal === 'function') commandPalette.showModal();
  else commandPalette.setAttribute('open', '');
  if (commandSearch) {
    commandSearch.value = '';
    filterCommands('');
    window.setTimeout(() => commandSearch.focus(), 30);
  }
};
const closePalette = () => {
  if (!commandPalette) return;
  if (typeof commandPalette.close === 'function') commandPalette.close();
  else commandPalette.removeAttribute('open');
};
const filterCommands = (query) => {
  if (!commandList) return;
  const normalized = String(query || '').trim().toLocaleLowerCase('es-MX');
  commandList.querySelectorAll('[data-command]').forEach((button) => {
    const haystack = `${button.textContent || ''} ${button.getAttribute('data-keywords') || ''}`.toLocaleLowerCase('es-MX');
    button.hidden = normalized.length > 0 && !haystack.includes(normalized);
  });
};
commandLauncher?.addEventListener('click', openCommandPalette);
closeCommandPalette?.addEventListener('click', closePalette);
commandPalette?.addEventListener('click', (event) => {
  if (event.target === commandPalette) closePalette();
});
commandSearch?.addEventListener('input', () => filterCommands(commandSearch.value));
commandSearch?.addEventListener('keydown', (event) => {
  const visible = [...(commandList?.querySelectorAll('[data-command]') || [])].filter((button) => !button.hidden);
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    visible[0]?.focus();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    visible.at(-1)?.focus();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    visible[0]?.click();
  }
});
commandList?.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const visible = [...(commandList.querySelectorAll('[data-command]') || [])].filter((button) => !button.hidden);
  const currentIndex = visible.indexOf(document.activeElement);
  if (currentIndex < 0 || visible.length < 2) return;
  event.preventDefault();
  const direction = event.key === 'ArrowDown' ? 1 : -1;
  const nextIndex = (currentIndex + direction + visible.length) % visible.length;
  visible[nextIndex]?.focus();
});
const runCommand = (command) => {
  const targets = {
    'go-chat': '#chat',
    'go-studio': '#studio',
    'go-tools': '#tools',
    'go-skills': '#skills',
    'go-economy': '#economy',
    'go-evidence': '#evidence',
    'go-governance': '#governance'
  };
  closePalette();
  if (command === 'new-chat') {
    resetConversation();
    byId('chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (command === 'export-chat') {
    exportConversation();
    return;
  }
  if (command === 'toggle-voice') {
    soundOn = !soundOn;
    if (soundToggle) {
      soundToggle.textContent = `VOZ: ${soundOn ? 'ON' : 'OFF'}`;
      soundToggle.setAttribute('aria-pressed', String(soundOn));
    }
    if (!soundOn && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    return;
  }
  if (command === 'focus-prompt') {
    byId('chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => prompt?.focus(), 180);
    return;
  }
  if (targets[command]) {
    document.querySelector(targets[command])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (command === 'go-chat') window.setTimeout(() => prompt?.focus(), 180);
  }
};
commandList?.querySelectorAll('[data-command]').forEach((button) => {
  button.addEventListener('click', () => runCommand(button.getAttribute('data-command') || ''));
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeNav();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (commandPalette?.open) closePalette();
    else openCommandPalette();
  }
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey &&
      !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') &&
      !document.querySelector('dialog[open]')) {
    event.preventDefault();
    byId('chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => prompt?.focus(), 180);
  }
});
