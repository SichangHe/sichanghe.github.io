# Detecting Critical Bugs in SMT Solvers using Blackbox Mutational Fuzzing
(authored by agents unless marked 🧑)
Tag: `mansur2020storm`, [paper](https://arxiv.org/abs/2004.05934)

## scope and threat

Mansur, Christakis, Wüstholz, and Zhang present STORM, a black-box mutational fuzzer for SMT solvers. A critical class-A bug is an incorrect `unsat` result for a satisfiable formula; a verifier trusting that result can prove false safety claims. STORM mutates realistic existing SMT instances while preserving satisfiability by construction, then treats an `unsat` response as an oracle. The abstract says: “we present STORM, a novel blackbox mutational fuzzing technique for detecting critical bugs in SMT solvers.” (Abstract, PDF p.1)

Inference (the Verus link is not in the paper): this is relevant to Verus because Verus translates proof obligations to SMT and trusts solver answers. STORM-style regression testing can detect solver unsoundness that would threaten verified Rust, but it cannot prove that a particular solver version is sound.

## technique 1: seed fragmentation

Input is a seed SMT-LIB instance S. STORM extracts every assertion and recursively fragments Boolean formulas into sub-formulas. It creates a random assignment M to free variables, evaluates each fragment, and stores each fragment with its truth value in an initial pool. The paper says: “The first phase, seed fragmentation, takes as input a seed SMT instance S.” (Section 2, PDF p.2)

Steps (Section 3.1 and Algorithm 1, PDF p.4). (1) Parse assertions from S. (2) Generate a random model using a separate solver (different from the one under test; the paper uses Z3 for this, Section 4). (3) Iterate over all predicates (tree-shaped Boolean sub-formulas) of the seed, keeping those whose tree depth does not exceed a bound Dmax. (4) Evaluate every retained fragment under M. (5) Insert formula and valuation pairs into `Pinit`. This reuses domain-specific atoms from real benchmarks instead of generating every theory construct from a grammar.

## technique 2: valuation-preserving formula generation

STORM builds a construction pool by randomly combining formulas from the initial and construction pools with AND or NOT. It computes the new valuation from operand valuations, retaining formulas up to Dmax. AND and NOT are functionally complete, so arbitrary Boolean structure can be synthesized while all truth values remain known. The authors state: “Note that this set of operators is functionally complete, thus allowing us to generate any Boolean formula.” (Section 3.1, PDF p.4)

Use it as follows. (1) Select f1 with valuation v1. (2) Select AND and a second f2, set f=f1∧f2 and v=v1∧v2; or select NOT, set f=¬f1 and v=¬v1. (3) Reject formulas beyond Dmax. (4) Add the pair to `Pconstr`. Keep separate pools so the frequency of seed fragments and constructed formulas can be controlled in generated instances. This creates nontrivial Boolean mutations without a complete grammar.

## technique 3: satisfiable instance generation and oracle

To create each test instance, STORM chooses a random number of assertions between 1 and Amax (Algorithm 1, line 35) and samples formulas from both pools. If a selected formula's valuation is false, it asserts its negation; if true, it asserts the formula. Every assertion is therefore true under M, so the whole instance is satisfiable (the paper says all new instances are satisfiable by construction). STORM invokes the solver under test. An `UNSAT` response is a class-A critical bug. “The oracle reveals a critical bug if the solver returns UNSAT.” (Section 3.1, PDF p.5)

The key advantage is a single-solver oracle: differential testing is unnecessary because satisfiability is known by construction. Inference (VL use, not in the paper): use this to test the solver configuration used by Verus, especially QF_ABV bitvector/array obligations, while retaining the exact solver version, options, and translation pipeline as the test setting.

## technique 4: depth minimization

Bug-revealing instances can be huge. Instead of delta debugging, STORM reruns its own fuzzer on a buggy seed to find the minimum Dmax and Amax that still reveal a critical bug. Binary search first minimizes the number of assertions and then the depth of asserted formulas. `MinimizeDepth` (Algorithm 2) tests midpoint D = (Dmin+Dmax)/2; if the fuzzer reports bug-revealing instances it recurses on the one with the smallest depth with bound D, otherwise it recurses on [D+1, Dmax]; it returns when Dmax≤Dmin (Section 3.2, PDF p.5). This differs from ordinary crash minimization because the minimized instance must remain satisfiable while still causing the buggy solver to return `unsat`.

Table 4 lists instances for 19 bugs (RQ4, Section 5.5, PDF pp.8–10). The paper reports “median reduction of 86.1%” for its binary-search minimization (PDF p.9). Where both procedures produced results, the ddSMT-based procedure gave smaller instances. ddSMT could not minimize bugs 2, 3, 4, 5, 13, 14, and 18, does not support `str.to.re` (bugs 10, 11), and does not support `check-sat-using` (bugs 7, 8, 9, 12, 15, 16). ddSMT was adapted by invoking a second solver, the version that fixed the bug, to reject minimizations that did not preserve satisfiability. Inference: that adapted baseline therefore assumes the fixed solver version is correct.

## technique 5: incremental mode and fuzzing bounds

STORM can generate instances with push/pop constraints for solver incremental mode. The implementation chooses AND versus NOT with probability 50%, chooses the initial pool with probability 30% and the construction pool otherwise, (Section 4, PDF p.5); the assertion count is `(RandInt() % Amax) + 1` (Algorithm 1, PDF p.4). In RQ3 the authors vary Dmax and Amax over 4, 8, 16, 32, 64 with eight independent runs on 21 bugs, and report median iterations (Figure 4) and median time (Figure 5) until the bug is found (PDF pp.8–9). They find that a large assertion bound reduces iterations significantly (“up to 11x for Dmax = 4”), while the trend for the depth bound is “less clear”, suggesting it is “mostly useful for minimizing instances”. Time shows “very similar trends”.

These choices are engineering parameters, not correctness guarantees. The implementation uses Z3's Python API both for formula manipulation and random predicate valuation, and therefore can only fuzz logics supported by Z3, with seeds in the SMT-LIB v2 extension Z3 supports (Section 4, PDF p.5). The authors note that Z3 bugs resulting in a wrong model do not affect the fuzzer, since the technique only needs correct predicate valuations; they use Z3 to compute those valuations and “have not encountered any bugs in this solver component”.

## evidence and denominators

The evaluation tested seven mature solvers over 43 logics, with 193,586 seed instances in Table 2. STORM found 29 previously unknown, unique, developer-confirmed critical bugs in three solvers (nine variants) and 15 logics; 19 of the 29 were fixed in the latest solver versions (Section 5.5, RQ1, PDF p.6; Table 3, p.8). The bugs were found only by STORM-generated instances, not by the seeds. For known-bug reproduction (RQ2), the study considered bugs reported between Nov 15 and Feb 15, 2020 with a fix; only CVC4, Yices2, and Z3 qualified (MathSAT5 is closed source; no critical bugs were reported for Boolector, SMTInterpol, STP): 6, 1, and 14 bugs respectively after excluding the authors' own reports. STORM reproduced 1 (CVC4), 1 (Yices2), and 4 (Z3), “6 out of a total of 21”, which the authors say would have prevented “approximately 1/3 of the critical-bug reports in a three-month period”. It also reproduced the one critical Z3str3 bug reported by Bugariu and Müller (Section 5.5, PDF p.8).

For coverage (RQ5), the authors measured Z3 line and function coverage on the 10,054 SMT-COMP 2019 seeds of four logics (QF_UFLIA, AUFNIRA, UF, LIA), then ran STORM on 5 randomly selected seeds per logic (20 seeds) with NM = 500 to generate 500 new instances for each of the 20 seeds. After only 500 generated instances, coverage rose from 43,607 to 46,565 lines and from 21,238 to 22,387 functions, that is 2,958 more lines and 1,149 more functions (Table 5, PDF p.10; text p.9). The paper's threats are seed selection (“our experimental results do not necessarily generalize to other seeds”), solver and logic selection (“the bugs found by STORM depend on the solvers and logics that we tested”), and randomness in fuzzing, addressed with eight random seeds (Section 5.6, PDF pp.9–10).

## what is proved, measured, and trusted

Inference: the paper contains no theorem about STORM's completeness. Measured outputs are bugs found, reproduction rates, minimization sizes, time/iteration medians, and code coverage. Inference: trusted components include the separate valuation solver, SMT-LIB parser and mutation code, solver versions used as references, the satisfiability-preserving model argument, and the assumption that reported `unsat` results are genuinely wrong. Inference: a critical solver bug can invalidate a Verus proof even when Rust code and specifications are correct.

Inference: VL should not redo generic black-box SMT fuzzing; STORM already establishes the method and broad evidence. It should instead add a Verus-specific campaign: collect actual translated obligations, preserve satisfiability with an independent checker where possible, run the exact Z3 configuration used in CI, minimize every disagreement, and track whether a solver update changes proof outcomes. This directly measures product threat while keeping the solver, translation, and proof-checking trust boundaries explicit.

## techniques for the catalog

- seed fragmentation — recursively extract valued sub-formulas from real SMT-LIB seeds
- valuation-preserving mutation — build Boolean formulas with AND/NOT while retaining known truth values
- satisfiable-by-construction oracle — negate false-valued assertions so `unsat` identifies a solver bug
- depth minimization — binary-search formula depth while preserving satisfiability and the incorrect result
- incremental-mode fuzzing — generate instances with push/pop instructions to test solvers' incremental mode
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Out of the 29 critical bugs, 19 have already been fixed in the latest solver versions."): read the paper text from first to last line and compared every quotation, number, section and page reference (page numbers are PDF pages from form-feed splits of the text), and the steps of Algorithms 1 and 2, against it; changed the abstract quote's capitalization, the functionally-complete quote (added "Note that"), page references (oracle quote p.5, fragmentation steps p.4, RQ1 counts p.6, Table 3 p.8), the fragmentation step (depth filter, not splitting), the minimization description (assertions first, then depth; the second-solver step belongs to the adapted ddSMT baseline), the RQ3 finding (assertion bound matters, depth less clear), the known-bug and coverage numbers, the threats list, and the incremental catalog line; marked Verus-related and trust-assumption statements as Inference. Not checked: the cited GitHub issues, the bibliography, Figure 4 and 5 bar values, per-bug Table 4 rows, the PDF layout beyond the text extraction, and the Verus claims, which are outside the paper.
