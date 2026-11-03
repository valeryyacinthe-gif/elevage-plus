// ============================================================
// Élevage+ : calculs des indicateurs zootechniques
// Ce fichier ne contient QUE des calculs : il ne lit pas
// l'écran et n'écrit pas dans le stockage. On peut donc
// expliquer et vérifier chaque formule isolément.
// ============================================================

// 2.5 -> "2,5" (virgule décimale, nombre de décimales choisi)
function formaterNombre(valeur, decimales) {
  return Number(valeur).toFixed(decimales).replace(".", ",");
}

// Calcule les indicateurs d'un lot à partir de ses suivis
function calculerIndicateurs(lot, suivis) {
  const resultat = {
    nbSuivis: suivis.length,
    effectifActuel: null,
    mortsTotal: 0,
    tauxMortalite: null,
    poidsInitial: null,
    poidsActuel: null,
    gainPoids: null,
    nbJours: null,
    gmq: null,
    alimentTotal: 0,
    datePremier: null,
    dateDernier: null
  };

  if (suivis.length === 0) {
    return resultat;
  }

  // Suivis rangés du plus ancien au plus récent
  const tries = suivis.slice().sort(function (a, b) {
    return a.date.localeCompare(b.date);
  });
  const premier = tries[0];
  const dernier = tries[tries.length - 1];

  tries.forEach(function (suivi) {
    resultat.mortsTotal += suivi.morts;
    resultat.alimentTotal += suivi.aliment_kg;
  });

  resultat.datePremier = premier.date;
  resultat.dateDernier = dernier.date;
  resultat.effectifActuel = dernier.effectif_vivant;
  resultat.poidsInitial = premier.poids_moyen_kg;
  resultat.poidsActuel = dernier.poids_moyen_kg;

  // Taux de mortalité (%) = morts cumulés / effectif initial x 100
  resultat.tauxMortalite = resultat.mortsTotal / lot.effectif_initial * 100;

  // Gain de poids et GMQ : il faut au moins 2 suivis à des dates différentes
  if (tries.length >= 2) {
    resultat.gainPoids = dernier.poids_moyen_kg - premier.poids_moyen_kg;   // en kg
    resultat.nbJours = nombreDeJoursEntre(premier.date, dernier.date);
    if (resultat.nbJours > 0) {
      // GMQ (g/jour) = gain (kg) x 1000 / nombre de jours
      resultat.gmq = resultat.gainPoids * 1000 / resultat.nbJours;
    }
  }

  return resultat;
}


// ---------- Dépenses ----------

