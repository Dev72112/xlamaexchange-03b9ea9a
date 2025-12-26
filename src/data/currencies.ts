export interface Currency {
  ticker: string;
  name: string;
  image: string;
  network?: string;
}

export const popularCurrencies: Currency[] = [
  { ticker: "btc", name: "Bitcoin", image: "https://changenow.io/images/coins/btc.svg" },
  { ticker: "eth", name: "Ethereum", image: "https://changenow.io/images/coins/eth.svg" },
  { ticker: "usdt", name: "Tether", image: "https://changenow.io/images/coins/usdt.svg", network: "ERC20" },
  { ticker: "bnb", name: "BNB", image: "https://changenow.io/images/coins/bnb.svg" },
  { ticker: "sol", name: "Solana", image: "https://changenow.io/images/coins/sol.svg" },
  { ticker: "xrp", name: "Ripple", image: "https://changenow.io/images/coins/xrp.svg" },
  { ticker: "ada", name: "Cardano", image: "https://changenow.io/images/coins/ada.svg" },
  { ticker: "doge", name: "Dogecoin", image: "https://changenow.io/images/coins/doge.svg" },
  { ticker: "trx", name: "Tron", image: "https://changenow.io/images/coins/trx.svg" },
  { ticker: "ltc", name: "Litecoin", image: "https://changenow.io/images/coins/ltc.svg" },
  { ticker: "matic", name: "Polygon", image: "https://changenow.io/images/coins/matic.svg" },
  { ticker: "dot", name: "Polkadot", image: "https://changenow.io/images/coins/dot.svg" },
  { ticker: "avax", name: "Avalanche", image: "https://changenow.io/images/coins/avax.svg" },
  { ticker: "link", name: "Chainlink", image: "https://changenow.io/images/coins/link.svg" },
  { ticker: "atom", name: "Cosmos", image: "https://changenow.io/images/coins/atom.svg" },
  { ticker: "xlm", name: "Stellar", image: "https://changenow.io/images/coins/xlm.svg" },
  { ticker: "xmr", name: "Monero", image: "https://changenow.io/images/coins/xmr.svg" },
  { ticker: "etc", name: "Ethereum Classic", image: "https://changenow.io/images/coins/etc.svg" },
  { ticker: "bch", name: "Bitcoin Cash", image: "https://changenow.io/images/coins/bch.svg" },
  { ticker: "usdc", name: "USD Coin", image: "https://changenow.io/images/coins/usdc.svg", network: "ERC20" },
];

export const getCurrencyByTicker = (ticker: string): Currency | undefined => {
  return popularCurrencies.find(c => c.ticker.toLowerCase() === ticker.toLowerCase());
};
