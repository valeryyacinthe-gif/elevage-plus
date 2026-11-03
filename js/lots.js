// ============================================================
// Élevage+ : module « Mes lots »
// Créer, consulter (liste), modifier, supprimer.
// ============================================================

const formLot = document.getElementById("form-lot");
const zoneMessageLot = document.getElementById("message-lot");
const listeLots = document.getElementById("liste-lots");
const alerteLots = document.getElementById("lots-alerte");
const contenuLots = document.getElementById("lots-contenu");
const btnNouveauLot = document.getElementById("btn-nouveau-lot");
const btnAnnulerLot = document.getElementById("btn-annuler-lot");
const titreFormLot = document.getElementById("titre-form-lot");

const CHAMPS_LOT = [
  "lot_nom", "lot_souche", "lot_date", "lot_effectif",
  "lot_objectif", "lot_mode", "lot_observation"
];

// null = on crée un nouveau lot ; sinon = identifiant du lot en cours de modification
let idLotEnEdition = null;

// Empêche un texte saisi (ex : "<b>") d'être interprété comme du HTML
function echapperHtml(texte) {
  return String(texte)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------- Lecture et vérification du formulaire ----------

function lireFormulaireLot() {
  const valeurs = {};
  CHAMPS_LOT.forEach(function (champ) {
    valeurs[champ] = document.getElementById(champ).value.trim();
  });
  return valeurs;
}

function validerLot(v) {
  const erreurs = {};

  if (v.lot_nom === "") {
    erreurs.lot_nom = "Donnez un nom ou un numéro au lot (ex : Lot 001).";
  } else {
    // Deux lots ne doivent pas porter le même nom
    const doublon = lireLots().some(function (lot) {
      return lot.id !== idLotEnEdition &&
             lot.nom.toLowerCase() === v.lot_nom.toLowerCase();
    });
    if (doublon) {
      erreurs.lot_nom = "Un lot porte déjà ce nom. Choisissez un autre nom.";
    }
  }

  if (v.lot_souche === "") {
    erreurs.lot_souche = "Choisissez la souche (ou « Non précisée »).";
  }

  if (v.lot_date === "" || !estDateValide(v.lot_date)) {
    erreurs.lot_date = "Indiquez une date valide.";
  } else if (Number(v.lot_date.slice(0, 4)) < 2000) {
    erreurs.lot_date = "La date semble trop ancienne. Vérifiez l'année.";
  }

  const effectif = Number(v.lot_effectif);
  if (v.lot_effectif === "" || !Number.isInteger(effectif) || effectif < 1) {
    erreurs.lot_effectif = "Indiquez un nombre entier de poussins (au moins 1).";
  }

  if (v.lot_objectif === "") {
    erreurs.lot_objectif = "Choisissez l'objectif de production.";
  }
  if (v.lot_mode === "") {
    erreurs.lot_mode = "Choisissez le mode d'élevage.";
  }

  controlerCoherenceLot(v, erreurs);

  return erreurs;
}

function afficherErreursLot(erreurs) {
  CHAMPS_LOT.forEach(function (champ) {
    const zone = document.getElementById("erreur-" + champ);
    if (zone) {
      zone.textContent = erreurs[champ] || "";
    }
  });
}

// ---------- Ouverture / fermeture du formulaire ----------

// lot = null -> nouveau lot ; lot = objet -> modification
function ouvrirFormulaireLot(lot) {
  formLot.reset();
  afficherErreursLot({});
  zoneMessageLot.textContent = "";

  if (lot) {
    idLotEnEdition = lot.id;
    titreFormLot.textContent = "✏️ Modifier le lot";
    document.getElementById("lot_nom").value = lot.nom;
    document.getElementById("lot_souche").value = lot.souche;
    document.getElementById("lot_date").value = lot.date_mise_en_elevage;
    document.getElementById("lot_effectif").value = lot.effectif_initial;
    document.getElementById("lot_objectif").value = lot.objectif_production;
    document.getElementById("lot_mode").value = lot.mode_elevage;
    document.getElementById("lot_observation").value = lot.observation || "";
  } else {
    idLotEnEdition = null;
    titreFormLot.textContent = "➕ Nouveau lot";
  }

  formLot.hidden = false;
    actualiserRelectureDate("lot_date");
  formLot.scrollIntoView({ behavior: "smooth" });
}

function fermerFormulaireLot() {
  formLot.hidden = true;
  idLotEnEdition = null;
}

// ---------- Affichage de la liste ----------

function afficherListeLots() {
  const lots = lireLots().slice().sort(function (a, b) {
    return b.date_mise_en_elevage.localeCompare(a.date_mise_en_elevage);
  });

  if (lots.length === 0) {
    listeLots.innerHTML = '<p class="vide">Aucun lot enregistré pour le moment.</p>';
    return;
  }

  listeLots.innerHTML = "";
  lots.forEach(function (lot) {
    const carte = document.createElement("article");
    carte.className = "carte-lot";
    carte.innerHTML =
      "<h4>📦 " + echapperHtml(lot.nom) + "</h4>" +
      "<p><strong>Mise en élevage :</strong> " + formaterDate(lot.date_mise_en_elevage) + "</p>" +
      "<p><strong>Effectif initial :</strong> " + lot.effectif_initial + " poussins</p>" +
      "<p><strong>Souche :</strong> " + echapperHtml(lot.souche) + "</p>" +
      "<p><strong>Objectif :</strong> " + echapperHtml(lot.objectif_production) + "</p>" +
      "<p><strong>Mode d'élevage :</strong> " + echapperHtml(lot.mode_elevage) + "</p>" +
      (lot.observation ? "<p><strong>Observation :</strong> " + echapperHtml(lot.observation) + "</p>" : "") +
      '<div class="actions-lot">' +
        '<button type="button" class="bouton bouton-secondaire" data-action="modifier" data-id="' + lot.id + '">✏️ Modifier</button>' +
        '<button type="button" class="bouton bouton-danger" data-action="supprimer" data-id="' + lot.id + '">🗑️ Supprimer</button>' +
      "</div>";
    listeLots.appendChild(carte);
  });
}

// Affiche soit l'alerte (pas d'exploitation), soit le module complet
function rafraichirModuleLots() {
  if (!lireExploitation()) {
    alerteLots.hidden = false;
    contenuLots.hidden = true;
    return;
  }
  alerteLots.hidden = true;
  contenuLots.hidden = false;
  afficherListeLots();
}

// ---------- Actions de l'utilisateur ----------

btnNouveauLot.addEventListener("click", function () {
  ouvrirFormulaireLot(null);
});

btnAnnulerLot.addEventListener("click", function () {
  fermerFormulaireLot();
});

// Clic sur « Modifier » ou « Supprimer » dans la liste
listeLots.addEventListener("click", function (evenement) {
  const bouton = evenement.target.closest("button[data-action]");
  if (!bouton) {
    return;
  }
  const idLot = bouton.dataset.id;
  const lot = lireLot(idLot);
  if (!lot) {
    return;
  }

  if (bouton.dataset.action === "modifier") {
    ouvrirFormulaireLot(lot);
  }

  if (bouton.dataset.action === "supprimer") {
    const nbLies = compterElementsLies(idLot);
    let question = "Supprimer le lot « " + lot.nom + " » ?";
    if (nbLies > 0) {
      question += "\n\nAttention : " + nbLies +
        " enregistrement(s) lié(s) à ce lot (suivis, dépenses, ventes) seront aussi supprimés.";
    }
    question += "\n\nCette action est irréversible.";

    if (window.confirm(question)) {
      supprimerLot(idLot);
      if (idLotEnEdition === idLot) {
        fermerFormulaireLot();
      }
      rafraichirModuleLots();
    }
  }
});

// Clic sur « Enregistrer le lot »
formLot.addEventListener("submit", function (evenement) {
  evenement.preventDefault();

  const valeurs = lireFormulaireLot();
  const erreurs = validerLot(valeurs);
  afficherErreursLot(erreurs);

  if (Object.keys(erreurs).length > 0) {
    zoneMessageLot.className = "message message-erreur";
    zoneMessageLot.textContent = "⚠️ Corrigez les champs signalés en rouge.";
    return;
  }

  const exploitation = lireExploitation();
  // En modification, on part du lot existant pour ne rien perdre
  const base = idLotEnEdition ? lireLot(idLotEnEdition) : {};

  const lot = Object.assign({}, base, {
    id: idLotEnEdition || "lot-" + Date.now(),
    exploitation_id: exploitation.id,
    nom: valeurs.lot_nom,
    espece: "Poulet de chair",
    souche: valeurs.lot_souche,
    date_mise_en_elevage: valeurs.lot_date,
    effectif_initial: Number(valeurs.lot_effectif),
    objectif_production: valeurs.lot_objectif,
    mode_elevage: valeurs.lot_mode,
    observation: valeurs.lot_observation
  });

  if (enregistrerLot(lot)) {
    fermerFormulaireLot();
    rafraichirModuleLots();
  } else {
    zoneMessageLot.className = "message message-erreur";
    zoneMessageLot.textContent = "❌ Enregistrement impossible. Vérifiez votre navigateur (mode privé ?).";
  }
});

// À chaque fois qu'on arrive sur l'onglet « Lots », on rafraîchit
window.addEventListener("hashchange", function () {
  if (window.location.hash === "#lots") {
    rafraichirModuleLots();
  }
});

// Au chargement de la page
rafraichirModuleLots();


// Quand on MODIFIE un lot qui a déjà des suivis ou des ventes,
// on vérifie que la modification reste compatible avec ces données.
function controlerCoherenceLot(v, erreurs) {
  if (!idLotEnEdition) {
    return;   // nouveau lot : rien à contrôler
  }

  const suivis = lireSuivisDuLot(idLotEnEdition).slice().sort(function (a, b) {
    return a.date.localeCompare(b.date);
  });
  const ventes = lireVentesDuLot(idLotEnEdition);

  // --- La date de mise en élevage ne peut pas être après un suivi ou une vente ---
  if (!erreurs.lot_date) {
    const dates = suivis.map(function (s) { return s.date; })
      .concat(ventes.map(function (x) { return x.date; }))
      .sort();
    if (dates.length > 0 && v.lot_date > dates[0]) {
      erreurs.lot_date = "Impossible : ce lot a des suivis ou des ventes datés du " +
        formaterDate(dates[0]) + ", donc avant cette date. Modifiez-les d'abord.";
    }
  }

  // --- L'effectif initial doit rester compatible avec les morts et les ventes ---
  if (!erreurs.lot_effectif) {
    const effectif = Number(v.lot_effectif);
    let morts = 0;
    suivis.forEach(function (s) { morts += s.morts; });
    let vendus = 0;
    ventes.forEach(function (x) { vendus += x.nb_poulets; });

    if (morts + vendus > effectif) {
      erreurs.lot_effectif = "Impossible : " + morts + " mort(s) et " + vendus +
        " poulet(s) vendus sont déjà enregistrés pour ce lot.";
    } else if (suivis.length > 0 && suivis[0].effectif_vivant + suivis[0].morts > effectif) {
      erreurs.lot_effectif = "Impossible : le premier suivi (" + formaterDate(suivis[0].date) +
        ") compte " + suivis[0].effectif_vivant + " vivants et " + suivis[0].morts + " morts.";
    }
  }
}