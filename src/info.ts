const infoEN = 
`No english info yet`
.replace(/\r/g, '').replace(/\n/g, '\r\n');

const infoDE =
`programmiert von: Paul Roemer
github: github.com/soruh/I-Telex-Rundschreibsystem


durch nutzung dieses systems aktzeptiert
der benutzer folgendes:


der programmierer und betreiber dieses systems uebernehmen
keinerlei verantworung für moeglichen missbrauch dieses
systems oder schaeden jeglicher art, die durch dessen
benutzung zu stande kommen.

saemtliche versendeten nachrichten werden, absender und
empfängern zugeordnet, zur auswertung, im falle
von missbrauch oder missbrauchsverdacht gespeichert.


kontakt:
   email: mail(at)soruh.de
   telex: 41235
`
.replace(/\r/g, '').replace(/\n/g, '\r\n');

// const info = `DE:\r\n${infoDE}\r\n\nEN:\r\n${infoEN}`;

const info = infoDE;

export default info;
