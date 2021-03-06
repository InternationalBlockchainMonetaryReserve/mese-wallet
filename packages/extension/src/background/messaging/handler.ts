import { MessageApi } from './api';
import { Task } from './task';
import { extensionBrowser } from '@mese/common/chrome';
import encryptionWrap from "../encryptionWrap";
import { isFromExtension } from '@mese/common/utils';
import { RequestErrors } from '@mese/common/types';
import { JsonRpcMethod, MessageSource } from '@mese/common/messaging/types';

const auth_methods = [
    JsonRpcMethod.Authorization,
    JsonRpcMethod.AuthorizationAllow,
    JsonRpcMethod.AuthorizationDeny,
    // JsonRpcMethod.MESEAuthorization,
    JsonRpcMethod.MESEAuthorizationAllow,
    JsonRpcMethod.MESEAuthorizationDeny
];

/**
 * Auth methods cannot reject the Injected Javascript request,
 * the rejection is required for Authorization/connect() method
 */
const connect_method = [
    JsonRpcMethod.MESEAuthorization,
    JsonRpcMethod.MESEVersion,
]

class RequestValidation {
    public static isAuthorization(method: JsonRpcMethod) {
        if(auth_methods.indexOf(method) > -1)
            return true;
        return false;
    }
    public static isConnectMethod(method: JsonRpcMethod) {
        if(connect_method.indexOf(method) > -1)
            return true;
        return false;
    }
    public static isPublic(method: JsonRpcMethod) {
        if(method in Task.methods().public)
            return true;
        return false;
    }
}

export class OnMessageHandler extends RequestValidation {
    static events: {[key: string]: any} = {};

    static handle(request: any, sender: any, sendResponse: any) {
        //console.log('HANDLIG MESSAGE', request, sender);

        if ('tab' in sender){
            request.originTabID = sender.tab.id;
            request.originTitle = sender.tab.title;
            if ('favIconUrl' in sender.tab)
                request.favIconUrl = sender.tab.favIconUrl;
        }

        try {
            request.origin = new URL(sender.url).origin;
        } catch(e) {
            request.error = RequestErrors.NotAuthorized;
            MessageApi.send(request);
            return;
        }

        return this.processMessage(request, sender, sendResponse);
    }

    static processMessage(request: any, sender: any, sendResponse: any) {
        const source : MessageSource = request.source;
        const body = request.body;
        const method = body.method;
        const id = body.id;

        // Check if the message comes from the extension
        if (isFromExtension(sender.origin)) {
            // Message from extension
            switch(source) {
                // Message from extension to dapp
                case MessageSource.Extension:
                    if(OnMessageHandler.isAuthorization(method) 
                        && !OnMessageHandler.isPublic(method)) {
                        // Is a protected authorization message, allowing or denying auth
                        Task.methods().private[method](request);
                    } else {
                        OnMessageHandler.events[id] = sendResponse;
                        MessageApi.send(request);
                        // Tell Chrome that this response will be resolved asynchronously.
                        return true;
                    }
                    break;
                case MessageSource.UI:
                    return Task.methods().extension[method](request, sendResponse);
                    break;
            }
        } else {
            // Reject message if there's no wallet
            new encryptionWrap("").checkStorage((exist: boolean) => {
                if (!exist) {
                    extensionBrowser.windows.create(
                        {
                          url: extensionBrowser.runtime.getURL('index.html'),
                            type: 'popup',
                            focused: true,
                            width: 400,
                            height: 625,
                        },
                      );
                    request.error = {
                        message: RequestErrors.NotAuthorized
                    };
                    MessageApi.send(request);
                } else {
                    if (OnMessageHandler.isAuthorization(method)
                        && OnMessageHandler.isPublic(method)) {
                        // Is a public authorization message, dapp is asking to connect
                        Task.methods().public[method](request);
                    } else if (OnMessageHandler.isConnectMethod(method))  {   
                        Task.build(request)
                                .then((d) => {
                                    MessageApi.send(d);
                                })
                                .catch((d) => {
                                    MessageApi.send(d);
                                });
                    }else{
                        // Other requests from dapp fall here
                        if (Task.isAuthorized(request.origin)) {
                            // If the origin is authorized, build a promise
                            Task.build(request)
                                .then((d) => {
                                    MessageApi.send(d);
                                })
                                .catch((d) => {
                                    MessageApi.send(d);
                                });
                        } else {
                            // Origin is not authorized
                            request.error = RequestErrors.NotAuthorized;
                            MessageApi.send(request);
                        }
                    }
                }
            });
            return true;
        }
    }
}