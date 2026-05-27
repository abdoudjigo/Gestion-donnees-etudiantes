/**
 * index.js — Logique page principale (index.html)
 *
 * - Liste paginée avec fusion DB + JSON
 * - Ajout étudiant avec matières et notes
 * - Modale édition (infos + notes + moyennes)
 * - Archivage
 */

// ── État global ──────────────────────────────────────────────
let page  = 1;
let limit = 10;
let total = 0;

// ── Démarrage ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await chargerClasses();
    await chargerEtudiants();

    // Événements filtres et pagination
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

    // Fermer la modale en cliquant à l'extérieur
    document.getElementById('modaleEdit')
        .addEventListener('click', function(e) {
            if (e.target === this) fermerModale();
        });
});

// ═══════════════════════════════════════════════════════════════
// CLASSES — remplir les selects
// ═══════════════════════════════════════════════════════════════
async function chargerClasses() {
    const res = await getClasses();
    if (!res.success) return;

    const selFiltre = document.getElementById('classeFilter');
    const selForm   = document.getElementById('fClasse');

    res.data.forEach(c => {
        // Select filtre (page liste)
        selFiltre.innerHTML += `<option value="${c.nom}">${c.nom}</option>`;
        // Select formulaire ajout
        selForm.innerHTML   += `<option value="${c.nom}">${c.nom}</option>`;
    });
}

// ═══════════════════════════════════════════════════════════════
// LISTE DES ÉTUDIANTS
// ═══════════════════════════════════════════════════════════════
async function chargerEtudiants() {
    const search = document.getElementById('searchInput').value.trim();
    const source = document.getElementById('sourceFilter').value;
    const classe = document.getElementById('classeFilter').value;
    const tbody  = document.getElementById('tableBody');

    // Spinner
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-10 text-gray-400">
                <i class="fas fa-spinner fa-spin mr-2"></i>Chargement...
            </td>
        </tr>`;

    const res = await getEtudiants(page, limit, search, source, classe);

    if (!res.success) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-10 text-red-400">
                    ❌ Erreur — vérifiez que le backend est lancé (port 8000)
                </td>
            </tr>`;
        return;
    }

    total = res.total || 0;
    const etudiants = res.data || [];

    // Mettre à jour la pagination
    majPagination();

    if (etudiants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-10 text-gray-400">
                    Aucun étudiant trouvé
                </td>
            </tr>`;
        return;
    }

    // Construire le tableau
    tbody.innerHTML = etudiants.map(e => {

        // Badge source coloré
        const badge = e.source === 'DB'
            ? `<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">DB</span>`
            : `<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">JSON</span>`;

        // Colonne moyenne :
        // - DB  → bouton cliquable qui charge la moyenne depuis l'API
        // - JSON → "—" car les notes ne sont pas en base
        const cellMoy = e.source === 'DB' && e.id
            ? `<span id="moy-${e.id}"
                     class="text-blue-400 text-xs cursor-pointer hover:underline"
                     onclick="chargerMoyenne(${e.id})"
                     title="Cliquer pour calculer">
                   <i class="fas fa-calculator mr-1"></i>calculer
               </span>`
            : `<span class="text-gray-300 text-xs">—</span>`;

        // Actions :
        // - DB   → modifier, voir notes, archiver
        // - JSON → lecture seule
        const actions = e.source === 'DB' && e.id
            ? `<div class="flex gap-2">
                   <button onclick="ouvrirModaleEdit(${e.id})"
                           class="text-blue-500 hover:text-blue-700 text-sm"
                           title="Modifier">
                       <i class="fas fa-edit"></i>
                   </button>
                   <button onclick="ouvrirModaleEdit(${e.id})"
                           class="text-purple-500 hover:text-purple-700 text-sm"
                           title="Voir les notes">
                       <i class="fas fa-chart-bar"></i>
                   </button>
                   <button onclick="confirmerArchivage(${e.id})"
                           class="text-red-400 hover:text-red-600 text-sm"
                           title="Archiver">
                       <i class="fas fa-archive"></i>
                   </button>
               </div>`
            : `<span class="text-gray-300 text-xs italic">lecture seule</span>`;

        return `
        <tr class="border-t hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3">${badge}</td>
            <td class="px-4 py-3 font-mono text-xs text-gray-600">${esc(e.numero)}</td>
            <td class="px-4 py-3 text-xs text-gray-500">${esc(e.code)}</td>
            <td class="px-4 py-3 font-semibold text-gray-800">${esc(e.nom)}</td>
            <td class="px-4 py-3 text-gray-700">${esc(e.prenom)}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-0.5 bg-gray-100 rounded text-xs">
                    ${esc(e.classe || '—')}
                </span>
             </td>
            <td class="px-4 py-3" id="cell-moy-${e.id || e.numero}">
                ${cellMoy}
             </td>
            <td class="px-4 py-3">${actions}</td>
         </tr>`;

    }).join('');
}

