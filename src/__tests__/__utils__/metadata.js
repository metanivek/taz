const selectFields = (result, fields = ["fees", "in", "out", "type"]) => {
  return result.map((r) => {
    const m = r.metadata;
    for (const key of Object.keys(m)) {
      if (fields.includes(key) === false) {
        delete m[key];
      }
    }
    return m;
  });
};

export default {
  selectFields,
};
