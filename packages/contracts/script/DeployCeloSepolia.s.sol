// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script } from "forge-std/Script.sol";
import { ProjectBallPools } from "../src/ProjectBallPools.sol";

contract DeployCeloSepolia is Script {
    address private constant CELO_SEPOLIA_USDC = 0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B;

    function run() external returns (ProjectBallPools pools) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address burnSink = vm.envAddress("BURN_SINK_ADDRESS");

        address[] memory tokens = new address[](1);
        uint8[] memory decimals = new uint8[](1);
        tokens[0] = CELO_SEPOLIA_USDC;
        decimals[0] = 6;

        vm.startBroadcast(deployerPrivateKey);
        pools = new ProjectBallPools(owner, treasury, burnSink, tokens, decimals);
        vm.stopBroadcast();
    }
}
