'use strict';
const algosdk = require("algosdk");
import encryptionWrap from "./encryptionWrap";
import createNewAccount from "./account/createAccount.js";
import { TransactionType } from "@mese/common/types/transaction";
import Background from './background';
Background.start();