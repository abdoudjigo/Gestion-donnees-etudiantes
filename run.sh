#!/bin/bash
# ============================================================
# run.sh — Lance le serveur FastAPI du projet P8
# Usage : ./run.sh
# ============================================================

# Couleurs pour les messages
VERT="\033[0;32m"
ROUGE="\033[0;31m"
JAUNE="\033[1;33m"
RESET="\033[0m"

echo ""
echo -e "${VERT}=================================================${RESET}"
echo -e "${VERT}  🚀 PROJECT P8 — Lancement du serveur          ${RESET}"
echo -e "${VERT}=================================================${RESET}"
echo ""

# ── 1. Trouver la racine du projet (dossier de ce script) ───
PROJET_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJET_DIR/backend/app"
VENV_DIR="$PROJET_DIR/../venv"

echo -e "📁 Projet    : $PROJET_DIR"
echo -e "📁 Backend   : $BACKEND_DIR"
echo ""

# ── 2. Vérifier que le dossier backend/app existe ───────────
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${ROUGE}❌ Dossier backend/app introuvable.${RESET}"
    echo -e "   Lancez d'abord : ${JAUNE}./setup.sh${RESET}"
    exit 1
fi

# ── 3. Activer l'environnement virtuel ───────────────────────
if [ -f "$VENV_DIR/bin/activate" ]; then
    source "$VENV_DIR/bin/activate"
    echo -e "${VERT}✅ Environnement virtuel activé${RESET}"
else
    echo -e "${JAUNE}⚠️  Venv introuvable à $VENV_DIR${RESET}"
    echo -e "   On continue sans activation (venv peut être déjà actif)"
fi

# ── 4. Vérifier que PostgreSQL est démarré ───────────────────
if ! pg_isready -q 2>/dev/null; then
    echo -e "${JAUNE}⚠️  PostgreSQL ne semble pas démarré.${RESET}"
    echo -e "   Lancez : ${JAUNE}sudo service postgresql start${RESET}"
    echo ""
fi

# ── 5. Lancer uvicorn depuis backend/app/ ───────────────────
echo -e "${VERT}🌐 Serveur disponible sur :${RESET}"
echo -e "   API      → http://localhost:8000"
echo -e "   Docs     → http://localhost:8000/docs"
echo -e "   Santé    → http://localhost:8000/health"
echo ""
echo -e "${JAUNE}  Ctrl+C pour arrêter${RESET}"
echo ""

cd "$BACKEND_DIR"
uvicorn main:app --reload --host 0.0.0.0 --port 8000