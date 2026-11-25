const form = document.getElementById('latamvAssessmentForm');
const controlsHost = document.getElementById('latamvControls');
const packsHost = document.getElementById('latamvPacks');
const resultHost = document.getElementById('latamvResult');
const statusHost = document.getElementById('latamvStatus');
const historyHost = document.getElementById('latamvHistory');
const historyButton = document.getElementById('latamvHistoryRefresh');
const adminTokenInput = document.getElementById('latamvAdminToken');
const submitButton = document.getElementById('latamvSubmit');

const createElement = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const controlStatusOptions = [
  ['not_assessed', 'Sin evaluar'],
  ['implemented', 'Implementado (declarado)'],
  ['in_progress', 'En progreso'],
  ['gap', 'Brecha identificada'],
];

const renderControls = (controls) => {
  controlsHost.replaceChildren();
  controls.forEach((control) => {
    const fieldset = createElement('fieldset', 'latamv-control-card');
    const legend = createElement('legend', 'latamv-control-title', `${control.id.replaceAll('_', ' ')} · ${control.name}`);
    const objective = createElement('p', 'latamv-control-objective', control.objective);
    const statusLabel = createElement('label', 'latamv-field-label', 'Estado declarado');
    const select = document.createElement('select');
    select.name = `status-${control.id}`;
    select.dataset.controlId = control.id;
    controlStatusOptions.forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
    select.value = 'not_assessed';
    statusLabel.appendChild(select);

    const evidenceLabel = createElement('label', 'latamv-field-label', 'Referencia de evidencia (opcional)');
    const evidence = document.createElement('input');
    evidence.type = 'text';
    evidence.name = `evidence-${control.id}`;
    evidence.placeholder = 'https://… o identificador documental';
    evidence.maxLength = 2048;
    evidence.autocomplete = 'off';
    evidenceLabel.appendChild(evidence);

    select.addEventListener('change', () => {
      evidence.required = select.value === 'implemented';
      evidenceLabel.classList.toggle('is-required', evidence.required);
    });
    fieldset.append(legend, objective, statusLabel, evidenceLabel);
    controlsHost.appendChild(fieldset);
  });
};

const renderPacks = (packs) => {
  packsHost.replaceChildren();
  packs.forEach((pack) => {
    const label = document.createElement('label');
    label.className = 'latamv-pack-option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'jurisdictions';
    input.value = pack.id;
    input.checked = pack.id === 'LATAM' || pack.id === 'MX';
    const copy = createElement('span', 'latamv-pack-copy');
    copy.append(
      createElement('strong', '', pack.name),
      createElement('small', '', `${pack.version} · revisión legal pendiente`)
    );
    label.append(input, copy);
    packsHost.appendChild(label);
  });
};

const renderResult = (result) => {
  resultHost.replaceChildren();
  const summary = createElement(
    'div',
    `latamv-result-summary${result.summary.state === 'INCOMPLETE' ? ' is-incomplete' : ''}`
  );
  summary.setAttribute('role', 'status');
  summary.append(
    createElement('strong', '', `${result.summary.completenessPercent}% · ${result.summary.state.replaceAll('_', ' ')}`),
    createElement('span', '', `${result.summary.completeForReview}/8 controles con evidencia declarada; ${result.summary.evidenceMissing} sin referencia; ${result.summary.open} abiertos.`)
  );
  const hash = createElement('p', 'latamv-hash');
  hash.append(createElement('span', '', 'PEV SHA3-512 · SIN FIRMA'), createElement('code', '', result.hash.value));
  const persistence = result.claims.persistence === 'PERSISTED' ? 'GUARDADA EN SUPABASE' : 'NO GUARDADA';
  const claims = createElement('p', 'latamv-claims', `Conformidad jurídica: NO EVALUADA · Autenticidad: NO VERIFICADA · Persistencia: ${persistence}`);
  const disclaimer = createElement('p', 'latamv-disclaimer', result.disclaimers[1]);
  resultHost.append(summary, hash, claims, disclaimer);
  if (result.storedAt) {
    resultHost.append(createElement('time', 'latamv-disclaimer', `Registro durable: ${new Date(result.storedAt).toLocaleString()}`));
  }
};

