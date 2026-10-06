/* ============================================================
   Accra Life — a cosy life game set in Accra, Ghana
   Vanilla JS. No dependencies. Saves to localStorage.
   ============================================================ */
'use strict';

/* ---------------- tiny helpers ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const ri = (a,b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const cedis = n => 'GH\u20B5 ' + Math.round(n).toLocaleString('en-GH');
const hourLabel = h => { h = ((h % 24) + 24) % 24; const m = h % 1 ? '30' : '00'; const hh = Math.floor(h); return `${String(hh).padStart(2,'0')}:${m}`; };
const periodEmoji = h => h < 8 ? '\u{1F305}' : h < 12 ? '\u2600\uFE0F' : h < 17 ? '\u{1F31E}' : h < 21 ? '\u{1F307}' : '\u{1F303}';

/* ---------------- static data ---------------- */
const WEEKDAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MONTH_RENT = 800;
const DAYS_PER_MONTH = 30;

const SKINS = ['\u{1F9D1}\u{1F3FF}','\u{1F9D1}\u{1F3FE}','\u{1F9D1}\u{1F3FD}','\u{1F468}\u{1F3FF}','\u{1F469}\u{1F3FE}','\u{1F468}\u{1F3FD}'];
const FITS = [
  { id:'street', label:'Streetwear', emoji:'\u{1F9E2}', ring:'#f2c94c' },
  { id:'kente',  label:'Kente drip', emoji:'\u{1F97E}', ring:'#e0463f' },
  { id:'corpo',  label:'Corporate',  emoji:'\u{1F454}', ring:'#2e9e5b' },
  { id:'beach',  label:'Beach mode', emoji:'\u{1FA73}', ring:'#7fb3ff' },
];
const NAMES = ['Kojo','Kwabena','Kwaku','Yaw','Kofi','Kwame','Kwasi','Abena','Akua','Yaa','Efua','Ama','Esi','Naa','Adjoa','Kwaku','Sena','Ebo'];

const HUSTLES = [
  { id:'student', name:'\u{1F393} The Student', desc:'Start with GH\u20B5 500 and sharp brain (+15 book sense). Legon fees eat the rest.', apply(S){ S.money = 500; S.sm += 15; } },
  { id:'office',  name:'\u{1F4BC} The Office Guy', desc:'Start with GH\u20B5 350 and a wage bump (+GH\u20B5 40 per shift) at your Airport City job.', apply(S){ S.money = 350; S.wage += 40; } },
  { id:'hustler', name:'\u{1F6F5} The Hustler', desc:'Start with GH\u20B5 200 but everyone knows you (+15 starting links, side gigs pay better).', apply(S){ S.money = 200; S.lk += 15; S.hustler = true; } },
];

const ITEMS = {
  powerbank: { emoji:'\u{1F50B}', name:'Power bank', price:250,  desc:'Keeps your phone alive when ECG strikes.' },
  generator: { emoji:'\u{1F50C}', name:'I-better-pass-my-neighbour generator', price:3500, desc:'Dumsor becomes somebody else\u2019s problem. Loud, but worth it.' },
  laptop:    { emoji:'\u{1F4BB}', name:'Laptop', price:2800, desc:'Unlock remote gigs from home (needs 30 book sense).' },
  jersey:    { emoji:'\u{1F455}', name:'Black Stars jersey', price:180, desc:'Match days hit different. Vibes bonus, instant banter.' },
};

const FRIENDS = {
  kwame: { name:'Kwame', tag:'Office guy', emoji:'\u{1F57A}', line:'Knows every happy hour on Oxford Street by heart.' },
  abena: { name:'Abena', tag:'Designer', emoji:'\u{1F487}\u{1F3FE}\u200D\u2640\uFE0F', line:'Can price any fabric in Makola by touching it.' },
  kofi:  { name:'Kofi', tag:'Legon scholar', emoji:'\u{1F913}', line:'Argues about jollof with citations.' },
  efua:  { name:'Efua', tag:'Food blogger', emoji:'\u{1F469}\u{1F3FE}\u200D\u{1F373}', line:'Ranks waakye joints the way Michelin ranks restaurants.' },
  yaw:   { name:'Yaw', tag:'Bukom boxer', emoji:'\u{1F94A}', line:'Throws hands at the gym and poses at every party.' },
};
const FRIEND_SPOTS = [
  { place:'a waakye spot in Tudu', cost:25,  emoji:'\u{1F35A}' },
  { place:'Republic Bar in Osu',   cost:70,  emoji:'\u{1F37B}' },
  { place:'Makola for ingredients',cost:35,  emoji:'\u{1F9FA}' },
  { place:'Labadi Beach',          cost:45,  emoji:'\u{1F3D6}\uFE0F' },
  { place:'a kelewele stand at Circle', cost:15, emoji:'\u{1F34C}' },
];

/* -------- locations & actions --------
   eff keys: en energy, fd food, vb vibes, lk links, sm book sense, mo money */
