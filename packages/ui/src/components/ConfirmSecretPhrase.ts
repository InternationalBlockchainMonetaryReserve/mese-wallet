/* eslint-disable no-unused-vars */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
import { FunctionalComponent } from 'preact';
import { html } from 'htm/preact';

import { useState, useEffect } from 'preact/hooks';

import BackNavbar from 'components/BackNavbar';
import MeseButton from 'components/MeseButton';
import ContentLogo from 'components/ContentLogo';

import remove from 'assets/x-circle.svg';
import {SortableContainer, SortableElement} from 'react-sortable-hoc';

  // a little function to help us with reordering the result
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

function shuffle(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

const ConfirmSecretPhrase: FunctionalComponent = (props: any) => {
  const { account, nextStep, prevStep, loading, confirmInternalState, loadedInternalState } = props;
  const [testMnemonic, setTestMnemonic] = useState<string>('');
  const [testMnemonicArray, setTestMnemonicArray] = useState<any>([]);
  const [shuffledMnemonic, setShuffledMnemonic] = useState([]);

  useEffect(() => {
    // Load internal state (if any)
    if (loadedInternalState.setShuffledMnemonic !== undefined) {
      setTestMnemonic(loadedInternalState.setTestMnemonic)
      setTestMnemonicArray(loadedInternalState.setTestMnemonicArray)
      setShuffledMnemonic(loadedInternalState.setShuffledMnemonic)
    }else {
      setShuffledMnemonic(shuffle(account.mnemonic.split(" ")));
    }

  }, []);

  const SortableItem = SortableElement(({ value }) => {
    if (value == "") return html `<div></div>`

    return html `
  <div class="column phrase-column cursor-pointer" >
    <div class="custom-row">
      <div class="mese-text mese-11">
        ${value}
      </div>
      <button class="is-flex cursor-pointer btn-sortable" style="background: url(${remove}) no-repeat top center"  onClick=${() => deleteWord(value)}>
      </button>
   </div>
  </div>
  `})

  const SortableList = SortableContainer(({items}) => {
    return html `
     <div class="confirm-mnemonic-sortable">
      ${items.map((value, index) => html`
        <${SortableItem} key=${value.id} index=${index} value=${value} />
      `)}
    </div>
    `
  })

  const onSortEnd = ({oldIndex, newIndex}) => {
    const newItems = reorder(
      testMnemonicArray,
      oldIndex,
      newIndex
    );
    setTestMnemonic(newItems.join(' '))
    setTestMnemonicArray(newItems)
  };

  const addWord = (e) => {
    let newMnemonic;
    if (testMnemonic.length === 0)
      newMnemonic = e.target.name;
    else
      newMnemonic = testMnemonic + ' ' + e.target.name;
    setTestMnemonic(newMnemonic);
    setTestMnemonicArray(newMnemonic.split(' '));

    confirmInternalState({
      setTestMnemonic: newMnemonic,
      setTestMnemonicArray: newMnemonic.split(' '),
      setShuffledMnemonic: shuffledMnemonic
    })
  };

  const deleteWord = (word) => {
      let words = testMnemonic.split(' ');

      const idx = words.indexOf(word);

      if (idx > -1) {
        words.splice(idx, 1)
      }

      let mnemonicArray;
      mnemonicArray = words.join(' ')
      setTestMnemonic(words.join(' '));
      setTestMnemonicArray(mnemonicArray.split(' '));

      confirmInternalState({
        setTestMnemonic: words.join(' '),
        setTestMnemonicArray: mnemonicArray.split(' '),
        setShuffledMnemonic: shuffledMnemonic
      })
  }

  let copyTestMnemonic = [...testMnemonicArray];

  const hasWord = (word) => {
    const idx = copyTestMnemonic.indexOf(word);
    if (idx >= 0){
      copyTestMnemonic.splice(idx, 1);
      return true;
    }
    return false
  }

  // 5x5 grid
  let grid : Array<any[]> = [];

  let buttons : Array<any> = shuffledMnemonic.map(word => { 
    
    let hasChosen = hasWord(word);

    return html`
    <button class="button is-small is-fullwidth mt-2 button-phrase 
      ${hasChosen ? 'clicked' : ''}"
      name="${word}" id="${word}"
      disabled=${hasChosen}
      onClick=${addWord}>
        ${word}
    </button>
  `});

  let copyChosenWords = [...testMnemonic.split(' ')];

  let chosenWords : Array<any> = copyChosenWords.map(word => {
    if (word == '') return html``;

    return html`
    <div class="column phrase-column">
    <div class="custom-row">
      <div class="mese-text mese-11">
        ${word}
      </div>
      <div class="is-flex" onClick=${() => deleteWord(word)}>
        <img src=${remove} width="15" />
      </div>
   </div>
  </div>
    `
  });

  while (buttons.length) {
    grid.push(buttons.splice(0, 5));
  }

  return html`
    <div class="main-view" style="flex-direction: column;">
      <div>
        <${BackNavbar} url=${prevStep} />

        <${ContentLogo} logoHeightSmall="${true}" />

        <section class="mese-section">
          <h1
            class="mese-text mese-14 mese-bold-900"
            style="
            text-transform: uppercase;
          "
          >
            confirm secret phrase
          </h1>

          <p class="mese-text mese-11 mt-3"> Select each word in order from first to last word. </p>

          <div class="columns is-multiline phrase-container mt-2 mese-text mese-12" style="display: flex;">

            <${SortableList}  axis="xy" helperClass="SortableHelper" onSortEnd=${onSortEnd} items=${copyChosenWords} />

          </div>

          <div class="columns is-mobile px-3">
          ${grid.map(column => html`<div class="column phrase-columns is-one-forth">${column}</div>`)}
        </div>
        </section>
      </div>

      <div class="mx-5 mt-3">
        <${MeseButton} 
          onClick=${nextStep} 
          loading=${loading} 
          disabled=${testMnemonic !== account.mnemonic}
          text="submit" 
        />
      </div>
    </div>
  `;
};

export default ConfirmSecretPhrase;
