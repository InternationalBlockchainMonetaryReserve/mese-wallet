import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useEffect, useContext } from 'preact/hooks';

import { JsonRpcMethod } from '@mese/common/messaging/types';
import { isFromExtension } from '@mese/common/utils';

import TxAcfg from 'components/SignTransaction/TxAcfg';
import TxPay from 'components/SignTransaction/TxPay';
import TxAlert from 'components/SignTransaction/TxAlert';
import TxKeyreg from 'components/SignTransaction/TxKeyreg';
import TxAxfer from 'components/SignTransaction/TxAxfer';
import TxAfrz from 'components/SignTransaction/TxAfrz';
import TxAppl from 'components/SignTransaction/TxAppl';
import Authenticate from 'components/Authenticate';
import { sendMessage } from 'services/Messaging';
import { StoreContext } from 'services/StoreContext';
import logotype from 'assets/mese-header-logo.svg';
import { getBaseSupportedLedgers } from '@mese/common/types/ledgers';
import MeseButton from 'components/MeseButton';
import RejectButton from 'components/RejectButton';

function deny() {
  const params = {
    responseOriginTabID: responseOriginTabID,
  };
  sendMessage(JsonRpcMethod.SignDeny, params, function () {
    // No callback
  });
}

let responseOriginTabID = 0;

