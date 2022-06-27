import React, { useState, useEffect } from 'react';
import { getWeb3, getContracts } from './utils.js';
import App from './App.js';



function LoadingContainer() {

    const [web3, setWeb3] = useState(undefined);
    const [accounts, setAccounts] = useState([]);
    const [contracts, setContracts] = useState(undefined);
    const [startBlockNumber, setStartBlockNumber] = useState(-1);

    useEffect(() => {
        const init = async () => {
            const web3 = await getWeb3();
            console.log("Got web3", web3)
            const contracts = await getContracts(web3);
            console.log("got contracts", contracts)
            const accounts = await web3.eth.getAccounts();
            console.log("got accounts", accounts)
            const startBlockNumber = await web3.eth.getBlockNumber();
            console.log("got startBlockNumber", startBlockNumber)
            setWeb3(web3);
            setContracts(contracts);
            setAccounts(accounts);
            setStartBlockNumber(startBlockNumber)
        };
        init();
    }, []);
    const isReady = () => {
        return (
            typeof web3 !== 'undefined'
            && typeof contracts !== 'undefined'
            && accounts.length > 0
            && startBlockNumber >= 0
        )
    };
    if (!isReady()) {
        console.log(web3, contracts, accounts)
        return (
            <div>Loading ....</div>
        )
    }
    return (
        <App
            web3={web3}
            accounts={accounts}
            contracts={contracts}
            initBlock={startBlockNumber}
        />
    );
}

export default LoadingContainer;