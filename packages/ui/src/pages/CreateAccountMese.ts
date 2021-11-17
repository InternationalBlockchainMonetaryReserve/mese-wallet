// import { generateAccount, secretKeyToMnemonic } from 'algosdk';
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useEffect, useContext } from 'preact/hooks';
import { route } from 'preact-router';
import { JsonRpcMethod } from '@mese/common/messaging/types';

import { sendMessage } from 'services/Messaging';

import { StoreContext } from 'services/StoreContext';

interface Account {
  address: string;
  mnemonic: string;
  name: string;
}

const CreateAccountMese: FunctionalComponent = (props: any) => {
  const { ledger, name } = props;

  const [account, setAccount] = useState<Account>({
    address: '',
    mnemonic: '',
    name: '',
  });
  const [step, setStep] = useState<number>(0);
  const [askAuth, setAskAuth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const store: any = useContext(StoreContext);

  useEffect(() => {
    sendMessage(JsonRpcMethod.CreateAccount, {}, function (response) {
      setAccount({
        mnemonic: response[0],
        address: response[1],
        name: '',
      });

      chrome.storage.sync.get(["tempPass"], function(items){
        createAccount(items.tempPass, response[0], response[1])
     });

    });
  }, []);

  const createAccount = (pwd, mnemonic, address) => {
    const params = {
      ledger: ledger,
      address: address || '',
      mnemonic: mnemonic || '',
      name: name || '',
      passphrase: pwd,
    };
    setLoading(true);
    setAuthError('');

    sendMessage(JsonRpcMethod.SaveAccount, params, function (response) {
      if ('error' in response) {
        setLoading(false);
        switch (response.error) {
          case 'Login Failed':
            setAuthError('Wrong passphrase');
            break;
          default:
            setAskAuth(false);
            alert(`There was an unkown error: ${response.error}`);
            break;
        }
      } else {
        store.updateWallet(response, () => {
          route('/wallet');
        });
      }
    });
  };

  return html`
  <div class="modal is-active">
    <div class="modal-background"></div>
    <div class="modal-content">
    </div>
    <button
      class="modal-close is-large"
      aria-label="close"
      onClick=${() => setAskAuth(false)}
    />
  </div>
`;
};

export default CreateAccountMese;