const SignMultisigTransaction: FunctionalComponent = () => {
  const store: any = useContext(StoreContext);
  const [askAuth, setAskAuth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [account, setAccount] = useState<string>('');
  const [request, setRequest] = useState<any>({});
  const [ledger, setLedger] = useState<string>('');

  useEffect(() => {
    chrome.runtime.onMessage.addListener((request, sender: any) => {
      // Check if a message has already been recieved
      if (Object.keys(request).length === 0) return false;

      // Check if the message is coming from the background script
      if (
        isFromExtension(sender.origin) &&
        request.body.method == JsonRpcMethod.MESESignMultisigTransaction
      ) {
        setRequest(request);
        responseOriginTabID = request.originTabID;
      }
    });

    window.addEventListener('beforeunload', deny);
    return () => window.removeEventListener('beforeunload', deny);
  }, []);

  const sign = (pwd: string) => {
    const params = {
      passphrase: pwd,
      responseOriginTabID: responseOriginTabID,
    };
    setLoading(true);
    setAuthError('');
    window.removeEventListener('beforeunload', deny);

    sendMessage(JsonRpcMethod.SignAllowMultisig, params, function (response) {
      if ('error' in response) {
        window.addEventListener('beforeunload', deny);
        setLoading(false);
        switch (response.error) {
          case 'Login Failed':
            setAuthError('Wrong passphrase');
            break;
          default:
            setAskAuth(false);
            break;
        }
      }
    });
  };

  if (request.body) {
    const tx = request.body.params.txn;
    // Search for account
    let txLedger;
    getBaseSupportedLedgers().forEach((l) => {
      if (tx.genesisID === l['genesisId']) {
        txLedger = l['name'];
        setLedger(txLedger);
        for (let i = store[txLedger].length - 1; i >= 0; i--) {
          if (store[txLedger][i].address === tx.from) {
            setAccount(store[txLedger][i].name);
            break;
          }
        }
      }
    });

    if (request.body.params.name) {
      setAccount(request.body.params.name);
    } else {
      setAccount(request.body.params.account);
    }

    // Add on any injected ledgers
    if (txLedger === undefined) {
      let sessionLedgers;
      store.getAvailableLedgers((availableLedgers) => {
        if (!availableLedgers.error) {
          sessionLedgers = availableLedgers;
          sessionLedgers.forEach((l) => {
            if (tx.genesisID === l['genesisId']) {
              txLedger = l['name'];
            }
          });

          for (let i = store[txLedger].length - 1; i >= 0; i--) {
            if (store[txLedger][i].address === tx.from) {
              setAccount(store[txLedger][i].name);
              break;
            }
          }
          setLedger(txLedger);
        }
      });
    } else {
      setLedger(txLedger);
    }
  }

  const transactionWrap = request && request.body && request.body.params;
  return html`
    <div
      class="main-view mese-text mese-14"
      style="flex-direction: column; justify-content: space-between;"
    >
      <div class="px-4 mt-2" style="flex: 0; border-bottom: 1px solid #EFF4F7">
        <img src=${logotype} width="183" />
      </div>
      <div style="flex: 1; overflow:auto; max-height: 500px;">
        ${request.body &&
        html`
          <section class="hero">
            <div class="hero-body py-5">
              ${request.favIconUrl &&
              html` <img src=${request.favIconUrl} width="48" style="float:left" /> `}
              <h1 class="title is-size-4" style="margin-left: 58px;">
                <span class="mese-text"
                  >${request.originTitle} wants to sign a transaction for
                </span>
                <span style="color:#C9B44A"> ${ledger} </span>
              </h1>
            </div>
          </section>
          <section id="txAlerts" class="section py-0">
            ${transactionWrap.validityObject &&
            html`<${TxAlert} vo=${transactionWrap.validityObject} />`}
          </section>
          <section class="section py-0">
            ${transactionWrap.txn.type === 'pay' &&
            html`
              <${TxPay}
                tx=${transactionWrap.txn}
                vo=${transactionWrap.validityObject}
                account=${account}
                ledger=${ledger}
                fee=${transactionWrap.estimatedFee}
              />
            `}
            ${transactionWrap.txn.type === 'keyreg' &&
            html`
              <${TxKeyreg}
                tx=${transactionWrap.txn}
                vo=${transactionWrap.validityObject}
                account=${account}
                ledger=${ledger}
                fee=${transactionWrap.estimatedFee}
              />
            `}
            ${transactionWrap.txn.type === 'acfg' &&
            html`
              <${TxAcfg}
                tx=${transactionWrap.txn}
                vo=${transactionWrap.validityObject}
                dt=${transactionWrap.txDerivedTypeText}
                account=${account}
                ledger=${ledger}
                fee=${transactionWrap.estimatedFee}
              />
            `}
            ${transactionWrap.txn.type === 'axfer' &&
            html`
              <${TxAxfer}
                tx=${transactionWrap.txn}
                vo=${transactionWrap.validityObject}
                dt=${transactionWrap.txDerivedTypeText}
                account=${account}
                ledger=${ledger}
                fee=${transactionWrap.estimatedFee}
              />
            `}
            ${transactionWrap.txn.type === 'afrz' &&
            html`
              <${TxAfrz}
                tx=${transactionWrap.txn}
                vo=${transactionWrap.validityObject}
                account=${account}
                ledger=${ledger}
                fee=${transactionWrap.estimatedFee}
              />
            `}
            ${transactionWrap.txn.type === 'appl' &&
            html`
              <${TxAppl}
                tx=${transactionWrap.txn}
                vo=${transactionWrap.validityObject}
                account=${account}
                ledger=${ledger}
                fee=${transactionWrap.estimatedFee}
              />
            `}
          </section>
        `}
      </div>

      <div class="mx-5 mb-3" style="display: flex;">
        <${RejectButton} id="rejectTx" onClick=${deny} text="Reject" />
        <span class="ml-1"></span>
        <${MeseButton}
          id="approveTx"
          onClick=${() => {
            setAskAuth(true);
          }}
          text="Sign!"
        />
      </div>
    </div>

    ${askAuth &&
    html`
      <div class="modal is-active">
        <div class="auth-modal-background modal-background"></div>
        <div class="modal-content" style="padding: 0 15px;">
          <${Authenticate} error=${authError} loading=${loading} nextStep=${sign} />
        </div>
        <button
          class="modal-close is-large"
          aria-label="close"
          onClick=${() => setAskAuth(false)}
        />
      </div>
    `}
  `;
};

export default SignMultisigTransaction;