const LOCS = {
  home: {
    name:'Home, East Legon', short:'East Legon', emoji:'\u{1F3E0}', g1:'#1b4332', g2:'#0e2119',
    blurb:'Your chamber-and-hall with a view of somebody\u2019s generator. Rent: GH\u20B5 800 a month.',
    flavor:[
      'You water the plant you swore you\u2019d keep alive. It is thriving. Unlike your budget.',
      'The fan whirs overhead like it\u2019s also tired.',
      'Somewhere below, a neighbour\u2019s jollof smells better than anything you\u2019ve ever cooked.',
    ],
    actions:[
      { id:'sleep', label:'Sleep till morning', icon:'\u{1F634}', desc:'End the day. Recover big energy.', special:'sleep' },
      { id:'nap', label:'Power nap', icon:'\u{1F6CF}\uFE0F', hrs:2, eff:{en:26, vb:3}, desc:'Two hours. The fan is your lullaby.',
        flavor:'You nap like rent isn\u2019t real. Beautiful.' },
      { id:'cook', label:'Cook jollof', icon:'\u{1F35A}', hrs:2, cost:35, eff:{fd:58, vb:10, en:-8}, need:'groceries', needMsg:'You need groceries from Makola first.', desc:'Home jollof. Cheaper than therapy.',
        flavor:'The smoke alarm sings backup vocals. The jollof? Elite.' },
      { id:'wfh', label:'Remote gig (laptop)', icon:'\u{1F4BB}', hrs:4, eff:{en:-24, fd:-10, mo:135}, need:'laptop', needMsg:'Buy a laptop at Accra Mall (and get 30 book sense).', desc:'Emails by day, Excel by night.',
        flavor:'Zoom camera off. \u201CYour network is unstable.\u201D Accra agrees.' },
      { id:'payrent', label:'Pay rent', icon:'\u{1F3E0}\u{1F4B8}', cost:MONTH_RENT, eff:{mo:-MONTH_RENT, vb:14}, showIf:()=>S.rentDue, desc:'Silence the landlord. +14 vibes.', special:'payrent' },
    ],
  },
  makola: {
    name:'Makola Market', short:'Makola', emoji:'\u{1F9FA}', g1:'#7f4f24', g2:'#2b1a0c',
    blurb:'Tomatoes in pyramids, aunties with megaphone energy, and prices that move like the cedi.',
    flavor:[
      'An auntie calls you \u201Cmy husband.\u201D You have never felt more welcome or more conned.',
      'You haggle like your life depends on it. It kind of does.',
      'A kettle of water chases you out of the way of a head-pan. Accra traffic, market edition.',
    ],
    actions:[
      { id:'shop', label:'Buy groceries', icon:'\u{1F952}', hrs:2, cost:35, special:'groceries', desc:'Fills your kitchen for a week of jollof.' },
      { id:'hustle', label:'Hustle small deals', icon:'\u{1F4B0}', hrs:2, eff:{en:-12, lk:5, mo:0}, special:'hustle', desc:'Buy low, sell fast. Pay varies.' },
      { id:'watch', label:'People-watch', icon:'\u{1F440}', hrs:1, eff:{lk:6, vb:5}, desc:'Free theatre, better than Netflix.',
        flavor:'You watch a full argument about zucchini prices. Award-worthy.' },
      { id:'buygen', label:'Buy generator', icon:'\u{1F50C}', cost:3500, special:'buy', item:'generator', showIf:()=>!S.items.generator, desc:'End dumsor permanently. GH\u20B5 3,500.' },
    ],
  },
  osu: {
    name:'Oxford Street, Osu', short:'Osu', emoji:'\u{1F3A7}', g1:'#5b2a86', g2:'#1f1035',
    blurb:'Neon, noise, shawarma smoke and people dressed like it\u2019s a music video. Because it is.',
    flavor:[
      'A bouncer nods at you like you\u2019re somebody. Tonight, you are.',
      'The kelewele here has travelled the world and come back expensive.',
      'Somebody\u2019s playlist is carrying the whole street. Respect.',
    ],
    actions:[
      { id:'republic', label:'Drinks at Republic Bar', icon:'\u{1F37B}', hrs:2, cost:60, eff:{vb:13, lk:9, fd:5}, desc:'Local gin and long conversations.',
        flavor:'You debate Ghana\u2019s best jollof with a stranger. It gets loud. It gets beautiful.' },
      { id:'club', label:'Nightclub run', icon:'\u{1F57A}', hrs:3, cost:120, eff:{vb:24, lk:13, en:-26, fd:-10}, minHour:19, minHourMsg:'The club wakes up at 7pm.', special:'party', desc:'Dance till your feet file a complaint.' },
      { id:'network', label:'Network & mingle', icon:'\u{1F91D}', hrs:2, eff:{en:-8, lk:11, mo:0}, special:'network', desc:'Cards are dead, WhatsApp numbers are alive.' },
      { id:'photos', label:'Golden hour photos', icon:'\u{1F4F8}', hrs:1, eff:{vb:8, en:-3}, desc:'Content for the \u2019gram.',
        flavor:'Twelve photos. Eleven are crooked. The twelfth one? Wallpaper.' },
    ],
  },
  labadi: {
    name:'Labadi Beach', short:'Labadi', emoji:'\u{1F3D6}\uFE0F', g1:'#14607a', g2:'#0a2e3b',
    blurb:'The waves don\u2019t care about your deadlines. Reggae, horses, khebab smoke.',
    flavor:[
      'A horse trots past like it pays rent here. Maybe it does.',
      'The waves come in, the wahala goes out. Balance.',
      'Sunset turns the whole Gulf of Guinea gold. No filter needed.',
    ],
    actions:[
      { id:'swim', label:'Swim & float', icon:'\u{1F30A}', hrs:2, eff:{en:10, vb:13}, desc:'Salt water fixes most things.',
        flavor:'A wave tests your swimming certificate from holiday lessons. You survive, barely, gloriously.' },
      { id:'beachwalk', label:'Walk the shoreline', icon:'\u{1F463}', hrs:1, eff:{vb:9, en:-2}, desc:'Think about life, step in one wave, jump back.' },
      { id:'beachparty', label:'Beach party', icon:'\u{1FAE6}', hrs:3, cost:50, eff:{vb:19, lk:16, en:-16, fd:-5}, weekendsOnly:true, weekendsMsg:'The real party is on weekends.', special:'party', desc:'Saturday is for the beach. Rules of Accra.' },
    ],
  },
  waakye: {
    name:'Waakye Joint, Tudu', short:'Tudu', emoji:'\u{1F35A}', g1:'#8a4b2a', g2:'#33180b',
    blurb:'Rice and beans, spaghetti, gari, shito, and an auntie who asks \u201Csmall or big?\u201D — knowing your answer.',
    flavor:[
      'Auntie adds one extra piece of wele. She knows. She always knew.',
      'The shito stares at you. You accept the challenge.',
      '\u201CLast boy!\u201D someone shouts. You clutch your waakye like a trophy.',
    ],
    actions:[
      { id:'small', label:'Waakye (small)', icon:'\u{1F35B}', hrs:1, cost:12, eff:{fd:42, vb:5}, special:'waakye', desc:'Quick, cheap, spiritual.' },
      { id:'big', label:'Waakye deluxe', icon:'\u{1F35B}', hrs:1, cost:25, eff:{fd:72, vb:9}, special:'waakye', desc:'Gari, spaghetti, egg, fish. The full ceremony.' },
      { id:'sobolo', label:'Sobolo chaser', icon:'\u{1F9CB}', hrs:1, cost:8, eff:{fd:8, en:6, vb:3}, desc:'Deep red, ice cold, slightly violent ginger.' },
    ],
  },
  chopbar: {
    name:'Chop Bar, Dansoman', short:'Chop bar', emoji:'\u{1F41F}', g1:'#5f7a1f', g2:'#242d0c',
    blurb:'Banku, grilled tilapia and pepper ground on a stone like it\u2019s a ritual. Because it is.',
    flavor:[
      'The tilapia arrives with its own opinions. You win the argument.',
      'Ground pepper, carved stone, strong hands. Some things don\u2019t change.',
      'The league match replays on a TV held together by tape and hope.',
    ],
    actions:[
      { id:'banku', label:'Banku & tilapia', icon:'\u{1F41F}', hrs:2, cost:60, eff:{fd:88, vb:13}, desc:'The national dish of good decisions.' },
      { id:'fufu', label:'Fufu & light soup', icon:'\u{1F35C}', hrs:1, cost:45, eff:{fd:66, vb:9}, desc:'Swallow duty, executed with pride.' },
      { id:'league', label:'Watch the league', icon:'\u{26BD}', hrs:2, cost:15, eff:{vb:11, lk:7, fd:4}, desc:'Shout at a small TV with fifty strangers.',
        flavor:'The referee is corrupt, according to everyone here, in perfect unison.' },
    ],
  },
  circle: {
    name:'Kwame Nkrumah Circle', short:'Circle', emoji:'\u{1F68C}', g1:'#7a5b12', g2:'#2e2105',
    blurb:'Trotros, hawkers, phone accessories and pure adrenaline. Accra\u2019s beating heart.',
    flavor:[
      'Every trotro horn is playing a different song. Together? A symphony.',
      'You dodge two hawkers, one wheelbarrow and a dream.',
      'The mate slaps the bus twice. \u201CMove! Move!\u201D Accra obeys.',
    ],
    actions:[
      { id:'kelewele', label:'Night kelewele', icon:'\u{1F34C}', hrs:1, cost:10, eff:{fd:24, vb:7}, desc:'Spicy plantain, ginger fire, worth it.', special:'kelewele' },
      { id:'browse', label:'Browse phone accessories', icon:'\u{1F4F1}', hrs:1, eff:{vb:5, sm:3}, desc:'Screen guards, chargers, mysterious \u201Coriginal\u201D AirPods.' },
      { id:'buypb', label:'Buy power bank', icon:'\u{1F50B}', cost:250, special:'buy', item:'powerbank', showIf:()=>!S.items.powerbank, desc:'Insurance against ECG. GH\u20B5 250.' },
      { id:'carry', label:'Carry load for cash', icon:'\u{1F4AA}\u{1F3FE}', hrs:1, eff:{en:-16, fd:-8, mo:22}, desc:'Honest sweat. GH\u20B5 20\u201330 a run.',
        flavor:'You carry a basin of second-hand clothes like you were born for it.' },
    ],
  },
  office: {
    name:'Airport City Office', short:'Airport City', emoji:'\u{1F3E2}', g1:'#33506b', g2:'#101d29',
    blurb:'Glass towers, cold AC, coffee that costs more than your first trotro fare.',
    flavor:[
      'The AC is colder than your ex\u2019s heart. You love it here.',
      'The elevator smell of ambition and mouthwash.',
      'You nod at the security man. He nods back. Workplace friendship, elite tier.',
    ],
    actions:[
      { id:'work', label:'Work a shift (8h)', icon:'\u{1F4BC}', hrs:8, eff:{en:-34, fd:-16, lk:3}, special:'work', weekdaysOnly:true, weekdaysMsg:'The office is locked on weekends. Even the AC rests.', desc:'Collect your wage. Climb the ladder.' },
      { id:'coffee', label:'Fancy coffee', icon:'\u{2615}', hrs:1, cost:18, eff:{en:10, vb:4}, desc:'A little cup of imported confidence.' },
    ],
  },
  legon: {
    name:'University of Ghana, Legon', short:'Legon', emoji:'\u{1F393}', g1:'#2c5f2d', g2:'#12291a',
    blurb:'Balm in the library, debates in the courtyard, and roads lined with royal palms.',
    flavor:[
      'A lecturer walks past mid-argument with nobody. Academia.',
      'The library is full. The Wi-Fi is not. Choose your struggle.',
      'You read one page and people-watch for forty minutes. Balance.',
    ],
    actions:[
      { id:'study', label:'Study at Balme Library', icon:'\u{1F4DA}', hrs:3, eff:{en:-15, sm:9}, desc:'Book sense up. Brain gains.' },
      { id:'lecture', label:'Public lecture', icon:'\u{1F3A4}', hrs:2, eff:{en:-8, sm:6, vb:4}, desc:'Free knowledge and free air-conditioning.' },
      { id:'pitch', label:'Football at the pitch', icon:'\u{26BD}', hrs:2, eff:{en:-10, vb:11, lk:7}, desc:'One goal, zero skill, maximum joy.' },
    ],
  },
  mall: {
    name:'Accra Mall', short:'Accra Mall', emoji:'\u{1F6D2}', g1:'#4a4a58', g2:'#191921',
    blurb:'Where Accra goes to breathe cold air and browse prices it will never pay.',
    flavor:[
      'You test sofas you will never buy. Comfort is free.',
      'The food court smells like every country at once.',
      'Window-shopping is cardio here. You\u2019re sweating from restraint.',
    ],
    actions:[
      { id:'buylap', label:'Buy laptop', icon:'\u{1F4BB}', cost:2800, special:'buy', item:'laptop', showIf:()=>!S.items.laptop, desc:'Unlock remote gigs. GH\u20B5 2,800.' },
      { id:'buyjersey', label:'Buy Black Stars jersey', icon:'\u{1F455}', cost:180, special:'buy', item:'jersey', showIf:()=>!S.items.jersey, desc:'Match-day vibes multiplier. GH\u20B5 180.' },
      { id:'foodcourt', label:'Food court feast', icon:'\u{1F355}', hrs:1, cost:80, eff:{fd:62, vb:9}, desc:'Chicken, chips, and air-conditioning.' },
      { id:'window', label:'Window shop', icon:'\u{1F6CD}\uFE0F', hrs:1, eff:{vb:6, en:-3}, desc:'Free. Mostly.' },
    ],
  },
  jamestown: {
    name:'Jamestown & Bukom', short:'Jamestown', emoji:'\u{1F3A8}', g1:'#8a3b2a', g2:'#2f130c',
    blurb:'Murals, the old lighthouse, boxing gyms in Bukom, and history in every wall.',
    flavor:[
      'The lighthouse has watched this sea for a century. It has stories.',
      'A kid throws combinations at a worn bag in Bukom. Future champion.',
      'The murals swallow you whole. Every wall is a gallery.',
    ],
    actions:[
      { id:'light', label:'Lighthouse photo walk', icon:'\u{1F4F8}', hrs:2, eff:{vb:11, en:-5, sm:2}, desc:'History, colour, ocean air.' },
      { id:'boxing', label:'Train at Bukom gym', icon:'\u{1F94A}', hrs:2, eff:{en:-20, vb:11}, special:'gym', desc:'Sweat like a champion. Body like one, eventually.' },
      { id:'murals', label:'Chase the murals', icon:'\u{1F5BC}\uFE0F', hrs:1, eff:{vb:9, sm:3}, desc:'Chale Wote energy, all year round.' },
    ],
  },
};

