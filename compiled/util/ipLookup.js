"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
Object.defineProperty(exports, "__esModule", { value: true });
const ITelexServerCom_1 = require("./ITelexServerCom");
const dns_1 = require("dns");
const util_1 = require("util");
const ip_1 = require("ip");
const logging_1 = require("./logging");
async function checkIp(ipAddress) {
    let peers = await ITelexServerCom_1.fullQuery();
    let ipPeers = [];
    for (let peer of peers) {
        if ((!peer.ipaddress) && peer.hostname) {
            // logger.log( inspect`hostname: ${peer.hostname}`)
            try {
                let { address, family } = await util_1.promisify(dns_1.lookup)(peer.hostname);
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
}
exports.checkIp = checkIp;
