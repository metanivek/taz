/** @module classification/metadata */
import constants from "../constants.js";

const { TYPE, CURRENCIES } = constants;

const getQuote = (operation) => {
  const { quote } = operation;

  for (const currency of CURRENCIES) {
    const key = currency.toLowerCase();
    if (quote[key] !== undefined) {
      return quote[key];
    }
  }
};

const create = (ops) => {
  const firstOp = ops[0];

  return {
    type: TYPE.UNKNOWN,
    in: [],
    out: [],
    fees: 0,
    timestamp: firstOp.timestamp,
    fiatQuote: getQuote(firstOp),
    level: firstOp.level,
    hash: firstOp.hash,
  };
};

const addFees = (metadata, op, address) => {
  const { bakerFee = 0, storageFee = 0 } = op;
  const paysFees =
    op.sender.address === address || op.initiator?.address === address;

  if (paysFees) {
    metadata.fees += bakerFee + storageFee;
  }
};

const addAmounts = (metadata, amounts, pseudo = false) => {
  // helper function
  const addAmount = (metadataAmount, amount, dir) => {
    const existing = metadataAmount.find(
      (a) =>
        a.token === amount.token &&
        ((dir === "out" && a.to === amount.to) ||
          (dir === "in" && a.from === amount.from)) &&
        a.tokenId === amount.tokenId
    );

    if (existing) {
      existing.amount += amount.amount;
    } else {
      if (pseudo) amount.pseudo = true;
      metadataAmount.push(amount);
    }
  };

  // add incoming and outgoing
  const { incoming, outgoing } = amounts;
  for (const i of incoming) {
    addAmount(metadata.in, i, "in");
  }
  for (const o of outgoing) {
    addAmount(metadata.out, o, "out");
  }

  // consolidate amounts for incoming/outgoing of same token type
  // TODO: removing entries could lose in/out address information.
  // is this a problem?
  for (let iI = 0; iI < metadata.in.length; iI++) {
    const i = metadata.in[iI];
    const oI = metadata.out.findIndex(
      (a) => a.token === i.token && a.tokenId === i.tokenId
    );
    if (oI > -1) {
      const o = metadata.out[oI];
      const amount = i.amount - o.amount;
      if (amount === 0) {
        // amount zero, remove both entries
        metadata.in.splice(iI, 1);
        metadata.out.splice(oI, 1);
      } else if (amount > 0) {
        // set in to amount and remove out entry
        metadata.in[iI].amount = amount;
        metadata.out.splice(oI, 1);
      } else {
        // set out to amount and remove in entry
        metadata.out[oI].amount = Math.abs(amount);
        metadata.in.splice(iI, 1);
      }
    }
  }
};

const removePseudoAmounts = (metadata) => {
  const removePseudos = (amounts) => {
    return amounts.filter((a) => a.pseudo === undefined || a.pseudo === false);
  };
  metadata.in = removePseudos(metadata.in);
  metadata.out = removePseudos(metadata.out);
};

export default {
  create,
  addFees,
  addAmounts,
  removePseudoAmounts,
};
