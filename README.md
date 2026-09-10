# DMK Services — Gestion débosselage & grêle

Application web full-stack pour un atelier de débosselage et réparation grêle : clients, véhicules, devis, PDF et tableau de bord.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma + MySQL
- Authentification JWT (cookie httpOnly) et rôles Admin / Estimateur / Lecteur
- Interface FR/EN (sélecteur de langue)
- Génération PDF (jsPDF) et envoi email (SMTP)

## Architecture

```mermaid
flowchart TB
  subgraph client [Navigateur]
    UI[Interface React + Tailwind]
  end

  subgraph next [Next.js 16 — App Router]
    Pages["Pages serveur / client"]
    API["Routes API REST"]
    Auth["proxy.ts — JWT cookie"]
    PDF["jsPDF — devis PDF"]
    Mail["Nodemailer — SMTP"]
    Files["Fichiers public/uploads"]
  end

  subgraph data [Persistance]
    Prisma[Prisma ORM]
    MySQL[(MySQL)]
  end

  UI --> Pages
  UI --> API
  Pages --> Auth
  API --> Auth
  Auth --> Prisma
  API --> Prisma
  Prisma --> MySQL
  API --> PDF
  API --> Mail
  API --> Files
```

| Couche | Rôle |
| --- | --- |
| **UI** | Tableau de bord, CRUD clients / véhicules / devis, paramètres |
| **proxy.ts** | Garde les routes authentifiées ; cookie `dmk_session` |
| **API** | Validation Zod, droits d’écriture (admin / estimateur), audit |
| **Prisma** | Schéma, relations, seed |
| **MySQL** | Données métier (utilisateurs, clients, véhicules, devis, journaux) |
| **PDF / SMTP** | Export devis et envoi email |

## Démarrage

```bash
nvm use
cp .env.example .env   # renseigner DATABASE_URL et JWT_SECRET
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

`DATABASE_URL` attend une connexion MySQL, par exemple :

```
mysql://USER:PASSWORD@HOST:3306/dmkservices
```

### Comptes de démonstration

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Admin | admin@dmkservices.fr | Admin1234! |
| Estimateur | estimator@dmkservices.fr | Estimator1234! |
| Lecteur | viewer@dmkservices.fr | Viewer1234! |

## MySQL local (optionnel)

Pour une base locale plutôt que le serveur distant :

```bash
docker compose up -d
# DATABASE_URL="mysql://dmk:dmk@localhost:3306/dmkservices"
npx prisma db push && npx prisma db seed
```

## Sauvegarde

Export JSON : Paramètres → Sauvegarde (admin)

## Modules

- Clients (CRUD, recherche, filtre, CSV)
- Véhicules (VIN, photos, multi-clients)
- Devis (lignes dynamiques, totaux, statuts, duplication, PDF, email)
- Paramètres entreprise, taux, barème Hagel Expert, listes de pièces, utilisateurs, journal d'audit

## Règles de calcul

Les heures PDR d’une ligne de devis sont calculées selon le barème **Hagel Expert** (configurable dans Paramètres → Hagel Expert). Les méthodes conventionnelle et remplacement restent en heures saisies manuellement.

### Heures PDR (Hagel Expert)

Pour chaque ligne PDR avec au moins une bosse :

1. Lecture de la table AW selon le nombre de bosses, l’orientation (horizontale / verticale) et le diamètre (Ø 10–80 mm). Le nombre de bosses est plafonné (250 en horizontal, 50 en vertical par défaut).
2. Conversion teiler :

   ```
   AW_base = arrondi( (AW_table + AW de base / panneau) × teiler / 10 )
   ```

   Le teiler (`wuPerHour`) vaut 10 (10er) ou 12 (12er).
3. Majorations optionnelles, appliquées dans cet ordre :

   ```
   si aluminium  → AW = arrondi(AW × (1 + % alu / 100))
   si collage    → AW = arrondi(AW × (1 + % collage / 100))
   ```

4. Finish par panneau (scalé au teiler) :

   ```
   AW += arrondi(finish / panneau × teiler / 10)
   ```

5. Sur la **première** ligne PDR du devis uniquement (Rüstzeit + finish véhicule) :

   ```
   AW += arrondi( (Rüstzeit + finish véhicule) × teiler / 10 )
   ```

6. Conversion en heures (2 décimales) :

   ```
   heures = AW / teiler
   ```

Valeurs par défaut du barème :

| Paramètre | Défaut | Rôle |
| --- | --- | --- |
| Teiler (AW / heure) | 10 | 10er = 10 AW/h, 12er = 12 AW/h |
| AW de base / panneau | 4 | Ajouté à la valeur lue dans la table |
| Finish / panneau | 2,5 AW | Ajouté à chaque ligne PDR |
| Rüstzeit véhicule | 6 AW | Une fois, sur la 1re ligne PDR |
| Finish véhicule | 13 AW | Une fois, sur la 1re ligne PDR |
| Aluminium | +25 % | Si la pièce est en alu |
| Collage / traction | +25 % | Si réparation par collage |

Exemple : 1 bosse, Ø 20 mm, horizontale, teiler 10 → table 2 + base 4 = 6 AW, + finish 3, + extras véhicule 19 → **28 AW = 2,8 h**.

Le calcul est appliqué à l’ouverture / validation de la popup panneau, à chaque modification des champs Hagel dans le tableau, et à l’enregistrement du devis (API).

### Montants du devis

- **Ligne horaire** : `(heures × taux) + pièces + peinture`. Le taux peut être remisé selon le % client (la remise s’applique au taux, pas au forfait).
- **Forfait par méthode** (PDR / Conventionnel / Remplacement) : si la méthode est en forfait, les lignes de cette méthode ne sont pas additionnées ; le montant forfaitaire paramétré sur le devis est utilisé.
- **Dégarnissage / montage** : montant saisi sur le devis, ajouté au sous-total.
- **TVA** : `sous-total × taux / 100` (taux par défaut dans Paramètres → Taux).
- **Total TTC** : sous-total + TVA.

```
sous-total = PDR + Conventionnel + Remplacement + peintures + dégarnissage
TVA        = sous-total × taux_TVA / 100
TTC        = sous-total + TVA
```
