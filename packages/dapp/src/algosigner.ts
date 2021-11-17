import { Task } from './fn/task';
import { Router } from './fn/router';
import {
  base64ToByteArray,
  byteArrayToBase64,
  stringToByteArray,
  byteArrayToString,
} from '@mese/common/encoding';

class Wrapper {
  private static instance: Wrapper;
  private task: Task;
  private router: Router = new Router();
  public walletType: string;

  public encoding: object = {
    msgpackToBase64: byteArrayToBase64,
    base64ToMsgpack: base64ToByteArray,
    stringToByteArray,
    byteArrayToString,
  };

  public version: Function;
  public connect: Function;
  public sign: Function;
  public signMultisig: Function;
  public send: Function;
  public accounts: Function;
  public algod: Function;
  public indexer: Function;
  public subscribe: Function;
  public signTxn: Function;
  public CreateAccount: Function;
  public CreateMnemonic: Function;
  public disconnect: Function;
  public AddNetwork: Function;
  public DeleteNetwork: Function;
  public AccountAssets: Function;
  public DAppAccounts: Function;
  public AssetTransfer: Function;

  constructor(walletType: string) {
    this.walletType = walletType;
    this.task = new Task(this.walletType);

    this.version = this.task.version;
    this.connect = this.task.connect;
    this.sign = this.task.sign;
    this.signMultisig = this.task.signMultisig;
    this.send = this.task.send;
    this.accounts = this.task.accounts;
    this.algod = this.task.algod;
    this.indexer = this.task.indexer;
    this.subscribe = this.task.subscribe;
    this.signTxn = this.task.signTxn;
    this.CreateAccount = this.task.CreateAccount;
    this.CreateMnemonic = this.task.CreateMnemonic;
    this.disconnect = this.task.disconnect;
    this.AddNetwork = this.task.AddNetwork;
    this.DeleteNetwork = this.task.DeleteNetwork;
    this.AccountAssets = this.task.AccountAssets;
    this.DAppAccounts = this.task.DAppAccounts;
    this.AssetTransfer = this.task.AssetTransfer;
  }

  public static getInstance(walletType: string): Wrapper {
    if (!Wrapper.instance) {
      Wrapper.instance = new Wrapper(walletType);
    }
    return Wrapper.instance;
  }
}

export const AlgoSigner = Wrapper.getInstance('AlgoSigner');
