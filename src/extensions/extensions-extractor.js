import decompress from 'decompress';
import decompressUnzip from 'decompress-unzip';
import {promises} from 'fs';

const {access, unlink, stat} = promises;

const getOperatingSystem = () => {
    // Using process.platform from Node.js
    switch (process.platform) {
        case 'win32':
            return 'windows';
        case 'darwin':
            return 'macos';
        case 'linux':
            return 'linux';
        default:
            return 'unknown';
    }
};

function performExtraction(source, dest) {
    return access(source)
        .then(() => withRetry({
            fn() {
                return decompress(source, dest, {
                    plugins: [decompressUnzip()], filter: (file) => {
                        return !file.path.endsWith('/');
                    },
                });
            },
        }),);
}

const isLinux = () => getOperatingSystem() === 'linux';

export const extractExtension = (source, dest) => {
    if (!(source && dest)) {
        throw new Error('Missing parameter');
    }
    return performExtraction(source, dest);

    // return stat(dest)
    //     .then((stats) => {
    //         if (isLinux()) {
    //             return performExtraction(source, dest);
    //         } else if ((stats.isDirectory() || stats.isFile()) && !isLinux) {
    //             console.log(`Destination ${dest} already exists, skipping extraction`);
    //             return [];
    //         }
    //
    //     })
    //     .catch((err) => {
    //         if (err.code !== 'ENOENT') {
    //             throw err;
    //         }
    //
    //         return performExtraction(source, dest);
    //     });
}

export const deleteExtensionArchive = (dest) => {
    if (!dest) {
        throw new Error('Missing parameter');
    }

    return access(dest)
        .then(
            () => unlink(dest),
            () => Promise.resolve(),
        );
}

const withRetry = optionsOrUndefined => {
    const opts = optionsOrUndefined || {};
    const callCounter = opts.callCounter || 1;
    const fnToProducePromise = opts.fn;
    const callLimit = opts.limit || 5;
    delete opts.callCounter;

    return fnToProducePromise(opts).catch(err => {
        console.error(err);
        if (callCounter >= callLimit) {
            return Promise.reject(err);
        }

        opts.callCounter = callCounter + 1;

        return new Promise(resolve => process.nextTick(resolve)).then(() =>
            withRetry(opts),
        );
    });
};