const TRANSPORT = [
  { id:'trotro', label:'Trotro', emoji:'\u{1F690}', cost:6,  hrs:1, en:-5, note:'Cheap, loud, occasionally spiritual.' },
  { id:'keke',   label:'Keke',   emoji:'\u{1F6F5}', cost:12, hrs:1, en:-3, vb:4, note:'Bumpy but fun. Wind in your face.' },
  { id:'bolt',   label:'Bolt',   emoji:'\u{1F697}', cost:40, hrs:1, en:-1, note:'AC, silence, dignity.' },
  { id:'walk',   label:'Walk',   emoji:'\u{1F6B6}\u{1F3FE}', cost:0, hrs:2, en:-10, fd:-4, note:'Free. Your knees will invoice you later.' },
];

/* -------- random events -------- */
const EVENTS = [
  { id:'dumsor', w:3, when:'night', run(){
      S.counters.dumsor++;
      if (S.items.generator){ sfx('good'); return 'Dumsor strikes the whole street — but your generator hums on. Neighbours side-eye you respectfully.'; }
      if (S.items.powerbank){ S.vb = clamp(S.vb - 3, 0, 100); return 'ECG takes the lights. You plug into your power bank like a pro. Minimal wahala.'; }
      S.vb = clamp(S.vb - 11, 0, 100); S.en = clamp(S.en - 8, 0, 100);
      sfx('bad'); return 'Ei, ECG! The lights blink out mid-everything. You fan yourself with a poster and renegotiate your life choices.';
  }},
  { id:'goslow', w:4, when:'travel', run(){
      S.en = clamp(S.en - 6, 0, 100); S.hour = Math.min(24, S.hour + 1);
      return 'Go slow! The traffic ahead is parked standing. You move one metre per ten minutes and question all your decisions.';
  }},
  { id:'rain', w:2, when:'any', run(){
      S.vb = clamp(S.vb - 5, 0, 100); S.en = clamp(S.en - 5, 0, 100);
      return 'The rains open without warning. One gutter becomes a river, and your shoes become a sacrifice.';
  }},
  { id:'scam', w:2, when:'any', choice:{
      title:'\u26A0\uFE0F MoMo promo?',
      body:'A text says you\u2019ve won a MoMo promo. They just need GH\u20B5 100 to \u201Crelease\u201D your GH\u20B5 1,000. Something smells like plantain that\u2019s stayed too long\u2026',
      options:[
        { label:'Send the GH\u20B5 100', run(){
            S.money -= 100;
            if (Math.random() < 0.3){ S.money += 300; S.vb = clamp(S.vb + 10, 0, 100); return 'Ei?! It was REAL. GH\u20B5 300 lands in your MoMo. You walk like a champion all day.'; }
            S.vb = clamp(S.vb - 12, 0, 100); S.sm = clamp(S.sm + 4, 0, 100);
            return 'Gone. Blocked. Silence. The promo was a scam — school fees paid to the street. At least you learned.';
        }},
        { label:'Delete. Block. Report.', run(){
            S.sm = clamp(S.sm + 5, 0, 100); S.vb = clamp(S.vb + 4, 0, 100);
            return '\u201CIf it\u2019s too sweet, e go sour.\u201D You smell the scam from space. Book sense +5.';
        }},
      ],
  }},
  { id:'mate', w:2, when:'travel', choice:{
      title:'\u{1F690} Mate wahala',
      body:'The trotro mate insists your fare was GH\u20B5 5 more. His face says confidence; your pocket says doubt.',
      options:[
        { label:'Just pay the extra', run(){ S.money -= 5; return 'You pay the GH\u20B5 5 peace-keeping fee. The mate nods like a general.'; }},
        { label:'Argue your case', run(){
            if (Math.random() < 0.55){ S.sm = clamp(S.sm + 3, 0, 100); return 'You quote the exact fare with receipts energy. The whole bus applauds internally. You won.'; }
            S.vb = clamp(S.vb - 5, 0, 100); return 'You argue passionately. You still pay. The bus claps for the mate. Losses on both fronts.';
        }},
      ],
  }},
  { id:'auntie', w:2, when:'night', choice:{
      title:'\u{1F34C} Kelewele auntie',
      body:'A kelewele auntie appears at exactly the moment you\u2019re weakest. The aroma is a legal weapon.',
      options:[
        { label:'Buy some (GH\u20B5 10)', run(){ S.money -= 10; S.fd = clamp(S.fd + 20, 0, 100); S.vb = clamp(S.vb + 6, 0, 100); return 'Ginger, pepper, perfection. The night is saved.'; }},
        { label:'Resist (somehow)', run(){ return 'You walk past like a warrior. You think about it for the rest of the week.'; }},
      ],
  }},
  { id:'found', w:2, when:'any', run(){
      const m = ri(10, 40); S.money += m;
      sfx('good'); return `You spot crumpled notes on the pavement — ${cedis(m)}. You look around once (for form) and pocket it. Upgrades today.`;
  }},
  { id:'jollof', w:2, when:'any', run(){
      S.vb = clamp(S.vb + 9, 0, 100); S.counters.jollof++;
      return 'A visitor says Nigerian jollof might be better. The table goes silent. You defend the motherland with dates, places and receipts. Victory.';
  }},
  { id:'friendcall', w:3, when:'day', choice:{
      title:'\u{1F4F2} A friend calls',
      body(){ const f = this._f || pick(Object.keys(FRIENDS)); return `It's ${FRIENDS[f].name}. \u201CChale, come out small — things dey happen!\u201D You can hear the good time through the phone.`; },
      setup(){ this._f = pick(Object.keys(FRIENDS)); },
      options:[
        { label:'Go out (GH\u20B5 40, +2h)', run(){
            S.money -= 40; S.vb = clamp(S.vb + 13, 0, 100); S.lk = clamp(S.lk + 9, 0, 100);
            S.en = clamp(S.en - 12, 0, 100); S.hour = Math.min(24, S.hour + 2);
            S.friends[this._f] = clamp((S.friends[this._f] || 15) + 10, 0, 100);
            return `You link up and it turns into a whole movie. ${FRIENDS[this._f].name} is officially your people now.`;
        }},
        { label:'Say you\u2019re busy', run(){
            S.friends[this._f] = clamp((S.friends[this._f] || 15) - 6, 0, 100);
            return `\u201CNext time, chale.\u201D ${FRIENDS[this._f].name} says it\u2019s fine. The voice note afterwards says otherwise.`;
        }},
      ],
  }},
  { id:'ecg', w:1, when:'day', run(){
      const b = ri(40, 90);
      if (S.money < b){ S.vb = clamp(S.vb - 6, 0, 100); return `ECG prepaid units run out. The bill is ${cedis(b)} and your MoMo says another day. Candlelight evening, unintentionally romantic.`; }
      S.money -= b; return `ECG prepaid units finish. You top up ${cedis(b)} with the sigh of every Ghanaian adult.`;
  }},
  { id:'matchday', w:2, when:'day', run(){
      if (S.items.jersey){ S.vb = clamp(S.vb + 13, 0, 100); sfx('good'); return 'Black Stars match day! Your jersey sparks a whole street conversation. Ghana wins your heart, if not the game.'; }
      S.vb = clamp(S.vb + 6, 0, 100); return 'Black Stars match day. Every TV in Accra is loud. You watch through a shop window, screaming quietly.';
  }},
  { id:'celeb', w:1, when:'travel', run(){
      S.vb = clamp(S.vb + 8, 0, 100); return 'A convoy of gleaming cars rolls past. You\u2019d swear you saw Sarkodie\u2019s. Either way, you tell the story with confidence.';
  }},
  { id:'sunrise', w:1, when:'dawn', run(){
      S.vb = clamp(S.vb + 6, 0, 100); return 'Harmattan gold morning. Accra looks brand new for eleven minutes. You breathe it in.';
  }},
  { id:'sermon', w:2, when:'travel', run(){
      S.sm = clamp(S.sm + 2, 0, 100);
      return 'A passenger preaches the entire trotro journey, complete with speaker and testimony time. You arrive ten minutes wiser and slightly deaf.';
  }},
  { id:'taps', w:2, when:'day', choice:{
      title:'\u{1F6B0} Taps off',
      body:'Ghana Water has taken the flow again. The taps sigh empty. Auntie down the road is selling sachet water bags — or it\u2019s the borehole trek for you.',
      options:[
        { label:'Buy water (GH\u20B5 10)', run(){
            S.money = Math.max(0, S.money - 10); S.fd = clamp(S.fd + 10, 0, 100); S.en = clamp(S.en + 4, 0, 100);
            return 'Cold, clean, sorted. The kettle is full and the universe is forgiven — for now.';
        }},
        { label:'Trek to the borehole', run(){
            S.en = clamp(S.en - 7, 0, 100);
            return 'You haul water home like a gym subscription you never signed up for. Arms: burning. Bucket: full. Character: built.';
        }},
      ],
  }},
  { id:'wedding', w:2, when:'day', choice:{
      title:'\u{1F48D} Wedding invitation',
      body:'A cousin is getting married. There will be jollof, chicken, aso-ebi glamour, and every auntie analysing your life choices at high resolution. Attendance comes with a gift.',
      options:[
        { label:'Attend (GH\u20B5 80 gift)', run(){
            S.money = Math.max(0, S.money - 80);
            S.vb = clamp(S.vb + 16, 0, 100); S.lk = clamp(S.lk + 11, 0, 100); S.fd = clamp(S.fd + 30, 0, 100);
            return 'You eat like the in-laws are watching and dance like they are not. The anointing of the jollof rests upon you.';
        }},
        { label:'Send apologies', run(){
            S.vb = clamp(S.vb - 3, 0, 100);
            return 'You send a kind voice note and a promise. The aunties have quietly added your name to a list. It is not a good list.';
        }},
      ],
  }},
  { id:'igsale', w:2, when:'day', run(){
      if (S.lk >= 40){
        const g = ri(60, 160); earn(g); sfx('good');
        return `Your WhatsApp status advert actually converts — ${cedis(g)} lands via MoMo. Links are currency, chale.`;
      }
      return 'You post your first ever advert. Your three followers like it. One of them is your mum. Growth takes time.';
  }},
  { id:'snatch', w:1, when:'travel', choice:{
      title:'\u{1F4F1} Phone wahala',
      body:'At Circle, a hand slides toward your pocket — phone snatcher! Your heart does banku. In one second you must choose your entire personality.',
      options:[
        { label:'Chase am!', run(){
            if (Math.random() < 0.6){
              S.vb = clamp(S.vb + 8, 0, 100);
              return 'You sprint like the Black Stars scouts are watching. The whole street joins the chase and the snatcher drops everything. Neighbourhood hero for one glorious day.';
            }
            const loss = Math.min(S.money, 60); S.money -= loss; S.en = clamp(S.en - 10, 0, 100);
            return loss ? `He was faster. You lose ${cedis(loss)} and a little dignity. The street consoles you with stories of worse days.` : 'He was faster — but your pockets were empty. The ultimate anti-theft device: being broke.';
        }},
        { label:'Let it go', run(){
            const loss = Math.min(S.money, 60); S.money -= loss; S.sm = clamp(S.sm + 3, 0, 100);
            return loss ? `You hand over ${cedis(loss)} and choose peace. Your insurance policy is now wisdom.` : 'You calmly show empty pockets. Even the snatcher looks disappointed.';
        }},
      ],
  }},
  { id:'broke', w:2, when:'day', run(){
      if (S.money > 60) return null;
      S.fd = clamp(S.fd + 35, 0, 100); S.vb = clamp(S.vb + 10, 0, 100);
      return 'The waakye auntie studies your face for two seconds and quietly adds extra wele. \u201CChale, manage small.\u201D The community provides.';
  }},
];

