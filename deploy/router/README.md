# Een wildcard voor alle eigen apps

De bestaande hello-tunnel gaat direct naar 127.0.0.1:3200. Dat blijft werken.
Deze router komt ernaast op **127.0.0.1:8088** en verandert geen routes voor
het hoofddomein of www. De router geeft onbekende appnamen een 404.
Hij publiceert geen beheer-, database- of SSH-poorten.

## Eenmalig op Ubuntu

```bash
cd /home/coded/platform-frontend/defaultstack
git pull --ff-only
sudo bash deploy/router/manage.sh install
sudo bash deploy/router/manage.sh register hello 3200
curl --fail -H 'Host: hello.defaultstackr.cloud' http://127.0.0.1:8088/healthz
```

Controleer eerst die lokale test. Pas daarna in Cloudflare de bestaande
Published application route **hello.defaultstackr.cloud** aan naar
**http://127.0.0.1:8088** en test de publieke URL. Maak vervolgens in dezelfde
remotely-managed tunnel een extra Published application route:

| Instelling | Waarde |
| --- | --- |
| Subdomain | `*` |
| Domain | `defaultstackr.cloud` |
| Service URL | `http://127.0.0.1:8088` |

Controleer dat Cloudflare het wildcard-DNS-record naar deze tunnel heeft gemaakt.
Verander apex/www/Vercel-records niet. Een bestaande expliciete DNS-/tunnelroute
heeft voorrang op de wildcard. Stel geen wildcardroute rechtstreeks naar de
hello-container in: dan zouden alle appnamen dezelfde app tonen.

De router is root-beheerd. De dashboardcode gebruikt geen Docker of sudo. Voor echte OS-isolatie moet het
webproces onder een aparte Unix-gebruiker zonder Docker-groepslidmaatschap
draaien, met alleen leesrechten op de export. In de huidige privétest draait
Next.js mogelijk nog als coded, die zelf wel Docker-rechten heeft.
Het script valideert namen/poorten, voorkomt dubbele poorttoewijzing, vergrendelt
parallelle wijzigingen en herstelt de kaart wanneer een configuratie/healthcheck
mislukt. Alleen vertrouwde eigen apps zijn nu geschikt voor deze server.

## Een app publiceren

Voer dit uit als de deploy-gebruiker, niet als root. Het script vraagt sudo
alleen voor registratie bij Nginx:

```bash
bash deploy/apps/publish.sh demo examples/hello-app 3201
```

Dat bouwt/start de container, registreert het subdomein en controleert publieke
DNS, HTTPS, de routerheader en /healthz. Een mislukte publieke controle betekent
niet dat de container teruggedraaid is. De app blijft lokaal draaien; de status
is pending-dns, pending-https, pending-route of unhealthy. Na herstel opnieuw:

```bash
node deploy/apps/check-publication.mjs demo
node deploy/apps/export-status.mjs
```

Een bestaande DNS-cache kan nog een oude NXDOMAIN bewaren, ook als de
servercontrole slaagt. Verander daarom DNS niet herhaaldelijk. Een wildcard die
vooraf bestaat voorkomt losse DNS-aanmaak voor elke nieuwe appnaam.

## Logboeken en analytics

Nieuwe builds bewaren metadata en maximaal 5 MiB output per build in
~/.local/state/defaultstack/builds. Het dashboard toont maximaal 100 builds en
per log de laatste 64 KiB. Deze geschiedenis begint bij nieuwe deployments;
oude buildoutput kan niet achteraf gereconstrueerd worden. Bouwstatus
'Built & started' is lokaal; 'HTTPS verified' heeft een aparte publieke check.
Die publieke verificatie wordt na twee minuten weer 'unverified' totdat er
opnieuw gecontroleerd wordt. Dit is geen continue uptimebewaking.

Voor buildoutput via het **private** dashboard:

```env
DEFAULTSTACK_STATE_DIR=/home/coded/.local/state/defaultstack
ENABLE_LOCAL_BUILD_LOGS=true
```

Herstart Next.js. Niet aanzetten op een publiek dashboard zonder authenticatie:
buildoutput kan secrets bevatten. .env-inhoud wordt niet opgevraagd door de UI.

De router schrijft tijd, host, status, responstijd en een healthcheck-indicator
naar /var/log/nginx/defaultstackr-apps.jsonl. Er worden geen IP-adressen, cookies,
querystrings of paden opgeslagen. Healthchecks tellen niet mee in analytics.
Het deploy-account moet leesrecht hebben (op Ubuntu doorgaans via groep adm).
Geen leesrecht? Analytics tonen unavailable; maak het log niet wereldleesbaar.

```bash
node deploy/apps/export-status.mjs
```

Die export verzamelt Docker CPU/geheugen en de laatste 24 uur aan verzoeken.
Maximaal de laatste 2 MiB van het accesslog wordt gelezen. Als de logfile groter
is, toont het dashboard dat het een gedeeltelijk venster is. Geen unieke
bezoekers, geen browsertracking en geen historische CPU-grafiek.

De routerinstaller voegt logrotatie toe als /etc/logrotate.d bestaat: dagelijks,
zeven bestanden, compressie. Een bestaande eigen rotatieconfig blijft behouden.
Stel daarnaast een bewaartermijn voor buildbestanden in.
Standaard is er nog geen automatische opruiming van buildgeschiedenis.

## Automatische statusexport

Optioneel na de handmatige test, op Ubuntu met systemd en een systeeminstallatie
van Node die voor de deploy-gebruiker bereikbaar is:

```bash
sudo bash deploy/apps/install-monitor.sh coded
systemctl status defaultstackr-status.timer --no-pager
```

Dit maakt een systemd-timer die elke 30 seconden als coded de read-only export
uitvoert, ook zonder SSH-sessie. Het webproces krijgt hierdoor geen nieuwe
rechten. Publicatiecontroles zijn nog apart; deze timer bewaakt geen uptime.
Uitschakelen: `sudo systemctl disable --now defaultstackr-status.timer`.
