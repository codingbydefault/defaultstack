# Databaseprojecten op DefaultStackr

Doel: één beheerportaal op `defaultstackr.cloud` met een afzonderlijk profiel per app. Een profiel toont de app, deployments, database, opslag, logs, backups en toegangsrechten. De data van verschillende apps blijft gescheiden.

| Profiel | Broncode bekend | Huidige datakant bekend | Eerste migratiestap |
| --- | --- | --- | --- |
| Plainwork Studio | `codingbydefault/plainwork-studio` | Supabase Auth, PostgreSQL, Storage, Data API; Stripe-webhooks | Testdeploy op `plainwork.defaultstackr.cloud`, daarna databasekopie in geïsoleerde testomgeving |
| Fodmaptracker | `codingbydefault/fodmaptracker2.0` | Supabase Auth, PostgreSQL met RLS, privé Storage | Schema, Auth-gebruikers, buckets en data inventariseren; gezondheidsdata extra afschermen |
| De Bumperbank | Repository nog niet gekoppeld | Onbekend | Repository en huidige databasebron vinden |
| GeregeldWerk | Repository nog niet gekoppeld | Onbekend | Repository en huidige databasebron vinden |
| DefaultStackr frontend | `codingbydefault/defaultstack` | Projectmetadata via `defaultstackr-api` en lokale PostgreSQL | Frontendcontract `/v1` afstemmen op de echte API `/api/projects` |

## Architectuur voor de eerste versie

- Eén platformdatabase voor organisaties, gebruikers, projectprofielen, toegangsrechten, deployments, domeinen, logs en backupstatus. Die database is alleen voor het beheerportaal en de worker.
- Per app een eigen PostgreSQL-database met een eigen gebruiker en backup. Een profiel in de UI wijst naar die database; UI-isolatie alleen is onvoldoende.
- Apps die Supabase SDK gebruiken hebben naast PostgreSQL ook compatibele Auth, Storage en Data API nodig. Voor de eerste migratie is een aparte self-hosted Supabase-omgeving per app het eenvoudigst te valideren. Consolidatie op één gedeelde instantie vraagt extra isolatieontwerp.
- Maak per project een herstelbare backup vóór de eerste import, controleer aantallen en steekproeven na import, en test gebruikerslogin, RLS, bestandsupload, downloaden en webhooks vóór omzetten van productie-URLs.
- Bewaar productiedata niet in de platformdatabase en toon geheime sleutels nooit in logs of browserantwoorden.

## Volgorde

1. Maak de bestaande frontend en `defaultstackr-api` compatibel; schakel mockmodus uit en toon werkelijke projecten, deployments en logs op `.cloud`.
2. Deploy Plainwork op een preview-subdomein met de bestaande Supabase-omgeving. Dit test de deploy-worker zonder een datamigratie te mengen met het deployprobleem.
3. Zet een aparte self-hosted Supabase-testomgeving voor Plainwork op. Herstel database en Auth, kopieer Storage-objecten, pas callback-URLs en Stripe-testwebhooks aan en test de volledige gebruikersstroom.
4. Migreer Fodmaptracker volgens dezelfde procedure, met controle van RLS, privéfoto's, accountverwijdering en gezondheidsgegevens.
5. Inventariseer De Bumperbank en GeregeldWerk voordat een migratiepad wordt gekozen.
6. Bouw daarna de profielweergave en geautomatiseerde provisioning/backups uit voor nieuwe klantprojecten.

De huidige repositories en deze workspace bevatten geen toegang tot de live Supabase-projecten, de thuisserver of de Stripe-configuratie. Er is dus nog geen live database verplaatst en geen Plainwork-deploy uitgevoerd.
