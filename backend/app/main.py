"""
main.py - Point d'entrée FastAPI
Lancer : uvicorn app.main:app --reload  (depuis le dossier backend/)
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.students  import router as students_router
from routes.dashboard import router as dashboard_router

app = FastAPI(
    title="API Gestion Étudiants",
    version="2.0",
    description="Backend complet : étudiants, notes, moyennes, dashboard",
)

# ── CORS (autorise le frontend HTML servi localement) ────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────
app.include_router(students_router,  prefix="/students",  tags=["Étudiants"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])


# ── Routes utilitaires ───────────────────────────────────────
@app.get("/", tags=["Santé"])
async def root():
    return {"message": "API Gestion Étudiants v2", "status": "ok", "docs": "/docs"}


@app.get("/health", tags=["Santé"])
async def health():
    from database import obtenir_connexion
    conn = obtenir_connexion()
    if conn:
        conn.close()
        return {"status": "ok", "db": "connectée"}
    return {"status": "ok", "db": "ERREUR — vérifiez config.py"}