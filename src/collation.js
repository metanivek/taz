/** @module collation */
import process from "process";
import constants from "./constants.js";
import utils from "./utils.js";

const { CSV_HEADERS: H, TYPE, XTZ } = constants;

const classify = (rows, accounts) => {
  // accumulate different transaction types for global adjustments
  const { boughtTokens, cexTransferHashes, bidsAndOffers, contractsWithXTZ } =
    rows.reduce(
      (acc, r, idx) => {
        const level = r[H.LEVEL];
        const t = r[H.TYPE];
        const o = r[H.OUT_TOKEN];
        const i = r[H.IN_TOKEN];
        const iId = r[H.IN_TOKEN_ID];
        const isBuyType = t === TYPE.TRADE || t === TYPE.AIRDROP;
        const isCexTransfer = t === TYPE.TRANSFER && utils.isEmpty(r[H.LEVEL]);
        const isBidOrOffer = t === TYPE.AUCTION_BID || t === TYPE.OFFER;
        // purchases
        if (isBuyType) {
          // check for XTZ (or "free") to filter token for token trades
          const outIsNoneOrXtz = utils.isEmpty(o) || o === XTZ;
          if (outIsNoneOrXtz) {
            if (acc.boughtTokens[i] === undefined) {
              acc.boughtTokens[i] = [];
            }
            acc.boughtTokens[i].push({ tokenId: iId, level });
          }
        }
        // cex transfers
        else if (isCexTransfer) {
          acc.cexTransferHashes.push(r[H.OP]);
        }
        // bids and offers
        else if (isBidOrOffer) {
          acc.bidsAndOffers.push({
            token: i,
            tokenId: iId,
            row: r,
          });
        }
        // send xtz to contract
        else if (t === TYPE.SEND && utils.isKT(r[H.OUT_TOKEN_TO])) {
          const kt = r[H.OUT_TOKEN_TO];
          if (acc.contractsWithXTZ[kt] === undefined) {
            acc.contractsWithXTZ[kt] = [];
          }
          const amount = utils.isEmpty(r[H.IN_AMT]) ? 1 : parseInt(r[H.IN_AMT]);
          acc.contractsWithXTZ[kt].push({
            idx,
            amount,
            xtzPerUnit: parseFloat(r[H.OUT_AMT]) / amount,
          });
        }
        return acc;
      },
      {
        boughtTokens: {},
        cexTransferHashes: [],
        bidsAndOffers: [],
        contractsWithXTZ: {},
      }
    );

  const clearInAndOutInfo = (r) => {
    r[H.IN_AMT] = undefined;
    r[H.IN_TOKEN] = undefined;
    r[H.IN_TOKEN_ID] = undefined;
    r[H.IN_TOKEN_FROM] = undefined;
    r[H.OUT_AMT] = undefined;
    r[H.OUT_TOKEN] = undefined;
    r[H.OUT_TOKEN_ID] = undefined;
    r[H.OUT_TOKEN_TO] = undefined;
  };

  const transferOutInfo = (srcRow, destRow, outAmt) => {
    destRow[H.OUT_AMT] = outAmt ?? srcRow[H.OUT_AMT];
    destRow[H.OUT_TOKEN] = srcRow[H.OUT_TOKEN];
    destRow[H.OUT_TOKEN_ID] = srcRow[H.OUT_TOKEN_ID];
    destRow[H.OUT_TOKEN_TO] = srcRow[H.OUT_TOKEN_TO];
  };

  // re-classify rows
  const reClassifiedRows = rows.reduce((acc, oldR) => {
    const r = { ...oldR };
    const level = r[H.LEVEL];
    const t = r[H.TYPE];
    const iAddr = r[H.IN_TOKEN_FROM];
    const o = r[H.OUT_TOKEN];
    const oAddr = r[H.OUT_TOKEN_TO];
    if (t === TYPE.TRADE && o === XTZ) {
      // "buy" tokens with XTZ
      r[H.TYPE] = TYPE.BUY;
    } else if (
      (t === TYPE.SEND_TOKEN_TZ && accounts.includes(oAddr)) ||
      (t === TYPE.AIRDROP && accounts.includes(iAddr))
    ) {
      // transferring tokens between your own accounts
      r[H.TYPE] = TYPE.TRANSFER_TOKEN;
    } else if (
      (t === TYPE.SEND && accounts.includes(oAddr)) ||
      (t === TYPE.RECEIVE && accounts.includes(iAddr))
    ) {
      // transferring XTZ between your own accounts
      r[H.TYPE] = TYPE.TRANSFER;
    } else if (
      (t === TYPE.RECEIVE || t === TYPE.SEND) &&
      cexTransferHashes.includes(r[H.OP])
    ) {
      // trasnferring XTZ from CEX to one of your accounts
      r[H.TYPE] = TYPE.TRANSFER;
    } else if (t === TYPE.TRADE && r[H.LEVEL] === undefined) {
      // distinguish CEX trades
      r[H.TYPE] = TYPE.TRADE_CEX;
    } else if (t === TYPE.SALE) {
      // find resales
      const tokenId = r[H.OUT_TOKEN_ID];
      const isResale = boughtTokens[o]?.some(
        (t) => t.tokenId === tokenId && t.level < level
      );
      if (isResale) {
        r[H.TYPE] = TYPE.SALE_RESALE;
      } else {
        r[H.TYPE] = TYPE.SALE;
      }
    } else if (t === TYPE.AUCTION_SETTLE || t === TYPE.OFFER_FULFILL) {
      // handle settled auctions and fulfilled offers by moving payment
      // to time of settlement/fulfillment
      const bidId = r[H.OUT_TOKEN_ID];
      const bidToken = r[H.OUT_TOKEN];
      const bid = bidsAndOffers.find(
        (b) => b.token === bidToken && b.tokenId === bidId
      );
      if (bid !== undefined) {
        const bidRow = bid.row;
        r[H.TYPE] = TYPE.BUY;
        transferOutInfo(bidRow, r);
      } else {
        // can be legit state
        // TODO: only print error when it is truly unexpected
        // console.error(
        //   "Auction settle / offer fulfill row without corresponding bid row!"
        // );
        // console.error(`Operation hash: ${r[H.OP]}`);
      }
    } else if (t === TYPE.AIRDROP) {
      // some "airdrop" transactions are actually the second phase
      // of a pre-payement mint (eg randomly common skeles)
      // we handle this by moving the payment to the time of the
      // token receipt
      if (contractsWithXTZ[r[H.IN_TOKEN_FROM]]?.length > 0) {
        const prepay = contractsWithXTZ[r[H.IN_TOKEN_FROM]][0];
        const payRow = acc[prepay.idx];
        const inAmt = parseInt(r[H.IN_AMT]);
        prepay.amount -= inAmt;

        r[H.TYPE] = TYPE.BUY;
        transferOutInfo(payRow, r, prepay.xtzPerUnit * inAmt);

        if (prepay.amount <= 0) {
          // pop since all amount has been consumed
          contractsWithXTZ[r[H.IN_TOKEN_FROM]].splice(0, 1)[0];
          clearInAndOutInfo(payRow);
        }
      }
    } else if (
      t === TYPE.AUCTION_BID ||
      t === TYPE.OFFER ||
      t === TYPE.OFFER_RETRACT
    ) {
      clearInAndOutInfo(r);
    } else if (t === TYPE.AUCTION_OUTBID) {
      r[H.TYPE] = TYPE.REMOVE;
    }
    acc.push(r);
    return acc;
  }, []);

  // remove any marked for removal
  return reClassifiedRows.filter((r) => r[H.TYPE] !== TYPE.REMOVE);
};

