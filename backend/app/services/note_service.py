"""
services/note_service.py
Toute la logique métier liée aux notes et aux moyennes.

RÈGLES DE CALCUL (selon les consignes) :
  - moyenne_devoirs   = somme(notes_devoir) / nb_devoirs
  - moyenne_matiere   = (moyenne_devoirs + note_examen) / 2
  - Si pas de devoirs  → moyenne_matiere = note_examen
  - Si pas d'examen    → moyenne_matiere = moyenne_devoirs
  - moyenne_generale   = somme(moyennes_matières) / nb_matières
"""

from database import executer_requete, executer_insert_retour_id, obtenir_id_matiere


# ─────────────────────────────────────────────────────────────
# CALCULS PURS (pas d'accès DB — testables unitairement)
# ─────────────────────────────────────────────────────────────

def calculer_moyenne_devoirs(valeurs: list) -> float:
    """Moyenne arithmétique d'une liste de notes de devoir."""
    if not valeurs:
        return None
    return round(sum(valeurs) / len(valeurs), 2)


def calculer_moyenne_matiere(valeurs_devoir: list, note_examen) -> float:
    """
    Moyenne d'une matière :
      - Les deux présents  : (moy_devoirs + examen) / 2
      - Seulement devoirs  : moy_devoirs
      - Seulement examen   : examen
      - Rien               : 0.0
    """
    moy_devoirs = calculer_moyenne_devoirs(valeurs_devoir)

    if moy_devoirs is not None and note_examen is not None:
        return round((moy_devoirs + float(note_examen)) / 2, 2)
    if moy_devoirs is not None:
        return moy_devoirs
    if note_examen is not None:
        return round(float(note_examen), 2)
    return 0.0


def calculer_moyenne_generale(moyennes_matieres: list) -> float:
    """
    Moyenne générale = moyenne de toutes les moyennes de matières.
    On ignore les matières sans notes (moyenne == 0 et aucune note).
    """
    valides = [m for m in moyennes_matieres if m is not None and m > 0]
    if not valides:
        return 0.0
    return round(sum(valides) / len(valides), 2)


# ─────────────────────────────────────────────────────────────
# LECTURE DES NOTES DEPUIS LA DB
# ─────────────────────────────────────────────────────────────

def get_notes_par_etudiant(etudiant_id: int) -> dict:
    """
    Récupère toutes les notes d'un étudiant et calcule :
      - la moyenne par matière
      - la moyenne générale

    Retourne :
    {
      "matieres": [
        {
          "matiere_id": 1,
          "nom_matiere": "Python",
          "devoirs": [{"note_id": 3, "nom": "Devoir 1", "valeur": 14.0}, ...],
          "examen":   {"note_id": 7, "nom": "Examen",   "valeur": 16.0} | None,
          "moyenne_devoirs": 14.0,
          "moyenne_matiere": 15.0
        },
        ...
      ],
      "moyenne_generale": 13.5
    }
    """
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
    lignes = executer_requete(sql, (etudiant_id,), toutes_lignes=True) or []

    # ── Grouper par matière ──────────────────────────────────
    groupes = {}   # nom_matiere → dict

    for row in lignes:
        nom_m = row['nom_matiere']
        if nom_m not in groupes:
            groupes[nom_m] = {
                "matiere_id":  row['matiere_id'],
                "nom_matiere": nom_m,
                "devoirs":     [],
                "examen":      None,
            }

        note = {
            "note_id": row['note_id'],
            "nom":     row['nom_evaluation'],
            "valeur":  float(row['valeur']),
        }

        if row['type_evaluation'] == 'examen':
            groupes[nom_m]['examen'] = note
        else:
            groupes[nom_m]['devoirs'].append(note)

    # ── Calculer les moyennes ────────────────────────────────
    liste_matieres   = []
    moyennes_matieres = []

    for nom_m, g in groupes.items():
        vals_devoirs  = [d['valeur'] for d in g['devoirs']]
        val_examen    = g['examen']['valeur'] if g['examen'] else None
        moy_devoirs   = calculer_moyenne_devoirs(vals_devoirs)
        moy_matiere   = calculer_moyenne_matiere(vals_devoirs, val_examen)

        liste_matieres.append({
            **g,
            "moyenne_devoirs": moy_devoirs,
            "moyenne_matiere": moy_matiere,
        })
        moyennes_matieres.append(moy_matiere)

    moy_generale = calculer_moyenne_generale(moyennes_matieres)

    return {
        "matieres":         liste_matieres,
        "moyenne_generale": moy_generale,
    }


# ─────────────────────────────────────────────────────────────
# ÉCRITURE DES NOTES EN DB
# ─────────────────────────────────────────────────────────────

def sauvegarder_note(etudiant_id: int, nom_matiere: str,
                     nom_evaluation: str, type_evaluation: str,
                     valeur: float) -> bool:
    """
    Insère ou met à jour une note (UPSERT).
    Crée la matière à la volée si elle n'existe pas.
    Retourne True si succès.
    """
    matiere_id = obtenir_id_matiere(nom_matiere)
    if not matiere_id:
        return False

    res = executer_requete(
        """
        INSERT INTO notes (etudiant_id, matiere_id, nom_evaluation, type_evaluation, valeur)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (etudiant_id, matiere_id, nom_evaluation)
        DO UPDATE SET valeur = EXCLUDED.valeur
        """,
        (etudiant_id, matiere_id, nom_evaluation, type_evaluation, valeur)
    )
    return res is not None


def supprimer_note(note_id: int, etudiant_id: int) -> bool:
    """Supprime une note (vérifie que l'étudiant correspond)."""
    res = executer_requete(
        "DELETE FROM notes WHERE id = %s AND etudiant_id = %s",
        (note_id, etudiant_id)
    )
    return res is not None


def sauvegarder_toutes_notes_etudiant(etudiant_id: int, matieres: list) -> bool:
    """
    Insère toutes les notes d'un étudiant lors de sa création.
    matieres : liste de MatiereInput (objets Pydantic).
    """
    for matiere in matieres:
        if not matiere.nom_matiere.strip():
            continue

        # Notes de devoir
        for i, devoir in enumerate(matiere.notes_devoir):
            nom_eval = devoir.nom if devoir.nom != "Devoir" else f"Devoir {i + 1}"
            ok = sauvegarder_note(
                etudiant_id, matiere.nom_matiere,
                nom_eval, 'devoir', devoir.valeur
            )
            if not ok:
                return False

        # Examen
        if matiere.note_examen is not None:
            ok = sauvegarder_note(
                etudiant_id, matiere.nom_matiere,
                'Examen', 'examen', matiere.note_examen
            )
            if not ok:
                return False

    return True