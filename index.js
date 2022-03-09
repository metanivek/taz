import { config } from "dotenv";
import process from "process";
import fs from "fs";
import path from "path";
import collection from "./src/collection.js";
import classification from "./src/classification.js";
import collation from "./src/collation.js";
import conversion from "./src/csv/conversion.js";
import exchange from "./src/exchange.js";
import csvIO from "./src/csv/io.js";
import jsonIO from "./src/json/io.js";
import income from "./src/income.js";
import gains from "./src/gains.js";
import utils from "./src/utils.js";
import constants from "./src/constants.js";

config();
const startYear = parseInt(process.env.START_YEAR);
const currency = process.env.CURRENCY;
const addresses = process.env.TEZ_ADDRESSES.split(",");

const makeAddressSteps = (addresses, yearRange) => {
  const { year, start, end } = yearRange;

  const makeAddressStep = (name, callback) => {
    return async (context) => {
      console.log(`\n${name}`);
      for (const address of addresses) {
        console.log(`- ${address}`);
        let addressContext = context[address];
        if (addressContext === undefined) addressContext = { ...context };
        const newContext = await callback(address, addressContext);
        context[address] = newContext;
      }
      return context;
    };
  };

  return {
    year,
    steps: [
      makeAddressStep(
        "Fetching hashes and tokens",
        async (address, context) => {
          const { downloadsDir } = context;
          const txnsCacheFile = path.resolve(
            downloadsDir,
            `${address}-transaction-hashes.json`
          );
          const tokensCacheFile = path.resolve(
            downloadsDir,
            `${address}-tokens.json`
          );
          if (
            fs.existsSync(txnsCacheFile) === false ||
            fs.existsSync(tokensCacheFile) === false
          ) {
            const { hashes, tokens } =
              await collection.downloadAllHashesAndTokens(address, start, end);
            console.log(" > Operation group hashes:", hashes.length);
            console.log(" > Unique tokens:", tokens.length);
            await jsonIO.write(txnsCacheFile, hashes);
            await jsonIO.write(tokensCacheFile, tokens);
          }
          return {
            ...context,
            txnsCacheFile,
            tokensCacheFile,
          };
        }
      ),
      makeAddressStep("Fetching operation groups", async (address, context) => {
        const { downloadsDir, txnsCacheFile } = context;
        const opsCacheFile = path.resolve(
          downloadsDir,
          `${address}-operation-groups.json`
        );
        if (fs.existsSync(opsCacheFile) === false) {
          const hashes = await jsonIO.read(txnsCacheFile);
          const ops = await collection.downloadAllOperationGroups(
            hashes,
            currency
          );
          console.log(" > Operation groups:", ops.length);
          await jsonIO.write(opsCacheFile, ops);
        }
        return {
          ...context,
          opsCacheFile,
        };
      }),
      makeAddressStep("Classifying operations", async (address, context) => {
        const { reportsDir, opsCacheFile, tokensCacheFile } = context;
        const ops = await jsonIO.read(opsCacheFile);
        const tokens = await jsonIO.read(tokensCacheFile);
        const classified = classification.classifyOperationGroups(
          address,
          ops,
          tokens
        );
        // cache json repr
        // const classifiedCacheFile = path.resolve(
        //   context.downloadsDir,
        //   `${address}-operations-classified.json`
        // );
        // await jsonIO.write(classifiedCacheFile, classified);

        // per address reports
        const classifiedCsvFile = path.resolve(
          reportsDir,
          `${address}-classified.csv`
        );
        const rows = conversion.operationGroupsToRows(classified);
        await csvIO.write(classifiedCsvFile, rows);

        return {
          ...context,
          classifiedCsvFile,
        };
      }),
    ],
  };
};

