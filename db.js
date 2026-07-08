/* ============================================================================
   BekaWpigułce — WARSTWA DANYCH  (db.js)  — wersja 3 (czysta)
   ----------------------------------------------------------------------------
   Cała aplikacja rozmawia z danymi WYŁĄCZNIE przez globalny obiekt `DB`.

   ŹRÓDŁA DANYCH (kolejność ważności):
     1. content.js  -> window.__BWP_CONTENT__  = TREŚĆ OPUBLIKOWANA dla WSZYSTKICH
        (generujesz ją w panelu: Narzędzia → „Publikuj treść", commitujesz do repo).
     2. localStorage 'bwp_db_v3'                = Twoja lokalna kopia robocza.
     3. seed()                                  = pusty, czysty start.

   Dzięki temu: edytujesz lokalnie w panelu -> klikasz „Publikuj" -> wgrywasz
   content.js do repozytorium -> KAŻDY odwiedzający widzi nową treść. To pozwala
   z czasem podmienić środek na prawdziwe API (PHP/MySQL) bez ruszania reszty.
   ========================================================================== */

const DB = (() => {
  'use strict';

  const KEY = 'bwp_db_v3';
  const USER_KEY = 'bwp_user';
  const VOTES_KEY = 'bwp_votes';
  const POLL_KEY = 'bwp_pollvote';

  const uid = (p = 'id') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => new Date().toISOString();
  const esc = (s) => String(s == null ? '' : s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const slugify = (s) => String(s).toLowerCase()
    .replace(/ą/g,'a').replace(/ć/g,'c').replace(/ę/g,'e').replace(/ł/g,'l').replace(/ń/g,'n')
    .replace(/ó/g,'o').replace(/ś/g,'s').replace(/[żź]/g,'z')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60) || ('p-' + Date.now().toString(36));

  /* Zastępcza grafika (SVG data-URI) — kafelek bez plików i internetu. */
  function placeholder(caption = 'MEM', seed = 1) {
    const palettes = [['#1c1c1c','#FFD400'],['#1c1410','#FF3B30'],['#10171c','#FFD400'],['#161616','#34D399'],['#1a1320','#FFD400']];
    const [bg, accent] = palettes[Math.abs(seed) % palettes.length];
    const words = String(caption).toUpperCase().split(' ');
    const lines = []; let cur = '';
    words.forEach(w => { if ((cur + ' ' + w).trim().length > 16) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; });
    if (cur.trim()) lines.push(cur.trim());
    const block = lines.slice(0, 4).map((l, i) =>
      `<text x="50%" y="${46 + i * 13}%" text-anchor="middle" font-family="Archivo,Arial Black,sans-serif" font-weight="900" font-size="13" fill="#f5f5f0">${esc(l)}</text>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="${bg}"/>
      <rect x="8" y="8" width="384" height="284" fill="none" stroke="${accent}" stroke-width="4" rx="14"/>
      <circle cx="40" cy="40" r="10" fill="${accent}"/>
      ${block}
      <text x="50%" y="93%" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="900" font-size="11" letter-spacing="2" fill="${accent}">BEKAWPIGUŁCE</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------------------- CZYSTE DANE STARTOWE --------------------------- */
  function seed() {
    const cats = [
      { id: 'cat_zycie', name: 'Życie codzienne', slug: 'zycie' },
      { id: 'cat_praca', name: 'Praca i szef', slug: 'praca' },
      { id: 'cat_rodzina', name: 'Rodzina', slug: 'rodzina' },
      { id: 'cat_internet', name: 'Internet i memy', slug: 'internet' },
      { id: 'cat_zagadki', name: 'Zagadki', slug: 'zagadki' },
      { id: 'cat_klasyka', name: 'Klasyka', slug: 'klasyka' }
    ];

    const games = [
      { id: 'game_lap', code: 'lap', name: 'Złap Mema', description: 'Łap spadające emotki na czas. Klasyczna zręcznościówka.', category: 'zręcznościowe', enabled: true },
      { id: 'game_memory', code: 'memory', name: 'Mem Memory', description: 'Odkryj pary takich samych emotek. Trening pamięci.', category: 'logiczne', enabled: true },
      { id: 'game_reflex', code: 'reflex', name: 'Klikolot', description: 'Test refleksu — klikaj cel tak szybko, jak potrafisz przez 15 sekund.', category: 'refleks', enabled: true },
      { id: 'game_snake', code: 'snake', name: 'Wężyk', description: 'Klasyczny wąż. Zbieraj, rośnij i bij własny rekord.', category: 'zręcznościowe', enabled: true },
      { id: 'game_runner', code: 'runner', name: 'Motorek', description: 'Skacz nad przeszkodami i jedź jak najdalej. Liczy się dystans.', category: 'zręcznościowe', enabled: true },
      { id: 'game_saper', code: 'saper', name: 'Saper', description: 'Odkrywaj pola bez min. Klasyk logiczny z licznikiem czasu.', category: 'logiczne', enabled: true },
      { id: 'game_bloki', code: 'bloki', name: 'Bloki 10×10', description: 'Układaj klocki na planszy 10×10 i czyść linie. Serie dają bonusy — jak długo przetrwasz?', category: 'logiczne', enabled: true },
      { id: 'game_2048', code: 'g2048', name: '2048', description: 'Przesuwaj i łącz kafelki, aż zbudujesz 2048. Prosta zasada, trudny mistrz.', category: 'logiczne', enabled: true },
      { id: 'game_ubieranka', code: 'ubieranka', name: 'Ubierz Beka-ludka', description: 'Stwórz własną postać — czapki, okulary, miny, tła.', category: 'kreatywne', enabled: true }
    ];

    const quizzes = [
      { id: 'quiz_logika', title: 'Logika i zagadki', desc: 'Łamigłówki, które dzielą internet. Myśl, zanim klikniesz.', questions: [
        { q: 'Jaka liczba pasuje w ciąg: 2, 6, 12, 20, 30, ... ?', opts: ['36', '40', '42', '46'], answer: 2 },
        { q: '3 koty łapią 3 myszy w 3 minuty. Ile kotów złapie 100 myszy w 100 minut?', opts: ['3', '33', '100', '300'], answer: 0 },
        { q: 'Ile razy można odjąć 5 od liczby 25?', opts: ['Raz', 'Cztery', 'Pięć', 'Dowolnie'], answer: 0 },
        { q: 'Pociąg jedzie ze stałą prędkością 60 km/h. Ile zajmie przejechanie 60 km?', opts: ['30 minut', '1 godzina', '1,5 godziny', '2 godziny'], answer: 1 },
        { q: 'Każdy chłopiec w rodzinie ma tyle samo braci co sióstr, a każda dziewczynka ma 2× więcej braci niż sióstr. Ilu jest chłopców i dziewczynek?', opts: ['3 i 4', '4 i 3', '4 i 4', '5 i 3'], answer: 1 },
        { q: 'Co jest cięższe: kilogram pierza czy kilogram żelaza?', opts: ['Pierze', 'Żelazo', 'Tyle samo', 'Zależy od pogody'], answer: 2 },
        { q: 'Ojciec ma 4 córki, a każda z nich ma jednego brata. Ile dzieci ma ojciec?', opts: ['5', '8', '9', '4'], answer: 0 },
        { q: 'Ile pojedynczych pól ma szachownica 8×8?', opts: ['16', '32', '64', '81'], answer: 2 },
        { q: '5 maszyn robi 5 detali w 5 minut. Ile minut zajmie 100 maszynom zrobienie 100 detali?', opts: ['5', '20', '100', '500'], answer: 0 },
        { q: 'Zegar wybija 6. godzinę w 5 sekund. Ile sekund zajmie wybicie 12. godziny?', opts: ['10', '11', '12', '22'], answer: 1 }
      ]},
      { id: 'quiz_wiedza', title: 'Wiedza ogólna', desc: 'Klasyczne pytania, na których wielu się wykłada.', questions: [
        { q: 'Najwyższy szczyt świata to:', opts: ['K2', 'Mont Blanc', 'Mount Everest', 'Kilimandżaro'], answer: 2 },
        { q: 'Ile planet jest w Układzie Słonecznym?', opts: ['7', '8', '9', '10'], answer: 1 },
        { q: 'Pierwiastek chemiczny o symbolu Au to:', opts: ['Srebro', 'Złoto', 'Miedź', 'Glin'], answer: 1 },
        { q: 'Stolicą Australii jest:', opts: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 2 },
        { q: 'Ile to jest 15% z 200?', opts: ['15', '20', '30', '45'], answer: 2 },
        { q: 'Największy ocean na Ziemi to:', opts: ['Atlantycki', 'Spokojny', 'Indyjski', 'Arktyczny'], answer: 1 },
        { q: 'Autorem „Pana Tadeusza" jest:', opts: ['Juliusz Słowacki', 'Adam Mickiewicz', 'Henryk Sienkiewicz', 'Cyprian Norwid'], answer: 1 },
        { q: 'Ile kości ma dorosły człowiek?', opts: ['106', '206', '306', '406'], answer: 1 },
        { q: 'Prędkość światła w próżni wynosi około:', opts: ['3 000 km/s', '30 000 km/s', '300 000 km/s', '3 000 000 km/s'], answer: 2 },
        { q: 'W którym roku wybuchła II wojna światowa?', opts: ['1914', '1918', '1939', '1945'], answer: 2 }
      ]},
      { id: 'quiz_polska', title: 'Polska — ciekawostki', desc: 'Ile naprawdę wiesz o własnym kraju?', questions: [
        { q: 'Najdłuższa rzeka w Polsce to:', opts: ['Odra', 'Wisła', 'Warta', 'Bug'], answer: 1 },
        { q: 'Najwyższy szczyt Polski to:', opts: ['Śnieżka', 'Rysy', 'Babia Góra', 'Giewont'], answer: 1 },
        { q: 'Ile województw ma Polska?', opts: ['14', '15', '16', '17'], answer: 2 },
        { q: 'Dwukrotną noblistką, fizykiem i chemikiem, była:', opts: ['Maria Skłodowska-Curie', 'Irena Sendler', 'Wisława Szymborska', 'Olga Tokarczuk'], answer: 0 },
        { q: 'Nad jakim morzem leży Polska?', opts: ['Czarnym', 'Bałtyckim', 'Północnym', 'Śródziemnym'], answer: 1 },
        { q: 'Stolicą Polski przed Warszawą był:', opts: ['Kraków', 'Poznań', 'Wrocław', 'Łódź'], answer: 0 },
        { q: 'Pierwszą historyczną stolicą Polski było:', opts: ['Gniezno', 'Kraków', 'Poznań', 'Toruń'], answer: 0 },
        { q: 'Ile liter ma polski alfabet?', opts: ['26', '30', '32', '35'], answer: 2 },
        { q: 'W którym roku miał miejsce chrzest Polski?', opts: ['966', '1000', '1025', '1410'], answer: 0 },
        { q: 'Polska waluta to:', opts: ['Korona', 'Złoty', 'Forint', 'Euro'], answer: 1 }
      ]},
      { id: 'quiz_emoji', title: 'Zgadnij po emoji', desc: 'Trzy emotki = jedno hasło. Proste? Zobaczymy przy pytaniu 7.', questions: [
        { q: '🌧️ + ☂️ + 🚌 — co to za sytuacja?', opts: ['Wakacje', 'Poniedziałek rano', 'Grill u wujka', 'Sylwester'], answer: 1 },
        { q: '🍕 + 🎮 + 🌙 — czyli klasyczny…', opts: ['Poranek sportowca', 'Wieczór singla', 'Obiad u babci', 'Trening'], answer: 1 },
        { q: '👨‍💼 + 📞 + 😱 — kto dzwoni?', opts: ['Kurier', 'Mama', 'Szef', 'Telemarketer'], answer: 2 },
        { q: '🧦 + 🕳️ + 🚶 — co się stało?', opts: ['Dziura w skarpecie', 'Zgubiony but', 'Nowe adidasy', 'Pranie się skurczyło'], answer: 0 },
        { q: '🛒 + 💸 + 😭 — gdzie jesteś?', opts: ['Na siłowni', 'W Biedronce przed wypłatą', 'Na wakacjach', 'U dentysty'], answer: 1 },
        { q: '🐔 + 🥣 + 👵 — niedzielny klasyk to…', opts: ['Pizza', 'Sushi', 'Rosół u babci', 'Kebab'], answer: 2 },
        { q: '🚗 + 🐌 + 😤 — co to?', opts: ['Wyścig', 'Korek do pracy', 'Jazda próbna', 'Autostrada nocą'], answer: 1 },
        { q: '📱 + 🔋 + 1️⃣ — jaki to stan?', opts: ['Nowy telefon', '1% baterii i panika', 'Tryb samolotowy', 'Pełne ładowanie'], answer: 1 },
        { q: '🛏️ + ⏰ + 🔁 — co robisz?', opts: ['Wstajesz od razu', 'Drzemka co 5 minut', 'Ścielisz łóżko', 'Biegasz rano'], answer: 1 },
        { q: '🍟 + 🤫 + 🚗 — czyli…', opts: ['Dieta', 'Frytki zjedzone w aucie, zanim dojedziesz do domu', 'Piknik', 'Wesele'], answer: 1 }
      ]},
      { id: 'quiz_pf', title: 'Prawda czy fałsz?', desc: 'Ciekawostki, w które trudno uwierzyć. Połowa ludzi strzela źle.', questions: [
        { q: 'Miód praktycznie nigdy się nie psuje.', opts: ['Prawda', 'Fałsz'], answer: 0 },
        { q: 'Banany rosną na drzewach.', opts: ['Prawda', 'Fałsz — bananowiec to zioło'], answer: 1 },
        { q: 'Ośmiornica ma trzy serca.', opts: ['Prawda', 'Fałsz'], answer: 0 },
        { q: 'Wielki Mur Chiński widać gołym okiem z kosmosu.', opts: ['Prawda', 'Fałsz'], answer: 1 },
        { q: 'Błyskawica jest gorętsza niż powierzchnia Słońca.', opts: ['Prawda', 'Fałsz'], answer: 0 },
        { q: 'Człowiek połyka we śnie średnio 8 pająków rocznie.', opts: ['Prawda', 'Fałsz — to miejska legenda'], answer: 1 },
        { q: 'Krowy mają najlepsze przyjaciółki i stresują się rozłąką.', opts: ['Prawda', 'Fałsz'], answer: 0 },
        { q: 'Złota rybka pamięta tylko 3 sekundy.', opts: ['Prawda', 'Fałsz — pamięta miesiącami'], answer: 1 },
        { q: 'W Szkocji narodowym zwierzęciem jest jednorożec.', opts: ['Prawda', 'Fałsz'], answer: 0 },
        { q: 'Wenus ma dobę dłuższą niż rok.', opts: ['Prawda', 'Fałsz'], answer: 0 }
      ]}
    ];

    const polls = [{
      id: 'poll_main', question: 'Co najbardziej rujnuje poniedziałek?', active: true,
      options: [
        { label: 'Budzik o 6:00', votes: 0 },
        { label: 'Korek do pracy', votes: 0 },
        { label: 'Pierwsza kawa = zimna', votes: 0 },
        { label: 'Maile od szefa', votes: 0 }
      ]
    }];

    const challenges = [
      { id: 'ch_mem', title: 'Mem tygodnia', description: 'Wrzuć swojego mema do poczekalni. Najlepszy ląduje na stronie i na naszym Facebooku.', cta: 'Wrzuć mema', link: 'memy.html#dodaj', active: true }
    ];

    const ads = [
      { id: 'ad_top', slot: 'top', html: '', link: '', active: false },
      { id: 'ad_sidebar', slot: 'sidebar', html: '', link: '', active: false },
      { id: 'ad_feed', slot: 'in-feed', html: '', link: '', active: false },
      { id: 'ad_footer', slot: 'footer', html: '', link: '', active: false }
    ];

    return {
      version: 3,
      published_at: '',
      settings: {
        site_name: 'BekaWpigułce',
        tagline: 'Codzienna dawka humoru 🔥',
        fb_page_url: 'https://www.facebook.com/Bekawpigulce',
        fb_page_name: 'BekaWpigułce',
        fb_app_id: '',
        tiktok_url: 'https://www.tiktok.com/@bekawpigulce',
        admin_pass: 'beka2026',
        banner_text: '',
        adsense_client: '',
        mem_of_day_id: null
      },
      categories: cats,
      memes: [],
      videos: [],
      comments: [],
      users: [],
      games,
      quizzes,
      challenges,
      polls,
      ads,
      answers: [],
      reports: [],
      reactions: { fire: 0, wow: 0, heart: 0, poop: 0 }
    };
  }

  /* Uzupełnia brakujące kolekcje (gdy stary content.js nie ma np. answers). */
  function withDefaults(d) {
    const s = seed();
    const out = Object.assign({}, s, d);
    out.settings = Object.assign({}, s.settings, d.settings || {});
    ['categories','memes','videos','comments','users','games','quizzes','challenges','polls','ads','answers','reports'].forEach(k => {
      if (!Array.isArray(out[k])) out[k] = s[k];
    });
    out.reactions = Object.assign({}, s.reactions, d.reactions || {});
    out.version = 3;
    return out;
  }

  function externalContent() {
    try { return (typeof window !== 'undefined' && window.__BWP_CONTENT__ && window.__BWP_CONTENT__.version) ? window.__BWP_CONTENT__ : null; }
    catch (e) { return null; }
  }

  /* --- ładowanie / zapis ------------------------------------------------- */
  function load() {
    const ext = externalContent();
    let local = null;
    try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); if (d.version) local = d; } } catch (e) {}
    let base;
    if (ext && (!local || String(ext.published_at || '') > String(local.published_at || ''))) base = ext;
    else base = local || ext || seed();
    base = withDefaults(base);
    try { localStorage.setItem(KEY, JSON.stringify(base)); } catch (e) {}
    return base;
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  /* ====================== PUBLICZNE API (DB.*) ========================== */
  const settings = {
    get: () => ({ ...state.settings }),
    update(patch) { Object.assign(state.settings, patch); save(); }
  };

  const categories = {
    all: () => state.categories.slice(),
    name: (slug) => (state.categories.find(c => c.slug === slug) || {}).name || slug,
    add(name) { const c = { id: uid('cat'), name, slug: slugify(name) }; state.categories.push(c); save(); return c; },
    remove(id) { state.categories = state.categories.filter(c => c.id !== id); save(); }
  };

  const memes = {
    all: () => state.memes.slice(),
    approved: () => state.memes.filter(m => m.status === 'approved'),
    pending: () => state.memes.filter(m => m.status === 'pending'),
    featured: () => state.memes.filter(m => m.status === 'approved' && m.featured),
    byId: (id) => state.memes.find(m => m.id === id),
    score: (m) => (m.votes_up || 0) - (m.votes_down || 0),
    top(n = 5) { return memes.approved().sort((a, b) => memes.score(b) - memes.score(a)).slice(0, n); },
    random() { const a = memes.approved(); return a[Math.floor(Math.random() * a.length)]; },
    memOfDay() { return memes.byId(state.settings.mem_of_day_id) || memes.top(1)[0] || null; },
    submit({ image, caption, author, category = 'internet', tags = [] }) {
      const m = { id: uid('mem'), image: image || placeholder(caption || 'MEM', state.memes.length),
        caption: caption || '', author: author || 'anonim',
        category, tags: Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean),
        created_at: now(), status: 'pending', votes_up: 0, votes_down: 0, featured: false };
      state.memes.unshift(m); save(); return m;
    },
    approve(id) { const m = memes.byId(id); if (m) { m.status = 'approved'; save(); } return m; },
    reject(id) { const m = memes.byId(id); if (m) { m.status = 'rejected'; save(); } return m; },
    toggleFeatured(id) { const m = memes.byId(id); if (m) { m.featured = !m.featured; save(); } return m; },
    setMemOfDay(id) { state.settings.mem_of_day_id = id; save(); },
    remove(id) { state.memes = state.memes.filter(m => m.id !== id); state.comments = state.comments.filter(c => c.meme_id !== id); save(); },
    vote(id, dir) {
      const voted = JSON.parse(localStorage.getItem(VOTES_KEY) || '{}');
      if (voted[id]) return { ok: false, reason: 'already' };
      const m = memes.byId(id); if (!m) return { ok: false };
      if (dir === 'up') m.votes_up++; else m.votes_down++;
      voted[id] = dir; localStorage.setItem(VOTES_KEY, JSON.stringify(voted)); save();
      return { ok: true, meme: m };
    },
    myVote: (id) => (JSON.parse(localStorage.getItem(VOTES_KEY) || '{}'))[id] || null
  };

  const comments = {
    forMeme: (id) => state.comments.filter(c => c.meme_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    add(meme_id, body, author) { const c = { id: uid('cmt'), meme_id, body, author: author || 'anonim', created_at: now() }; state.comments.push(c); save(); return c; },
    remove(id) { state.comments = state.comments.filter(c => c.id !== id); save(); },
    count: () => state.comments.length
  };

  const videos = {
    all: () => state.videos.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)),
    byCategory: (slug) => slug ? videos.all().filter(v => v.category === slug) : videos.all(),
    add({ title, description, youtube, category = 'klasyka' }) {
      const v = { id: uid('vid'), title, description, youtube: extractYouTube(youtube), category, created_at: now() };
      state.videos.unshift(v); save(); return v;
    },
    remove(id) { state.videos = state.videos.filter(v => v.id !== id); save(); }
  };

  const games = {
    all: () => state.games.slice(),
    enabled: () => state.games.filter(g => g.enabled),
    toggle(id) { const g = state.games.find(x => x.id === id); if (g) { g.enabled = !g.enabled; save(); } },
    add({ name, description, category, code }) { const g = { id: uid('game'), name, description, category, code: code || 'lap', enabled: true }; state.games.push(g); save(); return g; },
    remove(id) { state.games = state.games.filter(g => g.id !== id); save(); }
  };

  const quizzes = {
    all: () => state.quizzes.slice(),
    main: () => state.quizzes[0],
    byId: (id) => state.quizzes.find(q => q.id === id),
    add(title) { const q = { id: uid('quiz'), title: title || 'Nowy quiz', desc: '', questions: [] }; state.quizzes.push(q); save(); return q; },
    update(id, data) { const i = state.quizzes.findIndex(q => q.id === id); if (i >= 0) { state.quizzes[i] = { ...state.quizzes[i], ...data }; save(); } },
    remove(id) { state.quizzes = state.quizzes.filter(q => q.id !== id); save(); }
  };

  const challenges = {
    active: () => state.challenges.filter(c => c.active),
    all: () => state.challenges.slice(),
    add({ title, description, cta, link }) { const c = { id: uid('ch'), title, description, cta: cta || 'Sprawdź', link: link || '#', active: true }; state.challenges.push(c); save(); return c; },
    remove(id) { state.challenges = state.challenges.filter(c => c.id !== id); save(); }
  };

  const polls = {
    main: () => state.polls.find(p => p.active) || state.polls[0],
    update(id, data) { const p = state.polls.find(x => x.id === id); if (p) { Object.assign(p, data); save(); } },
    vote(id, optionIndex) {
      const done = JSON.parse(localStorage.getItem(POLL_KEY) || '{}');
      if (done[id]) return { ok: false, reason: 'already' };
      const p = state.polls.find(x => x.id === id); if (!p || !p.options[optionIndex]) return { ok: false };
      p.options[optionIndex].votes++; done[id] = optionIndex; localStorage.setItem(POLL_KEY, JSON.stringify(done)); save();
      return { ok: true, poll: p };
    },
    myVote: (id) => (JSON.parse(localStorage.getItem(POLL_KEY) || '{}'))[id],
    resetVotes(id) { const p = state.polls.find(x => x.id === id); if (p) { p.options.forEach(o => o.votes = 0); save(); } const d = JSON.parse(localStorage.getItem(POLL_KEY) || '{}'); delete d[id]; localStorage.setItem(POLL_KEY, JSON.stringify(d)); }
  };

  /* ---------------------- ODPOWIEDZI (lejek z FB) ------------------------ */
  const answers = {
    all: () => state.answers.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
    published: () => answers.all().filter(a => a.published),
    byId: (id) => state.answers.find(a => a.id === id),
    bySlug: (slug) => state.answers.find(a => a.slug === slug),
    find: (key) => answers.byId(key) || answers.bySlug(key),
    add({ title, question, answer, explain, image, source_fb, published = true }) {
      const a = { id: uid('ans'), slug: slugify(title || question || 'odpowiedz'),
        title: title || '', question: question || '', answer: answer || '', explain: explain || '',
        image: image || '', source_fb: source_fb || '', published: !!published, created_at: now() };
      // unikalny slug
      let s = a.slug, n = 2; while (state.answers.some(x => x.slug === s)) { s = a.slug + '-' + n++; } a.slug = s;
      state.answers.unshift(a); save(); return a;
    },
    update(id, data) { const i = state.answers.findIndex(a => a.id === id); if (i >= 0) { state.answers[i] = { ...state.answers[i], ...data }; save(); } return state.answers[i]; },
    remove(id) { state.answers = state.answers.filter(a => a.id !== id); save(); }
  };

  const ads = {
    all: () => state.ads.slice(),
    bySlot: (slot) => state.ads.find(a => a.slot === slot),
    update(slot, data) { const a = state.ads.find(x => x.slot === slot); if (a) { Object.assign(a, data); save(); } }
  };

  const reactions = {
    get: () => ({ ...state.reactions }),
    add(kind) { if (kind in state.reactions) { state.reactions[kind]++; save(); } return reactions.get(); }
  };

  const users = {
    all: () => state.users.slice(),
    count: () => state.users.length,
    current() { try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; } catch (e) { return null; } },
    login(name, avatar = '🙂', email = '') {
      let u = state.users.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (!u) { u = { id: uid('usr'), name, email, avatar, created_at: now(), role: 'user' }; state.users.push(u); save(); }
      localStorage.setItem(USER_KEY, JSON.stringify({ id: u.id, name: u.name, avatar: u.avatar }));
      return u;
    },
    logout() { localStorage.removeItem(USER_KEY); }
  };

  /* ---- ULUBIONE (per przeglądarka, jak głosy) --------------------------- */
  const FAV_KEY = 'bwp_favs';
  const favorites = {
    _all() { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || {}; } catch (e) { return {}; } },
    has: (id) => !!favorites._all()[id],
    toggle(id) {
      const f = favorites._all();
      if (f[id]) delete f[id]; else f[id] = 1;
      try { localStorage.setItem(FAV_KEY, JSON.stringify(f)); } catch (e) {}
      return !!f[id];
    },
    list: () => Object.keys(favorites._all()).map(id => memes.byId(id)).filter(Boolean),
    count: () => Object.keys(favorites._all()).length
  };

  /* ---- ZGŁOSZENIA nieodpowiednich treści -------------------------------- */
  const REP_KEY = 'bwp_reported';
  const reports = {
    all: () => state.reports.slice(),
    forMeme: (id) => state.reports.filter(r => r.meme_id === id),
    count: () => state.reports.length,
    alreadyByMe(id) { try { return !!(JSON.parse(localStorage.getItem(REP_KEY)) || {})[id]; } catch (e) { return false; } },
    add(meme_id, reason = 'inne') {
      if (reports.alreadyByMe(meme_id)) return { ok: false, reason: 'already' };
      state.reports.push({ id: uid('rep'), meme_id, reason, created_at: now() }); save();
      try {
        const mine = JSON.parse(localStorage.getItem(REP_KEY) || '{}'); mine[meme_id] = 1;
        localStorage.setItem(REP_KEY, JSON.stringify(mine));
      } catch (e) {}
      return { ok: true };
    },
    clear(meme_id) { state.reports = state.reports.filter(r => r.meme_id !== meme_id); save(); }
  };

  /* ---- REPUTACJA autora: suma wyniku zatwierdzonych memów + bonusy ------ */
  function reputation(author) {
    if (!author) return { points: 0, memes: 0, level: 'Świeżak' };
    const mine = memes.approved().filter(m => (m.author || '').toLowerCase() === author.toLowerCase());
    const pts = mine.reduce((s, m) => s + Math.max(0, memes.score(m)) * 2 + 5, 0)
      + state.comments.filter(c => (c.author || '').toLowerCase() === author.toLowerCase()).length;
    const level = pts >= 500 ? 'Legenda beki 👑' : pts >= 200 ? 'Mistrz memów 🔥' : pts >= 60 ? 'Beka-wyjadacz 😎' : pts > 0 ? 'Rozkręcasz się 🙂' : 'Świeżak';
    return { points: pts, memes: mine.length, level };
  }

  function stats() {
    const up = state.memes.reduce((s, m) => s + (m.votes_up || 0), 0);
    const down = state.memes.reduce((s, m) => s + (m.votes_down || 0), 0);
    return {
      memes_total: state.memes.length, memes_approved: memes.approved().length, memes_pending: memes.pending().length,
      users: state.users.length, comments: state.comments.length, videos: state.videos.length,
      answers: state.answers.length, answers_pub: answers.published().length,
      votes_up: up, votes_down: down, votes_total: up + down, top: memes.top(5)
    };
  }

  const raw = {
    reset() { localStorage.removeItem(KEY); state = load(); },
    export: () => JSON.stringify(state, null, 2),
    import(json) { try { state = withDefaults(JSON.parse(json)); save(); return true; } catch (e) { return false; } },
    /* Generuje zawartość pliku content.js do wgrania do repozytorium. */
    exportContent() {
      const data = withDefaults(JSON.parse(JSON.stringify(state)));
      data.published_at = now();
      state.published_at = data.published_at; save();
      return '/* BekaWpigułce — TREŚĆ OPUBLIKOWANA. Wygenerowane z panelu (Narzędzia → Publikuj).\n'
        + '   Wgraj ten plik do repozytorium GitHub (nadpisz istniejący content.js) i gotowe —\n'
        + '   każdy odwiedzający zobaczy tę treść. NIE edytuj ręcznie. */\n'
        + 'window.__BWP_CONTENT__ = ' + JSON.stringify(data) + ';\n';
    }
  };

  function extractYouTube(url = '') {
    const m = String(url).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : (String(url).length === 11 ? url : url);
  }

  return {
    settings, categories, memes, comments, videos, games, quizzes,
    challenges, polls, answers, ads, reactions, users, stats, raw,
    favorites, reports, reputation,
    util: { uid, now, esc, slugify, placeholder, extractYouTube }
  };
})();
