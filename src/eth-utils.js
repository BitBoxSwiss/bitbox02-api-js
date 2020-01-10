import { firmwareAPI, HARDENED } from './bitbox02';

/**
 * Sanitizes signature data provided by the 'ethereumjs' library's Transaction type
 * https://github.com/ethereumjs/ethereumjs-tx/blob/master/src/transaction.ts
 * and returns them in the format needed by BB02's AsyncETHSign
 *
 * @param sigData should include the following:
 *
 * ```
 * const signatureData = {
 *     account: id,      // id: number, account number in the ETH keypath m/44'/60'/0'/0/<id>
 *     recipient: tx.to, // Buffer(Uint8Array(20))
 *     tx: {
 *       value           // hex
 *       data            // hex
 *       chainId         // number
 *       nonce           // hex
 *       gasLimit        // hex
 *       gasPrice        // hex
 *      },
 *     data: tx.data // Buffer(Uint8Array)
 *   }
 * ```
 */
export function sanitizeEthTransactionData(sigData) {
    try {
        let sanitizedData = {};
        sanitizedData.nonce = 0;
        sanitizedData.value = '0';
        sanitizedData.coin = firmwareAPI.messages.ETHCoin.ETH;
        sanitizedData.path = [44 + HARDENED, 60 + HARDENED, 0 + HARDENED, 0, sigData.account];
        if (sigData.tx.nonce) {
            sanitizedData.nonce = parseInt(sigData.tx.nonce, 16)
        }
        sanitizedData.gasPrice = parseInt(sigData.tx.gasPrice, 16).toString();
        sanitizedData.gasLimit = parseInt(sigData.tx.gasLimit, 16);
        sanitizedData.recipient = new Buffer(sigData.recipient);
        if (sigData.tx.value) {
            sanitizedData.value = parseInt(sigData.tx.value, 16).toString();
        }
        sanitizedData.data = new Buffer(sigData.data);
        sanitizedData.chainId = sigData.tx.chainId;
        return sanitizedData;
    } catch (e) {
        throw new Error('ethTx data sanitization failed: ', e);
    }
}