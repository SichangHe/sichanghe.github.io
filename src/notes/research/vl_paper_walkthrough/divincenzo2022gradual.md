# Gradual C0: Symbolic Execution for Gradual Verification
(authored by agents unless marked 🧑)
Tag: `divincenzo2022gradual`, [paper](http://arxiv.org/abs/2210.02428v3)

## scope and relation to earlier walkthroughs

DiVincenzo et al. build and measure Gradual C0, an implemented gradual verifier for recursive heap structures. It translates C0 to a Gradual Viper intermediate language, symbolically executes programs with partial specifications, emits only the run-time checks justified by optimistic reasoning, and translates those checks back into C0 source. The abstract reports: “Gradual C0 decreases run-time overhead between 11-34% compared to the fully-dynamic approach used in prior work.” (Abstract, PDF p. 1). The earlier walkthrough `zimmerman2023sound.md` covers the separate formal soundness proof, and `torek2026gradually.md` covers unfolding and pure functions. This study adds the implementation algorithms, source-level check encoding, and the paper's complete empirical protocol and numbers.

## technique 1: use an intermediate gradual language to make frontends replaceable

What it is. Gradual C0 is a C0 frontend over Gradual Viper, a custom imperative language whose syntax is close enough to make most translation structural. C0 is a safe C subset with heap allocation, garbage collection, and no casts or pointer arithmetic. Gradual Viper supplies the common symbolic-execution backend and gradual formulas.

When to use it. Use this architecture when several source languages need the same gradual verifier. Keep source-language translation separate from the precision semantics and check optimizer.

How to apply it.

1. Define a source AST with methods, structs, fields, expressions, contracts, predicates, and loop invariants.
2. Define a backend AST with explicit `new`, field statements, `while` invariants, `requires`, `ensures`, and gradual formulas.
3. Translate C0 `for` loops into backend `while` loops; translate `alloc(struct T)` into `new` plus field initialization.
4. A-normalize method calls, allocations, and ternary expressions that appear inside arbitrary source expressions by introducing fresh temporaries. Expand nested field assignments similarly.
5. Rewrite value pointers as pointers to one-field structs; retain source `assert(e)` as a runtime assertion while translating `e` only to check heap accesses statically.
6. Pass the backend's check set to a source-language encoder after symbolic verification.

The paper's implementation boundary is explicit: “To support the gradual verification of many different imperative programming languages, Gradual Viper verifies programs written in its own custom imperative language.” (Section 4.1, PDF p. 11). Verus form (Inference): a Rust frontend could lower selected Rust constructs to a proof-oriented intermediate representation, but ordinary Verus verifies Rust directly and has no gradual formula AST. A separate checker would need to preserve source locations and Rust ownership semantics; translating away borrow structure would create an additional trusted boundary.

Evidence and limits. GVC0 does not support arrays, strings, or fractional permissions because those require extensions to gradual-verification theory (Section 4.1, PDF p. 11). Inference: this limits direct transfer to array-heavy or unsafe Rust components. The intermediate-language design is prior art VL should reuse rather than rediscover; any new result should show Rust-specific lowering and sound ownership correspondence.

## technique 2: optimistic symbolic state with two heaps

What it is. Gradual Viper extends Viper's symbolic execution with a six-part state: an imprecision flag, optimistic heap, precise heap, symbolic store, path condition, and run-time-check collection. The precise heap must satisfy separating conjunction; the optimistic heap records permissions assumed only because a formula was imprecise and has no separation invariant.

The paper defines the state directly: “A symbolic state is a 6-tuple ( isImprecise, h?, h, γ, π, R) consisting of a boolean isImprecise, a symbolic heap h?, another symbolic heap h, a symbolic store γ, a path condition π, and a collection R.” (Section 4.3.2, PDF p. 20).

How to apply it.

1. Give each program variable a fresh symbolic value in store γ.
2. Represent a field chunk by receiver, field name, and snapshot value; represent a predicate chunk by predicate name, arguments, and snapshot.
3. Produce a precise formula into h and path condition π. Reject duplicate chunks or violated separation.
4. When `? && φ` is produced, set `isImprecise`, produce φ, and place permissions discovered only by optimism in h?.
5. For a field read, search h, then h?. If neither contains the field and the state is imprecise, assert that the receiver is non-null, add a translated accessibility check to R, create a fresh snapshot, and cache it in h?.
6. Branch on if statements and formula conditionals. Store branch constraints in π and attach them to every generated check.
7. For a precise state both branches must verify. For an imprecise state one successful branch may suffice, but the successful branch condition becomes a run-time check.

Verus form (Inference): represent the precise heap relation as ghost ownership predicates and the optimistic heap as a ghost set of assumed obligations. Rust references and Verus tracked permissions can enforce some disjointness, but the optimistic state and branch-conditioned checks need an external runtime monitor. Use `spec fn` for representation predicates, `requires`/`ensures` for contracts, and loop `invariant` for path facts. Do not encode imprecision by `external_body`; that would trust the implementation rather than check it.

Evidence and limits. The optimistic heap removes duplicate checks: a permission assumed while unfolding `geqTo` can justify later reads without another check (Section 4.2.1, PDF pp. 16–18). The conservative alias policy removes all possibly aliased chunks after a write, producing extra checks. This is a deliberate simplicity/performance trade-off, not an alias-complete analysis.

## technique 3: continuation-passing symbolic execution with minimal residual checks

What it is. Four mutually coordinated functions—`eval`, `produce`, `consume`, and `exec`—symbolically evaluate expressions, add facts, discharge and remove formulas, and execute statements. Each takes a continuation representing the remaining symbolic computation. A check is emitted only for information that cannot be proved by the current path condition and heaps.

How to apply it.

1. `eval` maps variables to γ, recursively evaluates operators, and reads fields from h/h? or creates an optimistic chunk plus an accessibility check.
2. `produce` adds boolean constraints to π, adds accessibility/predicate chunks, and recursively processes separating conjunctions.
3. `consume` first consolidates heap/path information, then searches h/h? for permissions. In a precise state missing chunks fail; in an imprecise state they generate checks and are removed. A consumed imprecise formula clears both heaps because `?` may represent any permission.
4. `exec` composes these operations for assignments, calls, allocations, folds, unfolds, assertions, branches, and loops. At calls, record an origin, consume the precondition, havoc assigned results, then produce the postcondition.
5. At a loop, verify the body from a clean state containing the invariant and guard, verify preservation, then verify the exit state with the negated guard. If an imprecise loop has only one successful symbolic outcome, add the condition that forces that outcome.

The paper states the three purposes of `consume`: “check whether φ is established by σ,” “produce and collect run-time checks that are minimally sufficient,” and “remove accessibility predicates and predicates that are asserted in φ from σ.” (Section 4.3.6, PDF p. 22). Verus form (Inference): this decomposition maps to proof lemmas for expression evaluation, ownership consumption, and statement preservation. `ensures` can carry updated ghost state, while `requires` establishes permission before a write. A full continuation-passing gradual checker is additional infrastructure, not a Verus construct.

### residual minimization with `diff`

For a boolean obligation, Gradual Viper converts the formula to conjunctive normal form, asks the solver whether each conjunct follows from the path condition, and returns the undischarged conjuncts as the run-time check. Algorithm 1's procedure is: “for c ← conjuncts do if !check(c) then φ′ ← φ′ + c”; it returns φ′ (Appendix A.1, PDF p. 41). This can leave a check such as `a2.balance >= 0` without rechecking already-proved arithmetic.

The `translate` function reverses symbolic execution. It recursively translates operators, resolves symbolic variables through the current or saved store, consults path-condition aliases and heap chunks, and chooses the longest concrete expression. This is required because runtime code sees program variables, not symbolic terms (Appendix A.1, PDF pp. 41–42). Inference: a Rust version would need stable source locations and a mapping from ghost snapshots to concrete references; borrow lifetimes make alias resolution more constrained but do not remove the need for translation.

## technique 4: branch versioning and source-level runtime checks

What it is. A runtime check is a tuple of branch conditions, origin, location, and formula. GVC0 turns branch conditions into boolean variables at their origin, then guards the check with those variables. This avoids recomputing a condition and prevents a check from running on a path where it is unnecessary.

How to apply it.

1. Record each symbolic branch as `(origin, location, condition)` in the check set.
2. At the branch's source location, assign the condition to a fresh boolean variable.
3. At every dependent check, use that variable in an `if` guard. Reuse one variable for all checks sharing the branch.
4. Place versioning assignments after checks at the branch origin so the added assignment itself is framed by existing ownership checks.
5. Short-circuit conditions when the same path has already established a prefix.

The paper explains: “In general, conditions are encoded as logical expressions in C0 and assigned to fresh boolean variables at the program point where they originated—we call this versioning.” (Section 4.4.1, PDF p. 27). Verus form (Inference): a Rust monitor can cache branch predicates in ordinary booleans and call generated check functions only under the cached guard. The proof must establish that the cached value equals the original branch condition; use a local lemma or contract, not an unverified mutation.

Checks for recursive predicates become recursive C0 boolean functions. Accessibility checks use an `OwnedFields` dynamic hash table keyed by object identifier and field number. Allocation adds an integer `_id` to every struct and marks all fields owned. Method boundaries pass either all owned fields (imprecise contract) or only fields named by precise pre/postconditions. A fully precise method with no checks needs no tracking. Separation checks insert each cell into a temporary hash table and fail on duplicates (Section 4.4.2–4.4.3, PDF pp. 27–29).

Inference: for Verus, a runtime ownership monitor is usually unnecessary for code proved entirely with Rust borrows and Verus permissions, but it becomes relevant at `unsafe`, FFI, or intentionally gradual boundaries. The monitor's hash table and object IDs would themselves be trusted unless verified.

## technique 5: performance lattices for partial specifications

What it is. The evaluation treats specification development as paths through a lattice. The bottom has only `?`; the top is a complete static specification. Each step adds one atomic conjunct or removes one `?`. This provides a controlled way to measure both proof discharge and runtime cost as precision grows.

How to apply it.

1. Fully specify a correct benchmark.
2. Enumerate atomic accessibility predicates, predicate instances, boolean expressions, and imprecision markers.
3. Construct random paths that add one element at a time.
4. At each path step, run Gradual C0, a fully dynamic verifier, and a framing-only verifier on selected workloads.
5. Record total proof obligations, statically eliminated obligations, and execution time.
6. Compare paths and classify which specification element caused the largest 99th-percentile increase or decrease.

The benchmark has four recursive structures: binary-search tree, linked list, composite tree, and AVL tree. Table 1 reports 3,473, 1,745, 2,577, and 3,057 unique sampled partial specifications respectively; the test-program complexities are (O(n\log n)), (O(n)), (O(n\log n)), and (O(n\log n)) (Table 1, PDF p. 30). Because the full space exceeded 2,100 candidates per benchmark, the authors sampled 16 unique random paths, three workloads per step, and took the median of 10 timing iterations on four physical Intel Core i5-4250U 1.3 GHz cores with 16 GB RAM (Section 5.3, PDF p. 31).

Evidence. Table 2 reports the percent change in elapsed time, GV versus dynamic verification, over all steps on 16 paths. Mean reductions range from 11.5% to 34.4% depending on benchmark and workload: AVL −14.4%, −16.1%, −11.5%; BST −24.7%, −23.9%, −21.7%; linked list −18.0%, −21.0%, −20.7%; composite −34.4%, −33.1%, −30.1% for workloads 32, 64, and 128 where shown (Table 2, PDF p. 33). The same table reports worst outliers where GV was slower by 138.9%–603.3%, and average fractions of steps better than dynamic verification of 74.2%–85.8% on paths containing some slower step. The paper attributes the outliers to unoptimized conditional bookkeeping and measurement error (Section 5.4, PDF p. 34).

A separate 67.6% of top-1% overhead increases came from adding recursive predicates to preconditions, postconditions, or predicate bodies; removing `?` in those locations accounted for 68.2% of top-1% decreases and 27.9% of increases due to expensive owned-field passing (Figure 20 and text, PDF pp. 34–35). These percentages use the set of top-1% path-step changes as denominator, not all specification elements.

Verus form (Inference): use a staged contract benchmark with deliberately weakened `requires`/`ensures` and measure proof obligations, solver time, runtime assertions, and repair effort. Do not claim Verus's gradual guarantee from this paper: Verus has no `?` precision order or automatic check insertion. The lattice method itself is reusable for evaluating a VL workflow.

## what is proved, measured, and trusted

The implementation demonstrates symbolic execution, check minimization, and dynamic encoding; Zimmerman et al.'s companion paper supplies the formal soundness theorem. This paper's empirical claims use four data structures, 16 random paths per structure, three workloads per step, and medians of 10 iterations. All sampled partial specifications originated from complete correct specifications and successfully verified, so the authors report empirical adherence to the gradual guarantee for those samples, not for all possible programs.

Threats are stated by the authors: devices shared CPU and memory configuration but were not otherwise controlled; benchmarks are not representative of all software; the dynamic baseline was “entirely unoptimized”; more than 2,100 possible imprecise specifications were sampled rather than exhaustively tested; and workloads were chosen without formal criteria (Section 5.4, PDF p. 35). The baseline choice and sampling mean the 11.5–34.4% reductions are not universal speedups.

Inference: for agent-written verified Rust, gradual verification could reduce initial contract-writing cost, but the runtime monitor, source-to-check translation, and optimistic ownership are new trusted or verified components. The highest product threat is a false sense that partial `ensures` protects code when checks are disabled, bypassed at FFI, or too expensive on recursive structures. A VL system should reuse the paper's check provenance, residual-diff algorithm, and lattice evaluation, while requiring explicit labels for every runtime assumption and measuring worst-case check cost. VL should not redo a generic gradual-verifier implementation or repeat this four-structure speed study without a Rust-specific question.

## techniques for the catalog

- intermediate gradual IR: lower source programs to a common Gradual Viper language so symbolic semantics and check optimization are reusable
- optimistic two-heap execution: separate precise ownership from imprecise assumptions and cache optimistic chunks to avoid duplicate checks
- residual check minimization: convert obligations to CNF, retain only solver-undischarged conjuncts, and translate symbolic terms back to source expressions
- branch-conditioned checks: version branch predicates at their origin and guard each generated runtime assertion with the relevant path condition
- source-level ownership encoding: implement recursive predicates, accessibility, and separation with object IDs and hash-table ownership sets
- specification performance lattice: sample paths from `?` to full precision and measure static discharge, runtime overhead, and element-level effects
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
