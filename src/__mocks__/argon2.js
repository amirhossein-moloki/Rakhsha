const argon2 = jest.requireActual('argon2');

module.exports = {
    ...argon2,
    hash: (plain) => Promise.resolve(`hashed_${plain}`),
    verify: (hash, plain) => {
        // This mock logic assumes that if a hash starts with "hashed_",
        // it was created by our mock hash function.
        if (hash.startsWith('hashed_')) {
            const expectedHash = `hashed_${plain}`;
            return Promise.resolve(hash === expectedHash);
        }
        // For any other hash, fall back to the real verify function.
        return argon2.verify(hash, plain);
    },
};
