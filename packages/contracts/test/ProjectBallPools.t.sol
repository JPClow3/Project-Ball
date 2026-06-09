// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { ProjectBallPools } from "../src/ProjectBallPools.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract ProjectBallPoolsTest is Test {
    bytes32 private constant MATCH_ID = bytes32("rio-sp-2026-06-08");

    address private alice = address(0xA11CE);
    address private bob = address(0xB0B);
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

    function testPlaceBetNormalizesMultiStablecoin() public {
        vm.prank(alice);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), 1 ether);

        vm.prank(bob);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Draw), address(usdc), 1_000000);

        assertEq(pools.getOutcomeTotal(MATCH_ID, uint8(ProjectBallPools.Outcome.Home)), 1 ether);
        assertEq(pools.getOutcomeTotal(MATCH_ID, uint8(ProjectBallPools.Outcome.Draw)), 1 ether);
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

    function testNoWinnerVoidsAndRefunds() public {
        vm.prank(alice);
        pools.placeBet(MATCH_ID, uint8(ProjectBallPools.Outcome.Home), address(usdm), 1 ether);

        vm.warp(block.timestamp + 1 hours);
        pools.resolveMatch(MATCH_ID, uint8(ProjectBallPools.Outcome.Away));

        vm.prank(alice);
        pools.refund(MATCH_ID);

        assertEq(usdm.balanceOf(alice), 100 ether);
    }
}
