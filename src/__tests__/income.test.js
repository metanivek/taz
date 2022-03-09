import income from "../income.js";
import constants from "../constants.js";

const { CSV_HEADERS: H, TYPE } = constants;

test("summarize", () => {
  const currency = "Usd";
  const year = 2021;
  const rows = [
    {
      [H.TYPE]: TYPE.RECEIVE,
      [H.FIAT]: 1,
      [H.IN_TOKEN]: "DOGE",
      [H.IN_AMT]: 2,
      [H.TIMESTAMP]: "2021-12-11",
    },
    {
      [H.TYPE]: TYPE.SALE,
      [H.FIAT]: "1",
      [H.IN_TOKEN]: "DOGE",
      [H.IN_AMT]: "3",
      [H.TIMESTAMP]: "2021-12-11",
    },
    {
      [H.TYPE]: TYPE.INTEREST,
      [H.FIAT]: 1,
      [H.IN_TOKEN]: "DOGE",
      [H.IN_AMT]: 5,
      [H.TIMESTAMP]: "2021-12-11",
    },
    {
      [H.TYPE]: TYPE.TRADE,
      [H.FIAT]: 1,
      [H.IN_TOKEN]: "DOGE",
      [H.IN_AMT]: 5,
      [H.TIMESTAMP]: "2021-12-11",
    },
    {
      [H.TYPE]: TYPE.INTEREST,
      [H.FIAT]: 1,
      [H.IN_TOKEN]: "DOGE",
      [H.IN_AMT]: 5,
      [H.TIMESTAMP]: "2022-12-11",
    },
  ];
  expect(income.summarize(year, rows, currency)).toStrictEqual([
    { asset: "USD", income: 10 },
    { asset: "DOGE", income: 10 },
  ]);
});
