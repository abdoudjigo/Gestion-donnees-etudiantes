"""
services/dashboard_service.py
Toute la logique de calcul des statistiques pour le dashboard.
"""

from database import executer_requete
from services.note_service import calculer_moyenne_generale


def get_stats_globales() -> dict:
    """
    KPI principaux :
      - Total étudiants actifs
      - Nombre en DB / en JSON
      - Nombre archivés
      - Moyenne générale de tous les étudiants
    """
    total_actifs = executer_requete(
        "SELECT COUNT(*) AS n FROM etudiants WHERE archived = FALSE",
        une_ligne=True
    )
    total_archives = executer_requete(
        "SELECT COUNT(*) AS n FROM etudiants WHERE archived = TRUE",
        une_ligne=True
    )
    total_db = executer_requete(
        "SELECT COUNT(*) AS n FROM etudiants WHERE archived = FALSE AND source = 'DB'",
        une_ligne=True
    )
    # Les étudiants JSON "actifs" sont ceux du fichier JSON non encore importés.
    # On ne les stocke pas en DB, donc on ne peut pas les compter ici facilement.
    # On expose juste DB vs total — le frontend peut calculer JSON = total - DB.

    # Moyenne générale globale : pour chaque étudiant, on calcule sa moy générale
    # puis on fait la moyenne de toutes ces moyennes.
    sql_moy = """
        SELECT
            e.id,
            AVG(CASE WHEN n.type_evaluation = 'examen'
                     THEN n.valeur END)                       AS moy_examen_mat,
            AVG(CASE WHEN n.type_evaluation = 'devoir'
                     THEN n.valeur END)                       AS moy_devoir_mat
        FROM etudiants e
        JOIN notes n ON n.etudiant_id = e.id
        WHERE e.archived = FALSE
        GROUP BY e.id, n.matiere_id
    """
    # Approche simplifiée mais fiable : moyenne de toutes les notes
    sql_moy_simple = """
        SELECT ROUND(AVG(n.valeur)::numeric, 2) AS moy
        FROM notes n
        JOIN etudiants e ON e.id = n.etudiant_id
        WHERE e.archived = FALSE
    """
    moy_row = executer_requete(sql_moy_simple, une_ligne=True)

    return {
        "success": True,
        "data": {
            "total_etudiants": total_actifs['n']  if total_actifs  else 0,
            "total_db":        total_db['n']       if total_db      else 0,
            "total_archives":  total_archives['n'] if total_archives else 0,
            "moyenne_generale": float(moy_row['moy']) if moy_row and moy_row['moy'] else 0.0,
        }
    }


def get_stats_par_classe() -> dict:
    """
    Pour chaque classe :
      - Nombre d'étudiants
      - Moyenne générale de la classe
      - Meilleure moyenne
      - Moins bonne moyenne
    """
    sql = """
        SELECT
            c.nom_classe                                    AS classe,
            COUNT(DISTINCT e.id)                            AS nb_etudiants,
            ROUND(AVG(n.valeur)::numeric, 2)                AS moyenne,
            ROUND(MAX(sous.moy_etudiant)::numeric, 2)       AS meilleure,
            ROUND(MIN(sous.moy_etudiant)::numeric, 2)       AS moins_bonne
        FROM classes c
        LEFT JOIN etudiants e   ON e.classe_id = c.id AND e.archived = FALSE
        LEFT JOIN notes n       ON n.etudiant_id = e.id
        LEFT JOIN (
            SELECT etudiant_id, AVG(valeur) AS moy_etudiant
            FROM notes
            GROUP BY etudiant_id
        ) sous ON sous.etudiant_id = e.id
        GROUP BY c.nom_classe
        ORDER BY c.nom_classe
    """
    rows = executer_requete(sql, toutes_lignes=True) or []
    return {
        "success": True,
        "data": [
            {
                "classe":       r['classe'],
                "nb_etudiants": r['nb_etudiants'] or 0,
                "moyenne":      float(r['moyenne'])     if r['moyenne']     else 0.0,
                "meilleure":    float(r['meilleure'])   if r['meilleure']   else 0.0,
                "moins_bonne":  float(r['moins_bonne']) if r['moins_bonne'] else 0.0,
            }
            for r in rows
        ]
    }


def get_top10() -> dict:
    """
    Top 10 étudiants par moyenne générale réelle.
    Calcul : pour chaque étudiant → moyenne par matière → moyenne des moyennes.
    """
    # Étape 1 : moyenne par (etudiant, matière)
    # On calcule : moy_mat = (moy_devoirs + examen) / 2
    sql = """
        WITH devoirs AS (
            SELECT etudiant_id, matiere_id,
                   AVG(valeur) AS moy_devoirs
            FROM notes
            WHERE type_evaluation = 'devoir'
            GROUP BY etudiant_id, matiere_id
        ),
        examens AS (
            SELECT etudiant_id, matiere_id,
                   AVG(valeur) AS note_examen
            FROM notes
            WHERE type_evaluation = 'examen'
            GROUP BY etudiant_id, matiere_id
        ),
        moy_matieres AS (
            SELECT
                COALESCE(d.etudiant_id, ex.etudiant_id) AS etudiant_id,
                COALESCE(d.matiere_id,  ex.matiere_id)  AS matiere_id,
                CASE
                    WHEN d.moy_devoirs IS NOT NULL AND ex.note_examen IS NOT NULL
                        THEN (d.moy_devoirs + ex.note_examen) / 2
                    WHEN d.moy_devoirs IS NOT NULL
                        THEN d.moy_devoirs
                    ELSE ex.note_examen
                END AS moy_matiere
            FROM devoirs d
            FULL OUTER JOIN examens ex
                ON d.etudiant_id = ex.etudiant_id
               AND d.matiere_id  = ex.matiere_id
        ),
        moy_generales AS (
            SELECT etudiant_id,
                   ROUND(AVG(moy_matiere)::numeric, 2) AS moyenne_generale
            FROM moy_matieres
            GROUP BY etudiant_id
        )
        SELECT
            e.id, e.nom, e.prenom,
            c.nom_classe       AS classe,
            mg.moyenne_generale
        FROM moy_generales mg
        JOIN etudiants e ON e.id = mg.etudiant_id
        LEFT JOIN classes c ON c.id = e.classe_id
        WHERE e.archived = FALSE
        ORDER BY mg.moyenne_generale DESC
        LIMIT 10
    """
    rows = executer_requete(sql, toutes_lignes=True) or []
    return {
        "success": True,
        "data": [
            {
                "id":               r['id'],
                "nom":              r['nom'],
                "prenom":           r['prenom'],
                "classe":           r['classe'] or "",
                "moyenne_generale": float(r['moyenne_generale']) if r['moyenne_generale'] else 0.0,
            }
            for r in rows
        ]
    }


def get_repartition_source() -> dict:
    """Nombre d'étudiants par source (DB uniquement — JSON vient du fichier)."""
    row = executer_requete(
        """SELECT
               SUM(CASE WHEN source = 'DB'   THEN 1 ELSE 0 END) AS nb_db,
               COUNT(*) AS total
           FROM etudiants WHERE archived = FALSE""",
        une_ligne=True
    )
    nb_db = int(row['nb_db']) if row and row['nb_db'] else 0
    total = int(row['total']) if row and row['total'] else 0
    return {
        "success": True,
        "data": {"db": nb_db, "total_db": total}
    }