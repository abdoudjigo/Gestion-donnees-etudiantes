// =====================================================
// CHARGER LES KPI GLOBAUX
// =====================================================
async function loadStats() {

    const response = await fetch("http://127.0.0.1:8000/dashboard/stats");
    const result = await response.json();
    const data = result.data;

    document.getElementById("totalEtudiants").textContent = data.total_etudiants;
    document.getElementById("moyenneGenerale").textContent = data.moyenne_generale.toFixed(2);
    document.getElementById("totalNotes").textContent = data.total_notes;
}


// =====================================================
// GRAPHIQUE MOYENNE PAR CLASSE
// =====================================================
async function loadChartClasses() {

    const response = await fetch("http://127.0.0.1:8000/dashboard/classes");
    const result = await response.json();
    const data = result.data;

    // extraire labels et valeurs
    const labels = data.map(d => d.classe);
    const moyennes = data.map(d => d.moyenne);

    new Chart(document.getElementById("chartClasses"), {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Moyenne par classe",
                data: moyennes,
                backgroundColor: "rgba(54, 162, 235, 0.7)"
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 20
                }
            }
        }
    });
}


// =====================================================
// GRAPHIQUE TOP 10
// =====================================================
async function loadChartTop10() {

    const response = await fetch("http://127.0.0.1:8000/dashboard/top10");
    const result = await response.json();
    const data = result.data;

    // nom + prénom comme label
    const labels = data.map(d => `${d.nom} ${d.prenom}`);
    const moyennes = data.map(d => d.moyenne);

    new Chart(document.getElementById("chartTop10"), {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Moyenne",
                data: moyennes,
                backgroundColor: "rgba(255, 99, 132, 0.7)"
            }]
        },
        options: {
            indexAxis: "y",  // horizontal
            scales: {
                x: {
                    beginAtZero: true,
                    max: 20
                }
            }
        }
    });
}


// =====================================================
// INITIAL LOAD
// =====================================================
loadStats();
loadChartClasses();
loadChartTop10();