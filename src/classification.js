/** @module classification */
import constants from "./constants.js";
import utils from "./utils.js";
import classificationMetadata from "./classification/metadata.js";
import classificationState from "./classification/state.js";
import classificationAmounts from "./classification/amounts.js";
import classificationTransfers from "./classification/transfers.js";
import registry from "./classifiers/registry.js";

const {
  XTZ,
  BURN_ADDR,
  TYPE,
  MINT_ENTRYPOINTS,
  MINT_CONTRACTS,
  FXHASH_GENTK,
  COMMON_SKELES,
} = constants;

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

    const metadata = classificationMetadata.create(ops);
    const state = classificationState.create(ops, address);

    try {
      for (const op of ops) {
        const { parameter, target, amount = 0 } = op;
        const initiator = op.initiator?.address;
        const sender = op.sender.address;

        classificationMetadata.addFees(metadata, op, address);

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
          const amounts = classificationAmounts.create();
          if (sender === address) {
            classificationAmounts.addOutgoing(
              amounts,
              amount,
              undefined,
              XTZ,
              address,
              target.address
            );
          } else if (target?.address === address) {
            let from;
            if (state.firstOpHasAmount && state.bid === false) {
              from = initiator || sender;
            } else {
              from = sender;
            }
            classificationAmounts.addIncoming(
              amounts,
              amount,
              undefined,
              XTZ,
              from,
              address
            );
          }
          classificationMetadata.addAmounts(metadata, amounts);
        }

        // contract calls
        if (parameter !== undefined) {
          const { entrypoint, value } = parameter;
          state.contractCalls.push(entrypoint);
          const contract = target.address;

          classificationState.setMint(
            state,
            MINT_ENTRYPOINTS.includes(entrypoint) &&
              MINT_CONTRACTS.includes(contract)
          );
          classificationState.setTransfer(state, entrypoint === "transfer");
          classificationState.setBid(state, entrypoint === "bid");
          classificationState.setBurn(state, entrypoint === "burn");

          const registryHandled = registry.classify(
            contract,
            metadata,
            state,
            op,
            address
          );
          if (registryHandled) {
            continue;
          }

          if (entrypoint == "transfer") {
            const amounts = classificationTransfers.createAmountsMultiple(
              contract,
              value,
              address,
              sender
            );
            classificationMetadata.addAmounts(metadata, amounts);
            classificationState.setBurn(
              state,
              amounts.outgoing.some((x) => x.to === BURN_ADDR)
            );
          }
          // handle general ledger changes
          // TODO: handle `assets.ledger` ?
          else {
            const ledgerChanges =
              op.diffs?.filter((d) => d.path === "ledger") ?? [];
            if (ledgerChanges.length > 0) {
              classificationState.setTransfer(state, true);

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
                    const amounts = classificationTransfers.createAmountsSingle(
                      token,
                      tokenId,
                      amount,
                      address,
                      sender,
                      from,
                      to
                    );
                    classificationMetadata.addAmounts(metadata, amounts);
                  }
                }
              }
            }
          }
        }
      }

      //
      // type determinations
      //

      if (metadata.in.length > 1 || metadata.out.length > 1) {
        metadata.type = TYPE.UNKNOWN;
        classificationMetadata.removePseudoAmounts(metadata);
      }

      const { contractCalls, otherInitiated, mint, transfer, bid, burn } =
        state;

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
        console.error(`Unknown classification in ${ops[0].hash}`);
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
