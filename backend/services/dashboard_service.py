from database import get_connection


# =====================================================
# KPI GLOBAUX
# total étudiants, moyenne générale, total notes
# =====================================================
def get_dashboard_stats():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT 
            COUNT(DISTINCT e.id) AS total_etudiants,
            ROUND(AVG(n.valeur)::numeric, 2) AS moyenne_generale,
            COUNT(n.id) AS total_notes
        FROM etudiants e
        LEFT JOIN notes n ON e.id = n.etudiant_id
        WHERE e.archived = FALSE
    """)

    row = cursor.fetchone()
    cursor.close()
    connection.close()

    return {
        "total_etudiants": row[0],
        "moyenne_generale": float(row[1]) if row[1] else 0,
        "total_notes": row[2]
    }


# =====================================================
# REPARTITION PAR CLASSE
# nb étudiants + moyenne par classe
# =====================================================
def get_stats_par_classe():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT 
            c.nom_classe,
            COUNT(e.id) AS nb_etudiants,
            ROUND(AVG(n.valeur)::numeric, 2) AS moyenne_classe
        FROM classes c
        LEFT JOIN etudiants e ON e.classe_id = c.id
        LEFT JOIN notes n ON n.etudiant_id = e.id
        WHERE e.archived = FALSE
        GROUP BY c.nom_classe
        ORDER BY c.nom_classe
    """)

    rows = cursor.fetchall()
    cursor.close()
    connection.close()

    return [
        {
            "classe": r[0],
            "nb_etudiants": r[1],
            "moyenne": float(r[2]) if r[2] else 0
        }
        for r in rows
    ]


# =====================================================
# TOP 10 MEILLEURES MOYENNES
# exclut les étudiants sans notes (HAVING)
# =====================================================
def get_top10():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT 
            e.nom,
            e.prenom,
            c.nom_classe,
            ROUND(AVG(n.valeur)::numeric, 2) AS moyenne
        FROM etudiants e
        LEFT JOIN notes n ON e.id = n.etudiant_id
        LEFT JOIN classes c ON e.classe_id = c.id
        WHERE e.archived = FALSE
        GROUP BY e.id, c.nom_classe
        HAVING AVG(n.valeur) IS NOT NULL
        ORDER BY moyenne DESC
        LIMIT 10
    """)

    rows = cursor.fetchall()
    cursor.close()
    connection.close()

    return [
        {
            "nom": r[0],
            "prenom": r[1],
            "classe": r[2],
            "moyenne": float(r[3]) if r[3] else 0
        }
        for r in rows
    ]