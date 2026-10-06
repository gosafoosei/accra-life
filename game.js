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

const DIFFS = [
  { id:'soft',     name:'\u{1F9D8}\u{1F3FE} Soft Life', desc:'Start with 1.5\u00D7 money, rent GH\u20B5 650, gentler daily drain. Accra on easy mode.', money:1.5, rent:650,  decay:0.8,  wage:1 },
  { id:'standard', name:'\u2696\uFE0F Accra Standard', desc:'The real Accra. GH\u20B5 800 rent, honest drain, honest hustle.', money:1,   rent:800,  decay:1,    wage:1 },
  { id:'hard',     name:'\u{1F525} Hustle Hard', desc:'Start with 0.6\u00D7 money, rent GH\u20B5 1,000, everything drains faster, wages 10% leaner. For veterans.', money:0.6, rent:1000, decay:1.25, wage:0.9 },
];

const TITLES = ['Office Assistant', 'Junior Executive', 'Senior Executive', 'Manager', 'The Boss'];
const titleOf = () => TITLES[Math.min(TITLES.length - 1, Math.floor((S.counters.shifts || 0) / 10))];

const ITEMS = {
  powerbank: { emoji:'\u{1F50B}', name:'Power bank', price:250,  desc:'Keeps your phone alive when ECG strikes.' },
  generator: { emoji:'\u{1F50C}', name:'I-better-pass-my-neighbour generator', price:3500, desc:'Dumsor becomes somebody else\u2019s problem. Loud, but worth it.' },
  laptop:    { emoji:'\u{1F4BB}', name:'Laptop', price:2800, desc:'Unlock remote gigs from home (needs 30 book sense).' },
  jersey:    { emoji:'\u{1F455}', name:'Black Stars jersey', price:180, desc:'Match days hit different. Vibes bonus, instant banter.' },
};

const FRIENDS = {
  kwame: { name:'Kwame', tag:'Office guy', emoji:'\u{1F57A}', line:'Knows every happy hour on Oxford Street by heart.',
    lines:{
      hi:['How far chale! Office dey finish me o \u{1F629}', 'My guy! You wake at all?'],
      link:['Osu tonight? I know the DJ \u{1F57A}', 'Say when and where — I dey come with vibes'],
      food:['Bro, banku after work? \u{1F41F}', 'I only eat to survive jollof season \u{1F35A}'],
      money:['MoMo dey dry for my side too \u{1F602}', 'When promotion enter, first round na my own \u{1F91D}'],
      party:['Last night was MOVIE \u{1F3AC} my legs still dey file complaint', 'Detty season don enter your body? \u{1F602}'],
      dumsor:['ECG took my FIFA match mid-tournament \u{1F624}', 'Neighbour\u2019s generator 1, my sleep 0'],
      any:['Abeg how that hustle dey go?', 'This city no dey sleep — we too no go sleep', 'Send credit abeg \u{1F623}'],
    } },
  abena: { name:'Abena', tag:'Designer', emoji:'\u{1F487}\u{1F3FE}\u200D\u2640\uFE0F', line:'Can price any fabric in Makola by touching it.',
    lines:{
      hi:['Hey you! Fabric shipment landed today \u{1F9F5}', 'Morning! This Accra sun no dey play'],
      link:['Come to the studio, I need eyes on this kente piece \u{1F3A8}', 'Osu? I go show you the new collection'],
      food:['Waakye talk later — I dey on cassava duty \u{1F37D}\uFE0F', 'Feed me and I go design you something \u{1F440}'],
      money:['Customer paid late again. We move \u{1F643}', 'Money talks, fabric whispers \u{1F9F5}'],
      party:['I dey plan Detty outfit since January \u{1F483}', 'Party? Say less.'],
      dumsor:['My sewing machine died mid-dress. ECG, why \u{1F62D}', 'Candlelight studio era \u{1F56F}\uFE0F'],
      any:['That colour go fit you die', 'Makola prices rose again, chale', 'You good? Text me if anything \u{1F9E1}'],
    } },
  kofi: { name:'Kofi', tag:'Legon scholar', emoji:'\u{1F913}', line:'Argues about jollof with citations.',
    lines:{
      hi:['Greetings, scholar of the streets \u{1F913}', 'I dey Balme — the Wi-Fi dey fight me'],
      link:['Legon? The palms miss you \u{1F334}', 'Come, we argue about something productive'],
      food:['Waakye is just rice and beans with ambition \u{1F4CA}', 'Cafeteria jollof: 6/10. Don\u2019t @ me'],
      money:['Book fees dey hungry my account \u{1F4DA}', 'Rich friends are a strategy, no offence \u{1F480}'],
      party:['Reading week\u2026 but one small party won\u2019t hurt \u{1F92B}', 'Detty season vs first class. We shall see.'],
      dumsor:['Studied by candlelight. Very aesthetic, very annoying \u{1F56F}\uFE0F', 'Dumsor closed my tabs. All of them.'],
      any:['Fun fact: trotro economics mirror game theory', 'Confidence is 80% of knowledge \u{1F393}', 'Keep pushing — the data supports it'],
    } },
  efua: { name:'Efua', tag:'Food blogger', emoji:'\u{1F469}\u{1F3FE}\u200D\u{1F373}', line:'Ranks waakye joints the way Michelin ranks restaurants.',
    lines:{
      hi:['Chale! New chop spot just dropped \u{1F440}', 'I dey taste-menu this morning. Tough job \u{1F60B}'],
      link:['Come, we review something deep-fried \u{1F364}', 'Labadi then kelewele after? I\u2019m driving'],
      food:['Rate your last waakye — gari ratio matters \u{1F4DD}', 'Shito levels today: unsafe. Perfect.'],
      money:['Blogging pays in food, mostly \u{1F37D}\uFE0F', 'Sponsorship coming\u2026 one day \u{1F623}'],
      party:['The party small chops were 9/10, the people 10/10', 'Where the food at? I dey come \u{1F3C3}\u{1F3FE}\u200D\u2640\uFE0F'],
      dumsor:['My freezer\u2026 my poor frozen berries \u{1F62D}', 'Dumsor can\u2019t stop the review grind \u{1F526}\uFE0F'],
      any:['Send the location of that place you mentioned', 'Eating is research. Trust the process', 'That joint you talked about — blog post loading \u{1F4F8}'],
    } },
  yaw: { name:'Yaw', tag:'Bukom boxer', emoji:'\u{1F94A}', line:'Throws hands at the gym and poses at every party.',
    lines:{
      hi:['Boxer! How body? \u{1F4AA}\u{1F3FE}', 'Morning training done. You dey slack o \u{1F929}'],
      link:['Gym then beach? Sweat then waves \u{1F94A}', 'Pull up Bukom, I go show you small combos'],
      food:['Protein chale, protein \u{1F41F}', 'Banku dey build champions \u{1F4AA}\u{1F3FE}'],
      money:['Fight purse small but we dey \u{1F624}', 'Wins dey come. Money go follow.'],
      party:['Party? I dey show them one or two steps \u{1F602}', 'Who dey DJ? I need the tracklist for training'],
      dumsor:['Training by phone torch. Old school \u{1F4F1}', 'No light, no problem — the bag no need light \u{1F94A}'],
      any:['Discipline na everything', 'Small small, muscle go come', 'That your gym thing — how far? \u{1F440}'],
    } },
};
const FRIEND_SPOTS = [
  { place:'a waakye spot in Tudu', cost:25,  emoji:'\u{1F35A}' },
  { place:'Republic Bar in Osu',   cost:70,  emoji:'\u{1F37B}' },
  { place:'Makola for ingredients',cost:35,  emoji:'\u{1F9FA}' },
  { place:'Labadi Beach',          cost:45,  emoji:'\u{1F3D6}\uFE0F' },
  { place:'a kelewele stand at Circle', cost:15, emoji:'\u{1F34C}' },
];

