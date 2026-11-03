// ============================================================
// Élevage+ : module « Ventes »
// Créer, modifier, supprimer, filtrer et totaliser les ventes.
// (utilise echapperHtml de lots.js, nomDuLot et ligneRepartition de depenses.js)
// ============================================================

const formVen = document.getElementById("form-ven");
const titreFormVen = document.getElementById("titre-form-ven");
const messageFormVen = document.getElementById("message-ven");
const zoneInfoVen = document.getElementById("info-ven");
const listeVen = document.getElementById("liste-ven");
const resumeVen = document.getElementById("ven-resume");
const alerteVen = document.getElementById("ven-alerte");
const contenuVen = document.getElementById("ven-contenu");
const btnNouvelleVen = document.getElementById("btn-nouvelle-ven");
const btnAnnulerVen = document.getElementById("btn-annuler-ven");
const selectFiltreVen = document.getElementById("ven_filtre");
const selectProduit = document.getElementById("ven_produit");
const selectUnite = document.getElementById("ven_unite");
const selectPorteeVen = document.getElementById("ven_portee");
const selectLotVen = document.getElementById("ven_lot");
const groupeLotVen = document.getElementById("groupe-ven-lot");
const groupeNb = document.getElementById("groupe-ven-nb");
const champQuantite = document.getElementById("ven_quantite");
const champPrix = document.getElementById("ven_prix");
const relectureVente = document.getElementById("relecture-vente");

const CHAMPS_VEN = [
  "ven_date", "ven_produit", "ven_portee", "ven_lot", "ven_unite",
  "ven_quantite", "ven_nb", "ven_prix", "ven_client", "ven_observation"
];

// Unités possibles (libellé complet et forme courte)
const UNITES = {
  poulet: { court: "poulet(s)", libelle: "Poulet (à la pièce)" },
  kg: { court: "kg", libelle: "Kilogramme (kg)" },
  sac: { court: "sac(s)", libelle: "Sac" },
  unite: { court: "unité(s)", libelle: "Unité" }
};

// Quelles unités pour quel produit
const UNITES_PAR_PRODUIT = {
  "Poulets vivants": ["poulet", "kg"],
  "Viande (poulets abattus)": ["poulet", "kg"],
  "Autre produit": ["kg", "sac", "unite"]
};

// Produits qui correspondent à des poulets (donc à un lot et à un effectif)
const PRODUITS_POULETS = ["Poulets vivants", "Viande (poulets abattus)"];

let idVenteEnEdition = null;  // null = nouvelle vente
let filtreVen = "toutes";     // filtre d'affichage choisi

// ---------- Outils ----------

function lireFormulaireVen() {
  const valeurs = {};
  CHAMPS_VEN.forEach(function (champ) {
    valeurs[champ] = document.getElementById(champ).value.trim();
  });
  return valeurs;
}

// Le choix du lot n'apparaît que pour une vente liée à un lot
function majGroupeLotVen() {
  groupeLotVen.hidden = selectPorteeVen.value !== "lot";
}

// Le nombre de poulets n'est demandé que pour une vente de poulets au kilo
function majGroupeNb() {
  const estPoulets = PRODUITS_POULETS.indexOf(selectProduit.value) !== -1;
  groupeNb.hidden = !(estPoulets && selectUnite.value === "kg");
}

// Reconstruit la liste des unités selon le produit choisi
function majUnites() {
  const precedente = selectUnite.value;
  const permises = UNITES_PAR_PRODUIT[selectProduit.value] || [];

  selectUnite.innerHTML = "";
  const vide = document.createElement("option");
  vide.value = "";
  vide.textContent = permises.length === 0 ? "Choisissez d'abord le produit" : "-- Choisir --";
  selectUnite.appendChild(vide);

  permises.forEach(function (code) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = UNITES[code].libelle;
    selectUnite.appendChild(option);
  });

  if (permises.indexOf(precedente) !== -1) {
    selectUnite.value = precedente;
  }
  majGroupeNb();
}

