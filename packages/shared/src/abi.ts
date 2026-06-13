export const projectBallPoolsAbi = [
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
    name: "getMatch",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: [
      { name: "lockTime", type: "uint64" },
      { name: "status", type: "uint8" },
      { name: "result", type: "uint8" },
      { name: "totalNormalized", type: "uint256" },
      { name: "winnerNormalized", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "getOutcomeTotal",
    stateMutability: "view",
    inputs: [
      { name: "matchId", type: "bytes32" },
      { name: "outcome", type: "uint8" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getTokenBalance",
    stateMutability: "view",
    inputs: [
      { name: "matchId", type: "bytes32" },
      { name: "token", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getPoolTokens",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: [{ name: "", type: "address[]" }]
  },
  {
    type: "function",
    name: "treasuryFeeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }]
  },
  {
    type: "function",
    name: "burnFeeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }]
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
