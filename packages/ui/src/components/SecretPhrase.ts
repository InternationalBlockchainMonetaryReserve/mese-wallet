/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { route } from 'preact-router';

import BackNavbar from 'components/BackNavbar';
import MeseButton from 'components/MeseButton';
import ContentLogo from 'components/ContentLogo';
import ToClipboard from 'components/ToClipboard';

const SecretPhrase: FunctionalComponent = (props: any) => {
  const { account, nextStep, prevStep } = props;

  return html`
    <div class="main-view" style="flex-direction: column;">
      <div style="">
        <${BackNavbar} url=${prevStep} />

        <${ContentLogo} logoHeightSmall="true" />

        <section class="mese-section">
          <h1
            class="mese-text mese-14 mese-bold-900"
            style="
            text-transform: uppercase;
            font-style: normal;
          "
          >
            Secret Phrase
          </h1>

          <p class="mese-text mese-12 mt-3">
            EXTREMELY IMPORTANT!
          </p>

          <p class="mese-text mese-12 mt-3">
            This is your private key backup. You will need to re-enter it on the next screen, to complete the wallet registration. You need to write out or record this Secret Phase and store it in a safe place. DO NOT SHARE IT WITH ANYONE. This secret phrase is what opens your wallet. KEEP IT SAFE, Record it accurately! You won’t have another chance to record it, so <b>save it right now!</b>
          </p>

          <div class="mt-5" style="flex-direction: row; display: flex;">
            <p class="mese-text mese-12" style="">Secret phrase</p>
            <${ToClipboard}
              class="is-pulled-right mese-text mese-12 ml-1 tooltip"
              style=""
              data=${account.mnemonic}
              text="(Click to Copy)"
            />
          </div>

          <textarea
            class="textarea seed mt-1 mese-text mese-12"
            rows="3"
            disabled
            value=${account.mnemonic}
          >
          </textarea>

          <div class="mt-2">
            <${MeseButton} onClick=${nextStep} loading=${false} text="continue" />
          </div>
        </section>
      </div>
    </div>
  `;
};

export default SecretPhrase;
