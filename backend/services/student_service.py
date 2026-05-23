from database import get_connection
from services.pagination_service import get_pagination_params

# =====================================================
# GET ETUDIANTS AVEC PAGINATION
# =====================================================
def get_etudiants(page: int = 1, limit: int = 10):

    pagination = get_pagination_params(page, limit)

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT 
            e.id,
            e.nom,
            e.prenom,
            e.numero,
            c.nom_classe,
            AVG(n.valeur) as moyenne

        FROM etudiants e
        LEFT JOIN notes n ON e.id = n.etudiant_id
        LEFT JOIN classes c ON e.classe_id = c.id

        GROUP BY e.id, c.nom_classe
        ORDER BY e.id
        LIMIT %s OFFSET %s
    """, (
        pagination["limit"],
        pagination["offset"]
    ))

    rows = cursor.fetchall()

    cursor.close()
    connection.close()

    return rows


# =====================================================
# FORMATAGE JSON
# =====================================================
def format_etudiants(rows):

    return [
        {
            "id": r[0],
            "nom": r[1],
            "prenom": r[2],
            "numero": r[3],
            "classe": r[4],
            "moyenne": float(r[5]) if r[5] else None
        }
        for r in rows
    ]


# =====================================================
# SERVICE PRINCIPAL
# =====================================================
def get_all_etudiants(page: int = 1, limit: int = 10):

    rows = get_etudiants(page, limit)
    return format_etudiants(rows)