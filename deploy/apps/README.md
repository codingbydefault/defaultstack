# Eerste eigen testdeployment

Dit draait uitsluitend code die je zelf vertrouwt. Het is nog geen publieke
multi-tenant buildservice. Docker-rechten geven vergaande controle over de host;
geef die rechten nooit aan de dashboard-webserver of klantprocessen.

## 1. Vereisten op Ubuntu

Docker Engine met werkende `docker info`, Bash, curl en flock. Voor harde
resourcegrenzen moeten Docker/cgroups geheugen- en proceslimieten ondersteunen;
het script waarschuwt wanneer dat ontbreekt. De beheerder moet
Docker kunnen gebruiken. De testapp heeft geen npm-dependencies of database nodig.
Geen wijzigingen aan de firewall of router nodig: de container bindt op localhost.

## 2. Deploy de meegeleverde app

Vanuit de frontend-repository:

```bash
git pull --ff-only
bash deploy/apps/deploy.sh hello examples/hello-app 3200
curl --fail http://127.0.0.1:3200/healthz
docker logs --tail 100 defaultstack-app-hello
```

Het script bouwt een nieuwe image, test een tijdelijke container op een vrije
localhostpoort, stopt pas daarna de vorige versie en start de nieuwe op poort
3200. Na een mislukte start/healthcheck wordt de vorige container teruggezet.
Er is een korte onderbreking bij promotie; dit is nog geen zero-downtime deploy.
De vorige container en images blijven bewaard. Ruim die pas na verificatie op.
Dezelfde opdracht deployt opnieuw. Ook bij SIGINT/SIGTERM tijdens promotie
probeert de EXIT-handler de vorige container te herstellen. SIGKILL of stroomuitval
kan niet worden opgevangen; inspecteer na zo’n onderbreking de containers. Eén deployment tegelijk wordt afgedwongen.

Runtime: niet-root UID 1000, read-only filesystem, beperkte CPU/RAM/processen,
geen hostmounts, geen Docker-socket, begrensde logs. De app luistert intern op
8080 en moet binnen 30 seconden een 2xx op /healthz teruggeven. De build heeft
nog geen harde resourcegrenzen; bouw alleen eigen, vertrouwde kleine apps.

## 3. Eerst lokaal bekijken

Op je eigen computer, met jouw bestaande SSH-adres:

```bash
ssh -L 3200:127.0.0.1:3200 coded@192.168.2.69
```

Open http://localhost:3200. Laat de SSH-verbinding open.

## 4. Optioneel publiceren

Pas nadat de Cloudflare-zone en tunnel voor **defaultstackr.cloud** werken:

```bash
sudo bash deploy/nginx/add-subdomain.sh hello 3200
```

Open https://hello.defaultstackr.cloud. Deze helper verwacht dat Nginx al is
geïnstalleerd en dat de wildcard-DNS/tunnelroute bestaat. De configuratiebestanden
in Git bijwerken verandert de draaiende Nginx/tunnelconfig niet automatisch.
Maak geen publieke route naar de onbeveiligde Express-API of database-editor.
Het migreren van een bestaande Cloudflare-zone van de oude domeinnaam vereist
aparte Cloudflare-configuratie; dit is niet via Git geregeld.

## Dashboard in productie

Gebruik `npm ci`, `npm run build`, `npm start` in plaats van `npm run dev`.
De productie-app bindt standaard op 127.0.0.1:3100. Gebruik Nginx of SSH-forwarding
om die te bereiken. De healthcheck is /healthz; die controleert alleen het
webproces, niet PostgreSQL. Laat ENABLE_LOCAL_DATABASE_EDITOR=false op publieke
hosting. Start Express afzonderlijk; deze repo bevat de backendcode niet.

## Servercontrole en dashboardstatus

```bash
bash deploy/apps/doctor.sh
node deploy/apps/export-status.mjs
```

Succesvolle deployments exporteren nu automatisch een snapshot naar
~/.local/state/defaultstack/status.json. Configureer DEFAULTSTACK_STATE_DIR in
de frontend .env.local en herstart Next.js. De UI markeert een snapshot ouder
dan twee minuten als verouderd; exporteer opnieuw om actuele containerstatus
te zien. De snapshot bevat alleen naam, image, poort, status en tijd, geen
container-environment of secrets. Het dashboard krijgt geen Dockerrechten.

De Vercel-frontend kan het lokale bestand op Ubuntu niet lezen. Daar blijft de
serverstatus losgekoppeld totdat een beveiligde API-verbinding beschikbaar is.
De canonische domeinnaam is defaultstackr.cloud. Vercel kan tijdelijk de
frontend hosten; het lezen van Ubuntu-status blijft daar losgekoppeld.
