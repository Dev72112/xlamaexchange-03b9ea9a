export interface Currency {
  ticker: string;
  name: string;
  image: string;
  network?: string;
}

// Using ChangeNow's exact ticker format
export const popularCurrencies: Currency[] = [
  { ticker: "btc", name: "Bitcoin", image: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg" },
  { ticker: "eth", name: "Ethereum", image: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg" },
  { ticker: "usdterc20", name: "Tether (ERC20)", image: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", network: "ERC20" },
  { ticker: "usdttrc20", name: "Tether (TRC20)", image: "https://content-api.changenow.io/uploads/usdttrc20_87164a7b35.svg", network: "TRC20" },
  { ticker: "bnbmainnet", name: "BNB", image: "https://content-api.changenow.io/uploads/bnbmainnet_331e969fdb.svg" },
  { ticker: "sol", name: "Solana", image: "https://content-api.changenow.io/uploads/sol_7b41869333.svg" },
  { ticker: "xrp", name: "Ripple", image: "https://content-api.changenow.io/uploads/xrp_b21ec8c7d6.svg" },
  { ticker: "ada", name: "Cardano", image: "https://content-api.changenow.io/uploads/ada_a0faf55f29.svg" },
  { ticker: "doge", name: "Dogecoin", image: "https://content-api.changenow.io/uploads/doge_eeee631e93.svg" },
  { ticker: "trx", name: "Tron", image: "https://content-api.changenow.io/uploads/trx_4e4b449f07.svg" },
  { ticker: "ltc", name: "Litecoin", image: "https://content-api.changenow.io/uploads/ltc_fd54809c8a.svg" },
  { ticker: "matic", name: "Polygon", image: "https://content-api.changenow.io/uploads/matic_e08491ce80.svg" },
  { ticker: "dot", name: "Polkadot", image: "https://content-api.changenow.io/uploads/dot_ab59cff2e4.svg" },
  { ticker: "avaxc", name: "Avalanche C-Chain", image: "https://content-api.changenow.io/uploads/avaxc_de788a4d4f.svg" },
  { ticker: "link", name: "Chainlink", image: "https://content-api.changenow.io/uploads/link_a42aaa8ae8.svg" },
  { ticker: "atom", name: "Cosmos", image: "https://content-api.changenow.io/uploads/atom_f4004a6a73.svg" },
  { ticker: "xlm", name: "Stellar", image: "https://content-api.changenow.io/uploads/xlm_b7c4e5c8db.svg" },
  { ticker: "xmr", name: "Monero", image: "https://content-api.changenow.io/uploads/xmr_6d88e3e9e8.svg" },
  { ticker: "etc", name: "Ethereum Classic", image: "https://content-api.changenow.io/uploads/etc_9df89b7f5f.svg" },
  { ticker: "bch", name: "Bitcoin Cash", image: "https://content-api.changenow.io/uploads/bch_782a9d1837.svg" },
  { ticker: "usdcerc20", name: "USD Coin (ERC20)", image: "https://content-api.changenow.io/uploads/usdcerc20_9cc36c5e0f.svg", network: "ERC20" },
];

export const getCurrencyByTicker = (ticker: string): Currency | undefined => {
  return popularCurrencies.find(c => c.ticker.toLowerCase() === ticker.toLowerCase());
};
