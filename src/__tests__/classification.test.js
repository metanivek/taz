import classification from "../classification.js";
import constants from "../constants.js";
import operationsUtils from "./__utils__/operations.js";
import metadataUtils from "./__utils__/metadata.js";

const { fixtureWithHash } = operationsUtils;
const { selectFields } = metadataUtils;

const { classifyOperationGroup } = classification;
const { TYPE, XTZ } = constants;

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
    test.todo("versum bid");

    test.todo("versum withdraw");
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
