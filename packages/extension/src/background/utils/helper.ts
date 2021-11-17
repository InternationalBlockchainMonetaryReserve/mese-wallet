/* eslint-disable @typescript-eslint/no-var-requires */
const algosdk = require('algosdk');
import { getBaseSupportedLedgers, LedgerTemplate } from '@mese/common/types/ledgers';
import { ExtensionStorage } from '@mese/storage/src/extensionStorage';
import { Settings } from '../config';
import { API, Cache, Ledger } from '../messaging/types';

export function getAlgod(ledger: string) {
  const params = Settings.getBackendParams(ledger, API.Algod);
  return new algosdk.Algodv2(params.apiKey, params.url, params.port, params.headers);
}

export function getIndexer(ledger: string) {
  const params = Settings.getBackendParams(ledger, API.Indexer);
  return new algosdk.Indexer(params.apiKey, params.url, params.port, params.headers);
}

// Helper function to initialize Cache
export function initializeCache(
  c: Cache | undefined,
  ledger: Ledger | undefined = undefined
): Cache {
  let cache: Cache;
  if (c === undefined) {
    cache = {
      assets: {},
      accounts: {},
      availableLedgers: [],
    };
  } else {
    cache = c;
  }

  if (ledger !== undefined) {
    if (!(ledger in cache.assets)) cache.assets[ledger] = {};
    if (!(ledger in cache.accounts)) cache.accounts[ledger] = {};
  }

  return cache;
}

export function getAvailableLedgersExt(callback) {
  // Load Accounts details from Cache
  const availableLedgers = getBaseSupportedLedgers();
  const extensionStorage = new ExtensionStorage();
  extensionStorage.getStorage('cache', (storedCache: any) => {
    const cache: Cache = initializeCache(storedCache);
    // Add ledgers from cache to the base ledgers
    if (cache.availableLedgers && cache.availableLedgers.length > 0) {
      // We should reset and update the injected networks to ensure they will be available for use
      Settings.backend_settings.InjectedNetworks = {};

      for (var i = 0; i < cache.availableLedgers.length; i++) {
        if (
          !availableLedgers.some(
            (e) => e.name.toLowerCase() === cache.availableLedgers[i].name.toLowerCase()
          )
        ) {
          const ledgerFromCache = new LedgerTemplate(cache.availableLedgers[i]);
          Settings.addInjectedNetwork(ledgerFromCache);
          availableLedgers.push(ledgerFromCache);
        }
      }
    }
    callback(availableLedgers);
  });
}

export function updateSetting(setting) {
  const extensionStorage = new ExtensionStorage();
  extensionStorage.getStorage('appSettings', function (item) {

    let newSettings = { ...item, ...setting }

    extensionStorage.setStorage('appSettings', newSettings, () => { })
  });
}

export function getDappPools(ledger, callback) {
  const extensionStorage = new ExtensionStorage();
  extensionStorage.getStorage('dapp_pools', function (item) {

    if (item == undefined) {
      callback(null)
      return;
    }

    if (item[ledger] == undefined || item[ledger] == null) {
      callback(null)
      return;
    }

    callback(item[ledger])
  });
}

export function setActiveSubAccount(name, origin, ledger, activeAddress, callback) {
  getDappPools(ledger, (item) => {
    item.forEach((account, index) => {

      if (account.name === name && account.url === origin) {
        // Set to False
        account.sub_accounts.forEach((subAccount, index) => {
          if (subAccount.active === undefined && subAccount.address !== activeAddress) {
            return;
          }

          if (subAccount.active === undefined && subAccount.address === activeAddress) {
            // callback([subAccount, index, subAccount[index]])
            account.sub_accounts[index].active = true
            return;
          }

          if (subAccount.active === true && subAccount.address !== activeAddress) {
            account.sub_accounts[index]['active'] = false
            return;
          }

          if (subAccount.active === false && subAccount.address === activeAddress) {
            account.sub_accounts[index]['active'] = true
            return;
          }
        })
      }

    })

    callback(item)
  })
}

export function updateDAppPools(updatedPool, ledger, callback) {
  const extensionStorage = new ExtensionStorage();
  extensionStorage.getStorage('dapp_pools', function (item) {
    let updatedItem = {}
    updatedItem[ledger] = updatedPool;

    // Updated Pools
    const newItem = { ...item, ...updatedItem }
    extensionStorage.setStorage('dapp_pools', newItem, () => {
      callback(newItem)
    });
  })
}