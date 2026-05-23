from database import get_connection
from services.pagination_service import get_pagination_params


# =====================================================
# GET ETUDIANTS DEPUIS POSTGRESQL
# =====================================================
def get_etudiants(page=1, limit=10, search=None):

    pagination = get_pagination_params(page, limit)

    connection = get_connection()
    cursor = connection.cursor()

    # =========================================
    # REQUETE DE BASE
    # on filtre les archivés dès le départ
    # =========================================
    query = """
        SELECT 
            e.id,
            e.nom,
            e.prenom,
            e.numero,
            c.nom_classe,
            AVG(n.valeur) as moyenne

        FROM etudiants e

        LEFT JOIN notes n 
            ON e.id = n.etudiant_id

        LEFT JOIN classes c 
            ON e.classe_id = c.id

        WHERE e.archived = FALSE
    """

    params = []

    # =========================================
    # RECHERCHE DYNAMIQUE
    # si search existe on ajoute AND
    # ILIKE = insensible à la casse
    # =========================================
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

    # =========================================
    # FIN REQUETE
    # GROUP BY obligatoire avec AVG()
    # LIMIT/OFFSET pour la pagination
    # =========================================
    query += """
        GROUP BY e.id, c.nom_classe
        ORDER BY e.id
        LIMIT %s OFFSET %s
    """

    params.extend([pagination["limit"], pagination["offset"]])

    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()

    cursor.close()
    connection.close()

    return rows


# =====================================================
# FORMAT JSON
# transforme les tuples PostgreSQL en dicts Python
# =====================================================
def format_etudiants(rows):

    etudiants = []

    for ligne in rows:
        etudiants.append({
            "id": ligne[0],
            "nom": ligne[1],
            "prenom": ligne[2],
            "numero": ligne[3],
            "classe": ligne[4],
            # AVG retourne None si pas de notes
            "moyenne": float(ligne[5]) if ligne[5] else None
        })

    return etudiants


# =====================================================
# SERVICE PRINCIPAL
# appelé par routes/students.py
# =====================================================
def get_all_etudiants(page=1, limit=10, search=None):

    rows = get_etudiants(page, limit, search)
    return format_etudiants(rows)