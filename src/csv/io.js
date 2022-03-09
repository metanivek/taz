/** @module csv/io */
import csv from "fast-csv";
import fs from "fs";

/**
 * Write CSV row objects to file
 *
 * @param {String} filename - path to file
 * @param {Array<Object>} rows - csv row objects
 * */
const write = async (filename, rows) => {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(filename);
    csv
      .writeToStream(fileStream, rows, { headers: true })
      .on("error", (err) => reject(err))
      .on("finish", () => resolve());
  });
};

/**
 * Read and parse file with CSV content
 *
 * @param {String} filename - path to file
 *
 * @returns {Promise<Array>} CSV row objects
 */
const read = async (filename) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = csv
      .parse({ headers: true, ignoreEmpty: true })
      .on("data", (row) => {
        results.push(row);
      })
      .on("error", (err) => reject(err))
      .on("end", () => resolve(results));

    const fileData = fs.readFileSync(filename);
    stream.write(fileData);
    stream.end();
  });
};

export default {
  read,
  write,
};
