/** @module gains */
import constants from "./constants.js";
import utils from "./utils.js";

const { CSV_HEADERS: H, TYPE, XTZ } = constants;

const makeLedger = (type, asset, year) => {
  return {
    type,
    asset,
    year,
    amounts: [],
    disposed: [],
  };
};

const add = (ledger, amount, fiat, date) => {
  if (ledger === undefined) {
    return;
    // throw new Error("Ledger undefined");
  }
  const { type } = ledger;
  ledger.amounts.push({
    amount,
    fiat,
    basis: amount * fiat,
    date,
  });

  if (type === "HIFO") {
    ledger.amounts = ledger.amounts.sort((a, b) => b.basis - a.basis);
  }
};

const remove = (ledger, amount, fiat, date, type, calculateGains = true) => {
  if (amount <= 0) return;

  if (ledger === undefined) {
    return;
    // throw new Error("Ledger undefined");
  }
  let remaining = amount;
  while (remaining > Number.EPSILON) {
    const top = ledger.amounts.splice(0, 1)[0];
    if (top === undefined) {
      throw new Error(`No top amount, ${amount}`);
    }
    let subamount;
    if (remaining >= top.amount) {
      subamount = top.amount;
    } else {
      subamount = remaining;
      top.amount = top.amount - subamount;
      ledger.amounts.splice(0, 0, top);
    }

    const isInYear = utils.isTimestampInYear(date, ledger.year);
    if (calculateGains && isInYear) {
      const proceeds = subamount * fiat;
      const basis = subamount * top.fiat;
      const gains = proceeds - basis;
      const locale = process.env.LOCALE;
      const purchaseDate = new Date(top.date).toLocaleDateString(locale);
      const dateSold = new Date(date).toLocaleDateString(locale);
      // round as a quick hack for time changes
      const daysHeld = Math.round(
        (Date.parse(dateSold) - Date.parse(purchaseDate)) / (1000 * 3600 * 24)
      );
      ledger.disposed.push({
        "Tax lot ID": "", // apparently this makes TurboTax CSV import properly detect short vs long term
        "Asset Name": ledger.asset,
        Amount: subamount,
        "Date Acquired": purchaseDate,
        "Date of Disposition": dateSold,
        Proceeds: proceeds,
        "Cost Basis": basis,
        "Gains (Losses)": gains,
        "Holding Period (Days)": daysHeld,
        "Data Source": "Taz",
        "Taz Type": type,
      });
    }

    remaining -= subamount;
  }
};

/**
 * Generates gains and losses report
 *
 * @param {Number} year
 * @param {Array} collatedRows - Rows from {@link module:collation~collate}
 * @param {String} type - FIFO or HIFO
 *
 * @returns {Array} rows of gains and losses
 * */
const generateReport = (year, collatedRows, type) => {
  const ledgers = {};
  const ledger = (asset) => makeLedger(type, asset, year);
  const makeTokenKey = (token, tokenId) => {
    if (tokenId === "" || tokenId === undefined) {
      return token;
    } else {
      return `${token}-${tokenId}`;
    }
  };

  const xtzKey = makeTokenKey(XTZ);

  for (const row of collatedRows) {
    try {
      const t = row[H.TYPE];
      const date = row[H.TIMESTAMP];
      const i = row[H.IN_TOKEN];
      const iId = row[H.IN_TOKEN_ID];
      const o = row[H.OUT_TOKEN];
      const oId = row[H.OUT_TOKEN_ID];
      const fiat = parseFloat(row[H.FIAT]);
      const fees = parseFloat(row[H.FEES] ?? "0");
      let iKey, oKey;
      if (i !== "" && i !== undefined) {
        iKey = makeTokenKey(i, iId);
        if (ledgers[iKey] === undefined) {
          ledgers[iKey] = ledger(iKey);
        }
      }
      if (o !== "" && o !== undefined) {
        oKey = makeTokenKey(o, oId);
        if (ledgers[oKey] === undefined) {
          ledgers[oKey] = ledger(oKey);
        }
      }

      // remove fees (without counting as dispossession)
      remove(ledgers[xtzKey], fees, fiat, date, "", false);

      // xtz or token in
      if (
        t === TYPE.RECEIVE ||
        t === TYPE.RECEIVE_TOKEN ||
        t === TYPE.TRADE_FIAT_OUT ||
        t === TYPE.SALE ||
        t === TYPE.SALE_RESALE ||
        t === TYPE.AIRDROP
      ) {
        let inFiat = 0;
        const inIsXTZ = i === XTZ;
        if (inIsXTZ) {
          inFiat = fiat;
        }
        add(ledgers[iKey], parseFloat(row[H.IN_AMT]), inFiat, date);

        // token out
        if (t === TYPE.SALE_RESALE) {
          let inAmt = parseFloat(row[H.IN_AMT]);
          let outAmt = parseFloat(row[H.OUT_AMT]);
          const outFiat = (fiat * inAmt) / outAmt;
          remove(ledgers[oKey], outAmt, outFiat, date, t);
        }
      }

      // xtz out
      if (t === TYPE.TRADE_FIAT_IN || t === TYPE.SEND) {
        remove(ledgers[oKey], parseFloat(row[H.OUT_AMT]), fiat, date, t);
      }

      // token trade
      if (t === TYPE.BUY || t === TYPE.TRADE) {
        const inIsXTZ = i === XTZ;
        const outIsXTZ = o === XTZ;
        let inAmt = parseFloat(row[H.IN_AMT]);
        let outAmt = parseFloat(row[H.OUT_AMT]);
        let inFiat = fiat;
        let outFiat = fiat;

        // TODO: support non-XTZ based trades, eg token to token
        if (inIsXTZ) {
          outFiat = (fiat * (inAmt + fees)) / outAmt;
        } else if (outIsXTZ) {
          inFiat = (fiat * (outAmt + fees)) / inAmt;
        } else {
          console.error("token-to-token trade or buy not supported yet");
          continue;
        }

        add(ledgers[iKey], inAmt, inFiat, date);
        remove(ledgers[oKey], outAmt, outFiat, date, t);
      }
    } catch (ex) {
      console.error("Error: ", ex);
      console.error("Row: ", row);
    }
  }

  const disposedLedgers = Object.values(ledgers).filter(
    (l) => l.disposed.length > 0
  );

  const disposedHeader = "Date of Disposition";
  const allRows = disposedLedgers
    .reduce((acc, l) => {
      return acc.concat(l.disposed);
    }, [])
    .sort(
      (a, b) => Date.parse(a[disposedHeader]) - Date.parse(b[disposedHeader])
    );

  return allRows;
};

export default {
  generateReport,
};
