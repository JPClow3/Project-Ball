// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script } from "forge-std/Script.sol";
import { ProjectBallPools } from "../src/ProjectBallPools.sol";

contract DeployCeloMainnet is Script {
    address private constant CELO_USDM = 0x765de816845861e75a25fca122bb6898b8b1282a;
    address private constant CELO_USDC = 0xceba9300f2b948710d2653dd7b07f33a8b32118c;
    address private constant CELO_USDT = 0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e;

    function run() external returns (ProjectBallPools pools) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address burnSink = vm.envAddress("BURN_SINK_ADDRESS");

        address[] memory tokens = new address[](3);
        uint8[] memory decimals = new uint8[](3);
        tokens[0] = CELO_USDM;
        tokens[1] = CELO_USDC;
        tokens[2] = CELO_USDT;
        decimals[0] = 18;
        decimals[1] = 6;
        decimals[2] = 6;

        vm.startBroadcast(deployerPrivateKey);
        pools = new ProjectBallPools(owner, treasury, burnSink, tokens, decimals);
        vm.stopBroadcast();
    }
}
