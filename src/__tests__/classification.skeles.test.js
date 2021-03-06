import classification from "../classification.js";
import constants from "../constants.js";
import operationsUtils from "./__utils__/operations.js";
import metadataUtils from "./__utils__/metadata.js";

const { fixtureWithHash } = operationsUtils;
const { selectFields } = metadataUtils;

const { classifyOperationGroup } = classification;
const { TYPE, XTZ } = constants;

test("mint skeles", async () => {
  const hash = "onejUgNFiEijs3yQyNJHP5a82M2HUq7kjE6s6qcfsmTebWBrSQP";
  const { ops, address } = await fixtureWithHash(
    hash,
    (ops) => ops[0].sender.address
  );
  expect(selectFields(classifyOperationGroup(address, ops))).toStrictEqual([
    {
      type: TYPE.SEND,
      fees: 0.090732,
      in: [
        {
          amount: 3,
          from: "KT1AvxTNETj3U4b3wKYxkX6CKya1EgLZezv8",
          to: address,
          token: "FUTURE-KT1HZVd9Cjc2CMe3sQvXgbxhpJkdena21pih",
        },
      ],
      out: [
        {
          amount: 15,
          from: address,
          to: "KT1AvxTNETj3U4b3wKYxkX6CKya1EgLZezv8",
          token: XTZ,
        },
      ],
    },
  ]);
});

test("airdrop skele", async () => {
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
