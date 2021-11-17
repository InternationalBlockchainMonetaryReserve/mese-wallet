import { createContext } from 'preact';
import { html } from 'htm/preact';
import { useLocalStore } from 'mobx-react-lite';
import { route } from 'preact-router';
import { autorun } from 'mobx';
import { JsonRpcMethod } from '@mese/common/messaging/types';
import { sendMessage } from 'services/Messaging';
import { extensionBrowser } from '@mese/common/chrome';
import Algo from '../assets/algorand.svg';
import Default from '../assets/shape.svg';

export const StoreContext = createContext(undefined);

export const StoreProvider = ({ children }) => {
  //const existingStore = sessionStorage.getItem('wallet');
  const store = useLocalStore(() => ({
    ledger: 'MainNet',
    defaultLedger: 'MainNet',
    configAPI: { baseUrl: '' }, // Store API Configuration
    connected: false,
    origin: '',
    availableLedgers: [],
    TestNet: [],
    MainNet: [],
    selectedCurrency: '',
    currencies: [
      {
        id: '1',
        name: 'US Dollar (USD)',
        alias: 'USD',
      },
      {
        id: '2',
        name: 'Indian Rupee (INR)',
        alias: 'INR',
      },
      {
        id: '3',
        name: 'Indonesia Rupiah (IDR)',
        alias: 'IDR',
      },
      {
        id: '4',
        name: 'Malaysia Ringgit (MYR)',
        alias: 'MYR',
      },
      {
        id: '5',
        name: 'Philippine Peso (PHP)',
        alias: 'PHP',
      },
      {
        id: '6',
        name: 'Thai Baht (THB)',
        alias: 'THB',
      },
    ],
    // Manage All Application Settings
    appSettings: {
      selectedCurrency: '1',
      selectedAccountAddress: undefined,
      selectedLedger: 'MainNet' // Default
    },
    // Chosen Account Address
    chosenAccount: '',
    chosenAccountAddress: '',
    savedRequest: undefined,
    defaultMeseAccountName: 'MESE DEX',
    defaultAccountName: 'Account',
    transaction: {
      amount: 0,
      to: '',
      note: '',
      token: null,
      curency: 0,
      from: '',
      usdPrice: null,
    },
    waitingTransaction: {
      status: '',
      message: ''
    },
    // Used for manage Internal State
    pageState: {
      path: '',
      internalState: {}
    },
    headerPrice: 0,
    setHeaderPrice: (price) => {
      store.headerPrice = price
    },
    getHeaderPrice: () => {
      return store.headerPrice
    },
    setAccountAssets: (address, ledger, assets) => {
      store[ledger].find((item, idx) => {
        if (item.address == address) {
          store[ledger][idx]['assets'] = assets;
        }
      });
    },
    deleteAccountAssets: () => {
      store[store.ledger].find((item, idx) => {
        delete store[store.ledger][idx]['assets']
      })
    },
    getAccountAssets: (address, ledger) => {
      let account = store[ledger].find((account, idx) => {
        if (account.address == address) {
          return account;
        }
      });

      if (account == null || account == undefined || account['assets'] == undefined) {
        return null;
      }

      return account['assets'];
    },
    savePageState: (componentProps, optionalGlobalState, optionalInternalState) => {
      let pageState = {
        state: {},
        internalState: {},
        props: [],
        url: '',
        path: ''
      };

      // Saving Global State (if any)
      if (optionalGlobalState != undefined) {
        pageState.state = { ...store, ...optionalGlobalState };
      } else {
        pageState.state = store
      }

      // Saving Internal State (if any)
      if (optionalInternalState) {
        pageState.internalState = optionalInternalState
      }

      pageState.props = componentProps
      pageState.url = componentProps.url
      pageState.path = componentProps.path

      chrome.storage.local.set({ pageState: pageState }, function () {
        // console.log('data saved')
      });
    },
    setConfigAPI: (config) => {
      store.configAPI = config
    },
    getImageAsset: (asset) => {
      const id = asset['asset-id'] ?? (asset['index'] ?? (asset['id'] ?? asset['assetName']));

      if (id === 'Algo') {
        return Algo;
      }

      if (asset['has-image'] == false) {
        return Default;
      }

      return `${store.configAPI.baseUrl.replace('/api', '')}/assets/${id}.svg`
    },

    clearPageState: () => {
      store.pageState = {
        path: '',
        internalState: {}
      };
      chrome.storage.local.set({ pageState: '' }, function () {
        // console.log('data saved')
      });
    },
    getPageState: (callback) => {
      extensionBrowser.storage.local.get(['pageState'], function (item) {
        if (item.pageState.url === undefined || item.pageState.url === '') {
          callback(undefined)
        }
        callback(item.pageState)
      });
    },
    showPageState: (pageState) => {
      store.setLedger(store.appSettings.selectedLedger || pageState.state.defaultLedger);

      if (pageState.internalState) {
        store.pageState.internalState = pageState.internalState
      }

      store.pageState.path = pageState.path
      store.transaction = pageState.state.transaction

      route(pageState.url)
    },
    setConnected: (value) => {
      store.connected = value
    },
    getConnected: (value) => {
      return store.connected
    },
    setOrigin: (value) => {
      store.origin = value
    },
    getOrigin: () => {
      return store.origin
    },
    sendCrypto: (data: any) => {
      store.transaction.amount = data.amount;
      store.transaction.to = data.to;
      store.transaction.note = data.note;
      store.transaction.token = data.token;
      store.transaction.curency = data.curency;
      store.transaction.from = data.from;
      store.transaction.usdPrice = data.usdPrice
    },
    clearCrypto: () => {
      store.transaction.amount = 0;
      store.transaction.to = '';
      store.transaction.note = '';
      store.transaction.token = null;
      store.transaction.curency = 0;
      store.transaction.from = '';
      store.transaction.usdPrice = null
    },
    setWaitingTransaction: (data: any) => {
      store.waitingTransaction.status = data.status
      store.waitingTransaction.message = data.message
    },
    /**
     * 
     * @param endpoint string 'address' or 'tx'
     * @param address string
     * @returns string url
     */
    goToExplorer: (endpoint, address) => {
      let domain = 'algoexplorer.io'
      if (store.ledger == 'TestNet') {
        domain = 'testnet.' + domain
      }
      return `https://${domain}/${endpoint}/${address}`
    },
    /**
     * Return Selected Account Object
     */
    getSelectedAccountObject: () => {
      if (store.chosenAccount != '') {
        return store[store.ledger].find((item) => {
          return item.address == store.chosenAccount
        });
      }

      if (store[store.ledger][0] != undefined) {
        return store[store.ledger][0];
      }

      return null;
    },
    setLedger: (ledger) => {
      if (!ledger) {
        ledger = 'MainNet';
      } else if (!store[ledger]) {
        store[ledger] = [];
      }
      store.chosenAccountAddress = '';
      store.ledger = ledger;

      // Update Setting
      let updateLedger = {
        selectedLedger: ledger
      };

      sendMessage(JsonRpcMethod.GetConfig, { ledger: ledger }, function (configResponse) {
        store.setConfigAPI(configResponse)
      })

      store.updateSetting(updateLedger);
    },
    setSettingCurrency: (currencyId) => {
      store.appSettings.selectedCurrency = currencyId;
      store.selectedCurrency = currencyId
      store.deleteAccountAssets()
      store.saveSetting(() => { });
    },
    getSettingCurrency: () => {
      let selectedCurr = store.currencies.find((item) => {
        return item.id == store.appSettings.selectedCurrency
      });

      if (selectedCurr == undefined) selectedCurr = store.currencies[0]

      return selectedCurr
    },
    saveSetting: (callback) => {
      extensionBrowser.storage.local.set(
        {
          appSettings: store.appSettings,
        },
        function () {
          callback(extensionBrowser.runtime.lastError);
        }
      );
    },
    getSetting: (callback) => {
      extensionBrowser.storage.local.get(['appSettings'], function (item) {
        if (item.appSettings) store.setSetting(item.appSettings);
        callback(item.appSettings);
      });
    },
    getChosenAccountAddress: () => {
      if (store.chosenAccountAddress != '') {
        return store.chosenAccountAddress;
      }

      if (store.appSettings.selectedAccountAddress !== undefined) {
        let acc = store[store.ledger].find((item) => {
          return item.address == store.appSettings.selectedAccountAddress
        })
        if (acc) return store.appSettings.selectedAccountAddress

      }

      if (store[store.ledger].length > 0) {
        return store[store.ledger][0].address;
      }

      return null;
    },
    setChosenAccountAddress: (address, updateSetting = true) => {
      store.chosenAccountAddress = address

      let selectedAcc = {
        selectedAccountAddress: address
      };

      if (updateSetting) {
        store.updateSetting(selectedAcc);
      }
    },
    getChosenAccount: () => {
      if (store.chosenAccount != '') {
        return store.chosenAccount;
      }

      if (store[store.ledger][0] != undefined) {
        return store[store.ledger][0].address;
      }

      return null;
    },
    setSetting: (settings) => {
      store.appSettings = settings;

      if (settings.selectedAccountAddress !== undefined) {
        store.setChosenAccountAddress(settings.selectedAccountAddress, false)
      }
    },
    setChosenAccount: (address) => {
      // Update Settings
      let selectedAcc = {
        selectedAccountAddress: address
      };

      store.updateSetting(selectedAcc);

      store.chosenAccount = address;
    },
    updateSetting: (updateSetting) => {
      let newSettings = { ...store.appSettings, ...updateSetting }

      store.appSettings = newSettings

      store.saveSetting(() => { });
    },
    deleteNetwork: (ledger, callback) => {
      delete store[ledger];
      store.setLedger('MainNet');
      // Reset available ledgers
      store.availableLedgers = [];
      store.getAvailableLedgers((availableLedgers) => {
        if (!availableLedgers.error) {
          store.availableLedgers = availableLedgers;
        }
        callback();
      });
    },
    getPool: (ledger, address, callback) => {
      extensionBrowser.storage.local.get(['dapp_pools'], function (item) {

        // No Storage Item Found
        if (item.dapp_pools === undefined || item.dapp_pools[ledger] === undefined) {
          callback(null)
          return;
        }

        let poolResult: any = null;
        item.dapp_pools[ledger].every((pool) => {
          // Remove Master Account

          if (pool.master_account.address == address) {
            poolResult = pool;
          }

          if (pool.sub_accounts.forEach((acc) => {
            if (acc.address == address) {
              poolResult = pool
            }
          }))

            poolResult = poolResult

          if (poolResult === null) {
            return true;
          }

          return false;
        })

        if (poolResult == null) {
          callback(poolResult)
          return;
        }

        let totalAccount = 1; // Master Account
        let activeAddress = poolResult.master_account.address;

        poolResult.sub_accounts.forEach((item) => {
          totalAccount++
          if (item.active == true) {
            activeAddress = item.address
          }
        })

        callback({
          pool: poolResult,
          totalAccount: totalAccount,
          activeAddress: activeAddress,
        })

      })
    },
    // Managed Accounts
    getMasterAccounts: (ledger, callback) => {
      extensionBrowser.storage.local.get(['dapp_pools'], function (item) {
        let result: any = []

        // No Storage Item Found
        if (item.dapp_pools === undefined || item.dapp_pools[ledger] === undefined) {
          callback(result)
          return;
        }

        item.dapp_pools[ledger].forEach(item => {
          result.push({...item['master_account'], url: item.url})
        });

        callback(result)
      });
    },
    isMasterAccount: (address, callback) => {
      store.getMasterAccounts(store.ledger, (response) => {
        let isMaster = false;
        response.forEach((item) => {
          if (item.address == address) isMaster = true
        })
        callback(isMaster)
      })
    },
    getMasterAndSubAccounts: (ledger, callback) => {
      extensionBrowser.storage.local.get(['dapp_pools'], function (item) {
        if (item.dapp_pools === undefined || item.dapp_pools[ledger] === undefined) {
          callback([])
          return
        }
        callback(item.dapp_pools[ledger])
      });
    },
    getUserAccounts: (ledger, callback) => {
      let result: any = []

      store[ledger].forEach((item) => result.push(item))

      // Get Storage
      extensionBrowser.storage.local.get(['dapp_pools'], function (item) {
        if (item.dapp_pools === undefined || item.dapp_pools[ledger] === undefined) {
          callback(result)
          return
        }
        item.dapp_pools[ledger].forEach((item) => {
          // Remove Master Account
          result.forEach((acc, index) => {
            if (acc.address == item.master_account.address) {
              result.splice(index, 1)
            }
          })

          // Remove Sub Account
          item.sub_accounts.forEach((subAccount) => {
            result.forEach((acc, index) => {
              if (acc.address == subAccount.address) {
                result.splice(index, 1)
              }
            })
          })
        })

        callback(result)

      });
    },
    getAvailableLedgers: (callback) => {
      if (!store.availableLedgers || store.availableLedgers.length === 0) {
        try {
          sendMessage(JsonRpcMethod.GetLedgers, undefined, (response) => {
            if (response) {
              store.setAvailableLedgers(response);
            }
            callback(response);
          });
        } catch (e) {
          const errorMsg = chrome.runtime.lastError || e;
          callback({ error: errorMsg });
        }
      } else {
        callback(store.availableLedgers);
      }
    },
    setAvailableLedgers: (ledgers) => {
      store.availableLedgers = ledgers;
    },
    updateWallet: (newWallet, callback) => {
      let updateLedgers;
      store.getAvailableLedgers((availableLedgers) => {
        if (!availableLedgers.error) {
          updateLedgers = availableLedgers;

          for (var i = 0; i < updateLedgers.length; i++) {
            const currentLedgerName = updateLedgers[i].name;
            if (currentLedgerName) {
              store[currentLedgerName] = newWallet[currentLedgerName];
            }
          }
        }
        callback();
      });
    },
    updateAccountDetails: (ledger, details) => {
      for (var i = store[ledger].length - 1; i >= 0; i--) {
        if (store[ledger][i].address === details.address) {
          store[ledger][i].details = details;
          break;
        }
      }
    },
    saveRequest: (request) => {
      store.savedRequest = request;
    },
    clearSavedRequest: () => {
      delete store.savedRequest;
    },
  }));

  autorun(() => {
    sessionStorage.setItem('wallet', JSON.stringify(store));
  });

  // Try to retrieve session from background
  sendMessage(JsonRpcMethod.GetSession, {}, function (response) {
    if (response && response.exist) {
      let hashPath = '';
      if (window.location.hash.length > 0) {
        // Remove # from hash
        hashPath = window.location.hash.slice(2);
      }
      if ('session' in response) {
        store.setAvailableLedgers(response.session.availableLedgers);
        store.updateWallet(response.session.wallet, () => {
          store.getSetting((setting) => {
            // response.session.ledger

            // Check the page state
            store.getPageState((pageState) => {

              store.setLedger(setting.selectedLedger || store.defaultLedger); // Change ledger to setting (if any) or Default Ledger
              sendMessage(JsonRpcMethod.GetConfig, { ledger: setting.selectedLedger || store.defaultLedger }, function (configResponse) {
                store.setConfigAPI(configResponse)
                // Path for /authorize
                if (hashPath.length > 0) {
                  route(`/${hashPath}`);
                } else {
                  // Page State Found
                  if (pageState) {
                    store.showPageState(pageState)
                    return;
                  }
                  // No Page state found
                  route('/wallet');
                }
              });

            })

          });

        });

      } else {
        route('/login/' + hashPath);
      }
    }
  });

  // Check Connection Status
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
    let url = tabs[0].url;

    if (url != undefined) {
      let origin = new URL(url.toString());
      sendMessage(JsonRpcMethod.CheckConnected, { url: origin.origin }, function (response) {
        store.setConnected(response)
        store.setOrigin(origin.origin)
      });
    }

  });

  return html`
    <${StoreContext.Provider} value=${store}>${children}</${StoreContext.Provider}>
  `;
};
