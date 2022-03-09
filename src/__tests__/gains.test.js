import gains from "../gains.js";
import constants from "../constants.js";
import csvUtil from "./__utils__/csv.js";

const { TYPE, XTZ } = constants;

describe("generateReport", () => {
  describe("FIFO", () => {
    test("resale token", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.AIRDROP,
          fiat: 3,
          in_amt: 1,
          in_token: "COOL",
          in_token_id: 1,
          timestamp: "2021-08-13",
        }),
        csvUtil.createRow({
          type: TYPE.SALE_RESALE,
          fiat: 7,
          in_amt: 2,
          in_token: XTZ,
          out_amt: 1,
          out_token: "COOL",
          out_token_id: 1,
          timestamp: "2021-08-18",
        }),
      ];

      expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
        {
          acquired: "2021-08-13",
          amount: 1,
          asset: "COOL-1",
          basis: 0,
          dispossessed: "2021-08-18",
          days: 5,
          gains: 14,
          proceeds: 14,
          type: TYPE.SALE_RESALE,
        },
      ]);
    });

    test.todo("multiple resales");

    test("trade airdrop for xtz", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.AIRDROP,
          fiat: 2,
          in_amt: 3,
          in_token: "TOK",
          in_token_id: 2,
          timestamp: "2021-08-13",
        }),
        csvUtil.createRow({
          type: TYPE.TRADE,
          fiat: 7,
          in_amt: 5,
          in_token: XTZ,
          out_amt: 1,
          out_token: "TOK",
          out_token_id: 2,
          timestamp: "2021-08-18",
        }),
      ];

      expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
        {
          acquired: "2021-08-13",
          amount: 1,
          asset: "TOK-2",
          basis: 0,
          dispossessed: "2021-08-18",
          days: 5,
          gains: 35,
          proceeds: 35,
          type: TYPE.TRADE,
        },
      ]);
    });

    test("trade xtz for fiat", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.RECEIVE,
          fiat: 1,
          in_amt: 1,
          in_token: XTZ,
          timestamp: "2021-08-13",
        }),
        csvUtil.createRow({
          type: TYPE.TRADE_FIAT_IN,
          fiat: 7,
          in_amt: 1,
          in_token: "Usd",
          out_amt: 0.5,
          out_token: XTZ,
          timestamp: "2021-08-18",
        }),
      ];

      expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
        {
          acquired: "2021-08-13",
          amount: 0.5,
          asset: XTZ,
          basis: 0.5,
          dispossessed: "2021-08-18",
          days: 5,
          gains: 3,
          proceeds: 3.5,
          type: TYPE.TRADE_FIAT_IN,
        },
      ]);
    });

    test("send xtz", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.RECEIVE,
          fiat: 1,
          in_amt: 0.6,
          in_token: XTZ,
          timestamp: "2021-08-13",
        }),
        csvUtil.createRow({
          type: TYPE.SEND,
          fiat: 2,
          out_amt: 0.6,
          out_token: XTZ,
          timestamp: "2021-08-15",
        }),
      ];
      expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
        {
          acquired: "2021-08-13",
          amount: 0.6,
          asset: XTZ,
          basis: 0.6,
          dispossessed: "2021-08-15",
          days: 2,
          gains: 0.6,
          proceeds: 1.2,
          type: TYPE.SEND,
        },
      ]);
    });

    test("fee removal", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.RECEIVE,
          fiat: 1,
          in_amt: 0.6,
          in_token: XTZ,
          timestamp: "2021-08-13",
        }),
        csvUtil.createRow({
          type: TYPE.RECEIVE,
          fiat: 1.5,
          in_amt: 2,
          in_token: XTZ,
          timestamp: "2021-08-15",
        }),
        csvUtil.createRow({
          type: TYPE.BUY,
          fiat: 2,
          in_amt: 1,
          in_token: "COOL",
          out_amt: 0.5,
          out_token: XTZ,
          fees: 0.1,
          timestamp: "2021-08-18",
        }),
        csvUtil.createRow({
          type: TYPE.BUY,
          fiat: 3,
          in_amt: 2,
          in_token: "COOL",
          out_amt: 0.5,
          out_token: XTZ,
          fees: 0.1,
          timestamp: "2021-08-19",
        }),
      ];

      // if fees are not properly removed the length would be 3
      expect(gains.generateReport(2021, rows, "FIFO").length).toEqual(2);
    });

    test("buy and resale (fees in cost basis)", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.RECEIVE,
          fiat: 1,
          in_amt: 10,
          in_token: XTZ,
          timestamp: "2021-08-13",
        }),
        csvUtil.createRow({
          type: TYPE.BUY,
          fiat: 2,
          in_amt: 2,
          in_token: "COOL",
          out_amt: 0.5,
          out_token: XTZ,
          fees: 0.1,
          timestamp: "2021-08-18",
        }),
        csvUtil.createRow({
          type: TYPE.SALE_RESALE,
          fiat: 3,
          in_amt: 1,
          in_token: XTZ,
          out_amt: 1,
          out_token: "COOL",
          timestamp: "2021-08-19",
        }),
      ];

      expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
        {
          acquired: "2021-08-13",
          amount: 0.5,
          asset: XTZ,
          basis: 0.5,
          dispossessed: "2021-08-18",
          days: 5,
          gains: 0.5,
          proceeds: 1,
          type: TYPE.BUY,
        },
        {
          acquired: "2021-08-18",
          amount: 1,
          asset: "COOL",
          basis: 0.6,
          dispossessed: "2021-08-19",
          days: 1,
          gains: 2.4,
          proceeds: 3,
          type: TYPE.SALE_RESALE,
        },
      ]);
    });

    describe("receive xtz and buy token", () => {
      test("single disposession", () => {
        const rows = [
          csvUtil.createRow({
            type: TYPE.RECEIVE,
            fiat: 1,
            in_amt: 1,
            in_token: XTZ,
            timestamp: "2021-08-13",
          }),
          csvUtil.createRow({
            type: TYPE.RECEIVE,
            fiat: 1.5,
            in_amt: 2,
            in_token: XTZ,
            timestamp: "2021-08-15",
          }),
          csvUtil.createRow({
            type: TYPE.BUY,
            fiat: 2,
            in_amt: 1,
            in_token: "COOL",
            out_amt: 0.5,
            out_token: XTZ,
            timestamp: "2021-08-18",
          }),
        ];

        expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
          {
            acquired: "2021-08-13",
            amount: 0.5,
            asset: XTZ,
            basis: 0.5,
            dispossessed: "2021-08-18",
            days: 5,
            gains: 0.5,
            proceeds: 1,
            type: TYPE.BUY,
          },
        ]);
      });

      test("multiple disposession", () => {
        const rows = [
          csvUtil.createRow({
            type: TYPE.RECEIVE,
            fiat: 2,
            in_amt: 1,
            in_token: XTZ,
            timestamp: "2021-08-13",
          }),
          csvUtil.createRow({
            type: TYPE.RECEIVE,
            fiat: 3,
            in_amt: 2,
            in_token: XTZ,
            timestamp: "2021-08-15",
          }),
          csvUtil.createRow({
            type: TYPE.BUY,
            fiat: 5,
            in_amt: 1,
            in_token: "COOL",
            out_amt: 1.5,
            out_token: XTZ,
            timestamp: "2021-08-18",
          }),
        ];

        expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
          {
            acquired: "2021-08-13",
            amount: 1,
            asset: XTZ,
            basis: 2,
            dispossessed: "2021-08-18",
            days: 5,
            gains: 3,
            proceeds: 5,
            type: TYPE.BUY,
          },
          {
            acquired: "2021-08-15",
            amount: 0.5,
            asset: XTZ,
            basis: 1.5,
            dispossessed: "2021-08-18",
            days: 3,
            gains: 1,
            proceeds: 2.5,
            type: TYPE.BUY,
          },
        ]);
      });
    });
  });
  test.todo("HIFO");
  test.todo("LIFO");
});
