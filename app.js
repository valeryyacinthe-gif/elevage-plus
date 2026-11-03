// Fonction pour basculer entre les modules
function showModule(moduleName) {
    // 1. Masquer toutes les sections
    const sections = document.querySelectorAll('.module-section');
    sections.forEach(section => {
        section.classList.add('hidden');
    });

    // 2. Enlever la classe 'active' de tous les boutons de navigation
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(button => {
        button.classList.remove('active');
    });

    // 3. Afficher la section demandée
    const targetSection = document.getElementById(`module-${moduleName}`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // 4. Mettre en surbrillance le bouton actif
    const activeBtn = Array.from(buttons).find(btn => 
        btn.getAttribute('onclick').includes(`'${moduleName}'`)
    );
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// S'assurer que le module d'accueil est affiché au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    showModule('home');
    console.log("Élevage+ est prêt et fonctionnel !");
});