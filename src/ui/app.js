const byId = (id) => document.getElementById(id);

const intro = byId('cinematicIntro');
const introScenes = [...document.querySelectorAll('.intro-scene')];
const introProgressBar = byId('introProgressBar');
const introSceneLabel = byId('introSceneLabel');
const introTimecode = byId('introTimecode');
const skipIntro = byId('skipIntro');
const INTRO_SCENE_MS = 4_200;
const INTRO_TOTAL_MS = INTRO_SCENE_MS * introScenes.length;
const introLabels = [
  'SECUENCIA 01 · APERTURA', 'SECUENCIA 02 · EL ORIGEN', 'SECUENCIA 03 · LA CALLE',
  'SECUENCIA 04 · NUESTRA GENTE', 'SECUENCIA 05 · RESILIENCIA', 'SECUENCIA 06 · IDENTIDAD',
  'SECUENCIA 07 · EL NÚCLEO', 'SECUENCIA 08 · ARQUITECTURA', 'SECUENCIA 09 · MEMORIA VIVA',
  'SECUENCIA 10 · PROPÓSITO', 'SECUENCIA 11 · COMPROMISO', 'SECUENCIA 12 · ACCESO'
];
let introStartedAt = 0;
let introTimer = 0;
let introPausedAt = 0;
const formatIntroTime = (milliseconds) => {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
const dismissIntro = () => {
  window.clearInterval(introTimer);
  intro?.classList.add('is-dismissed');
  document.body.classList.remove('intro-lock');
};
const advanceIntro = (elapsed = performance.now() - introStartedAt) => {
  if (!intro || !introScenes.length) return;
  const boundedElapsed = Math.max(0, Math.min(elapsed, INTRO_TOTAL_MS));
  const sceneIndex = Math.min(introScenes.length - 1, Math.floor(boundedElapsed / INTRO_SCENE_MS));
  intro.dataset.scene = String(sceneIndex);
  introScenes.forEach((scene, index) => {
    const active = index === sceneIndex;
    scene.classList.toggle('is-active', active);
    scene.setAttribute('aria-hidden', String(!active));
  });
  if (introSceneLabel) introSceneLabel.textContent = introLabels[sceneIndex] || `SECUENCIA ${String(sceneIndex + 1).padStart(2, '0')}`;
  if (introProgressBar) introProgressBar.style.width = `${(boundedElapsed / INTRO_TOTAL_MS) * 100}%`;
  if (introTimecode) introTimecode.textContent = `${formatIntroTime(boundedElapsed)} / ${formatIntroTime(INTRO_TOTAL_MS)}`;
  if (boundedElapsed >= INTRO_TOTAL_MS) dismissIntro();
};
if (intro) {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    dismissIntro();
  } else {
    document.body.classList.add('intro-lock');
    introScenes.forEach((scene, index) => scene.setAttribute('aria-hidden', String(index !== 0)));
    skipIntro?.addEventListener('click', dismissIntro);
    intro.querySelector('.intro-enter')?.addEventListener('click', dismissIntro);
    introStartedAt = performance.now();
    introTimer = window.setInterval(() => {
      if (document.hidden) {
        if (!introPausedAt) introPausedAt = performance.now();
        return;
      }
      if (introPausedAt) {
        introStartedAt += performance.now() - introPausedAt;
        introPausedAt = 0;
      }
      advanceIntro();
    }, 80);
    advanceIntro(0);
  }
}
const messages = byId('messages');
const form = byId('chatForm');
const prompt = byId('prompt');
const mic = byId('mic');
const soundToggle = byId('soundToggle');
const navToggle = byId('navToggle');
const navLinks = byId('primaryLinks');
const runtimeStatus = byId('runtimeStatus');
const submitButton = form?.querySelector('button[type="submit"]');
let voiceMode = false;
let soundOn = false;
let isSending = false;

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
  if (!soundOn || !('speechSynthesis' in window)) return;
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
  const input = prompt.value.trim();
  if (!input) {
    prompt.focus();
    return;
  }
  const history = priorHistory();
  addMessage(input, 'user');
  prompt.value = '';
  const pendingNode = addMessage('Procesando tu intención…', 'isabella');
  isSending = true;
  form.setAttribute('aria-busy', 'true');
  if (submitButton) submitButton.disabled = true;
  if (mic) mic.disabled = true;
  try {
    const response = await fetch('/api/v1/cognition/route', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ input, modelEngine: 'auto', focusLens: 'general', history })
    });
    const body = await response.json().catch(() => ({}));
    const responseText = body.generativeNarrative || body.answer || body.error;
    if (!response.ok) {
      throw new Error(typeof responseText === 'string' ? responseText : `El servicio respondió HTTP ${response.status}.`);
    }
    if (pendingNode) pendingNode.textContent = typeof responseText === 'string' && responseText.trim()
      ? responseText
      : 'El servicio respondió, pero no entregó texto. Inténtalo de nuevo.';
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
navLinks?.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', () => closeNav());
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeNav();
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
    runtimeStatus.dataset.state = 'ready';
    runtimeStatus.innerHTML = '<i aria-hidden="true"></i> NODO CERO · API DISPONIBLE';
    runtimeStatus.title = 'El endpoint de salud respondió correctamente. Esto no garantiza disponibilidad de inferencia externa.';
  } catch {
    runtimeStatus.dataset.state = 'degraded';
    runtimeStatus.innerHTML = '<i aria-hidden="true"></i> NODO CERO · ESTADO LIMITADO';
    runtimeStatus.title = 'No se pudo verificar el endpoint de salud.';
  }
};
void updateRuntimeStatus();

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
        soundToggle.textContent = 'SONIDO: ON';
        soundToggle.setAttribute('aria-pressed', 'true');
      }
      if (mic) mic.title = 'Dicta un mensaje; en modo voz se enviará al terminar el reconocimiento.';
      if (!Recognition) addMessage('El reconocimiento de voz depende del navegador y no está disponible aquí. Puedes continuar por texto.', 'isabella');
    } else if (mic) {
      mic.title = 'Dictar mensaje';
    }
  });
});
soundToggle?.addEventListener('click', () => {
  soundOn = !soundOn;
  soundToggle.textContent = `SONIDO: ${soundOn ? 'ON' : 'OFF'}`;
  soundToggle.setAttribute('aria-pressed', String(soundOn));
  if (!soundOn && 'speechSynthesis' in window) window.speechSynthesis.cancel();
});

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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

// Lattice navigation: keep the six accordions independent and route intent into the workspace.
document.querySelectorAll('.rail-panel').forEach((panel) => {
  panel.addEventListener('toggle', () => {
    if (!panel.open) return;
    panel.querySelector('summary')?.setAttribute('aria-expanded', 'true');
  });
  panel.querySelector('summary')?.setAttribute('aria-expanded', String(panel.open));
});
document.querySelectorAll('[data-focus-prompt="true"]').forEach((link) => {
  link.addEventListener('click', () => window.setTimeout(() => prompt?.focus(), 280));
});

// HyperCore Ω² — malla cuántica decorativa del hero (canvas 2D autocontenido,
// sin dependencias externas). No publica métricas: es ornamento visual honesto.
(() => {
  const canvas = byId('quantumMesh');
  if (!canvas || typeof canvas.getContext !== 'function') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const palette = ['#38bdf8', '#a855f7', '#34d399', '#8df3ff'];
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
