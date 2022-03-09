/** @module json/io */
import fs from "fs";

/**
 * Read and parse file with JSON content
 *
 * @param {String} filename - path to file
 *
 * @returns {Promise<Object>} JSON object
 */
const read = async (filename) => {
  const contentBuf = await fs.promises.readFile(filename);
  return JSON.parse(contentBuf.toString());
};

/**
 * Write JSON object to file
 *
 * @param {String} filename - path to file
 * @param {Object|Array} json - json content to write
 * */
const write = async (filename, json) => {
  return fs.promises.writeFile(filename, JSON.stringify(json));
};

export default {
  read,
  write,
};
