"""
schemas.py — Validation Pydantic
Règles assouplies pour correspondre aux vraies données du JSON
"""
from pydantic import BaseModel, field_validator
from typing import Optional, List
import re

# ── Regex ────────────────────────────────────────────────────
# Code : 3 lettres + 3 chiffres (insensible à la casse)
RE_CODE   = re.compile(r'^[A-Za-z]{3}[0-9]{3}$')
# Numéro : exactement 7 caractères alphanumériques
RE_NUMERO = re.compile(r'^[A-Za-z0-9]{7}$')


# ── Sous-modèles ─────────────────────────────────────────────

class NoteInput(BaseModel):
    valeur: float
    nom:    Optional[str] = "Devoir"

    @field_validator('valeur')
    @classmethod
    def valider_valeur(cls, v):
        if not (0 <= v <= 20):
            raise ValueError(f"Note {v} invalide — doit être entre 0 et 20")
        return round(float(v), 2)


class MatiereInput(BaseModel):
    nom_matiere:  str
    notes_devoir: List[NoteInput] = []
    note_examen:  Optional[float] = None

    @field_validator('note_examen')
    @classmethod
    def valider_examen(cls, v):
        if v is not None:
            if not (0 <= v <= 20):
                raise ValueError(f"Examen {v} invalide — doit être entre 0 et 20")
            return round(float(v), 2)
        return v


# ── Création étudiant ────────────────────────────────────────

class EtudiantCreation(BaseModel):
    code:           str
    numero:         str
    nom:            str
    prenom:         str
    date_naissance: Optional[str] = "2000-01-01"
    classe:         str
    matieres:       List[MatiereInput] = []

    @field_validator('code')
    @classmethod
    def valider_code(cls, v):
        v = v.strip()
        if not RE_CODE.match(v):
            raise ValueError(
                f"Code '{v}' invalide — format attendu : 3 lettres + 3 chiffres (ex: AAD004)"
            )
        return v.upper()

    @field_validator('numero')
    @classmethod
    def valider_numero(cls, v):
        v = v.strip()
        if not RE_NUMERO.match(v):
            raise ValueError(
                f"Numéro '{v}' invalide — 7 caractères alphanumériques exactement (ex: 40DKG6T)"
            )
        return v.upper()

    @field_validator('nom')
    @classmethod
    def valider_nom(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Le nom doit contenir au moins 2 caractères")
        return v.upper()

    @field_validator('prenom')
    @classmethod
    def valider_prenom(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Le prénom doit contenir au moins 2 caractères")
        return v.capitalize()

    @field_validator('classe')
    @classmethod
    def valider_classe(cls, v):
        if not v or not v.strip():
            raise ValueError("La classe est obligatoire")
        return v.strip()


# ── Modification étudiant ────────────────────────────────────

class EtudiantModification(BaseModel):
    code:           Optional[str] = None
    numero:         Optional[str] = None
    nom:            Optional[str] = None
    prenom:         Optional[str] = None
    date_naissance: Optional[str] = None
    classe:         Optional[str] = None

    @field_validator('code')
    @classmethod
    def valider_code(cls, v):
        if v:
            v = v.strip()
            if not RE_CODE.match(v):
                raise ValueError(f"Code '{v}' invalide — 3 lettres + 3 chiffres")
            return v.upper()
        return v

    @field_validator('numero')
    @classmethod
    def valider_numero(cls, v):
        if v:
            v = v.strip()
            if not RE_NUMERO.match(v):
                raise ValueError(f"Numéro '{v}' invalide — 7 caractères")
            return v.upper()
        return v

    @field_validator('nom')
    @classmethod
    def valider_nom(cls, v):
        return v.strip().upper() if v else v

    @field_validator('prenom')
    @classmethod
    def valider_prenom(cls, v):
        return v.strip().capitalize() if v else v


# ── Note ─────────────────────────────────────────────────────

class NoteModification(BaseModel):
    nom_matiere:     str
    nom_evaluation:  str
    type_evaluation: str
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
        return round(float(v), 2)


# ── Import JSON ──────────────────────────────────────────────

class ImportRequest(BaseModel):
    numeros: List[str]