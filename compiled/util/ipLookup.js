"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ITelexServerCom_1 = require("./ITelexServerCom");
const dns_1 = require("dns");
const util_1 = require("util");
const ip_1 = require("ip");
const logging_1 = require("./logging");
function checkIp(ipAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        let peers = yield ITelexServerCom_1.fullQuery();
        let ipPeers = [];
        for (let peer of peers) {
            if ((!peer.ipaddress) && peer.hostname) {
                // logger.log( inspect`hostname: ${peer.hostname}`)
                try {
                    let { address, family } = yield util_1.promisify(dns_1.lookup)(peer.hostname);
                    if (address)
                        ipPeers.push({
                            peer,
                            ipaddress: address,
                        });
                }
                catch (e) {
                    logging_1.logger.log(logging_1.inspect `ip resolution failed: ${e}`);
                }
            }
            else if (peer.ipaddress && (ip_1.isV4Format(peer.ipaddress) || ip_1.isV6Format(peer.ipaddress))) {
                // logger.log( inspect`ip: ${peer.ipaddress}`);
                ipPeers.push({
                    peer,
                    ipaddress: peer.ipaddress,
                });
            }
        }
        let matches = ipPeers.filter(peer => ip_1.isEqual(peer.ipaddress, ipAddress))
            .map(match => match.peer);
        return matches.length > 0 ? matches : null;
    });
}
exports.checkIp = checkIp;
