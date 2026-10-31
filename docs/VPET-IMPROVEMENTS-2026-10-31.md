# VPET — Piano di miglioramento e collaudo (31 ottobre 2026)

> Stato: proposta tecnica non ancora applicata all'interfaccia. Non pubblicare in produzione senza test.

## Situazione verificata
- Dominio `vpet.it` verificato su Vercel e reindirizzato a `www.vpet.it` (308).
- Progetto di produzione collegato ai domini: `vpet-v2-test`.
- Ultimo deployment osservato: READY, commit `c8991909457cec214de3aa107805cc382b6b6631`.
- Metadati commit: Home immersiva, controlli QA, 18 schede canine e 24 feline.
- Codice applicativo non ispezionato: non inferire implementazioni né dichiarare test superati.

## Percorso in tre fasi

### 1 — Stabilità e sicurezza (bloccante)
- Identificare framework, routes, API, storage, autenticazione e provider database.
- Backup e punto di ripristino prima delle modifiche.
- Censire link e bottoni, testare tutti i percorsi su iOS Safari, Android Chrome e desktop.
- Misurare Core Web Vitals, verificare immagini lazy-load, error boundaries e stati vuoti.
- Verificare accessibilità WCAG: contrasto, focus, testo scalabile, target touch, lettore schermo.
- Analizzare autenticazione e autorizzazioni prima di creare funzionalità account.
- Non usare posizioni, disponibilità o orari di veterinari senza fonti affidabili e informazioni temporali.

### 2 — Esperienza utente
- Proporre in Home quattro azioni principali: Pet SOS, Adozioni, Vicino a me, Eventi.
- Un solo campo di ricerca contestuale e navigazione coerente per smartphone.
- Evitare login obbligatorio per contenuti pubblici.
- Pet SOS: avviso che non sostituisce il veterinario; azioni contatta/indicazioni solo se dati verificati.
- Adozioni: filtro città/taglia/età, fonte dell'annuncio, data aggiornamento e segnalazione scheda non valida.
- Area Pet Carpet: eventi, festival e storie con chiara separazione dai servizi d'emergenza.

### 3 — Funzionalità evolutive
- Profilo facoltativo dell'animale e promemoria, previa analisi consenso e minimizzazione dati.
- Dashboard editoriale per gestire eventi, associazioni e guide senza modifiche al codice.
- Tracciamento anonimo e rispettoso della privacy degli errori e dell'efficacia della navigazione.
- Moderazione e verifica contenuti per annunci o testimonianze pubbliche.

## Checklist di accettazione
- [ ] Inventario completo dei percorsi realmente presenti
- [ ] Test navigazione e pulsanti su mobile e desktop
- [ ] Verifica accessibilità e prestazioni con evidenze prima/dopo
- [ ] Convalida dati e fonti per funzioni che incidono sulla salute animale
- [ ] Test su staging con URL separato dal dominio pubblico
- [ ] Verifica che contenuti e account esistenti siano conservati
- [ ] Piano di rollback documentato
- [ ] Pubblicazione solo dopo test funzionali riusciti

## Nota di gestione
Il piano è intenzionalmente documentale. Non aggiunge caratteristiche non verificate, non cambia l'interfaccia, non esegue migrazioni e non pubblica nulla.
