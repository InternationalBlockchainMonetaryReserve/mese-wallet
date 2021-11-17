/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const algosdk = require('algosdk');

import { RequestErrors, WalletTransaction, AssetTransferTransaction } from '@mese/common/types';
import { JsonRpcMethod } from '@mese/common/messaging/types';
import { API, Ledger } from './types';
import {
  getValidatedTxnWrap,
  getLedgerFromGenesisId,
  calculateEstimatedFee,
} from '../transaction/actions';
import { BaseValidatedTxnWrap } from '../transaction/baseValidatedTxnWrap';
import { ValidationStatus } from '../utils/validator';
import { getAvailableLedgersExt } from '../utils/helper';
import { InternalMethods } from './internalMethods';
import { MessageApi } from './api';
import encryptionWrap from '../encryptionWrap';
import { Settings } from '../config';
import { extensionBrowser } from '@mese/common/chrome';
import { logging } from '@mese/common/logging';
import { InvalidTransactionStructure } from '../../errors/validation';
import {
  InvalidStructure,
  InvalidMsigStructure,
  NoDifferentLedgers,
  MultipleTxsRequireGroup,
  NonMatchingGroup,
  IncompleteOrDisorderedGroup,
  InvalidSigners,
} from '../../errors/walletTxSign';
import { buildTransaction } from '../utils/transactionBuilder';
import { getSigningAccounts } from '../utils/multisig';
import { base64ToByteArray, byteArrayToBase64, stringToByteArray } from '@mese/common/encoding';
import { removeEmptyFields } from '@mese/common/utils';
import extensionStorage from '@mese/storage/src/extensionStorage';

const popupProperties = {
  type: 'popup',
  focused: true,
  width: 400,
  height: 625,
};

export class Task {
  private static requests: { [key: string]: any } = {};
  private static authorized_pool: Array<string> = [];

  public static isAuthorized(origin: string): boolean {
    return Task.authorized_pool.indexOf(origin) > -1;
  }

  private static fetchAPI(url, params) {
    return new Promise((resolve, reject) => {
      fetch(url, params)
        .then((response) => {
          return response.json().then((json) => {
            if (response.ok) {
              return json;
            } else {
              return Promise.reject(json);
            }
          });
        })
        .then((json) => {
          resolve(json);
        })
        .catch((error) => {
          const res: Object = {
            message: error.message,
            data: error.data,
          };
          reject(res);
        });
    });
  }

  public static build(request: any) {
    const body = request.body;
    const method = body.method;

    // Check if there's a previous request from the same origin
    if (request.originTabID in Task.requests)
      return new Promise((resolve, reject) => {
        request.error = {
          message: 'Another query processing',
        };
        reject(request);
      });
    else Task.requests[request.originTabID] = request;

    return new Promise((resolve, reject) => {
      Task.methods().public[method](request, resolve, reject);
    }).finally(() => {
      delete Task.requests[request.originTabID];
    });
  }

  public static clearPool() {
    Task.authorized_pool = [];
  }

  public static asyncTimeout(interval) {
    return new Promise((resolve, reject) => {
      setInterval(() => {
        resolve('timeout')
      }, interval)
    })
  }

  private static parseBigIntAmountFromString(transactionWrap) {
    // Adjust decimal places if we are using an axfer transaction
    if (transactionWrap.transaction['type'] === 'axfer') {
      console.log('inside modifyBigIntAmount', transactionWrap)
      if ((typeof transactionWrap.transaction.amount) == 'string') {
        transactionWrap.transaction.amount = BigInt(transactionWrap.transaction.amount)
      }
    }
  }

  /**
   * Parse Big Int amount to String
   */
  private static modifyBigIntAmountToString(transactionWrap) {
    // Adjust decimal places if we are using an axfer transaction
    // if (transactionWrap.transaction['type'] === 'axfer') {
    if (transactionWrap.transaction.amount && (typeof transactionWrap.transaction.amount) == 'bigint') {
      transactionWrap.transaction.amount = transactionWrap.transaction.amount.toString()
    }
    // }
  }

  private static modifyTransactionWrapWithAssetCoreInfo(transactionWrap, callback) {
    // Adjust decimal places if we are using an axfer transaction
    if (transactionWrap.transaction['type'] === 'axfer') {
      const assetIndex = transactionWrap.transaction['assetIndex'];
      const ledger = getLedgerFromGenesisId(transactionWrap.transaction['genesisID']);
      const conn = Settings.getBackendParams(ledger, API.Indexer);
      const sendPath = `/v2/assets/${assetIndex}`;
      const fetchAssets: any = {
        headers: {
          ...conn.headers,
        },
        method: 'GET',
      };

      let url = conn.url;
      if (conn.port.length > 0) url += ':' + conn.port;
      Task.fetchAPI(`${url}${sendPath}`, fetchAssets)
        .then((assets) => {
          const params = assets['asset']['params'];

          // Get relevant data from asset params
          const decimals = params['decimals'];
          const unitName = params['unit-name'];

          // Update the unit-name for the asset
          if (unitName) {
            transactionWrap.unitName = unitName;
          }

          // Get the display amount as a string to prevent screen deformation of large ints
          let displayAmount = String(transactionWrap.transaction.amount);

          // If we have decimals, then we need to set the display amount with them in mind
          if (decimals && decimals > 0) {
            // Append missing zeros, if needed
            if (displayAmount.length < decimals) {
              displayAmount = displayAmount.padStart(decimals, '0');
            }
            const offsetAmount = Math.abs(decimals - displayAmount.length);

            // Apply decimal transition
            displayAmount = `${displayAmount.substr(0, offsetAmount)}.${displayAmount.substr(
              offsetAmount
            )}`;

            // If we start with a decimal now after padding and applying, add a 0 to the beginning for legibility
            if (displayAmount.startsWith('.')) {
              displayAmount = '0'.concat(displayAmount);
            }

            // Set new amount
            transactionWrap.displayAmount = displayAmount;
          }
          callback && callback(transactionWrap);
        })
        .catch((ex) => {
          // Could not get asset information for a transfer - attach error note
          transactionWrap['error'] = ex['message'];
          callback && callback(transactionWrap);
        });
    } else {
      callback && callback(transactionWrap);
    }
  }

