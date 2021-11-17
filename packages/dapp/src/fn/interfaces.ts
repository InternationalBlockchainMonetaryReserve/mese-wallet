import { RequestErrors, Transaction, MultisigTransaction } from '@mese/common/types';
import { JsonPayload } from '@mese/common/messaging/types';

/* eslint-disable no-unused-vars */
export interface ITask {
  sign(p: Transaction, e: RequestErrors): Promise<JsonPayload>;
  signMultisig(p: MultisigTransaction, e: RequestErrors): Promise<JsonPayload>;
}
