import { html } from 'htm/preact';
import { FunctionalComponent } from 'preact';

const CheckMark: FunctionalComponent = (props: any) => {

    const {color} = props;

    return html`
<svg width="13" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.6666 0.5L4.24992 6.91667L1.33325 4" stroke="${color}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
};

export default CheckMark;