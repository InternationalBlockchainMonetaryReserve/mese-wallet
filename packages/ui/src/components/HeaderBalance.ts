import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { StoreContext } from '../services/StoreContext';
import { JsonRpcMethod } from '../../../common/src/messaging/types';
import { sendMessage } from '../services/Messaging';
import { roundAmount } from 'services/common';
import { useObserver } from 'mobx-react-lite';

import CurrencySelect from 'components/CurrencySelect';

const HeaderBalance: FunctionalComponent = (props: any) => {
  const store: any = useContext(StoreContext);

  const [balance, setBalance] = useState<any>(-1);

  const [address, setAddress] = useState<any>('');

  const [currency, setCurrency] = useState<any>('');

  // Update when currency changes
  const [update, setUpdate] = useState<any>('');

  const { headerBalance } = props;

  useEffect(() => {
    setBalance(-1);

    if (store.getChosenAccountAddress() == null) {
      setBalance(0)
    }

    if ((store.getChosenAccountAddress() == address || address == '') && headerBalance != -1 && !update) {
      setBalance(headerBalance);
      setAddress(store.getChosenAccountAddress());
    } else {
      // Chosen Account Address Changed
      setAddress(store.getChosenAccountAddress());

      setUpdate(false)

      const params = {
        ledger: store.ledger,
        address: store.getChosenAccountAddress(),
        currency: store.getSettingCurrency()['alias'],
      };

      let assets = store.getAccountAssets(params.address, params.ledger);

      if (assets == null) {
        sendMessage(JsonRpcMethod.GetAllAssets, params, function (response) {
          store.setAccountAssets(params.address, params.ledger, response);
          setBalance((response.totalAlgo / 1e6) * response.algoPrice);
        });
      } else {
        setBalance((assets.totalAlgo / 1e6) * assets.algoPrice);
      }
    }
  }, [store.getChosenAccountAddress(), store.getHeaderPrice(), currency]);

  return useObserver(() => {
    const { selectedCurrency } = store;
    setCurrency(selectedCurrency)
    setUpdate(true) // Update when currency changes
    return html`
    <div class="custom-row table-header-container mese-text mt-4 ml-3">
      <div class=" amount-title ml-1">
        ${balance == -1 && html` <span class="loader"></span> `}
        ${balance != -1 && html` ${roundAmount(balance, 2)} `}
      </div>
      <div class="custom-row table-header-container">
        <div class="mese-10 ml-2">
          <${CurrencySelect} />
        </div>
      </div>
    </div>
  `;

  })
};

export default HeaderBalance;
