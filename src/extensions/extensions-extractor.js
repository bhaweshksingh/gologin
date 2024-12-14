import decompress from 'decompress';
import decompressUnzip from 'decompress-unzip';
import { promises } from 'fs';

const { access, unlink, stat } = promises;

export const extractExtension = (source, dest) => {
  if (!(source && dest)) {
    throw new Error('Missing parameter');
  }
  return stat(dest)
      .then((stats) => {
        if (stats.isDirectory() || stats.isFile()) {
          console.log(`Destination ${dest} already exists, skipping extraction`);
          return Promise.resolve();
        }
      })
      .catch((err) => {
        if (err.code !== 'ENOENT') {
          throw err;
        }

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
      });
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
