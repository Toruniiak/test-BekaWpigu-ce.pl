# Plan implementacji — BekaWpigułce jako portal w stylu demotywatory.pl

## 1. Architektura (stan obecny — wdrożony w tej paczce)

Strona działa jako statyczny portal na GitHub Pages z warstwą danych po stronie
przeglądarki. To świadomy wybór: zero kosztów serwera, a struktura kodu pozwala
w przyszłości podmienić „środek" na prawdziwe API bez ruszania frontu.

```
przeglądarka
 ├── content.js          → treść OPUBLIKOWANA (widzi każdy odwiedzający)
 ├── localStorage        → kopia robocza + dane osobiste (głosy, ulubione,
 │                          zgłoszone memy, rekordy gier, sesja użytkownika)
 └── db.js (obiekt DB)   → JEDYNY punkt dostępu do danych (warstwa API)
        ↑
 panel admina → „Publikuj treść" → nowy content.js → commit do repo → live
```

## 2. Mapa wymagań → co gdzie jest zaimplementowane

| Wymaganie (demotywatory)         | Implementacja                                      |
|----------------------------------|----------------------------------------------------|
| Zakładki/kategorie               | `memy.html` — chipy kategorii + zakładki 📚 Katalog / ⏳ Poczekalnia |
| Publiczna poczekalnia            | zakładka Poczekalnia: pending memy, każdy może głosować 🔥/💩 przed moderacją |
| Filtrowanie i sortowanie         | szukajka + sort: Najnowsze / Najgorętsze / Komentowane / Kontrowersyjne |
| Like/dislike                     | głosy 🔥/💩, 1 głos na mema na przeglądarkę (`bwp_votes`) |
| Komentarze                       | `Cards.openComments` + kolekcja `comments`         |
| Udostępnianie                    | `Cards.share` — natywny share sheet / fallback     |
| Ulubione                         | NOWE: ⭐ na karcie, `DB.favorites` (`bwp_favs`), lista w profilu |
| Zgłaszanie treści                | NOWE: 🚩 na karcie → modal z powodem → `DB.reports`; admin widzi podświetlone wiersze + „wyczyść" |
| System reputacji                 | NOWE: `DB.reputation(autor)` — +5/mem na stronie, +2 za przewagę 🔥, +1/komentarz; poziomy: Świeżak → Legenda beki 👑 |
| Kreator memów (tekst góra/dół)   | NOWE: 🎨 Kreator — canvas, klasyczny biały tekst z obwódką, podgląd na żywo, „Pobierz PNG" lub „Wyślij do poczekalni" |
| Auto-publikacja po akceptacji    | moderator klika ✓ → status `approved` → mem od razu w katalogu i feedzie |
| Panel moderacji                  | panel admina: Poczekalnia (zatwierdź/odrzuć) + tabela Memy (wyróżnij, mem dnia, usuń, zgłoszenia) |
| Profil użytkownika z historią    | NOWE: 👤 Mój profil — ksywa, poziom, punkty, moje memy (status+głosy), ulubione |
| Responsywność / szybkość         | czysty JS bez frameworka, lazy-loading obrazów, brak zewnętrznych zależności |

## 3. Struktura danych (kolekcje = przyszłe tabele)

Obecnie kolekcje żyją w `content.js`/`localStorage`; nazwy i pola są 1:1 gotowe
pod migrację do MySQL.

```
memes      (id PK, image, caption, author, category FK→categories.slug,
            tags[], created_at, status[pending|approved|rejected],
            votes_up, votes_down, featured)
categories (id PK, name, slug UNIQUE)
comments   (id PK, meme_id FK→memes.id, author, text, created_at)
reports    (id PK, meme_id FK→memes.id, reason, created_at)      ← NOWE
users      (id PK, name UNIQUE, email, avatar, role, created_at)
videos     (id PK, title, description, youtube, category, created_at)
answers    (id PK, slug UNIQUE, title, question, answer, explain, image,
            published, created_at)
quizzes    (id PK, title, desc, questions JSON)
polls / challenges / ads / settings — konfiguracyjne
-- dane per użytkownik (dziś localStorage, po migracji tabele łączące):
votes      (user_id, meme_id, dir)   UNIQUE(user_id, meme_id)
favorites  (user_id, meme_id)        UNIQUE(user_id, meme_id)   ← NOWE
```

Relacje: memes 1—N comments, memes 1—N reports, categories 1—N memes,
users 1—N memes (po `author`; po migracji: `author_id FK`).

## 4. Komponenty frontendu

- `shell.js` — powłoka każdej strony: nawigacja, stopka, toasty, modale,
  logowanie (ksywa/FB), liczniki odwiedzin, wstrzykiwanie reklam/AdSense.
- `db.js` — warstwa danych (opisana wyżej) + NOWE moduły `favorites`,
  `reports`, `reputation`.
- `cards.js` — karta mema (głosy, komentarze, share, NOWE: ⭐ i 🚩)
  oraz karta wideo.
- `memy.js` — katalog: filtry, sort, szukajka, zakładka poczekalni,
  formularz zgłoszenia, NOWE: kreator canvas + modal profilu.
- `admin.js` — pulpit ze statystykami i odwiedzinami, moderacja poczekalni,
  tabela memów (z NOWĄ obsługą zgłoszeń), kategorie, filmy, odpowiedzi,
  reklamy, ustawienia, narzędzia publikacji.
- `rozrywka.js` — 9 gier (w tym Bloki 10×10 i 2048) + 5 quizów.

## 5. Backend — ścieżka rozwoju (gdy strona urośnie)

Etap 0 (teraz): statyka + content.js — 0 zł/mies., wystarcza do dziesiątek
tysięcy odsłon.
Etap 1: mały backend PHP+MySQL (hosting ~10 zł/mies.) wystawiający te same
operacje, które dziś ma `DB.*`:
```
GET  /api/memes?status=&cat=&sort=&q=     POST /api/memes (zgłoszenie)
POST /api/memes/:id/vote                  POST /api/memes/:id/report
POST /api/memes/:id/favorite              GET  /api/users/:name/profile
POST /api/admin/memes/:id/approve|reject  (sesja admina)
```
Dzięki temu, że cały front rozmawia wyłącznie przez `DB.*`, migracja to
podmiana wnętrza db.js na `fetch()` — bez zmian w pozostałych plikach.
Etap 2: konta z hasłami/OAuth, głosy per konto zamiast per przeglądarka,
powiadomienia.

## 6. Ograniczenia obecnego etapu (uczciwie)

- Głosy/zgłoszenia z poczekalni i komentarze użytkowników żyją w ICH
  przeglądarkach do czasu, aż Ty klikniesz „Publikuj treść" — na statycznym
  hostingu nie ma wspólnej bazy. Twoje akcje w panelu (akceptacje, memy)
  publikujesz jak dotychczas commitem content.js.
- Reputacja liczy się z opublikowanej treści, więc jest wspólna i spójna.
- Pełna „żywa" społeczność (głosy widoczne dla wszystkich natychmiast)
  wymaga Etapu 1 z sekcji 5.
