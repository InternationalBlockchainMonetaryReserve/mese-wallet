import { WalletTransaction } from '../types';

export const JSONRPC_VERSION: string = '2.0';

/* eslint-disable no-unused-vars */
export enum JsonRpcMethod {
  Heartbeat = 'heartbeat',
  Authorization = 'authorization',

  // MESE DAPP
  MESEVersion = 'mese-version',
  MESEAuthorization = 'mese-authorization',
  MESEAccounts = 'mese-accounts',
  MESEAuthorizationAllow = 'mese-authorization-allow',
  MESEAuthorizationDeny = 'mese-authorization-deny',
  MESEAlgod = 'mese-algod',
  MESEIndexer = 'mese-indexer',
  MESESignWalletTransaction = 'mese-sign-wallet-transaction',
  MESESignTransaction = 'mese-sign-transaction',
  MESESendTransaction = 'mese-send-transaction',
  MESESignMultisigTransaction = 'mese-sign-multisig-transaction',
  MESECreateAccount = 'mese-create-account',
  MESECreateMnemonic = 'mese-create-mnemonic',
  DAppSaveAccount = 'dapp-save-account',
  CreateSubAccount = 'create-sub-account',
  CreateMasterSwapAccount = 'create-master-swap-account',
  ImportMasterAccount = 'import-master-account',
  SwitchMeseAccount = 'switch-mese-account',
  Disconnect = 'disconnect',
  AddNetwork = 'add-network',
  DAppDeleteNetwork = 'dapp-delete-network',
  AccountAssets = 'account-assets',
  DAppAccounts = 'dapp-accounts',
  DAppAssetTransfer = 'dapp-asset-transfer',
  
  Version = 'version',
  GetAssetImage = 'get-asset-image',
  GetGroupedAccount = 'get-grouped-account',
  DAppSwitchMeseAccount = 'dapp-switch-mese-account',
  CalculateMinimumBalance = 'calculate-minimum-balance',
  DAppCreateSubAccount = 'dapp-create-sub-account',
  AuthorizationAllow = 'authorization-allow',
  AuthorizationDeny = 'authorization-deny',
  SignAllow = 'sign-allow',
  SignAllowMultisig = 'sign-allow-multisig',
  SignAllowWalletTx = 'sign-allow-wallet-tx',
  SignDeny = 'sign-deny',
  SignTransaction = 'sign-transaction',
  SignMultisigTransaction = 'sign-multisig-transaction',
  SignWalletTransaction = 'sign-wallet-transaction',
  SendTransaction = 'send-transaction',
  Algod = 'algod',
  Indexer = 'indexer',
  Accounts = 'accounts',

  // DApp Manager
  DAppManager_ValidateTransactions = 'dapp-manager-validate-transactions',
  DAppManager_AssetTransfer = 'dapp-manager-asset-transfer',
  DAppManager_MasterAccountTransfer = 'dapp-manager-master-account-transfer',

  // UI methods
  HandleBigInt = 'handle-big-int',
  BuildTransactionWrap = 'build-transaction-wrap',
  CreateWallet = 'create-wallet',
  DeleteWallet = 'delete-wallet',
  CreateAccount = 'create-account',
  SaveAccount = 'save-account',
  ImportAccount = 'import-account',
  DeleteAccount = 'delete-account',
  GetSession = 'get-session',
  Login = 'login',
  Logout = 'logout',
  AccountDetails = 'account-details',
  Transactions = 'transactions',
  AssetDetails = 'asset-details',
  AssetsAPIList = 'assets-api-list',
  MESEAssetsAPIList = 'mese-assets-api-list',
  AssetsVerifiedList = 'assets-verified-list',
  SignSendTransaction = 'sign-send-transaction',
  ChangeLedger = 'change-ledger',
  SaveNetwork = 'save-network',
  DeleteNetwork = 'delete-network',
  GetLedgers = 'get-ledgers',
  CreateMeseAccount = 'create-mese-account',
  CheckConnected = 'check-connected',
  AccountDetailsIndexer = 'account-details-indexer',
  WalletChart = 'wallet-chart',
  GetAllAssets = 'get-all-assets',
  GetAllTransactions = 'get-all-transactions',
  GetConfig = 'get-config',
}

export type JsonPayload = {
  [key: string]: string | number | Array<WalletTransaction> | JsonPayload | undefined;
};

export type JsonRpcBody = {
  readonly jsonrpc: string;
  readonly method: JsonRpcMethod;
  readonly params: JsonPayload;
  readonly id: string;
};

export enum MessageSource {
  Extension = 'extension',
  DApp = 'mese-dapp',
  Router = 'router',
  UI = 'ui',
}
export type MessageBody = {
  readonly source: MessageSource;
  readonly body: JsonRpcBody;
};

export type JsonRpcResponse = string;

export enum SwitchManagedAccount {
  CreateAccount = 47,
  SwitchAccount = 50,
}