# BekaWpigułce — strona z CMS-em 🔥

Kompletna, wielostronicowa witryna humorystyczna z własnym panelem administracyjnym, systemem memów z głosowaniem i moderacją, mini-grami, quizem, sondami, wideoteką oraz miejscami na reklamy. Całość w **czystym HTML + CSS + JavaScript** — bez frameworków, bez kompilacji, bez kosztów. Działa od kliknięcia: lokalnie z dysku albo na dowolnym hostingu.

Ciemny motyw w barwach marki: czerń `#0E0E0E`, żółć `#FFD400`, czerwień `#FF3B30`.

---

## 📁 Struktura projektu

Układ jest **płaski** — wszystkie pliki leżą w jednym folderze (bez podfolderów `css/`, `js/`). Dzięki temu wgranie na GitHub/hosting jest odporne na gubienie folderów.

```
bekawpigulce/
├── index.html          ← strona główna (ostatni post FB, polecane, mem dnia, top, filmy)
├── memy.html           ← katalog memów: filtr / szukaj / sort + dodawanie do poczekalni
├── rozrywka.html       ← mini-gry, quiz, konkursy
├── filmy.html          ← wideoteka (YouTube) z filtrem kategorii
├── panel-admina.html   ← panel administracyjny (logowanie + zarządzanie wszystkim)
├── style.css           ← całość wyglądu (ciemny motyw, responsywność, komponenty)
├── db.js               ← WARSTWA DANYCH — „baza" na localStorage (serce CMS-u)
├── shell.js            ← wspólna powłoka: nawigacja, stopka, okna (modal), powiadomienia
├── cards.js            ← renderowanie kart memów i filmów + komentarze + udostępnianie
├── home.js             ← logika strony głównej
├── memy.js             ← logika katalogu memów (filtry, upload do poczekalni)
├── rozrywka.js         ← 4 grywalne mini-gry + interaktywny quiz
├── filmy.js            ← logika wideoteki
├── admin.js            ← logika panelu admina (wszystkie zakładki)
├── schema.sql          ← schemat bazy SQL (mapa przejścia na prawdziwy backend)
├── .nojekyll           ← wyłącza Jekyll na GitHub Pages (zostaw, nawet jeśli niewidoczny)
└── README.md           ← ten plik
```

---

## 🚀 Szybki start

### Wariant A — lokalnie (na dysku)
Otwórz `index.html` w przeglądarce (dwuklik). Strona w pełni działa: memy, gry, quiz, panel — wszystko zapisuje się w przeglądarce.

> **Jedyne ograniczenie file://** — wtyczka Facebooka „ostatni post" i logowanie przez Facebooka wymagają prawdziwego adresu (http/https). Reszta działa bez internetu.

### Wariant B — na serwerze / hostingu
Wgraj **całą zawartość folderu** `bekawpigulce/` na hosting (FTP, panel hostingu, GitHub Pages, Netlify itp.). Strona główna to `index.html`. Nie trzeba nic konfigurować — to pliki statyczne.

---

## 🔐 Panel administracyjny

