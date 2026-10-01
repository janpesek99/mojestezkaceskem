# Moje stezka Českem

Osobní deník Stezky Českem: mapa, postup po etapách i kilometrech, poznámky a fotky. Statický web s přihlášením a soukromým úložištěm Supabase.

## GitHub Pages

Cílový účet: `janpesek99`. Doporučený název repozitáře: `mojestezkaceskem`.
Po nasazení bude web na **https://janpesek99.github.io/mojestezkaceskem/**.

1. Vytvoř na GitHubu repozitář `mojestezkaceskem` a nahraj tento projekt na větev `main`, včetně `.github/workflows/pages.yml`.
2. V repozitáři otevři **Settings → Pages → Build and deployment → Source** a vyber **GitHub Actions**.
3. V **Actions → Publish website to GitHub Pages** spusť **Run workflow**. Další změny webových souborů na větvi `main` se nasadí automaticky.
4. Adresu úspěšného nasazení najdeš v **Settings → Pages** nebo u prostředí `github-pages`.

Workflow publikuje pouze `index.html`, `styles.css`, `app.js`, `auth.js` a veřejnou konfiguraci `supabase-config.js`. SQL, testy a lokální server se do webu nekopírují. Pro GitHub Free použij veřejný repozitář; soukromý repozitář s Pages vyžaduje podporovaný placený plán.

Postup GitHubu: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Přihlášení na veřejném webu

V projektu Supabase otevři **Authentication → URL Configuration**:

- **Site URL:** `https://janpesek99.github.io/mojestezkaceskem/`
- **Redirect URLs:** přidej obě přesné adresy:
  - `https://janpesek99.github.io/mojestezkaceskem/`
  - `https://janpesek99.github.io/mojestezkaceskem/index.html`
- Pro lokální vývoj ponech `http://127.0.0.1:5500/index.html`.

Obě varianty jsou potřeba, protože aplikace používá při potvrzení registrace a obnově hesla adresu aktuální stránky. Změníš-li název repozitáře nebo použiješ vlastní doménu, uprav tyto adresy podle skutečné adresy webu.

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
