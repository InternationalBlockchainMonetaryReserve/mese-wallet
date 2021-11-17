import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { JsonRpcMethod } from '../../../common/src/messaging/types';
import { StoreContext } from '../services/StoreContext';
import { sendMessage } from '../services/Messaging';
import { useState, useContext, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import BackNavbar from 'components/BackNavbar';
import { useDebounce } from 'services/customHooks';
import alert from '../assets/alert.svg'
import alertWhite from '../assets/alert-white.svg'
import alertYellow from '../assets/alert-yellow.svg'
import { capitalize } from '../helpers/parseError';

const AddAssetConfirm: FunctionalComponent = (props: any) => {
    const store: any = useContext(StoreContext);
    const { ledger, address, token } = props
    const [error, setError] = useState<boolean>(false);
    const [errorInput, setErrorInput] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [errorSend, setErrorSend] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);
    const [filter, setFilter] = useState<string>(token === 'null' ? '' : token);
    const [text, setText] = useState<string>('');
    const [asset, setAsset] = useState<any>(null);
    const [accountAsset, setAccountAsset] = useState<any>(null);
    const [pass, setPass] = useState('');

    const debouncedFilter = useDebounce(filter, 500);
    const filterChange = (e) => {
        setFilter(e.target.value);
    };

    useEffect(() => {
        chrome.storage.sync.get(["tempPass"], function (items) {
            setPass(items.tempPass)
        });

        let internalState = {
            asset: {}
        }
        if (props.path == store.pageState.path) {
            if (store.pageState.internalState.setError) {
                setError(store.pageState.internalState.setError)
            }
            if (store.pageState.internalState.setErrorInput) {
                setErrorInput(store.pageState.internalState.setErrorInput)
            }
            if (store.pageState.internalState.setErrorSend) {
                setErrorSend(store.pageState.internalState.setErrorSend)
            }
            if (store.pageState.internalState.setSuccess) {
                setSuccess(store.pageState.internalState.setSuccess)
            }
            if (store.pageState.internalState.setFilter) {
                setFilter(store.pageState.internalState.setFilter)
            }
            if (store.pageState.internalState.setText) {
                setText(store.pageState.internalState.setText)
            }
            if (store.pageState.internalState.setAsset) {
                setAsset(store.pageState.internalState.setAsset)
                internalState.asset = store.pageState.internalState.setAsset
            }
            store.clearPageState()
        } else {
            fetchApi();
        }

        // Save State when Internal State Changes
        store.savePageState(props, {}, {
            setError: error,
            setErrorInput: errorInput,
            setErrorSend: errorSend,
            setSuccess: success,
            setFilter: filter,
            setText: text,
            setAsset: internalState.asset ?? asset,
        })

        // fetchApi();
    }, [debouncedFilter]);
    const fetchApi = async () => {

        const params = {
            'ledger': ledger,
            'asset-id': filter,
        };
        const groupParams = {
            'address': address,
            'ledger': ledger
        }

        // Skip if there's no asset-id
        if (params['asset-id'] == '') {
            setError(false)
            setAsset(null)
            setErrorInput(false)
            setErrorSend(false);
            setText('')
            return
        }

        sendMessage(JsonRpcMethod.GetGroupedAccount, groupParams, function (groupResponse) {
            sendMessage(JsonRpcMethod.AssetDetails, params, function (response) {
                if ('error' in response) {
                    const message = response.error
                    // Blank Search Filter
                    if (filter == '') {
                        setErrorInput(false)
                    } else {
                        if (Number(filter)) {
                            setText(capitalize(JSON.parse(response.error.text).message))
                        } else {
                            setText('Invalid ASA ID')
                        }
                        setErrorInput(true)
                    }

                    setAsset(null)
                    setError(false)
                    setErrorSend(false);

                    // Save State when Errors
                    store.savePageState(props, {}, {
                        setError: false,
                        setErrorInput: true,
                        setErrorSend: false,
                        setSuccess: success,
                        setFilter: filter,
                        setText: message.message,
                        setAsset: null,
                    })

                } else if ('assets' in response) {

                    setError(false)
                    setAsset(null)
                    setErrorInput(false)
                    setErrorSend(false);
                    setText('')

                    // Save State when Errors
                    store.savePageState(props, {}, {
                        setError: false,
                        setErrorInput: false,
                        setErrorSend: false,
                        setSuccess: success,
                        setFilter: filter,
                        setText: text,
                        setAsset: null,
                    })
                } else {

                    setErrorInput(false)
                    setText('')

                    setAsset(response.asset)
                    let addresses: any = [];
                    if (groupResponse == null) {
                        addresses.push(address)
                    } else {
                        addresses = groupResponse.addresses
                    }

                    let error = false;
                    for (let i = store[ledger].length - 1; i >= 0; i--) {
                        if (addresses.includes(store[ledger][i].address)) {
                            if ('details' in store[ledger][i]) {
                                let ids: any = []
                                if (store[ledger][i].details.assets) {
                                    ids = store[ledger][i].details.assets.map((x) => x['asset-id']);
                                }
                                error = ids.includes(response.asset.index);

                                setError(ids.includes(response.asset.index))
                                setErrorInput(false)
                                setErrorSend(false);
                                setText('')

                                // Save State when Errors / Success
                                store.savePageState(props, {}, {
                                    setError: ids.includes(response.asset.index),
                                    setErrorInput: false,
                                    setErrorSend: false,
                                    setSuccess: success,
                                    setFilter: filter,
                                    setText: text,
                                    setAsset: response.asset,
                                })
                            }
                            if (error) break;
                        }
                    }

                }
            });
        })
    };

    const addAsset = () => {
        store.clearPageState();
        store.deleteAccountAssets();
        const params = {
            ledger: ledger,
            passphrase: pass,
            address: address,
            rekeyedAccount: undefined,
            txnParams: {
                type: "axfer",
                assetIndex: asset.index,
                from: address,
                to: address,
                amount: 0
            }
        };

        setLoading(true);
        sendMessage(JsonRpcMethod.GetGroupedAccount, params, function (response) {
            if (response !== null && response.rekey_address !== null && response.active_address !== undefined) {
                params.rekeyedAccount = response.rekeyed_account;
                params.txnParams.from = response.active_address;
                params.txnParams.to = response.active_address;
                params.address = response.active_address;
            }

            sendMessage(JsonRpcMethod.SignSendTransaction, params, async function (response) {
                if ('error' in response) {
                    setLoading(false);
                    switch (response.error) {
                        case "Login Failed":
                            setText('Wrong passphrase');
                            break;
                        default:
                            if (response.error.length > 0) {
                                setText(capitalize(JSON.parse(response.error).message));
                                setErrorSend(true);
                                setSuccess(false)
                            }
                            else {
                                setText('Asset cannot be added');
                                setErrorSend(true);
                                setSuccess(false)
                            }
                            break;
                    }
                } else {

                    // Wait for confirmation / Completed Axfer Transaciton
                    let isPending: any = true;
                    while (isPending) {

                        // Get TX Response
                        let response: any = await CheckTransaction(ledger, params.address);

                        let stillPending = false;

                        if (response && response.pending !== undefined) {
                            response.pending.forEach((tx) => {
                                if (tx.id == params.txnParams.assetIndex) {
                                    stillPending = true;
                                }
                            })
                            isPending = stillPending
                        }
                        

                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    setErrorSend(false);
                    setSuccess(true)
                }
            });
        })

    };

    // Helper function to check transaction
    const CheckTransaction = async (ledger, address) => {
        return new Promise((resolve, reject) => {
            const pendingParams = {
                ledger: ledger,
                address: address,
                currency: store.getSettingCurrency()['alias'],
            }
            sendMessage(JsonRpcMethod.Transactions, pendingParams, function (response) {
                resolve(response)
            })
        })
    }

    return html`
        <div class="main-view" style="flex-direction: column;">
            <${BackNavbar} url=${()=> route(`${ledger}/${address}/asset`, true)}/>
                ${!success ? html`
                <div class="px-4 py-5">
                    <h1 class="title-token" style="margin-bottom: 3em">ADD ALOGRAND STANDARD ASSET (ASA)</h1>
                    <div class="mt-5">
                        <p class="mese-text mese-12"> ASA ID </p>
                        <div class="control has-icons-right mt-2">
                            <input class=${errorInput ? 'input mese-input text-input is-danger' : 'input mese-input text-input'
                                } type="text" placeholder="Enter ID here..." onchange=${filterChange} value=${filter} />
                            ${errorInput ? html`<p class="help is-danger mt-2"
                                style="display: flex; align-items: center;text-transform:initial"><img src=${alert}
                                    style="margin-right: 5px;margin-bottom: 1px" />${text}</p>` : null}
                            ${errorSend ? html`<p class="help is-danger mt-2" style="display: flex; align-items: center">${text}
                            </p>` : null}
                            ${error ? html`<p class="help mt-2" style="display: flex; align-items: center; color: #FFE175;"><img
                                    src=${alertYellow} style="margin-right: 5px;" />You have already added this asset</p>` :
                            null}
                        </div>
                    </div>
                    <div class="mt-5">
                        <p class="mese-text mese-12"> Symbol </p>
                        <div class="control has-icons-right mt-2">
                            <input class='input mese-input text-input disabled-input' type="text"
                                placeholder="Auto filled (non editable)" value=${asset===null ? '' : asset.params['unit-name']}
                                disabled />
                        </div>
                    </div>
                    <div class="mt-5">
                        <p class="mese-text mese-12"> Decimals </p>
                        <div class="control has-icons-right mt-2">
                            <input class='input mese-input text-input disabled-input' type="number"
                                placeholder="Auto filled (non editable)" value=${asset===null ? '' : asset.params.decimals}
                                disabled />
                        </div>
                    </div>
                    ${loading ? html`
                    <button class="button is-fullwidth is-outlined mese-btn-outlined" style="margin-top: 3em" disabled>
                        <span class="loader"></span>
                    </button>`: html`
                    <button class="button is-fullwidth is-outlined mese-btn-outlined" style="margin-top: 3em"
                        disabled=${asset===null ? true : error} onclick=${addAsset}>
                        <span class="mr-3">CONFIRM</span>
                    </button>`}
                </div>` : html`
                <div class="px-4 py-5">
                    <h1 class="title-token" style="margin-bottom: 3em">ALGORAND STANDARD ASSET ADDED!</h1>
                    <section class="divSilver">
                        <div class="divFlex">
                            <span>asset name</span>
                            <span style="text-transform: uppercase">${asset === null ? '' : asset.params['name']}</span>
                        </div>
                        <div class="divFlex mt-5">
                            <span>unit name</span>
                            <span style="text-transform: uppercase">${asset === null ? '' : asset.params['unit-name']}</span>
                        </div>
                    </section>
                    <button class="button is-fullwidth is-outlined mese-btn-outlined" style="margin-top: 3em" onclick=${()=>
                        route(`/wallet`, true)}
                        >
                        <span class="mr-3">CLOSE</span>
                    </button>
                </div>`}
        
        </div>
    `
}
export default AddAssetConfirm