/**
 * Charge la moyenne d'un étudiant DB depuis l'API
 * @param {number} id - Identifiant de l'étudiant
 */
async function chargerMoyenne(id) {
    const cell = document.getElementById(`cell-moy-${id}`);
    if (!cell) return;

    // Spinner pendant le chargement
    cell.innerHTML = `<i class="fas fa-spinner fa-spin text-gray-300"></i>`;

    const res = await getNotes(id);

    if (!res.success || !res.data) {
        cell.innerHTML = `<span class="text-gray-300 text-xs">—</span>`;
        return;
    }

    const moy     = res.data.moyenne_generale;
    const couleur = moy >= 10 ? 'text-green-600' : 'text-red-500';

    // Afficher la moyenne, cliquable pour ouvrir la modale
    cell.innerHTML = `
        <span class="font-bold ${couleur} cursor-pointer hover:underline"
              onclick="ouvrirModaleEdit(${id})"
              title="Voir les notes détaillées">
            ${moy}/20
        </span>`;
}

// ── Pagination ────────────────────────────────────────────────
function majPagination() {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    document.getElementById('totalInfo').textContent  = `${total} étudiant(s)`;
    document.getElementById('pageInfo').textContent   = `Page ${page} / ${totalPages}`;
    document.getElementById('btnPrev').disabled       = page <= 1;
    document.getElementById('btnNext').disabled       = page >= totalPages;
}

function pageNext() { page++; chargerEtudiants(); }
function pagePrev() { if (page > 1) { page--; chargerEtudiants(); } }

// ── Archivage ─────────────────────────────────────────────────
async function confirmerArchivage(id) {
    if (!confirm('Archiver cet étudiant ? Il sera visible dans la page Archives.')) return;
    const res = await archiverEtudiant(id);
    toast(res.success ? '✅ Étudiant archivé' : res.message, res.success ? 'ok' : 'err');
    if (res.success) chargerEtudiants();
}

// ═══════════════════════════════════════════════════════════════
// FORMULAIRE D'AJOUT
// ═══════════════════════════════════════════════════════════════

let compteurMatieres = 0;

// Replier / déplier le formulaire
function toggleForm() {
    const div  = document.getElementById('formContenu');
    const icon = document.getElementById('formIcon');
    div.classList.toggle('hidden');
    icon.className = div.classList.contains('hidden')
        ? 'fas fa-chevron-right text-white'
        : 'fas fa-chevron-down text-white';
}

// Ajouter une ligne matière dans le formulaire
function ajouterLigneMatiere() {
    const id  = ++compteurMatieres;
    const div = document.createElement('div');
    div.id    = `mat-${id}`;
    div.className = 'border rounded-lg p-4 bg-gray-50 relative';

    div.innerHTML = `
        <button onclick="document.getElementById('mat-${id}').remove()"
                class="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs"
                title="Supprimer cette matière">
            <i class="fas fa-trash"></i>
        </button>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
                <label class="text-xs font-semibold text-gray-600 mb-1 block">
                    Matière *
                </label>
                <input id="mat-nom-${id}" type="text" placeholder="ex: Math"
                       class="w-full border rounded px-3 py-1.5 text-sm
                              focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
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

        <div>
            <div class="flex justify-between items-center mb-2">
                <label class="text-xs font-semibold text-gray-600">
                    Notes de devoir
                </label>
                <button onclick="ajouterDevoir(${id})"
                        class="text-xs text-blue-600 border border-blue-200
                               rounded px-2 py-1 hover:bg-blue-50">
                    <i class="fas fa-plus mr-1"></i>Ajouter devoir
                </button>
            </div>
            <div id="devoirs-${id}" class="space-y-2"></div>
        </div>

        <div class="mt-3 text-xs text-gray-500 border-t pt-2">
            Formule : (moy.devoirs + examen) / 2 =
            <span id="preview-moy-${id}" class="font-bold text-blue-600">—</span>
        </div>
    `;

    document.getElementById('matieresContainer').appendChild(div);
}

