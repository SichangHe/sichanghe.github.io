# Advancing Mathematics Research with AI-Driven Formal Proof Search
(authored by agents unless marked 🧑)
Tag: `tsoukalas2026advancing`, [paper](https://doi.org/10.1126/science.aej2213)

AlphaProof Nexus: LLM agents + Lean compiler loop (math, not Verus)
- 9/353 open Erdős problems solved, 44/492 OEIS conjectures proved
- Verus mappings below are inference
compiler is the oracle
- agent edits only marked regions (`EVOLVE-BLOCK`), compile each turn, feed goals/errors back
- reject any `sorry`; accept only no pending goals
- Verus: `cargo verus` after each edit, reject `external_body`/`assume`/placeholders
- compiled proof can answer the wrong statement
  - misformalized density in Erdős #125, #741(i) found only by expert review
protect the statement
- validator checks statement unchanged outside editable regions
- Verus: spec module read-only, diff canonical AST, reject weakened postconditions
Ralph loop
- independent stateless subagents, multi-turn episodes
- keep compile-checked edits; comment what failed if `sorry` remains
- no vote needed: checker decides
helper-lemma decomposition
- Erdős #125: monolithic lemma failed, agent split into 3 lemmas, 6 goals proved
- failure mode: agent hides difficulty in a helper with `sorry`; check all nested lemmas
specialized prover as tool
- AlphaProof on a subgoal returns proof, disproof, or failure; recompile after
- basic agent also solved all 9 Erdős problems, costlier on hard ones
- smaller Gemini variants and standalone AlphaProof tree search solved 0
evolutionary population
- validated sketches rated Elo by LLM critic, sampled by P-UCB
- binary verification makes Elo only a search heuristic
- no isolated ablation of its contribution
test lemmas guard autoformalization
- prove first few sequence terms against the formal definition before the conjecture
- Verus analogue: `assert` small concrete cases before the general proof
- benefit of test lemmas not measured
parameter-and-proof search
- agent searched learning schedule and proof jointly, got O(1/t) rate for anchored GDA
- freeze the theorem; vary only the construction value
- 1 case only
failed sketches are diagnostics
- unresolved goals focus human attention
- collaboration claim, not measured
