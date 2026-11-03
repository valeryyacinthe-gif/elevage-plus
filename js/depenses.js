// ============================================================
// Élevage+ : module « Dépenses »
// Créer, modifier, supprimer, filtrer, et totaliser les dépenses.
// (utilise echapperHtml, défini dans lots.js)
// ============================================================

const formDep = document.getElementById("form-dep");
const titreFormDep = document.getElementById("titre-form-dep");
const messageFormDep = document.getElementById("message-dep");
const zoneInfoDep = document.getElementById("info-dep");
const listeDep = document.getElementById("liste-dep");
const resumeDep = document.getElementById("dep-resume");
const alerteDep = document.getElementById("dep-alerte");
const contenuDep = document.getElementById("dep-contenu");
const btnNouvelleDep = document.getElementById("btn-nouvelle-dep");
const btnAnnulerDep = document.getElementById("btn-annuler-dep");
const selectFiltreDep = document.getElementById("dep_filtre");
const selectPorteeDep = document.getElementById("dep_portee");
const selectLotDep = document.getElementById("dep_lot");
const groupeLotDep = document.getElementById("groupe-dep-lot");
const champMontantDep = document.getElementById("dep_montant");
const relectureMontant = document.getElementById("relecture-montant");

const CHAMPS_DEP = [
  "dep_date", "dep_categorie", "dep_description", "dep_montant",
  "dep_portee", "dep_lot", "dep_observation"
];

// Catégories qui concernent en général un lot précis
const CATEGORIES_LOT = ["Aliment", "Médicaments / soins vétérinaires", "Achat d'animaux"];
// Investissements durables : plutôt à rattacher à l'élevage
const CATEGORIES_ELEVAGE = ["Construction / aménagement", "Matériel / équipement"];

let idDepEnEdition = null;   // null = nouvelle dépense
let filtreDep = "toutes";    // filtre d'affichage choisi

// ---------- Outils ----------

function nomDuLot(idLot) {
  const lot = lireLot(idLot);
  return lot ? lot.nom : "Lot supprimé";
}

function libellePortee(depense) {
  if (depense.portee === "lot") {
    return nomDuLot(depense.lot_id);
  }
  if (depense.portee === "elevage") {
    return "Élevage (non lié à un lot)";
  }
  return "Dépense générale";
}

function lireFormulaireDep() {
  const valeurs = {};
  CHAMPS_DEP.forEach(function (champ) {
    valeurs[champ] = document.getElementById(champ).value.trim();
  });
  return valeurs;
}

// Montant écrit lisiblement sous le champ (ex : 1 500 000 FCFA)
function actualiserRelectureMontant() {
  const montant = Number(champMontantDep.value);
  if (champMontantDep.value !== "" && Number.isInteger(montant) && montant > 0) {
    relectureMontant.textContent = "💰 " + formaterMontant(montant) + " FCFA";
  } else {
    relectureMontant.textContent = "";
  }
}

// Le choix du lot n'apparaît que si la dépense est liée à un lot
function majGroupeLotDep() {
  groupeLotDep.hidden = selectPorteeDep.value !== "lot";
}

function remplirSelectLotsDep() {
  const lots = lireLots().slice().sort(function (a, b) {
    return b.date_mise_en_elevage.localeCompare(a.date_mise_en_elevage);
  });

  selectLotDep.innerHTML = "";
  const vide = document.createElement("option");
  vide.value = "";
  vide.textContent = lots.length === 0
    ? "Aucun lot : créez-en un dans Mes lots"
    : "-- Choisir un lot --";
  selectLotDep.appendChild(vide);

  lots.forEach(function (lot) {
    const option = document.createElement("option");
    option.value = lot.id;
    option.textContent = lot.nom;
    selectLotDep.appendChild(option);
  });
}

// ---------- Vérification des données ----------
// Renvoie { erreurs: {champ: message}, avertissements: [messages] }

