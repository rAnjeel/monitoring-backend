CREATE DATABASE monitoring;
USE monitoring;

CREATE TABLE credentials_sites(
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(20),
    codeSite VARCHAR(50),
    siteUsername VARCHAR(5),
    sitePassword VARCHAR(5),
    isSitePasswordVerified INT,
    sitePort INT,
    siteSShVersion VARCHAR(30)
);

ALTER TABLE credentials_sites
ADD COLUMN siteUsernameEntered VARCHAR(50),
ADD COLUMN sitePasswordEntered VARCHAR(50),
ADD COLUMN sitePortEntered INT;

ALTER TABLE credentials_sites
ADD COLUMN lastDateChange TIMESTAMP;

CREATE TABLE credentials_sites_historic(
    id INT AUTO_INCREMENT PRIMARY KEY,
    connectionErrorDate TIMESTAMP,
    errorDescription TEXT,
    errorResolutionDate TIMESTAMP,
    errorStatus VARCHAR(50) 
);


