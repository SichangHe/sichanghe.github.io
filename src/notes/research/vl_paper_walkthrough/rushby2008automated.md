# Automated Test Generation and Verified Software
(authored by agents unless marked 🧑)
Tag: `rushby2008automated`, [paper](https://doi.org/10.1007/978-3-540-69149-5_18)

## scope and claims

Rushby surveys automated test generation as a complement to formal verification. He defines testing as “observation of a program in execution under controlled conditions.” He says observations are “compared against an explicit or informal oracle to detect bugs or confirm correctness.” The abstract says automated test generation “uses technology from formal methods to mechanize the construction of test cases.” The introduction (p. 161) says testing continues to be required alongside formal analysis “because it can expose different kinds of problems (e.g., compiler bugs), can examine the program in its system context, and increases the diversity of evidence available.” He writes (p. 162): “Thus, testing is not a rival to formal methods of verification but a valuable and complementary adjunct.”

Inference: for Verus, the useful boundary is a proof plus generated executions that exercise implementation, compiler, and environment behavior. A test failure is evidence of a bug; a passing test is not a proof. The paper is a 2008 survey and reports no new end-to-end Verus experiment.

## technique 1: symbolic path constraints and solver-generated inputs

What it is. For a deterministic loop-free program, choose a control-flow path, symbolically execute it, conjoin branch predicates, and solve the resulting condition for an input. The paper states: “By performing symbolic execution along the desired path and conjoining the predicates that guard its branch points, we can calculate the condition that the desired test input must satisfy.”

When to use it. The paper says the method “generalizes to find tests for structural coverage criteria such as statement or branch coverage, and for programs with loops and those that are reactive systems.” For finite-state systems, an off-the-shelf model checker can do it: check the property “always not P,” where P specifies the desired structural criterion, and the counterexample is the test case. This is the paper’s stated recipe in Section 2 (p. 162). Inference: the path condition must be representable and solvable for this to work.

Steps from the paper:

1. select a path or structural target in the control-flow graph (Section 2, p. 162)
2. symbolically execute the program along that path and conjoin branch guards (Section 2, p. 162)
3. solve the path condition by constraint satisfaction to obtain concrete input (Section 2, p. 162)
4. for finite-state models, encode the target as `P` and ask a model checker for a counterexample to `always not P` (Section 2, p. 162)
5. in model-based development, tests come from the executable specification, “which then provides the oracle when these are applied to the generated program” (Section 2, p. 162)

Verus form. Inference: write executable Rust normally; specify behavior with `requires` and `ensures`, and use a separate `proof fn` for lemmas. Verus proves the contract but does not itself generate runtime tests from a path (a claim about Verus, not from the paper). Inference: export a bounded model or instrumented harness whose branch predicates are solved externally, then feed concrete values to a Rust test. The paper’s model-checker counterexample is test data, not a Verus proof obligation.

Evidence and limits. The survey gives no denominator or benchmark for this recipe. It notes “many pragmatic issues in the selection of explicit-state, symbolic, or bounded model checkers” (pp. 162–163), and says the task “becomes more challenging” for low-level programs, very long paths, non-finite-state programs, and nondeterminism (p. 163). Inference: a test oracle based on a model can be wrong if the model is wrong, and a Verus contract carries the same specification risk.

## technique 2: abstraction for low-level programs and long paths

When a higher-level specification is unavailable, the paper says “it is natural to adopt techniques from software model checking.” Predicate abstraction is “the most common approach,” and discovery of suitable predicates “is automated very effectively in the lazy-abstraction approach.” Abstractions for test generation differ from those for verification: verification abstractions are conservative with extra behaviors, whereas for test generation any generated test should be feasible in the concrete program. It says: “For the latter, the abstraction needs to be conservative (i.e., it should have more behaviors than the concrete program), whereas in the former case we generally desire that any test generated from the abstraction should be feasible in the concrete program (i.e., the abstraction may have fewer behaviors than the concrete program)” (Section 2, p. 163).

Steps from Section 2 (p. 163): abstract the low-level code first rather than translating it directly into a model checker’s language; discover predicates automatically (lazy abstraction); build the abstraction so that tests from it are feasible in the concrete program; for very long sequences, either use specialized model checking (e.g., ATPG-based), generate the test incrementally, or run random tests and extend a path with model checking or constraint satisfaction from a “nearby” reached location (e.g., by Hamming distance on state variables). DART executes the program on a random input, gathers constraints on inputs at conditional branches, and uses a constraint solver to generate input variants that steer the next execution toward different paths (p. 163).

Verus form. Inference: represent the abstraction as a ghost model or an abstract datatype, connect concrete state to it with a `spec fn` relation, and prove preservation with `proof fn`s. A generated concrete input can then be run through the executable Rust. Verus does not provide predicate-abstraction refinement or DART; those remain external test-generation tooling.

Evidence and limits. The paper reports no measured coverage or test count for abstraction. It notes that abstractions for test generation “are not necessarily the same as those used for verification,” and that for programs that are not finite state an infinite-state bounded model checker using an SMT decision procedure can be used (p. 163). Inference: any claimed Verus test coverage must identify the concrete denominator (branches, statements, or targets) and the abstraction’s missed behaviors.

## technique 3: structured data, nondeterminism, and controller synthesis

For trees and lists, the paper proposes bounding element alphabets and structure size, then generating all or many instances, which is easily automated when an axiomatic specification is available (p. 164); it warns that naive enumeration creates isomorphic redundancy. If only a recognizer exists (for example, a red-black-tree predicate), random enumeration is inefficient, so formulate generation as constraint satisfaction. For nondeterministic systems or uncontrolled environments, tests are active programs: observe the response and choose the next input, abandoning a test when its purpose cannot be achieved. The paper calls this controller synthesis. Hybrid environments (those with differential equations) can be approximated by “conservative discrete approximations” before applying test generation for nondeterministic systems (p. 164).

Verus form. Inference: define a bounded generator in executable Rust and prove recognizer properties for generated values with `ensures`; use `assert` and `proof fn` lemmas for invariants. For an active tester, model environment responses as an explicit state machine and prove transition contracts; the harness itself remains runtime code. These Verus mappings are the study author’s, not the paper’s; this study has not checked them against Verus documentation.

## technique 4: choosing targets, fault hypotheses, and tours

The survey (Section 3, pp. 164–166) describes design exploration (“show me a run that puts control at this point with x ≤ 0”), random unit-level testing (QuickCheck), exhaustive generation up to a bounded size, and systematic coverage of requirements and code. It describes fault hypotheses that some generators target: errors at condition boundaries (substituting `<` for `≤`) and “meaningful impact” of each condition in a compound decision (each must independently affect the outcome). Model-based testing generates tests from executable specifications, using structural coverage criteria, “test purposes,” predicates describing relationships to explore, or specifications of the external environment (pp. 165–166). Separate tests per target can be redundant; “recent methods attempt to construct more efficient ‘tours’ that visit many targets in each test” (Section 3, p. 166).

Verus form. Inference: encode boundary cases and decision-impact cases as Rust property tests around a verified function; keep the Verus contract as the oracle and use generated inputs to exercise each target. A tour can be a single harness sequence with a vector of targets, while proofs establish each operation’s postcondition.

Evidence and limits. The paper cites a Heimdahl, George, and Weber experiment on a Rockwell flight-guidance model, in which MC/DC tests were generated and executed on implementations seeded with errors; “the autogenerated tests detected relatively few bugs, and generally performed worse than random testing” (Section 4, p. 166). No numerator or denominator is supplied in this survey. The author attributes this partly to the model checker being “too clever”: it finds the shortest test for a goal, and “these short tests often exploit some special case and never reach the interesting parts of the state space.” He says hopes that tours or test purposes do better “need to be validated in practice.” Thus coverage alone is not evidence of fault-finding quality.

## technique 5: combine testing with verification evidence

The paper describes conformance testing (p. 166), reducing static-analysis “false alarms” by emitting only errors for which a test case can be constructed, slicing to ease test generation, Rusu’s use of test generation to decompose the verification problem into smaller components, and the Synergy method that “alternates DART-like testing and formal verification” (Section 4, p. 167). In Section 5 (p. 168) it says “formal verification not only provides guarantees, it exposes assumptions—and these assumptions can be useful targets for testing,” and that “multi-legged assurance” composes the assurance case from different kinds of evidence.

Verus form. Inference: use Verus contracts and proof failures to identify assumptions, then write runtime tests for external libraries, compiler behavior, and hardware-facing boundaries. Keep those components explicitly trusted unless they are separately verified. A passing proof does not validate the test oracle or external environment.

## what is proved, measured, and trusted

The paper proves no theorem and presents no new implementation; it is a brief survey with a research-challenges section (Section 5, pp. 167–168). Its empirical example is the cited flight-guidance study, reported qualitatively as few detected bugs and worse-than-random performance, with no denominator in this paper. Inference: trusted elements include the executable specification used as oracle, model-checker and solver correctness, abstraction choices, test harness, compiler, and runtime environment. Inference: for a Verus product, generated tests primarily threaten integration assumptions, compiler/runtime behavior, and specification mistakes; they do not replace proofs of the Rust contracts.

## techniques for the catalog

- symbolic path solving — conjoin branch predicates for a target path and solve for a concrete input
- model-checker counterexample tests — encode a coverage predicate and use a counterexample to `always not P` as test data
- abstraction-directed generation — abstract low-level code while preserving feasibility of generated concrete tests
- DART-style exploration — execute random inputs, collect branch constraints, solve variants, and iterate
- bounded structured-data generation — fix the element alphabet and bound the size, generate instances, and reduce isomorphic redundancy (or treat a recognizer as a constraint satisfaction problem)
- active and hybrid testing — synthesize an adaptive tester from observations, using conservative discrete environment models
- fault-targeted tours — target boundary and condition-impact faults and combine multiple coverage goals in one sequence
- verification-testing integration — use tests to refute proof goals, expose assumptions, reduce static-analysis alarms, and divide verification work
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Only a relatively small number of tests can be performed in practice, so the eventuality guarantee is of mainly theoretical interest"): read the whole paper (pp. 161-168 plus references) and checked every quotation, section and page reference, and the technique steps against it; changed section and page references (steps 5 and abstraction steps), completed the truncated p. 163 abstraction quotation, removed the unsupported step of checking feasibility in the concrete code and the unsupported claims that the paper recommends adapting model checking and that tests expose faults proofs may not address (replaced with quoted wording), added quotes for the flight-guidance result, and marked the oracle-risk and trusted-elements sentences as Inference; link kept from the fetch record (the paper text gives no DOI or URL); did not check the Verus statements against Verus documentation, the cited references beyond the paper's own text, or the PDF layout beyond the text extraction.
