import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { Link } from 'preact-router';

import ContentLogo from 'components/ContentLogo';

const Welcome: FunctionalComponent = () => {
  return html`
    <div
      class="main-view has-text-white mese-background"
      style="flex-direction: column; 
      background-size: cover;"
    >
      <div style="padding-left: 20px; padding-right: 20px">
        <section class="has-text-center" style="text-align: center; margin-top: 89px">
          <${ContentLogo} />

          <p
            class="mese-text mese-14 mese-bold-900 is-6 mb-0 has-text-white"
            style="text-align: start; margin-top: 42px"
          >
            WELCOME TO MESE WALLET
          </p>
        </section>

        <section class="mese-text mese-12" style="margin-top: 15px">
          <p> The MESE.io was developed to support Defi on Algorand! Sit back and relax, while we walk you through the setup process. This wallet is designed to scale with every future defi app on Algorand as well as act as a standard on chain wallet for ALGO and all Algorand Standard Assets. </p>
        </section>
      </div>

      <div class="mx-5 mb-3" style="margin-top: 93px;">
        <${Link}
          id="setPassword"
          class="button is-outlined is-fullwidth"
          href="/select-option"
          style="
          border-color: #FFFFFF;
          background-color: transparent;
          color: #FFFFFF;
          text-transform: uppercase;
        "
        >
          <p class="mese-text mese-12">Let's Begin</p>
        <//>
      </div>
    </div>
  `;
};

export default Welcome;
