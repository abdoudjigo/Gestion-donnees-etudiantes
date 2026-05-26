/**
 * dashboard.js — Logique de la page dashboard.html
 *
 * Affiche :
 *  - Les KPI (cartes de chiffres clés)
 *  - Graphique : moyenne par classe (barres)
 *  - Graphique : Top 10 étudiants (barres horizontales)
 *  - Graphique : Répartition DB / JSON (camembert)
 */

// On attend que la page soit complètement chargée
document.addEventListener('DOMContentLoaded', () => {
    chargerDashboard();
});

// ─── Fonction principale ─────────────────────────────────────
async function chargerDashboard() {
    // On charge tout en parallèle pour aller plus vite
    const [resStats, resClasses, resTop10, resSource] = await Promise.all([
        getStatsGlobales(),
        getStatsClasses(),
        getTop10(),
        getRepartitionSource()
    ]);

    // Afficher chaque section si la réponse est ok
    if (resStats.success)   afficherKPI(resStats.data);
    if (resClasses.success) afficherGraphiqueClasses(resClasses.data);
    if (resTop10.success)   afficherTop10(resTop10.data);
    if (resSource.success)  afficherRepartition(resSource.data);
}

// ─── KPI : cartes de chiffres clés ──────────────────────────
function afficherKPI(data) {
    // On met à jour chaque carte avec les données reçues du backend
    setTexte('kpi-total',    data.total_etudiants);
    setTexte('kpi-db',       data.total_db);
    setTexte('kpi-archives', data.total_archives);

    // Moyenne générale : on colorise selon le résultat
    const moyEl = document.getElementById('kpi-moyenne');
    if (moyEl) {
        moyEl.textContent = data.moyenne_generale + ' / 20';
        moyEl.className   = 'text-3xl font-bold ' +
            (data.moyenne_generale >= 10 ? 'text-green-600' : 'text-red-500');
    }
}

// ─── Graphique : moyenne par classe ─────────────────────────
function afficherGraphiqueClasses(data) {
    const canvas = document.getElementById('graphiqueClasses');
    if (!canvas) return;

    // Si aucune donnée, afficher un message
    if (!data || data.length === 0) {
        canvas.parentElement.innerHTML +=
            '<p class="text-gray-400 text-sm text-center mt-2">Aucune donnée disponible</p>';
        return;
    }

    // Préparer les labels (noms des classes) et les valeurs (moyennes)
    const labels   = data.map(c => c.classe);
    const moyennes = data.map(c => c.moyenne);
    const effectifs = data.map(c => c.nb_etudiants);

    // Couleurs des barres : vert si moy >= 10, orange sinon
    const couleurs = moyennes.map(m => m >= 10
        ? 'rgba(34, 197, 94, 0.8)'   // vert
        : 'rgba(249, 115, 22, 0.8)'  // orange
    );

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Moyenne /20',
                    data: moyennes,
                    backgroundColor: couleurs,
                    borderRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'Nb étudiants',
                    data: effectifs,
                    backgroundColor: 'rgba(99, 102, 241, 0.5)',
                    borderRadius: 6,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        // Personnaliser l'info-bulle
                        label: ctx => ctx.datasetIndex === 0
                            ? ` Moyenne : ${ctx.raw}/20`
                            : ` Étudiants : ${ctx.raw}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 20,
                    position: 'left',
                    title: { display: true, text: 'Moyenne /20' }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    grid: { drawOnChartArea: false }, // pas de grille pour le 2e axe
                    title: { display: true, text: 'Nb étudiants' }
                }
            }
        }
    });
}

// ─── Graphique : Top 10 étudiants ────────────────────────────
function afficherTop10(data) {
    const canvas = document.getElementById('graphiqueTop10');
    if (!canvas) return;

    if (!data || data.length === 0) {
        canvas.parentElement.innerHTML +=
            '<p class="text-gray-400 text-sm text-center mt-2">Aucune donnée disponible</p>';
        return;
    }

    // Construire les labels : "Prénom NOM (Classe)"
    const labels   = data.map(e => `${e.prenom} ${e.nom} (${e.classe || '?'})`);
    const moyennes = data.map(e => e.moyenne_generale);

    // Dégradé de couleurs du vert foncé au vert clair selon le rang
    const couleurs = moyennes.map((_, i) => {
        const intensite = Math.round(255 - i * 20); // plus foncé pour les premiers
        return `rgba(34, ${intensite}, 94, 0.75)`;
    });

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Moyenne générale /20',
                data: moyennes,
                backgroundColor: couleurs,
                borderRadius: 6
            }]
        },
        options: {
            // Barres horizontales
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.raw}/20`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 20,
                    title: { display: true, text: 'Moyenne /20' }
                }
            }
        }
    });
}

// ─── Graphique : Répartition DB / JSON ───────────────────────
function afficherRepartition(data) {
    const canvas = document.getElementById('graphiqueSource');
    if (!canvas) return;

    // nb_db = étudiants en base, total_db = total actifs en base
    // On n'a pas le nombre JSON ici (ils viennent du fichier)
    // On affiche juste les DB actifs vs archivés pour illustration
    const nbDb      = data.db      || 0;
    const nbArchives = data.total_archives || 0;

    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Actifs (DB)', 'Archivés'],
            datasets: [{
                data: [nbDb, nbArchives],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',   // vert pour actifs
                    'rgba(239, 68, 68, 0.7)',    // rouge pour archivés
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label} : ${ctx.raw} étudiant(s)`
                    }
                }
            }
        }
    });
}

// ─── Utilitaire : mettre à jour le texte d'un élément ────────
function setTexte(id, valeur) {
    const el = document.getElementById(id);
    if (el) el.textContent = valeur ?? '—';
}