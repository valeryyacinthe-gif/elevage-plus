// ============================================================
// Élevage+ : tableau de bord
// Ne stocke RIEN : tout est recalculé à partir des autres modules.
// (utilise caseIndicateur de suivi.js, nomDuLot de depenses.js,
//  echapperHtml de lots.js)
// ============================================================

const selectVueTab = document.getElementById("tab_vue");
const zoneTab = document.getElementById("tab-resultat");
const alerteTab = document.getElementById("tab-alerte");
const contenuTab = document.getElementById("tab-contenu");

let vueTab = "elevage";   // "elevage" ou "lot:<identifiant>"

// ---------- Outils d'affichage ----------

function classeSigne(montant) {
  return montant >= 0 ? "positif" : "negatif";
}

function ligneEco(libelle, valeurTexte, classe, fort) {
  return '<div class="ligne-eco' + (fort ? " fort" : "") + '"><span>' + libelle +
         '</span><span class="' + (classe || "") + '">' + valeurTexte + "</span></div>";
}

function grilleIndicateurs(cases) {
  return '<div class="grille-indicateurs">' + cases.join("") + "</div>";
}

function htmlLexique() {
  return '<details class="lexique"><summary>ℹ️ Comprendre ces mots</summary>' +
    "<p><strong>Chiffre d'affaires</strong> : total des ventes (quantité × prix), avant toute déduction.</p>" +
    "<p><strong>Coût</strong> : ce que coûte la production. Ici : les dépenses enregistrées, sans répartition des charges communes.</p>" +
    "<p><strong>Marge sur coûts directs</strong> : chiffre d'affaires − dépenses directes des lots. C'est ce qui reste pour payer les charges communes.</p>" +
    "<p><strong>Résultat</strong> : chiffre d'affaires − dépenses, sur un périmètre et une période donnés. Il peut être négatif, et il est provisoire tant que le lot n'est pas terminé.</p>" +
    "<p><strong>Bénéfice</strong> : ce qui reste après TOUTES les charges, y compris le travail de l'éleveur et l'usure du matériel et des bâtiments. Le résultat affiché ici n'est donc pas un bénéfice.</p>" +
    "<p><strong>Rentabilité</strong> : rapport entre ce qu'on gagne et ce qu'on a investi, comparé dans le temps ou à une autre activité. Un seul résultat ne suffit pas à la mesurer.</p>" +
    "</details>";
}

// ---------- Vue d'un lot ----------

