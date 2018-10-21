"use strict";
function call() {
    const internal = client.interface.internal;
    internal.write('\r\n');
    readline.close();
    let output = callGroup(client.numbers, (connections) => {
        connections = connections.filter(x => x);
        output.unpipe(internal);
        // tslint:disable-next-line:max-line-length
        internal.write(`You are now connected to ${connections.length} peer${connections.length === 1 ? '' : 's'}. Type '+++' to end message\r\n`);
        for (let connection of connections) {
            connection.interface.internal.write('\r\n');
            internal.pipe(connection.interface.internal);
        }
        let detector = new CallEndDetector();
        internal.pipe(detector);
        detector.emitter.on('end', () => {
            internal.unpipe(detector);
            for (let connection of connections) {
                internal.pipe(connection.interface.internal);
            }
            internal.write(`\r\n\nStopped transmitting message\r\n`);
            logger.log("message ended");
            // logger.log(connections);
            serialEachPromise(connections, (connection, index) => new Promise((resolve, reject) => {
                logger.log(`confirming: ${connection.number} (${connection.name})`);
                internal.write(`confirming: ${connection.number} (${connection.name})\r\n`);
                internal.write(`${DELIMITER}\r\n`);
                if (connection.interface.drained !== false) {
                    // drained == true or drained == undefined (for Ascii clients)
                    logger.log('was already drained');
                    confirmClient();
                }
                else {
                    logger.log("wasn't already drained");
                    connection.interface.once('drain', () => {
                        logger.log('is now drained');
                        confirmClient();
                    });
                }
                function confirmClient() {
                    function close() {
                        internal.write(`${DELIMITER}\r\n\n`);
                        connection.interface.internal.unpipe(internal);
                        if (connection.interface instanceof BaudotInterface) {
                            connection.interface.sendEnd();
                            setTimeout(() => {
                                connection.interface.end();
                                connection.socket.end();
                            }, 2000);
                        }
                        else {
                            connection.interface.end();
                            connection.socket.end();
                        }
                        resolve();
                    }
                    let timeout = setTimeout(() => {
                        internal.write('timeout\r\n');
                        close();
                    }, 10000);
                    confirm(connection.interface.internal, internal, timeout, +index)
                        .then(() => {
                        internal.write('\r\n');
                        close();
                    })
                        .catch(err => {
                        logger.log(inspect `error: ${err}`);
                        internal.write('error\r\n');
                        close();
                    });
                }
            }))
                .then(() => {
                logger.log("confirmed all peers");
                internal.write('\r\nconfirmed all peers\r\n\r\n');
                if (client.interface instanceof BaudotInterface) {
                    client.interface.sendEnd();
                    setTimeout(() => {
                        client.interface.end();
                        client.socket.end();
                    }, 2000);
                }
                else {
                    client.interface.end();
                    client.socket.end();
                }
            })
                .catch(err => logger.log(inspect `confirmation error: ${err}`));
        });
    });
    output.pipe(internal);
}
