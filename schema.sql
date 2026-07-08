-- ============================================================================
--  BekaWpigułce — SCHEMAT BAZY DANYCH (MySQL / MariaDB)
--  ---------------------------------------------------------------------------
--  Ten plik to mapa przejścia z wersji „localStorage" na prawdziwy backend.
--  Każda tabela odpowiada 1:1 obiektowi z js/db.js, więc gdy podmienisz środek
--  warstwy DB na zapytania SQL (PHP/Node/itp.), reszta strony NIE wymaga zmian.
--
--  Kodowanie: utf8mb4 (pełne wsparcie polskich znaków i emoji 🔥).
--  Uruchomienie:  mysql -u root -p < schema.sql
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS bekawpigulce
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bekawpigulce;

-- ----------------------------------------------------------------------------
-- USTAWIENIA — pojedynczy wiersz konfiguracji (odpowiada DB.settings)
-- Trzymamy jako pary klucz-wartość: elastyczne i łatwe do rozszerzenia.
-- ----------------------------------------------------------------------------
CREATE TABLE settings (
  `key`   VARCHAR(64)  NOT NULL PRIMARY KEY,
  `value` TEXT         NULL
) ENGINE=InnoDB;

INSERT INTO settings (`key`, `value`) VALUES
  ('site_name',      'BekaWpigułce'),
  ('tagline',        'Codzienna dawka humoru 🔥'),
  ('fb_page_url',    'https://www.facebook.com/Bekawpigulce'),
  ('fb_page_name',   'BekaWpigułce'),
  ('fb_app_id',      ''),
  ('tiktok_url',     'https://www.tiktok.com/@bekawpigulce'),
  ('admin_pass',     'beka2026'),   -- ZMIEŃ! a docelowo trzymaj jako HASH (patrz niżej)
  ('banner_text',    ''),
  ('adsense_client', ''),
  ('mem_of_day_id',  NULL);

-- ----------------------------------------------------------------------------
-- KATEGORIE (DB.categories)
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
  id   VARCHAR(40)  NOT NULL PRIMARY KEY,
  name VARCHAR(80)  NOT NULL,
  slug VARCHAR(80)  NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO categories (id, name, slug) VALUES
  ('cat_zycie',   'Życie codzienne', 'zycie'),
  ('cat_praca',   'Praca i szef',    'praca'),
  ('cat_rodzina', 'Rodzina',         'rodzina'),
  ('cat_internet','Internet i memy', 'internet'),
  ('cat_klasyka', 'Klasyka',         'klasyka');

-- ----------------------------------------------------------------------------
-- UŻYTKOWNICY (DB.users)
-- role: 'admin' | 'user'. avatar = emoji lub URL.
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id         VARCHAR(40)  NOT NULL PRIMARY KEY,
  name       VARCHAR(80)  NOT NULL,
  email      VARCHAR(160) NULL,
  avatar     VARCHAR(255) NULL,
  role       ENUM('admin','user') NOT NULL DEFAULT 'user',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_name (name)
) ENGINE=InnoDB;

-- Brak przykładowych użytkowników i danych kontaktowych (czysty start).
-- Użytkownicy tworzą się sami przy pierwszym logowaniu (nick lub Facebook).

