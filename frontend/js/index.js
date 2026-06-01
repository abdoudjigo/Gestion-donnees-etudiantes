/**
 * index.js — Logique complète de la page principale (index.html)
 *
 * Fonctionnalités :
 *  1. Liste paginée des étudiants (DB + JSON fusionnés)
 *  2. Moyenne automatique :
 *       - DB  → chargée depuis l'API (GET /students/{id}/notes)
 *       - JSON → calculée en JS depuis le champ notes_raw
 *  3. Pagination avec numéros de page cliquables
 *  4. Cases à cocher sur les lignes JSON + bouton "Importer"
 *  5. Formulaire d'ajout avec matières et notes
 *  6. Modale d'édition (infos + notes + moyennes)
 *  7. Édition cellule par cellule (double-clic → Entrée/Échap)
 *  8. Archivage soft
 */

// ── État global de la page ───────────────────────────────────
let page  = 1;   // page courante
let limit = 10;  // nombre de lignes par page
let total = 0;   // total d'étudiants (pour calculer le nb de pages)

// ── Démarrage : quand le HTML est complètement chargé ────────
document.addEventListener('DOMContentLoaded', async () => {

    // 1. Charger les classes dans les selects (filtres + formulaire)
    await chargerClasses();

    // 2. Charger la première page d'étudiants
    await chargerEtudiants();

    // 3. Attacher les événements aux filtres
    document.getElementById('searchInput')
        .addEventListener('input', () => { page = 1; chargerEtudiants(); });

    document.getElementById('sourceFilter')
        .addEventListener('change', () => { page = 1; chargerEtudiants(); });

    document.getElementById('classeFilter')
        .addEventListener('change', () => { page = 1; chargerEtudiants(); });

    document.getElementById('limitSelect')
        .addEventListener('change', () => {
            limit = parseInt(document.getElementById('limitSelect').value);
            page  = 1;
            chargerEtudiants();
        });

    // 4. Fermer la modale si on clique en dehors
    document.getElementById('modaleEdit')
        .addEventListener('click', function(e) {
            if (e.target === this) fermerModale();
        });
});

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — CLASSES (remplir les selects)
// ═══════════════════════════════════════════════════════════════

/**
 * Charge les classes depuis l'API et remplit :
 *  - le select "Filtre par classe" (#classeFilter)
 *  - le select "Classe" du formulaire d'ajout (#fClasse)
 */
