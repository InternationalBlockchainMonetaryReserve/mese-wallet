import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';

import HeaderComponent from './HeaderComponent';
import SettingsMenu from './SettingsMenu';
import Logo from './Logo';

const MainHeader: FunctionalComponent = (props: any) => {

  const { hideMenu } = props;

  return html`
    <${HeaderComponent}>
      <${Logo} />
      ${!hideMenu && html `<${SettingsMenu} />`}
    </${HeaderComponent}>
  `;
};
export default MainHeader;