const adminHeaders = () => ({
  Accept: 'application/json',
  Authorization: `Bearer ${adminTokenInput.value.trim()}`,
});

const renderHistory = (records) => {
  const title = createElement('h3', '', 'Evaluaciones persistidas');
  historyHost.replaceChildren(title);
  if (records.length === 0) {
    historyHost.append(createElement('p', '', 'No hay evaluaciones guardadas.'));
    return;
  }
  const list = createElement('ul', 'latamv-history-list');
  records.forEach((record) => {
    const item = document.createElement('li');
    const details = createElement('span', '', `${record.system_name} · ${record.system_version} · ${new Date(record.created_at).toLocaleString()} · ${record.assessment.summary.completenessPercent}%`);
    const openButton = createElement('button', '', 'ABRIR');
    openButton.type = 'button';
    openButton.addEventListener('click', () => {
      renderResult(record.assessment);
      resultHost.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    item.append(details, openButton);
    list.appendChild(item);
  });
  historyHost.appendChild(list);
};

const loadHistory = async () => {
  if (!adminTokenInput.value.trim()) {
    statusHost.textContent = 'Introduce el bearer administrativo para consultar el historial.';
    return;
  }
  historyButton.disabled = true;
  statusHost.textContent = 'Consultando historial privado…';
  try {
    const response = await fetch('/api/v1/infinity/latamv/assessments?limit=50', {
      headers: adminHeaders(),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Historial HTTP ${response.status}`);
    renderHistory(payload.assessments);
    statusHost.textContent = `${payload.count} evaluaciones recuperadas desde el almacenamiento durable.`;
  } catch (error) {
    statusHost.textContent = error instanceof Error ? error.message : 'No se pudo consultar el historial.';
  } finally {
    historyButton.disabled = false;
  }
};

historyButton?.addEventListener('click', loadHistory);

const loadCatalog = async () => {
  statusHost.textContent = 'Cargando catálogo y controles desde el runtime…';
  try {
    const response = await fetch('/api/v1/infinity/latamv', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`El catálogo respondió HTTP ${response.status}`);
    const catalog = await response.json();
    renderControls(catalog.controls);
    renderPacks(catalog.packs);
    statusHost.textContent = `${catalog.controls.length} controles listos · packs versionados como borradores.`;
  } catch (error) {
    statusHost.textContent = error instanceof Error ? error.message : 'No fue posible cargar el catálogo LATAMV.';
  }
};

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const formData = new FormData(form);
  const controls = [...controlsHost.querySelectorAll('select[data-control-id]')].map((select) => {
    const controlId = select.dataset.controlId;
    const evidence = form.querySelector(`[name="evidence-${controlId}"]`);
    return {
      controlId,
      status: select.value,
      evidenceRefs: evidence?.value ? [evidence.value] : [],
    };
  });
  const jurisdictions = formData.getAll('jurisdictions').map(String);
  if (jurisdictions.length === 0) {
    statusHost.textContent = 'Selecciona al menos una jurisdicción.';
    return;
  }
  submitButton.disabled = true;
  statusHost.textContent = 'Evaluando declaraciones…';
  try {
    const response = await fetch('/api/v1/infinity/latamv/assess', {
      method: 'POST',
      headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId: globalThis.crypto?.randomUUID?.() ?? `pev-${Date.now()}`,
        systemName: formData.get('systemName'),
        systemVersion: formData.get('systemVersion'),
        jurisdictions,
        assessedAt: new Date().toISOString(),
        controls,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || result.error || `La evaluación respondió HTTP ${response.status}`);
    renderResult(result);
    statusHost.textContent = `Evaluación ${result.assessmentId} guardada; SHA3-512 ${result.hash.value.slice(0, 16)}…`;
    await loadHistory();
  } catch (error) {
    statusHost.textContent = error instanceof Error ? error.message : 'No fue posible generar el PEV.';
  } finally {
    submitButton.disabled = false;
  }
});

void loadCatalog();
