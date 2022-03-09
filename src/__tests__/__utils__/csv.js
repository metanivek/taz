import constants from "../../constants.js";

const { CSV_HEADERS } = constants;
const H = CSV_HEADERS;
const TIMESTAMP = "time";

const createRow = ({
  type,
  fiat,
  in_amt,
  in_token,
  in_token_from,
  in_token_id,
  out_amt,
  out_token,
  out_token_to,
  out_token_id,
  fees,
  no_level,
  level,
  account,
  timestamp,
  op,
}) => {
  return {
    [H.TIMESTAMP]: timestamp ?? TIMESTAMP,
    [H.FIAT]: fiat,
    [H.TYPE]: type,
    [H.IN_AMT]: in_amt,
    [H.IN_TOKEN]: in_token,
    [H.IN_TOKEN_ID]: in_token_id,
    [H.IN_TOKEN_FROM]: in_token_from,
    [H.OUT_AMT]: out_amt,
    [H.OUT_TOKEN]: out_token,
    [H.OUT_TOKEN_ID]: out_token_id,
    [H.OUT_TOKEN_TO]: out_token_to,
    [H.FEES]: fees,
    [H.ACCOUNT]: account,
    [H.LEVEL]: no_level ? undefined : level ?? 2,
    [H.OP]: op ?? "hash",
  };
};

const changeRowType = (row, newType) => {
  return {
    ...row,
    [H.TYPE]: newType,
  };
};

export default {
  createRow,
  changeRowType,
};
