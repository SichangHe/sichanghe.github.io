# Invariant Discovery for Networked Systems
(authored by agents unless marked 🧑)
Tag: `he2026invariant`, [paper](https://arxiv.org/abs/2607.22944)

## scope and result

Hè, Krentsel, Ratnasamy, and Apostolaki present Autogram, which separates semantic grammar design from deterministic invariant search. The abstract states, “Our key idea is to partition the invariant search problem into an AI-driven grammar ‘discovery’ problem, followed by a statistics-driven ‘search’ problem within the learned grammar.” (abstract, p. 1). An LLM sees variable names and operator metadata and proposes a bounded, typed grammar; it never sees measurements and never asserts that a relation holds. A deterministic engine exhaustively enumerates that grammar, uses a solver to remove trivial or contradictory candidates, and applies statistical tests to accept soft invariants.

A soft invariant is a typed relation that holds on most snapshots within a tolerance, with a hold-rate between zero and one (section 2, p. 2). This matters because network counters contain noise and systematic offsets. The paper's example is `outX ≈ egress(X→Y) + egress(X→Z)`, requiring types, locality, variable-arity sums, and approximate equality (section 1, pp. 1–2).

## technique: bounded grammar induction

How to apply it. (1) Treat counters as named, typed variables and collect metadata such as topology, role, and vendor. (2) Send only names and metadata to an LLM with a fixed output schema. (3) Parse and type-check the returned grammar before any measurements are touched. (4) Reject malformed or ill-typed productions. (5) Enumerate the resulting bounded hypothesis space. The paper says, “The LLM proposes only the grammar, never an invariant, and everything downstream is deterministic and provable.” (introduction, p. 2).

If known invariants on a held-out split are missed, re-invoke the LLM to produce a strictly more expressive grammar with additional aggregations or higher-degree terms. The data remains outside the LLM. The authors describe this as grammar re-induction (section 3, p. 4).

Verus form. Inference: encode grammar productions as an enum and prove a well-typedness predicate over every generated candidate. The LLM response should be treated as untrusted input parsed by executable Rust; Verus can prove that accepted grammar objects satisfy schema and type invariants, but it cannot prove semantic adequacy of the model's proposal.

## technique: exhaustive candidate generation and solver pruning

After grammar construction, Autogram enumerates the entire bounded space identically on every run and keeps one representative per logical-equivalence class. For each candidate it asks a solver whether the relation is trivial, contradictory, or entailed by a single retained invariant. Set-level redundancy involving several invariants is handled empirically because the solver does not decide it (section 3, pp. 4–5).

Steps are: generate every typed expression; reject ill-typed terms; solver-check validity and contradiction; remove logically redundant candidates; retain survivors for statistical testing. This makes the search auditable and reproducible, but only within the current grammar and solver decidability ceiling.

Verus form. Inference: represent candidate formulas as ghost syntax and prove enumeration coverage relative to a finite grammar. A `proof fn` can establish that a pruning rule preserves equivalence under a supplied semantics. The solver's validity result still needs a checked certificate or remains a trusted component.

## technique: residual-derived tolerances and confidence acceptance

Autogram does not use one hand-set tolerance. For each candidate, it computes residuals over observations; the edge of the residual cluster gives a per-candidate tolerance, described as a capped conformal band with held-out coverage (section 3, p. 4). A candidate then needs a conservative confidence interval for its hold-rate and must clear a generic acceptance bar calibrated independently.

How to apply it. (1) Split data into fitting and held-out observations. (2) Estimate each candidate's residual distribution and derive its tolerance. (3) Compute hold-rate on held-out data. (4) Use the confidence bound, rather than a point estimate, for acceptance. (5) Calibrate generic confidence knobs on synthetic datasets containing planted relations, injected noise, and null datasets; never tune them on the target invariant catalog. This controls false discovery without peeking at answers (section 3, pp. 4–5).

Verus form. Inference: model residuals, tolerances, and hold-rate as mathematical sequences and prove arithmetic and partition invariants. Verus can verify deterministic calculations and bounds, but statistical confidence is only as sound as the distributional assumptions and calibration data.

## technique: monotone completeness within the grammar

The authors claim three properties for the deterministic stage. Exhaustive enumeration gives determinism. Solver screening plus confidence acceptance gives soundness relative to the solver and data assumptions. Monotone completeness means any unknown invariant that holds at least as often and on at least as much data as a known accepted one is accepted too, because the confidence bound is monotone (section 3, p. 5). The paper says these properties are sketched and defers formal proofs to future work; they are therefore claims, not established theorems.

## evidence and denominator checks

The public evaluation uses Abilene and GEANT WAN traffic-matrix snapshots packaged in CrossCheck format, plus a production WAN with O(100) routers and O(1000) links (section 4, pp. 5–6). Figure 3 reports 100% recall of the expert catalog for Autogram on both Abilene and GEANT; NetNomos reaches 19.8% on Abilene and 15.1% on GEANT. Table 1 reports production hold-rates: two-end counter agreement 96.5%; router and network flow conservation 92.3–97.5%; non-negativity and zero self-demand 100%; topology and demand presence symmetry 92.4–97.3%; demand conservation termination 73.2%; origination 68.6%. These percentages are hold-rates for the listed invariant families, not percentages of benchmarks or candidates.

The paper reports that NetNomos emits 1,645 rules on GEANT, including 946 vacuous disjunctions, with only 27 matching a known invariant, whereas Autogram reaches full recall with 101 rules (section 4, p. 6). On the production WAN, Autogram discovers 41 invariants end to end in ten minutes from counter names alone (section 4, p. 6). The authors also report false positives: “Autogram also accepts a few relations that are not really invariants” (section 4, p. 6). No denominator for “a few” is given, so a false-discovery rate cannot be computed from the paper.

## proved, measured, and trusted

The system measures recall, hold-rate, rule counts, and runtime on the stated datasets. It does not provide formal proofs of the claimed guarantees, a complete false-discovery denominator, or evidence that metadata is correct. The LLM grammar proposal, variable annotations, solver implementation, confidence calibration, residual assumptions, and expert catalog are trusted inputs or components.

## techniques for the catalog

- metadata-only grammar induction — ask an LLM for a bounded typed grammar from names and annotations
- grammar re-induction — widen the grammar when held-out known-invariant recall stalls
- exhaustive typed enumeration — generate every candidate and retain equivalent representatives
- solver pruning — remove trivial, contradictory, or singly entailed relations
- residual-derived tolerance — infer a per-candidate soft tolerance from residuals
- calibrated confidence acceptance — accept only when held-out hold-rate clears a proxy-calibrated bound
- monotone completeness claim — use an accepted invariant as a threshold for candidates with at least its coverage
