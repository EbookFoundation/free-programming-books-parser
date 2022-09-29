/** @type {import('jest').Config} */
const config = {
  bail: 0,
  collectCoverageFrom: ["lib/**/*.js"],
  moduleDirectories: ["node_modules"],
  testEnvironment: "node",
  verbose: true,
};

module.exports = config;
