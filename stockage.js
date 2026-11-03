// ============================================================
// Élevage+ : stockage des données (localStorage)
// Toutes les lectures/écritures passent par CE fichier.
// Si on change de système de stockage plus tard, on ne
// modifiera que ce fichier.
// ============================================================

const CLE_STOCKAGE = "elevageplus_donnees";

// Structure de base de toutes les données de l'application
function donneesVides() {
  return {
    version: 1,
    exploitation: null,
    lots: [],
    suivis: [],
    depenses: [],
    ventes: []
  };
}

// Lire toutes les données enregistrées
function chargerDonnees() {
  try {
    const texte = localStorage.getItem(CLE_STOCKAGE);
    if (texte === null) {
      return donneesVides();
    }
    return Object.assign(donneesVides(), JSON.parse(texte));
  } catch (erreur) {
    console.error("Lecture impossible :", erreur);
    return donneesVides();
  }
}

// Enregistrer toutes les données. Renvoie true si ça a marché.
function sauvegarderDonnees(donnees) {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(donnees));
    return true;
  } catch (erreur) {
    console.error("Enregistrement impossible :", erreur);
    return false;
  }
}

// --- Exploitation ---

function lireExploitation() {
  return chargerDonnees().exploitation;
}

function enregistrerExploitation(exploitation) {
  const donnees = chargerDonnees();
  donnees.exploitation = exploitation;
  return sauvegarderDonnees(donnees);
}

// --- Lots ---

function lireLots() {
  return chargerDonnees().lots;
}

function lireLot(idLot) {
  const trouves = lireLots().filter(function (lot) {
    return lot.id === idLot;
  });
  return trouves.length > 0 ? trouves[0] : null;
}

// Crée le lot s'il n'existe pas, le remplace s'il existe déjà
function enregistrerLot(lot) {
  const donnees = chargerDonnees();
  let position = -1;
  donnees.lots.forEach(function (existant, index) {
    if (existant.id === lot.id) {
      position = index;
    }
  });
  if (position === -1) {
    donnees.lots.push(lot);
  } else {
    donnees.lots[position] = lot;
  }
  return sauvegarderDonnees(donnees);
}

// Combien d'enregistrements dépendent de ce lot ?
function compterElementsLies(idLot) {
  const donnees = chargerDonnees();
  const lies = function (element) {
    return element.lot_id === idLot;
  };
  return donnees.suivis.filter(lies).length +
         donnees.depenses.filter(lies).length +
         donnees.ventes.filter(lies).length;
}

// Supprime le lot ET tout ce qui lui est rattaché
function supprimerLot(idLot) {
  const donnees = chargerDonnees();
  const autres = function (element) {
    return element.lot_id !== idLot;
  };
  donnees.lots = donnees.lots.filter(function (lot) {
    return lot.id !== idLot;
  });
  donnees.suivis = donnees.suivis.filter(autres);
  donnees.depenses = donnees.depenses.filter(autres);
  donnees.ventes = donnees.ventes.filter(autres);
  return sauvegarderDonnees(donnees);
}


// --- Suivis zootechniques ---

function lireSuivisDuLot(idLot) {
  return chargerDonnees().suivis.filter(function (suivi) {
    return suivi.lot_id === idLot;
  });
}

function lireSuivi(idSuivi) {
  const trouves = chargerDonnees().suivis.filter(function (suivi) {
    return suivi.id === idSuivi;
  });
  return trouves.length > 0 ? trouves[0] : null;
}

// Crée le suivi s'il n'existe pas, le remplace s'il existe déjà
function enregistrerSuivi(suivi) {
  const donnees = chargerDonnees();
  let position = -1;
  donnees.suivis.forEach(function (existant, index) {
    if (existant.id === suivi.id) {
      position = index;
    }
  });
  if (position === -1) {
    donnees.suivis.push(suivi);
  } else {
    donnees.suivis[position] = suivi;
  }
  return sauvegarderDonnees(donnees);
}

function supprimerSuivi(idSuivi) {
  const donnees = chargerDonnees();
  donnees.suivis = donnees.suivis.filter(function (suivi) {
    return suivi.id !== idSuivi;
  });
  return sauvegarderDonnees(donnees);
}


// --- Dépenses ---

function lireDepenses() {
  return chargerDonnees().depenses;
}

function lireDepense(idDepense) {
  const trouvees = lireDepenses().filter(function (depense) {
    return depense.id === idDepense;
  });
  return trouvees.length > 0 ? trouvees[0] : null;
}

// Crée la dépense si elle n'existe pas, la remplace si elle existe déjà
function enregistrerDepense(depense) {
  const donnees = chargerDonnees();
  let position = -1;
  donnees.depenses.forEach(function (existante, index) {
    if (existante.id === depense.id) {
      position = index;
    }
  });
  if (position === -1) {
    donnees.depenses.push(depense);
  } else {
    donnees.depenses[position] = depense;
  }
  return sauvegarderDonnees(donnees);
}

function supprimerDepense(idDepense) {
  const donnees = chargerDonnees();
  donnees.depenses = donnees.depenses.filter(function (depense) {
    return depense.id !== idDepense;
  });
  return sauvegarderDonnees(donnees);
}


// --- Ventes ---

function lireVentes() {
  return chargerDonnees().ventes;
}

function lireVentesDuLot(idLot) {
  return lireVentes().filter(function (vente) {
    return vente.lot_id === idLot;
  });
}

function lireVente(idVente) {
  const trouvees = lireVentes().filter(function (vente) {
    return vente.id === idVente;
  });
  return trouvees.length > 0 ? trouvees[0] : null;
}

// Crée la vente si elle n'existe pas, la remplace si elle existe déjà
function enregistrerVente(vente) {
  const donnees = chargerDonnees();
  let position = -1;
  donnees.ventes.forEach(function (existante, index) {
    if (existante.id === vente.id) {
      position = index;
    }
  });
  if (position === -1) {
    donnees.ventes.push(vente);
  } else {
    donnees.ventes[position] = vente;
  }
  return sauvegarderDonnees(donnees);
}

function supprimerVente(idVente) {
  const donnees = chargerDonnees();
  donnees.ventes = donnees.ventes.filter(function (vente) {
    return vente.id !== idVente;
  });
  return sauvegarderDonnees(donnees);
}


// --- Sauvegarde / restauration ---

const CLE_DERNIERE_SAUVEGARDE = "elevageplus_derniere_sauvegarde";

function lireDateDerniereSauvegarde() {
  try {
    return localStorage.getItem(CLE_DERNIERE_SAUVEGARDE);
  } catch (erreur) {
    return null;
  }
}

function noterSauvegarde(dateIso) {
  try {
    localStorage.setItem(CLE_DERNIERE_SAUVEGARDE, dateIso);
  } catch (erreur) {
    console.error("Impossible de noter la sauvegarde :", erreur);
  }
}

// Remplace TOUTES les données par celles d'un fichier de sauvegarde
function remplacerToutesLesDonnees(donnees) {
  return sauvegarderDonnees(Object.assign(donneesVides(), donnees));
}

function effacerToutesLesDonnees() {
  try {
    localStorage.removeItem(CLE_STOCKAGE);
    return true;
  } catch (erreur) {
    return false;
  }
}