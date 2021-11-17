import { ITask } from './interfaces';

import { MessageBuilder } from '../messaging/builder';

import {
  Transaction,
  RequestErrors,
  MultisigTransaction,
  WalletTransaction,
} from '@mese/common/types';
import { JsonRpcMethod, JsonPayload } from '@mese/common/messaging/types';
import { Runtime } from '@mese/common/runtime/runtime';

// Initialise default params if no params in request
function get_params(params: JsonPayload): JsonPayload {
  if (!params) return {ledger: "MainNet"};
  return params;
}

export class Task extends Runtime implements ITask {
  private walletType: string;
  constructor(walletType: string) {
    super();
    this.walletType = walletType;
  }

  static subscriptions: { [key: string]: Function } = {};

  version(params: JsonPayload, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.MESEVersion, params as JsonPayload, error);
  }

  connect(params: JsonPayload, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    params = get_params(params);
    params.walletType = this.walletType;
    return MessageBuilder.promise(JsonRpcMethod.MESEAuthorization, params as JsonPayload, error);
  }

  disconnect(params: JsonPayload, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.Disconnect, params as JsonPayload, error);
  }

  AddNetwork(params: JsonPayload, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.AddNetwork, params as JsonPayload, error);
  }
  
  DeleteNetwork(params: JsonPayload, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.DAppDeleteNetwork, params as JsonPayload, error);
  }

  // 1. Getting Mnemonic Words & Address
  CreateMnemonic(params: JsonPayload, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.MESECreateMnemonic, params as JsonPayload, error);
  }

  // 2. Create Account
  CreateAccount(params: JsonPayload, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.MESECreateAccount, params as JsonPayload, error);
  }

  accounts(params: JsonPayload, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    params = get_params(params);
    params.walletType = this.walletType;
    return MessageBuilder.promise(JsonRpcMethod.MESEAccounts, params as JsonPayload, error);
  }

  DAppAccounts(params: JsonPayload, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.DAppAccounts, params as JsonPayload, error);
  }

  // Asset Transfer Helper, only available within the DApp accounts
  AssetTransfer(params: JsonPayload, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.DAppAssetTransfer, params as JsonPayload, error);
  }

  AccountAssets(params: JsonPayload, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.AccountAssets, params as JsonPayload, error);
  }

  sign(params: Transaction, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.MESESignTransaction, params, error);
  }

  signMultisig(
    params: MultisigTransaction,
    error: RequestErrors = RequestErrors.None
  ): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.MESESignMultisigTransaction, params, error);
  }

  send(params: Transaction, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.MESESendTransaction, params, error);
  }

  algod(params: JsonPayload, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.MESEAlgod, params, error);
  }

  indexer(params: JsonPayload, error: RequestErrors = RequestErrors.None): Promise<JsonPayload> {
    return MessageBuilder.promise(JsonRpcMethod.MESEIndexer, params, error);
  }

  subscribe(eventName: string, callback: Function) {
    Task.subscriptions[eventName] = callback;
  }

  /**
   * @param transactions array of valid wallet transaction objects
   * @returns array of signed transactions
   */
  signTxn(
    transactions: Array<WalletTransaction>,
    error: RequestErrors = RequestErrors.None
  ): Promise<JsonPayload> {
    const formatError = new Error(
      'There was a problem with the transaction(s) recieved. Please provide an array of valid transaction objects.'
    );
    if (!Array.isArray(transactions) || !transactions.length) throw formatError;
    transactions.forEach((walletTx) => {
      if (
        walletTx === null ||
        typeof walletTx !== 'object' ||
        walletTx.txn === null ||
        !walletTx.txn.length
      )
        throw formatError;
    });

    const params = {
      transactions: transactions,
      walletType: this.walletType
    };
    return MessageBuilder.promise(JsonRpcMethod.MESESignWalletTransaction, params, error);
  }
}
