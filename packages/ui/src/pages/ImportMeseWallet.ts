/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext } from 'preact/hooks';
import { route } from 'preact-router';

import TermOfUse from 'components/TermOfUse';

import { JsonRpcMethod } from '@mese/common/messaging/types';

import { sendMessage } from 'services/Messaging';

import { StoreContext } from 'services/StoreContext';
import ContentLogo from 'components/ContentLogo';
import MeseButton from 'components/MeseButton';

import BackNavbar from 'components/BackNavbar';

var zxcvbn = require('zxcvbn');

const ImportMeseWallet: FunctionalComponent = (props) => {
  const [pwd, setPwd] = useState<String>('');
  const [confirmPwd, setConfirmPwd] = useState<String>('');
  const [agree, setAgree] = useState<boolean>(false);
  const [error, setError] = useState<String>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [mnemonic, setMnemonic] = useState<string>('');
  const matches = mnemonic.trim().split(/[\s\t\r\n]+/) || [];

  const [term, setTerm] = useState<boolean>(false);

  const store: any = useContext(StoreContext);

  const importAccount = () => {
    if (pwd !== confirmPwd) {
      setError('Passwords do not match');
      return false;
    } else if (pwd.length < 8 || pwd.length > 64) {
      setError('Password needs to be 8-64 characters long!');
      return false;
    } else if (!agree) {
      setError('You Must Agree Terms of Use');
      return false;
    }

    const params = {
      passphrase: pwd,
      mnemonic: matches.join(' '),
      name: 'Account 1',
      ledger: store.ledger,
    };

    const meseParams = {
      name: store.defaultMeseAccountName,
      ledger: store.ledger,
      passphrase: pwd,
    };

    setLoading(true);

    // 1. Create Wallet
    sendMessage(JsonRpcMethod.CreateWallet, params, function (response) {
      if ('error' in response) {
        setError(response.error);
        setLoading(false);
      } else {
        store.updateWallet(response.wallet, () => {
          store.setLedger(response.ledger);

          chrome.storage.sync.set({ tempPass: params.passphrase }, function () {
            // 2. Import Account
            sendMessage(JsonRpcMethod.ImportAccount, params, function (response) {
              if ('error' in response) {
                setLoading(false);

                setError(response.error);
                // If Error, then revert back
                sendMessage(JsonRpcMethod.DeleteWallet, params, function (response) {
                  //
                });
              } else {
                store.updateWallet(response, () => {
                  setLoading(false);
                  store.setLedger(params.ledger);
                  route('/import-confirmation');
                });
              }
            });
          });
        });
      }
    });
  };

  const handleInput = (e) => {
    setMnemonic(e.target.value);
  };

  return html`
    ${term && html` <${TermOfUse} goBack=${() => setTerm(false)} /> `}
    ${term == false &&
    html`
      <div class="main-view" style="flex-direction: column;">
        <div style="">
          <${BackNavbar} url=${() => route(`/select-option`)} />
          <section class="has-text-centered" style="background-size: cover;">
            <${ContentLogo} logoHeightSmall="true" />
          </section>

          <section class="section pb-0 pt-0">
            <h1
              class="mese-text mese-14 mese-bold-900"
              style="
            text-transform: uppercase;
            font-style: normal;
          "
            >
              import an account with seed phrase
            </h1>

            <p class="mese-text mese-12" style="margin-top: 20px">
              Seed phrase (Paste from clipboard)
            </p>
            <textarea
              class="textarea seed mt-1 mese-text mese-12"
              style=""
              rows="2"
              onInput=${handleInput}
              value=${mnemonic}
            >
            </textarea>

            <p class="mese-text mese-12" style="margin-top: 20px"> New Password </p>
            <input
              class="input mese-input mese-password mt-1"
              style=""
              id="setPassword"
              type="password"
              value=${pwd}
              onInput=${(e) => {
                setPwd(e.target.value);
                setError('');
              }}
            />

            <p class="mese-text mese-12" style="margin-top: 20px"> Re-enter password </p>
            <input
              class="input mese-input mese-password mt-1"
              style=""
              id="confirmPassword"
              type="password"
              value=${confirmPwd}
              onInput=${(e) => {
                setConfirmPwd(e.target.value);
                setError('');
              }}
            />

            ${error.length > 0 &&
            html`
              <div>
                <span
                  class="mese-text mese-9"
                  style="
                  color: #D53F3F;
                "
                  >${error}</span
                >
              </div>
            `}

            <div style="margin-top: 20px">
              <label class="container">
                <input
                  class="checkbox mt-1"
                  style="
                border-radius: 4px;
                background: #464646;
                color: white;
              "
                  id="checkbox"
                  type="checkbox"
                  value=${agree}
                  checked=${agree}
                  onInput=${(e) => {
                    setAgree(!agree);
                    setError('');
                  }}
                />
                <span class="mese-text mese-12 terms-area">
                  I have read and agree to the
                  <a
                    onClick=${() => {
                      setTerm(true);
                    }}
                  >
                    <span>Terms of Use.</span>
                  </a>
                </span>
              </label>
            </div>
          </section>
        </div>

        <div class="mx-5 mb-3 mt-3">
          <${MeseButton}
            loading=${loading}
            disabled=${pwd.length === 0 || confirmPwd.length === 0}
            onClick=${importAccount}
            text="Import Existing Account"
          />
        </div>
      </div>
    `}
  `;
};

export default ImportMeseWallet;
