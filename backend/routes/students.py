from fastapi import APIRouter, Query
from services.student_service import get_all_etudiants
from database import get_connection

router = APIRouter()


# =====================================================
# GET /students
# retourne la liste paginée avec recherche optionnelle
# =====================================================
@router.get("/")
def read_etudiants(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = None
):
    etudiants = get_all_etudiants(page, limit, search)

    return {
        "success": True,
        "page": page,
        "limit": limit,
        "search": search,
        "count": len(etudiants),
        "data": etudiants
    }


# =====================================================
# POST /students
# ajouter un nouvel étudiant dans PostgreSQL
# source = "DB" car ajout manuel
# =====================================================
@router.post("/")
def create_student(student: dict):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO etudiants (
            code,
            numero,
            nom,
            prenom,
            date_naissance,
            classe_id,
            source
        )
        VALUES (
            %s, %s, %s, %s, %s,
            (SELECT id FROM classes WHERE nom_classe = %s),
            %s
        )
    """, (
        student["code"],
        student["numero"],
        student["nom"],
        student["prenom"],
        student["date_naissance"],
        student["classe"],
        "DB"
    ))

    connection.commit()
    cursor.close()
    connection.close()

    return {
        "success": True,
        "message": "Étudiant ajouté"
    }


# =====================================================
# DELETE /students/{id}
# archivage soft — on ne supprime JAMAIS
# on met archived = TRUE
# l'étudiant reste en base mais disparaît de la liste
# =====================================================
@router.delete("/{student_id}")
def archive_student(student_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE etudiants
        SET archived = TRUE
        WHERE id = %s
    """, (student_id,))

    connection.commit()
    cursor.close()
    connection.close()

    return {
        "success": True,
        "message": f"Étudiant {student_id} archivé"
    }


# =====================================================
# PUT /students/{id}
# modification d'un étudiant (DB uniquement)
# =====================================================
@router.put("/{student_id}")
def update_student(student_id: int, student: dict):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE etudiants
        SET 
            nom = %s,
            prenom = %s,
            classe_id = (SELECT id FROM classes WHERE nom_classe = %s)
        WHERE id = %s
        AND archived = FALSE
    """, (
        student["nom"],
        student["prenom"],
        student["classe"],
        student_id
    ))

    connection.commit()
    cursor.close()
    connection.close()

    return {
        "success": True,
        "message": f"Étudiant {student_id} modifié"
    }

# =====================================================
# GET /students/archives
# retourne les étudiants archivés
# =====================================================
@router.get("/archives")
def get_archives():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT 
            e.id,
            e.nom,
            e.prenom,
            e.numero,
            c.nom_classe
        FROM etudiants e
        LEFT JOIN classes c ON e.classe_id = c.id
        WHERE e.archived = TRUE
        ORDER BY e.id
    """)

    rows = cursor.fetchall()
    cursor.close()
    connection.close()

    return {
        "success": True,
        "data": [
            {
                "id": r[0],
                "nom": r[1],
                "prenom": r[2],
                "numero": r[3],
                "classe": r[4]
            }
            for r in rows
        ]
    }


# =====================================================
# POST /students/{id}/restore
# restaurer un étudiant archivé
# =====================================================
@router.post("/{student_id}/restore")
def restore_student(student_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE etudiants
        SET archived = FALSE
        WHERE id = %s
    """, (student_id,))

    connection.commit()
    cursor.close()
    connection.close()

    return {
        "success": True,
        "message": f"Étudiant {student_id} restauré"
    }


# =====================================================
# GET /students/json-preview
# retourne les étudiants du JSON pas encore en DB
# =====================================================
@router.get("/json-preview")
def get_json_preview():

    import json

    with open("data/valides.json", "r", encoding="utf-8") as f:
        etudiants_json = json.load(f)

    connection = get_connection()
    cursor = connection.cursor()

    # récupérer tous les numeros déjà en DB
    cursor.execute("SELECT numero FROM etudiants")
    numeros_db = set(row[0] for row in cursor.fetchall())

    cursor.close()
    connection.close()

    # garder seulement ceux qui ne sont pas en DB
    non_importes = [
        e for e in etudiants_json
        if e["numero"] not in numeros_db
    ]

    return {
        "success": True,
        "count": len(non_importes),
        "data": [
            {
                "numero": e["numero"],
                "nom": e["nom"],
                "prenom": e["prenom"],
                "classe": e["classe"]
            }
            for e in non_importes
        ]
    }




# =====================================================
# GET /students/{id}
# retourne le détail d'un étudiant avec ses notes
# =====================================================
@router.get("/{student_id}")
def get_student(student_id: int):

    connection = get_connection()
    cursor = connection.cursor()

    # infos étudiant
    cursor.execute("""
        SELECT 
            e.id,
            e.nom,
            e.prenom,
            e.numero,
            e.code,
            e.date_naissance,
            c.nom_classe
        FROM etudiants e
        LEFT JOIN classes c ON e.classe_id = c.id
        WHERE e.id = %s
        AND e.archived = FALSE
    """, (student_id,))

    etudiant = cursor.fetchone()

    if not etudiant:
        return {"success": False, "message": "Étudiant non trouvé"}

    # notes de l'étudiant
    cursor.execute("""
        SELECT 
            m.nom_matiere,
            n.nom_evaluation,
            n.type_evaluation,
            n.valeur
        FROM notes n
        LEFT JOIN matieres m ON n.matiere_id = m.id
        WHERE n.etudiant_id = %s
        ORDER BY m.nom_matiere, n.nom_evaluation
    """, (student_id,))

    notes = cursor.fetchall()

    cursor.close()
    connection.close()

    return {
        "success": True,
        "data": {
            "id": etudiant[0],
            "nom": etudiant[1],
            "prenom": etudiant[2],
            "numero": etudiant[3],
            "code": etudiant[4],
            "date_naissance": str(etudiant[5]),
            "classe": etudiant[6],
            "notes": [
                {
                    "matiere": n[0],
                    "evaluation": n[1],
                    "type": n[2],
                    "valeur": float(n[3])
                }
                for n in notes
            ]
        }
    }



# =====================================================
# TODO : PUT /students/{id}
# modification d'un étudiant (DB uniquement)
# =====================================================

# =====================================================
# TODO : POST /students/import
# import JSON → PostgreSQL avec détection doublons  
# =====================================================