-- ----------------------------------------------------------------------------
-- MEMY (DB.memes)  — serce serwisu
-- status: 'approved' (na stronie) | 'pending' (poczekalnia) | 'rejected'
-- featured: czy pokazywać w sekcji „Polecane".
-- image: URL pliku albo data-URI (w wersji bez serwera). Na backendzie zalecane
--        trzymać ścieżkę do pliku w /uploads, a nie całą grafikę w bazie.
-- ----------------------------------------------------------------------------
CREATE TABLE memes (
  id         VARCHAR(40)  NOT NULL PRIMARY KEY,
  image      MEDIUMTEXT   NOT NULL,
  caption    VARCHAR(280) NULL,
  author     VARCHAR(80)  NOT NULL DEFAULT 'anonim',
  category   VARCHAR(80)  NULL,
  status     ENUM('approved','pending','rejected') NOT NULL DEFAULT 'pending',
  featured   TINYINT(1)   NOT NULL DEFAULT 0,
  votes_up   INT          NOT NULL DEFAULT 0,
  votes_down INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_memes_status (status),
  INDEX idx_memes_category (category),
  INDEX idx_memes_created (created_at),
  CONSTRAINT fk_memes_category FOREIGN KEY (category) REFERENCES categories(slug)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- TAGI memów — relacja wiele-do-wielu (w localStorage tag siedzi w tablicy mema)
-- ----------------------------------------------------------------------------
CREATE TABLE meme_tags (
  meme_id VARCHAR(40) NOT NULL,
  tag     VARCHAR(60) NOT NULL,
  PRIMARY KEY (meme_id, tag),
  INDEX idx_tag (tag),
  CONSTRAINT fk_tag_meme FOREIGN KEY (meme_id) REFERENCES memes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- GŁOSY na memy (DB.memes.vote) — kto/skąd zagłosował (ochrona przed spamem)
-- W wersji przeglądarkowej to klucz 'bwp_votes'. Na serwerze: po user_id lub IP.
-- ----------------------------------------------------------------------------
CREATE TABLE meme_votes (
  meme_id   VARCHAR(40) NOT NULL,
  voter     VARCHAR(80) NOT NULL,           -- user_id albo hash IP
  direction ENUM('up','down') NOT NULL,
  created_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (meme_id, voter),
  CONSTRAINT fk_vote_meme FOREIGN KEY (meme_id) REFERENCES memes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- KOMENTARZE (DB.comments)
-- ----------------------------------------------------------------------------
CREATE TABLE comments (
  id         VARCHAR(40)  NOT NULL PRIMARY KEY,
  meme_id    VARCHAR(40)  NOT NULL,
  author     VARCHAR(80)  NOT NULL DEFAULT 'anonim',
  body       VARCHAR(600) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comments_meme (meme_id),
  CONSTRAINT fk_comments_meme FOREIGN KEY (meme_id) REFERENCES memes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- FILMY (DB.videos)  — youtube = 11-znakowe ID filmu
-- ----------------------------------------------------------------------------
CREATE TABLE videos (
  id          VARCHAR(40)  NOT NULL PRIMARY KEY,
  title       VARCHAR(160) NOT NULL,
  description VARCHAR(400) NULL,
  youtube     VARCHAR(20)  NOT NULL,
  category    VARCHAR(80)  NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_videos_category (category)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- GRY (DB.games)  — code wskazuje silnik mini-gry w js/rozrywka.js
--   ('lap' | 'memory' | 'reflex' | 'quiz')
-- ----------------------------------------------------------------------------
CREATE TABLE games (
  id          VARCHAR(40)  NOT NULL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  description VARCHAR(400) NULL,
  category    VARCHAR(80)  NULL,
  code        VARCHAR(40)  NOT NULL DEFAULT 'lap',
  enabled     TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO games (id, name, description, category, code, enabled) VALUES
  ('game_lap',    'Złap Mema', 'Łap spadające memy zanim uciekną. Klasyczna zręcznościówka na czas.', 'zręcznościowe', 'lap', 1),
  ('game_memory', 'Mem Memory','Odkryj pary takich samych emotek. Trening pamięci w stylu beki.', 'logiczne', 'memory', 1),
  ('game_reflex', 'Klikolot',  'Test refleksu — klikaj cel tak szybko, jak potrafisz przez 15 sekund.', 'refleks', 'reflex', 1),
  ('game_quiz',   'Quiz Beki', 'Pytania o polskie memy i absurdy życia. Sprawdź ile wiesz.', 'wiedza', 'quiz', 1);

-- ----------------------------------------------------------------------------
-- QUIZY i PYTANIA (DB.quizzes)
-- Pytanie ma listę opcji (poniżej) i indeks poprawnej odpowiedzi.
-- ----------------------------------------------------------------------------
CREATE TABLE quizzes (
  id    VARCHAR(40)  NOT NULL PRIMARY KEY,
  title VARCHAR(160) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE quiz_questions (
  id          VARCHAR(40) NOT NULL PRIMARY KEY,
  quiz_id     VARCHAR(40) NOT NULL,
  question    VARCHAR(400) NOT NULL,
  answer_index TINYINT     NOT NULL DEFAULT 0,   -- która opcja jest poprawna
  position    INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_qq_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE quiz_options (
  id          VARCHAR(40) NOT NULL PRIMARY KEY,
  question_id VARCHAR(40) NOT NULL,
  label       VARCHAR(200) NOT NULL,
  position    TINYINT     NOT NULL DEFAULT 0,
  CONSTRAINT fk_qo_q FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO quizzes (id, title) VALUES
  ('quiz_main', 'Quiz Beki — wersja podstawowa');

-- ----------------------------------------------------------------------------
-- WYZWANIA / KONKURSY (DB.challenges)
-- ----------------------------------------------------------------------------
CREATE TABLE challenges (
  id          VARCHAR(40)  NOT NULL PRIMARY KEY,
  title       VARCHAR(160) NOT NULL,
  description VARCHAR(500) NULL,
  cta         VARCHAR(80)  NULL,
  link        VARCHAR(255) NULL,
  active      TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO challenges (id, title, description, cta, link, active) VALUES
  ('ch_week',  'Mem tygodnia', 'Wrzuć swojego mema w poczekalnię. Najlepszy ląduje na stronie głównej i na naszym Facebooku.', 'Wrzuć mema', 'memy.html#dodaj', 1),
  ('ch_3words','Wyzwanie: 3 słowa', 'Opisz swój poniedziałek w 3 słowach w komentarzu pod memem dnia. Najśmieszniejsze przypinamy.', 'Zobacz mem dnia', 'index.html#memdnia', 1);

-- ----------------------------------------------------------------------------
-- SONDY (DB.polls) + OPCJE
-- ----------------------------------------------------------------------------
CREATE TABLE polls (
  id       VARCHAR(40)  NOT NULL PRIMARY KEY,
  question VARCHAR(300) NOT NULL,
  active   TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE poll_options (
  id       VARCHAR(40)  NOT NULL PRIMARY KEY,
  poll_id  VARCHAR(40)  NOT NULL,
  label    VARCHAR(160) NOT NULL,
  votes    INT          NOT NULL DEFAULT 0,
  position TINYINT      NOT NULL DEFAULT 0,
  CONSTRAINT fk_po_poll FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO polls (id, question, active) VALUES
  ('poll_main', 'Co najbardziej rujnuje poniedziałek?', 1);
INSERT INTO poll_options (id, poll_id, label, votes, position) VALUES
  ('po_1', 'poll_main', 'Budzik o 6:00',        41, 0),
  ('po_2', 'poll_main', 'Korek do pracy',       28, 1),
  ('po_3', 'poll_main', 'Pierwsza kawa = zimna',17, 2),
  ('po_4', 'poll_main', 'Maile od szefa',       33, 3);

-- ----------------------------------------------------------------------------
-- REKLAMY (DB.ads) — 4 sloty na stronie
-- slot: 'top' | 'sidebar' | 'in-feed' | 'footer'
-- ----------------------------------------------------------------------------
CREATE TABLE ads (
  id     VARCHAR(40)  NOT NULL PRIMARY KEY,
  slot   VARCHAR(40)  NOT NULL UNIQUE,
  html   TEXT         NULL,
  link   VARCHAR(255) NULL,
  active TINYINT(1)   NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT INTO ads (id, slot, html, link, active) VALUES
  ('ad_top',     'top',     '', '', 0),
  ('ad_sidebar', 'sidebar', '', '', 0),
  ('ad_feed',    'in-feed', '', '', 0),
  ('ad_footer',  'footer',  '', '', 0);

-- ----------------------------------------------------------------------------
-- REAKCJE (DB.reactions) — liczniki „szybkich emocji" na stronie głównej
-- ----------------------------------------------------------------------------
CREATE TABLE reactions (
  kind  VARCHAR(20) NOT NULL PRIMARY KEY,   -- fire | wow | heart | poop
  count INT         NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT INTO reactions (kind, count) VALUES
  ('fire', 128), ('wow', 64), ('heart', 91), ('poop', 12);

-- ----------------------------------------------------------------------------
-- ZAPIS NA NEWSLETTER (z formularza na stronie głównej, klucz 'bwp_subs')
-- ----------------------------------------------------------------------------
CREATE TABLE subscribers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(160) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
--  WIDOK: POCZEKALNIA — szybki podgląd memów czekających na moderację.
--  Używany przez panel admina (zakładka „Poczekalnia").
-- ============================================================================
CREATE OR REPLACE VIEW pending_memes AS
  SELECT id, caption, author, category, created_at
  FROM memes
  WHERE status = 'pending'
  ORDER BY created_at DESC;

-- ============================================================================
--  PRZYKŁADOWE MEMY (kilka „na stronie" + dwa w poczekalni)
--  W realnej bazie pole image to ścieżka do pliku, np. '/uploads/mem1.jpg'.
-- ============================================================================
INSERT INTO memes (id, image, caption, author, category, status, featured, votes_up, votes_down) VALUES
  ('mem_1', '/uploads/mem1.jpg', 'Poniedziałek o 6:00 vs ja', 'BekaWpigułce', 'praca', 'approved', 1, 312, 11),
  ('mem_2', '/uploads/mem2.jpg', 'Gdy mama mówi "tylko jeden sklep"', 'BekaWpigułce', 'rodzina', 'approved', 1, 287, 9),
  ('mem_3', '/uploads/mem3.jpg', 'Konto przed wypłatą vs po', 'BekaWpigułce', 'zycie', 'approved', 1, 251, 7),
  ('mem_4', '/uploads/mem4.jpg', 'Szef: "to na wczoraj"', 'BekaWpigułce', 'praca', 'approved', 0, 233, 12),
  ('mem_p1','/uploads/pend1.jpg','Mój pierwszy mem — dajcie szansę 🙏', 'kuba_92', 'internet', 'pending', 0, 0, 0),
  ('mem_p2','/uploads/pend2.jpg','Każdy poniedziałek wygląda tak samo', 'ola.k', 'praca', 'pending', 0, 0, 0);

INSERT INTO meme_tags (meme_id, tag) VALUES
  ('mem_1','poniedziałek'), ('mem_1','pobudka'),
  ('mem_2','mama'), ('mem_2','zakupy'),
  ('mem_3','kasa'), ('mem_3','wypłata'),
  ('mem_p1','debiut'), ('mem_p2','poniedziałek');

-- ustaw mem dnia na pierwszy z przykładów
UPDATE settings SET `value` = 'mem_1' WHERE `key` = 'mem_of_day_id';

-- ============================================================================
--  MAPOWANIE: localStorage  ->  SQL  (ściąga przy pisaniu backendu)
--  ---------------------------------------------------------------------------
--   DB.settings        -> tabela settings (klucz-wartość)
--   DB.categories      -> categories
--   DB.users           -> users
--   DB.memes           -> memes (+ meme_tags, meme_votes)
--   DB.comments        -> comments
--   DB.videos          -> videos
--   DB.games           -> games
--   DB.quizzes         -> quizzes (+ quiz_questions + quiz_options)
--   DB.challenges      -> challenges
--   DB.polls           -> polls (+ poll_options)
--   DB.ads             -> ads
--   DB.reactions       -> reactions
--   newsletter 'bwp_subs' -> subscribers
--
--  BEZPIECZEŃSTWO: w produkcji NIE trzymaj hasła admina jawnie. Zamień kolumnę
--  admin_pass na users.password_hash i loguj przez backend (np. password_hash()
--  w PHP / bcrypt). Brama z js/admin.js to wygoda lokalna, nie ochrona.
-- ============================================================================

/* ============================================================================
   TABELA: answers  (Odpowiedzi do zagadek z Facebooka — lejek na reklamy)
   Dodane w wersji 3. Front-end trzyma to w content.js / localStorage; tutaj
   schemat na przyszły backend (PHP/MySQL).
   ========================================================================== */
CREATE TABLE IF NOT EXISTS answers (
  id          VARCHAR(40)  PRIMARY KEY,
  slug        VARCHAR(80)  NOT NULL UNIQUE,
  title       VARCHAR(200) NOT NULL,
  question    TEXT         NULL,
  answer      TEXT         NOT NULL,
  explain     TEXT         NULL,
  image       MEDIUMTEXT   NULL,          -- URL albo data-URI grafiki
  source_fb   VARCHAR(300) NULL,          -- link do posta na FB (notatka)
  published   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_answers_pub (published, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