function remplirSelectLotsVen() {
  const lots = lireLots().slice().sort(function (a, b) {
    return b.date_mise_en_elevage.localeCompare(a.date_mise_en_elevage);
  });

  selectLotVen.innerHTML = "";
  const vide = document.createElement("option");
  vide.value = "";
  vide.textContent = lots.length === 0
    ? "Aucun lot : créez-en un dans Mes lots"
    : "-- Choisir un lot --";
  selectLotVen.appendChild(vide);

  lots.forEach(function (lot) {
    const option = document.createElement("option");
    option.value = lot.id;
    option.textContent = lot.nom;
    selectLotVen.appendChild(option);
  });
}

// Calcul affiché sous le prix : quantité x prix = montant
function actualiserRelectureVente() {
  const quantite = Number(champQuantite.value);
  const prix = Number(champPrix.value);
  if (champQuantite.value === "" || champPrix.value === "" ||
      isNaN(quantite) || isNaN(prix) || quantite <= 0 || prix <= 0) {
    relectureVente.textContent = "";
    return;
  }
  const unite = UNITES[selectUnite.value] ? " " + UNITES[selectUnite.value].court : "";
  relectureVente.textContent = "💰 " + formaterQuantite(quantite) + unite + " × " +
    formaterMontant(prix) + " FCFA = " + formaterMontant(Math.round(quantite * prix)) + " FCFA";
}

function libelleVente(vente) {
  return vente.portee === "lot" ? nomDuLot(vente.lot_id) : "Vente générale";
}

// ---------- Vérification des données ----------
// Renvoie { erreurs, avertissements, nbPoulets, montant }

