# Klantaanmelding en GitHub koppelen

De publieke landingspagina draait op `defaultstackr.nl` en `defaultstackr.online`. De accounts en sessies draaien op `www.defaultstackr.cloud`. De beheerlogin (`/app/login?admin=1`) gebruikt een apart wachtwoord en blijft gescheiden van klantaccounts.

## 1. GitHub App instellen

Open de instellingen van de DefaultStackr GitHub App en voeg onder **Callback URLs** deze twee volledige adressen toe:

- `https://www.defaultstackr.cloud/api/auth/callback/github` voor aanmelden met GitHub;
- `https://www.defaultstackr.cloud/api/github/callback` voor de bestaande beheerkoppeling met repositories.

Schakel onder **Account permissions → Email addresses** de optie **Read-only** in. Geef onder **Repository permissions** minimaal **Metadata: Read-only** en **Contents: Read-only**. De ingebouwde code-editor heeft voor opslaan **Contents: Read and write** nodig. Laat de gebruiker de app alleen op geselecteerde repositories installeren. Kopieer de **Client ID**, genereer een **Client Secret** en noteer de app-slug; plaats de secret uitsluitend op de server.

## 2. Serveromgeving

Werk op de server in `/home/coded/platform-frontend/defaultstack`. Voeg in `.env.local` de volgende servervariabelen toe of controleer ze:

```dotenv
DEFAULTSTACKR_PUBLIC_URL=https://www.defaultstackr.cloud
DEFAULTSTACKR_AUTH_DATABASE_URL=postgresql://<auth-gebruiker>:<wachtwoord>@127.0.0.1:5432/<database>
DEFAULTSTACKR_AUTH_SECRET=<een-willekeurige-sleutel-van-minstens-32-tekens>
DEFAULTSTACKR_GITHUB_CLIENT_ID=<client-id>
DEFAULTSTACKR_GITHUB_CLIENT_SECRET=<client-secret>
DEFAULTSTACKR_GITHUB_APP_SLUG=<app-slug>
```

Gebruik een aparte PostgreSQL-database of een afgeschermd schema voor klantaccounts. De databasegebruiker moet de benodigde tabellen mogen maken. Genereer de auth-secret op de server met `openssl rand -base64 48`; hergebruik de beheerwachtwoordhash of de bestaande sessiesleutel niet. Zet geen van deze waarden in Git, in de browser of in een chatbericht.

## 3. Tabellen maken en activeren

Na het ophalen van de nieuwe code:

```bash
cd /home/coded/platform-frontend/defaultstack
git pull --ff-only
npm ci
npm run auth:migrate
npm run build
pm2 restart defaultstackr-web --update-env
```

De migratie toont eerst welke Better Auth-tabellen toegevoegd worden en vraagt om bevestiging. Controleer de lijst. De bestaande adminsessie en Express API staan hier los van.

Controleer daarna zonder sleutels te tonen:

```bash
curl -s https://www.defaultstackr.cloud/api/customer-entry/status
```

De uitvoer moet `"available":true` en `"github":true` bevatten. Test vervolgens in een privévenster de GitHub-knop op `https://defaultstackr.nl/`. Na de GitHub-toestemming hoort de browser naar `https://www.defaultstackr.cloud/app` terug te keren. Open daar **Nieuw project** en controleer of de toegestane repositories verschijnen. Als dit niet werkt, controleer de twee callbackadressen en de serverlogs met `pm2 logs defaultstackr-web --lines 50` zonder sleutels of cookies te delen.

## Optioneel: Google

Voor Google-aanmelding zijn daarnaast `DEFAULTSTACKR_GOOGLE_CLIENT_ID` en `DEFAULTSTACKR_GOOGLE_CLIENT_SECRET` nodig. De callback is `https://www.defaultstackr.cloud/api/auth/callback/google`.