  public static methods(): {
    [key: string]: {
      [JsonRpcMethod: string]: Function;
    };
  } {
    return {
      public: {
        [JsonRpcMethod.MESEVersion]: (d: any, resolve: Function, reject: Function) => {
          // Delete any previous request made from the Tab that it's
          // trying to connect.
          delete Task.requests[d.originTabID];

          InternalMethods[JsonRpcMethod.Version](
            {},
            function (res) {
              d.response = {
                version: res,
              };
              resolve(d);
              return;
            }
          )

        },
        // authorization
        [JsonRpcMethod.MESEAuthorization]: (d: any, resolve: Function, reject: Function) => {
          // Delete any previous request made from the Tab that it's
          // trying to connect.
          delete Task.requests[d.originTabID];

          if (d.body.params.walletType == "MESE" && !d.body.params.name) {
            d.error = {
              message: 'Please Specify DAPP Name.',
            };
            reject(d);
            return;
          }

          // Check Ledger
          if (d.body.params.walletType == "MESE" && !d.body.params.ledger) {
            const baseNetworks = Object.keys(Ledger);
            const injectedNetworks = Settings.getCleansedInjectedNetworks();
            d.error = {
              message: `Ledger not provided. Please use a base ledger: [${baseNetworks}] or an available custom one ${JSON.stringify(
                injectedNetworks
              )}.`,
            };
            reject(d);
            return;
          }

          // If access was already granted, authorize connection.
          if (Task.isAuthorized(d.origin)) {
            d.response = {};
            MessageApi.send(d);
          } else {
            extensionBrowser.windows.create(
              {
                url: extensionBrowser.runtime.getURL('index.html#/authorize'),
                ...popupProperties,
              },
              function (w: any) {
                if (w) {
                  Task.requests[d.originTabID] = {
                    window_id: w.id,
                    message: d,
                  };
                  setTimeout(function () {
                    extensionBrowser.runtime.sendMessage(d);
                  }, 500);
                }
              }
            );
          }
        },
        [JsonRpcMethod.Disconnect]: (d: any, resolve: Function, reject: Function) => {
          const origin = d.origin;

          Task.authorized_pool.splice(Task.authorized_pool.indexOf(origin), 1);

          d.response = {
            message: `${origin} disconnected`,
          };
          resolve(d);
          return;

        },
        // sign-transaction
        [JsonRpcMethod.MESESignTransaction]: (d: any, resolve: Function, reject: Function) => {
          let transactionWrap = undefined;
          let validationError = undefined;
          try {
            const txn = d.body.params;
            transactionWrap = getValidatedTxnWrap(txn, txn['type']);
            InternalMethods.checkValidAccount(
              transactionWrap.transaction.genesisID,
              transactionWrap.transaction.from
            );
          } catch (e) {
            logging.log(`Validation failed. ${e.message}`);
            validationError = e;
          }
          if (
            !transactionWrap &&
            validationError &&
            validationError instanceof InvalidTransactionStructure
          ) {
            // We don't have a transaction wrap, but we have a validation error.
            d.error = {
              message: validationError.message,
            };
            reject(d);
            return;
          } else if (!transactionWrap || validationError) {
            // We don't have a transaction wrap. We have an unknow error or extra fields, reject the transaction.
            logging.log(
              'A transaction has failed because of an inability to build the specified transaction type.'
            );
            d.error = {
              message:
                (validationError && validationError.message) ||
                'Validation failed for transaction. Please verify the properties are valid.',
            };
            reject(d);
          } else if (
            transactionWrap.validityObject &&
            Object.values(transactionWrap.validityObject).some(
              (value) => value['status'] === ValidationStatus.Invalid
            )
          ) {
            // We have a transaction that contains fields which are deemed invalid. We should reject the transaction.
            // We can use a modified popup that allows users to review the transaction and invalid fields and close the transaction.
            const invalidKeys = [];
            Object.entries(transactionWrap.validityObject).forEach(([key, value]) => {
              if (value['status'] === ValidationStatus.Invalid) {
                invalidKeys.push(`${key}`);
              }
            });
            d.error = {
              message: `Validation failed for transaction because of invalid properties [${invalidKeys.join(
                ','
              )}].`,
            };
            reject(d);
          } else {
            // Get Ledger params
            const conn = Settings.getBackendParams(
              getLedgerFromGenesisId(transactionWrap.transaction.genesisID),
              API.Algod
            );
            const sendPath = '/v2/transactions/params';
            const fetchParams: any = {
              headers: {
                ...conn.headers,
              },
              method: 'GET',
            };

            let url = conn.url;
            if (conn.port.length > 0) url += ':' + conn.port;

            Task.fetchAPI(`${url}${sendPath}`, fetchParams).then((params) => {
              calculateEstimatedFee(transactionWrap, params);

              Task.modifyTransactionWrapWithAssetCoreInfo(transactionWrap, (transactionWrap) => {
                if (transactionWrap.error) {
                  // There was an error building the asset info. Outright reject / allow with warning.
                  //reject(d);
                  //return;
                }

                d.body.params = transactionWrap;

                extensionBrowser.windows.create(
                  {
                    url: extensionBrowser.runtime.getURL('index.html#/sign-transaction'),
                    ...popupProperties,
                  },
                  function (w) {
                    if (w) {
                      Task.requests[d.originTabID] = {
                        window_id: w.id,
                        message: d,
                      };
                      // Send message with tx info
                      setTimeout(function () {
                        extensionBrowser.runtime.sendMessage(d);
                      }, 500);
                    }
                  }
                );
              });
            });
          }
        },
        [JsonRpcMethod.MESESignMultisigTransaction]: (d: any, resolve: Function, reject: Function) => {
          // TODO: Possible support for blob transfer on previously signed transactions

          let transactionWrap = undefined;
          let validationError = undefined;
          try {
            transactionWrap = getValidatedTxnWrap(d.body.params.txn, d.body.params.txn['type']);
          } catch (e) {
            logging.log(`Validation failed. ${e}`);
            validationError = e;
          }
          if (
            !transactionWrap &&
            validationError &&
            validationError instanceof InvalidTransactionStructure
          ) {
            // We don't have a transaction wrap, but we have a validation error.
            d.error = {
              message: validationError.message,
            };
            reject(d);
            return;
          } else if (!transactionWrap) {
            // We don't have a transaction wrap. We have an unknow error or extra fields, reject the transaction.
            logging.log(
              'A transaction has failed because of an inability to build the specified transaction type.'
            );
            d.error = {
              message:
                validationError ||
                'Validation failed for transaction. Please verify the properties are valid.',
            };
            reject(d);
          } else if (
            transactionWrap.validityObject &&
            Object.values(transactionWrap.validityObject).some(
              (value) => value['status'] === ValidationStatus.Invalid
            )
          ) {
            // We have a transaction that contains fields which are deemed invalid. We should reject the transaction.
            // We can use a modified popup that allows users to review the transaction and invalid fields and close the transaction.
            const invalidKeys = [];
            Object.entries(transactionWrap.validityObject).forEach(([key, value]) => {
              if (value['status'] === ValidationStatus.Invalid) {
                invalidKeys.push(`${key}`);
              }
            });
            d.error = {
              message: `Validation failed for transaction because of invalid properties [${invalidKeys.join(
                ','
              )}].`,
            };
            reject(d);
          } else {
            // Get Ledger params
            const conn = Settings.getBackendParams(
              getLedgerFromGenesisId(transactionWrap.transaction.genesisID),
              API.Algod
            );
            const sendPath = '/v2/transactions/params';
            const fetchParams: any = {
              headers: {
                ...conn.headers,
              },
              method: 'GET',
            };

            let url = conn.url;
            if (conn.port.length > 0) url += ':' + conn.port;

            Task.fetchAPI(`${url}${sendPath}`, fetchParams).then((params) => {
              calculateEstimatedFee(transactionWrap, params);

              Task.modifyTransactionWrapWithAssetCoreInfo(transactionWrap, (transactionWrap) => {
                if (transactionWrap.error) {
                  // There was an error building the asset info. Outright reject / allow with warning.
                  //reject(d);
                  //return;
                }

                d.body.params.validityObject = transactionWrap.validityObject;
                d.body.params.txn = transactionWrap.transaction;
                d.body.params.estimatedFee = transactionWrap.estimatedFee;

                const msig_txn = { msig: d.body.params.msig, txn: d.body.params.txn };
                const session = InternalMethods.getHelperSession();
                const ledger = getLedgerFromGenesisId(transactionWrap.transaction.genesisID);
                const accounts = session.wallet[ledger];
                const multisigAccounts = getSigningAccounts(accounts, msig_txn);

                if (multisigAccounts.error) {
                  d.error = multisigAccounts.error.message;
                  reject(d);
                } else {
                  if (multisigAccounts.accounts && multisigAccounts.accounts.length > 0) {
                    d.body.params.account = multisigAccounts.accounts[0]['address'];
                    d.body.params.name = multisigAccounts.accounts[0]['name'];
                  }

                  extensionBrowser.windows.create(
                    {
                      url: extensionBrowser.runtime.getURL('index.html#/sign-multisig-transaction'),
                      ...popupProperties,
                    },
                    function (w) {
                      if (w) {
                        Task.requests[d.originTabID] = {
                          window_id: w.id,
                          message: d,
                        };
                        // Send message with tx info
                        setTimeout(function () {
                          extensionBrowser.runtime.sendMessage(d);
                        }, 500);
                      }
                    }
                  );
                }
              });
            });
          }
        },
        // sign-wallet-transaction
        [JsonRpcMethod.MESESignWalletTransaction]: async (d: any, resolve: Function, reject: Function) => {
          const walletTransactions: Array<WalletTransaction> = d.body.params.transactions;
          const rawTxArray: Array<any> = [];
          const processedTxArray: Array<any> = [];
          let transactionWraps: Array<BaseValidatedTxnWrap> = [];
          const validationErrors: Array<Error> = [];
          let ledger = "";

          walletTransactions.forEach((walletTx, index) => {
            try {
              // Runtime type checking
              if (
                // prettier-ignore
                (walletTx.authAddr != null && typeof walletTx.authAddr !== 'string') ||
                (walletTx.message != null && typeof walletTx.message !== 'string') ||
                (!walletTx.txn || typeof walletTx.txn !== 'string') ||
                (walletTx.signers != null &&
                  (
                    !Array.isArray(walletTx.signers) ||
                    (Array.isArray(walletTx.signers) && (walletTx.signers as Array<any>).some((s) => typeof s !== 'string'))
                  )
                ) ||
                (walletTx.msig && typeof walletTx.msig !== 'object')
              ) {
                logging.log('Invalid Wallet Transaction Structure');
                throw new InvalidStructure();
              } else if (
                // prettier-ignore
                walletTx.msig && (
                  (!walletTx.msig.threshold || typeof walletTx.msig.threshold !== 'number') ||
                  (!walletTx.msig.version || typeof walletTx.msig.version !== 'number') ||
                  (
                    !walletTx.msig.addrs ||
                    !Array.isArray(walletTx.msig.addrs) ||
                    (Array.isArray(walletTx.msig.addrs) && (walletTx.msig.addrs as Array<any>).some((s) => typeof s !== 'string'))
                  )
                )
              ) {
                logging.log('Invalid Wallet Transaction Multisig Structure');
                throw new InvalidMsigStructure();
              }

              /**
               * In order to process the transaction and make it compatible with our validator, we:
               * 0) Decode from base64 to Uint8Array msgpack
               * 1) Use the 'decodeUnsignedTransaction' method of the SDK to parse the msgpack
               * 2) Use the '_getDictForDisplay' to change the format of the fields that are different from ours
               * 3) Remove empty fields to get rid of conversion issues like empty note byte arrays
               */
              const rawTx = algosdk.decodeUnsignedTransaction(base64ToByteArray(walletTx.txn));
              rawTxArray[index] = rawTx;
              const processedTx = rawTx._getDictForDisplay();
              processedTxArray[index] = processedTx;
              const wrap = getValidatedTxnWrap(processedTx, processedTx['type'], false);
              transactionWraps[index] = wrap;
              const genesisID = wrap.transaction.genesisID;
              ledger = getLedgerFromGenesisId(genesisID);

              const signers = walletTransactions[index].signers;
              const msigData = walletTransactions[index].msig;
              wrap.msigData = msigData;
              wrap.signers = signers;
              if (msigData) {
                if (signers && signers.length) {
                  signers.forEach((address) => {
                    InternalMethods.checkValidAccount(genesisID, address);
                  });
                }
                wrap.msigData = msigData;
              } else {
                if (!signers) {
                  InternalMethods.checkValidAccount(genesisID, wrap.transaction.from);
                }
              }

              return wrap;
            } catch (e) {
              validationErrors[index] = e;
            }
          });

          if (
            validationErrors.length ||
            !transactionWraps.length ||
            transactionWraps.some((w) => w === undefined)
          ) {
            // We don't have transaction wraps or we have an building error, reject the transaction.
            let errorMessage = 'There was a problem validating the transaction(s): ';
            let validationMessages = '';

            validationErrors.forEach((err, index) => {
              validationMessages =
                validationMessages +
                `\nValidation failed for transaction ${index} due to: ${err.message}`;
            });
            errorMessage +=
              (validationMessages.length && validationMessages) ||
              'Please verify the properties are valid.';
            logging.log(errorMessage);
            d.error = {
              message: errorMessage,
            };
            reject(d);
            return;
          } else if (
            transactionWraps.some(
              (tx) =>
                tx.validityObject &&
                Object.values(tx.validityObject).some(
                  (value) => value['status'] === ValidationStatus.Invalid
                )
            )
          ) {
            // We have a transaction that contains fields which are deemed invalid. We should reject the transaction.
            // We can use a modified popup that allows users to review the transaction and invalid fields and close the transaction.
            const invalidKeys = {};
            transactionWraps.forEach((tx, index) => {
              invalidKeys[index] = [];
              Object.entries(tx.validityObject).forEach(([key, value]) => {
                if (value['status'] === ValidationStatus.Invalid) {
                  invalidKeys[index].push(`${key}: ${value['info']}`);
                }
              });
              if (!invalidKeys[index].length) delete invalidKeys[index];
            });

            let errorMessage = '';

            Object.keys(invalidKeys).forEach((index) => {
              errorMessage =
                errorMessage +
                `Validation failed for transaction #${index} because of invalid properties [${invalidKeys[
                  index
                ].join(', ')}]. `;
            });

            d.error = {
              message: errorMessage,
            };
            reject(d);
            return;
          } else {
            // Group validations
            if (transactionWraps.length > 1) {
              if (
                !transactionWraps.every(
                  (wrap) => transactionWraps[0].transaction.genesisID === wrap.transaction.genesisID
                )
              ) {
                const e = new NoDifferentLedgers();
                logging.log(`Validation failed. ${e}`);
                d.error = e;
                reject(d);
                return;
              }

              const groupId = transactionWraps[0].transaction.group;
              if (!groupId) {
                const e = new MultipleTxsRequireGroup();
                logging.log(`Validation failed. ${e}`);
                d.error = e;
                reject(d);
                return;
              }

              if (!transactionWraps.every((wrap) => groupId === wrap.transaction.group)) {
                const e = new NonMatchingGroup();
                logging.log(`Validation failed. ${e}`);
                d.error = e;
                reject(d);
                return;
              }

              const recreatedGroupTxs = algosdk.assignGroupID(
                rawTxArray.slice().map((tx) => {
                  delete tx.group;
                  return tx;
                })
              );
              const recalculatedGroupID = byteArrayToBase64(recreatedGroupTxs[0].group);
              if (groupId !== recalculatedGroupID) {
                const e = new IncompleteOrDisorderedGroup();
                logging.log(`Validation failed. ${e}`);
                d.error = e;
                reject(d);
                return;
              }
            } else {
              const wrap = transactionWraps[0];
              if (
                (!wrap.msigData && wrap.signers) ||
                (wrap.msigData && wrap.signers && !wrap.signers.length)
              ) {
                const e = new InvalidSigners();
                logging.log(`Validation failed. ${e}`);
                d.error = e;
                reject(d);
                return;
              }
            }

            // Convert any Big Ints amount to String
            for (let i = 0; i < transactionWraps.length; i++) {
              let wrap = transactionWraps[i];
              await Task.modifyBigIntAmountToString(wrap)
            }

            // The Raw TX for the sender / or receiver address, see if we need to change it
            // If address need to change, then replace inside the rawTXArray
            // Encode it again, make user sign it first, then send back to backend so escrow can sign logically and send afterwards

            // DApp Manager Validates the Transactions
            // 1. Get DApp Pools
            await extensionBrowser.storage.local.get(["dapp_pools"], function (items) {

              // If no DApp Pools found, then show the popup
              if (items.dapp_pools == undefined || items.dapp_pools[ledger] == undefined) {
                showPopup()
                return;
              }

              /**
               * Check if the origin has DApp managed account
               * If the origin doesnt have managed account, then show the popup
               */
              const pool = items.dapp_pools[ledger].find((item) => {
                return item.url == d.origin
              })

              // If the origin doesnt have managed account, then show the popup
              if (pool == undefined) {
                showPopup()
                return
              }

              // DApp Manager Validates the Transactions
              InternalMethods[JsonRpcMethod.DAppManager_ValidateTransactions](
                { pool, rawTxArray },
                async function (response) {

                  console.log('JsonRpcMethod.DAppManager_ValidateTransactions', response)

                  // Indicate wether this transaction is coming from DApp accounts or Regular accounts
                  d.body.params.DAppTransactions = response.isDAppAccounts

                  if (response.error == null) {

                    // No updates on the transactions
                    // To be able to stringify, convert Big Int to String
                    for (let i = 0; i < transactionWraps.length; i++) {
                      let wrap = transactionWraps[i];
                      await Task.modifyBigIntAmountToString(wrap)
                    }

                    showPopup()
                    return
                  } else {

                    /**
                     * There're some updates on the transactions
                     * 1. Update the Transaction Wraps (used for the siging page UI)
                     * 2. Update the d.body.params.transactions (used for signing login in JsonRpcMethod.SignAllowWalletTx)
                     */
                    //1. Update the Transaction Wraps (used for the siging page UI)
                    let newTransactionWraps = []
                    response.txs.forEach((updatedTx, index) => {
                      const processed = updatedTx._getDictForDisplay();
                      const newWrap = getValidatedTxnWrap(processed, processed['type'], false);
                      newTransactionWraps[index] = newWrap;

                      // Check if the transaction needs to be signed
                      newWrap.signers = walletTransactions[index].signers;
                    })

                    // Handle if the amount is bigint, then convert to string
                    // To be able to stringify
                    for (let i = 0; i < newTransactionWraps.length; i++) {
                      let wrap = newTransactionWraps[i];
                      await Task.modifyBigIntAmountToString(wrap)
                    }

                    transactionWraps = newTransactionWraps

                    d.body.params.transactionsUpdated = true

                    // 2. Update the d.body.params.transactions (used for signing login in JsonRpcMethod.SignAllowWalletTx)
                    d.body.params.transactions.forEach((oldTx, index) => {
                      d.body.params.transactions[index].txn = response.encoded[index]

                      if (walletTransactions[index].signers == undefined) {
                        d.body.params.transactions[index].signed = true // Will be signed by users
                      } else {
                        d.body.params.transactions[index].signed = false // Backend need to sign it
                      }
                    })

                    d.body.params.transactionParameters = { pool_id: response.pool_id }
                    showPopup();

                  }
                })

            })

            const showPopup: any = async () => {
              d.body.params.transactionWraps = transactionWraps;
              extensionBrowser.windows.create(
                {
                  url: extensionBrowser.runtime.getURL('index.html#/sign-v2-transaction'),
                  ...popupProperties,
                  height: 625,
                },
                function (w) {
                  if (w) {
                    Task.requests[d.originTabID] = {
                      window_id: w.id,
                      message: d,
                    };
                    // Send message with tx info
                    setTimeout(function () {
                      extensionBrowser.runtime.sendMessage(d);
                    }, 500);
                  }
                }
              );
            }

          }
        },
        // algod
        [JsonRpcMethod.MESESendTransaction]: (d: any, resolve: Function, reject: Function) => {
          const { params } = d.body;
          const conn = Settings.getBackendParams(params.ledger, API.Algod);
          const sendPath = '/v2/transactions';
          const fetchParams: any = {
            headers: {
              ...conn.headers,
              'Content-Type': 'application/x-binary',
            },
            method: 'POST',
          };
          const tx = atob(params.tx)
            .split('')
            .map((x) => x.charCodeAt(0));
          fetchParams.body = new Uint8Array(tx);

          let url = conn.url;
          if (conn.port.length > 0) url += ':' + conn.port;

          Task.fetchAPI(`${url}${sendPath}`, fetchParams)
            .then((response) => {
              d.response = response;
              resolve(d);
            })
            .catch((error) => {
              d.error = error;
              reject(d);
            });
        },
        // algod
        [JsonRpcMethod.MESEAlgod]: (d: any, resolve: Function, reject: Function) => {
          const { params } = d.body;
          const conn = Settings.getBackendParams(params.ledger, API.Algod);

          const contentType = params.contentType ? params.contentType : '';

          const fetchParams: any = {
            headers: {
              ...conn.headers,
              'Content-Type': contentType,
            },
            method: params.method || 'GET',
          };
          if (params.body) fetchParams.body = params.body;

          let url = conn.url;
          if (conn.port.length > 0) url += ':' + conn.port;

          Task.fetchAPI(`${url}${params.path}`, fetchParams)
            .then((response) => {
              d.response = response;
              resolve(d);
            })
            .catch((error) => {
              d.error = error;
              reject(d);
            });
        },
        // Indexer
        [JsonRpcMethod.MESEIndexer]: (d: any, resolve: Function, reject: Function) => {
          const { params } = d.body;
          const conn = Settings.getBackendParams(params.ledger, API.Indexer);

          const contentType = params.contentType ? params.contentType : '';

          const fetchParams: any = {
            headers: {
              ...conn.headers,
              'Content-Type': contentType,
            },
            method: params.method || 'GET',
          };
          if (params.body) fetchParams.body = params.body;

          let url = conn.url;
          if (conn.port.length > 0) url += ':' + conn.port;

          Task.fetchAPI(`${url}${params.path}`, fetchParams)
            .then((response) => {
              d.response = response;
              resolve(d);
            })
            .catch((error) => {
              d.error = error;
              reject(d);
            });
        },
        // Create Sub Account
        [JsonRpcMethod.CreateSubAccount]: (d: any, resolve: Function, reject: Function) => {
          // If we don't have a ledger requested, respond with an error giving available ledgers
          if (!d.body.params.ledger) {
            const baseNetworks = Object.keys(Ledger);
            const injectedNetworks = Settings.getCleansedInjectedNetworks();
            d.error = {
              message: `Ledger not provided. Please use a base ledger: [${baseNetworks}] or an available custom one ${JSON.stringify(
                injectedNetworks
              )}.`,
            };
            reject(d);
            return;
          }

          const session = InternalMethods.getHelperSession();
          const accounts = session.wallet[d.body.params.ledger];
          // If we have requested a ledger but don't have it, respond with an error
          if (accounts === undefined) {
            d.error = {
              message: RequestErrors.UnsupportedLedger,
            };
            reject(d);
            return;
          }

          // If we don't have a DAPP Name requested, respond with an error
          if (!d.body.params.name) {
            d.error = {
              message: `DApp Name not provided`,
            };
            reject(d);
            return;
          }

          const ledger = d.body.params.ledger;
          const dappName = d.body.params.name;

          // Get Stored DAPP Pools from Storage
          extensionBrowser.storage.local.get(["dapp_pools"], function (items) {

            if (items.dapp_pools === undefined || items.dapp_pools[ledger] === undefined) {
              d.error = {
                message: `Selected Ledger not exists.`,
              };
              reject(d);
              return;
            }

            const accounts = items.dapp_pools[ledger];

            // Check if Dapp is exists
            let dappAccount = accounts.find((item) => {
              return item.name == dappName && item.url == d.origin
            })

            if (dappAccount === undefined) {
              d.error = {
                message: `DAPP Name or Account doesn't exists.`,
              };
              reject(d);
              return;
            }

            // Get total Sub Accounts
            const totalSubAccounts = dappAccount.sub_accounts.length;

            extensionBrowser.storage.sync.get(["tempPass"], function (items) {
              const params = {
                ledger: d.body.params.ledger,
                name: `${dappName}-${totalSubAccounts + 1}`,
                passphrase: items.tempPass,
                dappAccount: dappAccount,
                origin: d.origin,
              };

              // Create Account
              return InternalMethods[JsonRpcMethod.DAppCreateSubAccount](
                params,
                function (response) {
                  if ('error' in response) {
                    d.error = response;
                    reject(d);
                    return;
                  }

                  d.response = response;
                  resolve(d);
                  return;
                });

            });

          })
        },
        /**
         * Helper function to Transfer Asset within DApp Accounts
         */
        [JsonRpcMethod.DAppAssetTransfer]: (d: any, resolve: Function, reject: Function) => {
          // If we don't have a ledger requested, respond with an error giving available ledgers
          if (!d.body.params.ledger) {
            const baseNetworks = Object.keys(Ledger);
            const injectedNetworks = Settings.getCleansedInjectedNetworks();
            d.error = {
              message: `Ledger not provided. Please use a base ledger: [${baseNetworks}] or an available custom one ${JSON.stringify(
                injectedNetworks
              )}.`,
            };
            reject(d);
            return;
          }

          const session = InternalMethods.getHelperSession();
          const accounts = session.wallet[d.body.params.ledger];
          // If we have requested a ledger but don't have it, respond with an error
          if (accounts === undefined) {
            d.error = {
              message: RequestErrors.UnsupportedLedger,
            };
            reject(d);
            return;
          }

          // 1. First validation: Validate the transaction structure
          const assetTx: AssetTransferTransaction = d.body.params.transaction;

          if ((assetTx.to == null || typeof assetTx.to !== 'string') ||
            (assetTx.from == null || typeof assetTx.from !== 'string') ||
            (!Array.isArray(assetTx.amounts)) ||
            (!Array.isArray(assetTx.assets)) ||
            (assetTx.amounts.length != assetTx.assets.length)) {
            d.error = {
              message: 'Invalid Asset Transaction Structure',
              code: 'invalid-structure'
            };
            reject(d);
            return;
          }

          // 2. Second validation: Validate that all address (from & to) must within the DApp accounts
          extensionBrowser.storage.local.get(["dapp_pools"], function (items) {
            const pools = items.dapp_pools[d.body.params.ledger]

            // Find pool
            const pool = pools.find((poolItem) => {
              return poolItem.url == d.origin
            })

            let accounts = [assetTx.from, assetTx.to]

            // If account found from the master address, then remove from the array
            let index = accounts.indexOf(pool.master_account.address);
            if (index > -1) {
              accounts.splice(index, 1);
            }

            // If account found from the sub account address, then remove from the array
            pool.sub_accounts.forEach((subAccount) => {
              index = accounts.indexOf(subAccount.address);
              if (index > -1) {
                accounts.splice(index, 1);
              }
            })

            // In the end, accounts array should have 0 length. 
            // If not, then there are some accounts that invalid or not inside the DApp Pool Accounts
            if (accounts.length != 0) {
              d.error = {
                message: 'Accounst must be within the DApp Pool Accounts',
                code: 'invalid-account'
              };
              reject(d);
            }

            extensionBrowser.storage.sync.get(["tempPass"], function (items) {
              InternalMethods.assetTransfer(assetTx, d.body.params.ledger, pool, items.tempPass)
                .then((res) => {
                  d.response = res;
                  resolve(d);
                  return;
                })
                .catch((err) => {
                  d.response = err;
                  reject(d);
                  return;
                })
            })
          })

        },
        // Create/Generate Mnemonic used for DApp
        [JsonRpcMethod.MESECreateMnemonic]: (d: any, resolve: Function, reject: Function) => {

          // If we don't have a ledger requested, respond with an error giving available ledgers
          if (!d.body.params.ledger) {
            const baseNetworks = Object.keys(Ledger);
            const injectedNetworks = Settings.getCleansedInjectedNetworks();
            d.error = {
              message: `Ledger not provided. Please use a base ledger: [${baseNetworks}] or an available custom one ${JSON.stringify(
                injectedNetworks
              )}.`,
            };
            reject(d);
            return;
          }

          return InternalMethods[JsonRpcMethod.CreateAccount](
            {},
            function (response) {

              // Failed Creating Account
              if ('error' in response) {
                d.error = {
                  message: `Failed Getting Mnemonic Words`,
                };
                reject(d);
                return;
              }

              // Success Creating Account
              d.response = {
                mnemonic: response[0],
                address: response[1],
              };
              resolve(d);
              return;
            });

        },
        [JsonRpcMethod.AccountAssets]: (d: any, resolve: Function, reject: Function) => {

          // If we don't have a ledger requested, respond with an error giving available ledgers
          if (!d.body.params.ledger) {
            const baseNetworks = Object.keys(Ledger);
            const injectedNetworks = Settings.getCleansedInjectedNetworks();
            d.error = {
              message: `Ledger not provided. Please use a base ledger: [${baseNetworks}] or an available custom one ${JSON.stringify(
                injectedNetworks
              )}.`,
            };
            reject(d);
            return;
          }

          if (!d.body.params.address) {
            d.error = {
              message: `Address not provided.`,
            };
            reject(d);
            return;
          }

          const getAllAsset = new Promise((resolve, reject) => {
            return InternalMethods[JsonRpcMethod.GetAllAssets](
              {
                body: {
                  params: {
                    ledger: d.body.params.ledger,
                    address: d.body.params.address,
                  }
                }
              },
              function (response) {
                // Failed Creating Account
                if ('error' in response) {
                  reject(response)
                }

                /**
                 * Check managed account
                 * If the active account has 47 contracts, then create sub account
                 * If the active account has 50 contracts, then switch active account
                 */
                InternalMethods.manageAccountAutomation(d.body.params.ledger, response.activeAddress, d.origin)
                  .then((res) => {
                    resolve({ details: response, dex: res })
                  })
                  .catch((err) => {
                    reject({ details: response, dex: err })
                  })
              });
          })

          return Promise.race([getAllAsset, Task.asyncTimeout(15000)])
            .then((res) => {
              d.response = res;
              resolve(d);
              return;
            })
            .catch((err) => {
              d.error = err;
              reject(d);
              return;
            })
        },
        [JsonRpcMethod.AddNetwork]: (d: any, resolve: Function, reject: Function) => {

          if (!d.body.params.name || !d.body.params.genesisId
            || !d.body.params.symbol || !d.body.params.algodUrl
            || !d.body.params.indexerUrl || !d.body.params.baseUrl) {

            d.error = {
              message: `Some parameters aren't exist, please refer to the documentation for adding a new network`,
            };
            reject(d);
            return;
          }
          extensionBrowser.storage.sync.get(["tempPass"], function (items) {
            const params = {
              name: d.body.params.name,
              genesisId: d.body.params.genesisId,
              symbol: d.body.params.symbol,
              algodUrl: d.body.params.algodUrl,
              indexerUrl: d.body.params.indexerUrl,
              headers: d.body.params.headers,
              passphrase: items.tempPass,
              baseUrl: d.body.params.baseUrl,
            };

            return InternalMethods[JsonRpcMethod.SaveNetwork](
              {
                body: {
                  params: params
                }
              },
              function (response) {

                // Failed Creating Network
                if ('error' in response) {
                  d.error = {
                    message: response,
                  };
                  reject(d);
                  return;
                }
                d.response = {
                  ledgers: response.availableLedgers,
                };
                resolve(d);
                return;

              });
          })
        },
        [JsonRpcMethod.DAppDeleteNetwork]: (d: any, resolve: Function, reject: Function) => {

          if (!d.body.params.name) {
            d.error = {
              message: `Missing name parameter`,
            };
            reject(d);
            return;
          }
          extensionBrowser.storage.sync.get(["tempPass"], function (items) {
            const params = {
              name: d.body.params.name,
              passphrase: items.tempPass,
            };

            return InternalMethods[JsonRpcMethod.DeleteNetwork](
              {
                body: {
                  params: params
                }
              },
              function (response) {

                // Failed Deleting Network
                if ('error' in response) {
                  d.error = {
                    message: response,
                  };
                  reject(d);
                  return;
                }

                d.response = {
                  ledgers: response.availableLedgers,
                };
                resolve(d);
                return;

              });
          });
        },
        // Create Account used for DApp
        [JsonRpcMethod.MESECreateAccount]: (d: any, resolve: Function, reject: Function) => {
          // If we don't have a ledger requested, respond with an error giving available ledgers
          if (!d.body.params.ledger) {
            const baseNetworks = Object.keys(Ledger);
            const injectedNetworks = Settings.getCleansedInjectedNetworks();
            d.error = {
              message: `Ledger not provided. Please use a base ledger: [${baseNetworks}] or an available custom one ${JSON.stringify(
                injectedNetworks
              )}.`,
            };
            reject(d);
            return;
          }

          // If we don't have an account name, respond with an error
          if (!d.body.params.name) {
            d.error = {
              message: `Account Name not provided.`,
            };
            reject(d);
            return;
          }

          // If we don't have an Mnemonic, respond with an error
          if (!d.body.params.mnemonic) {
            d.error = {
              message: `Mnemonic not provided.`,
            };
            reject(d);
            return;
          }

          // If we don't have an Address, respond with an error
          if (!d.body.params.address) {
            d.error = {
              message: `Address not provided.`,
            };
            reject(d);
            return;
          }

          const session = InternalMethods.getHelperSession();
          const accounts = session.wallet[d.body.params.ledger];
          // If we have requested a ledger but don't have it, respond with an error
          if (accounts === undefined) {
            d.error = {
              message: RequestErrors.UnsupportedLedger,
            };
            reject(d);
            return;
          }

          // Get User Temp Pass from Storage
          extensionBrowser.storage.sync.get(["tempPass"], function (items) {
            const params = {
              ledger: d.body.params.ledger,
              name: d.body.params.name,
              passphrase: items.tempPass,
              address: d.body.params.address,
              mnemonic: d.body.params.mnemonic,
            };

            return InternalMethods[JsonRpcMethod.DAppSaveAccount](
              params,
              function (response) {

                // Failed Creating Account
                if ('error' in response) {
                  d.error = {
                    message: `Error Creating Account`,
                  };
                  reject(d);
                  return;
                }

                // Success Creating Account
                d.response = response;
                resolve(d);
                return;
              });
          })
        },
        /**
         * Switch MESE Account, that do these:
         * 1. Transfer all funds from ActiveMeseDex account to new sub-account.
         * 2. Set new sub-account as ActiveMeseDex account
         */
        [JsonRpcMethod.SwitchMeseAccount]: (d: any, resolve: Function, reject: Function) => {
          // If we don't have a ledger requested, respond with an error giving available ledgers
          if (!d.body.params.name) {
            d.error = {
              message: `Name not provided`,
            };
            reject(d);
            return;
          }

          // If we don't have a ledger requested, respond with an error giving available ledgers
          if (!d.body.params.ledger) {
            const baseNetworks = Object.keys(Ledger);
            const injectedNetworks = Settings.getCleansedInjectedNetworks();
            d.error = {
              message: `Ledger not provided. Please use a base ledger: [${baseNetworks}] or an available custom one ${JSON.stringify(
                injectedNetworks
              )}.`,
            };
            reject(d);
            return;
          }

          const session = InternalMethods.getHelperSession();
          const accounts = session.wallet[d.body.params.ledger];
          // If we have requested a ledger but don't have it, respond with an error
          if (accounts === undefined) {
            d.error = {
              message: RequestErrors.UnsupportedLedger,
            };
            reject(d);
            return;
          }

          return extensionBrowser.storage.sync.get(["tempPass"], function (items) {
            const params = {
              ledger: d.body.params.ledger,
              name: d.body.params.name,
              passphrase: items.tempPass,
              origin: d.origin,
            }

            InternalMethods[JsonRpcMethod.DAppSwitchMeseAccount](
              params,
              function (response) {
                d.response = response;
                resolve(d);
                return;
              })
          })
        },
        // Accounts
        /* eslint-disable-next-line no-unused-vars */
        [JsonRpcMethod.MESEAccounts]: (d: any, resolve: Function, reject: Function) => {
          const session = InternalMethods.getHelperSession();
          // If we don't have a ledger requested, respond with an error giving available ledgers
          if (!d.body.params.ledger) {
            const baseNetworks = Object.keys(Ledger);
            const injectedNetworks = Settings.getCleansedInjectedNetworks();
            d.error = {
              message: `Ledger not provided. Please use a base ledger: [${baseNetworks}] or an available custom one ${JSON.stringify(
                injectedNetworks
              )}.`,
            };
            reject(d);
            return;
          }

          const accounts = session.wallet[d.body.params.ledger];
          // If we have requested a ledger but don't have it, respond with an error
          if (accounts === undefined) {
            d.error = {
              message: RequestErrors.UnsupportedLedger,
            };
            reject(d);
            return;
          }

          const ledger = d.body.params.ledger;

          const res = [];
          for (let i = 0; i < accounts.length; i++) {
            res.push({
              address: accounts[i].address,
              name: accounts[i].name
            });
          }

          let dappAccounts: any = null
          let poolAddresses = [];

          // Remove sub-accounts for being displayed/fetched
          extensionBrowser.storage.local.get(['dapp_pools'], function (item) {
            if (item.dapp_pools === undefined || item.dapp_pools[ledger] === undefined) {
              // return
            } else {
              // Get all pool addresses (master & sub accounts)
              item.dapp_pools[ledger].forEach((masterAccount) => {

                poolAddresses.push(masterAccount.master_account.address)

                if (masterAccount.url == d.origin) {
                  dappAccounts = {
                    address: masterAccount.master_account.address,
                    name: masterAccount.master_account.name
                  }
                }

                masterAccount.sub_accounts.forEach((subAccount) => {
                  poolAddresses.push(subAccount.address)
                })
              })
            }

            /**
             * Remove any DApp/Managed accounts
             * Based on the poolAddresses we've fetched
             */
            let addresses: any = []
            if (poolAddresses.length > 0) {
              res.forEach((acc, index) => {
                if (!poolAddresses.includes(acc.address)) {
                  addresses.push(acc)
                }
              })
            } else {
              addresses = res
            }

            // Show DApp accounts based on the current origin
            if (dappAccounts) {
              addresses.push(dappAccounts)
            }
            d.response = addresses;
            resolve(d);
          });
        },
        [JsonRpcMethod.DAppAccounts]: (d: any, resolve: Function, reject: Function) => {
          const session = InternalMethods.getHelperSession();

          if (!d.body.params.ledger) {
            const baseNetworks = Object.keys(Ledger);
            const injectedNetworks = Settings.getCleansedInjectedNetworks();
            d.error = {
              message: `Ledger not provided. Please use a base ledger: [${baseNetworks}] or an available custom one ${JSON.stringify(
                injectedNetworks
              )}.`,
            };
            reject(d);
            return;
          }

          if (!d.body.params.name) {
            d.error = {
              message: `Name not provided.`,
            };
            reject(d);
            return;
          }

          const accounts = session.wallet[d.body.params.ledger];
          // If we have requested a ledger but don't have it, respond with an error
          if (accounts === undefined) {
            d.error = {
              message: RequestErrors.UnsupportedLedger,
            };
            reject(d);
            return;
          }

          extensionBrowser.storage.local.get(["dapp_pools"], function (items) {

            if (items.dapp_pools == undefined || items.dapp_pools[d.body.params.ledger] == undefined) {
              d.response = []
              resolve(d);
              return;
            }

            let dappAccounts: any = [];

            items.dapp_pools[d.body.params.ledger].forEach((masterAccount) => {
              if (masterAccount.name == d.body.params.name && masterAccount.url == d.origin) {
                dappAccounts = masterAccount
              }
            })

            // Remove mnemonic
            if (dappAccounts.master_account != undefined) {
              delete dappAccounts.master_account["mnemonic"]

              dappAccounts.sub_accounts.forEach((item, index) => {
                delete dappAccounts.sub_accounts[index].mnemonic
              })
            }

            d.response = dappAccounts
            resolve(d);
            return;
          });

        },
      },
      private: {
        // authorization-allow
        [JsonRpcMethod.MESEAuthorizationAllow]: (d) => {
          const { responseOriginTabID, dappName, managedWallet, ledger } = d.body.params;
          const auth = Task.requests[responseOriginTabID];
          const message = auth.message;

          if (managedWallet) {
            extensionBrowser.storage.sync.get(["tempPass"], function (items) {
              const params = {
                name: dappName,
                ledger: ledger,
                passphrase: items.tempPass,
                url: message.origin
              }

              // Create Master Swap Account
              InternalMethods[JsonRpcMethod.CreateMasterSwapAccount](
                params,
                function (response) {

                  let res = {};

                  extensionBrowser.windows.remove(auth.window_id);

                  // Error Occured when Creating Master Account
                  if ('error' in response) {
                    delete Task.requests[responseOriginTabID];
                    res = response;
                  } else {
                    Task.authorized_pool.push(message.origin);
                    delete Task.requests[responseOriginTabID];
                    res = { new_account: true };
                  }

                  setTimeout(() => {
                    // Response needed
                    message.response = res;
                    MessageApi.send(message);
                  }, 100);
                });
            });

          } else {
            let res = {};

            const session = InternalMethods.getHelperSession();
            const accounts = session.wallet[d.body.params.ledger];

            extensionBrowser.windows.remove(auth.window_id);

            if (accounts == undefined) {
              delete Task.requests[responseOriginTabID];
              res = { error: RequestErrors.UnsupportedLedger };
            } else {
              Task.authorized_pool.push(message.origin);
              delete Task.requests[responseOriginTabID];
              res = { new_account: false };
            }

            setTimeout(() => {
              // Response needed
              message.response = res;
              MessageApi.send(message);
            }, 100);
          }

        },
        // authorization-deny
        [JsonRpcMethod.MESEAuthorizationDeny]: (d) => {
          const { responseOriginTabID } = d.body.params;
          const auth = Task.requests[responseOriginTabID];
          const message = auth.message;

          auth.message.error = {
            message: RequestErrors.NotAuthorized,
          };
          extensionBrowser.windows.remove(auth.window_id);
          delete Task.requests[responseOriginTabID];

          setTimeout(() => {
            MessageApi.send(message);
          }, 100);
        },
      },
      extension: {
        // sign-allow
        [JsonRpcMethod.SignAllow]: (request: any, sendResponse: Function) => {
          const { passphrase, responseOriginTabID } = request.body.params;
          const auth = Task.requests[responseOriginTabID];
          const message = auth.message;

          const {
            from,
            // to,
            // fee,
            // amount,
            // firstRound,
            // lastRound,
            genesisID,
            // genesisHash,
            // note,
          } = message.body.params.transaction;

          try {
            const ledger = getLedgerFromGenesisId(genesisID);

            const context = new encryptionWrap(passphrase);
            context.unlock(async (unlockedValue: any) => {
              if ('error' in unlockedValue) {
                sendResponse(unlockedValue);
                return false;
              }

              extensionBrowser.windows.remove(auth.window_id);

              let account;

              if (unlockedValue[ledger] === undefined) {
                message.error = RequestErrors.UnsupportedLedger;
                MessageApi.send(message);
              }
              // Find address to send algos from
              for (let i = unlockedValue[ledger].length - 1; i >= 0; i--) {
                if (unlockedValue[ledger][i].address === from) {
                  account = unlockedValue[ledger][i];
                  break;
                }
              }

              const recoveredAccount = algosdk.mnemonicToSecretKey(account.mnemonic);

              const txn = { ...message.body.params.transaction };
              removeEmptyFields(txn);

              // Modify base64 encoded fields
              if ('note' in txn && txn.note !== undefined) {
                txn.note = new Uint8Array(Buffer.from(txn.note));
              }
              // Application transactions only
              if (txn && txn.type == 'appl') {
                if ('appApprovalProgram' in txn) {
                  try {
                    txn.appApprovalProgram = Uint8Array.from(
                      Buffer.from(txn.appApprovalProgram, 'base64')
                    );
                  } catch {
                    message.error =
                      'Error trying to parse appApprovalProgram into a Uint8Array value.';
                  }
                }
                if ('appClearProgram' in txn) {
                  try {
                    txn.appClearProgram = Uint8Array.from(
                      Buffer.from(txn.appClearProgram, 'base64')
                    );
                  } catch {
                    message.error =
                      'Error trying to parse appClearProgram into a Uint8Array value.';
                  }
                }
                if ('appArgs' in txn) {
                  try {
                    const tempArgs = [];
                    txn.appArgs.forEach((element) => {
                      logging.log(element);
                      tempArgs.push(Uint8Array.from(Buffer.from(element, 'base64')));
                    });
                    txn.appArgs = tempArgs;
                  } catch {
                    message.error = 'Error trying to parse appArgs into Uint8Array values.';
                  }
                }
              }

              try {
                // This step transitions a raw object into a transaction style object
                const builtTx = buildTransaction(txn);
                // We are combining the tx id get and sign into one step/object because of legacy,
                // this may not need to be the case any longer.
                const signedTxn = {
                  txID: builtTx.txID().toString(),
                  blob: builtTx.signTxn(recoveredAccount.sk),
                };
                const b64Obj = Buffer.from(signedTxn.blob).toString('base64');

                message.response = {
                  txID: signedTxn.txID,
                  blob: b64Obj,
                };
              } catch (e) {
                message.error = e.message;
              }

              // Clean class saved request
              delete Task.requests[responseOriginTabID];
              MessageApi.send(message);
            });
          } catch {
            // On error we should remove the task
            delete Task.requests[responseOriginTabID];
            return false;
          }
          return true;
        },
        // sign-allow-multisig
        [JsonRpcMethod.SignAllowMultisig]: (request: any, sendResponse: Function) => {
          const { passphrase, responseOriginTabID } = request.body.params;
          const auth = Task.requests[responseOriginTabID];
          const message = auth.message;

          // Map the full multisig transaction here
          const msig_txn = { msig: message.body.params.msig, txn: message.body.params.txn };

          try {
            // Use MainNet if specified - default to TestNet
            const ledger = getLedgerFromGenesisId(msig_txn.txn.genesisID);

            // Create an encryption wrap to get the needed signing account information
            const context = new encryptionWrap(passphrase);
            context.unlock(async (unlockedValue: any) => {
              if ('error' in unlockedValue) {
                sendResponse(unlockedValue);
                return false;
              }

              extensionBrowser.windows.remove(auth.window_id);

              // Verify this is a multisig sign occurs in the getSigningAccounts
              // This get may receive a .error in return if an appropriate account is not found
              let account;
              const multisigAccounts = getSigningAccounts(unlockedValue[ledger], msig_txn);
              if (multisigAccounts.error) {
                message.error = multisigAccounts.error.message;
              } else {
                // TODO: Currently we are grabbing the first non-signed account. This may change.
                account = multisigAccounts.accounts[0];
              }

              if (account) {
                // We can now use the found account match to get the sign key
                const recoveredAccount = algosdk.mnemonicToSecretKey(account.mnemonic);

                removeEmptyFields(msig_txn.txn);

                // Modify base64 encoded fields
                if ('note' in msig_txn.txn && msig_txn.txn.note !== undefined) {
                  msig_txn.txn.note = new Uint8Array(Buffer.from(msig_txn.txn.note));
                }
                // Application transactions only
                if (msig_txn.txn && msig_txn.txn.type == 'appl') {
                  if ('appApprovalProgram' in msig_txn.txn) {
                    try {
                      msig_txn.txn.appApprovalProgram = Uint8Array.from(
                        Buffer.from(msig_txn.txn.appApprovalProgram, 'base64')
                      );
                    } catch {
                      message.error =
                        'Error trying to parse appApprovalProgram into a Uint8Array value.';
                    }
                  }
                  if ('appClearProgram' in msig_txn.txn) {
                    try {
                      msig_txn.txn.appClearProgram = Uint8Array.from(
                        Buffer.from(msig_txn.txn.appClearProgram, 'base64')
                      );
                    } catch {
                      message.error =
                        'Error trying to parse appClearProgram into a Uint8Array value.';
                    }
                  }
                  if ('appArgs' in msig_txn.txn) {
                    try {
                      const tempArgs = [];
                      msig_txn.txn.appArgs.forEach((element) => {
                        tempArgs.push(Uint8Array.from(Buffer.from(element, 'base64')));
                      });
                      msig_txn.txn.appArgs = tempArgs;
                    } catch {
                      message.error = 'Error trying to parse appArgs into Uint8Array values.';
                    }
                  }
                }

                try {
                  // This step transitions a raw object into a transaction style object
                  const builtTx = buildTransaction(msig_txn.txn);

                  // Building preimg - This allows the pks to be passed, but still use the default multisig sign with addrs
                  const version = msig_txn.msig.v || msig_txn.msig.version;
                  const threshold = msig_txn.msig.thr || msig_txn.msig.threshold;
                  const addrs =
                    msig_txn.msig.addrs ||
                    msig_txn.msig.subsig.map((subsig) => {
                      return subsig.pk;
                    });
                  const preimg = {
                    version: version,
                    threshold: threshold,
                    addrs: addrs,
                  };

                  let signedTxn;
                  const appendEnabled = false; // TODO: This disables append functionality until blob objects are allowed and validated.
                  // Check for existing signatures. Append if there are any.
                  if (appendEnabled && msig_txn.msig.subsig.some((subsig) => subsig.s)) {
                    // TODO: This should use a sent multisig blob if provided. This is a future enhancement as validation doesn't allow it currently.
                    // It is subject to change and is built as scaffolding for future functionality.
                    const encodedBlob = message.body.params.txn;
                    const decodedBlob = Buffer.from(encodedBlob, 'base64');
                    signedTxn = algosdk.appendSignMultisigTransaction(
                      decodedBlob,
                      preimg,
                      recoveredAccount.sk
                    );
                  } else {
                    // If this is the first signature then do a normal sign
                    signedTxn = algosdk.signMultisigTransaction(
                      builtTx,
                      preimg,
                      recoveredAccount.sk
                    );
                  }

                  // Converting the blob to an encoded string for transfer back to dApp
                  const b64Obj = Buffer.from(signedTxn.blob).toString('base64');

                  message.response = {
                    txID: signedTxn.txID,
                    blob: b64Obj,
                  };
                } catch (e) {
                  message.error = e.message;
                }
              }
              // Clean class saved request
              delete Task.requests[responseOriginTabID];
              MessageApi.send(message);
            });
          } catch {
            // On error we should remove the task
            delete Task.requests[responseOriginTabID];
            return false;
          }
          return true;
        },
        // sign-allow-wallet-tx
        [JsonRpcMethod.SignAllowWalletTx]: (request: any, sendResponse: Function) => {
          const { passphrase, responseOriginTabID } = request.body.params;
          const auth = Task.requests[responseOriginTabID];
          const message = auth.message;
          const walletTransactions: Array<WalletTransaction> = message.body.params.transactions;
          const transactionsWraps: Array<BaseValidatedTxnWrap> =
            message.body.params.transactionWraps;
          const transactionObjs = walletTransactions.map((walletTx) =>
            algosdk.decodeUnsignedTransaction(base64ToByteArray(walletTx.txn))
          );

          // Handle Auth Addr
          let AuthAddr = []

          const signedTxs = [];
          const signErrors = [];

          try {
            const ledger = getLedgerFromGenesisId(transactionObjs[0].genesisID);
            const neededAccounts: Array<string> = [];
            walletTransactions.forEach((w, i) => {
              const msig = w.msig;
              const signers = w.signers;
              // If signers are provided as an empty array, it means it's a reference transaction (not to be signed)
              if (!(signers && !signers.length)) {
                // If multisig is provided, we search for the provided signers
                // Otherwise, we search for all the multisig addresses we have
                if (msig) {
                  if (signers) {
                    signers.forEach((a) => {
                      if (!neededAccounts.includes(a)) {
                        neededAccounts.push(a);
                      }
                    });
                  } else {
                    msig.addrs.forEach((a) => {
                      if (!neededAccounts.includes(a)) {
                        neededAccounts.push(a);
                      }
                    });
                  }
                } else {
                  // Check if Auth Addr is specified
                  if (w.authAddr && w.authAddr != "") {
                    AuthAddr.push({
                      from: transactionsWraps[i].transaction.from,
                      authAddr: w.authAddr
                    })
                    neededAccounts.push(w.authAddr);
                  } else {
                    neededAccounts.push(transactionsWraps[i].transaction.from);
                  }
                }
              }
            });

            const context = new encryptionWrap(passphrase);
            context.unlock(async (unlockedValue: any) => {
              if ('error' in unlockedValue) {
                sendResponse(unlockedValue);
                return false;
              }
              extensionBrowser.windows.remove(auth.window_id);

              const recoveredAccounts = [];

              if (unlockedValue[ledger] === undefined) {
                message.error = RequestErrors.UnsupportedLedger;
                MessageApi.send(message);
              }
              // Find addresses to send algos from
              // We store them using the public address as dictionary key
              for (let i = unlockedValue[ledger].length - 1; i >= 0; i--) {
                const address = unlockedValue[ledger][i].address;
                if (neededAccounts.includes(address)) {
                  recoveredAccounts[address] = algosdk.mnemonicToSecretKey(
                    unlockedValue[ledger][i].mnemonic
                  );
                }
              }

              transactionObjs.forEach((tx, index) => {
                const signers = walletTransactions[index].signers;
                // If it's a reference transaction we return null, otherwise we try sign
                if (signers && !signers.length) {
                  signedTxs[index] = null;
                } else {
                  try {
                    const txID = tx.txID().toString();
                    const wrap = transactionsWraps[index];
                    const msigData = wrap.msigData;
                    let signedBlob;

                    if (msigData) {
                      const partiallySignedBlobs = [];
                      // We use the provided signers or all of the available addresses on the Multisig metadata
                      const signingAddresses = (signers ? signers : msigData.addrs).filter(
                        (a) => recoveredAccounts[a]
                      );
                      signingAddresses.forEach((address) => {
                        if (recoveredAccounts[address]) {
                          partiallySignedBlobs.push(
                            algosdk.signMultisigTransaction(
                              tx,
                              msigData,
                              recoveredAccounts[address].sk
                            ).blob
                          );
                        }
                      });
                      if (partiallySignedBlobs.length > 1) {
                        // If there's more than one partially signed transaction, we merge the signatures by hand
                        const signatures = [];
                        partiallySignedBlobs.forEach((partial) => {
                          const decoded = algosdk.decodeSignedTransaction(partial);
                          const signed = decoded.msig.subsig.find((s) => !!s.s);
                          signatures[algosdk.encodeAddress(signed.pk)] = signed.s;
                        });
                        const mergedTx = algosdk.decodeObj(partiallySignedBlobs[0]);
                        mergedTx.msig.subsig.forEach((subsig) => {
                          if (!subsig.s) {
                            const lookupSig = signatures[algosdk.encodeAddress(subsig.pk)];
                            if (lookupSig) {
                              subsig.s = lookupSig;
                            }
                          }
                        });
                        signedBlob = algosdk.encodeObj(mergedTx);
                      } else {
                        signedBlob = partiallySignedBlobs[0];
                      }
                    } else {
                      // Check if auth-addr need to sign the TX
                      let address = wrap.transaction.from;
                      let authAddr = AuthAddr.find((item) => {
                        return item.from == address
                      });

                      if (authAddr) {
                        address = authAddr.authAddr
                      }

                      signedBlob = tx.signTxn(recoveredAccounts[address].sk);
                    }
                    const b64Obj = byteArrayToBase64(signedBlob);

                    signedTxs[index] = {
                      txID: txID,
                      blob: b64Obj,
                    };
                  } catch (e) {
                    logging.log(`Signing failed. ${e.message}`);
                    signErrors[index] = e.message;
                  }
                }
              });

              if (signErrors.length) {
                message.error = 'There was a problem signing the transaction(s): ';
                if (transactionObjs.length > 1) {
                  signErrors.forEach((error, index) => {
                    message.error += `\nOn transaction ${index}, the error was: ${error}`;
                  });
                } else {
                  message.error += signErrors[0];
                }
              } else {
                if (request.body.params.walletType == "MESE") {
                  message.response = {
                    signedTxs,
                    updatedBlobs: message.body.params.transactionsUpdated ? message.body.params.transactions : null,
                    params: message.body.params.transactionParameters
                  };
                } else if (request.body.params.walletType == "AlgoSigner") {
                  message.response = signedTxs;
                }
              }
              // Clean class saved request
              delete Task.requests[responseOriginTabID];
              MessageApi.send(message);
            });
          } catch {
            // On error we should remove the task
            delete Task.requests[responseOriginTabID];
            return false;
          }
          return true;
        },
        /* eslint-disable-next-line no-unused-vars */
        [JsonRpcMethod.SignDeny]: (request: any, sendResponse: Function) => {
          const { responseOriginTabID } = request.body.params;
          const auth = Task.requests[responseOriginTabID];
          const message = auth.message;

          auth.message.error = {
            message: RequestErrors.NotAuthorized,
          };
          extensionBrowser.windows.remove(auth.window_id);
          delete Task.requests[responseOriginTabID];

          setTimeout(() => {
            MessageApi.send(message);
          }, 100);
        },
        [JsonRpcMethod.CreateWallet]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.CreateWallet](request, sendResponse);
        },
        [JsonRpcMethod.DeleteWallet]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.DeleteWallet](request, sendResponse);
        },
        [JsonRpcMethod.CreateAccount]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.CreateAccount](request, sendResponse);
        },
        [JsonRpcMethod.Version]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.Version](request, sendResponse);
        },
        [JsonRpcMethod.AccountDetailsIndexer]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.AccountDetailsIndexer](request, sendResponse);
        },
        [JsonRpcMethod.CalculateMinimumBalance]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.CalculateMinimumBalance](request, sendResponse);
        },
        [JsonRpcMethod.CheckConnected]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.CheckConnected](request, sendResponse);
        },
        [JsonRpcMethod.GetConfig]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.GetConfig](request, sendResponse);
        },
        [JsonRpcMethod.Login]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.Login](request, sendResponse);
        },
        /* eslint-disable-next-line no-unused-vars */
        [JsonRpcMethod.Logout]: (request: any, sendResponse: Function) => {
          InternalMethods.clearSession();
          Task.clearPool();
          sendResponse(true);
        },
        [JsonRpcMethod.GetSession]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.GetSession](request, sendResponse);
        },
        [JsonRpcMethod.SaveAccount]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.SaveAccount](request, sendResponse);
        },
        [JsonRpcMethod.GetAllAssets]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.GetAllAssets](request, sendResponse);
        },
        [JsonRpcMethod.GetAssetImage]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.GetAssetImage](request, sendResponse);
        },
        [JsonRpcMethod.GetGroupedAccount]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.GetGroupedAccount](request, sendResponse);
        },
        [JsonRpcMethod.CreateMasterSwapAccount]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.CreateMasterSwapAccount](request, sendResponse);
        },
        [JsonRpcMethod.CreateMeseAccount]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.CreateMeseAccount](request, sendResponse);
        },
        [JsonRpcMethod.ImportAccount]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.ImportAccount](request, sendResponse);
        },
        [JsonRpcMethod.ImportMasterAccount]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.ImportMasterAccount](request, sendResponse);
        },
        [JsonRpcMethod.DeleteAccount]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.DeleteAccount](request, sendResponse);
        },
        [JsonRpcMethod.Transactions]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.Transactions](request, sendResponse);
        },
        [JsonRpcMethod.GetAllTransactions]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.GetAllTransactions](request, sendResponse);
        },
        [JsonRpcMethod.WalletChart]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.WalletChart](request, sendResponse);
        },
        [JsonRpcMethod.AccountDetails]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.AccountDetails](request, sendResponse);
        },
        [JsonRpcMethod.AssetDetails]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.AssetDetails](request, sendResponse);
        },
        [JsonRpcMethod.AssetsAPIList]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.AssetsAPIList](request, sendResponse);
        },
        [JsonRpcMethod.MESEAssetsAPIList]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.MESEAssetsAPIList](request, sendResponse);
        },
        [JsonRpcMethod.AssetsVerifiedList]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.AssetsVerifiedList](request, sendResponse);
        },
        [JsonRpcMethod.DAppManager_AssetTransfer]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.DAppManager_AssetTransfer](request, sendResponse);
        },
        [JsonRpcMethod.SignSendTransaction]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.SignSendTransaction](request, sendResponse);
        },
        [JsonRpcMethod.ChangeLedger]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.ChangeLedger](request, sendResponse);
        },
        [JsonRpcMethod.BuildTransactionWrap]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.BuildTransactionWrap](request, sendResponse);
        },
        [JsonRpcMethod.HandleBigInt]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.HandleBigInt](request, sendResponse);
        },
        [JsonRpcMethod.SaveNetwork]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.SaveNetwork](request, sendResponse);
        },
        [JsonRpcMethod.DeleteNetwork]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.DeleteNetwork](request, sendResponse);
        },
        [JsonRpcMethod.GetLedgers]: (request: any, sendResponse: Function) => {
          return InternalMethods[JsonRpcMethod.GetLedgers](request, sendResponse);
        },
      },
    };
  }
}
