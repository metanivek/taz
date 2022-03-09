/** @module tzkt/http */
import axios from "axios";

const get = async (url, params = {}) => {
  const { data } = await axios.get(
    url + "?" + new URLSearchParams(params).toString()
  );
  return data;
};

export default { get };