// Ajouter un champ devoir dans une matière
function ajouterDevoir(matId) {
    const container = document.getElementById(`devoirs-${matId}`);
    const num       = container.children.length + 1;
    const d         = document.createElement('div');
    d.className     = 'flex gap-2 items-center';
    d.innerHTML = `
        <input type="text" placeholder="Nom (ex: Devoir ${num})"
               value="Devoir ${num}"
               data-role="nom-devoir"
               class="flex-1 border rounded px-2 py-1 text-sm
                      focus:outline-none focus:ring-1 focus:ring-blue-300">
        <input type="number" min="0" max="20" step="0.25" placeholder="Note"
               data-role="val-devoir"
               class="w-24 border rounded px-2 py-1 text-sm
                      focus:outline-none focus:ring-1 focus:ring-blue-300"
               oninput="previewMoyenne(${matId})">
        <button onclick="this.parentElement.remove(); previewMoyenne(${matId})"
                class="text-red-400 hover:text-red-600 text-sm"
                title="Supprimer">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(d);
}

// Calculer et afficher la moyenne en live
function previewMoyenne(matId) {
    const examVal = document.getElementById(`mat-examen-${matId}`)?.value;
    const examen  = examVal !== '' ? parseFloat(examVal) : null;

    const inputs  = document.getElementById(`devoirs-${matId}`)
                            .querySelectorAll('[data-role="val-devoir"]');
    const devoirs = Array.from(inputs)
                         .map(i => parseFloat(i.value))
                         .filter(v => !isNaN(v));

    let moy = null;
    if (devoirs.length > 0 && examen !== null) {
        const moyD = devoirs.reduce((a, b) => a + b, 0) / devoirs.length;
        moy = ((moyD + examen) / 2).toFixed(2);
    } else if (devoirs.length > 0) {
        moy = (devoirs.reduce((a, b) => a + b, 0) / devoirs.length).toFixed(2);
    } else if (examen !== null) {
        moy = examen.toFixed(2);
    }

    document.getElementById(`preview-moy-${matId}`).textContent =
        moy !== null ? `${moy}/20` : '—';
}

/**
 * Soumettre le formulaire d'ajout d'étudiant
 * Version corrigée avec affichage des erreurs détaillées
 */
async function soumettreFormulaire() {
    const nom    = document.getElementById('fNom').value.trim().toUpperCase();
    const prenom = document.getElementById('fPrenom').value.trim();
    const numero = document.getElementById('fNumero').value.trim().toUpperCase();
    const code   = document.getElementById('fCode').value.trim().toUpperCase();
    const date   = document.getElementById('fDate').value || '2000-01-01';
    const classe = document.getElementById('fClasse').value;

    // ── Validation frontend avant d'envoyer ─────────────────
    if (!nom) {
        toast('❌ Le nom est obligatoire', 'err'); return;
    }
    if (!prenom) {
        toast('❌ Le prénom est obligatoire', 'err'); return;
    }
    if (!numero) {
        toast('❌ Le numéro est obligatoire', 'err'); return;
    }
    if (numero.length !== 7) {
        toast(`❌ Numéro "${numero}" — doit faire exactement 7 caractères`, 'err'); return;
    }
    if (!code) {
        toast('❌ Le code est obligatoire', 'err'); return;
    }
    if (!/^[A-Za-z]{3}[0-9]{3}$/.test(code)) {
        toast(`❌ Code "${code}" invalide — 3 lettres + 3 chiffres (ex: AAD004)`, 'err'); return;
    }
    if (!classe) {
        toast('❌ Choisissez une classe', 'err'); return;
    }

    // ── Récupérer les matières ────────────────────────────────
    const matieres = [];
    document.querySelectorAll('#matieresContainer > div[id^="mat-"]').forEach(div => {
        const idMat  = div.id.replace('mat-', '');
        const nomMat = document.getElementById(`mat-nom-${idMat}`)?.value.trim();
        const examEl = document.getElementById(`mat-examen-${idMat}`);
        const examen = examEl?.value !== '' ? parseFloat(examEl.value) : null;

        if (!nomMat) return; // ignorer les matières sans nom

        const notes_devoir = [];
        const nomEls = div.querySelectorAll('[data-role="nom-devoir"]');
        const valEls = div.querySelectorAll('[data-role="val-devoir"]');

        valEls.forEach((el, i) => {
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

    // ── Afficher ce qu'on envoie (debug) ──────────────────────
    const payload = { nom, prenom, numero, code, date_naissance: date, classe, matieres };
    console.log('[Ajout étudiant] Payload envoyé :', payload);

    toast('⏳ Enregistrement en cours...', 'ok');

    // ── Envoyer au backend ────────────────────────────────────
    const res = await creerEtudiant(payload);

    console.log('[Ajout étudiant] Réponse backend :', res);

    if (res.success) {
        toast(`✅ ${nom} ${prenom} ajouté avec succès !`, 'ok');

        // Vider le formulaire
        ['fNom','fPrenom','fNumero','fCode','fDate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('fClasse').value = '';
        document.getElementById('matieresContainer').innerHTML = '';
        compteurMatieres = 0;
        page = 1;
        chargerEtudiants();

    } else {
        // Afficher le message d'erreur exact du backend
        const msgErreur = res.detail
            ? (Array.isArray(res.detail)
                ? res.detail.map(e => e.msg).join(' | ')
                : res.detail)
            : (res.message || "Erreur inconnue");

        console.error('[Ajout étudiant] Erreur :', msgErreur);
        toast(`❌ ${msgErreur}`, 'err');
    }
}

// ═══════════════════════════════════════════════════════════════
// MODALE ÉDITION
// ═══════════════════════════════════════════════════════════════

async function ouvrirModaleEdit(id) {
    const modale  = document.getElementById('modaleEdit');
    const contenu = document.getElementById('modaleContenu');

    // Ouvrir la modale avec un spinner
    modale.classList.remove('hidden');
    contenu.innerHTML = `
        <div class="text-center py-10 text-gray-400">
            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Chargement...</p>
        </div>`;

    // Charger en parallèle : infos étudiant + notes + classes
    const [resEt, resNotes, resClasses] = await Promise.all([
        getEtudiant(id),
        getNotes(id),
        getClasses()
    ]);

    if (!resEt.success) {
        contenu.innerHTML = `
            <p class="text-red-500 text-center py-8">
                ❌ Impossible de charger cet étudiant
            </p>`;
        return;
    }

    const e       = resEt.data;
    const notes   = resNotes.success ? resNotes.data : { matieres: [], moyenne_generale: 0 };
    const classes = resClasses.success ? resClasses.data : [];

    // Options pour le select classe
    const optClasses = classes.map(c =>
        `<option value="${c.nom}" ${c.nom === e.classe ? 'selected' : ''}>
            ${c.nom}
         </option>`
    ).join('');

    // Construire le bloc notes par matière
    const blocsNotes = construireBlocsNotes(id, notes.matieres);

    contenu.innerHTML = `

        <!-- ── Section infos de base ── -->
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
                <!-- Moyenne générale mise en valeur -->
                <div class="bg-purple-50 border border-purple-200
                            text-purple-700 px-4 py-1 rounded-full text-sm font-bold">
                    Moy. générale :
                    <span class="${notes.moyenne_generale >= 10
                                    ? 'text-green-600'
                                    : 'text-red-500'}">
                        ${notes.moyenne_generale}/20
                    </span>
                </div>
            </div>

            <!-- Blocs par matière -->
            <div id="blocsNotes">
                ${blocsNotes}
            </div>

            <!-- Ajouter une note dans une nouvelle matière -->
            <div class="mt-4 border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <p class="text-xs font-semibold text-gray-600 mb-3">
                    <i class="fas fa-plus-circle text-green-400 mr-1"></i>
                    Ajouter une note
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input id="nMatiere" type="text" placeholder="Matière (ex: Math)"
                           list="listeMatieres"
                           class="border rounded px-3 py-2 text-sm
                                  focus:outline-none focus:ring-1 focus:ring-purple-300">
                    <datalist id="listeMatieres">
                        ${notes.matieres.map(m =>
                            `<option value="${esc(m.nom_matiere)}">`
                        ).join('')}
                    </datalist>
                    <select id="nType" class="border rounded px-3 py-2 text-sm bg-white">
                        <option value="devoir">Devoir</option>
                        <option value="examen">Examen</option>
                    </select>
                    <input id="nNom" type="text" placeholder="Nom (ex: Devoir 1)"
                           class="border rounded px-3 py-2 text-sm
                                  focus:outline-none focus:ring-1 focus:ring-purple-300">
                    <input id="nValeur" type="number" min="0" max="20" step="0.25"
                           placeholder="Note (0–20)"
                           class="border rounded px-3 py-2 text-sm
                                  focus:outline-none focus:ring-1 focus:ring-purple-300">
                </div>
                <button onclick="ajouterNouvelleNote(${id})"
                        class="mt-3 bg-purple-500 hover:bg-purple-600 text-white
                               px-4 py-2 rounded text-sm w-full transition">
                    <i class="fas fa-plus mr-1"></i>Enregistrer la note
                </button>
            </div>
        </div>
    `;
}

/**
 * Construit les blocs notes par matière pour l'affichage dans la modale
 * @param {number} etudiantId - Identifiant de l'étudiant
 * @param {Array} matieres - Liste des matières avec leurs notes
 * @returns {string} HTML des blocs notes
 */
function construireBlocsNotes(etudiantId, matieres) {
    if (!matieres || matieres.length === 0) {
        return `<p class="text-gray-400 text-sm italic text-center py-4">
                    Aucune note enregistrée pour cet étudiant.
                </p>`;
    }

    return matieres.map(m => {
        const couleurMoy = m.moyenne_matiere >= 10 ? 'text-green-600' : 'text-red-500';

        // Lignes des devoirs
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
                            title="Supprimer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>`).join('');

        // Ligne examen
        const ligneExamen = m.examen
            ? `<div class="flex justify-between items-center py-1 text-xs text-gray-600">
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
                               title="Supprimer">
                           <i class="fas fa-times"></i>
                       </button>
                   </div>
               </div>`
            : `<p class="text-xs text-gray-400 italic py-1">
                   Pas d'examen —
                   <button onclick="ajouterNoteRapide(
                               ${etudiantId}, '${esc(m.nom_matiere)}', 'examen'
                           )"
                           class="text-blue-400 hover:underline">
                       Ajouter
                   </button>
               </p>`;

        // Affichage moy_devoirs
        const moyDev = m.moyenne_devoirs !== null
            ? `${m.moyenne_devoirs}/20`
            : '—';

        return `
        <div class="border rounded-lg p-3 mb-3 bg-white">
            <div class="flex justify-between items-center mb-2">
                <span class="font-semibold text-sm text-gray-800">
                    ${esc(m.nom_matiere)}
                </span>
                <div class="text-right text-xs text-gray-500">
                    <span>Moy. devoirs : ${moyDev}</span>
                    <span class="ml-3 font-bold ${couleurMoy} text-sm">
                        Moy. matière : ${m.moyenne_matiere}/20
                    </span>
                </div>
            </div>
            ${lignesDevoirs}
            ${ligneExamen}
        </div>`;
    }).join('');
}

