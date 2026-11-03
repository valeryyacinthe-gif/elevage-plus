// ============================================================
// Élevage+ : gestion des dates
// Règle : stockage "AAAA-MM-JJ", affichage "JJ/MM/AAAA".
// On manipule du TEXTE (pas de conversion en heure UTC),
// donc la date affichée ne peut pas être décalée d'un jour.
// ============================================================

const NOMS_MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

const NOMS_JOURS = [
  "dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"
];

// "2026-11-01"  ->  "01/11/2026"
function formaterDate(dateIso) {
  if (!dateIso) {
    return "";
  }
  const morceaux = dateIso.split("-");
  if (morceaux.length !== 3) {
    return dateIso;
  }
  return morceaux[2] + "/" + morceaux[1] + "/" + morceaux[0];
}

// Vérifie que le texte est une vraie date "AAAA-MM-JJ" (ex : refuse 2026-02-31)
function estDateValide(dateIso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return false;
  }
  const morceaux = dateIso.split("-").map(Number);
  const annee = morceaux[0];
  const mois = morceaux[1];
  const jour = morceaux[2];
  const test = new Date(annee, mois - 1, jour);
  return test.getFullYear() === annee &&
         test.getMonth() === mois - 1 &&
         test.getDate() === jour;
}

// Nombre de jours entiers entre deux dates "AAAA-MM-JJ".
// Date.UTC sert ici uniquement de "calculatrice" pour compter les jours
// (jamais pour afficher une date), ce qui évite tout décalage horaire.
function nombreDeJoursEntre(dateDebut, dateFin) {
  const d = dateDebut.split("-").map(Number);
  const f = dateFin.split("-").map(Number);
  const msDebut = Date.UTC(d[0], d[1] - 1, d[2]);
  const msFin = Date.UTC(f[0], f[1] - 1, f[2]);
  return Math.round((msFin - msDebut) / 86400000);
}

// "2026-11-01"  ->  "dimanche 1er novembre 2026"
function dateEnToutesLettres(dateIso) {
  if (!estDateValide(dateIso)) {
    return "";
  }
  const m = dateIso.split("-").map(Number);
  // Le jour de la semaine est lu sur le calendrier local (pas en UTC)
  const jourSemaine = new Date(m[0], m[1] - 1, m[2]).getDay();
  const jour = m[2] === 1 ? "1er" : String(m[2]);
  return NOMS_JOURS[jourSemaine] + " " + jour + " " + NOMS_MOIS[m[1] - 1] + " " + m[0];
}

// ---------- Relecture automatique sous les champs date ----------

// Met à jour le texte sous un champ date, à partir de sa valeur actuelle
function actualiserRelectureDate(idChamp) {
  const champ = document.getElementById(idChamp);
  const zone = document.getElementById("relecture-" + idChamp);
  if (!champ || !zone) {
    return;
  }
  const texte = dateEnToutesLettres(champ.value);
  zone.textContent = texte ? "📅 " + texte : "";
}

// Ajoute la zone de relecture sous un champ date et la tient à jour
function brancherRelectureDate(champ) {
  const zone = document.createElement("small");
  zone.className = "relecture-date";
  zone.id = "relecture-" + champ.id;
  champ.insertAdjacentElement("afterend", zone);

  champ.addEventListener("input", function () {
    actualiserRelectureDate(champ.id);
  });
  champ.addEventListener("change", function () {
    actualiserRelectureDate(champ.id);
  });
}

// Tous les champs date de la page reçoivent la relecture (une seule fois)
document.querySelectorAll('input[type="date"]').forEach(function (champ) {
  brancherRelectureDate(champ);
});