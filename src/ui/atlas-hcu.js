/* global Blob, Element, Headers, URL, document, fetch, navigator, window */
(() => {
  'use strict';

  const API_PATH = '/api/v1/atlas/hcu';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const state = {
    nodes: [],
    edges: [],
    selectedSourceId: '',
    impacts: [],
    editingNodeId: '',
    editingEdgeId: '',
  };

  const byId = (id) => document.getElementById(id);
  const nodeForm = byId('atlasHcuNodeForm');
  const edgeForm = byId('atlasHcuEdgeForm');
  if (!nodeForm || !edgeForm) return;

  const elements = {
    status: byId('atlasHcuStatus'),
    notice: byId('atlasHcuNotice'),
    nodeCount: byId('atlasHcuNodeCount'),
    edgeCount: byId('atlasHcuEdgeCount'),
    citedCount: byId('atlasHcuCitedCount'),
    totalEdges: byId('atlasHcuTotalEdges'),
    graph: byId('atlasHcuGraph'),
    graphEmpty: byId('atlasHcuGraphEmpty'),
    graphSummary: byId('atlasHcuGraphSummary'),
    sourceSelect: byId('atlasHcuSourceSelect'),
    endYear: byId('atlasHcuEndYear'),
    simulate: byId('atlasHcuSimulate'),
    simulationStatus: byId('atlasHcuSimulationStatus'),
    impactList: byId('atlasHcuImpactList'),
    evidenceChart: byId('atlasHcuEvidenceChart'),
    evidenceSummary: byId('atlasHcuEvidenceSummary'),
    evidenceGaps: byId('atlasHcuEvidenceGaps'),
    dataStatus: byId('atlasHcuDataStatus'),
    copyJson: byId('atlasHcuCopyJson'),
    downloadJson: byId('atlasHcuDownloadJson'),
    nodeId: byId('atlasHcuNodeId'),
    nodeName: byId('atlasHcuNodeName'),
    nodeDomain: byId('atlasHcuNodeDomain'),
    nodeInfluence: byId('atlasHcuNodeInfluence'),
    nodeRisk: byId('atlasHcuNodeRisk'),
    nodeEvidence: byId('atlasHcuNodeEvidence'),
    nodeFormTitle: byId('atlasHcuNodeFormTitle'),
    nodeSubmit: byId('atlasHcuNodeSubmit'),
    nodeCancel: byId('atlasHcuNodeCancel'),
    edgeId: byId('atlasHcuEdgeId'),
    edgeSource: byId('atlasHcuEdgeSource'),
    edgeTarget: byId('atlasHcuEdgeTarget'),
    effectSign: byId('atlasHcuEffectSign'),
    strength: byId('atlasHcuStrength'),
    lagYears: byId('atlasHcuLagYears'),
    evidenceSource: byId('atlasHcuEvidenceSource'),
    edgeFormTitle: byId('atlasHcuEdgeFormTitle'),
    edgeSubmit: byId('atlasHcuEdgeSubmit'),
    edgeCancel: byId('atlasHcuEdgeCancel'),
    nodeList: byId('atlasHcuNodeList'),
    edgeList: byId('atlasHcuEdgeList'),
    nodeListCount: byId('atlasHcuNodeListCount'),
    edgeListCount: byId('atlasHcuEdgeListCount'),
  };

  if (elements.endYear) elements.endYear.min = String(new Date().getFullYear());

  const numberInputs = [
    [elements.nodeInfluence, byId('atlasHcuInfluenceValue')],
    [elements.nodeRisk, byId('atlasHcuRiskValue')],
    [elements.nodeEvidence, byId('atlasHcuEvidenceValue')],
  ];

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    return element;
  }

  function appendText(parent, text, attributes = {}) {
    const element = svgElement('text', attributes);
    element.textContent = text;
    parent.append(element);
    return element;
  }

  function setStatus(message, status = 'ready') {
    if (!elements.status) return;
    elements.status.textContent = message;
    elements.status.dataset.state = status;
  }

  function setNotice(message = '') {
    if (!elements.notice) return;
    elements.notice.textContent = message;
    elements.notice.hidden = !message;
  }

  function setFeedback(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.dataset.state = isError ? 'error' : 'ready';
  }

  function messageForError(error) {
    const code = error instanceof Error ? error.message : '';
    const messages = {
      ATLAS_HCU_PERSISTENCE_UNAVAILABLE:
        'El almacenamiento Atlas HCU no está disponible en este entorno.',
      ATLAS_HCU_SESSION_UNAVAILABLE:
        'No se pudo validar la sesión. Recarga la página e inténtalo de nuevo.',
      ATLAS_HCU_LOAD_FAILED: 'No se pudo cargar el mapa. Inténtalo de nuevo.',
      ATLAS_HCU_SOURCE_NOT_FOUND:
        'El nodo de origen ya no existe. Recarga el mapa y vuelve a elegirlo.',
      ATLAS_HCU_SIMULATION_INVALID: 'El escenario no es válido. Comprueba el nodo y el año final.',
      ATLAS_HCU_SIMULATION_FAILED: 'No se pudo calcular la cascada. Inténtalo de nuevo.',
      ATLAS_HCU_NODE_INVALID: 'Revisa los datos del nodo y los límites indicados.',
      ATLAS_HCU_EDGE_INVALID: 'Revisa el vínculo, su dirección, fuerza y rezago.',
      ATLAS_HCU_NODE_CREATE_FAILED: 'No se pudo guardar el nodo.',
      ATLAS_HCU_NODE_UPDATE_FAILED: 'No se pudo actualizar el nodo.',
      ATLAS_HCU_NODE_DELETE_FAILED: 'No se pudo eliminar el nodo.',
      ATLAS_HCU_EDGE_CREATE_FAILED:
        'No se pudo guardar el vínculo. Comprueba que ambos nodos existan.',
      ATLAS_HCU_EDGE_UPDATE_FAILED: 'No se pudo actualizar el vínculo.',
      ATLAS_HCU_EDGE_DELETE_FAILED: 'No se pudo eliminar el vínculo.',
      RATE_LIMIT_EXCEEDED: 'Se alcanzó el límite temporal de solicitudes. Espera un momento.',
      CROSS_ORIGIN_REQUEST_BLOCKED: 'La solicitud fue bloqueada por seguridad.',
    };
    return (
      messages[code] ||
      'No se pudo completar la operación. Revisa tu conexión e inténtalo de nuevo.'
    );
  }

  async function request(path = '', options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${API_PATH}${path}`, {
      ...options,
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.success !== true) {
      const error = new Error(
        payload && typeof payload.error === 'string' ? payload.error : 'ATLAS_HCU_REQUEST_FAILED'
      );
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function nodeById(id) {
    return state.nodes.find((node) => node.id === id) || null;
  }

  function setSelectOptions(select, nodes, placeholder, preferredValue = '') {
    if (!select) return;
    const currentValue = preferredValue || select.value;
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    const options = [placeholderOption];
    for (const node of nodes) {
      const option = document.createElement('option');
      option.value = node.id;
      option.textContent = `${node.name} · ${node.domain}`;
      options.push(option);
    }
    select.replaceChildren(...options);
    select.value = nodes.some((node) => node.id === currentValue) ? currentValue : '';
  }

  function updateNodeOptions() {
    if (!state.nodes.some((node) => node.id === state.selectedSourceId)) {
      state.selectedSourceId = state.nodes[0]?.id || '';
    }
    setSelectOptions(elements.sourceSelect, state.nodes, 'Elige un nodo…', state.selectedSourceId);
    setSelectOptions(elements.edgeSource, state.nodes, 'Elige un nodo…');
    setSelectOptions(elements.edgeTarget, state.nodes, 'Elige un nodo…');
    if (elements.sourceSelect) elements.sourceSelect.value = state.selectedSourceId;
    if (elements.simulate) elements.simulate.disabled = state.nodes.length === 0;
    if (elements.edgeSubmit) elements.edgeSubmit.disabled = state.nodes.length < 2;
  }

  function chooseSimulationSource(nodeId, refreshChart = false) {
    state.selectedSourceId = nodeId;
    state.impacts = [];
    if (elements.sourceSelect) elements.sourceSelect.value = nodeId;
    if (elements.impactList) elements.impactList.replaceChildren();
    setFeedback(
      elements.simulationStatus,
      nodeId
        ? 'Origen seleccionado. Ejecuta la simulación para ver impactos.'
        : 'Elige un nodo para simular.'
    );
    renderGraph();
    if (refreshChart) renderEvidenceChart();
  }

  function graphPositions() {
    const nodes = [...state.nodes].sort(
      (left, right) => right.influence - left.influence || left.name.localeCompare(right.name)
    );
    const positions = new Map();
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    nodes.forEach((node, index) => {
      const angle = -Math.PI / 2 + index * goldenAngle;
      const radius = nodes.length === 1 ? 0 : 34 + (1 - node.influence) * 174;
      positions.set(node.id, {
        x: 400 + Math.cos(angle) * radius,
        y: 260 + Math.sin(angle) * radius,
        radius: 8 + Math.max(0, Math.min(1, node.risk)) * 10,
        node,
      });
    });
    return positions;
  }

  function renderGraph() {
    const svg = elements.graph;
    if (!svg) return;
    const title = svgElement('title', { id: 'atlasHcuGraphTitle' });
    title.textContent = 'Mapa causal interactivo Atlas HCU';
    const description = svgElement('desc', { id: 'atlasHcuGraphDescription' });
    description.textContent =
      'Selecciona un nodo para usarlo como origen de una simulación. Los enlaces muestran dirección, signo y fuerza.';
    const defs = svgElement('defs');
    for (const [id, color] of [
      ['hcuArrowPositive', '#a9f5d0'],
      ['hcuArrowNegative', '#ffb9d8'],
    ]) {
      const marker = svgElement('marker', {
        id,
        viewBox: '0 0 10 10',
        refX: '8',
        refY: '5',
        markerWidth: '6',
        markerHeight: '6',
        orient: 'auto-start-reverse',
        markerUnits: 'strokeWidth',
      });
      marker.append(svgElement('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: color }));
      defs.append(marker);
    }
    svg.replaceChildren(title, description, defs);

    const positions = graphPositions();
    const edgesLayer = svgElement('g', { 'aria-hidden': 'true' });
    for (const edge of state.edges) {
      const source = positions.get(edge.sourceNodeId);
      const target = positions.get(edge.targetNodeId);
      if (!source || !target) continue;
      const color = edge.effectSign > 0 ? '#a9f5d0' : '#ffb9d8';
      const markerId = edge.effectSign > 0 ? 'hcuArrowPositive' : 'hcuArrowNegative';
      const lineWidth = 1 + Math.max(0, Math.min(1, edge.strength)) * 2.8;
      let line;
      if (edge.sourceNodeId === edge.targetNodeId) {
        line = svgElement('path', {
          d: `M ${source.x - 4} ${source.y - source.radius} C ${source.x - 56} ${source.y - 70}, ${source.x + 56} ${source.y - 70}, ${source.x + 4} ${source.y - source.radius}`,
          class: 'hcu-edge',
          stroke: color,
          'stroke-width': lineWidth,
          opacity: 0.72,
          'marker-end': `url(#${markerId})`,
        });
      } else {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.hypot(dx, dy) || 1;
        const ux = dx / distance;
        const uy = dy / distance;
        const startX = source.x + ux * (source.radius + 2);
        const startY = source.y + uy * (source.radius + 2);
        const endX = target.x - ux * (target.radius + 4);
        const endY = target.y - uy * (target.radius + 4);
        line = svgElement('line', {
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
          class: 'hcu-edge',
          stroke: color,
          'stroke-width': lineWidth,
          opacity: 0.72,
          'marker-end': `url(#${markerId})`,
        });
      }
      const tooltip = svgElement('title');
      const sourceNode = nodeById(edge.sourceNodeId);
      const targetNode = nodeById(edge.targetNodeId);
      tooltip.textContent = `${sourceNode?.name || 'Origen'} ${edge.effectSign > 0 ? 'refuerza' : 'contrarresta'} ${targetNode?.name || 'destino'} · fuerza ${edge.strength.toFixed(2)} · rezago ${edge.lagYears} años${edge.evidenceSource ? ` · ${edge.evidenceSource}` : ''}`;
      line.append(tooltip);
      edgesLayer.append(line);
    }
    svg.append(edgesLayer);

    const labelsLayer = svgElement('g', { 'aria-hidden': 'true' });
    for (const edge of state.edges) {
      if (edge.sourceNodeId === edge.targetNodeId) continue;
      const source = positions.get(edge.sourceNodeId);
      const target = positions.get(edge.targetNodeId);
      if (!source || !target) continue;
      appendText(labelsLayer, edge.effectSign > 0 ? '+' : '−', {
        x: (source.x + target.x) / 2,
        y: (source.y + target.y) / 2 - 4,
        class: 'hcu-edge-label',
      });
    }
    svg.append(labelsLayer);

    const nodesLayer = svgElement('g');
    for (const [nodeId, position] of positions) {
      const { node, x, y, radius } = position;
      const group = svgElement('g', {
        class: 'hcu-node',
        role: 'button',
        tabindex: '0',
        'data-node-id': nodeId,
        'aria-label': `${node.name}, influencia ${node.influence.toFixed(2)}, riesgo ${node.risk.toFixed(2)}, evidencia ${node.evidence.toFixed(2)}. Seleccionar como origen de simulación.`,
        'aria-pressed': String(nodeId === state.selectedSourceId),
      });
      const impact = state.impacts.find((item) => item.nodeId === nodeId);
      if (impact && nodeId !== state.selectedSourceId) {
        group.append(
          svgElement('circle', {
            cx: x,
            cy: y,
            r: radius + 6,
            class: 'hcu-node-impact',
          })
        );
      }
      group.append(
        svgElement('circle', {
          cx: x,
          cy: y,
          r: radius,
          class: 'hcu-node-circle',
          fill: nodeId === state.selectedSourceId ? '#9ff7ff' : '#c9b8ff',
        })
      );
      const label = svgElement('text', {
        x,
        y: y + radius + 17,
        class: 'hcu-node-label',
      });
      label.textContent = node.name.length > 22 ? `${node.name.slice(0, 20)}…` : node.name;
      group.append(label);
      const titleText = svgElement('title');
      titleText.textContent = `${node.name} · ${node.domain} · influencia ${node.influence.toFixed(2)} · riesgo ${node.risk.toFixed(2)} · evidencia ${node.evidence.toFixed(2)}`;
      group.append(titleText);
      const select = () => chooseSimulationSource(nodeId);
      group.addEventListener('click', select);
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      });
      nodesLayer.append(group);
    }
    svg.append(nodesLayer);

    if (elements.graphEmpty) elements.graphEmpty.hidden = state.nodes.length > 0;
    renderGraphSummary();
  }

  function renderGraphSummary() {
    if (!elements.graphSummary) return;
    const entries = [];
    for (const node of state.nodes) {
      entries.push(
        `Nodo ${node.name}, dominio ${node.domain}, influencia ${node.influence.toFixed(2)}, riesgo ${node.risk.toFixed(2)}, evidencia ${node.evidence.toFixed(2)}.`
      );
    }
    for (const edge of state.edges) {
      const source = nodeById(edge.sourceNodeId)?.name || 'origen';
      const target = nodeById(edge.targetNodeId)?.name || 'destino';
      entries.push(
        `${source} ${edge.effectSign > 0 ? 'refuerza' : 'contrarresta'} ${target}; fuerza ${edge.strength.toFixed(2)}, rezago ${edge.lagYears} años${edge.evidenceSource ? `; fuente ${edge.evidenceSource}` : '; sin fuente citada'}.`
      );
    }
    elements.graphSummary.replaceChildren(
      ...entries.map((text) => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
      })
    );
  }

  function renderEvidenceChart() {
    const svg = elements.evidenceChart;
    if (!svg) return;
    const title = svgElement('title', { id: 'atlasHcuEvidenceChartTitle' });
    title.textContent = 'Brechas de evidencia por nodo';
    const description = svgElement('desc', { id: 'atlasHcuEvidenceChartDescription' });
    description.textContent =
      'Los nodos de mayor influencia y menor evidencia aparecen arriba a la izquierda. El tamaño del punto indica riesgo.';
    svg.replaceChildren(title, description);

    const left = 58;
    const right = 485;
    const top = 38;
    const bottom = 260;
    for (let index = 0; index <= 4; index += 1) {
      const fraction = index / 4;
      const x = left + fraction * (right - left);
      const y = top + fraction * (bottom - top);
      svg.append(
        svgElement('line', {
          x1: left,
          y1: y,
          x2: right,
          y2: y,
          class: 'hcu-chart-grid',
        }),
        svgElement('line', {
          x1: x,
          y1: top,
          x2: x,
          y2: bottom,
          class: 'hcu-chart-grid',
        })
      );
    }
    appendText(svg, 'Menos evidencia', { x: left, y: 23, class: 'hcu-chart-tick' });
    appendText(svg, 'Más evidencia', { x: left, y: 282, class: 'hcu-chart-tick' });
    appendText(svg, 'Mayor influencia', { x: left, y: 309, class: 'hcu-chart-axis-label' });
    appendText(svg, 'Menor influencia', {
      x: right,
      y: 309,
      class: 'hcu-chart-axis-label',
      'text-anchor': 'end',
    });

    const orderedNodes = [...state.nodes].sort((leftNode, rightNode) => {
      const leftGap = leftNode.influence * (1 - leftNode.evidence);
      const rightGap = rightNode.influence * (1 - rightNode.evidence);
      return rightGap - leftGap;
    });
    for (const node of orderedNodes) {
      const x = left + (1 - node.influence) * (right - left);
      const y = top + node.evidence * (bottom - top);
      const radius = 4 + Math.max(0, Math.min(1, node.risk)) * 8;
      const point = svgElement('circle', {
        cx: x,
        cy: y,
        r: radius,
        class: 'hcu-evidence-point',
        fill: node.evidence < 0.5 ? '#ffb9d8' : '#a9f5d0',
        role: 'button',
        tabindex: '0',
        'aria-label': `${node.name}: influencia ${node.influence.toFixed(2)}, evidencia ${node.evidence.toFixed(2)}, riesgo ${node.risk.toFixed(2)}. Seleccionar para simular.`,
      });
      const pointTitle = svgElement('title');
      pointTitle.textContent = `${node.name} · influencia ${node.influence.toFixed(2)} · evidencia ${node.evidence.toFixed(2)} · riesgo ${node.risk.toFixed(2)}`;
      point.append(pointTitle);
      const select = () => chooseSimulationSource(node.id, true);
      point.addEventListener('click', select);
      point.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      });
      svg.append(point);
    }

    if (elements.evidenceSummary) {
      elements.evidenceSummary.replaceChildren(
        ...orderedNodes.map((node) => {
          const item = document.createElement('li');
          item.textContent = `${node.name}: influencia ${node.influence.toFixed(2)}, evidencia ${node.evidence.toFixed(2)}, riesgo ${node.risk.toFixed(2)}.`;
          return item;
        })
      );
    }
  }

  function renderEvidenceList() {
    const container = elements.evidenceGaps;
    if (!container) return;
    if (state.nodes.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'atlas-hcu-empty-state';
      empty.textContent = 'Agrega nodos para ver prioridades de evidencia.';
      container.replaceChildren(empty);
      return;
    }

    const sorted = [...state.nodes].sort((left, right) => {
      const leftGap = left.influence * (1 - left.evidence);
      const rightGap = right.influence * (1 - right.evidence);
      return rightGap - leftGap;
    });
    container.replaceChildren(
      ...sorted.map((node) => {
        const gap = node.influence * (1 - node.evidence);
        const button = document.createElement('button');
        button.className = 'atlas-hcu-evidence-item';
        button.type = 'button';
        button.setAttribute(
          'aria-label',
          `Seleccionar ${node.name}, prioridad de evidencia ${gap.toFixed(2)}`
        );
        const name = document.createElement('span');
        name.className = 'atlas-hcu-evidence-name';
        name.textContent = node.name;
        const score = document.createElement('span');
        score.className = 'atlas-hcu-evidence-score';
        score.textContent = `BRECHA ${gap.toFixed(2)}`;
        const meta = document.createElement('span');
        meta.className = 'atlas-hcu-evidence-meta';
        meta.textContent = `${node.domain} · influencia ${node.influence.toFixed(2)} · evidencia ${node.evidence.toFixed(2)} · riesgo ${node.risk.toFixed(2)}`;
        const bar = document.createElement('span');
        bar.className = 'atlas-hcu-evidence-bar';
        const fill = document.createElement('span');
        fill.style.width = `${Math.max(2, gap * 100)}%`;
        bar.append(fill);
        button.append(name, score, meta, bar);
        button.addEventListener('click', () => chooseSimulationSource(node.id, true));
        return button;
      })
    );
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
      return null;
    }
  }

  function renderNodeList() {
    if (!elements.nodeList) return;
    if (elements.nodeListCount) elements.nodeListCount.textContent = String(state.nodes.length);
    if (state.nodes.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'atlas-hcu-empty-state';
      empty.textContent = 'Todavía no hay nodos.';
      elements.nodeList.replaceChildren(empty);
      return;
    }
    elements.nodeList.replaceChildren(
      ...state.nodes.map((node) => {
        const record = document.createElement('article');
        record.className = 'atlas-hcu-record';
        const title = document.createElement('span');
        title.className = 'atlas-hcu-record-title';
        title.textContent = node.name;
        const actions = document.createElement('div');
        actions.className = 'atlas-hcu-record-actions';
        actions.append(
          actionButton('Editar', 'edit-node', node.id),
          actionButton('Eliminar', 'delete-node', node.id, 'hcu-delete')
        );
        const meta = document.createElement('span');
        meta.className = 'atlas-hcu-record-meta';
        meta.textContent = `${node.domain} · influencia ${node.influence.toFixed(2)} · riesgo ${node.risk.toFixed(2)} · evidencia ${node.evidence.toFixed(2)}`;
        record.append(title, actions, meta);
        return record;
      })
    );
  }

  function renderEdgeList() {
    if (!elements.edgeList) return;
    if (elements.edgeListCount) elements.edgeListCount.textContent = String(state.edges.length);
    if (state.edges.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'atlas-hcu-empty-state';
      empty.textContent = 'Todavía no hay vínculos.';
      elements.edgeList.replaceChildren(empty);
      return;
    }
    elements.edgeList.replaceChildren(
      ...state.edges.map((edge) => {
        const record = document.createElement('article');
        record.className = 'atlas-hcu-record';
        const sourceName = nodeById(edge.sourceNodeId)?.name || 'Origen no disponible';
        const targetName = nodeById(edge.targetNodeId)?.name || 'Destino no disponible';
        const title = document.createElement('span');
        title.className = 'atlas-hcu-record-title';
        title.textContent = `${sourceName} ${edge.effectSign > 0 ? '→ refuerza →' : '→ contrarresta →'} ${targetName}`;
        const actions = document.createElement('div');
        actions.className = 'atlas-hcu-record-actions';
        actions.append(
          actionButton('Editar', 'edit-edge', edge.id),
          actionButton('Eliminar', 'delete-edge', edge.id, 'hcu-delete')
        );
        const meta = document.createElement('span');
        meta.className = 'atlas-hcu-record-meta';
        meta.append(
          document.createTextNode(
            `Fuerza ${edge.strength.toFixed(2)} · rezago ${edge.lagYears} años · `
          )
        );
        if (edge.evidenceSource) {
          const url = safeHttpUrl(edge.evidenceSource);
          if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Ver fuente';
            meta.append(link);
          } else {
            meta.append(document.createTextNode(edge.evidenceSource));
          }
        } else {
          meta.append(document.createTextNode('Sin fuente citada'));
        }
        record.append(title, actions, meta);
        return record;
      })
    );
  }

  function actionButton(label, action, id, className = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.hcuAction = action;
    button.dataset.recordId = id;
    if (className) button.classList.add(className);
    return button;
  }

  function renderCounts() {
    if (elements.nodeCount) elements.nodeCount.textContent = String(state.nodes.length);
    if (elements.edgeCount) elements.edgeCount.textContent = String(state.edges.length);
    if (elements.totalEdges) elements.totalEdges.textContent = String(state.edges.length);
    if (elements.citedCount) {
      elements.citedCount.textContent = String(
        state.edges.filter((edge) => edge.evidenceSource.trim().length > 0).length
      );
    }
  }

  function render() {
    renderCounts();
    updateNodeOptions();
    renderGraph();
    renderEvidenceChart();
    renderEvidenceList();
    renderNodeList();
    renderEdgeList();
  }

  async function loadGraph() {
    setStatus('SINCRONIZANDO MAPA', 'loading');
    setNotice();
    try {
      const payload = await request();
      state.nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
      state.edges = Array.isArray(payload.edges) ? payload.edges : [];
      state.impacts = [];
      if (elements.impactList) elements.impactList.replaceChildren();
      render();
      setStatus('MAPA SINCRONIZADO', 'ready');
      setFeedback(elements.dataStatus, 'Los datos del mapa están sincronizados con el servidor.');
    } catch (error) {
      state.nodes = [];
      state.edges = [];
      state.impacts = [];
      render();
      const message = messageForError(error);
      setStatus('SIN CONEXIÓN', 'error');
      setNotice(message);
      setFeedback(elements.dataStatus, message, true);
    }
  }

  function setFormBusy(form, busy) {
    for (const button of form.querySelectorAll('button[type="submit"]')) {
      button.disabled = busy || (button === elements.edgeSubmit && state.nodes.length < 2);
    }
  }

  function resetNodeForm() {
    state.editingNodeId = '';
    elements.nodeId.value = '';
    nodeForm.reset();
    elements.nodeInfluence.value = '0.5';
    elements.nodeRisk.value = '0.5';
    elements.nodeEvidence.value = '0.5';
    elements.nodeFormTitle.textContent = 'Agregar nodo';
    elements.nodeSubmit.textContent = 'Agregar nodo';
    elements.nodeCancel.hidden = true;
    updateNumberOutputs();
  }

  function resetEdgeForm() {
    state.editingEdgeId = '';
    elements.edgeId.value = '';
    edgeForm.reset();
    elements.effectSign.value = '1';
    elements.strength.value = '0.5';
    elements.lagYears.value = '1';
    elements.edgeFormTitle.textContent = 'Agregar vínculo';
    elements.edgeSubmit.textContent = 'Agregar vínculo';
    elements.edgeCancel.hidden = true;
  }

  function updateNumberOutputs() {
    for (const [input, output] of numberInputs) {
      if (input && output) output.textContent = Number(input.value || 0).toFixed(2);
    }
  }

  function beginNodeEdit(id) {
    const node = nodeById(id);
    if (!node) return;
    state.editingNodeId = id;
    elements.nodeId.value = id;
    elements.nodeName.value = node.name;
    elements.nodeDomain.value = node.domain;
    elements.nodeInfluence.value = String(node.influence);
    elements.nodeRisk.value = String(node.risk);
    elements.nodeEvidence.value = String(node.evidence);
    elements.nodeFormTitle.textContent = 'Editar nodo';
    elements.nodeSubmit.textContent = 'Guardar cambios';
    elements.nodeCancel.hidden = false;
    updateNumberOutputs();
    elements.nodeName.focus();
  }

  function beginEdgeEdit(id) {
    const edge = state.edges.find((item) => item.id === id);
    if (!edge) return;
    state.editingEdgeId = id;
    elements.edgeId.value = id;
    elements.edgeSource.value = edge.sourceNodeId;
    elements.edgeTarget.value = edge.targetNodeId;
    elements.effectSign.value = String(edge.effectSign);
    elements.strength.value = String(edge.strength);
    elements.lagYears.value = String(edge.lagYears);
    elements.evidenceSource.value = edge.evidenceSource;
    elements.edgeFormTitle.textContent = 'Editar vínculo';
    elements.edgeSubmit.textContent = 'Guardar cambios';
    elements.edgeCancel.hidden = false;
    elements.edgeSource.focus();
  }

  async function saveNode(event) {
    event.preventDefault();
    if (!nodeForm.reportValidity()) return;
    const input = {
      name: elements.nodeName.value.trim(),
      domain: elements.nodeDomain.value.trim(),
      influence: Number(elements.nodeInfluence.value),
      risk: Number(elements.nodeRisk.value),
      evidence: Number(elements.nodeEvidence.value),
    };
    const editingId = state.editingNodeId;
    setFormBusy(nodeForm, true);
    setFeedback(elements.dataStatus, editingId ? 'Actualizando nodo…' : 'Guardando nodo…');
    try {
      const path = editingId ? `/nodes/${encodeURIComponent(editingId)}` : '/nodes';
      await request(path, {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify(input),
      });
      resetNodeForm();
      await loadGraph();
      setFeedback(elements.dataStatus, editingId ? 'Nodo actualizado.' : 'Nodo guardado.');
    } catch (error) {
      setFeedback(elements.dataStatus, messageForError(error), true);
    } finally {
      setFormBusy(nodeForm, false);
    }
  }

  async function saveEdge(event) {
    event.preventDefault();
    if (!edgeForm.reportValidity()) return;
    const sourceNodeId = elements.edgeSource.value;
    const targetNodeId = elements.edgeTarget.value;
    if (sourceNodeId === targetNodeId) {
      setFeedback(elements.dataStatus, 'El origen y el destino deben ser distintos.', true);
      return;
    }
    const input = {
      sourceNodeId,
      targetNodeId,
      effectSign: Number(elements.effectSign.value),
      strength: Number(elements.strength.value),
      lagYears: Number(elements.lagYears.value),
      evidenceSource: elements.evidenceSource.value.trim(),
    };
    const editingId = state.editingEdgeId;
    setFormBusy(edgeForm, true);
    setFeedback(elements.dataStatus, editingId ? 'Actualizando vínculo…' : 'Guardando vínculo…');
    try {
      const path = editingId ? `/edges/${encodeURIComponent(editingId)}` : '/edges';
      await request(path, {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify(input),
      });
      resetEdgeForm();
      await loadGraph();
      setFeedback(elements.dataStatus, editingId ? 'Vínculo actualizado.' : 'Vínculo guardado.');
    } catch (error) {
      setFeedback(elements.dataStatus, messageForError(error), true);
    } finally {
      setFormBusy(edgeForm, false);
    }
  }

  async function deleteRecord(kind, id) {
    const isNode = kind === 'node';
    const record = isNode ? nodeById(id) : state.edges.find((edge) => edge.id === id);
    if (!record) return;
    const description = isNode
      ? `¿Eliminar el nodo «${record.name}» y sus vínculos asociados?`
      : '¿Eliminar este vínculo?';
    if (!window.confirm(description)) return;

    setFeedback(elements.dataStatus, 'Eliminando…');
    try {
      await request(`/${isNode ? 'nodes' : 'edges'}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (isNode && state.editingNodeId === id) resetNodeForm();
      if (!isNode && state.editingEdgeId === id) resetEdgeForm();
      await loadGraph();
      setFeedback(elements.dataStatus, isNode ? 'Nodo eliminado.' : 'Vínculo eliminado.');
    } catch (error) {
      setFeedback(elements.dataStatus, messageForError(error), true);
    }
  }

  function onRecordAction(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button[data-hcu-action]');
    if (!button) return;
    const { hcuAction, recordId } = button.dataset;
    if (!hcuAction || !recordId) return;
    if (hcuAction === 'edit-node') beginNodeEdit(recordId);
    if (hcuAction === 'edit-edge') beginEdgeEdit(recordId);
    if (hcuAction === 'delete-node') void deleteRecord('node', recordId);
    if (hcuAction === 'delete-edge') void deleteRecord('edge', recordId);
  }

  function renderImpacts(result) {
    if (!elements.impactList) return;
    const impacts = Array.isArray(result.impacts) ? result.impacts : [];
    elements.impactList.replaceChildren(
      ...impacts
        .map((impact) => {
          const node = nodeById(impact.nodeId);
          if (!node) return null;
          const item = document.createElement('li');
          const name = document.createElement('span');
          name.textContent = node.name;
          const value = document.createElement('strong');
          value.className = 'atlas-hcu-impact-value';
          value.dataset.sign = impact.delta < 0 ? 'negative' : 'positive';
          value.textContent = `${impact.delta > 0 ? '+' : ''}${impact.delta.toFixed(2)}`;
          const meta = document.createElement('small');
          meta.textContent = `${impact.pathCount} ruta${impact.pathCount === 1 ? '' : 's'} · desde ${impact.arrivalYear}`;
          item.append(name, value, meta);
          return item;
        })
        .filter(Boolean)
    );
    if (elements.graph) renderGraph();
  }

  async function runSimulation() {
    const sourceNodeId = elements.sourceSelect.value;
    const endYear = Number(elements.endYear.value);
    const startYear = new Date().getFullYear();
    elements.endYear.min = String(startYear);
    if (!sourceNodeId || !Number.isInteger(endYear) || endYear < startYear || endYear > 2100) {
      setFeedback(elements.simulationStatus, 'Elige un nodo y un año final válido.', true);
      return;
    }

    elements.simulate.disabled = true;
    elements.simulate.textContent = 'Simulando…';
    setFeedback(elements.simulationStatus, 'Calculando rutas causales ilustrativas…');
    try {
      const payload = await request('/simulate', {
        method: 'POST',
        body: JSON.stringify({ sourceNodeId, endYear }),
      });
      const result = payload.result;
      if (!result || !Array.isArray(result.impacts)) throw new Error('ATLAS_HCU_SIMULATION_FAILED');
      state.selectedSourceId = sourceNodeId;
      state.impacts = result.impacts;
      renderImpacts(result);
      const message = result.truncated
        ? `Cascada acotada a ${Number(result.exploredPaths || 0).toLocaleString('es-MX')} rutas; revisa la estructura del grafo.`
        : `Impactos ilustrativos acumulados hasta ${endYear}; no son predicciones.`;
      setFeedback(elements.simulationStatus, message);
    } catch (error) {
      setFeedback(elements.simulationStatus, messageForError(error), true);
    } finally {
      elements.simulate.disabled = state.nodes.length === 0;
      elements.simulate.textContent = 'Simular cascada ↗';
    }
  }

  function exportJson() {
    return JSON.stringify(
      {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        notes: 'Hipótesis de prototipo; los puntajes y efectos no son mediciones ni predicciones.',
        nodes: state.nodes,
        edges: state.edges,
      },
      null,
      2
    );
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(exportJson());
      setFeedback(elements.dataStatus, 'JSON copiado al portapapeles.');
    } catch {
      setFeedback(
        elements.dataStatus,
        'El portapapeles no está disponible; usa Descargar JSON.',
        true
      );
    }
  }

  function downloadJson() {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'atlas-hcu.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setFeedback(elements.dataStatus, 'JSON preparado para descargar.');
  }

  nodeForm.addEventListener('submit', (event) => void saveNode(event));
  edgeForm.addEventListener('submit', (event) => void saveEdge(event));
  elements.nodeCancel.addEventListener('click', resetNodeForm);
  elements.edgeCancel.addEventListener('click', resetEdgeForm);
  elements.nodeList.addEventListener('click', onRecordAction);
  elements.edgeList.addEventListener('click', onRecordAction);
  elements.simulate.addEventListener('click', () => void runSimulation());
  elements.sourceSelect.addEventListener('change', () => {
    chooseSimulationSource(elements.sourceSelect.value);
  });
  elements.copyJson.addEventListener('click', () => void copyJson());
  elements.downloadJson.addEventListener('click', downloadJson);
  for (const [input] of numberInputs) {
    input.addEventListener('input', updateNumberOutputs);
  }

  void loadGraph();
})();
