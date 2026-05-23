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
# TODO : PUT /students/{id}
# modification d'un étudiant (DB uniquement)
# =====================================================

# =====================================================
# TODO : POST /students/import
# import JSON → PostgreSQL avec détection doublons  
# =====================================================