const { ethers, network: hre_network } = require('hardhat');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))


const SIDE = {
  BUY: 0,
  SELL: 1
};
const [DAI, BAT, REP, ZRX] = ['DAI', 'BAT', 'REP', 'ZRX'].map(el => ethers.utils.formatBytes32String(el));

async function main() {
  const [account, trader1, trader2, trader3, trader4] = await ethers.getSigners();
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
  // await Promise.all(
  //   [dai, bat, rep, zrx, dex].map((contract) => {
  //     contract.deployed()
  //   })
  // )
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

  console.log("Seed tokens for trader4");
  await seedTokenBalance(dai, trader4);
  await seedTokenBalance(bat, trader4);
  await seedTokenBalance(rep, trader4);
  await seedTokenBalance(zrx, trader4);

  const increaseTime = async (seconds) => {
    if (["hardhat", "localhost"].includes(hre_network.name)) {
      await ethers.provider.send("evm_increaseTime", [seconds]);
      await ethers.provider.send("evm_mine");
    } else {   // we are probably in a mainnet or testnet where time is real.
      await delay(seconds * 1000)
    }
  }
  //create trades
  await dex.connect(trader1).createLimitOrder(BAT, 1000, 10, SIDE.BUY);
  await dex.connect(trader2).createMarketOrder(BAT, 1000, SIDE.SELL);
  await increaseTime(1);
  await dex.connect(trader1).createLimitOrder(BAT, 1200, 11, SIDE.BUY);
  await dex.connect(trader2).createMarketOrder(BAT, 1200, SIDE.SELL);
  await increaseTime(1);
  await dex.connect(trader1).createLimitOrder(BAT, 1200, 15, SIDE.BUY);
  await dex.connect(trader2).createMarketOrder(BAT, 1200, SIDE.SELL);
  await increaseTime(1);
  await dex.connect(trader1).createLimitOrder(BAT, 1500, 14, SIDE.BUY);
  await dex.connect(trader2).createMarketOrder(BAT, 1500, SIDE.SELL);
  await increaseTime(1);
  await dex.connect(trader1).createLimitOrder(BAT, 2000, 12, SIDE.BUY);
  await dex.connect(trader2).createMarketOrder(BAT, 2000, SIDE.SELL);

  await dex.connect(trader1).createLimitOrder(REP, 1000, 2, SIDE.BUY);
  await dex.connect(trader2).createMarketOrder(REP, 1000, SIDE.SELL);
  await increaseTime(1);
  await dex.connect(trader1).createLimitOrder(REP, 500, 4, SIDE.BUY);
  await dex.connect(trader2).createMarketOrder(REP, 500, SIDE.SELL);
  await increaseTime(1);
  await dex.connect(trader1).createLimitOrder(REP, 800, 2, SIDE.BUY);
  await dex.connect(trader2).createMarketOrder(REP, 800, SIDE.SELL);
  await increaseTime(1);
  await dex.connect(trader1).createLimitOrder(REP, 1200, 6, SIDE.BUY);
  await dex.connect(trader2).createMarketOrder(REP, 1200, SIDE.SELL);

  //create orders
  console.log("Creating limit orders")
  await dex.connect(trader1).createLimitOrder(BAT, 1400, 10, SIDE.BUY)
  await dex.connect(trader2).createLimitOrder(BAT, 1200, 11, SIDE.BUY)
  await dex.connect(trader2).createLimitOrder(BAT, 1000, 12, SIDE.BUY)

  await dex.connect(trader1).createLimitOrder(REP, 3000, 4, SIDE.BUY)
  await dex.connect(trader1).createLimitOrder(REP, 2000, 5, SIDE.BUY)
  await dex.connect(trader2).createLimitOrder(REP, 500, 6, SIDE.BUY)

  await dex.connect(trader1).createLimitOrder(ZRX, 4000, 12, SIDE.BUY)
  await dex.connect(trader1).createLimitOrder(ZRX, 3000, 13, SIDE.BUY)
  await dex.connect(trader2).createLimitOrder(ZRX, 500, 14, SIDE.BUY)

  await dex.connect(trader3).createLimitOrder(BAT, 2000, 16, SIDE.SELL)
  await dex.connect(trader4).createLimitOrder(BAT, 3000, 15, SIDE.SELL)
  await dex.connect(trader4).createLimitOrder(BAT, 500, 14, SIDE.SELL)

  await dex.connect(trader3).createLimitOrder(REP, 4000, 10, SIDE.SELL)
  await dex.connect(trader3).createLimitOrder(REP, 2000, 9, SIDE.SELL)
  await dex.connect(trader4).createLimitOrder(REP, 800, 8, SIDE.SELL)

  await dex.connect(trader3).createLimitOrder(ZRX, 1500, 23, SIDE.SELL)
  await dex.connect(trader3).createLimitOrder(ZRX, 1200, 22, SIDE.SELL)
  await dex.connect(trader4).createLimitOrder(ZRX, 900, 21, SIDE.SELL)
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
