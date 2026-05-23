from database import get_connection
from services.pagination_service import get_pagination_params


# =====================================================
# GET ETUDIANTS
# =====================================================
def get_etudiants(page=1, limit=10, search=None):

    pagination = get_pagination_params(page, limit)

    connection = get_connection()
    cursor = connection.cursor()

    # =========================================
    # REQUETE SQL DE BASE
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
    """

    params = [] #liste des param SQL

    # =========================================
    # AJOUT RECHERCHE SI search EXISTE
    # =========================================
    if search:

        query += """
            WHERE 
                e.nom ILIKE %s
                OR e.prenom ILIKE %s
                OR e.numero ILIKE %s
        """

        search_value = f"%{search}%"

        params.extend([
            search_value,
            search_value,
            search_value
        ])

    # =========================================
    # FIN REQUETE
    # =========================================
    query += """
        GROUP BY e.id, c.nom_classe
        ORDER BY e.id
        LIMIT %s OFFSET %s
    """

    params.extend([
        pagination["limit"],
        pagination["offset"]
    ])

    # EXECUTION SQL
    cursor.execute(query, tuple(params))

    rows = cursor.fetchall()

    cursor.close()
    connection.close()

    return rows


# =====================================================
# FORMAT JSON
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
            "moyenne": float(ligne[5]) if ligne[5] else None
        })

    return etudiants


# =====================================================
# SERVICE PRINCIPAL
# =====================================================
def get_all_etudiants(page=1, limit=10, search=None):

    rows = get_etudiants(page, limit, search)

    return format_etudiants(rows)