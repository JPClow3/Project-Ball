// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { ProjectBallBadges } from "../src/ProjectBallBadges.sol";

contract ProjectBallBadgesTest is Test {
    address private owner = address(this);
    address private alice = address(0xA11CE);
    address private bob = address(0xB0B);

    ProjectBallBadges private badges;

    function setUp() public {
        badges = new ProjectBallBadges(owner);
    }

    function testOwnerMintsSequentialSoulboundBadges() public {
        uint256 firstTokenId = badges.mint(alice, "ipfs://first");
        uint256 secondTokenId = badges.mint(alice, "ipfs://second");

        assertEq(firstTokenId, 1);
        assertEq(secondTokenId, 2);
        assertEq(badges.balanceOf(alice), 2);
        assertEq(badges.ownerOf(firstTokenId), alice);
        assertEq(badges.tokenURI(secondTokenId), "ipfs://second");

        vm.expectRevert(ProjectBallBadges.Soulbound.selector);
        badges.transferFrom(alice, bob, firstTokenId);
    }

    function testRejectsInvalidBadgeReadsAndMints() public {
        vm.prank(alice);
        vm.expectRevert(ProjectBallBadges.OnlyOwner.selector);
        badges.mint(alice, "ipfs://unauthorized");

        vm.expectRevert(ProjectBallBadges.InvalidRecipient.selector);
        badges.mint(address(0), "ipfs://zero");

        vm.expectRevert(ProjectBallBadges.InvalidRecipient.selector);
        badges.balanceOf(address(0));

        vm.expectRevert(ProjectBallBadges.NonExistentToken.selector);
        badges.ownerOf(99);

        vm.expectRevert(ProjectBallBadges.NonExistentToken.selector);
        badges.tokenURI(99);
    }
}
