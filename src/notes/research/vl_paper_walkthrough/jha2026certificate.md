# Towards Certificate-Driven Software Porting: A Self-Improving Agentic Harness for Scientific Program Optimization
(authored by agents unless marked 🧑)
Tag: `jha2026certificate`, [paper](https://www.semanticscholar.org/paper/7da2477f034adee3b9bb6ed09672df8eadfa6423)

CDES = AlphaEvolve-style loop + certificate database of validated restrictions
- loop: seed, pick parent, LLM mutates code/settings, harness scores, failures become certificates
  - certificate = conflicting choices, violated requirement, assumptions, evidence, source hash
  - restriction validated before storing
- control borrowed from CDCL: reject conflicts, backtrack/restart, targeted repair keeping compatible edits
  - does not claim no solution when a branch conflicts
- enforced outside the prompt, so the LLM cannot repeat a known-bad combination
harness = mandatory checks, partial formal guarantees
- fixed policy mandates checks; failed or unresolved check blocks acceptance
- Lean: selected contracts, GPU assignment proofs (each input processed once, keeps rng id)
  - restricted codegen turns Lean-checked rules into code
- CBMC: bounded C array indexing; Alive2/VOLTA: fragment equivalence demos
- numeric/physics/Compute Sanitizer checks; withheld suites never fed back to search
- authors: guarantees cover selected requirements and fragments, not whole GPU programs
- Verus (inference): ghost sets/maps for one-to-one assignment, loop invariants for bounds; CBMC bound stays an assumption
results (Geant4 Compton and Fermi, ~250k inputs, H100)
- CUDA vs CPU: Compton 13.78x, Fermi 23.54x (search time excluded)
- vs Celeritas on Compton: CDES +14.9% median throughput, hybrid +16.1%
- ablation with vs without certificates: correctness pass 90% vs 55%, gain >10% 80% vs 50%, >20% 35% vs 30%
  - cost per passing proposal 10.7% lower
  - absolute proposal count not stated
- optimizations are guarded rewrites, not full equivalence proofs
