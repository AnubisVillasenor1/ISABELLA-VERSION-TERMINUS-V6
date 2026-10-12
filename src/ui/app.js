const messages = document.querySelector('#messages');
const form = document.querySelector('#chatForm');
const prompt = document.querySelector('#prompt');
const mic = document.querySelector('#mic');
const soundToggle = document.querySelector('#soundToggle');
let voiceMode = false;
let soundOn = false;
const ISABELLA_VOICE_LANGUAGES = ['es-MX', 'es-419', 'es-US', 'es-ES'];
const ISABELLA_FEMALE_VOICE_NAMES = ['Sabina', 'Paulina', 'Monica', 'Mónica', 'Marisol', 'Helena', 'Luciana', 'Google español de Estados Unidos', 'Microsoft Sabina', 'Microsoft Dalia', 'Microsoft Helena'];
let isabellaVoice = null;
const addMessage = (text, role) => { const article = document.createElement('article'); article.className = `message ${role}`; article.innerHTML = `<span class="avatar">${role === 'user' ? 'TÚ' : 'IS'}</span><div><span class="speaker">${role === 'user' ? 'TÚ' : 'ISABELLA'} · AHORA</span><p></p></div>`; article.querySelector('p').textContent = text; messages.append(article); messages.scrollTop = messages.scrollHeight; };
const chooseIsabellaVoice = () => {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (isabellaVoice && voices.some((voice) => voice.voiceURI === isabellaVoice.voiceURI)) return isabellaVoice;
  const ranked = voices.map((voice) => {
    const language = voice.lang.replace('_', '-');
    const languageScore = ISABELLA_VOICE_LANGUAGES.indexOf(language);
    const femaleNameScore = ISABELLA_FEMALE_VOICE_NAMES.some((name) => voice.name.toLowerCase().includes(name.toLowerCase())) ? 100 : 0;
    const spanishScore = language.toLowerCase().startsWith('es-') ? 20 : 0;
    return { voice, score: femaleNameScore + (languageScore >= 0 ? 40 - languageScore * 5 : spanishScore) + (voice.localService ? 2 : 0) };
  }).filter(({ voice }) => voice.lang.toLowerCase().startsWith('es-')).sort((a, b) => b.score - a.score);
  isabellaVoice = ranked[0]?.voice || null;
  if (isabellaVoice) document.documentElement.dataset.isabellaVoice = isabellaVoice.voiceURI;
  return isabellaVoice;
};
if ('speechSynthesis' in window) {
  chooseIsabellaVoice();
  window.speechSynthesis.addEventListener('voiceschanged', chooseIsabellaVoice);
}
const speak = (text) => { if (soundOn && 'speechSynthesis' in window) { const voice = chooseIsabellaVoice(); if (!voice) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = .96; utterance.pitch = 1.04; window.speechSynthesis.speak(utterance); } };
form.addEventListener('submit', async (event) => { event.preventDefault(); const input = prompt.value.trim(); if (!input) return; addMessage(input, 'user'); prompt.value = ''; const pending = 'Procesando tu intención…'; addMessage(pending, 'isabella'); const pendingNode = messages.lastElementChild.querySelector('p'); try { const response = await fetch('/api/v1/cognition/route', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ input, modelEngine:'auto', focusLens:'general', history:[...messages.querySelectorAll('.message')].slice(-8,-1).map((node) => ({ role: node.classList.contains('user') ? 'user' : 'assistant', content: node.querySelector('p').textContent })) }) }); const body = await response.json(); const text = body.generativeNarrative || body.error || 'No pude completar esta respuesta.'; pendingNode.textContent = text; speak(text); } catch { pendingNode.textContent = 'La conexión con el nodo se interrumpió. Inténtalo de nuevo.'; } });
document.querySelector('#enterChat').addEventListener('click', () => { document.querySelector('#chat').scrollIntoView({ behavior:'smooth' }); setTimeout(() => prompt.focus(), 500); });
document.querySelectorAll('.mode').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.mode').forEach((item) => item.classList.remove('active')); button.classList.add('active'); voiceMode = button.dataset.mode === 'voice'; if (voiceMode) { soundOn = true; soundToggle.textContent = 'SONIDO: ON'; soundToggle.setAttribute('aria-pressed','true'); } }));
soundToggle.addEventListener('click', () => { soundOn = !soundOn; soundToggle.textContent = `SONIDO: ${soundOn ? 'ON' : 'OFF'}`; soundToggle.setAttribute('aria-pressed', String(soundOn)); });
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Recognition) { const recognition = new Recognition(); recognition.lang = 'es-MX'; recognition.interimResults = false; mic.addEventListener('click', () => { recognition.start(); mic.textContent = '…'; }); recognition.onresult = (event) => { prompt.value = event.results[0][0].transcript; mic.textContent = '◉'; prompt.focus(); }; recognition.onerror = () => { mic.textContent = '◉'; }; recognition.onend = () => { mic.textContent = '◉'; }; } else { mic.title = 'Reconocimiento de voz no disponible en este navegador'; mic.addEventListener('click', () => { addMessage('Este navegador no expone reconocimiento de voz nativo. Puedes usar el canal de texto.', 'isabella'); }); }
