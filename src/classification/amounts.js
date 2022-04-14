/** @module classificaton/amounts */

const createAmount = (amount, tokenId, token, from, to) => {
  const a = {
    amount,
    token,
    from,
    to,
  };
  if (tokenId) a.tokenId = tokenId;
  return a;
};

const create = () => {
  return {
    incoming: [],
    outgoing: [],
  };
};

const addIncoming = (container, amount, tokenId, token, from, to) => {
  container.incoming.push(createAmount(amount, tokenId, token, from, to));
};

const addOutgoing = (container, amount, tokenId, token, from, to) => {
  container.outgoing.push(createAmount(amount, tokenId, token, from, to));
};

const addAll = (destContainer, srcContainer) => {
  destContainer.incoming.push(...srcContainer.incoming);
  destContainer.outgoing.push(...srcContainer.outgoing);
};

export default {
  create,
  addIncoming,
  addOutgoing,
  addAll,
};