function validerVente(v) {
  const erreurs = {};
  const avertissements = [];
  let nbPoulets = 0;
  let montant = 0;

  // --- Date ---
  if (v.ven_date === "" || !estDateValide(v.ven_date)) {
    erreurs.ven_date = "Indiquez une date valide.";
  } else if (Number(v.ven_date.slice(0, 4)) < 2000) {
    erreurs.ven_date = "La date semble trop ancienne. Vérifiez l'année.";
  }

  // --- Produit ---
  if (v.ven_produit === "") {
    erreurs.ven_produit = "Choisissez le produit vendu.";
  }
  const estPoulets = PRODUITS_POULETS.indexOf(v.ven_produit) !== -1;

  // --- Rattachement ---
  let lot = null;
  if (v.ven_portee === "") {
    erreurs.ven_portee = "Indiquez à quoi se rapporte cette vente.";
  } else if (v.ven_portee === "generale" && estPoulets) {
    erreurs.ven_portee = "Une vente de poulets doit être rattachée à un lot, pour suivre les effectifs.";
  } else if (v.ven_portee === "lot") {
    if (v.ven_lot === "") {
      erreurs.ven_lot = "Choisissez le lot concerné.";
    } else {
      lot = lireLot(v.ven_lot);
      if (!lot) {
        erreurs.ven_lot = "Ce lot n'existe plus. Choisissez un autre lot.";
      }
    }
  }

  // --- Unité ---
  if (v.ven_produit !== "" && v.ven_unite === "") {
    erreurs.ven_unite = "Choisissez l'unité de vente.";
  }

  // --- Quantité ---
  const quantite = Number(v.ven_quantite);
  if (v.ven_quantite === "" || isNaN(quantite) || quantite <= 0) {
    erreurs.ven_quantite = "Indiquez une quantité supérieure à 0.";
  } else if (v.ven_unite !== "kg" && !Number.isInteger(quantite)) {
    erreurs.ven_quantite = "Pour cette unité, indiquez un nombre entier.";
  } else if (quantite > 100000) {
    erreurs.ven_quantite = "Quantité très élevée. Vérifiez le nombre saisi.";
  }

  // --- Nombre de poulets concernés ---
  if (estPoulets && !erreurs.ven_quantite) {
    if (v.ven_unite === "poulet") {
      nbPoulets = quantite;
    } else if (v.ven_unite === "kg") {
      const nb = Number(v.ven_nb);
      if (v.ven_nb === "" || !Number.isInteger(nb) || nb < 1) {
        erreurs.ven_nb = "Indiquez le nombre de poulets concernés (entier, au moins 1).";
      } else {
        nbPoulets = nb;
      }
    }
  }

  // --- Prix unitaire et montant ---
  const prix = Number(v.ven_prix);
  if (v.ven_prix === "" || !Number.isInteger(prix) || prix <= 0) {
    erreurs.ven_prix = "Indiquez un prix entier en FCFA, supérieur à 0 (sans virgule).";
  } else if (!erreurs.ven_quantite) {
    montant = Math.round(quantite * prix);
    if (montant > 100000000) {
      erreurs.ven_prix = "Montant total très élevé (plus de 100 000 000 FCFA). Vérifiez la quantité et le prix.";
    }
  }

  // --- Cohérence avec le lot ---
  if (lot && !erreurs.ven_date) {
    if (v.ven_date < lot.date_mise_en_elevage) {
      erreurs.ven_date = "La vente ne peut pas être avant la mise en élevage du lot (" +
        formaterDate(lot.date_mise_en_elevage) + ").";
    } else if (estPoulets) {
      const age = nombreDeJoursEntre(lot.date_mise_en_elevage, v.ven_date);
      if (age < 21) {
        avertissements.push("Cette vente a lieu à J" + age +
          " : très tôt pour des poulets de chair (moins de 21 jours). Vérifiez la date.");
      } else if (age > 90) {
        avertissements.push("Cette vente a lieu à J" + age +
          " (plus de 90 jours). Vérifiez la date.");
      }
    }
  }

  // --- Cohérence des effectifs : vendus + morts <= effectif initial ---
  if (lot && estPoulets && nbPoulets > 0 && !erreurs.ven_quantite && !erreurs.ven_nb) {
    let dejaVendus = 0;
    lireVentesDuLot(lot.id).forEach(function (vente) {
      if (vente.id !== idVenteEnEdition) {
        dejaVendus += vente.nb_poulets;
      }
    });
    let morts = 0;
    lireSuivisDuLot(lot.id).forEach(function (suivi) {
      morts += suivi.morts;
    });

    const total = dejaVendus + morts + nbPoulets;
    if (total > lot.effectif_initial) {
      const champ = v.ven_unite === "poulet" ? "ven_quantite" : "ven_nb";
      erreurs[champ] = "Incohérent : " + dejaVendus + " poulet(s) déjà vendus + " + morts +
        " mort(s) + " + nbPoulets + " dans cette vente = " + total +
        ", alors que le lot compte " + lot.effectif_initial + " poulets au départ.";
    }
  }

  return {
    erreurs: erreurs,
    avertissements: avertissements,
    nbPoulets: nbPoulets,
    montant: montant
  };
}

function afficherErreursVen(erreurs) {
  CHAMPS_VEN.forEach(function (champ) {
    const zone = document.getElementById("erreur-" + champ);
    if (zone) {
      zone.textContent = erreurs[champ] || "";
    }
  });
}

// ---------- Formulaire ----------

