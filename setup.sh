#!/bin/bash

echo "🚀 Installation du projet P8..."

# Activer l'environnement virtuel existant
source "/home/abdoulaye/Documents/Orange Digital center/Framework Python et APi/projetAPI/venv/bin/activate"
echo "✅ Environnement virtuel activé"

# Installer les dépendances
pip install -r "/home/abdoulaye/Documents/Orange Digital center/Framework Python et APi/projetAPI/PROJECT_P8/requirements.txt"
echo "✅ Dépendances installées"

# Créer la base de données
echo "🗄️ Création de la base de données..."
sudo -u postgres psql -c "CREATE DATABASE project_gestion_donnees_etudiantes;" 2>/dev/null || echo "⚠️ Base déjà existante"

# Créer les tables
sudo -u postgres psql -d project_gestion_donnees_etudiantes -f "/home/abdoulaye/Documents/Orange Digital center/Framework Python et APi/projetAPI/PROJECT_P8/backend/sql/init_db.sql"
echo "✅ Tables créées"

# Insérer les données de base
sudo -u postgres psql -d project_gestion_donnees_etudiantes -f "/home/abdoulaye/Documents/Orange Digital center/Framework Python et APi/projetAPI/PROJECT_P8/backend/sql/insert.sql"
echo "✅ Données de base insérées"

echo "🎉 Installation terminée !"
echo "👉 Lance ./run.sh pour démarrer"