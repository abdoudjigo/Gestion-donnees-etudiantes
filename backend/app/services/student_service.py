"""
services/student_service.py
Logique métier étudiants — liste, ajout, modification, archivage, import JSON.
"""

import json
import ast
from config import JSON_VALIDES
from database import (
    executer_requete, executer_insert_retour_id,
    obtenir_id_classe, obtenir_id_matiere
)
from services.note_service import (
    sauvegarder_note,
    sauvegarder_toutes_notes_etudiant
)


# ─────────────────────────────────────────────────────────────
# CHARGEMENT ET PARSING DU JSON
# ─────────────────────────────────────────────────────────────

def charger_json() -> list:
    """Charge valides.json — accepte liste directe ou dict."""
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


def parser_notes_json(notes_raw) -> dict:
    """
    Le champ 'notes' dans valides.json est une STRING Python (pas du JSON).
    Exemple :
      "{'Math': {'devoirs': [14.0, 15.0], 'examen': 10.0, 'moyenne': 11.5}, ...}"

    On utilise ast.literal_eval() pour la convertir en dict Python.
    Retourne {} si le parsing échoue.
    """
    if not notes_raw:
        return {}

    # Déjà un dict — rien à faire
    if isinstance(notes_raw, dict):
        return notes_raw

    # C'est une string — on la parse
    if isinstance(notes_raw, str):
        try:
            return ast.literal_eval(notes_raw)
        except Exception as e:
            print(f"[JSON] Erreur parsing notes : {e}")
            return {}

    return {}


def calculer_moyenne_matiere_json(devoirs: list, examen) -> float:
    """Calcule la moyenne d'une matière depuis les données JSON."""
    if not devoirs and examen is None:
        return 0.0
    if not devoirs:
        return round(float(examen), 2)
    moy_devoirs = sum(devoirs) / len(devoirs)
    if examen is None:
        return round(moy_devoirs, 2)
    return round((moy_devoirs + float(examen)) / 2, 2)


# ─────────────────────────────────────────────────────────────
# FORMATAGE
# ─────────────────────────────────────────────────────────────

def _formater_db(row) -> dict:
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


# Remplacer l'ancienne par celle-ci dans student_service.py

def _formater_json(e: dict) -> dict:
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
        # ── AJOUT : on transmet les notes brutes pour que
        # le frontend puisse calculer la moyenne ──────────
        "notes_raw":      e.get('notes', ''),
    }


# ─────────────────────────────────────────────────────────────
# LISTE PAGINÉE (fusion DB + JSON)
# ─────────────────────────────────────────────────────────────

