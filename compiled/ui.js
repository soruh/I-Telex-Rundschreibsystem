"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const blacklist_1 = require("./blacklist");
const commands_main = {
    'h': {
        // help: "prints this help",
        help: null,
        argument: false,
        action: () => {
            return {
                end: false,
                response: printHelp('main'),
            };
        },
    },
    '+': {
        help: "add a number to call list",
        argument: true,
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
        argument: true,
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
        argument: false,
        action: (number, callList) => {
            return {
                end: false,
                response: printCallList(callList),
            };
        },
    },
    'b': {
        help: "modify blacklist",
        argument: false,
        action: () => {
            return {
                end: false,
                newMode: 'blacklist',
            };
        },
    },
    '=': {
        help: "call numbers in call list",
        argument: false,
        action: (number, callList) => {
            return {
                end: true,
                nextAction: 'call',
            };
        },
    },
};
const commands_blacklist = {
    'h': {
        // help: "prints this help",
        help: null,
        argument: false,
        action: () => {
            return {
                end: false,
                response: printHelp('blacklist'),
            };
        },
    },
    '.': {
        help: "(un-)blacklist a number",
        argument: true,
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
        argument: true,
        action: number => {
            return {
                end: false,
                response: `${number} is ${blacklist_1.isBlacklisted(number) ? '' : 'not'} blacklisted.`,
            };
        },
    },
    'b': {
        help: "go back to the main menu",
        argument: false,
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
    helpString += "(command) (followed by a number?): (function)\r\n";
    for (const key in commandsForMode) {
        const command = commandsForMode[key];
        if (command.help)
            helpString += `${key} (${command.argument ? '+' : '-'}): ${command.help}\r\n`;
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
            if (commandsForMode[identifier].argument && !number) {
                throw new Error('no number specified.');
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
        readline.output.write("Type commands followed by a number if needed. LF to confirm\r\nh for help\r\n");
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
