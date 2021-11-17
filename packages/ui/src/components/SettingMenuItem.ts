import { html } from 'htm/preact';
import { FunctionalComponent } from 'preact';
import { useState, useEffect, useContext } from 'preact/hooks';
import CheckMark from 'components/svg/CheckMark';
import Info from 'components/svg/Info';
import { StoreContext } from 'services/StoreContext';

const SettingMenuItem: FunctionalComponent = (props: any) => {
  const { url, text, className, isMarked, origin } = props;

  const [hover, setHover] = useState<boolean>(false);

  const [greenDot, setGreenDot] = useState<boolean>(false);

  const store: any = useContext(StoreContext);

  useEffect(() => {
    if (store.getOrigin() == origin && store.getConnected()) {
      setGreenDot(true)
    }
  }, [])

  return html`
    <a
      class="menu-item pl-4 ${className}"
      onClick=${url}
      onMouseOut=${() => {
        setHover(false);
      }}
      onMouseOver=${() => setHover(true)}
    >
      <div>
        <div class="pr-1">
          <span class="mr-2 ${isMarked ? '' : 'invisible'}">
            <${CheckMark} color="${hover === true ? 'black' : 'white'}" />
          </span>
          ${text}
        </div>

        <!-- Origin less than 19 characters -->
        ${origin &&
        origin.length <= 19 &&
        html`
        <div class="settings-menu-origin" style="${greenDot ? '' : 'margin-left: 21px;'}">

          ${greenDot && html `
          <div class='divConnected settings-item'>
            <div class='dotGreen settings-item' />
          </div>
          `}
        
          <span>${origin}</span>
        </div>
        `}

        <!-- Origin more than 19 characters -->
        ${origin &&
        origin.length > 19 &&
        html`
        <div class="settings-menu-origin" style="${greenDot ? '' : 'margin-left: 21px;'}">
        
          ${greenDot && html `
          <div class='divConnected settings-item'>
            <div class='dotGreen settings-item' />
          </div>
          `}

          <span>${origin.substr(0, 19)}..</span>
          <span class="tooltip-origin">
            <span class="tooltiptext-origin">${origin}</span>
            <${Info} color="${hover === true ? 'black' : 'white'}"
          /></span>
        </div>
        `}
      </div>
    </a>
  `;
};

export default SettingMenuItem;
