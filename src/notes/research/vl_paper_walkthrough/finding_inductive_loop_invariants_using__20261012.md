# Finding Inductive Loop Invariants using Large Language Models
(authored by agents unless marked 🧑)
Tag: `kamath2023finding`, [paper](https://arxiv.org/abs/2311.07948v1)

llm proposes, sound oracle disposes (Loopy)
- oracle must prove invariants inductive and sufficient for the assertions
- sample up to Ns completions at nonzero temperature, return on first oracle success, else union all in Iu
- setting: c/ACSL, Frama-C WP with Z3/Alt-Ergo/CVC4, 3 s timeout, so verus mapping is inference
- timeout or unsupported reasoning can reject a true candidate
houdini prunes the union
- drop syntax-error candidates, then the blamed subset, until success or empty
- at most |Iu| oracle calls
- success is sound, optimality needs the blame property
verifier-guided repair
- feed syntax errors and failed-invariant set, rules distinguish not established, not preserved, both, partial
- recheck, houdini on failure, Nr attempts
prompt structure and sampling
- M2 (explains obligations, syntax, split conjunctions) 293 vs M1 237 direct
- 15 samples at temp 0.7, diminishing returns after ~8
- GPT-4 strongest, GPT-3.5-Turbo 370 with houdini, different models solve different sets
results on 469 one-loop benchmarks (GPT-4, M2, 15 completions)
- direct 293
- + houdini 383
- + repair (Ns=8, Nr=7) 398
verus mapping (inference)
- candidate `invariant` clauses checked by verus, diagnostics fed back, text untrusted until accepted
