import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';

import logo from 'assets/mese-header-logo.svg';

const Logo: FunctionalComponent = () => {
  return html`
    <div style="flex: 1 1 100%; display: flex;">
      <img src=${logo} width="183" />
    </div>
  `;
};

export default Logo;
