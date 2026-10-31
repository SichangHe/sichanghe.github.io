# Benchmarking Software Model Checkers on Automotive Code
(authored by agents unless marked 🧑)
Tag: `westhofen2020automotive`, [paper](http://arxiv.org/abs/2003.11689v1)

## purpose and result

Westhofen, Berger, and Katoen benchmark open-source C model checkers on two confidential, auto-generated automotive controllers: Driveline State Request (DSR) and E-Clutch Control (ECC). The code comes from Simulink models and combines decision logic, floating-point and pointer arithmetic, bit operations, rate limiters, and state-flow behavior. The paper asks how much of a realistic industrial requirement set general-purpose tools can cover, then tests a small, hand-crafted extension of CBMC with k-induction.

The abstract reports that open-source coverage “is at most only 20% of all requirements” while CBMC+k reaches 63% and the commercial BTC EmbeddedValidator reaches 80% (p. 1).

## technique 1: build a requirement-grounded benchmark

What it is. The authors start from two industrial controller models, extract C, and hand-formalize requirements. DSR has 1,354 source lines and ECC 2,517; cyclomatic complexity is 213 and 268 respectively (Table 1, p. 3). They extract 105 DSR properties (103 invariants, two bounded-response) from 42 functional requirements, and 74 ECC properties (71 invariants, three bounded-response) from 74 functional requirements (Section 2.1, p. 4). This requirement denominator is essential: coverage counts requirements, not lines or generated assertions alone.

How to do it.

1. Select representative industrial code with documented functional requirements. The original benchmarks cannot be released because of non-disclosure agreements (Section 2.1, p. 3).
2. Split each functional requirement into explicit safety properties and bounded-response properties, recording the mapping and denominator.
3. Characterize code features that affect verification: globals, floating-point arrays, pointer dereferences, arithmetic, and bitwise operations. DSR/ECC contain 83/180 pointer dereferences and 35/77 scalar float variables (Table 1, p. 3).
4. Run every verifier under fixed hardware, memory, CPU, and timeout settings, collecting True, False, Unknown, reason, CPU time, memory, depth, and witness-validation result (Section 2.4, p. 7).
5. Report coverage and time per requirement, and keep bounded proofs distinct from unbounded proofs.

Verus form. Inference: construct the same denominator for a Rust/Verus benchmark by mapping each product requirement to one or more `ensures` clauses or `assert` properties. Record which properties are invariants and which require bounded temporal reasoning. Preserve unsupported features, such as floating-point and raw pointers, instead of silently replacing them with simpler models. Verus proof status should distinguish proved, counterexample, timeout, and modeling assumption.

Evidence and limits. The 179 total requirements (105 + 74) are the paper's complete benchmark denominator, but the source and verifier outputs are confidential. The authors state that “we cannot disclose the extracted benchmark data and verifier outputs” (Section 2.4, p. 7). Inference: independent replication can reproduce the methodology but not the exact per-property results without the artifact.

## technique 2: extend bounded model checking with tailored k-induction

What it is. CBMC unrolls loops to a bound and asks SAT whether a violation occurs. CBMC+k adds an induction step specialized to one outermost unbounded loop with a bounded body. The transformation creates a second program: nondeterministically initialize loop variables, assume the property before the loop body, execute one body iteration, and signal an error at iteration `k` when the property fails. The tool runs the base program and induction program; a base counterexample yields False, and a successful induction step after the base reaches k yields True (Section 2.3, pp. 6–7).

How to do it.

1. Start with CBMC 5.11 and a program with one main loop. The property must be checked at the end of every loop iteration (Section 2.3, p. 7).
2. Keep the original program as the base case; CBMC checks it for a counterexample up to increasing bounds.
3. Generate the induction program shown in Figure 1: set loop variables nondeterministically, add `VERIFIER_assume(property())`, increment the induction counter, execute `step()`, and call `__VERIFIER_error()` at `i == k && !property()`.
4. Run CBMC on both programs. If the base finds a violation, return False. If the base reaches k and the induction case has no violation, return True (Section 2.3, p. 6).
5. Inference: give both programs the same resource limits. The paper collects the reached BMC or k-induction depth and the witness validation result for every run (Section 2.4, p. 7).

Verus form. Inference: the direct Verus analogue is a loop invariant: use `invariant` clauses for the property and for any state relation needed to advance one iteration. The induction case is proved by a Verus `proof fn` over arbitrary loop state satisfying the invariant; the base case is the executable loop initialization. Verus does not use `__VERIFIER_error` or an external `VERIFIER_assume`; express assumptions as `requires`, and prove the body with `ensures`. For multiple nested or unbounded loops, the CBMC+k transformation does not carry over unchanged; use separate invariants and termination measures.

Evidence. CBMC+k verifies about 63% of the 179 requirements (Section 3, p. 8), compared with roughly 20% for CBMC and UltimateTaipan. Its coverage is 66 DSR and 38 ECC requirements after removing conflicts with BTC (Figure 7, p. 13); the raw Venn diagrams before removing conflicts show 73 DSR and 40 ECC definite results for CBMC+k (Figure 3, p. 9). The paper explicitly cautions: “CBMC+k should thus not be considered a generic, widely applicable extension of CBMC with k-induction” (Section 2.3, p. 7).

Failure and assumptions. The extension cannot handle arbitrary control flow, nested unbounded loops, or properties not checked at loop end. It inherits CBMC's state-space and floating-point limitations. Inference: an agent that automatically applies this pattern to Verus code must reject programs outside the shape instead of claiming an inductive proof.

## technique 3: validate results with witnesses and compare tools

What it is. Each verification run is followed by witness validation using CPAChecker and Ultimate, following SV-COMP rules. Results are True, False, or Unknown; validation is Correct, Invalid, or Unknown. The benchmark uses 12 open-source tools: 11 SV-COMP competitors plus CBMC+k (Section 2.2, p. 4). The experiment runs ten benchmarks in parallel, four cores and 18 GB per execution, with a two-hour CPU limit; violation witnesses have a 12-minute limit (Section 2.4, p. 7).

How to do it.

1. Run every selected verifier at the maintainers' default SV-COMP 2019 configuration. For CBMC, a wrapper invokes increasing `k` values; Ultimate uses a bit-precise memory model (Section 2.4, p. 7).
2. Record a result and resource reason, including timeout, memory exhaustion, verifier bug, or maximum depth.
3. Validate correctness and violation witnesses independently. Mark a witness Invalid when it is unparseable; the paper marks it Unknown when validation runs out of resources or its result differs from the original result (Section 2.4, p. 7).
4. Score verified and refuted properties using the SV-COMP scoring scheme, while reporting raw coverage separately.
5. Compare open-source results with BTC EmbeddedValidator only on the 143 tasks (out of 179) for which BTC returns a definite answer; treat BTC as a reference assumption, not a proven oracle (Section 4.2, p. 11).

Verus form. Inference: use Verus's proof checker as the primary witness validator, then add executable counterexample tests for False results. Keep solver success separate from semantic validation: a passing Verus proof still depends on the contract. For product benchmarking, report denominators for all requirements, proved requirements, and requirements with independently checked counterexamples. Do not treat an Unknown timeout as a failure of the property.

Evidence and contradictions. BTC reports DSR True 56.2%, False 21.9%, Unknown 21.9% over 105 tasks, and ECC True 55.4%, False 27.0%, Unknown 17.6% over 74 tasks (Table 3, p. 11). Thus BTC has definite results for 82/105 DSR and 61/74 ECC, totaling 143/179. For ECC, tools disagree on 18 requirements, about 24% of the 74-task denominator (Section 4.2, p. 13). Three DSR conflicts occur with BTC. For two of them, CBMC and CBMC+k found a counterexample at depth two against a bounded proof of depth 10 by BTC, on requirements involving floating-point equality; the authors say this “can be related to different intermediate floating-point precisions being used (e.g. 64 or 80 bits)”. No witness could be validated for any conflicting requirement (Section 4.2, p. 13). Inference: these numbers make “ground truth” a claim under assumption, not a fact established by an independent proof.

## technique 4: diagnose verifier and model boundaries

What it is. The paper analyzes why coverage is low and records concrete verifier bugs. Competition tools cover at most 20% of all 179 requirements, while CBMC+k reaches 63%; BTC's definite-result rate is 82/105 DSR and 61/74 ECC. The benchmark's difficulty is visible in 5,232 DSR and 10,096 ECC operations, including multiplication/division, bitwise operations, and pointer dereferences (Table 1, p. 3). The authors found a CBMC 5.11 bug on variables local to a switch block that produced spurious counterexamples, and a performance drop for induction in versions 5.9+ (Section 5, p. 14).

How to use it. Inference: before interpreting a failed proof, classify the cause: unsupported language feature, state-space exhaustion, timeout, verifier defect, spurious counterexample, bounded-only result, or disagreement about floating-point semantics. Re-run with witness validation and, when possible, a minimal reproducer. Report a tool's supported subset and version alongside every result.

Verus form.

Evidence and limits. The authors admit in the Epilogue that “the fact that our benchmarks are not publicly available is a weak point” (Epilogue, p. 15). Inference: tool-specific coverage therefore cannot be independently checked or generalized. The study's comparison with BTC also uses different hardware (Windows 7, 4 GB RAM, Intel i7-6700HQ) and a two-hour timeout, making performance incomparable; BTC is used only as a reference (Section 4, p. 11).

## what is proved, measured, and trusted

The paper proves no theorem about a model checker. It measures coverage, time, memory, witness validation, and conflicts under specified settings. Inference: its strongest methodological result is that small domain-specific preprocessing—CBMC+k—substantially improves coverage on this code shape. Trusted elements include each verifier, SAT/SMT solver, C front-end, floating-point model, hand-written requirement formalization, and the BTC “ground truth” assumption. Inference: the threat to an agent-written verified-Rust product is high when requirements are informal, numeric semantics differ from hardware, or unsupported features are abstracted away; the benchmark shows why proof counts alone are insufficient.

## techniques for the catalog

- requirement-grounded benchmarking: map industrial functional requirements to explicit invariant and bounded-response properties with fixed denominators
- tailored k-induction: transform a one-loop bounded model-checking task into base and nondeterministic induction programs
- witness validation: independently check True/False witnesses and classify Unknown, timeout, bug, and resource outcomes
- verifier-boundary diagnosis: compare tools while recording unsupported features, floating-point models, versions, and contradictory results
