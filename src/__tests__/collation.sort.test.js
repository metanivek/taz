import collation from "../collation.js";
import constants from "../constants.js";

const { TYPE, XTZ } = constants;

describe("sort", () => {
  describe("exchange timestamps off", () => {
    test("exchange transfer, chain receive", () => {
      const addr = "tz123";
      const amt = 10;
      const fees = 0.00142;
      const A = {
        type: TYPE.TRANSFER,
        out_amt: amt,
        out_token: XTZ,
        out_token_to: addr,
        fees: fees,
        timestamp: "2021-07-08T00:00:00Z",
        op: "hash1",
      };
      const B = {
        account: addr,
        level: 500,
        type: TYPE.RECEIVE,
        in_amt: amt - fees,
        fees: 0,
        timestamp: "2021-07-07T00:00:00Z",
        op: "hash1",
      };
      const C = {
        level: 800,
        timestamp: "2021-07-19T00:00:00Z",
      };
      const D = {
        timestamp: "2021-07-24T00:00:00Z",
      };

      const rows = [C, B, D, A];
      expect(collation.sort(rows)).toStrictEqual([A, B, C, D]);
    });

    test("exchange receive, chain send", () => {
      const addr = "tz123";
      const amt = 10;
      const fees = 0.00142;
      const A = {
        level: 800,
        timestamp: "2021-07-01T00:00:00Z",
      };
      const B = {
        timestamp: "2021-07-03T00:00:00Z",
      };
      const C = {
        account: addr,
        level: 500,
        type: TYPE.SEND,
        out_amt: amt,
        fees: fees,
        timestamp: "2021-07-08T00:00:00Z",
        op: "hash1",
      };
      const D = {
        type: TYPE.TRANSFER,
        in_amt: amt - fees,
        in_token: XTZ,
        in_token_from: addr,
        fees: 0,
        timestamp: "2021-07-07T00:00:00Z",
        op: "hash1",
      };
      const rows = [D, C, B, A];

      expect(collation.sort(rows)).toStrictEqual([A, B, C, D]);
    });
  });
});
