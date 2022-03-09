import fs from "fs";
import csvIO from "./csv/io.js";
import constants from "./constants.js";

const { CSV_HEADERS: H, TYPE, XTZ } = constants;

/* filter rows to specified token */
const filterRows = (rows, token = XTZ) => {
  const { IN_TOKEN, OUT_TOKEN } = H;

  const otherTokens = rows.reduce((acc, r) => {
    const t = r[H.TYPE];
    if (t === TYPE.TRADE) {
      // add the opposing token to our list of tokens
      // to include
      if (r[IN_TOKEN] === token) {
        acc.push(r[OUT_TOKEN]);
      } else if (r[OUT_TOKEN] === token) {
        acc.push(r[IN_TOKEN]);
      }
    }
    return acc;
  }, []);

  return rows.filter((r) => {
    const i = r[IN_TOKEN];
    const o = r[OUT_TOKEN];

    if (r[H.TYPE] === TYPE.TRADE) {
      // only include trades with base token
      return (
        (i === token && otherTokens.includes(o)) ||
        (o === token && otherTokens.includes(i))
      );
    } else {
      // if not trade include if in or out contains base token
      // or other token
      return (
        i === token ||
        o === token ||
        otherTokens.includes(i) ||
        otherTokens.includes(o)
      );
    }
  });
};

const readFile = async (filename) => {
  if (fs.existsSync(filename) === false) {
    console.log(
      `Exchange CSV file (${filename}) missing. Cost basis will likely be wrong.`
    );
    return [];
  } else {
    const allRows = await csvIO.read(filename);
    const normalizedRows = allRows.map((r) => {
      // insert missing header that aren't strictly necessary for exchange csv
      if (Object.prototype.hasOwnProperty.call(r, H.LEVEL) === false) {
        r.level = undefined;
      }
      return r;
    });
    return filterRows(normalizedRows);
  }
};

export default {
  readFile,
  filterRows,
};
