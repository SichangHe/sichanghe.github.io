# Detecting Critical Bugs in SMT Solvers using Blackbox Mutational Fuzzing
(authored by agents unless marked 🧑)
Tag: `mansur2020storm`, [paper](https://arxiv.org/abs/2004.05934)

## scope and threat

Mansur, Christakis, Wüstholz, and Zhang present STORM, a black-box mutational fuzzer for SMT solvers. A critical class-A bug is an incorrect `unsat` result for a satisfiable formula; a verifier trusting that result can prove false safety claims. STORM mutates realistic existing SMT instances while preserving satisfiability by construction, then treats an `unsat` response as an oracle. “We present STORM, a novel blackbox mutational fuzzing technique for detecting critical bugs in SMT solvers.” (Abstract, PDF p.1)

This is directly relevant to Verus because Verus translates proof obligations to SMT and trusts solver answers. Inference: STORM-style regression testing can detect solver unsoundness that would threaten verified Rust, but it cannot prove that a particular solver version is sound.

## technique 1: seed fragmentation

Input is a seed SMT-LIB instance S. STORM extracts every assertion and recursively fragments Boolean formulas into sub-formulas. It creates a random assignment M to free variables, evaluates each fragment, and stores each fragment with its truth value in an initial pool. The paper says: “The first phase, seed fragmentation, takes as input a seed SMT instance S.” (Section 2, PDF p.2)

Steps (Section 3.1, PDF pp.3–4). (1) Parse assertions from S. (2) Generate a random model using a separate solver. (3) Recursively split each predicate tree until leaves or a depth bound Dmax. (4) Evaluate every retained fragment under M. (5) Insert formula and valuation pairs into `Pinit`. This reuses domain-specific atoms from real benchmarks instead of generating every theory construct from a grammar.

## technique 2: valuation-preserving formula generation

STORM builds a construction pool by randomly combining formulas from the initial and construction pools with AND or NOT. It computes the new valuation from operand valuations, retaining formulas up to Dmax. AND and NOT are functionally complete, so arbitrary Boolean structure can be synthesized while all truth values remain known. The authors state: “This set of operators is functionally complete, thus allowing us to generate any Boolean formula.” (Section 3.1, PDF p.4)

Use it as follows. (1) Select f1 with valuation v1. (2) Select AND and a second f2, set f=f1∧f2 and v=v1∧v2; or select NOT, set f=¬f1 and v=¬v1. (3) Reject formulas beyond Dmax. (4) Add the pair to `Pconstr`. Keep separate pools so the frequency of seed fragments and constructed formulas can be controlled in generated instances. This creates nontrivial Boolean mutations without a complete grammar.

## technique 3: satisfiable instance generation and oracle

To create each test instance, STORM chooses a random number of assertions up to Amax and samples formulas from both pools. If a selected formula's valuation is false, it asserts its negation; if true, it asserts the formula. Every assertion is therefore true under M, so the whole instance is satisfiable. STORM invokes the solver under test. An `UNSAT` response is a class-A critical bug. “The oracle reveals a critical bug if the solver returns UNSAT.” (Section 3.1, PDF p.4)

The key advantage is a single-solver oracle: differential testing is unnecessary because satisfiability is known by construction. Inference: use this to test the solver configuration used by Verus, especially QF_ABV bitvector/array obligations, while retaining the exact solver version, options, and translation pipeline as the test setting.

## technique 4: depth minimization

Bug-revealing instances can be huge. STORM minimizes them by binary-searching the formula depth bound while preserving a bug. `MinimizeDepth` tests midpoint D, keeps the smallest bug-revealing instance if any is found, and recursively narrows the interval; it returns when Dmax≤Dmin (Algorithm 2, Section 3.2, PDF p.5). This differs from ordinary crash minimization because the minimized instance must remain satisfiable while still causing the buggy solver to return `unsat`.

The experiment minimized 19 STORM-generated bugs. Binary-search minimization achieved a median size reduction of 86.1%; adapted ddSMT sometimes produced smaller instances but failed on constructs such as `str.to.re` and `check-sat-using` (Section 5.5, PDF p.9). A second solver version known to be fixed was used to reject minimizations that lost satisfiability, so that minimization step has its own trusted solver assumption.

## technique 5: incremental mode and configuration search

STORM can generate instances with push/pop constraints for solver incremental mode. The implementation chooses AND versus NOT with probability 50%, chooses the initial pool with probability 30% and the construction pool otherwise, and samples assertion counts uniformly up to Amax (Section 4, PDF p.6). Researchers vary Dmax and Amax, then report median iterations and time to expose bugs. Figure 4 shows that larger bounds can reduce iterations; Figure 5 reports the corresponding seconds.

These choices are engineering parameters, not correctness guarantees. The implementation uses Z3's Python API both for formula manipulation and random predicate valuation, and therefore supports logics accepted by Z3 and the paper's SMT-LIB extension. The authors note that wrong Z3 models do not affect the fuzzer's principle if valuations are correct, but their implementation still relies on Z3 for those valuations.

## evidence and denominators

The evaluation tested seven mature solvers over 43 logics, with 193,586 seed instances in Table 2. STORM found 29 previously unknown, unique, developer-confirmed critical bugs in three solvers (nine variants) and 15 logics; 19 of the 29 were fixed in the latest versions (Section 5.5, PDF p.8). The bugs were found only in generated mutations, not unchanged seeds. For known-bug reproduction, the study considered CVC4, Yices2, and Z3 because they had fixed reports in the Nov. 15, 2019–Feb. 15, 2020 window: 6, 1, and 14 bugs respectively after excluding the authors' own reports. It reproduced 6 of 21 selected bugs (one CVC4, one Yices2, four Z3) under the tested configurations (Section 5.5, PDF pp.8–9).

For coverage, 20 seed instances (five each from four Z3 logics) generated 500 instances per logic. Compared with 10,054 SMT-COMP 2019 seeds, the 500 generated instances added 2,958 lines and 1,149 functions of coverage (Table 5, PDF p.10). The paper's threats are seed and solver selection: results may not generalize to unsupported theories or other seeds.

## what is proved, measured, and trusted

No theorem proves STORM's completeness. Measured outputs are bugs found, reproduction rates, minimization sizes, time/iteration medians, and code coverage. Trusted components include the separate valuation solver, SMT-LIB parser and mutation code, solver versions used as references, the satisfiability-preserving model argument, and the assumption that reported `unsat` results are genuinely wrong. A critical solver bug can invalidate a Verus proof even when Rust code and specifications are correct.

Inference: VL should not redo generic black-box SMT fuzzing; STORM already establishes the method and broad evidence. It should instead add a Verus-specific campaign: collect actual translated obligations, preserve satisfiability with an independent checker where possible, run the exact Z3 configuration used in CI, minimize every disagreement, and track whether a solver update changes proof outcomes. This directly measures product threat while keeping the solver, translation, and proof-checking trust boundaries explicit.

## techniques for the catalog

- seed fragmentation — recursively extract valued sub-formulas from real SMT-LIB seeds
- valuation-preserving mutation — build Boolean formulas with AND/NOT while retaining known truth values
- satisfiable-by-construction oracle — negate false-valued assertions so `unsat` identifies a solver bug
- depth minimization — binary-search formula depth while preserving satisfiability and the incorrect result
- incremental-mode fuzzing — generate push/pop variants and vary depth/assertion bounds to probe solver configurations
Checked 2026-10-15 against paper mansur2020storm: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
