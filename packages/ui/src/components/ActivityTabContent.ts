import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { useObserver } from 'mobx-react-lite';

import { StoreContext } from 'services/StoreContext';
import { sendMessage } from 'services/Messaging';
import { JsonRpcMethod } from '@mese/common/messaging/types';
import back from 'assets/back.svg';
import { assetFormat, roundAmount } from 'services/common';

const ActivityTabContent: FunctionalComponent = () => {
  const store: any = useContext(StoreContext);

  const [transactions, setTransactions] = useState<any>([]);

  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [nextToken, setNextToken] = useState<any>(null);
  const [assets, setAssets] = useState<any>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [address, setAddress] = useState<any>(null);
  const [first, setFirst] = useState<boolean>(true);

  const { ledger } = store;

  const paginated = 10;
  const [pageNumber, setPageNumber] = useState<number>(1);

  // Track currency when change
  const [currency, setCurrency] = useState<any>('');
  const [selectedCurrency, setSelectedCurrency] = useState<boolean>(true);

  let interval;

  useEffect(() => {
    if (store.getChosenAccountAddress() === null) {
        setLoading(false)
        return
    }

    // Make sure that fetchActivity called once in use effect
    if (first || address != store.getChosenAccountAddress() || selectedCurrency != store.getSettingCurrency()['alias']) {
      setLoading(true);
      setAddress(store.getChosenAccountAddress())
      setFirst(false)
      setNextToken(null)
      setTransactions(null);
      fetchActivity(false);
    }

    // Check Pending Transactions every 2 seconds
    // let interval = setInterval(() => {
    //   checkPendingTransactions();
    // }, 2000)

    return () => {clearInterval(interval);}
  }, [store.getChosenAccountAddress(), transactions, currency]);

  const noAccount = () => {
    return store.getChosenAccountAddress() === null
  }

  const checkPendingTransactions = () => {

    // If Pending transactions is null, do nothing
    if (transactions == null) return;

    // Get Pending Transactions
    let pendingTransactions = transactions.filter((item) => {
      return item['payment-transaction'] == undefined && item['asset-transfer-transaction'] == undefined
    })

    // If pending Transaction Not Found, do nothing
    if (pendingTransactions.length == 0) {
      clearInterval(interval)
      return;
    }

    // Fetch Transaction
    const params = {
      ledger: ledger,
      address: store.getChosenAccountAddress(),
      limit: 10,
      currency: store.getSettingCurrency()['alias'],
    };
    
    // Get Transactions
    sendMessage(JsonRpcMethod.Transactions, params, function (response) {
      pendingTransactions.forEach((item) => {

        /**
         * Update/Find Pay Type
         */
        let tx = response.transactions.find((txItem) => {
          return txItem['tx-type'] == 'pay' 
          && item.amount == txItem['payment-transaction'].amount
          && item.receiver == txItem['payment-transaction'].receiver
          && item.sender == txItem.sender
        })

        // Update Pay Transaction
        if (tx) {
          updateTransaction(tx, 'pay')
        }
       
        /**
         * Update/Find Axfer Type
         */
        let axferTx = response.transactions.find((txItem) => {
          return txItem['tx-type'] == 'axfer' 
          && item.amount == txItem['asset-transfer-transaction'].amount
          && item.id == txItem['asset-transfer-transaction']['asset-id']
          && item.receiver == txItem['asset-transfer-transaction'].receiver
          && item.sender == txItem.sender
        })
        // Update Axfer Transaction
        if (axferTx) {
          updateTransaction(axferTx, 'axfer')
        }
    })
  })

  }

  const updateTransaction = (transaction, type) => {
     let foundIndex = transactions.findIndex((item) => {
       if (type == 'pay') {
         return item.amount == transaction['payment-transaction']?.amount
       }
       if (type == 'axfer') {
        return item.amount == transaction['asset-transfer-transaction']?.amount 
        && item.id == transaction['asset-transfer-transaction']['asset-id']
       }
    })

    transactions[foundIndex] = transaction

    if (type == 'axfer') {
      /**
       * Axfer type need to fetch the Asset Details first (for getting the asset name)
       */
      const params = {
        ledger: ledger,
        address: store.getChosenAccountAddress(),
        currency: store.getSettingCurrency()['alias']
      };
      sendMessage(JsonRpcMethod.AccountDetails, params, function (assetResponse) {
        setAssets(assetResponse.assets);
        return setTransactions([...transactions]);
      });
    } else {
      return setTransactions([...transactions]);
    }

  }

  const loadMore = () => {
    setPageNumber(pageNumber + 1)
  };

  const fetchActivity = async (nextTokenAvailable = true) => {
    const params = {
      ledger: ledger,
      address: store.getChosenAccountAddress(),
      // limit: paginated,
      currency: store.getSettingCurrency()['alias'],
    };

    if (nextToken && nextTokenAvailable) {
      params['next-token'] = nextToken;
    }

    sendMessage(JsonRpcMethod.GetAllTransactions, params, function (response) {

      sendMessage(JsonRpcMethod.GetAllAssets, params, function (assetResponse) {
        setAssets(assetResponse.assets);

        // Change Address when user open activity or changing currency
        if (address == null || (address == store.getChosenAccountAddress() && selectedCurrency == store.getSettingCurrency()['alias'])) {
          setAddress(store.getChosenAccountAddress());
          setSelectedCurrency(store.getSettingCurrency()['alias'])
          setTransactions(response.pending.concat(transactions.concat(response.transactions)));
        } else {
          setAddress(store.getChosenAccountAddress());
          setSelectedCurrency(store.getSettingCurrency()['alias'])
          setPageNumber(1)
          setSelectedTransaction(null)
          setTransactions(response.pending.concat(response.transactions));
        }
      setLoading(false)
      })
    })
  };


  function formatTime(time) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const date = new Date(time * 1000);

    // Get AM/PM Format
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    let hours = date.getHours() % 12;
    hours = hours ? hours : 12;

    return `${date.getDate()} ${
      months[date.getMonth()]
    }, ${date.getFullYear()} | ${hours}:${date.getMinutes()}${ampm}`;
  }

  const DetailTransaction = () => {
    const tx = selectedTransaction;

    const parsedTx = parseTxData(tx);

    const isPending = parsedTx?.isPending;

    // const isReceived = store.getChosenAccountAddress() != parsedTx?.from;
    const isReceived = parsedTx?.isReceived;

    const amount = `${parsedTx?.amount}`;

    let address = parsedTx?.from;

    if (!isReceived && parsedTx?.to !== undefined) {
      address = parsedTx?.to;
    }

    return html`
      <div class="mese-text mese-10 container-activity-detail">
        <div
          class="custom-row cursor-pointer"
          style="align-items: flex-start"
          onClick=${() => setSelectedTransaction(null)}
        >
          <div>
            <img src=${back} class="" width="5" />
          </div>
          ${parsedTx?.amount !== undefined &&
          html`
            <div class="ml-3 is-uppercase">${isReceived ? 'Received ' : 'Sent '} ${amount}</div>
          `}
          ${parsedTx?.amount === undefined && 
          html `
          <div class="ml-3 is-uppercase">${parsedTx?.message}</div>
          `
          }
        </div>

        <div class="custom-row row-activity-detail selectable small-letter-spacing">
          <div>Transaction Hash</div>
          <div class="row-value"
            ><span
              ><a
                class="no-hover"
                href="${store.goToExplorer('tx', parsedTx?.txId)}"
                target="_blank"
                >${isPending? '' : parsedTx?.txId.slice(0, 20)}</a
              ></span
            ></div
          >
        </div>

        <div class="custom-row row-activity-detail small-letter-spacing">
          <div>${isReceived ? 'From' : 'To'}</div>
          <div class="row-value">${address.slice(0, 6)}...${address.slice(-3)}</div>
        </div>

        ${parsedTx?.price && html `
        <div class="custom-row row-activity-detail small-letter-spacing">
          <div>Unit Price Of Asset</div>
          <div>${parsedTx?.price} ${store.getSettingCurrency()['alias']}</div>
        </div>
        `}

        ${parsedTx?.total && html `
        <div class="custom-row row-activity-detail small-letter-spacing">
          <div>Total</div>
          <div>${parsedTx?.total} ${store.getSettingCurrency()['alias']}</div>
        </div>
        `}

        <div class="custom-row row-activity-detail small-letter-spacing">
          <div>Status</div>
          <div class="row-value">${parsedTx?.isPending ? 'Pending' : 'Completed'}</div>
        </div>
      </div>
    `;
  };

  function getAssetObject(assetId) {
    const asset = assets.find((asset) => {
      return asset['asset-id'] == assetId;
    });

    return asset;
  }

  const usdBalance = (balance, amount) => {
    if (amount != null) {
      amount = amount.toString().replace(/,/g, "")
    }
    if (balance !== null) {
        return roundAmount(balance * parseFloat(amount), 2);
    }

    return null;
  }

  const payType = (tx) => {
    let isPending = tx['payment-transaction'] == undefined;

    let message = ''
    if (isPending) {
      message = `${tx.amount / 1e6} Algo`;

    }else {
      message = `${tx['payment-transaction'].amount / 1e6} Algo`;
    }

    const isReceived = tx['owned-by'] != tx.sender;

    if (!isReceived) {
      message = 'Sent ' + message;
    } else {
      message = 'Received ' + message;
    }

    let amount = isPending 
      ? tx.amount / 1e6 
      : tx['payment-transaction'].amount / 1e6;

    return {
      txId: tx.id ?? '',
      from: tx.sender,
      to: isPending ? tx.receiver : tx['payment-transaction'].receiver,
      amount: `${amount} Algo`,
      block: tx['confirmed-round'] ?? '',
      message: message,
      isPending: isPending,
      total: tx['payment-transaction'] ? usdBalance(tx['payment-transaction'].price, amount) : null,
      price: tx['payment-transaction'] ? roundAmount(tx['payment-transaction'].price, 2) : null,
      isReceived: isReceived,
    };
  };

  const axferType = (tx) => {

    let isPending = tx['asset-transfer-transaction'] == undefined;

    const assetObject = isPending ? tx['id'] : getAssetObject(tx['asset-transfer-transaction']['asset-id']);

    /**
     * Select Asset Name
     */
    let assetName = '-';
    if (isPending) {
      assetName = tx['assetName'] ?? 'Asset'
    } else {
      assetName = assetObject ? (assetObject.name || 'Asset') : 'Asset'
    }

    const isReceived = tx['owned-by'] != tx.sender;

    let amount = isPending? (tx['amount'] ?? '0') : (tx['asset-transfer-transaction']['amount'] ?? '0')

    amount = assetFormat(amount, assetObject ? assetObject.decimals : 0);

    let message = `${amount} ${assetName}`;

    if (!isReceived) {
      message = 'Sent ' + message;
    } else {
      message = 'Received ' + message;
    }

    return {
      txId: tx.id ?? '',
      from: tx.sender,
      to: isPending ? tx['receiver'] : (tx['asset-transfer-transaction'].receiver || tx['owned-by']),
      amount: `${isPending ? tx['amount'] : (amount + ' ' + assetName)}`,
      block: tx['confirmed-round'],
      message: message,
      isPending: isPending,
      total: tx['asset-transfer-transaction'] ? usdBalance(tx['asset-transfer-transaction'].price, amount) : null,
      price: tx['asset-transfer-transaction'] ? roundAmount(tx['asset-transfer-transaction'].price, 2) : null,
      isReceived: isReceived
    };
  };

  const keyregType = (tx) => {
    return {
      txId: tx.id,
      from: tx.sender,
      to: undefined,
      amount: undefined,
      block: tx['confirmed-round'],
      message: undefined,
      isPending: false,
      total: 0,
      price: undefined,
      isReceived: false
    };
  };

  const acfgType = (tx) => {
    return {
      txId: tx.id,
      from: tx.sender,
      to: undefined,
      amount: undefined,
      block: tx['confirmed-round'],
      message: `Asset Name: ${tx['asset-config-transaction']['params']['name']}`,
      isPending: false,
      total: 0,
      price: undefined,
      isReceived: false
    };
  };

  const afrzType = (tx) => {
    return {
      txId: tx.id,
      from: tx.sender,
      to: undefined,
      amount: undefined,
      block: tx['confirmed-round'],
      message: `Freezed address: ${tx['asset-freeze-transaction']['address']}`,
      isPending: false,
      total: 0,
      price: undefined,
      isReceived: false
    };
  };

  const applType = (tx) => {
    return {
      txId: tx.id,
      from: tx.sender,
      to: undefined,
      amount: undefined,
      block: tx['confirmed-round'],
      message: `APP ${tx['application-transaction']['application-id']} Call`,
      isPending: false,
      total: 0,
      price: undefined,
      isReceived: false
    };
  };

  const parseTxData = (tx) => {
    if (tx['tx-type'] == 'pay' || tx['type'] == 'pay') {
      return payType(tx);
    }
    if (tx['tx-type'] == 'axfer' || tx['type'] == 'axfer') {
      return axferType(tx);
    }
    if (tx['tx-type'] == 'keyreg') {
      return keyregType(tx);
    }
    if (tx['tx-type'] == 'acfg') {
      return acfgType(tx);
    }
    if (tx['tx-type'] == 'afrz') {
      return afrzType(tx);
    }
    if (tx['tx-type'] == 'appl') {
      return applType(tx);
    }
  };

  const ActivityTabRow = (innerProps) => {
    const { darkColor, tx } = innerProps;

    const parsedTx = parseTxData(tx);

    const isReceived = parsedTx?.isReceived;

    let address = parsedTx?.from;

    if (!isReceived && parsedTx?.to !== undefined) {
      address = parsedTx?.to;
    }

    // Check if TX is Pending
    let time = formatTime(tx['round-time']);
    if (parsedTx?.isPending) {
      time = 'Pending'
    }

    return html`
      <div
        class="mese-text mese-12 tab-yield cursor-pointer"
        onClick=${() => setSelectedTransaction(tx)}
        style="${darkColor == 'true' ? 'background: #393939' : ''}"
      >
        <div class="custom-row mese-10 tab-yield-content selectable">
          <div>${time}</div>
          <div
            >${isReceived ? 'From: ' : 'To: '}
            <span
              ><a class="no-hover" href="${store.goToExplorer('address', address)}" target="_blank"
                >${address.slice(0, 6)}...${address.slice(-3)}</a
              ></span
            ></div
          >
        </div>
       
        <div class="custom-row tab-yield-content">
          <div>${parsedTx?.message}</div>
          ${parsedTx?.total && html `
          <div class="has-text-right">${parsedTx?.total} ${store.getSettingCurrency()['alias']}</div>
        `}
        </div>
      </div>
    `;
  };

  return useObserver(() => {
    const { ledger, selectedCurrency } = store;
    setCurrency(selectedCurrency)
  return html`
    <div class="p-4">
    ${noAccount() && html `
    <div class="mese-text mese-12 no-account-container has-text-centered">
    Data isn’t available until account is created and connected
    </div>
    `}
      ${selectedTransaction != null && html` <${DetailTransaction} /> `}
      ${selectedTransaction == null &&
      transactions &&
      transactions.slice(0, pageNumber * paginated).map((tx: any, index) => {
        return html`
          <${ActivityTabRow} tx=${tx} darkColor="${index % 2 == 0 ? 'true' : 'false'}" />
        `;
      })}
      ${!loading && transactions.length === 0 && store.getChosenAccountAddress() !== null&& html `
      <div class="mese-text mese-14 selectable tab-yield-no-farms mt-6">
        You don't have any transactions
      </div>
      `}
      ${loading && !noAccount() && html` <span class="loader mt-4" style="margin: auto;"></span> `}
      ${!loading &&
      transactions.length / paginated > pageNumber &&
      selectedTransaction === null &&
      html`
        <div
          onClick=${loadMore}
          class="mese-text mese-12 mt-4 cursor-pointer"
          style="text-align: center;"
          >Load More</div
        >
      `}
    </div>
  `;
  })
};

export default ActivityTabContent;
