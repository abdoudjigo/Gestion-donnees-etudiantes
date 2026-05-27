"""
seed_db.py — Insère des étudiants de test directement en base
Exécuter depuis backend/app/ : python seed_db.py

Ce script insère 10 étudiants propres avec leurs notes.
Formule : moyenne_matière = (moyenne_devoirs + examen) / 2
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import obtenir_connexion

# ─── Connexion ───────────────────────────────────────────────
conn = obtenir_connexion()
if not conn:
    print("❌ Impossible de se connecter à PostgreSQL")
    sys.exit(1)
cur = conn.cursor()

print("🔗 Connecté à PostgreSQL")

# ─── Données propres à insérer ───────────────────────────────
# Format : (code, numero, nom, prenom, date_naissance, classe)
ETUDIANTS = [
    ("AAD001", "ETU0001", "DIALLO",  "Moussa",   "2005-03-15", "6emeA"),
    ("AAD002", "ETU0002", "NDIAYE",  "Fatou",    "2005-07-22", "6emeA"),
    ("AAD003", "ETU0003", "FAYE",    "Ibrahima", "2004-11-08", "6emeB"),
    ("AAD004", "ETU0004", "SECK",    "Mariama",  "2004-05-30", "5emeA"),
    ("AAD005", "ETU0005", "BA",      "Aliou",    "2003-09-12", "5emeB"),
    ("AAD006", "ETU0006", "TOURE",   "Aminata",  "2003-01-25", "4emeA"),
    ("AAD007", "ETU0007", "DIOP",    "Ousmane",  "2002-06-17", "4emeB"),
    ("AAD008", "ETU0008", "FALL",    "Aissatou", "2002-08-04", "3emeA"),
    ("AAD009", "ETU0009", "GUEYE",   "Cheikh",   "2001-12-19", "3emeA"),
    ("AAD010", "ETU0010", "SARR",    "Ndéye",    "2001-04-11", "3emeC"),
]

# Notes par étudiant : { matière: { devoirs: [...], examen: float } }
# Chaque étudiant a ses propres notes
NOTES_PAR_ETUDIANT = {
    "ETU0001": {
        "Math":    {"devoirs": [14.0, 15.0], "examen": 12.0},
        "Francais":{"devoirs": [12.0, 13.0], "examen": 11.0},
        "Anglais": {"devoirs": [15.0, 16.0], "examen": 14.0},
        "PC":      {"devoirs": [13.0, 14.0], "examen": 12.0},
        "SVT":     {"devoirs": [11.0, 12.0], "examen": 13.0},
        "HG":      {"devoirs": [14.0, 13.0], "examen": 15.0},
    },
    "ETU0002": {
        "Math":    {"devoirs": [16.0, 17.0, 15.0], "examen": 18.0},
        "Francais":{"devoirs": [14.0, 15.0],        "examen": 16.0},
        "Anglais": {"devoirs": [18.0],               "examen": 17.0},
        "PC":      {"devoirs": [15.0, 16.0],         "examen": 14.0},
        "SVT":     {"devoirs": [17.0, 16.0, 18.0],  "examen": 15.0},
        "HG":      {"devoirs": [13.0],               "examen": 14.0},
    },
    "ETU0003": {
        "Math":    {"devoirs": [9.0, 10.0],          "examen": 11.0},
        "Francais":{"devoirs": [11.0, 10.0],         "examen": 12.0},
        "Anglais": {"devoirs": [10.0, 9.0],          "examen": 10.0},
        "PC":      {"devoirs": [8.0],                "examen": 9.0},
        "SVT":     {"devoirs": [12.0, 11.0, 10.0],  "examen": 11.0},
        "HG":      {"devoirs": [10.0],               "examen": 11.0},
    },
    "ETU0004": {
        "Math":    {"devoirs": [13.0, 14.0],         "examen": 15.0},
        "Francais":{"devoirs": [12.0],               "examen": 13.0},
        "Anglais": {"devoirs": [14.0, 15.0],         "examen": 16.0},
        "PC":      {"devoirs": [11.0, 12.0],         "examen": 13.0},
        "SVT":     {"devoirs": [14.0, 13.0],         "examen": 12.0},
        "HG":      {"devoirs": [15.0],               "examen": 14.0},
    },
    "ETU0005": {
        "Math":    {"devoirs": [18.0, 19.0, 17.0],  "examen": 18.0},
        "Francais":{"devoirs": [15.0, 16.0],         "examen": 14.0},
        "Anglais": {"devoirs": [17.0],               "examen": 16.0},
        "PC":      {"devoirs": [19.0, 18.0],         "examen": 20.0},
        "SVT":     {"devoirs": [16.0, 17.0, 15.0],  "examen": 18.0},
        "HG":      {"devoirs": [14.0],               "examen": 15.0},
    },
    "ETU0006": {
        "Math":    {"devoirs": [7.0, 8.0],           "examen": 9.0},
        "Francais":{"devoirs": [10.0, 9.0],          "examen": 11.0},
        "Anglais": {"devoirs": [8.0],                "examen": 7.0},
        "PC":      {"devoirs": [9.0, 10.0],          "examen": 8.0},
        "SVT":     {"devoirs": [11.0, 10.0],         "examen": 9.0},
        "HG":      {"devoirs": [8.0],                "examen": 10.0},
    },
    "ETU0007": {
        "Math":    {"devoirs": [15.0, 14.0, 16.0],  "examen": 15.0},
        "Francais":{"devoirs": [13.0, 14.0],         "examen": 12.0},
        "Anglais": {"devoirs": [16.0, 15.0],         "examen": 17.0},
        "PC":      {"devoirs": [14.0],               "examen": 13.0},
        "SVT":     {"devoirs": [15.0, 16.0],         "examen": 14.0},
        "HG":      {"devoirs": [12.0],               "examen": 13.0},
    },
    "ETU0008": {
        "Math":    {"devoirs": [11.0, 12.0],         "examen": 10.0},
        "Francais":{"devoirs": [14.0, 13.0, 12.0],  "examen": 15.0},
        "Anglais": {"devoirs": [12.0],               "examen": 11.0},
        "PC":      {"devoirs": [10.0, 11.0],         "examen": 12.0},
        "SVT":     {"devoirs": [13.0, 12.0],         "examen": 11.0},
        "HG":      {"devoirs": [14.0],               "examen": 13.0},
    },
    "ETU0009": {
        "Math":    {"devoirs": [17.0, 18.0, 16.0],  "examen": 19.0},
        "Francais":{"devoirs": [15.0, 16.0],         "examen": 17.0},
        "Anglais": {"devoirs": [14.0, 15.0],         "examen": 16.0},
        "PC":      {"devoirs": [18.0],               "examen": 17.0},
        "SVT":     {"devoirs": [16.0, 17.0, 15.0],  "examen": 18.0},
        "HG":      {"devoirs": [15.0],               "examen": 16.0},
    },
    "ETU0010": {
        "Math":    {"devoirs": [6.0, 7.0],           "examen": 8.0},
        "Francais":{"devoirs": [9.0, 8.0],           "examen": 10.0},
        "Anglais": {"devoirs": [7.0],                "examen": 6.0},
        "PC":      {"devoirs": [8.0, 9.0],           "examen": 7.0},
        "SVT":     {"devoirs": [10.0, 9.0],          "examen": 8.0},
        "HG":      {"devoirs": [7.0],                "examen": 9.0},
    },
}

def calculer_moyenne(devoirs: list, examen: float) -> float:
    """
    Formule exacte du projet :
    moy_devoirs = somme(devoirs) / nb_devoirs
    moyenne = (moy_devoirs + examen) / 2
    """
    if not devoirs and examen is None:
        return 0.0
    if not devoirs:
        return round(examen, 2)
    moy_devoirs = sum(devoirs) / len(devoirs)
    if examen is None:
        return round(moy_devoirs, 2)
    return round((moy_devoirs + examen) / 2, 2)


try:
    nb_etudiants = 0
    nb_notes     = 0

    for code, numero, nom, prenom, date_naiss, classe in ETUDIANTS:

        # ── Récupérer l'ID de la classe ──────────────────────
        cur.execute("SELECT id FROM classes WHERE nom_classe = %s", (classe,))
        row = cur.fetchone()
        if not row:
            print(f"  ⚠️  Classe '{classe}' introuvable — {numero} ignoré")
            continue
        classe_id = row['id']

        # ── Vérifier le doublon ───────────────────────────────
        cur.execute("SELECT id FROM etudiants WHERE numero = %s", (numero,))
        if cur.fetchone():
            print(f"  ⚠️  Doublon ignoré : {numero}")
            continue

        # ── Insérer l'étudiant ────────────────────────────────
        cur.execute(
            """INSERT INTO etudiants
               (code, numero, nom, prenom, date_naissance, classe_id, source)
               VALUES (%s, %s, %s, %s, %s, %s, 'DB')
               RETURNING id""",
            (code, numero, nom.upper(), prenom.capitalize(), date_naiss, classe_id)
        )
        etudiant_id = cur.fetchone()['id']
        nb_etudiants += 1

        # ── Insérer les notes ─────────────────────────────────
        notes_etudiant = NOTES_PAR_ETUDIANT.get(numero, {})

        for nom_matiere, data in notes_etudiant.items():

            # Récupérer l'ID de la matière
            cur.execute("SELECT id FROM matieres WHERE nom_matiere = %s", (nom_matiere,))
            mat_row = cur.fetchone()
            if not mat_row:
                # Créer la matière si elle n'existe pas
                cur.execute(
                    "INSERT INTO matieres (nom_matiere) VALUES (%s) RETURNING id",
                    (nom_matiere,)
                )
                mat_row = cur.fetchone()
            matiere_id = mat_row['id']

            devoirs = data.get("devoirs", [])
            examen  = data.get("examen")

            # Insérer chaque devoir
            for i, valeur in enumerate(devoirs):
                nom_eval = f"Devoir {i+1}"
                cur.execute(
                    """INSERT INTO notes
                       (etudiant_id, matiere_id, nom_evaluation, type_evaluation, valeur)
                       VALUES (%s, %s, %s, 'devoir', %s)
                       ON CONFLICT (etudiant_id, matiere_id, nom_evaluation)
                       DO UPDATE SET valeur = EXCLUDED.valeur""",
                    (etudiant_id, matiere_id, nom_eval, valeur)
                )
                nb_notes += 1

            # Insérer l'examen
            if examen is not None:
                cur.execute(
                    """INSERT INTO notes
                       (etudiant_id, matiere_id, nom_evaluation, type_evaluation, valeur)
                       VALUES (%s, %s, 'Examen', 'examen', %s)
                       ON CONFLICT (etudiant_id, matiere_id, nom_evaluation)
                       DO UPDATE SET valeur = EXCLUDED.valeur""",
                    (etudiant_id, matiere_id, examen)
                )
                nb_notes += 1

            # Afficher la moyenne calculée pour vérification
            moy = calculer_moyenne(devoirs, examen)
            print(f"  ✅ {nom} {prenom} | {nom_matiere} | moy: {moy}/20")

    conn.commit()
    print(f"\n🎉 {nb_etudiants} étudiant(s) insérés, {nb_notes} note(s) insérées")

except Exception as e:
    conn.rollback()
    print(f"❌ Erreur : {e}")

finally:
    cur.close()
    conn.close()