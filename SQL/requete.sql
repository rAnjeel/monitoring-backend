-- Désactive la vérification des contraintes de clés étrangères
SET FOREIGN_KEY_CHECKS = 0;

-- Vide la table historique et réinitialise son auto-incrémentation
TRUNCATE TABLE credentials_sites_historic;
ALTER TABLE credentials_sites_historic AUTO_INCREMENT = 1;

-- Vide la table principale et réinitialise son auto-incrémentation
TRUNCATE TABLE credentials_sites;
ALTER TABLE credentials_sites AUTO_INCREMENT = 1;

-- Réactive la vérification des contraintes de clés étrangères
SET FOREIGN_KEY_CHECKS = 1;

-- Recupere les dernieres dates ou il y a un erreur au niveau des credentials des sites
SELECT 
  cs.id,
  cs.Ip,
  cs.CodeSite,
  cs.siteUsername,
  cs.sitePassword,
  cs.isSitePasswordVerified,
  cs.sitePort,
  cs.siteSShVersion,
  cs.siteUsernameEntered,
  cs.sitePasswordEntered,
  cs.sitePortEntered,
  cs.lastDateChange,
  latest_historic.connectionErrorDate AS lastConnectionError
FROM credentials_sites cs
LEFT JOIN (
  SELECT siteId, MAX(connectionErrorDate) AS connectionErrorDate
  FROM credentials_sites_historic
  GROUP BY siteId
) AS latest_historic
ON cs.id = latest_historic.siteId;
