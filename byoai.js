/**
 * BYOAI — Bring Your Own AI Facilitator for CommonGround Suite
 *
 * A self-contained overlay that reads all session data from IndexedDB and
 * forwards it to the user's own AI API key (Google Gemini or any
 * OpenAI-compatible endpoint).  No data is sent anywhere without an explicit
 * user action.  The API key is stored in localStorage and never leaves the
 * browser except in requests to the provider the user configured.
 */
(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────

  const CONFIG_KEY = 'byoai_config';
  const DB_CACHE_KEY = 'byoai_db_name';
  const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
  const modelListCache = new Map();

  const GEMINI_MODELS = [
    { id: 'gemini-2.0-flash',              label: 'Gemini 2.0 Flash (recommended)' },
    { id: 'gemini-2.0-flash-lite',         label: 'Gemini 2.0 Flash Lite' },
    { id: 'gemini-2.5-pro-preview-03-25',  label: 'Gemini 2.5 Pro Preview' },
    { id: 'gemini-1.5-flash',              label: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro',               label: 'Gemini 1.5 Pro' },
  ];

  const OPENAI_MODELS = [
    { id: 'gpt-4.1',      label: 'GPT-4.1 (recommended)' },
    { id: 'gpt-4o',       label: 'GPT-4o' },
    { id: 'gpt-4o-mini',  label: 'GPT-4o Mini' },
    { id: 'o3',           label: 'o3' },
    { id: 'o4-mini',      label: 'o4-mini' },
  ];

  // ── Config ────────────────────────────────────────────────────────────────

  function loadConfig() {
    try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); }
    catch { return null; }
  }

  function saveConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }

  // ── IndexedDB helpers ─────────────────────────────────────────────────────

  function idbOpen(name) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror  = () => reject(req.error);
    });
  }

  function idbReadAll(db, store) {
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror  = () => reject(req.error);
    });
  }

  async function discoverDB() {
    const cached = sessionStorage.getItem(DB_CACHE_KEY);
    if (cached) return cached;

    const dbs = await indexedDB.databases();
    const required = ['workspaces', 'matters', 'participants'];

    for (const { name } of dbs) {
      if (!name) continue;
      try {
        const db = await idbOpen(name);
        const stores = Array.from(db.objectStoreNames);
        db.close();
        if (required.every(s => stores.includes(s))) {
          sessionStorage.setItem(DB_CACHE_KEY, name);
          return name;
        }
      } catch { /* skip */ }
    }
    return null;
  }

  const STORES = [
    'workspaces', 'matters', 'participants', 'intakeRecords',
    'issueNodes', 'sessions', 'commitments', 'followUps',
  ];

  async function gatherContext(matterId) {
    const dbName = await discoverDB();
    if (!dbName) return null;

    const db = await idbOpen(dbName);
    const results = await Promise.all(
      STORES.map(s => idbReadAll(db, s).catch(() => []))
    );
    db.close();

    const [workspaces, matters, participants, intakeRecords,
           issueNodes, sessions, commitments, followUps] = results;

    const workspace = workspaces[0] || null;
    const mf = id => r => r.matterId === id;

    if (matterId) {
      return {
        workspace,
        matter:       matters.find(m => m.id === matterId) || null,
        allMatters:   matters,
        participants: participants.filter(mf(matterId)),
        intakeRecords:intakeRecords.filter(mf(matterId)),
        issueNodes:   issueNodes.filter(mf(matterId)),
        sessions:     sessions.filter(mf(matterId)).sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt)),
        commitments:  commitments.filter(mf(matterId)),
        followUps:    followUps.filter(mf(matterId)),
      };
    }

    return { workspace, matter: null, allMatters: matters,
             participants:[], intakeRecords:[], issueNodes:[],
             sessions:[], commitments:[], followUps:[] };
  }

  // ── Route & matter detection ──────────────────────────────────────────────

  function detectMatterId() {
    const m = location.hash.match(/[?&]id=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
    // Scan localStorage for UUID-shaped values associated with "matter"
    try {
      for (const k of Object.keys(localStorage)) {
        if (/matter|current/i.test(k)) {
          const v = localStorage.getItem(k);
          if (v && /^[0-9a-f-]{36}$/i.test(v)) return v;
        }
      }
    } catch { /* ignore */ }
    return null;
  }

  function detectRoute() {
    return location.hash.replace(/^#\/?/, '').replace(/\?.*$/, '') || 'dashboard';
  }

  // ── System prompt builder ─────────────────────────────────────────────────

  function fmt(d) { return d ? new Date(d).toLocaleDateString() : ''; }

  function buildSystemPrompt(ctx, route) {
    const L = [
      'You are an expert conflict-resolution and team-facilitation AI assistant embedded in CommonGround Suite.',
      'You act as the facilitator\'s strategic partner with full access to the current matter\'s data.',
      '',
      '## Your Role',
      '- Offer evidence-based facilitation guidance tailored to the current phase and matter type.',
      '- Suggest specific questions, reframing prompts, and process interventions.',
      '- Draft commitments, summaries, and follow-up plans on request.',
      '- Flag safety concerns, power imbalances, or suitability issues prominently.',
      '- Be trauma-informed, culturally sensitive, and power-aware at all times.',
      '- Adapt tone and depth to the matter type: mediation, team health, performance, or change.',
      '',
      '## Current Screen',
      `Route: **${route}**`,
    ];

    if (ctx?.workspace) {
      L.push('', '## Workspace');
      L.push(`- Name: ${ctx.workspace.name || '(unnamed)'}`);
      if (ctx.workspace.owner) L.push(`- Facilitator: ${ctx.workspace.owner}`);
    }

    if (ctx?.matter) {
      const m = ctx.matter;
      L.push('', '## Active Matter');
      L.push(`- Title: ${m.title || '(untitled)'}`);
      L.push(`- Type: ${m.type || 'unknown'}`);
      L.push(`- Status: ${m.status || 'unknown'}`);
      if (m.suitabilityState) L.push(`- Suitability: ${m.suitabilityState}`);
      if (m.currentPhase) L.push(`- Current phase: ${m.currentPhase}`);
      if (m.createdAt) L.push(`- Created: ${fmt(m.createdAt)}`);
    }

    if (ctx?.participants?.length) {
      L.push('', '## Participants');
      for (const p of ctx.participants) {
        L.push(`- **${p.displayName || 'Unknown'}** (${p.role || 'participant'})`);
      }
    }

    if (ctx?.intakeRecords?.length) {
      L.push('', '## Intake Records');
      for (const r of ctx.intakeRecords) {
        const pName = ctx.participants?.find(p => p.id === r.participantId)?.displayName || 'Unknown';
        L.push(`### ${pName}`);
        if (r.responses?.notes)          L.push(`- Notes: ${r.responses.notes}`);
        if (r.responses?.desiredOutcome) L.push(`- Desired outcome: ${r.responses.desiredOutcome}`);
        if (r.responses?.constraints)    L.push(`- Constraints: ${r.responses.constraints}`);
        const triggered = r.riskFlags?.filter(f => f.triggered) || [];
        if (triggered.length) L.push(`- ⚠ Risk flags: ${triggered.map(f => f.category).join(', ')}`);
      }
    }

    if (ctx?.issueNodes?.length) {
      L.push('', '## Issue Map');
      for (const priority of ['critical', 'high', 'medium', 'low']) {
        const nodes = ctx.issueNodes.filter(n => (n.priority || 'medium') === priority);
        if (!nodes.length) continue;
        L.push(`### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority`);
        for (const n of nodes) {
          L.push(`- ${n.label || '(no label)'}`);
          if (n.notes) L.push(`  ${n.notes}`);
        }
      }
    }

    if (ctx?.sessions?.length) {
      const recent = ctx.sessions.slice(-3);
      L.push('', `## Session Log (${ctx.sessions.length} total — showing last ${recent.length})`);
      recent.forEach((s, i) => {
        L.push(`### Session ${ctx.sessions.length - recent.length + i + 1}`);
        if (s.phase)  L.push(`- Phase: ${s.phase}`);
        if (s.date || s.createdAt) L.push(`- Date: ${fmt(s.date || s.createdAt)}`);
        if (Array.isArray(s.agenda) && s.agenda.length) L.push(`- Agenda: ${s.agenda.join('; ')}`);
        if (s.notes)  L.push(`- Notes: ${s.notes}`);
      });
    }

    if (ctx?.commitments?.length) {
      L.push('', '## Commitments');
      for (const c of ctx.commitments) {
        L.push(`- [${c.status || 'pending'}] ${c.text || '(no text)'}`);
        if (c.ownerId) {
          const owner = ctx.participants?.find(p => p.id === c.ownerId)?.displayName || c.ownerId;
          L.push(`  Owner: ${owner}`);
        }
        if (c.dueDate) L.push(`  Due: ${fmt(c.dueDate)}`);
      }
    }

    if (ctx?.followUps?.length) {
      L.push('', '## Follow-up Checkpoints');
      for (const f of ctx.followUps) {
        L.push(`- Target: ${f.targetDate ? fmt(f.targetDate) : '(no date set)'}`);
        if (f.result)      L.push(`  Result: ${f.result}`);
        if (f.completedAt) L.push(`  Completed: ${fmt(f.completedAt)}`);
      }
    }

    if (!ctx?.matter && ctx?.allMatters?.length) {
      const shown = ctx.allMatters.slice(0, 5);
      L.push('', `## Matters in Workspace (${ctx.allMatters.length} total)`);
      for (const m of shown)
        L.push(`- ${m.title || '(untitled)'} [${m.status || '?'}] — ${m.type || 'unknown'}`);
      if (ctx.allMatters.length > 5) L.push(`*(and ${ctx.allMatters.length - 5} more)*`);
    }

    const matterLabel = ctx?.matter
      ? `"${ctx.matter.title}" (${ctx.matter.type || 'unknown type'})`
      : 'the current facilitation context';

    L.push(
      '', '## Response Format',
      'Output plain text only. Do not use markdown: no asterisks, no hash headings, no dashes for bullets, no backticks.',
      'Be concise — 3 to 5 sentences, or a short numbered list when listing questions. No lengthy preamble.',
      `Focus all guidance on ${matterLabel}.`,
      'Lead with any safety or ethical flags before other content.',
    );

    return L.join('\n');
  }

  // ── AI API calls ──────────────────────────────────────────────────────────

  async function callGemini(cfg, messages) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

    const systemMsg = messages.find(m => m.role === 'system');
    const chatMsgs  = messages.filter(m => m.role !== 'system');

    const body = {
      ...(systemMsg && { systemInstruction: { parts: [{ text: systemMsg.content }] } }),
      contents: chatMsgs.map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '(no response)';
  }

  async function callOpenAI(cfg, messages) {
    const base = (cfg.endpoint || 'https://api.openai.com/v1').replace(/\/$/, '');
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '(no response)';
  }

  async function callAI(cfg, messages) {
    return cfg.provider === 'gemini' ? callGemini(cfg, messages) : callOpenAI(cfg, messages);
  }

  // ── Design tokens ─────────────────────────────────────────────────────────

  const C = {
    bg:         '#1a1f2e',
    bgL:        '#252b3d',
    bgLL:       '#2d3450',
    border:     '#3a4260',
    accent:     '#4f8ef7',
    accentH:    '#6ba3ff',
    text:       '#e8eaf0',
    muted:      '#8892b0',
    error:      '#d9534f',
    userBg:     '#2d3450',
    aiBg:       '#1e3a5f',
  };

  const inputCSS = `width:100%;padding:8px 10px;border-radius:6px;border:1px solid ${C.border};background:${C.bgLL};color:${C.text};font-size:13px;box-sizing:border-box;`;
  const btnCSS   = `display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 14px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600;touch-action:manipulation;`;

  // ── Panel DOM ─────────────────────────────────────────────────────────────

  function buildPanel() {
    const el = document.createElement('div');
    el.id = 'byoai-panel';
    el.setAttribute('role', 'complementary');
    el.setAttribute('aria-label', 'AI Facilitator');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = `
      position:fixed;inset:0 0 0 auto;width:min(400px,100vw);
      background:${C.bg};border-left:1px solid ${C.border};
      display:flex;flex-direction:column;z-index:99999;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      color:${C.text};box-shadow:-4px 0 32px rgba(0,0,0,0.5);
      transform:translateX(100%);transition:transform 0.25s ease;
    `;
    el.innerHTML = `
      <div style="padding:max(13px,env(safe-area-inset-top,0px)) 14px 13px;border-bottom:1px solid ${C.border};
                  display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span aria-hidden="true" style="font-size:18px;">🤝</span>
        <span style="font-weight:700;font-size:14px;flex:1;letter-spacing:0.01em;">AI Facilitator</span>
        <button id="byoai-btn-settings" aria-label="Settings"
          style="${btnCSS}background:transparent;color:${C.muted};padding:5px 9px;">⚙</button>
        <button id="byoai-btn-close" aria-label="Close panel"
          style="${btnCSS}background:transparent;color:${C.muted};padding:5px 9px;">✕</button>
      </div>
      <div id="byoai-body" style="flex:1;overflow-y:auto;padding:12px;
           display:flex;flex-direction:column;gap:8px;" role="log" aria-live="polite"></div>
      <div id="byoai-footer" style="padding:10px 12px max(10px,env(safe-area-inset-bottom,0px)) 12px;border-top:1px solid ${C.border};
           display:flex;gap:8px;flex-shrink:0;align-items:flex-end;">
        <textarea id="byoai-input" rows="2" placeholder="Ask the AI facilitator…"
          aria-label="Message to AI facilitator"
          style="${inputCSS}resize:none;flex:1;line-height:1.4;"></textarea>
        <div style="display:flex;flex-direction:column;gap:5px;">
          <button id="byoai-btn-send" aria-label="Send message"
            style="${btnCSS}background:${C.accent};color:#fff;padding:8px 12px;">▶</button>
          <button id="byoai-btn-refresh" aria-label="Refresh context" title="Refresh context from app data"
            style="${btnCSS}background:${C.bgLL};color:${C.muted};padding:5px 9px;font-size:11px;">↻</button>
        </div>
      </div>
    `;
    return el;
  }

  // ── Settings view ─────────────────────────────────────────────────────────

  function renderSettings() {
    const cfg  = loadConfig() || {};
    const body = document.getElementById('byoai-body');
    body.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:4px 2px;';
    wrap.innerHTML = `
      <h3 style="margin:0 0 16px;font-size:14px;font-weight:700;">API Configuration</h3>

      <div style="margin-bottom:14px;">
        <label style="display:block;margin-bottom:5px;font-size:12px;color:${C.muted};font-weight:500;" for="byoai-sel-provider">Provider</label>
        <select id="byoai-sel-provider" style="${inputCSS}">
          <option value="gemini" ${cfg.provider==='gemini'?'selected':''}>Google Gemini</option>
          <option value="openai" ${cfg.provider==='openai'?'selected':''}>OpenAI / Compatible</option>
        </select>
      </div>

      <div style="margin-bottom:14px;">
        <label style="display:block;margin-bottom:5px;font-size:12px;color:${C.muted};font-weight:500;" for="byoai-inp-key">API Key</label>
        <input type="password" id="byoai-inp-key" autocomplete="off" spellcheck="false"
          placeholder="Paste your API key here"
          style="${inputCSS}" />
        <p style="margin:5px 0 0;font-size:11px;color:${C.muted};line-height:1.4;">
          Stored in your browser only. Sent exclusively to your chosen AI provider.
        </p>
      </div>

      <div style="margin-bottom:14px;">
        <label style="display:block;margin-bottom:5px;font-size:12px;color:${C.muted};font-weight:500;" for="byoai-sel-model">Model</label>
        <select id="byoai-sel-model" style="${inputCSS}margin-bottom:6px;"></select>
        <input type="text" id="byoai-inp-model-custom" placeholder="Or enter a custom model ID"
          value="" style="${inputCSS}" />
        <p style="margin:5px 0 0;font-size:11px;color:${C.muted};">Custom ID overrides the selection above.</p>
        <p id="byoai-model-status" style="margin:4px 0 0;font-size:11px;color:${C.muted};"></p>
      </div>

      <div id="byoai-endpoint-row" style="margin-bottom:14px;">
        <label style="display:block;margin-bottom:5px;font-size:12px;color:${C.muted};font-weight:500;" for="byoai-inp-endpoint">
          Base URL <span style="font-weight:400;">(OpenAI-compatible)</span>
        </label>
        <input type="url" id="byoai-inp-endpoint"
          placeholder="https://api.openai.com/v1"
          style="${inputCSS}" />
        <p style="margin:5px 0 0;font-size:11px;color:${C.muted};">
          Works with Groq, Mistral, Together AI, local Ollama, and any OpenAI-compatible server.
        </p>
      </div>

      <button id="byoai-btn-save"
        style="${btnCSS}background:${C.accent};color:#fff;width:100%;margin-top:4px;">
        Save &amp; Start
      </button>
      <button id="byoai-btn-clear"
        style="${btnCSS}background:transparent;color:${C.error};width:100%;margin-top:8px;border:1px solid ${C.error};">
        Clear Saved Key
      </button>
    `;
    body.appendChild(wrap);

    const selProvider  = document.getElementById('byoai-sel-provider');
    const selModel     = document.getElementById('byoai-sel-model');
    const inpEndpoint  = document.getElementById('byoai-endpoint-row');
    const inpModelCust = document.getElementById('byoai-inp-model-custom');
    const inpKey       = document.getElementById('byoai-inp-key');
    const modelStatus  = document.getElementById('byoai-model-status');
    const inpEndpointUrl = document.getElementById('byoai-inp-endpoint');

    // Set user-supplied values via DOM to avoid HTML injection via template literals
    inpKey.value = cfg.apiKey || '';
    inpEndpointUrl.value = cfg.endpoint || 'https://api.openai.com/v1';

    function renderModelOptions(models, preferred) {
      const prev = preferred || selModel.value;
      selModel.innerHTML = '';
      for (const m of models) {
        const id = m.id || String(m);
        const label = m.label || String(m);
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = label;
        opt.selected = prev === id;
        selModel.appendChild(opt);
      }
    }

    async function discoverModels(provider, apiKey, endpoint) {
      const keyFingerprint = `${apiKey.length}:${apiKey.slice(0,2)}:${apiKey.slice(-2)}`;
      const cacheKey = `${provider}|${endpoint || ''}|${keyFingerprint}`;
      const cached = modelListCache.get(cacheKey);
      if (cached && (Date.now() - cached.ts) < MODEL_CACHE_TTL_MS) {
        return cached.models;
      }

      let models;
      if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Gemini model list error ${res.status}`);
        const data = await res.json();
        models = (data.models || [])
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => String(m.name || '').split('/').pop())
          .filter(Boolean);
      } else {
        const base = (endpoint || 'https://api.openai.com/v1').replace(/\/$/, '');
        const res = await fetch(`${base}/models`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!res.ok) throw new Error(`OpenAI model list error ${res.status}`);
        const data = await res.json();
        models = (data.data || []).map(m => m.id).filter(Boolean);
      }
      modelListCache.set(cacheKey, { ts: Date.now(), models });
      return models;
    }

    function syncProvider(provider) {
      const models = provider === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS;
      renderModelOptions(models, cfg.model);
      inpEndpoint.style.display = provider === 'openai' ? 'block' : 'none';
    }

    let modelReqId = 0;

    async function autoPopulateModels() {
      const reqId = ++modelReqId;
      const provider = selProvider.value;
      const fallback = provider === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS;
      const apiKey = inpKey.value.trim();
      const endpoint = inpEndpointUrl.value.trim();
      const preferred = selModel.value || cfg.model;
      syncProvider(provider);
      if (!apiKey) { modelStatus.textContent = 'Enter API key to auto-load available models.'; return; }
      modelStatus.textContent = 'Loading models from provider…';
      try {
        const models = await discoverModels(provider, apiKey, endpoint);
        if (reqId !== modelReqId) return;
        if (models.length === 0) throw new Error('No models returned');
        renderModelOptions(models, preferred);
        modelStatus.textContent = `Loaded ${models.length} models from provider.`;
      } catch (e) {
        if (reqId !== modelReqId) return;
        renderModelOptions(fallback, preferred);
        modelStatus.textContent = `Could not auto-load models (${e?.message || 'unknown error'}). Using defaults.`;
      }
    }

    let autoPopulateTimer = null;
    function scheduleAutoPopulate() {
      if (autoPopulateTimer !== null) clearTimeout(autoPopulateTimer);
      autoPopulateTimer = setTimeout(() => {
        autoPopulateTimer = null;
        autoPopulateModels();
      }, 350);
    }

    syncProvider(selProvider.value);
    autoPopulateModels();
    selProvider.addEventListener('change', autoPopulateModels);
    inpKey.addEventListener('input', scheduleAutoPopulate);
    inpKey.addEventListener('change', autoPopulateModels);
    inpEndpointUrl.addEventListener('input', scheduleAutoPopulate);
    inpEndpointUrl.addEventListener('change', autoPopulateModels);

    document.getElementById('byoai-btn-save').addEventListener('click', () => {
      const provider    = selProvider.value;
      const apiKey      = inpKey.value.trim();
      const customModel = inpModelCust.value.trim();
      const model       = customModel || selModel.value;
      const endpoint    = inpEndpointUrl.value.trim();

      if (!apiKey) { alert('Please enter an API key.'); return; }
      if (!model)  { alert('Please select or enter a model ID.'); return; }

      saveConfig({
        provider,
        apiKey,
        model,
        ...(provider === 'openai' && endpoint ? { endpoint } : {}),
      });

      state.settingsOpen = false;
      state.history = [];
      renderChat();
      loadContextAndGreet();
    });

    document.getElementById('byoai-btn-clear').addEventListener('click', () => {
      if (!confirm('Clear your saved API key and settings?')) return;
      localStorage.removeItem(CONFIG_KEY);
      renderSettings();
    });
  }

  // ── Chat view ─────────────────────────────────────────────────────────────

  function renderChat() {
    const body = document.getElementById('byoai-body');
    body.innerHTML = '';

    for (const msg of state.history) {
      if (msg.role !== 'system') appendBubble(msg.role, msg.content, false);
    }

    body.scrollTop = body.scrollHeight;
    document.getElementById('byoai-footer').style.display = 'flex';
  }

  function appendBubble(role, content, autoScroll = true) {
    const body  = document.getElementById('byoai-body');
    if (!body) return;
    const isAI  = role === 'assistant';

    const label = document.createElement('div');
    label.style.cssText = `font-size:10px;color:${C.muted};margin-bottom:3px;`;
    label.textContent = isAI ? '🤝 AI Facilitator' : '👤 You';

    const bubble = document.createElement('div');
    bubble.style.cssText = `
      padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.55;
      background:${isAI ? C.aiBg : C.userBg};border:1px solid ${C.border};
      word-wrap:break-word;max-width:100%;${isAI ? 'white-space:pre-wrap;' : ''}
    `;
    bubble.textContent = content;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `display:flex;flex-direction:column;align-items:${isAI?'flex-start':'flex-end'};`;
    wrapper.appendChild(label);
    wrapper.appendChild(bubble);

    body.appendChild(wrapper);
    if (autoScroll) body.scrollTop = body.scrollHeight;
  }

  function showTyping() {
    const body = document.getElementById('byoai-body');
    if (!body) return;
    const el = document.createElement('div');
    el.id = 'byoai-typing';
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = `font-size:12px;color:${C.muted};padding:6px 8px;`;
    el.textContent = 'AI Facilitator is thinking…';
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function hideTyping() {
    document.getElementById('byoai-typing')?.remove();
  }

  // ── Context loading ───────────────────────────────────────────────────────

  async function loadContextAndGreet() {
    const cfg = loadConfig();
    if (!cfg) { state.settingsOpen = true; renderSettings(); return; }

    const route    = detectRoute();
    const matterId = detectMatterId();

    try {
      state.ctx = await gatherContext(matterId);
    } catch {
      state.ctx = null;
    }

    const sysPrompt = buildSystemPrompt(state.ctx, route);
    state.history = [{ role: 'system', content: sysPrompt }];

    renderChat();
    showTyping();

    const matterContext = state.ctx?.matter
      ? ` for "${state.ctx.matter.title}" (${state.ctx.matter.type || 'unknown'})`
      : '';
    const seed = [
      { role: 'system', content: sysPrompt },
      {
        role: 'user',
        content: `I'm on the "${route}" screen${matterContext}. Give 2-3 specific, actionable facilitation suggestions for right now. Plain text only, no formatting.`,
      },
    ];

    try {
      const reply = await callAI(cfg, seed);
      hideTyping();
      state.history.push({ role: 'assistant', content: reply });
      appendBubble('assistant', reply);
    } catch (e) {
      hideTyping();
      appendBubble('assistant', `⚠ Could not reach AI: ${e.message}\n\nCheck your API key and network connection in Settings (⚙).`);
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────

  async function sendMessage() {
    if (state.busy) return;
    const cfg = loadConfig();
    if (!cfg) { state.settingsOpen = true; renderSettings(); return; }

    const input = document.getElementById('byoai-input');
    const text  = input.value.trim();
    if (!text) return;

    input.value = '';
    state.history.push({ role: 'user', content: text });
    appendBubble('user', text);

    state.busy = true;
    const sendBtn = document.getElementById('byoai-btn-send');
    if (sendBtn) sendBtn.disabled = true;
    showTyping();

    try {
      // Keep system prompt + last 20 messages to avoid context-window overflow
      const msgs = state.history.length > 21
        ? [state.history[0], ...state.history.slice(-20)]
        : state.history;
      const reply = await callAI(cfg, msgs);
      state.history.push({ role: 'assistant', content: reply });
      hideTyping();
      appendBubble('assistant', reply);
    } catch (e) {
      hideTyping();
      appendBubble('assistant', `⚠ Error: ${e.message}`);
    } finally {
      state.busy = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  // ── Toggle button ─────────────────────────────────────────────────────────

  function buildToggle() {
    const btn = document.createElement('button');
    btn.id = 'byoai-toggle';
    btn.setAttribute('aria-label', 'Open AI Facilitator');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'byoai-panel');
    btn.setAttribute('title', 'AI Facilitator');
    btn.style.cssText = `
      position:fixed;bottom:calc(22px + env(safe-area-inset-bottom,0px));right:calc(22px + env(safe-area-inset-right,0px));z-index:99998;
      width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;
      background:linear-gradient(135deg,#4f8ef7 0%,#7b5ea7 100%);
      color:#fff;font-size:22px;
      box-shadow:0 4px 16px rgba(79,142,247,0.45);
      touch-action:manipulation;display:flex;align-items:center;justify-content:center;
      transition:transform 0.15s ease,box-shadow 0.15s ease;
    `;
    btn.textContent = '🤝';
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.1)';
      btn.style.boxShadow = '0 6px 22px rgba(79,142,247,0.65)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 16px rgba(79,142,247,0.45)';
    });
    btn.addEventListener('click', togglePanel);
    return btn;
  }

  // ── State & panel lifecycle ───────────────────────────────────────────────

  const state = {
    panelEl:      null,
    open:         false,
    settingsOpen: false,
    history:      [],  // { role, content }[]
    ctx:          null,
    busy:         false,
  };

  function togglePanel() {
    if (!state.panelEl) initPanel();

    state.open = !state.open;
    state.panelEl.style.transform = state.open ? 'translateX(0)' : 'translateX(100%)';
    state.panelEl.setAttribute('aria-hidden', state.open ? 'false' : 'true');

    const toggleBtn = document.getElementById('byoai-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', state.open ? 'true' : 'false');
      toggleBtn.setAttribute('aria-label', state.open ? 'Close AI Facilitator' : 'Open AI Facilitator');
    }

    if (state.open) {
      if (state.history.length === 0 && !state.settingsOpen) {
        if (!loadConfig()) { state.settingsOpen = true; renderSettings(); }
        else loadContextAndGreet();
      }
      requestAnimationFrame(() => { document.getElementById('byoai-input')?.focus(); });
    } else {
      toggleBtn?.focus();
    }
  }

  function initPanel() {
    state.panelEl = buildPanel();
    document.body.appendChild(state.panelEl);

    document.getElementById('byoai-btn-close').addEventListener('click', () => {
      state.open = false;
      state.panelEl.style.transform = 'translateX(100%)';
      state.panelEl.setAttribute('aria-hidden', 'true');
      const toggleBtn = document.getElementById('byoai-toggle');
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', 'Open AI Facilitator');
        toggleBtn.focus();
      }
    });

    document.getElementById('byoai-btn-settings').addEventListener('click', () => {
      state.settingsOpen = !state.settingsOpen;
      if (state.settingsOpen) {
        renderSettings();
      } else {
        if (state.history.length === 0) loadContextAndGreet();
        else renderChat();
      }
    });

    document.getElementById('byoai-btn-send').addEventListener('click', sendMessage);

    document.getElementById('byoai-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    document.getElementById('byoai-btn-refresh').addEventListener('click', () => {
      state.history = [];
      loadContextAndGreet();
    });
  }

  // ── Keyboard: Escape closes panel ────────────────────────────────────────

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.open) {
      e.preventDefault();
      state.open = false;
      state.panelEl.style.transform = 'translateX(100%)';
      state.panelEl.setAttribute('aria-hidden', 'true');
      const toggleBtn = document.getElementById('byoai-toggle');
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', 'Open AI Facilitator');
        toggleBtn.focus();
      }
    }
  });

  // ── SPA route watcher ─────────────────────────────────────────────────────

  window.addEventListener('hashchange', () => {
    if (state.open && !state.settingsOpen) {
      state.history = [];
      loadContextAndGreet();
    }
  });

  // ── Boot ──────────────────────────────────────────────────────────────────

  function boot() {
    document.body.appendChild(buildToggle());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
