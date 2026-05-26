"""
schemas.py - Modèles Pydantic (validation entrées + sérialisation sorties)
"""
from pydantic import BaseModel, field_validator
from typing import Optional, List
import re

# ── Regex de validation ──────────────────────────────────────
RE_CODE   = re.compile(r'^[A-Za-z]{3}[0-9]{3}$')
RE_NUMERO = re.compile(r'^[A-Za-z0-9]{7}$')
RE_NOM    = re.compile(r'^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-]{1,}$')


# ── Sous-modèles ─────────────────────────────────────────────

class NoteInput(BaseModel):
    """Une note de devoir ou d'examen saisie par l'utilisateur."""
    valeur: float
    nom: Optional[str] = "Devoir"

    @field_validator('valeur')
    @classmethod
    def valider_valeur(cls, v):
        if not (0 <= v <= 20):
            raise ValueError("Une note doit être entre 0 et 20")
        return round(v, 2)


class MatiereInput(BaseModel):
    """Une matière avec ses notes de devoir et son examen."""
    nom_matiere: str
    notes_devoir: List[NoteInput] = []
    note_examen: Optional[float] = None

    @field_validator('note_examen')
    @classmethod
    def valider_examen(cls, v):
        if v is not None and not (0 <= v <= 20):
            raise ValueError("La note d'examen doit être entre 0 et 20")
        return round(v, 2) if v is not None else None


# ── Étudiant : création ──────────────────────────────────────

class EtudiantCreation(BaseModel):
    """Données pour créer un étudiant (avec ses matières et notes)."""
    code:           str
    numero:         str
    nom:            str
    prenom:         str
    date_naissance: str = "2000-01-01"
    classe:         str
    matieres:       List[MatiereInput] = []

    @field_validator('code')
    @classmethod
    def valider_code(cls, v):
        if not RE_CODE.match(v.strip()):
            raise ValueError(f"Code invalide '{v}' — attendu : 3 lettres + 3 chiffres (ex: AAD004)")
        return v.strip().upper()

    @field_validator('numero')
    @classmethod
    def valider_numero(cls, v):
        if not RE_NUMERO.match(v.strip()):
            raise ValueError(f"Numéro invalide '{v}' — attendu : 7 caractères alphanumériques")
        return v.strip().upper()

    @field_validator('nom')
    @classmethod
    def valider_nom(cls, v):
        if not RE_NOM.match(v.strip()):
            raise ValueError(f"Nom invalide '{v}'")
        return v.strip().upper()

    @field_validator('prenom')
    @classmethod
    def valider_prenom(cls, v):
        if not RE_NOM.match(v.strip()):
            raise ValueError(f"Prénom invalide '{v}'")
        return v.strip().capitalize()


# ── Étudiant : modification ──────────────────────────────────

class EtudiantModification(BaseModel):
    """Tous les champs sont optionnels — on envoie seulement ce qui change."""
    code:           Optional[str] = None
    numero:         Optional[str] = None
    nom:            Optional[str] = None
    prenom:         Optional[str] = None
    date_naissance: Optional[str] = None
    classe:         Optional[str] = None

    @field_validator('code')
    @classmethod
    def valider_code(cls, v):
        if v and not RE_CODE.match(v.strip()):
            raise ValueError(f"Code invalide '{v}'")
        return v.strip().upper() if v else v

    @field_validator('numero')
    @classmethod
    def valider_numero(cls, v):
        if v and not RE_NUMERO.match(v.strip()):
            raise ValueError(f"Numéro invalide '{v}'")
        return v.strip().upper() if v else v

    @field_validator('nom')
    @classmethod
    def valider_nom(cls, v):
        return v.strip().upper() if v else v

    @field_validator('prenom')
    @classmethod
    def valider_prenom(cls, v):
        return v.strip().capitalize() if v else v


# ── Notes : ajout / modification ────────────────────────────

class NoteModification(BaseModel):
    """Pour ajouter ou modifier une note depuis la fiche étudiant."""
    nom_matiere:     str
    nom_evaluation:  str
    type_evaluation: str   # 'devoir' | 'examen'
    valeur:          float

    @field_validator('type_evaluation')
    @classmethod
    def valider_type(cls, v):
        if v not in ('devoir', 'examen'):
            raise ValueError("type_evaluation doit être 'devoir' ou 'examen'")
        return v

    @field_validator('valeur')
    @classmethod
    def valider_valeur(cls, v):
        if not (0 <= v <= 20):
            raise ValueError("Note entre 0 et 20")
        return round(v, 2)


# ── Import JSON ──────────────────────────────────────────────

class ImportRequest(BaseModel):
    numeros: List[str]