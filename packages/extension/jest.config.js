module.exports = {
  verbose: true,
  moduleNameMapper: {
    "^@mese/common(.*)$": "<rootDir>/../common/src$1",
    "^@mese/crypto(.*)$": "<rootDir>/../crypto/$1",
    "^@mese/storage(.*)$": "<rootDir>/../storage/$1",
    "^@algosdk$": "<rootDir>/node_modules/algosdk"
  },
  setupFiles: [
    "jest-webextension-mock"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  }
}