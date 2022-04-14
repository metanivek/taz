/** @module classification/state */

const create = (ops, address) => {
  const firstOp = ops[0];

  return {
    contractCalls: [],
    otherInitiated: firstOp.sender.address !== address,
    firstOpHasAmount: firstOp.amount > 0,
    mint: false,
    transfer: false,
    bid: false,
    burn: false,
  };
};

const setFlag = (state, key, value) => {
  state[key] = state[key] || value;
};

const setMint = (state, value) => setFlag(state, "mint", value);
const setTransfer = (state, value) => setFlag(state, "transfer", value);
const setBid = (state, value) => setFlag(state, "bid", value);
const setBurn = (state, value) => setFlag(state, "burn", value);

export default {
  create,
  setMint,
  setTransfer,
  setBid,
  setBurn,
};