function htmlVueLot(lot) {
  const suivis = lireSuivisDuLot(lot.id);
  const depensesLot = lireDepenses().filter(function (d) {
    return d.portee === "lot" && d.lot_id === lot.id;
  });
  const ventesLot = lireVentesDuLot(lot.id);

  const s = calculerSyntheseLot(lot, suivis, depensesLot, ventesLot);
  const e = s.effectif;
  const ind = s.indicateurs;

  // 1. Situation du lot
  let html = '<div class="resume-lot"><h3>📦 Situation du lot</h3>' +
    '<p class="sous-titre">' + echapperHtml(lot.nom) + " · mise en élevage le " +
    formaterDate(lot.date_mise_en_elevage) + "</p>" +
    grilleIndicateurs([
      caseIndicateur("Effectif initial", e.initial),
      caseIndicateur("Morts cumulés", e.morts),
      caseIndicateur("Poulets vendus", e.vendus),
      caseIndicateur("Effectif actuel estimé", e.restants)
    ]) +
    '<p class="note-calcul">Effectif actuel estimé = effectif initial − morts − poulets vendus ' +
    "(sans autre perte supposée). " +
    (ind.nbSuivis > 0
      ? "Dernier suivi : " + ind.effectifActuel + " vivants le " + formaterDate(ind.dateDernier) + "."
      : "Aucun suivi enregistré : les morts ne sont pas connus.") +
    "</p></div>";

  // 2. Performances
  html += '<div class="resume-lot"><h3>⚖️ Performances zootechniques</h3>';
  if (ind.nbSuivis === 0) {
    html += '<p class="vide">Aucun suivi enregistré : indicateurs indisponibles. Renseignez le module Suivi.</p>';
  } else {
    const age = nombreDeJoursEntre(lot.date_mise_en_elevage, ind.dateDernier);
    const gain = ind.gainPoids === null ? "—" : formaterNombre(ind.gainPoids, 3) + " kg";
    const gmq = ind.gmq === null ? "—" : formaterNombre(ind.gmq, 1) + " g/jour";
    html += grilleIndicateurs([
      caseIndicateur("Taux de mortalité", formaterNombre(ind.tauxMortalite, 1) + " %"),
      caseIndicateur("Âge au dernier suivi", "J" + age),
      caseIndicateur("Poids initial (1er suivi)", formaterNombre(ind.poidsInitial, 3) + " kg"),
      caseIndicateur("Poids actuel (dernier suivi)", formaterNombre(ind.poidsActuel, 3) + " kg"),
      caseIndicateur("Gain de poids", gain),
      caseIndicateur("GMQ", gmq),
      caseIndicateur("Aliment consommé (cumul)", formaterNombre(ind.alimentTotal, 1) + " kg")
    ]) +
    '<p class="note-calcul">Poids initial = poids du premier suivi (' + formaterDate(ind.datePremier) +
    "). Le GMQ est un GMQ global : la croissance du poulet de chair n'est pas linéaire, " +
    "il doit être interprété avec l'âge du lot.</p>";
  }
  html += "</div>";

  // 3. Situation économique
  html += '<div class="resume-lot"><h3>💰 Situation économique du lot</h3>' +
    ligneEco("Chiffre d'affaires (ventes du lot)", formaterMontant(s.chiffreAffaires) + " FCFA") +
    ligneEco("− Dépenses du lot", formaterMontant(s.depensesTotal) + " FCFA") +
    ligneEco("= Résultat du lot (avant charges communes)",
             formaterMontantSigne(s.resultat) + " FCFA", classeSigne(s.resultat), true);
  if (s.partAliment !== null) {
    html += ligneEco("Part de l'aliment dans les dépenses du lot", formaterNombre(s.partAliment, 1) + " %");
  }

  // Lecture : aide à l'interprétation
  const lecture = [];
  if (e.restants > 0) {
    lecture.push("Lot en cours : environ " + e.restants +
      " poulet(s) restent à vendre. Le résultat est provisoire.");
  } else {
    lecture.push("Tous les poulets du lot sont vendus ou morts : le résultat est final, avant charges communes.");
  }
  if (s.depensesTotal === 0) {
    lecture.push("Aucune dépense n'est enregistrée pour ce lot : le résultat n'est pas interprétable.");
  }
  if (s.chiffreAffaires === 0) {
    lecture.push("Aucune vente n'est enregistrée pour ce lot.");
  }
  if (s.partAliment !== null) {
    lecture.push("L'aliment représente " + formaterNombre(s.partAliment, 1) +
      " % des dépenses du lot : c'est un levier important pour améliorer le résultat.");
  }
  lecture.push("Ce résultat ne comprend ni les charges communes de l'élevage, ni la rémunération du travail " +
    "de l'éleveur : ce n'est pas une mesure complète de rentabilité.");

  html += '<div class="lecture"><strong>Lecture</strong>';
  lecture.forEach(function (phrase) {
    html += "<p>" + phrase + "</p>";
  });
  html += "</div></div>";

  return html;
}

// ---------- Vue de tout l'élevage ----------

