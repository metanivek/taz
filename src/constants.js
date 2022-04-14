/** @module constants */
import utils from "./utils.js";

const XTZ = "XTZ";
const BURN_ADDR = "tz1burnburnburnburnburnburnburjAYjjX";

// contracts that use `mint` for buying
const FXHASH_GENTK = "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE"; // TODO: update when v2 launches
const COMMON_SKELES = "KT1HZVd9Cjc2CMe3sQvXgbxhpJkdena21pih";

// manually track combination of entrypoint and contracts
// that are for minting *your own* nfts
// note: this is different than minting when buying *another* nft
const MINT_ENTRYPOINTS = ["mint", "mint_OBJKT", "mint_artist", "mint_issuer"];
const MINT_CONTRACTS = [
  "KT1Hkg5qeNhfwpKW4fXvq7HGZB9z2EnmCCA9", // hen/teia minter
  "KT1Aq4wWmVanpQhq4TTfjZXB5AjFpx15iQMM", // objkt.com minter
  "KT1AEVuykWeuuFX7QkEAMNtffzwhe1Z98hJS", // fx(hash) issuer v1
  "KT1XCoGnfupWk7Sp8536EfrxcP73LmT68Nyr", // fx(hash) issuer v2
  "KT1LjmAdYQCLBjwv4S2oFkEzyHVkomAf5MrW", // versum items
  "KT1TKFWDiMk35c5n94TMmLaYksdXkHuaL112", // tz1and
  "KT18pVpRXKPY2c4U2yFEGSH3ZnhB2kL8kwXS", // rarible shared collection
  "KT1EpGgjQs73QfFJs9z7m1Mxm5MTnpC2tqse", // kalamint
  "KT1AFq5XorPduoYyWxs5gEyrFK6fVjJVbtCj", // akaSwap
];

const TYPE = utils.strictAccessProxy({
  UNKNOWN: "unknown",
  RECEIVE: "receive", // XTZ in, nothing out
  SEND: "send", // XTZ out, nothing in
  BUY: "buy", // XTZ out, token in
  TRADE: "trade", // token out, token in
  TRADE_CEX: "trade:cex", // token in, token out; no level
  AIRDROP: "airdrop", // token in, nothing out (not initiated your account)
  MINT: "mint", // token in (that one of your addresses created)
  RECEIVE_TOKEN: "receive:token", // nothing out, token in
  SEND_TOKEN_KT: "send:token:kt", // nothing in, token out (to contract)
  SEND_TOKEN_TZ: "send:token:tz", // nothing in, token out (to account)
  BURN: "send:token:burn", // nothing in, token to canoncial burn address
  SALE: "sale", // XTZ in, token out
  SALE_RESALE: "sale:resale", // XTZ in, token out (for token you bought)
  TRANSFER: "transfer", // XTZ in | XTZ out; your account
  TRANSFER_TOKEN: "transfer:token", // token in, nothing out | nothing in, token out; your account
  // delegation
  DELEGATION: "delegation",
  // offers
  OFFER: "offer",
  OFFER_RETRACT: "offer:retract",
  OFFER_FULFILL: "offer:fulfill",
  // auctions
  AUCTION_BID: "auction:bid", // token/XTZ out, pseudo bid token id in
  AUCTION_OUTBID: "auction:outbid", // token/XTZ in due to lost bid
  AUCTION_SETTLE: "auction:settle", // token in, pseudo bid token id out
  // contract interaction types
  CONTRACT_CALL: "contract-call",
  ORIGINATION: "origination",
  // cex types
  TRADE_FIAT_OUT: "trade:fiat-out", // token in, fiat out
  TRADE_FIAT_IN: "trade:fiat-in", // fiat in, token out
  INTEREST: "interest", // XTZ in, a reward
  // useful to flag an item for removal in the classification process
  REMOVE: "remove",
});

// tzkt currencies supported for quotes
const CURRENCIES = ["Btc", "Eur", "Usd", "Cny", "Jpy", "Krw", "Eth", "Gbp"];

const CSV_HEADERS = utils.strictAccessProxy({
  TIMESTAMP: "timestamp",
  TYPE: "type",
  FIAT: "fiat",
  IN_AMT: "in_amt",
  IN_TOKEN: "in_token",
  IN_TOKEN_ID: "in_token_id",
  IN_TOKEN_FROM: "in_token_from",
  OUT_AMT: "out_amt",
  OUT_TOKEN: "out_token",
  OUT_TOKEN_ID: "out_token_id",
  OUT_TOKEN_TO: "out_token_to",
  FEES: "fees",
  ACCOUNT: "account",
  LEVEL: "level",
  OP: "op",
});

// TODO: extract other string constants

export default {
  XTZ,
  BURN_ADDR,
  FXHASH_GENTK,
  COMMON_SKELES,
  TYPE,
  MINT_ENTRYPOINTS,
  MINT_CONTRACTS,
  CSV_HEADERS,
  CURRENCIES,
};
