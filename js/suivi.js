// ============================================================
// Élevage+ : module « Suivi zootechnique »
// Choisir un lot, saisir des suivis, vérifier leur cohérence,
// afficher le résumé et l'historique.
// (utilise echapperHtml, défini dans lots.js)
// ============================================================

const selectLotSuivi = document.getElementById("suivi_lot_select");
const resumeSuivi = document.getElementById("suivi-resume");
const formSuivi = document.getElementById("form-suivi");
const titreFormSuivi = document.getElementById("titre-form-suivi");
const messageFormSuivi = document.getElementById("message-suivi");
const zoneInfoSuivi = document.getElementById("info-suivi");
const listeSuivis = document.getElementById("liste-suivis");
const alerteSuivi = document.getElementById("suivi-alerte");
const contenuSuivi = document.getElementById("suivi-contenu");
const btnNouveauSuivi = document.getElementById("btn-nouveau-suivi");
const btnAnnulerSuivi = document.getElementById("btn-annuler-suivi");

const CHAMPS_SUIVI = [
  "suivi_date", "suivi_vivant", "suivi_morts",
  "suivi_poids", "suivi_aliment", "suivi_observation"
];

let idLotSuivi = null;        // lot actuellement choisi
let idSuiviEnEdition = null;  // null = nouveau suivi

// ---------- Outils ----------

function trierParDate(liste) {
  return liste.slice().sort(function (a, b) {
    return a.date.localeCompare(b.date);
  });
}

// Dans une liste triée, trouve le suivi juste avant et juste après une date
function trouverVoisins(suivisTries, date) {
  let precedent = null;
  let suivant = null;
  suivisTries.forEach(function (suivi) {
    if (suivi.date < date) {
      precedent = suivi;
    }
    if (suivi.date > date && suivant === null) {
      suivant = suivi;
    }
  });
  return { precedent: precedent, suivant: suivant };
}

function lireFormulaireSuivi() {
  const valeurs = {};
  CHAMPS_SUIVI.forEach(function (champ) {
    valeurs[champ] = document.getElementById(champ).value.trim();
  });
  return valeurs;
}

// ---------- Vérification des données ----------
// Renvoie { erreurs: {champ: message}, avertissements: [messages] }