/* -------- achievements -------- */
const ACHS = [
  { id:'akwaaba', icon:'\u{1F1EC}\u{1F1ED}', name:'Akwaaba!', desc:'Start your Accra story.', check:S => true },
  { id:'weekone', icon:'\u{1F4C5}', name:'Week One Done', desc:'Survive your first 7 days.', check:S => S.day >= 8 },
  { id:'waakye', icon:'\u{1F35A}', name:'Waakye Ambassador', desc:'Eat waakye 10 times.', check:S => S.counters.waakye >= 10 },
  { id:'detty', icon:'\u{1F389}', name:'Detty Vibes', desc:'5 nights out / parties.', check:S => S.counters.parties >= 5 },
  { id:'dumsor', icon:'\u{1F50C}', name:'Dumsor Season', desc:'Live through 5 dumsor moments.', check:S => S.counters.dumsor >= 5 },
  { id:'money', icon:'\u{1F4B0}', name:'Money Good', desc:'Hold GH\u20B5 5,000 at once.', check:S => S.money >= 5000 },
  { id:'people', icon:'\u{1F465}', name:'People Person', desc:'Get any friendship to 80+.', check:S => Object.values(S.friends).some(v => v >= 80) },
  { id:'book', icon:'\u{1F4DA}', name:'Book Long', desc:'Reach 80 book sense.', check:S => S.sm >= 80 },
  { id:'boss', icon:'\u{1F4BC}', name:'Boss Moves', desc:'Work 10 shifts.', check:S => S.counters.shifts >= 10 },
  { id:'rent', icon:'\u{1F3E0}', name:'Landlord\u2019s Delight', desc:'Pay rent in full, twice.', check:S => S.counters.rentPaid >= 2 },
  { id:'beach', icon:'\u{1F3D6}\uFE0F', name:'Beach Regular', desc:'5 trips to the beach.', check:S => S.counters.beach >= 5 },
  { id:'gym', icon:'\u{1F94A}', name:'Bukom Blood', desc:'Train 5 times in Bukom.', check:S => S.counters.gym >= 5 },
  { id:'gen', icon:'\u{1F50C}', name:'Generator Mafia', desc:'Buy the generator.', check:S => S.items.generator },
  { id:'jollof', icon:'\u{1F35A}', name:'Jollof Wars Veteran', desc:'Win 3 jollof debates.', check:S => S.counters.jollof >= 3 },
  { id:'dettyszn', icon:'\u{1F389}', name:'Detty Season', desc:'Party 3 times during Detty Season.', check:S => (S.counters.dettyParties || 0) >= 3 },
  { id:'magnate', icon:'\u{1F4B0}', name:'MoMo Magnate', desc:'Hold GH\u20B5 10,000 at once.', check:S => S.money >= 10000 },
  { id:'fullhouse', icon:'\u{1F392}', name:'Full House', desc:'Own all four big items.', check:S => S.items.powerbank && S.items.generator && S.items.laptop && S.items.jersey },
  { id:'people2', icon:'\u{1F91D}', name:'Man of the People', desc:'All five friendships at 50+.', check:S => Object.values(S.friends).every(v => v >= 50) },
  { id:'prof', icon:'\u{1F393}', name:'Professor', desc:'Max out your book sense (100).', check:S => S.sm >= 100 },
];

