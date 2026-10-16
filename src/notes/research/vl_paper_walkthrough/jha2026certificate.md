# Towards Certificate-Driven Software Porting: A Self-Improving Agentic Harness for Scientific Program Optimization
(authored by agents unless marked 🧑)
Tag: `jha2026certificate`, [paper](https://www.semanticscholar.org/paper/7da2477f034adee3b9bb6ed09672df8eadfa6423)

## certificate-driven evolutionary search

CDES extends an AlphaEvolve-style loop for porting and optimizing scientific code. A seed enters a program database; parent selection chooses a stored program; an LLM mutates code or execution settings; an evaluation harness returns scores and failures; and a certificate database stores validated restrictions. The paper states: "Its control logic enforces these restrictions through rejection, backtracking, and targeted repair while preserving compatible edits." (abstract, p. 1)

Apply it as follows:

1. Seed the database with a correct CPU implementation and explicit requirements
2. Select a parent and ask the mutator to propose code or settings
3. Run mandatory formal, numerical, physics, and GPU-safety checks
4. Record the exact candidate source hash and each failed requirement
5. Have a conflict checker and analyzer turn the failure into a certificate containing conflicting choices, violated requirement, assumptions, and evidence
6. Validate the proposed restriction before adding it to the certificate database
7. Reject conflicting combinations, backtrack or restart, and perform targeted repair while retaining compatible edits
8. Re-evaluate and add passing candidates and scores to the program database

CDES borrows the control idea of conflict-driven clause learning: Boolean choices are checked for consistency, conflicts learn restrictions, and search backjumps. It does not claim that no solution exists when a branch conflicts. Prompt feedback alone is weaker because the LLM may repeat the same error; the restriction checker enforces validated restrictions independently of prompt compliance.

Verus form (Inference): represent candidate restrictions and evidence as ghost records, and prove a `spec fn` that an accepted candidate satisfies each stored restriction. Keep the mutator and conflict analyzer outside trusted executable code; Verus checks the acceptance predicate and certificate-to-restriction lemmas.

## evaluation harness and formal checks

The harness combines several kinds of evidence. Geant4 source and specifications define expected behavior, while Celeritas is an expert performance reference for Compton. An evaluator LLM selects and orders tools, but a fixed policy mandates checks. Failed or unresolved mandatory checks block acceptance. Separate withheld suites use new workload sizes, random-number sequences, and boundary-near inputs, and their outcomes are not fed back into search.

The formal checks are deliberately partial. Lean verifies selected contracts; GPU assignment proofs establish that each input is processed exactly once and keeps its random-sequence identifier. Restricted code generation translates the Lean-checked assignment rules into executable code. CBMC checks C array indexing in bounded executions. Physlib, HepLean, and Mathlib supply reusable physics and mathematics proofs. Alive2 and VOLTA check code-fragment equivalence in separate demonstrations. The paper cautions: "These guarantees cover selected requirements and fragments, not complete GPU programs." (Section 3, p. 3)

Execution checks compare candidate and reference outputs on matching inputs within fixed numerical tolerances, exact output counts and random-number consumption where required, conservation laws and valid output ranges, GPU memory and synchronization errors with Compute Sanitizer, and selected output distributions. Nsight Compute profiles execution. Acceptance therefore means satisfying stated checks over stated domains, not universal equivalence.

Verus form (Inference): translate assignment and array-safety contracts into function `requires` and `ensures`; use ghost sets to prove one-to-one input assignment and ghost maps for random-sequence identifiers. Use loop `invariant` clauses for index bounds and processed-count conservation. CBMC-style bounded checks do not replace a Verus proof for all loop iterations; the bound and C model remain assumptions.

## quantitative results and denominators

The experiment ports two Geant4 functions, Compton and Fermi, on approximately 250,000 inputs using a 10 GB partition of an NVIDIA H100. Table 1 uses standalone timings in milliseconds and sums separately measured conversion, transfer, and GPU computation; CPU timing includes allocation while GPU buffers are preallocated. CDES CUDA takes 2.189 ms versus CPU 30.162 ms for Compton, a 13.78x speedup, and 14.447 ms versus 340.090 ms for Fermi, a 23.54x speedup. Search and evaluation time are excluded.

Table 2 uses a shared benchmark with six paired timing rounds and separately selected settings. Median execution times are 2.4753 ms (Celeritas), 2.4000 ms (CDES), and 2.3905 ms (hybrid); GPU times are 0.5093, 0.4433, and 0.4387 ms. The table reports median per-round throughput gains: 14.9% for CDES over Celeritas, 16.1% for the hybrid over Celeritas, and 1.2% for the hybrid over CDES. These percentages are not ratios of displayed median times. The paper states: "Throughput gains are medians of per-round time ratios, not ratios of displayed median times." (Table 2 caption, p. 4)

The ablation compares proposals with and without certificate feedback under the same checks. Correctness-pass fraction is 55% without certificates versus 90% with certificates; proposals with throughput gain over 10% are 50% versus 80%, and over 20% are 30% versus 35%. On withheld inputs, best throughput gain is 66.5% versus 68.6%. Model-call costs are $0.0535 versus $0.0782 for the ablation, and the paper reports a 10.7% lower cost per passing proposal with certificates. The denominator is the proposal set in this ablation; the paper does not state its absolute number in the extracted text.

## optimization and product implications

The Compton optimization reuses a previously computed squared sine instead of recomputing it in a helper, with a clamp before square root. The Fermi optimization replaces selected powers by multiplication but retains the original expression where rounding could change a branch decision. A hybrid combines Celeritas energy selection with CDES direction calculation and output writes. These are performance transformations guarded by numerical and physics checks, not proofs of full-program equivalence.

Inference: this is directly useful for VL as a certificate memory around agent-written Rust. Store failed Verus obligations, counterexamples, and assumptions as restrictions, then enforce them before accepting later edits. Inference: the strongest product threat is incomplete coverage: Lean contracts and bounded CBMC checks leave unverified code paths, numerical domains, and GPU behavior. Inference: an agent can obtain high benchmark pass rates while still violating an unstated property or a withheld input outside the checked domain.

Existing conflict-driven synthesis, translation validation, Lean, CBMC, Alive2, and GPU equivalence tools already implement most individual checks. VL should compose such checkers and preserve denominators and settings when reporting evidence; it should not treat CDES's 55-to-90% ablation as a universal correctness rate.

## techniques for the catalog

- certificate-driven search: convert failed candidates into validated restrictions and enforce them during later generation
- conflict-aware repair: reject conflicts, backtrack, restart, or repair while preserving compatible edits
- certificate database: retain source hashes, requirements, assumptions, and checker evidence for each candidate
- Lean contract checking: prove selected assignment and identity requirements and generate restricted executable code
- bounded memory safety: use CBMC to check C array indexing within bounded executions
- layered harness validation: combine differential numerical, physics, statistical, sanitizer, and profiling checks
- withheld-input evaluation: reserve new sizes, random sequences, and boundary cases outside the search feedback loop
- certificate ablation: compare proposal pass fractions and performance gains with and without stored restrictions

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