Wejście: `panel-admina.html` (link „⚙" w nawigacji i w stopce).

- **Domyślne hasło:** `beka2026`
- Hasło zmienisz w panelu: **Ustawienia → Hasło panelu**.

### ⚠ Ważne o bezpieczeństwie
Logowanie do panelu działa **wyłącznie po stronie przeglądarki** (hasło leży w `localStorage`). To wygodna blokada na własnym urządzeniu, **ale nie jest realnym zabezpieczeniem** — każdy z dostępem do przeglądarki może je obejść. Zanim wpuścisz tu obcych, przenieś logowanie na serwer (patrz sekcja *Przejście na backend*).

### Co potrafi panel
| Zakładka | Funkcje |
|---|---|
| **Pulpit** | Statystyki (memy, głosy, komentarze, użytkownicy) + ranking Top 5 |
| **Poczekalnia** | Zatwierdzanie / odrzucanie memów zgłoszonych przez użytkowników |
| **Memy** | Tabela wszystkich memów: wyróżnij, ustaw „mem dnia", zatwierdź, usuń |
| **Kategorie** | Dodawanie/usuwanie kategorii + podgląd najczęstszych tagów |
| **Filmy** | Dodawanie filmów z YouTube (link lub ID) i usuwanie |
| **Gry i quiz** | Włączanie/wyłączanie mini-gier + pełny edytor pytań quizu |
| **Sondy** | Edycja pytania i odpowiedzi sondy + zerowanie głosów |
| **Reklamy** | 4 sloty reklamowe (HTML/baner) + identyfikator AdSense |
| **Ustawienia** | Nazwa strony, tagline, pasek ogłoszeń, Facebook, TikTok, hasło |
| **Narzędzia** | Kopia zapasowa (eksport JSON), przywracanie, reset do danych startowych |

---

## 📘 Facebook — konfiguracja

1. Wejdź na [developers.facebook.com](https://developers.facebook.com/) → utwórz aplikację.
2. Skopiuj **App ID** i wklej w panelu: **Ustawienia → Facebook App ID**.
3. To włącza:
   - **logowanie przez Facebooka** (przycisk pojawia się przy dodawaniu komentarza/mema),
   - **wtyczkę „ostatni post"** na stronie głównej (Facebook Page Plugin).
4. Adres fanpage ustaw w **Ustawienia → Adres strony na Facebooku**.

> Wtyczka i logowanie **nie zadziałają z pliku na dysku** (file://) ani na `localhost` bez konfiguracji domeny w panelu Facebooka. Na prawdziwej domenie działają od ręki.

---

## 💰 Reklamy (Google AdSense)

1. Po akceptacji konta AdSense wpisz identyfikator `ca-pub-XXXXXXXX` w **Reklamy → Google AdSense**.
2. Kod jednostki reklamowej (z panelu AdSense) wklej w jednym z 4 slotów: **góra**, **bok / między sekcjami**, **w treści**, **stopka**.
3. Zaznacz „Slot aktywny" i zapisz.

Sloty na stronach to elementy `data-ad="top|sidebar|in-feed|footer"` — `shell.js` wypełnia je treścią z panelu. Pusty/wyłączony slot jest niewidoczny.

---

## 🧠 Jak działa „baza danych" (warstwa DB)

Cała aplikacja rozmawia z danymi **wyłącznie** przez obiekt `DB` z pliku `js/db.js`. Dziś dane trzymane są w przeglądarce (`localStorage`, klucz `bwp_db_v2`). Dzięki tej jednej warstwie pośredniej **podmiana na prawdziwy backend nie wymaga ruszania reszty kodu** — wystarczy przepisać środek `db.js` na zapytania do API/SQL.

Najważniejsze grupy w `DB`:
`DB.settings`, `DB.categories`, `DB.memes`, `DB.comments`, `DB.videos`, `DB.games`, `DB.quizzes`, `DB.challenges`, `DB.polls`, `DB.ads`, `DB.reactions`, `DB.users`, `DB.stats()`, `DB.raw` (eksport/import/reset).

Klucze w przeglądarce:
- `bwp_db_v2` — cała baza (jeden JSON),
- `bwp_user` — bieżący użytkownik tej przeglądarki,
- `bwp_votes` — na które memy już głosowano (anty-spam),
- `bwp_pollvote` — w których sondach już głosowano,
- `bwp_subs` — zapisy na newsletter,
- `bwp_admin_ok` (sesyjny) — znacznik zalogowania do panelu.

---

## 🗄️ Przejście na backend (PHP/MySQL, Node, Supabase…)

1. Załóż bazę z pliku `database/schema.sql` (`mysql -u root -p < schema.sql`). Każda tabela odpowiada 1:1 obiektowi z `DB`.
2. Napisz proste API (np. PHP) zwracające/przyjmujące JSON dla operacji z `db.js` (lista memów, dodaj mem, głosuj, zatwierdź itd.).
3. W `js/db.js` podmień ciała funkcji z odczytu/zapisu `localStorage` na `fetch()` do swojego API. **Sygnatury funkcji zostaw bez zmian** — strony i panel będą działać dalej.
4. **Hasło admina** przenieś z `settings.admin_pass` na kolumnę `users.password_hash` i loguj po stronie serwera (`password_hash()` / bcrypt). Brama z `admin.js` przestaje być wtedy potrzebna jako ochrona.

Mapowanie `localStorage → SQL` jest też wypisane na końcu `schema.sql`.

---

## 🧩 Najważniejsze pliki w skrócie

- **`db.js`** — dane + reguły (głosowanie z ochroną, moderacja, statystyki, generator zastępczej grafiki mema jako SVG, żeby każdy mem miał kafelek nawet offline).
- **`shell.js`** — montuje wspólną nawigację (sticky + szuflada mobilna), stopkę, pasek ogłoszeń; dostarcza `UI.toast` (powiadomienia), `UI.modal` (okna), `UI.requireUser` (logowanie ksywą lub przez FB), obsługę reklam i SDK Facebooka. W menu pokazuje licznik memów czekających na moderację.
- **`cards.js`** — jeden spójny wygląd karty mema (głosowanie 🔥/💩, pasek „heat", tagi, komentarze, udostępnianie) i karty filmu (odtwarzacz YouTube w oknie).
- **`admin.js`** — cały panel: brama logowania, przełączanie zakładek, wszystkie operacje na danych, kopie zapasowe.
- **`rozrywka.js`** — 4 mini-gry w czystym JS (Złap Mema, Mem Memory, Klikolot, Quiz) i wyzwania.

---

## ❓ Dlaczego pliki mają nazwy bez polskich znaków?

Pliki nazwane są „ASCII-safe" (np. `memy.html`, `panel-admina.html`, a nie `strona-memów.html`). Polskie znaki i spacje w nazwach plików potrafią się psuć na części serwerów, w linkach i przy przenoszeniu między systemami. Treść stron jest oczywiście w pełni po polsku — to dotyczy **tylko nazw plików**, dla bezproblemowego działania wszędzie.

---

## ➕ Jak rozszerzać

- **Nowa kategoria / film / pytanie quizu** → przez panel admina (bez kodu).
- **Nowa mini-gra** → dopisz silnik w `js/rozrywka.js` i dodaj wpis gry (pole `code`) — w `db.js` lub przez panel.
- **Nowa zakładka w panelu** → dodaj przycisk w `panel-admina.html` (z `data-pane="…"`) i funkcję o tej samej nazwie w obiekcie `panes` w `js/admin.js`.
- **Nowy slot reklamowy** → dodaj `<div data-ad="nazwa"></div>` na stronie i wpis slotu w `db.js`.

---

## 🔧 Reset / kopia zapasowa

W panelu: **Narzędzia** → *Pobierz kopię (.json)* (backup), *Przywróć z pliku* (odtworzenie), *Reset* (powrót do danych przykładowych). Trzymaj kopię JSON na dysku — to pełny stan strony.

---

© BekaWpigułce. Kod czysty, skomentowany po polsku i gotowy do rozbudowy.

---

## Co nowego w wersji 3 (czysta)

- **Czysty start** — brak przykładowych memów, filmów, użytkowników i danych kontaktowych. Strona gotowa „od zera".
- **Odpowiedzi (`odpowiedzi.html`)** — sekcja pod lejek z Facebooka: wrzucasz na FB zagadkę, link kierujesz tutaj, a strona pokazuje odpowiedź otoczoną reklamami i innymi zagadkami (więcej odsłon = więcej z AdSense). Zarządzasz w panelu → zakładka **Odpowiedzi** (przycisk „Kopiuj link" do wklejenia na FB).
- **Publikacja treści (`content.js`)** — strona to front-end na localStorage, więc Twoje zmiany w panelu domyślnie widzisz tylko Ty. Aby zobaczyli je WSZYSCY: panel → **Narzędzia → Publikuj treść**, pobierz `content.js` i wgraj go do repozytorium (nadpisz istniejący). Plik `content.js` ma pierwszeństwo nad danymi w przeglądarce.
- **Nowe gry z rekordami** — Wężyk, Motorek (endless runner), Saper, Ubieranka. Rekordy zapisują się lokalnie (per przeglądarka).
- **Lepsze quizy** — 3 quizy (Logika i zagadki, Wiedza ogólna, Polska — ciekawostki), edytor obsługuje wiele quizów.
- **Skarbiec** — wbudowany w panel (zakładka Skarbiec) jako pusta, prywatna kopia (noindex). Twój prywatny Skarbiec z pomysłami trzymaj u siebie.
- **AdSense** — `ads.txt` w katalogu głównym (wpisz swój pub-ID), `robots.txt` chroni panel i Skarbiec przed indeksowaniem.
- **Hasło panelu** — bez zmian (`beka2026`). Pamiętaj: to brama tylko po stronie przeglądarki (patrz sekcja bezpieczeństwa).