function validerSuivi(v, lot) {
  const erreurs = {};
  const avertissements = [];

  // Les autres suivis du lot (sans celui qu'on modifie), du plus ancien au plus récent
  const autres = trierParDate(lireSuivisDuLot(lot.id).filter(function (s) {
    return s.id !== idSuiviEnEdition;
  }));

  // --- Date ---
  if (v.suivi_date === "" || !estDateValide(v.suivi_date)) {
    erreurs.suivi_date = "Indiquez une date valide.";
  } else if (v.suivi_date < lot.date_mise_en_elevage) {
    erreurs.suivi_date = "La date ne peut pas être avant la mise en élevage du lot (" +
      formaterDate(lot.date_mise_en_elevage) + ").";
  } else if (autres.some(function (s) { return s.date === v.suivi_date; })) {
    erreurs.suivi_date = "Un suivi existe déjà à cette date pour ce lot. Modifiez-le plutôt.";
  }

  // --- Effectifs ---
  const vivant = Number(v.suivi_vivant);
  const morts = Number(v.suivi_morts);
  const vivantOk = v.suivi_vivant !== "" && Number.isInteger(vivant) && vivant >= 0;
  const mortsOk = v.suivi_morts !== "" && Number.isInteger(morts) && morts >= 0;

  if (!vivantOk) {
    erreurs.suivi_vivant = "Indiquez un nombre entier de poulets vivants (0 ou plus).";
  } else if (vivant > lot.effectif_initial) {
    erreurs.suivi_vivant = "L'effectif vivant (" + vivant +
      ") dépasse l'effectif initial du lot (" + lot.effectif_initial + ").";
  }
  if (!mortsOk) {
    erreurs.suivi_morts = "Indiquez un nombre entier de morts (0 si aucun).";
  }

  // --- Voisins (suivi précédent / suivant), seulement si la date est correcte ---
  let precedent = null;
  let suivant = null;
  if (!erreurs.suivi_date) {
    const voisins = trouverVoisins(autres, v.suivi_date);
    precedent = voisins.precedent;
    suivant = voisins.suivant;
  }

  // --- Cohérence des effectifs ---
  if (!erreurs.suivi_date && vivantOk && mortsOk && !erreurs.suivi_vivant) {
    const reference = precedent ? precedent.effectif_vivant : lot.effectif_initial;
    const origine = precedent
      ? "au suivi du " + formaterDate(precedent.date)
      : "au départ du lot";

    if (vivant + morts > reference) {
      erreurs.suivi_morts = "Incohérent : il y avait " + reference + " poulets " + origine +
        ". Vivants (" + vivant + ") + morts (" + morts + ") dépasse ce nombre.";
    } else if (vivant + morts < reference) {
      avertissements.push("L'effectif a diminué de " + (reference - vivant - morts) +
        " poulet(s) de plus que les morts déclarés (vente, consommation, perte ?). " +
        "Cet écart sera rapproché des ventes dans le module Ventes.");
    }

    if (suivant && suivant.effectif_vivant + suivant.morts > vivant) {
      erreurs.suivi_vivant = "Incohérent avec le suivi du " + formaterDate(suivant.date) +
        " : il faut au moins " + (suivant.effectif_vivant + suivant.morts) +
        " poulets vivants à cette date (ce suivi-là compte " + suivant.effectif_vivant +
        " vivants et " + suivant.morts + " morts).";
    }
  }

  // --- Poids moyen (en kg) ---
  const poids = Number(v.suivi_poids);
  if (v.suivi_poids === "" || isNaN(poids) || poids <= 0) {
    erreurs.suivi_poids = "Indiquez le poids moyen en kg, supérieur à 0 (ex : 0,15 pour 150 g).";
  } else if (poids > 7) {
    erreurs.suivi_poids = "Poids trop élevé pour un poulet de chair (plus de 7 kg). " +
      "Vérifiez l'unité : le poids est en kg, pas en g.";
  } else {
    if (precedent && poids < precedent.poids_moyen_kg) {
      avertissements.push("Le poids moyen (" + formaterNombre(poids, 3) +
        " kg) est inférieur à celui du suivi du " + formaterDate(precedent.date) +
        " (" + formaterNombre(precedent.poids_moyen_kg, 3) + " kg). Vérifiez la pesée.");
    }
    if (suivant && poids > suivant.poids_moyen_kg) {
      avertissements.push("Le poids moyen (" + formaterNombre(poids, 3) +
        " kg) est supérieur à celui du suivi du " + formaterDate(suivant.date) +
        " (" + formaterNombre(suivant.poids_moyen_kg, 3) + " kg). Vérifiez la pesée.");
    }
  }

  // --- Aliment (en kg) ---
  const aliment = Number(v.suivi_aliment);
  if (v.suivi_aliment === "" || isNaN(aliment) || aliment < 0) {
    erreurs.suivi_aliment = "Indiquez la quantité d'aliment en kg (0 si aucune).";
  }

  return { erreurs: erreurs, avertissements: avertissements };
}

function afficherErreursSuivi(erreurs) {
  CHAMPS_SUIVI.forEach(function (champ) {
    const zone = document.getElementById("erreur-" + champ);
    if (zone) {
      zone.textContent = erreurs[champ] || "";
    }
  });
}

// ---------- Formulaire ----------

function ouvrirFormulaireSuivi(suivi) {
  formSuivi.reset();
  afficherErreursSuivi({});
  messageFormSuivi.textContent = "";
  zoneInfoSuivi.innerHTML = "";

  if (suivi) {
    idSuiviEnEdition = suivi.id;
    titreFormSuivi.textContent = "✏️ Modifier le suivi";
    document.getElementById("suivi_date").value = suivi.date;
    document.getElementById("suivi_vivant").value = suivi.effectif_vivant;
    document.getElementById("suivi_morts").value = suivi.morts;
    document.getElementById("suivi_poids").value = suivi.poids_moyen_kg;
    document.getElementById("suivi_aliment").value = suivi.aliment_kg;
    document.getElementById("suivi_observation").value = suivi.observation || "";
  } else {
    idSuiviEnEdition = null;
    titreFormSuivi.textContent = "➕ Nouveau suivi";
  }

  formSuivi.hidden = false;
  actualiserRelectureDate("suivi_date");
  formSuivi.scrollIntoView({ behavior: "smooth" });
}

function fermerFormulaireSuivi() {
  formSuivi.hidden = true;
  idSuiviEnEdition = null;
}

// ---------- Affichage ----------

function caseIndicateur(nom, valeur) {
  return '<div class="indicateur"><span class="valeur">' + valeur +
         '</span><span class="nom">' + nom + "</span></div>";
}

