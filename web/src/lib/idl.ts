export const IDL = {
  address: "6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR",
  metadata: {
    name: "orakick",
    version: "0.1.0",
    spec: "0.1.0",
  },
  instructions: [
    {
      name: "create_match",
      discriminator: [107, 2, 184, 145, 70, 142, 17, 165],
      accounts: [
        { name: "authority", writable: true, signer: true },
        { name: "matchMarket", writable: true },
        { name: "systemProgram", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "match_id", type: "u64" },
        { name: "team_a", type: "string" },
        { name: "team_b", type: "string" },
        { name: "kickoff_time", type: "i64" },
      ],
    },
    {
      name: "place_prediction",
      discriminator: [79, 46, 195, 197, 50, 91, 88, 229],
      accounts: [
        { name: "user", writable: true, signer: true },
        { name: "matchMarket", writable: true },
        { name: "prediction", writable: true },
        { name: "userTokenAccount", writable: true },
        { name: "vault", writable: true },
        { name: "tokenProgram", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { name: "systemProgram", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "prediction_type", type: { defined: { name: "PredictionType" } } },
        { name: "amount", type: "u64" },
      ],
    },
    {
      name: "resolve_match",
      discriminator: [73, 0, 15, 197, 178, 47, 21, 193],
      accounts: [
        { name: "authority", writable: true, signer: true },
        { name: "matchMarket", writable: true },
      ],
      args: [
        { name: "score_a", type: "u8" },
        { name: "score_b", type: "u8" },
      ],
    },
    {
      name: "claim_winnings",
      discriminator: [161, 215, 24, 59, 14, 236, 242, 221],
      accounts: [
        { name: "user", writable: true, signer: true },
        { name: "matchMarket", writable: true },
        { name: "prediction", writable: true },
        { name: "userTokenAccount", writable: true },
        { name: "vault", writable: true },
        { name: "tokenProgram", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "MatchMarket",
      discriminator: [6, 180, 194, 219, 78, 13, 29, 65],
    },
    {
      name: "Prediction",
      discriminator: [98, 127, 141, 187, 218, 33, 8, 14],
    },
  ],
  types: [
    {
      name: "MatchMarket",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "pubkey" },
          { name: "match_id", type: "u64" },
          { name: "team_a", type: "string" },
          { name: "team_b", type: "string" },
          { name: "kickoff_time", type: "i64" },
          { name: "status", type: { defined: { name: "MatchStatus" } } },
          { name: "total_pool", type: "u64" },
          { name: "result", type: { option: { defined: { name: "MatchResult" } } } },
          { name: "final_score_a", type: "u8" },
          { name: "final_score_b", type: "u8" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "Prediction",
      type: {
        kind: "struct",
        fields: [
          { name: "user", type: "pubkey" },
          { name: "match_market", type: "pubkey" },
          { name: "prediction_type", type: { defined: { name: "PredictionType" } } },
          { name: "amount", type: "u64" },
          { name: "claimed", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "MatchStatus",
      type: {
        kind: "enum",
        variants: [
          { name: "Open" },
          { name: "Resolved" },
          { name: "Cancelled" },
        ],
      },
    },
    {
      name: "MatchResult",
      type: {
        kind: "enum",
        variants: [
          { name: "TeamAWin" },
          { name: "TeamBWin" },
          { name: "Draw" },
        ],
      },
    },
    {
      name: "PredictionType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "MatchWinner",
            fields: [{ name: "outcome", type: { defined: { name: "MatchResult" } } }],
          },
          {
            name: "OverUnder",
            fields: [
              { name: "total_goals", type: "u8" },
              { name: "over", type: "bool" },
            ],
          },
          {
            name: "CorrectScore",
            fields: [
              { name: "score_a", type: "u8" },
              { name: "score_b", type: "u8" },
            ],
          },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: "InvalidAmount", msg: "Invalid prediction amount" },
    { code: 6001, name: "MarketClosed", msg: "Market is closed" },
    { code: 6002, name: "MatchStarted", msg: "Match has already started" },
    { code: 6003, name: "Unauthorized", msg: "Unauthorized" },
    { code: 6004, name: "MarketNotResolved", msg: "Market not resolved yet" },
    { code: 6005, name: "AlreadyClaimed", msg: "Winnings already claimed" },
    { code: 6006, name: "PredictionLost", msg: "Prediction lost" },
  ],
};
