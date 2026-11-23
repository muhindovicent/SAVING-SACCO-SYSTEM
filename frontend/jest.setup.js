import '@testing-library/jest-dom';

const TextEncoder = require('util').TextEncoder;
const TextDecoder = require('util').TextDecoder;

Object.assign(global, { TextEncoder, TextDecoder });

global.crypto = {
  subtle: {
    digest: async (algorithm, data) => {
      const hash = await crypto.subtle.digest(algorithm, data);
      return hash;
    },
  },
  getRandomValues: (arr) => crypto.getRandomValues(arr),
};