function fermerModale() {
    document.getElementById('modaleEdit').classList.add('hidden');
}

/**
 * Sauvegarde les modifications des informations de base d'un étudiant
 * @param {number} id - Identifiant de l'étudiant
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
    toast(res.success ? '✅ Modifications sauvegardées' : res.message,
          res.success ? 'ok' : 'err');
    if (res.success) chargerEtudiants();
}

/**
 * Modifie une note existante (appelé via onChange sur l'input)
 * @param {number} etudiantId - Identifiant de l'étudiant
 * @param {string} nomMatiere - Nom de la matière
 * @param {string} nomEval - Nom de l'évaluation
 * @param {string} type - 'devoir' ou 'examen'
 * @param {number|string} valeur - Nouvelle valeur de la note
 */
async function modifierNote(etudiantId, nomMatiere, nomEval, type, valeur) {
    const v = parseFloat(valeur);
    if (isNaN(v) || v < 0 || v > 20) {
        toast('Note invalide — entre 0 et 20', 'err'); return;
    }
    const res = await sauvegarderNote(etudiantId, {
        nom_matiere:     nomMatiere,
        nom_evaluation:  nomEval,
        type_evaluation: type,
        valeur:          v
    });
    if (res.success) {
        // Recharger la modale pour recalculer les moyennes
        ouvrirModaleEdit(etudiantId);
        chargerMoyenne(etudiantId);
    } else {
        toast(res.message || 'Erreur', 'err');
    }
}

