import {FunctionalComponent} from 'preact';
import {html} from 'htm/preact';

import HeaderComponent from './HederConnectComponent';
import LedgerSelect from './LedgerSelect';
import Connected from './header/Connected';

const ConnectedHeader: FunctionalComponent = () => {
    return html`
        <${HeaderComponent}>
            <${Connected}/>
            <${LedgerSelect}/>
        </${HeaderComponent}>
    `;
};
export default ConnectedHeader;
