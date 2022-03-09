/** @module classification */
import constants from "./constants.js";
import utils from "./utils.js";

const {
  XTZ,
  BURN_ADDR,
  TYPE,
  CURRENCIES,
  OBJKT_ENGLISH_AUCTIONS,
  OBJKT_MARKETPLACES,
  MINT_ENTRYPOINTS,
  MINT_CONTRACTS,
  FXHASH_GENTK,
  COMMON_SKELES,
} = constants;

const createMetadata = () => {
  return {
    type: TYPE.UNKNOWN,
    in: [],
    out: [],
    fees: 0,
    timestamp: undefined,
    fiatQuote: undefined,
    level: undefined,
  };
};

const getQuote = (operation) => {
  const { quote } = operation;

  for (const currency of CURRENCIES) {
    const key = currency.toLowerCase();
    if (quote[key] !== undefined) {
      return quote[key];
    }
  }
};

// TODO: extract into tokens module
const createTokenDecimals = (tokens) => {
  const tokenDecimals = tokens.reduce((acc, t) => {
    acc[t.address] = t.decimals;
    return acc;
  }, {});
  return {
    XTZ: 6,
    ...tokenDecimals,
  };
};

const normalizeAmounts = (amount, tokenDecimals) => {
  return amount.map((a) => {
    if (a.token === undefined) return a;
    if (tokenDecimals[a.token]) {
      a.amount /= Math.pow(10, tokenDecimals[a.token]);
    }
    return a;
  });
};

const paysFees = (op, address) => {
  return op.sender.address === address || op.initiator?.address === address;
};

const classifyTransfer = (
  token,
  tokenId,
  amount,
  address,
  sender,
  from,
  to
) => {
  const incoming = [];
  const outgoing = [];

  // detect incoming
  const isIncoming = to === address; // direct transfer in

  // detect outgoing
  const isFromAddr = from === address; // direct transfer out
  const isFromContract = utils.isKT(from); // marketplace actions like collect
  const isContractMediated = utils.isKT(sender) && utils.isTz(from); // eg, fulfill_bid
  const isOutgoing = isFromAddr || isFromContract || isContractMediated;

  const amountRec = {
    amount,
    tokenId,
    to,
    from,
    token,
  };
  if (isIncoming) {
    incoming.push(amountRec);
  } else if (isOutgoing) {
    outgoing.push(amountRec);
  }
  return { incoming, outgoing };
};

const classifyTransfers = (token, transfers, address, sender) => {
  const incoming = [];
  const outgoing = [];

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
      const result = classifyTransfer(
        token,
        tokenId,
        amount,
        address,
        sender,
        from,
        to
      );
      incoming.push(...result.incoming);
      outgoing.push(...result.outgoing);
    }
  }

  return {
    incoming,
    outgoing,
  };
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

const splitOperationGroup = (operationGroup) => {
  const results = [];
  let current = [];
  for (const op of operationGroup.ops) {
    if (op.hasInternals && current.length > 0) {
      results.push(current);
      current = [];
    }
    current.push(op);
  }
  results.push(current);
  return results;
};

const affectsAddress = (address, ops) => {
  const entrypointAffectsAddress = (address, op) => {
    const { parameter } = op;
    if (parameter) {
      const isTransferForAddress =
        parameter.entrypoint === "transfer" &&
        parameter.value?.some(
          (v) =>
            v["from_"] === address || v.txs?.some((t) => t["to_"] === address)
        );
      const referencesAddress = parameter.value?.address === address;
      return isTransferForAddress || referencesAddress;
    }
    return false;
  };
  return ops.some(
    (o) =>
      o.sender?.address === address ||
      o.target?.address === address ||
      entrypointAffectsAddress(address, o)
  );
};

