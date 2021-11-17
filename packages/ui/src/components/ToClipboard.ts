import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';

const ToClipboard: FunctionalComponent = (props: any) => {
  const [click, setClick] = useState<boolean>(false);

  const copyToClipboard = () => {
    var textField = document.createElement('textarea');
    textField.innerText = props.data;
    document.body.appendChild(textField);
    textField.select();
    document.execCommand('copy');
    textField.remove();
  };

  const classCSS = props.class || '';
  const styleCSS = props.style || '';

  const { text } = props;

  return html`
    <a
      onClick=${() => {
        copyToClipboard();
        setClick(true);
      }}
      onMouseOut=${() => {
        setClick(false);
      }}
      class=${classCSS}
      style=${styleCSS}
    >
      ${!text ? 'copy' : text} ${click === true && html`<span class="tooltiptext">Copied</span>`}
    </a>
  `;
};

export default ToClipboard;
