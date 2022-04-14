/** @module classifiers/registry */
import fxhash from "./fxhash.js";
import objkt from "./objkt.js";
import skeles from "./skeles.js";

const classifiers = {};

const register = (targetAddr, callback) => {
  classifiers[targetAddr] = callback;
};

const classify = (targetAddr, metadata, state, op, address) => {
  const classifier = classifiers[targetAddr];
  if (classifier) {
    return classifier(metadata, state, op, address);
  }
  return false;
};

const registry = { register };
fxhash.register(registry);
objkt.register(registry);
skeles.register(registry);

export default {
  classify,
};
