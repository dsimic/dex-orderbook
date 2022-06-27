import React, { useEffect } from 'react';


function GetFakeDai(props) {

    let web3 = props.web3;
    let dai = props.dai;
    let user = props.user;
    const amountFakeDai = 1e4;

    useEffect(() => {
        web3 = props.web3;
        dai = props.dai;
        user = props.user;
    }, [])

    const getFakeDAI = async () => {
        console.log("Getting fake DAI for account: ", user.accounts[0])
        await dai.methods.faucet(user.accounts[0], amountFakeDai).send({from: user.accounts[0]});
        console.log("Got fake dai")
        window.location.reload();
    }

    return (
        <div className="card">
            <h2 className="card-title">Get {amountFakeDai} Fake Dai</h2>
            <div className="row">
                <div className="col-sm-12">
                    <div>Fund your account with some fake DAI to start trading.</div>
                    <br />
                    <button className="btn btn-primary" onClick={getFakeDAI}>Get Fake DAI</button>
                </div>
            </div>
        </div>)
}


export default GetFakeDai;