/**
 * import.js — Logique de la page import.html
 *
 * Affiche les étudiants du fichier JSON non encore importés en DB.
 * Permet de les cocher et de les importer en base.
 */

// Quand la page est prête
document.addEventListener('DOMContentLoaded', () => {
    chargerApercuJson();

    // Bouton "Importer la sélection"
    const btn = document.getElementById('btnImporter');
    if (btn) btn.addEventListener('click', importerSelection);
});

// ─── Charger l'aperçu du JSON ─────────────────────────────────
async function chargerApercuJson() {
    const info    = document.getElementById('infoMessage');
    const liste   = document.getElementById('listeEtudiants');
    const bouton  = document.getElementById('zoneBouton');
    const msgVide = document.getElementById('messageVide');

    // Spinner de chargement
    if (info) {
        info.className   = 'bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4';
        info.innerHTML   = '<i class="fas fa-spinner fa-spin mr-2"></i>Chargement des données...';
    }

    const res = await getJsonPreview();

    // Erreur réseau
    if (!res.success) {
        if (info) {
            info.className = 'bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4';
            info.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i>Erreur — vérifiez que le backend est lancé.';
        }
        return;
    }

    // Aucun étudiant à importer
    if (!res.data || res.data.length === 0) {
        if (info)    info.classList.add('hidden');
        if (msgVide) msgVide.classList.remove('hidden');
        if (bouton)  bouton.classList.add('hidden');
        return;
    }

    // Mettre à jour le message d'info
    if (info) {
        info.className = 'bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4';
        info.innerHTML = `
            <i class="fas fa-info-circle mr-2"></i>
            <strong>${res.data.length}</strong> étudiant(s) disponible(s) dans le fichier JSON.
            Cochez ceux que vous voulez importer en base de données.`;
    }

    // Construire la liste avec les cases à cocher
    if (liste) {
        liste.innerHTML = `
            <!-- Case "Tout sélectionner" -->
            <div class="bg-gray-50 border rounded-lg px-4 py-3 flex items-center gap-3 mb-2">
                <input type="checkbox" id="toutCocher"
                       class="w-4 h-4 cursor-pointer"
                       onchange="toggleTout(this.checked)">
                <label for="toutCocher" class="text-sm font-semibold text-gray-700 cursor-pointer">
                    Tout sélectionner / Désélectionner
                </label>
            </div>

            <!-- Liste des étudiants -->
            ${res.data.map(e => `
                <div class="bg-white border rounded-lg px-4 py-3 flex items-center gap-3
                            hover:border-blue-300 transition">

                    <!-- Case à cocher — valeur = numéro de l'étudiant -->
                    <input type="checkbox"
                           class="checkbox-etudiant w-4 h-4 cursor-pointer"
                           value="${esc(e.numero)}">

                    <!-- Infos -->
                    <div class="flex-1">
                        <span class="font-semibold text-gray-800">
                            ${esc(e.nom)} ${esc(e.prenom)}
                        </span>
                        <span class="ml-2 font-mono text-xs text-gray-500">${esc(e.numero)}</span>
                        <span class="ml-2 text-xs text-gray-400">— ${esc(e.classe || '?')}</span>
                    </div>

                    <!-- Badge source -->
                    <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                        JSON
                    </span>
                </div>
            `).join('')}
        `;
    }

    // Afficher le bouton d'import
    if (bouton) bouton.classList.remove('hidden');
}

// ─── Cocher / décocher tout ──────────────────────────────────
function toggleTout(coche) {
    // Récupérer toutes les cases à cocher des étudiants
    document.querySelectorAll('.checkbox-etudiant').forEach(cb => {
        cb.checked = coche;
    });
}

// ─── Importer la sélection ───────────────────────────────────
async function importerSelection() {
    // Récupérer les numéros cochés
    const cochees = document.querySelectorAll('.checkbox-etudiant:checked');
    const numeros = Array.from(cochees).map(cb => cb.value);

    // Vérifier qu'au moins un est sélectionné
    if (numeros.length === 0) {
        toast('Sélectionnez au moins un étudiant à importer', 'err');
        return;
    }

    // Désactiver le bouton pendant l'opération
    const btn = document.getElementById('btnImporter');
    if (btn) {
        btn.disabled   = true;
        btn.innerHTML  = '<i class="fas fa-spinner fa-spin mr-2"></i>Importation en cours...';
    }

    const res = await importerEtudiants(numeros);

    // Réactiver le bouton
    if (btn) {
        btn.disabled  = false;
        btn.innerHTML = '<i class="fas fa-database mr-2"></i>Importer la sélection';
    }

    if (res.success) {
        // Construire le message de résultat
        let msg = '';
        if (res.importes.length > 0)
            msg += `✅ ${res.importes.length} importé(s). `;
        if (res.ignores.length > 0)
            msg += `⚠️ ${res.ignores.length} doublon(s) ignoré(s).`;

        toast(msg || 'Import terminé', 'ok');

        // Recharger la liste pour retirer les importés
        chargerApercuJson();

    } else {
        toast(res.message || 'Erreur lors de l\'importation', 'err');
    }
}

// ─── Utilitaires ─────────────────────────────────────────────

function esc(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function toast(msg, type = 'ok') {
    const ancien = document.getElementById('toast');
    if (ancien) ancien.remove();

    const el      = document.createElement('div');
    el.id         = 'toast';
    el.className  = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg
        text-white text-sm font-medium max-w-sm
        ${type === 'ok' ? 'bg-green-500' : 'bg-red-500'}`;
    el.textContent = msg;
    document.body.appendChild(el);

    setTimeout(() => el.remove(), 4000);
}