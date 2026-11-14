# DefaultStack op je eigen Ubuntu-server

Dit is de productie-installatie voor **www.defaultstack.online**. De Next.js-site draait op deze server, niet op Vercel. Vercel blijft als terugval bestaan; hoe je terugschakelt staat onderaan.

De canonische site is `https://www.defaultstack.online`. `https://defaultstack.online` (zonder www) stuurt bezoekers met een 301 door naar www.

| Verkeer | Gaat naar |
| --- | --- |
| `www.defaultstack.online` | Next.js op `127.0.0.1:3100` |
| `defaultstack.online` | 301 naar `https://www.defaultstack.online` |
| `api.defaultstack.online` | bestaande Express-API op `127.0.0.1:3000` |
| `iets.defaultstack.online` | de poort in `/etc/nginx/defaultstack/subdomains.map`, of een 404-pagina |

Express en PostgreSQL start dit project niet. Die draaien al op de machine. PostgreSQL mag alleen op localhost luisteren en komt nooit in de firewall naar buiten.

Bedoeld voor Ubuntu 22.04 en 24.04 (Nginx uit die releases). Node 22 of nieuwer blijft staan. Ontbreekt Node, dan installeert `setup.sh` Node 24 LTS.

## Wat je zelf doet

1. Kies hieronder **VPS** of **thuis**. Zet daarna de DNS-records.
2. Log in met SSH op de server.
3. Clone de repository en draai `sudo bash deploy/setup.sh`.
4. Controleer www in de browser.
5. Wildcard-certificaat regelen (DNS-01 of Cloudflare) zodra www het doet. De Nginx-routes staan er dan al.

`setup.sh` is opnieuw te draaien. Hij overschrijft je subdomeinlijst niet.

## DNS bij de registrar

Vervang `SERVER_IP` door het publieke IPv4-adres van de server (`curl -4 ifconfig.me` op de server).

| Naam | Type | Waarde |
| --- | --- | --- |
| `@` | A | `SERVER_IP` |
| `www` | CNAME | `defaultstack.online` |
| `api` | CNAME | `defaultstack.online` |
| `*` | CNAME | `defaultstack.online` |

Weigert de registrar een CNAME op `*`, `www` of `api`, maak dan van die namen ook een A-record naar hetzelfde IP. Een CNAME op `@` kan niet (behalve bij Cloudflare). `@` blijft een A-record.

Zet nog geen AAAA-record, tenzij de server echt een publiek IPv6-adres heeft dat je ook doorstuurt. Een verkeerd AAAA-record laat Let's Encrypt willekeurig mislukken.

TTL mag op automatisch of 300 seconden tijdens het testen. Wacht tot `dig +short www.defaultstack.online` het IP van de server toont voordat je een certificaat verwacht.

`www` en `api` zijn vaste namen. `*` vangt elke andere naam, zoals `demo.defaultstack.online`.

## Twee manieren van hosten

### A. VPS met een vast publiek IP

Het IP verandert niet. De A-record hierboven is genoeg. Poorten 80 en 443 staan op een VPS meestal al open bij de provider; 22 ook, voor SSH. `setup.sh` zet op de server een firewall die alleen 22, 80 en 443 binnenlaat.

### B. Thuis, achter een router

Twee varianten. Kies er één.

**B1. Poorten forwarden.** Op de router: extern TCP 80 naar het LAN-IP van de server poort 80, en extern TCP 443 naar poort 443. Forward 3000, 3100 en 5432 niet. SSH (22) forward je alleen als je van buitenaf moet inloggen, en dan met een sleutel, niet met een wachtwoord.

Het thuis-IP verandert. Houd de A-record van `@` bij:

- de dynamische-DNS-dienst van je registrar, als die er is, of
- DNS verhuizen naar Cloudflare (de domeinnaam mag bij de registrar blijven; je wijzigt alleen de nameservers) en dan elke vijf minuten `deploy/dns/cloudflare-ddns.sh`.

