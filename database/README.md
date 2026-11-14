# Migraties en RLS: eerste basis

PostgreSQL levert RLS zelf. Deze map legt de basis voor versiebeheer van schema's,
zonder Supabase-service. Nog geen dashboard-UI voor policies of migraties.

## Alleen een aparte testdatabase

Laat een databasebeheerder eerst een lege testdatabase en een migratiegebruiker
maken. Gebruik nooit de bestaande users/products-database voor deze eerste proef.
Installeer postgresql-client. Stel PGHOST, PGPORT, PGUSER en PGDATABASE in en
gebruik een lokaal .pgpass-bestand met rechten 600 voor het wachtwoord.

```bash
PGHOST=127.0.0.1 PGUSER=JOUW_MIGRATIEGEBRUIKER PGDATABASE=defaultstack_test bash database/migrate.sh
```

De runner registreert bestandsnaam en SHA-256, voert elke migratie in één
transactie uit, weigert gewijzigde reeds toegepaste bestanden en gebruikt een
advisory lock tegen gelijktijdige runs. Maak nieuwe genummerde bestanden voor
wijzigingen. Een mislukte migratie wordt teruggedraaid; oudere succesvolle
migraties blijven staan. Een schemawijziging terugdraaien gebeurt met een nieuwe
migratie en vooraf geteste back-up, niet door automatisch DROP uit te voeren.

## RLS-model

0001 maakt platform.projects met owner_id en een bijbehorende index. RLS en
FORCE RLS staan aan, met USING én WITH CHECK. Zonder gebruikerscontext zijn
rijen niet toegankelijk. Er worden bewust geen rechten aan PUBLIC verleend.

Voor echte integratie zijn nog nodig:

- Een aparte runtime-role met NOSUPERUSER NOBYPASSRLS en alleen benodigde grants.
- Login/sessionvalidatie in de API; de browser mag geen gebruikers-ID kiezen.
- Per request één uitgecheckte poolclient: BEGIN, set_config('app.user_id',
  geverifieerde_uuid, true), queries, COMMIT; bij fouten ROLLBACK en altijd release.
  Gebruik geen losse pool.query-opdrachten voor deze transactie.
- Tests met twee gebruikers: eigen rijen zichtbaar, andermans rijen onzichtbaar,
  schrijven met een andere owner geweigerd, geen context geen toegang.

Superusers en rollen met BYPASSRLS omzeilen RLS, ook met FORCE. Geef klanten
geen directe toegang met de gedeelde API-databaserol: die kan zelf app.user_id
instellen. Voor directe SQL-toegang is een ander rolmodel nodig.

Bestaande users/products hebben hiermee nog geen RLS: daarvoor moeten eerst het
schema, bestaande data en de echte databasegebruiker worden gecontroleerd.

RLS-test na migreren, als beheerder op de lege testdatabase:

```bash
psql -X -v ON_ERROR_STOP=1 -f database/tests/rls.sql
```

Deze test gebruikt een tijdelijke rol in een transactie en draait wijzigingen terug.
