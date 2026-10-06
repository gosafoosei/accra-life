/* ============================================================
   Accra Life — Town Square chat (player-to-player)
   Usernames + global chat + DMs + reactions + presence + block.
   Default transport: ntfy.sh pub/sub (no accounts, no keys,
   messages fade after ~12h). Optional transport: Supabase —
   fill in config.js and run supabase-setup.sql to switch.
   ============================================================ */
'use strict';

(function(){
  const NTFY = 'https://ntfy.sh';
  const GLOBAL_TOPIC = 'accra-life-square-9k2mf';
  const PRESENCE_TOPIC = GLOBAL_TOPIC + '-presence';
  const HISTORY_LIMIT = 80;
  const RECENT_MS = 3 * 60 * 1000;
  const PICKS = ['\u{1F602}', '\u{1F525}', '\u2764\uFE0F', '\u{1F44D}', '\u{1F480}', '\u{1F1EC}\u{1F1ED}'];
  const config = window.ACCRA_CONFIG || {};
  const wantSupabase = !!(config.supabaseURL && config.supabaseAnonKey);

  let me = null;
  let sb = null, sbReady = false, sbBooted = false;
  const conns = {};              // topic -> connection
  const dmTopics = {};           // handle(lower) -> topic
  const reactions = {};          // msgId -> { emoji: [handles] }
  const presence = {};           // handle(lower) -> {h, at}
  let blocked = new Set();
  try { blocked = new Set(JSON.parse(localStorage.getItem('accraLifeBlocked') || '[]')); } catch(e){}
  const saveBlocked = () => { try { localStorage.setItem('accraLifeBlocked', JSON.stringify([...blocked])); } catch(e){} };

  let activeTab = 'global';
  let activeDM = null;
  let lastSent = 0;
  let modalIsOpen = false;
  let heartbeatTimer = null, pruneTimer = null;

  const cleanHandle = h => String(h || '').trim().replace(/^@+/, '');
  const validHandle = h => /^[A-Za-z0-9_]{3,16}$/.test(cleanHandle(h));
  const isMe = h => me && String(h || '').toLowerCase() === me.toLowerCase();
  const dmTopicFor = (a, b) => {
    const key = [a, b].map(x => String(x).toLowerCase()).sort().join('-');
    return 'accra-life-dm-' + key + '-7f3k';
  };

  /* ---------------- optional Supabase transport ---------------- */
  function bootSupabase(){
    return new Promise(resolve => {
      if (sbBooted) return resolve(sbReady);
      sbBooted = true;
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/supabase.min.js';
      s.onload = () => {
        try { sb = window.supabase.createClient(config.supabaseURL, config.supabaseAnonKey); sbReady = !!sb; }
        catch(e){ sbReady = false; }
        resolve(sbReady);
      };
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
      setTimeout(() => resolve(sbReady), 8000);
    });
  }

  /* ---------------- connection layer ---------------- */
  async function conn(topic){
    if (conns[topic]) return conns[topic];
    const c = { msgs: [], seen: new Set(), topic, kind: 'ntfy', es: null };
    conns[topic] = c;
    if (wantSupabase){
      const ok = await bootSupabase();
      if (ok){
        c.kind = 'supabase';
        try {
          const ch = sb.channel('ch-' + topic).on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'topic=eq.' + topic },
            msg => ingest(c, JSON.stringify(msg.new.payload)));
          ch.subscribe();
          c.es = ch;
          const { data, error } = await sb.from('chat_messages').select('payload')
            .eq('topic', topic).order('id', { ascending: false }).limit(HISTORY_LIMIT);
          if (!error && data){
            data.reverse().forEach(r => ingest(c, JSON.stringify(r.payload)));
            renderIfCurrent(topic);
          }
          return c;
        } catch(e){ /* fall through to ntfy */ }
      }
      toast('Using the open square', 'Supabase didn\u2019t start — falling back to ntfy.', '', 5000);
    }
    // ntfy transport (default)
    try {
      c.es = new EventSource(`${NTFY}/${topic}/sse`);
      c.es.onmessage = e => {
        try {
          const d = JSON.parse(e.data);
          if (d.event === 'message') ingest(c, d.message);
        } catch(err){}
      };
    } catch(e){}
    fetch(`${NTFY}/${topic}/json?poll=1`)
      .then(r => r.text())
      .then(txt => {
        txt.trim().split('\n').filter(Boolean).forEach(line => {
          try {
            const d = JSON.parse(line);
            if (d.event === 'message') ingest(c, d.message);
          } catch(e){}
        });
        renderIfCurrent(topic);
      })
      .catch(() => {});
    return c;
  }

  function rawSend(topic, payload){
    const c = conns[topic];
    if (c && c.kind === 'supabase' && sb){
      sb.from('chat_messages').insert({ topic, payload })
        .then(r => { if (r.error) toast('No signal', 'The square rejected that message.', 'bad'); });
      return true;
    }
    fetch(`${NTFY}/${topic}`, { method: 'POST', body: JSON.stringify(payload) })
      .catch(() => toast('No signal', 'The town square is unreachable right now.', 'bad'));
    return true;
  }
  function send(topic, payload){
    const now = Date.now();
    if (now - lastSent < 1200) return false;
    lastSent = now;
    payload.id = 'm' + Math.random().toString(36).slice(2, 10);
    payload.ts = now;
    return rawSend(topic, payload);
  }

  /* ---------------- ingestion ---------------- */
  function ingest(c, raw){
    let p = null;
    try { p = JSON.parse(raw); } catch(e){ return; }
    if (!p || !p.t || !p.h || !p.id) return;
    const fromKey = String(p.h).toLowerCase();
    if (blocked.has(fromKey)){ c.seen.add(p.id); return; }
    if (p.t === 'react'){ applyReact(p); c.seen.add(p.id); return; }
    if (p.t === 'ping'){
      presence[fromKey] = { h: p.h, at: p.ts || Date.now() };
      c.seen.add(p.id);
      if (modalIsOpen && activeTab === 'global') renderPresenceRow();
      return;
    }
    if (c.seen.has(p.id)) return;
    c.seen.add(p.id);
    c.msgs.push(p);
    if (c.msgs.length > HISTORY_LIMIT) c.msgs.shift();
    handleEvent(p);
    renderIfCurrent(topicOf(c), p);
  }
  function topicOf(c){
    for (const k of Object.keys(conns)) if (conns[k] === c) return k;
    return null;
  }
  function currentTopic(){
    if (activeTab === 'global') return GLOBAL_TOPIC;
    return activeDM ? (dmTopics[activeDM.toLowerCase()] || null) : null;
  }
  function renderIfCurrent(topic, newMsg){
    if (!modalIsOpen || topic !== currentTopic()) return;
    if (newMsg && $('#chat-msgs')){ appendMsg(newMsg); return; }
    renderChat();
  }
  function findMsg(id){
    for (const k of Object.keys(conns)){
      const m = conns[k].msgs.find(x => x.id === id);
      if (m) return { msg: m, topic: k };
    }
    return null;
  }

  function handleEvent(p){
    if (!me) return;
    if (p.t === 'dmping' && p.to && !isMe(p.from) && p.to.toLowerCase() === me.toLowerCase()){
      const key = String(p.from).toLowerCase();
      if (!dmTopics[key]){
        dmTopics[key] = p.dm;
        conn(p.dm);
        toast('📩 @' + p.from, 'opened a chat with you — tap 💬 to reply.', '', 7000);
      }
    }
    if (p.t === 'dm' && p.to && !isMe(p.h) && p.to.toLowerCase() === me.toLowerCase()){
      toast('💬 @' + p.h, String(p.m || '').slice(0, 90), '', 6000);
    }
    if (p.t === 'msg' && !isMe(p.h) && String(p.m || '').toLowerCase().includes('@' + me.toLowerCase())){
      toast('💬 Mention from @' + p.h, String(p.m || '').slice(0, 90), '', 6500);
    }
  }

  /* ---------------- reactions ---------------- */
  function applyReact(p){
    const f = findMsg(p.id);
    if (!f) return;
    const map = (reactions[p.id] = reactions[p.id] || {});
    map[p.e] = map[p.e] || [];
    const arr = map[p.e];
    const i = arr.findIndex(x => String(x).toLowerCase() === String(p.h).toLowerCase());
    if (p.off){ if (i >= 0) arr.splice(i, 1); }
    else if (i < 0) arr.push(p.h);
    renderReacts(p.id);
  }
  function toggleReact(mid, e){
    const f = findMsg(mid);
    if (!f) return;
    const map = (reactions[mid] = reactions[mid] || {});
    map[e] = map[e] || [];
    const arr = map[e];
    const i = arr.findIndex(x => isMe(x));
    const off = i >= 0;
    if (off) arr.splice(i, 1); else arr.push(me);
    rawSend(f.topic, { t: 'react', h: me, id: mid, e, off });
    renderReacts(mid);
  }
  function chipsHTML(mid){
    const r = reactions[mid] || {};
    return Object.entries(r).filter(([, arr]) => arr.length).map(([e, arr]) =>
      `<button class="react-chip${arr.some(x => isMe(x)) ? ' mine' : ''}" data-mid="${escLocal(mid)}" data-e="${escLocal(e)}">${e} ${arr.length}</button>`
    ).join('');
  }
  function renderReacts(mid){
    document.querySelectorAll(`.chat-msg[data-mid="${mid}"]`).forEach(el => {
      let holder = el.querySelector('.chat-reacts');
      const html = chipsHTML(mid);
      if (html){
        if (!holder){ holder = document.createElement('div'); holder.className = 'chat-reacts'; el.insertBefore(holder, el.querySelector('.react-pick')); }
        holder.innerHTML = html;
      } else if (holder) holder.remove();
    });
  }

  /* ---------------- presence ---------------- */
  function startPresence(){
    stopPresence();
    const beat = () => {
      if (!me) return;
      presence[me.toLowerCase()] = { h: me, at: Date.now() };
      rawSend(PRESENCE_TOPIC, { t: 'ping', h: me, id: 'p' + Math.random().toString(36).slice(2, 8), ts: Date.now() });
    };
    beat();
    conn(PRESENCE_TOPIC);
    heartbeatTimer = setInterval(beat, 60000);
    pruneTimer = setInterval(() => { if (modalIsOpen) renderPresenceRow(); }, 5000);
  }
  function stopPresence(){
    if (heartbeatTimer){ clearInterval(heartbeatTimer); heartbeatTimer = null; }
    if (pruneTimer){ clearInterval(pruneTimer); pruneTimer = null; }
  }
  function renderPresenceRow(){
    const row = $('#presence-row');
    if (!row) return;
    const now = Date.now();
    const online = Object.values(presence)
      .filter(p => now - p.at < RECENT_MS)
      .sort((a, b) => b.at - a.at);
    row.innerHTML = online.length
      ? '\u{1F7E2} In the square: ' + online.map(p => '@' + escLocal(p.h)).join(', ')
      : '\u{1F7E1} Nobody else is around right now — be the vibes.';
  }

  /* ---------------- block ---------------- */
  function toggleBlock(h){
    const key = String(h || '').toLowerCase();
    if (!key || isMe(h)) return;
    if (blocked.has(key)){
      blocked.delete(key);
      toast('Unblocked', '@' + key + ' can appear in your square again.', 'good');
    } else {
      blocked.add(key);
      toast('Blocked', '@' + key + ' is hidden from your square. Undo via the blocked list below the chat.', 'bad', 6000);
    }
    saveBlocked();
    renderChat();
  }

  /* ---------------- handle ---------------- */
  function setHandle(h){
    me = cleanHandle(h);
    if (typeof S !== 'undefined' && S){ S.handle = me; save(); }
    try { localStorage.setItem('accraLifeHandle', me); } catch(e){}
    conn(GLOBAL_TOPIC);
  }
  function init(h){
    if (me || !validHandle(h)) return;
    me = cleanHandle(h);
    conn(GLOBAL_TOPIC);
  }

  /* ---------------- UI ---------------- */
  function escLocal(s){ return esc(String(s == null ? '' : s)); }

  function open(){
    if (!me){ openHandleSetup(); return; }
    conn(GLOBAL_TOPIC);
    modalIsOpen = true;
    startPresence();
    renderChat();
  }
  function closeModalChat(){
    modalIsOpen = false;
    stopPresence();
    closeModal();
  }
  function openHandleSetup(){
    modalIsOpen = true;
    showModal(`<h3>💬 Pick a username</h3>
      <p class="m-body">This is how other players will know you in the Town Square — the public chat for everyone playing Accra Life. 3–16 letters, numbers or underscores. Usernames aren\u2019t reserved, so keep your password to yourself, chale.</p>
      <div class="name-row">
        <input id="inp-handle" maxlength="16" placeholder="e.g. accra_ace" autocomplete="off">
        <button id="btn-handle-rand" class="btn btn-ghost" title="Suggest one">🎲</button>
      </div>
      <p id="handle-err" class="a-warn"></p>
      ${modalButtons([{ label:'Join the square', cls:'btn-gold', fn: trySetHandle }])}`);
    bindModalButtons([{ label:'Join the square', cls:'btn-gold', fn: trySetHandle }]);
    $('#btn-handle-rand').addEventListener('click', () => {
      $('#inp-handle').value = pick(NAMES) + ri(10, 99);
    });
    $('#inp-handle').addEventListener('keydown', e => { if (e.key === 'Enter') trySetHandle(); });
    $('#inp-handle').focus();
  }
  function trySetHandle(){
    const h = cleanHandle($('#inp-handle').value);
    if (!validHandle(h)){
      $('#handle-err').textContent = '3\u201316 characters — letters, numbers and underscores only.';
      return;
    }
    setHandle(h);
    startPresence();
    renderChat();
  }

  function msgHTML(m){
    const mine = isMe(m.h);
    const time = m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const chips = chipsHTML(m.id);
    return `<div class="chat-msg ${mine ? 'own' : ''}" data-mid="${escLocal(m.id)}">
      <span class="cm-handle" data-handle="${escLocal(m.h)}" title="Tap to block/unblock">@${escLocal(m.h)}</span>
      <p>${escLocal(String(m.m || '').slice(0, 200))}</p>
      <span class="cm-time">${escLocal(time)}</span>
      ${chips ? `<div class="chat-reacts">${chips}</div>` : ''}
      <div class="react-pick hidden" data-pick="${escLocal(m.id)}">${PICKS.map(e => `<button class="react-pick-btn" data-mid="${escLocal(m.id)}" data-e="${e}">${e}</button>`).join('')}</div>
    </div>`;
  }
  function appendMsg(m){
    const box = $('#chat-msgs');
    if (!box) return;
    box.insertAdjacentHTML('beforeend', msgHTML(m));
    box.scrollTop = box.scrollHeight;
  }
  function scrollBottom(){
    const box = $('#chat-msgs');
    if (box) box.scrollTop = box.scrollHeight;
  }
  function onMsgsClick(e){
    const chip = e.target.closest('.react-chip');
    if (chip){ toggleReact(chip.dataset.mid, chip.dataset.e); return; }
    const pickBtn = e.target.closest('.react-pick-btn');
    if (pickBtn){ toggleReact(pickBtn.dataset.mid, pickBtn.dataset.e); return; }
    const handle = e.target.closest('.cm-handle');
    if (handle){ toggleBlock(handle.dataset.handle); return; }
    const body = e.target.closest('.chat-msg');
    if (body){
      const pick = body.querySelector('.react-pick');
      document.querySelectorAll('.react-pick').forEach(p => { if (p !== pick) p.classList.add('hidden'); });
      if (pick) pick.classList.toggle('hidden');
    }
  }

  function renderChat(){
    modalIsOpen = true;
    const topic = currentTopic();
    const c = topic && conns[topic];
    const list = c
      ? c.msgs.filter(m => !blocked.has(String(m.h).toLowerCase())).slice(-60).map(msgHTML).join('')
      : '<p class="muted chat-empty">Pick someone to chat with 👉</p>';
    const dmKeys = Object.keys(dmTopics);
    const blockedList = blocked.size
      ? '<p class="chat-note">🚫 Blocked (tap to unblock): ' + [...blocked].map(h =>
          `<button class="chat-tab" data-unblock="${escLocal(h)}" style="display:inline-block;padding:2px 8px">@${escLocal(h)}</button>`).join(' ') + '</p>'
      : '';
    showModal(`<h3>💬 Town Square</h3>
      <div class="chat-tabs">
        <button class="chat-tab ${activeTab === 'global' ? 'sel' : ''}" data-tab="global">🌍 Global</button>
        <button class="chat-tab ${activeTab === 'dm' ? 'sel' : ''}" data-tab="dm">✉️ DM${activeDM ? ': @' + escLocal(activeDM) : ''}</button>
      </div>
      ${activeTab === 'dm' && !activeDM ? `
        <p class="m-body">Type the username of the player you want to message. If they\u2019re around, they\u2019ll get a ping.</p>
        <div class="name-row"><input id="inp-dm" maxlength="16" placeholder="@username" autocomplete="off"></div>
        <div style="margin-top:10px"><button class="btn btn-gold btn-block" id="btn-dm-open">Open chat</button></div>
        ${dmKeys.length ? `<p class="m-body" style="margin-top:12px">Recent: ${dmKeys.map(k => `<button class="chat-tab" data-dm-open="${escLocal(k)}" style="display:inline-block;padding:4px 10px">@${escLocal(k)}</button>`).join(' ')}</p>` : ''}
      ` : `
        <div id="presence-row" class="chat-presence"></div>
        <div class="chat-msgs" id="chat-msgs">${list}</div>
        <div class="chat-inputrow">
          <input id="chat-inp" maxlength="160" placeholder="${activeTab === 'global' ? 'Talk to the square… (tap a message to react, tap a name to block)' : 'Message @' + escLocal(activeDM || '') + '…'}" autocomplete="off">
          <button id="btn-chat-send" class="btn btn-gold">Send</button>
        </div>
      `}
      <p class="chat-note">🌍 Public square — be cool, no personal info. Messages fade after ~12h.${me ? ' You are <b>@' + escLocal(me) + '</b>' : ''}</p>
      ${blockedList}
      ${modalButtons([{ label:'Close', fn: closeModalChat }])}`);
    bindModalButtons([{ label:'Close', fn: closeModalChat }]);
    document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
      sfx('click');
      activeTab = b.dataset.tab;
      renderChat();
    }));
    document.querySelectorAll('[data-dm-open]').forEach(b => b.addEventListener('click', () => {
      activeTab = 'dm'; activeDM = b.dataset.dmOpen;
      conn(dmTopics[activeDM.toLowerCase()]);
      renderChat();
    }));
    document.querySelectorAll('[data-unblock]').forEach(b => b.addEventListener('click', () => toggleBlock(b.dataset.unblock)));
    const dmOpenBtn = $('#btn-dm-open');
    if (dmOpenBtn){
      dmOpenBtn.addEventListener('click', openDM);
      $('#inp-dm').addEventListener('keydown', e => { if (e.key === 'Enter') openDM(); });
      $('#inp-dm').focus();
    }
    const box = $('#chat-msgs');
    if (box) box.addEventListener('click', onMsgsClick);
    const inp = $('#chat-inp');
    if (inp){
      $('#btn-chat-send').addEventListener('click', sendCurrent);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') sendCurrent(); });
      inp.focus();
      renderPresenceRow();
      scrollBottom();
    }
  }

  function openDM(){
    const h = cleanHandle($('#inp-dm').value);
    if (!validHandle(h)){ toast('Hmm', 'That username doesn\u2019t look right — 3\u201316 letters, numbers or underscores.', 'bad'); return; }
    if (isMe(h)){ toast('Chale', 'You can\u2019t DM yourself — talk to the square instead.', ''); return; }
    if (blocked.has(h.toLowerCase())){ toast('Blocked', '@' + h.toLowerCase() + ' is on your block list. Unblock them first (see below the chat).', 'bad'); return; }
    activeTab = 'dm'; activeDM = h;
    const key = h.toLowerCase();
    if (!dmTopics[key]){
      const topic = dmTopicFor(me, h);
      dmTopics[key] = topic;
      conn(topic);
      send(GLOBAL_TOPIC, { t: 'dmping', h: me, from: me, to: h, dm: topic });
    } else {
      conn(dmTopics[key]);
    }
    renderChat();
  }
  function sendCurrent(){
    const inp = $('#chat-inp');
    const text = String(inp.value || '').trim().slice(0, 160);
    if (!text) return;
    let ok;
    if (activeTab === 'global'){
      ok = send(GLOBAL_TOPIC, { t: 'msg', h: me, m: text });
    } else {
      const topic = activeDM ? dmTopics[activeDM.toLowerCase()] : null;
      if (!topic) return;
      ok = send(topic, { t: 'dm', h: me, to: activeDM, m: text });
    }
    if (ok) inp.value = '';
    else toast('Easy chale', 'Give it a second between messages.', '');
  }

  window.Chat = { open, init, setHandle, validHandle, cleanHandle };
})();