async function chargerClasses() {
    const res = await getClasses();
    if (!res.success) return;

    const selFiltre = document.getElementById('classeFilter');
    const selForm   = document.getElementById('fClasse');

    res.data.forEach(c => {
        selFiltre.innerHTML += `<option value="${c.nom}">${c.nom}</option>`;
        selForm.innerHTML   += `<option value="${c.nom}">${c.nom}</option>`;
    });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — CALCUL MOYENNE JSON (côté frontend)
// ═══════════════════════════════════════════════════════════════

/**
 * Calcule la moyenne générale d'un étudiant JSON depuis la string notes_raw.
 *
 * Le champ notes_raw vient de valides.json et ressemble à :
 *   "{'Math': {'devoirs': [14.0, 15.0], 'examen': 10.0, 'moyenne': 11.5}, ...}"
 *
 * On utilise une regex pour extraire toutes les valeurs 'moyenne': X.XX
 * (déjà calculées dans le projet Python) et on en fait la moyenne.
 *
 * On n'utilise PAS eval() pour des raisons de sécurité.
 * On filtre les valeurs > 20 pour ignorer les données aberrantes.
 *
 * @param {string} notesRaw - La string brute du champ notes
 * @returns {number|null} La moyenne générale, ou null si impossible
 */
function calculerMoyenneJson(notesRaw) {
    if (!notesRaw || typeof notesRaw !== 'string') return null;

    try {
        // Extraire toutes les occurrences de 'moyenne': X.XX
        const regex  = /'moyenne':\s*([\d.]+)/g;
        const valeurs = [];
        let match;

        while ((match = regex.exec(notesRaw)) !== null) {
            const v = parseFloat(match[1]);
            // Filtrer les valeurs aberrantes (ex: 78.0 dans les données invalides)
            if (!isNaN(v) && v >= 0 && v <= 20) {
                valeurs.push(v);
            }
        }

        if (valeurs.length === 0) return null;

        // Moyenne des moyennes de matières = moyenne générale
        const somme = valeurs.reduce((a, b) => a + b, 0);
        return Math.round((somme / valeurs.length) * 100) / 100;

    } catch (e) {
        console.error('[calculerMoyenneJson] Erreur:', e);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — LISTE DES ÉTUDIANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Charge et affiche la page courante des étudiants.
 *
 * Ordre des opérations :
 *  1. Appel API GET /students/ avec les filtres actifs
 *  2. Pour les DB : charge toutes les moyennes en parallèle (Promise.all)
 *  3. Pour les JSON : calcule la moyenne depuis notes_raw en JS
 *  4. Construit le HTML du tableau et l'injecte dans le DOM
 *  5. Met à jour la pagination
 */
async function chargerEtudiants() {
    const search = document.getElementById('searchInput').value.trim();
    const source = document.getElementById('sourceFilter').value;
    const classe = document.getElementById('classeFilter').value;
    const tbody  = document.getElementById('tableBody');

    // Afficher un spinner pendant le chargement
    tbody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-10 text-gray-400">
                <i class="fas fa-spinner fa-spin mr-2"></i>Chargement...
            </td>
        </tr>`;

    // Appel API principal
    const res = await getEtudiants(page, limit, search, source, classe);

    if (!res.success) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-10 text-red-400">
                    ❌ Erreur de connexion — vérifiez que le backend tourne (port 8000)
                </td>
            </tr>`;
        return;
    }

    total = res.total || 0;
    const etudiants = res.data || [];

    // Mettre à jour la pagination et masquer le bouton import
    majPagination();
    majBoutonImport();

    if (etudiants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-10 text-gray-400">
                    Aucun étudiant trouvé pour ces critères
                </td>
            </tr>`;
        return;
    }

    // ── Charger les moyennes DB en parallèle ─────────────────
    // On sépare DB et JSON pour traiter chacun différemment.
    // Promise.all envoie tous les appels en même temps
    // (au lieu de les faire un par un), ce qui est beaucoup plus rapide.
    const etudiants_db = etudiants.filter(e => e.source === 'DB' && e.id);
    const moyennesDb   = {}; // { id_etudiant: moyenne_generale }

    if (etudiants_db.length > 0) {
        // Envoyer tous les appels GET /students/{id}/notes en parallèle
        const resultats = await Promise.all(
            etudiants_db.map(e => getNotes(e.id))
        );
        // Stocker les résultats dans un dict par ID
        etudiants_db.forEach((e, i) => {
            const r = resultats[i];
            moyennesDb[e.id] = (r.success && r.data)
                ? r.data.moyenne_generale
                : null;
        });
    }

    // ── Construire les lignes HTML ────────────────────────────
    tbody.innerHTML = etudiants.map(e => {

        // Badge coloré selon la source
        const badge = e.source === 'DB'
            ? `<span class="px-2 py-1 bg-green-100 text-green-700
                            rounded-full text-xs font-bold">DB</span>`
            : `<span class="px-2 py-1 bg-blue-100 text-blue-700
                            rounded-full text-xs font-bold">JSON</span>`;

        // ── Cellule "Moyenne générale" ────────────────────────
        let cellMoy;

        if (e.source === 'DB' && e.id) {
            // Étudiant DB : moyenne chargée depuis l'API
            const moy = moyennesDb[e.id];

            if (moy !== null && moy !== undefined) {
                const col = moy >= 10 ? 'text-green-600' : 'text-red-500';
                // Cliquable → ouvre la modale avec les notes détaillées
                cellMoy = `
                    <span class="font-bold ${col} cursor-pointer hover:underline"
                          onclick="ouvrirModaleEdit(${e.id})"
                          title="Cliquer pour voir les notes détaillées">
                        ${moy}/20
                    </span>`;
            } else {
                // DB mais aucune note enregistrée
                cellMoy = `<span class="text-gray-300 text-xs">pas de notes</span>`;
            }

        } else {
            // Étudiant JSON : moyenne calculée depuis notes_raw
            const moy = calculerMoyenneJson(e.notes_raw);

            if (moy !== null) {
                const col = moy >= 10 ? 'text-green-600' : 'text-red-500';
                // Non cliquable (lecture seule)
                cellMoy = `
                    <span class="font-bold ${col}"
                          title="Calculé depuis le fichier JSON (lecture seule)">
                        ${moy}/20
                    </span>
                    <span class="text-gray-300 text-xs ml-1 italic">(JSON)</span>`;
            } else {
                cellMoy = `<span class="text-gray-300 text-xs">—</span>`;
            }
        }

        // ── Case à cocher (lignes JSON uniquement pour import) ─
        const caseCocher = e.source === 'JSON'
            ? `<input type="checkbox"
                      class="checkbox-json w-4 h-4 cursor-pointer"
                      value="${esc(e.numero)}"
                      onchange="majBoutonImport()"
                      title="Cocher pour importer en base">`
            : '';

        // ── Boutons d'action ──────────────────────────────────
        // DB  → modifier (modale) + archiver
        // JSON → lecture seule, pas d'action
        const actions = e.source === 'DB' && e.id
            ? `<div class="flex gap-2 items-center">
                   <button onclick="ouvrirModaleEdit(${e.id})"
                           class="text-blue-500 hover:text-blue-700 text-sm"
                           title="Modifier cet étudiant">
                       <i class="fas fa-edit"></i>
                   </button>
                   <button onclick="confirmerArchivage(${e.id})"
                           class="text-red-400 hover:text-red-600 text-sm"
                           title="Archiver cet étudiant">
                       <i class="fas fa-archive"></i>
                   </button>
               </div>`
            : `<span class="text-gray-300 text-xs italic">lecture seule</span>`;

        // ── Ligne complète du tableau ────────────────────────
        // Les cellules nom/prénom/numéro/code sont éditables au double-clic (DB only)
        return `
        <tr class="border-t hover:bg-gray-50 transition-colors">
            <td class="px-3 py-3 w-8">${caseCocher}</td>
            <td class="px-3 py-3">${badge}</td>
            <td class="px-3 py-3 font-mono text-xs text-gray-600
                       cursor-pointer hover:bg-blue-50 rounded"
                ondblclick="editerCellule(this, ${e.id || 'null'}, 'numero')"
                title="${e.source === 'DB' ? 'Double-clic pour modifier' : ''}">
                ${esc(e.numero)}
            </td>
            <td class="px-3 py-3 text-xs text-gray-500
                       cursor-pointer hover:bg-blue-50 rounded"
                ondblclick="editerCellule(this, ${e.id || 'null'}, 'code')"
                title="${e.source === 'DB' ? 'Double-clic pour modifier' : ''}">
                ${esc(e.code)}
            </td>
            <td class="px-3 py-3 font-semibold text-gray-800
                       cursor-pointer hover:bg-blue-50 rounded"
                ondblclick="editerCellule(this, ${e.id || 'null'}, 'nom')"
                title="${e.source === 'DB' ? 'Double-clic pour modifier' : ''}">
                ${esc(e.nom)}
            </td>
            <td class="px-3 py-3 text-gray-700
                       cursor-pointer hover:bg-blue-50 rounded"
                ondblclick="editerCellule(this, ${e.id || 'null'}, 'prenom')"
                title="${e.source === 'DB' ? 'Double-clic pour modifier' : ''}">
                ${esc(e.prenom)}
            </td>
            <td class="px-3 py-3">
                <span class="px-2 py-0.5 bg-gray-100 rounded text-xs">
                    ${esc(e.classe || '—')}
                </span>
            </td>
            <td class="px-3 py-3">${cellMoy}</td>
            <td class="px-3 py-3">${actions}</td>
        </tr>`;

    }).join('');
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — ÉDITION CELLULE PAR CELLULE (double-clic)
// ═══════════════════════════════════════════════════════════════

/**
 * Active l'édition inline d'une cellule DB au double-clic.
 *
 * Comportement :
 *  - La cellule devient un input texte avec la valeur actuelle
 *  - Entrée  → sauvegarde via PUT /students/{id}
 *  - Échap   → annule, restaure le texte original
 *  - Blur    → annule si on clique ailleurs (après un délai)
 *
 * @param {HTMLElement} td - La cellule cliquée
 * @param {number|null} etudiantId - L'ID de l'étudiant (null = JSON, non éditable)
 * @param {string} champ - Le champ à modifier (nom, prenom, numero, code)
 */
function editerCellule(td, etudiantId, champ) {
    // Les lignes JSON ne sont pas éditables
    if (!etudiantId) return;

    const valeurActuelle = td.textContent.trim();

    // Remplacer le contenu de la cellule par un input
    td.innerHTML = `
        <input type="text"
               value="${esc(valeurActuelle)}"
               id="input-cellule"
               class="w-full border-b-2 border-blue-400 bg-blue-50
                      text-sm px-1 py-0.5 outline-none rounded"
               title="Entrée = sauvegarder | Échap = annuler">
    `;

    const input = td.querySelector('input');
    input.focus();
    input.select(); // Sélectionner tout le texte pour remplacer facilement

    // Entrée → sauvegarder la modification
    input.addEventListener('keydown', async (event) => {

        if (event.key === 'Enter') {
            event.preventDefault();
            const nouvelleValeur = input.value.trim();

            // Pas de modification si la valeur est vide ou inchangée
            if (!nouvelleValeur || nouvelleValeur === valeurActuelle) {
                td.textContent = valeurActuelle;
                return;
            }

            // Appel API PUT /students/{id}
            const res = await modifierEtudiant(etudiantId, { [champ]: nouvelleValeur });

            if (res.success) {
                td.textContent = nouvelleValeur; // Mettre à jour la cellule
                toast('✅ Modification sauvegardée', 'ok');
                chargerEtudiants(); // Recharger pour cohérence
            } else {
                td.textContent = valeurActuelle; // Restaurer en cas d'erreur
                toast(res.message || 'Erreur lors de la modification', 'err');
            }
        }

        // Échap → annuler sans sauvegarder
        if (event.key === 'Escape') {
            td.textContent = valeurActuelle;
        }
    });

    // Clic en dehors de la cellule → annuler
    input.addEventListener('blur', () => {
        // Petit délai pour laisser keydown s'exécuter en premier
        // (sinon blur se déclenche avant Enter)
        setTimeout(() => {
            if (td.querySelector('input')) {
                td.textContent = valeurActuelle;
            }
        }, 150);
    });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — PAGINATION AVEC NUMÉROS DE PAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Met à jour l'interface de pagination :
 *  - Compteur total
 *  - Boutons Précédent / Suivant (activés/désactivés)
 *  - Numéros de pages cliquables (avec ellipses si beaucoup de pages)
 */
function majPagination() {
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Compteur et info page
    document.getElementById('totalInfo').textContent = `${total} étudiant(s)`;

    // Boutons Précédent / Suivant
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    if (btnPrev) btnPrev.disabled = page <= 1;
    if (btnNext) btnNext.disabled = page >= totalPages;

    // Numéros de pages cliquables
    const nav = document.getElementById('numPages');
    if (!nav) return;

    nav.innerHTML = '';

    // Afficher au maximum 5 numéros autour de la page courante
    let debut = Math.max(1, page - 2);
    let fin   = Math.min(totalPages, page + 2);

    // Ajuster pour toujours avoir 5 boutons si possible
    if (fin - debut < 4) {
        if (debut === 1) fin   = Math.min(totalPages, 5);
        else             debut = Math.max(1, fin - 4);
    }

    // Afficher "1 ..." si on est loin du début
    if (debut > 1) {
        nav.innerHTML += creerBoutonPage(1);
        if (debut > 2) {
            nav.innerHTML += `<span class="px-1 text-gray-400 text-sm">…</span>`;
        }
    }

    // Numéros du centre
    for (let i = debut; i <= fin; i++) {
        nav.innerHTML += creerBoutonPage(i);
    }

    // Afficher "... N" si on est loin de la fin
    if (fin < totalPages) {
        if (fin < totalPages - 1) {
            nav.innerHTML += `<span class="px-1 text-gray-400 text-sm">…</span>`;
        }
        nav.innerHTML += creerBoutonPage(totalPages);
    }
}

/**
 * Crée le HTML d'un bouton de numéro de page.
 * La page courante est mise en surbrillance (fond bleu).
 *
 * @param {number} n - Le numéro de page
 * @returns {string} HTML du bouton
 */
function creerBoutonPage(n) {
    const estActif = n === page;
    const style    = estActif
        ? 'bg-blue-500 text-white border-blue-500'
        : 'bg-white text-gray-700 hover:bg-gray-100';
    return `
        <button onclick="allerPage(${n})"
                class="px-3 py-1 border rounded text-sm ${style} transition">
            ${n}
        </button>`;
}

// Naviguer vers une page spécifique
function allerPage(n) { page = n; chargerEtudiants(); }

// Boutons Précédent et Suivant
function pageNext() { page++; chargerEtudiants(); }
function pagePrev() { if (page > 1) { page--; chargerEtudiants(); } }

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — IMPORT JSON DEPUIS LA LISTE PRINCIPALE
// ═══════════════════════════════════════════════════════════════

/**
 * Affiche ou masque le bouton "Importer la sélection" selon
 * le nombre de cases JSON cochées.
 * Met à jour le compteur dans le bouton.
 */
function majBoutonImport() {
    const casesCheckees = document.querySelectorAll('.checkbox-json:checked');
    const btn           = document.getElementById('btnImportListe');
    const compteur      = document.getElementById('compteurCoches');

    if (!btn) return;

    if (casesCheckees.length > 0) {
        // Afficher le bouton et mettre à jour le compteur
        btn.classList.remove('hidden');
        if (compteur) compteur.textContent = casesCheckees.length;
    } else {
        // Masquer le bouton si rien n'est coché
        btn.classList.add('hidden');
    }
}

/**
 * Importe les lignes JSON sélectionnées vers PostgreSQL.
 * Appelé par le bouton "Importer (N)" qui apparaît quand des cases sont cochées.
 */
async function importerSelection() {
    const casesCheckees = document.querySelectorAll('.checkbox-json:checked');
    const numeros       = Array.from(casesCheckees).map(cb => cb.value);

    if (numeros.length === 0) {
        toast('Sélectionnez au moins une ligne JSON à importer', 'err');
        return;
    }

    // Désactiver le bouton pendant l'opération
    const btn = document.getElementById('btnImportListe');
    if (btn) {
        btn.disabled  = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Importation...';
    }

    const res = await importerEtudiants(numeros);

    // Réactiver le bouton
    if (btn) {
        btn.disabled  = false;
        btn.innerHTML = `<i class="fas fa-database mr-2"></i>Importer
                         (<span id="compteurCoches">0</span>)`;
    }

    if (res.success) {
        // Construire un message résumé
        let msg = '';
        if (res.importes && res.importes.length > 0)
            msg += `✅ ${res.importes.length} importé(s). `;
        if (res.ignores  && res.ignores.length  > 0)
            msg += `⚠️ ${res.ignores.length} doublon(s) ignoré(s). `;

        toast(msg || 'Import terminé', 'ok');
        page = 1;
        chargerEtudiants(); // Recharger → les importés passent de JSON à DB
    } else {
        toast(res.message || "Erreur lors de l'importation", 'err');
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7 — ARCHIVAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Demande confirmation puis archive un étudiant DB.
 * L'étudiant disparaît de la liste principale mais reste dans PostgreSQL.
 * Il est visible dans la page archives.html.
 *
 * @param {number} id - L'ID de l'étudiant à archiver
 */
async function confirmerArchivage(id) {
    if (!confirm('Archiver cet étudiant ?\nIl sera déplacé dans les archives.')) return;

    const res = await archiverEtudiant(id);
    toast(
        res.success ? '✅ Étudiant archivé avec succès' : res.message,
        res.success ? 'ok' : 'err'
    );
    if (res.success) chargerEtudiants();
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8 — FORMULAIRE D'AJOUT D'ÉTUDIANT
// ═══════════════════════════════════════════════════════════════

let compteurMatieres = 0; // compteur pour générer des IDs uniques de matières

/**
 * Replie ou déplie le formulaire d'ajout en cliquant sur son en-tête.
 */
function toggleForm() {
    const div  = document.getElementById('formContenu');
    const icon = document.getElementById('formIcon');
    div.classList.toggle('hidden');
    icon.className = div.classList.contains('hidden')
        ? 'fas fa-chevron-right text-white'
        : 'fas fa-chevron-down text-white';
}

/**
 * Ajoute un bloc "matière + notes" dans le formulaire d'ajout.
 * Chaque bloc a un ID unique basé sur compteurMatieres.
 */
function ajouterLigneMatiere() {
    const id  = ++compteurMatieres;
    const div = document.createElement('div');
    div.id    = `mat-${id}`;
    div.className = 'border rounded-lg p-4 bg-gray-50 relative';

    div.innerHTML = `
        <!-- Bouton supprimer ce bloc matière -->
        <button onclick="document.getElementById('mat-${id}').remove()"
                class="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs"
                title="Supprimer cette matière">
            <i class="fas fa-trash"></i>
        </button>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <!-- Nom de la matière -->
            <div>
                <label class="text-xs font-semibold text-gray-600 mb-1 block">
                    Matière *
                </label>
                <input id="mat-nom-${id}" type="text" placeholder="ex: Math"
                       class="w-full border rounded px-3 py-1.5 text-sm
                              focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
            <!-- Note d'examen -->
            <div>
                <label class="text-xs font-semibold text-gray-600 mb-1 block">
                    Note d'examen (0–20)
                </label>
                <input id="mat-examen-${id}" type="number"
                       min="0" max="20" step="0.25" placeholder="ex: 14"
                       class="w-full border rounded px-3 py-1.5 text-sm
                              focus:outline-none focus:ring-2 focus:ring-blue-300"
                       oninput="previewMoyenne(${id})">
            </div>
        </div>

        <!-- Section devoirs -->
        <div>
            <div class="flex justify-between items-center mb-2">
                <label class="text-xs font-semibold text-gray-600">Notes de devoir</label>
                <button onclick="ajouterDevoir(${id})"
                        class="text-xs text-blue-600 border border-blue-200
                               rounded px-2 py-1 hover:bg-blue-50">
                    <i class="fas fa-plus mr-1"></i>Ajouter devoir
                </button>
            </div>
            <div id="devoirs-${id}" class="space-y-2"></div>
        </div>

        <!-- Aperçu de la moyenne en temps réel -->
        <div class="mt-3 text-xs text-gray-400 border-t pt-2">
            Formule : (moy. devoirs + examen) / 2 =
            <span id="preview-moy-${id}" class="font-bold text-blue-500">—</span>
        </div>
    `;

    document.getElementById('matieresContainer').appendChild(div);
}

/**
 * Ajoute un champ de note de devoir dans un bloc matière.
 * @param {number} matId - L'ID du bloc matière parent
 */
function ajouterDevoir(matId) {
    const container = document.getElementById(`devoirs-${matId}`);
    const num       = container.children.length + 1;
    const d         = document.createElement('div');
    d.className     = 'flex gap-2 items-center';
    d.innerHTML     = `
        <!-- Nom du devoir -->
        <input type="text"
               value="Devoir ${num}"
               data-role="nom-devoir"
               placeholder="Nom du devoir"
               class="flex-1 border rounded px-2 py-1 text-sm
                      focus:outline-none focus:ring-1 focus:ring-blue-300">
        <!-- Note du devoir -->
        <input type="number" min="0" max="20" step="0.25"
               data-role="val-devoir"
               placeholder="Note /20"
               class="w-24 border rounded px-2 py-1 text-sm
                      focus:outline-none focus:ring-1 focus:ring-blue-300"
               oninput="previewMoyenne(${matId})">
        <!-- Bouton supprimer ce devoir -->
        <button onclick="this.parentElement.remove(); previewMoyenne(${matId})"
                class="text-red-400 hover:text-red-600 text-sm"
                title="Supprimer ce devoir">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(d);
}

/**
 * Calcule et affiche la moyenne estimée en temps réel.
 * Formule : (moyenne des devoirs + examen) / 2
 *
 * @param {number} matId - L'ID du bloc matière
 */
function previewMoyenne(matId) {
    // Récupérer la note d'examen
    const examVal = document.getElementById(`mat-examen-${matId}`)?.value;
    const examen  = examVal !== '' ? parseFloat(examVal) : null;

    // Récupérer toutes les notes de devoir valides
    const inputs  = document.getElementById(`devoirs-${matId}`)
                            .querySelectorAll('[data-role="val-devoir"]');
    const devoirs = Array.from(inputs)
                         .map(i => parseFloat(i.value))
                         .filter(v => !isNaN(v) && v >= 0 && v <= 20);

    // Calculer la moyenne selon les données disponibles
    let moy = null;
    if (devoirs.length > 0 && examen !== null && !isNaN(examen)) {
        const moyDevoirs = devoirs.reduce((a, b) => a + b, 0) / devoirs.length;
        moy = ((moyDevoirs + examen) / 2).toFixed(2);
    } else if (devoirs.length > 0) {
        moy = (devoirs.reduce((a, b) => a + b, 0) / devoirs.length).toFixed(2);
    } else if (examen !== null && !isNaN(examen)) {
        moy = parseFloat(examen).toFixed(2);
    }

    // Afficher le résultat
    document.getElementById(`preview-moy-${matId}`).textContent =
        moy !== null ? `${moy}/20` : '—';
}

/**
 * Soumet le formulaire d'ajout d'étudiant.
 * Valide les données côté frontend avant d'envoyer au backend.
 */
async function soumettreFormulaire() {

    // Lire et normaliser les valeurs des champs
    const nom    = document.getElementById('fNom').value.trim().toUpperCase();
    const prenom = document.getElementById('fPrenom').value.trim();
    const numero = document.getElementById('fNumero').value.trim().toUpperCase();
    const code   = document.getElementById('fCode').value.trim().toUpperCase();
    const date   = document.getElementById('fDate').value || '2000-01-01';
    const classe = document.getElementById('fClasse').value;

    // ── Validation frontend ──────────────────────────────────
    if (!nom)    { toast('❌ Le nom est obligatoire', 'err');    return; }
    if (!prenom) { toast('❌ Le prénom est obligatoire', 'err'); return; }
    if (!numero) { toast('❌ Le numéro est obligatoire', 'err'); return; }

    if (numero.length !== 7) {
        toast(`❌ Numéro "${numero}" — exactement 7 caractères requis`, 'err');
        return;
    }
    if (!/^[A-Za-z]{3}[0-9]{3}$/.test(code)) {
        toast(`❌ Code "${code}" invalide — 3 lettres + 3 chiffres (ex: AAD004)`, 'err');
        return;
    }
    if (!classe) {
        toast('❌ Veuillez choisir une classe', 'err');
        return;
    }

    // ── Récupérer les matières et notes saisies ──────────────
    const matieres = [];

    document.querySelectorAll('#matieresContainer > div[id^="mat-"]').forEach(div => {
        const idMat  = div.id.replace('mat-', '');
        const nomMat = document.getElementById(`mat-nom-${idMat}`)?.value.trim();

        // Ignorer les blocs matière sans nom
        if (!nomMat) return;

        const examEl = document.getElementById(`mat-examen-${idMat}`);
        const examen = (examEl?.value !== '') ? parseFloat(examEl.value) : null;

        // Collecter les devoirs valides
        const notes_devoir = [];
        const nomEls = div.querySelectorAll('[data-role="nom-devoir"]');

        div.querySelectorAll('[data-role="val-devoir"]').forEach((el, i) => {
            const valeur = parseFloat(el.value);
            if (!isNaN(valeur) && valeur >= 0 && valeur <= 20) {
                notes_devoir.push({
                    valeur: valeur,
                    nom:    nomEls[i]?.value.trim() || `Devoir ${i + 1}`
                });
            }
        });

        matieres.push({
            nom_matiere:  nomMat,
            notes_devoir: notes_devoir,
            note_examen:  examen
        });
    });

    // ── Envoyer au backend ───────────────────────────────────
    const payload = { nom, prenom, numero, code, date_naissance: date, classe, matieres };
    console.log('[Ajout] Payload envoyé au backend :', payload);

    toast('⏳ Enregistrement en cours...', 'ok');

    const res = await creerEtudiant(payload);
    console.log('[Ajout] Réponse du backend :', res);

    if (res.success) {
        toast(`✅ ${nom} ${prenom} ajouté avec succès !`, 'ok');

        // Vider le formulaire
        ['fNom', 'fPrenom', 'fNumero', 'fCode', 'fDate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('fClasse').value = '';
        document.getElementById('matieresContainer').innerHTML = '';
        compteurMatieres = 0;

        // Revenir à la page 1 et recharger
        page = 1;
        chargerEtudiants();

    } else {
        // Afficher le message d'erreur exact (Pydantic ou custom)
        const msgErr = res.detail
            ? (Array.isArray(res.detail)
                ? res.detail.map(d => d.msg).join(' | ')
                : String(res.detail))
            : (res.message || 'Erreur inconnue');

        console.error('[Ajout] Erreur :', msgErr);
        toast(`❌ ${msgErr}`, 'err');
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9 — MODALE D'ÉDITION
// ═══════════════════════════════════════════════════════════════

/**
 * Ouvre la modale d'édition pour un étudiant DB.
 * Charge en parallèle : infos étudiant + notes + liste des classes.
 *
 * @param {number} id - L'ID de l'étudiant
 */
async function ouvrirModaleEdit(id) {
    const modale  = document.getElementById('modaleEdit');
    const contenu = document.getElementById('modaleContenu');

    // Afficher la modale avec un spinner
    modale.classList.remove('hidden');
    contenu.innerHTML = `
        <div class="text-center py-10 text-gray-400">
            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Chargement des données...</p>
        </div>`;

    // Charger toutes les données en parallèle pour aller vite
    const [resEt, resNotes, resClasses] = await Promise.all([
        getEtudiant(id),   // infos de base
        getNotes(id),      // notes et moyennes
        getClasses()       // liste des classes pour le select
    ]);

    if (!resEt.success) {
        contenu.innerHTML = `
            <p class="text-red-500 text-center py-8">
                ❌ Impossible de charger cet étudiant
            </p>`;
        return;
    }

    const e       = resEt.data;
    const notes   = resNotes.success
        ? resNotes.data
        : { matieres: [], moyenne_generale: 0 };
    const classes = resClasses.success ? resClasses.data : [];

    // Construire les options du select "Classe"
    const optClasses = classes.map(c =>
        `<option value="${c.nom}" ${c.nom === e.classe ? 'selected' : ''}>
            ${c.nom}
         </option>`
    ).join('');

    // Construire les blocs de notes par matière
    const blocsNotes = construireBlocsNotes(id, notes.matieres);

    // Couleur de la moyenne générale
    const colMoyGen = notes.moyenne_generale >= 10
        ? 'text-green-600'
        : 'text-red-500';

    contenu.innerHTML = `

        <!-- ── Formulaire infos de base ── -->
        <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <i class="fas fa-user text-blue-400"></i>Informations générales
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
                <label class="text-xs text-gray-500 block mb-1">Nom</label>
                <input id="eNom" value="${esc(e.nom)}"
                       class="w-full border rounded px-3 py-2 text-sm
                              focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
            <div>
                <label class="text-xs text-gray-500 block mb-1">Prénom</label>
                <input id="ePrenom" value="${esc(e.prenom)}"
                       class="w-full border rounded px-3 py-2 text-sm
                              focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
            <div>
                <label class="text-xs text-gray-500 block mb-1">Numéro</label>
                <input id="eNumero" value="${esc(e.numero)}"
                       class="w-full border rounded px-3 py-2 text-sm
                              focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
            <div>
                <label class="text-xs text-gray-500 block mb-1">Code</label>
                <input id="eCode" value="${esc(e.code)}"
                       class="w-full border rounded px-3 py-2 text-sm
                              focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
            <div>
                <label class="text-xs text-gray-500 block mb-1">Date de naissance</label>
                <input id="eDate" type="date" value="${e.date_naissance}"
                       class="w-full border rounded px-3 py-2 text-sm
                              focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
            <div>
                <label class="text-xs text-gray-500 block mb-1">Classe</label>
                <select id="eClasse"
                        class="w-full border rounded px-3 py-2 text-sm bg-white
                               focus:outline-none focus:ring-2 focus:ring-blue-300">
                    ${optClasses}
                </select>
            </div>
        </div>

        <!-- Bouton sauvegarder les infos de base -->
        <button onclick="sauvegarderModifications(${id})"
                class="w-full bg-blue-500 hover:bg-blue-600 text-white
                       py-2 rounded-lg text-sm font-semibold mb-6 transition">
            <i class="fas fa-save mr-2"></i>Sauvegarder les modifications
        </button>

        <!-- ── Section notes et moyennes ── -->
        <div class="border-t pt-4">

            <div class="flex justify-between items-center mb-4">
                <h4 class="font-semibold text-gray-700 flex items-center gap-2">
                    <i class="fas fa-chart-bar text-purple-400"></i>Notes et moyennes
                </h4>
                <!-- Badge moyenne générale -->
                <div class="bg-purple-50 border border-purple-200
                            text-purple-700 px-4 py-1 rounded-full text-sm font-bold">
                    Moy. générale :
                    <span class="${colMoyGen}">
                        ${notes.moyenne_generale}/20
                    </span>
                </div>
            </div>

            <!-- Blocs par matière (notes + moyennes) -->
            <div id="blocsNotes">
                ${blocsNotes}
            </div>

            <!-- Formulaire d'ajout d'une note supplémentaire -->
            <div class="mt-4 border border-dashed border-gray-300
                        rounded-lg p-4 bg-gray-50">
                <p class="text-xs font-semibold text-gray-600 mb-3">
                    <i class="fas fa-plus-circle text-green-400 mr-1"></i>
                    Ajouter une note
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <!-- Matière (avec suggestions des matières existantes) -->
                    <input id="nMatiere" type="text"
                           placeholder="Matière (ex: Math)"
                           list="listeMatieres"
                           class="border rounded px-3 py-2 text-sm
                                  focus:outline-none focus:ring-1 focus:ring-purple-300">
                    <datalist id="listeMatieres">
                        ${notes.matieres.map(m =>
                            `<option value="${esc(m.nom_matiere)}">`
                        ).join('')}
                    </datalist>
                    <!-- Type de note -->
                    <select id="nType"
                            class="border rounded px-3 py-2 text-sm bg-white">
                        <option value="devoir">Devoir</option>
                        <option value="examen">Examen</option>
                    </select>
                    <!-- Nom de l'évaluation -->
                    <input id="nNom" type="text"
                           placeholder="Nom (ex: Devoir 1)"
                           class="border rounded px-3 py-2 text-sm
                                  focus:outline-none focus:ring-1 focus:ring-purple-300">
                    <!-- Valeur de la note -->
                    <input id="nValeur" type="number"
                           min="0" max="20" step="0.25"
                           placeholder="Note (0–20)"
                           class="border rounded px-3 py-2 text-sm
                                  focus:outline-none focus:ring-1 focus:ring-purple-300">
                </div>
                <button onclick="ajouterNouvelleNote(${id})"
                        class="mt-3 bg-purple-500 hover:bg-purple-600
                               text-white px-4 py-2 rounded text-sm w-full transition">
                    <i class="fas fa-plus mr-1"></i>Enregistrer la note
                </button>
            </div>
        </div>
    `;
}

/**
 * Construit le HTML des blocs notes par matière pour la modale.
 * Pour chaque matière : liste des devoirs, examen, moyennes calculées.
 *
 * @param {number} etudiantId - ID de l'étudiant
 * @param {Array} matieres - Données des matières depuis l'API
 * @returns {string} HTML complet des blocs
 */
function construireBlocsNotes(etudiantId, matieres) {
    if (!matieres || matieres.length === 0) {
        return `
            <p class="text-gray-400 text-sm italic text-center py-4">
                Aucune note enregistrée pour cet étudiant.
            </p>`;
    }

    return matieres.map(m => {
        const couleurMoy = m.moyenne_matiere >= 10
            ? 'text-green-600'
            : 'text-red-500';

        // Lignes des devoirs (éditables via onChange)
        const lignesDevoirs = m.devoirs.map(d => `
            <div class="flex justify-between items-center py-1
                        border-b border-gray-100 text-xs text-gray-600">
                <span>
                    <i class="fas fa-pencil-alt mr-1 text-blue-300"></i>
                    ${esc(d.nom)}
                </span>
                <div class="flex items-center gap-2">
                    <input type="number" min="0" max="20" step="0.25"
                           value="${d.valeur}"
                           class="w-16 border rounded px-2 py-0.5 text-xs text-center"
                           onchange="modifierNote(
                               ${etudiantId},
                               '${esc(m.nom_matiere)}',
                               '${esc(d.nom)}',
                               'devoir',
                               this.value
                           )">
                    <button onclick="effacerNote(${etudiantId}, ${d.note_id})"
                            class="text-red-400 hover:text-red-600"
                            title="Supprimer cette note">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>`).join('');

        // Ligne d'examen (éditable ou bouton "Ajouter")
        const ligneExamen = m.examen
            ? `<div class="flex justify-between items-center
                           py-1 text-xs text-gray-600">
                   <span>
                       <i class="fas fa-file-alt mr-1 text-orange-400"></i>
                       Examen
                   </span>
                   <div class="flex items-center gap-2">
                       <input type="number" min="0" max="20" step="0.25"
                              value="${m.examen.valeur}"
                              class="w-16 border rounded px-2 py-0.5 text-xs text-center"
                              onchange="modifierNote(
                                  ${etudiantId},
                                  '${esc(m.nom_matiere)}',
                                  'Examen',
                                  'examen',
                                  this.value
                              )">
                       <button onclick="effacerNote(${etudiantId}, ${m.examen.note_id})"
                               class="text-red-400 hover:text-red-600"
                               title="Supprimer cet examen">
                           <i class="fas fa-times"></i>
                       </button>
                   </div>
               </div>`
            : `<p class="text-xs text-gray-400 italic py-1">
                   Pas d'examen —
                   <button onclick="ajouterNoteRapide(
                               ${etudiantId},
                               '${esc(m.nom_matiere)}',
                               'examen'
                           )"
                           class="text-blue-400 hover:underline">
                       Ajouter l'examen
                   </button>
               </p>`;

        // Affichage de la moyenne des devoirs (peut être null si pas de devoirs)
        const affMoyDev = m.moyenne_devoirs !== null && m.moyenne_devoirs !== undefined
            ? `${m.moyenne_devoirs}/20`
            : '—';

        return `
        <div class="border rounded-lg p-3 mb-3 bg-white shadow-sm">
            <!-- En-tête : nom matière + moyennes -->
            <div class="flex justify-between items-center mb-2">
                <span class="font-semibold text-sm text-gray-800">
                    ${esc(m.nom_matiere)}
                </span>
                <div class="text-right text-xs text-gray-500">
                    <span>Moy. devoirs : ${affMoyDev}</span>
                    <span class="ml-3 font-bold ${couleurMoy} text-sm">
                        Moy. matière : ${m.moyenne_matiere}/20
                    </span>
                </div>
            </div>
            <!-- Notes de devoir -->
            ${lignesDevoirs}
            <!-- Examen -->
            ${ligneExamen}
            <!-- Bouton ajouter un devoir -->
            <button onclick="ajouterNoteRapide(
                        ${etudiantId},
                        '${esc(m.nom_matiere)}',
                        'devoir'
                    )"
                    class="mt-2 text-xs text-blue-400 hover:underline">
                <i class="fas fa-plus mr-1"></i>Ajouter un devoir
            </button>
        </div>`;

    }).join('');
}

/** Ferme la modale d'édition. */
function fermerModale() {
    document.getElementById('modaleEdit').classList.add('hidden');
}

/**
 * Sauvegarde les modifications des informations de base via PUT /students/{id}.
 * @param {number} id - L'ID de l'étudiant
 */
async function sauvegarderModifications(id) {
    const data = {
        nom:            document.getElementById('eNom').value.trim().toUpperCase(),
        prenom:         document.getElementById('ePrenom').value.trim(),
        numero:         document.getElementById('eNumero').value.trim().toUpperCase(),
        code:           document.getElementById('eCode').value.trim().toUpperCase(),
        date_naissance: document.getElementById('eDate').value,
        classe:         document.getElementById('eClasse').value,
    };

    const res = await modifierEtudiant(id, data);
    toast(
        res.success ? '✅ Modifications sauvegardées' : (res.message || 'Erreur'),
        res.success ? 'ok' : 'err'
    );
    if (res.success) chargerEtudiants(); // Rafraîchir la liste
}

/**
 * Modifie une note existante.
 * Appelé automatiquement via onchange sur les inputs de la modale.
 *
 * @param {number} etudiantId
 * @param {string} nomMatiere
 * @param {string} nomEval - Nom de l'évaluation
 * @param {string} type - 'devoir' ou 'examen'
 * @param {string|number} valeur - Nouvelle valeur
 */
async function modifierNote(etudiantId, nomMatiere, nomEval, type, valeur) {
    const v = parseFloat(valeur);
    if (isNaN(v) || v < 0 || v > 20) {
        toast('Note invalide — doit être entre 0 et 20', 'err');
        return;
    }
    const res = await sauvegarderNote(etudiantId, {
        nom_matiere:     nomMatiere,
        nom_evaluation:  nomEval,
        type_evaluation: type,
        valeur:          v
    });
    if (res.success) {
        // Recharger la modale pour afficher les nouvelles moyennes calculées
        ouvrirModaleEdit(etudiantId);
        chargerEtudiants(); // Mettre à jour la moyenne dans la liste
    } else {
        toast(res.message || 'Erreur lors de la modification', 'err');
    }
}

/**
 * Ajoute une note rapide via un prompt (bouton "Ajouter devoir/examen").
 *
 * @param {number} etudiantId
 * @param {string} nomMatiere
 * @param {string} type - 'devoir' ou 'examen'
 */
async function ajouterNoteRapide(etudiantId, nomMatiere, type) {
    const libelle = type === 'examen' ? "l'examen" : 'la note';
    const nom     = prompt(`Nom de ${libelle} :`, type === 'examen' ? 'Examen' : 'Devoir');
    if (!nom) return; // Annulé par l'utilisateur

    const valeur = parseFloat(prompt('Note (0 à 20) :'));
    if (isNaN(valeur) || valeur < 0 || valeur > 20) {
        toast('Note invalide — entre 0 et 20', 'err');
        return;
    }

    const res = await sauvegarderNote(etudiantId, {
        nom_matiere:     nomMatiere,
        nom_evaluation:  nom,
        type_evaluation: type,
        valeur:          valeur
    });

    toast(
        res.success ? '✅ Note ajoutée' : (res.message || 'Erreur'),
        res.success ? 'ok' : 'err'
    );
    if (res.success) {
        ouvrirModaleEdit(etudiantId); // Rafraîchir la modale
        chargerEtudiants();           // Rafraîchir la liste
    }
}

/**
 * Ajoute une note depuis le formulaire en bas de la modale.
 * @param {number} etudiantId
 */
async function ajouterNouvelleNote(etudiantId) {
    const matiere = document.getElementById('nMatiere').value.trim();
    const type    = document.getElementById('nType').value;
    const nom     = document.getElementById('nNom').value.trim();
    const valeur  = parseFloat(document.getElementById('nValeur').value);

    // Validation
    if (!matiere) { toast('Indiquez la matière', 'err');       return; }
    if (!nom)     { toast('Indiquez le nom de la note', 'err'); return; }
    if (isNaN(valeur) || valeur < 0 || valeur > 20) {
        toast('Note entre 0 et 20', 'err');
        return;
    }

    const res = await sauvegarderNote(etudiantId, {
        nom_matiere:     matiere,
        nom_evaluation:  nom,
        type_evaluation: type,
        valeur:          valeur
    });

    toast(
        res.success ? '✅ Note enregistrée' : (res.message || 'Erreur'),
        res.success ? 'ok' : 'err'
    );
    if (res.success) {
        ouvrirModaleEdit(etudiantId);
        chargerEtudiants();
    }
}

/**
 * Supprime une note après confirmation.
 *
 * @param {number} etudiantId
 * @param {number} noteId - L'ID de la note dans la table notes
 */
async function effacerNote(etudiantId, noteId) {
    if (!confirm('Supprimer cette note définitivement ?')) return;

    const res = await supprimerNote(etudiantId, noteId);
    toast(
        res.success ? '✅ Note supprimée' : (res.message || 'Erreur'),
        res.success ? 'ok' : 'err'
    );
    if (res.success) {
        ouvrirModaleEdit(etudiantId);
        chargerEtudiants();
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10 — UTILITAIRES
// ═══════════════════════════════════════════════════════════════

/**
 * Échappe les caractères HTML spéciaux pour éviter les injections XSS.
 * À utiliser TOUJOURS avant d'injecter une valeur dans innerHTML.
 *
 * @param {*} s - La valeur à échapper (convertie en string)
 * @returns {string} Chaîne sécurisée pour insertion HTML
 */
function esc(s) {
    return String(s || '')
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;');
}

/**
 * Affiche une notification toast en bas à droite de l'écran.
 * Se supprime automatiquement après 4 secondes.
 *
 * @param {string} msg - Le message à afficher
 * @param {string} type - 'ok' (fond vert) ou 'err' (fond rouge)
 */
function toast(msg, type = 'ok') {
    // Supprimer un toast existant pour éviter l'empilement
    const ancien = document.getElementById('toast-notif');
    if (ancien) ancien.remove();

    const el     = document.createElement('div');
    el.id        = 'toast-notif';
    el.className = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg
                    shadow-xl text-white text-sm font-medium max-w-sm
                    ${type === 'ok' ? 'bg-green-500' : 'bg-red-500'}`;
    el.textContent = msg;
    document.body.appendChild(el);

    // Auto-suppression après 4 secondes
    setTimeout(() => {
        if (el.parentNode) el.remove();
    }, 4000);
}