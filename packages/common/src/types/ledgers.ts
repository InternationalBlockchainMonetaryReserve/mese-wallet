export class LedgerTemplate {
  name: string;
  readonly isEditable: boolean;
  genesisId?: string;
  genesisHash?: string;
  symbol?: string;
  algodUrl?: string;
  indexerUrl?: string;
  headers?: string;
  baseUrl? :string;

  public get uniqueName(): string {
    return this.name.toLowerCase();
  }

  constructor({
    name,
    genesisId,
    genesisHash,
    symbol,
    algodUrl,
    indexerUrl,
    headers,
    baseUrl,
  }: {
    name: string;
    genesisId?: string;
    genesisHash?: string;
    symbol?: string;
    algodUrl?: string;
    indexerUrl?: string;
    headers?: string;
    baseUrl?: string;
  }) {
    if (!name) {
      throw Error('A name is required for ledgers.');
    }

    this.name = name;
    this.genesisId = genesisId || 'mainnet-v1.0';
    this.genesisHash = genesisHash;
    this.symbol = symbol;
    this.algodUrl = algodUrl;
    this.indexerUrl = indexerUrl;
    this.headers = headers;
    this.baseUrl = baseUrl;
    this.isEditable = name !== 'MainNet' && name !== 'TestNet';
  }
}

export function getBaseSupportedLedgers(): Array<LedgerTemplate> {
  // Need to add access to additional ledger types from import
  return [
    new LedgerTemplate({
      name: 'MainNet',
      genesisId: 'mainnet-v1.0',
      genesisHash: '',
    }),
    new LedgerTemplate({
      name: 'TestNet',
      genesisId: 'testnet-v1.0',
      genesisHash: '',
    }),
  ];
}
