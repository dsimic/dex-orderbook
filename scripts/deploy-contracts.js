const { ethers, network: hre_network } = require('hardhat');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))


const SIDE = {
  BUY: 0,
  SELL: 1
};
const [DAI, BAT, REP, ZRX] = ['DAI', 'BAT', 'REP', 'ZRX'].map(el => ethers.utils.formatBytes32String(el));

async function main() {
  const [account, trader1, trader2, trader3] = await ethers.getSigners();
  console.log("Running on network: ", hre_network.name);
  const Dex = await ethers.getContractFactory("Dex");
  const Dai = await ethers.getContractFactory('Dai');
  const Bat = await ethers.getContractFactory('Bat');
  const Rep = await ethers.getContractFactory('Rep');
  const Zrx = await ethers.getContractFactory('Zrx');
  console.log("Deploying contracts");
  const dai = await Dai.deploy();
  const bat = await Bat.deploy();
  const rep = await Rep.deploy();
  const zrx = await Zrx.deploy();
  const dex = await Dex.deploy();
  console.log("Awaiting deployed.")
  await dai.deployed();
  console.log(`Success! Dai contract deployed to: ${dai.address}`);
  await bat.deployed();
  console.log(`Success! Bat contract deployed to: ${bat.address}`);
  await rep.deployed();
  console.log(`Success! Rep contract deployed to: ${rep.address}`);
  await zrx.deployed();
  console.log(`Success! Zrx contract deployed to: ${zrx.address}`);
  await dex.deployed();
  console.log(`Success! Dex contract deployed to: ${dex.address}`);

  await dex.addToken(DAI, dai.address);
  console.log("Success! Added Dai");
  await dex.addToken(BAT, bat.address);
  console.log("Success! Added Bat");
  await dex.addToken(REP, rep.address);
  console.log("Success! Added Rep");
  await dex.addToken(ZRX, zrx.address);
  console.log("Success! Added Zrx");

  // seed Trader accounts
  const amount = ethers.utils.parseEther('1000');

  const seedTokenBalance = async (token, trader) => {
    await token.connect(trader).faucet(trader.address, amount)
    await token.connect(trader).approve(
      dex.address,
      amount,
    );
    const ticker = await token.name();
    await dex.connect(trader).deposit(
      amount,
      ethers.utils.formatBytes32String(ticker),
    )
  };

  console.log("Seed tokens for trader1");
  await seedTokenBalance(dai, trader1);
  await seedTokenBalance(bat, trader1);
  await seedTokenBalance(rep, trader1);
  await seedTokenBalance(zrx, trader1);

  console.log("Seed tokens for trader2");
  await seedTokenBalance(dai, trader2);
  await seedTokenBalance(bat, trader2);
  await seedTokenBalance(rep, trader2);
  await seedTokenBalance(zrx, trader2);

  console.log("Seed tokens for trader3");
  await seedTokenBalance(dai, trader3);
  await seedTokenBalance(bat, trader3);
  await seedTokenBalance(rep, trader3);
  await seedTokenBalance(zrx, trader3);


  const increaseTime = async (seconds) => {
    if (["hardhat", "localhost"].includes(hre_network.name)) {
      console.log("Increasing time via evm_increaseTime")
      await ethers.provider.send("evm_increaseTime", [seconds]);
      await ethers.provider.send("evm_mine");
    } else {   // we are probably in a mainnet or testnet where time is real.
      console.log("Delay time in realtime.")
      await delay(seconds * 1000)
    }
  }

  const cMO = async (trader, ticker, amount, side) => {
    let tx = await dex.connect(trader).createMarketOrder(ticker, amount, side);
    console.log("Got marketOrder tx", tx.hash)
    console.log("Waiting for marketOrder tx")
    // if we don't wait, the market order might not have anything to get matched against;
    await tx.wait();
    await increaseTime(1);
  }
  const cLO = async (trader, ticker, amount, price, side) => {
    let tx = await dex.connect(trader).createLimitOrder(ticker, amount, price, side);
    console.log("Got limitOrder tx", tx.hash)
    console.log("Waiting for limitOrder tx")
    // if we don't wait, the market order might not have anything to get matched against;
    await tx.wait();
    await increaseTime(1);
  }
  //create trades
  console.log("Creating trades")
  await cLO(trader1, BAT, 1000, 10, SIDE.BUY);
  await cMO(trader2, BAT, 1000, SIDE.SELL);

  await cLO(trader1, BAT, 1200, 11, SIDE.BUY);
  await cMO(trader2, BAT, 1200, SIDE.SELL);

  await cLO(trader1, BAT, 1200, 15, SIDE.BUY);
  await cMO(trader2, BAT, 1200, SIDE.SELL);

  await cLO(trader1, BAT, 1500, 14, SIDE.BUY);
  await cMO(trader2, BAT, 1500, SIDE.SELL);

  await cLO(trader1, REP, 1000, 4, SIDE.BUY);
  await cMO(trader2, REP, 1000, SIDE.SELL);

  await cLO(trader1, REP, 1200, 5, SIDE.BUY);
  await cMO(trader2, REP, 1200, SIDE.SELL);

  await cLO(trader1, REP, 1200, 6, SIDE.BUY);
  await cMO(trader2, REP, 1200, SIDE.SELL);

  await cLO(trader1, REP, 1500, 5, SIDE.BUY);
  await cMO(trader2, REP, 1500, SIDE.SELL);

  await cLO(trader1, ZRX, 500, 12, SIDE.BUY);
  await cMO(trader2, REP, 500, SIDE.SELL);

  await cLO(trader1, ZRX, 1000, 13, SIDE.BUY);
  await cMO(trader2, REP, 1000, SIDE.SELL);

  //create orders
  console.log("Creating limit orders")
  await cLO(trader1, BAT, 1400, 10, SIDE.BUY);
  await cLO(trader2, BAT, 1200, 11, SIDE.BUY);
  await cLO(trader2, BAT, 1000, 12, SIDE.BUY);

  await cLO(trader1, REP, 3000, 4, SIDE.BUY);
  await cLO(trader1, REP, 2000, 5, SIDE.BUY);
  await cLO(trader2, REP, 500, 6, SIDE.BUY);

  await cLO(trader1, ZRX, 3000, 12, SIDE.BUY);
  await cLO(trader1, ZRX, 2000, 13, SIDE.BUY);
  await cLO(trader3, ZRX, 500, 14, SIDE.BUY);

  await cLO(trader3, BAT, 3000, 16, SIDE.SELL);
  await cLO(trader2, BAT, 2000, 17, SIDE.SELL);
  await cLO(trader1, BAT, 500, 14, SIDE.SELL);

  await cLO(trader3, REP, 3000, 10, SIDE.SELL);
  await cLO(trader2, REP, 2000, 7, SIDE.SELL);
  await cLO(trader1, REP, 500, 9, SIDE.SELL);

  await cLO(trader3, ZRX, 3000, 16, SIDE.SELL);
  await cLO(trader2, ZRX, 2000, 17, SIDE.SELL);
  await cLO(trader1, ZRX, 500, 21, SIDE.SELL);

  console.log("Done!")

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
