#!/bin/bash

echo "🚀 Lancement du projet P8..."

# Activer l'environnement virtuel
source "/home/abdoulaye/Documents/Orange Digital center/Framework Python et APi/projetAPI/venv/bin/activate"

# Lancer FastAPI
cd "/home/abdoulaye/Documents/Orange Digital center/Framework Python et APi/projetAPI/PROJECT_P8/backend"
uvicorn main:app --reload --host 0.0.0.0 --port 8000