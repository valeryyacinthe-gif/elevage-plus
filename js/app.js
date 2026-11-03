// ============================================================
// Élevage+ : navigation entre les pages (modules)
// ============================================================

// Liste des pages autorisées (doit correspondre aux id "page-..." du HTML)
const PAGES = ["accueil", "elevage", "lots", "suivi", "depenses", "ventes", "tableau"];

// Affiche la page demandée dans l'adresse (ex : ...index.html#lots)
function afficherPage() {
  // 1. Lire ce qui suit le "#" dans l'adresse
  let nom = window.location.hash.replace("#", "");

  // 2. Si la page n'existe pas (ou adresse vide), revenir à l'accueil
  if (!PAGES.includes(nom)) {
    nom = "accueil";
  }

  // 3. Montrer uniquement la page choisie
  document.querySelectorAll(".page").forEach(function (page) {
    page.classList.toggle("active", page.id === "page-" + nom);
  });

  // 4. Mettre en évidence le bon bouton de la barre du bas
  document.querySelectorAll(".nav-lien").forEach(function (lien) {
    lien.classList.toggle("active", lien.dataset.page === nom);
  });

  // 5. Remonter en haut de la page
  window.scrollTo(0, 0);
}

// Quand l'utilisateur clique sur un lien (le "#" change), on réaffiche
window.addEventListener("hashchange", afficherPage);

// Au chargement initial de la page
afficherPage();