/* ---------------- state ---------------- */
const SAVE_KEY = 'accraLifeSaveV1';
let soundOn = true;
try { soundOn = localStorage.getItem('accraLifeSound') !== '0'; } catch(e){}
let S = null;
let createChoice = { skin:0, fit:0, hustle:0 };

function freshState(name, skinEmoji, fit, hustleId){
  const s = {
    v:1, name, skin:skinEmoji, fit:fit.id,
    day:1, hour:7, loc:'home',
    money:200, wage:130, en:90, fd:70, vb:65, lk:40, sm:10,
    groceries:false, hustler:false,
    items:{ powerbank:false, generator:false, laptop:false, jersey:false },
    friends:{ kwame:15, abena:15, kofi:15, efua:15, yaw:15 },
    rentDue:false, rentLateDays:0, startedMonth:1, snapEarned:0,
    counters:{ waakye:0, parties:0, dumsor:0, beach:0, shifts:0, hangs:0, jollof:0, gym:0, rentPaid:0, earned:0, spent:0, dettyParties:0 },
    ach:{}, log:[],
  };
  const h = HUSTLES.find(x => x.id === hustleId); if (h) h.apply(s);
  return s;
}
function save(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch(e){} }
function loadSave(){ try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch(e){ return null; } }
function clearSave(){ try { localStorage.removeItem(SAVE_KEY); } catch(e){} }

const monthOf = () => Math.floor((S.day - 1) / DAYS_PER_MONTH) + 1;
const dayOfMonth = () => ((S.day - 1) % DAYS_PER_MONTH) + 1;
const weekdayIdx = () => (S.day - 1) % 7;
const isWeekend = () => weekdayIdx() >= 5;
const isDetty = () => monthOf() % 6 === 0;

/* ---------------- audio (tiny, kind) ---------------- */
let AC = null;
function sfx(kind){
  if (!soundOn) return;
  try{
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const o = AC.createOscillator(), g = AC.createGain();
    o.connect(g); g.connect(AC.destination);
    const now = AC.currentTime;
    const seqs = { good:[523, 784], bad:[330, 220], click:[440], ach:[523,659,784,1047] };
    const seq = seqs[kind] || seqs.click;
    o.type = 'sine';
    seq.forEach((f, i) => o.frequency.setValueAtTime(f, now + i * 0.09));
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09 * seq.length + 0.1);
    o.start(now); o.stop(now + 0.09 * seq.length + 0.12);
  }catch(e){}
}

/* ---------------- logging & toasts ---------------- */
function logMsg(text, kind){
  S.log.unshift({ d:S.day, h:S.hour, t:text, k:kind || '' });
  if (S.log.length > 70) S.log.length = 70;
}
function toast(title, body, kind, ms){
  const t = document.createElement('div');
  t.className = 'toast ' + (kind || '');
  const b = document.createElement('b'); b.textContent = title;
  const p = document.createElement('p'); p.style.cssText = 'margin:0'; p.textContent = body;
  t.appendChild(b); t.appendChild(p);
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, ms || 4600);
}
function confetti(){
  const root = $('#confetti-root');
  const bits = ['\u2B50','\u2728','\u{1F389}','\u{1F49B}','\u{1F3F4}\u{1F3F4}\u{1F3ED}\u{1F3F4}','\u{1F35A}','\u{1F334}'];
  for (let i = 0; i < 26; i++){
    const s = document.createElement('span');
    s.className = 'confetti-bit';
    s.textContent = pick(bits);
    s.style.left = ri(2, 98) + '%';
    s.style.animationDuration = (ri(14, 30) / 10) + 's';
    s.style.animationDelay = (ri(0, 5) / 10) + 's';
    root.appendChild(s);
    setTimeout(() => s.remove(), 3800);
  }
}

/* ---------------- modal ---------------- */
function showModal(html){ $('#modal-card').innerHTML = html; $('#modal-root').classList.remove('hidden'); }
function closeModal(){ $('#modal-root').classList.add('hidden'); }
function modalButtons(list){
  return `<div class="m-btns">${list.map((b, i) =>
    `<button class="btn ${b.cls || 'btn-ghost'}" data-mb="${i}">${b.label}</button>`).join('')}</div>`;
}
function bindModalButtons(list){
  document.querySelectorAll('[data-mb]').forEach(btn => {
    btn.addEventListener('click', () => { sfx('click'); list[+btn.dataset.mb].fn(); });
  });
}

/* ---------------- screens ---------------- */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  $('#screen-' + id).classList.remove('hidden');
  window.scrollTo(0, 0);
}

/* ---------------- time engine ---------------- */
function advanceHours(hrs){
  for (let i = 0; i < hrs; i++){
    // awake-time decay
    S.en = clamp(S.en - 1, 0, 100);
    S.fd = clamp(S.fd - 1.6, 0, 100);
    if (S.fd <= 0) S.vb = clamp(S.vb - 1.5, 0, 100);
    S.hour += 1;
    if (S.hour >= 24){ crashToSleep(); return; }
  }
}
function crashToSleep(){
  S.day += 1; S.hour = 6;
  S.en = clamp(S.en + 34, 0, 100); S.vb = clamp(S.vb - 8, 0, 100); S.fd = clamp(S.fd - 26, 0, 100);
  logMsg('You crash where you stand and sleep like a paused trotro. New day.', 'bad');
  toast('Day ' + S.day, 'You crashed out last night. Sleep quality: questionable.', 'bad');
  newDayRoll();
}
function fullSleep(){
  S.day += 1; S.hour = 6;
  S.en = clamp(S.en + 88, 0, 100); S.fd = clamp(S.fd - 26, 0, 100); S.vb = clamp(S.vb + 8, 0, 100);
  newDayRoll();
}
function newDayRoll(){
  if (dayOfMonth() === 1 && monthOf() > 1){
    const diff = S.counters.earned - (S.snapEarned || 0);
    if (isDetty()){
      toast('\u{1F389} Detty Season!', `Month ${monthOf()} — the whole city turns up. Party vibes hit harder, Accra never sleeps.`, 'ach', 7000);
      logMsg('DETTY SEASON! The streets glow with party lights and every DJ in Accra has a residency. Pace yourself, champion.', 'gold');
    } else {
      toast('Month ' + monthOf(), `New month, new hustle. You earned ${cedis(diff)} last month.`, 'gold', 5500);
    }
    S.snapEarned = S.counters.earned;
  }
  // rent cycle
  if (dayOfMonth() === 1 && monthOf() > S.startedMonth){
    S.rentDue = true; S.rentLateDays = 0;
    toast('\u{1F3E0} Month ' + monthOf(), 'Rent day! GH\u20B5 800 due. Your landlord\u2019s patience is renewable but not unlimited.', 'bad', 6000);
    logMsg(`Month ${monthOf()} begins. Rent of GH\u20B5 800 is due.`, 'bad');
  }
  if (S.rentDue && dayOfMonth() > 1) S.rentLateDays = dayOfMonth() - 1;
  if (S.rentDue && S.rentLateDays >= 10){ save(); gameOver(); return; }
  // dawn flavour
  if (S.hour <= 7) maybeEvent('dawn');
  // morning friend text
  if (Math.random() < 0.3){
    const f = pick(Object.keys(FRIENDS));
    S.friends[f] = clamp(S.friends[f] + 2, 0, 100);
    logMsg(`${FRIENDS[f].name} sends a morning voice note: \u201CMake we link this week, chale.\u201D`, 'good');
  }
  save(); checkAchievements(); render();
}
function maybeEvent(when){
  const pool = EVENTS.filter(e => !when || e.when === when);
  if (!pool.length) return null;
  const total = pool.reduce((a, e) => a + e.w, 0);
  let r = Math.random() * total;
  for (const e of pool){ r -= e.w; if (r <= 0) return e; }
  return pool[0];
}
function fireEvent(ev, ctx){
  if (!ev) return;
  if (ev.choice){
    const c = ev.choice;
    if (c.setup) c.setup.call(c);
    const body = typeof c.body === 'function' ? c.body.call(c) : c.body;
    const opts = c.options.map(o => ({ label:o.label, fn(){
      const msg = o.run();
      logMsg(msg, 'gold'); toast('Story', msg, 'gold');
      closeModal(); save(); checkAchievements(); render();
    }}));
    showModal(`<h3>${c.title}</h3><p class="m-body">${esc(body)}</p>${modalButtons(opts)}`);
    bindModalButtons(opts);
    return;
  }
  const msg = ev.run();
  if (msg){ logMsg(msg, ctx === 'travel' ? 'gold' : ''); toast('Around Accra', msg, ''); }
}

