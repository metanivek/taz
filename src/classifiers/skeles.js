/** module classifiers/skeles */
import classificationAmounts from "../classification/amounts.js";
import classificationMetadata from "../classification/metadata.js";
import classificationTransfers from "../classification/transfers.js";
import classificationState from "../classification/state.js";
import constants from "../constants.js";

const MINT_QUEUE = "KT1AvxTNETj3U4b3wKYxkX6CKya1EgLZezv8";
const FA2 = "KT1HZVd9Cjc2CMe3sQvXgbxhpJkdena21pih";

const classifyMintQueue = (metadata, state, op, address) => {
  const { parameter, sender } = op;
  const { entrypoint, value } = parameter;

  if (entrypoint === "buy" && sender.address === address) {
    const amounts = classificationAmounts.create();
    classificationAmounts.addIncoming(
      amounts,
      parseFloat(value),
      undefined,
      `FUTURE-${FA2}`,
      MINT_QUEUE,
      address
    );
    classificationMetadata.addAmounts(metadata, amounts);

    metadata.type = constants.TYPE.SEND;
  }

  return false;
};

const classifyFA2 = (metadata, state, op, address) => {
  const { parameter, sender } = op;
  const { entrypoint, value } = parameter;
  const to = value.address;
  const isToAddress = to === address;

  if (entrypoint === "mint" && isToAddress) {
    classificationState.setTransfer(state, true);

    const amount = parseInt(value.amount ?? 1);
    const tokenId = value.token_id;
    const from = sender.address;
    const amounts = classificationTransfers.createAmountsSingle(
      FA2,
      tokenId,
      amount,
      address,
      sender.address,
      from,
      to
    );
    classificationMetadata.addAmounts(metadata, amounts);

    return true;
  }

  return false;
};

const register = (registry) => {
  registry.register(FA2, classifyFA2);
  registry.register(MINT_QUEUE, classifyMintQueue);
};

export default {
  register,
};
