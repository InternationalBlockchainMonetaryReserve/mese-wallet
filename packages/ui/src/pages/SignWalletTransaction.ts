import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useContext, useEffect, useState } from 'preact/hooks';

import { JsonRpcMethod } from '@mese/common/messaging/types';
import { isFromExtension } from '@mese/common/utils';

import Authenticate from 'components/Authenticate';
import { sendMessage } from 'services/Messaging';
import { StoreContext } from 'services/StoreContext';
import { getBaseSupportedLedgers } from '@mese/common/types/ledgers';
import SignAllTransactionButton from 'components/SignTransaction/SignAllTransactionBtn';
import RejectTransactionButton from 'components/SignTransaction/RejectTransactionBtn';
import MainHeader from 'components/MainHeader';
import BackNavbar from 'components/BackNavbar';
import { windowPopup, disableBackGesture } from 'helpers/helpers';

import SignTransactionArrow from '../assets/sign-transaction-arrow.svg';

function deny() {
  const params = {
    responseOriginTabID: responseOriginTabID,
  };
  sendMessage(JsonRpcMethod.SignDeny, params, function () {
    // No callback
  });
}

let responseOriginTabID = 0;

const SignWalletTransaction: FunctionalComponent = () => {
  const store: any = useContext(StoreContext);
  const [askAuth, setAskAuth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [request, setRequest] = useState<any>({});
  const [ledger, setLedger] = useState<string>('');
  const [approvals, setApprovals] = useState<Array<boolean>>([]);
  const [accountNames, setAccountNames] = useState<Array<string>>([]);
  const [isDAppAccount, setIsDAppAccount] = useState<boolean>(false);
  const [isScrollable, setIsScrollable] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isBottomList, setIsBottomList] = useState<boolean>(false);
  const [isTransactionDetail, setIsTransactionDetail] = useState<boolean>(false);
  const [transaction, setTransaction] = useState<any>({});
  const [walletType, setWalletType] = useState<string>('');

  const [windowWidth, setWindowWidth] = useState<number>(400);
  const [windowHeight, setWindowHeight] = useState<number>(400);
  let transactionWraps: Array<any> = [];

  useEffect(() => {
    chrome.runtime.onMessage.addListener((request, sender: any) => {
    
      const winSize = windowPopup()
      setWindowWidth(winSize.width );
      setWindowHeight(winSize.height);

      // Store wallet type (MESE/AlgoSigner)
      setWalletType(request.body.params.walletType);

      // Check if a message has already been recieved
      if (Object.keys(request).length === 0) return false;

      // Check if the message is coming from the background script
      if (
        isFromExtension(sender.origin) &&
        request.body.method == JsonRpcMethod.MESESignWalletTransaction
      ) {
        setRequest(request);
        responseOriginTabID = request.originTabID;
      }
    });

    const checkScrollableTimer = setInterval(() => {
      const transactionList = document.getElementById('transactions-list');

      if (transactionList) {
        if (transactionList.children.length > 0) {
          transactionList.addEventListener('scroll', handleTransactionListScrolling);

          if (transactionList.scrollHeight > transactionList.clientHeight) {
            setIsScrollable(true);
          } else {
            setIsScrollable(false);
          }

          clearInterval(checkScrollableTimer);
        }
      }
    }, 100);

    window.addEventListener('beforeunload', deny);

    disableBackGesture()

    return () => {
      window.removeEventListener('beforeunload', deny);
    };
  }, []);

  const changeToTransactionDetailPage = (index: number, transaction: any) => {
    setIsTransactionDetail(true);
    setTransaction({ index, body: transaction });
  };

  const changeToTransactionList = () => {
    setIsTransactionDetail(false);
  };

  const sign = (pwd: string) => {
    const params = {
      passphrase: pwd,
      responseOriginTabID: responseOriginTabID,
      walletType: walletType,
    };
    setLoading(true);
    setAuthError('');
    window.removeEventListener('beforeunload', deny);

    // If it's from the DApp Accounts. Then let DApp manager handle the transactions before signing in
    sendMessage(
      JsonRpcMethod.DAppManager_AssetTransfer,
      {
        wraps: request.body.params.transactionWraps,
        ledger,
        origin: request.origin,
        passphrase: pwd,
      },
      function (response) {
        if (response != null && 'error' in response) {
          window.addEventListener('beforeunload', deny);
          setLoading(false);
          switch (response.error) {
            case 'Login Failed':
              setAuthError('Wrong passphrase');
              break;
            default:
              let errorMessage = JSON.parse(response.error)
              errorMessage = errorMessage.message || errorMessage
              setAuthError(errorMessage);
              break;
          }
        } else {
          sendMessage(JsonRpcMethod.SignAllowWalletTx, params, function (response) {
            if ('error' in response) {
              window.addEventListener('beforeunload', deny);
              setLoading(false);
              switch (response.error) {
                case 'Login Failed':
                  setAuthError('Wrong passphrase');
                  break;
                default:
                  setAskAuth(false);
                  break;
              }
            }
          });
        }
      }
    );
  };

  const findAccountNames = (ledger) => {
    const newAccountNames = accountNames.slice();
    for (let i = 0; i < store[ledger].length; i++) {
      transactionWraps.forEach((wrap, index) => {
        const lookupAddress = store[ledger][i].address;
        const lookupName = store[ledger][i].name;
        const msigData = wrap.msigData;
        const signers = wrap.signers;
        if (signers && !signers.length) {
          newAccountNames[index] = "Reference Transaction (won't be signed)";
        } else {
          if (
            msigData &&
            msigData.addrs.includes(lookupAddress) &&
            (!signers || signers.includes(lookupAddress))
          ) {
            if (newAccountNames[index]) {
              newAccountNames[index] = `${newAccountNames[index]},\n${lookupName}`;
            } else {
              newAccountNames[index] = lookupName;
            }
          } else if (lookupAddress === wrap.transaction.from) {
            newAccountNames[index] = lookupName;
          }
        }
      });
    }
    setAccountNames(newAccountNames);
  };

  const numberWithCommas = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const getAmount = (num) => {
    return num / Math.pow(10, 6);
  };

  const scrollTransactionsListUp = () => {
    const transactionList = document.getElementById('transactions-list');

    if ((transactionList && !transactionList.scrollTop) || 0 === transactionList?.scrollTop) {
      transactionList.scrollTop = 1;
    }

    if (transactionList && transactionList.scrollTop) {
      transactionList.scrollTop -= 21;
    }
  };

  const scrollTransactionsListDown = () => {
    const transactionList = document.getElementById('transactions-list');

    if ((transactionList && !transactionList.scrollTop) || 0 === transactionList?.scrollTop) {
      transactionList.scrollTop = 1;
    }

    if (transactionList && transactionList.scrollTop) {
      transactionList.scrollTop += 21;
    }
  };

  if (request.body && !transactionWraps.length) {
    transactionWraps = request.body.params.transactionWraps;

    setIsDAppAccount(request.body.params.DAppTransactions ?? false);

    // Remove Transactions that don't need user to sign
    const transactionSignWraps: any = []; // Will hold transactions that need user to sign
    transactionWraps.forEach((item) => {
      if (!item.signers || item.signers.length > 1) {
        transactionSignWraps.push(item);
      }
    });
    if (transactionSignWraps.length >= 1) {
      transactionWraps = transactionSignWraps;
    }

    // Initialize per-tx variables
    if (!approvals.length && transactionWraps.length) {
      setApprovals(new Array(transactionWraps.length).fill(false));
    }
    if (!accountNames.length && transactionWraps.length) {
      setAccountNames(new Array(transactionWraps.length).fill(''));
    }

    if (!ledger) {
      // Search for ledger and find accounts
      let txLedger;
      getBaseSupportedLedgers().forEach((l) => {
        if (transactionWraps[0].transaction.genesisID === l['genesisId']) {
          txLedger = l['name'];
          setLedger(txLedger);
          findAccountNames(txLedger);
        }
      });

      // Add on any injected ledgers
      if (txLedger === undefined) {
        let sessionLedgers;
        store.getAvailableLedgers((availableLedgers) => {
          if (!availableLedgers.error) {
            sessionLedgers = availableLedgers;
            sessionLedgers.forEach((l) => {
              if (transactionWraps[0].transaction.genesisID === l['genesisId']) {
                txLedger = l['name'];
              }
            });

            setLedger(txLedger);
            findAccountNames(txLedger);
          }
        });
      } else {
        setLedger(txLedger);
      }
    }
  }

  const getWrapUI = (index, wrap, lastIndex) => {
    return html`
      <section
        class="section py-0"
        style="padding-left: 20px; padding-right: 20px; margin-bottom: 18px;"
      >
        <div style="${!lastIndex ? 'border-bottom: 1px solid white;' : ''}">
          ${wrap.transaction.type === 'pay' &&
          html`
            <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Transaction ${index + 1}</span>
              </div>
              <div>
                <span class="mese-text mese-12 mese-bold-400">Payment</span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Group ID</span>
              </div>
              <div>
                <span class="mese-text mese-12 mese-bold-400 truncate-transaction-address">
                  ${wrap.transaction.group.substr(0, 8)}....${wrap.transaction.group.substr(
                    wrap.transaction.group.length - 7,
                    wrap.transaction.group.length - 1
                  )}
                </span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Recipient</span>
              </div>
              <div>
                <span class="mese-text mese-12 mese-bold-400 truncate-transaction-address">
                  ${wrap.transaction.to.substr(0, 8)}....${wrap.transaction.to.substr(
                    wrap.transaction.to.length - 7,
                    wrap.transaction.to.length - 1
                  )}
                </span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Amount</span>
              </div>
              <div>
                <span class="mese-text mese-12 mese-bold-400">
                  ${getAmount(wrap.transaction.amount)} Algos
                </span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">
                  ${!wrap.estimatedFee || wrap.transaction['flatFee'] ? 'Fee:' : 'Estimated fee:'}
                </span>
              </div>
              <div>
                <span class="mese-text mese-12 mese-bold-400">
                  ${getAmount(wrap.estimatedFee ? wrap.estimatedFee : wrap.transaction['fee'])}
                  Algos
                </span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Total</span>
              </div>
              <div>
                <span class="mese-text mese-12 mese-bold-400">
                  ${getAmount(
                    (wrap.estimatedFee ? wrap.estimatedFee : wrap.transaction.fee) +
                      wrap.transaction.amount
                  )}
                  Algos
                </span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 18px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Transaction Details</span>
              </div>
              <div>
                <span
                  class="mese-text mese-12 mese-bold-400 mese-underline is-clickable"
                  onClick="${() => changeToTransactionDetailPage(index, wrap.transaction)}"
                >
                  VIEW HERE
                </span>
              </div>
            </div>
          `}
          ${wrap.transaction.type === 'axfer' &&
          html`
            <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Transaction ${index + 1}</span>
              </div>
              ${wrap.transaction.group &&
              html`
                <div>
                  <span class="mese-text mese-12 mese-bold-400">Asset Transfer</span>
                </div>
              `}
              ${!wrap.transaction.group &&
              html`
                <div>
                  <span class="mese-text mese-12 mese-bold-400"
                    >${wrap.transaction.amount > 0 ? 'Asset Transfer' : 'Asset Opt-In'}</span
                  >
                </div>
              `}
            </div>
            ${wrap.transaction.group &&
            html`
              <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
                <div>
                  <span class="mese-text mese-12 mese-bold-400">Group ID</span>
                </div>
                <div>
                  <span class="mese-text mese-12 mese-bold-400 truncate-transaction-address">
                    ${wrap.transaction.group.substr(0, 8)}
                    ....${wrap.transaction.group.substr(
                      wrap.transaction.group.length - 7,
                      wrap.transaction.group.length - 1
                    )}
                  </span>
                </div>
              </div>
            `}
            ${wrap.transaction.group &&
            html`
              <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
                <div>
                  <span class="mese-text mese-12 mese-bold-400">Recipient</span>
                </div>
                <div>
                  <span class="mese-text mese-12 mese-bold-400 truncate-transaction-address">
                    ${wrap.transaction.to.substr(0, 8)}
                    ....${wrap.transaction.to.substr(
                      wrap.transaction.to.length - 7,
                      wrap.transaction.to.length - 1
                    )}
                  </span>
                </div>
              </div>
            `}
            <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Asset ID</span>
              </div>
              <div>
                <span class="mese-text mese-12 mese-bold-400">${wrap.transaction.assetIndex}</span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Amount</span>
              </div>
              <div>
                <span class="mese-text mese-12 mese-bold-400">
                  ${wrap.transaction.amount ? numberWithCommas(wrap.transaction.amount) : 0}
                </span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Fee</span>
              </div>
              <div>
                <span class="mese-text mese-12 mese-bold-400">
                  ${getAmount(wrap.transaction.fee)} Algos
                </span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 18px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Transaction Details</span>
              </div>
              <div>
                <span
                  class="mese-text mese-12 mese-bold-400 mese-underline is-clickable"
                  onClick="${() => changeToTransactionDetailPage(index, wrap.transaction)}"
                >
                  VIEW HERE
                </span>
              </div>
            </div>
          `}
          ${wrap.transaction.type === 'appl' &&
          html`
            <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Transaction ${index + 1}</span>
              </div>
              ${wrap.transaction.group &&
              html`
                <div>
                  <span class="mese-text mese-12 mese-bold-400">Application</span>
                </div>
              `}
              ${!wrap.transaction.group &&
              html`
                <div>
                  <span class="mese-text mese-12 mese-bold-400">Application Opt-In</span>
                </div>
              `}
            </div>
            ${wrap.transaction.group &&
            html`
              <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
                <div>
                  <span class="mese-text mese-12 mese-bold-400">Group ID</span>
                </div>
                <div>
                  <span class="mese-text mese-12 mese-bold-400 truncate-transaction-address">
                    ${wrap.transaction.group.substr(0, 8)}....${wrap.transaction.group.substr(
                      wrap.transaction.group.length - 7,
                      wrap.transaction.group.length - 1
                    )}
                  </span>
                </div>
              </div>
            `}
            <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Application ID</span>
              </div>
              <div>
                <span class="mese-text mese-12 mese-bold-400">${wrap.transaction.appIndex}</span>
              </div>
            </div>
            ${wrap.transaction.appForeignAssets &&
            wrap.transaction.appForeignAssets.length > 0 &&
            html`
              <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
                <div>
                  <span class="mese-text mese-12 mese-bold-400">Foreign Assets</span>
                </div>
                <div>
                  <span class="mese-text mese-12 mese-bold-400">
                    ${wrap.transaction.appForeignAssets[0]}
                  </span>
                </div>
              </div>
            `}
            <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Fee</span>
              </div>
              <div>
                <span class="mese-text mese-12 mese-bold-400">
                  ${getAmount(wrap.transaction.fee)} Algos
                </span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 18px;">
              <div>
                <span class="mese-text mese-12 mese-bold-400">Transaction Details</span>
              </div>
              <div>
                <span
                  class="mese-text mese-12 mese-bold-400 mese-underline is-clickable"
                  onClick="${() => changeToTransactionDetailPage(index, wrap.transaction)}"
                >
                  VIEW HERE
                </span>
              </div>
            </div>
          `}
        </div>
      </section>
    `;
  };

  const handleTransactionListScrolling = () => {
    const transactionList = document.getElementById('transactions-list');

    if (transactionList) {
      if (
        transactionList.scrollHeight - transactionList.scrollTop <=
        transactionList.clientHeight
      ) {
        setIsBottomList(true);
      } else {
        setIsBottomList(false);
      }

      if (transactionList.scrollTop <= 0) {
        transactionList.scrollTop = 0;

        setIsScrolled(false);
      } else {
        setIsScrolled(true);
      }

      if (transactionList.scrollHeight > transactionList.clientHeight) {
        setIsScrollable(true);
      } else {
        setIsScrollable(false);
      }
    }

    return '';
  };

  const transformTransactionDetailValue = (value) => {
    if (typeof value === 'number') {
      value = value.toString();
    }

    if (value.length > 19) {
      return value.substr(0, 18) + '..';
    }

    return value;
  };

  return html`
    ${!isTransactionDetail &&
    html`
      <div
        style="
          display: flex;
          width: ${windowWidth}px;
          height: ${windowHeight}px;
        "
      >
        <div
          class="main-view mese-text mese-14 is-flex-direction-column is-justify-content-space-between"
          style="${transactionWraps.length > 1
            ? `min-height: ${windowHeight}px;`
            : ''}; 
            width: ${windowWidth}px;"
        >
          <${MainHeader} hideMenu=${true}/>
          ${request.body &&
          accountNames.length &&
          html`
            <div
              class="mese-text mese-14 mese-bold-900"
              style="padding: 25px 20px ${isScrolled ? '12px' : '18px'} 20px"
            >
              ${request.originTitle} wants to sign transactions for ${ledger} from account
              <span> ${accountNames[0]}</span>.
            </div>
          `}
          ${isScrollable &&
          html`
            <section class="has-text-centered mb-2" style="height: 9px">
              ${isScrolled &&
              html`
                <img
                  class="is-clickable"
                  onClick=${() => {
                    scrollTransactionsListUp();
                  }}
                  src=${SignTransactionArrow}
                  style="width: 18px; height: 9px; transform: rotate(180deg);"
                />
              `}
            </section>
          `}
          <div id="transactions-list" class="hide-scrollbar" style="overflow:auto; height: 380px;">
            ${request.body &&
            accountNames.length == transactionWraps.length &&
            transactionWraps.length > 1 &&
            html`
              ${transactionWraps.map(
                (_, index) => html`
                  ${getWrapUI(
                    index,
                    transactionWraps[index],
                    index === transactionWraps.length - 1
                  )}
                `
              )}
            `}
            ${request.body &&
            accountNames.length == transactionWraps.length &&
            transactionWraps.length === 1 &&
            html` ${getWrapUI(0, transactionWraps[0], true)} `}
          </div>
          ${isScrollable &&
          html`
            <section class="has-text-centered mt-4 mb-5" style="height: 9px;">
              ${!isBottomList &&
              html`
                <img
                  class="is-clickable"
                  onClick=${() => {
                    scrollTransactionsListDown();
                  }}
                  src=${SignTransactionArrow}
                  style="width: 18px; height: 9px;"
                />
              `}
            </section>
          `}
          ${request.body &&
          html`
            <div class="mx-5 mb-4" style="display: flex;">
              <${RejectTransactionButton} id="rejectTx" onClick=${deny} text="Reject" />
              <span class="ml-3"></span>
              <${SignAllTransactionButton}
                id="approveTx"
                onClick=${() => {
                  setAskAuth(true);
                }}
                text="${isDAppAccount
                  ? 'Agree'
                  : transactionWraps.length > 1
                  ? 'Sign All'
                  : 'Sign'}"
              />
            </div>
          `}
        </div>
      </div>
    `}
    ${isTransactionDetail &&
    html`
      <div class="main-view mese-text mese-14 is-flex-direction-column" style="min-height: 600px;">
        <${BackNavbar} url=${() => changeToTransactionList()} />
        <div class="mese-text mese-14 mese-bold-900" style="padding: 18px 20px">
          Transaction ${transaction.index + 1} details
        </div>
        <section
          class="section py-0"
          style="overflow: auto; padding-left: 20px; padding-right: 20px; height: 400px;"
        >
          ${Object.keys(transaction.body).map((key) => {
            return html`
              <div style="display: flex; justify-content: space-between; padding-bottom: 5px;">
                <div>
                  <span class="mese-text mese-12 mese-bold-400">${key}</span>
                </div>
                ${(typeof transaction.body[key] === 'string' ||
                  typeof transaction.body[key] === 'number') &&
                html`
                  <div>
                    <span class="mese-text mese-12 mese-bold-400"
                      >${transformTransactionDetailValue(transaction.body[key])}</span
                    >
                  </div>
                `}
                ${Array.isArray(transaction.body[key]) &&
                (typeof transaction.body[key][0] === 'string' ||
                  typeof transaction.body[key][0] === 'number') &&
                html`
                  <div>
                    <span class="mese-text mese-12 mese-bold-400"
                      >${transformTransactionDetailValue(transaction.body[key][0])}</span
                    >
                  </div>
                `}
                ${(null === transaction.body[key] ||
                  undefined === transaction.body[key] ||
                  (Array.isArray(transaction.body[key]) &&
                    !(typeof transaction.body[key][0] === 'string') &&
                    !(typeof transaction.body[key][0] === 'number')) ||
                  (typeof transaction.body[key] === 'string' &&
                    '' === transaction.body[key].trim())) &&
                html`
                  <div>
                    <span class="mese-text mese-12 mese-bold-400">-</span>
                  </div>
                `}
              </div>
            `;
          })}
        </section>
      </div>
    `}
    ${askAuth &&
    html`
      <div class="modal is-active">
        <div class="auth-modal-background modal-background"></div>
        <div class="modal-content">
          <${Authenticate} error=${authError} loading=${loading} nextStep=${sign} />
        </div>
        <button
          class="modal-close is-large"
          aria-label="close"
          onClick=${() => setAskAuth(false)}
        />
      </div>
    `}
  `;
};

export default SignWalletTransaction;