function ouvrirFormulaireVen(vente) {
  formVen.reset();
  afficherErreursVen({});
  messageFormVen.textContent = "";
  zoneInfoVen.innerHTML = "";
  remplirSelectLotsVen();

  if (vente) {
    idVenteEnEdition = vente.id;
    titreFormVen.textContent = "✏️ Modifier la vente";
    document.getElementById("ven_date").value = vente.date;
    selectProduit.value = vente.produit;
    majUnites();                        // les unités dépendent du produit
    selectUnite.value = vente.unite;
    selectPorteeVen.value = vente.portee;
    selectLotVen.value = vente.lot_id || "";
    champQuantite.value = vente.quantite;
    document.getElementById("ven_nb").value =
      vente.unite === "kg" && vente.nb_poulets > 0 ? vente.nb_poulets : "";
    champPrix.value = vente.prix_unitaire_fcfa;
    document.getElementById("ven_client").value = vente.client || "";
    document.getElementById("ven_observation").value = vente.observation || "";
  } else {
    idVenteEnEdition = null;
    titreFormVen.textContent = "➕ Nouvelle vente";
    majUnites();
  }

  majGroupeLotVen();
  majGroupeNb();
  actualiserRelectureVente();
  formVen.hidden = false;
  actualiserRelectureDate("ven_date");
  formVen.scrollIntoView({ behavior: "smooth" });
}

function fermerFormulaireVen() {
  formVen.hidden = true;
  idVenteEnEdition = null;
}

// ---------- Filtre ----------

function remplirFiltreVen() {
  const lots = lireLots().slice().sort(function (a, b) {
    return b.date_mise_en_elevage.localeCompare(a.date_mise_en_elevage);
  });

  selectFiltreVen.innerHTML = "";
  const choix = [
    { valeur: "toutes", texte: "Toutes les ventes" },
    { valeur: "generale", texte: "Ventes générales (sans lot)" }
  ];
  lots.forEach(function (lot) {
    choix.push({ valeur: "lot:" + lot.id, texte: "Lot : " + lot.nom });
  });

  let filtreTrouve = false;
  choix.forEach(function (c) {
    const option = document.createElement("option");
    option.value = c.valeur;
    option.textContent = c.texte;
    selectFiltreVen.appendChild(option);
    if (c.valeur === filtreVen) {
      filtreTrouve = true;
    }
  });

  if (!filtreTrouve) {
    filtreVen = "toutes";
  }
  selectFiltreVen.value = filtreVen;
}

function appliquerFiltreVen(ventes) {
  return ventes.filter(function (vente) {
    if (filtreVen === "toutes") {
      return true;
    }
    if (filtreVen === "generale") {
      return vente.portee === "generale";
    }
    return vente.portee === "lot" && vente.lot_id === filtreVen.replace("lot:", "");
  });
}

function titreDuFiltreVen() {
  if (filtreVen === "toutes") {
    return "Toutes les ventes";
  }
  if (filtreVen === "generale") {
    return "Ventes générales";
  }
  return "Ventes du lot : " + nomDuLot(filtreVen.replace("lot:", ""));
}

// ---------- Affichage ----------

function afficherResumeVen(ventes) {
  const ca = calculerChiffreAffaires(ventes);

  let html = "<h3>🛒 " + echapperHtml(titreDuFiltreVen()) + "</h3>" +
    '<p class="sous-titre">' + ventes.length + " vente(s) enregistrée(s)</p>" +
    '<div class="grille-indicateurs">' +
    caseIndicateur("Chiffre d'affaires", formaterMontant(ca.total) + " FCFA") +
    caseIndicateur("Poulets vendus", ca.nbPoulets) +
    "</div>";

  // Situation de l'effectif, seulement quand on regarde un lot précis
  if (filtreVen.indexOf("lot:") === 0) {
    const lot = lireLot(filtreVen.replace("lot:", ""));
    if (lot) {
      const suivis = lireSuivisDuLot(lot.id);
      const e = calculerEffectifLot(lot, suivis, lireVentesDuLot(lot.id));
      const ind = calculerIndicateurs(lot, suivis);

      html += '<p class="titre-repartition">Situation de l\'effectif du lot</p>' +
        '<div class="grille-indicateurs">' +
        caseIndicateur("Effectif initial", e.initial) +
        caseIndicateur("Morts cumulés (suivis)", e.morts) +
        caseIndicateur("Poulets vendus", e.vendus) +
        caseIndicateur("Restants estimés", e.restants) +
        "</div>" +
        '<p class="note-calcul">Restants estimés = effectif initial − morts cumulés − poulets vendus.' +
        (ind.nbSuivis > 0
          ? " Pour comparaison, le dernier suivi (" + formaterDate(ind.dateDernier) +
            ") comptait " + ind.effectifActuel + " vivants."
          : "") +
        "</p>";
    }
  }

  if (ventes.length > 0) {
    if (filtreVen === "toutes") {
      html += '<p class="titre-repartition">Par rattachement</p>' +
        ligneRepartition("Liées à des lots", ca.parPortee.lot, ca.total) +
        ligneRepartition("Ventes générales", ca.parPortee.generale, ca.total);
    }

    html += '<p class="titre-repartition">Par produit</p>';
    Object.keys(ca.parProduit)
      .sort(function (a, b) { return ca.parProduit[b] - ca.parProduit[a]; })
      .forEach(function (produit) {
        html += ligneRepartition(produit, ca.parProduit[produit], ca.total);
      });
  }

  html += '<p class="note-calcul">Montant d\'une vente = quantité × prix unitaire. ' +
    "Chiffre d'affaires = somme des ventes. Ce n'est ni un résultat ni un bénéfice : " +
    "il ne tient pas compte des dépenses (voir le tableau de bord).</p>";

  resumeVen.innerHTML = html;
}

