import { LedgerTemplate } from '@mese/common/types/ledgers';
import { Ledger, Backend, API } from './messaging/types';

export class Settings {
  static backend: Backend = Backend.MESE;
  static backend_settings: { [key: string]: any } = {
    [Backend.MESE]: {
      [Ledger.TestNet]: {
        [API.Algod]: {
          url: 'https://wallet.mese.io/testnet/api/algod',
          port: '',
          baseUrl: 'https://wallet.mese.io/testnet/api',
        },
        [API.Indexer]: {
          url: 'https://wallet.mese.io/testnet/api/idx',
          port: '',
          baseUrl: 'https://wallet.mese.io/testnet/api',
        },
      },
      [Ledger.MainNet]: {
        [API.Algod]: {
          url: 'https://wallet.mese.io/api/algod',
          port: '',
          baseUrl: 'https://wallet.mese.io/api',
        },
        [API.Indexer]: {
          url: 'https://wallet.mese.io/api/idx',
          port: '',
          baseUrl: 'https://wallet.mese.io/api',
        },
      },
      apiKey: {},
    },
    InjectedNetworks: {},
  };

  public static deleteInjectedNetwork(ledgerUniqueName: string) {
    delete this.backend_settings.InjectedNetworks[ledgerUniqueName];
  }

  // Returns a copy of Injected networks with just basic information for dApp or display.
  public static getCleansedInjectedNetworks() {
    const injectedNetworks = [];
    const injectedNetworkKeys = Object.keys(this.backend_settings.InjectedNetworks);
    for (var i = 0; i < injectedNetworkKeys.length; i++) {
      injectedNetworks.push({
        name: this.backend_settings.InjectedNetworks[injectedNetworkKeys[i]].name,
        genesisId: this.backend_settings.InjectedNetworks[injectedNetworkKeys[i]].genesisId,
      });
    }

    return injectedNetworks;
  }

  private static setInjectedHeaders(ledger: LedgerTemplate) {
    if (!this.backend_settings.InjectedNetworks[ledger.name]) {
      console.log('Error: Ledger headers can not be updated. Ledger not available.');
      return;
    }

    // Initialize headers for apiKey and individuals if there
    let headers = {};
    let headersAlgod = undefined;
    let headersIndexer = undefined;
    if (ledger['headers']) {
      // Set the headers to the base level first, this allows a string key to be used
      headers = ledger['headers'];

      // Then try to parse the headers, in the case it is a string object.
      try {
        headers = JSON.parse(ledger['headers']);
      } catch (e) {
        // Use headers default value, but use it as a token if it is a string
        if (typeof headers === 'string') {
          // Requests directly to a server would not require the X-API-Key
          // This is the case for most users and is now the default for a string only method.
          headers = { 'X-Algo-API-Token': headers };
        }
      }

      // Get individual sub headers if they are available
      if (headers['Algod']) {
        headersAlgod = headers['Algod'];
      }
      if (headers['Indexer']) {
        headersIndexer = headers['Indexer'];
      }
    }

    // Add the algod links defaulting the url to one based on the genesisId
    let defaultUrl = 'http://localhost:8088/api';
    if (ledger.genesisId && ledger.genesisId.indexOf('testnet') > -1) {
      defaultUrl = 'http://localhost:8088/api';
    }
    this.backend_settings.InjectedNetworks[ledger.name][API.Algod] = {
      url: ledger.algodUrl || `${defaultUrl}/algod`,
      port: '',
      baseUrl: ledger.baseUrl,
      apiKey: headersAlgod || headers,
      headers: headersAlgod || headers,
    };

    // Add the indexer links
    this.backend_settings.InjectedNetworks[ledger.name][API.Indexer] = {
      url: ledger.indexerUrl || `${defaultUrl}/idx`,
      port: '',
      baseUrl: ledger.baseUrl,
      apiKey: headersIndexer || headers,
      headers: headersIndexer || headers,
    };

    this.backend_settings.InjectedNetworks[ledger.name].headers = headers;
  }

  public static addInjectedNetwork(ledger: LedgerTemplate) {
    // Initialize the injected network with the genesisId and a name that mimics the ledger for reference
    this.backend_settings.InjectedNetworks[ledger.name] = {
      name: ledger.name,
      genesisId: ledger.genesisId || '',
    };

    this.setInjectedHeaders(ledger);
  }

  public static updateInjectedNetwork(updatedLedger: LedgerTemplate) {
    this.backend_settings.InjectedNetworks[updatedLedger.name].genesisId = updatedLedger.genesisId;
    this.backend_settings.InjectedNetworks[updatedLedger.name].symbol = updatedLedger.symbol;
    this.backend_settings.InjectedNetworks[updatedLedger.name].genesisHash =
      updatedLedger.genesisHash;
    this.backend_settings.InjectedNetworks[updatedLedger.name].algodUrl = updatedLedger.algodUrl;
    this.backend_settings.InjectedNetworks[updatedLedger.name].indexerUrl =
      updatedLedger.indexerUrl;
    this.setInjectedHeaders(updatedLedger);
  }

  public static getBackendParams(ledger: string, api: API) {
    // If we are using the MESE backend we can return the url, port, and apiKey
    if (this.backend_settings[this.backend][ledger]) {
      return {
        url: this.backend_settings[this.backend][ledger][api].url,
        port: this.backend_settings[this.backend][ledger][api].port,
        apiKey: this.backend_settings[this.backend].apiKey,
        baseUrl: this.backend_settings[this.backend][ledger][api].baseUrl,
        headers: {},
      };
    }

    // Here we have to grab data from injected networks instead of the backend
    return {
      url: this.backend_settings.InjectedNetworks[ledger][api].url,
      port: '',
      apiKey: this.backend_settings.InjectedNetworks[ledger][api].apiKey,
      headers: this.backend_settings.InjectedNetworks[ledger][api].headers,
      baseUrl: this.backend_settings.InjectedNetworks[ledger][api].baseUrl,
    };
  }
}
