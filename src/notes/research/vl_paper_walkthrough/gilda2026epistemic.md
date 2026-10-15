# AI-Assisted Engineering Should Track the Epistemic Status and Temporal Validity of Architectural Decisions
(authored by agents unless marked 🧑)
Tag: `gilda2026epistemic`, [paper](https://arxiv.org/abs/2601.21116)

## scope and central claim

This position paper proposes the First Principles Framework (FPF) for recording the reliability, context, and age of engineering decisions made with AI assistance. It explicitly says: “This paper does not propose a specific tool or evaluate a system.” (Introduction, p. 2) Its contribution is a formal vocabulary and candidate implementation rules, plus a retrospective audit of two internal projects. FPF has three requirements: explicit epistemic layers, conservative assurance aggregation, and mechanical evidence-decay alerts (abstract, p. 1).

The paper's F-G-R tuple assigns each claim a Formality level F0–F3, a Scope path/tag set, and Reliability R. Formality ceilings are F0 70%, F1 85%, F2 95%, and F3 100%; epistemic layers cap reliability at L0=.35, L1=.75, and L2=1.0 (§2.1, pp. 2–3). Congruence levels CL3 through CL0 apply no penalty, 10%, 40%, and 90% when evidence moves from the same context to an unrelated one (§2.1, p. 3). The paper's implementation is described as an MCP server with SQLite persistence, holons, evidence timestamps, dependency relations, and waivers (Appendix B, p. 15).

## technique 1: explicit epistemic layers and the ADI cycle

what it is: FPF separates conjecture (L0), logically substantiated claims (L1), and empirically corroborated claims (L2). Its Abduction–Deduction–Induction (ADI) cycle generates a hypothesis, checks consistency, and then gathers evidence (§2.4, p. 6).

when to use it: Use the cycle for consequential decisions whose rationale may be repeated by an AI assistant. Trivial, reversible choices can skip FPF; the paper argues that database, authentication, and data-model choices justify the overhead (§3.1, p. 9).

how to do it:

1. abduction: record candidate explanations as L0 hypotheses (§2.4, p. 6)
2. deduction: check logical consistency and known constraints; promote a passing hypothesis to L1 (§2.4, p. 6)
3. induction: run benchmarks, inspect logs, or survey users; promote an empirically validated claim to L2 (§2.4, p. 6)
4. write a Design Rationale Record containing the decision, evidence validity windows, dependency chain, and assurance score (§2.4, p. 6)
5. on a new anomaly or evidence expiry, re-enter the cycle (§2.4, p. 7)
6. enforce the Transformer Mandate: the finalizer is outside the generation loop; the paper says, “an LLM may propose hypotheses and gather supporting evidence (Abduction and Induction), but ratification requires an external verifier.” (§2.4, p. 6)

Verus form (Inference): represent each decision as a Rust enum for L0/L1/L2 and a record carrying scope and evidence identifiers. Use `requires` to restrict promotions (for example, L1 requires a checked consistency certificate) and `ensures` to state that a promotion preserves the layer invariant. Proof functions can connect an evidence certificate to a finite decision record. A verifier call should return an explicit result that the runtime can inspect; proof functions are erased and must not be called as runtime operations. Verus can check data-structure invariants and promotion logic, but it cannot independently establish that a benchmark is representative or that an LLM's English hypothesis is true.

evidence and limits: The paper's audit found 14 stale decisions among 62 ADRs over two months, with 12 discovered reactively and two only during the audit (Table 7, p. 11). This supports the existence of staleness, not the superiority of FPF: the authors call the proactive result counterfactual and acknowledge self-study and window-calibration bias (§4.4, p. 11). Inference: the external-verifier rule is an architectural safeguard against self-citation, not a measured reduction in defects.

## technique 2: weakest-link (WLNK) assurance aggregation

what it is: FPF uses the Gödel t-norm, `Γ(S)=min(S)`, for serial evidence chains. Its quintet of required invariants is identity, commutativity, locality, weakest-link upper bound, and monotonicity (§2.2, p. 3). The paper states: “Theorem 1 (Quintet Satisfaction). The Gödel t-norm Γ(S) = min(S) satisfies all five invariants.” (p. 3)

when to use it: Apply WLNK to serial dependencies where failure of any premise invalidates the conclusion. The paper explicitly marks parallel redundant evidence and independent evidence as cases where the weakest-link rule is not valid (§2.3, p. 5).

how to do it:

1. score each evidence item R in [0,1]
2. subtract the congruence penalty and apply the zero floor (§2.1, p. 3)
3. compute the minimum of adjusted evidence, dependency scores, layer ceiling, and formality ceiling using equation (2) (§2.3, p. 4)
4. expose the minimum item as the remediation target; the Redis example raises Reff from .70 to .90 by replacing the weak traffic-model evidence with an F2 load test (§2.3, pp. 4–5)

Verus form (Inference): write a pure `spec fn` for minimum over a finite sequence and prove bounds, weakest-link, and monotonicity with proof functions. A runtime calculator can return the minimum and its index; `ensures` should relate that index to the returned score. Use `assert` or arithmetic lemmas for the finite fold. The paper's min rule is easy to specify, but choosing whether dependencies are serial, parallel, or independent remains outside this arithmetic proof.

evidence and limits: Property-based testing ran 10,000 iterations for bounds, WLNK, formality ceiling, layer ceiling, and monotonicity; all passed. Fuzzing ran 50,000 iterations over NaN, infinity, subnormal, negative zero, out-of-range values, and rounding, with zero panics (Appendix C, pp. 15–16). These tests check the assurance calculator implementation, not the truth of an evidence score. The authors concede that min is over-conservative for independent evidence and propose topology-aware alternatives (§3.5, p. 12).

## technique 3: formality, scope, and congruence ceilings

what it is: FPF prevents reliability inflation by capping claims according to how they were produced and where evidence came from. F0 “Informal” observations cap at 70%, F1 structured ADRs at 85%, F2 empirical load tests at 95%, and F3 formal proofs at 100% (Table 1, p. 2). Scope is a path and tags such as `perf [prod, arm64]`; CL penalties then adjust transfer (§2.1, pp. 2–3).

how to do it:

1. label each evidence item with F0–F3 and a scope path/tags (§2.1, p. 2)
2. select a congruence level by comparing evidence scope with decision scope (§2.1, p. 3)
3. subtract the CL penalty, floor at zero, then apply layer and formality ceilings (§2.1, p. 3)
4. aggregate the adjusted values with WLNK (§2.3, p. 4)

Verus form (Inference): make formality and congruence finite enums and define total `spec fn`s for their ceilings and penalties. Prove that every calculated reliability is at most both ceilings and never below zero. This is a suitable Verus boundary because the policy is finite and numerical; whether two real deployments are “similar context” is an external classification assumption.

limits: A formal proof can still be paired with a weak blog premise, yielding the minimum .70 in the paper's TLA+/Jepsen/blog example (§3.4, p. 10). Inference: FPF does not make a decision correct; it makes the weakest documented support visible.

## technique 4: evidence decay and stale-decision alerts

what it is: Every evidence item receives a `valid until` timestamp. After expiry, FPF sets effective reliability to 0.1, emits a STALE alert, and offers re-validation, documented waiver, or deprecation (§2.5, pp. 7–8). The paper's formal rule is `Reff(e,t)=R(e)` while `t≤valid_until(e)` and `0.1` otherwise (equation 4, p. 7).

how to do it:

1. store evidence, reliability, validity window, and dependent decisions (§2.5, p. 7; Appendix B, p. 15)
2. compare current time to each `valid_until` timestamp
3. on expiry, set the evidence to the 0.1 uncertainty floor and propagate the change through WLNK (§2.5, p. 7)
4. alert owners with three actions: re-run the benchmark, waive with rationale, or deprecate the decision (Figure 4, p. 8; Appendix C, p. 16)

Verus form (Inference): specify time comparison and the decay function in `spec fn`s, with `requires` bounding timestamps and reliabilities and `ensures` stating the live/expired cases. Use a proof function to show that an expired dependency cannot increase a decision's minimum. Runtime clock correctness and timestamp authenticity remain trusted inputs.

evidence: In the 62-ADR audit, 14 decisions (about 23%) were stale, 12/14 (86%) were discovered reactively, and the average reactive debugging time was 4.2 hours (Tables 7–8, p. 11). The paper says all 14 “would have triggered proactive alerts,” but labels this a counterfactual estimate (§4.2, p. 11). Inference: the measured result is retrospective staleness; the saved time and prevented incidents remain unmeasured.

## technique 5: SMT-based claim validation and property-based checking

what it is: The paper proposes expressing quantitative claims such as throughput, latency, and CPU limits as SMT constraints; SAT is treated as F3 evidence and UNSAT as an inconsistency signal (§5.3, p. 12). It separately uses property-based tests to check the calculator's invariants (§4.5, p. 12).

how to do it:

1. translate a quantitative claim into solver constraints (§5.3, p. 12)
2. run an SMT solver; record SAT evidence or UNSAT inconsistency (§5.3, p. 12)
3. independently generate random calculator inputs and assert bounds, ceilings, WLNK, and monotonicity (§4.5, p. 12)

Verus form (Inference): encode arithmetic claim predicates as `spec fn`s and call solver-supported `assert` goals; use `bit_vector` only for bit-vector properties and ordinary arithmetic lemmas for real/integer bounds. Property-based tests can remain executable smoke tests, while the contract proves the finite calculator semantics. Verus cannot convert an arbitrary operational throughput claim into a sound model without trusted measurements and assumptions.

## trust boundary, prior work, and VL threat

The paper proves the min operator's five mathematical invariants and reports implementation tests, but it does not evaluate a deployed FPF tool; its reference server is “an existence proof, not the contribution itself” (Introduction, p. 2). Trusted elements include evidence scores, scope labels, expiry windows, timestamp sources, topology classification, and the external verifier. Inference: a Verus proof can harden the record schema, decay propagation, and calculator, while these inputs remain outside the proof unless independently attested.

The audit and framework already cover explicit evidence layers, weakest-link aggregation, validity windows, dependency graphs, and SMT/property-based checks. Inference: VL should not redo these as generic product claims. A distinct contribution would be integrating them with Verus proof artifacts: for example, attaching exact proof hashes and solver configurations to F3 evidence, or proving that generated Rust contracts cannot silently retain expired assumptions.

Inference: threat to a product of agent-written verified Rust is high at the epistemic and temporal boundary. Verus can establish that code meets its written contract; it cannot ensure the contract's assumptions remain valid after dependency, hardware, or workload changes. FPF's 14/62 stale decisions and its explicit 0.1 decay rule provide a practical model for surfacing that risk. The framework's position-paper status and two-project self-audit mean the magnitude is a warning signal, not a product-level failure rate.

## techniques for the catalog

- ADI epistemic cycle — move claims from hypothesis through logical checking to empirical corroboration and record the decision externally
- WLNK aggregation — compute serial-dependency assurance as the minimum adjusted evidence score under five invariants
- F-G-R ceilings — cap reliability by formality, scope congruence, and epistemic layer
- evidence decay — attach validity windows, lower expired evidence to 0.1, and alert for re-validation, waiver, or deprecation
- SMT and property checks — validate quantitative constraints with SMT and test calculator invariants with generated inputs
Checked 2026-10-15 against paper gilda2026epistemic: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
