import classification from "../classification.js";
import constants from "../constants.js";
import operationsUtils from "./__utils__/operations.js";
import metadataUtils from "./__utils__/metadata.js";

const { fixtureWithHash } = operationsUtils;
const { selectFields } = metadataUtils;

const { classifyOperationGroup } = classification;
const { TYPE, XTZ } = constants;

const OBJKT_ENGLISH_AUCTIONS = [
  "KT1XjcRq5MLAzMKQ3UHsrue2SeU2NbxUrzmU", // v1
  "KT18p94vjkkHYY3nPmernmgVR7HdZFzE7NAk", // v2
];

const OBJKT_MARKETPLACES = [
  "KT1FvqJwEDWb1Gwc55Jd1jjTHRVWbYKUUpyq", // v1
  "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC", // v2
];

test("minter", async () => {
  const hash = "opLGTP2AcwT2oL3UfxCKTsLd3FVWBS34mdXKq9kK4T6y2iBYQsb";
  const { ops, address } = await fixtureWithHash(hash);

  expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
    {
      fees: 0.069931,
      in: [
        {
          amount: 1,
          from: "KT1FHcdRnht4L4ttSVeDY8tWvocMQR1xsUCp",
          to: "tz1N3xSSHguSVLYMCeNG7e3oiDfPnc6FnQip",
          token: "KT1FHcdRnht4L4ttSVeDY8tWvocMQR1xsUCp",
          tokenId: "0",
        },
      ],
      out: [],
      type: TYPE.MINT,
    },
  ]);
});

