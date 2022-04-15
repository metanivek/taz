import collation from "../collation.js";
import constants from "../constants.js";
import csvUtil from "./__utils__/csv.js";

const { TYPE, XTZ } = constants;

const ADDR1 = "tz123";
const ADDR2 = "tz456";
const ADDR3 = "tz789";
const ADDRESSES = [ADDR1, ADDR3];

describe("classify", () => {
  test("ignore rows without level", () => {
    const rows = [
      {
        h: "w",
      },
    ];
    expect(collation.classify(rows, ADDRESSES)).toStrictEqual(rows);
  });

  test("trade -> buy", () => {
    const rows = [
      csvUtil.createRow({
        type: TYPE.TRADE,
        in_token: "KT123",
        out_token: XTZ,
      }),
    ];
    expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
      csvUtil.changeRowType(rows[0], TYPE.BUY),
    ]);
  });

  test("buyback should not classify as resale", () => {
    const rows = [
      csvUtil.createRow({
        type: TYPE.SALE,
        out_token: "KT123",
        out_token_id: 123,
        level: 0,
      }),
      csvUtil.createRow({
        type: TYPE.TRADE,
        in_token_id: 123,
        in_token: "KT123",
        out_token: XTZ,
        level: 1,
      }),
    ];
    expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
      rows[0],
      csvUtil.changeRowType(rows[1], TYPE.BUY),
    ]);
  });

  describe("send -> transfer", () => {
    test("on chain", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.SEND,
          out_token: "boop",
          out_token_to: ADDR1,
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
        csvUtil.changeRowType(rows[0], TYPE.TRANSFER),
      ]);
    });

    test("chain to cex", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.SEND,
          out_token: "boop",
          out_token_to: "tzCex",
          op: "hash",
        }),
        csvUtil.createRow({
          type: TYPE.TRANSFER,
          no_level: true,
          op: "hash",
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
        csvUtil.changeRowType(rows[0], TYPE.TRANSFER),
        rows[1],
      ]);
    });
  });

  describe("receive -> transfer", () => {
    test("on chain", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.RECEIVE,
          in_token: XTZ,
          in_token_from: ADDR1,
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
        csvUtil.changeRowType(rows[0], TYPE.TRANSFER),
      ]);
    });

    test("chain from cex", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.TRANSFER,
          no_level: true,
          op: "hash",
        }),
        csvUtil.createRow({
          type: TYPE.RECEIVE,
          op: "hash",
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
        rows[0],
        csvUtil.changeRowType(rows[1], TYPE.TRANSFER),
      ]);
    });
  });

  test("send:token -> transfer:token", () => {
    const rows = [
      csvUtil.createRow({
        type: TYPE.SEND_TOKEN_TZ,
        out_token: "KT123",
        out_token_to: ADDR1,
      }),
      csvUtil.createRow({
        type: TYPE.SEND_TOKEN_TZ,
        out_token: "KT123",
        out_token_to: ADDR2,
      }),
    ];
    expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
      csvUtil.changeRowType(rows[0], TYPE.TRANSFER_TOKEN),
      rows[1],
    ]);
  });

  test("airdrop -> transfer:token", () => {
    const rows = [
      csvUtil.createRow({
        type: TYPE.AIRDROP,
        in_token: "KT123",
        in_token_from: ADDR1,
      }),
      csvUtil.createRow({
        type: TYPE.SEND_TOKEN_TZ,
        in_token: "KT123",
        in_token_from: ADDR2,
      }),
    ];
    expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
      csvUtil.changeRowType(rows[0], TYPE.TRANSFER_TOKEN),
      rows[1],
    ]);
  });

  test("trade -> trade:cex", () => {
    const rows = [
      csvUtil.createRow({
        type: TYPE.TRADE,
        no_level: true,
      }),
      csvUtil.createRow({
        type: TYPE.TRADE,
      }),
    ];
    expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
      csvUtil.changeRowType(rows[0], TYPE.TRADE_CEX),
      rows[1],
    ]);
  });

  test("sale of mint", () => {
    const rows = [
      csvUtil.createRow({
        type: TYPE.MINT,
        in_token: "KT123",
        in_token_id: 123,
      }),
      csvUtil.createRow({
        type: TYPE.SALE,
        out_token: "KT123",
        out_token_id: 123,
      }),
    ];
    expect(collation.classify(rows, ADDRESSES)).toStrictEqual(rows);
  });

  describe("sale -> sale:resale", () => {
    test("after trade", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.TRADE,
          in_token: "KT123",
          in_token_id: 123,
          level: 0,
        }),
        csvUtil.createRow({
          type: TYPE.SALE,
          out_token: "KT123",
          out_token_id: 123,
          level: 1,
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
        rows[0],
        csvUtil.changeRowType(rows[1], TYPE.SALE_RESALE),
      ]);
    });

    test("after airdrop", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.AIRDROP,
          in_token: "KT123",
          in_token_id: 123,
          level: 0,
        }),
        csvUtil.createRow({
          type: TYPE.SALE,
          out_token: "KT123",
          out_token_id: 123,
          level: 1,
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
        rows[0],
        csvUtil.changeRowType(rows[1], TYPE.SALE_RESALE),
      ]);
    });

    test("after receive token (should not change type)", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.RECEIVE_TOKEN,
          in_token: "KT123",
          in_token_id: 123,
        }),
        csvUtil.createRow({
          type: TYPE.SALE,
          out_token: "KT123",
          out_token_id: 123,
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual(rows);
    });

    test("after buyback", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.SALE,
          out_token: "KT123",
          out_token_id: 123,
          level: 0,
        }),
        csvUtil.createRow({
          type: TYPE.TRADE,
          in_token_id: 123,
          in_token: "KT123",
          out_token: XTZ,
          level: 1,
        }),
        csvUtil.createRow({
          type: TYPE.SALE,
          out_token_id: 123,
          out_token: "KT123",
          level: 2,
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
        rows[0],
        csvUtil.changeRowType(rows[1], TYPE.BUY),
        csvUtil.changeRowType(rows[2], TYPE.SALE_RESALE),
      ]);
    });
  });

  describe("two-phase transactions", () => {
    test("send to contract with future tokens then airdrops", () => {
      const KT = "KT123";
      const rows = [
        csvUtil.createRow({
          type: TYPE.SEND,
          in_amt: 2,
          in_token: "FUTURE-XYZ",
          out_amt: 10,
          out_token: XTZ,
          out_token_to: KT,
          fees: 0.001797,
          level: 0,
          op: "hash1",
          timestamp: "time1",
        }),
        csvUtil.createRow({
          type: TYPE.AIRDROP,
          in_amt: 1,
          in_token: "XYZ",
          in_token_from: KT,
          level: 1,
          fees: 0,
          op: "hash2",
          timestamp: "time2",
        }),
        csvUtil.createRow({
          type: TYPE.AIRDROP,
          in_amt: 1,
          in_token: "XYZ",
          in_token_from: KT,
          level: 1,
          fees: 0,
          op: "hash3",
          timestamp: "time3",
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
        csvUtil.createRow({
          type: TYPE.SEND,
          fees: 0.001797,
          level: 0,
          op: "hash1",
          timestamp: "time1",
        }),
        csvUtil.createRow({
          type: TYPE.BUY,
          in_amt: 1,
          in_token: "XYZ",
          in_token_from: KT,
          out_amt: 5,
          out_token: XTZ,
          out_token_to: KT,
          level: 1,
          fees: 0,
          op: "hash2",
          timestamp: "time2",
        }),
        csvUtil.createRow({
          type: TYPE.BUY,
          in_amt: 1,
          in_token: "XYZ",
          in_token_from: KT,
          out_amt: 5,
          out_token: XTZ,
          out_token_to: KT,
          level: 1,
          fees: 0,
          op: "hash3",
          timestamp: "time3",
        }),
      ]);
    });

    test("send to contract that airdrops token", () => {
      // default assumes that entire amount of tez is for first airdrop
      // this path does not handle multiple airdrops for one xtz transaction
      const KT = "KT123";
      const rows = [
        csvUtil.createRow({
          type: TYPE.SEND,
          out_amt: 10,
          out_token: XTZ,
          out_token_to: KT,
          fees: 0.001797,
          level: 0,
          op: "hash1",
          timestamp: "time1",
        }),
        csvUtil.createRow({
          type: TYPE.AIRDROP,
          in_amt: 1,
          in_token: "SKELE",
          in_token_from: KT,
          level: 1,
          fees: 0,
          op: "hash2",
          timestamp: "time2",
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
        csvUtil.createRow({
          type: TYPE.SEND,
          fees: 0.001797,
          level: 0,
          op: "hash1",
          timestamp: "time1",
        }),
        csvUtil.createRow({
          type: TYPE.BUY,
          in_amt: 1,
          in_token: "SKELE",
          in_token_from: KT,
          out_amt: 10,
          out_token: XTZ,
          out_token_to: KT,
          level: 1,
          fees: 0,
          op: "hash2",
          timestamp: "time2",
        }),
      ]);
    });
  });
});
