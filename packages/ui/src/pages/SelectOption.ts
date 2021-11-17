/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { route } from 'preact-router';
import ContentLogo from 'components/ContentLogo';
import MeseButton from 'components/MeseButton';

import BackNavbar from 'components/BackNavbar';
import CreateWalletButton from 'components/CreateWalletButton';

const SelectOption: FunctionalComponent = (props) => {
  return html`
    <div
      class="main-view mese-background"
      style="flex-direction: column; justify-content: space-between;"
    >
      <div style="flex: 1">
        <${BackNavbar} url=${() => route(`/`)} />
        <section class="has-text-centered " style="background-size: cover;">
          <${ContentLogo} />
        </section>

        <section class="section pb-0 pt-0">
          <h1 class="mese-text mese-14 mese-bold-900" style="text-transform: uppercase;">
            Select an Option
          </h1>

          <div style="margin-top: 35px">
            <${CreateWalletButton} onClick=${() => route('/set-mese-password')} />
          </div>

          <div style="margin-top: 13px">
            <${MeseButton} onClick=${() => route('/import-mese-wallet')} text="IMPORT ACCOUNT" />
          </div>
        </section>
      </div>
    </div>
  `;
};

export default SelectOption;