function validerDepense(v) {
  const erreurs = {};
  const avertissements = [];

  if (v.dep_date === "" || !estDateValide(v.dep_date)) {
    erreurs.dep_date = "Indiquez une date valide.";
  } else if (Number(v.dep_date.slice(0, 4)) < 2000) {
    erreurs.dep_date = "La date semble trop ancienne. Vérifiez l'année.";
  }

  if (v.dep_categorie === "") {
    erreurs.dep_categorie = "Choisissez une catégorie.";
  }

  if (v.dep_description === "") {
    erreurs.dep_description = "Décrivez brièvement la dépense (ex : 2 sacs d'aliment).";
  }

  const montant = Number(v.dep_montant);
  if (v.dep_montant === "" || !Number.isInteger(montant) || montant <= 0) {
    erreurs.dep_montant = "Indiquez un montant entier en FCFA, supérieur à 0 (sans virgule).";
  } else if (montant > 100000000) {
    erreurs.dep_montant = "Montant très élevé (plus de 100 000 000 FCFA). Vérifiez le nombre de zéros.";
  }

  let lot = null;
  if (v.dep_portee === "") {
    erreurs.dep_portee = "Indiquez à quoi se rapporte cette dépense.";
  } else if (v.dep_portee === "lot") {
    if (v.dep_lot === "") {
      erreurs.dep_lot = "Choisissez le lot concerné.";
    } else {
      lot = lireLot(v.dep_lot);
      if (!lot) {
        erreurs.dep_lot = "Ce lot n'existe plus. Choisissez un autre lot.";
      }
    }
  }

  // --- Avertissements (n'empêchent pas l'enregistrement) ---
  if (v.dep_categorie !== "" && v.dep_portee !== "") {
    if (CATEGORIES_LOT.indexOf(v.dep_categorie) !== -1 && v.dep_portee !== "lot") {
      avertissements.push("Une dépense de type « " + v.dep_categorie +
        " » concerne en général un lot précis. Vérifiez le rattachement choisi.");
    }
    if (CATEGORIES_ELEVAGE.indexOf(v.dep_categorie) !== -1 && v.dep_portee === "lot") {
      avertissements.push("« " + v.dep_categorie + " » est un investissement durable : " +
        "il vaut mieux l'attribuer à l'élevage qu'à un seul lot, sinon le coût de ce lot sera surestimé.");
    }
  }
  if (lot && !erreurs.dep_date &&
      nombreDeJoursEntre(v.dep_date, lot.date_mise_en_elevage) > 30) {
    avertissements.push("Cette dépense date de plus de 30 jours avant la mise en élevage du lot (" +
      formaterDate(lot.date_mise_en_elevage) + "). Vérifiez la date.");
  }

  return { erreurs: erreurs, avertissements: avertissements };
}

function afficherErreursDep(erreurs) {
  CHAMPS_DEP.forEach(function (champ) {
    const zone = document.getElementById("erreur-" + champ);
    if (zone) {
      zone.textContent = erreurs[champ] || "";
    }
  });
}

// ---------- Formulaire ----------

function ouvrirFormulaireDep(depense) {
  formDep.reset();
  afficherErreursDep({});
  messageFormDep.textContent = "";
  zoneInfoDep.innerHTML = "";
  remplirSelectLotsDep();

  if (depense) {
    idDepEnEdition = depense.id;
    titreFormDep.textContent = "✏️ Modifier la dépense";
    document.getElementById("dep_date").value = depense.date;
    document.getElementById("dep_categorie").value = depense.categorie;
    document.getElementById("dep_description").value = depense.description;
    document.getElementById("dep_montant").value = depense.montant_fcfa;
    document.getElementById("dep_portee").value = depense.portee;
    document.getElementById("dep_lot").value = depense.lot_id || "";
    document.getElementById("dep_observation").value = depense.observation || "";
  } else {
    idDepEnEdition = null;
    titreFormDep.textContent = "➕ Nouvelle dépense";
  }

  majGroupeLotDep();
  actualiserRelectureMontant();
  formDep.hidden = false;
  actualiserRelectureDate("dep_date");
  formDep.scrollIntoView({ behavior: "smooth" });
}

function fermerFormulaireDep() {
  formDep.hidden = true;
  idDepEnEdition = null;
}

// ---------- Filtre ----------

