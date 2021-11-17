import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { useObserver } from 'mobx-react-lite';
import { JsonRpcMethod } from '../../../../common/src/messaging/types';
import { StoreContext } from '../../services/StoreContext';
import { sendMessage } from '../../services/Messaging';
import Default from '../../assets/shape.svg';
import './style.scss';
import { assetFormat, roundAmount } from 'services/common';

const SelectAsset: FunctionalComponent = (props: any) => {
  const store: any = useContext(StoreContext);
  const [active, setActive] = useState<boolean>(false);
  const [asset, setAsset] = useState<any>([]);
  const [algo, setAlgo] = useState<any>(0);
  const [algoPrice, setAlgoPrice] = useState<any>(0);

  const { address, changeAddressHandler } = props;
  const [selectedAsset, setSelectedAsset] = useState<any>(-1);

  const [loading, setLoading] = useState<boolean>(true);

  const { ledger } = store;
  useEffect(() => {
    setLoading(true);
    fetchApi();
  }, []);

  const fetchApi = () => {
    const params = {
      ledger: ledger,
      address: address,
      currency: store.getSettingCurrency()['alias'],
    };

    sendMessage(JsonRpcMethod.GetAllAssets, params, function (response) {
      setAlgo(response.totalAlgo / 1e6);
      setAlgoPrice(response.algoPrice);
      setAsset([...response.assets]);
      setLoading(false);
    });
  };

  let ddClass: string = 'dropdown mt-3';
  if (active) ddClass += ' is-active';

  const flip = () => {
    setActive(!active);
  };

  const handleToken = (index) => {
    if (index == null) {
      setSelectedAsset(-1);
      changeAddressHandler(null);
      flip();
      return;
    } else {
      setSelectedAsset(index);
    }

    changeAddressHandler(asset[index]['owned-by']);
    flip();
  };

  const getSelectedAsset = () => {
    return asset[selectedAsset];
  };

  const brokenImageHandler = (event) => {
    event.target.src = Default;
  };

  // Helper function to convert to USD price
  const usdPrice = (res) => {
    let num: null | string = assetFormat(res.amount, res.decimals)

    if (num !== null) {
        return roundAmount(parseFloat(res['price']) * parseFloat(num), 2);
    }

    return parseFloat(res['price']);
}

  return useObserver(
    () => html`
      <div class=${ddClass}>
        ${loading
          ? html` <div class="dropdown-trigger" style="width: 370px">
              <button
                class="button is-fullwidth is-outlined mese-btn-outlined"
                onClick=${flip}
                aria-haspopup="true"
                aria-controls="dropdown-menu"
              >
                <span class="loader" style="position: relative;"></span>
              </button>
            </div>`
          : html` <div class="dropdown-trigger" style="width: 362px">
              <div class="div-algo px-3" style="height: 52px" onClick=${flip}>
                ${selectedAsset === -1 &&
                html`
                  <div class="flex">
                    <img
                      src=${store.getImageAsset({ assetName: 'Algo' })}
                      onError=${brokenImageHandler}
                    />
                    <h6 class="ml-2">Algo</h6>
                  </div>
                  <div class="flex-col" style="align-items: flex-end">
                    <span>${algo} Algo</span>
                    <span>${store.getSettingCurrency()['alias']} ${roundAmount(algoPrice * algo, 2)}</span>
                  </div>
                `}
                ${selectedAsset !== -1 &&
                html`
                  <div class="flex">
                    <img
                      src=${store.getImageAsset(getSelectedAsset())}
                      onError=${brokenImageHandler}
                    />
                    <h6 class="ml-2"
                      >${getSelectedAsset()['unit-name'] || getSelectedAsset()['name']}</h6
                    >
                  </div>
                  <div class="flex-col" style="align-items: flex-end">
                    <span
                      >${assetFormat(getSelectedAsset().amount, getSelectedAsset().decimals)}
                      ${' ' + (getSelectedAsset()['unit-name'] || getSelectedAsset()['name'] || '')}</span
                    >
                    ${getSelectedAsset()['price'] &&
                    html` <span>${store.getSettingCurrency()['alias']} ${usdPrice(getSelectedAsset())}</span> `}
                  </div>
                `}
              </div>
            </div>`}

        <div
          class="dropdown-menu dropdown-padding"
          id="dropdown-menu"
          role="menu"
          style="width: 100% !important"
        >
          <div class="dropdown-mask" onClick=${flip} />
          <div class="dropdown-content">
            <div class="flex-algo2 dropdown-item" onclick=${() => handleToken(null)}>
              <div class="flex">
                <img src=${store.getImageAsset({ assetName: 'Algo' })} />
                <h6 class="ml-2">Algo</h6>
              </div>
              <div class="flex-col" style="align-items: flex-end">
                <span>${algo} Algo</span>
                <span>${store.getSettingCurrency()['alias']} ${roundAmount(algoPrice * algo, 2)}</span>
              </div>
            </div>
            ${asset &&
            asset.map(
              (res: any, i) =>
                html` <div
                  class=${i % 2 !== 0 ? 'flex-algo2 dropdown-item' : 'flex-algo dropdown-item'}
                  onclick=${() => handleToken(i)}
                >
                  <div class="flex">
                    <img src=${store.getImageAsset(res)} onError=${brokenImageHandler} />
                    <h6 class="ml-2">${res['unit-name']}</h6>
                  </div>
                  <div class="flex-col" style="align-items: flex-end">
                    <span>${assetFormat(res.amount, res.decimals)} ${' ' + (res['unit-name'] || '')}</span>
                    ${res['price'] && html` <span>${store.getSettingCurrency()['alias']} ${usdPrice(res)}</span> `}
                  </div>
                </div>`
            )}
          </div>
        </div>
      </div>
    `
  );
};

export default SelectAsset;
