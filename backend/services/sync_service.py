import json
import sys
sys.path.append("/home/abdoulaye/Documents/Orange Digital center/Framework Python et APi/projetAPI/PROJECT_P8/backend")
from database import get_connection


#=============================================
#fction synchronisé le JSON dans postgres
def sync_etudiants():

    etudiant_insere = 0
    etudiant_skip = 0

    #On charger ici le fichier JSOn 
    with open("/home/abdoulaye/Documents/Orange Digital center/Framework Python et APi/projetAPI/PROJECT_P8/backend/data/valides.json", "r",  encoding="utf-8") as fichier :
        etudiants = json.load(fichier)

    print(len(etudiants))
    print(etudiants[0])

    #on se connect à la database
    connection = get_connection()
    cursor = connection.cursor()

    #boucle sur les etudiants
    for etudiant in etudiants:

        #on verifie s'il n'existe pas 
        cursor.execute(
            "SELECT id from etudiants WHERE numero = %s or code = %s",
            (etudiant["numero"], etudiant["code"])
        )

        existe = cursor.fetchone()
        if existe:
            etudiant_skip += 1
            continue

        #inserer si nouveau
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
    """,(
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
        "skip" : etudiant_skip
    }


#=============================================
#on fait pour les notes

def sync_notes():

    connection = get_connection()
    cursor = connection.cursor()

    with open("/home/abdoulaye/Documents/Orange Digital center/Framework Python et APi/projetAPI/PROJECT_P8/backend/data/valides.json", "r",  encoding="utf-8") as fichier :
        etudiants = json.load(fichier)

    #boucle etudiants et récupérer etudiant_id
    for etudiant in etudiants:
        cursor.execute(
            "SELECT id from etudiants WHERE numero = %s or code = %s",
            (etudiant["numero"], etudiant["code"])
        )

        etudiant_db = cursor.fetchone()
        if not etudiant_db:
            continue

        etudiant_id = etudiant_db[0]

        #et puisk le JSON est en string on le convertit
        notes = eval(etudiant["notes"])

    #boucle sur matiere et récupérer matiere_id
        for matiere, details in notes.items():
            cursor.execute(
                "SELECT id FROM matieres WHERE nom_matiere = %s",
                (matiere,)
            )

            matiere_db = cursor.fetchone()
            if not matiere_db:
                continue
            matiere_id = matiere_db[0]

            #insertion des deveoirs
            for i, devoir in enumerate(details["devoirs"]):
                cursor.execute("""
                    INSERT into notes (
                        etudiant_id,
                        matiere_id,
                        nom_evaluation,
                        type_evaluation,
                        valeur
                    )
                    VALUES (%s, %s, %s, %s, %s)

                """ , (
                    etudiant_id,
                    matiere_id,
                    f"Devoir {i+1}",
                    "devoir",
                    devoir
                )
                )
                
            #inserer examen
            cursor.execute("""
                INSERT into notes (
                    etudiant_id,
                    matiere_id,
                    nom_evaluation,
                    type_evaluation,
                    valeur
                )
                VALUES (%s, %s, %s, %s, %s)
            """, (
                etudiant_id,
                matiere_id,
                "Examen",
                "examen",
                details["examen"]
            )
            )

    connection.commit()
    cursor.close()
    connection.close()
    



sync_etudiants()
sync_notes()