// stubs/ci-info.js
// Minimal stub so Next's telemetry import doesn't fail.
// Matches the shape used by next/dist/telemetry/utils.js.

const ciInfo = {
  isCI: false,
  isPR: false,
  name: null,
};

// Support both require('ci-info') and import default from 'ci-info'
module.exports = ciInfo;
module.exports.default = ciInfo;
