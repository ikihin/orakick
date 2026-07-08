/**
 * Minimal TxOracle (TxLINE) devnet IDL — subset containing only the
 * validate_stat view instruction that Orakick calls to trustlessly verify
 * match outcomes from the on-chain Merkle root before resolving a market.
 *
 * Full IDL: https://txline.txodds.com/documentation/programs/devnet
 * Program ID (devnet): 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J
 */
export const TXORACLE_PROGRAM_ID_DEVNET =
  "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J";

export const TXORACLE_PROGRAM_ID_MAINNET =
  "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA";

export const TXORACLE_IDL = {
  address: TXORACLE_PROGRAM_ID_DEVNET,
  metadata: {
    name: "txoracle",
    version: "1.5.2",
    spec: "0.1.0",
    description: "TxODDS TxLINE Data system",
  },
  instructions: [
    {
      name: "validate_stat",
      discriminator: [107, 197, 232, 90, 191, 136, 105, 185],
      accounts: [{ name: "daily_scores_merkle_roots" }],
      args: [
        { name: "ts", type: "i64" },
        { name: "fixture_summary", type: { defined: { name: "ScoresBatchSummary" } } },
        { name: "fixture_proof", type: { vec: { defined: { name: "ProofNode" } } } },
        { name: "main_tree_proof", type: { vec: { defined: { name: "ProofNode" } } } },
        { name: "predicate", type: { defined: { name: "TraderPredicate" } } },
        { name: "stat_a", type: { defined: { name: "StatTerm" } } },
        { name: "stat_b", type: { option: { defined: { name: "StatTerm" } } } },
        { name: "op", type: { option: { defined: { name: "BinaryExpression" } } } },
      ],
      returns: "bool",
    },
  ],
  types: [
    {
      name: "ProofNode",
      type: {
        kind: "struct",
        fields: [
          { name: "hash", type: { array: ["u8", 32] } },
          { name: "is_right_sibling", type: "bool" },
        ],
      },
    },
    {
      name: "ScoreStat",
      type: {
        kind: "struct",
        fields: [
          { name: "key", type: "u32" },
          { name: "value", type: "i32" },
          { name: "period", type: "i32" },
        ],
      },
    },
    {
      name: "StatTerm",
      type: {
        kind: "struct",
        fields: [
          { name: "stat_to_prove", type: { defined: { name: "ScoreStat" } } },
          { name: "event_stat_root", type: { array: ["u8", 32] } },
          { name: "stat_proof", type: { vec: { defined: { name: "ProofNode" } } } },
        ],
      },
    },
    {
      name: "ScoresUpdateStats",
      type: {
        kind: "struct",
        fields: [
          { name: "update_count", type: "i32" },
          { name: "min_timestamp", type: "i64" },
          { name: "max_timestamp", type: "i64" },
        ],
      },
    },
    {
      name: "ScoresBatchSummary",
      type: {
        kind: "struct",
        fields: [
          { name: "fixture_id", type: "i64" },
          { name: "update_stats", type: { defined: { name: "ScoresUpdateStats" } } },
          { name: "events_sub_tree_root", type: { array: ["u8", 32] } },
        ],
      },
    },
    {
      name: "Comparison",
      type: { kind: "enum", variants: [{ name: "GreaterThan" }, { name: "LessThan" }, { name: "EqualTo" }] },
    },
    {
      name: "TraderPredicate",
      type: {
        kind: "struct",
        fields: [
          { name: "threshold", type: "i32" },
          { name: "comparison", type: { defined: { name: "Comparison" } } },
        ],
      },
    },
    {
      name: "BinaryExpression",
      type: { kind: "enum", variants: [{ name: "Add" }, { name: "Subtract" }] },
    },
  ],
} as const;

// Common ScoreStat keys — subset from TxLINE soccer feed. Extend as needed.
// See https://txline.txodds.com/documentation/scores/soccer-feed
export const SCORE_STAT_KEYS = {
  HOME_GOALS: 1,
  AWAY_GOALS: 2,
} as const;

// Period identifiers from TxLINE soccer feed.
export const PERIOD = {
  FULL_TIME: 0,
  FIRST_HALF: 1,
  SECOND_HALF: 2,
} as const;