/**
 * Ajoute une note rapide (bouton "Ajouter examen" ou "Ajouter devoir")
 * @param {number} etudiantId - Identifiant de l'étudiant
 * @param {string} nomMatiere - Nom de la matière
 * @param {string} type - 'devoir' ou 'examen'
 */
async function ajouterNoteRapide(etudiantId, nomMatiere, type) {
    const nom    = prompt(`Nom de ${type === 'examen' ? "l'examen" : 'la note'} :`,
                          type === 'examen' ? 'Examen' : 'Devoir');
    if (!nom) return;
    const valeur = parseFloat(prompt('Note (0 à 20) :'));
    if (isNaN(valeur) || valeur < 0 || valeur > 20) {
        toast('Note invalide', 'err'); return;
    }
    const res = await sauvegarderNote(etudiantId, {
        nom_matiere: nomMatiere, nom_evaluation: nom,
        type_evaluation: type, valeur
    });
    toast(res.success ? '✅ Note ajoutée' : res.message, res.success ? 'ok' : 'err');
    if (res.success) { ouvrirModaleEdit(etudiantId); chargerMoyenne(etudiantId); }
}

/**
 * Ajoute une note depuis le formulaire en bas de la modale
 * @param {number} etudiantId - Identifiant de l'étudiant
 */
