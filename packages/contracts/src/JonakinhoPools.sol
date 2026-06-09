// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC20 } from "./interfaces/IERC20.sol";

contract JonakinhoPools {
    uint256 public constant BPS = 10_000;

    enum Outcome {
        None,
        Home,
        Draw,
        Away
    }

    enum MatchStatus {
        None,
        Open,
        Resolved,
        Voided
    }

    struct TokenConfig {
        bool enabled;
        uint8 decimals;
    }

    struct MatchPool {
        uint64 lockTime;
        MatchStatus status;
        Outcome result;
        uint256 totalNormalized;
        uint256 winnerNormalized;
        bool feesCollected;
        address[] tokens;
        mapping(address token => bool seen) tokenSeen;
        mapping(address token => uint256 amount) tokenBalance;
        mapping(uint8 outcome => uint256 amount) outcomeTotals;
    }

    struct Stake {
        bool exists;
        Outcome outcome;
        address token;
        uint256 amount;
        uint256 normalizedAmount;
        bool claimed;
        bool refunded;
    }

    address public owner;
    address public treasury;
    address public burnSink;
    uint16 public treasuryFeeBps = 300;
    uint16 public burnFeeBps = 200;

    mapping(address token => TokenConfig config) public tokenConfigs;
    address[] public tokenList;
    mapping(bytes32 matchId => MatchPool pool) private pools;
    mapping(bytes32 matchId => mapping(address user => Stake stake)) public stakes;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TreasuryUpdated(address indexed treasury);
    event BurnSinkUpdated(address indexed burnSink);
    event FeesUpdated(uint16 treasuryFeeBps, uint16 burnFeeBps);
    event TokenConfigured(address indexed token, uint8 decimals, bool enabled);
    event PoolCreated(bytes32 indexed matchId, uint64 lockTime);
    event BetPlaced(
        bytes32 indexed matchId,
        address indexed bettor,
        uint8 outcome,
        address token,
        uint256 amount,
        uint256 normalizedAmount
    );
    event MatchResolved(bytes32 indexed matchId, uint8 result);
    event PrizeClaimed(bytes32 indexed matchId, address indexed bettor, uint256 normalizedAmount);
    event PoolVoided(bytes32 indexed matchId);
    event FeesCollected(
        bytes32 indexed matchId,
        address indexed token,
        uint256 treasuryAmount,
        uint256 burnAmount
    );
    event Refunded(bytes32 indexed matchId, address indexed bettor, address token, uint256 amount);

    error OnlyOwner();
    error ZeroAddress();
    error InvalidFee();
    error InvalidOutcome();
    error UnsupportedToken();
    error InvalidAmount();
    error MatchAlreadyExists();
    error MatchNotOpen();
    error MatchNotLocked();
    error MatchNotResolved();
    error MatchNotVoided();
    error LockTimeInPast();
    error AlreadyPlaced();
    error NothingToClaim();
    error AlreadyClaimed();
    error AlreadyRefunded();
    error TokenTransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(
        address initialOwner,
        address initialTreasury,
        address initialBurnSink,
        address[] memory initialTokens,
        uint8[] memory initialDecimals
    ) {
        if (initialOwner == address(0) || initialTreasury == address(0) || initialBurnSink == address(0)) {
            revert ZeroAddress();
        }
        if (initialTokens.length != initialDecimals.length) revert UnsupportedToken();

        owner = initialOwner;
        treasury = initialTreasury;
        burnSink = initialBurnSink;

        emit OwnershipTransferred(address(0), initialOwner);
        emit TreasuryUpdated(initialTreasury);
        emit BurnSinkUpdated(initialBurnSink);

        for (uint256 i = 0; i < initialTokens.length; i++) {
            _configureToken(initialTokens[i], initialDecimals[i], true);
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setBurnSink(address newBurnSink) external onlyOwner {
        if (newBurnSink == address(0)) revert ZeroAddress();
        burnSink = newBurnSink;
        emit BurnSinkUpdated(newBurnSink);
    }

    function setFeeBps(uint16 newTreasuryFeeBps, uint16 newBurnFeeBps) external onlyOwner {
        if (uint256(newTreasuryFeeBps) + uint256(newBurnFeeBps) > 500) revert InvalidFee();
        treasuryFeeBps = newTreasuryFeeBps;
        burnFeeBps = newBurnFeeBps;
        emit FeesUpdated(newTreasuryFeeBps, newBurnFeeBps);
    }

    function configureToken(address token, uint8 decimals, bool enabled) external onlyOwner {
        _configureToken(token, decimals, enabled);
    }

    function createMatch(bytes32 matchId, uint64 lockTime) external onlyOwner {
        MatchPool storage pool = pools[matchId];
        if (matchId == bytes32(0)) revert MatchAlreadyExists();
        if (pool.status != MatchStatus.None) revert MatchAlreadyExists();
        if (lockTime <= block.timestamp) revert LockTimeInPast();

        pool.lockTime = lockTime;
        pool.status = MatchStatus.Open;

        emit PoolCreated(matchId, lockTime);
    }

    function placeBet(bytes32 matchId, uint8 rawOutcome, address token, uint256 amount) external {
        MatchPool storage pool = pools[matchId];
        Outcome outcome = _toOutcome(rawOutcome);
        TokenConfig memory config = tokenConfigs[token];

        if (pool.status != MatchStatus.Open) revert MatchNotOpen();
        if (block.timestamp >= pool.lockTime) revert MatchNotOpen();
        if (!config.enabled) revert UnsupportedToken();
        if (amount == 0) revert InvalidAmount();
        if (stakes[matchId][msg.sender].exists) revert AlreadyPlaced();

        uint256 normalizedAmount = _normalize(amount, config.decimals);

        stakes[matchId][msg.sender] = Stake({
            exists: true,
            outcome: outcome,
            token: token,
            amount: amount,
            normalizedAmount: normalizedAmount,
            claimed: false,
            refunded: false
        });

        if (!pool.tokenSeen[token]) {
            pool.tokenSeen[token] = true;
            pool.tokens.push(token);
        }

        pool.tokenBalance[token] += amount;
        pool.totalNormalized += normalizedAmount;
        pool.outcomeTotals[rawOutcome] += normalizedAmount;

        _safeTransferFrom(token, msg.sender, address(this), amount);

        emit BetPlaced(matchId, msg.sender, rawOutcome, token, amount, normalizedAmount);
    }

    function resolveMatch(bytes32 matchId, uint8 rawResult) external onlyOwner {
        MatchPool storage pool = pools[matchId];
        Outcome result = _toOutcome(rawResult);

        if (pool.status != MatchStatus.Open) revert MatchNotOpen();
        if (block.timestamp < pool.lockTime) revert MatchNotLocked();

        uint256 winnerNormalized = pool.outcomeTotals[rawResult];
        pool.result = result;
        pool.winnerNormalized = winnerNormalized;

        if (winnerNormalized == 0) {
            pool.status = MatchStatus.Voided;
            emit PoolVoided(matchId);
            return;
        }

        pool.status = MatchStatus.Resolved;
        _collectFees(matchId, pool);

        emit MatchResolved(matchId, rawResult);
    }

    function voidMatch(bytes32 matchId) external onlyOwner {
        MatchPool storage pool = pools[matchId];
        if (pool.status != MatchStatus.Open) revert MatchNotOpen();

        pool.status = MatchStatus.Voided;
        emit PoolVoided(matchId);
    }

    function claim(bytes32 matchId) external {
        MatchPool storage pool = pools[matchId];
        Stake storage stake = stakes[matchId][msg.sender];

        if (pool.status != MatchStatus.Resolved) revert MatchNotResolved();
        if (!stake.exists || stake.outcome != pool.result) revert NothingToClaim();
        if (stake.claimed) revert AlreadyClaimed();

        stake.claimed = true;

        for (uint256 i = 0; i < pool.tokens.length; i++) {
            address token = pool.tokens[i];
            uint256 payout = (pool.tokenBalance[token] * stake.normalizedAmount) / pool.winnerNormalized;
            if (payout > 0) {
                _safeTransfer(token, msg.sender, payout);
            }
        }

        emit PrizeClaimed(matchId, msg.sender, stake.normalizedAmount);
    }

    function refund(bytes32 matchId) external {
        MatchPool storage pool = pools[matchId];
        Stake storage stake = stakes[matchId][msg.sender];

        if (pool.status != MatchStatus.Voided) revert MatchNotVoided();
        if (!stake.exists) revert NothingToClaim();
        if (stake.refunded) revert AlreadyRefunded();

        stake.refunded = true;
        _safeTransfer(stake.token, msg.sender, stake.amount);

        emit Refunded(matchId, msg.sender, stake.token, stake.amount);
    }

    function getMatch(bytes32 matchId)
        external
        view
        returns (
            uint64 lockTime,
            MatchStatus status,
            Outcome result,
            uint256 totalNormalized,
            uint256 winnerNormalized
        )
    {
        MatchPool storage pool = pools[matchId];
        return (pool.lockTime, pool.status, pool.result, pool.totalNormalized, pool.winnerNormalized);
    }

    function getOutcomeTotal(bytes32 matchId, uint8 outcome) external view returns (uint256) {
        return pools[matchId].outcomeTotals[outcome];
    }

    function getTokenBalance(bytes32 matchId, address token) external view returns (uint256) {
        return pools[matchId].tokenBalance[token];
    }

    function getPoolTokens(bytes32 matchId) external view returns (address[] memory) {
        return pools[matchId].tokens;
    }

    function _configureToken(address token, uint8 decimals, bool enabled) private {
        if (token == address(0)) revert ZeroAddress();
        if (decimals > 18) revert UnsupportedToken();

        if (tokenConfigs[token].decimals == 0 && decimals != 0) {
            tokenList.push(token);
        }

        tokenConfigs[token] = TokenConfig({ enabled: enabled, decimals: decimals });
        emit TokenConfigured(token, decimals, enabled);
    }

    function _collectFees(bytes32 matchId, MatchPool storage pool) private {
        if (pool.feesCollected) return;
        pool.feesCollected = true;

        for (uint256 i = 0; i < pool.tokens.length; i++) {
            address token = pool.tokens[i];
            uint256 balance = pool.tokenBalance[token];
            uint256 treasuryAmount = (balance * treasuryFeeBps) / BPS;
            uint256 burnAmount = (balance * burnFeeBps) / BPS;

            pool.tokenBalance[token] = balance - treasuryAmount - burnAmount;

            if (treasuryAmount > 0) _safeTransfer(token, treasury, treasuryAmount);
            if (burnAmount > 0) _safeTransfer(token, burnSink, burnAmount);

            emit FeesCollected(matchId, token, treasuryAmount, burnAmount);
        }
    }

    function _toOutcome(uint8 rawOutcome) private pure returns (Outcome) {
        if (rawOutcome < uint8(Outcome.Home) || rawOutcome > uint8(Outcome.Away)) {
            revert InvalidOutcome();
        }

        return Outcome(rawOutcome);
    }

    function _normalize(uint256 amount, uint8 decimals) private pure returns (uint256) {
        if (decimals == 18) return amount;
        return amount * (10 ** (18 - decimals));
    }

    function _safeTransfer(address token, address to, uint256 amount) private {
        (bool success, bytes memory data) = token.call(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TokenTransferFailed();
        }
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) private {
        (bool success, bytes memory data) =
            token.call(abi.encodeCall(IERC20.transferFrom, (from, to, amount)));
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TokenTransferFailed();
        }
    }
}
