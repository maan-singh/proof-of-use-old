'use strict';

let Blockchain = require('./blockchain.js');

/**
 * Mixes in shared behavior between clients and miners for handling PoU transactions.
 */
module.exports = {
  /**
   * In the PoU model, we add the usage index.
   * We also add a 'FROM' field which is an array of history of the chain of transactions.
   * All the different arrays represent from where the money has been circulated from.
   *
   * We also add a 'TO' map, which contains information about who the client send money to and how many times they have done so.
   * Also, to monitor the frequency of client transactions, we add a timestamp property.
   */
  setupPoUClient: function () {
    this.usageIndex = 0;
    this.from = [];
    this.to = new Map();
    this.timestamp = null;
  },

  index() {
    return this.usageIndex;
  },

  seeFrom() {
    return this.from;
  },

  seeTo() {
    return this.to;
  },

  // /**
  //  * Broadcasts a transaction from the client giving gold to the clients
  //  * specified in 'outputs' and updates usage index. A transaction fee may be specified, which can
  //  * be more or less than the default value.
  //  *
  //  * @param {Array} outputs - The list of outputs of other addresses and
  //  *    amounts to pay.
  //  * @param {number} [fee] - The transaction fee reward to pay the miner.
  //  *
  //  * @returns {Transaction} - The posted transaction.
  //  */
  // postTransaction(outputs, fee = Blockchain.DEFAULT_TX_FEE) {
  //   // We calculate the total value of gold needed.
  //   let totalPayments =
  //     outputs.reduce((acc, { amount }) => acc + amount, 0) + fee;

  //   // Make sure the client has enough gold.
  //   if (totalPayments > this.availableGold) {
  //     throw new Error(
  //       `Requested ${totalPayments}, but account only has ${this.availableGold}.`
  //     );
  //   }

  //   // Broadcasting the new transaction.
  //   let tx = Blockchain.makeTransaction({
  //     from: this.address,
  //     nonce: this.nonce,
  //     pubKey: this.keyPair.public,
  //     outputs: outputs,
  //     fee: fee,
  //   });

  //   tx.sign(this.keyPair.private);

  //   // Adding transaction to pending.
  //   this.pendingOutgoingTransactions.set(tx.id, tx);

  //   this.nonce++;

  //   this.net.broadcast(Blockchain.POST_TRANSACTION, tx);

  //   // // If the client is a miner, add the transaction to the current block.
  //   // if (this.addTransaction !== undefined) {
  //   //   this.addTransaction(tx);
  //   // }

  //   return tx;
  // },
};