Voorbeeld cron, als root:

```cron
*/5 * * * * CF_ENV_FILE=/root/.secrets/cloudflare-ddns.env /var/www/defaultstack/deploy/dns/cloudflare-ddns.sh
```

Kopieer `deploy/dns/cloudflare-ddns.env.example` naar `/root/.secrets/cloudflare-ddns.env`, vul token en zone-id in, en `chmod 600` dat bestand. Laat `CF_PROXIED` uit (false) zolang je Let's Encrypt zelf op de server doet. `www`, `api` en `*` zijn CNAME naar `@`, dus alleen de apex hoeft bijgewerkt te worden.

Test de site vanaf mobiele data. Binnen je eigen wifi werkt de publieke naam soms niet (NAT-loopback).

**B2. Cloudflare Tunnel, geen poorten open.** Handig bij een router waarop je niet kunt forwarden, of achter CGNAT. Je zet dan geen A-record naar je huis-IP en je forwardt niets.

1. Maak een gratis Cloudflare-account en voeg `defaultstack.online` toe. Zet bij de registrar de nameservers die Cloudflare toont.
2. Installeer `cloudflared` volgens de Cloudflare-documentatie.
3. `cloudflared tunnel login` en `cloudflared tunnel create defaultstack`.
4. Kopieer `deploy/cloudflare/tunnel.example.yml` naar `/etc/cloudflared/config.yml`. Vul het tunnel-id en het pad naar het json-bestand in.
5. In het Cloudflare-dashboard, DNS: CNAME `www`, `api`, `@` en `*` naar `<tunnel-id>.cfargotunnel.com`, oranje wolk aan. `@` mag bij Cloudflare een CNAME zijn.
6. `sudo cloudflared service install` en start de service.
7. Draai daarna alsnog `setup.sh` zodat Nginx en de Next-app lokaal draaien. De tunnel praat met Nginx op `https://127.0.0.1:443`.

Het voorbeeld vertrouwt het tijdelijke self-signed certificaat van Nginx (`noTLSVerify`). Bezoekers zien het certificaat van Cloudflare, niet dat van de server. Cloudflare Universal SSL dekt `defaultstack.online` en `*.defaultstack.online`.

## Installeren

SSH-poort controleren voordat de firewall aan gaat:

```bash
sudo ss -lntp | grep ssh
```

Staat sshd niet op poort 22, start setup dan met die poort (22 blijft óók open):

```bash
sudo env SSH_PORT=2222 bash deploy/setup.sh
```

Clone en start (een gewone gebruiker met sudo, niet als root inloggen):

```bash
sudo mkdir -p /var/www/defaultstack
sudo chown "$USER:$USER" /var/www/defaultstack
git clone https://github.com/codingbydefault/defaultstack.git /var/www/defaultstack
cd /var/www/defaultstack
sudo bash deploy/setup.sh
```

`git pull` op de server moet later zonder wachtwoordprompt kunnen (SSH-sleutel of opgeslagen inloggegevens).

`setup.sh` doet het volgende, en mag vaker:

- installeert Nginx, Certbot, UFW en Node LTS als dat nodig is
- `npm ci` en `npm run build`
- PM2-proces `defaultstack-web` op `127.0.0.1:3100`, en een systemd-service zodat het na een reboot terugkomt
- Nginx: apex → www, www → Next, api → Express, wildcard volgens de map
- een tijdelijk self-signed certificaat, daarna een poging tot Let's Encrypt
- firewall: alleen SSH, 80 en 443

Lukt Certbot niet, dan is DNS of poort 80 meestal nog niet goed. De site draait dan wel, met een browserwaarschuwing. Als `dig` het juiste IP toont:

```bash
sudo bash deploy/tls/obtain-http01.sh
```

