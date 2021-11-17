/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useEffect, useContext } from 'preact/hooks';
import { route } from 'preact-router';
import { JsonRpcMethod } from '@mese/common/messaging/types';

import { sendMessage } from 'services/Messaging'
import { StoreContext } from 'services/StoreContext';

import BackNavbar from 'components/BackNavbar';
import ErrorText from 'components/ErrorText';
import ContentLogo from 'components/ContentLogo';
import MeseButton from 'components/MeseButton';

const ImportMeseAccount: FunctionalComponent = (props: any) => {
  const [name, setName] = useState<String>('');
  const [error, setError] = useState<String>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [fileSelected, setFileSelected] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<any>("");
  const [pwd, setPwd] = useState<String>('');
  const [overwrite, setOverwrite] = useState<boolean>(false);

  const [mnemonic, setMnemonic] = useState<string>('');
  const matches = mnemonic.trim().split(/[\s\t\r\n]+/) || [];

  const store: any = useContext(StoreContext);

  const { ledger } = props;

  const warningMessage = 'WARNING! A duplicate account exists. Please ensure your account is backed up before overwriting.\nBy clicking "OK", you acknowledge that you have backed up your account and you will be overwriting the existing account with the imported file.';

  const importAccount = () => {
    setLoading(true);
    if (name.length < 5) {
      setError('Account Name needs to be at least 5 characters long!');
      setLoading(false);
      return false;
    }

    chrome.storage.sync.get(['tempPass'], function (items) {
      const params = {
        passphrase: items.tempPass,
        mnemonic: matches.join(' '),
        name: name,
        ledger: ledger,
      };

      sendMessage(JsonRpcMethod.ImportAccount, params, function (response) {
        setLoading(false);

        if ('error' in response) {
          switch (response.error) {
            case 'Login Failed':
              setError('Wrong passphrase');
              break;
            default:
              setError(response.error);
              break;
          }
        } else {
          store.updateWallet(response, () => {
            const lastItem = response[ledger].pop()
            store.setChosenAccountAddress(lastItem.address)
            route('/wallet');
          });
        }
      });
    });
  };

  const handleInput = (e: any) => {
    setMnemonic(e.target.value);
  };

  const handleFileChange = (event: any) => {
    setLoading(true);
    setError('')

    const fileReader = new FileReader();
    fileReader.onload = handleUpload;
    try {
      fileReader.readAsText(event.target.files[0]);
    } catch {}
    setFileSelected(true);

    var input = <HTMLInputElement>document.getElementById("upload-input");
    if (input) input.style.zIndex = "-1";
    var label = <HTMLElement>document.getElementById("upload-label");
    if (label) {
      try {
        label.innerHTML = event.target.files[0].name;
      } catch {}
      label.style.top = "62%";
    }
    var button = <HTMLElement>document.getElementById("upload-button");
    if (button) button.style.display = "initial";

    setLoading(false);
	};

  const handleCancelUpload = (event: any) => {
    event.preventDefault();

    var input = <HTMLInputElement>document.getElementById("upload-input");
    input.value = ''
    setError('')
    setFileSelected(false);
    setSelectedFile(null);

    var input = <HTMLInputElement>document.getElementById("upload-input");
    if (input) input.style.zIndex = "1";
    var label = <HTMLElement>document.getElementById("upload-label");
    if (label) {
      label.innerHTML = "Drag file here or click to upload";
      label.style.top = "63%";
    }
    var button = <HTMLElement>document.getElementById("upload-button");
    if (button) button.style.display = "none";
	};

  const handleUpload = (event: any) => {
    if (!loading) {
      try{
        let json = JSON.parse(event.target.result);
        setSelectedFile(json);
      }catch(e) {
        setFileSelected(false);
        setSelectedFile(null);
        var input = <HTMLInputElement>document.getElementById("upload-input");
        input.value = ''
        setError('Invalid JSON Format')
      }
    }
	};

  function storeAccount(params: any) {
    sendMessage(JsonRpcMethod.ImportMasterAccount, params, function(response: any) {
      if ("error" in response) {
        setLoading(false);
        var input = <HTMLInputElement>document.getElementById("upload-input");
        input.value = ''
        setError('')
        setFileSelected(false);
        setSelectedFile(null);

        switch (response.error) {
          case "Login Failed":
            setError("Wrong passphrase");
            break;
          case "Duplicate account exists":
            setLoading(true);
            if (confirm(warningMessage)) {
              setOverwrite(true);
            } else {
              setLoading(false);
              setError(response.error);
            }
            break;
          default:
            setError(response.error);
            break;
        }
      } else {
        setLoading(false);
        store.updateWallet(response, () => {
          store.setChosenAccountAddress(selectedFile.master_account.address);
          route('/wallet');
        });
      }
    });
  }

  const handleImportManagedAccount = () => {
    if (!loading) {
      setLoading(true);
      chrome.storage.sync.get(['tempPass'], function (items) {
        const params = {
          name: selectedFile.name,
          ledger: ledger,
          passphrase: items.tempPass,
          url: selectedFile.url,
          master_account: selectedFile.master_account,
          sub_accounts: selectedFile.sub_accounts,
          overwrite: false
        };
        setPwd(params.passphrase);
        storeAccount(params);
      });
    }
	};

  useEffect(() => {
    if (selectedFile && selectedFile.length !== 0 && overwrite) {
      const params = {
        name: selectedFile.name,
        ledger: ledger,
        passphrase: pwd,
        url: selectedFile.url,
        master_account: selectedFile.master_account,
        sub_accounts: selectedFile.sub_accounts,
        overwrite: true
      };
      storeAccount(params);
    }
  }, [overwrite]);

  return html`
    <div class="main-view" style="flex-direction: column;">
      <div style="">
        <${BackNavbar} url=${() => route(`/wallet`)} />
        <section class="has-text-centered" style="background-size: cover;">
        <${ContentLogo} logoHeightSmall="true" />
        </section>

        <section class="section pb-0 pt-0">
          <h1
            class="mese-text mese-14 mese-bold-900 mb-3"
            style="
            text-transform: uppercase;
            font-style: normal;
            text-align: center;
          "
          >
            Import Account
          </h1>

          <div class="home">
            <div class="custom-row tab-header mese-text mese-11">
              <div class="column tab-header-text ${selectedTab == 0 ? 'chosen' : ''}" onClick=${()=>{setSelectedTab(0)}}>
                Managed
              </div>
              <div class="column tab-header-text tab-header-center ${selectedTab == 1 ? 'chosen' : ''}" onClick=${()=> {setSelectedTab(1)}}>
                Regular
              </div>
            </div>
          </div>

          <div>
            ${selectedTab === 0 && html`
            <div class="mt-5">
              <div id="upload">
                <form>
                  <input
                    id="upload-input"
                    type="file"
                    name="file"
                    accept=".json"
                    onChange=${handleFileChange}>
                    disabled="${loading}"
                  </input>
                  <div id="upload-note">
                    <p>[ Import your managed account here ]</p>
                  </div>
                  <div id="upload-label-button">
                    <label id="upload-label">Drag file here or click to upload</label>
                    <div>
                      <button id="upload-button" onClick=${(event: any)=>{handleCancelUpload(event)}}>Cancel</button>
                    </div>
                  </div>
                  <div id="upload-note2">
                    <p>Your managed account and its sub-accounts can be backed up using the manage wallet option</p>
                  </div>
                </form>
              </div>

              <${ErrorText} text=${error}/>

              <div class="mt-5">
                <${MeseButton}
                  onClick=${handleImportManagedAccount}
                  disabled=${!fileSelected || loading}
                  loading=${loading}
                  text="import"/>
              </div>
            </div>`}

            ${selectedTab === 1 && html`
            <div>
              <p class="mese-text mese-12" style="margin-top: 12px;">Account Name</p>
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

              <p class="mese-text mese-12 mt-5">
                Insert the 25 word mnemonic of the account you want to import
              </p>
              <textarea
                class="textarea seed mt-2 mese-text mese-12"
                style=""
                rows="2"
                onInput=${handleInput}
                value=${mnemonic}>
              </textarea>

              <${ErrorText} text=${error}/>

              <div class="mt-5">
                <${MeseButton}
                  onClick=${importAccount}
                  disabled=${name.length === 0 || mnemonic.length === 0}
                  loading=${loading}
                  text="import"/>
              </div>
            </div>`}
          </div>

        </section>
      </div>
    </div>
  `;
};

export default ImportMeseAccount;
