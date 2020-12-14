'use strict';

let Block = require('./block.js');

module.exports = class PoUBlock extends (
  Block
) {
  /**
   * Accepts a new transaction if it is valid and adds it to the block.
   *
   * @param {Transaction} tx - The transaction to add to the block.
   * @param {Client} [client] - A client object, for logging useful messages.
   *
   * @returns {Boolean} - True if the transaction was added successfully.
   */
  addTransaction(tx, client) {
    console.log('POU-BLOCK-ADD-TRANSACTION');
    if (this.transactions.get(tx.id)) {
      if (client) client.log(`Duplicate transaction ${tx.id}.`);
      return false;
    } else if (tx.sig === undefined) {
      if (client) client.log(`Unsigned transaction ${tx.id}.`);
      return false;
    } else if (!tx.validSignature()) {
      if (client) client.log(`Invalid signature for transaction ${tx.id}.`);
      return false;
    } else if (!tx.sufficientFunds(this)) {
      if (client) client.log(`Insufficient gold for transaction ${tx.id}.`);
      return false;
    }

    // Checking and updating nonce value.
    // This portion prevents replay attacks.
    let nonce = this.nextNonce.get(tx.from) || 0;
    if (tx.nonce < nonce) {
      if (client) client.log(`Replayed transaction ${tx.id}.`);
      return false;
    } else if (tx.nonce > nonce) {
      // FIXME: Need to do something to handle this case more gracefully.
      if (client) client.log(`Out of order transaction ${tx.id}.`);
      return false;
    } else {
      this.nextNonce.set(tx.from, nonce + 1);
    }

    // from : jfkjdkjadsjkv, outputs: [ { amount: xx, address: 'blahblah' }, { amount: xx, address: 'blahblah' }];

    // Getting client objects for sender and receivers.
    let receivers = [];
    let sender = this.clients.get(tx.from);

    if (sender !== undefined) {
      let outputs = tx.outputs;

      // Pushing receiver objects to receivers array.
      outputs.forEach((output) => {
        receivers.push(this.clients.get(output.address));
      });

      let isCheating = false;

      if (receivers.length > 0) {
        receivers.forEach((receiver) => {
          // Check if there is any 'cheating' involved. (Relationship chains)
          isCheating = this.isCheating(sender, receiver);

          // We set the receiver sending amount here.
          let sendingCoins = this.findSendingCoins(outputs, receiver);

          if (
            isCheating === true &&
            sendingCoins !== undefined &&
            sendingCoins !== 0
          ) {
            this.handleCheating(sender, receiver, sendingCoins);
          } else {
            this.updateIndex(sender, receiver, sendingCoins);
          }
        });
      }
    }

    // Adding the transaction to the block
    this.transactions.set(tx.id, tx);

    // Taking gold from the sender
    let senderBalance = this.balanceOf(tx.from);
    this.balances.set(tx.from, senderBalance - tx.totalOutput());

    // Giving gold to the specified output addresses
    tx.outputs.forEach(({ amount, address }) => {
      let oldBalance = this.balanceOf(address);
      this.balances.set(address, amount + oldBalance);
    });

    return true;
  }

  // To increase usage index of sender.
  updateIndex(sender, receiver, sendingCoins) {
    if (sender.to.get(receiver)) {
      let numberOfTransactions = sender.to.get(receiver);
      let index = sendingCoins * Math.pow(0.8, numberOfTransactions);
      sender.usageIndex += index;
      sender.to.set(receiver, sender.to.get(receiver) + 1);
    } else {
      let index = sendingCoins;
      sender.usageIndex += index;
      sender.to.set(receiver, 1);
    }
  }

  // Create cheating chains for a SINGLE receiver.
  // If receiver is for example C
  // cheaterChains[{ chain: [C, D], coinds: 40}, { chain: [C,B], cois: 30}]
  createCheatingChainsForReceiverArray(sender, receiver) {
    let cheaterChains = [];

    if (sender.from.length > 0) {
      sender.from.forEach((pile) => {
        pile.chain.forEach((rec, index, array) => {
          if (rec.address === receiver.address) {
            let cheaterPile = {};
            cheaterPile.chain = [];
            for (i = index; i < array.length; i++) {
              cheaterPile.chain.push(array[i]);
            }
            cheaterPile.coins = pile.coins;
            cheaterChains.add[cheaterPile];
          }
        });
      });
    }

    return cheaterChains;
  }

  // Create a map of each cheater chain to the percentage of the money for ONE receiver.
  // For example if receiver is C,
  // MAP cheatingChainsToPercentageMap = {chain: [C,D], coins: 40} -> 0.4 , {chain: [C,B], coins: 60} -> 0.6
  // Param is cheaterChains[{ chain: [C, D], coins: 40}, { chain: [C,B], coins: 60}]
  createCheatingChainsToPercantageMap(sender, receiver) {
    let cheaterChains = this.createCheatingChainsForReceiverArray(
      sender,
      receiver
    );

    // total coins for each receiver.
    let totalCoins = 0;
    let cheatingChainsToPercentMap = new Map();

    cheaterChains.forEach((cheaterChain) => {
      totalCoins += cheaterChain.coins;
    });

    cheaterChains.forEach((cheaterChain) => {
      let percentage = cheaterChain.coins / totalCoins;
      cheatingChainsToPercentMap.set(cheaterChain, percentage);
    });

    return cheatingChainsToPercentMap;
  }

  // outputs: [ { amount: xx, address: 'blahblah' }, { amount: xx, address: 'blahblah' } ];
  findSendingCoins(outputs, receiver) {
    let sendingCoins;

    outputs.forEach((output) => {
      if (receiver.address === output.address) {
        sendingCoins = output.amount;
      }
    });

    return sendingCoins;
  }

  handleCheating(sender, receiver, sendingCoins) {
    let cheaterChains = this.createCheatingChainsForReceiverArray(
      sender,
      receiver
    );

    // {chain: [C,D], coins: 40} -> 0.4 , {chain: [C,B], coins: 60} -> 0.6
    let cheatingChainsToPercentMap = this.createCheatingChainsToPercantageMap(
      sender,
      receiver
    );

    // {chain: [C,D], coins: 40}, {chain: [C,B], coins: 60}
    // total coins in cheating chains = 100
    let totalCoinsCheatingChains = this.calculateTotalCoinsCheatingChains(
      cheaterChains
    );

    // Now we check for three cases as below:
    if (sendingCoins === totalCoinsCheatingChains) {
      this.deleteChainsFromSender(sender, receiver);
    } else if (sendingCoins > totalCoinsCheatingChains) {
      this.change = sendingCoins - totalCoinsCheatingChains;
      this.deleteChainsFromSender(sender, receiver);
      let sendingPiles = this.takeMoneyFromSenderPiles(sender);
      // Now, here we do give the sender index for the remaining change as he used his original money.
      this.updateIndex(sender, receiver, this.change);
      // Add relations to Receiver's From Array.
      this.updateReceiverFromArray(sender, receiver, sendingPiles);
    } else {
      let sendingPiles = this.updateChainsFromSender(
        sender,
        receiver,
        sendingCoins,
        cheatingChainsToPercentMap
      );
      this.updateReceiverFromMap(sender, receiver, sendingPiles);
    }

    this.punishCheaters(receiver, cheatingChainsToPercentMap, sendingCoins);
    this.updateSenderTo(sender, receiver);
  }

  deleteChainsFromSender(sender, receiver) {
    // Calculates indexes in sender FROM array where receiver is present.
    let indexes = [];

    sender.from.forEach((pile, index) => {
      pile.chain.forEach((rec) => {
        if (receiver.address === rec.address) {
          indexes.push(index);
        }
      });
    });

    // Delete the cheating pile chains for the receiver.
    indexes.forEach((index) => {
      sender.from.splice(index, 1);
    });
  }

  // {chain: [C,D], coins: 40} -> 0.4 , {chain: [C,B], coins: 60} -> 0.6
  punishCheaters(receiver, cheatingChainsToPercentMap, sendingCoins) {
    cheatingChainsToPercentMap.forEach((percent, cheatingPile) => {
      cheatingPile.chain.forEach((cheater) => {
        let penalty = sendingCoins * percent;

        if (receiver.address === cheater.address) {
          receiver.usageIndex -= penalty;
        }
        // cheater.usageIndex -= penalty;
      });
    });
  }

  // To take piles of money looking at the change and collect them in an array
  // that will be updated in receiver's from array.
  takeMoneyFromSenderPiles(sender) {
    let sendingPiles = [];

    while (this.change >= sender.from[0].coins) {
      this.change -= sender.from[0].coins;
      sendingPiles.push(sender.from[0]);
      sender.from.splice(0, 1);
    }

    if (this.change > 0) {
      if (sender.from.length > 0) {
        sender.from[0].coins -= this.change;
        let pile = sender.from[0];
        pile.coins = this.change;
        sendingPiles.push(pile);
      } else {
        let pile = { chain: [sender], coins: this.change };
        sendingPiles.push(pile);
      }
    }

    return sendingPiles;
  }

  // cheatingChainsToPercentageMap = {chain: [C,D], coins: 40} -> 0.4 , {chain: [C,B], coins: 60} -> 0.6
  updateChainsFromSender(
    sender,
    receiver,
    sendingCoins,
    cheatingChainsToPercentMap
  ) {
    // Calculates indexes in sender FROM where receiver is present.
    let indexes = [];

    sender.from.forEach((pile, index) => {
      pile.chain.forEach((rec) => {
        if (receiver.address === rec.address) {
          indexes.push(index);
        }
      });
    });

    let sendingPiles = new Map();

    indexes.forEach((index) => {
      // let shouldSkip = false;

      // TODO: Better way - compare chain arrays.
      cheatingChainsToPercentMap.forEach((percent, cheatingPile) => {
        // if (shouldSkip) {
        //   return;
        // }

        // Check if cheatingPile.chain is a subset of sender.from[index].chain
        let isSubset = cheatingPile.chain.every((val) =>
          sender.from[index].chain.includes(val)
        );

        if (isSubset) {
          let sendingSum = sendingCoins * percent;
          sender.from[index].coins -= sendingSum;
          sendingPiles.set(index, sendingSum);
        }

        // if (sender.from[index].coins === cheatingPile.coins) {
        //   let sendingSum = sendingCoins * percent;
        //   sender.from[index].coins -= sendingSum;
        //   sendingPiles.set(index, sendingSum);
        // }

        // shouldSkip = true;
        // return;
      });
    });

    return sendingPiles;
  }

  // Adding relations to receiver's FROM array after a transaction.
  updateReceiverFromArray(sender, receiver, sendingPiles) {
    sendingPiles.forEach((pile) => {
      pile.chain.splice(0, 0, sender);
      receiver.from.push(pile);
    });
    // sendingPiles.forEach((pile) => {
    //   receiver.from.push(pile);
    // });
  }

  // sendingPiles Map = 0 -> moneyToBeAdded
  updateReceiverFromMap(sender, receiver, sendingPiles) {
    // let sendingPilesUpdated = [];
    sendingPiles.forEach((sendingSum, index) => {
      let pile = sender.from[index];
      pile.chain.splice(0, 0, sender);
      pile.coins = sendingSum;
      receiver.from.push(pile);
    });
  }

  updateSenderTo(sender, receiver) {
    if (sender.to.get(receiver) !== undefined) {
      sender.to.set(receiver, sender.to.get(receiver) + 1);
    } else {
      sender.to.set(receiver, 1);
    }
  }

  isCheating(sender, receiver) {
    if (
      this.createCheatingChainsForReceiverArray(sender, receiver).length === 0
    ) {
      return false;
    } else {
      return true;
    }
  }

  isRepeatedTransaction(sender, receiver) {
    if (sender.to.get(receiver) !== undefined) {
      return true;
    }
    return false;
  }

  // cheaterChains[{ chain: [C, D], coins: 40}, { chain: [C,B], coins: 60}]
  calculateTotalCoinsCheatingChains(cheaterChains) {
    let total = 0;

    cheaterChains.forEach((cheaterChain) => {
      total += cheaterChain.coins;
    });

    return total;
  }
};