const PHRASES = [
  { t:'Akwaaba', m:'Welcome — the first word every traveller hears in Ghana.' },
  { t:'\u0190te s\u025Bn?', m:'How are you? Reply: \u0190y\u025B (it\u2019s fine).' },
  { t:'Me da ase', m:'Thank you.' },
  { t:'Chale', m:'Friend, bro, dude — the most useful word in Accra.' },
  { t:'How far?', m:'What\u2019s up? Not a GPS question.' },
  { t:'We go manage', m:'We\u2019ll make do. Unofficial national motto.' },
  { t:'Sharp sharp', m:'Quickly, immediately, no wahala.' },
  { t:'Small small', m:'Little by little — how everything good is built.' },
  { t:'E dey be', m:'Things are going well.' },
  { t:'Wahala', m:'Trouble. Avoid it, or embrace it — context matters.' },
  { t:'I dey feel you', m:'I relate. I respect it.' },
  { t:'Go slow', m:'Traffic jam. Also a lifestyle.' },
  { t:'Dumsor', m:'Lights off. The word ECG gave us.' },
  { t:'Mate!', m:'Hey, trotro conductor — your stop is here.' },
  { t:'Chop money', m:'Food money, allowance, spending cash.' },
];

/* -------- locations & actions --------
   eff keys: en energy, fd food, vb vibes, lk links, sm book sense, mo money */
