/**
 * index.js — Logique de la page principale
 * - Chargement et affichage des étudiants
 * - Ajout avec matières/notes
 * - Édition (modale)
 * - Affichage des notes et moyennes par étudiant
 * - Archivage
 */

// ─── État global de la page ──────────────────────────────────
let page  = 1;
let limit = 10;
let total = 0;

// ─── Initialisation ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Charger les classes dans les selects
    await chargerClasses();

    // Charger la liste
    await chargerEtudiants();

    // Événements filtres
    document.getElementById('searchInput').addEventListener('input', () => { page = 1; chargerEtudiants(); });
    document.getElementById('sourceFilter').addEventListener('change', () => { page = 1; chargerEtudiants(); });
    document.getElementById('classeFilter').addEventListener('change', () => { page = 1; chargerEtudiants(); });
    document.getElementById('limitSelect').addEventListener('change', () => {
        limit = parseInt(document.getElementById('limitSelect').value);
        page  = 1;
        chargerEtudiants();
    });
});

// ─── Charger les classes dans les selects ────────────────────
async function chargerClasses() {
    const res = await getClasses();
    if (!res.success) return;

    // Select filtre
    const filtre = document.getElementById('classeFilter');
    // Select formulaire ajout
    const form   = document.getElementById('fClasse');

    res.data.forEach(c => {
        filtre.innerHTML += `<option value="${c.nom}">${c.nom}</option>`;
        form.innerHTML   += `<option value="${c.nom}">${c.nom}</option>`;
    });
}

// ─── Charger et afficher les étudiants ───────────────────────
async function chargerEtudiants() {
    const search = document.getElementById('searchInput').value;
    const source = document.getElementById('sourceFilter').value;
    const classe = document.getElementById('classeFilter').value;
    const tbody  = document.getElementById('tableBody');

    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-gray-400">
        <i class="fas fa-spinner fa-spin mr-2"></i>Chargement...</td></tr>`;

    const res = await getEtudiants(page, limit, search, source, classe);

    if (!res.success) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-red-400">
            Erreur de connexion au backend</td></tr>`;
        return;
    }

    total = res.total || 0;
    const etudiants = res.data || [];

    // Mettre à jour la pagination
    const totalPages = Math.max(1, Math.ceil(total / limit));
    document.getElementById('totalInfo').textContent = `${total} étudiant(s)`;
    document.getElementById('pageInfo').textContent  = `Page ${page} / ${totalPages}`;
    document.getElementById('btnPrev').disabled      = page <= 1;
    document.getElementById('btnNext').disabled      = page >= totalPages;

    if (etudiants.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-gray-400">
            Aucun étudiant trouvé</td></tr>`;
        return;
    }

    // Construire les lignes du tableau
    tbody.innerHTML = etudiants.map(e => {
        const badgeSource = e.source === 'DB'
            ? `<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">DB</span>`
            : `<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">JSON</span>`;

        const actions = e.editable
            ? `<button onclick="ouvrirModaleEdit(${e.id})"
                       class="text-blue-500 hover:text-blue-700 mr-2" title="Modifier">
                   <i class="fas fa-edit"></i>
               </button>
               <button onclick="voirNotes(${e.id})"
                       class="text-purple-500 hover:text-purple-700 mr-2" title="Notes/Moyennes">
                   <i class="fas fa-chart-bar"></i>
               </button>
               <button onclick="confirmerArchivage(${e.id})"
                       class="text-red-400 hover:text-red-600" title="Archiver">
                   <i class="fas fa-archive"></i>
               </button>`
            : `<span class="text-xs text-gray-400 italic">Lecture seule</span>`;

        return `
        <tr class="border-t hover:bg-gray-50 transition">
            <td class="px-4 py-3">${badgeSource}</td>
            <td class="px-4 py-3 font-mono text-xs">${esc(e.numero)}</td>
            <td class="px-4 py-3 text-xs text-gray-500">${esc(e.code)}</td>
            <td class="px-4 py-3 font-medium">${esc(e.nom)}</td>
            <td class="px-4 py-3">${esc(e.prenom)}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 bg-gray-100 rounded text-xs">${esc(e.classe || '—')}</span>
            </td>
            <td class="px-4 py-3" id="moy-${e.id}">
                ${e.id ? `<span class="text-gray-400 text-xs" onclick="chargerMoyenne(${e.id}, this)"
                               style="cursor:pointer" title="Cliquer pour voir">
                    <i class="fas fa-sync-alt mr-1"></i>voir
                </span>` : '—'}
            </td>
            <td class="px-4 py-3">${actions}</td>
        </tr>`;
    }).join('');
}

