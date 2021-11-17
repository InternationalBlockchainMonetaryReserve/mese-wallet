/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const algosdk = require('algosdk');

import { JsonRpcMethod, SwitchManagedAccount } from '@mese/common/messaging/types';
import { logging } from '@mese/common/logging';
import { extensionBrowser } from '@mese/common/chrome';
import { ExtensionStorage } from '@mese/storage/src/extensionStorage';
import { Task } from './task';
import { API, Cache, Ledger } from './types';
import { Settings } from '../config';
import encryptionWrap from '../encryptionWrap';
import Session from '../utils/session';
import AssetsDetailsHelper from '../utils/assetsDetailsHelper';
import { initializeCache, getAvailableLedgersExt, updateSetting, getDappPools, setActiveSubAccount, updateDAppPools } from '../utils/helper';
import { ValidationStatus } from '../utils/validator';
import { getValidatedTxnWrap, getLedgerFromGenesisId } from '../transaction/actions';
import { BaseValidatedTxnWrap } from '../transaction/baseValidatedTxnWrap';
import { buildTransaction } from '../utils/transactionBuilder';
import { getBaseSupportedLedgers, LedgerTemplate } from '@mese/common/types/ledgers';
import { NoAccountMatch } from '../../errors/transactionSign';
import { RequestErrors, AssetTransferTransaction } from '@mese/common/types';
import { byteArrayToBase64 } from '@mese/common/encoding';

const session = new Session();

export class InternalMethods {
  private static _encryptionWrap: encryptionWrap | undefined;

  public static getVersion() {
    return '1.6.1'
  }

  public static getAlgod(ledger: string) {
    const params = Settings.getBackendParams(ledger, API.Algod);
    const url = new URL(params.baseUrl)
    return new algosdk.Algodv2(params.apiKey, params.url, url.port);
  }
  public static getIndexer(ledger: string) {
    const params = Settings.getBackendParams(ledger, API.Indexer);
    const url = new URL(params.baseUrl)
    return new algosdk.Indexer(params.apiKey, params.url, url.port);
  }
  public static getUrl(ledger: string) {
    return Settings.getBackendParams(ledger, API.Algod);
  }

  private static safeWallet(wallet: any) {
    // Intialize the safe wallet then add the wallet ledgers in as empty arrays
    const safeWallet = {};
    Object.keys(wallet).forEach((key) => {
      safeWallet[key] = [];

      // Afterwards we can add in all the non-private keys and names into the safewallet
      for (var j = 0; j < wallet[key].length; j++) {
        const { address, name } = wallet[key][j];
        safeWallet[key].push({
          address: address,
          name: name,
        });
      }
    });

    return safeWallet;
  }

  // Checks if an address is a valid user account for a given ledger.
  public static checkValidAccount(genesisID: string, address: string): void {
    const ledger: string = getLedgerFromGenesisId(genesisID);
    let found = false;
    for (let i = session.wallet[ledger].length - 1; i >= 0; i--) {
      if (session.wallet[ledger][i].address === address) {
        found = true;
        break;
      }
    }
    if (!found) throw new NoAccountMatch(address);
  }

  /**
   * 
   * @param transactions Unsigned Transactions that are created by the SDK
   * @returns Decoded Base64 Transactions
   */
  public static encodeUnsignedTxToBase64(transactions: Array<any>) {
    let encodedTxs = [];

    transactions.forEach((tx) => {
      encodedTxs.push(byteArrayToBase64(algosdk.encodeUnsignedTransaction(tx)))
    })

    return encodedTxs
  }

  // Checks if an address is a valid user account for a given ledger.
  public static checkAccountExists(genesisID: string, address: string): boolean {
    const ledger: string = getLedgerFromGenesisId(genesisID);
    let found = false;
    for (let i = session.wallet[ledger].length - 1; i >= 0; i--) {
      if (session.wallet[ledger][i].address === address) {
        found = true;
        break;
      }
    }

    return found
  }

  private static loadAccountAssetsDetails(address: string, ledger: Ledger) {
    const algod = this.getAlgod(ledger);
    algod
      .accountInformation(address)
      .do()
      .then((res: any) => {
        if ('assets' in res && res.assets.length > 0) {
          AssetsDetailsHelper.add(
            res.assets.map((x) => x['asset-id']),
            ledger
          );
        }
      })
      .catch((e: any) => {
        console.error(e);
      });
  }

  public static getHelperSession(): Session {
    return session.session;
  }

  public static clearSession(): void {
    session.clearSession();
  }

  public static handleBigInt(details) {
    return new Promise(async (resolve, reject) => {
      await InternalMethods[JsonRpcMethod.SignSendTransaction](InternalMethods.paramsBuilder(details), async function (res) {
        resolve(res)
      })
    })
  }

  /**
   * Helper function to manage DApp accounts
   * If the active account already has 47 contracts, then do create sub account
   * If the active account already has 50 contracts, then do switch sub account
   */
  public static manageAccountAutomation(ledger: string, activeAddress: string, origin: string,): Promise<any> {
    return new Promise((resolve, reject) => {
      let param = {
        address: activeAddress,
        ledger: ledger
      }

      // Get DAPP Name based on the active address
      getDappPools(ledger, (pools) => {

        // Check if Pool with Specied Ledger Exists
        if (!pools) {
          resolve(null)
        }

        // Check if Pool with Specified active address exists
        let poolAccount = null
        pools.forEach((item) => {
          if (item.master_account.address == activeAddress) {
            poolAccount = item
          }

          item.sub_accounts.forEach((subAccount) => {
            if (subAccount.address == activeAddress) {
              poolAccount = item
            }
          })
        })

        // Not DApp a account, it's a regular account. No need to manage the regular account
        if (poolAccount == null) {
          resolve(null)
          return
        }

        let lastPoolAccount = null
        if (poolAccount.sub_accounts.length > 0) {
          lastPoolAccount = poolAccount.sub_accounts[poolAccount.sub_accounts.length - 1]
        }

        // DApp Accounts
        const dappName = poolAccount.name;

        InternalMethods[JsonRpcMethod.AccountDetails](InternalMethods.paramsBuilder(param), function (response) {

          // The address doesnt opted in any apps. Returns
          if (!response['apps-local-state']) {
            resolve(null)
            return
          }

          // Create Sub Account, when apps is 47 and no sub account created yet
          if (response['apps-local-state'].length >= SwitchManagedAccount.CreateAccount &&
            (lastPoolAccount == null
              ||
              (lastPoolAccount.active && lastPoolAccount.active == true))) {
            InternalMethods.createSubAccount(ledger, dappName, origin)
              .then((res) => resolve(res))
              .catch((err) => reject(err))
          } else if (response['apps-local-state'].length == SwitchManagedAccount.SwitchAccount && lastPoolAccount.active == undefined) {
            // Switch Sub Account to Active One, when apps is 50 and sub account already created
            InternalMethods.switchAccount(ledger, dappName, origin)
              .then((res) => resolve(res))
              .catch((err) => reject(err))
          } else {
            // Do Nothing
            resolve(null)
          }
        })
      })

    })
  }

  public static createSubAccount(ledger, dappName, origin): Promise<any> {
    return new Promise((resolve, reject) => {
      const extensionStorage = new ExtensionStorage();

      extensionStorage.getStorage(`dapp_pools`, (items) => {

        if (items === undefined || items[ledger] === undefined) {
          reject('Selected Ledger not exists');
          return;
        }

        const accounts = items[ledger];

        // Check if Dapp is exists
        let dappAccount = accounts.find((item) => {
          return item.name == dappName && item.url == origin
        })

        if (dappAccount === undefined) {
          reject(`DAPP Name or Account doesn't exists.`);
          return;
        }

        const totalSubAccounts = dappAccount.sub_accounts.length;

        extensionBrowser.storage.sync.get("tempPass", function (items) {

          const params = {
            ledger: ledger,
            name: `${dappName}-${totalSubAccounts + 1}`,
            passphrase: items.tempPass,
            dappAccount: dappAccount,
            origin: origin,
          };

          // Create Account
          return InternalMethods[JsonRpcMethod.DAppCreateSubAccount](
            params,
            function (response) {
              if ('error' in response) {
                reject({ create: response });
                return;
              }
              resolve({ create: response });
              return;
            });

        });
      })
    })
  }

  public static switchAccount(ledger, dappName, origin): Promise<any> {
    return new Promise((resolve, reject) => {
      const extensionStorage = new ExtensionStorage();

      extensionStorage.getStorage("tempPass", function (pass) {
        const params = {
          ledger: ledger,
          name: dappName,
          passphrase: pass,
          origin: origin,
        }

        return InternalMethods[JsonRpcMethod.DAppSwitchMeseAccount](
          params,
          function (response) {
            resolve(response)
            if ('error' in response) {
              reject({ switch: response });
              return;
            }
            resolve({ switch: response });
            return;
          })

      })
    })
  }

  public static paramsBuilder(param: Object): Object {
    return {
      body: {
        params: param
      }
    }
  }

  /**
   * Helper function to transfer assets
   * only available for DApp Managed Accounts
   */
  public static assetTransfer(assetTxs: AssetTransferTransaction, ledger, pool, passphrase): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        let responses = []

        for (let i = 0; i < assetTxs.assets.length; i++) {

          let params = { // Algo Transfer
            ledger: ledger,
            passphrase: passphrase,
            address: assetTxs.from,
            rekeyedAccount: pool.master_account,
            txnParams: {
              from: assetTxs.from,
              to: assetTxs.to,
              note: '',
              assetIndex: null,
              amount: BigInt(assetTxs.amounts[i]),
              type: 'pay'
            },
          };

          if (assetTxs.assets[i] != 0) { // Asset Transfer
            params.txnParams.assetIndex = assetTxs.assets[i]
            params.txnParams.type = "axfer"
          }

          let res = await InternalMethods.asyncTransfer(params)

          responses.push(res)
        }

        // Wait for Confirmation
        let confirmation = InternalMethods.waitConfirmationByAddress(assetTxs.from, ledger)