const LOCS = {
  home: {
    name:'Home, East Legon', short:'East Legon', emoji:'\u{1F3E0}', g1:'#1b4332', g2:'#0e2119',
    blurb:'Your chamber-and-hall with a view of somebody\u2019s generator. The landlord comes knocking on the 1st.',
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
      { id:'up1', label:'Move to self-contained', icon:'\u{1F9F1}', cost:4000, special:'homeup', to:1, showIf:()=>(S.homeLevel || 0) === 0, desc:'Your own kitchen and bath. GH\u20B5 4,000 (rent stays, sorry).' },
      { id:'up2', label:'Upgrade to Cantonments', icon:'\u{1F3D9}\uFE0F', cost:12000, special:'homeup', to:2, showIf:()=>(S.homeLevel || 0) === 1, desc:'AC, elevator, view of somebody else\u2019s pool. GH\u20B5 12,000.' },
      { id:'waterplant', label:'Water your plant', icon:'\u{1FAB4}', hrs:1, eff:{vb:5, en:-2}, showIf:()=>S.plant, desc:'It has one job. Thrive.',
        flavor:[
          'You water your plant and tell it about your day. It thrives out of pure respect.',
          'A new leaf has opened. You are officially a plant person now.',
        ] },
      { id:'payrent', label:'Pay rent', icon:'\u{1F3E0}\u{1F4B8}', costFn:()=>S.rent, special:'payrent', showIf:()=>S.rentDue, desc:'Silence the landlord. +14 vibes.' },
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
  tema: {
    name:'Tema Harbour', short:'Tema', emoji:'\u2693', far:true, g1:'#274b63', g2:'#0d1f2b',
    blurb:'Ghana\u2019s harbour city. Container cranes, fresh fish, sea wind and the smell of big business.',
    flavor:[
      'The cranes stack containers like the world\u2019s slowest, most profitable game of Jenga.',
      'A fisherman mends his net and tells you the sea has moods. Today: good mood.',
      'The wind off the Gulf of Guinea carries salt, diesel and possibility.',
    ],
    actions:[
      { id:'grilledfish', label:'Harbour-side grilled fish', icon:'\u{1F41F}', hrs:2, cost:40, eff:{fd:72, vb:11}, desc:'Caught this morning. Grilled to order. Life is good.' },
      { id:'portload', label:'Port load work', icon:'\u{1F4AA}\u{1F3FE}', hrs:3, eff:{en:-24, fd:-10}, special:'portload', desc:'Heavy days pay better. GH\u20B5 50\u2013120.' },
      { id:'ships', label:'Watch the ships come in', icon:'\u{1F6A2}', hrs:2, eff:{vb:9, sm:3}, desc:'Free cinema, powered by global trade.' },
    ],
  },
  aburi: {
    name:'Aburi Botanical Gardens', short:'Aburi', emoji:'\u{1F33F}', far:true, g1:'#2f6b3a', g2:'#10291a',
    blurb:'Cool mountain air an hour above Accra. Palms, lawns, picnics and a little perspective.',
    flavor:[
      'The air up here has never met a traffic jam.',
      'The palms line up like they are posing for your wallpaper.',
      'Somewhere below, Accra hums. Up here, only leaves.',
    ],
    actions:[
      { id:'picnic', label:'Garden picnic', icon:'\u{1F9FA}', hrs:2, cost:50, eff:{fd:55, vb:17, en:8}, desc:'Waakye with a view of the whole ridge.' },
      { id:'mountain', label:'Breathe the mountain air', icon:'\u{1F32C}\uFE0F', hrs:2, eff:{en:20, vb:11}, desc:'Nature\u2019s own power nap, no fan needed.' },
      { id:'palms', label:'Palm-lined photo walk', icon:'\u{1F334}', hrs:2, eff:{vb:10, sm:2}, desc:'Content that looks expensive. It was not.' },
      { id:'buyplant', label:'Buy a garden plant', icon:'\u{1FAB4}', cost:60, special:'plant', showIf:()=>!S.plant, desc:'A little green friend for your chamber. GH\u20B5 60.' },
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
  { id:'derby', w:4, when:'day', cond:()=>S.loc === 'tema', choice:{
      title:'\u26BD Harbour derby day',
      body:'It\u2019s match day in Tema and the whole harbour city is electric. The viewing centre by the docks is charging GH\u20B5 30 at the door — the banter is free.',
      options:[
        { label:'Pull up (GH\u20B5 30, +3h)', run(){
            S.money = Math.max(0, S.money - 30);
            S.lk = clamp(S.lk + 9, 0, 100); S.vb = clamp(S.vb + 14, 0, 100);
            S.en = clamp(S.en - 8, 0, 100); S.fd = clamp(S.fd + 10, 0, 100);
            S.hour = Math.min(24, S.hour + 3);
            if (Math.random() < 0.5){
              S.vb = clamp(S.vb + 6, 0, 100);
              return 'Ninety minutes, three near-fights, one beautiful goal. Your side wins and the harbour hears about it for a week.';
            }
            return 'Your side loses to a dubious last-minute penalty. You argue about it for two extra hours — which, in Ghana, is the real national sport.';
        }},
        { label:'Give it a miss', run(){
            return 'You skip the derby. The roars from the viewing centre follow you around the harbour all afternoon, like a conscience with a drum.';
        }},
      ],
  }},
  { id:'fuel', w:2, when:'day', choice:{
      title:'\u26FD Fuel wahala',
      body:'Rumour says fuel is finishing, so every station from here to Tema has a queue that could get its own postal code. A man offers you GH\u20B5 25 to hold his place while he \u201Cpicks something up.\u201D',
      options:[
        { label:'Hold his place (2h)', run(){
            S.en = clamp(S.en - 10, 0, 100); earn(25); S.vb = clamp(S.vb + 4, 0, 100); S.hour = Math.min(24, S.hour + 2);
            return 'Two hours of sun, small talk and pure street diplomacy. He returns, pays you GH\u20B5 25 and calls you \u201Ca real one.\u201D';
        }},
        { label:'Walk away', run(){
            S.vb = clamp(S.vb - 2, 0, 100);
            return 'You leave the queue to its destiny. The fuel finishes twenty minutes later. The queue stays anyway. Nobody questions it.';
        }},
      ],
  }},
  { id:'allnight', w:2, when:'night', choice:{
      title:'\u26EA All-night service',
      body:'Your neighbour invites you to an all-night church service — singing till sunrise, prayer like cardio, and word is the waakye at 3am is legendary.',
      options:[
        { label:'Go with her', run(){
            S.en = clamp(S.en - 18, 0, 100); S.vb = clamp(S.vb + 14, 0, 100); S.sm = clamp(S.sm + 4, 0, 100); S.lk = clamp(S.lk + 5, 0, 100);
            return 'You dance, you declare, you are \u201Ccovered.\u201D At 3am the waakye appears like a miracle with extra shito. You come home holy AND full.';
        }},
        { label:'Sleep instead', run(){
            S.en = clamp(S.en + 6, 0, 100);
            return 'You choose your bed. The singing drifts through your window till 5am. Technically, you attended — with your ears.';
        }},
      ],
  }},
  { id:'fakefit', w:2, when:'any', choice:{
      title:'\u{1F455} Designer special',
      body:'A hawker at Circle shows you a shirt with a logo that says \u201CGUCCY.\u201D He swears it is original even though the tag says Made in Somewhere Else. GH\u20B5 60.',
      options:[
        { label:'Buy the Guccy', run(){
            S.money = Math.max(0, S.money - 60);
            if (Math.random() < 0.5){
              S.vb = clamp(S.vb + 12, 0, 100);
              return 'Somehow, it works. Two strangers ask where you got it. Confidence is a fabric, chale.';
            }
            S.vb = clamp(S.vb - 6, 0, 100);
            return 'The zip gives up in front of everybody. The hawker has vanished like a dream. Tuition fees, paid in full.';
        }},
        { label:'Respectfully decline', run(){
            S.sm = clamp(S.sm + 2, 0, 100);
            return 'You admire the stitching, salute the entrepreneurship, and keep your money. Growth.';
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
  { id:'harbour', icon:'\u2693', name:'Harbour Runs', desc:'Make 3 trips to Tema.', check:S => (S.counters.tema || 0) >= 3 },
  { id:'mountain', icon:'\u{1F33F}', name:'Mountain Air', desc:'Escape to Aburi twice.', check:S => (S.counters.aburi || 0) >= 2 },
  { id:'green', icon:'\u{1FAB4}', name:'Green Thumb', desc:'Keep a plant alive in East Legon.', check:S => !!S.plant },
  { id:'home1', icon:'\u{1F9F1}', name:'Moved Up', desc:'Leave the chamber for a self-contained.', check:S => (S.homeLevel || 0) >= 1 },
  { id:'home2', icon:'\u{1F3D9}\uFE0F', name:'Soft Life Living', desc:'Upgrade to a Cantonments apartment.', check:S => (S.homeLevel || 0) >= 2 },
  { id:'theboss', icon:'\u{1F454}', name:'The Boss', desc:'Climb to the top job title.', check:S => (S.counters.shifts || 0) >= 40 },
];

/* ---------------- state ---------------- */
const OLD_KEY = 'accraLifeSaveV1';
const slotKey = n => 'accraLifeSlot' + n;
let slot = 1;
let soundOn = true;
try { soundOn = localStorage.getItem('accraLifeSound') !== '0'; } catch(e){}
let S = null;
let createChoice = { skin:0, fit:0, hustle:0, diff:1 };

function freshState(name, skinEmoji, fit, hustleId, diffId){
  const d = DIFFS.find(x => x.id === diffId) || DIFFS[1];
  const s = {
    v:1, name, skin:skinEmoji, fit:fit.id, diff:d.id,
    day:1, hour:7, loc:'home',
    money:200, wage:Math.round(130 * d.wage), en:90, fd:70, vb:65, lk:40, sm:10,
    rent:d.rent, decayMul:d.decay, homeLevel:0, weather:'clear',
    groceries:false, hustler:false,
    items:{ powerbank:false, generator:false, laptop:false, jersey:false },
    friends:{ kwame:15, abena:15, kofi:15, efua:15, yaw:15 },
    rentDue:false, rentLateDays:0, startedMonth:1, snapEarned:0, plant:false,
    phone:{ threads:{}, unread:{}, lastDay:{} },
    customEvents:[],
    counters:{ waakye:0, parties:0, dumsor:0, beach:0, shifts:0, hangs:0, jollof:0, gym:0, rentPaid:0, earned:0, spent:0, dettyParties:0, tema:0, aburi:0 },
    ach:{}, log:[],
  };
  const h = HUSTLES.find(x => x.id === hustleId); if (h) h.apply(s);
  s.money = Math.round(s.money * d.money);
  return s;
}
function save(){ try { localStorage.setItem(slotKey(slot), JSON.stringify(S)); } catch(e){} }
function loadSlot(n){ try { const r = localStorage.getItem(slotKey(n)); return r ? JSON.parse(r) : null; } catch(e){ return null; } }
function clearSlot(n){ try { localStorage.removeItem(slotKey(n)); } catch(e){} }

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
function closeModal(){ $('#modal-root').classList.add('hidden'); if (typeof openChatId !== 'undefined') openChatId = null; }
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
  const dm = S.decayMul || 1;
  for (let i = 0; i < hrs; i++){
    // awake-time decay
    S.en = clamp(S.en - 1 * dm, 0, 100);
    S.fd = clamp(S.fd - 1.6 * dm, 0, 100);
    if (S.fd <= 0) S.vb = clamp(S.vb - 1.5 * dm, 0, 100);
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
  const lvl = S.homeLevel || 0;
  S.en = clamp(S.en + [88, 94, 100][lvl], 0, 100);
  S.fd = clamp(S.fd - 26, 0, 100);
  S.vb = clamp(S.vb + [8, 10, 12][lvl], 0, 100);
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
    toast('\u{1F3E0} Month ' + monthOf(), `Rent day! ${cedis(S.rent)} due. Your landlord\u2019s patience is renewable but not unlimited.`, 'bad', 6000);
    logMsg(`Month ${monthOf()} begins. Rent of ${cedis(S.rent)} is due.`, 'bad');
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
  // phrase of the day
  if (Math.random() < 0.35){
    const p = pick(PHRASES);
    logMsg(`\u{1F5E3}\uFE0F Phrase of the day: \u201C${p.t}\u201D — ${p.m}`, 'gold');
  }
  // friends text you on the in-game phone
  morningTexts();
  // daily weather (drives the street scene)
  S.weather = pick(['clear', 'clear', 'clear', 'rain', 'harmattan']);
  save(); checkAchievements(); render();
}
function maybeEvent(when){
  const pool = EVENTS.filter(e => (!when || e.when === when) && (!e.cond || e.cond()));
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
  const cost = act.costFn ? act.costFn() : (act.cost || 0);
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
    if (act.id === 'study' || act.id === 'lecture'){
      maybeText('kofi', pick([
        'Studying?? Character development \u{1F914}\u{1F4DA}',
        'Library bros. The palms noticed you \u{1F334}',
      ]), 0.35);
    }
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
      spend(S.rent);
      S.rentDue = false; S.rentLateDays = 0; S.counters.rentPaid++;
      S.vb = clamp(S.vb + 14, 0, 100);
      logMsg(`You pay the rent. Your landlord smiles the smile of a man whose children are in private school.`, 'gold');
      toast('Rent paid', `${cedis(S.rent)} gone, but peace of mind restored. +14 vibes.`, 'good');
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
      maybeText('efua', pick([
        'Waakye again?! Your loyalty is blog-worthy \u{1F4D3}',
        'Rate that plate out of 10 — for the blog \u{1F440}',
        'Shito levels today? I need data for the rankings \u{1F4C9}\u2197\uFE0F',
      ]), 0.5);
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
      maybeText('kwame', pick([
        'Shift brothers for life \u{1F91D} same time tomorrow?',
        'You survived another one. The AC alone is worth it \u{1F929}',
      ]), 0.3);
      if (S.counters.shifts % 10 === 0){
        S.wage += 20;
        toast('Promotion!', `You\u2019re now ${titleOf()}. Wage is ${cedis(S.wage)} per shift.`, 'good', 6500);
        logMsg(`PROMOTION. You are now ${titleOf()}. New wage: ${cedis(S.wage)} per shift.`, 'gold');
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
      maybeText('kwame', pick([
        'Last night was MOVIE \u{1F3AC} my legs still dey file complaint',
        'We turned UP. Same time next week? \u{1F57A}',
        'I lost my voice but found a whole new playlist \u{1F3A7}',
      ]), 0.45);
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
      maybeText('yaw', pick([
        'You train today? I felt it in the air \u{1F94A}',
        'Bukom reports progress. Keep punching \u{1F4AA}\u{1F3FE}',
      ]), 0.5);
      break;
    case 'portload': {
      applyEff({ en:act.eff.en, fd:act.eff.fd });
      advanceHours(act.hrs);
      const pay = S.hustler ? ri(70, 150) : ri(50, 120); earn(pay);
      logMsg(`You spend the morning hauling at the harbour and walk away with ${cedis(pay)}. The sea provides for those who lift.`, 'gold');
      break;
    }
    case 'plant':
      spend(act.cost); S.plant = true; advanceHours(1);
      logMsg('You carry a little garden plant all the way from the Aburi hills to East Legon. Your chamber has a new flatmate — quiet, green, judgemental.', 'gold');
      toast('New flatmate!', '\u{1FAB4} A plant now lives with you. Water it at home for steady vibes.', 'good', 6000);
      break;
    case 'homeup': {
      const lvl = act.to;
      spend(act.cost); S.homeLevel = lvl; advanceHours(2);
      if (lvl === 1){
        logMsg('You move out of the chamber into a self-contained. Your own kitchen! Your own bath! You open the door twelve times just to feel it.', 'gold');
        toast('New digs!', '\u{1F9F1} Self-contained unlocked. You sleep deeper now (+6 energy, +2 vibes per night).', 'good', 6500);
      } else {
        logMsg('You upgrade to a Cantonments apartment. The AC hums, the tiles shine, and somewhere below, Accra glitters. You built that.', 'gold');
        toast('Top tier!', '\u{1F3D9}\uFE0F Cantonments apartment unlocked. Full sleep and +12 morning vibes. Soft life: achieved.', 'ach', 7000);
        confetti();
      }
      break;
    }
    case 'buy': {
      const item = ITEMS[act.item];
      spend(item.price); S.items[act.item] = true;
      advanceHours(1);
      logMsg(`You buy the ${item.name} for ${cedis(item.price)}. ${item.desc}`, 'gold');
      toast('New item!', `${item.emoji} ${item.name} added to your belongings.`, 'good');
      if (act.item === 'jersey') maybeText('abena', pick([
        'MATCH DAY READY \u{1F455}\u{1F525} wear it well o',
        'Jersey fit check!! Send photo \u{1F4F8}',
      ]), 0.7);
      if (act.item === 'laptop') maybeText('abena', pick([
        'Laptop era!! Work from bed loading \u{1F4BB}\u{1F602}',
        'Now you have zero excuse. Freelance life \u{1F4BB}\u2728',
      ]), 0.7);
      if (act.item === 'generator') maybeText('kwame', pick([
        'You bought GENERATOR? Pull up — I dey bring extension board \u{1F602}\u{1F50C}',
        'Generator Mafia confirmed \u{1F50C}\u{1F4AF}',
      ]), 0.8);
      break;
    }
  }
}

/* ---------------- travel ---------------- */
function openTravel(locId){
  if (locId === S.loc){ toast('You are here', 'Look around instead — there\u2019s plenty to do.', ''); return; }
  const target = LOCS[locId];
  const opts = TRANSPORT.filter(t => !target.far || t.id === 'trotro' || t.id === 'bolt').map((t, i) => {
    const cost = target.far ? t.cost * 4 : t.cost;
    const hrs = target.far && t.id === 'trotro' ? 2 : t.hrs;
    const en = (t.en || 0) + (target.far ? -4 : 0);
    return { label:`${t.emoji} ${t.label} — ${cost ? cedis(cost) : 'free'}, ${hrs}h`, cls: i === 0 ? 'btn-gold' : 'btn-ghost',
      fn(){ travelTo(locId, { ...t, cost, hrs, en }); } };
  });
  const fareNote = target.far ? ' It\u2019s a long one — out-of-town fares apply.' : '';
  showModal(`<h3>To ${esc(target.short)}?</h3>
    <p class="m-body">${esc(target.blurb)}${fareNote} Pick your ride:</p>
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
  if (locId === 'tema') S.counters.tema = (S.counters.tema || 0) + 1;
  if (locId === 'aburi') S.counters.aburi = (S.counters.aburi || 0) + 1;
  if (window.World) World.placeAt(locId);
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
  maybeText(id, pick([
    'That was nice chale. We go again soon \u{1F49B}',
    'One picture from today don enter my status \u{1F4F8}\u{1F602}',
    'Safe travels — text me when you reach \u{1F49B}',
  ]), 0.5);
  if (S.friends[id] >= 80 && Math.random() < 0.5){
    const gift = ri(40, 90); earn(gift);
    setTimeout(() => toast(`${f.name} looks out`, `They insist on sending you ${cedis(gift)} for \u201Csmall support.\u201D Friends like these.`, 'good', 6000), 600);
  }
  save(); checkAchievements(); render();
}

function openLingua(){
  const rows = PHRASES.map(p => `<div class="lingua-row"><b>${esc(p.t)}</b><span>${esc(p.m)}</span></div>`).join('');
  showModal(`<h3>\u{1F5E3}\uFE0F Speak like a proper Accrian</h3>
    <p class="m-body">A pocket phrasebook — Twi essentials and street pidgin. New phrases also land in your story most mornings. Use them well, chale.</p>
    <div class="lingua-list">${rows}</div>
    ${modalButtons([{ label:'Medaase — close', cls:'btn-gold', fn:closeModal }])}`);
  bindModalButtons([{ label:'Medaase — close', cls:'btn-gold', fn:closeModal }]);
}
function bestFriend(){
  let best = Object.keys(FRIENDS)[0], v = -1;
  for (const [id, rel] of Object.entries(S.friends)){ if (rel > v){ v = rel; best = id; } }
  return { name: FRIENDS[best].name, rel: Math.round(v) };
}
function fallbackCopy(text, done){
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); }
  catch(e){ toast('Hmm', 'Your browser blocked the clipboard. Screenshot the card instead, chale.', 'bad'); }
  ta.remove();
}
function loadQR(){
  return new Promise(resolve => {
    if (window.qrcode) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
    s.onload = () => resolve(!!window.qrcode);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
    setTimeout(() => resolve(!!window.qrcode), 4000);
  });
}
function drawShareCard(withQR){
  const W = 1000, H = 1200;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const bg = x.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#173427'); bg.addColorStop(1, '#0b110d');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(500, 170, 60, 500, 170, 520);
  glow.addColorStop(0, 'rgba(242,201,76,.16)'); glow.addColorStop(1, 'rgba(242,201,76,0)');
  x.fillStyle = glow; x.fillRect(0, 0, W, H);
  // kente bands
  const cols = ['#f2c94c', '#006b3f', '#e0463f', '#1a1409'];
  const widths = [74, 48, 38, 62];
  [60, 1112].forEach(y => {
    let px = 70;
    while (px < 930){
      for (let i = 0; i < 4 && px < 930; i++){ x.fillStyle = cols[i]; x.fillRect(px, y, widths[i], 28); px += widths[i] + 8; }
    }
  });
  x.textAlign = 'center';
  x.fillStyle = '#fff8e7'; x.font = '800 84px Sora, Arial, sans-serif';
  x.fillText('Accra \u2605 Life', 500, 168);
  x.font = '96px "Segoe UI Emoji", "Noto Color Emoji", Arial, sans-serif';
  x.fillText(S.skin, 500, 300);
  x.fillStyle = '#a8b3a3'; x.font = '600 38px Inter, Arial, sans-serif';
  x.fillText(`${S.name} \u00B7 Day ${S.day} in the city`, 500, 378);
  const rows = [
    ['\u{1F4B5} Earned so far', cedis(S.counters.earned)],
    ['\u{1F35A} Waakye consumed', String(S.counters.waakye)],
    ['\u{1F389} Parties survived', String(S.counters.parties)],
    ['\u{1F50C} Dumsor nights', String(S.counters.dumsor)],
    ['\u{1F3C6} Achievements', `${Object.keys(S.ach).length} / ${ACHS.length}`],
    ['\u{1F91D} Day-one friend', `${bestFriend().name} (${bestFriend().rel}/100)`],
  ];
  let y = 456;
  rows.forEach(([k, v]) => {
    x.textAlign = 'left'; x.fillStyle = '#a8b3a3'; x.font = '500 34px Inter, Arial, sans-serif';
    x.fillText(k, 170, y);
    x.textAlign = 'right'; x.fillStyle = '#f2c94c'; x.font = '700 34px Inter, Arial, sans-serif';
    x.fillText(v, 830, y);
    y += 66;
  });
  let qrDrawn = false;
  if (withQR && window.qrcode){
    try{
      const qr = window.qrcode(0, 'M');
      qr.addData('https://gosafoosei.github.io/accra-life/');
      qr.make();
      const n = qr.getModuleCount(), size = 210, ox = (W - size) / 2, oy = 838;
      const cell = size / n;
      x.fillStyle = '#fff8e7'; x.fillRect(ox - 16, oy - 16, size + 32, size + 32);
      x.fillStyle = '#0c120e';
      for (let r = 0; r < n; r++) for (let cc = 0; cc < n; cc++){
        if (qr.isDark(r, cc)) x.fillRect(ox + cc * cell, oy + r * cell, Math.ceil(cell), Math.ceil(cell));
      }
      x.textAlign = 'center'; x.fillStyle = '#a8b3a3'; x.font = '500 30px Inter, Arial, sans-serif';
      x.fillText('scan to play \u00B7 free in your browser', 500, oy + size + 52);
      qrDrawn = true;
    }catch(e){ qrDrawn = false; }
  }
  if (!qrDrawn){
    x.textAlign = 'center'; x.fillStyle = '#f2c94c'; x.font = '700 36px Inter, Arial, sans-serif';
    x.fillText('\u25B6 play free \u00B7 gosafoosei.github.io/accra-life', 500, 950);
  }
  return c;
}
function openShare(){
  let canvas = drawShareCard(false);
  const img = canvas.toDataURL('image/png');
  const storyText = `\u{1F30D} Day ${S.day} of my Accra story — earned ${cedis(S.counters.earned)}, ate ${S.counters.waakye} plates of waakye, survived ${S.counters.dumsor} dumsor nights, ${Object.keys(S.ach).length}/${ACHS.length} achievements. Chale, come and play: https://gosafoosei.github.io/accra-life/`;
  const btns = [
    { label:'\u2B07\uFE0F Download card', cls:'btn-gold', fn(){
        const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'accra-life-story.png'; a.click();
        toast('Card saved', 'Check your downloads, chale.', 'good');
    }},
    { label:'\u{1F4CB} Copy my story text', fn(){
        const done = () => toast('Copied!', 'Your story is on the clipboard. Go and flex — responsibly.', 'good');
        if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(storyText).then(done).catch(() => fallbackCopy(storyText, done)); }
        else fallbackCopy(storyText, done);
    }},
    { label:'Close', fn:closeModal },
  ];
  showModal(`<h3>\u{1F4E4} Your Accra story, ready to flex</h3>
    <p class="m-body">A share card of your run — for the group chat, the timeline, and your future self.</p>
    <img id="share-img" class="share-img" src="${img}" alt="Your Accra Life story card">
    ${modalButtons(btns)}`);
  bindModalButtons(btns);
  // progressive enhancement: add the QR once the tiny generator loads
  loadQR().then(ok => {
    if (!ok) return;
    canvas = drawShareCard(true);
    const el = document.getElementById('share-img');
    if (el) el.src = canvas.toDataURL('image/png');
  });
}

/* ---------------- in-game phone ---------------- */
let openChatId = null;
const typing = {};
function phoneData(){
  S.phone = S.phone || { threads:{}, unread:{}, lastDay:{} };
  return S.phone;
}
function pushText(id, who, text){
  const p = phoneData();
  p.threads[id] = p.threads[id] || [];
  p.threads[id].push({ who, t:text, d:S.day, h:S.hour });
  if (p.threads[id].length > 40) p.threads[id].splice(0, p.threads[id].length - 40);
  if (who === 'them' && openChatId !== id) p.unread[id] = (p.unread[id] || 0) + 1;
}
function updatePhoneBadge(){
  const p = phoneData();
  const n = Object.values(p.unread).reduce((a, b) => a + b, 0);
  const b = $('#phone-badge');
  if (!b) return;
  b.textContent = n > 9 ? '9+' : String(n);
  b.classList.toggle('hidden', n === 0);
}
function deliverText(id, text){
  pushText(id, 'them', text);
  if (openChatId !== id) toast('\u{1F4AC} ' + FRIENDS[id].name, text, 'gold', 5200);
  updatePhoneBadge(); save();
  if (openChatId === id) renderPhoneChat(id);
}
function maybeText(id, text, prob){
  if (Math.random() > (prob === undefined ? 0.4 : prob)) return;
  deliverText(id, text);
}
function npcReply(id, text){
  const t = (text || '').toLowerCase();
  const L = FRIENDS[id].lines;
  const has = k => L[k] && L[k].length;
  if (/how far|^hi\b|hello|\byo\b|morning|sup\b|wey\b/.test(t) && has('hi')) return pick(L.hi);
  if (/link|hang|visit|\bout\b|come over|where you/.test(t) && has('link')) return pick(L.link);
  if (/waakye|food|chop|eat|hungry|jollof|banku|fish|kelewele|sobolo/.test(t) && has('food')) return pick(L.food);
  if (/money|momo|broke|cash|\bpay\b|rent|salary/.test(t) && has('money')) return pick(L.money);
  if (/party|club|detty|dance|drinks|tonight|turn up/.test(t) && has('party')) return pick(L.party);
  if (/dumsor|light|\becg\b|power|dark/.test(t) && has('dumsor')) return pick(L.dumsor);
  return pick(L.any);
}
function openPhone(){
  phoneData().unread = {};
  updatePhoneBadge(); save();
  renderPhoneList();
}
function renderPhoneList(){
  openChatId = null;
  const p = phoneData();
  const rows = Object.entries(FRIENDS).map(([id, f]) => {
    const th = p.threads[id] || [];
    const last = th[th.length - 1];
    const un = p.unread[id] || 0;
    return `<button class="chat-row" data-chat="${id}">
      <span class="chat-ava">${f.emoji}</span>
      <span class="chat-meta"><b>${f.name}</b>
        <span class="chat-prev">${last ? esc(last.who === 'me' ? 'You: ' + last.t : last.t) : 'Say hello, chale\u2026'}</span></span>
      <span class="chat-side">${last ? 'D' + last.d : ''}${un ? `<span class="chat-unread">${un}</span>` : ''}</span>
    </button>`;
  }).join('');
  showModal(`<div class="phone">
    <div class="phone-top"><span>MTN 4G \u{1F4F6}</span><span>${hourLabel(S.hour)}</span><span>\u{1F50B} ${ri(60, 92)}%</span></div>
    <div class="phone-head"><b>\u{1F4AC} Chats</b></div>
    <div class="phone-body">${rows}</div>
    <div class="phone-foot">texts are free here — bundles no dey finish</div>
  </div>`);
  document.querySelectorAll('[data-chat]').forEach(b => b.addEventListener('click', () => renderPhoneChat(b.dataset.chat)));
}
function renderPhoneChat(id){
  openChatId = id;
  const p = phoneData();
  const f = FRIENDS[id];
  const th = (p.threads[id] || []).slice(-30);
  const bubbles = th.map(m => `<div class="bub ${m.who}">${esc(m.t)}<span class="bub-meta">D${m.d} \u00B7 ${hourLabel(m.h)}</span></div>`).join('');
  const typingBub = typing[id] ? '<div class="bub them typing"><i></i><i></i><i></i></div>' : '';
  const chips = ['How far?', 'Link up later?', 'Waakye? \u{1F35A}', 'Detty season dey come \u{1F389}', 'You dey okay?'];
  showModal(`<div class="phone">
    <div class="phone-top"><span>MTN 4G \u{1F4F6}</span><span>${hourLabel(S.hour)}</span><span>\u{1F50B} ${ri(60, 92)}%</span></div>
    <div class="phone-head">
      <button class="ph-back" id="ph-back">\u2190</button>
      <span class="chat-ava small">${f.emoji}</span>
      <b>${f.name}</b>
      <button class="btn btn-gold ph-link" id="ph-link">\u{1F4CD} Link up</button>
    </div>
    <div class="phone-body" id="phone-body">${bubbles}${typingBub}</div>
    <div class="chip-row">${chips.map(c => `<button class="quick-chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="phone-input"><input id="ph-in" maxlength="80" placeholder="Text ${f.name}\u2026"><button class="btn btn-gold" id="ph-send">\u27A4</button></div>
  </div>`);
  const body = $('#phone-body'); body.scrollTop = body.scrollHeight;
  $('#ph-back').addEventListener('click', renderPhoneList);
  $('#ph-link').addEventListener('click', () => hangout(id));
  const send = () => {
    const v = ($('#ph-in').value || '').trim();
    if (!v) return;
    $('#ph-in').value = '';
    sendPlayerText(id, v);
  };
  $('#ph-send').addEventListener('click', send);
  $('#ph-in').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  document.querySelectorAll('[data-chip]').forEach(b => b.addEventListener('click', () => sendPlayerText(id, b.dataset.chip)));
  const inp = $('#ph-in'); if (inp) inp.focus();
}
function sendPlayerText(id, text){
  pushText(id, 'me', text); save();
  if (openChatId === id) renderPhoneChat(id);
  setTimeout(() => {
    typing[id] = true;
    if (openChatId === id) renderPhoneChat(id);
    setTimeout(() => {
      typing[id] = false;
      deliverText(id, npcReply(id, text));
    }, ri(900, 1900));
  }, ri(500, 1100));
}
function morningTexts(){
  phoneData();
  const sent = [];
  const send = (id, text) => {
    if ((S.phone.lastDay[id] || 0) === S.day) return;
    S.phone.lastDay[id] = S.day;
    pushText(id, 'them', text);
    sent.push(FRIENDS[id].name);
  };
  if (S.rentDue && dayOfMonth() <= 2) send('kwame', pick([
    'Rent day!! May your MoMo be strong and your landlord merciful \u{1F64F}\u{1F602}',
    'Landlord dey come o. Hide the TV, act poor \u{1F923}',
  ]));
  if (isDetty()) send('abena', pick([
    'DETTY SEASON!!! Outfit planning starts NOW \u{1F457}\u{1F525}',
    'It\u2019s Detty Season chale. Your savings dey cry but your vibes go thank you \u{1F483}',
  ]));
  if (isWeekend()) send('yaw', pick([
    'Weekend! Beach gym special — Labadi, you dey come? \u{1F3D6}\uFE0F\u{1F94A}',
    'Saturday morning training, then waves. No excuses \u{1F4AA}\u{1F3FE}',
  ]));
  const f = pick(Object.keys(FRIENDS));
  send(f, pick(FRIENDS[f].lines.hi));
  if (sent.length){
    updatePhoneBadge();
    toast('\u{1F4AC} New message' + (sent.length > 1 ? 's' : ''), sent.join(', ') + ' texted you. Tap \u{1F4F1} to read.', 'gold', 5500);
  }
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
    \u{1F6B6}\u{1F3FE} Or walk the streets yourself: WASD / arrow keys on desktop, tap anywhere on the map on mobile, then press E (or the gold button) to enter a building. Walking is free — it\u2019s good for the soul.
    \u{1F4BC} Work shifts at Airport City (weekdays only) to earn. Every 10 shifts = a raise.
    \u{1F35A} Eat before your food bar empties, or your vibes will suffer.
    \u{1F3E0} Rent is due on the 1st of every month — how much depends on the difficulty you picked (GH\u20B5 650 / 800 / 1,000). Miss it too long and the story ends.
    \u{26BD} Match days happen everywhere — even the Tema harbour has a derby.
    \u{1F50C} Dumsor hits at night. Power bank softens it; generator ends it.
    \u{1F465} Link up with friends to build your circle — good friends even send you support.
    \u{1F4AC} Your username puts you in the Town Square: chat with other real players, and DM them by username.
    \u{1F4F1} Your phone holds real chats with your people — text them anytime, they text back in character, and they text YOU first after big moments.
    \u{1F3C6} Unlock all 25 achievements. Save happens automatically in your browser.
    \u{1F9F1} Save up and upgrade your home: chamber \u2192 self-contained \u2192 Cantonments. Better sleep, better vibes.
    \u{1F454} Work shifts to climb from Office Assistant all the way to The Boss.
    \u{1F389} Every 6th month is Detty Season — parties hit harder and Accra never sleeps.
    \u{1F5E3}\uFE0F Tap \u{1F5E3}\uFE0F for the pocket phrasebook; new phrases land in your story most mornings.
    \u{1F4E4} Hit \u{1F4E4} anytime to turn your run into a share card for the group chat.

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
    const cost = a.costFn ? a.costFn() : (a.cost || 0);
    const eff = a.eff || {};
    const enCost = -(eff.en || 0);
    let disabled = false, warn = '';
    if (cost > S.money){ disabled = true; warn = `You need ${cedis(cost)}.`; }
    else if (a.need === 'groceries' && !S.groceries){ disabled = true; warn = 'Need groceries from Makola.'; }
    else if (a.need === 'laptop' && !S.items.laptop){ disabled = true; warn = 'Need a laptop + 30 book sense.'; }
    else if (a.weekdaysOnly && isWeekend()){ disabled = true; warn = 'Weekends: office closed.'; }
    else if (a.minHour !== undefined && S.hour < a.minHour){ disabled = true; warn = 'Opens at 7pm.'; }
    else if (enCost && S.en < enCost + 4){ disabled = true; warn = 'Too tired — sleep first.'; }
    let desc = a.desc;
    if (a.id === 'work') desc = `Title: ${titleOf()} · every 10 shifts = a raise.`;
    const costTag = cost ? `<span class="a-cost">${cedis(cost)}</span>` : eff.mo ? `<span class="a-cost">+GH\u20B5</span>` : '';
    return `<button class="action-btn" data-act="${a.id}" ${disabled ? 'disabled' : ''}>
      <span class="a-top"><span class="a-emoji">${a.icon}</span>${esc(a.label)}${costTag}</span>
      <p class="a-desc">${esc(desc)}</p>
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
      <span class="t-fare">${id === S.loc ? 'you dey here' : (l.far ? 'trotro GH\u20B5 25' : 'trotro GH\u20B5 6')}</span>
    </button>`).join('');
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => openTravel(b.dataset.go)));

  // log
  $('#log').innerHTML = S.log.map(e => `
    <div class="log-entry ${e.k}">
      <span class="lt">Day ${e.d} · ${hourLabel(e.h)}</span>
      <p>${esc(e.t)}</p>
    </div>`).join('') || '<p class="muted">Your story starts now…</p>';

  updatePhoneBadge();
  if (window.World) World.sync();
}

/* ---------------- creation screen ---------------- */
function renderCreate(){
  const skinRow = $('#skin-swatches');
  try {
    const prevHandle = localStorage.getItem('accraLifeHandle');
    if (prevHandle && $('#inp-handle') && !$('#inp-handle').value) $('#inp-handle').value = prevHandle;
  } catch(e){}
  skinRow.innerHTML = SKINS.map((s, i) => `<button class="swatch ${createChoice.skin === i ? 'sel' : ''}" data-skin="${i}">${s}</button>`).join('');
  $('#fit-swatches').innerHTML = FITS.map((f, i) => `<button class="swatch ${createChoice.fit === i ? 'sel' : ''}" data-fit="${i}" title="${f.label}">${f.emoji}</button>`).join('');
  $('#hustle-cards').innerHTML = HUSTLES.map((h, i) => `
    <button class="hustle-card ${createChoice.hustle === i ? 'sel' : ''}" data-hustle="${i}">
      <h4>${h.name}</h4><p>${h.desc}</p>
    </button>`).join('');
  $('#diff-cards').innerHTML = DIFFS.map((d, i) => `
    <button class="hustle-card ${createChoice.diff === i ? 'sel' : ''}" data-diff="${i}">
      <h4>${d.name}</h4><p>${d.desc}</p>
    </button>`).join('');
  document.querySelectorAll('[data-skin]').forEach(b => b.addEventListener('click', () => { createChoice.skin = +b.dataset.skin; renderCreate(); }));
  document.querySelectorAll('[data-fit]').forEach(b => b.addEventListener('click', () => { createChoice.fit = +b.dataset.fit; renderCreate(); }));
  document.querySelectorAll('[data-hustle]').forEach(b => b.addEventListener('click', () => { createChoice.hustle = +b.dataset.hustle; renderCreate(); }));
  document.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => { createChoice.diff = +b.dataset.diff; renderCreate(); }));
}

/* ---------------- boot ---------------- */
function beginGame(name, handle){
  const fit = FITS[createChoice.fit];
  S = freshState(name, SKINS[createChoice.skin], fit, HUSTLES[createChoice.hustle].id, DIFFS[createChoice.diff].id);
  if (window.Chat && handle){ S.handle = handle; Chat.setHandle(handle); }
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
    if (saved){
      S = saved;
      // backfill fields added after first release
      S.rent = S.rent || MONTH_RENT; S.decayMul = S.decayMul || 1; S.homeLevel = S.homeLevel || 0;
      S.phone = S.phone || { threads:{}, unread:{}, lastDay:{} };
      if (!S.handle){
        try { S.handle = localStorage.getItem('accraLifeHandle') || null; } catch(e){}
      }
      if (S.handle && window.Chat) Chat.init(S.handle);
      showScreen('game'); render();
    }
  });
  const saved = loadSave();
  if (saved && saved.name) $('#btn-continue').classList.remove('hidden');

  $('#btn-random-name').addEventListener('click', () => { $('#inp-name').value = pick(NAMES); });
  $('#btn-back-start').addEventListener('click', () => showScreen('start'));
  $('#btn-begin').addEventListener('click', () => {
    const name = ($('#inp-name').value || '').trim() || pick(NAMES);
    let handle = '';
    if (window.Chat){
      handle = Chat.cleanHandle($('#inp-handle') ? $('#inp-handle').value : '');
      if (!Chat.validHandle(handle)){
        const err = $('#handle-err');
        if (err) err.textContent = 'Pick a username first — 3\u201316 letters, numbers or underscores.';
        if ($('#inp-handle')) $('#inp-handle').focus();
        return;
      }
    }
    sfx('ach'); beginGame(name, handle);
  });

  const sndBtn = $('#btn-sound');
  const paintSound = () => { sndBtn.textContent = soundOn ? '\u{1F50A}' : '\u{1F507}'; };
  paintSound();
  sndBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    try { localStorage.setItem('accraLifeSound', soundOn ? '1' : '0'); } catch(e){}
    paintSound(); if (soundOn) sfx('click');
  });

  $('#btn-lingo').addEventListener('click', () => { sfx('click'); openLingua(); });
  $('#btn-chat').addEventListener('click', () => { sfx('click'); if (window.Chat) Chat.open(); });
  $('#btn-share').addEventListener('click', () => { sfx('click'); openShare(); });
  $('#btn-phone').addEventListener('click', () => { sfx('click'); openPhone(); });
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
