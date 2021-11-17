import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { JsonRpcMethod } from '../../../common/src/messaging/types';
import { StoreContext } from '../services/StoreContext';
import { sendMessage } from '../services/Messaging';
import Search from '../assets/search.svg';
import { useState, useContext, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import BackNavbar from 'components/BackNavbar';
import { useDebounce } from 'services/customHooks';
import Default from '../assets/shape.svg';
import check from 'assets/verified-check.svg';

const SearchAsset: FunctionalComponent = (props: any) => {
  const store: any = useContext(StoreContext);
  const { ledger, address } = props;
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('');

  const [curatedAssets, setCuratedAssets] = useState<any>([]);
  const [verifiedAssets, setVerifiedAssets] = useState<any>([]);
  const pageSize = 10;
  const [pageNumber, setPageNumber] = useState<number>(1);

  const debouncedFilter = useDebounce(filter, 500);

  const filterChange = (e) => {
    setFilter(e.target.value);
  };
  useEffect(() => {
    setLoading(true);

    // Load Saved Internal State (if any)
    let curatedAssetState = [];
    let filterState = '';
    let pageNumberState = -1;
    let verifiedAssetState = [];

    // There's Saved Internal State
    if (props.path == store.pageState.path) {
      if (store.pageState.internalState.setCuratedAssets) {
        setCuratedAssets(store.pageState.internalState.setCuratedAssets.toJS());
        curatedAssetState = store.pageState.internalState.setCuratedAssets.toJS();
      }
      if (store.pageState.internalState.setFilter) {
        setFilter(store.pageState.internalState.setFilter);
        filterState = store.pageState.internalState.setFilter;
      }
      if (store.pageState.internalState.setPageNumber) {
        setPageNumber(store.pageState.internalState.setPageNumber);
        pageNumberState = store.pageState.internalState.setPageNumber;
      }
      if (store.pageState.internalState.setVerifiedAssets) {
        setVerifiedAssets(store.pageState.internalState.setVerifiedAssets.toJS());
        verifiedAssetState = store.pageState.internalState.setVerifiedAssets.toJS();
      }
      store.clearPageState();
      setLoading(false);
    } else {
      // No Saved Internal State
      fetchApi();
    }

    store.savePageState(
      props,
      {},
      {
        setCuratedAssets: curatedAssetState.length > 0 ? curatedAssetState : curatedAssets,
        setVerifiedAssets: verifiedAssetState.length > 0 ? verifiedAssetState : verifiedAssets,
        setFilter: filterState !== '' ? filterState : filter,
        setPageNumber: pageNumberState !== -1 ? pageNumberState : pageNumber,
      }
    );
  }, [debouncedFilter, pageNumber]);

  const fetchApi = () => {
    setLoading(true);
    const params = {
      ledger: ledger,
    };

    // Return All Assets (with no pagination)
    if (curatedAssets.length === 0) {
      sendMessage(JsonRpcMethod.AssetsVerifiedList, params, function (res) {
        setVerifiedAssets(res.results);
        sendMessage(JsonRpcMethod.MESEAssetsAPIList, params, function (response) {
          if (response && response.length > 0) {
            setCuratedAssets(response);
            store.savePageState(
              props,
              {},
              {
                setCuratedAssets: response,
                setFilter: filter,
                setVerifiedAssets: res.results,
              }
            );
            setLoading(false);
          } else {
            setCuratedAssets([]);
            setLoading(false);
          }
        });
      });
    }
    setLoading(false);
  };

  // Check if asset argument in verified list
  const isAssetVerified = (asset) => {
    const verified = verifiedAssets.find((verified) => {
      return verified['asset_id'] == asset['index'];
    });

    if (verified) return true;
    else return false;
  };

  const filteredList = () => {
    const filtered: any = [];

    if (filter === undefined || filter === null || filter === '') {
      return curatedAssets;
    }

    const loweredCaseFilter = filter.toLowerCase();

    curatedAssets.forEach((asset) => {
      if (asset['name'] && asset['name'].toLowerCase().includes(loweredCaseFilter)) {
        filtered.push(asset);
        return;
      }

      if (asset['unit-name'] && asset['unit-name'].toLowerCase().includes(loweredCaseFilter)) {
        filtered.push(asset);
        return;
      }

      if (asset['unit_name'] && asset['unit_name'].toLowerCase().includes(loweredCaseFilter)) {
        filtered.push(asset);
        return;
      }

      if (asset['index'] && asset['index'].toString().includes(loweredCaseFilter)) {
        filtered.push(asset);
        return;
      }

      if (asset['asset_id'] && asset['asset_id'].toString().includes(loweredCaseFilter)) {
        filtered.push(asset);
        return;
      }
    });

    return filtered;
  };

  const brokenImageHandler = (event) => {
    event.target.src = Default;
  };

  return html`
    <div class="main-view" style="flex-direction: column;">
      <${BackNavbar} url=${() => route(`/wallet`, true)} />
      <div class="px-4 py-5">
        <div class="control has-icons-left mb-5">
          <input
            class="input mese-input text-input"
            type="text"
            placeholder="Search assets"
            onchange=${filterChange}
            value=${filter}
          />
          <span class="icon is-small is-left">
            <img src=${Search} style="margin-left: 10px;margin-top: 5px;" />
          </span>
        </div>

        ${filteredList() &&
        filteredList()
          .slice(0, pageNumber * pageSize)
          .map(
            (res: any, i) =>
              html` <div
                class=${i % 2 === 0 ? 'flex-token2 pt-2 pb-2 px-2' : 'flex-token pt-2 pb-2 px-2'}
                onclick=${() =>
                  route(`${ledger}/${address}/${res['index'] ?? res['asset_id']}/add-asset`)}
              >
                <div class="flex">
                  <img
                    class="token-image"
                    src=${store.getImageAsset(res)}
                    onError=${brokenImageHandler}
                  />
                  <h6 class="ml-2"
                    >${res['unit-name'] ?? res['index']}
                    ${isAssetVerified(res) &&
                    html`<img class="verified-checkmark" src=${check} width="14" />`}</h6
                  >
                </div>
                <div class="flex-col">
                  <span>${res['index'] ?? res['asset_id']}</span>
                </div>
              </div>`
          )}
        ${filteredList().length / pageSize > pageNumber &&
        !loading &&
        html`
          <div class="pb-1 px-4 has-text-centered" style="margin-top: -7px">
            <a
              class="mese-text mese-12 cursor-pointer"
              onClick=${() => {
                setPageNumber(pageNumber + 1);
              }}
              >Load more</a
            >
          </div>
        `}
        ${filteredList().length === 0 &&
        filter == '' &&
        html` <span class="loader mt-4 mb-5" style="margin: auto;"></span> `}
        <button
          class="button is-fullwidth is-outlined mese-btn-outlined mt-3"
          onClick=${() => route(`${ledger}/${address}/null/add-asset`)}
        >
          <span class="mr-3">ADD ALGORAND ASSET BY ID</span>
        </button>
      </div>
    </div>
  `;
};
export default SearchAsset;
