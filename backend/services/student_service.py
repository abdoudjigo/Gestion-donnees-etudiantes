from database import get_connection

#on va recuperer toute les etudiants avec leurs moyennes
def get_etudiants():
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
        ORDER BY e.id;
    """)

    nbr_lignes = cursor.fetchall()

    cursor.close()
    connection.close()

    return nbr_lignes

#on transforme en JSOn
def format_etudiants(nbr_lignes):
    etudiants = []

    for ligne in nbr_lignes:
        etudiants.append({
            "id": ligne[0],
            "nom": ligne[1],
            "prenom": ligne[2],
            "numero": ligne[3],
            "classe": ligne[4],
            #si pas de note avg return null
            "moyenne": float(ligne[5]) if ligne[5] else None
        })

    return etudiants

def get_all_etudiants():
    nbr_lignes = get_etudiants()
    return format_etudiants(nbr_lignes)