/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { JsonRpcMethod } from '@mese/common/messaging/types';

import { sendMessage } from 'services/Messaging'
import { StoreContext } from 'services/StoreContext';

import BackNavbar from 'components/BackNavbar';
import ToClipboard from 'components/ToClipboard';
import Authenticate from 'components/Authenticate';
import DownloadIcon from '../assets/download.png';
import InfoIcon from '../assets/info.png';

const ManageWallet: FunctionalComponent = (props: any) => {
  const store: any = useContext(StoreContext);
  const { matches, ledger, address } = props;
  const [askAuth, setAskAuth] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");
  const [passphrase, setPassphrase] = useState<string>("");

  const [masterAccounts, setMasterAccounts] = useState<any>([]);
  const [userAccounts, setUserAccounts] = useState<any>([]);
  const [userAccountsHTML, setUserAccountsHTML] = useState<any>([]);

  const warningMessage = "Warning! Importing these accounts separately may result in managed accounts not working as intended on MESE Wallet.";
 
  useEffect(() => {
    store.getMasterAndSubAccounts(ledger, (res: any) => {
      setMasterAccounts(res)
    })

    store.getUserAccounts(ledger, (res: any) => {
      setUserAccounts(res)
    })
  }, [ledger]);

  let meseAccounts : Array<any> = masterAccounts.map(
    function(account: any) {
      var accountDetails = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(account));
      return html
      `
        <div class="managed-accounts mese-text mese-12 mt-5">
          <div>
            <span>${account.master_account.name}</span>
            <a class="download" href="${accountDetails}" download="${account.master_account.name}.json" onClick=${(event: any) => {downloadHandler(event)}}>
              <img src=${DownloadIcon}/>
            </a>
          </div>
          <p>- ${account.url}</p>
        </div>
      `;
    }
  );

  function downloadHandler(event: any) {
    if (confirm(warningMessage)) {
      return true;
    } else {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  function updateUserAccountsHTML() {
    let accounts : Array<any> = userAccounts.map(
      function(account: any) {
        return html
        `
          <div class="other-accounts mese-text mese-12">
            <div id="${account.name}" class="collapsible" onClick=${(event: any) => {toggleCollapse(event)}}>
              <div class="signs">
                <span class="sign-plus">+</span>
                <span class="sign-minus">-</span>
              </div>
              <div class="address">
                <p>${account.address}
                  <${ToClipboard} class="copy-address" data=${account.address} text=" CPY"/>
                </p>
              </div>
            </div>
            <div class="collapsible-content mt-2 mb-5">
              <div class="mnemonic">
                <${ToClipboard} data=${account.mnemonic} text=${account.mnemonic}/>
              </div>
            </div>
          </div>
        `;
      }
    );
    setUserAccountsHTML(accounts);
  }

  function toggleCollapse(event: any) {
    var element = event.target.parentElement;
    if (!element.className.startsWith("collapsible")) {
      element = element.parentElement;
    }
    element.classList.toggle("active");
    var content = element.nextSibling
    if (content.style.maxHeight) {
      content.style.maxHeight = "";
    } else {
      content.style.maxHeight = "90px";
    }
  }

  const unlockMnemonics = (pwd: string) => {
    setLoading(true);
    setPassphrase(pwd);
    setAuthError("");
    if (userAccounts.length !== 0) {
      getMnemonic(pwd, userAccounts[0].address);
    } else {
      getMnemonic(pwd, address, true);
    }
  };

  function getMnemonic(pwd: string, addr=address, noOtherAccounts=false) {
    const params = {
      ledger: ledger,
      passphrase: pwd,
      address: addr,
      mnemonicOnly: true
    };

    sendMessage(JsonRpcMethod.SignSendTransaction, params, function(response: any) {
      if ("error" in response) {
        setLoading(false);
        switch (response.error) {
          case "Login Failed":
            setAuthError("Wrong passphrase");
            break;
          default:
            setAskAuth(false);
            break;
        }
      } else {
        if (noOtherAccounts) {
          setLoading(false);
        } else {
          setAccountMnemonic(addr, response.mnemonic);
        }
        setAskAuth(false);
      }
    });
  }

  function setAccountMnemonic(account: string, mnemonic: string) {
    let acc = userAccounts;
    acc[userAccounts.findIndex((acc: any) => acc.address === account)].mnemonic = mnemonic;
    setUserAccounts(acc);
    updateUserAccountsHTML();
  }

  useEffect(() => {
    if (!askAuth && loading && userAccounts.length !== 0) {
      userAccounts.forEach((account: any) => {
        getMnemonic(passphrase, account.address);
      });
    }
  }, [askAuth]);

  useEffect(() => {
    let loaded: Array<boolean> = [];
    if (!askAuth && loading && userAccounts.length !== 0) {
      userAccounts.forEach((account: any) => {
        if ("mnemonic" in account && account.mnemonic) {
          loaded.push(true);
        } else {
          loaded.push(false);
        }
      });
      if (loaded && !loaded.includes(false)) setLoading(false);
    }
  }, [userAccountsHTML]);

  return html
  `
    ${(askAuth || loading) && html`
    <div class="modal is-active">
      <div class="modal-background"></div>
      <div class="modal-content">
        <${Authenticate} error=${authError} loading=${loading} nextStep=${unlockMnemonics}/>
      </div>
      <button
        class="modal-close is-large"
        aria-label="close"
        onClick=${() => route("/wallet")}
      />
    </div>
    `}

    ${(!askAuth && !loading) && html`
    <div class="main-view" style="flex-direction: column;">
      <div style="">
        <${BackNavbar} url=${() => route(`/wallet`, true)} />
        <section class="mese-section">

        ${meseAccounts.length !== 0 && html`  
        <div class="ma-header mese-text">
          <h1
            class="mese-14 mese-bold-900"
            style="
            text-transform: uppercase;
            font-style: normal;
            "
          >
            Managed Accounts
          </h1>
          <div class="ma-tooltip">
            <span class="ma-tooltiptext mng-acc mese-12">As you approach Algorand opt-in limitations, a Managed Account will create sub-accounts automatically and manage them for you.</span>
            <img src=${InfoIcon}/>
          </div>
        </div>
        ${meseAccounts.map(account => html`${account}`)}
        `}

        ${userAccountsHTML.length !== 0 && html`
        <div class="ma-header mese-text">
          <h1
            class="mese-14 mese-bold-900 my-5"
            style="
            text-transform: uppercase;
            font-style: normal;
            "
          >
            Regular Accounts
          </h1>
          <div class="ma-tooltip">
            <span class="ma-tooltiptext rg-acc mese-12">These are regular accounts, not managed by MESE Wallet.</span>
            <img src=${InfoIcon}/>
          </div>
        </div>
        ${userAccountsHTML.map(account => html`${account}`)}
        `}

        </section>
      </div>
    </div>
  `}`;
};

export default ManageWallet;