def lister_etudiants(page: int, limit: int,
                     search: str = None,
                     source: str = None,
                     classe: str = None) -> dict:

    # ── 1. DB ────────────────────────────────────────────────
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
            e.nom ILIKE %s OR e.prenom ILIKE %s OR
            e.numero ILIKE %s OR e.code ILIKE %s
        )"""
        s = f"%{search}%"
        params.extend([s, s, s, s])
    if classe and classe != 'all':
        sql += " AND c.nom_classe = %s"
        params.append(classe)
    sql += " ORDER BY e.nom, e.prenom"

    rows_db    = executer_requete(sql, params, toutes_lignes=True) or []
    numeros_db = {r['numero'] for r in rows_db}

    # ── 2. JSON (complément si source != 'DB') ───────────────
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
            etudiants_json.append(_formater_json(e))

    # ── 3. Fusionner ─────────────────────────────────────────
    tous = [_formater_db(r) for r in rows_db] + etudiants_json
    if source and source != 'all':
        tous = [e for e in tous if e['source'] == source]

    # ── 4. Pagination ─────────────────────────────────────────
    total   = len(tous)
    debut   = (page - 1) * limit
    pagines = tous[debut:debut + limit]

    return {
        "success": True,
        "page": page, "limit": limit,
        "total": total, "data": pagines
    }


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
        return {"success": False, "message": f"Classe '{data.classe}' introuvable"}

    # Insérer l'étudiant
    etudiant_id = executer_insert_retour_id(
        """INSERT INTO etudiants
           (code, numero, nom, prenom, date_naissance, classe_id, source)
           VALUES (%s, %s, %s, %s, %s, %s, 'DB')
           RETURNING id""",
        (data.code, data.numero, data.nom, data.prenom,
         data.date_naissance, classe_id)
    )
    if not etudiant_id:
        return {"success": False, "message": "Erreur lors de la création"}

    # Insérer les notes si présentes
    if data.matieres:
        ok = sauvegarder_toutes_notes_etudiant(etudiant_id, data.matieres)
        if not ok:
            return {
                "success": False,
                "message": "Étudiant créé mais erreur sur les notes"
            }

    return {"success": True, "message": "Étudiant créé avec succès", "id": etudiant_id}


# ─────────────────────────────────────────────────────────────
# MODIFICATION
# ─────────────────────────────────────────────────────────────

def modifier_etudiant(etudiant_id: int, data) -> dict:
    existant = executer_requete(
        "SELECT source FROM etudiants WHERE id = %s AND archived = FALSE",
        (etudiant_id,), une_ligne=True
    )
    if not existant:
        return {"success": False, "message": "Étudiant introuvable"}

    champs, params = [], []
    if data.code:
        champs.append("code = %s");           params.append(data.code)
    if data.numero:
        champs.append("numero = %s");         params.append(data.numero)
    if data.nom:
        champs.append("nom = %s");            params.append(data.nom)
    if data.prenom:
        champs.append("prenom = %s");         params.append(data.prenom)
    if data.date_naissance:
        champs.append("date_naissance = %s"); params.append(data.date_naissance)
    if data.classe:
        cid = obtenir_id_classe(data.classe)
        if not cid:
            return {"success": False, "message": f"Classe '{data.classe}' introuvable"}
        champs.append("classe_id = %s");      params.append(cid)

    if not champs:
        return {"success": False, "message": "Aucun champ à modifier"}

    params.append(etudiant_id)
    executer_requete(
        f"UPDATE etudiants SET {', '.join(champs)} WHERE id = %s",
        params
    )
    return {"success": True, "message": "Étudiant modifié"}


# ─────────────────────────────────────────────────────────────
# ARCHIVAGE / RESTAURATION
# ─────────────────────────────────────────────────────────────

def archiver_etudiant(etudiant_id: int) -> dict:
    executer_requete(
        "UPDATE etudiants SET archived = TRUE WHERE id = %s",
        (etudiant_id,)
    )
    return {"success": True, "message": "Étudiant archivé"}


def restaurer_etudiant(etudiant_id: int) -> dict:
    executer_requete(
        "UPDATE etudiants SET archived = FALSE WHERE id = %s",
        (etudiant_id,)
    )
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
            {
                "id":     r['id'],
                "code":   r['code'],
                "numero": r['numero'],
                "nom":    r['nom'],
                "prenom": r['prenom'],
                "classe": r['classe'] or ""
            }
            for r in rows
        ]
    }


# ─────────────────────────────────────────────────────────────
# IMPORT JSON → DB (avec notes)
# ─────────────────────────────────────────────────────────────

def get_json_preview() -> dict:
    """Étudiants du JSON non encore importés."""
    rows       = executer_requete("SELECT numero FROM etudiants", toutes_lignes=True) or []
    numeros_db = {r['numero'] for r in rows}

    non_importes = [
        {
            "numero": e.get('numero', ''),
            "nom":    e.get('nom', ''),
            "prenom": e.get('prenom', ''),
            "classe": e.get('classe', ''),
            "code":   e.get('code', '')
        }
        for e in charger_json()
        if e.get('numero') not in numeros_db
    ]
    return {"success": True, "count": len(non_importes), "data": non_importes}


def importer_depuis_json(numeros: list) -> dict:
    """
    Importe les étudiants sélectionnés du JSON vers PostgreSQL.
    INCLUT leurs notes (parsing de la string Python → dict).
    """
    importes = []
    ignores  = []
    erreurs  = []

    for e in charger_json():
        if e.get('numero') not in numeros:
            continue

        numero = e['numero']

        # Doublon ?
        existant = executer_requete(
            "SELECT id FROM etudiants WHERE numero = %s",
            (numero,), une_ligne=True
        )
        if existant:
            ignores.append(numero)
            continue

        # Classe
        classe_id = obtenir_id_classe(e.get('classe', ''))

        # Parser la date (format DD/MM/YYYY → YYYY-MM-DD)
        date_raw = e.get('date_naissance', '')
        date_db  = _convertir_date(date_raw)

        # Insérer l'étudiant
        etudiant_id = executer_insert_retour_id(
            """INSERT INTO etudiants
               (code, numero, nom, prenom, date_naissance, classe_id, source)
               VALUES (%s, %s, %s, %s, %s, %s, 'DB')
               RETURNING id""",
            (
                e.get('code', ''),
                numero,
                e.get('nom', '').upper(),
                e.get('prenom', '').capitalize(),
                date_db,
                classe_id
            )
        )

        if not etudiant_id:
            erreurs.append(numero)
            continue

        # ── Parser et insérer les notes ───────────────────────
        notes_dict = parser_notes_json(e.get('notes', ''))

        for nom_matiere, data_mat in notes_dict.items():
            devoirs = data_mat.get('devoirs', [])
            examen  = data_mat.get('examen')

            # Insérer chaque devoir
            for i, valeur in enumerate(devoirs):
                # Vérifier que la valeur est dans [0, 20]
                valeur = min(max(float(valeur), 0), 20)
                sauvegarder_note(
                    etudiant_id,
                    nom_matiere,
                    f"Devoir {i + 1}",
                    'devoir',
                    valeur
                )

            # Insérer l'examen
            if examen is not None:
                valeur_exam = min(max(float(examen), 0), 20)
                sauvegarder_note(
                    etudiant_id,
                    nom_matiere,
                    'Examen',
                    'examen',
                    valeur_exam
                )

        importes.append(numero)
        print(f"[Import] ✅ {e.get('nom')} {e.get('prenom')} — {len(notes_dict)} matières")

    return {
        "success": True,
        "importes": importes,
        "ignores":  ignores,
        "erreurs":  erreurs
    }


def _convertir_date(date_str: str) -> str:
    """
    Convertit DD/MM/YYYY → YYYY-MM-DD pour PostgreSQL.
    Retourne '2000-01-01' si le format est invalide.
    """
    if not date_str:
        return '2000-01-01'
    try:
        if '/' in date_str:
            j, m, a = date_str.strip().split('/')
            return f"{a}-{m.zfill(2)}-{j.zfill(2)}"
        return date_str  # déjà au bon format
    except Exception:
        return '2000-01-01'


# ─────────────────────────────────────────────────────────────
# LISTES DE RÉFÉRENCE
# ─────────────────────────────────────────────────────────────

def lister_classes() -> dict:
    rows = executer_requete(
        "SELECT id, nom_classe FROM classes ORDER BY nom_classe",
        toutes_lignes=True
    ) or []
    return {
        "success": True,
        "data": [{"id": r['id'], "nom": r['nom_classe']} for r in rows]
    }


def lister_matieres() -> dict:
    rows = executer_requete(
        "SELECT id, nom_matiere FROM matieres ORDER BY nom_matiere",
        toutes_lignes=True
    ) or []
    return {
        "success": True,
        "data": [{"id": r['id'], "nom": r['nom_matiere']} for r in rows]
    }