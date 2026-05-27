"""
services/note_service.py
Calcul des notes et moyennes — version corrigée

FORMULE (selon les consignes) :
  moy_devoirs  = somme(devoirs) / nb_devoirs
  moy_matière  = (moy_devoirs + examen) / 2
  moy_générale = somme(moy_matières) / nb_matières
"""

from database import executer_requete, obtenir_connexion


# ═══════════════════════════════════════════════════════════════
# CALCULS PURS (sans accès DB)
# ═══════════════════════════════════════════════════════════════

def calculer_moyenne_devoirs(valeurs: list):
    """Moyenne arithmétique des devoirs. Retourne None si liste vide."""
    valeurs_propres = [v for v in valeurs if v is not None]
    if not valeurs_propres:
        return None
    return round(sum(valeurs_propres) / len(valeurs_propres), 2)


def calculer_moyenne_matiere(valeurs_devoirs: list, note_examen) -> float:
    """
    Règle :
      - Devoirs ET examen → (moy_devoirs + examen) / 2
      - Seulement devoirs → moy_devoirs
      - Seulement examen  → examen
      - Rien              → 0.0
    """
    moy_dev = calculer_moyenne_devoirs(valeurs_devoirs)
    exam    = float(note_examen) if note_examen is not None else None

    if moy_dev is not None and exam is not None:
        return round((moy_dev + exam) / 2, 2)
    if moy_dev is not None:
        return moy_dev
    if exam is not None:
        return round(exam, 2)
    return 0.0


def calculer_moyenne_generale(moyennes_matieres: list) -> float:
    """Moyenne des moyennes de matières (on ignore les 0.0 sans notes)."""
    valides = [m for m in moyennes_matieres if m is not None and m > 0]
    if not valides:
        return 0.0
    return round(sum(valides) / len(valides), 2)


# ═══════════════════════════════════════════════════════════════
# LECTURE DES NOTES DEPUIS LA BASE
# ═══════════════════════════════════════════════════════════════

def get_notes_par_etudiant(etudiant_id: int) -> dict:
    """
    Récupère toutes les notes d'un étudiant depuis la DB,
    les groupe par matière et calcule les moyennes.

    Retourne :
    {
      "success": True,
      "data": {
        "matieres": [
          {
            "matiere_id": 1,
            "nom_matiere": "Math",
            "devoirs": [
              {"note_id": 3, "nom": "Devoir 1", "valeur": 14.0},
              ...
            ],
            "examen": {"note_id": 7, "nom": "Examen", "valeur": 16.0},
            "moyenne_devoirs": 14.5,
            "moyenne_matiere": 15.25
          },
          ...
        ],
        "moyenne_generale": 13.5
      }
    }
    """
    # Requête simple et directe — on joint notes + matieres
    sql = """
        SELECT
            n.id            AS note_id,
            n.nom_evaluation,
            n.type_evaluation,
            n.valeur,
            m.id            AS matiere_id,
            m.nom_matiere
        FROM notes n
        JOIN matieres m ON m.id = n.matiere_id
        WHERE n.etudiant_id = %s
        ORDER BY m.nom_matiere, n.type_evaluation DESC, n.nom_evaluation
    """

    # On utilise directement la connexion pour plus de contrôle
    conn = obtenir_connexion()
    if not conn:
        return {"success": False, "message": "Erreur de connexion DB"}

    lignes = []
    try:
        cur = conn.cursor()
        cur.execute(sql, (etudiant_id,))
        lignes = cur.fetchall()
    except Exception as e:
        print(f"[note_service] Erreur requête : {e}")
        return {"success": False, "message": str(e)}
    finally:
        conn.close()

    # Pas de notes → retourner une structure vide propre
    if not lignes:
        return {
            "success": True,
            "data": {
                "matieres":         [],
                "moyenne_generale": 0.0
            }
        }

    # ── Grouper par matière ──────────────────────────────────
    # On utilise un dict ordonné : nom_matière → données
    groupes = {}

    for row in lignes:
        nom_m = row['nom_matiere']

        # Créer l'entrée si elle n'existe pas encore
        if nom_m not in groupes:
            groupes[nom_m] = {
                "matiere_id":  row['matiere_id'],
                "nom_matiere": nom_m,
                "devoirs":     [],
                "examen":      None,
            }

        # Construire l'objet note
        note = {
            "note_id": row['note_id'],
            "nom":     row['nom_evaluation'],
            "valeur":  float(row['valeur']),
        }

        # Ranger selon le type
        if row['type_evaluation'] == 'examen':
            groupes[nom_m]['examen'] = note
        else:
            groupes[nom_m]['devoirs'].append(note)

    # ── Calculer les moyennes ────────────────────────────────
    liste_matieres    = []
    toutes_moyennes   = []

    for nom_m, g in groupes.items():
        vals_devoirs = [d['valeur'] for d in g['devoirs']]
        val_examen   = g['examen']['valeur'] if g['examen'] else None

        moy_dev     = calculer_moyenne_devoirs(vals_devoirs)
        moy_matiere = calculer_moyenne_matiere(vals_devoirs, val_examen)

        liste_matieres.append({
            "matiere_id":      g['matiere_id'],
            "nom_matiere":     g['nom_matiere'],
            "devoirs":         g['devoirs'],
            "examen":          g['examen'],
            "moyenne_devoirs": moy_dev,    # peut être None si pas de devoirs
            "moyenne_matiere": moy_matiere,
        })
        toutes_moyennes.append(moy_matiere)

    moy_generale = calculer_moyenne_generale(toutes_moyennes)

    return {
        "success": True,
        "data": {
            "matieres":         liste_matieres,
            "moyenne_generale": moy_generale,
        }
    }


