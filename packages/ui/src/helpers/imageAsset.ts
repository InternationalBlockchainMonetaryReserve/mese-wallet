/**
 * @license
 * Copyright 2020
 * =========================================
 */
import { sendMessage } from '../services/Messaging';
import { JsonRpcMethod } from '../../../common/src/messaging/types';

///
///
export class ImageAsset {
  // Get Image Asset
  
  public get(assetId: string, ledger, callback) {
    const params = {
      assetId: assetId,
      ledger: ledger
    };
    sendMessage(JsonRpcMethod.GetAssetImage, params, function (response) {
      if (response !== undefined)
        callback(response)
    })
  }
}
export default ImageAsset;
