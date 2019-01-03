"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const APICall_1 = require("./APICall");
const SERVER_HOST = 'telexgateway.de';
const SERVER_PORT = 11812;
async function peerQuery(number) {
    return await APICall_1.default('GET', SERVER_HOST, SERVER_PORT, `/public/entry/${encodeURIComponent(number.toString())}`);
}
exports.peerQuery = peerQuery;
async function Peer_search(pattern) {
    return await APICall_1.default('GET', SERVER_HOST, SERVER_PORT, `/public/search?q=${encodeURIComponent(pattern)}`);
}
exports.Peer_search = Peer_search;
