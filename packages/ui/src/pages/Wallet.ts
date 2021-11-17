import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { useObserver } from 'mobx-react-lite';
import { Link, route } from 'preact-router';
import { StoreContext } from 'services/StoreContext';
import AccountPreview from 'components/AccountPreview';
import Header from 'components/Header';
import AssetComponent from 'components/home/AssetComponent';
import Chart from 'components/WalletChart';
import ActivityTabContent from 'components/ActivityTabContent';
import YieldTabContent from 'components/YieldTabContent';
import HeaderBalance from 'components/HeaderBalance';
import CurrencySelect from 'components/CurrencySelect';
import { sendMessage } from 'services/Messaging';
import { JsonRpcMethod } from '@mese/common/messaging/types';
import arrowDown from '../assets/arrow-down.svg';
import send from '../assets/send.svg';
import receive from '../assets/receive.svg';
import { extensionBrowser } from '@mese/common/chrome';
import { roundAmount } from 'services/common';

interface Account {
  address: string;
  mnemonic: string;
  name: string;
}

const Wallet: FunctionalComponent = () => {
  const store: any = useContext(StoreContext);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const mesePrefix = `${store.defaultAccountName} - `;
  const [meseNum, setMeseNum] = useState<number>(0);

  const [selectedTab, setSelectedTab] = useState<number>(0);

  const { ledger } = store;

  const [isMaster, setIsMaster] = useState<boolean>(false);

  const [headerBalance, setHeaderBalance] = useState<any>(-1);

  useEffect(() => {
    store.clearPageState()
    store.clearCrypto()
    store[ledger].map((acc: Account) => {
      if (acc.name.includes(mesePrefix)) {
        if (meseNum < parseInt(acc.name.split('-')[1])) {
          setMeseNum(parseInt(acc.name.split('-')[1]));
        }
      }
    });

    store.isMasterAccount(store.getChosenAccountAddress(), (res) => {
      setIsMaster(res)
    })

  }, [ledger, store.getChosenAccountAddress()]);

  const sendHandler = () => {
    let address = store.getChosenAccountAddress();
    route(`/${ledger}/${address}/send`);
  }

  const receiveHandler = () => {
    route(`/receive/${isMaster}`);
  }

  const isDisabled = () => {
    return store.getChosenAccountAddress() === null
  }

  const sendReceiveButton = (innerProps) => {
    const {text, click} = innerProps
    return html`
     <button
      class="button is-fullwidth is-outlined mese-btn-outlined mese-text 
      mese-12 btn-send mx-1"
      disabled=${isDisabled()}
      onClick=${click}
    >
    <div class="custom-row">
      <span class="mese-text mese-12">${text}</span>
      
     ${text === 'Send' && html `
     <img class="ml-2" src=${send} width="18"/>
     `}
     
     ${text === 'Receive' && html `
     <img class="ml-2" src=${receive} width="18"/>
     `}
    </div>
    </button>
    `
  }

  const AssetTab = (innerProps) => {
    return html`
      <div class="p-4 mese-text mese-12"><${AssetComponent}ledger=${ledger} setHeaderPrice=${setHeaderBalance}/></div>
    `
  }

  // Creating MESE Account
  const createMESEAccount = () => {
    sendMessage(JsonRpcMethod.CreateAccount, {}, function (response) {
      chrome.storage.sync.get(['tempPass'], function (items) {
        createAccount(items.tempPass, response[0], response[1]);
      });
    });
  };

  const createAccount = (pwd, mnemonic, address) => {
    const params = {
      ledger: ledger,
      address: address || '',
      mnemonic: mnemonic || '',
      name: mesePrefix + (meseNum + 1) || '',
      passphrase: pwd,
    };

    setLoading(true);

    sendMessage(JsonRpcMethod.SaveAccount, params, function (response) {
      store.updateWallet(response, () => {
        setShowAddModal(false);
        setLoading(false);
        setMeseNum(meseNum + 1);
      });
    });
  };

  return useObserver(() => {
    const { ledger, selectedCurrency } = store;
    return html`
    <${Header} />
      <div class="main-view home" style="flex-direction: column; justify-content: space-between;">
          <${HeaderBalance} headerBalance=${headerBalance} />
      <${Chart} />
      <div class="custom-row" style="justify-content: center;">
        <div> <${sendReceiveButton} text="Send" click=${sendHandler} /></div>
        <div> <${sendReceiveButton} text="Receive" click=${receiveHandler} /></div>
      </div>
      <div class="custom-row tab-header mx-4 mese-text mese-12">
        <div class="column tab-header-text ${selectedTab == 0 ? 'chosen' : ''}"
        onClick=${()=>{
          setSelectedTab(0)
          }}>
          Assets
        </div>
        <div class="column tab-header-text tab-header-center  ${selectedTab == 1 ? 'chosen' : ''}"
        onClick=${()=> {
          setSelectedTab(1)
        }}
        >
          Activity
        </div>
        ${false && html `
        <div class="column tab-header-text ${selectedTab == 2 ? 'chosen' : ''}"
        onClick=${() => {
          if(!isDisabled()) setSelectedTab(2)
        }}>
          Yield
        </div>
        `}
      </div>
      <div>
        ${selectedTab == 0 && html`<${AssetTab} />`}
        ${selectedTab == 1 && html`<${ActivityTabContent} />`}
        ${selectedTab == 2 && html`<${YieldTabContent} />`}
      </div>
       
      </div>

      <div class=${`modal ${showAddModal ? 'is-active' : ''}`}>
        <div class="modal-background"></div>
        <div class="modal-content">
          <div class="box">
          
            <div>
              <${Link} class="button is-fullwidth" id="createAccount" onClick=${createMESEAccount} disabled=${loading}>
                New Account
              </${Link}>
            </div>

            <div style="display: none;">
              <${Link} class="button is-fullwidth mt-5" id="createAccount" href=${`/${ledger}/create-account`}>
                Create new account
              </${Link}>
            </div>

            <div style="display: none;">
              <${Link} class="button is-fullwidth mt-5" id="importAccount" href=${`/${ledger}/import-account`}>
                Import existing account
              </${Link}>
            </div>
            
          </div>
        </div>
        <button class="modal-close is-large" aria-label="close" onClick=${() =>
          setShowAddModal(false)} />
      </div>
    `;
  });
};

export default Wallet;