// ─── Charger la moyenne générale d'un étudiant ───────────────
async function chargerMoyenne(id, el) {
    el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    const res = await getNotes(id);
    if (res.success && res.data) {
        const moy = res.data.moyenne_generale;
        const couleur = moy >= 10 ? 'text-green-600' : 'text-red-500';
        el.outerHTML = `<span class="font-bold ${couleur}">${moy}/20</span>`;
    } else {
        el.outerHTML = `<span class="text-gray-400 text-xs">—</span>`;
    }
}

// ─── Pagination ──────────────────────────────────────────────
function pageNext() { page++; chargerEtudiants(); }
function pagePrev() { page--; chargerEtudiants(); }

// ─── Archivage ───────────────────────────────────────────────
async function confirmerArchivage(id) {
    if (!confirm('Archiver cet étudiant ?')) return;
    const res = await archiverEtudiant(id);
    toast(res.success ? 'Étudiant archivé' : res.message, res.success ? 'ok' : 'err');
    if (res.success) chargerEtudiants();
}

// ═══════════════════════════════════════════════════════════════
// FORMULAIRE D'AJOUT
// ═══════════════════════════════════════════════════════════════

let compteurMatieres = 0; // pour générer des IDs uniques

function toggleForm() {
    const div  = document.getElementById('formContenu');
    const icon = document.getElementById('formIcon');
    div.classList.toggle('hidden');
    icon.className = div.classList.contains('hidden')
        ? 'fas fa-chevron-right text-white'
        : 'fas fa-chevron-down text-white';
}

/** Ajoute une ligne matière dans le formulaire d'ajout */
function ajouterLigneMatiere() {
    const id  = ++compteurMatieres;
    const div = document.createElement('div');
    div.id    = `mat-${id}`;
    div.className = 'border rounded-lg p-4 bg-gray-50 relative';

    div.innerHTML = `
        <!-- Bouton supprimer la matière -->
        <button onclick="document.getElementById('mat-${id}').remove()"
                class="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs">
            <i class="fas fa-trash"></i>
        </button>

        <!-- Nom de la matière -->
        <div class="mb-3">
            <label class="text-xs font-semibold text-gray-600">Matière *</label>
            <input id="mat-nom-${id}" type="text" placeholder="ex: Algorithmique"
                   class="w-full mt-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
        </div>

        <!-- Examen -->
        <div class="mb-3">
            <label class="text-xs font-semibold text-gray-600">Note d'examen (sur 20)</label>
            <input id="mat-examen-${id}" type="number" min="0" max="20" step="0.25"
                   placeholder="ex: 14"
                   class="w-32 mt-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
        </div>

        <!-- Devoirs -->
        <div>
            <div class="flex justify-between items-center mb-2">
                <label class="text-xs font-semibold text-gray-600">Notes de devoir</label>
                <button onclick="ajouterDevoir(${id})"
                        class="text-xs text-blue-600 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50">
                    <i class="fas fa-plus mr-1"></i>Ajouter un devoir
                </button>
            </div>
            <div id="devoirs-${id}" class="space-y-2"></div>
        </div>

        <!-- Aperçu moyenne (calculé en live) -->
        <div class="mt-3 text-xs text-gray-500">
            Moyenne matière : <span id="preview-moy-${id}" class="font-bold text-blue-600">—</span>
        </div>
    `;

    document.getElementById('matieresContainer').appendChild(div);

    // Recalcul à chaque changement
    div.addEventListener('input', () => previewMoyenne(id));
}

