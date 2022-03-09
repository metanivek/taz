/** @module income */
import constants from "./constants.js";
import utils from "./utils.js";

const { CSV_HEADERS: H, TYPE } = constants;

const INCOME_TYPES = [TYPE.RECEIVE, TYPE.SALE, TYPE.INTEREST];

/**
 * Generate summary of various incomes
 *
 * @param {Number} year -
 * @param {Array} collatedRows -
 * @param {String} currency -
 *
 * @returns {Array<Object>}
 */
const summarize = (year, collatedRows, currency) => {
  const incomeRows = collatedRows.filter(
    (r) =>
      INCOME_TYPES.includes(r[H.TYPE]) &&
      utils.isTimestampInYear(r[H.TIMESTAMP], year)
  );

  const currencyProp = currency.toUpperCase();
  const incomeMap = incomeRows.reduce(
    (acc, r) => {
      const inToken = r[H.IN_TOKEN];
      if (acc[inToken] === undefined) {
        acc[inToken] = 0;
      }
      const amount = parseFloat(r[H.IN_AMT]);
      const fiat = parseFloat(r[H.FIAT]);
      acc[inToken] += amount;
      acc[currencyProp] += fiat * amount;

      return acc;
    },
    { [currencyProp]: 0 }
  );

  return Object.entries(incomeMap).map(([k, v]) => {
    return {
      asset: k,
      income: v,
    };
  });
};

export default {
  summarize,
};