function afficherResume(lot, suivis) {
  const ind = calculerIndicateurs(lot, suivis);

  let html = "<h3>📦 " + echapperHtml(lot.nom) + "</h3>" +
    '<p class="sous-titre">Mise en élevage le ' + formaterDate(lot.date_mise_en_elevage) +
    " · " + lot.effectif_initial + " poussins au départ</p>";

  if (ind.nbSuivis === 0) {
    html += '<p class="vide">Aucun suivi enregistré pour ce lot.</p>';
  } else {
    const gain = ind.gainPoids === null ? "—" : formaterNombre(ind.gainPoids, 3) + " kg";
    const gmq = ind.gmq === null ? "—" : formaterNombre(ind.gmq, 1) + " g/jour";

    html += '<div class="grille-indicateurs">' +
      caseIndicateur("Effectif vivant (dernier suivi)", ind.effectifActuel) +
      caseIndicateur("Morts cumulés", ind.mortsTotal) +
      caseIndicateur("Taux de mortalité", formaterNombre(ind.tauxMortalite, 1) + " %") +
      caseIndicateur("Poids initial (1er suivi)", formaterNombre(ind.poidsInitial, 3) + " kg") +
      caseIndicateur("Poids actuel (dernier suivi)", formaterNombre(ind.poidsActuel, 3) + " kg") +
      caseIndicateur("Gain de poids", gain) +
      caseIndicateur("GMQ", gmq) +
      caseIndicateur("Aliment consommé (cumul)", formaterNombre(ind.alimentTotal, 1) + " kg") +
      "</div>";

    html += '<p class="note-calcul">' +
      "Taux de mortalité = morts cumulés ÷ effectif initial × 100. " +
      "Gain de poids = poids du dernier suivi − poids du premier suivi (" +
      formaterDate(ind.datePremier) + "). " +
      "GMQ = gain de poids (en g) ÷ nombre de jours entre ces deux suivis." +
      (ind.nbSuivis < 2 ? " Le gain de poids et le GMQ demandent au moins deux suivis à des dates différentes." : "") +
      "</p>";
  }

  resumeSuivi.innerHTML = html;
}

function afficherListeSuivis(lot, suivis) {
  if (suivis.length === 0) {
    listeSuivis.innerHTML = '<p class="vide">Aucun suivi pour le moment.</p>';
    return;
  }

  listeSuivis.innerHTML = "";
  trierParDate(suivis).forEach(function (suivi) {
    const age = nombreDeJoursEntre(lot.date_mise_en_elevage, suivi.date);
    const carte = document.createElement("article");
    carte.className = "carte-lot";
    carte.innerHTML =
      "<h4>📅 " + formaterDate(suivi.date) + " · J" + age + "</h4>" +
      "<p><strong>Effectif vivant :</strong> " + suivi.effectif_vivant + "</p>" +
      "<p><strong>Morts depuis le suivi précédent :</strong> " + suivi.morts + "</p>" +
      "<p><strong>Poids moyen :</strong> " + formaterNombre(suivi.poids_moyen_kg, 3) +
        " kg (" + Math.round(suivi.poids_moyen_kg * 1000) + " g)</p>" +
      "<p><strong>Aliment depuis le suivi précédent :</strong> " + formaterNombre(suivi.aliment_kg, 1) + " kg</p>" +
      (suivi.observation ? "<p><strong>Observation :</strong> " + echapperHtml(suivi.observation) + "</p>" : "") +
      '<div class="actions-lot">' +
        '<button type="button" class="bouton bouton-secondaire" data-action="modifier" data-id="' + suivi.id + '">✏️ Modifier</button>' +
        '<button type="button" class="bouton bouton-danger" data-action="supprimer" data-id="' + suivi.id + '">🗑️ Supprimer</button>' +
      "</div>";
    listeSuivis.appendChild(carte);
  });
}

function afficherInfoSuivi(texteOk, avertissements) {
  let html = '<span class="message-ok">' + texteOk + "</span>";
  avertissements.forEach(function (texte) {
    html += '<br><span class="message-avert">⚠️ ' + echapperHtml(texte) + "</span>";
  });
  zoneInfoSuivi.innerHTML = html;
}

