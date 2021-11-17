import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';

const RejectTransactionButton: FunctionalComponent = (props: any) => {
    const { onClick, disabled, loading, text } = props;

    return html`
    <button
      id="createWallet"
      class="button is-fullwidth is-outlined mese-btn-outlined mese-text reject-transaction-btn
      mese-12 ${loading ? 'is-loading' : ''}"
      style="
      padding: 18px;
      text-transform: uppercase;
      width: 175px;
    "
      disabled=${disabled}
      onClick=${onClick}
    >
      <span class="mese-text mese-12 reject-button">${loading ? '' : text}</span>
    </button>
  `;
};

export default RejectTransactionButton;
