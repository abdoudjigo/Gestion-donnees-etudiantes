"""
database.py - Connexion PostgreSQL + fonctions utilitaires SQL
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD


def obtenir_connexion():
    """Ouvre et retourne une connexion PostgreSQL."""
    try:
        return psycopg2.connect(
            host=DB_HOST, port=DB_PORT, database=DB_NAME,
            user=DB_USER, password=DB_PASSWORD,
            cursor_factory=RealDictCursor
        )
    except Exception as e:
        print(f"[DB] Erreur connexion : {e}")
        return None


def executer_requete(sql, params=None, une_ligne=False, toutes_lignes=False):
    """
    Exécute une requête SQL.

    - une_ligne=True       → fetchone()  (SELECT ... LIMIT 1)
    - toutes_lignes=True   → fetchall()  (SELECT ...)
    - sinon                → commit()    (INSERT / UPDATE / DELETE)

    Retourne None en cas d'erreur.
    """
    conn = obtenir_connexion()
    if not conn:
        return None

    cur = conn.cursor()
    try:
        cur.execute(sql, params or ())
        if une_ligne:
            return cur.fetchone()
        if toutes_lignes:
            return cur.fetchall()
        conn.commit()
        return True
    except Exception as e:
        print(f"[DB] Erreur SQL : {e}\n    Requête : {sql}\n    Params  : {params}")
        conn.rollback()
        return None
    finally:
        cur.close()
        conn.close()


def executer_insert_retour_id(sql, params=None):
    """
    Exécute un INSERT … RETURNING id et retourne l'id créé.
    Utiliser quand on a besoin de l'ID tout de suite après l'insert.
    """
    conn = obtenir_connexion()
    if not conn:
        return None

    cur = conn.cursor()
    try:
        cur.execute(sql, params or ())
        row = cur.fetchone()
        conn.commit()
        return row['id'] if row else None
    except Exception as e:
        print(f"[DB] Erreur INSERT RETURNING : {e}")
        conn.rollback()
        return None
    finally:
        cur.close()
        conn.close()


def obtenir_id_classe(nom_classe: str):
    """Retourne l'ID d'une classe par son nom, ou None si inexistante."""
    if not nom_classe:
        return None
    row = executer_requete(
        "SELECT id FROM classes WHERE nom_classe = %s",
        (nom_classe,), une_ligne=True
    )
    return row['id'] if row else None


def obtenir_id_matiere(nom_matiere: str):
    """
    Retourne l'ID d'une matière.
    La crée automatiquement si elle n'existe pas encore.
    """
    if not nom_matiere:
        return None
    row = executer_requete(
        "SELECT id FROM matieres WHERE nom_matiere = %s",
        (nom_matiere,), une_ligne=True
    )
    if row:
        return row['id']
    # Créer la matière à la volée
    return executer_insert_retour_id(
        "INSERT INTO matieres (nom_matiere) VALUES (%s) RETURNING id",
        (nom_matiere,)
    )