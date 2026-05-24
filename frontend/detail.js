// récupérer l'id depuis l'URL
const params = new URLSearchParams(window.location.search);
const studentId = params.get("id");


// =====================================================
// CHARGER LE DETAIL ETUDIANT
// =====================================================
async function loadDetail() {

    const response = await fetch(`http://127.0.0.1:8000/students/${studentId}`);
    const result = await response.json();
    const e = result.data;

    document.getElementById("etudiantNom").textContent = `${e.nom} ${e.prenom}`;
    document.getElementById("etudiantInfo").textContent = 
        `Numéro : ${e.numero} — Classe : ${e.classe}`;

    const container = document.getElementById("notes-container");
    container.innerHTML = "";

    if (e.notes.length === 0) {
        container.innerHTML = "<p>Aucune note enregistrée.</p>";
        return;
    }

    // grouper par matière
    const parMatiere = {};
    e.notes.forEach(n => {
        if (!parMatiere[n.matiere]) parMatiere[n.matiere] = [];
        parMatiere[n.matiere].push(n);
    });

    for (const [matiere, notes] of Object.entries(parMatiere)) {
        let html = `<div class="student-card"><h3>${matiere}</h3>`;
        notes.forEach(n => {
            html += `<p><strong>${n.evaluation}</strong> (${n.type}) : ${n.valeur}/20</p>`;
        });
        html += `</div>`;
        container.innerHTML += html;
    }
}


// =====================================================
// AJOUTER UNE NOTE
// =====================================================
document.getElementById("addNoteBtn").addEventListener("click", async () => {

    const note = {
        matiere: document.getElementById("matiere").value,
        nom_evaluation: document.getElementById("nom_evaluation").value,
        type_evaluation: document.getElementById("type_evaluation").value,
        valeur: parseFloat(document.getElementById("valeur").value)
    };

    if (!note.nom_evaluation || isNaN(note.valeur)) {
        alert("Remplis tous les champs.");
        return;
    }

    await fetch(`http://127.0.0.1:8000/students/${studentId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note)
    });

    alert("Note ajoutée !");
    loadDetail();
});


// =====================================================
// INITIAL LOAD
// =====================================================
loadDetail();