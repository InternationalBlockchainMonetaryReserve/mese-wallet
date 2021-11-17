import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useEffect, useState, useContext } from 'preact/hooks';
import { JsonRpcMethod } from '@mese/common/messaging/types';

import { StoreContext } from 'services/StoreContext';
import { extensionBrowser } from '@mese/common/chrome';

import logo from 'assets/mese-logo.svg';
import { windowPopup, disableBackGesture } from 'helpers/helpers';

function deny() {
  chrome.runtime.sendMessage({
    source: 'extension',
    body: {
      jsonrpc: '2.0',
      method: 'mese-authorization-deny',
      params: {
        responseOriginTabID: responseOriginTabID,
      },
    },
  });
}

let responseOriginTabID;

const Authorize: FunctionalComponent = () => {
  const store: any = useContext(StoreContext);
  const [request, setRequest] = useState<any>({});
  const [allow, setAllow] = useState<boolean>(false);

  const [exists, setExists] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);

  const [windowWidth, setWindowWidth] = useState<number>(400);
  const [windowHeight, setWindowHeight] = useState<number>(400);

  useEffect(() => {

    const winSize = windowPopup()
    setWindowWidth(winSize.width );
    setWindowHeight(winSize.height);

    chrome.runtime.onMessage.addListener((request) => {
      if (request.body.method == JsonRpcMethod.MESEAuthorization) {
        setRequest(request);
        store.saveRequest(request);
        responseOriginTabID = request.originTabID;
        checkRequest(request);
      }
    });

    // Check if the stored request is an Authorization one
    if (store.savedRequest && store.savedRequest.body.method == JsonRpcMethod.MESEAuthorization) {
      setRequest(store.savedRequest);

      checkRequest(store.savedRequest);

      store.clearSavedRequest();
    }

    window.addEventListener('beforeunload', deny);

    disableBackGesture();

    return () => window.removeEventListener('beforeunload', deny);
  }, []);

  const checkRequest = (req) => {
    // Dont show the checkbox if the origin is already saved in storage
    extensionBrowser.storage.local.get(['dapp_pools'], function (item) {
      // No storage item found
      if (
        (item.dapp_pools === undefined ||
        item.dapp_pools[req.body.params.ledger || 'MainNet'] === undefined) &&
        req.body.params.walletType == "MESE"
      ) {
        setExists(false);
        return;
      }

      const poolData = item.dapp_pools[req.body.params.ledger || 'MainNet'];

      // Check if the data origin already stored in storage
      if (poolData !== undefined && poolData.length > 0) {
        const isPoolExists = poolData.filter((item) => {
          return item.url === req.origin;
        });

        if (isPoolExists.length === 0 && req.body.params.walletType == "MESE") setExists(false);
      }
    });
  };

  const grant = () => {
    setLoading(true);
    window.removeEventListener('beforeunload', deny);
    chrome.runtime.sendMessage({
      source: 'extension',
      body: {
        jsonrpc: '2.0',
        method: 'mese-authorization-allow',
        params: {
          responseOriginTabID: responseOriginTabID,
          dappName: request.body.params.name ? request.body.params.name : '',
          managedWallet: allow,
          ledger: request.body.params.ledger || 'MainNet',
        },
      },
    });
  };

  return html`
  <div style="
    display: flex;
    width: ${windowWidth}px;
    height: ${windowHeight}px;
  ">
    <div class="main-view" style="flex-direction: column; justify-content: space-between;">
      <div class="px-4 mt-2" style="flex: 0; border-bottom: 1px solid #EFF4F7">
        <img src=${logo} width="40" />
      </div>
      <div style="flex: 1">
        <section class="hero">
          <div class="hero-body py-5 mese-text">
            ${request.favIconUrl &&
            html` <img src=${request.favIconUrl} width="48" style="float:left" /> `}
            <h1 class="title is-size-4 mese-text" style="margin-left: 58px;">
              ${request.body ? request.body.params.name : ''} requested access to your wallet
            </h1>
          </div>
        </section>

        <section class="section py-0 mese-text mese-14">
          <h3>
            This will grant ${request.body ? request.body.params.name : ''} the following
            privileges:
          </h3>
          <ul class="pl-5 mt-5" style="list-style: disc;">
            <li><b>Read</b> the list of <b>accounts</b> in this wallet per supported ledger.</li>
            <li class="mt-4">
              <b>Send you requests for transactions.</b> You will have the chance to review all
              transactions and will need to sign each with your wallet’s password.
            </li>
          </ul>

          ${exists === false &&
          html`
            <div class="mt-5">
              <label class="container">
                <input
                  class="checkbox mt-1"
                  style="border-radius: 4px; background: #464646; color: white;"
                  onInput=${() => {
                    setAllow(!allow);
                  }}
                  checked=${allow}
                  id="checkbox"
                  type="checkbox"
                />
                <span class="mese-text mese-12 terms-area">
                  Allow ${request.body ? request.body.params.name : ''} to manage wallet accounts
                </span>
              </label>
            </div>
          `}
        </section>
      </div>

      <div class="mx-5 mb-3" style="display: flex;">
        <button
          id="denyAccess"
          class="button is-link is-outlined px-6 ${loading ? 'is-loading' : ''}"
          onClick=${() => {
            deny();
          }}
        >
          Reject
        </button>
        <button
          class="button is-primary ml-3 ${loading ? 'is-loading' : ''}"
          id="grantAccess"
          style="flex: 1;"
          onClick=${() => {
            grant();
          }}
        >
          Grant access
        </button>
      </div>
    </div>
    </div>
  `;
};

export default Authorize;