function afficherListeVen(ventes) {
  if (ventes.length === 0) {
    listeVen.innerHTML = '<p class="vide">Aucune vente à afficher.</p>';
    return;
  }

  const triees = ventes.slice().sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });

  listeVen.innerHTML = "";
  triees.forEach(function (vente) {
    const unite = UNITES[vente.unite] ? UNITES[vente.unite].court : vente.unite;
    const carte = document.createElement("article");
    carte.className = "carte-lot";
    carte.innerHTML =
      '<span class="badge-portee ' + vente.portee + '">' + echapperHtml(libelleVente(vente)) + "</span>" +
      "<h4>" + echapperHtml(vente.produit) + "</h4>" +
      "<p><strong>Date :</strong> " + formaterDate(vente.date) + "</p>" +
      "<p><strong>Quantité :</strong> " + formaterQuantite(vente.quantite) + " " + unite +
        " × " + formaterMontant(vente.prix_unitaire_fcfa) + " FCFA</p>" +
      "<p><strong>Montant :</strong> " + formaterMontant(vente.montant_fcfa) + " FCFA</p>" +
      (vente.unite === "kg" && vente.nb_poulets > 0
        ? "<p><strong>Poulets concernés :</strong> " + vente.nb_poulets + "</p>" : "") +
      (vente.client ? "<p><strong>Client / destination :</strong> " + echapperHtml(vente.client) + "</p>" : "") +
      (vente.observation ? "<p><strong>Observation :</strong> " + echapperHtml(vente.observation) + "</p>" : "") +
      '<div class="actions-lot">' +
        '<button type="button" class="bouton bouton-secondaire" data-action="modifier" data-id="' + vente.id + '">✏️ Modifier</button>' +
        '<button type="button" class="bouton bouton-danger" data-action="supprimer" data-id="' + vente.id + '">🗑️ Supprimer</button>' +
      "</div>";
    listeVen.appendChild(carte);
  });
}

function afficherInfoVen(texteOk, avertissements) {
  let html = '<span class="message-ok">' + texteOk + "</span>";
  avertissements.forEach(function (texte) {
    html += '<br><span class="message-avert">⚠️ ' + echapperHtml(texte) + "</span>";
  });
  zoneInfoVen.innerHTML = html;
}

// Redessine tout le module
function rafraichirModuleVen() {
  if (!lireExploitation()) {
    alerteVen.hidden = false;
    contenuVen.hidden = true;
    return;
  }
  alerteVen.hidden = true;
  contenuVen.hidden = false;

  remplirFiltreVen();
  const affichees = appliquerFiltreVen(lireVentes());
  afficherResumeVen(affichees);
  afficherListeVen(affichees);
}

