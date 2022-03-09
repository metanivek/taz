module.exports = {
  settings: {
    jest: {
      version: require("jest/package.json").version,
    },
  },
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    "jest/globals": true,
  },
  plugins: ["jest"],
  extends: ["eslint:recommended", "plugin:jest/recommended"],
  parserOptions: {
    ecmaVersion: "latest",
  },
  sourceType: "module",
  rules: {},
};
