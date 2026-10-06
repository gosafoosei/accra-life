/* ============================================================
   Accra Life — Town Square chat (player-to-player)
   Real usernames + global chat + DMs over ntfy.sh pub/sub.
   No accounts, no keys: the square is public and messages fade
   after ~12 hours. Be cool, chale.
   ============================================================ */
'use strict';

(function(){
  const NTFY = 'https://ntfy.sh';
  const GLOBAL_TOPIC = 'accra-life-square-9k2mf';
  const HISTORY_LIMIT = 80;

  let me = null;                 // my handle
  const conns = {};              // topic -> connection
  const dmTopics = {};           // handle(lower) -> topic
  let activeTab = 'global';
  let activeDM = null;
  let lastSent = 0;
  let modalIsOpen = false;

  const cleanHandle = h => String(h || '').trim().replace(/^@+/, '');
  const validHandle = h => /^[A-Za-z0-9_]{3,16}$/.test(cleanHandle(h));
  const isMe = h => me && String(h || '').toLowerCase() === me.toLowerCase();
  const dmTopicFor = (a, b) => {
    const key = [a, b].map(x => String(x).toLowerCase()).sort().join('-');
    return 'accra-life-dm-' + key + '-7f3k';
  };

  /* ---------------- connection layer ---------------- */
  function conn(topic){
    if (conns[topic]) return conns[topic];
    const c = { msgs: [], seen: new Set(), es: null };
    conns[topic] = c;
    try {
      c.es = new EventSource(`${NTFY}/${topic}/sse`);
      c.es.onmessage = e => {
        try {
          const d = JSON.parse(e.data);
          if (d.event === 'message') ingest(c, d.message);
        } catch(err){}
      };
    } catch(e){}
    // pull cached history (ntfy keeps ~12h)
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

  function ingest(c, raw){
    let p = null;
    try { p = JSON.parse(raw); } catch(e){ return; }
    if (!p || !p.t || !p.h || !p.id) return;
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

  function handleEvent(p){
    if (!me) return;
    // someone opened a DM with me
    if (p.t === 'dmping' && p.to && !isMe(p.from) && p.to.toLowerCase() === me.toLowerCase()){
      const key = String(p.from).toLowerCase();
      if (!dmTopics[key]){
        dmTopics[key] = p.dm;
        conn(p.dm);
        toast('📩 @' + p.from, 'opened a chat with you — tap 💬 to reply.', '', 7000);
      }
    }
    // a DM addressed to me
    if (p.t === 'dm' && p.to && !isMe(p.h) && p.to.toLowerCase() === me.toLowerCase()){
      toast('💬 @' + p.h, String(p.m || '').slice(0, 90), '', 6000);
    }
    // a mention of me in the square
    if (p.t === 'msg' && !isMe(p.h) && String(p.m || '').toLowerCase().includes('@' + me.toLowerCase())){
      toast('💬 Mention from @' + p.h, String(p.m || '').slice(0, 90), '', 6500);
    }
  }

  function send(topic, payload){
    const now = Date.now();
    if (now - lastSent < 1200) return false;
    lastSent = now;
    payload.id = 'm' + Math.random().toString(36).slice(2, 10);
    payload.ts = now;
    fetch(`${NTFY}/${topic}`, { method: 'POST', body: JSON.stringify(payload) })
      .catch(() => toast('No signal', 'The town square is unreachable right now.', 'bad'));
    return true;
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
  function open(){
    if (!me){ openHandleSetup(); return; }
    conn(GLOBAL_TOPIC);
    modalIsOpen = true;
    renderChat();
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
    renderChat();
  }

  function escLocal(s){ return esc(String(s == null ? '' : s)); }

  function msgHTML(m){
    const mine = isMe(m.h);
    const time = m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    return `<div class="chat-msg ${mine ? 'own' : ''}">
      <span class="cm-handle">@${escLocal(m.h)}</span>
      <p>${escLocal(String(m.m || '').slice(0, 200))}</p>
      <span class="cm-time">${escLocal(time)}</span>
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

  function renderChat(){
    modalIsOpen = true;
    const topic = currentTopic();
    const c = topic && conns[topic];
    const list = c ? c.msgs.slice(-60).map(msgHTML).join('')
      : '<p class="muted chat-empty">Pick someone to chat with 👉</p>';
    const dmKeys = Object.keys(dmTopics);
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
        <div class="chat-msgs" id="chat-msgs">${list}</div>
        <div class="chat-inputrow">
          <input id="chat-inp" maxlength="160" placeholder="${activeTab === 'global' ? 'Talk to the square…' : 'Message @' + escLocal(activeDM || '') + '…'}" autocomplete="off">
          <button id="btn-chat-send" class="btn btn-gold">Send</button>
        </div>
      `}
      <p class="chat-note">🌍 Public square — be cool, no personal info. Messages fade after ~12h.${me ? ' You are <b>@' + escLocal(me) + '</b>' : ''}</p>
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
    const dmOpenBtn = $('#btn-dm-open');
    if (dmOpenBtn){
      dmOpenBtn.addEventListener('click', openDM);
      $('#inp-dm').addEventListener('keydown', e => { if (e.key === 'Enter') openDM(); });
      $('#inp-dm').focus();
    }
    const inp = $('#chat-inp');
    if (inp){
      $('#btn-chat-send').addEventListener('click', sendCurrent);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') sendCurrent(); });
      inp.focus();
      scrollBottom();
    }
  }
  function closeModalChat(){ modalIsOpen = false; closeModal(); }

  function openDM(){
    const h = cleanHandle($('#inp-dm').value);
    if (!validHandle(h)){ toast('Hmm', 'That username doesn\u2019t look right — 3\u201316 letters, numbers or underscores.', 'bad'); return; }
    if (isMe(h)){ toast('Chale', 'You can\u2019t DM yourself — talk to the square instead.', ''); return; }
    activeTab = 'dm'; activeDM = h;
    const key = h.toLowerCase();
    if (!dmTopics[key]){
      const topic = dmTopicFor(me, h);
      dmTopics[key] = topic;
      conn(topic);
      // let them know (public ping carrying the unguessable DM topic)
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

  // re-render open chat when location/actions change nothing else — keep simple
  window.Chat = { open, init, setHandle, validHandle, cleanHandle };
})();
