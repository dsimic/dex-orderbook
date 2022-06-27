// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract Dex {
    enum Side {
        BUY,
        SELL
    }

    event NewTrade(
        uint256 tradeId,
        uint256 orderId,
        bytes32 indexed ticker,
        address indexed trader1,
        address indexed trader2,
        uint256 amount,
        uint256 price,
        uint256 date
    );

    struct Token {
        bytes32 ticker;
        address tokenAddress;
    }

    struct Order {
        uint256 id;
        address trader;
        Side side;
        bytes32 ticker;
        uint256 amount;
        uint256 filled;
        uint256 price;
        uint256 date;
    }

    struct Trade {
        uint256 tradeId;
        uint256 orderId;
        bytes32 ticker;
        address trader1;
        address trader2;
        uint256 amount;
        uint256 price;
        uint256 date;
    }
    uint256 constant tradeStorageSize = 10;

    mapping(bytes32 => Token) public tokens;
    bytes32[] public tokenList;
    mapping(address => mapping(bytes32 => uint256)) public traderBalances;
    mapping(bytes32 => mapping(uint256 => Order[])) public orderBook;
    address public admin;
    uint256 public nextOrderId;
    uint256 public nextTradeId;
    bytes32 constant DAI = bytes32("DAI");
    // Convenience variable -- allows front end to easily que last 100 trades without having to
    // query events from block "0" - not always easy, however adds storage costs and gas costs to trading.
    mapping(bytes32 => Trade[]) recentTrades;

    constructor() {
        admin = msg.sender;
    }

    function getRecentTrades(bytes32 ticker)
        external
        view
        returns (Trade[] memory)
    {
        return recentTrades[ticker];
    }

    function getOrders(bytes32 ticker, Side side)
        external
        view
        returns (Order[] memory)
    {
        return orderBook[ticker][uint256(side)];
    }

    function getTokens() external view returns (Token[] memory) {
        Token[] memory _tokens = new Token[](tokenList.length);
        for (uint256 i = 0; i < tokenList.length; i++) {
            _tokens[i] = Token(
                tokens[tokenList[i]].ticker,
                tokens[tokenList[i]].tokenAddress
            );
        }
        return _tokens;
    }

    function addToken(bytes32 ticker, address tokenAddress) external onlyAdmin {
        tokens[ticker] = Token(ticker, tokenAddress);
        tokenList.push(ticker);
    }

    function deposit(uint256 amount, bytes32 ticker)
        external
        tokenExist(ticker)
    {
        IERC20(tokens[ticker].tokenAddress).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        traderBalances[msg.sender][ticker] =
            traderBalances[msg.sender][ticker] +
            amount;
    }

    function withdraw(uint256 amount, bytes32 ticker)
        external
        tokenExist(ticker)
    {
        require(
            traderBalances[msg.sender][ticker] >= amount,
            "balance too low"
        );
        traderBalances[msg.sender][ticker] =
            traderBalances[msg.sender][ticker] -
            amount;
        IERC20(tokens[ticker].tokenAddress).transfer(msg.sender, amount);
    }

    function createLimitOrder(
        bytes32 ticker,
        uint256 amount,
        uint256 price,
        Side side
    ) external tokenExist(ticker) tokenIsNotDai(ticker) {
        if (side == Side.SELL) {
            require(
                traderBalances[msg.sender][ticker] >= amount,
                "token balance too low"
            );
        } else {
            require(
                traderBalances[msg.sender][DAI] >= amount * price,
                "dai balance too low"
            );
        }
        require(amount > 0, "amount must be non-zero");
        Order[] storage orders = orderBook[ticker][uint256(side)];
        orders.push(
            Order(
                nextOrderId,
                msg.sender,
                side,
                ticker,
                amount,
                0,
                price,
                block.timestamp
            )
        );

        uint256 i = orders.length > 0 ? orders.length - 1 : 0;
        while (i > 0) {
            if (side == Side.BUY && orders[i - 1].price > orders[i].price) {
                break;
            }
            if (side == Side.SELL && orders[i - 1].price < orders[i].price) {
                break;
            }
            Order memory order = orders[i - 1];
            orders[i - 1] = orders[i];
            orders[i] = order;
            i--;
        }
        nextOrderId++;
    }

    function _registerTrade(Trade memory trade) private {
        recentTrades[trade.ticker].push(trade);
        if (recentTrades[trade.ticker].length > tradeStorageSize) {
            for (uint i=0; i < tradeStorageSize; i++) {
                recentTrades[trade.ticker][i] = recentTrades[trade.ticker][i+1];
            }
            recentTrades[trade.ticker].pop();
        }
        emit NewTrade(
            trade.tradeId,
            trade.orderId,
            trade.ticker,
            trade.trader1,
            trade.trader2,
            trade.amount,
            trade.price,
            trade.date
        );
    }

    function createMarketOrder(
        bytes32 ticker,
        uint256 amount,
        Side side
    ) external tokenExist(ticker) tokenIsNotDai(ticker) {
        if (side == Side.SELL) {
            require(
                traderBalances[msg.sender][ticker] >= amount,
                "token balance too low"
            );
        }
        Order[] storage orders = orderBook[ticker][
            uint256(side == Side.BUY ? Side.SELL : Side.BUY)
        ];
        uint256 i;
        uint256 remaining = amount;

        while (i < orders.length && remaining > 0) {
            uint256 available = orders[i].amount - orders[i].filled;
            uint256 matched = (remaining > available) ? available : remaining;
            remaining = remaining - matched;
            orders[i].filled = orders[i].filled + matched;
            Trade memory newTrade = Trade(
                nextTradeId,
                orders[i].id,
                ticker,
                orders[i].trader,
                msg.sender,
                matched,
                orders[i].price,
                block.timestamp
            );
            _registerTrade(newTrade);
            if (side == Side.SELL) {
                traderBalances[msg.sender][ticker] =
                    traderBalances[msg.sender][ticker] -
                    matched;
                traderBalances[msg.sender][DAI] =
                    traderBalances[msg.sender][DAI] +
                    (matched * (orders[i].price));
                traderBalances[orders[i].trader][ticker] =
                    traderBalances[orders[i].trader][ticker] +
                    (matched);
                traderBalances[orders[i].trader][DAI] =
                    traderBalances[orders[i].trader][DAI] -
                    (matched * (orders[i].price));
            }
            if (side == Side.BUY) {
                require(
                    traderBalances[msg.sender][DAI] >=
                        matched * (orders[i].price),
                    "dai balance too low"
                );
                traderBalances[msg.sender][ticker] =
                    traderBalances[msg.sender][ticker] +
                    (matched);
                traderBalances[msg.sender][DAI] =
                    traderBalances[msg.sender][DAI] -
                    (matched * (orders[i].price));
                traderBalances[orders[i].trader][ticker] =
                    traderBalances[orders[i].trader][ticker] -
                    matched;
                traderBalances[orders[i].trader][DAI] =
                    traderBalances[orders[i].trader][DAI] +
                    (matched * (orders[i].price));
            }
            nextTradeId++;
            i++;
        }

        i = 0;
        while (i < orders.length && orders[i].filled == orders[i].amount) {
            for (uint256 j = i; j < orders.length - 1; j++) {
                orders[j] = orders[j + 1];
            }
            orders.pop();
            i++;
        }
    }

    modifier tokenIsNotDai(bytes32 ticker) {
        require(ticker != DAI, "cannot trade DAI");
        _;
    }

    modifier tokenExist(bytes32 ticker) {
        require(
            tokens[ticker].tokenAddress != address(0),
            "this token does not exist"
        );
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }
}