/* classifies single operation group, splitting into logical groups if necessary */
const classify = (operationGroup, tokens) => {
  const results = [];
  const tokenDecimals = createTokenDecimals(tokens);
  const { address } = operationGroup;
  const logicalGroups = splitOperationGroup(operationGroup);
  for (const ops of logicalGroups) {
    if (affectsAddress(address, ops) === false) continue;
    const metadata = createMetadata();
    try {
      const firstOp = ops[0];
      metadata.level = firstOp.level;
      metadata.timestamp = firstOp.timestamp;
      metadata.fiatQuote = getQuote(firstOp);
      metadata.hash = firstOp.hash;

      let contractCalls = [];
      const otherInitiated = firstOp.sender.address !== address;
      const firstOpHasAmount = firstOp.amount > 0;
      let mint = false;
      let transfer = false;
      let burn = false;
      let bid = false;

      for (const op of ops) {
        const {
          parameter,
          target,
          amount = 0,
          bakerFee = 0,
          storageFee = 0,
        } = op;
        const initiator = op.initiator?.address;
        const sender = op.sender.address;

        // handle fees first because we track these for any operation type
        if (paysFees(op, address)) {
          metadata.fees += bakerFee + storageFee;
        }

        if (op.type !== "transaction") {
          if (op.type === "delegation") {
            metadata.type = TYPE.DELEGATION;
          } else if (op.type === "origination") {
            metadata.type = TYPE.ORIGINATION;
          } else {
            metadata.type = TYPE.REMOVE;
          }

          // skip further processing for non-transaction operations
          continue;
        }

        // amounts
        if (amount > 0) {
          const amounts = { incoming: [], outgoing: [] };
          if (sender === address) {
            amounts.outgoing.push({
              amount,
              from: address,
              to: target.address,
              token: XTZ,
            });
          } else if (target?.address === address) {
            let from;
            if (firstOpHasAmount && bid === false) {
              from = initiator || sender;
            } else {
              from = sender;
            }
            amounts.incoming.push({
              amount,
              to: address,
              from,
              token: XTZ,
            });
          }
          addAmounts(metadata, amounts);
        }

        // contract calls
        if (parameter !== undefined) {
          const { entrypoint, value } = parameter;
          contractCalls.push(entrypoint);
          const token = target.address;

          if (entrypoint == "transfer") {
            const amounts = classifyTransfers(token, value, address, sender);
            addAmounts(metadata, amounts);
            burn = burn || amounts.outgoing.some((x) => x.to === BURN_ADDR);
          }
          // objkt.com english auctions (v1)
          else if (target.address === OBJKT_ENGLISH_AUCTIONS[0]) {
            if (entrypoint === "bid" && sender === address) {
              metadata.type = TYPE.AUCTION_BID;
              const tokenId = value;
              const amount = 1;
              const from = token;
              const to = address;
              const amounts = classifyTransfer(
                token,
                tokenId,
                amount,
                address,
                sender,
                from,
                to
              );

              addAmounts(metadata, amounts, true);
            } else if (entrypoint === "conclude_auction") {
              metadata.type = TYPE.AUCTION_SETTLE;
              const tokenId = value;
              const amount = 1;
              const from = address;
              const to = token;
              const amounts = classifyTransfer(
                token,
                tokenId,
                amount,
                address,
                sender,
                from,
                to
              );

              addAmounts(metadata, amounts, true);
            }
          }
          // objkt.com marketplace offers (v1)
          else if (target.address === OBJKT_MARKETPLACES[0]) {
            if (entrypoint === "bid") {
              metadata.type = TYPE.OFFER;
              const tokenId = op.diffs[0].content.key;
              const amount = 1;
              const from = token;
              const to = address;
              const amounts = classifyTransfer(
                token,
                tokenId,
                amount,
                address,
                sender,
                from,
                to
              );

              addAmounts(metadata, amounts, true);
            } else if (
              entrypoint === "retract_bid" ||
              entrypoint === "fulfill_bid"
            ) {
              if (entrypoint === "retract_bid") {
                metadata.type = TYPE.OFFER_RETRACT;
              } else {
                metadata.type = TYPE.OFFER_FULFILL;
              }
              const tokenId = value;
              const amount = 1;
              const from = address;
              const to = token;
              const amounts = classifyTransfer(
                token,
                tokenId,
                amount,
                address,
                sender,
                from,
                to
              );

              addAmounts(metadata, amounts, true);
            }
          }
          // handle custom transfers that happen through mint
          else if (
            entrypoint === "mint" &&
            (target.address === FXHASH_GENTK ||
              target.address === COMMON_SKELES)
          ) {
            const to = value.address;
            // fx(hash) mint entrypoint can represent both sending (sale) and receiving (buy)
            const isSendAndReceiveKT = target.address === FXHASH_GENTK;
            // skeles mint entrypoint is only for receiving
            // they could be minted in batches so we want to ignore others
            const isToAddress = to === address;

            if (isToAddress || isSendAndReceiveKT) {
              transfer = true;
              const amount = parseInt(value.amount ?? 1);
              const tokenId = value.token_id;
              const from = sender;
              const amounts = classifyTransfer(
                token,
                tokenId,
                amount,
                address,
                sender,
                from,
                to
              );
              addAmounts(metadata, amounts);
            }
          }
          // handle general ledger changes
          // TODO: handle `assets.ledger` ?
          else {
            const ledgerChanges =
              op.diffs?.filter((d) => d.path === "ledger") ?? [];
            if (ledgerChanges.length > 0) {
              transfer = true;

              for (const ledgerChange of ledgerChanges) {
                const { action, content } = ledgerChange;
                const { key, value } = content;
                const token = target.address;
                // TODO: handle update_key and remove_key (if necessary?)
                if (action === "add_key") {
                  let amount;
                  if (typeof value === "string") {
                    amount = parseInt(value);
                  } else {
                    amount = 1;
                  }

                  const from = token;
                  // fxhash issuer v1 || mooncake || fxhash issuer v2
                  // TODO: better system here :D
                  const tokenId = key.nat || key.token_id || key;
                  const to = key.address || key.owner || value.author;

                  // TODO: handle this case when address is the sender
                  if (to === address) {
                    const amounts = classifyTransfer(
                      token,
                      tokenId,
                      amount,
                      address,
                      sender,
                      from,
                      to
                    );
                    addAmounts(metadata, amounts);
                  }
                }
              }
            }
          }

          //
          // set operation group global bools
          //
          mint =
            mint ||
            (MINT_ENTRYPOINTS.includes(entrypoint) &&
              MINT_CONTRACTS.includes(target.address));
          transfer = transfer || entrypoint === "transfer";
          bid = bid || entrypoint === "bid";
          burn = burn || entrypoint === "burn";
        }
      }

      //
      // type determinations
      //

      const removePseudoTokens = (amounts) => {
        return amounts.filter(
          (a) => a.pseudo === undefined || a.pseudo === false
        );
      };
      if (metadata.in.length > 1 || metadata.out.length > 1) {
        metadata.type = TYPE.UNKNOWN;
        metadata.in = removePseudoTokens(metadata.in);
        metadata.out = removePseudoTokens(metadata.out);
      }

      if (metadata.type === TYPE.UNKNOWN) {
        if (metadata.in.length > 0 && metadata.out.length == 0) {
          metadata.type = TYPE.RECEIVE;
          if (bid) {
            metadata.type = TYPE.AUCTION_OUTBID;
          } else if (mint && otherInitiated === false) {
            // TODO: assumption that there are no outgoing transactions for a mint
            // could be wrong (eg, perhaps with Versum and Materia?)
            metadata.type = TYPE.MINT;
          } else if (transfer) {
            if (otherInitiated) {
              metadata.type = TYPE.AIRDROP;
            } else {
              metadata.type = TYPE.RECEIVE_TOKEN;
            }
          }
        } else if (metadata.out.length > 0 && metadata.in.length == 0) {
          metadata.type = TYPE.SEND;
          if (transfer) {
            if (burn) {
              metadata.type = TYPE.BURN;
            } else {
              const isToKT = metadata.out.some((a) => utils.isKT(a.to));
              if (isToKT) {
                metadata.type = TYPE.SEND_TOKEN_KT;
              } else {
                metadata.type = TYPE.SEND_TOKEN_TZ;
              }
            }
          }
        }

        if (metadata.out.length > 0 && metadata.in.length > 0) {
          if (otherInitiated) {
            // eg, somebody collects your NFT
            metadata.type = TYPE.SALE;
          } else {
            metadata.type = TYPE.TRADE;
          }
        }
      }

      if (metadata.type === TYPE.UNKNOWN) {
        if (metadata.out.length == 0 || metadata.in.length == 0) {
          if (contractCalls.length > 0) {
            metadata.type = TYPE.CONTRACT_CALL;
          }
        }
      }

      if (metadata.type === TYPE.UNKNOWN) {
        console.error(`Unknown classification in ${firstOp.hash}`);
      } else if (metadata.type !== TYPE.REMOVE) {
        metadata.in = normalizeAmounts(metadata.in, tokenDecimals);
        metadata.out = normalizeAmounts(metadata.out, tokenDecimals);
        metadata.fees /= Math.pow(10, 6); // fees use 6 decimals like XTZ

        results.push({
          metadata,
          address,
          ops,
        });
      }
    } catch (ex) {
      console.error(ex);
      console.error(metadata);
      process.exit(1);
    }
  }

  return results;
};

/**
 * Classifies a single operation group from the perspective of a given address
 *
 * @param {String} address - Address of perspective
 * @param {Array} group - Item from {@link module:collection~downloadAllOperationGroups}
 * @param {Array} tokens - Tokens used for decimal interpretation
 *
 */
const classifyOperationGroup = (address, group, tokens = []) => {
  return classify(
    {
      address,
      ops: group,
    },
    tokens
  );
};

/**
 * Classifies an array of operation groups from the perspective of a given address
 *
 * @param {String} address - Address of perspective
 * @param {Array} ops - Operation groups from {@link module:collection~downloadAllOperationGroups}
 * @param {Array} tokens - Tokens used for decimal interpretation
 *
 */
const classifyOperationGroups = (address, ops, tokens = []) => {
  return ops.reduce((acc, group) => {
    return acc.concat(classifyOperationGroup(address, group, tokens));
  }, []);
};

export default {
  classifyOperationGroup,
  classifyOperationGroups,
};
