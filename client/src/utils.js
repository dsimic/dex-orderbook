import Web3 from 'web3';
import Dex from './contracts/Dex.json';
import ERC20Abi from './ERC20Abi.json';
import detectEthereumProvider from '@metamask/detect-provider';

const DEX_ADDRESS = process.env.REACT_APP_DEX_ADDRESS;

console.log("Got from .env DEX_ADDRESS=", DEX_ADDRESS)


const getWeb3 = () =>

  new Promise(async (resolve, reject) => {

    let provider = await detectEthereumProvider();

    if (provider) {

      await provider.request({ method: 'eth_requestAccounts' });

      try {

        const web3 = new Web3(window.ethereum);

        resolve(web3);

      } catch (error) {

        reject(error);

      }

    } reject('Install Metamask');

  });


const getContracts = async web3 => {
  const networkId = await web3.eth.net.getId();
  console.log("getContracts: creating dex")
  const dex = new web3.eth.Contract(
    Dex.abi,
    DEX_ADDRESS,
  );
  console.log("Got dex:", dex);
  console.log("getting tokens")
  const tokens = await dex.methods.getTokens().call();
  console.log("getting token contracts from tokens: ", tokens)
  const tokenContracts = tokens.reduce((acc, token) => ({
    ...acc,
    [web3.utils.hexToUtf8(token.ticker)]: new web3.eth.Contract(
      ERC20Abi,
      token.tokenAddress
    )
  }), {});
  return { dex, ...tokenContracts };
}

export { getWeb3, getContracts };