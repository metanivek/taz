import jsonIO from "../../json/io.js";
import path from "path";

const fixtureWithHash = async (
  opHash,
  address = (ops) => ops[0].sender.address
) => {
  const filename = path.resolve(
    path.join("src", "__tests__", "__operations__", `${opHash}.json`)
  );
  const ops = await jsonIO.read(filename);
  return { ops, address: address(ops) };
};

export default {
  fixtureWithHash,
};
