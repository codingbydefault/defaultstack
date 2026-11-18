# DefaultStackr pakketten en basisrechten

Status: catalogus en interface voorbereid; betaalde abonnementen en rechten voor individuele gebruikers zijn nog niet live.

## Pakketten

| Pakket | Maand | Jaar | Gelijktijdig actieve projecten | Totale databaseopslag |
| --- | ---: | ---: | ---: | ---: |
| Free | € 0 | € 0 | 3 | 2 GB |
| Pro | € 29 | € 290 | 10 | 5 GB |
| Business | € 59 basis | € 590 basis | 10 inbegrepen | 5 GB inbegrepen |

Bedragen zijn exclusief btw. Bij Business: € 5 per extra actief project per maand en € 2 per extra begonnen GB databaseopslag per maand. De jaarprijs dekt het vaste basisdeel; extra verbruik wordt maandelijks afgerekend. Jaarbetaling geeft twee maanden korting op het basisdeel. Een nieuwe versie van een bestaand project kost geen extra projectplaats.

De productdefinitie in `src/lib/billing/catalog.json` is de bron voor de site en het Stripe-catalogusscript. Verander bestaande Stripe-prijzen niet stilzwijgend: maak een nieuwe catalogusversie en migreer klanten bewust.

## Meting vóór facturatie

- Een project telt als actief zodra het een live deployment heeft. Stoppen of archiveren maakt een plaats vrij.
- Voor Business moet de facturatieregel vóór verkoop worden vastgelegd. Voorstel: hoogste aantal gelijktijdig actieve projecten in een kalendermaand en hoogste databaseopslag in die maand, afgerond op hele GB boven 5 GB. Laat deze waarde, tijdstippen en verwachte rekening in het dashboard zien.
- Geen variabele factuur voordat de gebruiker het gebruiksmodel en een bestedingslimiet heeft aanvaard. Bij het bereiken van de limiet eerst extra capaciteit blokkeren en de gebruiker waarschuwen; bestaande applicaties blijven bereikbaar.
- Meet databasegebruik per project met Postgres-statistieken en schrijf periodieke, onveranderbare gebruiksmetingen weg. Bewaar de ruwe metingen voor controle en betwisting.
- Free en Pro hebben harde limieten. Bij overschrijding worden nieuwe actieve projecten of groei boven de databasegrens tegengehouden of wordt een upgrade gevraagd; geen automatische meerkosten.

## Rollen per organisatie en project

| Handeling | Eigenaar | Beheerder | Ontwikkelaar | Lezer |
| --- | :---: | :---: | :---: | :---: |
| Projecten, logs en gebruik bekijken | ja | ja | ja | ja |
| Project aanmaken en uitrollen | ja | ja | ja | nee |
| Eigen projectmigraties uitvoeren | ja | ja | ja, met projectrecht | nee |
| Productieomgeving en geheimen beheren | ja | ja | nee | nee |
| Teamleden uitnodigen en rollen wijzigen | ja | ja | nee | nee |
| Pakket, valuta en bestedingslimiet wijzigen | ja | nee | nee | nee |

Een gebruiker ziet alleen organisaties en projecten waarvan hij lid is. Elke mutatie controleert serverzijdig organisatie, project en rol; een verborgen knop is geen autorisatie. Migraties draaien met een rol die uitsluitend de eigen projectdatabase mag wijzigen. Publieke sleutels mogen geen beheersrechten hebben; geheime API-sleutels worden alleen serverzijdig gebruikt, versleuteld opgeslagen en zijn roteerbaar. Facturatie wordt alleen aangepast na een geverifieerde Stripe-webhook, niet op basis van een browserredirect. Webhooks zijn idempotent en herhaalbaar.

De huidige API en dashboard gebruiken nog één beheerdersessie en een admin API-sleutel. Er is nog geen veilig eigenaarschap per klant, geen projectdatabase-provisioning, geen betrouwbare quota-handhaving, geen gebruiksmeting en geen Stripe-abonnementswebhook. Zet daarom geen betaalde checkout live en ken geen rechten toe op basis van de gekozen prijs in de browser.

## Stripe en valuta

In het bestaande codedbydefault Stripe-account zijn de vaste Pro- en Business-producten met maand- en jaarprijzen aangemaakt:

| Product | Maandprijs | Jaarprijs |
| --- | --- | --- |
| Pro `prod_VeFCJbqiETCDKh` | `price_1UcwhkBKzTHLz3CagtU5zx2z` | `price_1UcwixBKzTHLz3Cah0tnVDgM` |
| Business `prod_VeFEYd8w1bJpmV` | `price_1UcwkABKzTHLz3CaQt17s1qR` | `price_1Ucwn8BKzTHLz3CaLSDyaYGU` |

Deze prijzen staan in de catalogus, maar er zijn nog geen Checkout-links of actieve abonnementen. De twee Business-verbruiksprijzen zijn nog niet in Stripe aangemaakt, omdat de meting, limiet en klantinstemming ontbreken.

`node scripts/stripe/sync-catalog.mjs` toont de catalogus zonder Stripe-toegang. Met een eigen Stripe testsleutel in `STRIPE_SECRET_KEY` controleert `node scripts/stripe/sync-catalog.mjs --apply` bestaande producten en prijzen op catalogusmetadata, bedrag en periode; ontbrekende vermeldingen worden inactief aangemaakt. Voor een livesleutel is bovendien `--live` vereist. Het script maakt nooit een Checkout-link of abonnement. Controleer het Stripe-accountnummer in de uitvoer voordat verdere koppeling plaatsvindt.

Het profiel bewaart voorlopig EUR, USD of GBP als voorkeur in een ondertekende cookie voor de beheersessie. Een toekomstig gebruikersprofiel moet de voorkeur in de eigen organisatie opslaan. De uiteindelijke prijs moet vóór Checkout in de betaalvaluta worden getoond en mag niet met een verouderde lokale wisselkoers worden berekend. Stripe kan betaalvaluta naar de uitbetalingsvaluta EUR omzetten als het account voor EUR-uitbetaling staat; de netto-ontvangst hangt af van wisselkoers, kosten en btw. Controleer die instellingen in het Stripe-dashboard voordat niet-eurobetalingen worden aangeboden.
