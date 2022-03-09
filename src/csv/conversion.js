/** @module csv/conversion */
import constants from "../constants.js";
const { CSV_HEADERS: H } = constants;

/**
 * Convert operation group objects into CSV rows
 *
 * @param {Array} ops
 * @param {Boolean} feeOnlyRows
 *
 * @returns {Array} objects representing CSV rows
 */
const operationGroupsToRows = (ops) => {
  const get = (arr, idx) => {
    if (idx >= arr.length) return undefined;
    return arr[idx];
  };

  return ops.reduce((acc, op) => {
    const addRow = (m, i, o, includeFees = true) => {
      acc.push({
        [H.TIMESTAMP]: m.timestamp,
        [H.TYPE]: m.type,
        [H.FIAT]: m.fiatQuote,
        [H.IN_AMT]: i?.amount,
        [H.IN_TOKEN]: i?.token,
        [H.IN_TOKEN_ID]: i?.tokenId,
        [H.IN_TOKEN_FROM]: i?.from,
        [H.OUT_AMT]: o?.amount,
        [H.OUT_TOKEN]: o?.token,
        [H.OUT_TOKEN_ID]: o?.tokenId,
        [H.OUT_TOKEN_TO]: o?.to,
        [H.FEES]: includeFees ? m.fees : 0, // only include fees in first row to prevent overcounting
        [H.ACCOUNT]: op.address,
        [H.OP]: m.hash,
        [H.LEVEL]: m.level,
      });
    };
    const m = op.metadata;
    const incoming = m.in;
    const outgoing = m.out;
    if (incoming.length > 1 && outgoing.length > 1) {
      console.log(
        m.hash,
        `has multiple in and out, ${m.hash}. please report on github issues :)`
      );
    }

    const maxLength = Math.max(incoming.length, outgoing.length);
    if (maxLength === 0) {
      addRow(m, undefined, undefined, true);
    } else {
      for (let k = 0; k < maxLength; k++) {
        const i = get(incoming, k);
        const o = get(outgoing, k);
        addRow(m, i, o, k === 0);
      }
    }

    return acc;
  }, []);
};

export default {
  operationGroupsToRows,
};