// 1500000 -> "1 500 000"
function formaterMontant(montant) {
  return String(Math.round(montant)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Total des dépenses = somme des dépenses enregistrées,
// avec le détail par catégorie et par type de rattachement
function calculerTotalDepenses(depenses) {
  const resultat = {
    total: 0,
    parCategorie: {},
    parPortee: { lot: 0, elevage: 0, generale: 0 }
  };

  depenses.forEach(function (depense) {
    resultat.total += depense.montant_fcfa;
    resultat.parCategorie[depense.categorie] =
      (resultat.parCategorie[depense.categorie] || 0) + depense.montant_fcfa;
    resultat.parPortee[depense.portee] += depense.montant_fcfa;
  });

  return resultat;
}


// ---------- Ventes ----------

// 2.5 -> "2,5" ; 40 -> "40"
function formaterQuantite(quantite) {
  if (Number.isInteger(quantite)) {
    return String(quantite);
  }
  return String(Math.round(quantite * 100) / 100).replace(".", ",");
}

// Chiffre d'affaires = somme des montants des ventes
// (avec le détail par produit et par rattachement)
function calculerChiffreAffaires(ventes) {
  const resultat = {
    total: 0,
    nbPoulets: 0,
    parProduit: {},
    parPortee: { lot: 0, generale: 0 }
  };

  ventes.forEach(function (vente) {
    resultat.total += vente.montant_fcfa;
    resultat.nbPoulets += vente.nb_poulets;
    resultat.parProduit[vente.produit] =
      (resultat.parProduit[vente.produit] || 0) + vente.montant_fcfa;
    resultat.parPortee[vente.portee] += vente.montant_fcfa;
  });

  return resultat;
}

// Situation de l'effectif d'un lot :
// restants estimés = effectif initial - morts cumulés - poulets vendus
function calculerEffectifLot(lot, suivis, ventes) {
  let morts = 0;
  suivis.forEach(function (suivi) {
    morts += suivi.morts;
  });

  let vendus = 0;
  ventes.forEach(function (vente) {
    vendus += vente.nb_poulets;
  });

  return {
    initial: lot.effectif_initial,
    morts: morts,
    vendus: vendus,
    restants: lot.effectif_initial - morts - vendus
  };
}


// ---------- Tableau de bord ----------

// -12000 -> "−12 000" ; 12000 -> "12 000"
function formaterMontantSigne(montant) {
  return montant < 0 ? "−" + formaterMontant(-montant) : formaterMontant(montant);
}

// Synthèse d'UN lot
// depensesLot et ventesLot : uniquement celles rattachées à ce lot
function calculerSyntheseLot(lot, suivis, depensesLot, ventesLot) {
  let depensesTotal = 0;
  let depensesAliment = 0;
  depensesLot.forEach(function (depense) {
    depensesTotal += depense.montant_fcfa;
    if (depense.categorie === "Aliment") {
      depensesAliment += depense.montant_fcfa;
    }
  });

  const chiffreAffaires = calculerChiffreAffaires(ventesLot).total;

  return {
    effectif: calculerEffectifLot(lot, suivis, ventesLot),
    indicateurs: calculerIndicateurs(lot, suivis),
    depensesTotal: depensesTotal,
    depensesAliment: depensesAliment,
    partAliment: depensesTotal > 0 ? depensesAliment / depensesTotal * 100 : null,
    chiffreAffaires: chiffreAffaires,
    // Résultat du lot = chiffre d'affaires - dépenses du lot (avant charges communes)
    resultat: chiffreAffaires - depensesTotal
  };
}

// Synthèse de TOUT l'élevage de poulets
function calculerSyntheseElevage(lots, suivis, depenses, ventes) {
  const r = {
    lignes: [],
    nbLots: lots.length,
    effectifInitial: 0,
    morts: 0,
    vendus: 0,
    restants: 0,
    effectifInitialAvecSuivi: 0,
    mortsAvecSuivi: 0,
    tauxMortaliteGlobal: null,
    depensesLots: 0,
    depensesElevage: 0,
    depensesGenerales: 0,
    caLots: 0,
    caGeneral: 0,
    margeDirecte: 0,
    resultat: 0
  };

  lots.forEach(function (lot) {
    const suivisLot = suivis.filter(function (s) { return s.lot_id === lot.id; });
    const depensesLot = depenses.filter(function (d) { return d.portee === "lot" && d.lot_id === lot.id; });
    const ventesLot = ventes.filter(function (v) { return v.portee === "lot" && v.lot_id === lot.id; });
    const synthese = calculerSyntheseLot(lot, suivisLot, depensesLot, ventesLot);

    r.lignes.push({ lot: lot, synthese: synthese });
    r.effectifInitial += lot.effectif_initial;
    r.morts += synthese.effectif.morts;
    r.vendus += synthese.effectif.vendus;
    r.depensesLots += synthese.depensesTotal;
    r.caLots += synthese.chiffreAffaires;

    // La mortalité globale ne tient compte que des lots qui ont au moins un suivi
    if (synthese.indicateurs.nbSuivis > 0) {
      r.effectifInitialAvecSuivi += lot.effectif_initial;
      r.mortsAvecSuivi += synthese.effectif.morts;
    }
  });

  r.restants = r.effectifInitial - r.morts - r.vendus;
  if (r.effectifInitialAvecSuivi > 0) {
    r.tauxMortaliteGlobal = r.mortsAvecSuivi / r.effectifInitialAvecSuivi * 100;
  }

  depenses.forEach(function (depense) {
    if (depense.portee === "elevage") {
      r.depensesElevage += depense.montant_fcfa;
    }
    if (depense.portee === "generale") {
      r.depensesGenerales += depense.montant_fcfa;
    }
  });
  ventes.forEach(function (vente) {
    if (vente.portee === "generale") {
      r.caGeneral += vente.montant_fcfa;
    }
  });

  r.margeDirecte = r.caLots - r.depensesLots;
  r.resultat = r.margeDirecte - r.depensesElevage;
  return r;
}