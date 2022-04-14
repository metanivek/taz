/** @module classifiers/objkt */
import classificationMetadata from "../classification/metadata.js";
import classificationTransfers from "../classification/transfers.js";
import constants from "../constants.js";

const { TYPE } = constants;

const ENGLISH_AUCTION_V1 = "KT1XjcRq5MLAzMKQ3UHsrue2SeU2NbxUrzmU";
const MARKETPLACE_V1 = "KT1FvqJwEDWb1Gwc55Jd1jjTHRVWbYKUUpyq";

// TODO
const ENGLISH_AUCTION_V2 = "KT18p94vjkkHYY3nPmernmgVR7HdZFzE7NAk";
const MARKETPLACE_V2 = "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC";

const classifyEnglishAuctionV1 = (metadata, state, op, address) => {
  const { parameter, sender } = op;
  const { entrypoint, value } = parameter;

  const token = ENGLISH_AUCTION_V1;

  if (entrypoint === "bid" && sender.address === address) {
    metadata.type = TYPE.AUCTION_BID;
    const tokenId = value;
    const amount = 1;
    const from = token;
    const to = address;
    const amounts = classificationTransfers.createAmountsSingle(
      token,
      tokenId,
      amount,
      address,
      sender.address,
      from,
      to
    );
    classificationMetadata.addAmounts(metadata, amounts, true);

    return true;
  } else if (entrypoint === "conclude_auction") {
    metadata.type = TYPE.AUCTION_SETTLE;
    const tokenId = value;
    const amount = 1;
    const from = address;
    const to = token;
    const amounts = classificationTransfers.createAmountsSingle(
      token,
      tokenId,
      amount,
      address,
      sender.address,
      from,
      to
    );
    classificationMetadata.addAmounts(metadata, amounts, true);

    return true;
  }

  return false;
};

const classifyMarketplaceV1 = (metadata, state, op, address) => {
  const { parameter, sender } = op;
  const { entrypoint, value } = parameter;

  const token = MARKETPLACE_V1;

  if (entrypoint === "bid") {
    metadata.type = TYPE.OFFER;
    const tokenId = op.diffs[0].content.key;
    const amount = 1;
    const from = token;
    const to = address;
    const amounts = classificationTransfers.createAmountsSingle(
      token,
      tokenId,
      amount,
      address,
      sender.address,
      from,
      to
    );
    classificationMetadata.addAmounts(metadata, amounts, true);
  } else if (entrypoint === "retract_bid" || entrypoint === "fulfill_bid") {
    if (entrypoint === "retract_bid") {
      metadata.type = TYPE.OFFER_RETRACT;
    } else {
      metadata.type = TYPE.OFFER_FULFILL;
    }
    const tokenId = value;
    const amount = 1;
    const from = address;
    const to = token;
    const amounts = classificationTransfers.createAmountsSingle(
      token,
      tokenId,
      amount,
      address,
      sender.address,
      from,
      to
    );
    classificationMetadata.addAmounts(metadata, amounts, true);
  }
};

const register = (registry) => {
  registry.register(ENGLISH_AUCTION_V1, classifyEnglishAuctionV1);
  registry.register(MARKETPLACE_V1, classifyMarketplaceV1);
};

export default {
  register,
};
