import { render } from 'preact';
import { html } from 'htm/preact';
import { Router, Route } from 'preact-router';
import { createHashHistory } from 'history';
import 'preact/debug';
import 'preact/devtools';
import '@fortawesome/fontawesome-free/js/fontawesome';
import '@fortawesome/fontawesome-free/js/solid';
import '@fortawesome/fontawesome-free/js/regular';

import MainHeader from 'components/MainHeader';
import ConnectedHeader from 'components/ConnectedHeader';
import Authorize from 'pages/Authorize';
import Welcome from 'pages/Welcome';
import SetPassword from 'pages/SetPassword';
import SetMesePassword from 'pages/SetMesePassword';
import Login from 'pages/Login';
import SelectOption from 'pages/SelectOption';
import ImportMeseWallet from 'pages/ImportMeseWallet';
import ImportConfirmation from 'pages/ImportConfirmation';
import CreateMeseAccount from 'pages/CreateMeseAccount';
import CreateAccount from 'pages/CreateAccount';
import CreateAccountMese from 'pages/CreateAccountMese';
import ImportAccount from 'pages/ImportAccount';
import ImportMeseAccount from 'pages/ImportMeseAccount';
import ManageWallet from 'pages/ManageWallet';
import Wallet from 'pages/Wallet';
import Receive from 'pages/Receive';
import Account from 'pages/Account';
import About from 'pages/About';
import Setting from 'pages/Setting';
import SearchAsset from 'pages/SearchAsset';
import AddAssetConfirm from 'pages/AddAssetConfirm';
import SettingCurrency from 'pages/SettingCurrency';
import SendConfirm from 'pages/sendAlgo/SendConfirm';
import ConfirmSend from 'pages/sendAlgo/ConfirmSend';
import AddAsset from 'pages/AddAsset';
import SignTransaction from 'pages/SignTransaction';
import SignWalletTransaction from 'pages/SignWalletTransaction';
import SignMultisigTransaction from 'pages/SignMultisigTransaction';

import { StoreProvider } from 'services/StoreContext';

require('./styles.scss');

window.FontAwesome.config.autoReplaceSvg = 'nest';

const mountNode = document.getElementById('root');

const Root = (props) => {
  return html` ${props.children} `;
};

const App = () => {
  return html`
      <${StoreProvider}>
        <div class="main-mese" style="">
          <${Router} history=${createHashHistory()}>
            <${SignTransaction} path="/sign-transaction" />
            <${SignWalletTransaction} path="/sign-v2-transaction" />
            <${SignMultisigTransaction} path="/sign-multisig-transaction" />
            <${Authorize} path="/authorize" />
            <${Welcome} path="/" />
            <${SelectOption} path="/select-option" />
            <${ImportMeseWallet} path="/import-mese-wallet" />
            <${ImportConfirmation} path="/import-confirmation" />
            <${ImportMeseAccount} path="/:ledger/import-mese-account" />
            <${SetPassword} path="/set-password" />
            <${SetMesePassword} path="/set-mese-password" />
            <${CreateMeseAccount} path="/:ledger/create-mese-account" />
            <${About} path="/about" />
            <${Setting} path="/setting" />
            <${SettingCurrency} path="/setting-currency" />
            <${Login} path="/login/:redirect?" />
            <${SendConfirm} path="/:ledger/:address/send/confirm" />
            <${SearchAsset} path="/:ledger/:address/asset" />
            <${AddAssetConfirm} path="/:ledger/:address/:token/add-asset" />
            <${ManageWallet} path="/:ledger/:address/manage-wallet" />
            <${Root} path="/:*?">
              <${MainHeader} />
              <${ConnectedHeader} />
              
              <div class="main-router-view">
                <${Router}>
                  <${Wallet} path="/wallet" />
                  <${Receive} path="/receive/:is_master" />
                  <${CreateAccount} path="/:ledger/create-account" />
                  <${CreateAccountMese} path="/:ledger/create-account-mese/:name" />
                  <${ImportAccount} path="/:ledger/import-account" />
                  <${Account} path="/:ledger/:address" />
                  <${AddAsset} path="/:ledger/:address/add-asset" />
                  <${ConfirmSend} path="/:ledger/:address/send" />
                </${Router}>
              </div>
            </${Route}>
          </${Router}>
        </div>
      </${StoreProvider}>
    `;
};

render(html`<${App} />`, mountNode, mountNode.lastChild);
