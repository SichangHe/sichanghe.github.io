# Software Verification with CPAchecker 3.0: Tutorial and User Guide (Extended Version)
(authored by agents unless marked 🧑)
Tag: `baier2024cpachecker`, [paper](https://arxiv.org/abs/2409.02094v1)

## scope and operating model

This tutorial is a practical guide to CPAchecker 3.0. It presents configurable program analysis (CPA), abstract domains, verification algorithms, witness validation, and test generation. The abstract states the breadth: “The framework provides many abstract domains, such as BDDs, explicit values, intervals, memory graphs, and predicates, and many program-analysis and model-checking algorithms, such as abstract interpretation, bounded model checking, Impact, interpolation-based model checking, k -induction, PDR, predicate abstraction, and symbolic execution.” (Abstract, p. 1).

As a verifier, CPAchecker takes a program, specification, and configuration and returns a verdict, report, and verification witness; its other main uses are witness validation and test generation (Sect. 1.1, p. 2; Sect. 3, p. 6). A CPA defines an abstract state domain and precision, and precisions can be adjusted by counterexample-guided abstraction refinement (CEGAR) (Sect. 1.2, pp. 2–3). The tutorial recommends trying several analyses: “none of them always outperforms all of the others” (Sect. 4.1, p. 13).

## technique 1: choose analysis by specification and proof goal

How it is done. First classify the property: reachability, memory safety, termination, overflow, or data race. Use the table’s specialized configurations: `--smg` for memory safety, `--lassoRankerAnalysis` or `--terminationToSafety` for termination, `--predicateAnalysis--overflow` for overflow, and `--dataRaceAnalysis` for races (Sect. 4, Table 2, p. 13). For ordinary reachability, start with the default meta-configuration, which uses k-induction for reachability specifications, then compare value analysis, symbolic execution, BMC, predicate abstraction, and interpolation configurations (Sect. 4.1, p. 14).

The listed value-analysis configuration without refinement, symbolic execution without refinement, and incremental BMC are mainly bug-finders; abstraction or induction is needed for large-program proofs. Value and symbolic analyses do not precisely handle dynamically allocated heaps, while BMC, predicate abstraction, and k-induction can, at the cost of potentially large SMT formulas (Sect. 4.1, p. 14).

Verus form. Inference: make the property explicit in a Verus contract or state machine before selecting proof tactics. Use executable tests for counterexamples and invariants/lemmas for unbounded proofs. The tradeoff between precise state and solver cost carries over, but Verus constructs and solver behavior differ.

## technique 2: concrete value analysis with optional CEGAR

What it is. Value analysis tracks concrete assignments. Its three common configurations vary path sensitivity and precision refinement (Table 3, p. 14): `--valueAnalysis-NoCegar-join`, `--valueAnalysis-NoCegar`, and `--valueAnalysis-Cegar`.

How it is done. Run `cpachecker --valueAnalysis-NoCegar-join examples/example-const.c` for path-insensitive constant propagation (Sect. 4.2, p. 15). Joining states keeps values that hold at a merge and can prove the example because `z` remains zero; nonconstant variables may become unknown. Path-sensitive mode keeps assignments per path but can explode. Precision-refined mode starts with a coarse set and uses CEGAR with Craig interpolation to retain only assignments needed for the proof (Sect. 4.2, p. 15). Because nondeterministic values are over-approximated, CPAchecker checks each potential error path with a precise SMT feasibility check before reporting a violation (Sect. 4.2, p. 15).

Verus form. Inference: represent concrete facts as ghost maps or sequences and let loop invariants retain only variables needed by the postcondition. A failed proof is analogous to an imprecise abstraction; add a lemma or invariant rather than weakening the contract. Verus does not use CPAchecker’s command-line CEGAR configuration.

Evidence and limits. The tutorial’s example proves safety only because the needed value is constant. It warns that path-sensitive tracking causes path explosion, and that value analysis does not support precise heap reasoning (Sect. 4.1, p. 14).

## technique 3: interval data-flow analysis

What it is. Data-flow analysis tracks automatically selected variables with interval expressions such as `[l1,u1] ∪ [l2,u2]` (Sect. 4.3, pp. 15–16).

How it is done. Run `cpachecker --dataFlowAnalysis examples/example-const.c`. Start with coarse exploration. If an abstract state violates the specification, dynamically increase precision by tracking more variables, allowing more complex interval expressions, and disabling widening (Sect. 4.3, p. 16). Use the result as a lightweight proof or as an invariant generator for k-induction (Sect. 4.3, p. 16).

Verus form. Inference: use integer bounds as ghost predicates and feed them into loop invariants or arithmetic lemmas. Widening is an analysis implementation detail; Verus requires the resulting invariant to be proved.

Evidence and limits. The example gets TRUE, but the tutorial says data-flow analysis may be too imprecise to prove safety and cannot identify concrete error paths; it returns UNKNOWN on the tutorial’s safe and unsafe loop examples (Sect. 4.3, p. 16).

## technique 4: symbolic execution with interpolation refinement

What it is. Symbolic execution assigns a fresh symbolic value to each unknown and stores expressions and path constraints over those values (Sect. 4.4, p. 16).

How it is done. Run `cpachecker --symbolicExecution-NoCegar examples/example-sym.c` to keep all symbolic expressions. The resulting tree represents constraints for every path and can produce concrete assignments, but expressions grow and path exploration may not terminate. Run `--symbolicExecution-Cegar` to use CEGAR with Craig interpolation; on the tutorial example it retains assignments and constraints for `x` and `y` and drops irrelevant `z` facts (Sect. 4.4, pp. 16–17).

Verus form. Inference: model unknown inputs as quantified or arbitrary spec values, then prove path conditions with `requires` and lemmas. Keep path-specific facts in proof blocks; avoid treating a single counterexample path as a universal proof.

Evidence and limits. Unrefined symbolic execution of example-safe.c (Fig. 2a) does not terminate because its symbolic expressions keep growing. The refinement example is a different program, example-sym.c (Fig. 8), on which CEGAR retains assignments and constraints for x and y and omits z (Sect. 4.4, pp. 16–17).

## technique 5: predicate abstraction and Impact

What it is. Predicate abstraction learns predicates with CEGAR and Craig interpolation, then abstracts state at selected locations, normally loop heads (Sect. 4.5, p. 17). Large-block encoding reduces the number of abstractions.

How it is done. Run `cpachecker --predicateAnalysis examples/example-safe.c`. The tutorial example learns the loop invariant `x + y == n`, stored in `output/predmap.txt`, and proves the assertion unreachable (Sect. 4.5, p. 17). Learned predicates may enumerate concrete values instead of a useful relation. Impact, enabled by `--predicateAnalysis-ImpactRefiner-ABEl`, computes and refines predicate abstractions more lazily; the authors report predicate abstraction is more effective for proofs, while Impact is more efficient for finding violations (Sect. 4.5, p. 17).

Verus form. Inference: write the learned relation directly as a Verus loop invariant and prove initialization, preservation, and postcondition. A Verus proof should record why the relation is sufficient; it does not automatically search arbitrary predicates as CPAchecker does.

## technique 6: bounded model checking and unbounded extensions

BMC. Given bound `n`, BMC unrolls loops `n` times, encodes all paths and violations as an SMT formula, and reports FALSE when satisfiable. UNSAT proves safety only up to `n`; TRUE requires finite loops fully unrolled, otherwise UNKNOWN (Sect. 4.6, p. 18). `--bmc-incremental` starts at bound 0 and increments until a bug, complete unrolling, or a resource limit. The tutorial’s unsafe example is found on the first loop encounter; the safe example reaches the time limit with UNKNOWN because roughly `2^31` unrollings would be needed (Sect. 4.6, p. 18).

k-induction. Run `cpachecker --kInduction examples/example-safe.c`. CPAchecker combines k-induction with data-flow invariants to strengthen the induction hypothesis; this proves the safe example that incremental BMC cannot (Sect. 4.7, pp. 18–19).

Interpolation. IMC, ISMC, and DAR derive interpolants from unsatisfiable BMC queries to construct inductive invariants. Run `--bmc-interpolation`, `--bmc-interpolationSequence`, or `--bmc-interpolationDualSequence`; the tutorial notes these currently support at most one loop (Sect. 4.7, p. 19).

Verus form. Inference: use Verus loop invariants for an inductive safety argument. A bounded test can find a counterexample but cannot establish unbounded safety. Interpolants are solver-generated hints, not Verus language constructs.

## technique 7: symbolic memory graphs for heap safety

What it is. SMG combines symbolic execution with a graph domain that tracks memory, pointer arithmetic, bit-precise reads, boundaries, and certain arbitrary-length linked lists (Sect. 4.8, pp. 19–20). The tutorial says, “The analysis can detect memory leaks, invalid memory access, and invalid freeing of memory.” (Sect. 4.8, p. 19).

How it is done. Run `cpachecker --preprocess --smg --spec memorysafety examples/example-unsafe-memsafety.c` to detect invalid dereferences. Detect the unfreed allocation either by fixing the invalid dereference or by selecting `--spec memorycleanup` (Sect. 4.8, pp. 19–20). The tutorial example finds the first out-of-bounds access and, under the cleanup specification, the leak.

Verus form. Inference: model ownership and valid ranges through Rust types and Verus permissions; state pointer access preconditions and prove allocation cleanup. Verus’s ownership model differs from SMG’s graph abstraction, but the separation of memory-safety properties is directly applicable.

Limits. Abstraction of arbitrary-length linked lists is currently limited to lists that terminate in indefinitely repeating equal values. When abstraction fails, SMG enumerates all possible list lengths, which may cause path explosion (Sect. 4.8, p. 19).

## technique 8: termination analysis

Termination-as-safety. `--terminationToSafety` records states at loop heads and builds an SMT formula when a loop head is visited again. It checks for a reachable state visited twice within the unrolled iterations; finding one proves nontermination. Termination proofs require fully unrolling every loop. The tutorial’s counterexample trace `(n,z): (1,2) → (0,0) → (-1,1) → (-2,2) → (0,0)` demonstrates a repeated `(0,0)` state (Sect. 4.9, pp. 20–21).

Lasso ranking. `--lassoRankerAnalysis` extracts potentially nonterminating lassos and sends them to LassoRanker, which constructs ranking functions or nontermination arguments. For the terminating example it reports `3*z − 3*n + 4`; the function is nonnegative while the loop guard holds and strictly decreases each iteration (Sect. 4.9, p. 22).

Verus form. Inference: prove a `decreases` measure that is bounded below and decreases on every loop iteration. For nontermination, provide a reachable cycle or counterexample trace. A Verus `decreases` clause is an executable-proof obligation, not a command-line analysis.

## technique 9: overflow detection as reachability

How it is done. CPAchecker encodes signed and optionally unsigned overflow conditions as error locations and runs a standard reachability analysis. Use `--predicateAnalysis--overflow`; set `overflow.checkUnsigned=true` for unsigned checks (Sect. 4.10, p. 22). The tutorial’s command reports FALSE because an overflow is reachable under `n=0` and `x=1`.

Verus form. Inference: state arithmetic range invariants and use checked Rust operations whose postconditions establish no overflow. If modeling machine integers, make the bit width and wrap semantics explicit; mathematical integer proofs alone do not establish machine safety.

## technique 10: verification witnesses and independent validation

What it is. A witness provides machine-readable information about a verification result. Correctness witnesses can also accompany UNKNOWN, with partial information (Sect. 3.7, p. 11). Version 1.0 is GraphML; version 2.0 is YAML and more concise (Appendix D, p. 28). Correctness witnesses carry invariants; violation witnesses carry paths and assumptions.

How it is done. Running `cpachecker --predicateAnalysis examples/example-safe.c --option cpa.arg.proofWitness=witness.graphml` generates a GraphML correctness witness in addition to the default YAML correctness witness (Appendix D.1, p. 28; D.2, p. 30). Validate the default YAML witness using `cpachecker --witnessValidation --witness output/witness.yml examples/example-safe.c` (Appendix A, Table 4, p. 24; D.3, p. 30). For violation witnesses, convert the witness to a control automaton and restrict exploration to its paths, using predicate abstraction for sequential programs, SMG for memory properties, and a BDD-based analysis for concurrent programs. For reachability correctness witnesses, extract loop invariants and check them with k-induction, without adding other candidate invariants. Retry an invariant at k+1 if it does not hold for the current k. For no-overflow correctness witnesses, use predicate abstraction, with block-abstraction memoization for recursive programs, and check the supplied invariants in parallel. A proved-invalid invariant causes a violation; otherwise predicate abstraction assumes it (Appendix D.3, p. 31).

Evidence and limits. Validation confirms the claimed verdict only when the validator produces the same verdict for the witness type (Appendix D.3, p. 30). Metadata is checked by default; `witness.strictChecking=false` disables these checks (Appendix D.3, p. 30). Inference: disabling them removes this check that the witness metadata matches the program.

Verus form. Inference: export proof-relevant contracts, invariants, and counterexample traces as reviewable artifacts, then replay them in a clean Verus invocation. The Verus verifier remains the checker; a witness format can improve auditability but cannot repair an incorrect specification.

## technique 11: generate coverage-oriented tests

How it is done. Run `--testCaseGeneration-predicateAnalysis` and choose XML, plain vectors, or compilable C harness output (Appendix E, Tables 5–6, pp. 32–33). For the tutorial program, branch coverage has four goals and the command reports “4 of 4 covered” (Appendix E.1, p. 32). Configure function-call, error-call, statement, or branch targets with `testcase.targets.*` options (Appendix E.2–E.3, pp. 32–33).

Verus form. Inference: use generated tests to exercise executable Rust and to find mismatches between specifications and implementations. Tests supplement, rather than replace, Verus proof; report coverage denominators and generated inputs.

## techniques for the catalog

- configurable program analysis — choose an abstract domain and precision, then refine precision with CEGAR as counterexamples require
- value and interval analysis — track concrete assignments or numeric ranges, with path sensitivity, widening, and refinement matched to the proof goal
- symbolic and predicate abstraction — preserve symbolic constraints or learn loop predicates through interpolation to prove reachability properties
- bounded and inductive model checking — use bounded SMT unrolling for bugs and k-induction/interpolation for unbounded invariants
- symbolic memory graphs — combine symbolic execution and heap graphs to detect invalid access and leaks
- termination ranking — detect repeated loop states or prove decrease with a ranking function
- overflow reachability — encode signed/unsigned overflow as error locations and check with a standard analysis
- witness validation — export correctness/violation evidence and replay it with a restricted, property-specific analysis
- coverage test generation — generate vectors or harnesses for branch, statement, function-call, or error-call goals
