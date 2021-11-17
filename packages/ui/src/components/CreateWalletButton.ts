import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';

const CreateWalletButton: FunctionalComponent = (props: any) => {
  const { onClick, disabled, loading } = props;

  return html`
    <button
      id="createWallet"
      class="button is-fullwidth is-outlined mese-btn-outlined mese-text 
      mese-12 ${loading ? 'is-loading' : ''}"
      style="
      padding: 18px;
      text-transform: uppercase;
    "
      disabled=${disabled}
      onClick=${onClick}
    >
      CREATE NEW MESE.<span class="is-lowercase mr-1">io</span> WALLET ACCOUNT
    </button>
  `;
};

export default CreateWalletButton;
