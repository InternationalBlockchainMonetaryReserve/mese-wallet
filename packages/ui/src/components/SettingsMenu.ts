import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { JsonRpcMethod } from '@mese/common/messaging/types';

import DeleteWallet from 'components/DeleteWallet';
import { sendMessage } from 'services/Messaging';
import LedgerNetworksConfiguration from './LedgerNetworksConfiguration';
import { StoreContext } from 'services/StoreContext';

import burgerMenu from 'assets/burger-menu.svg';
import SettingMenuItem from 'components/SettingMenuItem';


const SettingsMenu: FunctionalComponent = () => {
  const [active, setActive] = useState<boolean>(false);
  const [changed, setChanged] = useState<boolean>(false);
  const [currentMenu, setCurrentMenu] = useState<string>('settings');

  const store: any = useContext(StoreContext);

  const { ledger } = store;

  const [masterAccounts, setMasterAccounts] = useState<any>([]);
  const [userAccounts, setUserAccounts] = useState<any>([]);
 
  useEffect(() => {
    store.getMasterAccounts(ledger, (res) => {
      setMasterAccounts(res)
    })

    store.getUserAccounts(ledger, (res) => {
      setUserAccounts(res)
    })
  }, [ledger])

  let accounts : Array<any> = userAccounts.map(
    function(acc, index) {

      return html 
      `
        <${SettingMenuItem} 
          className=" ${store[ledger].length > (index + 1) ? 'no-border' : ''}" 
          text="${acc.name}" 
          url=${() => {
              setChosenAccount(acc.address)
              route('/wallet', true)
            }
          } 
          isMarked=${store.getChosenAccountAddress() === acc.address}
        />
      `;
    }
  )

  let meseAccounts : Array<any> = masterAccounts.map(
    function(acc, index) {
    
      let isMarked = false;
      
      if(store.getChosenAccountAddress() == '') isMarked = true

      return html 
      `
      <${SettingMenuItem} 
            className="no-border"
            text="${acc.name}" 
            url=${() => {
              setChosenAccount(acc.address)
              route('/wallet', true)
            }} 
            origin=${acc.url}
            isMarked=${store.getChosenAccountAddress() == acc.address || isMarked}
        />
      `;
    }
  )

  let menuClass: string = 'menu';
  if (active) menuClass += ' is-active';

  const flip = () => {
    setActive(!active);
  };

  const logout = () => {
    sendMessage(JsonRpcMethod.Logout, {}, function () {
      route('/login');
    });
  };

  const setChosenAccount = (address) => {
    store.setChosenAccountAddress(address)
    setChanged(!changed);
  }

  const getSubmenu = () => {
    switch (currentMenu) {
      case 'networkConfiguration':
        return html`<${LedgerNetworksConfiguration}
          closeFunction=${() => {
            setCurrentMenu('settings');
            flip();
          }}
        />`;
      case 'delete':
        return html`<${DeleteWallet} />`;
      default:
        return '';
    }
  };

  return html`
    <div class="has-text-centered" style="cursor: pointer; min-width: 24px;" onClick=${flip}>
      <span class="icon">
      <img src=${burgerMenu} class="mr-2 mt-2 ${active? 'settings-burger-blocked' : ''}" width="${active ? '32' : '25'}" />
      </span>
    </div>

    <div class="${menuClass}">
      
      <div class="main-menu mese-text no-spacing mese-12">
        ${
          currentMenu === 'settings' &&
          html`
          <a class="menu-item pt-4 cursor-default no-hover" disabled>
            Your Accounts
          </a>

          ${meseAccounts.length !== 0 && html `
            ${meseAccounts.map(column => html`${column}`)}
          `}

          ${meseAccounts.length === 0 && html `
            ${accounts.map(column => html`${column}`)}
          `}

          ${meseAccounts.length > 0 && html `
          <a class="menu-item cursor-default border-top no-hover">
            Other Accounts
          </a>

          ${accounts.map(column => html`${column}`)}
          `}
          

          <a class="menu-item no-border" onClick=${() => route('/about')}>
            About
          </a>
          <a class="menu-item  no-border" href="/${ledger}/create-mese-account">
            Create Account
          </a>
          <a class="menu-item no-border" href="/${ledger}/import-mese-account">
            Import Account
          </a>
          ${((meseAccounts.length !== 0) || (accounts.length !== 0)) && html`
          <a class="menu-item no-border" href="/${ledger}/${store.getChosenAccountAddress()}/manage-wallet">
            Manage Wallet
          </a>
          `}
          <a class="menu-item no-border pb-3" onClick=${() => {route('/setting')}}>
            Settings
          </a>
          `
        }
        ${
          currentMenu !== 'settings' &&
          html`
            <div
              class="has-text-centered"
              style="cursor: pointer; min-width: 24px; position: absolute; top: 3.5em; left: 1em;"
              onClick=${() => setCurrentMenu('settings')}
            >
              <span class="icon">
                <i class="fas fa-arrow-left" aria-hidden="true" />
              </span>
            </div>
            ${getSubmenu()}
          `
        }
      </div>
      <div class="modal-background" style="z-index: -1;" onClick=${flip} />
    </div>
  `;
};

// <a class="menu-item px-4" onClick=${logout}>
// Logout
// </a>
// <a class="menu-item px-4" id="showWalletDetails" onClick=${() => setCurrentMenu('delete')}>
// Delete Wallet
// </a>
// <a class="menu-item px-4" id="showWalletDetails" onClick=${() => setCurrentMenu('networkConfiguration')}>
// Network Configuration
// </a>

export default SettingsMenu;
