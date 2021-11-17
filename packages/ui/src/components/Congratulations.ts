/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import MeseButton from 'components/MeseButton';

import ContentLogo from 'components/ContentLogo';

const Congratulations: FunctionalComponent = (props : any) => {

  const {next} = props;

  return html`
    <div class="main-view" style="flex-direction: column;">
      <div >

        <div class="mt-6">
          <${ContentLogo} logoHeightSmall="${false}" />
        </div>

        <section class="section pt-0 pb-0">
          <h1 class="mese-text mese-14 mese-bold-900" 
          style="
            text-transform: uppercase;
          ">
            Congratulations!
          </h1>
        </section>
      </div>

      <div class="mx-5 mb-3 mt-6">
        <${MeseButton} 
          onClick=${next} 
          loading=${false} 
          disabled=${false}
          text="Start using mese wallet" 
        />
      </div>
    </div>
  `;
};

export default Congratulations;
