import { html } from 'htm/preact';
import './style.scss';
import { useContext } from 'preact/hooks';
import { StoreContext } from 'services/StoreContext';


const Connected = () => {
  
  const store: any = useContext(StoreContext);

  return html`
    <div class='divConnected'>
      <div class='dotGreen ${store.getConnected() ? '' : 'not-connected'}' />
      <span>${store.getConnected() ? 'Connected' : 'Not connected'}</span>
    </div>`;
};
export default Connected;
