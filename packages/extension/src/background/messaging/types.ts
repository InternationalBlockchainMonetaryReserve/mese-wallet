/* eslint-disable @typescript-eslint/ban-types */

import { LedgerTemplate } from '@mese/common/types/ledgers';

// Key and value must match in this enum so we
// can compare its existance with i.e. "Testnet" in SupportedLedger
/* eslint-disable no-unused-vars */
export enum Ledger {
  TestNet = 'TestNet',
  MainNet = 'MainNet',
  SandNet = 'SandNet',
}

export enum Backend {
  Algod = 'Algod',
  MESE = 'MESE',
}
export enum API {
  Algod = 'Algod',
  Indexer = 'Indexer',
}

export interface Cache {
  /*
        assets: {
            ledger: [
                assetId: {
                    ...
                },
                ...
            ],
            ...
        },
        accounts: {
            ledger: [
                address: {
                    ...
                },
                ...
            ],
            ...
        },
        availableLedgers: [
          {
            ...
          }
        ],
    */
  assets: object;
  accounts: object;
  availableLedgers: Array<LedgerTemplate>;
}
