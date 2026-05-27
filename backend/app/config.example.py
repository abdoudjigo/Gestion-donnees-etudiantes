# Copiez ce fichier en config.py et remplissez vos valeurs
DB_HOST     = "localhost"
DB_PORT     = "5432"
DB_NAME     = "project_gestion_donnees_etudiantes"
DB_USER     = "postgres"
DB_PASSWORD = "VOTRE_MOT_DE_PASSE_ICI"

import os
BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_VALIDES = os.path.join(BASE_DIR, "data", "valides.json")

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE     = 100
