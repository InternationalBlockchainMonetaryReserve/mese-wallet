/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';

import BackNavbar from 'components/BackNavbar';
import { route } from 'preact-router';

import { StoreContext } from 'services/StoreContext';

import { useState, useContext } from 'preact/hooks';

import search from 'assets/search.svg';
import checkmark from 'assets/checkmark.svg';

const SettingCurrency: FunctionalComponent = (props: any) => {
  const store: any = useContext(StoreContext);

  const [state, setState] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('');

  const changeCurrency = (currencyId) => {
    store.setSettingCurrency(currencyId);
    setState(!state);
  };

  const currencies: Array<any> = store.currencies.map(function (curr, index) {
    const isSelected = store.appSettings.selectedCurrency == curr.id;

    // Filter the currency based on user input
    if (filter != '' && !curr.name.toLowerCase().includes(filter.toLowerCase())) return html``;

    return html`
      <div
        class="
        cursor-pointer py-3 px-4 ${index === 0 ? 'mt-5' : ''} 
        custom-row mese-text mese-12
        currency-list ${isSelected ? 'selected' : ''}
      "
        onClick=${() => changeCurrency(curr.id)}
      >
        <div class="mr-2">
          <img class="${!isSelected ? 'invisible' : ''}" src=${checkmark} />
        </div>
        <div> ${curr.name} </div>
      </div>
    `;
  });

  return html`
    <div class="main-view" style="flex-direction: column;">
      <div>
        <${BackNavbar} url=${() => route('/setting', true)} />

        <section class="px-5">
          <h1 class="mese-text mese-14 mese-bold-900"> CURRENCIES </h1>

          <div
            class="
            columns custom-row is-multiline phrase-container 
            mt-5 mese-text mese-12 currency-input-container
          "
          >
            <div style="height: 23px; display: flex;">
              <img src=${search} class="ml-5" width="14" />
            </div>

            <div class="ml-2">
              <input
                class="input mese-text test mese-12 currency-input"
                id="enterCurrency"
                type="text"
                placeholder="Search currencies"
                value=${filter}
                onInput=${(e) => setFilter(e.target.value)}
              />
            </div>
          </div>

          ${currencies.map((column) => html`${column}`)}
        </section>
      </div>
    </div>
  `;
};

export default SettingCurrency;
