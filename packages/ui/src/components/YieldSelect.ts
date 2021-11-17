import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { useObserver } from 'mobx-react-lite';
import { StoreContext } from 'services/StoreContext';
import arrowDown from '../assets/arrow-down.svg';

const YieldSelect: FunctionalComponent = (props: any) => {
  const {options, selectOptionHandler, selectedOption} = props;

  const [active, setActive] = useState<boolean>(false);

  let ddClass: string = 'dropdown is-right mr-1 tab-yield-dropdown';
  if (active) ddClass += ' is-active tab-yield-dropdown';

  const flip = () => {
    setActive(!active);
  };

  const changeOption = (index) => {
    selectOptionHandler(index)
    flip();
  };

  return useObserver(
    () => html`
      <div class=${ddClass}>
        <div class="dropdown-trigger">
          <div
            id="selectLedger"
            class="buttonSelect currency-select yield-select"
            onClick=${flip}
            aria-haspopup="true"
            aria-controls="dropdown-menu"
          >
            <span>${options[selectedOption]}</span>
            <span class="icon is-small ml-2">
              <img src=${arrowDown} />
            </span>
          </div>
        </div>
        <div class="dropdown-menu" id="dropdown-menu" role="menu">
          <div class="dropdown-mask" onClick=${flip} />
          <div class="dropdown-content">
            ${options.map(
              (option: any, index) =>
                html`
                  <a
                    onClick=${() => {changeOption(index)}}
                    class="dropdown-item"
                  >
                    ${option}
                  </a>
                `
            )}
          </div>
        </div>
      </div>
    `
  );
};

export default YieldSelect;
