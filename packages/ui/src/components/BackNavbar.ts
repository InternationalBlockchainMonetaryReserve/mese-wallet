import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';

import back from 'assets/back.svg';

const BackNavbar: FunctionalComponent = (props: any) => {
  const { url } = props;

  return html`
    <div
      style="
      display: flex;
      cursor: pointer;
      "
      class="columns is-gapless is-vcentered py-4"
      onClick=${url}
    >
      <div style="margin-right: 12px; margin-left: 19px; margin-top: 2px;">
        <img src=${back} class="" width="8" />
      </div>

      <div
        class="mese-text mese-12"
        style="
          text-transform: uppercase;
          "
      >
        Back
      </div>
    </div>
  `;
};

export default BackNavbar;
