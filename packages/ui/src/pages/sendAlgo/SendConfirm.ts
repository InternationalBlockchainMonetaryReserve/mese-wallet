import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { StoreContext } from '../../services/StoreContext';
import BackNavbar from 'components/BackNavbar';
import { route } from 'preact-router';
import './style.scss';
import Icon from '../../assets/send.svg'
import { useContext, useEffect, useState } from 'preact/hooks';
import { JsonRpcMethod } from '@mese/common/messaging/types';
import WallClock from '../../assets/wall-clock.svg'
import CheckCircle from '../../assets/check-circle.svg'
import XCircle from '../../assets/x-circle-red.svg'
import { sendMessage } from 'services/Messaging';
import {capitalize} from '../../helpers/parseError';
import {  thousandSeparator } from 'services/common';

const SendConfirm: FunctionalComponent = (props: any) => {
    const store: any = useContext(StoreContext);
    const { ledger, address } = props;
    const [pass, setPass] = useState('');
    const [txId, setTxId] = useState('');
    const [count, setCount] = useState<number>(0);
    const [message, setErrorMessage] = useState<string>('');
    const [status, setStatus] = useState<string>('');

    const [first, setFirst] = useState<boolean>(true);

    const [txHash, setTxHash] = useState<string>('');

    let interval;

    useEffect(() => {
        
        if (first) 
            store.savePageState(props)
        
        setFirst(false)

        chrome.storage.sync.get(["tempPass"], function (items) {
            setPass(items.tempPass)
        });

        return () => {
            clearInterval(interval);
        };

    }, [count]);

    const sendTx = async () => {
        setStatus('pending');
        store.clearPageState()
        store.deleteAccountAssets()
        const decimals = 'decimals' in store.transaction.token ? store.transaction.token.decimals : 6;
        const amountToSend = +store.transaction.amount * Math.pow(10, decimals);
        const params: any = {
            ledger: ledger,
            passphrase: pass,
            address: address,
            txnParams: {
                from: address,
                to: store.transaction.to,
                note: store.transaction.note,
                amount: +amountToSend,
            },
        };

        let asset = store.transaction.token;
        if ('asset-id' in store.transaction.token) {
            params.txnParams.type = 'axfer';
            params.txnParams.assetIndex = store.transaction.token['asset-id'];
        } else {
            params.txnParams.type = 'pay';
        }

        sendMessage(JsonRpcMethod.GetGroupedAccount, params, async function (response) {
            if (response !== null && response.rekeyed_account !== null && response.active_address !== undefined) {
                params.rekeyedAccount = response.rekeyed_account;
                if ('asset-id' in asset) {
                    // Sending Asset (axfer type) should be from the account that has the asset
                    params.txnParams.from = asset['owned-by'];
                    params.address = asset['owned-by'];

                } else {
                    // Sending Algo (pay type) should be from the Active Sub Account
                    params.txnParams.from = response.active_address;
                    params.address = response.active_address;
                }
            }

            /**
             * If the response != null means it's a Managed Account
             * If yes, then build the transaction, using helper function
             * then let DApp Manager manage the asset allocation (asset/algo transfer if needed)
             */
            if (response != null) {
                // Build the TX, so DApp manager can read it
                let txWraps: any = await buildTransaction([params.txnParams])
                let origin = response.pool.url

                // DApp manager will take an action
                if (txWraps.error == null && txWraps.transactionWraps.length > 0 ) {
                    let assetTrf = await dappManager_AssetTransfer(txWraps.transactionWraps, ledger, origin, pass)
                }
            }

            sendMessage(JsonRpcMethod.SignSendTransaction, params, async function (response) {
                if ('error' in response) {
                    switch (response.error) {
                        case 'Login Failed':
                            setStatus('error')
                            setErrorMessage('Wrong passphrase');
                            break;
                        default:
                            setStatus('error')
                            // if (response.error[0] === "{") {
                            //     const data = JSON.parse(response.error)
                            //     setErrorMessage(data.message);
                            // } else {
                            //     setErrorMessage(response.error);
                            // }
                            setErrorMessage(capitalize(JSON.parse(response.error).message));

                            break;
                    }
                } else {
                    let isPending: any = true;
                    setTxHash(response.txId)
                    while (isPending) {

                        let response: any = await CheckTransaction(ledger, params.address);

                        let stillPending = false;

                        if (params.txnParams.type == 'pay') {
                            // Pay Pending
                            response.pending.forEach((tx) => {
                                if (tx.amount == params.txnParams.amount) {
                                    stillPending = true;
                                }
                            })
                        } else {
                            // Axfer Pending
                            response.pending.forEach((tx) => {
                                if (tx.id == params.txnParams.assetIndex) {
                                    stillPending = true;
                                }
                            })
                        }

                        isPending = stillPending
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    clearInterval(interval)
                    setStatus('success')
                    setTxId(response.txId);
                    setErrorMessage(response.txId);
                }
            });
        });

        store.clearCrypto()
    };

    // Helper function to build transaction, will be used by DApp manager
    const buildTransaction = async(txnParams) => {
        return new Promise((resolve, reject) => {
            sendMessage(JsonRpcMethod.BuildTransactionWrap, {txnParams: txnParams}, function (response) {
                resolve(response)
            })
        })
    }

    // DApp manager to manage the TX. It'll transfer algo/asset if needed
    const dappManager_AssetTransfer = async(transactionWraps, ledger, origin, pwd) => {
        return new Promise((resolve, reject) => {
            sendMessage(
                JsonRpcMethod.DAppManager_AssetTransfer,
                {
                  wraps: transactionWraps,
                  ledger,
                  origin: origin,
                  passphrase: pwd,
                },
                function (response) {
                    resolve(response)
                }
              )
        })
    }

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

    if (status === 'pending') {
        setTimeout(() => {
            setCount(count+1)
        }, 1000)
    }
    return status === '' ? html`
        <div class="main-view" style="flex-direction: column;">
            <${BackNavbar} url=${()=> route(`${ledger}/${address}/send`, true)}/>
                <div class="px-5 py-5">
                    <section>
                        <h1 class="priceTitle">
                            ${thousandSeparator(store.transaction.amount)} ${store.transaction.token["unit-name"] || 'Algo'}
                        </h1>
                        ${store.transaction.usdPrice && html `
                        <div class="divFlexPrice mt-2"><span class="priceSgd">${store.transaction.usdPrice} ${store.getSettingCurrency()['alias']}</span></div>
                        `}
                    </section>
                    <section class="mt-5 divSilver mb-5">
                        <div class="divFlex">
                            <span>TO</span>
                            <a href=${`https://${ledger==='TestNet' ? 'testnet.' : ''
                                }algoexplorer.io/address/${store.transaction.to}`}
                                target="_blank">${store.transaction.to.slice(0, 8)}
                                .....${store.transaction.to.slice(-8)}</a>
                        </div>
                        <div class="divFlex mt-5">
                            <span>From</span>
                            <a href=${`https://${ledger==='TestNet' ? 'testnet.' : '' }algoexplorer.io/address/${store.transaction.from}`}
                                target="_blank">${store.transaction.from.slice(0, 8)}.....${store.transaction.from.slice(-8)}</a>
                        </div>
                        <div class="divFlex mt-5">
                            <span>transaction fee</span>
                            <span>0.001 Algo</span>
                        </div>
                        <div class="divFlex mt-5">
                            ${store.transaction.usdPrice && html `
                            <span>total</span>
                            <span>${store.transaction.usdPrice} ${store.getSettingCurrency()['alias']}</span>
                            `}
                        </div>
                    </section>
                    <button class="button is-fullwidth is-outlined mese-btn-outlined mt-5" onclick=${sendTx}>
                        <span class="mr-3">SEND ASSET/FUNDS</span>
                        <img src=${Icon} />
                    </button>
                </div>
        </div>
    ` : html`
        <div class="px-5 div-col">
            <div class="div-image" style="margin-top: 25%">
                <img src=${status==='error' ? XCircle : status==='success' ? CheckCircle : WallClock}
                    class="mb-6 transaction-image" />
            </div>
            <h1 class="mt-4 title-transaction">
                ${status === 'error' ? 'Transaction error' : status === 'success' ? 'Congratulations!' : `we are processing your
                transaction`}</h1>
            <div class="mt-3 flex-transaction">
                <span>STATUS</span>
                <span>${status === 'error' ? 'Failed' : status === 'success' ? 'success' : `Pending (${count}s)`}</span>
            </div>
            ${status === 'error' ? html`
            <div class="mt-5 div-col" style="word-break: break-word">
                <span>${message}</span>
            </div>` : html`
            <div class="mt-5 div-col">
                <span>${status === 'success' ? 'Your funds have been sent!' : 'Your transaction for the asset/funds is pending!'}</span>
                <span class="mt-1 span-hash">${status === 'success' && html `<a class="mt-2 tx-hash" href="${store.goToExplorer('tx', txHash)}" target="_blank">Transaction Hash</a>`}</span>
                ${status === 'error' ? html`
                <span class="mt-3">View your transaction <a href=${`https://${store.ledger==='TestNet' ? 'testnet.' : ''
                        }algoexplorer.io/tx/${txId}`} target="_blank">here.</a></span>` : null}
            </div>`}
            ${status !== 'pending' && html`
            <button class="button is-fullwidth is-outlined mese-btn-outlined mt-5" onclick=${()=> route(`/wallet`, true)}
                >
                <span class="mr-3">${status === 'error' || status === 'success' ? 'CLOSE' : `OK`}
                </span>
            </button>
            `}
        
        </div>`;
};

export default SendConfirm;
