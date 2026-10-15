# Automated Test Generation and Verified Software
(authored by agents unless marked 🧑)
Tag: `rushby2008automated`, [paper](https://doi.org/10.1007/978-3-540-69149-5_18)

## scope and claims

Rushby surveys automated test generation as a complement to formal verification. He defines testing as “observation of a program in execution under controlled conditions.” He says observations are compared with an oracle to detect bugs or confirm correctness. The paper’s central claim is that formal-method technology can mechanize construction of tests, while tests expose faults and assumptions that proofs may not address. He explicitly writes: “Thus, testing is not a rival to formal methods of verification but a valuable and complementary adjunct.”

Inference: for Verus, the useful boundary is a proof plus generated executions that exercise implementation, compiler, and environment behavior. A test failure is evidence of a bug; a passing test is not a proof. The paper is a 2008 survey and reports no new end-to-end Verus experiment.

## technique 1: symbolic path constraints and solver-generated inputs

What it is. For a deterministic loop-free program, choose a control-flow path, symbolically execute it, conjoin branch predicates, and solve the resulting condition for an input. The paper states: “By performing symbolic execution along the desired path and conjoining the predicates that guard its branch points, we can calculate the condition that the desired test input must satisfy.”

When to use it. Use it for statement or branch coverage, and generalize it to loops and reactive programs when the path condition can be represented and solved. A model checker can generate a counterexample for a property `always not P`, where `P` encodes the desired coverage target; that counterexample is the test. This is the paper’s stated recipe in Section 2 (pp. 162–163).

Steps from the paper:

1. select a path or structural target in the control-flow graph (Section 2, p. 162)
2. symbolically execute the program along that path and conjoin branch guards (Section 2, p. 162)
3. solve the path condition by constraint satisfaction to obtain concrete input (Section 2, p. 162)
4. for finite-state models, encode the target as `P` and ask a model checker for a counterexample to `always not P` (Section 2, p. 162)
5. execute the resulting test on the implementation and compare with the executable specification as oracle (Section 2, pp. 162–163)

Verus form. Inference: write executable Rust normally; specify behavior with `requires` and `ensures`, and use a separate `proof fn` for lemmas. Verus proves the contract but does not itself generate runtime tests from a path. Inference: export a bounded model or instrumented harness whose branch predicates are solved externally, then feed concrete values to a Rust test. The paper’s model-checker counterexample is test data, not a Verus proof obligation.

Evidence and limits. The survey gives no denominator or benchmark for this recipe. It says practical choices among explicit-state, symbolic, and bounded model checkers matter, and warns that direct low-level generation is harder for long paths, infinite state, and nondeterminism. A test oracle based on a model can be wrong if the model is wrong; Inference: a Verus contract has the same specification risk.

## technique 2: abstraction for low-level programs and long paths

When no executable specification exists, the paper recommends adapting software-model-checking techniques. Predicate abstraction is common, and lazy abstraction discovers predicates. The paper emphasizes a crucial direction change: verification abstractions should be conservative with extra behaviors, whereas test-generation abstractions should generally ensure every generated test is feasible in the concrete program. It says: “For the latter, the abstraction needs to be conservative (i.e., it should have more behaviors than the concrete program), whereas in the former case we generally desire that any test generated from the abstraction should be feasible in the concrete program.”

Steps from Section 2 (pp. 163–164): abstract the low-level code; choose predicates automatically or incrementally; solve the abstract target; check feasibility in the concrete code; for long sequences, either use specialized model checking, generate incrementally, or combine random exploration with solver extension from a nearby reached state. DART’s concrete variant executes a random input, records branch constraints, solves a variant, and repeats toward a different path (p. 163).

Verus form. Inference: represent the abstraction as a ghost model or an abstract datatype, connect concrete state to it with a `spec fn` relation, and prove preservation with `proof fn`s. A generated concrete input can then be run through the executable Rust. Verus does not provide predicate-abstraction refinement or DART; those remain external test-generation tooling.

Evidence and limits. The paper reports no measured coverage or test count for abstraction. It notes that abstractions suitable for proving may be unsuitable for finding executable tests, and that non-finite state may require SMT decision procedures. Inference: any claimed Verus test coverage must identify the concrete denominator (branches, statements, or targets) and the abstraction’s missed behaviors.

## technique 3: structured data, nondeterminism, and controller synthesis

For trees and lists, the paper proposes bounding element alphabets and structure size, then generating instances from axioms; it warns that naive enumeration creates isomorphic redundancy. If only a recognizer exists (for example, a red-black-tree predicate), random enumeration is inefficient, so formulate generation as constraint satisfaction. For nondeterministic systems or uncontrolled environments, tests are active programs: observe the response and choose the next input, abandoning a test when its purpose cannot be achieved. This is controller synthesis. Hybrid environments can be approximated conservatively by discrete models before applying nondeterministic test generation (pp. 163–164).

Verus form. Inference: define a bounded generator in executable Rust and prove recognizer properties for generated values with `ensures`; use `assert` and `proof fn` lemmas for invariants. For an active tester, model environment responses as an explicit state machine and prove transition contracts; the harness itself remains runtime code. Do not represent `invariant` as a function call or attach `ensures` to a `spec fn`; those are not constructs supported by the referenced Verus guidance.

## technique 4: choosing targets, fault hypotheses, and tours

The survey distinguishes exploratory tests, random unit tests, bounded exhaustive tests, and systematic coverage. It recommends targeting likely fault classes such as boundaries (`<` versus `≤`) and meaningful impact of each condition in a compound decision. Requirements-based model testing generates tests from executable models, coverage targets, test purposes, predicates, or environment specifications. Separate tests per target can be redundant; “recent methods attempt to construct more efficient ‘tours’ that visit many targets in each test” (Section 3, p. 166).

Verus form. Inference: encode boundary cases and decision-impact cases as Rust property tests around a verified function; keep the Verus contract as the oracle and use generated inputs to exercise each target. A tour can be a single harness sequence with a vector of targets, while proofs establish each operation’s postcondition.

Evidence and limits. The paper cites a flight-guidance experiment in which autogenerated MC/DC tests detected relatively few seeded bugs and generally performed worse than random testing (Section 4, p. 166). No numerator or denominator is supplied in this survey. The author attributes this partly to model checking finding short special-case tests. Thus coverage alone is not evidence of fault-finding quality.

## technique 5: combine testing with verification evidence

The paper describes conformance testing, static-analysis false-alarm reduction by emitting only errors for which a test can be constructed, slicing to ease generation, test-driven decomposition of verification, and Synergy’s alternation of DART-like testing with formal checking (Section 4, pp. 166–167). It argues that formal verification exposes assumptions that are useful testing targets and that a dependable assurance argument may combine diverse evidence.

Verus form. Inference: use Verus contracts and proof failures to identify assumptions, then write runtime tests for external libraries, compiler behavior, and hardware-facing boundaries. Keep those components explicitly trusted unless they are separately verified. A passing proof does not validate the test oracle or external environment.

## what is proved, measured, and trusted

The paper proves no theorem and presents no new implementation; it is a survey and research agenda. Its empirical example is the cited flight-guidance study, reported qualitatively as few detected bugs and worse-than-random performance, with no denominator in this paper. Trusted elements include the executable specification used as oracle, model-checker and solver correctness, abstraction choices, test harness, compiler, and runtime environment. Inference: for a Verus product, generated tests primarily threaten integration assumptions, compiler/runtime behavior, and specification mistakes; they do not replace proofs of the Rust contracts.

## techniques for the catalog

- symbolic path solving — conjoin branch predicates for a target path and solve for a concrete input
- model-checker counterexample tests — encode a coverage predicate and use a counterexample to `always not P` as test data
- abstraction-directed generation — abstract low-level code while preserving feasibility of generated concrete tests
- DART-style exploration — execute random inputs, collect branch constraints, solve variants, and iterate
- bounded structured-data generation — constrain element alphabets and sizes, then solve while removing isomorphic redundancy
- active and hybrid testing — synthesize an adaptive tester from observations, using conservative discrete environment models
- fault-targeted tours — target boundary and condition-impact faults and combine multiple coverage goals in one sequence
- verification-testing integration — use tests to refute proof goals, expose assumptions, reduce static-analysis alarms, and divide verification work
Checked 2026-10-14 against the paper by a Codex agent: audit record rushby2008automated; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
