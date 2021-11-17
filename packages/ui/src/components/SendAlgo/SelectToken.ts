import {FunctionalComponent} from 'preact';
import {html} from 'htm/preact';
import {useState, useContext, useEffect} from 'preact/hooks';
import {useObserver} from 'mobx-react-lite';
import {route} from 'preact-router';
import {JsonRpcMethod} from '../../../../common/src/messaging/types';
import {StoreContext} from '../../services/StoreContext';
import {sendMessage} from '../../services/Messaging';
import Default from '../../assets/shape.svg';
import './style.scss';
import { assetFormat, numFormat, roundAmount, thousandSeparator } from 'services/common';
import { extensionBrowser } from '@mese/common/chrome';

const SelectToken: FunctionalComponent = (props: any) => {
    const store: any = useContext(StoreContext);
    const [active, setActive] = useState<boolean>(false);
    const [asset, setAsset] = useState<any>([]);
    const [algo, setAlgo] = useState<any>({});
    const [algoOwned, setAlgoOwned] = useState<any>({});
    const {ledger, address, setToken,token,states,setError, setAssetHandler} = props;

    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        fetchApi();
    }, []);

    const fetchApi = () => {
        const params = {
            ledger: ledger,
            address: address,
            currency: store.getSettingCurrency()['alias'],
        };
        sendMessage(JsonRpcMethod.GetAllAssets, params, async function (response) {

            // Save the detail assets to storage
            let encodeRes = await saveDetailToStorage(response)

            sendMessage(JsonRpcMethod.GetGroupedAccount, params, function (response) {

                if (response !== null && response.active_address) {
                    setAlgoOwned(response.active_address)
                } else {
                    setAlgoOwned(store.getChosenAccountAddress())
                }
            })
            setAlgo({amount: response.totalAlgo, price: response.algoPrice})
            setLoading(false)
            setAsset(response.assets)
            setAssetHandler(response.assets)
        })
    };

    /**
     * Helper function to save the details into the storage
     * Before saving into the storage, we need to convert any BigInt 
     * (BigInt cannot be saved/serialized)
     */
    const saveDetailToStorage = (details) => {
        return new Promise((resolve, reject) => {
            sendMessage(JsonRpcMethod.HandleBigInt, {details}, function (response) {

                 /**
                 * Store the response
                 */
                extensionBrowser.storage.local.set({dapp_cache: response.details,},
                    function () {
                        resolve(response)
                    }
                );
            })
        })
    }

    let ddClass: string = 'dropdown px-4 mt-3';
    if (active) ddClass += ' is-active';

    const flip = () => {
        setActive(!active);
    };
    const handleToken = (data) => {
        // Load details if they are not present in the session or is an empty object (algos).
        if (data===null) {
            const temp:any = numFormat(algo.amount/ 1e6, 6)
            setToken({
                amount:numFormat(algo.amount/ 1e6, 6),
                microalgos: algo.amount,
                assetName: 'Algo',
                decimals: 6,
                price: algo.price,
                'owned-by' : algoOwned
            });
            setActive(false);
            if (states.to.length===0){
                setError({to:false, amount: temp<states.amount})
            }else{
                setError({to:states.to.length!==58, amount: temp<states.amount})
            }
        } else {
            const params = {
                'ledger': ledger,
                'asset-id': data['asset-id'],
            };

            sendMessage(JsonRpcMethod.AssetDetails, params, function (response) {
                const keys = Object.keys(response.asset.params);
                for (let i = keys.length - 1; i >= 0; i--) {
                    data[keys[i]] = response.asset.params[keys[i]];
                }
                data.microalgos = data.amount;
                data.decimals = data.decimals;
                setToken(data);
            });
            setActive(false);
            if (states.to.length===0){
                setError({to:false, amount: data.amount<states.amount})
            }else{
                setError({to:states.to.length!==58, amount: data.amount<states.amount})
            }


        }

    }

    const brokenImageHandler = (event) => {
        event.target.src = Default
    }

    // Helper function to convert to USD price
    const usdPrice = (res) => {
        if (res.price == null) {
            return null;
        }

        let num: null | string = assetFormat(res.amount, res.decimals)

        if (num !== null) {
            return roundAmount(parseFloat(res['price']) * parseFloat(num), 2);
        }

        return null;
    }

    return useObserver(
        () => html`
            <div class=${ddClass}>
                ${token===null?html`
                    <div class="dropdown-trigger" style="width: 100%">
                        <button class="button is-fullwidth is-outlined mese-btn-outlined"
                                onClick=${flip}
                                aria-haspopup="true"
                                aria-controls="dropdown-menu">
                                ${loading && html `
                                <span class="loader" style="position: relative;"></span>
                                `}
                                ${!loading && html `
                                <span class="mr-3">Select Asset</span>
                                `}
                        </button>
                    </div>`:html`
                  <div class="dropdown-trigger" style="width: 100%">
                    <div class="div-algo p-3" onClick=${flip}>
                    ${token['assetName'] == 'Algo' && html `
                    <div class="flex">
                            <img src=${store.getImageAsset(token)} onError=${brokenImageHandler}/>
                            <h6 class="ml-2">${token["unit-name"]||'Algo'}</h6>
                        </div>
                        <div class="flex-col">
                            <span>${token.amount} ${token["unit-name"]||'Algo'}</span>
                            <span>${store.getSettingCurrency()['alias']} ${roundAmount(algo.amount / 1e6 * algo.price, 2)}</span>
                        </div>
                    `}
                    ${token['assetName'] != 'Algo' && html `
                    <div class="flex">
                            <img src=${store.getImageAsset(token)} onError=${brokenImageHandler}/>
                            <h6 class="ml-2">${token["unit-name"]||''}</h6>
                        </div>
                        <div class="flex-col">
                            <span>${thousandSeparator(token.amount / Math.pow(10, token.decimals))} ${token["unit-name"]||''}</span>
                            ${usdPrice(token) && html `
                            <span>${store.getSettingCurrency()['alias']} ${usdPrice(token)}</span>
                            `}
                        </div>
                    `}
                       
                    </div>
                </div>`}

                              
                <div class="dropdown-menu mx-4 dropdown-padding" id="dropdown-menu" role="menu" style="width: 100%">
                    <div class="dropdown-mask" onClick=${flip}/>
                    <div class="dropdown-content" >
                      <div class="flex-algo2 dropdown-item" onclick=${() => handleToken(null)}>
                            <div class="flex">
                                <img src=${store.getImageAsset({assetName: 'Algo'})}/>
                                <h6 class="ml-2">Algo</h6>
                            </div>
                            <div class="flex-col">
                                <span>${algo && numFormat(algo.amount / 1e6, 6)} Algo</span>
                                <span>${store.getSettingCurrency()['alias']} ${roundAmount(algo.amount / 1e6 * algo.price, 2)}</span>
                            </div>
                        </div>
                        ${asset && asset.map((res: any,i) =>
                                html`
                                    <div class=${i % 2 !== 0?'flex-algo2 dropdown-item':'flex-algo dropdown-item'} onclick=${() => handleToken(res)}>
                                        <div class="flex">
                                            <img src=${store.getImageAsset(res)} onError=${brokenImageHandler}/>
                                            <h6 class="ml-2">${res["unit-name"]}</h6>
                                        </div>
                                        <div class="flex-col">
                                            <span>${assetFormat(res.amount, res.decimals)} ${res["unit-name"]}</span>
                                            ${usdPrice(res) && html `
                                            <span>${store.getSettingCurrency()['alias']} ${usdPrice(res)}</span>
                                            `}
                                        </div>
                                    </div>`
                        )}
                    </div>
                </div>
            </div>
        `
    );
};

export default SelectToken;
