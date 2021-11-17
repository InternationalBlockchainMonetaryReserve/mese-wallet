/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';

import BackNavbar from 'components/BackNavbar';
import { route } from 'preact-router';

const About: FunctionalComponent = (props: any) => {
  return html`
    <div class="main-view" style="flex-direction: column;">
      <div style="">
        <${BackNavbar} url=${() => route('/wallet')} />

        <section class="px-5">
          <h1
            class="mese-text mese-14 mese-bold-900"
            style="
                    text-transform: uppercase;
                    font-style: normal;
                  "
          >
            About
          </h1>

          <div class="mese-text mese-12">
            <p class="mt-4"> Version: 1.6.1 </p>

            <p class="mt-4">
              Operating under the International Blockchain Monetary Reserve, IBMR.io, MESE’s mission
              is to create financial inclusion through the open distributed access of digital tokens
              for wealth creation and asset management for emerging and developing markets. More
              than just banking the unbanked, MESE is about providing accessible wealth creation
              directly to the individual and creating a new paradigm in microfinance with
              microassets. MESE is built on the Algorand Blockchain protocol.
            </p>

            <div class="mt-4 about-column">
              <div>
                <p>
                  <a href="https://wallet.mese.io" target="_blank">wallet.mese.io</a>
                </p>
              </div>
              <div>
                <p>
                  <a href="http://www.ibmr.io" target="_blank">www.ibmr.io</a>
                </p>
              </div>
              <div>
                <p>
                  <a href="http://www.arcc.one" target="_blank">www.arcc.one</a>
                </p>
              </div>
            </div>
            <div class="mt-2">
              <p class="has-text-centered">
                <a href="https://wallet.mese.io/privacy-policy.pdf" target="_blank"
                  >wallet.mese.io/privacy-policy</a
                >
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
};

export default About;
