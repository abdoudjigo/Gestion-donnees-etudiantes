import json
import ast
from database import get_connection
from services.pagination_service import get_pagination_params

# =====================================================
# CHEMIN DU FICHIER JSON
# =====================================================
JSON_PATH = "/home/abdoulaye/Documents/Orange Digital center/Framework Python et APi/projetAPI/PROJECT_P8/backend/data/valides.json"


# =====================================================
# LIRE LE FICHIER JSON
# =====================================================
def load_json():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# =====================================================
# GET ETUDIANTS DEPUIS POSTGRESQL
# retourne uniquement les non archivés
# =====================================================
def get_etudiants_db(search=None):

    connection = get_connection()
    cursor = connection.cursor()

    query = """
        SELECT 
            e.id,
            e.nom,
            e.prenom,
            e.numero,
            c.nom_classe,
            AVG(n.valeur) as moyenne,
            e.source

        FROM etudiants e
        LEFT JOIN notes n ON e.id = n.etudiant_id
        LEFT JOIN classes c ON e.classe_id = c.id
        WHERE e.archived = FALSE
    """

    params = []

    if search:
        query += """
            AND (
                e.nom ILIKE %s
                OR e.prenom ILIKE %s
                OR e.numero ILIKE %s
            )
        """
        search_value = f"%{search}%"
        params.extend([search_value, search_value, search_value])

    query += " GROUP BY e.id, c.nom_classe ORDER BY e.id"

    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()

    cursor.close()
    connection.close()

    # retourner liste de dicts avec source = DB
    return [
        {
            "id": r[0],
            "nom": r[1],
            "prenom": r[2],
            "numero": r[3],
            "classe": r[4],
            "moyenne": float(r[5]) if r[5] else None,
            "source": "DB",
            "editable": True   # DB = modifiable
        }
        for r in rows
    ]


# =====================================================
# GET ETUDIANTS DEPUIS JSON
# exclut ceux déjà en DB (par numero)
# =====================================================
def get_etudiants_json(search=None, numeros_db=set()):

    etudiants_json = load_json()
    resultat = []

    for e in etudiants_json:

        # skip si déjà en DB
        if e["numero"] in numeros_db:
            continue

        # filtrage recherche
        if search:
            s = search.lower()
            if not (
                s in e["nom"].lower() or
                s in e["prenom"].lower() or
                s in e["numero"].lower()
            ):
                continue

        # calculer moyenne depuis les notes JSON
        try:
            notes = ast.literal_eval(e["notes"])
            toutes_notes = []
            for matiere, details in notes.items():
                toutes_notes.extend(details["devoirs"])
                toutes_notes.append(details["examen"])
            moyenne = round(sum(toutes_notes) / len(toutes_notes), 2) if toutes_notes else None
        except:
            moyenne = None

        resultat.append({
            "id": None,          # pas d'id en DB
            "nom": e["nom"],
            "prenom": e["prenom"],
            "numero": e["numero"],
            "classe": e["classe"],
            "moyenne": moyenne,
            "source": "JSON",
            "editable": False    # JSON = lecture seule
        })

    return resultat


# =====================================================
# FUSION DB + JSON AVEC PAGINATION
# logique principale du projet
# =====================================================
def get_all_etudiants(page=1, limit=10, search=None):

    pagination = get_pagination_params(page, limit)
    offset = pagination["offset"]

    # 1. récupérer depuis DB
    etudiants_db = get_etudiants_db(search)

    # 2. récupérer les numeros déjà en DB
    numeros_db = set(e["numero"] for e in etudiants_db)

    # 3. récupérer depuis JSON en excluant ceux déjà en DB
    etudiants_json = get_etudiants_json(search, numeros_db)

    # 4. fusionner DB en premier, JSON en complément
    tous = etudiants_db + etudiants_json

    # 5. pagination sur la liste fusionnée
    page_data = tous[offset: offset + limit]

    return page_data