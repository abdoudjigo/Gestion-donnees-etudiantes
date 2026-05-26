"""
config.py - Configuration centrale de l'application
Toutes les constantes en un seul endroit
"""
import os
 
# ── Base de données ──────────────────────────────────────────
DB_HOST     = os.getenv("DB_HOST",     "localhost")
DB_PORT     = os.getenv("DB_PORT",     "5432")
DB_NAME     = os.getenv("DB_NAME",     "project_gestion_donnees_etudiantes")
DB_USER     = os.getenv("DB_USER",     "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "5853500")   # ← mettez dans .env en prod
 
# ── Chemins ──────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_VALIDES = os.path.join(BASE_DIR, "data", "valides.json")
 
# ── Pagination ───────────────────────────────────────────────
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE     = 100
 