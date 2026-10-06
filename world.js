/* ============================================================
   Accra Life — interactive street map
   A living top-down slice of Accra: walk with WASD / arrows or
   tap to move, walk up to a building and press E to enter.
   All art is drawn in-canvas — no assets, no dependencies.
   ============================================================ */
'use strict';

(function(){
  if (!$('#world-canvas')) return; // game screen not present

  /* ---------------- world layout ---------------- */
  const WORLD_W = 1400, WORLD_H = 940;
  const SPOTS = {
    aburi:     { x: 1310, y: 80  },
    tema:      { x: 1310, y: 215 },
    legon:     { x: 830,  y: 120 },
    home:      { x: 1085, y: 165 },
    mall:      { x: 1210, y: 360 },
    office:    { x: 985,  y: 330 },
    circle:    { x: 640,  y: 350 },
    waakye:    { x: 735,  y: 475 },
    osu:       { x: 1000, y: 520 },
    labadi:    { x: 1240, y: 585 },
    makola:    { x: 560,  y: 560 },
    chopbar:   { x: 300,  y: 640 },
    jamestown: { x: 445,  y: 770 },
  };
  const BUILDING_W = 62, BUILDING_H = 48;
  const ROADS = [
    { x1: 0,    y1: 250, x2: WORLD_W, y2: 250 }, // northern artery
    { x1: 0,    y1: 450, x2: WORLD_W, y2: 450 }, // mid
    { x1: 0,    y1: 700, x2: 950,  y2: 700 }, // coastal west
    { x1: 640,  y1: 0,   x2: 640,  y2: WORLD_H },
    { x1: 1005, y1: 0,   x2: 1005, y2: WORLD_H },
    { x1: 830,  y1: 0,   x2: 830,  y2: 700 },
  ];
  const GRASS = [
    { x: 80,  y: 80,  w: 340, h: 120 }, { x: 1120, y: 470, w: 200, h: 90 },
    { x: 380, y: 330, w: 190, h: 90 },  { x: 60,   y: 780, w: 260, h: 110 },
    { x: 900, y: 640, w: 170, h: 100 }, { x: 1180, y: 120, w: 60,  h: 400 },
  ];
  const TREES = [
    { x: 200, y: 160 }, { x: 470, y: 210 }, { x: 900, y: 210 }, { x: 150, y: 560 },
    { x: 520, y: 660 }, { x: 160, y: 860 }, { x: 760, y: 610 }, { x: 1120, y: 620 },
    { x: 660, y: 800 }, { x: 940, y: 800 }, { x: 130, y: 360 }, { x: 1170, y: 850 },
  ];
  const CROSSINGS = [
    { x: 640, y: 250 }, { x: 1005, y: 450 }, { x: 830, y: 250 }, { x: 640, y: 450 },
  ];
  const LAMPS = [
    { x: 610, y: 220 }, { x: 1035, y: 220 }, { x: 610, y: 480 }, { x: 1035, y: 480 },
    { x: 300, y: 420 }, { x: 300, y: 730 }, { x: 1300, y: 480 }, { x: 860, y: 90 },
  ];
  const AWNS = {
    makola: ['#e0463f', '#f2c94c', '#2e9e5b'],
    waakye: ['#f2c94c', '#e0463f', '#f2c94c', '#2e9e5b'],
    circle: ['#2e9e5b', '#f2c94c', '#e0463f'],
    chopbar: ['#f2c94c', '#2e9e5b', '#e0463f'],
    osu: ['#7fb3ff', '#ff7fa5', '#7fb3ff', '#f2c94c'],
  };

  /* ---------------- state ---------------- */
  const canvas = $('#world-canvas');
  const ctx = canvas.getContext('2d');
  const pill = $('#enter-pill');
  let viewW = 0, viewH = 0, dpr = 1;
  let cam = { x: 0, y: 0 };
  let lastLoc = null;
  let wantEnter = null;
  let rainDrops = [];
  const player = { x: 0, y: 0, tx: null, ty: null, moving: false, facing: 1, phase: 0 };
  const keys = new Set();
  const chatBubbles = []; // live Town Square messages floating over the streets

  const skinColor = () => {
    const i = SKINS.indexOf(S.skin);
    return ['#5b3a29', '#6b4632', '#8d5a3b', '#4a2c1a', '#7a4a2e', '#95613f'][i >= 0 ? i : 1];
  };
  const fitColor = () => (FITS.find(f => f.id === S.fit) || FITS[0]).ring;

  /* traffic + pedestrians */
  const CAR_COLORS = ['#c8433c', '#3d7ea6', '#cfcfcf', '#4c8c4a', '#8a5fbf'];
  const cars = [];
  for (let i = 0; i < 7; i++){
    const road = ROADS[i % ROADS.length];
    cars.push({
      road, pos: Math.random(), dir: i % 2 ? 1 : -1,
      speed: 60 + Math.random() * 50,
      color: i === 2 ? '#f2c94c' : CAR_COLORS[i % CAR_COLORS.length], // one trotro-gold
      trotro: i === 2,
    });
  }
  const peds = [];
  for (let i = 0; i < 10; i++){
    peds.push({
      x: 100 + Math.random() * (WORLD_W - 200),
      y: 100 + Math.random() * (WORLD_H - 200),
      tx: null, ty: null, wait: Math.random() * 2,
      color: CAR_COLORS[i % CAR_COLORS.length], speed: 26 + Math.random() * 18,
    });
  }

  /* ---------------- helpers ---------------- */
  const doorOf = id => { const s = SPOTS[id]; return { x: s.x, y: s.y + BUILDING_H / 2 + 14 }; };
  function placeAt(locId){
    const d = doorOf(locId in SPOTS ? locId : 'home');
    player.x = d.x; player.y = d.y + 6;
    player.tx = null; player.ty = null; wantEnter = null;
    lastLoc = locId;
    cam.x = clamp(player.x - viewW / 2, 0, WORLD_W - viewW || 0);
    cam.y = clamp(player.y - viewH / 2, 0, WORLD_H - viewH || 0);
  }
  function sync(){
    if (!S) return;
    if (lastLoc !== S.loc) placeAt(S.loc);
  }
  function resize(){
    dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    viewW = Math.max(100, r.width); viewH = Math.max(80, r.height);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
  }
  window.addEventListener('resize', resize);

  /* ---------------- input ---------------- */
  const gameActive = () => !$('#screen-game').classList.contains('hidden');
  const modalOpen = () => !$('#modal-root').classList.contains('hidden');
  window.addEventListener('keydown', e => {
    if (!gameActive() || modalOpen()) return;
    const k = e.key.toLowerCase();
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
    if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){
      keys.add(k); player.tx = null; player.ty = null; wantEnter = null;
    }
    if ((k === 'e' || k === 'enter') && nearestSpot()) enterSpot(nearestSpot());
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  canvas.addEventListener('pointerdown', e => {
    if (!gameActive() || modalOpen() || !S) return;
    const r = canvas.getBoundingClientRect();
    const wx = (e.clientX - r.left) + cam.x;
    const wy = (e.clientY - r.top) + cam.y;
    // tapped a building?
    const hit = Object.keys(SPOTS).find(id => {
      const s = SPOTS[id];
      return Math.abs(wx - s.x) < BUILDING_W / 2 + 8 && Math.abs(wy - s.y) < BUILDING_H / 2 + 14;
    });
    if (hit){ const d = doorOf(hit); player.tx = d.x; player.ty = d.y + 6; wantEnter = hit; }
    else { player.tx = clamp(wx, 14, WORLD_W - 14); player.ty = clamp(wy, 14, WORLD_H - 14); wantEnter = null; }
  });
  pill.addEventListener('click', () => { const n = nearestSpot(); if (n) enterSpot(n); });
  function enterSpot(id){
    if (id === S.loc){ toast('You dey here', 'You\u2019re standing at ' + LOCS[id].short + ' already — the actions are below.', ''); return; }
    sfx('click'); openTravel(id);
  }
  function nearestSpot(){
    let best = null, bd = 1e9;
    for (const id of Object.keys(SPOTS)){
      const d = Math.hypot(player.x - SPOTS[id].x, player.y - SPOTS[id].y);
      if (d < bd){ bd = d; best = id; }
    }
    return bd < 74 ? best : null;
  }

  /* ---------------- update ---------------- */
  function movePlayer(dt){
    let dx = 0, dy = 0;
    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;
    const SPEED = 150;
    if (dx || dy){
      const l = Math.hypot(dx, dy);
      player.x += dx / l * SPEED * dt; player.y += dy / l * SPEED * dt;
      player.moving = true; if (dx) player.facing = dx > 0 ? 1 : -1;
      player.tx = player.ty = null;
    } else if (player.tx !== null){
      const ddx = player.tx - player.x, ddy = player.ty - player.y;
      const dist = Math.hypot(ddx, ddy);
      if (dist < 4){ player.tx = player.ty = null; player.moving = false; }
      else {
        const step = Math.min(dist, SPEED * dt);
        player.x += ddx / dist * step; player.y += ddy / dist * step;
        player.moving = true; if (Math.abs(ddx) > 2) player.facing = ddx > 0 ? 1 : -1;
      }
    } else player.moving = false;
    player.x = clamp(player.x, 14, WORLD_W - 14);
    player.y = clamp(player.y, 14, WORLD_H - 14);
    // building collision (circle vs AABB push-out)
    for (const id of Object.keys(SPOTS)){
      const s = SPOTS[id];
      const hw = BUILDING_W / 2, hh = BUILDING_H / 2;
      const cx = clamp(player.x, s.x - hw, s.x + hw);
      const cy = clamp(player.y, s.y - hh, s.y + hh);
      const ddx = player.x - cx, ddy = player.y - cy;
      const d = Math.hypot(ddx, ddy);
      if (d < 11 && d > 0.001){ player.x = cx + ddx / d * 11; player.y = cy + ddy / d * 11; }
      else if (d <= 0.001){ player.y = s.y + hh + 11; }
    }
    if (player.moving) player.phase += dt * 10;
    if (wantEnter && nearestSpot() === wantEnter){ const id = wantEnter; wantEnter = null; enterSpot(id); }
    S.px = player.x; S.py = player.y;
  }
  function updatePeds(dt){
    for (const p of peds){
      if (p.tx === null){
        p.wait -= dt;
        if (p.wait <= 0){
          const road = pickRoad();
          p.tx = road.x1 + Math.random() * (road.x2 - road.x1);
          p.ty = road.y1 + Math.random() * (road.y2 - road.y1);
        }
      } else {
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        if (d < 4){ p.tx = null; p.wait = 1 + Math.random() * 4; }
        else { p.x += dx / d * p.speed * dt; p.y += dy / d * p.speed * dt; }
      }
    }
  }
  function pickRoad(){ return ROADS[Math.floor(Math.random() * ROADS.length)]; }
  function updateCars(dt){
    for (const c of cars){
      const len = Math.hypot(c.road.x2 - c.road.x1, c.road.y2 - c.road.y1);
      c.pos += (c.speed * dt) / len * c.dir;
      if (c.pos > 1.05) c.pos = -0.05;
      if (c.pos < -0.05) c.pos = 1.05;
    }
  }
  function updateRain(dt){
    if (S.weather !== 'rain'){ rainDrops = []; return; }
    while (rainDrops.length < 90) rainDrops.push({ x: Math.random() * viewW, y: Math.random() * viewH, v: 260 + Math.random() * 160 });
    for (const d of rainDrops){ d.y += d.v * dt; d.x -= d.v * dt * 0.18; }
    rainDrops = rainDrops.filter(d => d.y < viewH + 10);
  }

  /* ---------------- drawing ---------------- */
  function roundRect(x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function drawWorld(t){
    const night = S.hour >= 19 || S.hour < 6;
    // ground
    ctx.fillStyle = '#20301f'; ctx.fillRect(0, 0, viewW, viewH);
    ctx.save(); ctx.translate(-cam.x, -cam.y);
    ctx.textAlign = 'left';
    // ground texture dots (only the visible band)
    ctx.fillStyle = 'rgba(255,255,255,.025)';
    const gx0 = Math.floor(cam.x / 60) * 60, gy0 = Math.floor(cam.y / 60) * 60;
    for (let gx = gx0; gx < cam.x + viewW + 60; gx += 60){
      for (let gy = gy0; gy < cam.y + viewH + 60; gy += 60){
        if (gx >= 0 && gy >= 0 && gx <= WORLD_W && gy <= WORLD_H) ctx.fillRect(gx, gy, 2, 2);
      }
    }
    // grass patches
    ctx.fillStyle = '#2a4028';
    for (const g of GRASS){ roundRect(g.x, g.y, g.w, g.h, 24); ctx.fill(); }
    // ocean (bottom-right coast)
    const sea = ctx.createLinearGradient(950, WORLD_H, WORLD_W, 580);
    sea.addColorStop(0, '#175d80'); sea.addColorStop(1, '#0d3a52');
    ctx.fillStyle = sea;
    ctx.beginPath();
    ctx.moveTo(950, WORLD_H); ctx.lineTo(WORLD_W, 580); ctx.lineTo(WORLD_W, WORLD_H);
    ctx.closePath(); ctx.fill();
    // shimmer flecks on the water
    ctx.fillStyle = 'rgba(255,248,231,.07)';
    for (let i = 0; i < 7; i++){
      const sx = 1000 + (i * 65) % 380 + Math.sin(t * 1.2 + i * 2) * 8;
      const sy = 940 - 0.8 * (sx - 950) + 18 + (i * 37) % 55;
      ctx.beginPath(); ctx.ellipse(sx, sy, 15, 2.2, 0, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,248,231,.5)'; ctx.lineWidth = 3;
    ctx.beginPath();
    const wob = Math.sin(t * 1.6) * 6;
    ctx.moveTo(960 + wob, WORLD_H - 10); ctx.quadraticCurveTo(1150, 640 + wob, WORLD_W - 12, 600 + wob);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,248,231,.22)';
    ctx.beginPath(); ctx.moveTo(990 - wob, WORLD_H - 2); ctx.quadraticCurveTo(1200, 680 - wob, WORLD_W - 4, 640 - wob); ctx.stroke();
    // sand strip
    ctx.strokeStyle = '#d8c48a'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(952, WORLD_H); ctx.lineTo(WORLD_W, 584); ctx.stroke();
    // roads with sidewalks
    for (const r of ROADS){
      ctx.strokeStyle = '#454b44'; ctx.lineWidth = 34;
      ctx.beginPath(); ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2); ctx.stroke();
      ctx.strokeStyle = '#333833'; ctx.lineWidth = 26;
      ctx.beginPath(); ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(242,201,76,.5)'; ctx.lineWidth = 1.6; ctx.setLineDash([14, 16]);
    for (const r of ROADS){ ctx.beginPath(); ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2); ctx.stroke(); }
    ctx.setLineDash([]);
    // zebra crossings at busy junctions
    ctx.fillStyle = 'rgba(255,248,231,.32)';
    for (const c of CROSSINGS){
      for (let i = -2; i <= 2; i++) ctx.fillRect(c.x - 13, c.y + i * 7 - 2, 26, 4);
    }
    // street lamps
    for (const L of LAMPS){
      ctx.strokeStyle = '#0d100d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(L.x, L.y - 12); ctx.stroke();
      ctx.fillStyle = night ? '#ffd166' : '#3a3f3a';
      ctx.beginPath(); ctx.arc(L.x, L.y - 13, 2.5, 0, 7); ctx.fill();
      if (night){
        const lg = ctx.createRadialGradient(L.x, L.y - 12, 2, L.x, L.y - 12, 34);
        lg.addColorStop(0, 'rgba(255,209,102,.26)'); lg.addColorStop(1, 'rgba(255,209,102,0)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(L.x, L.y - 12, 34, 0, 7); ctx.fill();
      }
    }
    // trees
    ctx.font = '20px "Segoe UI Emoji", Arial';
    for (const tr of TREES) ctx.fillText('🌴', tr.x, tr.y);
    // black star monument
    ctx.fillStyle = '#0c0f0c'; ctx.font = '22px Arial';
    ctx.fillText('★', 770, 610);
    // buildings
    const near = nearestSpot();
    for (const id of Object.keys(SPOTS)){
      const s = SPOTS[id], loc = LOCS[id];
      const isHere = id === S.loc, isNear = id === near;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      roundRect(s.x - BUILDING_W / 2 + 3, s.y - BUILDING_H / 2 + 5, BUILDING_W, BUILDING_H, 10); ctx.fill();
      const g = ctx.createLinearGradient(s.x, s.y - BUILDING_H / 2, s.x, s.y + BUILDING_H / 2);
      g.addColorStop(0, loc.g1); g.addColorStop(1, loc.g2);
      ctx.fillStyle = g;
      roundRect(s.x - BUILDING_W / 2, s.y - BUILDING_H / 2, BUILDING_W, BUILDING_H, 10); ctx.fill();
      // roof cap (fake height)
      ctx.fillStyle = 'rgba(255,255,255,.09)';
      roundRect(s.x - BUILDING_W / 2 + 4, s.y - BUILDING_H / 2 + 4, BUILDING_W - 8, 7, 4); ctx.fill();
      // windows: dark panes by day, warm glow at night
      for (let wy = 0; wy < 2; wy++){
        for (let wx = 0; wx < 3; wx++){
          const lit = night && ((wx * 3 + wy + id.length) % 3 !== 0);
          ctx.fillStyle = lit ? '#ffd166' : (night ? '#0b0f0b' : 'rgba(10,14,10,.35)');
          ctx.fillRect(s.x - 21 + wx * 15, s.y - 13 + wy * 13, 9, 7);
        }
      }
      // door
      ctx.fillStyle = 'rgba(0,0,0,.42)';
      ctx.fillRect(s.x - 5, s.y + BUILDING_H / 2 - 13, 10, 13);
      // market awnings
      if (AWNS[id]){
        const cols = AWNS[id];
        for (let i = 0; i < 6; i++){ ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(s.x - BUILDING_W / 2 + 4 + i * 9, s.y - BUILDING_H / 2 + 13, 9, 5); }
      }
      if (isHere || isNear){
        ctx.strokeStyle = isHere ? '#f2c94c' : 'rgba(242,201,76,.7)';
        ctx.lineWidth = isHere ? 2.5 : 1.5;
        ctx.setLineDash(isNear && !isHere ? [5, 4] : []);
        roundRect(s.x - BUILDING_W / 2 - 4, s.y - BUILDING_H / 2 - 4, BUILDING_W + 8, BUILDING_H + 8, 12); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.font = '20px "Segoe UI Emoji", Arial'; ctx.textAlign = 'center';
      ctx.fillText(loc.emoji, s.x, s.y + 9);
      ctx.fillStyle = night ? 'rgba(255,248,231,.85)' : 'rgba(255,248,231,.6)';
      ctx.font = '600 10.5px Inter, Arial';
      ctx.fillText(loc.short.toUpperCase(), s.x, s.y + BUILDING_H / 2 + 13);
      ctx.restore();
    }
    // cars
    for (const c of cars){
      const r = c.road, px = r.x1 + (r.x2 - r.x1) * c.pos, py = r.y1 + (r.y2 - r.y1) * c.pos;
      const ang = Math.atan2(r.y2 - r.y1, r.x2 - r.x1) + (c.dir < 0 ? Math.PI : 0);
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
      if (night){
        ctx.fillStyle = 'rgba(255,230,150,.45)';
        ctx.beginPath(); ctx.moveTo(13, -5); ctx.lineTo(36, -11); ctx.lineTo(36, 9); ctx.lineTo(13, 4); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(-13, -5, 27, 13, 4); ctx.fill();
      ctx.fillStyle = c.color; roundRect(-13, -7, 26, 13, 4); ctx.fill();
      ctx.fillStyle = 'rgba(20,30,40,.85)'; roundRect(1, -5, 7, 9, 2); ctx.fill();
      if (c.trotro){ ctx.fillStyle = '#241a02'; ctx.font = '700 7px Inter, Arial'; ctx.fillText('ACCRA', -6, 3); }
      ctx.restore();
    }
    // pedestrians
    for (const p of peds){
      const bob = p.tx !== null ? Math.abs(Math.sin(t * 7 + p.x * 0.13)) * 1.5 : 0;
      const py = p.y - bob;
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 7, 5, 2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = p.color; roundRect(p.x - 4, py - 4, 8, 10, 3); ctx.fill();
      ctx.fillStyle = '#6b4632'; ctx.beginPath(); ctx.arc(p.x, py - 7, 4, 0, 7); ctx.fill();
      if (S.weather === 'rain'){
        ctx.strokeStyle = '#7fb3ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, py - 12, 7, Math.PI, 0); ctx.stroke();
      }
    }
    // player
    drawPlayer(t);
    // Town Square chat bubbles floating over the streets
    drawChatBubbles(performance.now());
    ctx.restore();
    // weather + light overlays (screen space)
    const h = S.hour;
    if (h >= 17 && h < 19){ ctx.fillStyle = 'rgba(255,110,40,.12)'; ctx.fillRect(0, 0, viewW, viewH); }
    if (h >= 19 || h < 6){ ctx.fillStyle = 'rgba(8,12,38,.42)'; ctx.fillRect(0, 0, viewW, viewH); }
    else if (h < 8){ ctx.fillStyle = 'rgba(255,160,70,.10)'; ctx.fillRect(0, 0, viewW, viewH); }
    if (S.weather === 'harmattan'){ ctx.fillStyle = 'rgba(214,192,140,.14)'; ctx.fillRect(0, 0, viewW, viewH); }
    if (S.weather === 'rain'){
      ctx.strokeStyle = 'rgba(160,200,255,.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (const d of rainDrops){ ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 3, d.y - 12); }
      ctx.stroke();
    }
    // vignette for depth
    const vg = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.42, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.30)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, viewW, viewH);
  }
  function drawPlayer(t){
    const px = player.x, py = player.y + (player.moving ? Math.abs(Math.sin(player.phase)) * -2.5 : 0);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(player.x, player.y + 10, 8, 3, 0, 0, 7); ctx.fill();
    // body (fit colour)
    ctx.fillStyle = fitColor();
    roundRect(px - 7, py - 3, 14, 15, 5); ctx.fill();
    // head
    ctx.fillStyle = skinColor();
    ctx.beginPath(); ctx.arc(px, py - 9, 7.5, 0, 7); ctx.fill();
    // hair
    ctx.fillStyle = '#151009';
    ctx.beginPath(); ctx.arc(px, py - 11.5, 7, Math.PI, 0); ctx.fill();
    // eyes face the walking direction
    ctx.fillStyle = '#fff';
    const fx = player.facing * 2.5;
    ctx.beginPath(); ctx.arc(px - 2.5 + fx, py - 8, 1.7, 0, 7); ctx.arc(px + 3 + fx, py - 8, 1.7, 0, 7); ctx.fill();
    ctx.fillStyle = '#151009';
    ctx.beginPath(); ctx.arc(px - 2.5 + fx * 1.4, py - 8, 0.9, 0, 7); ctx.arc(px + 3 + fx * 1.4, py - 8, 0.9, 0, 7); ctx.fill();
    // name tag
    ctx.fillStyle = 'rgba(255,248,231,.9)'; ctx.font = '700 10px Inter, Arial'; ctx.textAlign = 'center';
    ctx.fillText(S.name, px, py - 22);
  }

  /* ---------------- Town Square bubbles ---------------- */
  function wrapText(text, max){
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words){
      if ((cur + ' ' + w).trim().length > max){ if (cur) lines.push(cur.trim()); cur = w; }
      else cur = (cur + ' ' + w).trim();
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }
  function chatFeed(p){
    try {
      const text = String(p.m || '').slice(0, 60);
      if (!text) return;
      const mine = typeof S !== 'undefined' && S && S.handle &&
        String(p.h || '').toLowerCase() === String(S.handle).toLowerCase();
      const b = { h: String(p.h || '').slice(0, 16), m: text, until: performance.now() + 9000 };
      if (mine) b.followPlayer = true;
      else if (peds.length) b.ped = peds[Math.floor(Math.random() * peds.length)];
      else return;
      chatBubbles.push(b);
      while (chatBubbles.length > 3) chatBubbles.shift();
    } catch(e){}
  }
  function drawChatBubbles(nowMs){
    for (let i = chatBubbles.length - 1; i >= 0; i--){
      const b = chatBubbles[i];
      if (nowMs > b.until){ chatBubbles.splice(i, 1); continue; }
      const anchor = b.ped || player;
      const bx = anchor.x, by = anchor.y - (b.ped ? 24 : 34);
      ctx.font = '700 9px Inter, Arial';
      const lines = wrapText(b.m, 17).slice(0, 2);
      const w = Math.max(52, ...lines.map(l => ctx.measureText('@' + b.h + '  ' + l).width)) + 12;
      const h = 16 + lines.length * 10;
      ctx.globalAlpha = Math.min(1, (b.until - nowMs) / 800);
      ctx.fillStyle = 'rgba(255,248,231,.95)';
      roundRect(bx - w / 2, by - h, w, h, 6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx - 3, by); ctx.lineTo(bx + 3, by); ctx.lineTo(bx, by + 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a6d1c';
      ctx.font = '700 8.5px Inter, Arial';
      ctx.fillText('@' + b.h, bx - w / 2 + 6, by - h + 10);
      ctx.fillStyle = '#10160f';
      ctx.font = '9px Inter, Arial';
      lines.forEach((l, li) => ctx.fillText(l, bx - w / 2 + 6, by - h + 21 + li * 10));
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- loop ---------------- */
  let lastT = 0;
  function step(dt){
    if (!modalOpen()) movePlayer(dt);
    updatePeds(dt); updateCars(dt); updateRain(dt);
    // camera follows
    const tx = clamp(player.x - viewW / 2, 0, Math.max(0, WORLD_W - viewW));
    const ty = clamp(player.y - viewH / 2, 0, Math.max(0, WORLD_H - viewH));
    cam.x += (tx - cam.x) * Math.min(1, dt * 6);
    cam.y += (ty - cam.y) * Math.min(1, dt * 6);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWorld(performance.now() / 1000);
    // prompt pill
    const near = nearestSpot();
    if (near && !modalOpen()){
      pill.classList.remove('hidden');
      pill.textContent = (near === S.loc ? '📍 You\u2019re at ' : '📍 Enter ') + LOCS[near].short + (near === S.loc ? '' : ' — tap or press E');
    } else pill.classList.add('hidden');
  }
  function frame(ts){
    const dt = Math.min(0.05, (ts - lastT) / 1000 || 0.016);
    lastT = ts;
    if (gameActive() && S){
      // canvas may have been hidden at boot — pick up its real size as soon as it shows
      const r = canvas.getBoundingClientRect();
      if (Math.abs(r.width - viewW) > 2 || Math.abs(r.height - viewH) > 2) resize();
      step(dt);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- boot ---------------- */
  resize();
  if (S && typeof S.px === 'number'){
    player.x = S.px; player.y = S.py; lastLoc = S.loc;
    cam.x = clamp(player.x - viewW / 2, 0, Math.max(0, WORLD_W - viewW));
    cam.y = clamp(player.y - viewH / 2, 0, Math.max(0, WORLD_H - viewH));
  } else placeAt(S ? S.loc : 'home');
  requestAnimationFrame(frame);
  // expose the hooks game.js calls (sync/placeAt), a manual step for
  // environments that suspend requestAnimationFrame (e.g. background tabs),
  // and the chat-bubble feed from the Town Square
  window.World = {
    placeAt, sync,
    step: () => { if (gameActive() && S){
      const r = canvas.getBoundingClientRect();
      if (Math.abs(r.width - viewW) > 2 || Math.abs(r.height - viewH) > 2) resize();
      step(0.016);
    } },
    chatFeed,
    state: () => ({ bubbles: chatBubbles.length, peds: peds.length }),
  };
})();
