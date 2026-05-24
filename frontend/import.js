let jsonData = [];


// =====================================================
// CHARGER LES DONNÉES JSON NON IMPORTÉES
// =====================================================
async function loadJsonPreview() {

    const response = await fetch("http://127.0.0.1:8000/students/json-preview");
    const result = await response.json();

    const container = document.getElementById("import-container");
    const info = document.getElementById("importInfo");
    const btn = document.getElementById("importBtn");

    jsonData = result.data;

    if (jsonData.length === 0) {
        info.textContent = "✅ Toutes les données JSON sont déjà importées en base.";
        return;
    }

    info.textContent = `${jsonData.length} étudiant(s) disponible(s) pour import.`;
    btn.style.display = "block";

    jsonData.forEach((etudiant, index) => {

        container.innerHTML += `
            <div class="student-card">
                <input type="checkbox" id="check-${index}" value="${index}">
                <label for="check-${index}">
                    <strong>${etudiant.nom} ${etudiant.prenom}</strong>
                    — ${etudiant.classe} — ${etudiant.numero}
                </label>
            </div>
        `;
    });
}


// =====================================================
// IMPORTER LA SELECTION
// =====================================================
document.getElementById("importBtn").addEventListener("click", async () => {

    const checkboxes = document.querySelectorAll("input[type=checkbox]:checked");

    if (checkboxes.length === 0) {
        alert("Sélectionne au moins un étudiant.");
        return;
    }

    for (const cb of checkboxes) {
        const etudiant = jsonData[cb.value];

        await fetch("http://127.0.0.1:8000/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                source : "JSON",
                code: etudiant.code || "JSON_IMPORT",
                nom: etudiant.nom,
                prenom: etudiant.prenom,
                numero: etudiant.numero,
                date_naissance: "2000-01-01",
                classe: etudiant.classe
            })
        });
    }

    alert(`${checkboxes.length} étudiant(s) importé(s) !`);
    loadJsonPreview();
});


// =====================================================
// INITIAL LOAD
// =====================================================
loadJsonPreview();