/* ---------------- money helpers ---------------- */
function earn(n){ S.money += n; S.counters.earned += n; }
function spend(n){ S.money -= n; S.counters.spent += n; }

/* ---------------- actions ---------------- */
function doAction(locId, act){
  const loc = LOCS[locId];
  // guards
  if (act.weekdaysOnly && isWeekend()){ toast('Closed', act.weekdaysMsg, 'bad'); return; }
  if (act.minHour !== undefined && S.hour < act.minHour){ toast('Too early', act.minHourMsg, 'bad'); return; }
  if (act.need === 'groceries' && !S.groceries){ toast('Kettle dey empty', act.needMsg, 'bad'); return; }
  if (act.need === 'laptop' && !S.items.laptop){ toast('No laptop', act.needMsg, 'bad'); return; }
  const cost = act.cost || 0;
  if (cost > S.money){ toast('Money no dey', `You need ${cedis(cost)} for that, chale.`, 'bad'); return; }
  const eff = act.eff || {};
  const enCost = -(eff.en || 0);
  if (enCost && S.en < enCost + 4){ toast('Too tired', 'Your body is asking for bed first.', 'bad'); return; }

  sfx('click');
  if (act.special){
    handleSpecial(locId, act);
  } else {
    if (cost) spend(cost);
    applyEff(eff);
    advanceHours(act.hrs || 1);
    let msg = (act.flavor ? pick([].concat(act.flavor)) : pick(loc.flavor));
    logMsg(`${act.icon} ${act.label} — ${msg}`, 'good');
    // one random event per action, weighted by time spent
    if (Math.random() < Math.min(0.5, 0.13 * (act.hrs || 1))){
      fireEvent(maybeEvent(pick(['any','any','night'])));
    }
  }
  save(); checkAchievements(); render();
}

function applyEff(eff){
  if (eff.en) S.en = clamp(S.en + eff.en, 0, 100);
  if (eff.fd) S.fd = clamp(S.fd + eff.fd, 0, 100);
  if (eff.vb) S.vb = clamp(S.vb + eff.vb, 0, 100);
  if (eff.lk) S.lk = clamp(S.lk + eff.lk, 0, 100);
  if (eff.sm) S.sm = clamp(S.sm + eff.sm, 0, 100);
  if (eff.mo){ earn(eff.mo); }
}

function handleSpecial(locId, act){
  const loc = LOCS[locId];
  switch (act.special){
    case 'sleep':
      logMsg('You lay out your wrapper, set your alarm (you won\u2019t hear it) and sleep the Accra sleep.', 'good');
      fullSleep();
      toast('Day ' + S.day, 'Akwaaba to a new day. The city resets, and so do you.', 'good');
      break;
    case 'payrent':
      spend(MONTH_RENT);
      S.rentDue = false; S.rentLateDays = 0; S.counters.rentPaid++;
      S.vb = clamp(S.vb + 14, 0, 100);
      logMsg('You pay the rent. Your landlord smiles the smile of a man whose children are in private school.', 'gold');
      toast('Rent paid', 'GH\u20B5 800 gone, but peace of mind restored. +14 vibes.', 'good');
      break;
    case 'groceries':
      spend(act.cost); S.groceries = true; advanceHours(act.hrs);
      logMsg('You navigate Makola like a local and return with groceries and one story about an auntie.', 'good');
      break;
    case 'hustle': {
      advanceHours(act.hrs);
      const base = S.hustler ? ri(30, 110) : ri(15, 80);
      earn(base);
      logMsg(`You flip small-small deals around the market and pocket ${cedis(base)}. The hustle is honest-ish.`, 'good');
      break;
    }
    case 'waakye':
      spend(act.cost); applyEff(act.eff); S.counters.waakye++; advanceHours(act.hrs);
      logMsg(pick([
        'Auntie asks \u201Csmall or big?\u201D before you speak. She already knew.',
        'The waakye line parts for you. You\u2019re a regular now — it\u2019s official.',
        'Gari, spaghetti, shito, egg. The plate looks back at you with respect.',
      ]), 'gold');
      break;
    case 'kelewele':
      spend(act.cost); applyEff(act.eff); advanceHours(act.hrs);
      logMsg('Ginger-hot kelewele under the Circle lights. This is the Accra night shift done right.', 'good');
      break;
    case 'work': {
      applyEff({ en:act.eff.en, fd:act.eff.fd, lk:act.eff.lk });
      advanceHours(act.hrs);
      const pay = S.wage; earn(pay);
      S.counters.shifts++;
      logMsg(`Eight hours of professionalism and internal screaming. You collect ${cedis(pay)}.`, 'gold');
      if (S.counters.shifts % 10 === 0){
        S.wage += 20;
        toast('Promotion!', `Your boss calls you \u201Cthe future.\u201D Wage is now ${cedis(S.wage)} per shift.`, 'good', 6500);
        logMsg(`PROMOTION. New wage: ${cedis(S.wage)} per shift.`, 'gold');
        confetti();
      }
      break;
    }
    case 'party':
      spend(act.cost); applyEff(act.eff); S.counters.parties++;
      if (locId === 'labadi') S.counters.beach++;
      if (isDetty()){
        const bonus = Math.round((act.eff.vb || 0) * 0.5);
        S.vb = clamp(S.vb + bonus, 0, 100);
        S.counters.dettyParties = (S.counters.dettyParties || 0) + 1;
      }
      advanceHours(act.hrs);
      logMsg(pick([
        'The DJ reads the room\u2019s soul. You dance like rent doesn\u2019t exist.',
        'Somewhere between the second song and the fourth, your week repairs itself.',
        'You meet five people and remember two names. Perfect ratio.',
      ]), 'gold');
      break;
    case 'network': {
      advanceHours(act.hrs); applyEff({ en:act.eff.en, lk:act.eff.lk });
      if (Math.random() < 0.3){
        const g = ri(120, 220); earn(g);
        logMsg(`A contact needs a small job done this week. You negotiate ${cedis(g)} on the spot. Networking: elite sport.`, 'gold');
      } else {
        logMsg('You collect four WhatsApp numbers, two business ideas and one invitation to a wedding you can\u2019t afford.', 'good');
      }
      break;
    }
    case 'gym':
      applyEff(act.eff); S.counters.gym++; advanceHours(act.hrs);
      if (S.counters.gym === 5) { logMsg('Five sessions in. Your reflection at the lighthouse window nods approvingly.', 'gold'); }
      logMsg('You train in Bukom, where every coach has trained a champion. You are tired in a holy way.', 'good');
      break;
    case 'buy': {
      const item = ITEMS[act.item];
      spend(item.price); S.items[act.item] = true;
      advanceHours(1);
      logMsg(`You buy the ${item.name} for ${cedis(item.price)}. ${item.desc}`, 'gold');
      toast('New item!', `${item.emoji} ${item.name} added to your belongings.`, 'good');
      break;
    }
  }
}

/* ---------------- travel ---------------- */
function openTravel(locId){
  if (locId === S.loc){ toast('You are here', 'Look around instead — there\u2019s plenty to do.', ''); return; }
  const target = LOCS[locId];
  const opts = TRANSPORT.map((t, i) => ({
    label:`${t.emoji} ${t.label} — ${t.cost ? cedis(t.cost) : 'free'}, ${t.hrs}h`,
    cls: i === 0 ? 'btn-gold' : 'btn-ghost',
    fn(){ travelTo(locId, t); },
  }));
  showModal(`<h3>To ${esc(target.short)}?</h3>
    <p class="m-body">${esc(target.blurb)} Pick your ride:</p>
    ${modalButtons(opts)}`);
  bindModalButtons(opts);
}
function travelTo(locId, t){
  closeModal();
  if (t.cost > S.money){ toast('Money no dey', `You need ${cedis(t.cost)} for the ${t.label}.`, 'bad'); return; }
  if (t.cost) spend(t.cost);
  applyEff({ en:t.en || 0, fd:t.fd || 0, vb:t.vb || 0 });
  const wasLate = S.hour + t.hrs >= 23;
  advanceHours(t.hrs);
  S.loc = locId;
  sfx('click');
  const notes = {
    trotro:'The mate shouts your stop like a prophecy. You arrive.', 
    keke:'The keke rattles its way across three potholes and one belief system.',
    bolt:'Cool AC, quiet ride, a driver who gives you one life tip. Dignified.',
    walk:'You walk, greet three strangers, and reconsider your choices at the one long junction.',
  };
  logMsg(`${t.emoji} ${notes[t.label.toLowerCase()] || t.note}`, '');
  if (Math.random() < 0.28) fireEvent(maybeEvent('travel'));
  else fireEvent(maybeEvent('any'));
  if (wasLate && S.loc !== 'home'){
    logMsg('It\u2019s getting late. The city hums a warning: even Accra sleeps eventually.', 'bad');
  }
  save(); checkAchievements(); render();
}

