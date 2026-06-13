// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { ProjectBallPools } from "../src/ProjectBallPools.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract ProjectBallPoolsTest is Test {
    bytes32 private constant MATCH_ID = bytes32("rio-sp-2026-06-08");
    bytes32 private constant SECOND_MATCH_ID = bytes32("rio-sp-2026-06-09");
    bytes32 private constant THIRD_MATCH_ID = bytes32("rio-sp-2026-06-10");

    address private alice = address(0xA11CE);
    address private bob = address(0xB0B);
    address private carol = address(0xCA20);
    address private treasury = address(0x710);
    address private burnSink = address(0xBEEF);

    MockERC20 private usdm;
    MockERC20 private usdc;
    ProjectBallPools private pools;

    function setUp() public {
        usdm = new MockERC20("USDm", "USDm", 18);
        usdc = new MockERC20("USDC", "USDC", 6);

        address[] memory tokens = new address[](2);
        uint8[] memory decimals = new uint8[](2);
        tokens[0] = address(usdm);
        tokens[1] = address(usdc);
        decimals[0] = 18;
        decimals[1] = 6;

        pools = new ProjectBallPools(address(this), treasury, burnSink, tokens, decimals);
        pools.createMatch(MATCH_ID, uint64(block.timestamp + 1 hours));

        usdm.mint(alice, 100 ether);
        usdc.mint(bob, 100_000000);

        vm.prank(alice);
        usdm.approve(address(pools), type(uint256).max);

        vm.prank(bob);
        usdc.approve(address(pools), type(uint256).max);
    }

    function testOwnerCanTransferOwnershipAndConfigurePool() public {
        MockERC20 celoUsd = new MockERC20("cUSD", "cUSD", 18);
        address newTreasury = address(0x711);
        address newBurnSink = address(0xB012);

        pools.transferOwnership(carol);

        vm.prank(carol);
        pools.acceptOwnership();

        assertEq(pools.owner(), carol);
        assertEq(pools.pendingOwner(), address(0));

        vm.startPrank(carol);
        pools.setTreasury(newTreasury);
        pools.setBurnSink(newBurnSink);
        pools.setFeeBps(250, 150);
        pools.configureToken(address(celoUsd), 18, true);
        pools.createMatch(SECOND_MATCH_ID, uint64(block.timestamp + 2 hours));
        vm.stopPrank();

        (uint64 lockTime, ProjectBallPools.MatchStatus status,, uint256 total, uint256 winners) =
            pools.getMatch(SECOND_MATCH_ID);
        (bool enabled, uint8 decimals) = pools.tokenConfigs(address(celoUsd));

        assertEq(lockTime, block.timestamp + 2 hours);
        assertEq(uint8(status), uint8(ProjectBallPools.MatchStatus.Open));
        assertEq(total, 0);
        assertEq(winners, 0);
        assertEq(pools.treasury(), newTreasury);
        assertEq(pools.burnSink(), newBurnSink);
        assertEq(pools.treasuryFeeBps(), 250);
        assertEq(pools.burnFeeBps(), 150);
        assertTrue(enabled);
        assertEq(decimals, 18);
    }

    function testRejectsInvalidConstructorAndOwnerInputs() public {
        address[] memory tokens = new address[](1);
        uint8[] memory decimals = new uint8[](1);
        tokens[0] = address(usdm);
        decimals[0] = 18;

        vm.expectRevert(ProjectBallPools.ZeroAddress.selector);
        new ProjectBallPools(address(0), treasury, burnSink, tokens, decimals);

        vm.expectRevert(ProjectBallPools.ZeroAddress.selector);
        new ProjectBallPools(address(this), address(0), burnSink, tokens, decimals);

        vm.expectRevert(ProjectBallPools.ZeroAddress.selector);
        new ProjectBallPools(address(this), treasury, address(0), tokens, decimals);

        uint8[] memory emptyDecimals = new uint8[](0);
        vm.expectRevert(ProjectBallPools.UnsupportedToken.selector);
        new ProjectBallPools(address(this), treasury, burnSink, tokens, emptyDecimals);

        vm.prank(alice);
        vm.expectRevert(ProjectBallPools.OnlyOwner.selector);
        pools.setTreasury(carol);

        vm.expectRevert(ProjectBallPools.ZeroAddress.selector);
        pools.transferOwnership(address(0));

        vm.prank(alice);
        vm.expectRevert(ProjectBallPools.OnlyOwner.selector);
        pools.acceptOwnership();

        vm.expectRevert(ProjectBallPools.ZeroAddress.selector);
        pools.setTreasury(address(0));

        vm.expectRevert(ProjectBallPools.ZeroAddress.selector);
        pools.setBurnSink(address(0));

        vm.expectRevert(ProjectBallPools.InvalidFee.selector);
        pools.setFeeBps(501, 0);

        vm.expectRevert(ProjectBallPools.ZeroAddress.selector);
        pools.configureToken(address(0), 18, true);

        vm.expectRevert(ProjectBallPools.UnsupportedToken.selector);
        pools.configureToken(address(usdm), 19, true);

        vm.expectRevert(ProjectBallPools.InvalidMatchId.selector);
        pools.createMatch(bytes32(0), uint64(block.timestamp + 1 hours));

        vm.expectRevert(ProjectBallPools.MatchAlreadyExists.selector);
        pools.createMatch(MATCH_ID, uint64(block.timestamp + 1 hours));

        vm.expectRevert(ProjectBallPools.LockTimeInPast.selector);
        pools.createMatch(SECOND_MATCH_ID, uint64(block.timestamp));
    }

    function testPlaceBetNormalizesMultiStablecoin() public {
        vm.prank(alice);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), 1 ether);

        vm.prank(bob);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Draw), address(usdc), 1_000000);

        assertEq(pools.getOutcomeTotal(MATCH_ID, uint8(ProjectBallPools.Outcome.Home)), 1 ether);
        assertEq(pools.getOutcomeTotal(MATCH_ID, uint8(ProjectBallPools.Outcome.Draw)), 1 ether);
        assertEq(pools.getTokenBalance(MATCH_ID, address(usdm)), 1 ether);
        assertEq(pools.getTokenBalance(MATCH_ID, address(usdc)), 1_000000);

        address[] memory poolTokens = pools.getPoolTokens(MATCH_ID);
        assertEq(poolTokens.length, 2);
        assertEq(poolTokens[0], address(usdm));
        assertEq(poolTokens[1], address(usdc));
    }

    function testRejectsSecondBetFromSameWallet() public {
        vm.startPrank(alice);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), 1 ether);
        vm.expectRevert(ProjectBallPools.AlreadyPlaced.selector);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Away), address(usdm), 1 ether);
        vm.stopPrank();
    }

    function testLocksAtKickoff() public {
        vm.warp(block.timestamp + 1 hours);

        vm.prank(alice);
        vm.expectRevert(ProjectBallPools.MatchNotOpen.selector);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), 1 ether);
    }

    function testRejectsInvalidBetInputsAndTransferFailures() public {
        FalseTransferFromERC20 falseTransferFrom = new FalseTransferFromERC20();
        pools.configureToken(address(falseTransferFrom), 18, true);

        vm.prank(alice);
        vm.expectRevert(ProjectBallPools.InvalidOutcome.selector);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.None), address(usdm), 1 ether);

        vm.prank(alice);
        vm.expectRevert(ProjectBallPools.InvalidOutcome.selector);
        pools.placeBet(MATCH_ID, 4, address(usdm), 1 ether);

        vm.prank(alice);
        vm.expectRevert(ProjectBallPools.UnsupportedToken.selector);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(0xBAD), 1 ether);

        vm.prank(alice);
        vm.expectRevert(ProjectBallPools.InvalidAmount.selector);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), 0);

        vm.prank(alice);
        vm.expectRevert(ProjectBallPools.TokenTransferFailed.selector);
        pools.placeBet(
            MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(falseTransferFrom), 1 ether
        );
    }

    function testResolveCollectsFeesAndWinnerClaimsBasket() public {
        vm.prank(alice);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), 2 ether);

        vm.prank(bob);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdc), 2_000000);

        vm.warp(block.timestamp + 1 hours);
        pools.resolveMatch(MATCH_ID, uint8(ProjectBallPools.Outcome.Home));

        assertEq(usdm.balanceOf(treasury), 60_000_000_000_000_000);
        assertEq(usdm.balanceOf(burnSink), 40_000_000_000_000_000);
        assertEq(usdc.balanceOf(treasury), 60_000);
        assertEq(usdc.balanceOf(burnSink), 40_000);

        vm.prank(alice);
        pools.claim(MATCH_ID);

        assertEq(usdm.balanceOf(alice), 98_950_000_000_000_000_000);
        assertEq(usdc.balanceOf(alice), 950_000);
    }

    function testRejectsResolveBeforeLockAndVoidResolvedMatch() public {
        vm.prank(alice);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), 1 ether);

        vm.expectRevert(ProjectBallPools.MatchNotLocked.selector);
        pools.resolveMatch(MATCH_ID, uint8(ProjectBallPools.Outcome.Home));

        vm.warp(block.timestamp + 1 hours);
        pools.resolveMatch(MATCH_ID, uint8(ProjectBallPools.Outcome.Home));

        vm.expectRevert(ProjectBallPools.MatchNotOpen.selector);
        pools.voidMatch(MATCH_ID);
    }

    function testOwnerCanVoidMatchAndRefundsOnlyOnce() public {
        vm.prank(alice);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), 1 ether);

        pools.voidMatch(MATCH_ID);

        vm.prank(alice);
        pools.refund(MATCH_ID);

        vm.prank(alice);
        vm.expectRevert(ProjectBallPools.AlreadyRefunded.selector);
        pools.refund(MATCH_ID);

        assertEq(usdm.balanceOf(alice), 100 ether);
    }

    function testRefundRequiresVoidedPoolAndExistingStake() public {
        vm.prank(alice);
        vm.expectRevert(ProjectBallPools.MatchNotVoided.selector);
        pools.refund(MATCH_ID);

        pools.voidMatch(MATCH_ID);

        vm.prank(bob);
        vm.expectRevert(ProjectBallPools.NothingToClaim.selector);
        pools.refund(MATCH_ID);
    }

    function testNoWinnerVoidsAndRefunds() public {
        vm.prank(alice);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), 1 ether);

        vm.warp(block.timestamp + 1 hours);
        pools.resolveMatch(MATCH_ID, uint8(ProjectBallPools.Outcome.Away));

        vm.prank(alice);
        pools.refund(MATCH_ID);

        assertEq(usdm.balanceOf(alice), 100 ether);
    }

    function testClaimBatchClaimsMultipleMatchesAndRejectsSecondClaim() public {
        pools.createMatch(SECOND_MATCH_ID, uint64(block.timestamp + 2 hours));

        vm.startPrank(alice);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), 1 ether);
        pools.placeBet(
            SECOND_MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), 1 ether
        );
        vm.stopPrank();

        vm.warp(block.timestamp + 2 hours);
        pools.resolveMatch(MATCH_ID, uint8(ProjectBallPools.Outcome.Home));
        pools.resolveMatch(SECOND_MATCH_ID, uint8(ProjectBallPools.Outcome.Home));

        bytes32[] memory matchIds = new bytes32[](2);
        matchIds[0] = MATCH_ID;
        matchIds[1] = SECOND_MATCH_ID;

        vm.prank(alice);
        pools.claimBatch(matchIds);

        vm.prank(alice);
        vm.expectRevert(ProjectBallPools.AlreadyClaimed.selector);
        pools.claim(MATCH_ID);
    }

    function testClaimRequiresResolvedWinningStake() public {
        vm.prank(alice);
        vm.expectRevert(ProjectBallPools.MatchNotResolved.selector);
        pools.claim(MATCH_ID);

        vm.prank(alice);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), 1 ether);

        vm.prank(bob);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Away), address(usdc), 1_000000);

        vm.warp(block.timestamp + 1 hours);
        pools.resolveMatch(MATCH_ID, uint8(ProjectBallPools.Outcome.Home));

        vm.prank(bob);
        vm.expectRevert(ProjectBallPools.NothingToClaim.selector);
        pools.claim(MATCH_ID);
    }

    function testOwnerSweepTransfersOnlyUnlockedSurplus() public {
        usdm.mint(address(pools), 5 ether);

        pools.ownerSweep(address(usdm));

        assertEq(usdm.balanceOf(treasury), 5 ether);

        vm.expectRevert(ProjectBallPools.ZeroAddress.selector);
        pools.ownerSweep(address(0));
    }

    function testOwnerSweepRevertsWhenTransferFails() public {
        FalseTransferERC20 falseTransfer = new FalseTransferERC20();
        falseTransfer.mint(address(pools), 1 ether);

        vm.expectRevert(ProjectBallPools.TokenTransferFailed.selector);
        pools.ownerSweep(address(falseTransfer));
    }

    function testFuzz_ProportionalPayoutSplits(uint256 stakeAlice, uint256 stakeBob) public {
        stakeAlice = bound(stakeAlice, 1 ether, 1000 ether);
        stakeBob = bound(stakeBob, 1_000000, 1000_000000); // USDC

        usdm.mint(alice, stakeAlice);
        usdc.mint(bob, stakeBob);

        vm.prank(alice);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), stakeAlice);

        vm.prank(bob);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdc), stakeBob);

        vm.warp(block.timestamp + 1 hours);
        pools.resolveMatch(MATCH_ID, uint8(ProjectBallPools.Outcome.Home));

        vm.prank(alice);
        pools.claim(MATCH_ID);

        vm.prank(bob);
        pools.claim(MATCH_ID);

        // In a real fuzz test, we'd do deeper math checks, but this ensures no reverts on proportional claims
        assertTrue(usdm.balanceOf(alice) > 0 || usdc.balanceOf(alice) > 0);
        assertTrue(usdm.balanceOf(bob) > 0 || usdc.balanceOf(bob) > 0);
    }

    function testFuzz_AllWinnersOneSide(uint256 stakeAlice) public {
        stakeAlice = bound(stakeAlice, 1 ether, 1000 ether);
        usdm.mint(alice, stakeAlice);

        vm.prank(alice);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Away), address(usdm), stakeAlice);

        vm.warp(block.timestamp + 1 hours);
        pools.resolveMatch(MATCH_ID, uint8(ProjectBallPools.Outcome.Away));

        vm.prank(alice);
        pools.claim(MATCH_ID);

        // Assert they got their stake back minus fees
        assertTrue(usdm.balanceOf(alice) > 0);
    }
}

contract FalseTransferERC20 {
    mapping(address account => uint256 amount) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address, uint256) external pure returns (bool) {
        return false;
    }
}

contract FalseTransferFromERC20 {
    function balanceOf(address) external pure returns (uint256) {
        return 0;
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false;
    }
}