function remplirFiltreDep() {
  const lots = lireLots().slice().sort(function (a, b) {
    return b.date_mise_en_elevage.localeCompare(a.date_mise_en_elevage);
  });

  selectFiltreDep.innerHTML = "";
  const choix = [
    { valeur: "toutes", texte: "Toutes les dépenses" },
    { valeur: "elevage", texte: "Dépenses de l'élevage (non liées à un lot)" },
    { valeur: "generale", texte: "Dépenses générales" }
  ];
  lots.forEach(function (lot) {
    choix.push({ valeur: "lot:" + lot.id, texte: "Lot : " + lot.nom });
  });

  let filtreTrouve = false;
  choix.forEach(function (c) {
    const option = document.createElement("option");
    option.value = c.valeur;
    option.textContent = c.texte;
    selectFiltreDep.appendChild(option);
    if (c.valeur === filtreDep) {
      filtreTrouve = true;
    }
  });

  // Si le lot choisi n'existe plus, on revient à « Toutes »
  if (!filtreTrouve) {
    filtreDep = "toutes";
  }
  selectFiltreDep.value = filtreDep;
}

function appliquerFiltreDep(depenses) {
  return depenses.filter(function (depense) {
    if (filtreDep === "toutes") {
      return true;
    }
    if (filtreDep === "elevage" || filtreDep === "generale") {
      return depense.portee === filtreDep;
    }
    return depense.portee === "lot" && depense.lot_id === filtreDep.replace("lot:", "");
  });
}

function titreDuFiltre() {
  if (filtreDep === "toutes") {
    return "Toutes les dépenses";
  }
  if (filtreDep === "elevage") {
    return "Dépenses de l'élevage";
  }
  if (filtreDep === "generale") {
    return "Dépenses générales";
  }
  return "Dépenses du lot : " + nomDuLot(filtreDep.replace("lot:", ""));
}

// ---------- Affichage ----------

function ligneRepartition(nom, montant, total) {
  const part = total > 0 ? " (" + formaterNombre(montant / total * 100, 1) + " %)" : "";
  return '<div class="ligne-repartition"><span>' + echapperHtml(nom) + "</span><span>" +
         formaterMontant(montant) + " FCFA" + part + "</span></div>";
}

function afficherResumeDep(depenses) {
  const t = calculerTotalDepenses(depenses);

  let html = "<h3>💰 " + echapperHtml(titreDuFiltre()) + "</h3>" +
    '<p class="sous-titre">' + depenses.length + " dépense(s) enregistrée(s)</p>" +
    '<div class="indicateur indicateur-total"><span class="valeur">' +
    formaterMontant(t.total) + ' FCFA</span><span class="nom">Total des dépenses</span></div>';

  if (depenses.length > 0) {
    if (filtreDep === "toutes") {
      html += '<p class="titre-repartition">Par rattachement</p>' +
        ligneRepartition("Liées à des lots", t.parPortee.lot, t.total) +
        ligneRepartition("Élevage (non liées à un lot)", t.parPortee.elevage, t.total) +
        ligneRepartition("Générales", t.parPortee.generale, t.total);
    }

    html += '<p class="titre-repartition">Par catégorie</p>';
    Object.keys(t.parCategorie)
      .sort(function (a, b) { return t.parCategorie[b] - t.parCategorie[a]; })
      .forEach(function (categorie) {
        html += ligneRepartition(categorie, t.parCategorie[categorie], t.total);
      });
  }

  html += '<p class="note-calcul">Total des dépenses = somme des dépenses enregistrées. ' +
    "Ce n'est pas encore le coût de production d'un lot : ce calcul sera présenté au tableau de bord.</p>";

  resumeDep.innerHTML = html;
}

function afficherListeDep(depenses) {
  if (depenses.length === 0) {
    listeDep.innerHTML = '<p class="vide">Aucune dépense à afficher.</p>';
    return;
  }

  const triees = depenses.slice().sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });

  listeDep.innerHTML = "";
  triees.forEach(function (depense) {
    const carte = document.createElement("article");
    carte.className = "carte-lot";
    carte.innerHTML =
      '<span class="badge-portee ' + depense.portee + '">' + echapperHtml(libellePortee(depense)) + "</span>" +
      "<h4>" + echapperHtml(depense.description) + "</h4>" +
      "<p><strong>Montant :</strong> " + formaterMontant(depense.montant_fcfa) + " FCFA</p>" +
      "<p><strong>Date :</strong> " + formaterDate(depense.date) + "</p>" +
      "<p><strong>Catégorie :</strong> " + echapperHtml(depense.categorie) + "</p>" +
      (depense.observation ? "<p><strong>Observation :</strong> " + echapperHtml(depense.observation) + "</p>" : "") +
      '<div class="actions-lot">' +
        '<button type="button" class="bouton bouton-secondaire" data-action="modifier" data-id="' + depense.id + '">✏️ Modifier</button>' +
        '<button type="button" class="bouton bouton-danger" data-action="supprimer" data-id="' + depense.id + '">🗑️ Supprimer</button>' +
      "</div>";
    listeDep.appendChild(carte);
  });
}

