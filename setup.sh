#!/bin/bash
# ============================================================
# setup.sh — Installation complète du projet P8
# Usage : ./setup.sh
# À lancer UNE SEULE FOIS lors de la première installation
# ============================================================

VERT="\033[0;32m"
ROUGE="\033[0;31m"
JAUNE="\033[1;33m"
BLEU="\033[0;34m"
RESET="\033[0m"

# ── Chemins ──────────────────────────────────────────────────
PROJET_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJET_DIR/../venv"
REQUIREMENTS="$PROJET_DIR/requirements.txt"
SCHEMA_SQL="$PROJET_DIR/backend/app/sql/schema.sql"
DB_NAME="project_gestion_donnees_etudiantes"

echo ""
echo -e "${BLEU}=================================================${RESET}"
echo -e "${BLEU}  ⚙️  PROJECT P8 — Installation                 ${RESET}"
echo -e "${BLEU}=================================================${RESET}"
echo ""

# ── Étape 1 : Environnement virtuel ──────────────────────────
echo -e "${BLEU}[1/5] Environnement virtuel...${RESET}"

if [ -f "$VENV_DIR/bin/activate" ]; then
    source "$VENV_DIR/bin/activate"
    echo -e "${VERT}✅ Venv existant activé : $VENV_DIR${RESET}"
else
    echo -e "${JAUNE}   Venv introuvable, création en cours...${RESET}"
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    echo -e "${VERT}✅ Venv créé et activé${RESET}"
fi

# ── Étape 2 : Dépendances Python ─────────────────────────────
echo ""
echo -e "${BLEU}[2/5] Installation des dépendances Python...${RESET}"

if [ -f "$REQUIREMENTS" ]; then
    pip install -r "$REQUIREMENTS" --quiet
    echo -e "${VERT}✅ Dépendances installées${RESET}"
else
    echo -e "${JAUNE}⚠️  requirements.txt introuvable, installation manuelle...${RESET}"
    pip install fastapi uvicorn pydantic psycopg2-binary --quiet
    echo -e "${VERT}✅ Paquets essentiels installés${RESET}"
fi

# ── Étape 3 : Vérifier PostgreSQL ────────────────────────────
echo ""
echo -e "${BLEU}[3/5] Vérification de PostgreSQL...${RESET}"

if ! command -v psql &> /dev/null; then
    echo -e "${ROUGE}❌ PostgreSQL n'est pas installé.${RESET}"
    echo -e "   Installez-le : ${JAUNE}sudo apt install postgresql${RESET}"
    exit 1
fi

# Démarrer PostgreSQL si nécessaire
if ! pg_isready -q 2>/dev/null; then
    echo -e "${JAUNE}   Démarrage de PostgreSQL...${RESET}"
    sudo service postgresql start
    sleep 2
fi
echo -e "${VERT}✅ PostgreSQL est actif${RESET}"

# ── Étape 4 : Créer la base de données ───────────────────────
echo ""
echo -e "${BLEU}[4/5] Base de données...${RESET}"

# Créer la base si elle n'existe pas
DB_EXISTE=$(sudo -u postgres psql -tAc \
    "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null)

if [ "$DB_EXISTE" = "1" ]; then
    echo -e "${JAUNE}   Base '$DB_NAME' déjà existante — ignoré${RESET}"
else
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    echo -e "${VERT}✅ Base '$DB_NAME' créée${RESET}"
fi

# ── Étape 5 : Créer les tables ───────────────────────────────
echo ""
echo -e "${BLEU}[5/5] Création des tables (schema.sql)...${RESET}"

if [ ! -f "$SCHEMA_SQL" ]; then
    echo -e "${ROUGE}❌ Fichier schema.sql introuvable : $SCHEMA_SQL${RESET}"
    echo -e "   Vérifiez la structure du projet."
    exit 1
fi

sudo -u postgres psql -d "$DB_NAME" -f "$SCHEMA_SQL"

if [ $? -eq 0 ]; then
    echo -e "${VERT}✅ Tables créées avec succès${RESET}"
else
    echo -e "${ROUGE}❌ Erreur lors de la création des tables.${RESET}"
    echo -e "   Vérifiez le fichier : $SCHEMA_SQL"
    exit 1
fi

# ── Résumé final ─────────────────────────────────────────────
echo ""
echo -e "${VERT}=================================================${RESET}"
echo -e "${VERT}  🎉 Installation terminée avec succès !         ${RESET}"
echo -e "${VERT}=================================================${RESET}"
echo ""
echo -e "  Base de données : ${VERT}$DB_NAME${RESET}"
echo -e "  Lancer le serveur : ${JAUNE}./run.sh${RESET}"
echo -e "  Ouvrir le frontend : ${JAUNE}frontend/index.html${RESET}"
echo -e "  Documentation API : ${JAUNE}http://localhost:8000/docs${RESET}"
echo ""