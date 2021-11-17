import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import './style.scss';
import { StoreContext } from '../../services/StoreContext';
import QRB from '../../assets/qr-code-black.svg'
import alert from '../../assets/alert.svg'
import SelectToken from '../../components/SendAlgo/SelectToken'
import Header from 'components/Header';
import { roundAmount, thousandSeparator, splitUntil } from 'services/common';
import { JsonRpcMethod } from '../../../../common/src/messaging/types';
import { sendMessage } from '../../services/Messaging';
import MeseButton from 'components/MeseButton';
import Decimal from 'decimal.js';

const WAIT_INTERVAL = 1000
const ENTER_KEY = 13
const ConfirmSend: FunctionalComponent = (props: any) => {

    const store: any = useContext(StoreContext);

    const { ledger, address } = props;
    const [state, setState] = useState<any>({
        amount: store.transaction.amount,
        to: store.transaction.to,
        note: store.transaction.note,
        currency: store.transaction.curency
    });

    const [token, setToken] = useState<any>(store.transaction.token)

    const [asset, setAsset] = useState<any>([]);

    const [maxAvailable, setMaxAvailable] = useState<boolean>(false);

    const [error, setError] = useState<any>({
        amount: false,
        to: false
    })

    const [balance, setBalance] = useState<any>(null);

    const [usdInput, setUsdInput] = useState<any>('');

    const [amountInput, setAmountInput] = useState<any>('');

    const [accountDetails, setAccountDetails] = useState<any>(null);

    useEffect(() => {

        if (token) {
            setBalance(token.price)
        }

        checkMaxAvailability();

        // Check Saved Internal State
        if (props.path == store.pageState.path) {
            if (store.pageState.internalState.setError) {
                setError(store.pageState.internalState.setError)
            }
            if (store.pageState.internalState.setAmountInput) {
                setAmountInput(store.pageState.internalState.setAmountInput)
            }
            if (store.pageState.internalState.setUsdInput) {
                setUsdInput(store.pageState.internalState.setUsdInput)
            }
            store.clearPageState()
        }

        // Save Page State
        store.savePageState(props, {
            transaction: {
                amount: state.amount,
                to: state.to,
                note: state.note,
                token: token,
                curency: state.currency
            }
        }, {
            setError: error,
            setAmountInput: amountInput,
            setUsdInput: usdInput,
        })

    }, [state, token])

    const checkMaxAvailability = async () => {

        if (token == null) {
            setMaxAvailable(false)
            return;
        }

        const minimum = await getMinimum(asset)
        const amount = token.microalgos / Math.pow(10, token.decimals);

        if (amount < minimum) {
            setMaxAvailable(false)
        } else {
            setMaxAvailable(true)
        }
    }

    const [typing, setTyping] = useState<any>({
        typing: false,
        typingTimeout: 0
    });
    let account: any = store[ledger].find(
        function (acc, index) {
            return store.getChosenAccountAddress() == acc.address;
        }
    )
    const handleChange = (name) => (e) => {
        if (typing.typingTimeout) {
            clearTimeout(typing.typingTimeout);
        }

        const minimum = getMinimum(asset)

        if (name === 'amount') {

            // Max 10 digits before comma
            if (e.target.value.replace(/,/g, "").split('.')[0].length > 10) {
                var parts = e.target.value.replace(/,/g, "").split(".");
                parts[0] = parts[0].substr(0, 10)
                e.target.value = parts.join(".")
            }

            let input = sanitizeInput(e.target.value)

            // Handle e math notation (ex 1e-7)
            if (input.toString().includes('e')) {
                setAmountInput(sliceMaxCharacters(e.target.value, token.decimals))
                setUsdInput("0.00")
                checkValidationHandler(0);
                return;
            }

            // If input is invalid
            if (!input) {
                // Allow Multiple Zeros behind the comma (ex. 0.000)
                if ((e.target.value.substr(-1) == '0' && e.target.value.includes("."))
                    || input.toString().includes('e')) {
                    setAmountInput(sliceMaxCharacters(e.target.value, token.decimals))
                }else{
                    setAmountInput(`0${e.target.value == '0.' ? '.' : ''}`) // Handle "0." input
                }
                setUsdInput("0.00")
                checkValidationHandler(0);
                return;
            }

            // Allow Multiple zeros behind comma (ex 2.23009)
            if (e.target.value.includes(".") && e.target.value.substr(-1) == "0") {
                let sliced = sliceMaxCharacters(e.target.value, token.decimals)
                setAmountInput(sliced)
                setUsdInput(roundAmount(input * balance, 2))
                checkValidationHandler(0);
                return;
            }

            input = parseFloat(sliceMaxCharacters(input, token.decimals))

            setAmountInput(`${thousandSeparator(input)}${e.target.value.substr(-1) == '.' ? '.' : ''}`)

            setUsdInput(roundAmount(input * balance, 2))

            checkValidationHandler(input);

        } else if (name === 'to') {
            setState({ ...state, to: e.target.value })
            setTyping({
                typing: false,
                typingTimeout: setTimeout(function () {
                    e.target.value.length !== 58 ? setError({ ...error, to: true }) : setError({ ...error, to: false })
                }, 1000)
            });
        } else {
            setState({ ...state, [name]: e.target.value })
        }

    }

    // Limit the total numbers after dot (.)
    const sliceMaxCharacters = (amount, decimals) => {
        let characters = amount.toString()
        if (characters.split('.')[1] == undefined) {
            return characters
        }

        if (characters.split('.')[1].length > decimals) {
            return characters.slice(0, -1)
        }

        return characters
    }

    const checkValidationHandler = async (input: number) => {
        let valid = await isValid(input)

        if (!valid) {
            setState({ ...state, amount: input, currency: Math.floor((Math.random() * 1000000) + 1) })
            setError({ ...error, amount: true })
        } else {
            setState({ ...state, amount: input, currency: Math.floor((Math.random() * 1000000) + 1) })
            setError({ ...error, amount: false })
        }
    }

    /**
     * Handle Amount Check Validation
     */
    const isValid = async (amount: number) => {
        let totalAmount = token.microalgos / Math.pow(10, token.decimals);

        // Asset Check Validation
        if (token.assetName != 'Algo') {
            if (amount <= totalAmount) return true;
            return false;
        }

        // Algo Check Validation
        const minimum = await getMinimum(asset)

        // Amount must not less than total amount & minimum amount
        if (amount < totalAmount && (totalAmount - amount) >= minimum && token !== null) {
            return true
        }

        return false;
    }

    const submitMax = async () => {

        const amount = token.microalgos / Math.pow(10, token.decimals);

        // Send All Amount when it's an asset
        if (token.assetName != 'Algo') {
            setAmountInput(splitUntil(thousandSeparator(amount), token.decimals))
            if (balance != null) setUsdInput(roundAmount(amount * balance, 2))
            setError({ ...error, amount: false })
            return;
        }

        // Check Minimum Balance
        const minimum = await getMinimum(asset)

        if (amount > minimum) {
            /**
             * Using JS substraction, return weirds result. Ex:
             * 0.201 - 0.299 = 0.09799999999999998
             */
            let amountDecimal = new Decimal(amount)

            // Need to make it safe
            // Decimal Error: new Decimal() number type has more than 15 significant digits: 8.124999999999995
            let safeMinimum = Number(minimum.toFixed(token.decimals))
            let safeAmountToTransfer = Number(amountDecimal.minus(safeMinimum).toString())
            setAmountInput(splitUntil(thousandSeparator(safeAmountToTransfer), token.decimals))
            setUsdInput(roundAmount((safeAmountToTransfer) * balance, 2))
        }

        setError({ ...error, amount: false })
    }

    const getMinimum = async (asset) => {
        var uniqueUsers: any = []

        if (token == null) return 0

        // Count total users that has the asset
        asset.forEach((a) => {
            if (!uniqueUsers.includes(a['owned-by'])) {
                uniqueUsers.push(a['owned-by'])
            }
        })

        let dappPool :any = await getPool(); 

        const totalAsset = asset === undefined ? [] : asset

        let details : any= await getAmount(dappPool ? dappPool.activeAddress : token['owned-by']);

        // Regular Account
        if (dappPool == null) {
            // 1000 Microalgo for tx fee + 0.1 ALGO min balance + 0.1 per Asset
            return (details.minimumBalance / Math.pow(10, token.decimals))
        } else {

            // DApp Accounts
            // Please Remember that sub accounts may have more than minimum balance
            let details : any= await getAmount(dappPool.activeAddress);

            let currentAlgo = details.amount / 1e6;

            // Dapp Account
            const minimum = (details.minimumBalance / Math.pow(10, token.decimals))

            const total = (token.microalgos / Math.pow(10, token.decimals)) - currentAlgo;

            return total + minimum
        }
    }

    const getPool = () => {
        return new Promise((resolve, reject) => {
            store.getPool(ledger, token['owned-by'], (res) => {
                resolve(res)
            })
        })
    }

    // Helper function for getting amount
    const getAmount = (address) => {
        return new Promise((resolve, reject) => {
            const params = {
                ledger: ledger,
                address: address,
                currency: store.getSettingCurrency()['alias']
            }

            if (accountDetails != null) {
                resolve(accountDetails)
                return;
            }

            sendMessage(JsonRpcMethod.CalculateMinimumBalance, params, function (response) {
                setAccountDetails(response)
                resolve(response)
            })
        })
    }

    const sendTx = () => {
        const data: any = {
            amount: sanitizeInput(amountInput),
            to: state.to,
            note: state.note,
            token: token,
            curency: Math.floor((Math.random() * 1000000) + 1),
            from: token['owned-by'] || store.getChosenAccountAddress(),
            usdPrice: balance ? roundAmount(sanitizeInput(amountInput) * balance, 2) : null,
        }
        store.sendCrypto(data)
        route(`${ledger}/${address}/send/confirm`)
    };

    const setAssetHandler = (asset) => {
        setAsset(asset)
    }

    const usdInputHandler = (event) => {

        let input = sanitizeInput(event.target.value)

        // If value is invalid
        if (!input) {
            if (event.target.value.substr(-1) == '0' && event.target.value.includes(".")) {
                setUsdInput(sliceMaxCharacters(event.target.value, 2))
            }else {
                setUsdInput(`0${event.target.value == '0.' ? '.' : ''}`)
            }
            setAmountInput(0)
            checkValidationHandler(0)
            return;
        }

        // Allow Multiple zeros behind comma (ex 2.23009)
        if (event.target.value.includes(".") && event.target.value.substr(-1) == "0") {
            setUsdInput(sliceMaxCharacters(event.target.value, 2))
            setAmountInput(splitUntil(thousandSeparator(input / balance), token.decimals))
            checkValidationHandler(0);
            return;
        }

        input = parseFloat(sliceMaxCharacters(input, 2))

        // Thousand Separator for USD & Amount
        setUsdInput(`${thousandSeparator(input)}${event.target.value.substr(-1) == '.' ? '.' : ''}`)
        setAmountInput(splitUntil(thousandSeparator(input / balance), token.decimals))
        checkValidationHandler(input / balance);
    }

    /**
     * 
     * @param input 
     * @returns number | String
     */
    const sanitizeInput = (input) => {
        if (input) {
            return parseFloat(input.replace(/,/g, ""))
        }
        return 0;
    }

    const changeSelectedToken = (value) => {
        setUsdInput('')
        setAmountInput('')
        setToken(value)
    }

    return html`
        <div class="main-view" style="flex-direction: column;">
            <${Header} />
            <h1 class="px-4 title-send mt-4">send</h1>
            <${SelectToken} setAssetHandler=${setAssetHandler} ledger=${ledger} address=${address}
                setToken=${changeSelectedToken} token=${token} setError=${setError} states=${state} />
            <div class="flex px-4 mt-3">
                <span>
                    Amount
                </span>
                <button class="btn-outline button is-outlined mese-btn-outlined max-btn" onclick=${submitMax} 
                disabled=${token===null ||
                    token.amount <=0 || !maxAvailable}>
                    <span>MAX</span>
                </button>
            </div>
            <div class="flex px-4">
                <label>${token === null ? "-" : token["unit-name"] || 'Algo'}</label>
                ${balance && html`
                <label style="margin-right: 147px;">${store.getSettingCurrency()['alias']}</label>
                `}
            </div>
            <div class="flex px-4 mt-1">
                <div class="flex-col" style="margin-top: 1px">
                    <input type="text" class=${error.amount ? 'redBottom' : 'inputBottom' } step="0.1" min="0"
                        onInput=${handleChange('amount')} value=${amountInput} disabled=${token===null} />
                </div>
                ${balance && html`
                <div class="flex-col">
                    <input type="text" class="inputBottom" min="0" onInput=${usdInputHandler} value=${usdInput}
                        disabled=${token===null} />
                </div>
                `}
            </div>
            <div class="flex px-4">
                ${error.amount ? html`<p class="help is-danger" style="display: flex; align-items: center"><img src=${alert}
                        style="margin-right: 5px" /> Insufficient funds.</p>` : null}
                <div />
            </div>
            <div class=${error.amount ? "px-4 mt-3" : "px-4 mt-5"}>
                <p class="mese-text mese-12"> To </p>
                <div class="control has-icons-right mt-1">
                    <input class=${error.to ? 'input mese-input text-input is-danger' : 'input mese-input text-input' }
                        type="text" placeholder="Address" value=${state.to} onInput=${handleChange('to')}
                        disabled=${token===null} />
                    ${error.to ? html`<p class="help is-danger" style="display: flex; align-items: center"><img src=${alert}
                            style="margin-right: 5px;margin-bottom: 1px" /> Address is invalid</p>` : null}
                </div>
            </div>
        
            <div class=${error.to ? "px-4 mt-3" : "px-4 mt-5"}>
                <p class="mese-text mese-12"> Note </p>
                <textarea class="text-area mt-1" type="text" placeholder="Add an optional note" value=${state.note} rows="3"
                    onInput=${handleChange('note')} disabled=${token===null} />
                </div>
                        <span class="text-bottom px-4 mt-2">*There is a 0.001 ALGO fee for every send transaction.</span>
                        <div class="mt-2 px-4 mb-2">
                            <!-- <button class="button is-fullwidth is-outlined mese-btn-outlined "
                                    onClick=${sendTx}
                                    disabled=${state.to.length !== 58 || amountInput <= 0}
                            >
                                <span class="mr-3">CONFIRM DETAILS</span>
                            </button> -->

                            <${MeseButton}
            disabled=${state.to.length !== 58 || amountInput <= 0}
            onClick=${sendTx}
            text="CONFIRM DETAILS"
          />
                        </div>
                        <div class="px-4" style="display: flex;align-items: center;justify-content: center">
                            <span class="cancel" onclick=${() => route('/wallet')}>CANCEL</span>
                        </div>
                </div>
    `;
};
export default ConfirmSend;
