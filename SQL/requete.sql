-- Effacer les credentials
TRUNCATE TABLE credentials_sites_historic;
ALTER TABLE credentials_sites_historic AUTO_INCREMENT = 1;

TRUNCATE TABLE credentials_sites;
ALTER TABLE credentials_sites AUTO_INCREMENT = 1;

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
