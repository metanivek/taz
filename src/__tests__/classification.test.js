import path from "path";
import classification from "../classification.js";
import constants from "../constants.js";
import jsonIO from "../json/io.js";

const { classifyOperationGroup } = classification;
const { TYPE, XTZ, OBJKT_ENGLISH_AUCTIONS, OBJKT_MARKETPLACES } = constants;

const ADDR1 = "tzaddress1";
const ADDR2 = "tzaddress2";
const ADDR3 = "tzaddress3";
const KTADDR1 = "KTADDR1";
const KTADDR2 = "KTADDR2";
const TOKEN_TARGET = {
  alias: "hDAO",
  address: "KT1AFA2mwNUMNd4SsujE1YYp29vd8BZejyKW",
};
const NFT_TARGET = {
  alias: "hic et nunc NFTs",
  address: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
};
const BURNADDR = "tz1burnburnburnburnburnburnburjAYjjX";
const TOKEN_AMT = "1";
const TOKEN_ID = "777";
const TIMESTAMP = "2021-07-08T00:00:00Z";
const USD_QUOTE = 3;
const HASH = "opabc123";
const tez = (amt) => amt * Math.pow(10, 6);

const fixtureWithHash = async (
  opHash,
  address = (ops) => ops[0].sender.address
) => {
  const filename = path.resolve(
    path.join("src", "__tests__", "__operations__", `${opHash}.json`)
  );
  const ops = await jsonIO.read(filename);
  return { ops, address: address(ops) };
};

const makeOperation = ({
  sender = ADDR1,
  initiator,
  target,
  bakerFee,
  storageFee,
  amount = 0,
  entrypoint,
  value,
  hasInternals,
  type = "transaction",
  delegate,
}) => {
  const op = {
    type,
    hash: HASH,
    level: 123,
    timestamp: TIMESTAMP,
    quote: { usd: USD_QUOTE },
    sender: {
      address: sender,
    },
    bakerFee,
    storageFee,
    amount,
    hasInternals: !!hasInternals,
  };
  if (typeof target === "object") {
    op.target = target;
  } else if (target !== undefined) {
    op.target = { address: target };
  }
  if (delegate) op.newDelegate = { address: delegate };
  if (initiator) op.initiator = { address: initiator };
  if (entrypoint) {
    op.parameter = {
      entrypoint,
      value,
    };
  }
  return op;
};
const makeTransferValue = ({
  from,
  to,
  amount = TOKEN_AMT,
  tokenId = TOKEN_ID,
}) => {
  return {
    from_: from,
    txs: [{ to_: to, amount, token_id: tokenId }],
  };
};

// for easier strict equal checks
const selectFields = (result, fields = ["fees", "in", "out", "type"]) => {
  return result.map((r) => {
    const m = r.metadata;
    for (const key of Object.keys(m)) {
      if (fields.includes(key) === false) {
        delete m[key];
      }
    }
    return m;
  });
};

describe("response", () => {
  test("fields", () => {
    const sender = ADDR1;
    const recipient = ADDR2;
    const ops = [
      makeOperation({
        sender,
        target: recipient,
        bakerFee: 1420,
        amount: 1000000,
      }),
    ];
    expect(classifyOperationGroup(sender, ops)).toStrictEqual([
      {
        metadata: {
          timestamp: TIMESTAMP,
          fiatQuote: USD_QUOTE,
          hash: HASH,
          level: 123,
          fees: 0.00142,
          in: [],
          out: [{ amount: 1, token: XTZ, to: recipient, from: sender }],
          type: TYPE.SEND,
        },
        address: sender,
        ops,
      },
    ]);
  });
});

