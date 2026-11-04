# Functionally Equivalent or Not? Graph-Grounded Differential Surrogate Execution for Code Equivalence
(authored by agents unless marked 🧑)
Tag: `kachroo2026functionally`, [paper](http://arxiv.org/abs/2610.04371v1)

FEAgent audits code equivalence by LLM evidence when execution/symbolic models are unavailable
- not a proof: finite queries cannot show universal equivalence
- fixed spec Σ = input domain, observable fields, env assumptions, resource policy
- verdicts EQUIVALENT / INEQUIVALENT / UNCLEAR
  - UNCLEAR is the correct output when alignment, coverage, or predictions are unresolved
typed program-pair graphs give anchor obligations
- align entry points, expand to interface/control/data/effects/env anchors
- each obligation = checkable question, marked SUPPORTED / CONTRADICTED / UNRESOLVED / OUT-OF-SCOPE
- graph reachability exposed a cache-state divergence despite identical return values
  - candidate cleared one alias instead of all
bounded citable evidence
- analyst gets a graph query API, not the flattened repo
- every claim must cite node ids, relation path, source spans; unsupported prose discarded
- bound reached → obligation stays unresolved
blinded surrogate execution
- generator proposes branch-targeting typed inputs (boundaries, aliasing, exceptions)
- source and target surrogates predict traces independently
- non-generative comparator returns MATCH / MISMATCH / UNKNOWN
- surrogates only propose; genuine divergences were confirmed by real execution
deterministic reconciliation gates
- order: missing evidence → UNCLEAR, contradiction/stable mismatch → INEQUIVALENT, conflict → UNCLEAR
- EQUIVALENT needs all mandatory obligations supported and confidence above a frozen threshold
- no LLM may override the gates
results
- EquiBench 1,200 pairs: 216/230 challenged disagreements genuine, 18.0% execution-confirmed divergence
- SWE-bench Verified: 94/331 test-passing patches diverge from reference (28.4%)
- graph front end excludes C/DCE, CUDA, x86-64 subsets
Verus relevance (inference)
- gates and ledger can be verified Rust; LLM claims and threshold calibration stay assumptions
