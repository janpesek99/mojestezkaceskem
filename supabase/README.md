# Lokální spuštění a Supabase

1. Spusť `start-local.cmd` dvojklikem. Otevřené okno nech běžet.
2. V prohlížeči otevři **http://127.0.0.1:5500/index.html** (ne `file:///…`).
3. V Supabase otevři svůj projekt → Authentication → URL Configuration.
4. Do **Site URL** vlož `http://127.0.0.1:5500/index.html`.
5. Do **Redirect URLs** přidej `http://127.0.0.1:5500/index.html` a ulož.
6. Pokud jsi to ještě neudělal, spusť obsah `schema.sql` jednou v SQL Editoru. Potom spusť `photo-sync.sql`, který vytvoří soukromé úložiště fotek.
7. V aplikaci zvol **Vytvořit účet**, zadej e-mail a dvakrát heslo.
8. Potvrď registraci odkazem z e-mailu. Při otevření odkazu musí lokální server běžet.
9. Vyber etapu, ulož záznam a obnov stránku. Dokončení, data a poznámka se načtou z účtu.

Veřejný klíč a URL projektu jsou v `supabase-config.js`. Hesla ani tajné klíče do něj nepatří.
Knihovna Supabase se načítá z CDN; přihlášení a ukládání do účtu vyžadují internet.
Pro nasazení přidej také skutečnou HTTPS adresu webu do URL Configuration.

## Co se ukládá

- Přihlášený účet: dokončení etap, prošlé kilometry, datum od–do, poznámky a cesty k fotkám do `public.stage_progress`.
- Fotografie přihlášeného účtu: při uložení etapy do soukromého bucketu `stage-photos` v Supabase Storage. Na jiném zařízení se načtou po přihlášení a otevření etapy.
- Bez přihlášení: původní lokální záznamy v prohlížeči. Nepřevádějí se automaticky do účtu.
- Po odhlášení se zobrazí lokální záznamy návštěvníka. Data účtu zůstávají v Supabase.

RLS v `schema.sql` omezuje přístup na vlastní záznamy. Bez něj aplikaci s osobními daty nepoužívej.
Při chybě načítání účtu se úpravy zablokují, aby nepřepsaly nenačtený postup.
Při chybě uložení zůstane rozepsaný záznam ve formuláři pro další pokus.

## Pokud nepřijde e-mail

Zkontroluj spam a Authentication → Logs v Supabase. Výchozí e-mailová služba
omezuje příjemce i počet zpráv; pro běžnou registraci dalších lidí nastav vlastní SMTP.
Podrobnosti: https://supabase.com/docs/guides/auth/auth-smtp

## Ruční ověření po připojení

- Registrace, potvrzovací odkaz, přihlášení, obnovení stránky a odhlášení.
- Obnova hesla včetně zadání nového hesla po návratu z e-mailu.
- Uložení dokončení, kilometrů, obou dat, poznámky a fotek; načtení v jiném prohlížeči po přihlášení.
- Druhý účet nesmí vidět záznamy prvního účtu.
- Při odpojeném internetu se po neúspěšném uložení musí zachovat rozepsaný formulář.

Dokumentace: https://supabase.com/docs/guides/auth/passwords

Prošlé kilometry se ukládají do účtu i lokálně. Mapa znázorňuje poměrnou část od začátku etapy. Starší dokončené etapy se stále počítají celé.

## Zapnutí synchronizace fotek pro existující databázi

1. V projektu Supabase otevři SQL Editor a spusť celý aktuální obsah `photo-sync.sql`, i pokud jsi už spouštěl starší verzi. Doplní funkci `save_stage_progress` pro bezpečné slučování fotek z více zařízení a zkontroluje maximální délku jednotlivých etap. Skript lze spustit opakovaně a doplní i sloupec pro částečný postup, pokud ještě chybí. Existující `schema.sql` znovu nespouštěj.
2. Obnov aplikaci a přihlas se. Vyber etapu, přidej fotky a klikni na **Uložit**.
3. Na jiném zařízení se přihlas ke stejnému účtu a otevři etapu. Pokud už aplikace byla otevřená, obnov ji pro načtení aktuálního postupu a fotek.

Starší fotky přihlášeného účtu uložené pouze v tomto prohlížeči se přenesou při dalším uložení příslušné etapy. Do té doby místní data prohlížeče nemaž. Fotky návštěvníka bez přihlášení se do účtu automaticky nepřenášejí.

Podporované formáty: JPG, PNG, WebP a GIF; maximálně 10 MB na fotku. HEIC je potřeba převést na některý z podporovaných formátů. Názvy souborů obsahují otisk obsahu, takže opakované uložení stejné fotky nevytváří duplikáty.

Při současném ukládání z více zařízení se odkazy na fotky slučují v databázi. Kilometry, data a poznámka odpovídají poslednímu úspěšnému uložení. Rozepsané záznamy a nepřipojené fotky se při přepínání etap uchovávají v paměti stránky; obnovení stránky nebo změna účtu je zahodí.

Bucket je soukromý. RLS povoluje přihlášenému uživateli pouze čtení a zápis v jeho vlastní složce. Náhledy se stahují s přihlášením; nepoužívají veřejné odkazy. Po odhlášení se načtené náhledy odstraní z paměti aplikace.

Při chybě nahrávání nebo zápisu záznamu zůstávají fotky a rozpracované změny ve formuláři pro opakování. Nahraný soubor bez úspěšně uloženého záznamu se nepřipojí k etapě; další pokus použije tentýž název. Opuštěné neúspěšné pokusy tak mohou zanechat v úložišti nepřipojené soubory.

Implementace byla ověřena automatickými testy s napodobením API. Po spuštění SQL ověř v projektu také načtení na druhém zařízení a zamítnutí přístupu jiného účtu k fotkám.

Dokumentace úložiště: https://supabase.com/docs/guides/storage/security/access-control

## Automatické kontroly

S Node.js spusť:

```text
node supabase/app.test.cjs
node supabase/auth.test.cjs
node supabase/server.test.cjs
node supabase/browser.test.cjs
```

Test serveru vyžaduje Windows PowerShell. Test prohlížeče spouští Chrome bez okna; jinou cestu k prohlížeči lze nastavit proměnnou `CHROME_PATH`. Používá napodobené API a nemění skutečná data Supabase. Ověřuje mobilní a desktopové rozložení, zachování rozepsaných záznamů a fotek, ovládání klávesnicí, validaci a přihlášení/odhlášení. Přístupová pravidla a databázovou funkci je ještě nutné ověřit ve skutečném projektu po spuštění SQL.
