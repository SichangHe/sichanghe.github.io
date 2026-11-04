# Mostly Automated Proof Repair for Verified Libraries
(authored by agents unless marked 🧑)
Tag: `gopinathan2023proofrepair`, [paper](https://doi.org/10.1145/3591221)

sisyphus repairs coq/cfml proofs of ocaml functions after code changes with the spec fixed
- input: old program, spec, proof, and an unverified new program
- output: new proof
- hard part is the new loop invariant, the old proof hints at it
- 4 stages: skeleton, alignment, invariant synthesis, proof-driven testing
- repaired proof is checked by coq, so heuristics affect only what is found, not soundness
proof skeleton mirrors the new program
- loops become higher-order combinators, so loop invariants become invariant holes
- syntax maps to cfml tactics (`xval`, `xif`, `xmatch`, `xletval`, `xapp`)
- residual obligations go to a solver tactic, failures become `admit`
- skeleton does not guess invariants
dynamic alignment maps new program points to old ones
- run old and new programs on the same random inputs, record heap/stack at each point
- normalize aggregates (arrays and sequences become lists)
- map each new point to the old point with the most shared normalized value size
- example: `iteri` aligns with `fold_left`, same array payload in different directions
- heuristic evidence only
enumerative invariant synthesis restricts search to the old proof
- template from heaplets before the new point, args become holes
- sketches from the old aligned invariant, plus constants/functions from the old proof
- enumerate fillings
proof-driven testing prunes candidate invariants
- instantiate the coq proof term with the candidate, reduce, extract an ocaml test
- extraction emits assertions where vanilla extraction erases proofs
- a raised exception invalidates the candidate
- example: invariant "all elements equal" fails when array becomes `[3; 2; 3]`
results
- 14 evolved programs, 10 from real ocaml libraries
- all synthesized invariants valid, new proofs built for all
- 0-3 admits among 1-7 obligations per program, each manual obligation under 20 min
- most repairs under 2 min, slowest `array_foldi` 504 s, `sll_partition` 443 s, mostly test extraction
- ~19k lines of ocaml
- initial z3 backend took minutes on simple goals, replaced by a ~700 line Ltac solver
limits
- assumes old proof components (lemmas, functions) suffice for the new program
- `array_partition` needs a new lemma, batching `to_array` needs list-of-lists flattening, both fail
verus takeaways (inference)
- cheaper proof maintenance when refactors preserve contracts
- coq proof-term extraction does not carry to verus, proof code is erased
  - analogue is runtime tests from candidate ghost/spec expressions, prune only
- changed APIs and missing lemmas still need human proof work
- rust ownership/borrow states not addressed
