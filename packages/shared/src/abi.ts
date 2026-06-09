export const jonakinhoPoolsAbi = [
  {
    type: "function",
    name: "createMatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "bytes32" },
      { name: "lockTime", type: "uint64" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "placeBet",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "bytes32" },
      { name: "outcome", type: "uint8" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "resolveMatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "bytes32" },
      { name: "result", type: "uint8" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "voidMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: []
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: []
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: []
  },
  {
    type: "event",
    name: "PoolCreated",
    inputs: [
      { name: "matchId", type: "bytes32", indexed: true },
      { name: "lockTime", type: "uint64", indexed: false }
    ]
  },
  {
    type: "event",
    name: "BetPlaced",
    inputs: [
      { name: "matchId", type: "bytes32", indexed: true },
      { name: "bettor", type: "address", indexed: true },
      { name: "outcome", type: "uint8", indexed: false },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "normalizedAmount", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "MatchResolved",
    inputs: [
      { name: "matchId", type: "bytes32", indexed: true },
      { name: "result", type: "uint8", indexed: false }
    ]
  },
  {
    type: "event",
    name: "PrizeClaimed",
    inputs: [
      { name: "matchId", type: "bytes32", indexed: true },
      { name: "bettor", type: "address", indexed: true },
      { name: "normalizedAmount", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "PoolVoided",
    inputs: [{ name: "matchId", type: "bytes32", indexed: true }]
  },
  {
    type: "event",
    name: "FeesCollected",
    inputs: [
      { name: "matchId", type: "bytes32", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "treasuryAmount", type: "uint256", indexed: false },
      { name: "burnAmount", type: "uint256", indexed: false }
    ]
  }
] as const;
