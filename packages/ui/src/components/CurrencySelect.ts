import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { useObserver } from 'mobx-react-lite';
import { route } from 'preact-router';
import { JsonRpcMethod } from '@mese/common/messaging/types';
import { StoreContext } from 'services/StoreContext';
import { sendMessage } from 'services/Messaging';
import arrowDown from '../assets/arrow-down.svg';
const CurrencySelect: FunctionalComponent = () => {
  const store: any = useContext(StoreContext);
  const [active, setActive] = useState<boolean>(false);
  const [currency, setCurrency] = useState<any>('');
  const [selectedCurrency, setSelectedCurrency] = useState<any>('');

  useEffect(() => {
    let selectedCurr = store.currencies.find((item) => {
      return item.id == store.appSettings.selectedCurrency
    });

    if (selectedCurr == undefined) selectedCurr = store.currencies[0]

    setCurrency(selectedCurr.alias)
    setSelectedCurrency(selectedCurr.alias)

  }, [store.appSettings.selectedCurrency])

  let ddClass: string = 'dropdown is-right mr-1';
  if (active) ddClass += ' is-active';

  const flip = () => {
    setActive(!active);
  };

  const changeCurrency = (currencyId) => {
    store.setSettingCurrency(currencyId);
    flip();
  };

  return useObserver(
    () => html`
      <div class=${ddClass}>
        <div class="dropdown-trigger">
          <div
            id="selectLedger"
            class="buttonSelect currency-select"
            onClick=${flip}
            aria-haspopup="true"
            aria-controls="dropdown-menu"
          >
            <span>${currency}</span>
            <span class="icon is-small ml-2">
              <img src=${arrowDown} />
            </span>
          </div>
        </div>
        <div class="dropdown-menu currency-dropdown-menu" id="dropdown-menu" role="menu">
          <div class="dropdown-mask" onClick=${flip} />
          <div class="dropdown-content">
            ${store.currencies.map(
              (currency: any) =>
                html`
                  <a
                    onClick=${() => {changeCurrency(currency.id)}}
                    class="dropdown-item ${selectedCurrency == currency.alias ? 'currency-dropdown-selected' : ''}"
                  >
                    ${currency.alias}
                  </a>
                `
            )}
          </div>
        </div>
      </div>
    `
  );
};

export default CurrencySelect;