// ---------- Actions de l'utilisateur ----------

selectFiltreVen.addEventListener("change", function () {
  filtreVen = selectFiltreVen.value;
  zoneInfoVen.innerHTML = "";
  rafraichirModuleVen();
});

selectProduit.addEventListener("change", function () {
  majUnites();
  actualiserRelectureVente();
});

selectUnite.addEventListener("change", function () {
  majGroupeNb();
  actualiserRelectureVente();
});

selectPorteeVen.addEventListener("change", majGroupeLotVen);
champQuantite.addEventListener("input", actualiserRelectureVente);
champPrix.addEventListener("input", actualiserRelectureVente);

btnNouvelleVen.addEventListener("click", function () {
  ouvrirFormulaireVen(null);
});

btnAnnulerVen.addEventListener("click", function () {
  fermerFormulaireVen();
});

// Clic sur « Modifier » ou « Supprimer » dans la liste
listeVen.addEventListener("click", function (evenement) {
  const bouton = evenement.target.closest("button[data-action]");
  if (!bouton) {
    return;
  }
  const vente = lireVente(bouton.dataset.id);
  if (!vente) {
    return;
  }

  if (bouton.dataset.action === "modifier") {
    ouvrirFormulaireVen(vente);
  }

  if (bouton.dataset.action === "supprimer") {
    const question = "Supprimer la vente du " + formaterDate(vente.date) + " (" +
      vente.produit + ", " + formaterMontant(vente.montant_fcfa) +
      " FCFA) ?\n\nCette action est irréversible.";
    if (window.confirm(question)) {
      supprimerVente(vente.id);
      if (idVenteEnEdition === vente.id) {
        fermerFormulaireVen();
      }
      zoneInfoVen.innerHTML = "";
      rafraichirModuleVen();
    }
  }
});

// Clic sur « Enregistrer la vente »
formVen.addEventListener("submit", function (evenement) {
  evenement.preventDefault();

  const valeurs = lireFormulaireVen();
  const resultat = validerVente(valeurs);
  afficherErreursVen(resultat.erreurs);

  if (Object.keys(resultat.erreurs).length > 0) {
    messageFormVen.className = "message message-erreur";
    messageFormVen.textContent = "⚠️ Corrigez les champs signalés en rouge.";
    return;
  }

  const exploitation = lireExploitation();
  const base = idVenteEnEdition ? lireVente(idVenteEnEdition) : {};
  const vente = Object.assign({}, base, {
    id: idVenteEnEdition || "vente-" + Date.now(),
    exploitation_id: exploitation.id,
    date: valeurs.ven_date,
    portee: valeurs.ven_portee,
    lot_id: valeurs.ven_portee === "lot" ? valeurs.ven_lot : null,
    produit: valeurs.ven_produit,
    quantite: Number(valeurs.ven_quantite),
    unite: valeurs.ven_unite,
    prix_unitaire_fcfa: Number(valeurs.ven_prix),
    montant_fcfa: resultat.montant,
    nb_poulets: resultat.nbPoulets,
    client: valeurs.ven_client,
    observation: valeurs.ven_observation
  });

  if (enregistrerVente(vente)) {
    fermerFormulaireVen();
    rafraichirModuleVen();
    afficherInfoVen("✅ Vente enregistrée.", resultat.avertissements);
  } else {
    messageFormVen.className = "message message-erreur";
    messageFormVen.textContent = "❌ Enregistrement impossible. Vérifiez votre navigateur (mode privé ?).";
  }
});

// À chaque arrivée sur l'onglet « Ventes », on recharge
window.addEventListener("hashchange", function () {
  if (window.location.hash === "#ventes") {
    fermerFormulaireVen();
    zoneInfoVen.innerHTML = "";
    rafraichirModuleVen();
  }
});

// Au chargement de la page
rafraichirModuleVen();