const makeSummarySteps = async (yearContexts, addresses, currency) => {
  const allExchangeRows = [];
  const allAccountRows = [];
  for (const yearContext of yearContexts) {
    const { userDir } = yearContext;
    const exchangeFile = path.resolve(userDir, "exchange-transactions.csv");
    const exchangeRows = await exchange.readFile(exchangeFile);
    allExchangeRows.push(exchangeRows);

    for (const address of addresses) {
      const { classifiedCsvFile } = yearContext[address];
      const accountRows = await csvIO.read(classifiedCsvFile);
      allAccountRows.push(accountRows);
    }
  }
  const collatedRows = collation.collate(allExchangeRows, allAccountRows);

  const makeSummaryStep = (name, callback) => {
    return async () => {
      for (const yearContext of yearContexts) {
        const { year } = yearContext;
        console.log(`\n${name} (${year})`);
        await callback(yearContext);
      }
    };
  };

  return [
    makeSummaryStep("Collating all transactions", async (context) => {
      const { year, reportsDir } = context;
      const collatedRowsForYear = collatedRows.filter((r) =>
        utils.isTimestampInYear(r.timestamp, year)
      );
      console.log(" > Total transactions:", collatedRowsForYear.length);
      const allFile = path.resolve(
        reportsDir,
        "all-classified-transactions.csv"
      );
      await csvIO.write(allFile, collatedRowsForYear);
    }),
    makeSummaryStep("Generate income statement", async (context) => {
      const { year, reportsDir } = context;
      const incomeSummary = income.summarize(year, collatedRows, currency);
      const incomeFile = path.resolve(reportsDir, "income.csv");
      await csvIO.write(incomeFile, incomeSummary);
    }),
    makeSummaryStep("Generate gains report", async (context) => {
      const { year, reportsDir } = context;
      for (const gainsType of ["FIFO", "HIFO"]) {
        const gainsReport = gains.generateReport(year, collatedRows, gainsType);
        const gainsFile = path.resolve(reportsDir, `gains-${gainsType}.csv`);
        await csvIO.write(gainsFile, gainsReport);
      }
    }),
  ];
};

const makeAndRunSteps = async (addresses, yearRanges, currency) => {
  //
  // run steps for individual addresses
  //
  const yearContexts = [];
  for (const yearRange of yearRanges) {
    const { year } = yearRange;
    const baseDir = path.resolve("data", year.toString());
    const userDir = path.resolve(baseDir, "user");
    const downloadsDir = path.resolve(baseDir, "downloads");
    const reportsDir = path.resolve(baseDir, "reports");
    fs.mkdirSync(userDir, { recursive: true });
    fs.mkdirSync(downloadsDir, { recursive: true });
    fs.mkdirSync(reportsDir, { recursive: true });

    const { steps } = makeAddressSteps(addresses, yearRange);

    console.log(`>> Processing ${year} <<`);

    let context = { year, downloadsDir, reportsDir, userDir };
    for (const step of steps) {
      context = await step(context);
    }
    yearContexts.push(context);

    console.log("\n---");
  }

  //
  // run steps for summarizing transactions
  //
  const summarySteps = await makeSummarySteps(
    yearContexts,
    addresses,
    currency
  );
  for (const step of summarySteps) {
    await step();
  }
};

const main = async () => {
  if (Object.is(NaN, startYear)) {
    console.error("START_YEAR not defined in .env file!");
    process.exit(1);
  }

  if (currency === undefined) {
    console.error("CURRENCY not defined in .env file!");
  } else if (constants.CURRENCIES.includes(currency) === false) {
    console.error(
      `CURRENCY=${currency} is not supported. Please use one of: ${constants.CURRENCIES.join(
        ", "
      )}`
    );
    process.exit(1);
  }

  const yearRanges = utils.calculateYearDateRanges(startYear);
  await makeAndRunSteps(addresses, yearRanges, currency);
};

main()
  .then(() => {
    console.log("\n\nFinished. Have a nice day. :)\n");
  })
  .catch((err) => {
    console.error(err);
  });
