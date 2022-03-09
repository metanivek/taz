/** @module tzkt/download */
import process from "process";
import http from "./http.js";
import utils from "../utils.js";

const LIMIT = 1000;
const API = "https://api.tzkt.io/v1/";

const get = async (action, params) => {
  const url = API + action;
  return http.get(url, params);
};

const fetchAll = async (fetcher) => {
  let moreToFetch = true;
  let offset = 0;
  let results = [];
  while (moreToFetch) {
    const r = await fetcher(offset);
    moreToFetch = r.length > 0;
    if (moreToFetch) offset += r.length;
    results = results.concat(r);
  }
  return results;
};

const fetchTokenTransfers = async (
  account,
  startDate,
  endDate,
  offset = 0,
  limit = LIMIT
) => {
  const params = {
    limit,
    offset,
    select: "timestamp,transactionId,token,level",
    "anyof.from.to": account,
    "timestamp.ge": startDate,
    "timestamp.lt": endDate,
    "sort.asc": "level",
  };

  return get("tokens/transfers", params);
};

const fetchAllTokenTransfers = async (account, startDate, endDate) => {
  // bug in TzKT Tokens API that doesn't like future dates (it returns nothing)
  const todayEndDate = `${new Date().getFullYear()}-${
    new Date().getMonth() + 1
  }-${new Date().getDate()}`;
  const realEndDate = Date.parse(endDate) > Date.now() ? todayEndDate : endDate;
  return fetchAll(async (offset) => {
    return fetchTokenTransfers(account, startDate, realEndDate, offset);
  });
};

const fetchDelegationHashes = async (
  { account },
  startDate,
  endDate,
  offset = 0,
  limit = LIMIT
) => {
  const params = {
    limit,
    offset,
    sender: account,
    status: "applied",
    select: "hash,id,level",
    "timestamp.ge": startDate,
    "timestamp.lt": endDate,
    "sort.asc": "level",
  };
  return get("operations/delegations", params);
};

const fetchOriginationHashes = async (
  { account },
  startDate,
  endDate,
  offset = 0,
  limit = LIMIT
) => {
  const params = {
    limit,
    offset,
    sender: account,
    status: "applied",
    select: "hash,id,level",
    "timestamp.ge": startDate,
    "timestamp.lt": endDate,
    "sort.asc": "level",
  };
  return get("operations/originations", params);
};

const fetchTransactionHashes = async (
  { account, transactionIds },
  startDate,
  endDate,
  offset = 0,
  limit = LIMIT
) => {
  const params = {
    limit,
    offset,
    status: "applied",
    select: "hash,id,level",
    "timestamp.ge": startDate,
    "timestamp.lt": endDate,
    "sort.asc": "level",
  };
  if (account) {
    params["anyof.sender.target"] = account;
  } else if (transactionIds) {
    params["id.in"] = transactionIds;
  } else {
    console.error("missing parameter", account, transactionIds);
    process.exit(1);
  }
  return get("operations/transactions", params);
};

const fetchOperation = async (hash, currency) => {
  return get(`operations/${hash}`, { quote: currency });
};

/**
 * Download all hahses and tokens for an account
 *
 * @param {String} account
 * @param {String} startDate - ISO 8601 timestamp (inclusive)
 * @param {String} endDate - ISO 8601 timestamp (exclusive)
 *
 * @returns {Promise<Object>} -
 */
const fetchAllHashesAndTokens = async (account, startDate, endDate) => {
  let transactionHashes = await fetchAll(async (offset) =>
    fetchTransactionHashes({ account }, startDate, endDate, offset)
  );
  const delegationHashes = await fetchAll(async (offset) =>
    fetchDelegationHashes({ account }, startDate, endDate, offset)
  );
  const originationHashes = await fetchAll(async (offset) =>
    fetchOriginationHashes({ account }, startDate, endDate, offset)
  );
  const tokenTransfers = await fetchAllTokenTransfers(
    account,
    startDate,
    endDate
  );
  const tokens = utils.dedupe(
    tokenTransfers.map((r) => {
      const { token } = r;
      if (token.metadata === undefined) {
        console.log("missing metadata", r);
      }
      return {
        address: token.contract.address,
        standard: token.standard,
        symbol: token.metadata?.symbol ?? "MISSING",
        decimals: token.metadata?.decimals ?? 0,
      };
    }),
    "address"
  );

  const hashesById = transactionHashes.reduce((acc, h) => {
    acc[h.id] = true;
    return acc;
  }, {});
  const chunkSize = 200;
  const missingTransactionIds = tokenTransfers.reduce(
    (acc, { transactionId }) => {
      if (hashesById[transactionId] === undefined) {
        acc.push(transactionId);
      }
      return acc;
    },
    []
  );
  const chunkedIds = utils.chunksOf(missingTransactionIds, chunkSize);
  const missingTransactionHashes = await chunkedIds.reduce(
    async (aacc, transactionIds) => {
      const acc = await aacc;
      const r = await fetchTransactionHashes(
        { transactionIds },
        startDate,
        endDate,
        0,
        chunkSize
      );
      return acc.concat(r);
    },
    []
  );

  const combined = transactionHashes
    .concat(delegationHashes)
    .concat(originationHashes)
    .concat(missingTransactionHashes);
  const deduped = utils.dedupe(combined, "hash");
  const hashes = deduped.sort((a, b) => a.level - b.level).map((t) => t.hash);

  return {
    hashes,
    tokens,
  };
};

/**
 * Download operation groups for given hashes, with currency quote
 *
 * @param {Array<string>} hashes
 * @param {String} currency - TzKT compatible currency
 *
 * @returns {Promise<Array<Object>>}
 */
const fetchAllOperations = async (hashes, currency) => {
  const chunks = utils.chunksOf(hashes, 2);
  return chunks.reduce(async (aacc, chunk) => {
    const acc = await aacc;
    const ops = await Promise.all(
      chunk.map(async (hash) => {
        return await fetchOperation(hash, currency);
      })
    );
    return acc.concat(ops);
  }, []);
};

export default { fetchAllHashesAndTokens, fetchAllOperations };
