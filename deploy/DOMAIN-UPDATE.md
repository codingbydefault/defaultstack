# Alles op defaultstackr.online

De frontendmetadata en workspace gebruiken één domeinbron in src/lib/site.ts.
De Nginx-, tunnel-, DNS- en certificaattemplates gebruiken defaultstackr.online.
Een Git-update wijzigt geen reeds geïnstalleerde bestanden onder /etc.

## Op Ubuntu via je bestaande SSH-terminal

```bash
cd /home/coded/platform-frontend/defaultstack
git pull --ff-only
bash deploy/apps/doctor.sh
node deploy/apps/export-status.mjs
```

Stop een eventueel draaiende `npm run dev` met Ctrl+C in zijn eigen terminal
voordat je een productiebuild maakt. Stop Express en de hello-container niet.

```bash
npm ci
npm run build
npm test
```

Voeg in .env.local de statusdirectory toe, zonder bestaande regels te verwijderen:

```env
DEFAULTSTACK_STATE_DIR=/home/coded/.local/state/defaultstack
```

Voor bestaande Nginx/tunnel-configuratie:

```bash
sudo bash deploy/sync-domain.sh
```

Dit script werkt alleen bestaande DefaultStackr-bestanden bij, bewaart originele
bestanden onder /var/backups en valideert voor herladen. Bij fouten zet het ze
terug. Subdomeinregels en poorten blijven behouden. Een niet-bestaande tunnel
wordt niet aangemaakt. systemd wordt verwacht voor herladen van actieve services.
Een wijziging van een tunnel-hostname maakt nog geen DNS-route in Cloudflare.
Controleer dat de zone defaultstackr.online Active is en maak dan de routes via
de tunnelsetup. Nieuwe certificaten zijn nodig bij directe HTTPS-hosting.
Het script wijzigt geen private keys, firewall, backendcode of database-inhoud.

Start de frontend nadat poort 3100 vrij is:

```bash
npm start
```

Productie bindt bewust op 127.0.0.1:3100. Via een SSH-portforward op je eigen
computer: `ssh -L 3100:127.0.0.1:3100 coded@192.168.2.69`, daarna
http://localhost:3100/app. Met bestaande PM2-installatie gebruik je in plaats
van npm start: `pm2 startOrReload deploy/ecosystem.config.cjs --update-env` en
`pm2 save`. Start nooit beide tegelijk.

## Buiten de repository

De Express-broncode op /home/coded/supabase_clone_api staat niet in deze repo.
CORS/origin-allowlists, OAuth-redirects, webhooks en eventuele externe
omgevingsvariabelen moeten apart gecontroleerd worden wanneer die bestaan.
Toon nooit .env-inhoud of secrets in chat. De API blijft privé tot login en
projectrechten zijn ingericht.

Controle na het starten:

```bash
curl --fail http://127.0.0.1:3100/healthz
curl --fail http://127.0.0.1:3200/healthz
bash deploy/apps/doctor.sh
```
