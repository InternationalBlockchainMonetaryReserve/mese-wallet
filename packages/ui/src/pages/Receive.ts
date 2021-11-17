import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { useObserver } from 'mobx-react-lite';

import { StoreContext } from 'services/StoreContext';
import Header from 'components/Header';
import ToClipboard from 'components/ToClipboard';
import MeseButton from 'components/MeseButton';
import SelectAsset from 'components/Receive/SelectAsset';
import {JsonRpcMethod} from '../../../common/src/messaging/types';

import qrcode from 'qrcode-generator';
import { route } from 'preact-router';
import { sendMessage } from 'services/Messaging';

const Receive: FunctionalComponent = (props: any) => {
  const store: any = useContext(StoreContext);

  const { is_master } = props;

  const [activeAddress, setActiveAddress] = useState<any>('');

  useEffect(() => {
    store.savePageState(props)

    const params = {
      ledger: store.ledger,
      address: store.getChosenAccountAddress()
    }
    
    sendMessage(JsonRpcMethod.GetGroupedAccount, params, function (response) {
      if (response !==  null) {
        setActiveAddress(response.active_address || store.getChosenAccountAddress())
        setAddress(response.active_address || store.getChosenAccountAddress())
      }
    })
  }, [])

  const [address, setAddress] = useState<string>('');

  const typeNumber: TypeNumber = 4;
  const errorCorrectionLevel: ErrorCorrectionLevel = 'L';
  const qr = qrcode(typeNumber, errorCorrectionLevel);
  qr.addData(address || store.getChosenAccountAddress());
  qr.make();
  let qrImg = qr.createDataURL(10, 1);

  useEffect(() => {
    setAddress(store.getChosenAccountAddress())
  }, [store.getChosenAccountAddress()])

  const changeAddressHandler = (address) => {
    if (address == null) {
      setAddress(activeAddress || store.getChosenAccountAddress())
    } else {
      setAddress(address)
    }
  }

  return useObserver(() => {
    const { ledger } = store;
    return html`
    <${Header} hideBalance="true" hideAddress=${is_master === 'true'} />
    
    <div class="p-4 receive">
      <div class="mese-text mese-16 receive-title">
        RECEIVE ASSETS/FUNDS ADDRESS
      </div>
      ${is_master == 'true' && html`
      <${SelectAsset} address=${store.getChosenAccountAddress()} changeAddressHandler=${changeAddressHandler} />
      `}
      <div>
        <img src="${qrImg}" id="accountQR" class="qr-image" width="152" height="152" />
      </div>
    
      <div class="mese-text mese-14 pt-6">
        Account address
      </div>
      <div class="custom-row mese-text mese-14 address-row">
        <div class="address-text">
          ${address !== '' && html`
          ${address.slice(0, 13)}...${address.slice(-13)}
          `}
        </div>
        <div class="mese-12 address-copy">
          <${ToClipboard} class="is-pulled-right mese-text mese-12 ml-1 tooltip receive" style="" data=${address}
            text="Copy" />
        </div>
      </div>
      <div class="${is_master == 'true' ? 'close-button-master' : 'close-button'}">
        <${MeseButton} onClick=${()=> { route('/wallet', true) }} text="Close"/>
      </div>
    </div>
    `;
  });
};

export default Receive;