/* ---------------- friends ---------------- */
function openFriends(){
  const cards = Object.entries(FRIENDS).map(([id, f]) => {
    const rel = S.friends[id] || 0;
    const label = rel >= 80 ? 'Day one energy \u{1F49A}' : rel >= 50 ? 'Solid connection' : rel >= 25 ? 'Getting there' : 'Still forming';
    return `<div class="friend-card">
      <div class="friend-head">
        <span class="f-emoji">${f.emoji}</span>
        <div><h4>${f.name} <span class="muted">· ${f.tag}</span></h4><p class="f-tag">${label} (${rel}/100)</p></div>
        <button class="btn btn-gold" data-hang="${id}">Link up</button>
      </div>
      <p class="friend-line">\u201C${f.line}\u201D</p>
      <div class="rel-track"><div class="rel-fill" style="width:${rel}%"></div></div>
    </div>`;
  }).join('');
  showModal(`<h3>\u{1F465} Your people</h3>
    <p class="m-body">Accra is who you know. Link up to grow your friendships (and your vibes).</p>
    ${cards}
    ${modalButtons([{ label:'Close', fn:closeModal }])}`);
  bindModalButtons([{ label:'Close', fn:closeModal }]);
  document.querySelectorAll('[data-hang]').forEach(b => b.addEventListener('click', () => {
    hangout(b.dataset.hang);
  }));
}
function hangout(id){
  const f = FRIENDS[id];
  const spot = pick(FRIEND_SPOTS);
  if (spot.cost > S.money){ toast('Money no dey', `You need ${cedis(spot.cost)} to hang out. The hustle must huzzle.`, 'bad'); return; }
  closeModal();
  spend(spot.cost);
  S.friends[id] = clamp((S.friends[id] || 0) + ri(9, 15), 0, 100);
  S.counters.hangs++;
  applyEff({ vb:11, lk:9, en:-10 });
  advanceHours(2);
  logMsg(`${spot.emoji} You and ${f.name} pull up to ${spot.place}. ${S.friends[id] >= 80 ? 'Day-one behaviour. This friendship is load-bearing now.' : 'The friendship grows one good story stronger.'}`, 'gold');
  if (S.friends[id] >= 80 && Math.random() < 0.5){
    const gift = ri(40, 90); earn(gift);
    setTimeout(() => toast(`${f.name} looks out`, `They insist on sending you ${cedis(gift)} for \u201Csmall support.\u201D Friends like these.`, 'good', 6000), 600);
  }
  save(); checkAchievements(); render();
}

/* ---------------- panels ---------------- */
function openItems(){
  const rows = Object.entries(ITEMS).map(([id, it]) => `
    <div class="item-row">
      <span class="i-emoji">${it.emoji}</span>
      <div><h5>${it.name}</h5><p>${it.desc} — ${cedis(it.price)}</p></div>
      ${S.items[id] ? '<span class="i-own">\u2713 Owned</span>' : `<span class="i-need">Not yet</span>`}
    </div>`).join('');
  showModal(`<h3>\u{1F392} Belongings</h3>
    <p class="m-body">The tools of the good life. Power bank and generator fight dumsor; laptop unlocks remote gigs; jersey wins match days.</p>
    ${rows}
    ${modalButtons([{ label:'Close', fn:closeModal }])}`);
  bindModalButtons([{ label:'Close', fn:closeModal }]);
}
function openGoals(){
  const cells = ACHS.map(a => `
    <div class="ach ${S.ach[a.id] ? 'got' : ''}">
      <div class="a-icon">${a.icon}</div>
      <h5>${a.name}</h5><p>${a.desc}</p>
    </div>`).join('');
  const c = S.counters;
  showModal(`<h3>\u{1F3C6} Achievements</h3>
    <div class="ach-grid">${cells}</div>
    <div style="margin-top:16px">
      <div class="m-row"><span>Days lived in Accra</span><b>${S.day}</b></div>
      <div class="m-row"><span>Total earned</span><b>${cedis(c.earned)}</b></div>
      <div class="m-row"><span>Waakye consumed</span><b>${c.waakye}</b></div>
      <div class="m-row"><span>Parties attended</span><b>${c.parties}</b></div>
      <div class="m-row"><span>Dumsor survived</span><b>${c.dumsor}</b></div>
      <div class="m-row"><span>Jollof debates won</span><b>${c.jollof}</b></div>
    </div>
    ${modalButtons([{ label:'Close', fn:closeModal }])}`);
  bindModalButtons([{ label:'Close', fn:closeModal }]);
}
function openHelp(){
  showModal(`<h3>How Accra Life works</h3>
    <p class="m-body">You manage four stats — \u26A1 Energy, \u{1F35A} Food, \u{1F60A} Vibes and \u{1F465} Links — plus your money and your book sense.

    \u{1F690} Travel between neighbourhoods by trotro, keke, Bolt or leg-power.
    \u{1F4BC} Work shifts at Airport City (weekdays only) to earn. Every 10 shifts = a raise.
    \u{1F35A} Eat before your food bar empties, or your vibes will suffer.
    \u{1F3E0} Rent of GH\u20B5 800 is due on the 1st of every month. Miss it too long and the story ends.
    \u{1F50C} Dumsor hits at night. Power bank softens it; generator ends it.
    \u{1F465} Link up with friends to build your circle — good friends even send you support.
    \u{1F3C6} Unlock all 19 achievements. Save happens automatically in your browser.
    \u{1F389} Every 6th month is Detty Season — parties hit harder and Accra never sleeps.

    Rule one of Accra: small small, the thing will be alright.</p>
    ${modalButtons([{ label:'Chale, let\u2019s go', cls:'btn-gold', fn:closeModal }])}`);
  bindModalButtons([{ label:'Chale, let\u2019s go', cls:'btn-gold', fn:closeModal }]);
}
function openRestart(){
  const opts = [
    { label:'Yes — start over', cls:'btn-danger', fn(){ clearSave(); location.reload(); } },
    { label:'Cancel', fn:closeModal },
  ];
  showModal(`<h3>Start over?</h3><p class="m-body">This deletes your story, your money, your friendships — everything. The city will not remember you.</p>${modalButtons(opts)}`);
  bindModalButtons(opts);
}

/* ---------------- achievements check ---------------- */
function checkAchievements(){
  for (const a of ACHS){
    if (!S.ach[a.id] && a.check(S)){
      S.ach[a.id] = true;
      sfx('ach'); confetti();
      toast(`\u{1F3C6} ${a.name}`, a.desc, 'ach', 6000);
      logMsg(`\u{1F3C6} Achievement unlocked: ${a.name}` , 'gold');
    }
  }
}

/* ---------------- game over ---------------- */
function gameOver(){
  const finish = () => {
    const c = S.counters;
    $('#over-text').textContent = 'You couldn\u2019t keep up with the rent, and the landlord made it official. But look at what you lived: the waakye, the waves, the nights, the friends. Accra doesn\u2019t forget its people. When you\u2019re ready — come back stronger.';
    $('#over-stats').innerHTML = `
      <div class="over-stat"><b>${S.day}</b>days lived</div>
      <div class="over-stat"><b>${cedis(c.earned)}</b>total earned</div>
      <div class="over-stat"><b>${c.waakye}</b>plates of waakye</div>
      <div class="over-stat"><b>${c.parties}</b>parties survived</div>
      <div class="over-stat"><b>${c.dumsor}</b>dumsor nights</div>
      <div class="over-stat"><b>${Object.keys(S.ach).length}</b>achievements</div>`;
    showScreen('over');
  };
  showModal(`<h3>\u{1F3E0} Quit notice</h3>
    <p class="m-body">Your landlord has been patient. Today, patience ends. The locks change at noon, and your Accra story closes this chapter.</p>
    ${modalButtons([{ label:'See your story so far', cls:'btn-gold', fn(){ closeModal(); finish(); } }])}`);
  bindModalButtons([{ label:'See your story so far', cls:'btn-gold', fn(){ closeModal(); finish(); } }]);
}

