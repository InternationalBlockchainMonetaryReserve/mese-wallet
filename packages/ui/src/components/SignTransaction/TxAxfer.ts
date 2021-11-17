import { html } from 'htm/preact';
import { FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';
import './style.scss';

const TxAxfer: FunctionalComponent = (props: any) => {
  const [tab, setTab] = useState<string>('overview');
  const { tx, account, ledger, vo, dt, estFee, da, un } = props;
  const fee = estFee ? estFee : tx['fee'];

  const txText = JSON.stringify(tx, null, 2);

  return html`
    <div class="box py-2 is-shadowless mb-3" style="background: #eff4f7;">
      <div style="display: flex; justify-content: space-between;">
        <div>
          <b>${account}</b>
        </div>
        <div class="is-size-7 has-text-right">
          <b class="has-text-link">YOU</b>
        </div>
      </div>
    </div>

    <p class="has-text-centered has-text-weight-bold">
      <span><i class="fas fa-arrow-down mr-3"></i></span>
      <span>${dt || 'Asset Transfer'}</span>
    </p>

    <div class="box py-2 is-shadowless mt-3 mb-0" style="background: #eff4f7;">
      <div style="display: flex; justify-content: space-between;">
        <div>
          <b style="word-break: break-all;">${tx.to}</b>
        </div>
      </div>
    </div>

    <div class="tabs is-centered mb-2">
      <ul>
        <li class=${tab === 'overview' ? 'is-active' : ''} onClick=${() => setTab('overview')}>
          <a class=${tab === 'overview' ? '' : 'inactive'}>Overview</a>
        </li>
        <li class=${tab === 'details' ? 'is-active' : ''} onClick=${() => setTab('details')}>
          <a class=${tab === 'details' ? '' : 'inactive'}>Details</a>
        </li>
      </ul>
    </div>

    ${tab === 'overview' &&
    html`
      <div>
        ${tx.group &&
        html`
          <div class="is-flex">
            <p style="width: 30%;">Group ID:</p>
            <p style="width: 70%;" class="truncate-text">${tx.group}</p>
          </div>
        `}
        <div class="is-flex">
          <p style="width: 30%;">Asset:</p>
          <a
            style="width: 70%"
            href=${``}
            target="_blank"
            rel="noopener noreferrer"
          >
            ${tx.assetIndex}
          </a>
        </div>
        <div class="is-flex${vo && vo['fee'] ? (' ' + vo['fee']['className']).trimRight() : ''}">
          <p style="width: 30%;">${!estFee || tx['flatFee'] ? 'Fee:' : 'Estimated fee:'}</p>
          <p style="width: 70%;">${fee / 1e6} Algos</p>
        </div>
        <div class="is-flex">
          <p style="width: 30%;"><b>Amount:</b></p>
          <p style="width: 70%;">${da || tx.amount} ${un}</p>
        </div>
      </div>
    `}
    ${tab === 'details' &&
    html`
      <div style="height: 170px; overflow: auto;">
        <pre style="background: #EFF4F7; border-radius: 5px;">
          <code>${txText}</code>
        </pre
        >
      </div>
    `}
  `;
};

export default TxAxfer;