function afficherInfoDep(texteOk, avertissements) {
  let html = '<span class="message-ok">' + texteOk + "</span>";
  avertissements.forEach(function (texte) {
    html += '<br><span class="message-avert">⚠️ ' + echapperHtml(texte) + "</span>";
  });
  zoneInfoDep.innerHTML = html;
}

// Redessine tout le module
function rafraichirModuleDep() {
  if (!lireExploitation()) {
    alerteDep.hidden = false;
    contenuDep.hidden = true;
    return;
  }
  alerteDep.hidden = true;
  contenuDep.hidden = false;

  remplirFiltreDep();
  const affichees = appliquerFiltreDep(lireDepenses());
  afficherResumeDep(affichees);
  afficherListeDep(affichees);
}

// ---------- Actions de l'utilisateur ----------

selectFiltreDep.addEventListener("change", function () {
  filtreDep = selectFiltreDep.value;
  zoneInfoDep.innerHTML = "";
  rafraichirModuleDep();
});

selectPorteeDep.addEventListener("change", majGroupeLotDep);
champMontantDep.addEventListener("input", actualiserRelectureMontant);

btnNouvelleDep.addEventListener("click", function () {
  ouvrirFormulaireDep(null);
});

btnAnnulerDep.addEventListener("click", function () {
  fermerFormulaireDep();
});

// Clic sur « Modifier » ou « Supprimer » dans la liste
listeDep.addEventListener("click", function (evenement) {
  const bouton = evenement.target.closest("button[data-action]");
  if (!bouton) {
    return;
  }
  const depense = lireDepense(bouton.dataset.id);
  if (!depense) {
    return;
  }

  if (bouton.dataset.action === "modifier") {
    ouvrirFormulaireDep(depense);
  }

  if (bouton.dataset.action === "supprimer") {
    const question = "Supprimer la dépense « " + depense.description + " » (" +
      formaterMontant(depense.montant_fcfa) + " FCFA) ?\n\nCette action est irréversible.";
    if (window.confirm(question)) {
      supprimerDepense(depense.id);
      if (idDepEnEdition === depense.id) {
        fermerFormulaireDep();
      }
      zoneInfoDep.innerHTML = "";
      rafraichirModuleDep();
    }
  }
});

// Clic sur « Enregistrer la dépense »
formDep.addEventListener("submit", function (evenement) {
  evenement.preventDefault();

  const valeurs = lireFormulaireDep();
  const resultat = validerDepense(valeurs);
  afficherErreursDep(resultat.erreurs);

  if (Object.keys(resultat.erreurs).length > 0) {
    messageFormDep.className = "message message-erreur";
    messageFormDep.textContent = "⚠️ Corrigez les champs signalés en rouge.";
    return;
  }

  const exploitation = lireExploitation();
  const base = idDepEnEdition ? lireDepense(idDepEnEdition) : {};
  const depense = Object.assign({}, base, {
    id: idDepEnEdition || "dep-" + Date.now(),
    exploitation_id: exploitation.id,
    date: valeurs.dep_date,
    categorie: valeurs.dep_categorie,
    description: valeurs.dep_description,
    montant_fcfa: Number(valeurs.dep_montant),
    portee: valeurs.dep_portee,
    lot_id: valeurs.dep_portee === "lot" ? valeurs.dep_lot : null,
    observation: valeurs.dep_observation
  });

  if (enregistrerDepense(depense)) {
    fermerFormulaireDep();
    rafraichirModuleDep();
    afficherInfoDep("✅ Dépense enregistrée.", resultat.avertissements);
  } else {
    messageFormDep.className = "message message-erreur";
    messageFormDep.textContent = "❌ Enregistrement impossible. Vérifiez votre navigateur (mode privé ?).";
  }
});

// À chaque arrivée sur l'onglet « Dépenses », on recharge
window.addEventListener("hashchange", function () {
  if (window.location.hash === "#depenses") {
    fermerFormulaireDep();
    zoneInfoDep.innerHTML = "";
    rafraichirModuleDep();
  }
});

// Au chargement de la page
rafraichirModuleDep();