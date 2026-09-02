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
- Paramètres entreprise, taux, listes de pièces, utilisateurs, journal d'audit
