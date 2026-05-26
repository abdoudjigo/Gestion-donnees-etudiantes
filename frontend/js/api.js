/**
 * api.js — Tous les appels HTTP vers le backend FastAPI
 * Une fonction par endpoint. Retourne toujours { success, data/message }
 */

const API = 'http://127.0.0.1:8000';

// ─── Utilitaire fetch ────────────────────────────────────────
async function http(method, url, body = null) {
    try {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) opts.body = JSON.stringify(body);

        const res  = await fetch(API + url, opts);
        const data = await res.json();
        return data;
    } catch (e) {
        console.error(`[API] ${method} ${url}`, e);
        return { success: false, message: 'Erreur réseau — backend lancé ?' };
    }
}

// ─── Étudiants ───────────────────────────────────────────────

/** Liste paginée avec filtres */
function getEtudiants(page = 1, limit = 10, search = '', source = 'all', classe = 'all') {
    let url = `/students/?page=${page}&limit=${limit}`;
    if (search)                url += `&search=${encodeURIComponent(search)}`;
    if (source !== 'all')      url += `&source=${source}`;
    if (classe !== 'all')      url += `&classe=${encodeURIComponent(classe)}`;
    return http('GET', url);
}

/** Détail d'un étudiant */
function getEtudiant(id) {
    return http('GET', `/students/${id}`);
}

/** Créer un étudiant (avec matières + notes) */
function creerEtudiant(data) {
    return http('POST', '/students/', data);
}

/** Modifier un étudiant */
function modifierEtudiant(id, data) {
    return http('PUT', `/students/${id}`, data);
}

/** Archiver un étudiant */
function archiverEtudiant(id) {
    return http('DELETE', `/students/${id}`);
}

/** Restaurer un étudiant archivé */
function restaurerEtudiant(id) {
    return http('POST', `/students/${id}/restore`);
}

/** Liste des archivés */
function getArchives() {
    return http('GET', '/students/archives');
}

/** Aperçu JSON non importés */
function getJsonPreview() {
    return http('GET', '/students/json-preview');
}

/** Importer une sélection de JSON vers DB */
function importerEtudiants(numeros) {
    return http('POST', '/students/import', { numeros });
}

/** Liste des classes (pour les selects) */
function getClasses() {
    return http('GET', '/students/classes-liste');
}

/** Liste des matières */
function getMatieres() {
    return http('GET', '/students/matieres-liste');
}

// ─── Notes ───────────────────────────────────────────────────

/** Toutes les notes d'un étudiant (groupées par matière + moyennes) */
function getNotes(etudiantId) {
    return http('GET', `/students/${etudiantId}/notes`);
}

/** Ajouter ou modifier une note */
function sauvegarderNote(etudiantId, note) {
    // note = { nom_matiere, nom_evaluation, type_evaluation, valeur }
    return http('POST', `/students/${etudiantId}/notes`, note);
}

/** Supprimer une note */
function supprimerNote(etudiantId, noteId) {
    return http('DELETE', `/students/${etudiantId}/notes/${noteId}`);
}

// ─── Dashboard ───────────────────────────────────────────────

/** KPI globaux */
function getStatsGlobales() {
    return http('GET', '/dashboard/stats');
}

/** Stats par classe */
function getStatsClasses() {
    return http('GET', '/dashboard/classes');
}

/** Top 10 */
function getTop10() {
    return http('GET', '/dashboard/top10');
}

/** Répartition source */
function getRepartitionSource() {
    return http('GET', '/dashboard/repartition-source');
}