import classification from "../classification.js";
import constants from "../constants.js";
import operationsUtils from "./__utils__/operations.js";
import metadataUtils from "./__utils__/metadata.js";

const { fixtureWithHash } = operationsUtils;
const { selectFields } = metadataUtils;

const { classifyOperationGroup } = classification;
const { TYPE, XTZ } = constants;

test("issuer mint v1", async () => {
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

test("issuer mint v2", async () => {
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

test("mint a gentk", async () => {
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

test("mint your own gentk", async () => {
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

test("sell an edition", async () => {
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
