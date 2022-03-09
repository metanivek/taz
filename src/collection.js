/** @module collection */
import tzktDownload from "./tzkt/download.js";

/** Downloads operation group hashes and token information for an account
 *
 * @param {String} account - tz address
 * @param {String} startDate - ISO 8601 timestamp
 * @param {String} endDate - ISO 8601 timestamp
 *
 * @returns {Promise<Object>}
 *
 * */
const downloadAllHashesAndTokens = (account, startDate, endDate) =>
  tzktDownload.fetchAllHashesAndTokens(account, startDate, endDate);

/** Downloads operation groups
 *
 * @param {Array} hashes - list of operation group hashes to download
 * @param {String} currency - TzKT compatible currency for fiat quotes
 *
 * @returns {Promise<Array>} array of operation groups (arrays)
 * */
const downloadAllOperationGroups = (hashes, currency) =>
  tzktDownload.fetchAllOperations(hashes, currency);

export default { downloadAllHashesAndTokens, downloadAllOperationGroups };
