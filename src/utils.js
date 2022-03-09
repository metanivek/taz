/** @module utils */
const delay = async (millis) =>
  new Promise((resolve) => setTimeout(resolve, millis));

/**
 * Create array of arrays of size
 */
const chunksOf = (arr, size) => {
  const result = [];
  while (arr.length > 0) {
    const chunk = arr.splice(0, size);
    result.push(chunk);
  }
  return result;
};

/**
 * Remove duplicates from array, based on value of object property
 */
const dedupe = (arr, key) => {
  let deDuped = [];
  let keys = {};
  for (const i of arr) {
    if (keys[i[key]] === undefined) {
      deDuped.push(i);
    }
    keys[i[key]] = true;
  }
  return deDuped;
};

/**
 * In-place item move for array
 */
const move = (list, from, to) => {
  const f = list[from];
  list.splice(from, 1);
  if (to >= list.length) {
    list.push(f);
  } else if (to < 0) {
    list.unshift(f);
  } else {
    list.splice(to, 0, f);
  }
};

/**
 * Is an address a contract?
 */
const isKT = (addr) => addr.startsWith("KT");

/**
 * Is an address an account?
 */
const isTz = (addr) => addr.startsWith("tz");

/**
 * Create object that will throw an error when accessing missing properties
 *
 * @param {Object} obj
 *
 * @returns {Object}
 */
const strictAccessProxy = (obj) => {
  // thanks for the idea SO https://stackoverflow.com/a/50021383
  return new Proxy(obj, {
    get: (obj, prop) => {
      if (prop in obj) {
        return obj[prop];
      } else {
        throw new Error(`${prop.toString()} does not exist!`);
      }
    },
  });
};

/**
 * Simple int range
 *
 * @param {Number} start
 * @param {Number} end
 * @param {Number} by - (optional, default 1) increment step
 */
const range = (start, end, by = 1) => {
  if (start === end) return [start];
  return [start, ...range(start + by, end)];
};

/**
 * Calculate year date ranges from specified year to current year
 *
 * @param {Number} startYear - first year
 * @param {Function} getCurrentYear - (optional) function to return override year
 *
 * @returns {Object}
 * */
const calculateYearDateRanges = (
  startYear,
  getCurrentYear = () => new Date().getFullYear()
) => {
  const currentYear = getCurrentYear();
  return range(startYear, currentYear).map((year) => {
    const start = `${year}-01-01`;
    const end = `${year + 1}-01-01`;
    return {
      year,
      start,
      end,
    };
  });
};

/**
 * Test if timestamp is in a given year
 *
 * @param {String} timestamp -  ISO 8601 timestamp
 * @param {Number} year
 *
 * @returns {Boolean}
 */
const isTimestampInYear = (timestamp, year) => {
  const start = Date.parse(`${year}-01-01`);
  const end = Date.parse(`${year + 1}-01-01`);
  const t = Date.parse(timestamp);

  return start <= t && t < end;
};

/**
 * Tests if string is empty, accounting for undefined and null
 *
 * @param {String} str
 * @returns {Boolean}
 */
const isEmpty = (str) => {
  return str === undefined || str === null || str === "";
};

export default {
  isEmpty,
  isTimestampInYear,
  calculateYearDateRanges,
  range,
  strictAccessProxy,
  isKT,
  isTz,
  move,
  dedupe,
  chunksOf,
  delay,
};
