module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|zustand|@noble|@credo-ts|@hyperledger|mopro-ffi|uniffi-bindgen-react-native)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Reduce verbose output in test failures
  verbose: false,
  silent: false,
  // Limit error output
  errorOnDeprecated: false,
  // Custom reporter to truncate long strings
  reporters: [
    'default',
    '<rootDir>/jest-custom-reporter.js',
  ],
  // Bail on first failure to reduce noise
  bail: false,
  // Limit number of workers to reduce parallel noise
  maxWorkers: '50%',
};
