/** @module classification/transfers */
import utils from "../utils.js";
import amounts from "./amounts.js";

const createAmountsSingle = (
  token,
  tokenId,
  amount,
  address,
  sender,
  from,
  to
) => {
  const container = amounts.create();

  // detect incoming
  const isIncoming = to === address; // direct transfer in

  // detect outgoing
  const isFromAddr = from === address; // direct transfer out
  const isFromContract = utils.isKT(from); // marketplace actions like collect
  const isContractMediated = utils.isKT(sender) && utils.isTz(from); // eg, fulfill_bid
  const isOutgoing = isFromAddr || isFromContract || isContractMediated;

  if (isIncoming) {
    amounts.addIncoming(container, amount, tokenId, token, from, to);
  } else if (isOutgoing) {
    amounts.addOutgoing(container, amount, tokenId, token, from, to);
  }
  return container;
};

const createAmountsMultiple = (token, transfers, address, sender) => {
  const container = amounts.create();

  // make FA1.2 look like FA2
  if (Array.isArray(transfers) === false) {
    transfers = [
      {
        from_: transfers.from,
        txs: [
          {
            to_: transfers.to,
            amount: transfers.value,
            token_id: "0",
          },
        ],
      },
    ];
  }

  for (const transfer of transfers) {
    const from = transfer["from_"];
    for (const tx of transfer.txs) {
      const to = tx["to_"];
      const tokenId = tx.token_id;
      const amount = Math.abs(tx.amount);
      const result = createAmountsSingle(
        token,
        tokenId,
        amount,
        address,
        sender,
        from,
        to
      );
      amounts.addAll(container, result);
    }
  }

  return container;
};

export default {
  createAmountsMultiple,
  createAmountsSingle,
};
