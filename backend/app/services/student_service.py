"""
services/student_service.py
Logique métier : étudiants (liste, ajout, modification, archivage, import JSON).
Les routes ne font QUE appeler ces fonctions.
"""

import json
from config import JSON_VALIDES
from database import (
    executer_requete, executer_insert_retour_id,
    obtenir_id_classe, obtenir_id_matiere
)
from services.note_service import sauvegarder_toutes_notes_etudiant


# ─────────────────────────────────────────────────────────────
# CHARGEMENT DU JSON
# ─────────────────────────────────────────────────────────────

def charger_json() -> list:
    """Charge valides.json — accepte liste directe ou dict avec une clé liste."""
    try:
        with open(JSON_VALIDES, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            for v in data.values():
                if isinstance(v, list):
                    return v
        return []
    except Exception as e:
        print(f"[JSON] Erreur lecture : {e}")
        return []


def _formater_etudiant_db(row) -> dict:
    return {
        "id":             row['id'],
        "code":           row['code'],
        "numero":         row['numero'],
        "nom":            row['nom'],
        "prenom":         row['prenom'],
        "date_naissance": str(row['date_naissance']) if row['date_naissance'] else "",
        "classe":         row['classe'] or "",
        "source":         "DB",
        "editable":       True,
    }


def _formater_etudiant_json(e: dict) -> dict:
    return {
        "id":             None,
        "code":           e.get('code', ''),
        "numero":         e.get('numero', ''),
        "nom":            e.get('nom', ''),
        "prenom":         e.get('prenom', ''),
        "date_naissance": e.get('date_naissance', ''),
        "classe":         e.get('classe', ''),
        "source":         "JSON",
        "editable":       False,
    }


# ─────────────────────────────────────────────────────────────
# LISTE PAGINÉE (fusion DB + JSON)
# ─────────────────────────────────────────────────────────────

def lister_etudiants(page: int, limit: int,
                     search: str = None,
                     source: str = None,
                     classe: str = None) -> dict:
    """
    Retourne la page demandée en fusionnant DB et JSON.
    DB est toujours affiché en premier.
    """
    # ── 1. Récupérer les étudiants DB ───────────────────────
    sql = """
        SELECT e.id, e.code, e.numero, e.nom, e.prenom,
               e.date_naissance, c.nom_classe AS classe
        FROM etudiants e
        LEFT JOIN classes c ON c.id = e.classe_id
        WHERE e.archived = FALSE
    """
    params = []
    if search:
        sql += """ AND (
            e.nom    ILIKE %s OR e.prenom ILIKE %s OR
            e.numero ILIKE %s OR e.code   ILIKE %s
        )"""
        s = f"%{search}%"; params.extend([s, s, s, s])
    if classe and classe != 'all':
        sql += " AND c.nom_classe = %s"; params.append(classe)
    sql += " ORDER BY e.nom, e.prenom"

    rows_db    = executer_requete(sql, params, toutes_lignes=True) or []
    numeros_db = {r['numero'] for r in rows_db}

    # ── 2. Récupérer les étudiants JSON non encore en DB ────
    etudiants_json = []
    if not source or source in ('all', 'JSON'):
        for e in charger_json():
            if e.get('numero') in numeros_db:
                continue
            if classe and classe != 'all' and e.get('classe') != classe:
                continue
            if search:
                t = search.lower()
                if not any(t in str(e.get(c, '')).lower()
                           for c in ('nom', 'prenom', 'numero', 'code')):
                    continue
            etudiants_json.append(_formater_etudiant_json(e))

    # ── 3. Formater DB ───────────────────────────────────────
    etudiants_db = [_formater_etudiant_db(r) for r in rows_db]

    # ── 4. Fusionner + filtre source ─────────────────────────
    tous = etudiants_db + etudiants_json
    if source and source != 'all':
        tous = [e for e in tous if e['source'] == source]

    # ── 5. Pagination ────────────────────────────────────────
    total   = len(tous)
    debut   = (page - 1) * limit
    pagines = tous[debut:debut + limit]

    return {"success": True, "page": page, "limit": limit, "total": total, "data": pagines}


# ─────────────────────────────────────────────────────────────
# DÉTAIL D'UN ÉTUDIANT
# ─────────────────────────────────────────────────────────────

def get_etudiant_par_id(etudiant_id: int) -> dict:
    row = executer_requete(
        """SELECT e.id, e.code, e.numero, e.nom, e.prenom,
                  e.date_naissance, c.nom_classe AS classe, e.source
           FROM etudiants e
           LEFT JOIN classes c ON c.id = e.classe_id
           WHERE e.id = %s AND e.archived = FALSE""",
        (etudiant_id,), une_ligne=True
    )
    if not row:
        return {"success": False, "message": "Étudiant non trouvé"}
    return {
        "success": True,
        "data": {
            "id":             row['id'],
            "code":           row['code'],
            "numero":         row['numero'],
            "nom":            row['nom'],
            "prenom":         row['prenom'],
            "date_naissance": str(row['date_naissance']) if row['date_naissance'] else "",
            "classe":         row['classe'] or "",
            "source":         row['source'],
        }
    }


# ─────────────────────────────────────────────────────────────
# CRÉATION D'UN ÉTUDIANT (avec notes)
# ─────────────────────────────────────────────────────────────

def creer_etudiant(data) -> dict:
    """
    Crée un étudiant et toutes ses notes.
    data : objet EtudiantCreation (Pydantic).
    """
    # Doublon ?
    existant = executer_requete(
        "SELECT id FROM etudiants WHERE numero = %s",
        (data.numero,), une_ligne=True
    )
    if existant:
        return {"success": False, "message": f"Le numéro '{data.numero}' existe déjà"}

    # Classe valide ?
    classe_id = obtenir_id_classe(data.classe)
    if not classe_id:
        return {"success": False, "message": f"Classe '{data.classe}' introuvable en base"}

    # Insérer l'étudiant
    etudiant_id = executer_insert_retour_id(
        """INSERT INTO etudiants (code, numero, nom, prenom, date_naissance, classe_id, source)
           VALUES (%s, %s, %s, %s, %s, %s, 'DB')
           RETURNING id""",
        (data.code, data.numero, data.nom, data.prenom, data.date_naissance, classe_id)
    )
    if not etudiant_id:
        return {"success": False, "message": "Erreur lors de la création en base"}

    # Insérer les notes si présentes
    if data.matieres:
        ok = sauvegarder_toutes_notes_etudiant(etudiant_id, data.matieres)
        if not ok:
            return {"success": False, "message": "Étudiant créé mais erreur sur les notes"}

    return {"success": True, "message": "Étudiant créé avec succès", "id": etudiant_id}


# ─────────────────────────────────────────────────────────────
# MODIFICATION D'UN ÉTUDIANT
# ─────────────────────────────────────────────────────────────

def modifier_etudiant(etudiant_id: int, data) -> dict:
    """
    Modifie un étudiant DB.
    data : objet EtudiantModification (Pydantic).
    """
    existant = executer_requete(
        "SELECT source FROM etudiants WHERE id = %s AND archived = FALSE",
        (etudiant_id,), une_ligne=True
    )
    if not existant:
        return {"success": False, "message": "Étudiant introuvable"}

    champs, params = [], []

    if data.code:           champs.append("code = %s");           params.append(data.code)
    if data.numero:         champs.append("numero = %s");         params.append(data.numero)
    if data.nom:            champs.append("nom = %s");            params.append(data.nom)
    if data.prenom:         champs.append("prenom = %s");         params.append(data.prenom)
    if data.date_naissance: champs.append("date_naissance = %s"); params.append(data.date_naissance)
    if data.classe:
        cid = obtenir_id_classe(data.classe)
        if not cid:
            return {"success": False, "message": f"Classe '{data.classe}' introuvable"}
        champs.append("classe_id = %s"); params.append(cid)

    if not champs:
        return {"success": False, "message": "Aucun champ à modifier"}

    params.append(etudiant_id)
    executer_requete(f"UPDATE etudiants SET {', '.join(champs)} WHERE id = %s", params)
    return {"success": True, "message": "Étudiant modifié"}


# ─────────────────────────────────────────────────────────────
# ARCHIVAGE / RESTAURATION
# ─────────────────────────────────────────────────────────────

def archiver_etudiant(etudiant_id: int) -> dict:
    executer_requete("UPDATE etudiants SET archived = TRUE  WHERE id = %s", (etudiant_id,))
    return {"success": True, "message": "Étudiant archivé"}


def restaurer_etudiant(etudiant_id: int) -> dict:
    executer_requete("UPDATE etudiants SET archived = FALSE WHERE id = %s", (etudiant_id,))
    return {"success": True, "message": "Étudiant restauré"}


def lister_archives() -> dict:
    rows = executer_requete(
        """SELECT e.id, e.code, e.numero, e.nom, e.prenom,
                  c.nom_classe AS classe
           FROM etudiants e
           LEFT JOIN classes c ON c.id = e.classe_id
           WHERE e.archived = TRUE
           ORDER BY e.nom, e.prenom""",
        toutes_lignes=True
    ) or []
    return {
        "success": True,
        "data": [
            {"id": r['id'], "code": r['code'], "numero": r['numero'],
             "nom": r['nom'], "prenom": r['prenom'], "classe": r['classe'] or ""}
            for r in rows
        ]
    }


# ─────────────────────────────────────────────────────────────
# IMPORT JSON → DB
# ─────────────────────────────────────────────────────────────

def get_json_preview() -> dict:
    """Étudiants du JSON non encore importés."""
    rows = executer_requete("SELECT numero FROM etudiants", toutes_lignes=True) or []
    numeros_db = {r['numero'] for r in rows}
    non_importes = [
        {"numero": e.get('numero',''), "nom": e.get('nom',''),
         "prenom": e.get('prenom',''), "classe": e.get('classe',''), "code": e.get('code','')}
        for e in charger_json() if e.get('numero') not in numeros_db
    ]
    return {"success": True, "count": len(non_importes), "data": non_importes}


def importer_depuis_json(numeros: list) -> dict:
    """Importe les numéros sélectionnés du JSON vers PostgreSQL."""
    importes, ignores = [], []

    for e in charger_json():
        if e.get('numero') not in numeros:
            continue

        # Doublon ?
        existant = executer_requete(
            "SELECT id FROM etudiants WHERE numero = %s",
            (e['numero'],), une_ligne=True
        )
        if existant:
            ignores.append(e['numero']); continue

        classe_id = obtenir_id_classe(e.get('classe', ''))

        executer_requete(
            """INSERT INTO etudiants
               (code, numero, nom, prenom, date_naissance, classe_id, source)
               VALUES (%s, %s, %s, %s, %s, %s, 'DB')""",
            (e.get('code',''), e['numero'], e.get('nom',''), e.get('prenom',''),
             e.get('date_naissance','2000-01-01'), classe_id)
        )
        importes.append(e['numero'])

    return {"success": True, "importes": importes, "ignores": ignores}


# ─────────────────────────────────────────────────────────────
# LISTES DE RÉFÉRENCE
# ─────────────────────────────────────────────────────────────

def lister_classes() -> dict:
    rows = executer_requete(
        "SELECT id, nom_classe FROM classes ORDER BY nom_classe",
        toutes_lignes=True
    ) or []
    return {"success": True, "data": [{"id": r['id'], "nom": r['nom_classe']} for r in rows]}


def lister_matieres() -> dict:
    rows = executer_requete(
        "SELECT id, nom_matiere FROM matieres ORDER BY nom_matiere",
        toutes_lignes=True
    ) or []
    return {"success": True, "data": [{"id": r['id'], "nom": r['nom_matiere']} for r in rows]}