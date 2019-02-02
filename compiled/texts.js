"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("./util/logging");
// tslint:disable:object-literal-key-quotes
const texts = {
    "german": {
        // "welcome": ["sie haben den rundsendedienst unter '", "' erreicht"], // not used
        "introduction": "h fuer hilfe. kommandos mit (zv) bestaetigen",
        "modeChange": "neuer modus",
        "help": "hilfe fuer modus",
        "help explaination": "(komando)(parametertyp): (funktion)",
        "blacklisted": ["", " steht ", " auf der blacklist"],
        "not": "nicht",
        "blacklist anounce call": "wird in 30sek angerufen, um ihren blacklist status zu aendern",
        "no new entries": "keine neuen entraege gefunden",
        "not a language": ["'", "' ist keine gueltige sprache"],
        "changed language": ["sprache wurde zu '", "' geaendert"],
        "valid languages": "gueltige sprachen sind",
        "invalid mode": "ungueltiger modus",
        "no argument": "kein parameter angegeben",
        "no number": "keine nummer angegeben",
        "none reachable": ["Es konnten keine ", " erreicht werden"],
        "now connected": ["verbindung mit ", " ", " aufgebaut. verbindungsabbau mit '+++'"],
        "calling": ["rufe ", " ", " an:"],
        "transmission over": ["uebertragung beendet. bestaetige ", " "],
        "confirmation finished": "bestaetigung beendet",
        "peer": "teilnehmer",
        "peers": "teilnehmer",
        "help_b_b": "zurueck zum hauptmenue",
        "help_b_?": "blacklist status einer nummer auslesen",
        "help_b_.": "blacklist status einer nummer aendern",
        "help_b_l": "blacklist ausdrucken",
        "help_m_q": "verbindung abbauen",
        "help_m_i": "generelle informationen",
        "help_m_s": "teilnehmersuche",
        "help_m_=": "ausgewaehlte nummern anrufen",
        "help_m_b": "blacklist bearbeiten",
        "help_m_?": "ausgewaehlte nummern ausdrucken",
        "help_m_-": "ausgewahl einer nummer entfernen",
        "help_m_+": "nummer ausgewaehlen",
        "help_m_l": "sprache aendern",
        "no info": "keine info fuer sprache",
        "invalid command": "ungueltiges kommando",
        "unknown error": "unbekannter fehler",
    },
    "english": {
        // "welcome": ["you have reaced the broadcasting service under '", "'"], // not used
        "introduction": "Type commands followed by an argument if needed.\r\n(LF) to confirm, h for help",
        "modeChange": "new mode",
        "help": "help for mode",
        "help explaination": "(command)(type of argument): (function)",
        "blacklisted": ["", " is ", " blacklisted"],
        "not": "not",
        "blacklist anounce call": "will be called in 30sec to change their blacklist status",
        "no new entries": "no new entries found",
        "not a language": ["'", "' is not a valid language"],
        "changed language": ["changed language to '", "'"],
        "valid languages": "valid languages are",
        "invalid mode": "invalid mode",
        "no argument": "no argument specified",
        "no number": "no number specified",
        "none reachable": ["No ", " could be reached"],
        "now connected": ["Now connected to ", " ", ". Type '+++' to end message"],
        "calling": ["calling ", " ", ":"],
        "transmission over": ["transmission over. confirming ", " "],
        "confirmation finished": "confirmation finished",
        "peer": "peer",
        "peers": "peers",
        "help_b_b": "go back to the main menu",
        "help_b_?": "test if a number is blacklisted",
        "help_b_.": "(un-)blacklist a number",
        "help_m_q": "end the connection",
        "help_m_i": "general information",
        "help_m_s": "search for numbers (not in the call list) by name",
        "help_m_=": "call numbers in call list",
        "help_m_b": "modify blacklist",
        "help_m_?": "print call list",
        "help_m_-": "remove a number from call list",
        "help_m_+": "add a number to call list",
        "help_m_l": "change language",
        "no info": "no info for language",
        "invalid command": "invalid command",
        "unknown error": "unknown error",
    },
};
// tslint:disable:unified-signatures
function getText(language, text, args) {
    if (texts.hasOwnProperty(language) && texts[language].hasOwnProperty(text)) {
        // logger.log(inspect`got text ${text} for language ${language}`);
        let value = texts[language][text];
        if (typeof value === "string") {
            return value;
        }
        else {
            let string = "";
            for (let i in value) {
                string += value[i];
                if (args[i] !== undefined)
                    string += args[i];
            }
            return string;
        }
    }
    logging_1.logger.log(logging_1.inspect `\x1b[33mcould not find text ${text}\x1b[33m for language ${language}`);
    return '/no translation/';
}
exports.getText = getText;
function isLanguage(language) {
    return texts.hasOwnProperty(language);
}
exports.isLanguage = isLanguage;
function getValidLanguages() {
    return Object.keys(texts);
}
exports.getValidLanguages = getValidLanguages;
