# Domeinen en eerste Plainwork-deploy (Cloudflare Tunnel)

Dit draaiboek geldt voor de bestaande tunnelmodus op de thuisserver. Het is voorbereid in Git; er is hiermee nog geen DNS, serverconfiguratie of database gewijzigd.

| Host | Bestemming |
| --- | --- |
| `www.defaultstackr.nl` | Publieke frontend op `127.0.0.1:3100` |
| `defaultstackr.nl`, `defaultstackr.online`, `www.defaultstackr.online` | 301 naar `https://www.defaultstackr.nl` |
| `defaultstackr.cloud` | Beheerconsole op `/app`, met bestaande sessielogin |
| `www.defaultstackr.cloud` | 301 naar `https://defaultstackr.cloud` |
| `*.defaultstackr.cloud` | Bestaande projectdeployments, waaronder `plainwork.defaultstackr.cloud` |
| `api.defaultstackr.cloud` | 404; Express blijft lokaal bereikbaar |

De publieke host blokkeert `/app` en `/api/`; Next.js controleert de beheerhost en sessie ook zelf. De status-API en lokale database-editor vereisen nu eveneens de beheersessie. De beheerconsole heeft momenteel één gedeeld adminaccount. Dit is nog geen accountmodel voor klanten.

## Eerst controleren

1. Zorg dat `defaultstackr.nl`, `defaultstackr.online` en `defaultstackr.cloud` als **Active** zones in hetzelfde Cloudflare-account staan als de bestaande tunnel `defaultstackr`. De nameservers bij de registrar moeten exact de twee nameservers van elke betreffende zone zijn.
2. Controleer dat de huidige `*.defaultstackr.cloud`-route en projectsubdomeinen blijven bestaan. Noteer de bestaande DNS-records voor rollback. Verwijder geen bestaande projectroutes.
3. Controleer op de server welke branch en werkmap actief zijn (`git status`, `pm2 show defaultstackr-web`). Maak een backup van `/etc/nginx/sites-available/defaultstackr.conf` en `/etc/cloudflared/config.yml` buiten de repository.
4. Controleer dat de API lokaal werkt met `curl --fail http://127.0.0.1:3000/health` en dat `DEFAULTSTACKR_MOCK` uit staat wanneer de echte API-koppeling is gevalideerd. De frontend verwacht nog `/v1`, terwijl de API `/api/projects` biedt; zonder aanpassing werkt het dashboard niet volledig op de echte API.

## Na code-update op de server

Voer dit uit in de bestaande frontend-clone. Gebruik de voorbereide branch totdat de wijzigingen zijn gemerged.

```bash
git fetch origin
git checkout codex/public-domains-dashboard
git pull --ff-only origin codex/public-domains-dashboard
npm ci
npm run build
npm test
sudo MODE=tunnel bash deploy/nginx/install-config.sh
sudo bash deploy/cloudflared/setup-tunnel.sh
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
```

`setup-tunnel.sh` zet de vier nieuwe DNS-routes naar de bestaande tunnel. Het script verwacht toegang tot alle drie zones. Het oude `deploy/sync-domain.sh` is uitgezet omdat het `.online` onterecht naar `.cloud` omzette.

## Controle van buitenaf

```bash
curl -sI https://www.defaultstackr.nl/
curl -sI https://defaultstackr.nl/
curl -sI https://defaultstackr.online/
curl -sI https://www.defaultstackr.online/
curl -sI https://defaultstackr.cloud/
curl -sI https://www.defaultstackr.nl/app
curl -sI https://defaultstackr.cloud/app
curl -sI https://plainwork.defaultstackr.cloud/
```

Verwacht: `.nl` hoofdsite 200, drie publieke aliasnamen 301 naar `www.defaultstackr.nl`, `.cloud/` 302 naar `/app`, `.nl/app` 404 en `.cloud/app` een loginredirect zonder sessie. Plainwork krijgt pas een succesvolle respons nadat de app werkelijk op de server is gedeployed.

## Plainwork en de eigen database

De bestaande API-repository bevat `docs/launch-maandag.md` met de deployvolgorde voor `plainwork.defaultstackr.cloud`: project, vaultwaarden, worker, deploy en domeincheck. Dit kan pas op de server met de admin API-sleutel en de vereiste omgevingsvariabelen. Plaats geen sleutels in Git of chat.

Plainwork gebruikt momenteel Supabase PostgreSQL, Auth, Storage en de Supabase Data API. Een kopie van alleen tabellen naar de bestaande lokale PostgreSQL is daarom geen volledige migratie. Begin met een geïsoleerde testomgeving en inventariseer schema, migraties, gebruikers, buckets, policies en bestanden. Daarna kan een self-hosted Supabase-stack op de eigen server worden ingericht, of kunnen Auth, Storage en de Data API afzonderlijk worden vervangen. Test login, upload, aankoop, webhook en download voordat `NEXT_PUBLIC_SUPABASE_URL` naar de eigen omgeving gaat. Laat de bestaande Vercel-deploy als terugval staan tot die controles slagen.

Voor meerdere klantprojecten hoort elk project een eigen PostgreSQL-database of aparte isolatie met eigen credentials, backups en toegangsrechten te krijgen. De beheerconsole bewaart de projectmetadata in een afzonderlijke platformdatabase. Een dashboardprofiel is geen database-isolatie.
