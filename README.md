# Moje stezka Českem

Osobní deník Stezky Českem: mapa, postup po etapách i kilometrech, poznámky a fotky. Statický web s přihlášením a soukromým úložištěm Supabase.

## GitHub Pages

Web běží na **https://janpesek99.github.io/mojestezkaceskem/**.
Zdrojové soubory jsou v [repozitáři na GitHubu](https://github.com/janpesek99/mojestezkaceskem).

Změny webových souborů na větvi `main` nasazuje automaticky workflow [Publish website to GitHub Pages](.github/workflows/pages.yml). Výsledek je v záložce **Actions**; nasazení lze zopakovat pomocí **Run workflow**. V **Settings → Pages → Build and deployment → Source** je nastaveno **GitHub Actions**.

Workflow kopíruje do webu pouze `index.html`, `styles.css`, `app.js`, `auth.js` a veřejnou konfiguraci `supabase-config.js`. Ostatní soubory jsou viditelné ve veřejném zdrojovém repozitáři, ale přes adresu webu se neposkytují.

Postup GitHubu: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Soubory v repozitáři

| Soubory | Účel | Publikují se na GitHub Pages |
| --- | --- | --- |
| `index.html`, `styles.css`, `app.js` | Rozhraní, mapa a deník etap. | Ano |
| `auth.js`, `supabase-config.js` | Přihlášení a veřejné nastavení připojení k Supabase. | Ano |
| `.github/workflows/pages.yml` | Automatické nasazení webu. | Ne |
| `supabase/schema.sql` | Založení databáze a přístupových pravidel pro nový projekt. | Ne |
| `supabase/photo-sync.sql` | Aktuální rozšíření databáze pro kilometry, synchronizaci a mazání fotek. | Ne |
| `supabase/*.test.cjs` | Kontroly aplikace, přihlášení, lokálního serveru a prohlížeče. | Ne |
| `serve-local.ps1`, `start-local.cmd` | Spuštění webu na lokálním počítači s Windows. | Ne |
| `README.md`, `supabase/README.md` | Návody k provozu a nastavení databáze. | Ne |
| `.gitignore` | Vyloučení lokálních a generovaných souborů z Gitu. | Ne |

SQL skripty zůstávají potřebné pro založení nového projektu a aktualizaci existující databáze. Starý `partial-progress.sql` byl odstraněn; jeho rozšíření pro částečný postup už obsahuje `photo-sync.sql`.

Do repozitáře se nesledují `.checks/` (lokální kontroly a pomocné skripty), `_site/` (výstup nasazení), soubory `.env`, logy a dočasné soubory operačního systému. Osobní záznamy a fotky aplikace ukládá do prohlížeče nebo Supabase, nikoli do repozitáře.

## Přihlášení na veřejném webu

V projektu Supabase otevři **Authentication → URL Configuration**:

- **Site URL:** `https://janpesek99.github.io/mojestezkaceskem/`
- **Redirect URLs:** přidej obě přesné adresy:
  - `https://janpesek99.github.io/mojestezkaceskem/`
  - `https://janpesek99.github.io/mojestezkaceskem/index.html`
- Pro lokální vývoj ponech `http://127.0.0.1:5500/index.html`.

Obě varianty jsou potřeba, protože aplikace používá při potvrzení registrace a obnově hesla adresu aktuální stránky. Změníš-li název repozitáře nebo použiješ vlastní doménu, uprav tyto adresy podle skutečné adresy webu.

Pokud odkaz z e-mailu končí na localhost, oprav Site URL i povolené Redirect URLs přímo v Supabase; samotná změna kódu nebo publikování na GitHub Pages tato nastavení nezmění. Po uložení nastavení požádej z veřejného webu o nový odkaz pro obnovu hesla. Pokud už jsi klikl na potvrzení registrace, účet může být potvrzený i přes neúspěšné přesměrování; zkus přihlášení na veřejném webu. Podrobnosti včetně e-mailových šablon jsou v [supabase/README.md](supabase/README.md#pokud-potvrzení-nebo-obnova-hesla-otevírá-localhost).

Pokud databáze ještě není založená, spusť jednou `supabase/schema.sql`. Poté spusť aktuální `supabase/photo-sync.sql`; pro existující databázi stačí aktuální `photo-sync.sql`. Tím se připraví postup, soukromé fotky i funkce pro jejich ukládání.

Veřejný browserový klíč patří do `supabase-config.js`. Nepoužívej zde `service_role` nebo jiný tajný klíč.

Dokumentace přesměrování: https://supabase.com/docs/guides/auth/redirect-urls

## Lokální spuštění

Spusť `start-local.cmd` a otevři http://127.0.0.1:5500/index.html. Podrobnosti jsou v [supabase/README.md](supabase/README.md).

## Kontroly před nasazením

```text
node --check app.js
node --check auth.js
node supabase/app.test.cjs
node supabase/auth.test.cjs
```

Po prvním nasazení ověř načtení mapy, přihlášení, uložení etapy, fotky na druhém zařízení a návrat z e-mailu pro potvrzení účtu nebo obnovení hesla. Lokální nepřihlášené záznamy se mezi adresou localhost a GitHub Pages automaticky nepřenášejí.
