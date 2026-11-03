// ============================================================
// Élevage+ : sauvegarde et restauration des données
// Les données sont écrites dans un fichier .json que l'utilisateur
// garde où il veut, et peuvent être restaurées depuis ce fichier.
// ============================================================

const btnExporter = document.getElementById("btn-exporter");
const btnImporter = document.getElementById("btn-importer");
const champFichier = document.getElementById("fichier-import");
const btnEffacer = document.getElementById("btn-effacer");
const infoSauvegarde = document.getElementById("info-sauvegarde");
const texteDerniere = document.getElementById("derniere-sauvegarde");

// Date du jour "AAAA-MM-JJ" (calendrier local, sans passer par l'heure UTC)
function dateDuJour() {
  const d = new Date();
  return d.getFullYear() + "-" +
         String(d.getMonth() + 1).padStart(2, "0") + "-" +
         String(d.getDate()).padStart(2, "0");
}

function afficherDerniereSauvegarde() {
  const date = lireDateDerniereSauvegarde();
  texteDerniere.textContent = date
    ? "Dernière sauvegarde : " + formaterDate(date)
    : "Aucune sauvegarde faite sur cet appareil.";
}

function afficherMessageSauvegarde(texte, ok) {
  infoSauvegarde.className = "message " + (ok ? "message-ok" : "message-erreur");
  infoSauvegarde.textContent = texte;
}

// Vérifie qu'un contenu ressemble bien à une sauvegarde Élevage+
function donneesValides(d) {
  if (d === null || typeof d !== "object" || typeof d.version !== "number") {
    return false;
  }
  if (d.exploitation !== null && typeof d.exploitation !== "object") {
    return false;
  }
  const listes = [d.lots, d.suivis, d.depenses, d.ventes];
  return listes.every(function (liste) {
    return Array.isArray(liste) && liste.every(function (element) {
      return element !== null && typeof element === "object" && typeof element.id === "string";
    });
  });
}

// ---------- Sauvegarder ----------

btnExporter.addEventListener("click", function () {
  const texte = JSON.stringify(chargerDonnees(), null, 2);
  const blob = new Blob([texte], { type: "application/json" });
  const adresse = URL.createObjectURL(blob);

  const lien = document.createElement("a");
  lien.href = adresse;
  lien.download = "elevage-plus-sauvegarde-" + dateDuJour() + ".json";
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  setTimeout(function () { URL.revokeObjectURL(adresse); }, 1000);

  noterSauvegarde(dateDuJour());
  afficherDerniereSauvegarde();
  afficherMessageSauvegarde("✅ Fichier de sauvegarde créé. Gardez-le en lieu sûr (clé USB, e-mail…).", true);
});

// ---------- Restaurer ----------

btnImporter.addEventListener("click", function () {
  champFichier.click();
});

champFichier.addEventListener("change", function () {
  const fichier = champFichier.files[0];
  if (!fichier) {
    return;
  }

  const lecteur = new FileReader();
  lecteur.onload = function () {
    let donnees = null;
    try {
      donnees = JSON.parse(lecteur.result);
    } catch (erreur) {
      donnees = null;
    }
    champFichier.value = "";

    if (!donneesValides(donnees)) {
      afficherMessageSauvegarde("❌ Ce fichier n'est pas une sauvegarde Élevage+ valide. Rien n'a été modifié.", false);
      return;
    }

    const question = "Remplacer TOUTES les données actuelles par celles du fichier ?\n\n" +
      "Le fichier contient : " +
      (donnees.exploitation ? "1 exploitation" : "aucune exploitation") + ", " +
      donnees.lots.length + " lot(s), " +
      donnees.suivis.length + " suivi(s), " +
      donnees.depenses.length + " dépense(s), " +
      donnees.ventes.length + " vente(s).\n\n" +
      "Cette action est irréversible.";

    if (!window.confirm(question)) {
      afficherMessageSauvegarde("Restauration annulée. Rien n'a été modifié.", true);
      return;
    }

    if (remplacerToutesLesDonnees(donnees)) {
      window.alert("✅ Données restaurées.");
      window.location.reload();
    } else {
      afficherMessageSauvegarde("❌ Restauration impossible. Vérifiez votre navigateur (mode privé ?).", false);
    }
  };
  lecteur.onerror = function () {
    afficherMessageSauvegarde("❌ Lecture du fichier impossible.", false);
  };
  lecteur.readAsText(fichier);
});

// ---------- Tout effacer (double confirmation) ----------

btnEffacer.addEventListener("click", function () {
  if (!window.confirm("Effacer TOUTES les données de cet appareil ?\n\n" +
      "Pensez à faire une sauvegarde avant.\nCette action est irréversible.")) {
    return;
  }
  if (!window.confirm("Dernière confirmation : toutes vos données seront perdues. Continuer ?")) {
    return;
  }
  effacerToutesLesDonnees();
  window.alert("Toutes les données ont été effacées.");
  window.location.reload();
});

// Au chargement de la page
afficherDerniereSauvegarde();