function htmlVueElevage(lots) {
  const r = calculerSyntheseElevage(lots, chargerDonnees().suivis, lireDepenses(), lireVentes());

  // 1. Situation générale
  let html = '<div class="resume-lot"><h3>🐔 Situation de l\'élevage de poulets</h3>' +
    grilleIndicateurs([
      caseIndicateur("Nombre de lots", r.nbLots),
      caseIndicateur("Effectif initial (tous lots)", r.effectifInitial),
      caseIndicateur("Morts cumulés", r.morts),
      caseIndicateur("Poulets vendus", r.vendus),
      caseIndicateur("Effectif actuel estimé", r.restants),
      caseIndicateur("Mortalité globale",
        r.tauxMortaliteGlobal === null ? "—" : formaterNombre(r.tauxMortaliteGlobal, 1) + " %")
    ]) +
    '<p class="note-calcul">La mortalité globale ne tient compte que des lots qui ont au moins un suivi.</p></div>';

  // 2. Comparaison des lots
  html += '<div class="resume-lot"><h3>📋 Comparaison des lots</h3>' +
    '<div class="tableau-defilant"><table class="tableau-lots"><thead><tr>' +
    "<th>Lot</th><th>Mortalité</th><th>GMQ</th><th>Dépenses</th><th>CA</th><th>Résultat</th>" +
    "</tr></thead><tbody>";

  r.lignes
    .slice()
    .sort(function (a, b) {
      return b.lot.date_mise_en_elevage.localeCompare(a.lot.date_mise_en_elevage);
    })
    .forEach(function (ligne) {
      const s = ligne.synthese;
      const ind = s.indicateurs;
      html += "<tr>" +
        "<td>" + echapperHtml(ligne.lot.nom) + "</td>" +
        "<td>" + (ind.nbSuivis > 0 ? formaterNombre(ind.tauxMortalite, 1) + " %" : "—") + "</td>" +
        "<td>" + (ind.gmq !== null ? formaterNombre(ind.gmq, 1) + " g/j" : "—") + "</td>" +
        "<td>" + formaterMontant(s.depensesTotal) + "</td>" +
        "<td>" + formaterMontant(s.chiffreAffaires) + "</td>" +
        '<td class="' + classeSigne(s.resultat) + '">' + formaterMontantSigne(s.resultat) + "</td>" +
        "</tr>";
    });

  html += "</tbody></table></div>" +
    '<p class="note-calcul">Montants en FCFA. Résultat d\'un lot = CA − dépenses du lot, avant charges communes. ' +
    "Les lots sont comparables surtout à âge égal.</p></div>";

  // 3. Situation économique de l'élevage
  html += '<div class="resume-lot"><h3>💰 Situation économique de l\'élevage</h3>' +
    ligneEco("Chiffre d'affaires des ventes de lots", formaterMontant(r.caLots) + " FCFA") +
    ligneEco("− Dépenses directes des lots", formaterMontant(r.depensesLots) + " FCFA") +
    ligneEco("= Marge sur coûts directs", formaterMontantSigne(r.margeDirecte) + " FCFA",
             classeSigne(r.margeDirecte), true) +
    ligneEco("− Dépenses de l'élevage (charges communes)", formaterMontant(r.depensesElevage) + " FCFA") +
    ligneEco("= Résultat de l'élevage de poulets", formaterMontantSigne(r.resultat) + " FCFA",
             classeSigne(r.resultat), true) +
    '<p class="titre-repartition">Hors résultat (affichés à part)</p>' +
    ligneEco("Dépenses générales", formaterMontant(r.depensesGenerales) + " FCFA") +
    ligneEco("Ventes générales", formaterMontant(r.caGeneral) + " FCFA");

  const lecture = [];
  if (r.restants > 0) {
    lecture.push("Des lots sont encore en cours : environ " + r.restants +
      " poulet(s) restent à vendre. Le résultat est provisoire.");
  }
  lecture.push("Les dépenses et ventes générales ne sont pas comptées dans le résultat de l'élevage de poulets.");
  lecture.push("Ce résultat ne comprend pas la rémunération du travail de l'éleveur ni l'usure du matériel " +
    "et des bâtiments : ce n'est ni un bénéfice, ni une mesure complète de rentabilité.");

  html += '<div class="lecture"><strong>Lecture</strong>';
  lecture.forEach(function (phrase) {
    html += "<p>" + phrase + "</p>";
  });
  html += "</div></div>";

  return html;
}

// ---------- Affichage général ----------

function rafraichirTableau() {
  if (!lireExploitation()) {
    alerteTab.innerHTML = 'Enregistrez d\'abord votre exploitation dans <a href="#elevage">Mon élevage</a>.';
    alerteTab.hidden = false;
    contenuTab.hidden = true;
    return;
  }

  const lots = lireLots().slice().sort(function (a, b) {
    return b.date_mise_en_elevage.localeCompare(a.date_mise_en_elevage);
  });

  if (lots.length === 0) {
    alerteTab.innerHTML = 'Créez d\'abord un lot dans <a href="#lots">Mes lots</a>.';
    alerteTab.hidden = false;
    contenuTab.hidden = true;
    return;
  }

  alerteTab.hidden = true;
  contenuTab.hidden = false;

  // Liste des vues possibles
  selectVueTab.innerHTML = "";
  const optionElevage = document.createElement("option");
  optionElevage.value = "elevage";
  optionElevage.textContent = "Tout l'élevage de poulets (tous les lots)";
  selectVueTab.appendChild(optionElevage);
  lots.forEach(function (lot) {
    const option = document.createElement("option");
    option.value = "lot:" + lot.id;
    option.textContent = "Lot : " + lot.nom;
    selectVueTab.appendChild(option);
  });

  // Si le lot choisi n'existe plus, on revient à la vue générale
  if (vueTab !== "elevage" && !lireLot(vueTab.replace("lot:", ""))) {
    vueTab = "elevage";
  }
  selectVueTab.value = vueTab;

  if (vueTab === "elevage") {
    zoneTab.innerHTML = htmlVueElevage(lots) + htmlLexique();
  } else {
    zoneTab.innerHTML = htmlVueLot(lireLot(vueTab.replace("lot:", ""))) + htmlLexique();
  }
}

selectVueTab.addEventListener("change", function () {
  vueTab = selectVueTab.value;
  rafraichirTableau();
});

// À chaque arrivée sur l'onglet « Bilan », on recalcule
window.addEventListener("hashchange", function () {
  if (window.location.hash === "#tableau") {
    rafraichirTableau();
  }
});

// Au chargement de la page
rafraichirTableau();