describe("non-transactions", () => {
  test("delegation", () => {
    const sender = ADDR1;
    const recipient = ADDR2;
    const ops = [
      makeOperation({
        type: "delegation",
        sender,
        target: recipient,
        bakerFee: 30000,
        amount: 79249001,
        delegate: "tz1baker",
      }),
    ];
    expect(selectFields(classifyOperationGroup(sender, ops))).toStrictEqual([
      {
        type: TYPE.DELEGATION,
        fees: 0.03,
        in: [],
        out: [],
      },
    ]);
  });

  test("origination", () => {
    const sender = ADDR1;
    const recipient = ADDR2;
    const ops = [
      makeOperation({
        type: "origination",
        sender,
        target: recipient,
        storageFee: 889000,
      }),
    ];
    expect(selectFields(classifyOperationGroup(sender, ops))).toStrictEqual([
      {
        type: TYPE.ORIGINATION,
        fees: 0.889,
        in: [],
        out: [],
      },
    ]);
  });

  test("skips reveal", async () => {
    const hash = "ooUvWBef9fnKgDV89ybmP5gEuLxgPSY7VXiMfA2bemWFddQtCqB";
    const { ops, address } = await fixtureWithHash(hash);

    expect(classifyOperationGroup(address, ops).length).toEqual(1);
  });
});

describe("basic XTZ transactions", () => {
  test("send", () => {
    const sender = ADDR1;
    const recipient = ADDR2;
    const ops = [
      makeOperation({
        sender,
        target: recipient,
        bakerFee: 1420,
        amount: 1000000,
      }),
    ];
    expect(selectFields(classifyOperationGroup(sender, ops))).toStrictEqual([
      {
        fees: 0.00142,
        in: [],
        out: [{ amount: 1, token: XTZ, to: recipient, from: sender }],
        type: TYPE.SEND,
      },
    ]);
  });

  test("receive", () => {
    const sender = ADDR1;
    const recipient = ADDR2;
    const ops = [
      makeOperation({
        sender,
        target: recipient,
        bakerFee: 1420,
        amount: 1000000,
      }),
    ];
    expect(selectFields(classifyOperationGroup(recipient, ops))).toStrictEqual([
      {
        fees: 0,
        in: [{ amount: 1, token: XTZ, from: sender, to: recipient }],
        out: [],
        type: TYPE.RECEIVE,
      },
    ]);
  });
});

describe("token trades", () => {
  test("FA2", () => {
    const sender = ADDR1;
    const contract = KTADDR1;
    const ops = [
      makeOperation({
        sender,
        target: contract,
        bakerFee: 1420,
        amount: 1000000,
        entrypoint: "tezToTokenPayment",
      }),
      makeOperation({
        sender: contract,
        initiator: sender,
        target: TOKEN_TARGET,
        entrypoint: "transfer",
        value: [
          makeTransferValue({
            from: contract,
            to: sender,
            amount: "3000000",
            tokenId: "0",
          }),
        ],
      }),
    ];
    const tokens = [
      {
        address: TOKEN_TARGET.address,
        decimals: 6,
      },
    ];
    expect(
      selectFields(classifyOperationGroup(sender, ops, tokens))
    ).toStrictEqual([
      {
        fees: 0.00142,
        in: [
          {
            amount: 3,
            token: TOKEN_TARGET.address,
            tokenId: "0",
            from: contract,
            to: sender,
          },
        ],
        out: [{ amount: 1, token: XTZ, to: contract, from: sender }],
        type: TYPE.TRADE,
      },
    ]);
  });

  test("FA1.2", async () => {
    const hash = "oovwomEuFXcJBtMzCa3GEbPvYPj5ZJoLxjKzp32cnpVu5U9LSBZ";

    const { ops, address } = await fixtureWithHash(hash);

    expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
      {
        fees: 0.001269,
        in: [
          {
            amount: 98388986,
            from: "KT1LzyPS8rN375tC31WPAVHaQ4HyBvTSLwBu",
            to: "tz1ZafJ651TJLZgzYVkKk9syb1N2rXL41h8Z",
            token: "KT1TwzD6zV3WeJ39ukuqxcfK2fJCnhvrdN1X",
            tokenId: "0",
          },
        ],
        out: [
          {
            amount: 390,
            token: XTZ,
            from: "tz1ZafJ651TJLZgzYVkKk9syb1N2rXL41h8Z",
            to: "KT1LzyPS8rN375tC31WPAVHaQ4HyBvTSLwBu",
          },
        ],
        type: TYPE.TRADE,
      },
    ]);
  });
});

