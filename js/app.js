// Core Application Engine for Smart Emergency Evacuation & Rescue System
(function() {
  const INF = 9999;

  // Application State
  const state = {
    nodes: [],
    edges: [],
    source: 0,
    target: 4,
    currentScenario: 'report_default',
    vehicleType: 'ambulance', // 'ambulance', 'fire_truck', 'drone'
    vehicleSpeeds: {
      ambulance: 55, // km/h
      fire_truck: 42,
      drone: 90
    },
    // Dijkstra State
    dijkstraResult: null,
    stepHistory: [],
    currentStepIndex: -1,
    isPlayingSteps: false,
    stepTimer: null,
    playbackSpeedMs: 1200,

    // Vehicle Animation State
    isSimulatingVehicle: false,
    vehiclePos: null,
    vehicleSegmentIndex: 0,
    vehicleProgress: 0,

    // Canvas Interaction
    draggedNode: null,
    hoveredNode: null,
    hoveredEdge: null,
    mousePos: { x: 0, y: 0 },
    canvasOffset: { x: 0, y: 0 },
    zoomLevel: 1.0,

    // Active Tab in Right Panel
    activeTab: 'tab-route'
  };

  // Canvas context
  let canvas, ctx;

  // DOM Elements cache
  let elements = {};

  // Initialize Application on DOM Ready
  window.addEventListener('DOMContentLoaded', () => {
    initElements();
    initCanvas();
    loadScenario('report_default');
    bindEvents();
    startRenderLoop();
    updateLiveClock();
    setInterval(updateLiveClock, 1000);
  });

  function initElements() {
    elements = {
      canvas: document.getElementById('graphCanvas'),
      viewport: document.getElementById('graphViewport'),
      sourceSelect: document.getElementById('sourceNodeSelect'),
      targetSelect: document.getElementById('targetNodeSelect'),
      btnDispatch: document.getElementById('btnDispatch'),
      btnSimulate: document.getElementById('btnSimulate'),
      btnStepPlay: document.getElementById('btnStepPlay'),
      btnStepNext: document.getElementById('btnStepNext'),
      btnStepPrev: document.getElementById('btnStepPrev'),
      btnStepReset: document.getElementById('btnStepReset'),
      speedSlider: document.getElementById('playbackSpeedSlider'),
      stepExplanation: document.getElementById('stepExplanationText'),
      stepBadge: document.getElementById('stepBadge'),
      
      // Metrics
      metricLocations: document.getElementById('metricLocations'),
      metricEmergencies: document.getElementById('metricEmergencies'),
      metricSafeRoads: document.getElementById('metricSafeRoads'),
      metricDistance: document.getElementById('metricDistance'),
      metricEta: document.getElementById('metricEta'),

      // Route Display
      routePathDisplay: document.getElementById('routePathDisplay'),
      routeDistDisplay: document.getElementById('routeDistDisplay'),
      routeTimeline: document.getElementById('routeTimeline'),

      // Matrix & State tables
      matrixTableBody: document.getElementById('matrixTableBody'),
      stateTableBody: document.getElementById('stateTableBody'),

      // Incident Active Card
      incidentTitle: document.getElementById('incidentTitle'),
      incidentLocationName: document.getElementById('incidentLocationName'),
      incidentDetails: document.getElementById('incidentDetails'),

      // Toast Box
      toastBox: document.getElementById('toastBox'),

      // Audio Toggle
      audioToggleBtn: document.getElementById('audioToggleBtn'),

      // Report Modal
      btnReportModal: document.getElementById('btnReportModal'),
      reportModal: document.getElementById('reportModal'),
      btnCloseModal: document.getElementById('btnCloseModal'),
      btnPrintReport: document.getElementById('btnPrintReport')
    };
  }

  function initCanvas() {
    canvas = elements.canvas;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!elements.viewport) return;
    const rect = elements.viewport.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }

  // Load Scenario Data
  function loadScenario(scenarioId) {
    const sc = PRESET_SCENARIOS[scenarioId] || PRESET_SCENARIOS.report_default;
    state.currentScenario = scenarioId;
    state.nodes = JSON.parse(JSON.stringify(sc.nodes));
    state.edges = JSON.parse(JSON.stringify(sc.edges));
    state.source = sc.source;
    state.target = sc.target;

    // Update incident card
    if (sc.incident) {
      if (elements.incidentTitle) elements.incidentTitle.innerText = sc.incident.type;
      if (elements.incidentLocationName) elements.incidentLocationName.innerText = sc.incident.locationName;
      if (elements.incidentDetails) elements.incidentDetails.innerText = sc.incident.details;
    }

    // Populate Selects
    populateNodeSelects();

    // Reset simulation
    stopStepPlayback();
    stopVehicleSimulation();

    // Compute Dijkstra
    solveDijkstra();

    // Update scenario buttons UI
    document.querySelectorAll('.scenario-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.scenario === scenarioId);
    });

    showToast(`Loaded scenario: ${sc.name}`);
  }

  function populateNodeSelects() {
    if (!elements.sourceSelect || !elements.targetSelect) return;
    elements.sourceSelect.innerHTML = '';
    elements.targetSelect.innerHTML = '';

    state.nodes.forEach(node => {
      const optSrc = document.createElement('option');
      optSrc.value = node.id;
      optSrc.textContent = `${node.label} - ${node.name}`;
      if (node.id === state.source) optSrc.selected = true;
      elements.sourceSelect.appendChild(optSrc);

      const optTgt = document.createElement('option');
      optTgt.value = node.id;
      optTgt.textContent = `${node.label} - ${node.name}`;
      if (node.id === state.target) optTgt.selected = true;
      elements.targetSelect.appendChild(optTgt);
    });
  }

  // ================= DIJKSTRA ALGORITHM (Matching C Source Code) =================
  function solveDijkstra() {
    const n = state.nodes.length;
    const graph = Array.from({ length: n }, () => Array(n).fill(INF));

    for (let i = 0; i < n; i++) {
      graph[i][i] = 0;
    }

    // Populate from undirected edges (blocked edges count as INF)
    state.edges.forEach(e => {
      const u = e.u;
      const v = e.v;
      if (u < n && v < n) {
        if (!e.blocked) {
          graph[u][v] = e.weight;
          graph[v][u] = e.weight;
        } else {
          graph[u][v] = INF;
          graph[v][u] = INF;
        }
      }
    });

    const source = state.source;
    const destination = state.target;

    const distance = Array(n).fill(INF);
    const visited = Array(n).fill(0);
    const parent = Array(n).fill(-1);

    const history = [];

    distance[source] = 0;

    history.push({
      step: 0,
      description: `Initialization: Set source L${source} distance = 0, all others = INF.`,
      currentU: -1,
      distance: [...distance],
      visited: [...visited],
      parent: [...parent],
      activeEdge: null
    });

    for (let count = 0; count < n; count++) {
      let min = INF;
      let u = -1;

      for (let j = 0; j < n; j++) {
        if (!visited[j] && distance[j] < min) {
          min = distance[j];
          u = j;
        }
      }

      if (u === -1) {
        history.push({
          step: history.length,
          description: `All remaining nodes unreachable or already visited. Terminating search.`,
          currentU: -1,
          distance: [...distance],
          visited: [...visited],
          parent: [...parent],
          activeEdge: null
        });
        break;
      }

      visited[u] = 1;

      history.push({
        step: history.length,
        description: `Selected unvisited node L${u} with min distance ${min} km. Marked as visited.`,
        currentU: u,
        distance: [...distance],
        visited: [...visited],
        parent: [...parent],
        activeEdge: null
      });

      // Relaxation
      for (let j = 0; j < n; j++) {
        if (!visited[j] && graph[u][j] !== INF) {
          const oldDist = distance[j];
          const newDist = distance[u] + graph[u][j];

          if (newDist < distance[j]) {
            distance[j] = newDist;
            parent[j] = u;

            history.push({
              step: history.length,
              description: `Relax edge L${u} -> L${j} (weight ${graph[u][j]} km): Updated distance to ${newDist} km via parent L${u}.`,
              currentU: u,
              distance: [...distance],
              visited: [...visited],
              parent: [...parent],
              activeEdge: { u, v: j }
            });
          }
        }
      }

      if (u === destination) {
        history.push({
          step: history.length,
          description: `Target Rescue Center L${destination} reached with optimal distance ${distance[destination]} km.`,
          currentU: u,
          distance: [...distance],
          visited: [...visited],
          parent: [...parent],
          activeEdge: null
        });
        break;
      }
    }

    // Reconstruct path
    const path = [];
    let curr = destination;
    const isReachable = distance[destination] !== INF;

    if (isReachable) {
      while (curr !== -1) {
        path.unshift(curr);
        curr = parent[curr];
      }
    }

    state.dijkstraResult = {
      graph,
      source,
      destination,
      distance: distance[destination],
      distances: distance,
      parents: parent,
      visited,
      path: isReachable ? path : [],
      isReachable
    };

    state.stepHistory = history;
    state.currentStepIndex = history.length - 1;

    updateUI();
  }

  // ================= UI & METRICS UPDATE =================
  function updateUI() {
    const res = state.dijkstraResult;
    if (!res) return;

    // Metrics Strip
    const safeRoadsCount = state.edges.filter(e => !e.blocked).length;
    if (elements.metricLocations) elements.metricLocations.innerText = state.nodes.length;
    if (elements.metricEmergencies) elements.metricEmergencies.innerText = '1 ACTIVE';
    if (elements.metricSafeRoads) elements.metricSafeRoads.innerText = `${safeRoadsCount} / ${state.edges.length}`;

    if (res.isReachable) {
      const speed = state.vehicleSpeeds[state.vehicleType] || 50;
      const etaMinutes = Math.round((res.distance / speed) * 60);

      if (elements.metricDistance) elements.metricDistance.innerText = `${res.distance} km`;
      if (elements.metricEta) elements.metricEta.innerText = `${etaMinutes} min`;

      if (elements.routeDistDisplay) elements.routeDistDisplay.innerHTML = `${res.distance} <span>km</span>`;

      // Path display chips
      if (elements.routePathDisplay) {
        elements.routePathDisplay.innerHTML = '';
        res.path.forEach((nodeId, idx) => {
          const chip = document.createElement('span');
          chip.className = 'node-chip' + (idx === 0 ? ' start' : (idx === res.path.length - 1 ? ' end' : ''));
          chip.textContent = `L${nodeId}`;
          elements.routePathDisplay.appendChild(chip);

          if (idx < res.path.length - 1) {
            const arrow = document.createElement('span');
            arrow.className = 'node-arrow';
            arrow.innerHTML = '&#8594;';
            elements.routePathDisplay.appendChild(arrow);
          }
        });
      }

      // Route Timeline
      renderRouteTimeline(res.path);
    } else {
      if (elements.metricDistance) elements.metricDistance.innerText = 'NO ROUTE';
      if (elements.metricEta) elements.metricEta.innerText = 'BLOCKED';
      if (elements.routeDistDisplay) elements.routeDistDisplay.innerHTML = `INF <span>(Blocked)</span>`;
      if (elements.routePathDisplay) {
        elements.routePathDisplay.innerHTML = `<span style="color:var(--accent-crimson); font-size:0.8rem; font-weight:600;">No safe evacuation corridor available! All connecting paths blocked.</span>`;
      }
      if (elements.routeTimeline) {
        elements.routeTimeline.innerHTML = `<div style="color:var(--text-dim); font-size:0.8rem; text-align:center; padding:1rem;">Clear roadblocks to restore route connectivity.</div>`;
      }
    }

    // Step Explanation Bar
    updateStepView();

    // Render Matrix & State Tables
    renderAdjacencyMatrix();
    renderStateTable();
  }

  function renderRouteTimeline(path) {
    if (!elements.routeTimeline) return;
    elements.routeTimeline.innerHTML = '';

    let accumulatedDist = 0;
    const speed = state.vehicleSpeeds[state.vehicleType] || 50;

    path.forEach((nodeId, index) => {
      const node = state.nodes.find(n => n.id === nodeId);
      let legDist = 0;
      if (index > 0) {
        const prevId = path[index - 1];
        const edge = state.edges.find(e => (e.u === prevId && e.v === nodeId) || (e.u === nodeId && e.v === prevId));
        if (edge) legDist = edge.weight;
      }
      accumulatedDist += legDist;
      const legEta = Math.round((accumulatedDist / speed) * 60);

      const item = document.createElement('div');
      item.className = 'timeline-item';
      item.innerHTML = `
        <div class="timeline-marker" style="${index === 0 ? 'border-color:#f43f5e;' : (index === path.length - 1 ? 'border-color:#10b981;' : '')}">${index + 1}</div>
        <div class="timeline-details">
          <div class="timeline-title">${node.label}: ${node.name}</div>
          <div class="timeline-sub">${index === 0 ? 'Hazard Origin (Evacuation Start)' : `Leg: +${legDist} km (Total: ${accumulatedDist} km | T+${legEta} min)`}</div>
        </div>
      `;
      elements.routeTimeline.appendChild(item);
    });
  }

  function updateStepView() {
    if (!elements.stepExplanation || !elements.stepBadge) return;
    const currentStep = state.stepHistory[state.currentStepIndex];
    if (!currentStep) return;

    elements.stepBadge.innerText = `Step ${currentStep.step} / ${state.stepHistory.length - 1}`;
    elements.stepExplanation.innerText = currentStep.description;
  }

  function renderAdjacencyMatrix() {
    if (!elements.matrixTableBody) return;
    const n = state.nodes.length;
    const graph = state.dijkstraResult.graph;

    let html = '<thead><tr><th>Node</th>';
    for (let i = 0; i < n; i++) {
      html += `<th>L${i}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let i = 0; i < n; i++) {
      html += `<tr><th>L${i}</th>`;
      for (let j = 0; j < n; j++) {
        const val = graph[i][j];
        const isSelf = i === j;
        const isInf = val === INF;
        const isPathEdge = isEdgeInPath(i, j);

        let cellClass = isInf ? 'inf-val' : 'weight-val';
        if (isPathEdge) cellClass += ' active-edge';

        const displayVal = isInf ? 'INF' : val;
        html += `<td class="${cellClass}" data-u="${i}" data-v="${j}" title="Distance L${i} to L${j}: ${displayVal}">${displayVal}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';

    elements.matrixTableBody.innerHTML = html;

    // Hover listeners on cells
    elements.matrixTableBody.querySelectorAll('td').forEach(td => {
      td.addEventListener('mouseenter', () => {
        const u = parseInt(td.dataset.u);
        const v = parseInt(td.dataset.v);
        highlightEdgeBetween(u, v);
      });
      td.addEventListener('mouseleave', () => {
        clearEdgeHighlight();
      });
      td.addEventListener('click', () => {
        const u = parseInt(td.dataset.u);
        const v = parseInt(td.dataset.v);
        if (u !== v) {
          toggleRoadBlock(u, v);
        }
      });
    });
  }

  function renderStateTable() {
    if (!elements.stateTableBody) return;
    const currentStep = state.stepHistory[state.currentStepIndex] || state.stepHistory[state.stepHistory.length - 1];
    if (!currentStep) return;

    let html = '<thead><tr><th>Node</th><th>Distance (km)</th><th>Visited</th><th>Parent</th></tr></thead><tbody>';

    state.nodes.forEach(node => {
      const u = node.id;
      const isCur = currentStep.currentU === u;
      const d = currentStep.distance[u] === INF ? 'INF' : currentStep.distance[u];
      const vis = currentStep.visited[u] === 1;
      const p = currentStep.parent[u] === -1 ? 'None' : `L${currentStep.parent[u]}`;

      html += `<tr class="${isCur ? 'current-u' : ''}">
        <td><strong>L${u}</strong></td>
        <td>${d}</td>
        <td><span class="${vis ? 'badge-visited-yes' : 'badge-visited-no'}">${vis ? 'TRUE' : 'FALSE'}</span></td>
        <td>${p}</td>
      </tr>`;
    });

    html += '</tbody>';
    elements.stateTableBody.innerHTML = html;
  }

  function isEdgeInPath(u, v) {
    const path = state.dijkstraResult?.path;
    if (!path || path.length < 2) return false;
    for (let i = 0; i < path.length - 1; i++) {
      if ((path[i] === u && path[i + 1] === v) || (path[i] === v && path[i + 1] === u)) {
        return true;
      }
    }
    return false;
  }

  function highlightEdgeBetween(u, v) {
    state.hoveredEdge = { u, v };
  }

  function clearEdgeHighlight() {
    state.hoveredEdge = null;
  }

  function toggleRoadBlock(u, v) {
    const edge = state.edges.find(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
    if (edge) {
      edge.blocked = !edge.blocked;
      window.soundEngine.playHazardToggle();
      showToast(`Road L${u} <-> L${v} is now ${edge.blocked ? 'BLOCKED [Hazard]' : 'CLEARED [Safe]'}`);
      solveDijkstra();
    }
  }

  // ================= STEP PLAYBACK ENGINE =================
  function stepNext() {
    if (state.currentStepIndex < state.stepHistory.length - 1) {
      state.currentStepIndex++;
      window.soundEngine.playClick();
      updateStepView();
      renderStateTable();
    } else {
      stopStepPlayback();
    }
  }

  function stepPrev() {
    if (state.currentStepIndex > 0) {
      state.currentStepIndex--;
      window.soundEngine.playClick();
      updateStepView();
      renderStateTable();
    }
  }

  function stepReset() {
    stopStepPlayback();
    state.currentStepIndex = 0;
    updateStepView();
    renderStateTable();
    showToast('Reset step visualizer to initial state');
  }

  function toggleStepPlayback() {
    if (state.isPlayingSteps) {
      stopStepPlayback();
    } else {
      startStepPlayback();
    }
  }

  function startStepPlayback() {
    if (state.currentStepIndex >= state.stepHistory.length - 1) {
      state.currentStepIndex = 0;
    }
    state.isPlayingSteps = true;
    if (elements.btnStepPlay) elements.btnStepPlay.innerHTML = '<i class="fas fa-pause"></i>';

    clearInterval(state.stepTimer);
    state.stepTimer = setInterval(() => {
      if (state.currentStepIndex < state.stepHistory.length - 1) {
        stepNext();
      } else {
        stopStepPlayback();
        window.soundEngine.playRouteSolved();
      }
    }, state.playbackSpeedMs);
  }

  function stopStepPlayback() {
    state.isPlayingSteps = false;
    clearInterval(state.stepTimer);
    if (elements.btnStepPlay) elements.btnStepPlay.innerHTML = '<i class="fas fa-play"></i>';
  }

  // ================= VEHICLE SIMULATION =================
  function startVehicleSimulation() {
    const path = state.dijkstraResult?.path;
    if (!path || path.length < 2) {
      showToast('No safe route available to dispatch vehicle!');
      return;
    }

    state.isSimulatingVehicle = true;
    state.vehicleSegmentIndex = 0;
    state.vehicleProgress = 0;
    window.soundEngine.playAlert();
    showToast(`Emergency ${state.vehicleType.toUpperCase()} dispatched on optimal route!`);
  }

  function stopVehicleSimulation() {
    state.isSimulatingVehicle = false;
    state.vehiclePos = null;
  }

  function updateVehicleSimulation() {
    if (!state.isSimulatingVehicle) return;
    const path = state.dijkstraResult?.path;
    if (!path || path.length < 2) {
      stopVehicleSimulation();
      return;
    }

    const fromNode = state.nodes.find(n => n.id === path[state.vehicleSegmentIndex]);
    const toNode = state.nodes.find(n => n.id === path[state.vehicleSegmentIndex + 1]);

    if (!fromNode || !toNode) {
      stopVehicleSimulation();
      return;
    }

    state.vehicleProgress += 0.015;

    if (state.vehicleProgress >= 1.0) {
      state.vehicleProgress = 0;
      state.vehicleSegmentIndex++;

      if (state.vehicleSegmentIndex >= path.length - 1) {
        // Vehicle arrived!
        state.isSimulatingVehicle = false;
        window.soundEngine.playRouteSolved();
        showToast('Rescue Unit reached National Trauma Hospital safely!');
        return;
      }
    }

    // Interpolate position
    state.vehiclePos = {
      x: fromNode.x + (toNode.x - fromNode.x) * state.vehicleProgress,
      y: fromNode.y + (toNode.y - fromNode.y) * state.vehicleProgress,
      angle: Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x)
    };
  }

  // ================= CANVAS RENDERING LOOP =================
  function startRenderLoop() {
    function loop(timestamp) {
      renderCanvas(timestamp);
      updateVehicleSimulation();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  function renderCanvas(timestamp) {
    if (!ctx || !canvas) return;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, width, height);

    // Draw Subtle Grid
    drawTacticalGrid(width, height);

    // Draw Edges
    state.edges.forEach(edge => {
      drawEdge(edge, timestamp);
    });

    // Draw Shortest Path Highlight & Particles
    if (state.dijkstraResult?.isReachable && state.dijkstraResult.path.length >= 2) {
      drawShortestPath(timestamp);
    }

    // Draw Nodes
    state.nodes.forEach(node => {
      drawNode(node, timestamp);
    });

    // Draw Simulated Vehicle
    if (state.isSimulatingVehicle && state.vehiclePos) {
      drawVehicle(state.vehiclePos, timestamp);
    }
  }

  function drawTacticalGrid(width, height) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;

    const step = 40;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEdge(edge, timestamp) {
    const nodeA = state.nodes.find(n => n.id === edge.u);
    const nodeB = state.nodes.find(n => n.id === edge.v);
    if (!nodeA || !nodeB) return;

    ctx.save();

    const isHovered = state.hoveredEdge && 
      ((state.hoveredEdge.u === edge.u && state.hoveredEdge.v === edge.v) ||
       (state.hoveredEdge.u === edge.v && state.hoveredEdge.v === edge.u));

    if (edge.blocked) {
      // Draw Blocked Hazard Road
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Caution Barrier Symbol at mid
      const midX = (nodeA.x + nodeB.x) / 2;
      const midY = (nodeA.y + nodeB.y) / 2;
      drawHazardBadge(midX, midY, 'BLOCKED');

    } else {
      // Regular Safe Road
      ctx.strokeStyle = isHovered ? '#38bdf8' : 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = isHovered ? 4 : 2.5;

      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);
      ctx.stroke();

      // Distance Tag at mid
      const midX = (nodeA.x + nodeB.x) / 2;
      const midY = (nodeA.y + nodeB.y) / 2;
      drawDistanceBadge(midX, midY, `${edge.weight} km`, isHovered);
    }

    ctx.restore();
  }

  function drawShortestPath(timestamp) {
    const path = state.dijkstraResult.path;
    ctx.save();

    // Glowing Underlayer
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path.forEach((nodeId, idx) => {
      const node = state.nodes.find(n => n.id === nodeId);
      if (idx === 0) ctx.moveTo(node.x, node.y);
      else ctx.lineTo(node.x, node.y);
    });
    ctx.stroke();

    // High intensity neon line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    path.forEach((nodeId, idx) => {
      const node = state.nodes.find(n => n.id === nodeId);
      if (idx === 0) ctx.moveTo(node.x, node.y);
      else ctx.lineTo(node.x, node.y);
    });
    ctx.stroke();

    // Animated dash flow
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.lineDashOffset = -(timestamp * 0.04) % 22;
    ctx.stroke();

    ctx.restore();
  }

  function drawDistanceBadge(x, y, text, isHighlight) {
    ctx.save();
    ctx.font = '600 11px JetBrains Mono, monospace';
    const textWidth = ctx.measureText(text).width;
    const pad = 6;
    const h = 18;
    const w = textWidth + pad * 2;

    ctx.fillStyle = isHighlight ? 'rgba(56, 189, 248, 0.95)' : 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = isHighlight ? '#38bdf8' : 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHighlight ? '#070a12' : '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawHazardBadge(x, y, text) {
    ctx.save();
    ctx.font = '700 10px Plus Jakarta Sans, sans-serif';
    const w = 62;
    const h = 18;

    ctx.fillStyle = 'rgba(234, 179, 8, 0.9)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠ ' + text, x, y);
    ctx.restore();
  }

  function drawNode(node, timestamp) {
    const isSource = node.id === state.source;
    const isTarget = node.id === state.target;
    const isInPath = state.dijkstraResult?.path.includes(node.id);
    const isHovered = state.hoveredNode && state.hoveredNode.id === node.id;

    ctx.save();

    // Pulse animation for emergency source
    if (isSource) {
      const pulseRadius = 24 + (Math.sin(timestamp * 0.006) + 1) * 8;
      ctx.beginPath();
      ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
      ctx.fill();
    }

    // Pulse animation for hospital target
    if (isTarget) {
      const pulseRadius = 24 + (Math.cos(timestamp * 0.005) + 1) * 6;
      ctx.beginPath();
      ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fill();
    }

    // Node outer border ring
    ctx.beginPath();
    ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);

    let fillColor = '#0f172a';
    let strokeColor = '#38bdf8';

    if (isSource) {
      fillColor = '#881337';
      strokeColor = '#f43f5e';
    } else if (isTarget) {
      fillColor = '#064e3b';
      strokeColor = '#10b981';
    } else if (isInPath) {
      fillColor = '#132e4d';
      strokeColor = '#06b6d4';
    }

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = isHovered ? 3.5 : 2;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = isHovered || isSource || isTarget ? 14 : 4;
    ctx.fill();
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Node Label inside
    ctx.font = '700 12px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, node.x, node.y);

    // Node Title below
    ctx.font = '600 11px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = isSource ? '#fda4af' : (isTarget ? '#a7f3d0' : '#cbd5e1');
    ctx.fillText(node.name, node.x, node.y + 32);

    // Distance tag above (if calculated)
    const dist = state.dijkstraResult?.distances[node.id];
    if (dist !== undefined && dist !== INF) {
      ctx.font = '500 10px JetBrains Mono, monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`${dist} km`, node.x, node.y - 28);
    }

    ctx.restore();
  }

  function drawVehicle(pos, timestamp) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(pos.angle);

    // Flashing emergency blinkers
    const blink = Math.floor(timestamp * 0.01) % 2 === 0;

    // Vehicle Body
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-14, -8, 28, 16, 4);
    ctx.fill();
    ctx.stroke();

    // Emergency Roof Light
    ctx.fillStyle = blink ? '#ef4444' : '#3b82f6';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.shadowColor = blink ? '#ef4444' : '#3b82f6';
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.restore();
  }

  // ================= EVENT LISTENERS & INTERACTION =================
  function bindEvents() {
    // Canvas Mouse interaction (dragging nodes)
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    window.addEventListener('mousemove', onCanvasMouseMove);
    window.addEventListener('mouseup', onCanvasMouseUp);

    // Source & Target Selects
    elements.sourceSelect.addEventListener('change', (e) => {
      state.source = parseInt(e.target.value);
      solveDijkstra();
      window.soundEngine.playClick();
    });

    elements.targetSelect.addEventListener('change', (e) => {
      state.target = parseInt(e.target.value);
      solveDijkstra();
      window.soundEngine.playClick();
    });

    // Dispatch & Simulate Buttons
    elements.btnDispatch.addEventListener('click', () => {
      solveDijkstra();
      startVehicleSimulation();
    });

    elements.btnSimulate.addEventListener('click', () => {
      startVehicleSimulation();
    });

    // Step-by-Step Playback Buttons
    elements.btnStepPlay.addEventListener('click', toggleStepPlayback);
    elements.btnStepNext.addEventListener('click', stepNext);
    elements.btnStepPrev.addEventListener('click', stepPrev);
    elements.btnStepReset.addEventListener('click', stepReset);

    // Playback Speed Slider
    elements.speedSlider.addEventListener('input', (e) => {
      state.playbackSpeedMs = parseInt(e.target.value);
      if (state.isPlayingSteps) {
        startStepPlayback();
      }
    });

    // Vehicle Type Buttons
    document.querySelectorAll('.vehicle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.vehicle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.vehicleType = btn.dataset.vehicle;
        window.soundEngine.playClick();
        updateUI();
      });
    });

    // Scenario Preset Buttons
    document.querySelectorAll('.scenario-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        loadScenario(btn.dataset.scenario);
        window.soundEngine.playClick();
      });
    });

    // Right Panel Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const targetTab = document.getElementById(btn.dataset.tab);
        if (targetTab) targetTab.classList.add('active');
        window.soundEngine.playClick();
      });
    });

    // Canvas Toolbar buttons (Zoom in, Zoom out, Reset positions)
    document.getElementById('toolResetView')?.addEventListener('click', () => {
      loadScenario(state.currentScenario);
      showToast('Reset node positions to default');
    });

    // Audio Toggle
    elements.audioToggleBtn?.addEventListener('click', () => {
      const isMuted = window.soundEngine.toggleMute();
      elements.audioToggleBtn.innerHTML = isMuted 
        ? '<i class="fas fa-volume-mute"></i> Audio: OFF' 
        : '<i class="fas fa-volume-up"></i> Audio: ON';
      showToast(`Audio cues ${isMuted ? 'muted' : 'enabled'}`);
    });

    // Report Modal
    elements.btnReportModal?.addEventListener('click', () => {
      elements.reportModal?.classList.add('open');
      window.soundEngine.playClick();
    });

    elements.btnCloseModal?.addEventListener('click', () => {
      elements.reportModal?.classList.remove('open');
    });

    elements.reportModal?.addEventListener('click', (e) => {
      if (e.target === elements.reportModal) {
        elements.reportModal.classList.remove('open');
      }
    });

    // Print Dispatch Report
    elements.btnPrintReport?.addEventListener('click', () => {
      window.print();
    });
  }

  // Canvas Mouse Coordinates Helper
  function getCanvasCoords(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  function findNodeAt(x, y) {
    return state.nodes.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= 24;
    });
  }

  function findEdgeAt(x, y) {
    return state.edges.find(e => {
      const nA = state.nodes.find(n => n.id === e.u);
      const nB = state.nodes.find(n => n.id === e.v);
      if (!nA || !nB) return false;

      // Distance from point to line segment
      const dx = nB.x - nA.x;
      const dy = nB.y - nA.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return false;

      let t = ((x - nA.x) * dx + (y - nA.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const projX = nA.x + t * dx;
      const projY = nA.y + t * dy;
      const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
      return dist <= 12;
    });
  }

  function onCanvasMouseDown(evt) {
    const pos = getCanvasCoords(evt);
    const node = findNodeAt(pos.x, pos.y);

    if (node) {
      state.draggedNode = node;
      return;
    }

    const edge = findEdgeAt(pos.x, pos.y);
    if (edge) {
      toggleRoadBlock(edge.u, edge.v);
    }
  }

  function onCanvasMouseMove(evt) {
    const pos = getCanvasCoords(evt);

    if (state.draggedNode) {
      state.draggedNode.x = Math.max(30, Math.min(canvas.width / (window.devicePixelRatio || 1) - 30, pos.x));
      state.draggedNode.y = Math.max(30, Math.min(canvas.height / (window.devicePixelRatio || 1) - 30, pos.y));
    } else {
      const node = findNodeAt(pos.x, pos.y);
      state.hoveredNode = node;
      canvas.style.cursor = node ? 'grab' : 'crosshair';
    }
  }

  function onCanvasMouseUp() {
    state.draggedNode = null;
  }

  // Toast System
  function showToast(message) {
    if (!elements.toastBox) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-satellite-dish" style="color:var(--accent-cyan);"></i> <span>${message}</span>`;
    elements.toastBox.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Live Clock
  function updateLiveClock() {
    const clockEl = document.getElementById('liveClockDisplay');
    if (!clockEl) return;
    const now = new Date();
    clockEl.innerText = now.toTimeString().split(' ')[0] + ' UTC+5:30';
  }

})();