Dat certificaat dekt `defaultstack.online`, `www.defaultstack.online` en `api.defaultstack.online`. Dat is het pad voor de eerste dag. Een sterretje (`*.defaultstack.online`) kan HTTP-01 niet aanvragen.

## Controleren

```bash
curl -sI https://www.defaultstack.online | head -n 5
curl -sI https://defaultstack.online | head -n 8
curl -sI https://api.defaultstack.online | head -n 8
ss -lnt | grep -E ':3100|:3000|:5432'
pm2 status
```

Verwacht: www geeft 200. Apex geeft `301` met `Location: https://www.defaultstack.online/`. Poort 3100, 3000 en 5432 tonen `127.0.0.1`, niet `0.0.0.0`.

Express moet zelf op `127.0.0.1` binden. Luistert hij op `0.0.0.0`, pas dat in dat project aan. Dit repository bevat de Express-code niet en herstart hem niet. PM2 beheert alleen de Next-site. De notitie staat bovenin `deploy/ecosystem.config.cjs`.

## TLS

Certificaatbestanden voor Nginx zijn symlinks. `deploy/tls/relink-certs.sh` kiest ze opnieuw. Volgorde:

1. Let's Encrypt als dat er is
2. anders een Cloudflare-origin-certificaat in `/etc/nginx/defaultstack/origin/fullchain.pem` en `privkey.pem` (`chmod 600` op de key)
3. anders het tijdelijke self-signed certificaat

Een origin-certificaat vertrouwen browsers alleen via de oranje wolk of een tunnel, niet als iemand rechtstreeks naar je IP gaat. Aanmaken: Cloudflare → SSL/TLS → Origin Server → Create certificate, namen `defaultstack.online` en `*.defaultstack.online`, 15 jaar. Daarna `sudo bash deploy/tls/relink-certs.sh` en `sudo nginx -s reload`.

### HTTP-01, eerste dag

```bash
sudo bash deploy/tls/obtain-http01.sh
```

Poort 80 moet de server bereiken. Achter de oranje wolk van Cloudflare mislukt HTTP-01 vaak. Gebruik dan een origin-certificaat of DNS-01.

Verlengen doet Certbot zelf (systemd-timer op Ubuntu). Een hook herlaadt Nginx.

### DNS-01, wildcard

Kies één manier.

**Handmatig bij de registrar.** Het script toont een TXT-record. Zet dat bij de DNS en druk op Enter. Je hebt een terminal nodig, geen cron.

```bash
sudo bash deploy/tls/obtain-wildcard-dns01.sh manual
```

De naam is meestal `_acme-challenge.defaultstack.online`, type TXT. Certbot zegt het exact.

**Cloudflare DNS-plugin.** Alleen als de DNS bij Cloudflare staat. Kopieer `deploy/tls/cloudflare.ini.example` naar `/root/.secrets/certbot/cloudflare.ini`, vul een token in met Zone / DNS / Edit voor deze zone, `chmod 600`.

```bash
sudo bash deploy/tls/obtain-wildcard-dns01.sh cloudflare
```

**Andere plugin.** Heeft je DNS-host een Certbot-plugin (`python3-certbot-dns-...`), installeer die en vraag het certificaat aan met `--cert-name defaultstack.online-wildcard` voor `-d defaultstack.online -d '*.defaultstack.online'`. Daarna `sudo bash deploy/tls/relink-certs.sh` en `sudo nginx -s reload`. Er is geen plugin die voor elke registrar werkt. Zonder plugin: handmatig, of verhuis de nameservers naar Cloudflare.

Het wildcard-certificaat dekt `*.defaultstack.online` (één label: `demo`, niet `a.b`). `www` en `api` blijven op het HTTP-01-certificaat werken, ook voordat het wildcard-certificaat er is.

Tot het wildcard-certificaat er is, geeft een andere naam dan www of api een certificaatwaarschuwing. De route en de 404-pagina werken dan al wel.

