let currentPage = 1;
const limit = 5;

const container = document.getElementById("students-container");
const searchInput = document.getElementById("searchInput");


// =====================================================
// CHARGER LES ETUDIANTS
// =====================================================
async function loadStudents(search = "", page = 1) {

    let url = `http://127.0.0.1:8000/students?page=${page}&limit=${limit}`;

    if (search) {
        url += `&search=${search}`;
    }

    const response = await fetch(url);
    const result = await response.json();

    container.innerHTML = "";

    result.data.forEach(etudiant => {

        const badgeClass = etudiant.source === "DB" ? "badge-db" : "badge-json";
        const editBtn = etudiant.editable 
            ? `<button onclick="archiveStudent(${etudiant.id})">Archiver</button>`
            : `<span style="font-size:12px; color:#999;">Lecture seule</span>`;

        container.innerHTML += `
            <div class="student-card">
                <h3 
                    ondblclick="${etudiant.editable ? `editField(this, ${etudiant.id}, 'nom')` : ''}"
                >${etudiant.nom}</h3>
                <h3 
                    ondblclick="${etudiant.editable ? `editField(this, ${etudiant.id}, 'prenom')` : ''}"
                >${etudiant.prenom}</h3>
                <p><strong>Numéro :</strong> ${etudiant.numero}</p>
                <p><strong>Classe :</strong> ${etudiant.classe}</p>
                <p><strong>Moyenne :</strong> ${etudiant.moyenne?.toFixed(2) ?? "N/A"}</p>
                <span class="badge ${badgeClass}">${etudiant.source}</span>
                <div style="margin-top: 10px;">
                    ${editBtn}
                </div>
            </div>
         `;
    });

    // update UI pagination
    document.getElementById("pageInfo").textContent = `Page ${page}`;
    document.getElementById("btnPrev").disabled = page === 1;

    // si moins de résultats que limit → pas de next page
    document.getElementById("btnNext").disabled = result.data.length < limit;
}


// =====================================================
// BOUTON PRECEDENT
// =====================================================
document.getElementById("btnPrev").addEventListener("click", () => {

    if (currentPage > 1) {
        currentPage--;
        loadStudents(searchInput.value, currentPage);
    }
});


// =====================================================
// BOUTON SUIVANT
// =====================================================
document.getElementById("btnNext").addEventListener("click", () => {

    currentPage++;
    loadStudents(searchInput.value, currentPage);
});


// =====================================================
// RECHERCHE LIVE
// =====================================================
searchInput.addEventListener("input", (e) => {

    currentPage = 1;
    loadStudents(e.target.value, currentPage);
});

document.getElementById("addBtn").addEventListener("click", async () => {

    const student = {
        code: "MANUAL_" + Date.now(),
        nom: document.getElementById("nom").value,
        prenom: document.getElementById("prenom").value,
        numero: document.getElementById("numero").value,
        date_naissance: "2000-01-01",
        classe: document.getElementById("classe").value
    };

    await fetch("http://127.0.0.1:8000/students", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(student)
    });

    alert("Étudiant ajouté");

    loadStudents();
});


async function archiveStudent(id) {

    await fetch(`http://127.0.0.1:8000/students/${id}`, {
        method: "DELETE"
    });

    alert("Étudiant archivé");

    loadStudents(); // refresh liste
}
async function loadDashboard() {

    const response = await fetch("http://127.0.0.1:8000/dashboard/stats");
    const result = await response.json();

    const data = result.data;

    document.getElementById("totalEtudiants").textContent = data.total_etudiants;
    document.getElementById("moyenneGenerale").textContent = data.moyenne_generale.toFixed(2);
    document.getElementById("totalNotes").textContent = data.total_notes;
}


// =====================================================
// MODIFICATION INLINE (double-clic)
// Entrée = sauvegarder
// Échap = annuler
// =====================================================
function editField(element, id, field) {

    const ancienneValeur = element.textContent;

    // transformer en champ éditable
    element.innerHTML = `<input 
        type="text" 
        value="${ancienneValeur}" 
        id="input-${id}-${field}"
    >`;

    const input = document.getElementById(`input-${id}-${field}`);
    input.focus();

    // Entrée = sauvegarder
    input.addEventListener("keydown", async (e) => {

        if (e.key === "Enter") {

            const nouvelleValeur = input.value;

            await fetch(`http://127.0.0.1:8000/students/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nom: field === "nom" ? nouvelleValeur : ancienneValeur,
                    prenom: field === "prenom" ? nouvelleValeur : ancienneValeur,
                    classe: element.closest(".student-card")
                            .querySelector("p:nth-child(4)")
                            .textContent.replace("Classe : ", "").trim()
                })
            });

            // refresh
            loadStudents(searchInput.value, currentPage);
        }

        // Échap = annuler
        if (e.key === "Escape") {
            element.textContent = ancienneValeur;
        }
    });
}

// =====================================================
// INITIAL LOAD
// =====================================================
loadStudents();
loadDashboard();
