# From Matching Logic To Parallel Imperative Language Verification
(authored by agents unless marked 🧑)
Tag: `wang2021matching`, [paper](http://arxiv.org/abs/2102.04011v1)

## scope and result

ShangBei Wang defines a parallel imperative language (PIMP), gives its operational semantics as a rewriting-logic theory, builds a matching-logic proof system over that semantics, and implements a symbolic verifier. The paper's central trust argument is a chain: executable operational rules define the language; matching-logic rules are proved sound with respect to those rules; the verifier symbolically executes annotated configurations and is proved sound and complete for the matching-logic system. The abstract states, “we prove the soundness of matching logic to the operational semantics of PIMP,” and that the verifier “is sound and complete to matching logic for PIMP” (Abstract, p. 1).

The work is a formal development and one producer-consumer demonstration, not a performance evaluation. It assumes a PIMP program whose program variables do not collide with the logical-variable set used by matching logic (Section 3, p. 13). The result is a recipe for making concurrency interference an explicit proof obligation instead of trusting an ad-hoc verifier translation.

## technique 1: define executable parallel semantics as rewriting rules

What it is. PIMP extends IMP with `await`, parallel composition, arrays, and memory. A configuration is `<computation>k <environment>env <memory>mem`; environments map variables to integers and memory maps positive natural addresses to integers (Section 2, pp. 3–4). The rewrite theory contains rules for assignment, arrays, conditionals, loops, `await`, parallel scheduling, and the environment action. The paper explains, “PAR1 and PAR2 semantic rules use non-determinism to simulate parallelism, but they are defined in such a way that the results are equivalent to those which would be obtained using true parallelism” (Section 2, p. 4).

How to use it.

1. Define the syntax of expressions, Boolean tests, sequential commands, `while`, `await`, and parallel `c1 k c2` (Section 2, Fig. 2, p. 4).
2. Define configuration components for code, environment, and memory (Section 2, pp. 3–4).
3. Give a rewrite rule for each construct. For example, assignment updates the environment; array assignment evaluates a base and index and updates memory; `WHILE1` expands a true loop into `c; while b do c`; `WHILE2` terminates a false loop (Section 2, Fig. 2, p. 4).
4. Define `AWAIT` so its body is an indivisible command executed only when its guard is true; otherwise the process is blocked (Section 2, p. 3).
5. Define `PAR1` and `PAR2` to take one step from either parallel component, and define `ENV` to model updates caused by another computation executing in parallel (Section 2, Fig. 2, pp. 4–5).
6. Define concrete configurations, finite or infinite executions, and final configurations (Definitions 1–2, pp. 5–6).

Verus form. Inference: represent the executable Rust state with ordinary structs and arrays, and define a ghost state-machine or transition relation as a `spec fn`. Each allowed step can be a `proof fn` with `requires` for the current state and `ensures` for the next state; invariants belong in loop `invariant` declarations or transition lemmas. Inference: Verus does not inherit PIMP's rewrite theory automatically. A VL implementation must prove that each Rust operation refines the chosen ghost transition and must model scheduler and `await` behavior explicitly.

Evidence and limits. The paper proves propositions about its rewrite semantics, including that a terminable parallel execution can be decomposed into component executions (Proposition 3, p. 6). The semantics is trusted as the reference model; the paper does not measure interpreter speed or compare against a real language. Its memory is a simple integer map, so C/Rust layout, ownership, and pointer validity are outside the model unless added separately.

## technique 2: matching-logic configuration patterns and sequential proof rules

What it is. A matching-logic pattern combines a configuration term with existentially bound logical variables and a first-order constraint: `∃X((o = c) ∧ ϕ)` (Definition 6, p. 12). A correctness pair relates a pre-execution configuration pattern to a final configuration pattern. The proof system in Figure 3 gives rules for skip, assignments, arrays, sequencing, conditionals, `await`, loops, and parallel composition (Section 3, pp. 12–13).

How to apply it.

1. Choose logical variables for values that must persist across execution and keep program variables as syntactic configuration terms (Section 3, p. 12).
2. Write a pre-pattern containing code, environment, memory, bound variables, and a constraint ϕ (Definition 6, p. 12).
3. Apply the corresponding rule. `M-ASGN1` substitutes the evaluated expression into the environment; `M-ARRAY` allocates a fresh address and extends the bound-variable set; `M-SEQ` composes proofs of the two commands (Fig. 3, p. 12).
4. For an `if`, prove both branches under the guard and its negation with `M-IF` (Fig. 3, p. 12).
5. For a loop, prove the body preserves ϕ under the true guard and conclude ϕ plus the false guard at exit with `M-WHILE` (Fig. 3, p. 12).
6. Use consequence (`M-CONS`) to strengthen or weaken constraints when the needed implication is valid (Fig. 3, p. 12).

Verus form. Inference: encode a configuration pattern as a ghost state record plus a `spec fn` predicate over that record. Use `requires` for the pre-pattern, `ensures` for the post-pattern, and `assert` or `proof fn` lemmas for each rule application. Use `decreases` for a recursive proof of an inductive execution relation when needed. Inference: existential logical variables become ghost values or quantified specifications; they are not runtime Rust variables.

Evidence and limits. The paper's soundness theorem states that an actual execution starting in a pattern satisfying Γ ends in a state satisfying Γ0 whenever Γ ⇓ Γ0 is derivable (Theorem 10, p. 13). “For any actual execution σ ... if (γ0, τ) |= Γ and Γ ⇓ Γ0 is derivable, then (γn, τ) |= Γ0” (Theorem 10, p. 13). The theorem relies on the paper's definition of actual execution and the no-name-collision assumption; it does not establish soundness for arbitrary external languages.

## technique 3: interference-free parallel rule

What it is. The parallel proof rule allows separate proofs of `c1` and `c2` only when they are interference-free. The paper says, “M-PAR rule in Figure 3 says that as long as c1 , c2 don’t interfere with each other, the effect of executing c1 and c2 in parallel is the same as executing c1 and c2 separately” (Section 3, p. 13). Definition 7 says a computation does not interfere with a component when it preserves that component's postcondition and every subcomputation's precondition; Definition 8 requires the two directions for all assignments and `await` subcomputations outside an `await` body (Section 3, pp. 13–14).

How to apply it.

1. Write a proof outline `pre(c1) c1 post(c1)` and similarly for `c2` (Definitions 7–8, pp. 13–14).
2. Enumerate each assignment or `await` subcomputation of `c1` that is outside an `await`; check that `c2` preserves its postcondition and subcomputation preconditions (Definition 8, p. 14).
3. Perform the symmetric checks for subcomputations of `c2` against `c1` (Definition 8, p. 14).
4. If both directions hold, apply `M-PAR` to combine the preconditions and combine the postconditions with conjunction (Fig. 3, p. 12).
5. Define an actual execution as one whose concurrent environment updates satisfy these interference conditions (Definition 9, p. 14).

Verus form. Inference: represent each process's rely facts and shared-state invariant as ghost predicates. Prove each process operation preserves the other's predicate with `proof fn` lemmas; use `requires` for the shared invariant at an operation and `ensures` for its preservation. Encode `await` as a verified transition that requires the guard and atomically updates the ghost state. Verus ownership can enforce disjoint mutable access, but shared producer-consumer memory needs a protocol or state-machine proof; the paper's interference relation does not arise automatically from Rust borrowing.

Evidence and limits. Theorem 10 proves soundness for actual executions, but the rule is deliberately conditional: arbitrary shared-variable programs are not accepted unless the preservation checks succeed. The paper notes that forbidding all shared variables would be easiest but too restrictive for producer-consumer synchronization (Section 3, p. 13). Inference: this is a proof obligation, not a scheduler guarantee; fairness and liveness are outside the stated safety theorem.

## technique 4: symbolic matching-logic verifier with assertions

What it is. The verifier extends PIMP configurations with a formula, a bound-variable set, and `assert` commands. It rewrites a pattern into successor patterns and discharges assertions by implication. `V-IF` creates two branches with the guard and its negation; `V-WHILE` creates a body branch with an inserted assertion and an exit branch with the negated guard; `V-PAR` checks interference, symbolically executes both processes, and intersects their resulting states (Section 4, Fig. 4, pp. 22–23).

How to apply it.

1. Add an initial `assert` for the precondition and a final `assert` for the postcondition (Section 4, p. 23).
2. Rewrite assignments, array operations, and allocation symbolically, updating the environment, memory, and formula (Fig. 4, p. 22).
3. On a conditional, fork the pattern and conjoin the appropriate guard to each branch (rule `V-IF`, p. 22).
4. On a loop, fork a body pattern with the loop guard and a preserved assertion, and an exit pattern with the negated guard (rule `V-WHILE`, p. 22).
5. On parallel composition, require interference-freedom, compute each component's symbolic result, assert each result, and intersect the results before continuing (rule `V-PAR`, p. 22).
6. Reduce a pattern to the empty configuration only when each assertion follows from the current formula. Theorem 12 states the correspondence: “If <<k; assert asspost >k asspre >→∗ <·>, then <k>k asspre ⇓<·>k asspost is derivable from matching logic” (Section 4, p. 23).

Verus form. Inference: a Verus harness can use executable code for the transition and `assert` statements for local obligations, with a `proof fn` for each symbolic rule. Branch obligations become separate proof paths; loop obligations become `invariant` preservation and exit proofs; parallel composition becomes a lemma that combines two state-machine transitions under an interference predicate. Inference: the paper's rewrite engine and implication checker are not Verus features; implementing them would be a separate verified interpreter or a ghost proof library.

Evidence and limits. Theorem 12 gives soundness and completeness of the verifier relative to the paper's matching-logic proof system, not relative to Rust or Verus. The paper's example validation starts from `<<in := 0; out := 0; i := 1; j := 1; assert ass1 ; (producer k consumer); assert asspost >>` and succeeds when rewriting reaches the empty pattern (Section 5, pp. 37–38). No runtime, proof-size, or failure-rate measurements are reported.

## technique 5: producer-consumer proof outline

What it is. The example uses a bounded circular buffer `C` of size `N`, counters `in` and `out`, producer index `i`, consumer index `j`, and source/destination arrays `A` and `B` (Section 5, pp. 34–37). Producer waits for `in-out < N`, writes `C[in mod N]`, increments `in` and `i`; consumer waits for `in-out > 0`, reads `C[out mod N]`, increments `out`, writes `B[j]`, and increments `j` (Fig. 5, p. 34).

How to apply it.

1. State the buffer invariant `0 ≤ in-out ≤ N`, index bounds, and the correspondence between buffer positions and source values (Figs. 6–7, pp. 35–36).
2. Add assertions after initialization and at loop heads (Figs. 6–7, pp. 35–36).
3. Prove each producer step preserves its assertion, including the await guard and modular write (Fig. 6, pp. 35–36).
4. Prove each consumer step preserves its assertion, including the await guard, modular read, and destination write (Fig. 7, pp. 36–37).
5. Check that `out := out + 1` preserves the producer's potentially affected assertions and symmetrically that producer operations preserve consumer assertions (Section 5, pp. 35–37).
6. Combine the two proof outlines with `M-PAR` and run the verifier from the initialized state to the final assertion (Section 5, pp. 37–38).

Verus form. Inference: represent the queue counters and buffer contents in a Rust struct, and define a ghost sequence relation connecting `A`, `C`, and `B`. Give producer and consumer methods `requires` clauses for capacity and nonempty conditions and `ensures` clauses preserving the sequence relation. A Verus state-machine proof can make each enqueue/dequeue atomic transition explicit. Inference: modulo arithmetic, aliasing, and the environment interference relation need explicit lemmas; the paper's integer-map model cannot be copied as a Rust memory proof.

Evidence and limits. The example demonstrates the proof rules and verifier path, but reports no parameterized result count, runtime, or maximum `M`/`N`. Trusted elements include the PIMP rewrite semantics, matching-logic rule soundness, arithmetic reasoning, and the initial/final assertions. Liveness of producer and consumer, scheduler fairness, and absence of deadlock are not claimed.

## what is proved, measured, and trusted

The paper proves operational-semantics propositions, soundness of matching logic for actual PIMP executions (Theorem 10), and soundness/completeness of the symbolic verifier relative to the matching-logic proof system (Theorem 12). It demonstrates one producer-consumer validation. It does not measure scalability, compare solver times, or prove correctness of a Rust implementation. Its model and proof obligations are precise, but the trusted base includes the rewrite theory, the initial algebra, formula implication checks, and assumptions such as variable-name separation.

Inference: threat to agent-written verified Rust is substantial when a product treats a high-level concurrency proof as proof of the concrete scheduler, memory model, or liveness. The transferable idea is to make operational semantics and interference conditions explicit and to connect verifier steps to that semantics. VL should not redo a generic claim that symbolic rewriting is sound; it should test a concrete Rust/Verus state-machine encoding and measure which interference lemmas agents can generate and maintain.

## techniques for the catalog

- rewriting-logic operational model: define executable language behavior as explicit configuration rewrite rules
- matching-logic proof outline: connect pre/post configuration patterns with first-order constraints and rule applications
- interference-free parallel rule: require mutual preservation of each process's assertions before composing proofs
- symbolic assertion verifier: branch, loop, and parallel rewrite rules carry formulas and discharge assertions
- producer-consumer outline: prove bounded-buffer safety with modular indices, await guards, and cross-process preservation
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
