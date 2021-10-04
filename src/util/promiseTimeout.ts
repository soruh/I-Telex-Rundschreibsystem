export function sleep(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
}

export async function withTimeout<T>(duration: number, promise: Promise<T>): Promise<T> {
    let timeout_promise = (async function () {
        await sleep(duration);

        throw new Error("timeout");
    })();

    return Promise.race([promise, timeout_promise]);
}