describe("v1", () => {
  test("auction bid", async () => {
    const hash = "onqLakHiJ7jh4eDUkktZZCH6ViYyg3kVakYziTxRtGTKdvvB9jv";
    const { ops, address } = await fixtureWithHash(hash);
    expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
      {
        type: TYPE.AUCTION_BID,
        fees: 0.001797,
        in: [
          {
            amount: 1,
            tokenId: "25029",
            token: OBJKT_ENGLISH_AUCTIONS[0],
            from: OBJKT_ENGLISH_AUCTIONS[0],
            to: "tz1N3xSSHguSVLYMCeNG7e3oiDfPnc6FnQip",
            pseudo: true,
          },
        ],
        out: [
          {
            amount: 1,
            token: XTZ,
            to: OBJKT_ENGLISH_AUCTIONS[0],
            from: "tz1N3xSSHguSVLYMCeNG7e3oiDfPnc6FnQip",
          },
        ],
      },
    ]);
  });

  test("conclude_auction", async () => {
    const hash = "oov2zLtKgbW53SUntEkceGMmf6Jnzk3jcLGyW9VLKmkx3cRDNYC";
    const { ops, address } = await fixtureWithHash(
      hash,
      (ops) => ops[1].parameter.value[0].txs[0]["to_"]
    );
    expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
      {
        type: TYPE.AUCTION_SETTLE,
        fees: 0,
        in: [
          {
            amount: 1,
            tokenId: "441377",
            token: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
            from: OBJKT_ENGLISH_AUCTIONS[0],
            to: "tz1N3xSSHguSVLYMCeNG7e3oiDfPnc6FnQip",
          },
        ],
        out: [
          {
            amount: 1,
            tokenId: "25029",
            to: OBJKT_ENGLISH_AUCTIONS[0],
            from: "tz1N3xSSHguSVLYMCeNG7e3oiDfPnc6FnQip",
            token: OBJKT_ENGLISH_AUCTIONS[0],
            pseudo: true,
          },
        ],
      },
    ]);
  });

  test("auction outbid", async () => {
    const hash = "oo3tYvzNiESN494AWvCmcJxf6L8YmEpxQkzZjEsARLXnojqagRG";
    const { ops, address } = await fixtureWithHash(
      hash,
      (ops) => ops[1].target.address
    );
    expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
      {
        type: TYPE.AUCTION_OUTBID,
        fees: 0,
        in: [
          {
            amount: 1020,
            token: XTZ,
            from: OBJKT_ENGLISH_AUCTIONS[0],
            to: "tz1UPB5kDUMnmvrkKaQEjqtYVozNGaWHjVei",
          },
        ],
        out: [],
      },
    ]);
  });

  test("offer bid (as bidder)", async () => {
    const hash = "ooFVBeroUstdY7gdjKTpMYcTkZkJPvmi2qxFYzWfSdb6eY39vHR";
    const { ops, address } = await fixtureWithHash(hash);
    expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
      {
        fees: 0.000564,
        type: TYPE.OFFER,
        in: [
          {
            amount: 1,
            from: OBJKT_MARKETPLACES[0],
            to: "tz1N1kCfTeEyM3r8wkUfSBDKqvnnZMxGPutK",
            token: OBJKT_MARKETPLACES[0],
            tokenId: "142987",
            pseudo: true,
          },
        ],
        out: [
          {
            amount: 0.5,
            to: OBJKT_MARKETPLACES[0],
            from: "tz1N1kCfTeEyM3r8wkUfSBDKqvnnZMxGPutK",
            token: XTZ,
          },
        ],
      },
    ]);
  });

  test("offer retract_bid (as bidder)", async () => {
    const hash = "oowFBNLRbsRHwMctuQbe1NeGjfEiCUkvcrRiWT24pQUBCUzawe2";
    const { ops, address } = await fixtureWithHash(hash);
    expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
      {
        fees: 0.000722,
        type: TYPE.OFFER_RETRACT,
        in: [
          {
            amount: 99,
            from: OBJKT_MARKETPLACES[0],
            to: "tz1gbwXXtKxK2QKJpvLF4JJUybxtHeREqMJH",
            token: XTZ,
          },
        ],
        out: [
          {
            amount: 1,
            tokenId: "142991",
            to: OBJKT_MARKETPLACES[0],
            from: "tz1gbwXXtKxK2QKJpvLF4JJUybxtHeREqMJH",
            token: OBJKT_MARKETPLACES[0],
            pseudo: true,
          },
        ],
      },
    ]);
  });

  test("offer fulfill_bid (as bidder)", async () => {
    const hash = "ooM7US9DhLjrRybuz6HD5yFc1pUU5M7jqbHb1DGnVMp3hC1Fjk7";
    const { ops, address } = await fixtureWithHash(
      hash,
      (ops) => ops[2].parameter.value[0].txs[0]["to_"]
    );
    expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
      {
        fees: 0,
        type: TYPE.OFFER_FULFILL,
        in: [
          {
            amount: 1,
            tokenId: "0",
            from: "tz1eiAZ7VvW96eK6VQAjPAMamYS2efQCN19z",
            to: "tz1N1kCfTeEyM3r8wkUfSBDKqvnnZMxGPutK",
            token: "KT1WFogjPtbC3wAY2T9cmEY36VQbdKbsA44K",
          },
        ],
        out: [
          {
            amount: 1,
            tokenId: "142987",
            to: OBJKT_MARKETPLACES[0],
            from: "tz1N1kCfTeEyM3r8wkUfSBDKqvnnZMxGPutK",
            token: OBJKT_MARKETPLACES[0],
            pseudo: true,
          },
        ],
      },
    ]);
  });

  test("offer fulfill_bid (as secondary sale)", async () => {
    const hash = "ooryUiTGP12RPtWMVX52LRTrWX4Vc8EAx8TaqieohgjkVdJZ4Xh";

    const { ops, address } = await fixtureWithHash(
      hash,
      (ops) => ops[4].target.address
    );
    expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
      {
        type: TYPE.SALE,
        fees: 0,
        in: [
          {
            amount: 0.8,
            // TODO: is it worth trying to figure out the tz account
            from: "KT1FvqJwEDWb1Gwc55Jd1jjTHRVWbYKUUpyq",
            to: "tz1XDQJPCP53mSgwDZiNphTVKGmDJRsTwWUe",
            token: XTZ,
          },
        ],
        out: [
          {
            amount: 1,
            token: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
            tokenId: "136686",
            to: "tz1ccXwq87b1hNktXprs3GZ2BXpaF2KTPAXS",
            from: "tz1agchaEF9EK3ARhHDeKTQFBzw4CjNkHKEJ",
          },
        ],
      },
    ]);
  });

  test.todo("fulfill_bid (as primary sale)");
});

describe("v2", () => {
  test.todo("offer");

  test.todo("retract_offer");

  test.todo("fulfill_offer");

  test.todo("bid (v2)"); // const hash = "opHdtAnX1oCKt7bn9ufX7NGUvffAQsoKCqvoitjBUeYdNKGjCcb";

  test.todo("settle_auction (v2)");

  test.todo("outbid (v2)");
});
