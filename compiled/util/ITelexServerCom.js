"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.peerQuery = exports.Peer_search = void 0;
const APICall_1 = require("./APICall");
const config_1 = require("../config");
async function peerQuery(number) {
    if (config_1.LOCAL_NUMBER && number === config_1.LOCAL_NUMBER)
        return {
            extension: '0',
            hostname: 'localhost',
            port: '4242',
            disabled: 0,
            ipaddress: null,
            name: 'LOCAL',
            number: 1,
            pin: '0',
            timestamp: 0,
            type: 3,
        };
    return await (0, APICall_1.default)('GET', config_1.TLN_SERVER_HOST, config_1.TLN_SERVER_PORT, `/public/entry/${encodeURIComponent(number.toString())}`);
}
exports.peerQuery = peerQuery;
async function Peer_search(pattern) {
    return await (0, APICall_1.default)('GET', config_1.TLN_SERVER_HOST, config_1.TLN_SERVER_PORT, `/public/search?q=${encodeURIComponent(pattern)}`);
}
exports.Peer_search = Peer_search;
