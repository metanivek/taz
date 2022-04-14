/** @module classifiers/fxhash */
import classificationMetadata from "../classification/metadata.js";
import classificationTransfers from "../classification/transfers.js";
import classificationState from "../classification/state.js";

const FA2_V1 = "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE";
// TODO: V2

const classifyFA2V1 = (metadata, state, op, address) => {
  const { parameter, sender } = op;
  const { entrypoint, value } = parameter;
  const to = value.address;

  if (entrypoint === "mint") {
    classificationState.setTransfer(state, true);

    const amount = parseInt(value.amount ?? 1);
    const tokenId = value.token_id;
    const from = sender.address;
    const amounts = classificationTransfers.createAmountsSingle(
      FA2_V1,
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
  registry.register(FA2_V1, classifyFA2V1);
};

export default {
  register,
};
