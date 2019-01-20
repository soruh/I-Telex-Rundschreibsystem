import { getText } from "./texts";

const infoEN = 
`No english info yet`
.replace(/\r/g, '').replace(/\n/g, '\r\n');

const infoDE =
`--- kennungsgeberabfrage fehlercodes ---:
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

// const info = `DE:\r\n${infoDE}\r\n\nEN:\r\n${infoEN}`;

type language = "german"|"english";

function getInfo(language:language):string{
	switch(language){
		case "german":
			return infoDE;
		default:
			return getText(language, 'no info')+': '+language;
	}
}

export default getInfo;
