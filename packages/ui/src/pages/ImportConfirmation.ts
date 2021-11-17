/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { route } from 'preact-router';
import logo from 'assets/mese-logo.svg';
import { StoreContext } from 'services/StoreContext';
import { useContext, useEffect } from 'preact/hooks';

import MeseButton from 'components/MeseButton';
import ContentLogo from 'components/ContentLogo';

const ImportConfirmation: FunctionalComponent = (props) => {
  const start = () => {
    route('/wallet');
  };

  const store: any = useContext(StoreContext);

  useEffect(() => {
    store.savePageState(props)
  })

  return html`
    <div class="main-view" style="flex-direction: column;">
      <div>
        <section class="has-text-centered" style="background-size: cover; margin-top: 89px;">
          <${ContentLogo} />
        </section>
    
        <section class="section pb-0 pt-0">
          <h1 class="mese-text mese-14 mese-bold-900" style="
                    text-transform: uppercase;
                    font-style: normal;
                  ">
            Congratulations!
          </h1>
    
        </section>
      </div>
    
      <div class="mx-5 mb-3" style="margin-top: 60px">
        <button id="createWallet" class="button is-fullwidth is-outlined mese-btn-outlined mese-text 
              mese-12" style="
              padding: 18px;
              text-transform: uppercase;
            " onClick=${start}>
          <span class="mese-text mese-12">
            Start using mese.<span class="is-lowercase">io</span> wallet
          </span>
        </button>
      </div>
    </div>
  `;
};

export default ImportConfirmation;
