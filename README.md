# 🎓 PROJECT P8 — Gestion des Données Étudiantes

> **Projet Final Intégrateur — DEV DATA P8**
> Orange Digital Center · Dakar, Sénégal

Application web full-stack de gestion, visualisation et analyse de données étudiantes.

---

## 🧱 Stack Technique

| Couche | Technologie |
|---|---|
| Backend | Python 3.13, FastAPI, Pydantic |
| Base de données | PostgreSQL, psycopg2, SQL manuel |
| Frontend | HTML5, Tailwind CSS, JavaScript (fetch) |
| Visualisation | Chart.js |
| Système | Linux Ubuntu, Bash |
| Versioning | Git, GitHub |

---

## 🗂️ Structure du Projet

```
PROJECT_P8/
├── backend/
│   └── app/
│       ├── main.py                    # Point d'entrée FastAPI
│       ├── config.py                  # Configuration (DB, chemins)
│       ├── database.py                # Connexion PostgreSQL + utilitaires SQL
│       ├── schemas.py                 # Validation Pydantic
│       ├── routes/
│       │   ├── students.py            # Routes étudiants (CRUD + notes + import)
│       │   └── dashboard.py           # Routes statistiques
│       ├── services/
│       │   ├── student_service.py     # Logique métier étudiants
│       │   ├── note_service.py        # Calcul des notes et moyennes
│       │   └── dashboard_service.py   # Calcul des statistiques
│       └── sql/
│           └── schema.sql             # Schéma de la base de données
├── backend/data/
│   ├── valides.json                   # Données valides (source secondaire)
│   └── invalides.json                 # Données invalides (phase optionnelle)
├── frontend/
│   ├── index.html                     # Liste des étudiants
│   ├── dashboard.html                 # Tableau de bord
│   ├── archives.html                  # Étudiants archivés
│   ├── import.html                    # Import JSON → DB
│   └── js/
│       ├── api.js                     # Tous les appels fetch() vers le backend
│       ├── index.js                   # Logique liste + ajout + édition + notes
│       ├── dashboard.js               # Graphiques Chart.js
│       ├── archives.js                # Affichage + restauration archives
│       └── import.js                  # Import JSON vers PostgreSQL
├── requirements.txt
├── run.sh                             # Lancer le serveur
├── setup.sh                           # Installation complète
└── README.md
```

---

## 🔄 Architecture & Flux de Données

```
Navigateur (HTML + JS)
        ↕  fetch()
   FastAPI — routes/
        ↕
   services/  (logique métier + calculs)
      ↙              ↘
PostgreSQL        valides.json
  (DB)              (JSON)
```

**Règle fondamentale :**
Le frontend ne touche **jamais** directement la base de données.
Tout passe par l'API FastAPI.

---

## 📦 Sources de Données

| Source | Rôle | Accès |
|---|---|---|
| PostgreSQL | Source principale | Lecture + Écriture |
| valides.json | Source secondaire | Lecture seule |

**Logique de fusion :**
1. Le backend interroge PostgreSQL en premier.
2. Si le nombre de résultats est insuffisant, il complète avec `valides.json`.
3. Chaque ligne affichée indique son origine : **DB** ou **JSON**.

---

## 🌐 Endpoints API

### Étudiants `/students`

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/students/` | Liste paginée (fusion DB + JSON) |
| POST | `/students/` | Créer un étudiant avec ses notes |
| GET | `/students/{id}` | Détail d'un étudiant |
| PUT | `/students/{id}` | Modifier un étudiant (DB uniquement) |
| DELETE | `/students/{id}` | Archiver un étudiant |
| POST | `/students/{id}/restore` | Restaurer un étudiant archivé |
| GET | `/students/{id}/notes` | Notes + moyennes calculées |
| POST | `/students/{id}/notes` | Ajouter / modifier une note |
| DELETE | `/students/{id}/notes/{note_id}` | Supprimer une note |
| GET | `/students/archives` | Liste des archivés |
| GET | `/students/json-preview` | Étudiants JSON non importés |
| POST | `/students/import` | Importer JSON → PostgreSQL |
| GET | `/students/classes-liste` | Liste des classes |
| GET | `/students/matieres-liste` | Liste des matières |

### Dashboard `/dashboard`

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/stats` | KPI globaux |
| GET | `/dashboard/classes` | Moyennes et effectifs par classe |
| GET | `/dashboard/top10` | Top 10 meilleures moyennes |
| GET | `/dashboard/repartition-source` | Actifs vs archivés |

