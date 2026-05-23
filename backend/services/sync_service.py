import json
import ast
import sys

sys.path.append("/home/abdoulaye/Documents/Orange Digital center/Framework Python et APi/projetAPI/PROJECT_P8/backend")

from database import get_connection


# =====================================================
# SYNCHRO ETUDIANTS
# =====================================================
def sync_etudiants():

    etudiant_insere = 0
    etudiant_skip = 0

    # Charger JSON
    with open(
        "/home/abdoulaye/Documents/Orange Digital center/Framework Python et APi/projetAPI/PROJECT_P8/backend/data/valides.json",
        "r",
        encoding="utf-8"
    ) as fichier:
        etudiants = json.load(fichier)

    print("Total étudiants JSON :", len(etudiants))

    # Connexion DB
    connection = get_connection()
    cursor = connection.cursor()

    for etudiant in etudiants:

        # Vérification existence (numero OU code)
        cursor.execute(
            "SELECT id FROM etudiants WHERE numero = %s",
            (etudiant["numero"],)
        )

        existe = cursor.fetchone()

        if existe:
            etudiant_skip += 1
            continue

        # Insertion étudiant
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
            ON CONFLICT (numero) DO NOTHING

        """, (
            etudiant["code"],
            etudiant["numero"],
            etudiant["nom"],
            etudiant["prenom"],
            etudiant["date_naissance"],
            etudiant["classe"],
            "JSON"
        ))

        etudiant_insere += 1

    connection.commit()
    cursor.close()
    connection.close()

    return {
        "insere": etudiant_insere,
        "skip": etudiant_skip
    }


# =====================================================
# SYNCHRO NOTES
# =====================================================
def sync_notes():

    connection = get_connection()
    cursor = connection.cursor()

    with open(
        "/home/abdoulaye/Documents/Orange Digital center/Framework Python et APi/projetAPI/PROJECT_P8/backend/data/valides.json",
        "r",
        encoding="utf-8"
    ) as fichier:
        etudiants = json.load(fichier)

    for etudiant in etudiants:

        # retrouver étudiant en base
        cursor.execute(
            "SELECT id FROM etudiants WHERE numero = %s",
            (etudiant["numero"],)
        )

        etudiant_db = cursor.fetchone()

        if not etudiant_db:
            continue

        etudiant_id = etudiant_db[0]

        # convertir notes string → dict
        notes = ast.literal_eval(etudiant["notes"])

        for matiere, details in notes.items():

            # récupérer matière
            cursor.execute(
                "SELECT id FROM matieres WHERE nom_matiere = %s",
                (matiere,)
            )

            matiere_db = cursor.fetchone()

            if not matiere_db:
                continue

            matiere_id = matiere_db[0]

            # =========================
            # DEVOIRS
            # =========================
            for i, devoir in enumerate(details["devoirs"]):

                cursor.execute("""
                    INSERT INTO notes (
                        etudiant_id,
                        matiere_id,
                        nom_evaluation,
                        type_evaluation,
                        valeur
                    )
                    VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (etudiant_id, matiere_id, nom_evaluation)
                        DO NOTHING
                """, (
                    etudiant_id,
                    matiere_id,
                    f"Devoir {i+1}",
                    "devoir",
                    devoir
            ))

            # =========================
            # EXAMEN
            # =========================
            cursor.execute("""
                INSERT INTO notes (
                    etudiant_id,
                    matiere_id,
                    nom_evaluation,
                    type_evaluation,
                    valeur
                )
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (etudiant_id, matiere_id, nom_evaluation)
                DO NOTHING
            """, (
                etudiant_id,
                matiere_id,
                "Examen",
                "examen",
                details["examen"]
        ))

    connection.commit()
    cursor.close()
    connection.close()


# =====================================================
# EXECUTION
# =====================================================
if __name__ == "__main__":
    sync_etudiants()
    sync_notes()