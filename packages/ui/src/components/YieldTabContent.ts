import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useEffect } from 'preact/hooks';

import { StoreContext } from 'services/StoreContext';
import { sendMessage } from 'services/Messaging';
import { JsonRpcMethod } from '@mese/common/messaging/types';
import YieldSelect from 'components/YieldSelect';

const YieldTabContent: FunctionalComponent = () => {
  const store: any = useContext(StoreContext);

  const [apps, setApps] = useState<any>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [selectedOption, setSelectedOption] = useState<any>(0);
  const [options, setOptions] = useState<any>([]);

  const { ledger } = store;

  useEffect(() => {
    setLoading(true);
    setOptions(['Farms', 'Pools'])
    setApps([]);
    fetchYield();
  }, [store.getChosenAccountAddress(), selectedOption]);

  const fetchYield = async () => {
    const params = {
      ledger: ledger,
      address: store.getChosenAccountAddress(),
    };

    // TODO: Filtering/Fetching from selected option farms or pools
    sendMessage(JsonRpcMethod.AccountDetailsIndexer, params, function (response) {
      setLoading(false);

      if (response.account === undefined) {
        setApps(undefined);
        return;
      }

      if (selectedOption != 0) {
        setApps(response.account['apps-local-state']);
        return;
      }

      setApps(undefined);

    });
  };

  const selectOptionHandler = (index) => {
    setLoading(true)
    setSelectedOption(index)
  }

  const YieldTabRow = (innerProps) => {
    const { darkColor, app } = innerProps;

    return html`
      <div class="mese-text mese-12 tab-yield" style=" xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
        <div class="custom-row mese-10 tab-yield-content">
          <div>APR: 2.95%</div>
          <div>Earned</div>
        </div>
        <div class="custom-row mese-10 tab-yield-content">
          <div>${app['id']} ARCC-BTC-LP</div>
          <div>10,309 MESEX</div>
        </div>
      </div>
    `;
  };

  return html`
    <div class="px-4 pt-4">
      <div class="pb-2">
        <${YieldSelect} options=${options} selectOptionHandler=${selectOptionHandler} selectedOption=${selectedOption}
          class="tab-yield-dropdown" />
      </div>
      ${apps &&
      apps.map((app: any, index) => {
        return html`
      <${YieldTabRow} app=${app} darkColor="${index % 2 == 0 ? 'true' : 'false'}" />
      `;
      })}
      ${loading && html` <span class="loader" style="margin: auto;"></span> `}
      ${!loading &&
      apps === undefined && selectedOption === 0 &&
      html` <div class="mese-text mese-14 selectable tab-yield-no-farms" style="">
        Click <a href="https://google.com"><span class="px-1">here</span></a> to enter a farm.
      </div>`}
      ${!loading &&
      apps === undefined && selectedOption === 1 &&
      html` <div class="mese-text mese-14 selectable tab-yield-no-farms" style="">
        No Pools Found
      </div>`}
    </div>
  `;
};

export default YieldTabContent;
