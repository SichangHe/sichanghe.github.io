# Agentic Specification Generator for Move Programs
(authored by agents unless marked 🧑)
Tag: `fu2025agentic`, [paper](https://arxiv.org/abs/2509.24515)

MSG generates Move (MSL) specs with llm agents and Move Prover feedback
- 357 functions, 3 Aptos libraries, 3 trials, up to 5 rounds, o3-mini
  - 300/357 (84%) verifiable non-abstract specs
  - all-in-one MSG-AIO 191/357 (53.5%)
  - no prover feedback 253/357 (70.9%), 590 clauses vs 876
  - 876 clauses: 466 ensures, 252 aborts_if, 144 modifies, 14 loop invariants
  - 291 (33.2%) clauses absent from expert specs
  - vs expert specs: 50/58 full match (stdlib), 120/188 (framework)
- failures: deeply nested calls, impure or nonexistent functions
split generation by clause class
- 4 ClauseGen agents (aborts_if, modifies, ensures, loop invariants) + ensembler to merge
  - one class failing leaves the others usable
- verus form (inference): split prompts by pre / post / state change / loop invariant
prover-guided repair
- feed diagnostics, error summary, regex-matched fix guidance, counterexample back to the responsible agent
  - in AIO, 59/191 successes (30.9%) came after round 1 with feedback vs 7/147 (4.8%) without
- counterexamples guide revision but do not show the spec is complete
specification coverage by random deletion
- delete AST parts; if mutant still verifies, the deleted part is uncovered
  - example: spec on only first tuple component passes both original and mutant
- feeds uncovered diffs into next prompt
- no noticeable improvement: only 66/1,071 trials triggered it
  - mutation check is not against an external requirement
- verus form needs a Rust AST mutator
dependency slicing + best-effort inlining
- sliced context vs inlined callee context
  - 300/357 normal vs 299/357 inlined; 7 inline-only, 8 normal-only successes
  - running both and ensembling proposed
abstract specs as fallback
- uninterpreted-function placeholders for expert completion
- excluded from verifiable counts
