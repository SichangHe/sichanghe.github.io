# Hydrozoan: Latency-Adaptive DAG Consensus under Mixed Byzantine and Crash Faults
(authored by agents unless marked 🧑)
Tag: `yu2026hydrozoan`, [paper](https://arxiv.org/abs/2609.25918)

## protocol and verification target
Hydrozoan is a DAG consensus protocol with a fast two-delay commit path and a direct three-delay fallback. It distinguishes `f` Byzantine faults from `c` crash faults and chooses a fast-path budget `p`; its committee size is `n = 3f + c + 2p + 1`. The paper says, “Hydrozoan is the first DAG protocol with a dual commit path under a hybrid fault model of f Byzantine and c crashed validators.” (Abstract, p. 1)

A wave has three rounds. A voting round and a decision round provide direct and indirect decision rules. The fast path uses a larger quorum that can avoid a remote tail when the deployment has enough nearby validators. If that quorum cannot be met, the direct path still commits in three delays. The paper says, “The safety and liveness of both protocols are machine-checked in Lean 4.” (Abstract, p. 1)

Inference: for Verus, the reusable pattern is a single transition system with multiple decision certificates, each carrying an explicit fault-budget condition. The safety theorem must relate certificates from different paths, rather than proving each path in isolation.

## technique 1: dual-path quorum rules

When to use: use dual paths when a low-latency quorum is valuable in healthy regions but a larger fault budget must continue to make progress after crashes or slow regions.

Steps from the paper:

1. Choose `f`, `c`, and `p` and set `n = 3f + c + 2p + 1`; define round, certificate, and fast quorums from those parameters (Sections IV-B and Table I, pp. 4–5).
2. Organize blocks into three-round waves and classify leader, voting, and decision blocks (Section IV-A, p. 4).
3. For a direct decision, inspect voting and decision blocks, test leader votes and certificates, and commit when the direct threshold is met; otherwise skip or remain undecided (Algorithm 1, p. 5).
4. For an indirect decision, follow a committed anchor into later rounds, collect certificate or graded fast evidence, and commit the unique leader supported by the evidence (Algorithm 2, pp. 5–6).
5. String decisions into a commit log in slot order, linearizing sub-DAGs deterministically (Algorithm 3, p. 6).
6. If crashes remove the fast quorum, use the direct path; the paper's design commits in two delays while the fast quorum survives and three afterwards (Section VIII-D, p. 13).

Verus form (Inference): model blocks, parent links, votes, and certificates as immutable ghost or specification data. Define `spec fn` predicates for `IsVote`, `IsCertificate`, `IsFastEvidence`, and each decision relation. Use `requires` to enforce distinct-author and fault-bound assumptions and `ensures` to connect a returned commit to a certificate. A proof function can show that two conflicting certificates cannot both satisfy quorum intersection. Runtime Rust should return a certificate object, while the proof checks its abstract DAG view.

Evidence: with `n = 50`, `(f,c,p)=(6,6,12)` is balanced, `(11,0,8)` Byzantine-only, `(2,13,15)` crash-heavy, and `(6,8,11)` graded (Section VIII, p. 10). At 10k transactions/s, balanced Hydrozoan matches Orcaella within 1 ms when both fast quorums fit nearby validators; at 100k transactions/s all DAG protocols sustain the 100k input cap (Section VIII-B, pp. 10–11). With nearby crashes, Hydrozoan continues on its direct path to its liveness bound of 14 crashes for `(6,8,11)`, while the comparable two-round-only DAG stalls at 11 (Section VIII-D, p. 13).

Failure and assumptions: the fast path only survives `p` faults; the direct path carries the remaining `f+c` budget. The proofs assume the paper's DAG validity and fault model. The deployment experiments use one Byzantine strategy, an equivocating leader, and do not cover arbitrary adversarial behavior (Section VIII, p. 10). Inference: a Verus integration must state which network, cryptographic, and message-delivery assumptions are trusted.

## technique 2: machine-check safety and liveness with generated proofs

When to use: use a theorem prover when quorum arithmetic, equivocation cases, and eventual progress are too subtle for tests alone.

The Lean development defines the block universe, validator authors, fault bounds, leader schedule, thresholds, and decision predicates. It states safety over every admitted fault configuration and pair of local DAG views, then proves agreement and validity. Liveness is conditional on synchrony, a fair schedule, and the validity rule. The paper says, “The development contains no sorry and relies on no axioms beyond Lean’s three standard ones (propositional extensionality, quotient soundness, and choice).” (Appendix C, p. 15)

Steps: write definitions and theorem statements for the protocol; separate them from proof files; prove helper lemmas about quorum intersections and block ancestry; prove direct and fast-path exclusion lemmas; prove agreement and validity; then prove liveness under the stated timing and scheduling hypotheses. The authors say each protocol has about a thousand lines of definitions and statements, while the generated proofs are a few thousand lines and are checked by Lean's kernel (Appendix C, p. 15).

Verus form (Inference): keep theorem statements as `spec fn` predicates and prove arithmetic and set-intersection lemmas in `proof fn`s. Use `assert forall` for distinct-author counting where appropriate and `ensures` to expose certificate properties. Do not mark the algorithm under verification `external_body`; only an adapter to networking or cryptography may be outside the model. A Verus proof can establish safety invariants and certificate uniqueness, but liveness requires an explicit scheduler or fairness model.

Evidence: every lemma in Appendices A and B and liveness of both protocols is machine-checked in Lean 4 on Mathlib (Appendix C, p. 15). The Rust committer implements the same pseudocode procedures, and the paper says the pseudocode “bridges the two artifacts” (Appendix C, p. 15). This is a proof-to-code correspondence argument, not a formal proof of the entire Rust networking stack.

Failure and assumptions: liveness hypotheses about message delivery, synchrony, and population are out of scope for the Lean model; the paper says liveness is exactly as strong as those hypotheses (Appendix C, p. 20). AI generated the proof scripts, but the kernel checked them. Inference: generated proofs reduce authoring effort but do not reduce trust in definitions, theorem statements, or the prover kernel.

## technique 3: configure latency from topology and fault observations

When to use: use a parameter rule when quorum placement affects latency and operators can estimate slow-region size and simultaneous faults.

The paper's provisioning rule chooses `p ≥ t + x`, where `t` is the size of the slowest region to avoid and `x` is the number of simultaneous faults the fast path should survive; the direct path covers the remaining `f+c ≥ p` budget (Section IX, p. 14). Steps are: measure or estimate the remote tail; choose the fast-path budget; solve the committee-size equation; deploy with those thresholds; and change parameters only at an epoch boundary, which the paper leaves out of scope (Section IX, p. 14).

Verus form (Inference): encode provisioning as a pure `spec fn` over topology and fault parameters and prove that resulting quorums satisfy the inequalities required by the decision lemmas. Validate runtime configuration against the proved bounds before starting a committee. Do not infer network latency from the proof; it remains a deployment measurement.

Evidence: with `(f,c)=(6,6)` and `n=50`, sweeping `p` makes latency a step: 290–292 ms for `p≤7` and 248–255 ms for `p≥8`, because the 8-validator Tokyo tail is then excluded from the fast quorum (Section VIII-C, p. 12). Fault-free Hydrozoan at `n=10` commits in 215 ms at 10k tx/s and 268 ms at 100k, versus Mysticeti's 271 and 322 ms (Section VIII-E, p. 14). At `n=50`, the saving is about 80 ms, approximately 25% at 10k and 21% at 100k (Section VIII-B, p. 11).

Failure and assumptions: these numbers use a three-region cloud deployment, 50 validators, p50 latency with p90 whiskers, and shared DAG engines. They do not establish performance under other topologies or workloads. Inference: VL should treat topology-specific thresholds as configuration evidence, not a universal latency theorem.

## what is proved, measured, and trusted

Lean proves the stated safety and conditional liveness properties for the abstract DAG model. The Rust evaluation measures throughput, p50/p90 latency, fault injection, and simulator scenarios; all baselines share the same DAG engine, so reported differences target decision rules. Trusted components include Lean's kernel and standard axioms, the theorem statements and model definitions, cryptography and networking, the Rust committer, and the validity/fairness hypotheses. The implementation is not fully verified end to end.

Inference: the main threat to an agent-written verified Rust product is a mismatch between abstract certificate rules and runtime block handling. A proof can pass while serialization, signatures, parent retention, or timeout handling violates the modeled assumptions.

## what VL should reuse and what it should not redo

Inference: VL should reuse certificate-carrying decisions, explicit fault-budget parameters, path-exclusion lemmas, and a proof-to-code bridge where pseudocode procedures map directly to implementation functions. It should not redo a generic two-versus-three-delay benchmark without a new fault model or implementation boundary; Hydrozoan already measures 10- and 50-validator deployments, 10k and 100k transaction rates, crash sweeps, and an equivocating-leader simulation.

## techniques for the catalog

- dual commit paths — race a fast quorum against a direct fallback so latency adapts to topology and faults
- certificate-based safety — represent votes and ancestry as explicit predicates and prove conflicting certificates impossible
- machine-checked liveness — prove eventual decision under explicit synchrony, fairness, and validity assumptions
- generated-proof workflow — separate audited definitions and theorem statements from kernel-checked generated proof scripts
- topology-driven provisioning — choose fast-path budget from slow-region size and simultaneous-fault targets
Checked 2026-10-15 against paper yu2026hydrozoan: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