        Promise.race([confirmation, Task.asyncTimeout(10000)])
          .then((_) => {
            resolve({ responses, confirmed: true })
          })
          .catch((err) => {
            resolve({ responses, confirmed: err })
          })

      } catch (err) {
        reject(err)
      }
    })
  }

  public static waitConfirmationByAddress(address: string, ledger: string) {
    return new Promise(async (resolve, reject) => {
      const algod = this.getAlgod(ledger);
      let isPending = true
      let response

      while (isPending) {
        response = await algod.pendingTransactionByAddress(address).do()

        if (response['total-transactions'] == 0) {
          isPending = false
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      resolve(response)

    })
  }

  public static asyncTransfer(params): Promise<any> {
    return new Promise((resolve, reject) => {
      InternalMethods[JsonRpcMethod.SignSendTransaction](InternalMethods.paramsBuilder(params), async function (res) {
        if ('error' in res) {
          reject(res.error)
          return
        }
        resolve(res)
        return
      })
    })
  }

  public static [JsonRpcMethod.GetSession](request: any, sendResponse: Function) {
    this._encryptionWrap = new encryptionWrap('');

    this._encryptionWrap?.checkStorage((exist: boolean) => {
      if (!exist) {
        sendResponse({ exist: false });
      } else {
        if (session.wallet) sendResponse({ exist: true, session: session.session });
        else sendResponse({ exist: true });
      }
    });
    return true;
  }

  public static [JsonRpcMethod.CreateWallet](request: any, sendResponse: Function) {
    this._encryptionWrap = new encryptionWrap(request.body.params.passphrase);
    const newWallet = {
      TestNet: [],
      MainNet: [],
    };
    this._encryptionWrap?.lock(JSON.stringify(newWallet), (isSuccessful: any) => {
      if (isSuccessful) {
        (session.wallet = this.safeWallet(newWallet)), (session.ledger = Ledger.MainNet);
        sendResponse(session.session);
      } else {
        sendResponse({ error: 'Lock failed' });
      }
    });
    return true;
  }

  public static [JsonRpcMethod.DeleteWallet](request: any, sendResponse: Function) {
    const { passphrase } = request.body.params;
    this._encryptionWrap = new encryptionWrap(passphrase);

    this._encryptionWrap.unlock((unlockedValue: any) => {
      if ('error' in unlockedValue) {
        sendResponse(unlockedValue);
      } else {
        new ExtensionStorage().clearStorageLocal((res) => {
          if (res) {
            session.clearSession();
            Task.clearPool();
            sendResponse({ response: res });
          } else {
            sendResponse({ error: 'Storage could not be cleared' });
          }
        });
      }
    });
    return true;
  }

  public static [JsonRpcMethod.Login](request: any, sendResponse: Function) {
    this._encryptionWrap = new encryptionWrap(request.body.params.passphrase);
    this._encryptionWrap.unlock((response: any) => {
      if ('error' in response) {
        sendResponse(response);
      } else {
        const wallet = this.safeWallet(response);
        getAvailableLedgersExt((availableLedgers) => {
          const extensionStorage = new ExtensionStorage();
          // Load Accounts details from Cache
          extensionStorage.getStorage('cache', (storedCache: any) => {
            const cache: Cache = initializeCache(storedCache);
            const cachedLedgerAccounts = Object.keys(cache.accounts);

            for (var j = cachedLedgerAccounts.length - 1; j >= 0; j--) {
              const ledger = cachedLedgerAccounts[j];
              if (wallet[ledger]) {
                for (var i = wallet[ledger].length - 1; i >= 0; i--) {
                  if (wallet[ledger][i].address in cache.accounts[ledger]) {
                    wallet[ledger][i].details = cache.accounts[ledger][wallet[ledger][i].address];
                  }
                }
              }
            }

            (session.wallet = wallet),
              (session.ledger = Ledger.MainNet),
              (session.availableLedgers = availableLedgers),
              sendResponse(session.session);
          });
        });
      }
    });
    return true;
  }
  public static [JsonRpcMethod.CheckConnected](request: any, sendResponse: Function) {
    const { url } = request.body.params;

    if (Task.isAuthorized(url)) {
      sendResponse(true)
    } else {
      sendResponse(false)
    }
  }
  public static [JsonRpcMethod.GetConfig](request: any, sendResponse: Function) {
    const { ledger } = request.body.params;

    sendResponse(this.getUrl(ledger))
  }
  public static [JsonRpcMethod.CreateAccount](request: any, sendResponse: Function) {
    var keys = algosdk.generateAccount();
    var mnemonic = algosdk.secretKeyToMnemonic(keys.sk);
    sendResponse([mnemonic, keys.addr]);
  }

  public static [JsonRpcMethod.Version](request: any, sendResponse: Function) {
    sendResponse(this.getVersion());
  }

  public static [JsonRpcMethod.AccountDetailsIndexer](request: any, sendResponse: Function) {

    const { ledger, address } = request.body.params;

    const indexer = this.getIndexer(ledger);

    indexer.lookupAccountByID(address)
      .do()
      .then((res) => {
        sendResponse(res)
      })

    return true
  }

  public static [JsonRpcMethod.SaveAccount](request: any, sendResponse: Function) {
    const { mnemonic, name, ledger, address, passphrase } = request.body.params;
    this._encryptionWrap = new encryptionWrap(passphrase);

    this._encryptionWrap.unlock((unlockedValue: any) => {
      if ('error' in unlockedValue) {
        sendResponse(unlockedValue);
      } else {
        const newAccount = {
          address: address,
          mnemonic: mnemonic,
          name: name,
        };

        if (!unlockedValue[ledger]) {
          unlockedValue[ledger] = [];
        }

        unlockedValue[ledger].push(newAccount);
        this._encryptionWrap?.lock(JSON.stringify(unlockedValue), (isSuccessful: any) => {
          if (isSuccessful) {
            session.wallet = this.safeWallet(unlockedValue);
            sendResponse(session.wallet);
          } else {
            sendResponse({ error: 'Lock failed' });
          }
        });
      }
    });
    return true;
  }

  public static [JsonRpcMethod.GetAllAssets](request: any, sendResponse: Function) {
    const { address, ledger, currency, intDecoding } = request.body.params;

    let decode = 'default'
    if (intDecoding) {
      decode = intDecoding
    }

    let params = {
      ledger: ledger,
      address: address,
      currency: currency,
      intDecoding: decode
    }

    const parseParams = (param) => {
      return {
        body: {
          params: param
        }
      }
    }

    getDappPools(ledger, async (pools) => {

      if (pools === null) {
        pools = []
      }

      let dappAccount = pools.find((item) => {
        return item.master_account.address === address
      })
      let allAssets = []
      let totalAlgo
      if (decode == 'bigint') {
        totalAlgo = BigInt(0); // in microalgos
      } else {
        totalAlgo = 0; // in microalgos
      }
      let pendingAlgos = 0;
      let algoPrice = 0;
      let activeAddress = address
      let apps = []
      let accounts: any = []

      // Regular account, doesnt have DApp
      if (!dappAccount) {

        let asset = await getAssets(address)
        allAssets = allAssets.concat(asset.assets)
        totalAlgo += asset.algoAmount
        pendingAlgos += asset.pendingAlgos;
        algoPrice = asset.algoPrice;
        apps = asset.apps
        accounts.push(asset.account)
      } else {

        // DApp / Master Accounts
        // Gete All Assets of its sub accounts and sum it

        // 1. Get Master Account Assets
        let asset = await getAssets(dappAccount.master_account.address)
        allAssets = allAssets.concat(asset.assets)
        totalAlgo += asset.algoAmount
        pendingAlgos += asset.pendingAlgos;
        algoPrice = asset.algoPrice;
        apps = asset.apps
        accounts.push(asset.account)

        // 2. Get Sub Account Assets
        for (const acc of dappAccount.sub_accounts) {
          asset = await getAssets(acc.address)
          allAssets = concatAsset(allAssets, asset.assets)
          apps = apps.concat(asset.apps)
          totalAlgo += asset.algoAmount
          pendingAlgos += asset.pendingAlgos;
          algoPrice = asset.algoPrice;
          accounts.push(asset.account)
          if (acc.active && acc.active == true) {
            activeAddress = acc.address
          }
        }
      }

      sendResponse({ assets: allAssets, totalAlgo: totalAlgo, pendingAlgos: pendingAlgos, algoPrice: algoPrice, activeAddress: activeAddress, apps, accounts })

    })

    // Get Assets Helper Function
    const getAssets: any = async (address) => {
      return new Promise((resolve, reject) => {
        params.address = address
        InternalMethods[JsonRpcMethod.AccountDetails](parseParams(params), function (response) {

          // Handle when it doesnt succeed, so it won't break any remaining background apps
          if (response == undefined || 'error' in response ) {
            resolve({ assets: [], algoAmount: (params.intDecoding == 'bigint' ? BigInt(0) : 0), pendingAlgos: 0, algoPrice: 0, apps: [], account: null })
            return
          }

          let assets = []
          let apps = []

          if (response['apps-local-state']) {
            apps = response['apps-local-state']
          }

          apps.forEach((item, index) => {
            apps[index]['used-by'] = address
          })

          let algo = response.amount
          let algoPrice = parseFloat(response.price);

          if (response.assets) {
            assets = response.assets
          }

          // Get Pending Transaction
          InternalMethods[JsonRpcMethod.Transactions](parseParams(params), function (txResponse) {
            let pendingTransactions = txResponse.pending;

            // let pendingAxfer = pendingTransactions.filter((item) => {
            //   return item.type == 'axfer'
            // })

            // Get Pending Payment, either Send or Receive
            let pendingPayment = []
            if (pendingTransactions) {
              pendingPayment = pendingTransactions.filter((item) => {
                return item.type == 'pay'
              })
            }

            let pendingAlgos = 0;

            // If there's pending payment
            if (pendingPayment.length != 0) {
              pendingPayment.forEach((pay) => {
                // Incoming Pending Payment / Receive Algos
                if (pay.receiver === address) {
                  pendingAlgos += pay.amount
                  return;
                }

                // Sending Pending Payment / Send Algos
                if (pay.sender === address) {
                  pendingAlgos -= pay.amount;
                }
              })
            }

            // if (pendingAxfer.length != 0) {
            //   assets = [...assets, ...pendingAxfer]
            // }

            assets.forEach((asset, index) => {
              assets[index]['owned-by'] = address
              assets[index]['accounts'] = [{
                address: address,
                amount: asset.amount
              }]
            })

            resolve({ assets: assets, algoAmount: algo, pendingAlgos: pendingAlgos, algoPrice: algoPrice, apps: apps, account: response })
          })

        })
      })

    }

    // Concat Array Helper Function, and sum the amount if it's exists
    const concatAsset = (allAssets, newAsset) => {
      allAssets.forEach((allAssetItem, index) => {

        // Check if asset is already exists
        let duplicateAsset = newAsset.find((newAssetItem) => {
          return newAssetItem['asset-id'] == allAssetItem['asset-id']
        })

        // If asset already exists, then sum its amount
        if (duplicateAsset) {
          if (duplicateAsset['amount'] > allAssets[index]['amount']) {
            allAssets[index]['owned-by'] = duplicateAsset['owned-by']
          }

          allAssets[index]['amount'] += duplicateAsset['amount']
          allAssets[index]['total'] += duplicateAsset['total']
          allAssets[index]['accounts'].push(duplicateAsset['accounts'][0])

          let removeIndex = newAsset.findIndex((i) => i['asset-id'] === duplicateAsset['asset-id'])
          newAsset.splice(removeIndex, 1)

          return
        }

      })

      return allAssets.concat(newAsset)
    }

    return true;
  }

  /**
   * Get Grouped Account (if any)
   * 
   * @return null | array
   */
  public static [JsonRpcMethod.GetGroupedAccount](request: any, sendResponse: Function) {
    const { address, ledger } = request.body.params;

    let response: any = {};
    getDappPools((ledger), (pools) => {
      if (pools == null) {
        sendResponse(null)
      }

      let pool = pools.find((pool) => {
        return pool.master_account.address == address
      });

      if (pool == null) {
        sendResponse(null)
        return;
      }

      let addresses = [];
      addresses.push(pool.master_account.address);
      pool.sub_accounts.forEach((acc) => {
        addresses.push(acc.address);
      })

      // Find Active Account
      let activeAcccount = pool.sub_accounts.find((acc) => {
        return acc.active;
      })

      if (!activeAcccount) {
        activeAcccount = pool.master_account.address
      }

      response.rekeyed_account = pool.master_account;
      response.pool = pool;
      response.active_address = activeAcccount.address;
      response.addresses = addresses;
      sendResponse(response)
    })

    return true;
  }

  public static [JsonRpcMethod.GetAssetImage](request: any, sendResponse: Function) {
    const { assetId, ledger } = request.body.params;

    const api = this.getUrl(ledger)

    var imgxhr = new XMLHttpRequest();
    imgxhr.open('GET', `${api.baseUrl.replace('/api', '')}/assets/${assetId}.svg`);
    imgxhr.responseType = 'blob';
    imgxhr.onload = function () {
      if (imgxhr.status === 200) {
        var reader = new FileReader();

        reader.readAsDataURL(imgxhr.response);

        reader.onloadend = function () {
          sendResponse(reader.result);
        };
      }
    };

    imgxhr.send();

    return true;
  }

  public static [JsonRpcMethod.CreateMeseAccount](request: any, sendResponse: Function) {
    var keys = algosdk.generateAccount();
    var mnemonic = algosdk.secretKeyToMnemonic(keys.sk);
    var address = keys.addr;

    const { name, ledger, passphrase } = request.body.params;
    this._encryptionWrap = new encryptionWrap(passphrase);

    this._encryptionWrap.unlock((unlockedValue: any) => {
      if ('error' in unlockedValue) {
        sendResponse(unlockedValue);
      } else {
        const newAccount = {
          address: address,
          mnemonic: mnemonic,
          name: name,
        };

        if (!unlockedValue[ledger]) {
          unlockedValue[ledger] = [];
        }

        unlockedValue[ledger].push(newAccount);
        this._encryptionWrap?.lock(JSON.stringify(unlockedValue), (isSuccessful: any) => {
          if (isSuccessful) {
            session.wallet = this.safeWallet(unlockedValue);
            sendResponse(session.wallet);
          } else {
            sendResponse({ error: 'Lock failed' });
          }
        });
      }
    });
    return true;
  }

  // Create Swap Account when user gives authorization
  public static [JsonRpcMethod.CreateMasterSwapAccount](request: any, sendResponse: Function) {
    var keys = algosdk.generateAccount();
    var mnemonic = algosdk.secretKeyToMnemonic(keys.sk);
    var address = keys.addr;

    const { name, ledger, passphrase, url } = request;
    this._encryptionWrap = new encryptionWrap(passphrase);

    this._encryptionWrap.unlock((unlockedValue: any) => {
      if ('error' in unlockedValue) {
        sendResponse(unlockedValue);
      } else {

        if (unlockedValue[ledger] === undefined) {
          sendResponse({ error: RequestErrors.UnsupportedLedger });
          return;
        }
        const newAccount = {
          address: address,
          mnemonic: mnemonic,
          name: name,
        };

        if (!unlockedValue[ledger]) {
          unlockedValue[ledger] = [];
        }
        const extensionStorage = new ExtensionStorage();

        extensionStorage.getStorage(`dapp_pools`, (items) => {
          let udpatedPools = {};
          let latestPools = {}

          // New Item
          if (items === undefined || items[ledger] === undefined) {
            udpatedPools[ledger] = [{
              name: newAccount.name,
              url: url,
              master_account: newAccount,
              sub_accounts: []
            }]

            latestPools = { ...items, ...udpatedPools }
          } else {
            // Update Item

            /**
             * Check if DApp Name already exists,
             * DApp Name and URL must be unique
             */
            let exists = items[ledger].find((dappAcc) => {
              return dappAcc.name === name && dappAcc.url == url;
            })

            // If exists, then return error
            if (exists) {
              sendResponse({ error: `DApp Name isn't Available` });
              return;
            }

            let newPool = {
              name: newAccount.name,
              url: url,
              master_account: newAccount,
              sub_accounts: []
            }

            udpatedPools[ledger] = [...items[ledger], newPool]

            latestPools = { ...items, ...udpatedPools }
          }

          extensionStorage.setStorage('dapp_pools', latestPools, () => {
            unlockedValue[ledger].push(newAccount);
            this._encryptionWrap?.lock(JSON.stringify(unlockedValue), (isSuccessful: any) => {
              if (isSuccessful) {
                session.wallet = this.safeWallet(unlockedValue);

                updateSetting({
                  selectedAccountAddress: newAccount.address,
                  selectedLedger: ledger
                })

                sendResponse(session.wallet);
              } else {
                sendResponse({ error: 'Lock failed' });
              }
            });
          });
        })
      }
    });
    return true;
  }

  public static [JsonRpcMethod.ImportMasterAccount](request: any, sendResponse: Function) {
    const { name, ledger, url, master_account, sub_accounts, overwrite } = request.body.params;
    this._encryptionWrap = new encryptionWrap(request.body.params.passphrase);

    this._encryptionWrap.unlock((unlockedValue: any) => {
      if ('error' in unlockedValue) {
        sendResponse(unlockedValue);
      } else {
        try {
          if (unlockedValue[ledger] === undefined) {
            sendResponse({ error: RequestErrors.UnsupportedLedger });
            return;
          }
          const newAccount = {
            address: master_account.address,
            mnemonic: master_account.mnemonic,
            name: name,
          };

          if (!unlockedValue[ledger]) {
            unlockedValue[ledger] = [];
          }
          const extensionStorage = new ExtensionStorage();

          extensionStorage.getStorage(`dapp_pools`, (items) => {
            let udpatedPools = {};
            let latestPools = {}

            // New Item
            if (items === undefined || items[ledger] === undefined) {
              udpatedPools[ledger] = [{
                name: newAccount.name,
                url: url,
                master_account: newAccount,
                sub_accounts: sub_accounts
              }]

              latestPools = { ...items, ...udpatedPools }
            } else {
              // Update Item

              /**
               * Check if DApp Name already exists,
               * DApp Name and URL must be unique
               */
              if (!overwrite) {
                let exists = items[ledger].find((dappAcc) => {
                  return dappAcc.name === name && dappAcc.url == url;
                })

                // If exists, then return error
                if (exists) {
                  sendResponse({ error: `Duplicate account exists` });
                  return;
                }

                let newPool = {
                  name: newAccount.name,
                  url: url,
                  master_account: newAccount,
                  sub_accounts: sub_accounts
                }

                udpatedPools[ledger] = [...items[ledger], newPool]

                latestPools = { ...items, ...udpatedPools }
              } else {
                let new_items = items;
                let new_dappAccs = [];
                items[ledger].forEach(dappAcc => {
                  if (dappAcc.name !== name && dappAcc.url !== url) {
                    new_dappAccs.push(dappAcc);
                  }
                });

                let newPool = {
                  name: newAccount.name,
                  url: url,
                  master_account: newAccount,
                  sub_accounts: sub_accounts
                }

                new_items[ledger] = new_dappAccs;

                udpatedPools[ledger] = [...new_items[ledger], newPool]

                latestPools = { ...new_items, ...udpatedPools }
              }
            }

            extensionStorage.setStorage('dapp_pools', latestPools, () => {
              if (overwrite) {
                let index = unlockedValue[ledger].findIndex((account: any) => newAccount.name === account.name);
                if (index > -1) {
                  unlockedValue[ledger].splice(index, 1);
                }
              }
              unlockedValue[ledger].push(newAccount);

              if (sub_accounts.length > 0) {
                sub_accounts.forEach(sub_account => {
                  unlockedValue[ledger].forEach(account => {
                    if (sub_account.name === account.name && sub_account.url === account.url) {
                      let index = unlockedValue[ledger].findIndex((account: any) => account.name === sub_account.name);
                      if (index > -1) {
                        unlockedValue[ledger].splice(index, 1);
                      }
                    }
                  });
                });
                sub_accounts.forEach(sub_account => {
                  unlockedValue[ledger].push(sub_account);
                });
              }

              this._encryptionWrap?.lock(JSON.stringify(unlockedValue), (isSuccessful: any) => {
                if (isSuccessful) {
                  session.wallet = this.safeWallet(unlockedValue);

                  updateSetting({
                    selectedAccountAddress: newAccount.address,
                    selectedLedger: ledger
                  })

                  sendResponse(session.wallet);
                } else {
                  sendResponse({ error: 'Lock failed' });
                }
              });
            });
          })
        } catch (e) {
          sendResponse({ error: e.message });
        }
      }
    });
    return true;
  }

  // Used when the contracts is full, TODO: Not Ready yet
  /**
   * Create Sub Account when Contract is full
   * 1. Create new account
   * 2. Transfer Algo to the new account, from Active/Master account (1 ALGO)
   * 3. Rekey new account: send tx to itself, rekey-to master account
   * 4. Update Storage
   */
  public static async [JsonRpcMethod.DAppCreateSubAccount](request: any, sendResponse: Function) {
    var keys = algosdk.generateAccount();
    var mnemonic = algosdk.secretKeyToMnemonic(keys.sk);
    var address = keys.addr;

    const { name, ledger, passphrase, dappAccount, origin } = request;
    const algod = this.getAlgod(ledger);

    this._encryptionWrap = new encryptionWrap(passphrase);

    this._encryptionWrap.unlock(async (unlockedValue: any) => {
      if ('error' in unlockedValue) {
        sendResponse(unlockedValue);
      } else {
        const newAccount = {
          address: address,
          mnemonic: mnemonic,
          name: name,
        };

        // return right away, no need to wait the creating sub-account logic
        sendResponse([{ address: newAccount.address }]);

        let isRekeyed = true;

        // Get/Find Active Account Address. So we know where to transfer
        let activeAccount = dappAccount.sub_accounts.find((item) => {
          return item.active === true
        })

        // If there's no active account, then master account will be the default
        if (!activeAccount) {
          activeAccount = dappAccount.master_account
          isRekeyed = false
        }

        // 2. Transfer Algo to the new account, from Active/Master account
        let params: any = {}
        if (isRekeyed) {
          params = {
            ledger: ledger,
            passphrase: passphrase,
            address: activeAccount.address,
            rekeyedAccount: dappAccount.master_account,
            txnParams: {
              from: activeAccount.address,
              to: address,
              note: '',
              amount: 101000, // 0.1 Algo (min Balance) + tx fee (0.001 Algo)
              type: 'pay'
            },
          };
        } else {
          params = {
            ledger: ledger,
            passphrase: passphrase,
            address: activeAccount.address,
            txnParams: {
              from: activeAccount.address,
              to: address,
              note: '',
              amount: 101000, // 0.1 Algo (min Balance) + tx fee (0.001 Algo)
              type: 'pay'
            },
          };
        }

        const thisHelper = this;

        await InternalMethods[JsonRpcMethod.SignSendTransaction](params, async function (res) {

          if ('error' in res) {
            sendResponse(res)
            return;
          }

          if (!unlockedValue[ledger]) {
            unlockedValue[ledger] = [];
          }

          let txnParams = await algod.getTransactionParams().do();

          let sender = newAccount.address; // New Account Address
          let receiver = newAccount.address; // New Account Address
          let rekeyTo = dappAccount.master_account.address; // Master Account Address
          let txn = new algosdk.makePaymentTxnWithSuggestedParams(
            sender, receiver, 0, undefined, undefined, txnParams
          );
          txn.addRekey(rekeyTo)

          let txId = txn.txID().toString();

          // Sign the Transaction
          var secretKey = algosdk.mnemonicToSecretKey(newAccount.mnemonic).sk;
          let signedTxn = txn.signTxn(secretKey);

          let response = await algod.sendRawTransaction(signedTxn).do();

          unlockedValue[ledger].push(newAccount);

          thisHelper._encryptionWrap?.lock(JSON.stringify(unlockedValue), (isSuccessful: any) => {
            if (isSuccessful) {
              session.wallet = thisHelper.safeWallet(unlockedValue);

              // 4. Update Storage
              const extensionStorage = new ExtensionStorage();
              extensionStorage.getStorage(`dapp_pools`, (items) => {

                items[ledger].forEach((item, index) => {
                  if (item.name === dappAccount.name && item.url == origin) {
                    items[ledger][index]['sub_accounts'] = [...items[ledger][index]['sub_accounts'], newAccount];
                  }
                })

                extensionStorage.setStorage('dapp_pools', items, () => {
                  sendResponse([{ address: newAccount.address }, response]);
                })

              });
            } else {
              sendResponse({ error: 'Lock failed' });
            }
          });
        })
      }
    });
    return true;
  }
  /**
   * Switch MESE Account, that do these:
   * 1. Get/Find Active Account Address
   * 2. Get Minimal Balance Left, based on total assets and total opted in
   * 3. Transfer all funds from active account to new sub-account.
   * 4. Set new sub-account as ActiveMeseDex account
   */
  public static async [JsonRpcMethod.DAppSwitchMeseAccount](request: any, sendResponse: Function) {

    const { name, ledger, passphrase, origin } = request;

    await getDappPools(ledger, async (pools) => {

      // Check if Pool with Specied Ledger Exists
      if (!pools) {
        sendResponse(`DApp Not Found for ${ledger}`)
      }

      // Cehck if Pool with Specified Name Exists
      let poolAccount = pools.find((item) => {
        return item.name === name && item.url == origin
      })

      if (!poolAccount) {
        sendResponse(`DApp Name Not Found for ${name}`)
      }

      // 1. Get/Find Active Account Address
      let activeAccount = poolAccount.sub_accounts.find((item) => {
        return item.active === true
      })

      // If there's no active account, then master account will be the default
      if (!activeAccount) {
        activeAccount = poolAccount.master_account
      }

      // Get Target Active Account / Latest Account. We'll Set this target account as an Active Account Later
      let targetAccount = poolAccount.sub_accounts[poolAccount.sub_accounts.length - 1]
      if (!targetAccount || targetAccount.address == activeAccount.address) {
        sendResponse(`There's No Latest Inactive Sub Account, Please Create One`)
      }

      const params = {
        ledger: ledger,
        address: activeAccount.address,
      };

      // 2. Get Minimal Balance Left, based on total assets and total opted in
      await InternalMethods[JsonRpcMethod.CalculateMinimumBalance]({ body: { params: params } }, async function (res) {
        const rekeyTo = res.details['auth-addr'] !== undefined ? res.details['auth-addr'] : null;

        const totalToPay = res.amount - (res.minimumBalance);

        if (totalToPay < res.minimumBalance) {

          sendResponse(`The Active Account doesnt have enough Algos to Transfer. 
          Algos: ${res.amount}, Minimum: ${res.minimumBalance}`)
        }

        // 3. Transfer all funds from active account to new sub-account.
        /**
         * If the active account is rekeyed to master, then sign the transaction with master SK,
         * If not, then transfer amount
         */
        let params: any = {};

        if (rekeyTo) {
          let masterAccount = poolAccount.master_account;
          params = {
            ledger: ledger,
            passphrase: passphrase,
            address: activeAccount.address,
            rekeyedAccount: masterAccount,
            txnParams: {
              from: activeAccount.address,
              to: targetAccount.address,
              note: '',
              amount: totalToPay,
              type: 'pay'
            },
          };
        } else {
          params = {
            ledger: ledger,
            passphrase: passphrase,
            address: activeAccount.address,
            txnParams: {
              from: activeAccount.address,
              to: targetAccount.address,
              note: '',
              amount: totalToPay,
              type: 'pay'
            },
          };
        }

        await InternalMethods[JsonRpcMethod.SignSendTransaction](params, async function (transferRes) {
          if ('error' in transferRes) {
            sendResponse(transferRes)
          } else {
            await setActiveSubAccount(name, origin, ledger, targetAccount.address, (item) => {
              updateDAppPools(item, ledger, (res) => {
                sendResponse({ active_address: targetAccount.address })
              })
            })
          }
        })

      })
    })

    return true;
  }

  public static [JsonRpcMethod.CalculateMinimumBalance](request: any, sendResponse: Function) {
    const { ledger, address } = request.body.params;

    const params = {
      ledger: ledger,
      address: address,
    }

    InternalMethods[JsonRpcMethod.AccountDetails]({ body: { params: params } }, function (res) {
      let totalAssets = [];

      if (res.assets) {
        totalAssets = res.assets;
      }

      const isRekeyed = res['auth-addr'] !== undefined;

      let totalByteSchema = 0
      let totalUintSchema = 0
      let extraPages = 0
      let totalOptedInApps = 0
      let totalCreatedApps = 0

      if (res['apps-total-schema']) {
        totalUintSchema = res['apps-total-schema']['num-uint']
        totalByteSchema = res['apps-total-schema']['num-byte-slice']
      }

      /**
       * Calculate Opted In Apps
       * To calculate opted in apps, we only need the length
       */
      if (res['apps-local-state']) {
        totalOptedInApps = res['apps-local-state'].length
      }

      /**
       * Calculate Created Apps
       * To calculate created apps, we need total of created apps and the extra pages
       */
      if (res['apps-total-extra-pages']) {
        extraPages = res['apps-total-extra-pages']
      }

      if (res['created-apps']) {
        totalCreatedApps += res['created-apps'].length
      }

      let minimumBalanceApps = 0

      if (totalUintSchema > 0) {
        minimumBalanceApps = (28500 * totalUintSchema) + (50000 * totalByteSchema);
      }

      if (totalOptedInApps > 0) {
        minimumBalanceApps += (totalOptedInApps * 100000)
      }

      if (totalCreatedApps > 0) {
        minimumBalanceApps += (100000 * totalCreatedApps) + (100000 * extraPages)
      }

      // Calculate the Min Balance
      let minBalance = 0; // In Microalgos
      minBalance += (totalAssets.length * 100000) + 100000 + 1000; // Each asset 100000, Tx Fee 1000
      minBalance += minimumBalanceApps

      sendResponse({
        minimumBalance: minBalance,
        amount: res.amount,
        details: res
      });
    });

    return true;
  }

  public static async [JsonRpcMethod.DAppSaveAccount](request: any, sendResponse: Function) {
    var keys = algosdk.generateAccount();

    const { name, ledger, passphrase, mnemonic, address } = request;
    this._encryptionWrap = new encryptionWrap(passphrase);

    await this._encryptionWrap.unlock((unlockedValue: any) => {
      if ('error' in unlockedValue) {
        sendResponse(unlockedValue);
      } else {
        const newAccount = {
          address: address,
          mnemonic: mnemonic,
          name: name,
        };

        if (!unlockedValue[ledger]) {
          unlockedValue[ledger] = [];
        }

        unlockedValue[ledger].push(newAccount);
        this._encryptionWrap?.lock(JSON.stringify(unlockedValue), (isSuccessful: any) => {
          if (isSuccessful) {
            session.wallet = this.safeWallet(unlockedValue);
            sendResponse(session.wallet);
          } else {
            sendResponse({ error: 'Lock failed' });
          }
        });
      }
    });
    return true;
  }

  public static [JsonRpcMethod.DeleteAccount](request: any, sendResponse: Function) {
    const { ledger, address, passphrase } = request.body.params;
    this._encryptionWrap = new encryptionWrap(passphrase);

    this._encryptionWrap.unlock((unlockedValue: any) => {
      if ('error' in unlockedValue) {
        sendResponse(unlockedValue);
      } else {
        // Find address to delete
        for (var i = unlockedValue[ledger].length - 1; i >= 0; i--) {
          if (unlockedValue[ledger][i].address === address) {
            unlockedValue[ledger].splice(i, 1);
            break;
          }
        }
        this._encryptionWrap?.lock(JSON.stringify(unlockedValue), (isSuccessful: any) => {
          if (isSuccessful) {
            session.wallet = this.safeWallet(unlockedValue);
            sendResponse(session.wallet);
          } else {
            sendResponse({ error: 'Lock failed' });
          }
        });
      }
    });
    return true;
  }

  public static [JsonRpcMethod.ImportAccount](request: any, sendResponse: Function) {
    const { mnemonic, name, ledger } = request.body.params;
    this._encryptionWrap = new encryptionWrap(request.body.params.passphrase);

    try {
      var recoveredAccountAddress = algosdk.mnemonicToSecretKey(mnemonic).addr;
      var existingAccounts = session.wallet[ledger];

      if (existingAccounts) {
        for (let i = 0; i < existingAccounts.length; i++) {
          if (existingAccounts[i].address === recoveredAccountAddress) {
            throw new Error(`Account already exists in ${ledger} wallet.`);
          }
        }
      }

      var newAccount = {
        address: recoveredAccountAddress,
        mnemonic: mnemonic,
        name: name,
      };
    } catch (error) {
      sendResponse({ error: error.message });
      return false;
    }

    this._encryptionWrap.unlock((unlockedValue: any) => {
      if ('error' in unlockedValue) {
        sendResponse(unlockedValue);
      } else {
        if (!unlockedValue[ledger]) {
          unlockedValue[ledger] = [];
        }

        unlockedValue[ledger].push(newAccount);
        this._encryptionWrap?.lock(JSON.stringify(unlockedValue), (isSuccessful: any) => {
          if (isSuccessful) {
            this.loadAccountAssetsDetails(newAccount.address, ledger);
            session.wallet = this.safeWallet(unlockedValue);
            sendResponse(session.wallet);
          } else {
            sendResponse({ error: 'Lock failed' });
          }
        });
      }
    });
    return true;
  }

  /**
    * Configure how integers in this request's JSON response will be decoded.
    *
    * The options are:
    * * "default": Integers will be decoded according to JSON.parse, meaning they will all be
    *   Numbers and any values greater than Number.MAX_SAFE_INTEGER will lose precision.
    * * "safe": All integers will be decoded as Numbers, but if any values are greater than
    *   Number.MAX_SAFE_INTEGER an error will be thrown.
    * * "mixed": Integers will be decoded as Numbers if they are less than or equal to
    *   Number.MAX_SAFE_INTEGER, otherwise they will be decoded as BigInts.
    * * "bigint": All integers will be decoded as BigInts.
    *
    * @param method - The method to use when parsing the
    *   response for this request. Must be one of "default", "safe", "mixed", or "bigint".
    */
  public static [JsonRpcMethod.AccountDetails](request: any, sendResponse: Function) {
    const { ledger, address, currency, intDecoding } = request.body.params;
    const algod = this.getAlgod(ledger);

    let decode = 'default'
    if (intDecoding) {
      decode = intDecoding
    }

    algod
      .accountInformation(address)
      .setIntDecoding(decode) // Latest algosdk, need intDecoding
      .do({ currency: currency })
      .then((res: any) => {

        if (decode == 'bigint' && res.assets) {
          res.assets.forEach((item, index) => {
            res.assets[index]['asset-id'] = Number(res.assets[index]['asset-id'])
          })
        }

        const extensionStorage = new ExtensionStorage();
        extensionStorage.getStorage('cache', (storedCache: any) => {
          const cache: Cache = initializeCache(storedCache, ledger);

          // Check for asset details saved in storage, if needed
          if ('assets' in res && res.assets.length > 0) {
            const missingAssets = [];
            for (var i = res.assets.length - 1; i >= 0; i--) {
              const assetId = res.assets[i]['asset-id'];
              if (assetId in cache.assets[ledger]) {
                res.assets[i] = {
                  ...res.assets[i],
                  ...cache.assets[ledger][assetId],
                };
              } else {
                missingAssets.push(assetId);
              }
            }

            if (missingAssets.length > 0) AssetsDetailsHelper.add(missingAssets, ledger);

            //res.assets.sort((a, b) => (a < b) ? -1 : ((a > b) ? 1 : 0)); Alternative way to sort the big int
            res.assets.sort((a, b) => a['asset-id'] - b['asset-id']);
          }

          sendResponse(res);

          // If it's big int, dont save it into the cache
          if (decode == 'bigint') return;

          // Save account updated account details in cache
          cache.accounts[ledger][address] = res;
          extensionStorage.setStorage('cache', cache, null);

          // Add details to session
          const wallet = session.wallet;
          // Validate the ledger still exists in the wallet
          if (ledger && wallet[ledger]) {
            for (var i = wallet[ledger].length - 1; i >= 0; i--) {
              if (wallet[ledger][i].address === address) {
                wallet[ledger][i].details = res;
              }
            }
          }
        });
      })
      .catch((e: any) => {
        sendResponse({ error: e.message });
      });
    return true;
  }

  public static [JsonRpcMethod.WalletChart](request: any, sendResponse: Function) {

    const { ledger, currency } = request.body.params;

    const api = this.getUrl(ledger)

    fetch(`${api.baseUrl}/chart/algo`, {
      headers: {
        currency: currency
      }
    })
      .then((response) => {
        return response.json().then((json) => {
          if (response.ok) {
            sendResponse(json);
          } else {
            sendResponse({ error: json });
          }
        });
      })
      .catch((e) => {
        sendResponse({ error: e });
      });
    return true;
  }

  public static [JsonRpcMethod.GetAllTransactions](request: any, sendResponse: Function) {
    const { ledger, address, currency } = request.body.params;

    const paramBuilder = (param) => {
      return {
        body: {
          params: param
        }
      }
    }

    const params = {
      ledger: ledger,
      address: address,
      currency: currency,
    }

    // Getting DApp
    getDappPools(ledger, async (pools) => {
      if (pools === null) {
        pools = []
      }

      let dappAccount = pools.find((item) => {
        return item.master_account.address === address
      })

      let allTransactions = []
      let allPendingTransactions = []

      // Regular account, doesnt have DApp
      if (!dappAccount) {
        let response = await getTransactions(address);
        sendResponse({
          transactions: response.transactions,
          pending: response.pending
        })
      } else {
        /**
         * DApp Account, merge all transactions in the group (master and sub accounts)
         */
        let response = await getTransactions(dappAccount.master_account.address);
        allTransactions = response.transactions;
        allPendingTransactions = response.pending;

        // Get activities for each sub accounts, then merge it
        for (const acc of dappAccount.sub_accounts) {
          response = await getTransactions(acc.address);
          allTransactions = allTransactions.concat(response.transactions)
          allPendingTransactions = allPendingTransactions.concat(response.pending)
        }

        // Order by Date / round-time
        allTransactions = allTransactions.sort((a, b) => {
          return (b['round-time'] - a['round-time']);
        })

        sendResponse({
          transactions: allTransactions,
          pending: allPendingTransactions
        })
      }
    })

    // Helper function to get Transactions
    const getTransactions: any = async (address) => {
      return new Promise((resolve, reject) => {
        params.address = address;
        InternalMethods[JsonRpcMethod.Transactions](paramBuilder(params), function (response) {
          response.transactions.forEach((tx, index) => {
            response.transactions[index]['owned-by'] = address
          })

          response.pending.forEach((tx, index) => {
            response.pending[index]['owned-by'] = address
          })
          resolve(response)
        })
      })
    }

    return true;
  }

  public static [JsonRpcMethod.Transactions](request: any, sendResponse: Function) {
    const { ledger, address, limit, 'next-token': token, currency } = request.body.params;
    const indexer = this.getIndexer(ledger);
    const algod = this.getAlgod(ledger);
    const txList = indexer.lookupAccountTransactions(address);
    const pendingTxList = algod.pendingTransactionByAddress(address);
    if (limit) txList.limit(limit);
    if (token) txList.nextToken(token);
    txList
      .do({ currency: currency })
      .then((txListResponse: any) => {
        pendingTxList.do().then((pendingTxsListResponse: any) => {
          new ExtensionStorage().getStorage('cache', (cache: any) => {
            const pending = [];
            pendingTxsListResponse['top-transactions'].forEach((pend) => {
              // We map algod transactions to something more readable
              let amount = pend['txn']['amt'] || pend['txn']['aamt'] || 0;
              const sender = pend['txn']['snd'];
              const assetSender = pend['txn']['asnd'];
              const receiver = pend['txn']['rcv'] || pend['txn']['arcv'];
              // asset or appl id
              const id = pend['txn']['xaid'] || pend['txn']['faid'] || pend['txn']['apid'];
              const cachedAsset =
                (pend['txn']['xaid'] || pend['txn']['faid']) && cache.assets[ledger][id];
              const assetName =
                cachedAsset &&
                (cachedAsset['unit-name'] || cachedAsset['name'] || cachedAsset['asset-id']);
              const decimals = (cachedAsset && cachedAsset.decimals) || 0;
              if (cachedAsset) amount = amount / Math.pow(10, decimals);
              pending.push({
                type: pend['txn']['type'],
                amount: amount,
                sender: sender && algosdk.encodeAddress(sender),
                assetSender: assetSender && algosdk.encodeAddress(assetSender),
                receiver: receiver && algosdk.encodeAddress(receiver),
                id: id,
                assetName: assetName,
              });
            });
            const uiResponse = {
              'next-token': txListResponse['next-token'],
              'transactions': txListResponse.transactions,
              'pending': pending,
            };
            sendResponse(uiResponse);
          });
        });
      })
      .catch((e: any) => {
        sendResponse({ error: e.message });
      });
    return true;
  }

  public static [JsonRpcMethod.AssetDetails](request: any, sendResponse: Function) {
    const assetId = request.body.params['asset-id'];
    const { ledger } = request.body.params;
    const indexer = this.getIndexer(ledger);
    indexer
      .lookupAssetByID(assetId)
      .do()
      .then((res: any) => {
        sendResponse(res);
        // Save asset details in storage if needed
        const extensionStorage = new ExtensionStorage();
        extensionStorage.getStorage('cache', (cache: any) => {
          if (cache === undefined) cache = new Cache();
          if (!(ledger in cache.assets)) cache.assets[ledger] = {};

          if (!(assetId in cache.assets[ledger])) {
            cache.assets[ledger][assetId] = res.asset.params;
            extensionStorage.setStorage('cache', cache, null);
          }
        });
      })
      .catch((e: any) => {
        sendResponse({ error: e.response });
      });
    return true;
  }

  public static [JsonRpcMethod.AssetsAPIList](request: any, sendResponse: Function) {
    function searchAssets(assets, indexer, nextToken, filter) {
      const req = indexer.searchForAssets().limit(7);

      if (isNaN(filter)) {
        req.unit(filter);
      } else {
        req.index(filter);
      }
      if (nextToken) req.nextToken(nextToken);
      req
        .do()
        .then((res: any) => {

          const newAssets = res.assets;
          for (var i = newAssets.length - 1; i >= 0; i--) {
            newAssets[i] = {
              asset_id: newAssets[i].index,
              name: newAssets[i]['params']['name'],
              unit_name: newAssets[i]['params']['unit-name'],
            };
          }
          res.assets = newAssets;

          sendResponse(res);
        })
        .catch((e: any) => {
          sendResponse({ error: e.message });
        });
    }

    const { ledger, filter, nextToken } = request.body.params;
    const indexer = this.getIndexer(ledger);
    // Do the search for asset id (if filter value is integer)
    // and asset name and concat them.
    if (filter.length > 0 && !isNaN(filter) && (!nextToken || nextToken.length === 0)) {
      indexer
        .searchForAssets()
        .index(filter)
        .do()
        .then((res: any) => {
          searchAssets(res.assets, indexer, nextToken, filter);
        })
        .catch((e: any) => {
          sendResponse({ error: e.message });
        });
    } else {
      searchAssets([], indexer, nextToken, filter);
    }
    return true;
  }

  public static [JsonRpcMethod.MESEAssetsAPIList](request: any, sendResponse: Function) {

    const { ledger } = request.body.params;

    const api = this.getUrl(ledger)

    fetch(`${api.baseUrl}/assets`)
      .then((response) => {
        return response.json().then((json) => {
          if (response.ok) {
            sendResponse(json);
          } else {
            sendResponse({ error: json });
          }
        });
      })
      .catch((e) => {
        sendResponse({ error: e });
      });
    return true;
  }

  public static [JsonRpcMethod.AssetsVerifiedList](request: any, sendResponse: Function) {
    const { ledger } = request.body.params;

    const getVerifiedAssets: any = (url) => {
      return new Promise((resolve, _) => {
        fetch(url)
          .then((response) => {
            return response.json().then((json) => {
              if (response.ok) {
                resolve(json);
              } else {
                resolve({ results: [], next: null });
              }
            });
          })
          .catch((e) => {
            resolve({ results: [], next: null, error: e.message });
          });

      })
    }

    if (ledger === Ledger.MainNet) {
      let url = "https://mobile-api.algorand.com/api/assets/?status=verified"
      let response: any = {}
      getVerifiedAssets(url).then((res) => {
        response = res
        if (res.next != null) {
          getVerifiedAssets(res.next).then((res) => {
            res.results.push(...response.results)
            sendResponse(res)
          })
        } else {
          sendResponse(response)
        }
      })
      // fetch('https://mobile-api.algorand.com/api/assets/?status=verified')
      //   .then((response) => {
      //     return response.json().then((json) => {
      //       if (response.ok) {
      //         sendResponse(json);
      //       } else {
      //         sendResponse({ error: json });
      //       }
      //     });
      //   })
      //   .catch((e) => {
      //     sendResponse({ error: e.message });
      //   });
    } else {
      sendResponse({
        results: [],
      });
    }
    return true;
  }

  /**
   * Check and transfer if the master account has any left over balances, to active sub-account
   */
  public static async [JsonRpcMethod.DAppManager_MasterAccountTransfer](request: any, sendResponse: Function) {

    const { ledger, passphrase, origin } = request.body.params;

    await getDappPools(ledger, async (pools) => {

      // Check if Pool with Specied Ledger Exists
      if (!pools) {
        sendResponse({ error: `DApp Not Found for ${ledger}`, result: false, dapp_cache: null })
        return
      }

      // Cehck if Pool with Specified Origin Exists
      let poolAccount = pools.find((item) => {
        return item.url == origin
      })

      if (!poolAccount) {
        sendResponse({ error: `DApp Name Not Found for ${origin}`, result: false, dapp_cache: null })
        return
      }

      // 1. Get/Find Active Account Address
      let activeAccount = poolAccount.sub_accounts.find((item) => {
        return item.active === true
      })

      // Get Master Account
      let masterAccount = poolAccount.master_account

      // If there's no active account, then return
      if (!activeAccount) {
        sendResponse({ error: 'No active sub-account found', result: false, dapp_cache: null })
        return
      }

      /**
       * Until this step, we're sure that we have an active sub-account
       * - Transfer any left over ALGO balance from master account to active sub account
       */

      const params = {
        ledger: ledger,
        address: masterAccount.address,
      };

      // 2. Get Minimal Balance Left for Master Account, based on total assets and total opted in
      await InternalMethods[JsonRpcMethod.CalculateMinimumBalance]({ body: { params: params } }, async function (res) {

        const totalToPay = res.amount - (res.minimumBalance);

        if (totalToPay < res.minimumBalance) {

          sendResponse({
            error: `The Active Account doesnt have enough Algos to Transfer. 
          Algos: ${res.amount}, Minimum: ${res.minimumBalance}`
            , result: false, dapp_cache: null
          })
          return
        }

        // 3. Transfer all funds from master account to active sub-account (if any)
        let params: any = {};

        params = {
          ledger: ledger,
          passphrase: passphrase,
          address: masterAccount.address,
          txnParams: {
            from: masterAccount.address,
            to: activeAccount.address,
            note: '',
            amount: totalToPay,
            type: 'pay'
          },
        };

        await InternalMethods[JsonRpcMethod.SignSendTransaction](params, async function (transferRes) {
          if ('error' in transferRes) {
            sendResponse({ error: transferRes, result: false, dapp_cache: null })
          } else {

            // Wait for Confirmation
            let confirmation = InternalMethods.waitConfirmationByAddress(masterAccount.address, ledger)

            Promise.race([confirmation, Task.asyncTimeout(10000)])
              .then((_) => {
                InternalMethods[JsonRpcMethod.GetAllAssets](InternalMethods.paramsBuilder({
                  address: masterAccount.address,
                  ledger: ledger,
                  currency: 'USD'
                }), function (details) {
                  sendResponse({ error: null, result: true, dapp_cache: details })
                })
              })
              .catch((err) => {
                sendResponse({ error: err, result: true, dapp_cache: null })
              })
          }
        })

      })
    })

    return true;


  }

  /**
   * Convert txnParams to transaction wraps
   * Will be used by DappManager_AssetTransfer
   * Note that this function is only optimzed for the axfer and pay TXs only (in the send page UI)
   */
  public static [JsonRpcMethod.BuildTransactionWrap](request: any, sendResponse: Function) {
    const { txnParams } = request.body.params;

    let transactionWraps = []

    try {
      txnParams.forEach((txn) => {
        let transactionObj: any = {
          transaction: {
            amount: txn.amount,
            from: txn.from,
            type: txn.type,
          }
        }

        if (txn.assetIndex) {
          transactionObj.transaction.assetIndex = txn.assetIndex
        }

        transactionWraps.push(transactionObj)

      })

      sendResponse({ transactionWraps, error: null })
    } catch (e) {
      sendResponse({ transactionWraps: null, error: e.message })
    }

  }

  public static [JsonRpcMethod.DAppManager_AssetTransfer](request: any, sendResponse: Function) {
    const { ledger, wraps, origin, passphrase } = request.body.params;

    this._encryptionWrap = new encryptionWrap(passphrase);
    this._encryptionWrap.unlock(async (unlockedValue: any) => {
      if ('error' in unlockedValue) {
        sendResponse(unlockedValue);
        return false;
      }

      // Get DApp Pools
      const extensionStorage = new ExtensionStorage();
      extensionStorage.getStorage('dapp_pools', async function (item) {
        try {
          if (item == undefined || item[ledger] == undefined) {
            sendResponse(null)
            return
          }

          // Get DApp based on the origin
          let pool = item[ledger].find((item) => {
            return item.url == origin
          })

          if (pool == undefined) {
            sendResponse(null)
          }

          // Get the active account & pool addresses
          // So we know wether this TX is coming from regular accounts or DApp accounts
          let activeAccount = pool.master_account
          let poolAddresses = [pool.master_account.address]
          if (pool.sub_accounts.length > 0) {

            pool.sub_accounts.forEach((subAcc) => {
              poolAddresses.push(subAcc.address)

              if (subAcc.active && subAcc.active == true) {
                activeAccount = subAcc
              }
            })
          }

          let fromDappAddress = ''
          let isDappAccounts = false

          // Track all TX fees, Algo, and Asset transfer
          let transactionFees = 0
          let algoPay = 0
          let axferPay = []

          // Convert back from string to big int
          for (let i = 0; i < wraps.length; i++) {
            if ((typeof wraps[i].transaction.amount) == 'string') {
              wraps[i].transaction.amount = BigInt(wraps[i].transaction.amount)
            }
          }

          wraps.forEach((tx, index) => {

            // Calculate the TX Fees Needed
            if (tx.transaction.from) {
              if (poolAddresses.includes(tx.transaction.from)) {
                isDappAccounts = true
                transactionFees += 1000 // TX Fees
                fromDappAddress = tx.transaction.from
              }
            }

            // Check if TX type is App call. CONSIDER that app call may have "fee" which we can set manually
            if (tx.transaction.type == 'appl' && fromDappAddress == tx.transaction.from && tx.transaction.fee && tx.transaction.fee > 0) {
              algoPay += tx.transaction.fee
            }

            // Check if TX Type is Pay
            if (tx.transaction.type == 'pay' && fromDappAddress == tx.transaction.from) {
              algoPay += tx.transaction.amount
            }

            // Check if TX type is Axfer (asset)
            if (tx.transaction.type == 'axfer' && fromDappAddress == tx.transaction.from && tx.transaction.amount != null) {
              let index = -1

              axferPay.forEach((axferTx, axferIndex) => {
                if (axferTx.assetId == tx.transaction.assetIndex) {
                  index = axferIndex
                }
              })

              if (index != -1) {
                axferPay[index].amount += tx.transaction.amount
              } else {
                axferPay.push({
                  assetId: tx.transaction.assetIndex,
                  amount: tx.transaction.amount
                })
              }
            }

            /**
             * If TX is optin an asset
             * Then send 100000 as a minimum balance for asset
             */
            if (tx.transaction.type == 'axfer' && fromDappAddress == tx.transaction.from && tx.transaction.amount == null) {
              algoPay += 100000
            }
          })

          // If it's from the regular account, then do nothing
          if (isDappAccounts == false) {
            sendResponse(null)
            return
          }

          /**
           * At some point, when user transfer some ALGO to master account
           * (when managed account already has sub-account), we don't have functionality to transfer again
           * from master account to active sub-account
           * - Check if master account has any left over balance, if yes, transfer all the left over balance to active sub-account
           */
          await InternalMethods[JsonRpcMethod.DAppManager_MasterAccountTransfer]({
            body: {
              params: {
                ledger: ledger,
                passphrase: passphrase,
                origin: origin
              }
            }
          }, async function (accTransfer) {
            console.log('DAppManager_MasterAccountTransfer', accTransfer)

            // Get Minimum Balance
            await InternalMethods[JsonRpcMethod.CalculateMinimumBalance]({
              body: {
                params: {
                  ledger: ledger,
                  address: fromDappAddress,
                }
              }
            }, async function (minimumBalanceResponse) {

              let minimumBalance = minimumBalanceResponse.minimumBalance

              /**
               * Get All Assets from the Storage/Cache
               */
              const extensionStorage = new ExtensionStorage();
              extensionStorage.getStorage('dapp_cache', async (details: any) => {

                // If there's a transfer happening, then use the dapp_cache from DAppManager_MasterAccountTransfer
                if (accTransfer.result && accTransfer.dapp_cache != null) {
                  details = accTransfer.dapp_cache
                }

                let assetTransfer: Array<AssetTransferTransaction> = []
                let algoTransfer: Array<AssetTransferTransaction> = []

                let currentAccount = details.accounts.find((acc) => {
                  return acc.address == fromDappAddress
                })

                let availableBalance = currentAccount.amount - minimumBalance

                /**
                 * If the from address is not the active address, then it has no Algos.
                 * Transfer Algo from active address to the from address
                 */
                if (activeAccount.address != fromDappAddress && availableBalance < (transactionFees + algoPay)) {
                  algoTransfer.push({
                    from: activeAccount.address,
                    to: fromDappAddress,
                    assets: [0],
                    amounts: [transactionFees + algoPay]
                  })
                } else {
                  availableBalance -= (transactionFees + algoPay)
                }

                /**
                 * Check if the current DApp address needed asset to transfer
                 */
                axferPay.forEach((axferTx) => {

                  // Check if the current address have enough asset amount
                  let asset = details.assets.find((item) => {
                    return item['asset-id'] == axferTx.assetId
                  })

                  let index = -1;
                  asset.accounts.forEach((item, i) => {
                    if (item['address'] == fromDappAddress) {
                      index = i
                    }
                  })

                  let assetBalance = 0 // Current asset amount
                  /**
                   * INDEX = -1, MEANS ACCOUNT HASNT OPTED IN THE ASSETS
                   * If an account hasnt opted in the assets,
                   * then create (& later will send) the opted in transaction
                   */
                  if (index == -1) {
                    if (fromDappAddress != activeAccount.address) {
                      algoTransfer.push({
                        from: activeAccount.address,
                        to: fromDappAddress,
                        assets: [0],
                        amounts: [(100000 + 1000)] // Inactive account, doesnt have TX fee and additional 100000 for maintaining new assets 
                      })
                    }
                    assetTransfer.push({
                      from: fromDappAddress,
                      to: fromDappAddress,
                      assets: [axferTx.assetId],
                      amounts: [0]
                    })
                  } else {
                    assetBalance = asset.accounts[index].amount // Current asset amount
                  }

                  if (axferTx.amount <= assetBalance) {
                    // Do nothing. The address has enough asset amount
                  } else {

                    // Do asset transfer. The address doesnt have enought asset amount
                    // let assetBalance = asset.accounts[index].amount // Currenct asset amount
                    let exceptionAddress = []

                    // Loop until the balance (plus from the other address balance) enough to pay asset transfer
                    while (assetBalance < axferTx.amount) {

                      // Find other addresses/account that has the same asset ID. Make sure the amount is > 0
                      let otherAddress = asset.accounts.find((item) => {
                        return item['address'] != fromDappAddress
                          && !exceptionAddress.includes(item['address'])
                          && item['amount'] > 0
                      })

                      // Add the amount to the assetBalance, see if the balance enough to pay axfer transfer. 
                      // And exclude this "other address" from being fethced again in the next loop.
                      assetBalance += otherAddress.amount
                      exceptionAddress.push(otherAddress.address)

                      /**
                      * If this "other address" is coming from INACTIVE account, 
                      * then it'll have no enough algo to pay the TX fee (for doing asset transfer)
                      */
                      if (otherAddress.address != activeAccount.address) {
                        assetTransfer.push({
                          from: otherAddress.address,
                          to: fromDappAddress,
                          assets: [axferTx.assetId],
                          amounts: [otherAddress.amount]
                        })

                        algoTransfer.push({
                          from: activeAccount.address,
                          to: otherAddress.address,
                          assets: [0],
                          amounts: [1000]
                        })

                      } else {
                        assetTransfer.push({
                          from: otherAddress.address,
                          to: fromDappAddress,
                          assets: [axferTx.assetId],
                          amounts: [otherAddress.amount]
                        })
                      }
                    }
                  }
                })

                let txs = []

                console.log('algoTransfer', algoTransfer)
                console.log('assetTransfer', assetTransfer)

                try{
                  for (const tx of algoTransfer) {
                    let txId = await InternalMethods.assetTransfer(tx, ledger, pool, passphrase)
                    console.log('txId', txId)
                    txs.push(txId)
                  }
  
                  for (const tx of assetTransfer) {
                    let txId = await InternalMethods.assetTransfer(tx, ledger, pool, passphrase)
                    console.log('txId', txId)
                    txs.push(txId)
                  }
  
                  // Convert big int to string (so we can serialize it)
                  for (let i = 0; i < axferPay.length; i++) {
                    if ((typeof axferPay[i].amount) == 'bigint') {
                      axferPay[i].amount = axferPay[i].amount.toString()
                    }
                  }
                }catch(e) {
                  sendResponse({ error: e })
                  return
                }

                /**
                 * Check if the from address has the asset amount
                 */
                sendResponse({ txs, details, axferPay, transactionFees, algoPay, assetTransfer, algoTransfer })

              })
            })
          })
        } catch (e) {
          sendResponse({ error: e.message })
        }

      })

    })

    return true

  }

  /**
  * BIG Int cannot be saved in a cache
  * So we need to convert any big int amounts to string
  * and convert back to big int when reading from the storage
  */
  public static [JsonRpcMethod.HandleBigInt](request: any, sendResponse: Function) {
    const { details } = request.body !== undefined ? request.body.params : request;

    try {
      details.totalAlgo = details.totalAlgo.toString()
      details.assets.forEach((item, index) => {
        details.assets[index].amount = details.assets[index].amount.toString()

        item.accounts.forEach((acc, index2) => {
          details.assets[index].accounts[index2].amount = details.assets[index].accounts[index2].amount.toString()
        })
      })

      details.accounts.forEach((acc, index) => {
        details.accounts[index].amount = details.accounts[index].amount.toString()

        if (acc.assets) {
          acc.assets.forEach((asset, index2) => {
            details.accounts[index].assets[index2].amount = details.accounts[index].assets[index2].amount.toString()
          })
        }
      })

      sendResponse({ details, error: null })
    } catch (e) {
      sendResponse({ details: null, error: e.message })
    }
  }

  /**
   * This function is to validate the incoming transaction, only works for managed account only.
   * 1. First, it'll find if there's any "appl" transaction OR "axfer" opted in transaction.
   * 2. Second, based on either "appl" or "axfer" transactions, it'll try to guess the suggested address
   * 3. Last, it'll check if there are some addressed (in raw tx array) that needed to change based on the suggessted address
   */
  public static [JsonRpcMethod.DAppManager_ValidateTransactions](request: any, sendResponse: Function) {
    const { pool, rawTxArray } = request.body !== undefined ? request.body.params : request;

    /**
     * First, get Pool ID, so manager know what address that appropriate for the transactions
     * - Get the Pool ID by searching in the transactions for 'appl' types
     * - If there's no transaction with 'appl' types, then do nothing
     */
    let applTransaction = rawTxArray.find((tx) => {
      return tx.type == 'appl'
    })

    /**
     * Find axfer opted in transaction
     */
    let axferTransaction = rawTxArray.find((tx) => {
      return tx.type == 'axfer' && (!tx.amount || tx.amount == 0)
    })

    /**
     * Second, DApp manager will try to find the suggested address based on the Pool ID
     * - See if there's account (inside the DApp) that already opted in and interacted with the pool.
     *    - If yes, then use that account address as a suggested address
     * - If it's a new pool contract that being opted in, then suggested address is the active address
     * - Replace the address inside raw tx array if needed
     */

    let updatedTxs = false;
    const genesisId = rawTxArray[0].genesisID

    // Get the active account & pool addresses
    // So we know wether this TX is coming from regular accounts or DApp accounts
    let activeAccount = pool.master_account
    let poolAddresses = [pool.master_account.address]
    if (pool.sub_accounts.length > 0) {
      // activeAccount = pool.sub_accounts[pool.sub_accounts.length - 1]
      pool.sub_accounts.forEach((subAcc) => {
        poolAddresses.push(subAcc.address)

        if (subAcc.active && subAcc.active == true) {
          activeAccount = subAcc
        }
      })
    }

    let suggestedAddress = activeAccount.address

    let param = {
      address: pool.master_account.address,
      ledger: getLedgerFromGenesisId(genesisId),
      currency: 'USD',
      intDecoding: 'bigint',
    }

    InternalMethods[JsonRpcMethod.GetAllAssets](InternalMethods.paramsBuilder(param), function (details) {

      /**
       * BIG Int cannot be saved in a cache
       * So we need to convert any big int amounts to string
       * and convert back to big int when reading from the storage
       * 
       * TODO: MOVE THIS TO HELPER FUNCTION? FOR DECODE/ENCODE (BIG INT TO STRING AND STRING TO BIG INT)
       */
      details.totalAlgo = details.totalAlgo.toString()
      details.assets.forEach((item, index) => {
        details.assets[index].amount = details.assets[index].amount.toString()

        item.accounts.forEach((acc, index2) => {
          details.assets[index].accounts[index2].amount = details.assets[index].accounts[index2].amount.toString()
        })
      })

      details.accounts.forEach((acc, index) => {
        details.accounts[index].amount = details.accounts[index].amount.toString()

        if (acc.assets) {
          acc.assets.forEach((asset, index2) => {
            details.accounts[index].assets[index2].amount = details.accounts[index].assets[index2].amount.toString()
          })
        }
      })

      /**
       * Store the response
       */
      const extensionStorage = new ExtensionStorage();
      extensionStorage.setStorage('dapp_cache', details, () => { });

      // Track if this transaction is coming from DApp accounts or Regular accounts
      let isDAppAccounts = false;

      /**
       * The TX has no Appl and no Axfer opted in. Check if the TX is coming from the DApp Accounts
       */
      if (applTransaction == undefined && axferTransaction == undefined) {
        rawTxArray.forEach((rawTx) => {
          if (rawTx.from) {
            let addr = algosdk.encodeAddress(rawTx.from.publicKey)
            // check that the address is belongs to the DApp accounts or regular accounts
            if (poolAddresses.includes(addr)) {
              isDAppAccounts = true
            }
          }

          if (rawTx.to) {
            let addr = algosdk.encodeAddress(rawTx.to.publicKey)
            //  check that the address is belongs to the DApp accounts or regular accounts
            if (poolAddresses.includes(addr)) {
              isDAppAccounts = true
            }
          }
        })

        sendResponse({
          error: null,
          txs: rawTxArray,
          isDAppAccounts
        })
        return
      }

      let poolId = null

      /**
       * Transaction is based on Appl
       */
      if (applTransaction != undefined) {
        poolId = applTransaction.appIndex

        // Find suggested address
        if (details.apps) {
          let optedInPool = details.apps.find((app) => {
            return app.id == poolId
          })

          if (optedInPool) {
            suggestedAddress = optedInPool['used-by']
          }
        }
      }

      /**
       * Transaction is based on Opted In Axfer
       */
      if (applTransaction == undefined && axferTransaction != undefined) {

        let asset = details.assets.find((asset) => {
          return asset['asset-id'] == axferTransaction.assetIndex
        })

        // Managed accounts havent opted in the asset, then do opt in using active account
        if (!asset) {
          suggestedAddress = activeAccount.address
        }
      }

      /**
       * Third, for each transactions, inspect the from, to and appAccount addresses
       * If there's an account found in the wallet, and it doesnt match with the suggested address
       * then replace it with the suggested address
       */
      rawTxArray.forEach((rawTx, index) => {

        // Inspect the From Address
        if (rawTx.from) {
          let addr = algosdk.encodeAddress(rawTx.from.publicKey)
          let found = InternalMethods.checkAccountExists(genesisId, addr)

          // If found, then check if the address is same with our suggested address
          // Also check that the address is belongs to the DApp accounts, not regular accounts
          if (found && addr != suggestedAddress && poolAddresses.includes(addr)) {
            updatedTxs = true
            rawTxArray[index].from = algosdk.decodeAddress(suggestedAddress)
          }

          if (poolAddresses.includes(addr)) {
            isDAppAccounts = true
          }
        }

        // Some txs doesnt have to parameters. ex: appl type
        if (rawTx.to) {
          let addr = algosdk.encodeAddress(rawTx.to.publicKey)
          let found = InternalMethods.checkAccountExists(genesisId, addr)

          // If found, then check if the address is same with our suggested address
          // Also check that the address is belongs to the DApp accounts, not regular accounts
          if (found && addr != suggestedAddress && poolAddresses.includes(addr)) {
            updatedTxs = true
            rawTxArray[index].to = algosdk.decodeAddress(suggestedAddress)
          }

          if (poolAddresses.includes(addr)) {
            isDAppAccounts = true
          }
        }

        // some txs do/doesnt have appAccounts parameters
        if (rawTx.appAccounts) {
          rawTx.appAccounts.forEach((acc, accIndex) => {
            let addr = algosdk.encodeAddress(acc.publicKey)
            let found = InternalMethods.checkAccountExists(genesisId, addr)

            // If found, then check if the address is same with our suggested address
            // Also check that the address is belongs to the DApp accounts, not regular accounts
            if (found && addr != suggestedAddress && poolAddresses.includes(addr)) {
              updatedTxs = true
              rawTxArray[index].appAccounts[accIndex] = algosdk.decodeAddress(suggestedAddress)
            }

            if (poolAddresses.includes(addr)) {
              isDAppAccounts = true
            }
          })
        }
      })

      // There's no updated transactions. All good!
      if (!updatedTxs) {
        sendResponse({
          error: null,
          txs: rawTxArray,
          encoded: null,
          isDAppAccounts
        })
      } else {

        /**
         * There are some updated transactions
         * 1. Re assign a new Group. 
         *    Note that to delete the group first from the TX before re-assigning group
         * 2. Encode the new/updated transactions, so backend can decode and sign it
         */

        // Re Assign new Group Transactions
        let txgroup = algosdk.assignGroupID(rawTxArray.slice().map((tx) => {
          delete tx.group;
          return tx;
        }));

        sendResponse({
          error: 'address-changed',
          txs: txgroup,
          encoded: InternalMethods.encodeUnsignedTxToBase64(txgroup),
          pool_id: poolId,
          isDAppAccounts
        })
      }
    })

  }

  public static [JsonRpcMethod.SignSendTransaction](request: any, sendResponse: Function) {
    const { ledger, address, passphrase, txnParams, rekeyedAccount } = request.body !== undefined ? request.body.params : request;
    this._encryptionWrap = new encryptionWrap(passphrase);
    var algod = this.getAlgod(ledger);

    this._encryptionWrap.unlock(async (unlockedValue: any) => {
      if ('error' in unlockedValue) {
        sendResponse(unlockedValue);
        return false;
      }
      let account;

      // Find address to send algos from
      for (var i = unlockedValue[ledger].length - 1; i >= 0; i--) {
        if (unlockedValue[ledger][i].address === address) {
          account = unlockedValue[ledger][i];
          break;
        }
      }

      if (rekeyedAccount !== undefined) {
        var recoveredAccount = algosdk.mnemonicToSecretKey(rekeyedAccount.mnemonic);
      } else {
        var recoveredAccount = algosdk.mnemonicToSecretKey(account.mnemonic);
      }

      // Return mnemonic
      if (request.body !== undefined && "mnemonicOnly" in request.body.params && request.body.params.mnemonicOnly) {
        sendResponse({ mnemonic: account.mnemonic });
        return;
      }

      const params = await algod.getTransactionParams().do();
      const txn = {
        ...txnParams,
        fee: params.fee,
        firstRound: params.firstRound,
        lastRound: params.lastRound,
        genesisID: params.genesisID,
        genesisHash: params.genesisHash,
      };

      if ('note' in txn) txn.note = new Uint8Array(Buffer.from(txn.note));

      const txHeaders = {
        'Content-Type': 'application/x-binary',
      };

      let transactionWrap: BaseValidatedTxnWrap = undefined;
      try {
        transactionWrap = getValidatedTxnWrap(txn, txn['type']);
      } catch (e) {
        logging.log(`Validation failed. ${e}`);
        sendResponse({ error: `Validation failed. ${e}` });
        return;
      }
      if (!transactionWrap) {
        // We don't have a transaction wrap. We have an unknow error or extra fields, reject the transaction.
        logging.log(
          'A transaction has failed because of an inability to build the specified transaction type.'
        );
        sendResponse({
          error:
            'A transaction has failed because of an inability to build the specified transaction type.',
        });
        return;
      } else if (
        transactionWrap.validityObject &&
        Object.values(transactionWrap.validityObject).some(
          (value) => value['status'] === ValidationStatus.Invalid
        )
      ) {
        // We have a transaction that contains fields which are deemed invalid. We should reject the transaction.
        const e =
          'One or more fields are not valid. Please check and try again.\n' +
          Object.values(transactionWrap.validityObject)
            .filter((value) => value['status'] === ValidationStatus.Invalid)
            .map((vo) => vo['info']);
        sendResponse({ error: e });
        return;
      } else {
        // We have a transaction which does not contain invalid fields, but may contain fields that are dangerous
        // or ones we've flagged as needing to be reviewed. We can use a modified popup to allow the normal flow, but require extra scrutiny.
        let signedTxn;
        try {
          const builtTx = buildTransaction(txn);
          signedTxn = {
            txID: builtTx.txID().toString(),
            blob: builtTx.signTxn(recoveredAccount.sk),
          };
        } catch (e) {
          sendResponse({ error: e.message });
          return;
        }

        algod
          .sendRawTransaction(signedTxn.blob, txHeaders)
          .do()
          .then((resp: any) => {
            sendResponse({ txId: resp.txId });
          })
          .catch((e: any) => {
            if (e.message.includes('overspend'))
              sendResponse({ error: "Overspending. Your account doesn't have sufficient funds." });
            else if (e.message.includes('tried to spend'))
              sendResponse({ error: "Can't add Asset, insufficient balance" })
            else
              sendResponse({ error: e.response.text });
            sendResponse({ error: e.message });
          });
      }
    });

    return true;
  }

  public static [JsonRpcMethod.ChangeLedger](request: any, sendResponse: Function) {
    session.ledger = request.body.params['ledger'];
    sendResponse({ ledger: session.ledger });
  }

  public static [JsonRpcMethod.DeleteNetwork](request: any, sendResponse: Function) {
    const ledger = request.body.params['name'];
    const ledgerUniqueName = ledger.toLowerCase();
    getAvailableLedgersExt((availiableLedgers) => {
      const matchingLedger = availiableLedgers.find((avls) => avls.uniqueName === ledgerUniqueName);

      if (!matchingLedger || !matchingLedger.isEditable) {
        sendResponse({ error: 'This ledger can not be deleted.' });
      } else {
        // Delete ledger from availableLedgers and assign to new array //
        const remainingLedgers = availiableLedgers.filter(
          (avls) => avls.uniqueName !== ledgerUniqueName
        );

        // Delete Accounts from wallet //
        this._encryptionWrap = new encryptionWrap(request.body.params.passphrase);

        // Remove existing accoutns in session.wallet
        var existingAccounts = session.wallet[request.body.params['ledger']];
        if (existingAccounts) {
          delete session.wallet[request.body.params['ledger']];
        }

        // Using the passphrase unlock the current saved data
        this._encryptionWrap.unlock((unlockedValue: any) => {
          if ('error' in unlockedValue) {
            sendResponse(unlockedValue);
          } else {
            if (unlockedValue[ledger]) {
              // The unlocked value contains ledger information - delete it
              delete unlockedValue[ledger];
            }

            // Resave the updated wallet value
            this._encryptionWrap
              ?.lock(JSON.stringify(unlockedValue), (isSuccessful: any) => {
                if (isSuccessful) {
                  // Fully rebuild the session wallet
                  session.wallet = this.safeWallet(unlockedValue);
                }
              })
              .then(() => {
                // Update cache with remaining ledgers//
                const extensionStorage = new ExtensionStorage();
                extensionStorage.getStorage('cache', (cache: any) => {
                  if (cache === undefined) {
                    cache = initializeCache(cache);
                  }
                  if (cache) {
                    cache.availableLedgers = remainingLedgers;
                    extensionStorage.setStorage('cache', cache, () => { });
                  }

                  // Update the session //
                  session.availableLedgers = remainingLedgers;

                  // Delete from the injected ledger settings //
                  Settings.deleteInjectedNetwork(ledgerUniqueName);

                  // Delete ledger from dapp pools if exists
                  extensionStorage.getStorage('dapp_pools', function (item) {
                    if (item !== undefined && item[ledger] !== undefined) {
                      delete item[ledger];
                    }
                    extensionStorage.setStorage('dapp_pools', item, () => {
                      extensionStorage.getStorage('appSettings', function (setting) {
                        if (setting !== undefined && setting.selectedLedger !== undefined && setting.selectedLedger == ledger) {
                          setting.selectedLedger = "";
                          setting.selectedAccountAddress = "";
                          extensionStorage.setStorage('appSettings', setting, () => {
                            sendResponse({ availableLedgers: remainingLedgers });
                          })
                        } else {
                          // Send back remaining ledgers //
                          sendResponse({ availableLedgers: remainingLedgers });
                        }
                      });
                    });
                  })
                });
              });
          }
        });
      }
    });
    return true;
  }

  public static [JsonRpcMethod.SaveNetwork](request: any, sendResponse: Function) {
    try {
      // If we have a passphrase then we are modifying.
      // There may be accounts attatched, if we match on a unique name, we should update.
      if (request.body.params['passphrase'] !== undefined) {
        this._encryptionWrap = new encryptionWrap(request.body.params['passphrase']);
        this._encryptionWrap.unlock((unlockedValue: any) => {
          if ('error' in unlockedValue) {
            sendResponse(unlockedValue);
          }

          // We have evaluated the passphrase and it was valid.

          const addedLedger = new LedgerTemplate({
            name: request.body.params['name'],
            genesisId: request.body.params['genesisId'],
            genesisHash: request.body.params['genesisHash'],
            symbol: request.body.params['symbol'],
            algodUrl: request.body.params['algodUrl'],
            indexerUrl: request.body.params['indexerUrl'],
            headers: request.body.params['headers'],
            baseUrl: request.body.params['baseUrl'],
          });

          // Specifically get the base ledgers to check and prevent them from being overriden.
          const defaultLedgers = getBaseSupportedLedgers();

          getAvailableLedgersExt((availiableLedgers) => {
            const comboLedgers = [...availiableLedgers];

            // Validate that genesisId must be unique
            // Find existing ledgers that has the same genesisId & different name
            const existingGenesisId = comboLedgers.find((cled) => {
              return cled.genesisId == addedLedger.genesisId && cled.uniqueName != addedLedger.uniqueName
            })
            if (existingGenesisId) {
              sendResponse({ error: `GenesisId ${existingGenesisId.genesisId} Already used by ${existingGenesisId.name} Ledger` });
              return
            }

            // Add the new ledger if it isn't there.
            if (!comboLedgers.some((cledg) => cledg.uniqueName === addedLedger.uniqueName)) {
              comboLedgers.push(addedLedger);

              // Also add the ledger to the injected ledgers in settings
              Settings.addInjectedNetwork(addedLedger);

              let newLedger = {};
              newLedger[request.body.params['name']] = []
              unlockedValue = { ...unlockedValue, ...newLedger }
            }
            // If the new ledger name does exist, we sould update the values as long as it is not a default ledger.
            else {
              const matchingLedger = comboLedgers.find(
                (cledg) => cledg.uniqueName === addedLedger.uniqueName
              );
              if (!defaultLedgers.some((dledg) => dledg.uniqueName === matchingLedger.uniqueName)) {
                Settings.updateInjectedNetwork(addedLedger);
                matchingLedger.genesisId = addedLedger.genesisId;
                matchingLedger.symbol = addedLedger.symbol;
                matchingLedger.genesisHash = addedLedger.genesisHash;
                matchingLedger.algodUrl = addedLedger.algodUrl;
                matchingLedger.indexerUrl = addedLedger.indexerUrl;
                matchingLedger.headers = addedLedger.headers;
              }

              let newLedger = {};
              newLedger[request.body.params['name']] = []
              unlockedValue = { ...unlockedValue, ...newLedger }
            }
            // Update the session and send response before setting cache.
            session.availableLedgers = comboLedgers;

            this._encryptionWrap?.lock(JSON.stringify(unlockedValue), (isSuccessful: any) => {
              sendResponse({ availableLedgers: comboLedgers });
            });

            // Updated the cached ledgers.
            const extensionStorage = new ExtensionStorage();
            extensionStorage.getStorage('cache', (cache: any) => {
              if (cache === undefined) {
                cache = initializeCache(cache);
              }
              if (cache) {
                cache.availableLedgers = comboLedgers;
                extensionStorage.setStorage('cache', cache, () => { });
              }
            });
          });
        });
      }
      return true;
    } catch (e) {
      sendResponse({ error: e.message });
    }
  }
  public static [JsonRpcMethod.GetLedgers](request: any, sendResponse: Function) {
    getAvailableLedgersExt((availableLedgers) => {
      sendResponse(availableLedgers);
    });

    return true;
  }
}
