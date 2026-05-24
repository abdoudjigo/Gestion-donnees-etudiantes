from fastapi import APIRouter, Query
from services.student_service import get_all_etudiants
from database import get_connection

router = APIRouter()


# =====================================================
# POST /students
# deux cas :
# 1. import JSON → appelle sync_service avec les notes
# 2. ajout manuel → insertion directe en DB
# =====================================================
@router.post("/")
def create_student(student: dict):

    # cas 1 : import depuis la page import.html
    # source = "JSON" envoyé par le frontend
    if student.get("source") == "JSON":
        from services.sync_service import import_etudiant_avec_notes
        return import_etudiant_avec_notes(student["numero"])

    # cas 2 : ajout manuel depuis le formulaire index.html
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
            'DB'
        )
    """, (
        student["code"],
        student["numero"],
        student["nom"],
        student["prenom"],
        student["date_naissance"],
        student["classe"]
    ))

    connection.commit()
    cursor.close()
    connection.close()

    return {
        "success": True,
        "message": "Étudiant ajouté"
    }


# =====================================================
# GET /students
# liste paginée avec recherche optionnelle
# fusion DB + JSON gérée dans student_service
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
# GET /students/archives
# retourne les étudiants archivés (archived = TRUE)
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
# GET /students/json-preview
# retourne les étudiants du JSON pas encore en DB
# utilisé par la page import.html
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
                "classe": e["classe"],
                "code": e.get("code", "JSON_IMPORT")
            }
            for e in non_importes
        ]
    }


# =====================================================
# GET /students/{id}
# détail complet d'un étudiant avec toutes ses notes
# doit être après /archives et /json-preview
# sinon FastAPI confond avec /{student_id}
# =====================================================
@router.get("/{student_id}")
def get_student(student_id: int):

    connection = get_connection()
    cursor = connection.cursor()

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
# POST /students/{id}/restore
# restaurer un étudiant archivé
# remet archived = FALSE
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
# POST /students/{id}/notes
# ajouter une note à un étudiant existant
# utilisé par la page detail.html
# =====================================================
@router.post("/{student_id}/notes")
def add_note(student_id: int, note: dict):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO notes (
            etudiant_id,
            matiere_id,
            nom_evaluation,
            type_evaluation,
            valeur
        )
        VALUES (
            %s,
            (SELECT id FROM matieres WHERE nom_matiere = %s),
            %s, %s, %s
        )
        ON CONFLICT (etudiant_id, matiere_id, nom_evaluation)
        DO NOTHING
    """, (
        student_id,
        note["matiere"],
        note["nom_evaluation"],
        note["type_evaluation"],
        note["valeur"]
    ))

    connection.commit()
    cursor.close()
    connection.close()

    return {"success": True, "message": "Note ajoutée"}


# =====================================================
# DELETE /students/{id}
# archivage soft — jamais de suppression physique
# met archived = TRUE
# l'étudiant reste en base mais disparaît des listes
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
# seuls nom, prenom, classe sont modifiables
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