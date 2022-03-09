import conversion from "../conversion.js";
import constants from "../../constants.js";

const { TYPE, XTZ } = constants;
const TIMESTAMP = "2021-07-10T00:00:00Z";
const FIAT_QUOTE = 3;
const HASH = "opabc123";

describe("operationGroupsToRows", () => {
  test("simple", () => {
    const ops = [
      {
        address: "tz314",
        metadata: {
          timestamp: TIMESTAMP,
          fiatQuote: FIAT_QUOTE,
          hash: HASH,
          level: 345,
          fees: 0.00142,
          in: [],
          out: [{ amount: 1, token: XTZ, to: "tz12", from: "tz456" }],
          type: TYPE.SEND,
        },
      },
    ];

    expect(conversion.operationGroupsToRows(ops)).toStrictEqual([
      {
        account: "tz314",
        fees: 0.00142,
        fiat: FIAT_QUOTE,
        in_amt: undefined,
        in_token: undefined,
        in_token_from: undefined,
        in_token_id: undefined,
        op: HASH,
        out_amt: 1,
        out_token: XTZ,
        out_token_id: undefined,
        out_token_to: "tz12",
        timestamp: TIMESTAMP,
        level: 345,
        type: TYPE.SEND,
      },
    ]);
  });

  test("ops without in or out", () => {
    const ops = [
      { metadata: { type: TYPE.CONTRACT_CALL, in: [], out: [], fees: 5 } },
    ];
    expect(conversion.operationGroupsToRows(ops)).toStrictEqual([
      {
        account: undefined,
        fees: 5,
        fiat: undefined,
        in_amt: undefined,
        in_token: undefined,
        in_token_from: undefined,
        in_token_id: undefined,
        op: undefined,
        out_amt: undefined,
        out_token: undefined,
        out_token_id: undefined,
        out_token_to: undefined,
        timestamp: undefined,
        level: undefined,
        type: TYPE.CONTRACT_CALL,
      },
    ]);
  });

  test.todo("multipe in and out");
});
