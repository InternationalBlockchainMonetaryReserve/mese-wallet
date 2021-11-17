/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { route } from 'preact-router';

import { JsonRpcMethod } from '@mese/common/messaging/types';

import { sendMessage } from 'services/Messaging';

import { StoreContext } from 'services/StoreContext';

import BackNavbar from 'components/BackNavbar';
import MeseButton from 'components/MeseButton';
import ContentLogo from 'components/ContentLogo';
import SecretPhrase from 'components/SecretPhrase';
import ConfirmSecretPhrase from 'components/ConfirmSecretPhrase';
import Congratulations from 'components/Congratulations';
import ErrorText from 'components/ErrorText';

interface Account {
  address: string;
  mnemonic: string;
  name: string;
}

const CreateMeseAccount: FunctionalComponent = (props: any) => {
  const [name, setName] = useState<String>('');
  const [error, setError] = useState<String>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);

  const [account, setAccount] = useState<Account>({
    address: '',
    mnemonic: '',
    name: '',
  });

  const [mnemonic, setMnemonic] = useState<string>('');

  // Store Internal state for Confirming Secret Phrase
  const [confirmComponentInternalState, setConfirmInternalState] = useState<any>({});

  const matches = mnemonic.trim().split(/[\s\t\r\n]+/) || [];

  const store: any = useContext(StoreContext);

  const { ledger } = props;

  useEffect(()=> {

    let tempState = {
      setShuffledMnemonic: undefined,
      setTestMnemonic: undefined,
      setTestMnemonicArray: undefined
    }

     // Check Saved Internal State
     if(props.path == store.pageState.path) {
      if(store.pageState.internalState.setStep) {
          setStep(store.pageState.internalState.setStep)
        }
        if(store.pageState.internalState.setName) {
          setName(store.pageState.internalState.setName)
        }
        if(store.pageState.internalState.setAccount) {
          setAccount(store.pageState.internalState.setAccount)
        }
        if(store.pageState.internalState.setMnemonic) {
          setMnemonic(store.pageState.internalState.setMnemonic)
        }

        // Check State for Confirming Secret Phrase (if any)
        if (store.pageState.internalState.setTestMnemonicArray !== undefined) {
          
          tempState = {
            setShuffledMnemonic: store.pageState.internalState.setShuffledMnemonic.toJS(),
            setTestMnemonic: store.pageState.internalState.setTestMnemonic,
            setTestMnemonicArray: store.pageState.internalState.setTestMnemonicArray.toJS()
          }

          setConfirmInternalState(tempState)
        }
        store.clearPageState()
      }

      if (step == 2) {
      store.savePageState(props, {}, {
        setName: name,
        setError: error,
        setLoading: loading,
        setStep: step, 
        setAccount: account,
        setMnemonic: mnemonic,

        setShuffledMnemonic: confirmComponentInternalState.setShuffledMnemonic,
        setTestMnemonic: confirmComponentInternalState.setTestMnemonic,
        setTestMnemonicArray: confirmComponentInternalState.setTestMnemonicArray
      })
    }

  }, [step])


  /**
   * Save Internal state on Confirming Secret Phrase
   * Save: user selected words & randomed mnemonic
   */
  const saveConfirmInternalStateHandler = (internalState) => {
    store.savePageState(props, {}, {
      setName: name,
      setError: error,
      setLoading: loading,
      setStep: step, 
      setAccount: account,
      setMnemonic: mnemonic,

      // Confirm Secret Phrase Internal State
      setShuffledMnemonic: internalState.setShuffledMnemonic,
      setTestMnemonic: internalState.setTestMnemonic,
      setTestMnemonicArray: internalState.setTestMnemonicArray
    })
  }

  const setAccoutName = () => {
    setLoading(true);
    if (name.length < 5) {
      setError('Account Name needs to be at least 5 characters long!');
      setLoading(false);
      return false;
    }

    sendMessage(JsonRpcMethod.CreateAccount, {}, function (response) {
      setAccount({
        mnemonic: response[0],
        address: response[1],
        name: '',
      });

      nextStep();
      return true;
    });
  };

  const createAccount = () => {

    setLoading(true)
    store.clearPageState()

    chrome.storage.sync.get(["tempPass"], function (items) {
      const params = {
        ledger: ledger,
        address: account.address || '',
        mnemonic: account.mnemonic || '',
        name: name || '',
        passphrase: items.tempPass,
      };

      sendMessage(JsonRpcMethod.SaveAccount, params, function (response) {
      store.updateWallet(response, () => {
        nextStep();
      });
    });
    });

  }

  const nextStep = () => {
    setLoading(false);
    setStep(step + 1);
  };

  const prevStep = () => {
    setLoading(false);
    setStep(step - 1);
  };

  return html`
    ${step === 0 &&
    html`
      <div class="main-view" style="flex-direction: column;">
        <div style="">
          <${BackNavbar} url=${() => route(`/wallet`)} />

          <${ContentLogo} logoHeightSmall="true" />

          <section class="mese-section">
            <h1
              class="mese-text mese-14 mese-bold-900"
              style="
            text-transform: uppercase;
            font-style: normal;
          "
            >
              Create Account
            </h1>

            <p class="mese-text mese-12 mt-5">Account Name</p>
            <input
              type="text"
              class="input mese-input mese-text mese-12 mt-2"
              style=""
              id="setAccountName"
              placeholder="Enter account name here.."
              value=${name}
              onInput=${(e) => {
                setName(e.target.value);
                setError('');
              }}
            />
            <${ErrorText} text=${error} />

            <p class="mese-text mese-12 mt-5">Private Keys on Algorand</p>

            <p class="mese-text mese-12 mt-3">MESE is built on the Algorand blockchain.</p>

            <p class="mese-text mese-12 mt-3">
            On the next screen you will be presented with a 25 word mnemonic phrase. This mnemonic phrase is your private key backup. You should save this mnemonic phrase in a secure location, as this private key is the <span class="is-underlined">only way to restore an Algorand wallet!</span>
            </p>

            <p class="mese-text mese-12 mt-3">
            If you forget this wallet’s password, the wallet gets corrupted or the device is lost or broken, you WILL need this mnemonic phrase to restore your account.  If you lose it, your account and all funds will be lost forever.
            </p>

          </section>
        </div>

        <div class="mx-5 mb-3" style="margin-top: 10px;">
          <${MeseButton}
            onClick=${setAccoutName}
            disabled=${name.length === 0}
            loading=${loading}
            text="continue"
          />
        </div>
      </div>
    `}
    ${step === 1 &&
    html` <${SecretPhrase} account=${account} nextStep=${nextStep} prevStep=${prevStep} />`}
    ${step === 2 &&
    html` <${ConfirmSecretPhrase} loading=${loading} account=${account} nextStep=${createAccount} 
    prevStep=${prevStep} confirmInternalState=${saveConfirmInternalStateHandler} 
    loadedInternalState=${confirmComponentInternalState} />`}
    ${step === 3 &&
    html `<${Congratulations}  next=${() => {
      store.setChosenAccountAddress(account.address)
      route('/wallet')
      }} />`}
  `;
};

export default CreateMeseAccount;