describe("smart contracts", () => {
  test("generic call sending no XTZ", () => {
    const sender = ADDR1;
    const contract = KTADDR1;
    const ops = [
      makeOperation({
        sender,
        target: contract,
        entrypoint: "doSomething",
        bakerFee: 1420,
        storageFee: 1000,
      }),
    ];
    expect(selectFields(classifyOperationGroup(sender, ops))).toStrictEqual([
      {
        fees: 0.00242,
        in: [],
        out: [],
        type: TYPE.CONTRACT_CALL,
      },
    ]);
  });
});

describe("operations for NFTs", () => {
  describe("mint", () => {
    test("hic et nunc", async () => {
      const hash = "oovNPhps6KjzmXnF2xqCBSnT3qjw3Zhnt8TovhzW7dU99TpQf2y";
      const { ops, address } = await fixtureWithHash(hash);

      expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
        {
          fees: 0.061751,
          in: [
            {
              amount: 50,
              from: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
              to: "tz1N3xSSHguSVLYMCeNG7e3oiDfPnc6FnQip",
              token: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
              tokenId: "189019",
            },
          ],
          out: [],
          type: TYPE.MINT,
        },
      ]);
    });

    test("objkt.com minter", async () => {
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

    test("fxhash issuer mint v1", async () => {
      const hash = "ooisS6BK182NTCFzZ7KjFcNkCMdYEnfxsuoT9CbNRyBDE7Z3s2L";
      const { ops, address } = await fixtureWithHash(hash);

      expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
        {
          fees: 0.057327,
          in: [
            {
              amount: 1,
              from: "KT1AEVuykWeuuFX7QkEAMNtffzwhe1Z98hJS",
              to: "tz1XDQJPCP53mSgwDZiNphTVKGmDJRsTwWUe",
              token: "KT1AEVuykWeuuFX7QkEAMNtffzwhe1Z98hJS",
              tokenId: "4538",
            },
          ],
          out: [],
          type: TYPE.MINT,
        },
      ]);
    });

    test("fxhash issuer mint v2", async () => {
      const hash = "oo5TfnjmDEKussfoscbgxc8orXharTCja7KkpXQZcnVgwqxCt34";
      const { ops, address } = await fixtureWithHash(hash);

      expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
        {
          fees: 0.07044,
          in: [
            {
              amount: 1,
              from: "KT1XCoGnfupWk7Sp8536EfrxcP73LmT68Nyr",
              to: "tz1XDQJPCP53mSgwDZiNphTVKGmDJRsTwWUe",
              token: "KT1XCoGnfupWk7Sp8536EfrxcP73LmT68Nyr",
              tokenId: "6152",
            },
          ],
          out: [],
          type: TYPE.MINT,
        },
      ]);
    });

    test("mooncake mint", async () => {
      const hash = "onoi2yJxc2adhqEQvs2BuMbkwfTn1ytcs69gxNv6VTyuBmSmWju";
      const { ops, address } = await fixtureWithHash(hash);
      expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
        {
          fees: 0.035458,
          in: [
            {
              amount: 1,
              from: "KT1Qm7MHmbdiBzoRs7xqBiqoRxw7T2cxTTJN",
              to: address,
              token: "KT1Qm7MHmbdiBzoRs7xqBiqoRxw7T2cxTTJN",
              tokenId: "23",
            },
          ],
          out: [],
          type: TYPE.RECEIVE_TOKEN,
        },
      ]);
    });
  });

  test("marketplace send (eg swap)", async () => {
    const hash = "ooMxPnx6f7sNE17ax7sb3cz5UUmi5ds5FE2MQys4EpA9RLfiu2G";
    const { ops, address } = await fixtureWithHash(hash);

    expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
      { fees: 0.01675, in: [], out: [], type: TYPE.CONTRACT_CALL },
      {
        fees: 0.061782,
        in: [],
        out: [
          {
            amount: 10,
            to: "KT1HbQepzV1nVGg8QVznG7z4RcHseD5kwqBn",
            from: "tz1N3xSSHguSVLYMCeNG7e3oiDfPnc6FnQip",
            token: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
            tokenId: "190283",
          },
        ],
        type: TYPE.SEND_TOKEN_KT,
      },
    ]);
  });

  test("marketplace receive (eg cancel_swap)", async () => {
    const hash = "opDxX2AKHaYvp4uj5E49byoxMHtPSmzaSPYiK6xkZm1ZGZcC2Uy";
    const { ops, address } = await fixtureWithHash(hash);

    expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
      {
        fees: 0.007467,
        out: [],
        in: [
          {
            amount: 39,
            to: "tz1N3xSSHguSVLYMCeNG7e3oiDfPnc6FnQip",
            from: "KT1HbQepzV1nVGg8QVznG7z4RcHseD5kwqBn",
            token: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
            tokenId: "189019",
          },
        ],
        type: TYPE.RECEIVE_TOKEN,
      },
    ]);
  });

  describe("purchase", () => {
    test("simple transfer", () => {
      const seller = ADDR1;
      const buyer = ADDR2;
      const marketplace = KTADDR2;
      const ops = [
        makeOperation({
          sender: buyer,
          target: marketplace,
          amount: tez(2.15),
          entrypoint: "collect",
          bakerFee: 9023,
        }),
        makeOperation({
          sender: marketplace,
          target: seller,
          initiator: buyer,
          amount: tez(1),
        }),
        makeOperation({
          sender: marketplace,
          target: seller,
          initiator: buyer,
          amount: tez(2),
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: NFT_TARGET,
          entrypoint: "transfer",
          value: [makeTransferValue({ from: marketplace, to: buyer })],
          storageFee: 16750,
        }),
      ];
      expect(selectFields(classifyOperationGroup(buyer, ops))).toStrictEqual([
        {
          fees: 0.025773,
          in: [
            {
              amount: 1,
              token: NFT_TARGET.address,
              tokenId: TOKEN_ID,
              from: marketplace,
              to: buyer,
            },
          ],
          out: [{ amount: 2.15, token: XTZ, to: marketplace, from: buyer }],
          type: TYPE.TRADE,
        },
      ]);
    });

    test("fxhash mint", async () => {
      const { ops, address } = await fixtureWithHash(
        "oneRL8j8ukdZ43hFcjJFKQzBixuoaPJFQE6G4E223dDcokp9T3o"
      );
      expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
        {
          type: TYPE.TRADE,
          fees: 0.099446,
          in: [
            {
              amount: 1,
              tokenId: "153945",
              token: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
              from: "KT1AEVuykWeuuFX7QkEAMNtffzwhe1Z98hJS",
              to: "tz1XDQJPCP53mSgwDZiNphTVKGmDJRsTwWUe",
            },
          ],
          out: [
            {
              amount: 0.5,
              to: "KT1AEVuykWeuuFX7QkEAMNtffzwhe1Z98hJS",
              from: "tz1XDQJPCP53mSgwDZiNphTVKGmDJRsTwWUe",
              token: XTZ,
            },
          ],
        },
      ]);
    });

    test("fxhash mint your own", async () => {
      const hash = "ooNauKEauRgb39rG9cmmYaPmZ1brqJPtDVc1PoowCTP9xufFDoC";
      const { ops, address } = await fixtureWithHash(hash);
      expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
        {
          type: TYPE.TRADE,
          fees: 0.098946,
          in: [
            {
              amount: 1,
              tokenId: "163320",
              token: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
              from: "KT1AEVuykWeuuFX7QkEAMNtffzwhe1Z98hJS",
              to: "tz1XDQJPCP53mSgwDZiNphTVKGmDJRsTwWUe",
            },
          ],
          out: [
            {
              amount: 0.025,
              to: "KT1AEVuykWeuuFX7QkEAMNtffzwhe1Z98hJS",
              from: "tz1XDQJPCP53mSgwDZiNphTVKGmDJRsTwWUe",
              token: XTZ,
            },
          ],
        },
      ]);
    });

    test("randomly common skele mint (receive txn)", async () => {
      const hash = "ooLR8F3uvh6LdzSZDedkAJuThdRZLtvKa4Z7Bv5Tf2c9aFv12FK";
      const { ops, address } = await fixtureWithHash(
        hash,
        (ops) => ops[2].parameter.value.address
      );
      expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
        {
          type: TYPE.AIRDROP,
          fees: 0,
          in: [
            {
              amount: 1,
              tokenId:
                "88391099414403497031313350352877093122676801207717095286373137475484852737775",
              token: "KT1HZVd9Cjc2CMe3sQvXgbxhpJkdena21pih",
              from: "KT1AvxTNETj3U4b3wKYxkX6CKya1EgLZezv8",
              to: "tz1TkBRQWgXVC1CbLMj5GgR7LUtGkptJj93t",
            },
          ],
          out: [],
        },
      ]);
    });

    test("free", () => {
      const buyer = ADDR2;
      const marketplace = KTADDR2;
      const ops = [
        makeOperation({
          sender: buyer,
          target: marketplace,
          amount: tez(0),
          entrypoint: "collect",
          bakerFee: 9023,
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: NFT_TARGET,
          entrypoint: "transfer",
          value: [makeTransferValue({ from: marketplace, to: buyer })],
          storageFee: 16750,
        }),
      ];
      expect(selectFields(classifyOperationGroup(buyer, ops))).toStrictEqual([
        {
          fees: 0.025773,
          in: [
            {
              amount: 1,
              token: NFT_TARGET.address,
              tokenId: TOKEN_ID,
              from: marketplace,
              to: buyer,
            },
          ],
          out: [],
          type: TYPE.RECEIVE_TOKEN,
        },
      ]);
    });
  });

  describe("ledger big map changes", () => {
    test("add_key", async () => {
      const hash = "onizZBkCKGhwmb33NssztNNngYDWC287BXbniDu52cMNWhn7Y4b";
      const { ops, address } = await fixtureWithHash(
        hash,
        (ops) => ops[0].sender.address
      );
      expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
        {
          fees: 0.01675,
          in: [
            {
              amount: 1,
              from: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              to: "tz1VqycbkKHeSXsU1BddNSTPBcRXnfAi45oX",
              token: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              tokenId: "1021",
            },
          ],
          out: [],
          type: TYPE.RECEIVE_TOKEN,
        },
        {
          fees: 0.01675,
          in: [
            {
              amount: 1,
              from: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              to: "tz1VqycbkKHeSXsU1BddNSTPBcRXnfAi45oX",
              token: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              tokenId: "1022",
            },
          ],
          out: [
            {
              amount: 0.125,
              to: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              from: "tz1VqycbkKHeSXsU1BddNSTPBcRXnfAi45oX",
              token: XTZ,
            },
          ],
          type: TYPE.TRADE,
        },
        {
          fees: 0.01675,
          in: [
            {
              amount: 1,
              from: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              to: "tz1VqycbkKHeSXsU1BddNSTPBcRXnfAi45oX",
              token: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              tokenId: "1023",
            },
          ],
          out: [
            {
              amount: 0.125,
              to: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              from: "tz1VqycbkKHeSXsU1BddNSTPBcRXnfAi45oX",
              token: XTZ,
            },
          ],
          type: TYPE.TRADE,
        },
        {
          fees: 0.01675,
          in: [
            {
              amount: 1,
              from: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              to: "tz1VqycbkKHeSXsU1BddNSTPBcRXnfAi45oX",
              token: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              tokenId: "1025",
            },
          ],
          out: [
            {
              amount: 0.125,
              to: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              from: "tz1VqycbkKHeSXsU1BddNSTPBcRXnfAi45oX",
              token: XTZ,
            },
          ],
          type: TYPE.TRADE,
        },
        {
          fees: 0.01675,
          in: [
            {
              amount: 1,
              from: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              to: "tz1VqycbkKHeSXsU1BddNSTPBcRXnfAi45oX",
              token: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              tokenId: "1026",
            },
          ],
          out: [
            {
              amount: 0.125,
              to: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              from: "tz1VqycbkKHeSXsU1BddNSTPBcRXnfAi45oX",
              token: XTZ,
            },
          ],
          type: TYPE.TRADE,
        },
        {
          fees: 0.111171,
          in: [
            {
              amount: 1,
              from: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              to: "tz1VqycbkKHeSXsU1BddNSTPBcRXnfAi45oX",
              token: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              tokenId: "1027",
            },
          ],
          out: [
            {
              amount: 0.125,
              to: "KT1WGDVRnff4rmGzJUbdCRAJBmYt12BrPzdD",
              from: "tz1VqycbkKHeSXsU1BddNSTPBcRXnfAi45oX",
              token: XTZ,
            },
          ],
          type: TYPE.TRADE,
        },
      ]);
    });

    test("batch with other addresses", async () => {
      const hash = "op6GrEn8QY1kfMmRb89NfsAaRfcBGVzmGrMZNR3Z3UFui8Wuygx";

      const { ops, address } = await fixtureWithHash(
        hash,
        (ops) => ops[13].parameter.value.address
      );

      expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
        {
          type: TYPE.AIRDROP,
          fees: 0,
          in: [
            {
              amount: 1,
              from: "KT1A8HThPTeJDnMcpATMSPqsbU46BqEXtK8o",
              to: address,
              token: "KT1A8HThPTeJDnMcpATMSPqsbU46BqEXtK8o",
              tokenId: "294",
            },
            {
              amount: 1,
              from: "KT1A8HThPTeJDnMcpATMSPqsbU46BqEXtK8o",
              to: address,
              token: "KT1A8HThPTeJDnMcpATMSPqsbU46BqEXtK8o",
              tokenId: "293",
            },
          ],
          out: [],
        },
      ]);
    });

    // need non-transfer, non-marketplace examples
    test.todo("update_key");
    test.todo("remove_key");
  });

  describe("sell", () => {
    test("simple", () => {
      const seller = ADDR1;
      const buyer = ADDR2;
      const marketplace = KTADDR2;
      const ops = [
        makeOperation({
          sender: buyer,
          target: marketplace,
          bakerFee: 9023,
          amount: tez(1),
          entrypoint: "collect",
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: seller,
          amount: tez(0.1),
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: seller,
          amount: tez(0.875),
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: NFT_TARGET,
          storageFee: 16750,
          entrypoint: "transfer",
          value: [makeTransferValue({ from: marketplace, to: buyer })],
        }),
      ];
      expect(selectFields(classifyOperationGroup(seller, ops))).toStrictEqual([
        {
          fees: 0,
          in: [{ amount: 0.975, token: XTZ, from: buyer, to: seller }],
          out: [
            {
              amount: 1,
              token: NFT_TARGET.address,
              tokenId: TOKEN_ID,
              to: buyer,
              from: marketplace,
            },
          ],
          type: TYPE.SALE,
        },
      ]);
    });

    test("fxhash", async () => {
      const hash = "ooDjSAFbV4vWAbhyLzUMTnRdvTgjm29RRAdHYx1y7tTqvTyt8Ny";
      const { ops, address } = await fixtureWithHash(
        hash,
        (ops) => ops[2].target.address
      );
      const buyer = "tz1KvV6bWCDeif6bEdh5e5txRufxG3iwRVt4";
      expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
        {
          type: TYPE.SALE,
          fees: 0,
          in: [
            {
              amount: 0.975,
              from: buyer,
              to: "tz1XDQJPCP53mSgwDZiNphTVKGmDJRsTwWUe",
              token: XTZ,
            },
          ],
          out: [
            {
              amount: 1,
              to: buyer,
              from: "KT1AEVuykWeuuFX7QkEAMNtffzwhe1Z98hJS",
              token: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
              tokenId: "154814",
            },
          ],
        },
      ]);
    });

    test("batch collect", () => {
      const seller = ADDR1;
      const buyer = ADDR2;
      const marketplace = KTADDR2;
      const address = seller;
      const ops = [
        makeOperation({
          sender: buyer,
          target: marketplace,
          bakerFee: 9023,
          amount: tez(1),
          entrypoint: "collect",
          hasInternals: true, // important
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: seller,
          amount: tez(0.1),
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: seller,
          amount: tez(0.875),
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: NFT_TARGET,
          storageFee: 16750,
          entrypoint: "transfer",
          value: [makeTransferValue({ from: marketplace, to: buyer })],
        }),
        makeOperation({
          sender: buyer,
          target: marketplace,
          bakerFee: 9023,
          amount: tez(1),
          entrypoint: "collect",
          hasInternals: true, // important
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: seller,
          amount: tez(0.1),
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: seller,
          amount: tez(0.875),
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: NFT_TARGET,
          storageFee: 16750,
          entrypoint: "transfer",
          value: [
            makeTransferValue({
              from: marketplace,
              to: buyer,
              tokenId: "333",
            }),
          ],
        }),
      ];
      expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
        {
          fees: 0,
          in: [{ amount: 0.975, token: XTZ, from: buyer, to: seller }],
          out: [
            {
              amount: 1,
              token: NFT_TARGET.address,
              tokenId: TOKEN_ID,
              to: buyer,
              from: marketplace,
            },
          ],
          type: TYPE.SALE,
        },
        {
          fees: 0,
          in: [{ amount: 0.975, token: XTZ, from: buyer, to: seller }],
          out: [
            {
              amount: 1,
              token: NFT_TARGET.address,
              tokenId: "333",
              to: buyer,
              from: marketplace,
            },
          ],
          type: TYPE.SALE,
        },
      ]);
    });

    test("batch collect with other sales", () => {
      const seller = ADDR1;
      const buyer = ADDR2;
      const otherSeller = ADDR3;
      const marketplace = KTADDR2;
      const ops = [
        // one
        makeOperation({
          sender: buyer,
          target: marketplace,
          bakerFee: 9023,
          amount: tez(1),
          entrypoint: "collect",
          hasInternals: true, // important
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: seller,
          amount: tez(0.1),
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: seller,
          amount: tez(0.875),
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: NFT_TARGET,
          storageFee: 16750,
          entrypoint: "transfer",
          value: [makeTransferValue({ from: marketplace, to: buyer })],
        }),
        // two
        makeOperation({
          sender: buyer,
          target: marketplace,
          bakerFee: 9023,
          amount: tez(1),
          entrypoint: "collect",
          hasInternals: true, // important
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: otherSeller,
          amount: tez(0.1),
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: otherSeller,
          amount: tez(0.875),
        }),
        makeOperation({
          sender: marketplace,
          initiator: buyer,
          target: NFT_TARGET,
          storageFee: 16750,
          entrypoint: "transfer",
          value: [
            makeTransferValue({
              from: marketplace,
              to: buyer,
              tokenId: "333",
            }),
          ],
        }),
      ];
      expect(selectFields(classifyOperationGroup(seller, ops))).toStrictEqual([
        {
          fees: 0,
          in: [{ amount: 0.975, token: XTZ, from: buyer, to: seller }],
          out: [
            {
              amount: 1,
              token: NFT_TARGET.address,
              tokenId: TOKEN_ID,
              to: buyer,
              from: marketplace,
            },
          ],
          type: TYPE.SALE,
        },
      ]);
    });
  });

  describe("sending tokens", () => {
    test("same token to multiple recipients", () => {
      const sender = ADDR2;
      const ops = [
        makeOperation({
          sender,
          target: NFT_TARGET,
          entrypoint: "transfer",
          value: [
            makeTransferValue({ from: sender, to: ADDR1 }),
            makeTransferValue({ from: sender, to: ADDR3 }),
          ],
        }),
      ];
      expect(selectFields(classifyOperationGroup(sender, ops))).toStrictEqual([
        {
          fees: 0,
          in: [],
          out: [
            {
              amount: 1,
              token: NFT_TARGET.address,
              tokenId: TOKEN_ID,
              to: ADDR1,
              from: sender,
            },
            {
              amount: 1,
              token: NFT_TARGET.address,
              tokenId: TOKEN_ID,
              to: ADDR3,
              from: sender,
            },
          ],
          type: TYPE.SEND_TOKEN_TZ,
        },
      ]);
    });

    test("multiple tokens to same recipient", () => {
      const sender = ADDR2;
      const recipient = ADDR1;
      const ops = [
        makeOperation({
          sender,
          target: NFT_TARGET,
          entrypoint: "transfer",
          value: [
            makeTransferValue({ from: sender, to: recipient, tokenId: "1" }),
            makeTransferValue({ from: sender, to: recipient, tokenId: "2" }),
          ],
        }),
      ];
      expect(selectFields(classifyOperationGroup(sender, ops))).toStrictEqual([
        {
          fees: 0,
          in: [],
          out: [
            {
              amount: 1,
              token: NFT_TARGET.address,
              tokenId: "1",
              to: recipient,
              from: sender,
            },
            {
              amount: 1,
              token: NFT_TARGET.address,
              tokenId: "2",
              to: recipient,
              from: sender,
            },
          ],
          type: TYPE.SEND_TOKEN_TZ,
        },
      ]);
    });
  });

  describe("auctions", () => {
    test("objkt.com bid (v1)", async () => {
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

    test.todo("objkt.com bid (v2)"); // const hash = "opHdtAnX1oCKt7bn9ufX7NGUvffAQsoKCqvoitjBUeYdNKGjCcb";

    test("objkt.com conclude_auction (v1)", async () => {
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

    test.todo("objkt.com settle_auction (v2)");

    test.todo("versum bid");

    test.todo("versum withdraw");

    test("objkt.com outbid (v1)", async () => {
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

    test.todo("objkt.com outbid (v2)");
  });

  describe("offers", () => {
    describe("objkt.com marketplace v1", () => {
      test("bid (as bidder)", async () => {
        const hash = "ooFVBeroUstdY7gdjKTpMYcTkZkJPvmi2qxFYzWfSdb6eY39vHR";
        const { ops, address } = await fixtureWithHash(hash);
        expect(
          selectFields(classifyOperationGroup(address, ops))
        ).toStrictEqual([
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

      test("retract_bid (as bidder)", async () => {
        const hash = "oowFBNLRbsRHwMctuQbe1NeGjfEiCUkvcrRiWT24pQUBCUzawe2";
        const { ops, address } = await fixtureWithHash(hash);
        expect(
          selectFields(classifyOperationGroup(address, ops))
        ).toStrictEqual([
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

      test("fulfill_bid (as bidder)", async () => {
        const hash = "ooM7US9DhLjrRybuz6HD5yFc1pUU5M7jqbHb1DGnVMp3hC1Fjk7";
        const { ops, address } = await fixtureWithHash(
          hash,
          (ops) => ops[2].parameter.value[0].txs[0]["to_"]
        );
        expect(
          selectFields(classifyOperationGroup(address, ops))
        ).toStrictEqual([
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

      test.todo("fulfill_bid (as primary sale)");

      test("fulfill_bid (as secondary sale)", async () => {
        const hash = "ooryUiTGP12RPtWMVX52LRTrWX4Vc8EAx8TaqieohgjkVdJZ4Xh";

        const { ops, address } = await fixtureWithHash(
          hash,
          (ops) => ops[4].target.address
        );
        expect(
          selectFields(classifyOperationGroup(address, ops))
        ).toStrictEqual([
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
    });

    describe("objkt.com marketplace v2", () => {
      test.todo("offer");

      test.todo("retract_offer");

      test.todo("fulfill_offer");
    });
  });

  test("receive airdrop (among multiple recipients)", () => {
    const recipient = ADDR1;
    const sender = ADDR2;
    const ops = [
      makeOperation({
        sender,
        target: NFT_TARGET,
        entrypoint: "transfer",
        value: [
          makeTransferValue({ from: sender, to: recipient }),
          makeTransferValue({ from: sender, to: ADDR3 }),
        ],
      }),
    ];
    expect(selectFields(classifyOperationGroup(recipient, ops))).toStrictEqual([
      {
        fees: 0,
        in: [
          {
            amount: 1,
            token: NFT_TARGET.address,
            tokenId: TOKEN_ID,
            from: sender,
            to: recipient,
          },
        ],
        out: [],
        type: TYPE.AIRDROP,
      },
    ]);
  });

  test("burn", () => {
    const recipient = BURNADDR;
    const sender = ADDR2;
    const ops = [
      makeOperation({
        sender,
        target: NFT_TARGET,
        entrypoint: "transfer",
        value: [makeTransferValue({ from: sender, to: recipient })],
      }),
    ];
    expect(selectFields(classifyOperationGroup(sender, ops))).toStrictEqual([
      {
        fees: 0,
        in: [],
        out: [
          {
            amount: 1,
            token: NFT_TARGET.address,
            tokenId: TOKEN_ID,
            from: sender,
            to: recipient,
          },
        ],
        type: TYPE.BURN,
      },
    ]);
  });
});
