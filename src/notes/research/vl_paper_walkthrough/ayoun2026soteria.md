# Soteria: Efficient Symbolic Execution as a Functional Library: Perhaps You Should Write Your Own Symbolic Execution Engine!
(authored by agents unless marked 🧑)
Tag: `ayoun2026soteria`, [paper](https://doi.org/10.1145/3808306)

## scope and contribution

The paper presents Soteria, an OCaml library for implementing symbolic-execution engines directly over source-language semantics. The abstract states: “We present Soteria, a lightweight OCaml library for writing SE engines in a functional style, without compromising on performance, accuracy or feature support.” (abstract, p. 1). It argues that an intermediate language (IL) can lose source-level behavior and require a difficult compiler. “Claim 1: IL-design is a trade-off between performance, accuracy, and comprehensive support for language features, and one cannot maximise all aspects of this trio at once.” (section 1, p. 2). “Claim 2: A trustworthy interpreter for L is not harder to write than a trustworthy L-to-IL compiler.” (section 1, p. 2).

Inference: for VeruLaw, the transferable idea is a source-semantics interpreter whose path conditions and state model retain Rust behavior that an IL may erase. This is a testing and bug-finding architecture, not a replacement for Verus contracts and proofs.

## technique: build a symbolic interpreter with the Symex monad

Inference: Use this when the target language has semantics that an IL would obscure, or when one wants reusable symbolic execution with either over-approximate (OX) verification or under-approximate (UX) bug finding. The paper's tutorial gives these steps:

1. Define a concrete interpreter with a monadic bind. The example binds `ExecutionMonad.bind` to `let*`, evaluates a conditional, converts the guard with `bool_of_val`, and evaluates the selected branch (section 2, pp. 4–5).
2. Lift it to symbolic execution by binding `Symex.Result.bind` and replacing concrete branching with `if%sat` (section 2, p. 5).
3. Represent unknown inputs with fresh symbolic variables and attach a path condition to every result. The paper says: “A symbolic computation yields a set of results; each result is associated with a path condition, a symbolic boolean (boolean expression with symbolic variables) constraining the symbolic variables under which the result occurs.” (section 2, p. 5).
4. Implement `run` with an execution mode (`OX` or `UX`) and optional fuel; return each result with its path condition (section 2, p. 5; section 3.2, p. 9).
5. Implement `branch_on` by simplifying the guard, saving solver state, adding the guard, checking satisfiability and executing the then branch, backtracking, adding the negated guard, and executing the else branch when satisfiable (section 3.2, pp. 9–10).

Inference: a Verus analogue would keep executable Rust as the program under test and use a separate `spec fn` model for the property. Verus does not provide Soteria's `Symex` monad or `if%sat`; the analogue is to expose symbolic inputs through a test harness, state the property with `requires`/`ensures`, and use `assert`, `assert forall`, and `proof fn` lemmas to discharge obligations. This is an inference because the paper implements OCaml symbolic execution, not Verus.

## technique: parameterize values and the incremental solver

Inference: Use this when values, memory representations, or SMT back ends differ across languages. Implement the `Value` interface (`t`, `ty`, `mk_var`, `not`, `as_bool`) and the `Solver` interface (`add_constraints`, `check_sat`, `fresh_var`, `save`, `backtrack_n`, `reset`, `as_values`, `simplify`) (section 3.1, pp. 6–7). Instantiate `Soteria.Symex.Make` with a solver; the supplied `BV_solver` uses bit-vectors, floating-point values, locations and pointers and connects to Z3 (section 2, p. 6; section 3.1, pp. 6–8).

The implementation uses six optimisations. O1 hash-conses values; O2 hides representations and simplifies at construction; O3 runs interval and equality analyses before SMT; O4 marks constraints checked and sends only new or dependent constraints to Z3; O5 caches previous queries; O6 contextually simplifies values using the solver state (section 3.1, pp. 7–8). On O5 the paper reports that “in our Collections-C case study (§5), this reduces Z3 calls by a factor of 3.8 and execution time by a factor of 3.” (section 3.1, p. 8).

Inference: in Verus, these optimisations belong inside the verifier/SMT pipeline rather than Rust source. A practical analogue is to keep specifications canonical, use small lemmas to simplify terms, and avoid exposing irrelevant facts to Z3. Verus users cannot implement Soteria's `Solver` module in a proof; this mapping is an architectural inference.

## technique: lift data structures soundly

Inference: Use this whenever symbolic keys or heap state make ordinary library operations unsound. The paper's `Soteria.Data.Map.find_opt` returns a symbolic computation. It first performs syntactic lookup, then symbolically compares keys and branches on `x = y` or `x != y`; this preserves entries inserted under one symbolic variable when queried with another equal variable (section 3.3, pp. 10–11). On a BTreeSet example from its section 7, the paper reports “we record more than 300M calls to if%sat , of which only 4683 branches are feasible.” (section 3.3, p. 10).

Inference: a Verus version would define a ghost map or sequence in a `spec fn`, prove map-operation lemmas, and maintain representation invariants with `invariant` clauses on loops. Verus's `invariant` is a loop annotation, not a callable function. The executable map remains ordinary Rust; the ghost model and lemmas state why lookups preserve the model. This is an inference from the paper's symbolic map design and the Verus language guidance.

## technique: model Rust semantics directly, including Tree Borrows

Inference: Use this for Rust undefined-behavior detection where an IL loses borrow or aliasing information. Soteriarust traverses ULLBC, threads a symbolic store through a state monad, and represents pointers as a symbolic location/offset plus Tree Borrow tag, alignment and size (section 4.1, pp. 11–12). Tree Borrow access is implemented by pattern matching on the byte state and pointer tag; a forbidden transition raises an error (section 4.1, p. 12). The paper's example creates two mutable references to one raw-pointer address, writes through `x`, then reports `*y = 20` as UB because `y` is disabled (section 4.1, p. 12).

Inference: Verus can express the permitted aliasing protocol with ownership, ghost tokens, and state-machine invariants, but it does not automatically execute Tree Borrows. A Verus encoding would define a ghost state machine, use `requires` to require a valid tag, update the ghost state in proof code, and use `ensures` to show that an allowed write disables conflicting tags. Raw-pointer operations and external semantics remain trusted unless separately modeled.

## technique: evaluate with explicit denominators and biased controls

The Kani and Miri suites contain 922 tests: 413 Kani and 509 Miri. Soteriarust passes 381/413 Kani tests and 420/509 Miri tests; its total is 801/922 = 86.9%, with 23 unsupported tests, 79 failures and 19 timeouts (counts from the Fig. 3 table; section 4.2.1, pp. 13–14). The paper explains the setup: unlimited fuel, Kani compatibility, and disabled leak/alias checks for the Kani suite; Miri compatibility for the Miri suite (section 4.2.1, p. 13).

The unbiased data-structure suite has 72 tests. Soteriarust passes 72/72 in 6.6 seconds; Kani passes 41/72 without and 58/72 with unwinding annotations (section 4.2.2, p. 15). The real-world `finetime` crate has 237 tests; Soteriarust times out on 11 with a 530-second timeout, while Kani passes its slowest test in 515 seconds (section 4.2.3, p. 16). The paper attributes the timeouts to Z3 queries involving signed bit-vector remainder and division (section 4.2.3, p. 16).

The paper says of its suites: “both Kani and Miri suites are biased towards their respective tools.” (section 4.2.1, p. 14). Of the finetime tests it says they “were written for Kani, and they may thus be biased towards its strengths.” (section 4.2.3, p. 16). It also says the Collections-C tests are “subject to bias (towards Gillian-C)” (section 5.2, p. 17).

Inference: these denominators and settings matter for any VeruLaw evaluation. The measurements show comparative behavior on the stated suites, not universal superiority.

## technique: compositional bi-abduction for C bug finding

Soteriac parses C to Cerberus AIL, recursively interprets the source AST, and combines the state monad with Symex. Its fix-from-error bi-abduction first runs bi-abductive symbolic execution to generate function summaries, then applies a manifest-bug criterion to summaries with erroneous postconditions (section 5.1, pp. 16–17). On 159 Collections-C WPST tests, Soteriac passes 159/159 in 74.54 seconds; Gillian-C passes 156/159 in 111.41 seconds; CBMC passes 124/159, with 30 timeouts, one crash, two false positives and two false negatives; the timeout is 30 s per test (section 5.2, pp. 17–18, Tables 1–2). The paper says: “all bugs found by Gillian-C and CBMC were also found by Soteriac ; that is, to our knowledge Soteriac has no false negatives” (section 5.2, p. 17). On automatic bug finding in Collections-C, Soteriac takes 2.57 s and Pulse 2.52 s, and both find the same one bug (section 5.2, p. 18, Table 3). The paper reports about three person-months to build Soteriac and eight person-months for Soteriarust by a first-year PhD student (sections 5.2 and 4.2.1).

Inference: the Verus analogue is compositional contracts: prove a function summary once, then use it at callers. A `spec fn` can describe the summary, `requires` and `ensures` constrain calls, and `proof fn` lemmas connect heap predicates. Verus does not infer bi-abductive preconditions automatically; the analogy is a design direction, not a paper result.

## what is proved, trusted, and limited

The formal section defines branches as result/path-condition pairs and proves soundness preservation for `bind` and `branch_on` in both OX and UX modes. Theorem 6.1 says that (1) Kleisli composition of two m-sound symbolic computations via `bind` is m-sound and (2) `branch_on` is m-sound with respect to concrete `if ... else ...` provided it uses an m-approximate solver and both branches are m-sound (section 6, pp. 18–20). The paper gives only the statement; the proof and the formal OX/UX soundness definitions are in the extended version [59], which I did not read. UNKNOWN solver results are read as UNSAT in UX and SAT in OX (section 6, p. 19).

Inference: the result does not prove Rust's semantics, the ULLBC frontend, intrinsic implementations, Z3 correctness, or the detected hashbrown bug beyond the tested model. The paper lists missing concurrency, FFI and inline assembly, and says Cerberus lacks compiler-specific atomics (section 7.2, p. 21). For agent-written verified Rust, the threat is substantial where unsafe aliasing, unsupported intrinsics, solver timeouts, or frontend gaps occur; this is an inference grounded in the stated 23 unsupported tests, 79 failures, and 11 timeouts.

The paper's key limitation is path explosion. In a BTreeSet experiment with three nondeterministic integers, Soteriarust explores 13 paths in 2.09 seconds while Kani solves one approximately 50-million-variable SAT instance in 691 seconds; with six integers Soteriarust explores 4,683 paths in 456 seconds and Kani exceeds two hours (section 7.1, pp. 20–21). The paper also records a Kani-friendly `ctpop` test with 2^128 paths for Soteriarust and shows that replacing a branch with `wrapping_add` makes it pass in 1.1 seconds (section 4.2.1, pp. 14–15).

Inference: VL should not redo a generic build-a-symbolic-executor proposal without measuring source-level Rust semantics, solver behavior, and maintenance costs; Soteria already supplies that architecture and artifact. A distinct Verus opportunity is to connect source-level symbolic bug finding to contract proofs and to measure which generated proof obligations remain after symbolic counterexample discovery.

## techniques for the catalog

- source-level Symex monad — lift a concrete interpreter with `bind`, `if%sat`, symbolic variables, path conditions, fuel, and OX/UX modes
- incremental solver pipeline — combine typed values, interval/equality analyses, checked constraints, query caching, hash-consing, and contextual simplification
- symbolic data structures — replace ordinary map operations with path-condition-aware symbolic computations and cheap syntactic fast paths
- direct Rust semantics — interpret ULLBC with symbolic state and Tree Borrow transitions to detect aliasing UB
- compositional bi-abduction — generate function summaries by fix-from-error symbolic execution and report manifest erroneous postconditions
- evidence discipline — report pass/fail/unsupported/timeout counts with suite denominators, settings, timeout, and test bias
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Thanks to Soteria, a first-year PhD student developed a competitive SE engine for Rust in merely eight person-months."): I read the whole paper text and compared every quotation, number, page and section reference, the Symex tutorial steps, the six optimisations, the suite counts and the Collections-C tables against it; I changed the O5 and if%sat quotes (case, spacing, page 10 not 11), the Theorem 6.1 quote (it was not in the paper) and the claim that the proof is in this paper (it is in the extended version), the page of the no-false-negatives quote (p. 17), and a bias quote that was attributed to the wrong suites; I added the 19 timeouts, the Pulse comparison and the person-month figures; I did not check the extended version [59], the cited artifact, the references, or the Verus-analogue inferences, which are not paper claims.
