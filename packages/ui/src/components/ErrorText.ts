import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';

const ErrorText: FunctionalComponent = (props: any) => {
  const { text } = props;

  return html`
    ${text.length > 0 &&
    html`
      <div>
        <span class="mese-text mese-9 text-yellow">${text}</span>
      </div>
    `}
  `;
};

export default ErrorText;
