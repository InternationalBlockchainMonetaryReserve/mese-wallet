/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useRef, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { JsonRpcMethod } from '@mese/common/messaging/types';

import { sendMessage } from 'services/Messaging';

import { StoreContext } from 'services/StoreContext';

import ContentLogo from 'components/ContentLogo';

import { windowPopup, disableBackGesture } from 'helpers/helpers';

const Login: FunctionalComponent = (props: any) => {
  const { redirect } = props;
  const [pwd, setPwd] = useState<String>('');
  const [loading, setLoading] = useState<Boolean>(false);
  const [error, setError] = useState<String>('');
  const inputRef = useRef<HTMLHeadingElement>(null);
  const store: any = useContext(StoreContext);

  const disabled = pwd.length === 0 || loading;

  const [windowWidth, setWindowWidth] = useState<number>(400);
  const [windowHeight, setWindowHeight] = useState<number>(400);

  const handleEnter = (e) => {
    if (e.keyCode === 13 && !disabled) {
      login();
    }
  };

  const login = () => {
    setLoading(true);
    setError('');
    const params = {
      passphrase: pwd,
    };
    sendMessage(JsonRpcMethod.Login, params, function (response) {
      if ('error' in response) {
        setLoading(false);
        setError('Wrong password!');
      } else {
        store.setAvailableLedgers(response.availableLedgers);
        store.updateWallet(response.wallet, () => {
          store.setLedger(store.defaultLedger);

          chrome.storage.local.set({ tempPass: pwd }, function () {
            // console.log('data saved')
          });

          // Get App Settings
          store.getSetting(() => {
            if (redirect.length > 0) route(`/${redirect}`);
            else route('/wallet');
          });
        });
      }
    });
  };

  useEffect(() => {

    const winSize = windowPopup()
    setWindowWidth(winSize.width );
    setWindowHeight(winSize.height);

    disableBackGesture()

    chrome.runtime.onMessage.addListener((request) => {
      if (request.body.method == JsonRpcMethod.MESEAuthorization) {
        responseOriginTabID = request.originTabID;
      }
    });

    window.addEventListener('beforeunload', deny);

    if (inputRef !== null) {
      inputRef.current?.focus();
    }

    return () => window.removeEventListener('beforeunload', deny);

  }, []);

let responseOriginTabID;

  function deny() {
    if (responseOriginTabID ) {
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
  }

  return html`
  <div style="
    display: flex;
    width: ${windowWidth}px;
    height: ${windowHeight}px;
  ">
    <div class="main-view mese-background" style="flex-direction: column;">
      <div class="px-5">
        <section class="hero has-text-centered mb-6">
          <div class="pt-6 mt-5">
            <${ContentLogo} />
          </div>

          <p
            class="mese-text mese-14 mese-bold-900 is-6 mb-0 has-text-white"
            style="text-align: start;"
          >
            WELCOME BACK!
          </p>
        </section>

        <section>
          <p class="mese-text mese-12" style="margin-top: 40px"> Password </p>
          <input
            id="enterPassword"
            class="input mese-input mese-password mt-1"
            type="password"
            value=${pwd}
            onKeyDown=${handleEnter}
            ref=${inputRef}
            onInput=${(e) => setPwd(e.target.value)}
          />

          ${error.length > 0 &&
          html`
            <span
              class="mese-text mese-9"
              style="
                  color: #D53F3F;
                "
              >${error}</span
            >
          `}
        </section>
      </div>

      <div class="mt-6 mx-5 mb-3">
        <button
          id="login"
          class="button is-fullwidth is-outlined mese-btn-outlined ${loading ? 'is-loading' : ''}"
          disabled=${disabled}
          onClick=${login}
        >
          <span class="mese-text mese-12">${loading ? '' : 'SIGN IN'}</span>
        </button>
      </div>
    </div>
    </div>
  `;
};

export default Login;
