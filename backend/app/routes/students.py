"""
routes/students.py
UNIQUEMENT les routes FastAPI — toute la logique est dans services/.
⚠️  Règle FastAPI : routes fixes AVANT routes dynamiques /{id}
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from schemas import EtudiantCreation, EtudiantModification, NoteModification, ImportRequest
import services.student_service as svc
import services.note_service    as note_svc

router = APIRouter()


# ── Routes fixes (pas de paramètre dans l'URL) ───────────────

@router.get("/archives")
async def archives():
    return svc.lister_archives()


@router.get("/json-preview")
async def json_preview():
    return svc.get_json_preview()


@router.post("/import")
async def importer(data: ImportRequest):
    return svc.importer_depuis_json(data.numeros)


@router.get("/classes-liste")
async def classes_liste():
    return svc.lister_classes()


@router.get("/matieres-liste")
async def matieres_liste():
    return svc.lister_matieres()


# ── Route principale GET / ───────────────────────────────────

@router.get("/")
async def liste(
    page:   int           = Query(1,  ge=1),
    limit:  int           = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    source: Optional[str] = None,
    classe: Optional[str] = None,
):
    return svc.lister_etudiants(page, limit, search, source, classe)


# ── Routes dynamiques /{etudiant_id} ─────────────────────────

@router.get("/{etudiant_id}/notes")
async def get_notes(etudiant_id: int):
    return note_svc.get_notes_par_etudiant(etudiant_id)


@router.post("/{etudiant_id}/notes")
async def ajouter_note(etudiant_id: int, note: NoteModification):
    ok = note_svc.sauvegarder_note(
        etudiant_id,
        note.nom_matiere,
        note.nom_evaluation,
        note.type_evaluation,
        note.valeur,
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Impossible d'enregistrer la note")
    return {"success": True, "message": "Note enregistrée"}


@router.delete("/{etudiant_id}/notes/{note_id}")
async def supprimer_note(etudiant_id: int, note_id: int):
    ok = note_svc.supprimer_note(note_id, etudiant_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Note introuvable")
    return {"success": True, "message": "Note supprimée"}


@router.get("/{etudiant_id}")
async def detail(etudiant_id: int):
    return svc.get_etudiant_par_id(etudiant_id)


@router.put("/{etudiant_id}")
async def modifier(etudiant_id: int, data: EtudiantModification):
    return svc.modifier_etudiant(etudiant_id, data)


@router.delete("/{etudiant_id}")
async def archiver(etudiant_id: int):
    return svc.archiver_etudiant(etudiant_id)


@router.post("/{etudiant_id}/restore")
async def restaurer(etudiant_id: int):
    return svc.restaurer_etudiant(etudiant_id)


# ── POST / — créer un étudiant ───────────────────────────────

@router.post("/")
async def creer(data: EtudiantCreation):
    return svc.creer_etudiant(data)