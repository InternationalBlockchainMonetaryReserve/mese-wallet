import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';

import logo from 'assets/mese-logo.svg';

const ContentLogo: FunctionalComponent = (props: any) => {

  const { logoHeightSmall } = props;

  return html`
    <section class="has-text-centered ${logoHeightSmall ? 'mb-4' : 'mb-6'}" style="background-size: cover;">
      <img src=${logo} width="161" />
    </section>
  `;
};

export default ContentLogo;
