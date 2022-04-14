/** module classifiers/skeles */
import classificationMetadata from "../classification/metadata.js";
import classificationTransfers from "../classification/transfers.js";
import classificationState from "../classification/state.js";

const MINT_QUEUE = "KT1AvxTNETj3U4b3wKYxkX6CKya1EgLZezv8";
const FA2 = "KT1HZVd9Cjc2CMe3sQvXgbxhpJkdena21pih";

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
};

export default {
  register,
};
