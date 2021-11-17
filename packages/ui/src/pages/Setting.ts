/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';

import BackNavbar from 'components/BackNavbar';
import { route } from 'preact-router';

import nextArrow from 'assets/next-arrow.svg';

const Setting: FunctionalComponent = (props: any) => {
  return html`
    <div class="main-view" style="flex-direction: column;">
      <div>
        <${BackNavbar} url=${() => route('/wallet', true)} />

        <section class="px-5">
          <h1
            class="mese-text mese-14 mese-bold-900"
            style="
            text-transform: uppercase;
            font-style: normal;
          "
          >
            Settings
          </h1>

          <div class="mese-text mese-12">
            <p class="mt-5 mese-bold-900">Account</p>

            <div
              class="custom-row row-setting centered mt-3 cursor-pointer"
              onClick=${() => route('/setting-currency')}
            >
              <p class="mr-auto">Select Currency</p>
              <img src=${nextArrow} width="8" />
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
};

export default Setting;
