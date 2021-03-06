import { html } from 'htm/preact';
import { FunctionalComponent } from 'preact';

const Info: FunctionalComponent = (props: any) => {
  const { color } = props;

  return html`
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5.00004 9.16659C7.30123 9.16659 9.16671 7.30111 9.16671 4.99992C9.16671 2.69873 7.30123 0.833252 5.00004 0.833252C2.69885 0.833252 0.833374 2.69873 0.833374 4.99992C0.833374 7.30111 2.69885 9.16659 5.00004 9.16659Z"
        stroke="${color}"
        stroke-width="0.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M5 6.66667V5"
        stroke="${color}"
        stroke-width="0.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M5 3.33325H5.00417"
        stroke="${color}"
        stroke-width="0.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;
};

export default Info;
