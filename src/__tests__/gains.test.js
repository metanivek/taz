import gains from "../gains.js";
import constants from "../constants.js";
import csvUtil from "./__utils__/csv.js";

const { TYPE, XTZ } = constants;

process.env.LOCALE = "en-US"; // force for tests

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
          timestamp: "2021-08-13T19:00:00Z",
        }),
        csvUtil.createRow({
          type: TYPE.SALE_RESALE,
          fiat: 7,
          in_amt: 2,
          in_token: XTZ,
          out_amt: 1,
          out_token: "COOL",
          out_token_id: 1,
          timestamp: "2021-08-18T19:00:00Z",
        }),
      ];

      expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
        {
          "Date Acquired": "8/13/2021",
          Amount: 1,
          "Asset Name": "COOL-1",
          "Cost Basis": 0,
          "Date of Disposition": "8/18/2021",
          "Holding Period (Days)": 5,
          "Gains (Losses)": 14,
          Proceeds: 14,
          "Taz Type": TYPE.SALE_RESALE,
          "Tax lot ID": "",
          "Data Source": "Taz",
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
          timestamp: "2021-08-13T19:00:00Z",
        }),
        csvUtil.createRow({
          type: TYPE.TRADE,
          fiat: 7,
          in_amt: 5,
          in_token: XTZ,
          out_amt: 1,
          out_token: "TOK",
          out_token_id: 2,
          timestamp: "2021-08-18T19:00:00Z",
        }),
      ];

      expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
        {
          "Date Acquired": "8/13/2021",
          Amount: 1,
          "Asset Name": "TOK-2",
          "Cost Basis": 0,
          "Date of Disposition": "8/18/2021",
          "Holding Period (Days)": 5,
          "Gains (Losses)": 35,
          Proceeds: 35,
          "Taz Type": TYPE.TRADE,
          "Tax lot ID": "",
          "Data Source": "Taz",
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
          timestamp: "2021-08-13T19:00:00Z",
        }),
        csvUtil.createRow({
          type: TYPE.TRADE_FIAT_IN,
          fiat: 7,
          in_amt: 1,
          in_token: "Usd",
          out_amt: 0.5,
          out_token: XTZ,
          timestamp: "2021-08-18T19:00:00Z",
        }),
      ];

      expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
        {
          "Date Acquired": "8/13/2021",
          Amount: 0.5,
          "Asset Name": XTZ,
          "Cost Basis": 0.5,
          "Date of Disposition": "8/18/2021",
          "Holding Period (Days)": 5,
          "Gains (Losses)": 3,
          Proceeds: 3.5,
          "Taz Type": TYPE.TRADE_FIAT_IN,
          "Tax lot ID": "",
          "Data Source": "Taz",
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
          timestamp: "2021-08-13T19:00:00Z",
        }),
        csvUtil.createRow({
          type: TYPE.SEND,
          fiat: 2,
          out_amt: 0.6,
          out_token: XTZ,
          timestamp: "2021-08-15T19:00:00Z",
        }),
      ];
      expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
        {
          "Date Acquired": "8/13/2021",
          Amount: 0.6,
          "Asset Name": XTZ,
          "Cost Basis": 0.6,
          "Date of Disposition": "8/15/2021",
          "Holding Period (Days)": 2,
          "Gains (Losses)": 0.6,
          Proceeds: 1.2,
          "Taz Type": TYPE.SEND,
          "Tax lot ID": "",
          "Data Source": "Taz",
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
          timestamp: "2021-08-13T19:00:00Z",
        }),
        csvUtil.createRow({
          type: TYPE.RECEIVE,
          fiat: 1.5,
          in_amt: 2,
          in_token: XTZ,
          timestamp: "2021-08-15T19:00:00Z",
        }),
        csvUtil.createRow({
          type: TYPE.BUY,
          fiat: 2,
          in_amt: 1,
          in_token: "COOL",
          out_amt: 0.5,
          out_token: XTZ,
          fees: 0.1,
          timestamp: "2021-08-18T19:00:00Z",
        }),
        csvUtil.createRow({
          type: TYPE.BUY,
          fiat: 3,
          in_amt: 2,
          in_token: "COOL",
          out_amt: 0.5,
          out_token: XTZ,
          fees: 0.1,
          timestamp: "2021-08-19T19:00:00Z",
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
          timestamp: "2021-08-13T19:00:00Z",
        }),
        csvUtil.createRow({
          type: TYPE.BUY,
          fiat: 2,
          in_amt: 2,
          in_token: "COOL",
          out_amt: 0.5,
          out_token: XTZ,
          fees: 0.1,
          timestamp: "2021-08-18T19:00:00Z",
        }),
        csvUtil.createRow({
          type: TYPE.SALE_RESALE,
          fiat: 3,
          in_amt: 1,
          in_token: XTZ,
          out_amt: 1,
          out_token: "COOL",
          timestamp: "2021-08-19T19:00:00Z",
        }),
      ];

      expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
        {
          "Date Acquired": "8/13/2021",
          Amount: 0.5,
          "Asset Name": XTZ,
          "Cost Basis": 0.5,
          "Date of Disposition": "8/18/2021",
          "Holding Period (Days)": 5,
          "Gains (Losses)": 0.5,
          Proceeds: 1,
          "Taz Type": TYPE.BUY,
          "Tax lot ID": "",
          "Data Source": "Taz",
        },
        {
          "Date Acquired": "8/18/2021",
          Amount: 1,
          "Asset Name": "COOL",
          "Cost Basis": 0.6,
          "Date of Disposition": "8/19/2021",
          "Holding Period (Days)": 1,
          "Gains (Losses)": 2.4,
          Proceeds: 3,
          "Taz Type": TYPE.SALE_RESALE,
          "Tax lot ID": "",
          "Data Source": "Taz",
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
            timestamp: "2021-08-13T19:00:00Z",
          }),
          csvUtil.createRow({
            type: TYPE.RECEIVE,
            fiat: 1.5,
            in_amt: 2,
            in_token: XTZ,
            timestamp: "2021-08-15T19:00:00Z",
          }),
          csvUtil.createRow({
            type: TYPE.BUY,
            fiat: 2,
            in_amt: 1,
            in_token: "COOL",
            out_amt: 0.5,
            out_token: XTZ,
            timestamp: "2021-08-18T19:00:00Z",
          }),
        ];

        expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
          {
            "Date Acquired": "8/13/2021",
            Amount: 0.5,
            "Asset Name": XTZ,
            "Cost Basis": 0.5,
            "Date of Disposition": "8/18/2021",
            "Holding Period (Days)": 5,
            "Gains (Losses)": 0.5,
            Proceeds: 1,
            "Taz Type": TYPE.BUY,
            "Tax lot ID": "",
            "Data Source": "Taz",
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
            timestamp: "2021-08-13T19:00:00Z",
          }),
          csvUtil.createRow({
            type: TYPE.RECEIVE,
            fiat: 3,
            in_amt: 2,
            in_token: XTZ,
            timestamp: "2021-08-15T19:00:00Z",
          }),
          csvUtil.createRow({
            type: TYPE.BUY,
            fiat: 5,
            in_amt: 1,
            in_token: "COOL",
            out_amt: 1.5,
            out_token: XTZ,
            timestamp: "2021-08-18T19:00:00Z",
          }),
        ];

        expect(gains.generateReport(2021, rows, "FIFO")).toStrictEqual([
          {
            "Date Acquired": "8/13/2021",
            Amount: 1,
            "Asset Name": XTZ,
            "Cost Basis": 2,
            "Date of Disposition": "8/18/2021",
            "Holding Period (Days)": 5,
            "Gains (Losses)": 3,
            Proceeds: 5,
            "Taz Type": TYPE.BUY,
            "Tax lot ID": "",
            "Data Source": "Taz",
          },
          {
            "Date Acquired": "8/15/2021",
            Amount: 0.5,
            "Asset Name": XTZ,
            "Cost Basis": 1.5,
            "Date of Disposition": "8/18/2021",
            "Holding Period (Days)": 3,
            "Gains (Losses)": 1,
            Proceeds: 2.5,
            "Taz Type": TYPE.BUY,

            "Tax lot ID": "",
            "Data Source": "Taz",
          },
        ]);
      });
    });
  });
  test.todo("HIFO");
  test.todo("LIFO");
});
