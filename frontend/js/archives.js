/**
 * archives.js — Logique de la page archives.html
 *
 * Affiche la liste des étudiants archivés.
 * Permet de restaurer un étudiant archivé.
 */

// Quand la page est prête, on charge les archives
document.addEventListener('DOMContentLoaded', () => {
    chargerArchives();
});

// ─── Charger et afficher les archives ────────────────────────
async function chargerArchives() {
    const conteneur = document.getElementById('listeArchives');

    // Afficher un spinner pendant le chargement
    conteneur.innerHTML = `
        <div class="col-span-full text-center py-12 text-gray-400">
            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Chargement des archives...</p>
        </div>`;

    // Appel API
    const res = await getArchives();

    // Si erreur réseau ou backend
    if (!res.success) {
        conteneur.innerHTML = `
            <div class="col-span-full text-center py-12 text-red-400">
                <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                <p>Erreur de chargement — vérifiez que le backend est lancé.</p>
            </div>`;
        return;
    }

    // Si aucune archive
    if (!res.data || res.data.length === 0) {
        conteneur.innerHTML = `
            <div class="col-span-full text-center py-16 bg-white rounded-xl shadow">
                <i class="fas fa-inbox text-gray-300 text-5xl mb-4"></i>
                <p class="text-gray-500 text-lg">Aucun étudiant archivé pour l'instant.</p>
            </div>`;
        return;
    }

    // Mettre à jour le compteur dans le titre
    const compteur = document.getElementById('compteurArchives');
    if (compteur) compteur.textContent = `(${res.data.length})`;

    // Construire les cartes
    conteneur.innerHTML = res.data.map(e => `
        <div class="bg-white rounded-xl shadow p-4 border border-yellow-200">

            <!-- En-tête de la carte -->
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h3 class="font-bold text-gray-800">${esc(e.nom)} ${esc(e.prenom)}</h3>
                    <p class="text-sm text-gray-500 font-mono">${esc(e.numero)}</p>
                </div>
                <!-- Badge archivé -->
                <span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                    <i class="fas fa-archive mr-1"></i>ARCHIVÉ
                </span>
            </div>

            <!-- Infos -->
            <div class="text-sm text-gray-600 mb-4 space-y-1">
                <p><i class="fas fa-tag mr-1 text-gray-400"></i>Code : ${esc(e.code || '—')}</p>
                <p><i class="fas fa-school mr-1 text-gray-400"></i>Classe : ${esc(e.classe || '—')}</p>
            </div>

            <!-- Bouton restaurer -->
            <button onclick="confirmerRestauration(${e.id}, '${esc(e.nom)} ${esc(e.prenom)}')"
                    class="w-full bg-green-500 hover:bg-green-600 text-white text-sm py-2 rounded-lg transition">
                <i class="fas fa-undo mr-1"></i>Restaurer
            </button>
        </div>
    `).join('');
}

// ─── Restaurer un étudiant ───────────────────────────────────
async function confirmerRestauration(id, nom) {
    // Demander confirmation avant de restaurer
    if (!confirm(`Restaurer l'étudiant "${nom}" ?`)) return;

    const res = await restaurerEtudiant(id);

    if (res.success) {
        toast('Étudiant restauré avec succès !', 'ok');
        // Recharger la liste pour qu'il disparaisse des archives
        chargerArchives();
    } else {
        toast(res.message || 'Erreur lors de la restauration', 'err');
    }
}

// ─── Utilitaires ─────────────────────────────────────────────

// Échappe les caractères HTML (sécurité anti-XSS)
function esc(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Affiche une notification en bas à droite
function toast(msg, type = 'ok') {
    // Supprimer un toast existant
    const ancien = document.getElementById('toast');
    if (ancien) ancien.remove();

    const el = document.createElement('div');
    el.id    = 'toast';
    el.className = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg
        text-white text-sm font-medium
        ${type === 'ok' ? 'bg-green-500' : 'bg-red-500'}`;
    el.textContent = msg;
    document.body.appendChild(el);

    // Disparaît après 3,5 secondes
    setTimeout(() => el.remove(), 3500);
}