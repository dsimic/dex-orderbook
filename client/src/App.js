import React, { useState, useEffect } from "react";
import Footer from './components/Footer.js';
import Header from "./components/Header.js";
import Wallet from "./Wallet.js";
import NewOrder from "./components/NewOrder.js";
import AllOrders from "./components/AllOrders.js";
import MyOrders from "./components/MyOrders.js";
import AllTrades from "./components/AllTrades.js";
import GetFakeDai from "./components/GetFakeDai";

const SIDE = {
  BUY: 0,
  SELL: 1,
};

function App({ web3, accounts, contracts, initBlock }) {
  const [tokens, setTokens] = useState([]);
  const [user, setUser] = useState({
    accounts: [],
    balances: {
      tokenDex: 0,
      tokenWallet: 0,
    },
    selectedToken: undefined
  });
  const [orders, setOrders] = useState({
    buy: [],
    sell: []
  });
  const [trades, setTrades] = useState([]);
  const [listener, setListener] = useState(undefined);


  const getBalances = async (account, token) => {
    const tokenDex = await contracts.dex.methods.traderBalances(
      account, web3.utils.fromAscii(token.ticker)).call();
    const tokenWallet = await contracts[token.ticker].methods.balanceOf(account).call();
    return { tokenDex, tokenWallet };
  };

  const getOrders = async token => {
    const orders = await Promise.all([
      contracts.dex.methods.getOrders(web3.utils.fromAscii(token.ticker), SIDE.BUY).call(),
      contracts.dex.methods.getOrders(web3.utils.fromAscii(token.ticker), SIDE.SELL).call()
    ]);
    return { buy: orders[0], sell: orders[1] }
  };

  const listenToTrades = token => {
    const tradeIds = new Set();
    const fromBlock = Math.max(0, initBlock - 100);
    // const fromBlock = Math.max(0, initBlock);
    console.log("listening to trades fromBlock: ", fromBlock, " for token: ", token.ticker);
    setTrades([]);
    const listener = contracts.dex.events.NewTrade({
      filter: { ticker: web3.utils.fromAscii(token.ticker) },
      fromBlock: web3.utils.toHex(fromBlock),
      // fromBlock: 'earliest',
    }).on('data', newTrade => {
      console.log("Got newTrade:", newTrade);
      if (tradeIds.has(newTrade.returnValues.tradeId)) return;
      tradeIds.add(newTrade.returnValues.tradeId);
      setTrades(trades => ([...trades, newTrade.returnValues]));
    });
    setListener(listener);
  };

  const selectToken = async token => {
    console.log("Setting token to: ", token.ticker)
    const balances = await getBalances(accounts[0], token)
    setUser({ ...user, balances: balances, selectedToken: token });
  };

  const deposit = async amount => {
    await contracts[user.selectedToken.ticker].methods.approve(contracts.dex.options.address, amount).send({
      from: user.accounts[0],
    });
    await contracts.dex.methods.deposit(
      amount,
      web3.utils.fromAscii(user.selectedToken.ticker)
    ).send({ from: user.accounts[0] });
    const balances = await getBalances(
      user.accounts[0],
      user.selectedToken
    );
    setUser(user => ({ ...user, balances }));
  };

  const withdraw = async amount => {

    await contracts.dex.methods.withdraw(
      amount,
      web3.utils.fromAscii(user.selectedToken.ticker)
    ).send({ from: user.accounts[0] });
    const balances = await getBalances(
      user.accounts[0],
      user.selectedToken
    );
    setUser(user => ({ ...user, balances }));
  };

  const createMarketOrder = async (amount, side) => {
    console.log(`Creating market order: amount=${amount}, side=${side}`);
    await contracts.dex.methods.createMarketOrder(web3.utils.fromAscii(
      user.selectedToken.ticker),
      amount,
      side
    ).send({ from: user.accounts[0] });
    console.log(`Market order successfully submitted.`);
    const orders = await getOrders(user.selectedToken);
    setOrders(orders);
  };
  const createLimitOrder = async (amount, price, side) => {
    console.log("Creating limit order.")
    await contracts.dex.methods.createLimitOrder(web3.utils.fromAscii(
      user.selectedToken.ticker),
      amount,
      price,
      side
    ).send({ from: user.accounts[0] });
    console.log("Limit order successfully submitted");
    const orders = await getOrders(user.selectedToken);
    setOrders(orders);
  };

  useEffect(() => {
    const init = async () => {
      const rawTokens = await contracts.dex.methods.getTokens().call();
      const tokens = rawTokens.map(token => ({
        ...token,
        ticker: web3.utils.hexToUtf8(token.ticker)
      }));
      const [balances, orders] = await Promise.all([
        getBalances(accounts[0], tokens[0]),
        getOrders(tokens[0])
      ]);
      listenToTrades(tokens[0]);
      setTokens(tokens)
      setUser({ accounts, balances, selectedToken: tokens[0] })
      setOrders(orders);
    };
    init();
  }, []);

  useEffect(() => {
    const init = async () => {
      const [balances, orders] = await Promise.all([
        getBalances(accounts[0], user.selectedToken),
        getOrders(user.selectedToken)
      ]);
      listenToTrades(user.selectedToken);
      setUser(user => ({ ...user, balances }));
      setOrders(orders)
    };
    if (typeof user.selectedToken !== 'undefined') {
      init()
    };
  }, [user.selectedToken], () => {
    listener.unsubscribe();
  })

  if (typeof user.selectedToken === 'undefined') {
    return <div>Loading ...</div>
  }

  return (
    <div id="app">
      <Header
        contracts={contracts}
        tokens={tokens}
        user={user}
        selectToken={selectToken}
      ></Header>
      <main className='container-fluid'>
        <div className="row">
          <div className="col-sm-4 first-col">
            <Wallet
              user={user}
              deposit={deposit}
              withdraw={withdraw}
            ></Wallet>
            {user.selectedToken.ticker !== 'DAI' ? (
              <NewOrder createMarketOrder={createMarketOrder} createLimitOrder={createLimitOrder}></NewOrder>
            ) : null}
          </div>
          <div className="col-sm-8">
            {user.selectedToken.ticker !== 'DAI' ? (
              <div>
                <AllTrades trades={trades}></AllTrades>
                <AllOrders orders={orders}></AllOrders>
                <MyOrders orders={{
                  buy: orders.buy.filter(order => order.trader.toLowerCase() === user.accounts[0].toLowerCase()),
                  sell: orders.sell.filter(order => order.trader.toLowerCase() === user.accounts[0].toLowerCase())
                }}>
                </MyOrders>
              </div>
            ) : <GetFakeDai web3={web3} dai={contracts.DAI} user={user}></GetFakeDai>}
          </div>
        </div>
      </main >
      <Footer />
    </div >
  );
}

export default App;