---

## 📐 Règles de Calcul des Moyennes

```
moyenne_devoirs  = somme(notes_devoir) / nombre_devoirs
moyenne_matière  = (moyenne_devoirs + note_examen) / 2
moyenne_générale = somme(moyennes_matières) / nombre_matières
```

Cas particuliers :
- Pas de devoirs → moyenne_matière = note_examen
- Pas d'examen  → moyenne_matière = moyenne_devoirs

---

## 🎛️ Fonctionnalités

- [x] Liste paginée des étudiants (DB + JSON fusionnés)
- [x] Indicateur d'origine DB / JSON par ligne
- [x] Recherche par nom, prénom, numéro, code
- [x] Filtrage par classe et par source
- [x] Ajout d'un étudiant avec matières et notes
- [x] Calcul automatique des moyennes (live + backend)
- [x] Édition complète via modale (infos + notes)
- [x] Archivage soft (jamais de suppression physique)
- [x] Restauration des archives
- [x] Import JSON → PostgreSQL avec détection doublons
- [x] Dashboard : KPI + 3 graphiques Chart.js
- [ ] Gestion des données invalides *(Phase 2)*

---

## 🚀 Installation et Lancement

### Prérequis
- Python 3.13+
- PostgreSQL installé et démarré
- Git

### Installation complète (première fois)

```bash
# Cloner le projet
git clone https://github.com/votre-username/PROJECT_P8.git
cd PROJECT_P8

# Lancer le script d'installation
chmod +x setup.sh
./setup.sh
```

### Lancer le serveur

```bash
chmod +x run.sh
./run.sh
```

### Accéder à l'application

| Page | URL |
|---|---|
| Liste étudiants | Ouvrir `frontend/index.html` |
| Dashboard | Ouvrir `frontend/dashboard.html` |
| Import | Ouvrir `frontend/import.html` |
| Archives | Ouvrir `frontend/archives.html` |
| API docs | http://localhost:8000/docs |
| Santé API | http://localhost:8000/health |

---

## 🔑 Règles Métier

1. **SQL manuel** — aucun ORM utilisé.
2. **Seules les données DB sont modifiables** — JSON est lecture seule.
3. **Archivage soft** — `UPDATE etudiants SET archived = TRUE` (jamais de DELETE).
4. **Doublons détectés via le champ `numero`** lors de l'import JSON.
5. **Pagination côté backend** — le frontend ne charge jamais tout d'un coup.

---

## 📊 Base de Données

```sql
classes    (id, nom_classe)
etudiants  (id, code, numero, nom, prenom, date_naissance,
            classe_id, source, archived, created_at)
matieres   (id, nom_matiere)
notes      (id, etudiant_id, matiere_id, nom_evaluation,
            type_evaluation, valeur, created_at)
```

---

## 📌 Versions

| Version | Description | Statut |
|---|---|---|
| v0.1 | Structure + README | ✅ |
| v0.2 | Backend connexion DB + routes | ✅ |
| v0.3 | Services + calcul moyennes | ✅ |
| v0.4 | Frontend liste + ajout + édition | ✅ |
| v0.5 | Dashboard + Chart.js | ✅ |
| v0.6 | Notes + moyennes dans modale | ✅ |
| v1.0 | Version complète fonctionnelle | 🔄 En cours |

---

*Projet réalisé dans le cadre du programme DEV DATA P8*
*Orange Digital Center — Dakar, Sénégal*