async function ajouterNouvelleNote(etudiantId) {
    const matiere = document.getElementById('nMatiere').value.trim();
    const type    = document.getElementById('nType').value;
    const nom     = document.getElementById('nNom').value.trim();
    const valeur  = parseFloat(document.getElementById('nValeur').value);

    if (!matiere || !nom) {
        toast('Remplissez la matière et le nom de la note', 'err'); return;
    }
    if (isNaN(valeur) || valeur < 0 || valeur > 20) {
        toast('Note entre 0 et 20', 'err'); return;
    }

    const res = await sauvegarderNote(etudiantId, {
        nom_matiere: matiere, nom_evaluation: nom,
        type_evaluation: type, valeur
    });
    toast(res.success ? '✅ Note enregistrée' : res.message, res.success ? 'ok' : 'err');
    if (res.success) { ouvrirModaleEdit(etudiantId); chargerMoyenne(etudiantId); }
}

/**
 * Supprime une note
 * @param {number} etudiantId - Identifiant de l'étudiant
 * @param {number} noteId - Identifiant de la note à supprimer
 */
async function effacerNote(etudiantId, noteId) {
    if (!confirm('Supprimer cette note ?')) return;
    const res = await supprimerNote(etudiantId, noteId);
    toast(res.success ? '✅ Note supprimée' : res.message, res.success ? 'ok' : 'err');
    if (res.success) { ouvrirModaleEdit(etudiantId); chargerMoyenne(etudiantId); }
}

// ═══════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════

/**
 * Échappe les caractères HTML pour éviter les injections XSS
 * @param {*} s - La chaîne à échapper
 * @returns {string} Chaîne échappée
 */
function esc(s) {
    return String(s || '')
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
}

/**
 * Affiche une notification toast en bas à droite
 * Version corrigée : crée un nouvel élément à chaque appel
 * @param {string} msg - Le message à afficher
 * @param {string} type - 'ok' (succès) ou 'err' (erreur)
 */
function toast(msg, type = 'ok') {
    // Supprimer le toast existant s'il y en a un
    const ancien = document.getElementById('toast-notif');
    if (ancien) ancien.remove();

    // Créer un nouveau toast à chaque fois
    const el      = document.createElement('div');
    el.id         = 'toast-notif';
    el.className  = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg
                     shadow-xl text-white text-sm font-medium max-w-sm
                     ${type === 'ok' ? 'bg-green-500' : 'bg-red-500'}`;
    el.textContent = msg;
    document.body.appendChild(el);

    // Disparaît après 4 secondes
    setTimeout(() => {
        if (el.parentNode) el.remove();
    }, 4000);
}