## Een subdomein toevoegen

Eén regel, daarna herladen. Voorbeeld: een app op poort 3200 voor `demo.defaultstack.online`.

```bash
sudo bash deploy/nginx/add-subdomain.sh demo 3200
```

Of zelf een regel in `/etc/nginx/defaultstack/subdomains.map` (de kopie op de server, niet het voorbeeldbestand in git):

```text
demo.defaultstack.online 127.0.0.1:3200;
```

De puntkomma hoort erbij. Daarna:

```bash
sudo nginx -t && sudo nginx -s reload
```

De app luistert alleen op `127.0.0.1`. `www` en `api` komen niet in dit bestand. Een naam die er niet in staat krijgt de pagina `deploy/nginx/unknown-subdomain.html` met status 404.

DNS hoef je niet per naam te wijzigen zolang het `*`-record er is. Wel een geldig wildcard-certificaat, anders waarschuwt de browser.

## Bijwerken en terugdraaien van een release

Als de deploy-gebruiker, in de clone:

```bash
bash deploy/update.sh
```

Dat is `git pull --ff-only`, `npm ci`, build, `pm2 reload`, en een Nginx-herlaad als `nginx -t` slaagt. De Express-API wordt niet meegenomen. Lokale wijzigingen in de git-clone laten `--ff-only` stoppen; de subdomeinlijst staat buiten git en blijft staan.

Logs: `pm2 logs defaultstack-web`. Status: `pm2 status`.

## Terug naar Vercel

De Vercel-koppeling hoeft niet weg.

1. In Vercel: het project bouwt deze repository nog, `www.defaultstack.online` is het hoofddomein, en het apex-domein redirect naar www.
2. Zet bij de registrar de DNS-records die het Vercel-scherm nú toont. Gebruik die waarden, niet een oud voorbeeld. Vaak is dat een A-record op `@` en een CNAME van `www` naar `cname.vercel-dns.com`.
3. Haal het `*`-record weg, anders blijft wildcard-verkeer naar deze server gaan. Vercel serveert die namen niet vanzelf.
4. Haal ook `api` weg of wijs hem ergens anders heen als de API niet meer op deze server mag landen.
5. Wacht tot `dig` de Vercel-adressen toont. Controleer de site.
6. Optioneel, op de server: `pm2 stop defaultstack-web`. De firewall mag aan blijven.

## Bestanden

| Bestand | Rol |
| --- | --- |
| `deploy/setup.sh` | eerste installatie, veilig om te herhalen |
| `deploy/update.sh` | nieuwe git-versie bouwen en herladen |
| `deploy/ecosystem.config.cjs` | PM2 voor de Next-site op poort 3100 |
| `deploy/nginx/defaultstack.conf` | apex, www, api, HTTP-01-pad |
| `deploy/nginx/wildcard.conf` | `*.defaultstack.online` |
| `deploy/nginx/subdomains.map` | voorbeeld; de levende lijst staat in `/etc/nginx/defaultstack/subdomains.map` |
| `deploy/nginx/add-subdomain.sh` | één subdomein toevoegen |
| `deploy/nginx/install-config.sh` | config naar `/etc/nginx` kopiëren en herladen |
| `deploy/nginx/reload.sh` | Nginx via systemd, of rechtstreeks als systemd ontbreekt |
| `deploy/firewall/ufw.sh` | alleen SSH, 80 en 443; Postgres op localhost |
| `deploy/tls/obtain-http01.sh` | certificaat voor apex, www en api |
| `deploy/tls/obtain-wildcard-dns01.sh` | wildcard via DNS-01 |
| `deploy/tls/relink-certs.sh` | Nginx naar het beste certificaat wijzen |
| `deploy/dns/cloudflare-ddns.sh` | apex-A bijwerken voor een thuis-IP |
| `deploy/cloudflare/tunnel.example.yml` | tunnel zonder open poorten |