const sort = (rows) => {
  // first pass sort
  // primary is level, fallback to timestamp if level is missing
  let sorted = rows.sort((a, b) => {
    if (utils.isEmpty(a.level) || utils.isEmpty(b.level)) {
      return Date.parse(a[H.TIMESTAMP]) - Date.parse(b[H.TIMESTAMP]);
    } else {
      return a[H.LEVEL] - b[H.LEVEL];
    }
  });

  // look for rows without level that are transfers
  // ie exchange that are XTZ in or out
  // we do not want to rely on timestamps so we manually
  // put the exchange side in the right order
  const transferIndices = sorted.reduce((acc, r, i) => {
    if (r[H.TYPE] === TYPE.TRANSFER && utils.isEmpty(r[H.LEVEL])) {
      acc.push(i);
    }
    return acc;
  }, []);

  for (const i of transferIndices) {
    const r = sorted[i];
    const hash = r[H.OP];
    let offset = 0;
    if (utils.isEmpty(hash)) {
      const timestamp = r[H.TIMESTAMP];
      console.error(
        `Missing operation hash (op header) for exchange transfer on ${timestamp}. Please fix and try again.`
      );
      process.exit(1);
    } else {
      if (utils.isEmpty(r[H.IN_TOKEN])) {
        // outgoing transfer
        offset = 0;
      } else {
        // incoming transfer
        offset = 1;
      }
      for (let j = 0; j < sorted.length; j++) {
        const r2 = sorted[j];
        if (r2[H.OP] === hash) {
          utils.move(sorted, i, j + offset);
          break;
        }
      }
    }
  }
  return sorted;
};

/**
 * Takes csv rows for exchange and account (blockchain) data
 * and collates, sorts, and classifies it.
 *
 * @param {Array<Array>} exchangeRows - Array of Array of rows of centralized exchange transactions
 * @param {Array<Array>} accountsRows - Array of Array of rows of classifed operation groups
 *
 * @returns {array} collated, sorted, classified rows
 */
const collate = (exchangeRows, accountsRows) => {
  const rows = [...exchangeRows, ...accountsRows].reduce((acc, r) => {
    return acc.concat(r);
  }, []);

  const accounts = accountsRows.reduce((acc, rows) => {
    if (rows.length > 0) {
      const account = rows[0][H.ACCOUNT];
      if (acc.includes(account) === false) {
        acc.push(account);
      }
    }
    return acc;
  }, []);
  const sortedRows = sort(rows);
  const classifiedRows = classify(sortedRows, accounts);

  return classifiedRows;
};

export default {
  collate,
  classify,
  sort,
};
