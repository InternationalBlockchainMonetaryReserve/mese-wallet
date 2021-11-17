import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import QRB from '../assets/qr-code-black.svg'
import { useState, useContext, useEffect } from 'preact/hooks';
import { StoreContext } from 'services/StoreContext';
import { route } from 'preact-router';
import CustomClipboard from 'components/CustomClipboard';

interface Account {
  address: string;
  mnemonic: string;
  name: string;
}

const Header: FunctionalComponent = (props: any) => {
  const store: any = useContext(StoreContext);

  const { ledger } = store;

  const { hideBalance, hideAddress } = props;

  let account: Account = store[ledger].find(
    function (acc, index) {
      return store.getChosenAccountAddress() == acc.address;
    }
  )

  const [isMaster, setIsMaster] = useState<boolean>(false);

  useEffect(() => {
    store.isMasterAccount(store.getChosenAccountAddress(), (res) => {
      setIsMaster(res)
    })
  })

  return html`
  ${account && html`
  <div class="divFlexTitleMese px-4 mt-2">
    <h6>${account ? account.name + (hideBalance ? '' : ' Algo Balance') : 'No Account'} </h6>
    ${hideAddress !== true && html`
    <div class="flex-address cursor-pointer">
      ${account !== undefined && html`
      <div class="bg-brown p-1 pl-1 pr-1">
        ${account && isMaster == false && html`
        <${CustomClipboard} tooltipCSS="tooltip-receive-header"
          class="is-pulled-right mese-text mese-12 ml-1 tooltip receive-header" data=${account.address}
          text="${account.address.slice(0, 7)}...${account.address.slice(-5)}" />
        `}
        ${account && isMaster == true && html`
        <div onClick=${() => route(`/receive/${isMaster}`)} class="is-pulled-right mese-text mese-12 ml-1 tooltip
          receive-header">
          <span>
            ${account.address.slice(0, 7)}...${account.address.slice(-5)}
          </span>
        </div>
        `}
      </div>
      <div class="bg-brown p-1 ml-1 qr-container" onClick=${() => route(`/receive/${isMaster}`)}>
        <img src=${QRB} class="qr-black" />
      </div>
      `}
    </div>`}
  
  </div>
  `}

  `;
};

export default Header;
