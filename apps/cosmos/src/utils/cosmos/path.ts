export const getHDPath = (
  coinType = '118',
  index = '0',
  account = '0',
  chain = '0',
) => `m/44'/${coinType}'/${account}'/${chain}/${index}`