// Redessine tout le module
function rafraichirModuleSuivi() {
  if (!lireExploitation()) {
    alerteSuivi.innerHTML = 'Enregistrez d\'abord votre exploitation dans <a href="#elevage">Mon élevage</a>.';
    alerteSuivi.hidden = false;
    contenuSuivi.hidden = true;
    return;
  }

  const lots = lireLots().slice().sort(function (a, b) {
    return b.date_mise_en_elevage.localeCompare(a.date_mise_en_elevage);
  });

  if (lots.length === 0) {
    alerteSuivi.innerHTML = 'Créez d\'abord un lot dans <a href="#lots">Mes lots</a>.';
    alerteSuivi.hidden = false;
    contenuSuivi.hidden = true;
    return;
  }

  alerteSuivi.hidden = true;
  contenuSuivi.hidden = false;

  // Si le lot choisi n'existe plus (supprimé), on prend le premier
  if (!idLotSuivi || !lireLot(idLotSuivi)) {
    idLotSuivi = lots[0].id;
  }

  selectLotSuivi.innerHTML = "";
  lots.forEach(function (lot) {
    const option = document.createElement("option");
    option.value = lot.id;
    option.textContent = lot.nom + " (mise en élevage le " + formaterDate(lot.date_mise_en_elevage) + ")";
    selectLotSuivi.appendChild(option);
  });
  selectLotSuivi.value = idLotSuivi;

  const lot = lireLot(idLotSuivi);
  const suivis = lireSuivisDuLot(idLotSuivi);
  afficherResume(lot, suivis);
  afficherListeSuivis(lot, suivis);
}

// ---------- Actions de l'utilisateur ----------

selectLotSuivi.addEventListener("change", function () {
  idLotSuivi = selectLotSuivi.value;
  fermerFormulaireSuivi();
  zoneInfoSuivi.innerHTML = "";
  rafraichirModuleSuivi();
});

btnNouveauSuivi.addEventListener("click", function () {
  ouvrirFormulaireSuivi(null);
});

btnAnnulerSuivi.addEventListener("click", function () {
  fermerFormulaireSuivi();
});

// Clic sur « Modifier » ou « Supprimer » dans l'historique
listeSuivis.addEventListener("click", function (evenement) {
  const bouton = evenement.target.closest("button[data-action]");
  if (!bouton) {
    return;
  }
  const suivi = lireSuivi(bouton.dataset.id);
  if (!suivi) {
    return;
  }

  if (bouton.dataset.action === "modifier") {
    ouvrirFormulaireSuivi(suivi);
  }

  if (bouton.dataset.action === "supprimer") {
    const question = "Supprimer le suivi du " + formaterDate(suivi.date) +
      " ?\n\nCette action est irréversible.";
    if (window.confirm(question)) {
      supprimerSuivi(suivi.id);
      if (idSuiviEnEdition === suivi.id) {
        fermerFormulaireSuivi();
      }
      zoneInfoSuivi.innerHTML = "";
      rafraichirModuleSuivi();
    }
  }
});

// Clic sur « Enregistrer le suivi »
formSuivi.addEventListener("submit", function (evenement) {
  evenement.preventDefault();

  const lot = lireLot(idLotSuivi);
  if (!lot) {
    return;
  }

  const valeurs = lireFormulaireSuivi();
  const resultat = validerSuivi(valeurs, lot);
  afficherErreursSuivi(resultat.erreurs);

  if (Object.keys(resultat.erreurs).length > 0) {
    messageFormSuivi.className = "message message-erreur";
    messageFormSuivi.textContent = "⚠️ Corrigez les champs signalés en rouge.";
    return;
  }

  const base = idSuiviEnEdition ? lireSuivi(idSuiviEnEdition) : {};
  const suivi = Object.assign({}, base, {
    id: idSuiviEnEdition || "suivi-" + Date.now(),
    lot_id: lot.id,
    date: valeurs.suivi_date,
    effectif_vivant: Number(valeurs.suivi_vivant),
    morts: Number(valeurs.suivi_morts),
    poids_moyen_kg: Number(valeurs.suivi_poids),
    aliment_kg: Number(valeurs.suivi_aliment),
    observation: valeurs.suivi_observation
  });

  if (enregistrerSuivi(suivi)) {
    fermerFormulaireSuivi();
    rafraichirModuleSuivi();
    afficherInfoSuivi("✅ Suivi enregistré.", resultat.avertissements);
  } else {
    messageFormSuivi.className = "message message-erreur";
    messageFormSuivi.textContent = "❌ Enregistrement impossible. Vérifiez votre navigateur (mode privé ?).";
  }
});

// À chaque arrivée sur l'onglet « Suivi », on recharge
window.addEventListener("hashchange", function () {
  if (window.location.hash === "#suivi") {
    fermerFormulaireSuivi();
    zoneInfoSuivi.innerHTML = "";
    rafraichirModuleSuivi();
  }
});

// Au chargement de la page
rafraichirModuleSuivi();