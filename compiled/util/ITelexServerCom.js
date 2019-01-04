"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const APICall_1 = require("./APICall");
const config_json_1 = require("../../config.json");
async function peerQuery(number) {
    return await APICall_1.default('GET', config_json_1.TLN_SERVER_HOST, config_json_1.TLN_SERVER_PORT, `/public/entry/${encodeURIComponent(number.toString())}`);
}
exports.peerQuery = peerQuery;
async function Peer_search(pattern) {
    return await APICall_1.default('GET', config_json_1.TLN_SERVER_HOST, config_json_1.TLN_SERVER_PORT, `/public/search?q=${encodeURIComponent(pattern)}`);
}
exports.Peer_search = Peer_search;
