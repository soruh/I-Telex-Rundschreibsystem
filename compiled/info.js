"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const texts_1 = require("./texts");
const infoEN = `No english info yet`
    .replace(/\r/g, '').replace(/\n/g, '\r\n');
const infoDE = `--- kennungsgeberabfrage fehlercodes ---:
sbk: die verbindung wurde waerend der abfrage getrennt
nc : es konnte keine verbindung zum angerufenen hergestellt werden
df : kein kennungsgeber / keine antwort


--- nutzungsinformationen ---:
durch nutzung dieses systems aktzeptiert
der benutzer folgendes:

der programmierer, sowie der betreiber dieses systems uebernehmen
keinerlei verantworung fuer moeglichen missbrauch dieses
systems oder schaeden jeglicher art, die durch dessen
benutzung zu stande kommen.

saemtliche versendeten nachrichten werden, absender und
empfaengern zugeordnet, zur auswertung, im falle
von missbrauch oder missbrauchsverdacht gespeichert.


--- sonstiges ---:
programmiert von: paul roemer
github: github.com/soruh/i-telex-rundschreibsystem

kontakt:
	email: mail(at)soruh.de
	telex: 41235
`
    .replace(/\r/g, '').replace(/\n/g, '\r\n');
function getInfo(language) {
    switch (language) {
        case "german":
            return infoDE;
        default:
            return (0, texts_1.getText)(language, 'no info') + ': ' + language;
    }
}
exports.default = getInfo;
