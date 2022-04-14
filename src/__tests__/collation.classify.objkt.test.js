import collation from "../collation.js";
import constants from "../constants.js";
import csvUtil from "./__utils__/csv.js";

const { TYPE, XTZ } = constants;

const ADDR1 = "tz123";
const ADDR3 = "tz789";
const ADDRESSES = [ADDR1, ADDR3];

const OBJKT_ENGLISH_AUCTIONS = [
  "KT1XjcRq5MLAzMKQ3UHsrue2SeU2NbxUrzmU", // v1
  "KT18p94vjkkHYY3nPmernmgVR7HdZFzE7NAk", // v2
];

const OBJKT_MARKETPLACES = [
  "KT1FvqJwEDWb1Gwc55Jd1jjTHRVWbYKUUpyq", // v1
  "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC", // v2
];

describe("two-phase transactions", () => {
  describe("offers (v1)", () => {
    test("bid and retract_bid (as bidder)", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.OFFER,
          in_amt: 1,
          in_token_id: 80, // offer id
          in_token: OBJKT_MARKETPLACES[0],
          in_token_from: OBJKT_MARKETPLACES[0],
          out_amt: 10,
          out_token: XTZ,
          out_token_to: OBJKT_MARKETPLACES[0],
          fees: 0.001797,
          level: 0,
          op: "hash1",
          timestamp: "time1",
        }),
        csvUtil.createRow({
          type: TYPE.OFFER_RETRACT,
          fees: 0.00345,
          in_amt: 10,
          in_token: XTZ,
          in_token_from: OBJKT_MARKETPLACES[0],
          level: 1,
          op: "hash2",
          timestamp: "time2",
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
        csvUtil.createRow({
          type: TYPE.OFFER,
          fees: 0.001797,
          level: 0,
          op: "hash1",
          timestamp: "time1",
        }),
        csvUtil.createRow({
          type: TYPE.OFFER_RETRACT,
          fees: 0.00345,
          level: 1,
          op: "hash2",
          timestamp: "time2",
        }),
      ]);
    });

    test("bid and fulfill_bid (as bidder)", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.OFFER,
          in_amt: 1,
          in_token_id: 80, // offer id
          in_token: OBJKT_MARKETPLACES[0],
          in_token_from: OBJKT_MARKETPLACES[0],
          out_amt: 10,
          out_token: XTZ,
          out_token_to: OBJKT_MARKETPLACES[0],
          fees: 0.001797,
          level: 0,
          op: "hash1",
          timestamp: "time1",
        }),
        csvUtil.createRow({
          type: TYPE.OFFER_FULFILL,
          in_amt: 1,
          fees: 0,
          in_token_id: "441377",
          in_token: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
          in_token_from: OBJKT_MARKETPLACES[0],
          out_amt: 1,
          out_token_id: 80,
          out_token: OBJKT_MARKETPLACES[0],
          out_token_to: OBJKT_MARKETPLACES[0],
          level: 1,
          op: "hash2",
          timestamp: "time2",
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
        csvUtil.createRow({
          type: TYPE.OFFER,
          fees: 0.001797,
          level: 0,
          op: "hash1",
          timestamp: "time1",
        }),
        csvUtil.createRow({
          type: TYPE.BUY,
          in_amt: 1,
          in_token_id: "441377",
          in_token: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
          in_token_from: OBJKT_MARKETPLACES[0],
          out_amt: 10,
          out_token: XTZ,
          out_token_to: OBJKT_MARKETPLACES[0],
          level: 1,
          op: "hash2",
          timestamp: "time2",
          fees: 0,
        }),
      ]);
    });
  });

  describe("english auctions (v1)", () => {
    test("bid and outbid", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.AUCTION_BID,
          in_amt: 1,
          in_token_id: 80, // auction id
          in_token: OBJKT_ENGLISH_AUCTIONS[0],
          in_token_from: OBJKT_ENGLISH_AUCTIONS[0],
          out_amt: 10,
          out_token: XTZ,
          out_token_to: OBJKT_ENGLISH_AUCTIONS[0],
          fees: 0.001797,
          level: 0,
          op: "hash1",
          timestamp: "time1",
        }),
        csvUtil.createRow({
          type: TYPE.AUCTION_OUTBID,
          in_amt: 10,
          in_token: XTZ,
          in_token_from: OBJKT_ENGLISH_AUCTIONS[0],
          level: 1,
          op: "hash2",
          timestamp: "time2",
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
        csvUtil.createRow({
          type: TYPE.AUCTION_BID,
          fees: 0.001797,
          level: 0,
          op: "hash1",
          timestamp: "time1",
        }),
      ]);
    });

    test("bid and win", () => {
      const rows = [
        csvUtil.createRow({
          type: TYPE.AUCTION_BID,
          in_amt: 1,
          in_token_id: 80, // auction id
          in_token: OBJKT_ENGLISH_AUCTIONS[0],
          in_token_from: OBJKT_ENGLISH_AUCTIONS[0],
          out_amt: 10,
          out_token: XTZ,
          out_token_to: OBJKT_ENGLISH_AUCTIONS[0],
          fees: 0.001797,
          level: 0,
          op: "hash1",
          timestamp: "time1",
        }),
        csvUtil.createRow({
          type: TYPE.AUCTION_SETTLE,
          fees: 0,
          in_amt: 1,
          in_token_id: "441377",
          in_token: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
          in_token_from: OBJKT_ENGLISH_AUCTIONS[0],
          out_amt: 1,
          out_token_id: 80,
          out_token: OBJKT_ENGLISH_AUCTIONS[0],
          out_token_to: OBJKT_ENGLISH_AUCTIONS[0],
          level: 1,
          op: "hash2",
          timestamp: "time2",
        }),
      ];
      expect(collation.classify(rows, ADDRESSES)).toStrictEqual([
        csvUtil.createRow({
          type: TYPE.AUCTION_BID,
          fees: 0.001797,
          level: 0,
          op: "hash1",
          timestamp: "time1",
        }),
        csvUtil.createRow({
          type: TYPE.BUY,
          in_amt: 1,
          in_token_id: "441377",
          in_token: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
          in_token_from: OBJKT_ENGLISH_AUCTIONS[0],
          out_amt: 10,
          out_token: XTZ,
          out_token_to: OBJKT_ENGLISH_AUCTIONS[0],
          level: 1,
          op: "hash2",
          timestamp: "time2",
          fees: 0,
        }),
      ]);
    });
  });
});
