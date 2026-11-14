# DefaultStack thuis, via Cloudflare Tunnel

De site draait op de Ubuntu-machine in huis, **LAN-adres 192.168.2.69**. Bezoekers komen binnen via Cloudflare. De router forwardt niets. Poort 80 en 443 op de server blijven dicht.

De canonische site is `https://www.defaultstackr.online`. `https://defaultstackr.online` stuurt met een 301 door naar www.

Cloudflare stopt TLS. De tunnel levert HTTP af bij Nginx op `127.0.0.1:80`. Nginx kiest daarna de bestemming:

| Verkeer | Gaat naar |
| --- | --- |
| `www.defaultstackr.online` | Next.js op `127.0.0.1:3100` |
| `defaultstackr.online` | 301 naar `https://www.defaultstackr.online` |
| `api.defaultstackr.online` | bestaande Express-API op `127.0.0.1:3000` |
| `iets.defaultstackr.online` | de poort in `/etc/nginx/defaultstack/subdomains.map`, of een 404-pagina |

Express en PostgreSQL start dit project niet. PostgreSQL blijft op localhost.

`setup.sh` staat standaard op tunnel (`MODE=tunnel`). Opnieuw draaien is veilig en overschrijft de subdomeinlijst niet.

## Wat jij doet

1. Maak een gratis account op [Cloudflare](https://dash.cloudflare.com/sign-up).
2. Kies **Add a site** en vul `defaultstackr.online` in. Kies het gratis plan.
3. Cloudflare toont **twee nameservers** voor deze zone. Zet bij je registrar precies die twee, in plaats van de nameservers van de registrar. Kopieer ze uit het scherm. Gebruik niet de nameservers van een ander account.
4. Wacht tot de zone in het Cloudflare-overzicht op **Active** staat. Dat kan een paar minuten tot een paar uur duren. Ga pas daarna verder.
5. Op de server (vanaf een computer in huis):

```bash
ssh JOUW_GEBRUIKER@192.168.2.69
```

Staat SSH niet op poort 22, gebruik die poort in het ssh-commando en later `SSH_PORT` (zie onderaan bij de firewall).

6. Clone en installeer de site. Nginx komt alleen op `127.0.0.1:80`. De firewall laat alleen SSH binnen.

```bash
sudo mkdir -p /var/www/defaultstack
sudo chown "$USER:$USER" /var/www/defaultstack
git clone https://github.com/codingbydefault/defaultstack.git /var/www/defaultstack
cd /var/www/defaultstack
sudo bash deploy/setup.sh
```

7. Start de tunnel. Het script opent een Cloudflare-login in de browser, maakt tunnel `defaultstack`, zet de DNS-records en installeert de systemd-service.

```bash
sudo bash deploy/cloudflared/setup-tunnel.sh
```

8. In Cloudflare: **SSL/TLS** → encryptiemodus **Full**. Niet Flexible. Full (strict) is niet nodig: de tunnel zelf is de versleutelde verbinding, en Nginx op de server heeft geen eigen certificaat.

9. Controleer vanaf je telefoon (niet alleen via wifi, als de router geen loopback doet):

```bash
curl -sI https://www.defaultstackr.online | head -n 8
curl -sI https://defaultstackr.online | head -n 8
```

www geeft 200. De apex geeft `301` met `Location: https://www.defaultstackr.online/`.

Het gratis **Universal SSL** van Cloudflare dekt `defaultstackr.online` en één niveau wildcard, `*.defaultstackr.online`. Je hoeft op de server geen Certbot te draaien voor die namen. Een naam als `a.b.defaultstackr.online` valt er niet onder.

`git pull` op de server moet later zonder wachtwoordprompt kunnen.

## Wat het script doet

`deploy/setup.sh`:

- installeert Nginx, UFW en Node LTS als dat nodig is (Node 22 of nieuwer blijft staan, anders Node 24)
- bouwt de Next.js-site en start hem met PM2 op `127.0.0.1:3100`
- zet Nginx in tunnel-modus
- firewall: alleen SSH

`deploy/cloudflared/setup-tunnel.sh`:

- installeert `cloudflared` uit de apt-repo van Cloudflare
- `cloudflared tunnel login` en tunnel `defaultstack`
- DNS via `cloudflared tunnel route dns` voor de apex, `www`, `api` en `*.defaultstackr.online`
- `cloudflared service install` zodat de tunnel na een reboot terugkomt

`cert.pem` en het credentials-JSON blijven in `/root/.cloudflared/`. Die bestanden komen niet in git en het script print ze niet. Kopieer ze niet naar de repository.

Forward op de router geen 80, 443, 3000, 3100 of 5432. Het LAN-adres 192.168.2.69 hoort niet in de publieke DNS.

## Een subdomein toevoegen

De `*`-route van de tunnel bestaat al. Universal SSL dekt de naam. Op de server is het één regel:

```bash
sudo bash deploy/nginx/add-subdomain.sh demo 3200
```

Dat schrijft in `/etc/nginx/defaultstack/subdomains.map`:

```text
demo.defaultstackr.online 127.0.0.1:3200;
```

De puntkomma hoort erbij. De app luistert alleen op `127.0.0.1`. `www` en `api` horen niet in dit bestand. Een onbekende naam krijgt de 404-pagina.

Geen nieuw DNS-record en geen nieuw certificaat per naam.

## Bijwerken

Als de gewone gebruiker, in de clone:

```bash
bash deploy/update.sh
```

Dat is `git pull --ff-only`, `npm ci`, build, `pm2 reload`, en Nginx opnieuw laden in de modus die `setup.sh` heeft gekozen (`/etc/nginx/defaultstack/mode`). Express wordt niet meegenomen.

Logs: `pm2 logs defaultstack-web` en `sudo journalctl -u cloudflared -n 50`.

## Alternatief: direct, zonder tunnel

Alleen als je later wél poort 80 en 443 naar 192.168.2.69 forwardt en een publiek IPv4-adres in DNS zet.

```bash
sudo MODE=direct bash deploy/setup.sh
```

Dan luistert Nginx op 80 en 443, probeert Certbot (HTTP-01 voor apex, www en api), en zet de firewall 22, 80 en 443 open. Een wildcard-certificaat kan HTTP-01 niet aan. Daarvoor:

```bash
sudo bash deploy/tls/obtain-wildcard-dns01.sh manual
```

of, als de DNS bij Cloudflare staat:

```bash
sudo bash deploy/tls/obtain-wildcard-dns01.sh cloudflare
```

DNS in die modus, `SERVER_IP` is het publieke IPv4-adres:

| Naam | Type | Waarde |
| --- | --- | --- |
| `@` | A | `SERVER_IP` |
| `www` | CNAME | `defaultstackr.online` |
| `api` | CNAME | `defaultstackr.online` |
| `*` | CNAME | `defaultstackr.online` |

Geen AAAA, tenzij IPv6 echt werkt. Een thuis-IP dat verandert houd je bij met de DDNS van de registrar, of met `deploy/dns/cloudflare-ddns.sh` als de DNS bij Cloudflare staat en je geen tunnel gebruikt. Zet dan geen tunnel-CNAME en dit A-record door elkaar.

SSH-poort niet 22:

```bash
sudo env SSH_PORT=2222 bash deploy/setup.sh
```

Poort 22 blijft dan ook open.

## Express en PostgreSQL

Express hoort op `127.0.0.1:3000`. PM2 in dit project start alleen de Next-site. PostgreSQL: `listen_addresses = 'localhost'`. De firewall weigert 5432, 3000 en 3100 van buitenaf.

## Terug naar Vercel

1. In Vercel blijft het project staan. www is het hoofddomein, de apex redirect naar www.
2. Haal de tunnel-records weg (de CNAME’s naar `cfargotunnel.com` voor `@`, `www`, `api` en `*`). Zet de records die het Vercel-scherm nú toont. Staat de DNS nog bij Cloudflare, dan wijzig je ze daar. Wil je de nameservers terug naar de registrar, doe dat en gebruik de records van Vercel bij de registrar.
3. `sudo systemctl stop cloudflared` en `sudo systemctl disable cloudflared`.
4. Optioneel: `pm2 stop defaultstack-web`.

## Bestanden

| Bestand | Rol |
| --- | --- |
| `deploy/setup.sh` | installatie; `MODE=tunnel` (standaard) of `MODE=direct` |
| `deploy/update.sh` | nieuwe git-versie bouwen en herladen |
| `deploy/cloudflared/config.yml` | tunnel-template naar Nginx op `127.0.0.1:80` |
| `deploy/cloudflared/setup-tunnel.sh` | cloudflared, tunnel, DNS, systemd |
| `deploy/nginx/tunnel.conf` | tunnel-Nginx: alleen `127.0.0.1:80` |
| `deploy/nginx/defaultstack.conf` | directe modus, poort 80 en 443 |
| `deploy/nginx/subdomains.map` | voorbeeld; de levende lijst staat in `/etc/nginx/defaultstack/` |
| `deploy/nginx/add-subdomain.sh` | één subdomein |
| `deploy/firewall/ufw.sh` | tunnel: alleen SSH; direct: SSH, 80 en 443 |
| `deploy/ecosystem.config.cjs` | PM2 voor Next op poort 3100 |
| `deploy/tls/` | alleen voor `MODE=direct` |
