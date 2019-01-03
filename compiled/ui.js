"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const blacklist_1 = require("./blacklist");
const ITelexServerCom_1 = require("./util/ITelexServerCom");
const commands_main = {
    'h': {
        // help: "prints this help",
        help: null,
        needsNumber: null,
        action: () => {
            return {
                end: false,
                response: printHelp('main'),
            };
        },
    },
    '+': {
        help: "add a number to call list",
        needsNumber: true,
        action: (number, callList) => {
            if (callList.indexOf(number) === -1) {
                callList.push(number);
            }
            return {
                end: false,
            };
        },
    },
    '-': {
        help: "remove a number from call list",
        needsNumber: true,
        action: (number, callList) => {
            const index = callList.indexOf(number);
            if (index > -1) {
                callList.splice(index, 1);
            }
            return {
                end: false,
            };
        },
    },
    '?': {
        help: "print call list",
        needsNumber: null,
        action: (number, callList) => {
            return {
                end: false,
                response: printCallList(callList),
            };
        },
    },
    'b': {
        help: "modify blacklist",
        needsNumber: null,
        action: () => {
            return {
                end: false,
                newMode: 'blacklist',
            };
        },
    },
    '=': {
        help: "call numbers in call list",
        needsNumber: null,
        action: (number, callList) => {
            return {
                end: true,
                nextAction: 'call',
            };
        },
    },
    's': {
        help: "search for numbers (not in the call list) by name",
        needsNumber: false,
        action: async (number, callList, answer) => {
            const entries = await ITelexServerCom_1.Peer_search(answer);
            const maxLength = Math.max(...entries.map(x => x.number.toString().length));
            const newEntries = entries.filter(x => !~callList.indexOf(x.number));
            if (newEntries.length) {
                var response = newEntries.map(x => `${x.number.toString().padStart(maxLength)}: ${x.name}`).join('\r\n');
            }
            else {
                var response = 'no new entries found';
            }
            return {
                end: false,
                response,
            };
        },
    },
    'q': {
        help: "end the connection",
        needsNumber: null,
        action: () => {
            return {
                end: true,
                nextAction: 'end',
            };
        },
    },
};
const commands_blacklist = {
    'h': {
        // help: "prints this help",
        help: null,
        needsNumber: null,
        action: () => {
            return {
                end: false,
                response: printHelp('blacklist'),
            };
        },
    },
    '.': {
        help: "(un-)blacklist a number",
        needsNumber: true,
        action: async (number) => {
            if (!number) {
                throw new Error('not a Number');
            }
            await blacklist_1.updateBlacklistForNumber(number);
            return {
                end: true,
                nextAction: 'end',
                response: `${number} will be called in 1min to change their blacklist status`,
            };
        },
    },
    '?': {
        help: "test if a number is blacklisted",
        needsNumber: true,
        action: number => {
            return {
                end: false,
                response: `${number} is ${blacklist_1.isBlacklisted(number) ? '' : 'not'} blacklisted.`,
            };
        },
    },
    'b': {
        help: "go back to the main menu",
        needsNumber: null,
        action: () => {
            return {
                end: false,
                newMode: 'main',
            };
        },
    },
};
let commands = {};
commands.main = commands_main;
commands.blacklist = commands_blacklist;
function printCallList(callList) {
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
function printHelp(mode) {
    const commandsForMode = commands[mode];
    if (!commandsForMode)
        throw new Error("invalid mode");
    let helpString = `help for mode: ${mode}\r\n\n`;
    helpString += "(command) (type of argument): (function)\r\n";
    for (const key in commandsForMode) {
        const command = commandsForMode[key];
        if (command.help) {
            const argType = command.needsNumber === null ? ' ' : (command.needsNumber ? 'n' : 't');
            helpString += `${key} (${argType}): ${command.help}\r\n`;
        }
    }
    return helpString;
}
async function handleCommand(input, mode, callList) {
    const identifier = input[0];
    const answer = input.slice(1);
    let number = parseInt(answer);
    if (isNaN(number))
        number = null;
    const commandsForMode = commands[mode];
    if (!commandsForMode)
        throw new Error("invalid mode");
    if (commandsForMode.hasOwnProperty(identifier)) {
        try {
            if (commandsForMode[identifier].needsNumber === true && !number) {
                throw new Error('no number specified.');
            }
            else if (commandsForMode[identifier].needsNumber === false && !answer) {
                throw new Error('no argument specified.');
            }
            return await commandsForMode[identifier].action(number, callList, answer);
        }
        catch (err) {
            return {
                end: false,
                response: err.message || err || 'unknown error',
            };
        }
    }
    else {
        return {
            end: false,
            response: "invalid command",
        };
    }
}
function ui(readline) {
    return new Promise((resolve, reject) => {
        readline.output.write("Type commands followed by an argument if needed.\r\n(LF) to confirm, h for help\r\n");
        let mode = 'main';
        let callList = [];
        function promptCommand() {
            readline.question('- ', async (answer) => {
                const result = await handleCommand(answer, mode, callList);
                if (result.response)
                    readline.output.write(result.response + '\r\n');
                if (result.newMode) {
                    mode = result.newMode;
                    readline.output.write(`mode: ${mode}\r\n`);
                }
                if (result.end) {
                    readline.close();
                    resolve({
                        nextAction: result.nextAction,
                        callList,
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
