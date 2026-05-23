const container = document.getElementById("archives-container");


// =====================================================
// CHARGER LES ARCHIVES
// =====================================================
async function loadArchives() {

    const response = await fetch("http://127.0.0.1:8000/students/archives");
    const result = await response.json();

    container.innerHTML = "";

    if (result.data.length === 0) {
        container.innerHTML = "<p>Aucun étudiant archivé.</p>";
        return;
    }

    result.data.forEach(etudiant => {

        container.innerHTML += `
            <div class="student-card">
                <h3>${etudiant.nom} ${etudiant.prenom}</h3>
                <p><strong>Numéro :</strong> ${etudiant.numero}</p>
                <p><strong>Classe :</strong> ${etudiant.classe}</p>

                <!-- bouton restaurer -->
                <button onclick="restoreStudent(${etudiant.id})">
                    🔄 Restaurer
                </button>
            </div>
        `;
    });
}


// =====================================================
// RESTAURER UN ETUDIANT
// =====================================================
async function restoreStudent(id) {

    await fetch(`http://127.0.0.1:8000/students/${id}/restore`, {
        method: "POST"
    });

    alert("Étudiant restauré !");
    loadArchives();
}


// =====================================================
// INITIAL LOAD
// =====================================================
loadArchives();