/** Ajoute un champ devoir dans une matière */
function ajouterDevoir(matId) {
    const container = document.getElementById(`devoirs-${matId}`);
    const num       = container.children.length + 1;
    const d         = document.createElement('div');
    d.className     = 'flex gap-2 items-center';
    d.innerHTML = `
        <input type="text" value="Devoir ${num}" placeholder="Nom du devoir"
               class="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
               data-role="nom-devoir">
        <input type="number" min="0" max="20" step="0.25" placeholder="Note"
               class="w-24 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
               data-role="val-devoir">
        <button onclick="this.parentElement.remove(); previewMoyenne(${matId})"
                class="text-red-400 hover:text-red-600">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(d);
}

/** Calcule et affiche la moyenne de la matière en live */
function previewMoyenne(matId) {
    const examenEl = document.getElementById(`mat-examen-${matId}`);
    const examen   = examenEl.value !== '' ? parseFloat(examenEl.value) : null;

    const devoirsEl = document.getElementById(`devoirs-${matId}`)
                              .querySelectorAll('[data-role="val-devoir"]');
    const valeurs = Array.from(devoirsEl)
                         .map(i => parseFloat(i.value))
                         .filter(v => !isNaN(v));

    let moy = null;
    if (valeurs.length > 0 && examen !== null) {
        const moyD = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
        moy = ((moyD + examen) / 2).toFixed(2);
    } else if (valeurs.length > 0) {
        moy = (valeurs.reduce((a, b) => a + b, 0) / valeurs.length).toFixed(2);
    } else if (examen !== null) {
        moy = examen.toFixed(2);
    }

    const el = document.getElementById(`preview-moy-${matId}`);
    el.textContent = moy !== null ? `${moy}/20` : '—';
}

/** Soumettre le formulaire d'ajout */
async function soumettreFormulaire() {
    // Récupérer les champs de base
    const nom    = document.getElementById('fNom').value.trim().toUpperCase();
    const prenom = document.getElementById('fPrenom').value.trim();
    const numero = document.getElementById('fNumero').value.trim().toUpperCase();
    const code   = document.getElementById('fCode').value.trim().toUpperCase();
    const date   = document.getElementById('fDate').value || '2000-01-01';
    const classe = document.getElementById('fClasse').value;

    // Validation simple
    if (!nom || !prenom || !numero || !code || !classe) {
        toast('Remplissez tous les champs obligatoires (*)', 'err'); return;
    }
    if (!/^[A-Za-z]{3}[0-9]{3}$/.test(code)) {
        toast('Code invalide — ex: AAD004 (3 lettres + 3 chiffres)', 'err'); return;
    }
    if (!/^[A-Za-z0-9]{7}$/.test(numero)) {
        toast('Numéro invalide — 7 caractères alphanumériques', 'err'); return;
    }

    // Récupérer les matières
    const matieres = [];
    document.querySelectorAll('#matieresContainer > div[id^="mat-"]').forEach(div => {
        const id       = div.id.replace('mat-', '');
        const nomMat   = document.getElementById(`mat-nom-${id}`)?.value.trim();
        const examenEl = document.getElementById(`mat-examen-${id}`);
        const examen   = examenEl?.value !== '' ? parseFloat(examenEl.value) : null;

        if (!nomMat) return; // ignorer les matières sans nom

        // Récupérer les devoirs
        const notes_devoir = [];
        div.querySelectorAll('[data-role="val-devoir"]').forEach((input, i) => {
            const valeur = parseFloat(input.value);
            const nom_d  = div.querySelectorAll('[data-role="nom-devoir"]')[i]?.value || `Devoir ${i+1}`;
            if (!isNaN(valeur)) {
                notes_devoir.push({ valeur, nom: nom_d });
            }
        });

        matieres.push({
            nom_matiere:  nomMat,
            notes_devoir: notes_devoir,
            note_examen:  examen
        });
    });

    // Envoyer au backend
    const res = await creerEtudiant({ nom, prenom, numero, code, date_naissance: date, classe, matieres });

    if (res.success) {
        toast('Étudiant ajouté avec succès !', 'ok');
        // Vider le formulaire
        ['fNom','fPrenom','fNumero','fCode','fDate'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('fClasse').value = '';
        document.getElementById('matieresContainer').innerHTML = '';
        compteurMatieres = 0;
        page = 1;
        chargerEtudiants();
    } else {
        toast(res.message || 'Erreur lors de l\'ajout', 'err');
    }
}

// ═══════════════════════════════════════════════════════════════
// MODALE ÉDITION
// ═══════════════════════════════════════════════════════════════

/** Ouvre la modale d'édition pour un étudiant DB */
async function ouvrirModaleEdit(id) {
    const modale = document.getElementById('modaleEdit');
    const contenu = document.getElementById('modaleContenu');

    contenu.innerHTML = '<p class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Chargement...</p>';
    modale.classList.remove('hidden');

    // Charger les infos de l'étudiant
    const [resEt, resNotes, resClasses] = await Promise.all([
        getEtudiant(id),
        getNotes(id),
        getClasses()
    ]);

    if (!resEt.success) {
        contenu.innerHTML = '<p class="text-red-500 text-center py-8">Erreur de chargement</p>';
        return;
    }

    const e      = resEt.data;
    const notes  = resNotes.success ? resNotes.data : { matieres: [], moyenne_generale: 0 };
    const classes = resClasses.success ? resClasses.data : [];

    // Options classes
    const optClasses = classes.map(c =>
        `<option value="${c.nom}" ${c.nom === e.classe ? 'selected' : ''}>${c.nom}</option>`
    ).join('');

    // Tableau des notes par matière
    const tableNotes = notes.matieres.length === 0
        ? `<p class="text-gray-400 text-sm italic">Aucune note enregistrée</p>`
        : notes.matieres.map(m => `
            <div class="border rounded-lg p-3 mb-3 bg-gray-50">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-semibold text-sm text-gray-700">${esc(m.nom_matiere)}</span>
                    <span class="text-sm font-bold ${m.moyenne_matiere >= 10 ? 'text-green-600' : 'text-red-500'}">
                        Moy. : ${m.moyenne_matiere}/20
                    </span>
                </div>
                <!-- Devoirs -->
                ${m.devoirs.map(d => `
                    <div class="flex justify-between items-center text-xs text-gray-600 py-1 border-b">
                        <span><i class="fas fa-pencil-alt mr-1 text-blue-400"></i>${esc(d.nom)}</span>
                        <div class="flex items-center gap-2">
                            <input type="number" min="0" max="20" step="0.25"
                                   value="${d.valeur}"
                                   class="w-16 border rounded px-2 py-0.5 text-xs"
                                   onchange="modifierNote(${id}, '${esc(m.nom_matiere)}', '${esc(d.nom)}', 'devoir', this.value)">
                            <button onclick="effacerNote(${id}, ${d.note_id})"
                                    class="text-red-400 hover:text-red-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>`).join('')}
                <!-- Examen -->
                ${m.examen ? `
                    <div class="flex justify-between items-center text-xs text-gray-600 py-1">
                        <span><i class="fas fa-file-alt mr-1 text-orange-400"></i>Examen</span>
                        <div class="flex items-center gap-2">
                            <input type="number" min="0" max="20" step="0.25"
                                   value="${m.examen.valeur}"
                                   class="w-16 border rounded px-2 py-0.5 text-xs"
                                   onchange="modifierNote(${id}, '${esc(m.nom_matiere)}', 'Examen', 'examen', this.value)">
                            <button onclick="effacerNote(${id}, ${m.examen.note_id})"
                                    class="text-red-400 hover:text-red-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>` : `
                    <div class="text-xs text-gray-400 italic pt-1">Pas d'examen — 
                        <button onclick="ajouterNoteModale(${id}, '${esc(m.nom_matiere)}', 'examen')"
                                class="text-blue-500 underline">Ajouter</button>
                    </div>`}

                <!-- Ajouter un devoir -->
                <button onclick="ajouterNoteModale(${id}, '${esc(m.nom_matiere)}', 'devoir')"
                        class="mt-2 text-xs text-blue-500 hover:underline">
                    <i class="fas fa-plus mr-1"></i>Ajouter un devoir
                </button>
            </div>`).join('');

    contenu.innerHTML = `
        <!-- ── Infos de base ── -->
        <h4 class="font-semibold text-gray-700 mb-3">Informations générales</h4>
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
                <label class="text-xs text-gray-500">Nom</label>
                <input id="eNom" value="${esc(e.nom)}"
                       class="w-full border rounded px-3 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
            <div>
                <label class="text-xs text-gray-500">Prénom</label>
                <input id="ePrenom" value="${esc(e.prenom)}"
                       class="w-full border rounded px-3 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
            <div>
                <label class="text-xs text-gray-500">Numéro</label>
                <input id="eNumero" value="${esc(e.numero)}"
                       class="w-full border rounded px-3 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
            <div>
                <label class="text-xs text-gray-500">Code</label>
                <input id="eCode" value="${esc(e.code)}"
                       class="w-full border rounded px-3 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
            <div>
                <label class="text-xs text-gray-500">Date de naissance</label>
                <input id="eDate" type="date" value="${e.date_naissance}"
                       class="w-full border rounded px-3 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
            <div>
                <label class="text-xs text-gray-500">Classe</label>
                <select id="eClasse" class="w-full border rounded px-3 py-1.5 text-sm mt-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                    ${optClasses}
                </select>
            </div>
        </div>

        <button onclick="sauvegarderModifications(${id})"
                class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold mb-6">
            <i class="fas fa-save mr-2"></i>Sauvegarder les modifications
        </button>

        <!-- ── Notes et moyennes ── -->
        <div class="border-t pt-4">
            <div class="flex justify-between items-center mb-3">
                <h4 class="font-semibold text-gray-700">
                    <i class="fas fa-chart-bar mr-1 text-purple-500"></i>Notes et moyennes
                </h4>
                <div class="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">
                    Moy. générale : ${notes.moyenne_generale}/20
                </div>
            </div>
            ${tableNotes}

            <!-- Ajouter une nouvelle matière depuis la modale -->
            <div class="mt-4 border-t pt-3">
                <p class="text-xs font-semibold text-gray-600 mb-2">Ajouter une note dans une nouvelle matière :</p>
                <div class="flex gap-2 flex-wrap">
                    <input id="nouvelleMatiere" type="text" placeholder="Nom de la matière"
                           class="flex-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-300">
                    <select id="typeNouvelleNote" class="border rounded px-3 py-1.5 text-sm bg-white">
                        <option value="devoir">Devoir</option>
                        <option value="examen">Examen</option>
                    </select>
                    <input id="nomNouvelleNote" type="text" placeholder="Nom (ex: Devoir 1)"
                           class="flex-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-300">
                    <input id="valeurNouvelleNote" type="number" min="0" max="20" step="0.25" placeholder="Note"
                           class="w-20 border rounded px-3 py-1.5 text-sm">
                    <button onclick="ajouterNouvelleNote(${id})"
                            class="bg-purple-500 text-white px-4 py-1.5 rounded text-sm hover:bg-purple-600">
                        <i class="fas fa-plus mr-1"></i>Ajouter
                    </button>
                </div>
            </div>
        </div>
    `;
}

function fermerModale() {
    document.getElementById('modaleEdit').classList.add('hidden');
}

// Clic en dehors de la modale → fermer
document.getElementById('modaleEdit')?.addEventListener('click', function(e) {
    if (e.target === this) fermerModale();
});

/** Sauvegarder les modifications des infos de base */
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
    toast(res.success ? 'Modifications sauvegardées' : res.message, res.success ? 'ok' : 'err');
    if (res.success) chargerEtudiants();
}

/** Modifier une note existante (appelé au onChange de l'input) */
async function modifierNote(etudiantId, nomMatiere, nomEval, type, valeur) {
    const v = parseFloat(valeur);
    if (isNaN(v) || v < 0 || v > 20) { toast('Note invalide (0–20)', 'err'); return; }
    const res = await sauvegarderNote(etudiantId, {
        nom_matiere: nomMatiere, nom_evaluation: nomEval,
        type_evaluation: type, valeur: v
    });
    toast(res.success ? 'Note mise à jour' : res.message, res.success ? 'ok' : 'err');
    // Recharger la modale pour afficher les nouvelles moyennes
    if (res.success) ouvrirModaleEdit(etudiantId);
}

/** Ajouter une note depuis la modale (bouton inline) */
async function ajouterNoteModale(etudiantId, nomMatiere, type) {
    const nom    = prompt(`Nom de la ${type === 'examen' ? "l'examen" : 'note'} :`, type === 'examen' ? 'Examen' : 'Devoir');
    if (!nom) return;
    const valeur = parseFloat(prompt('Note (0 à 20) :'));
    if (isNaN(valeur) || valeur < 0 || valeur > 20) { toast('Note invalide', 'err'); return; }

    const res = await sauvegarderNote(etudiantId, {
        nom_matiere: nomMatiere, nom_evaluation: nom,
        type_evaluation: type, valeur
    });
    toast(res.success ? 'Note ajoutée' : res.message, res.success ? 'ok' : 'err');
    if (res.success) ouvrirModaleEdit(etudiantId);
}

/** Ajouter une note dans une nouvelle matière */
async function ajouterNouvelleNote(etudiantId) {
    const matiere = document.getElementById('nouvelleMatiere').value.trim();
    const type    = document.getElementById('typeNouvelleNote').value;
    const nom     = document.getElementById('nomNouvelleNote').value.trim();
    const valeur  = parseFloat(document.getElementById('valeurNouvelleNote').value);

    if (!matiere || !nom || isNaN(valeur)) {
        toast('Remplissez tous les champs de la note', 'err'); return;
    }
    if (valeur < 0 || valeur > 20) { toast('Note entre 0 et 20', 'err'); return; }

    const res = await sauvegarderNote(etudiantId, {
        nom_matiere: matiere, nom_evaluation: nom,
        type_evaluation: type, valeur
    });
    toast(res.success ? 'Note ajoutée' : res.message, res.success ? 'ok' : 'err');
    if (res.success) ouvrirModaleEdit(etudiantId);
}

/** Supprimer une note */
async function effacerNote(etudiantId, noteId) {
    if (!confirm('Supprimer cette note ?')) return;
    const res = await supprimerNote(etudiantId, noteId);
    toast(res.success ? 'Note supprimée' : res.message, res.success ? 'ok' : 'err');
    if (res.success) ouvrirModaleEdit(etudiantId);
}

/** Voir les notes (ouvre la modale) */
function voirNotes(id) { ouvrirModaleEdit(id); }

// ─── Utilitaires ────────────────────────────────────────────
function esc(s) {
    return String(s || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg, type = 'ok') {
    const el = document.getElementById('toast');
    el.className = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium
        ${type === 'ok' ? 'bg-green-500' : 'bg-red-500'}`;
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3500);
}