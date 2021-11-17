import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';

const HeaderConnectComponent: FunctionalComponent = ({ children }) => {
  return html` <div class="px-4 mt-2 header"> ${children} </div> `;
};

export default HeaderConnectComponent;
