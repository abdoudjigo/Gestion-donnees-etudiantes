# 📚 PROJECT P8 — Gestion des Données Étudiantes

> Application web full-stack de gestion, visualisation et analyse de données étudiantes.  
> Projet Final Intégrateur — DEV DATA P8 | Orange Digital Center Dakar

---

## 🎯 Objectif

Transformer un script Python de traitement de données en une **vraie application web professionnelle** capable de :

- gérer des données étudiantes depuis plusieurs sources
- afficher, rechercher, modifier et archiver des enregistrements
- visualiser des statistiques via un tableau de bord interactif

---

## 🧱 Stack Technique

| Couche | Technologie |
|---|---|
| Backend | Python, FastAPI, Pydantic |
| Base de données | PostgreSQL, psycopg2, SQL manuel |
| Frontend | HTML, CSS, JavaScript (fetch) |
| Visualisation | Chart.js |
| Système | Linux (Ubuntu), Bash |
| Versioning | Git, GitHub |

---

## 🗂️ Structure du Projet

```
PROJECT_P8/
│
├── backend/
│   ├── main.py               # Point d'entrée FastAPI
│   ├── database.py           # Connexion PostgreSQL
│   ├── models.py             # Modèles logiques
│   ├── schemas.py            # Validation Pydantic
│   │
│   ├── routes/
│   │   ├── students.py       # Endpoints étudiants (CRUD + import)
│   │   └── dashboard.py      # Endpoints statistiques
│   │
│   ├── services/
│   │   ├── student_service.py     # Logique métier étudiants
│   │   ├── pagination_service.py  # Pagination intelligente DB + JSON
│   │   └── sync_service.py        # Synchronisation JSON → PostgreSQL
│   │
│   └── data/
│       ├── valides.json      # Données valides (source secondaire)
│       ├── invalides.json    # Données invalides (phase optionnelle)
│       └── bigdata.csv       # Données brutes massives
│
├── frontend/
│   ├── index.html            # Interface principale
│   ├── app.js                # Communication API via fetch()
│   └── style.css             # Styles de l'application
│
├── requirements.txt          # Dépendances Python
└── README.md                 # Ce fichier
```

---

## 🔄 Architecture & Flux de Données

```
Utilisateur (navigateur)
        ↓  ↑
   HTML / CSS / JS
        ↓  ↑  fetch()
     FastAPI (routes)
        ↓  ↑
   Services (logique métier)
      ↙        ↘
PostgreSQL    valides.json / bigdata.csv
```

**Règle fondamentale :**  
Le frontend ne touche **jamais** directement la base de données.  
Tout passe par l'API FastAPI.

---

## 📦 Sources de Données

| Source | Rôle | Accès |
|---|---|---|
| `PostgreSQL` | Source principale | Lecture + Écriture |
| `valides.json` | Source secondaire / backup | Lecture seule |
| `bigdata.csv` | Masse brute de données | Lecture seule |

**Logique de fusion :**  
1. Le backend interroge PostgreSQL en premier.  
2. Si le nombre de résultats est insuffisant, il complète avec `valides.json`.  
3. Chaque ligne affichée indique son origine : **DB** ou **JSON**.

---

## 📄 Détail des Fichiers Backend

### `main.py`
Point d'entrée de l'application. Lance le serveur Uvicorn et enregistre toutes les routes.

### `database.py`
Gère la connexion à PostgreSQL via `psycopg2`. Fournit une fonction de connexion réutilisable dans tous les services.

### `models.py`
Définit la structure logique des données (étudiant, matière, note) utilisée en interne.

### `schemas.py`
Valide les données entrantes et sortantes avec **Pydantic**. Sépare les schémas de création, de mise à jour et de réponse.

---

## 🌐 Détail des Routes

### `routes/students.py`
Gère toutes les opérations sur les étudiants :

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/students` | Liste paginée avec fusion DB + JSON |
| POST | `/students` | Ajout d'un étudiant dans PostgreSQL |
| PUT | `/students/{id}` | Modification d'un étudiant (DB uniquement) |
| DELETE | `/students/{id}` | Archivage (soft delete) |
| POST | `/students/import` | Import depuis valides.json vers PostgreSQL |

### `routes/dashboard.py`
Fournit les données statistiques pour Chart.js :

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/stats` | KPI globaux |
| GET | `/dashboard/classes` | Répartition par classe |
| GET | `/dashboard/top10` | Top 10 des meilleures moyennes |

---

## ⚙️ Détail des Services

### `services/student_service.py`
Logique principale des étudiants :
- fusion des données PostgreSQL + JSON
- filtrage par nom, classe, source
- formatage de la réponse finale

### `services/pagination_service.py`
**Cœur du projet.** Gère la pagination intelligente :
- calcul `LIMIT` / `OFFSET` pour PostgreSQL
- complétion automatique avec `valides.json` si nécessaire
- fusion propre sans doublons
- gestion du pointeur JSON

### `services/sync_service.py`
Synchronisation JSON → PostgreSQL :
- lecture de `valides.json`
- détection des doublons par `numero`
- insertion sécurisée dans PostgreSQL
- les données importées deviennent modifiables

---

## 🎛️ Fonctionnalités Principales

- [x] Affichage paginé des étudiants (5 par page par défaut)
- [x] Fusion intelligente DB + JSON
- [x] Indicateur d'origine (DB / JSON) par ligne
- [x] Recherche par numéro, code, nom, prénom
- [x] Filtrage par classe et par source
- [x] Ajout d'un étudiant (PostgreSQL)
- [x] Modification cellule par cellule (double-clic)
- [x] Archivage soft (données conservées, non supprimées)
- [x] Restauration des données archivées
- [x] Import JSON → PostgreSQL avec détection doublons
- [x] Dashboard avec graphiques Chart.js
- [ ] Gestion des données invalides *(Phase 2 — optionnelle)*

---

## 📊 Dashboard

Le tableau de bord affiche :

- **KPI globaux** : total étudiants, DB vs JSON, archivés
- **Répartition par classe**
- **Répartition par source** (DB / JSON / CSV)
- **Moyenne générale par classe**
- **Top 10 des meilleures moyennes**

---

## 🔑 Règles Métier Importantes

1. **SQL manuel obligatoire** — aucun ORM utilisé.
2. **Seules les données DB sont modifiables** — JSON et CSV sont en lecture seule.
3. **Archivage soft** — `UPDATE students SET archived = true` (jamais de DELETE).
4. **Doublons détectés via le champ `numero`** lors de l'import JSON.
5. **Pagination côté backend** — le frontend ne charge jamais tout d'un coup.

---

## 🚀 Lancement du Projet

```bash
# Installer les dépendances
pip install -r requirements.txt

# Lancer le backend
cd backend
uvicorn main:app --reload

# Ouvrir le frontend
# Ouvrir index.html dans le navigateur
# ou utiliser Live Server dans VS Code
```

---

## 📌 Suivi des versions

| Version | Description |
|---|---|
| v0.1 | Structure du projet + README | ✅ Fait
| v0.2 | Backend : connexion DB + routes étudiants | ✅ Fait
| v0.3 | Pagination intelligente DB + JSON |
| v0.4 | Frontend : affichage + fetch |
| v0.5 | Dashboard + Chart.js |
| v1.0 | Version complète fonctionnelle |

---

*Projet réalisé dans le cadre du programme DEV DATA P8 — Orange Digital Center, Dakar, Sénégal.*
