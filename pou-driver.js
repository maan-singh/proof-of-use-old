'use strict';

let Blockchain = require('./blockchain.js');
let PoUBlock = require('./pou-block.js');
let PoUClient = require('./pou-client.js');
let PoUMiner = require('./pou-miner.js');
let Transaction = require('./transaction.js');

let FakeNet = require('./fakeNet.js');

console.log('Starting simulation.  This may take a moment...');

let fakeNet = new FakeNet();

// Clients
let alice = new PoUClient({ name: 'Alice', net: fakeNet });
let bob = new PoUClient({ name: 'Bob', net: fakeNet });
let charlie = new PoUClient({ name: 'Charlie', net: fakeNet });

// Miners
let minnie = new PoUMiner({ name: 'Minnie', net: fakeNet });
let mickey = new PoUMiner({ name: 'Mickey', net: fakeNet });

// Creating genesis block
let genesis = Blockchain.makeGenesis({
  blockClass: PoUBlock,
  transactionClass: Transaction,
  clientBalanceMap: new Map([
    [alice, 200],
    [bob, 200],
    [charlie, 200],
    [minnie, 200],
    [mickey, 200],
  ]),
  clientKeyMap: new Map([
    [alice.address, alice],
    [bob.address, bob],
    [charlie.address, charlie],
    [minnie.address, minnie],
    [mickey.address, mickey],
  ]),
});

// // Late miner - Donald has more mining power, represented by the miningRounds.
// // (Mickey and Minnie have the default of 2000 rounds).
// let donald = new PoUMiner({
//   name: 'Donald',
//   net: fakeNet,
//   startingBlock: genesis,
//   miningRounds: 3000,
// });

function showBalances(client) {
  console.log(`Alice has ${client.lastBlock.balanceOf(alice.address)} gold.`);
  console.log(`Bob has ${client.lastBlock.balanceOf(bob.address)} gold.`);
  console.log(
    `Charlie has ${client.lastBlock.balanceOf(charlie.address)} gold.`
  );
  console.log(`Minnie has ${client.lastBlock.balanceOf(minnie.address)} gold.`);
  console.log(`Mickey has ${client.lastBlock.balanceOf(mickey.address)} gold.`);
  //   console.log(`Donald has ${client.lastBlock.balanceOf(donald.address)} gold.`);
}

// Showing the initial balances from Alice's perspective, for no particular reason.
console.log('Initial balances:');
showBalances(alice);

fakeNet.register(alice, bob, charlie, minnie, mickey);

// Miners start mining.
minnie.initialize();
mickey.initialize();

// Alice transfers some money to Bob.
console.log(`Alice is transferring 100 gold to ${bob.address}`);
alice.postTransaction([{ amount: 100, address: bob.address }]);

console.log(`Charlie is transferring 50 gold to ${alice.address}`);
charlie.postTransaction([{ amount: 50, address: alice.address }]);

// console.log(`Charlie is transferring 20 gold to ${mickey.address}`);
// charlie.postTransaction([{ amount: 20, address: mickey.address }]);

// setTimeout(() => {
//   console.log();
//   console.log(`Bob is transferring 50 gold to ${charlie.address}`);
//   console.log();
//   bob.postTransaction([{ amount: 50, address: charlie.address }]);
// }, 2500);

// setTimeout(() => {
//   console.log();
//   console.log(`Charlie is transferring 20 gold to ${mickey.address}`);
//   console.log();
//   charlie.postTransaction([{ amount: 20, address: mickey.address }]);
// }, 5000);

// setTimeout(() => {
//   console.log();
//   console.log('***Starting a late-to-the-party miner***');
//   console.log();
//   fakeNet.register(donald);
//   donald.initialize();
// }, 2000);

// Print out the final balances after it has been running for some time.
setTimeout(() => {
  console.log();
  console.log(
    `Minnie has a chain of length ${minnie.currentBlock.chainLength}:`
  );

  console.log();
  console.log(
    `Mickey has a chain of length ${mickey.currentBlock.chainLength}:`
  );

  //   console.log();
  //   console.log(
  //     `Donald has a chain of length ${donald.currentBlock.chainLength}:`
  //   );

  console.log();
  console.log("Final balances (Minnie's perspective):");
  showBalances(minnie);

  console.log();
  console.log("Final balances (Alice's perspective):");
  showBalances(alice);

  console.log('Index of Alice:');
  console.log(alice.index());
  console.log('Index of Bob:');
  console.log(bob.index());
  console.log('Index of Charlie:');
  console.log(charlie.index());

  console.log('From of Alice:');
  console.log(alice.seeFrom());
  console.log('From of Bob:');
  console.log(bob.seeFrom());
  console.log('From of Charlie:');
  console.log(charlie.seeFrom());

  console.log('To of Alice:');
  console.log(alice.seeTo());
  console.log('To of Bob:');
  console.log(bob.seeTo());
  console.log('To of Charlie:');
  console.log(charlie.seeTo());

  //   console.log();
  //   console.log("Final balances (Donald's perspective):");
  //   showBalances(donald);

  process.exit(0);
}, 10000);