# ═══════════════════════════════════════════════════════════════
# ÉCRITURE DES NOTES
# ═══════════════════════════════════════════════════════════════

def sauvegarder_note(etudiant_id: int, nom_matiere: str,
                     nom_evaluation: str, type_evaluation: str,
                     valeur: float) -> bool:
    """
    UPSERT d'une note.
    Crée la matière automatiquement si elle n'existe pas.
    """
    # Récupérer ou créer la matière
    conn = obtenir_connexion()
    if not conn:
        return False

    try:
        cur = conn.cursor()

        # Chercher la matière
        cur.execute("SELECT id FROM matieres WHERE nom_matiere = %s", (nom_matiere,))
        row = cur.fetchone()

        if row:
            matiere_id = row['id']
        else:
            # Créer la matière à la volée
            cur.execute(
                "INSERT INTO matieres (nom_matiere) VALUES (%s) RETURNING id",
                (nom_matiere,)
            )
            matiere_id = cur.fetchone()['id']

        # UPSERT de la note
        cur.execute(
            """
            INSERT INTO notes
                (etudiant_id, matiere_id, nom_evaluation, type_evaluation, valeur)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (etudiant_id, matiere_id, nom_evaluation)
            DO UPDATE SET valeur = EXCLUDED.valeur
            """,
            (etudiant_id, matiere_id, nom_evaluation, type_evaluation, valeur)
        )
        conn.commit()
        return True

    except Exception as e:
        print(f"[note_service] Erreur sauvegarder_note : {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def supprimer_note(note_id: int, etudiant_id: int) -> bool:
    """Supprime une note en vérifiant qu'elle appartient bien à l'étudiant."""
    conn = obtenir_connexion()
    if not conn:
        return False
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM notes WHERE id = %s AND etudiant_id = %s",
            (note_id, etudiant_id)
        )
        conn.commit()
        return cur.rowcount > 0  # True si une ligne a bien été supprimée
    except Exception as e:
        print(f"[note_service] Erreur supprimer_note : {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def sauvegarder_toutes_notes_etudiant(etudiant_id: int, matieres: list) -> bool:
    """
    Insère toutes les notes lors de la création d'un étudiant.
    matieres : liste d'objets MatiereInput (Pydantic).
    """
    for matiere in matieres:
        if not matiere.nom_matiere.strip():
            continue

        # Insérer chaque devoir
        for i, devoir in enumerate(matiere.notes_devoir):
            nom_eval = devoir.nom if devoir.nom != "Devoir" else f"Devoir {i + 1}"
            ok = sauvegarder_note(
                etudiant_id,
                matiere.nom_matiere,
                nom_eval,
                'devoir',
                devoir.valeur
            )
            if not ok:
                return False

        # Insérer l'examen
        if matiere.note_examen is not None:
            ok = sauvegarder_note(
                etudiant_id,
                matiere.nom_matiere,
                'Examen',
                'examen',
                matiere.note_examen
            )
            if not ok:
                return False

    return True