/* ---------------- render ---------------- */
function statPill(name, icon, val, color){
  const low = val < 25 ? ' low' : '';
  return `<div class="stat-pill${low}">
    <div class="stat-top"><span class="stat-name">${icon} ${name}</span><span class="stat-val" style="color:${color}">${Math.round(val)}</span></div>
    <div class="stat-track"><div class="stat-fill" style="width:${clamp(val,0,100)}%;background:${color}"></div></div>
  </div>`;
}

function render(){
  if (!S) return;
  // HUD
  const fit = FITS.find(f => f.id === S.fit) || FITS[0];
  $('#hud').innerHTML = `
    <span class="hud-chip avatar-chip" title="${esc(S.name)}" style="border-color:${fit.ring}">${S.skin}</span>
    <span class="hud-chip">${periodEmoji(S.hour)} Day ${S.day} · ${WEEKDAYS[weekdayIdx()]} · <b>${hourLabel(S.hour)}</b>${isDetty() ? ' · \u{1F389} Detty' : ''}</span>
    <span class="hud-chip money">\u{1F4B5} <b>${cedis(S.money)}</b>${S.rentDue ? ' · \u{1F3E0} rent due!' : ''}</span>`;
  // stats
  $('#statsbar').innerHTML =
    statPill('Energy', '\u26A1', S.en, '#ffd166') +
    statPill('Food', '\u{1F35A}', S.fd, '#74c69d') +
    statPill('Vibes', '\u{1F60A}', S.vb, '#ff7fa5') +
    statPill('Links', '\u{1F465}', S.lk, '#7fb3ff');

  // scene
  const loc = LOCS[S.loc];
  const actions = loc.actions.filter(a => !a.showIf || a.showIf()).map(a => {
    const cost = a.cost || 0;
    const eff = a.eff || {};
    const enCost = -(eff.en || 0);
    let disabled = false, warn = '';
    if (cost > S.money){ disabled = true; warn = `You need ${cedis(cost)}.`; }
    else if (a.need === 'groceries' && !S.groceries){ disabled = true; warn = 'Need groceries from Makola.'; }
    else if (a.need === 'laptop' && !S.items.laptop){ disabled = true; warn = 'Need a laptop + 30 book sense.'; }
    else if (a.weekdaysOnly && isWeekend()){ disabled = true; warn = 'Weekends: office closed.'; }
    else if (a.minHour !== undefined && S.hour < a.minHour){ disabled = true; warn = 'Opens at 7pm.'; }
    else if (enCost && S.en < enCost + 4){ disabled = true; warn = 'Too tired — sleep first.'; }
    const costTag = cost ? `<span class="a-cost">${cedis(cost)}</span>` : eff.mo ? `<span class="a-cost">+GH\u20B5</span>` : '';
    return `<button class="action-btn" data-act="${a.id}" ${disabled ? 'disabled' : ''}>
      <span class="a-top"><span class="a-emoji">${a.icon}</span>${esc(a.label)}${costTag}</span>
      <p class="a-desc">${esc(a.desc)}</p>
      ${warn ? `<p class="a-warn">${esc(warn)}</p>` : ''}
    </button>`;
  }).join('');
  $('#scene').style.setProperty('--g1', loc.g1);
  $('#scene').style.setProperty('--g2', loc.g2);
  $('#scene').innerHTML = `
    <div class="scene-watermark" aria-hidden="true">${loc.emoji}</div>
    <div class="scene-head">
      <p class="scene-eyebrow">${esc(loc.short)} · ${WEEKDAYS[weekdayIdx()]}</p>
      <h2 class="scene-title">${loc.emoji} ${esc(loc.name)}</h2>
      <p class="scene-blurb">${esc(loc.blurb)}</p>
    </div>
    <div class="action-grid">${actions}</div>`;
  // bind actions
  document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const a = LOCS[S.loc].actions.find(x => x.id === b.dataset.act);
    if (a) doAction(S.loc, a);
  }));

  // travel strip
  $('#travel-strip').innerHTML = Object.entries(LOCS).map(([id, l]) => `
    <button class="travel-chip ${id === S.loc ? 'here' : ''}" data-go="${id}" ${id === S.loc ? 'disabled' : ''}>
      <span class="t-emoji">${l.emoji}</span>
      <span class="t-name">${esc(l.short)}</span>
      <span class="t-fare">${id === S.loc ? 'you dey here' : 'trotro GH\u20B5 6'}</span>
    </button>`).join('');
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => openTravel(b.dataset.go)));

  // log
  $('#log').innerHTML = S.log.map(e => `
    <div class="log-entry ${e.k}">
      <span class="lt">Day ${e.d} · ${hourLabel(e.h)}</span>
      <p>${esc(e.t)}</p>
    </div>`).join('') || '<p class="muted">Your story starts now…</p>';
}

/* ---------------- creation screen ---------------- */
function renderCreate(){
  const skinRow = $('#skin-swatches');
  skinRow.innerHTML = SKINS.map((s, i) => `<button class="swatch ${createChoice.skin === i ? 'sel' : ''}" data-skin="${i}">${s}</button>`).join('');
  $('#fit-swatches').innerHTML = FITS.map((f, i) => `<button class="swatch ${createChoice.fit === i ? 'sel' : ''}" data-fit="${i}" title="${f.label}">${f.emoji}</button>`).join('');
  $('#hustle-cards').innerHTML = HUSTLES.map((h, i) => `
    <button class="hustle-card ${createChoice.hustle === i ? 'sel' : ''}" data-hustle="${i}">
      <h4>${h.name}</h4><p>${h.desc}</p>
    </button>`).join('');
  document.querySelectorAll('[data-skin]').forEach(b => b.addEventListener('click', () => { createChoice.skin = +b.dataset.skin; renderCreate(); }));
  document.querySelectorAll('[data-fit]').forEach(b => b.addEventListener('click', () => { createChoice.fit = +b.dataset.fit; renderCreate(); }));
  document.querySelectorAll('[data-hustle]').forEach(b => b.addEventListener('click', () => { createChoice.hustle = +b.dataset.hustle; renderCreate(); }));
}

/* ---------------- boot ---------------- */
function beginGame(name){
  const fit = FITS[createChoice.fit];
  S = freshState(name, SKINS[createChoice.skin], fit, HUSTLES[createChoice.hustle].id);
  logMsg(`You arrive in Accra with ${cedis(S.money)}, one bag of ambition and zero contacts. Akwaaba, ${S.name}. The city clock starts now.`, 'gold');
  toast('Akwaaba, ' + S.name + '!', 'Day 1 in Accra. Make it count, chale.', 'good', 6000);
  setTimeout(() => toast('\u{1F4A1} Small tip, chale', 'Tap a neighbourhood below to travel. Waakye fixes hunger. The office pays the bills. Sleep restores everything.', '', 8000), 1600);
  checkAchievements();
  save(); showScreen('game'); render();
}

function boot(){
  $('#btn-new').addEventListener('click', () => { sfx('click'); showScreen('create'); renderCreate(); $('#inp-name').focus(); });
  $('#btn-continue').addEventListener('click', () => {
    const saved = loadSave();
    if (saved){ S = saved; showScreen('game'); render(); }
  });
  const saved = loadSave();
  if (saved && saved.name) $('#btn-continue').classList.remove('hidden');

  $('#btn-random-name').addEventListener('click', () => { $('#inp-name').value = pick(NAMES); });
  $('#btn-back-start').addEventListener('click', () => showScreen('start'));
  $('#btn-begin').addEventListener('click', () => {
    const name = ($('#inp-name').value || '').trim() || pick(NAMES);
    sfx('ach'); beginGame(name);
  });

  const sndBtn = $('#btn-sound');
  const paintSound = () => { sndBtn.textContent = soundOn ? '\u{1F50A}' : '\u{1F507}'; };
  paintSound();
  sndBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    try { localStorage.setItem('accraLifeSound', soundOn ? '1' : '0'); } catch(e){}
    paintSound(); if (soundOn) sfx('click');
  });

  $('#btn-friends').addEventListener('click', () => { sfx('click'); openFriends(); });
  $('#btn-items').addEventListener('click', () => { sfx('click'); openItems(); });
  $('#btn-goals').addEventListener('click', () => { sfx('click'); openGoals(); });
  $('#btn-help').addEventListener('click', () => { sfx('click'); openHelp(); });
  $('#btn-restart').addEventListener('click', openRestart);
  $('#btn-restart2').addEventListener('click', () => { clearSave(); location.reload(); });

  $('#modal-root').addEventListener('click', e => { if (e.target === $('#modal-root')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  window.addEventListener('beforeunload', () => { if (S) save(); });
}
document.addEventListener('DOMContentLoaded', boot);
