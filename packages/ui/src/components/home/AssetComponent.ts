import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import {JsonRpcMethod} from '../../../../common/src/messaging/types';
import {StoreContext} from '../../services/StoreContext';
import {sendMessage} from '../../services/Messaging';
import './style.scss';
import {useState, useContext, useEffect} from 'preact/hooks';
import {route} from 'preact-router';
import Default from '../../assets/shape.svg';
import { assetFormat } from 'services/common';
import { roundAmount, thousandSeparator } from 'services/common';

interface Account {
    address: string;
    mnemonic: string;
    name: string;
}
const AssetComponent: FunctionalComponent = (props: any) =>{
    const store: any = useContext(StoreContext);
    const [asset, setAsset] = useState<any>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [currency, setCurrency] = useState<any>('');
    const { ledger } = store;

    let account: Account = store[ledger].find(
        function (acc, index) {
            return store.getChosenAccountAddress() == acc.address;
        }
    )

    const {setHeaderPrice} = props
    let interval;
    const algoAssetName = 'Algo'
    const [algoBalance, setAlgoBalance] = useState<number>(0);
    const [algoPrice, setAlgoPrice] = useState<number>(0);

    useEffect(() => {
        if (store.getChosenAccountAddress() !== null && asset.length === 0 && currency != store.getSettingCurrency()['alias']) {
            setLoading(true)
            setCurrency(store.getSettingCurrency()['alias'])
            fetchApi();
        }

        interval = setInterval(() => {
            const params = {
                ledger: store.ledger,
                address: account && account.address,
                currency: store.getSettingCurrency()['alias'],
            };
            sendMessage(JsonRpcMethod.GetAllAssets, params, function (response) {
                store.setAccountAssets(params.address, params.ledger, response);
                setAlgoBalance((response.totalAlgo) / 1e6)
                setAlgoPrice(response.algoPrice)
                setHeaderPrice((response.totalAlgo / 1e6) * response.algoPrice);
                setAsset([addAlgoAsset(response), ...response.assets])
                store.setHeaderPrice((response.totalAlgo / 1e6) * response.algoPrice)
            })
        }, 4000)

        // Clear out interval memory
        return () => {
            clearInterval(interval)
        }
    }, [store.appSettings.selectedCurrency]);

    const noAccount = () => {
        return store.getChosenAccountAddress() === null
    }

    const fetchApi = () => {
        const params = {
            ledger: store.ledger,
            address: account && account.address,
            currency: store.getSettingCurrency()['alias'],
        };

        // Check if the assets already in the global state
        let assets = store.getAccountAssets(params.address, params.ledger);

        // If only the check is not available in the global state, fetch from API call
        if ( assets == null) {
            sendMessage(JsonRpcMethod.GetAllAssets, params, function (response) {
                store.setAccountAssets(params.address, params.ledger, response);
                setAlgoBalance((response.totalAlgo) / 1e6)
                setAlgoPrice(response.algoPrice)
                setAsset([addAlgoAsset(response), ...response.assets])
                setHeaderPrice((response.totalAlgo / 1e6) * response.algoPrice);
                setLoading(false)
            })
        }else {
            setAlgoBalance((assets.totalAlgo) / 1e6)
            setAlgoPrice(assets.algoPrice)
            setAsset([addAlgoAsset(assets), ...assets.assets])
            setHeaderPrice((assets.totalAlgo / 1e6) * assets.algoPrice);
            setLoading(false)
        }
    };

    // Helper function to convert to USD price
    const converted = (res) => {
        let num: null | string = assetFormat(res.amount, res.decimals)

        if (num !== null) {
            return roundAmount(res['price'] * (res.amount / Math.pow(10, res.decimals)), 2);
        }

        return res['price'];
    }

    const addAlgoAsset = (response) => {

        return {
            assetName: algoAssetName,
            price: response.algoPrice,
            amount: response.totalAlgo,
            decimals: 6
        }
    }

    const brokenImageHandler = (event) => {
        event.target.src = Default
    }

    return html`
        <div class="mb-${asset.length > 3 ? '6' : '5'}">
            ${loading && html` <span class="loader mt-4 mb-5" style="margin: auto;"></span> `}
            ${asset && asset.map((res: any,i) =>
                    html`
                <div class=${i % 2 === 0?'flex-token2 pt-2 pb-2 px-2':'flex-token pt-2 pb-2 px-2'}>
                    <div class="flex">
                        <img src=${store.getImageAsset(res)} onError=${brokenImageHandler}/>
                        <h6 class="ml-2">${res["unit-name"] ?? res["assetName"]}</h6>
                    </div>
                    <div class="flex-col">
                        ${(res["unit-name"] ?? res["assetName"]) === algoAssetName && html 
                    `
                    <span>${thousandSeparator(algoBalance)} Algo</span>
                    `
                    }
                    ${(res["unit-name"] ?? res["assetName"]) !== algoAssetName && html 
                    `
                    <span>${assetFormat(res.amount, res.decimals)} ${res["unit-name"] ?? res["assetName"]}</span>
                    `
                    }
                    ${res["price"] && res["price"] !== null && res["assetName"] !== algoAssetName && html `
                        <span>${converted(res)} ${store.getSettingCurrency()['alias']}</span>
                    `}
                    ${res["price"] && res["price"] !== null && res["assetName"] === algoAssetName && html `
                        <span>${roundAmount(algoBalance * algoPrice, 2)} ${store.getSettingCurrency()['alias']}</span>
                    `}
                    </div>
                </div>`
            )}
            ${noAccount() && html `
            <div class="mese-text mese-12 no-account-container has-text-centered">
            Data isn’t available until account is created and connected
            </div>
            `}
            <div
            class="absolute-button" style="${noAccount()? 'padding-bottom: 90px' : ''}">
            <button class="button is-fullwidth is-outlined mese-btn-outlined mt-3"
            disabled=${noAccount()}
                    onclick=${()=>route(`${store.ledger}/${account && account.address}/asset`)}
            >
                <span class="mr-3">ADD ALGORAND ASSETS (ASA)</span>
            </button>
            </div>
        </div>
    `
}
export default AssetComponent
