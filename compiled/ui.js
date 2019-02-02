"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const blacklist_1 = require("./blacklist");
const ITelexServerCom_1 = require("./util/ITelexServerCom");
const texts_1 = require("./texts");
const info_1 = require("./info");
const commands_main = {
    'h': {
        help: false,
        needsNumber: null,
        action: language => {
            return {
                response: printHelp(language, 'main'),
            };
        },
    },
    '+': {
        help: true,
        needsNumber: true,
        action: (language, number, callList) => {
            if (callList.indexOf(number) === -1) {
                callList.push(number);
            }
            return {};
        },
    },
    '-': {
        help: true,
        needsNumber: true,
        action: (language, number, callList) => {
            const index = callList.indexOf(number);
            if (index > -1) {
                callList.splice(index, 1);
            }
            return {};
        },
    },
    '?': {
        help: true,
        needsNumber: null,
        action: (language, number, callList) => {
            return {
                response: printList(callList),
            };
        },
    },
    'b': {
        help: true,
        needsNumber: null,
        action: () => {
            return {
                newMode: 'blacklist',
            };
        },
    },
    '=': {
        help: true,
        needsNumber: null,
        action: (language, number, callList) => {
            return {
                end: true,
                nextAction: 'call',
            };
        },
    },
    's': {
        help: true,
        needsNumber: false,
        action: async (language, number, callList, answer) => {
            let entries = [];
            try {
                entries = await ITelexServerCom_1.Peer_search(answer);
            }
            catch (err) { /**/ }
            const maxLength = Math.max(...entries.map(x => x.number.toString().length));
            const newEntries = entries.filter(x => !~callList.indexOf(x.number));
            if (newEntries.length) {
                var response = newEntries.map(x => `${x.number.toString().padStart(maxLength)}: ${x.name}`).join('\r\n');
            }
            else {
                var response = texts_1.getText(language, 'no new entries');
            }
            return {
                response,
            };
        },
    },
    'i': {
        help: true,
        needsNumber: null,
        action: language => {
            return {
                response: info_1.default(language),
            };
        },
    },
    'q': {
        help: true,
        needsNumber: null,
        action: () => {
            return {
                end: true,
                nextAction: 'end',
            };
        },
    },
    'l': {
        help: true,
        needsNumber: false,
        action: (language, number, callList, answer) => {
            if (texts_1.isLanguage(answer)) {
                return {
                    newLanguage: answer,
                    response: texts_1.getText(answer, 'introduction'),
                };
            }
            else {
                return {
                    response: texts_1.getText(language, 'not a language', [answer]) +
                        '\r\n' +
                        texts_1.getText(language, 'valid languages') +
                        ': ' +
                        texts_1.getValidLanguages().join(', '),
                };
            }
        },
    },
};
const commands_blacklist = {
    'h': {
        help: false,
        needsNumber: null,
        action: (language) => {
            return {
                response: printHelp(language, 'blacklist'),
            };
        },
    },
    '.': {
        help: true,
        needsNumber: true,
        action: async (language, number) => {
            if (!number) {
                throw new Error('not a Number');
            }
            await blacklist_1.updateBlacklistForNumber(number);
            return {
                end: true,
                nextAction: 'end',
                response: `${number} ${texts_1.getText(language, 'blacklist anounce call')}`,
            };
        },
    },
    '?': {
        help: true,
        needsNumber: true,
        action: (language, number) => {
            return {
                response: texts_1.getText(language, 'blacklisted', [
                    number,
                    blacklist_1.isBlacklisted(number) ?
                        '' :
                        texts_1.getText(language, 'not'),
                ]),
            };
        },
    },
    'l': {
        help: true,
        needsNumber: null,
        action: (language, number) => {
            return {
                response: printBlacklist(),
            };
        },
    },
    'b': {
        help: true,
        needsNumber: null,
        action: () => {
            return {
                newMode: 'main',
            };
        },
    },
};
let commands = {};
commands.main = commands_main;
commands.blacklist = commands_blacklist;
function printList(callList) {
    let lines = [''];
    let index = 0;
    for (const i in callList) {
        const number = callList[i];
        if (lines[index].length + 2 + number.toString().length > 60) {
            lines[++index] = '';
        }
        lines[index] += number.toString();
        if (+i !== callList.length - 1)
            lines[index] += ', ';
    }
    return lines.join('\r\n');
}
function printBlacklist() {
    let blacklist = blacklist_1.getBlacklist();
    return printList(blacklist);
}
function printHelp(language, mode) {
    const commandsForMode = commands[mode];
    if (!commandsForMode)
        throw new Error("invalid mode");
    let helpString = `${texts_1.getText(language, 'help')}: ${mode}\r\n\n`;
    helpString += texts_1.getText(language, "help explaination") + '\r\n';
    for (const key in commandsForMode) {
        const command = commandsForMode[key];
        if (command.help) {
            const argType = command.needsNumber === null ? ' ' : (command.needsNumber ? 'n' : 't');
            helpString += `${key} (${argType}): ${texts_1.getText(language, `help_${mode[0]}_${key}`)}\r\n`;
        }
    }
    return helpString;
}
async function handleCommand(input, mode, callList, language) {
    if (input === '')
        return {};
    if (input[input.length - 1] === '-')
        return {};
    const identifier = input[0];
    const answer = input.slice(1);
    let number = parseInt(answer);
    if (isNaN(number))
        number = null;
    const commandsForMode = commands[mode];
    if (!commandsForMode)
        throw new Error('invalid mode');
    if (commandsForMode.hasOwnProperty(identifier)) {
        try {
            if (commandsForMode[identifier].needsNumber === true && !number) {
                throw new Error(texts_1.getText(language, 'no number'));
            }
            else if (commandsForMode[identifier].needsNumber === false && !answer) {
                throw new Error(texts_1.getText(language, 'no argument'));
            }
            return await commandsForMode[identifier].action(language, number, callList, answer);
        }
        catch (err) {
            return {
                response: err.message || err || texts_1.getText(language, 'unknown error'),
            };
        }
    }
    else {
        return {
            response: texts_1.getText(language, 'invalid command'),
        };
    }
}
function ui(readline) {
    return new Promise((resolve, reject) => {
        let mode = 'main';
        let callList = [];
        let language = "german";
        readline.output.write(texts_1.getText(language, 'introduction') + '\r\n');
        function promptCommand() {
            readline.question('- ', async (answer) => {
                readline.output.write('\r');
                const result = await handleCommand(answer, mode, callList, language);
                if (result.newLanguage) {
                    language = result.newLanguage;
                    readline.output.write(texts_1.getText(language, 'changed language', [language]) + '\r\n');
                }
                if (result.response)
                    readline.output.write(result.response + '\r\n');
                if (result.newMode) {
                    mode = result.newMode;
                    readline.output.write(`${texts_1.getText(language, "modeChange")}: ${mode}\r\n`);
                }
                if (result.end) {
                    readline.close();
                    resolve({
                        nextAction: result.nextAction,
                        callList,
                        language,
                    });
                }
                else {
                    promptCommand();
                }
            });
        }
        promptCommand();
    });
}
exports.default = ui;
