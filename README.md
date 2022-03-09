[![tests](https://github.com/metanivek/taz/actions/workflows/test.yml/badge.svg)](https://github.com/metanivek/taz/actions/workflows/test.yml)

# Taz

Taz is a tool for analyzing and reporting on your Tezos transactions.

Taz does three things to help analyze your Tezos transactions.

1. **Collect**: It downloads transactions and other data needed for processing.
1. **Classify**: It analyzes and classifies your transactions within and across
   accounts.
1. **Collate**: It gathers, sorts, and further classifies all transactions.

From these three things, Taz is also able to help automate creating CSV reports
like income statements and gains and losses reports.

## Caveat Utilitor

**Disclaimer**: Taz is not a replacement for professional financial or tax
advice. Code and documentation are provided for informational purposes; use at
your own risk.

## Status

Taz is a work in progress. I created this based on my own usage, but Tezos is a
big place, with lots of different interaction patterns. If something doesn't
look right (or you get errors when running it), feel free to open an issue or
suggest code changes via PR. It is my goal to support as much of the Tezos
blockchain as I can.

Current areas of known limitation:

1. DeFi. Taz most likely does not properly classify/analyze these types of
   transactions. This is my highest priority area to improve.
1. NFT platforms I haven't used. Some _should_ work but I haven't directly tested all.
1. Custom constracts. I have some ideas for a plugin architecture to support
   these, but as of now, it is all just vague hand waving motions in my mind.
1. Unknown unknowns. :alien:

---

# Using Taz

## Technical Setup

1. Make sure you have Node.js installed (tested on v16.14.0). [Installation Instructions](https://nodejs.dev/learn/how-to-install-nodejs)
1. Clone/download repository. [GitHub Help](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
1. Install node dependencies by opening a terminal application, navigating to
   the directory where you cloned the repository, and running `npm install`.

## Configuration

To configure Taz for your data:

1. Copy the `.env.sample` file to a file named `.env`. This is where Taz reads
   configuration information.
1. Set the variables in `.env`

Once you have done this, you _can_ run Taz to see its output, but the analysis
will be wrong unless you create your exchange CSV files.

### Currency Support

Taz currently supports the currencies that TzKT does.

- Btc
- Cny
- Eth
- Eur
- Gbp
- Jpy
- Krw
- Usd

## Centralized Exchange Data

Taz does not automatically download centralized exchange data (yet), so you will
have to create this manually for accurate analysis.

You can find an sample CSV in the examples folder that contains each type of
transaction currently supported. For accurate analysis, you must include all
transactions that involve XTZ. For instance if you receive BTC and then trade it
for XTZ, you must include the transaction where you receive BTC. You can include
transactions for other cryptocurrencies but Taz will ignore them.

The easiest way to create this CSV is to [copy the sample
CSV](./sample/exchange-transactions.csv) and replace the example transactions
with your own. Once you have finished your CSV put it in the appropriate year's
user folder (creating if needed).

Example folder structure:

- data
  - 2021
    - user
      - exchange-transactions.csv

### Headers

These headers must be in your CSV.

- `timestamp`: ISO 8601 timestamp of transaction
- `type`: type of transaction
- `fiat`: price in fiat per coin. This **must** be present for `receive`,
  `trade`, `interest`, `trade:fiat-in`, and `trade:fiat-out` types.
- `in_amt`: amount for incoming transcation
- `in_token`: token symbol for incoming transaction (eg, XTZ)
- `in_token_id`: token id for incoming transaction (not used currently)
- `in_token_from`: source of incoming transaction (use your address when
  transferring to a centralized exchange)
- `out_amt`: amount for outgoing transaction
- `out_token`: token symbol for outgoing transaction (eg, XTZ)
- `out_token_id`: token id for outgoing transaction (not used currently)
- `out_token_to`: destination of outgoing transaction (use your own address when
  transferring to yourself)
- `fees`: fee for transaction. Include for outgoing `transfer` types.
- `account`: account for transaction. You can use the name of your exchange if
  you like.
- `op`: operation hash for transaction. You **must** include this for `transfer`
  types. Most exchanges will give you this information, but you might need to
  find it on a blockchain explorer like [TzKT](https://tzkt.io/) if not.

### Types

Taz supports the following transaction types in the exchange CSV.

- `transfer`: for sending or receiving tez to or from one of your addresses.
  `fiat` is not needed.
- `receive`: for receiving _any_ cryptocurrency from an address that is not
  yours. `fiat` is price per coin of incoming token.
- `trade`: trading cryptocurrency for cryptocurrency. `fiat` is price per coin of
  outgoing token.
- `trade:fiat-out`: trading fiat for cryptocurrency. `fiat` is price per coin of
  incoming token.
- `trade:fiat-in`: trading cryptocurrency for fiat. `fiat` is price per coin of
  outgoing token.
- `interest`: cryptocurrency received from exchange for holding (usually this is
  a staking reward of some kind). `fiat` is price per coin of incoming token.

### Operation Hashes

For incoming and outgoing `transfer` types, make sure to include the operation
hash in the `op` column so that Taz can match it correctly with the
corresponding blockchain transaction.

### Fiat

Taz uses the `fiat` column to calculate cost basis and income. Here is how to
set it, based on `type`:

- `receive`: price per coin for `in_token`
- `interest`: price per coin for `in_token`
- `trade`: price per coin for `out_token`
- `trade:fiat-out`: price per coin of `in_token`
- `trade:fiat-in`: price per coin of `out_token`
- `transfer`: not needed

## Running Taz

Now that you have configured Taz and created your exchange CSV, you are now ready
to download your blockchain data and look at how Taz analyzes it! :tada:

Simple run `node index.js` in Taz's directory. Depending on how many
transactions you have it can take some time to download, but once Taz finishes,
you should see data in your year folders (under `data`).

If you run into problems, feel free to let me know by opening an issue.

# Reports

Currently, Taz creates the following reports (found in the `reports` folder for
a given year, eg `data/2021/reports/`):

- `gains-FIFO.csv`: a FIFO report of gains and losses
- `gains-HIFO.csv`: a HIFO report of gains and losses
- `income.csv`: an income statement
- `all-classified-transactions.csv`: a collated report of how Taz classified all
  of your transactions
- individual classification reports for each address you configure

# Contributing

The most helpful way to contribute at the moment is to setup Taz, run it, and
let me know if you experience errors or data that looks/is wrong. I also welcome
code contributions, if you're willing to jump into a young code base. All code
is [MIT licensed](LICENSE).
