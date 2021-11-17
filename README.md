## MESE Wallet

An open-source, security audited, Algorand MESE wallet browser extension that lets users approve and sign transactions that are generated by Algorand DApp applications — available for Chrome.

_This is the preferred solution for end-users, updates will be automatically installed after review by the extension store_

Developers working with DApps may also install directly from the release package, or by downloading the project and building it.

## DApp MESE Integration

This release Create functionality for DApp developers. Designed to meet the upcoming Algorand Foundation standards it will greatly simplifying complex signing scenarios like Multisignature and Atomic. Encoding is standardized and new helper functions simplify the complexity.

[DApp Integration](docs/dApp-integration.md)

## Local Development

- Clone repository to the local `https://github.com/InternationalBlockchainMonetaryReserve/mese-wallet.git`
- Checkout to `mese` branch and pull the latest `git checkout mese && git pull`
- Do `npm install && npm run build`
- Open Chrome Browser and go to `chrome://extensions/`
- Enable developer mode
- Select `Load Unpacked` and choose the unzipped `dist` folder
- Mese Wallet is now installed and available

[Local/Development Installation Guid](docs/zip-installation.md)

### MESE Wallet development

For developers interested in working with MESE Wallet [Extension Guide](docs/extension-developers.md). A contribution guide is in development.

## License

This project is under the MIT License
