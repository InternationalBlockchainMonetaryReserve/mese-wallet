import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext } from 'preact/hooks';
import { useObserver } from 'mobx-react-lite';
import { route } from 'preact-router';
import { JsonRpcMethod } from '@mese/common/messaging/types';
import { StoreContext } from 'services/StoreContext';
import { sendMessage } from 'services/Messaging';
import arrowDown from '../assets/arrow-down.svg';

interface Account {
  address: string;
  mnemonic: string;
  name: string;
}

const LedgerSelect: FunctionalComponent = () => {
  const store: any = useContext(StoreContext);
  const [active, setActive] = useState<boolean>(false);

  const [loadLedger, seLoadLedger] = useState<string>("");

  const { defaultMeseAccountName } = store;

  let sessionLedgers;
  store.getAvailableLedgers((availableLedgers) => {
    if (!availableLedgers.error) {
      sessionLedgers = availableLedgers;
    }
  });

  let ddClass: string = 'dropdown is-right mr-1';
  if (active) ddClass += ' is-active';

  const flip = () => {
    setActive(!active);
  };

  const setLedger = (ledger) => {
    const params = {
      ledger: ledger,
    };
    sendMessage(JsonRpcMethod.ChangeLedger, params, function () {
      seLoadLedger(ledger)

      flip();
      seLoadLedger("")
      store.setLedger(ledger);
      route('/wallet');
    });
  };

  const ledgerName = (ledger) => {
    switch(ledger) {
      case 'MainNet' :
        return 'Main Network'
      case 'TestNet' :
        return 'Test Network'
      case 'SandNet' : 
        return 'Sand Network'
      default:
        return ledger;
    }
  }
  return useObserver(
    () => html`
      <div class=${ddClass}>
        <div class="dropdown-trigger">
          <div
            id="selectLedger"
            class="buttonSelect"
            onClick=${flip}
            aria-haspopup="true"
            aria-controls="dropdown-menu"
          >
            <span>${ledgerName(store.ledger)}</span>
            <span class="icon is-small mr-1">
              <img src=${arrowDown} />
            </span>
          </div>
        </div>
        <div class="dropdown-menu" id="dropdown-menu" role="menu">
          <div class="dropdown-mask" onClick=${flip} />
          <div class="dropdown-content">
            ${sessionLedgers &&
            sessionLedgers.map(
              (availableLedger: any) =>
                html`
                  <a
                    id="select${availableLedger.name}"
                    onClick=${() => setLedger(availableLedger.name)}
                    class="dropdown-item"
                    style="display: flex; align-items: center; ${loadLedger !== '' ? 'pointer-events: none;' : ''}"
                  >
                    ${ledgerName(availableLedger.name)}
                    ${loadLedger === availableLedger.name && html `
                    <span class="loader ml-2"></span>
                    `
                  }
                  </a>
                `
            )}
          </div>
        </div>
      </div>
    `
  );
};

export default LedgerSelect;
