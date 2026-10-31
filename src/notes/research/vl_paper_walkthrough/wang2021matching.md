# From Matching Logic To Parallel Imperative Language Verification
(authored by agents unless marked 🧑)
Tag: `wang2021matching`, [paper](http://arxiv.org/abs/2102.04011v1)

## scope and result

ShangBei Wang defines a parallel imperative language (PIMP), gives its operational semantics as a rewriting-logic theory, builds a matching-logic proof system over that semantics, and defines a symbolic verifier as a set of rewrite rules on paper. The verifier is not implemented: the conclusion says, “Unfortunately, there is no practical executable matching logic verifier in this paper” (Section 6, p. 40). The paper's central trust argument is a chain: executable operational rules define the language; matching-logic rules are proved sound with respect to those rules; the verifier rules rewrite annotated configuration patterns and are proved sound and complete for the matching-logic system. The abstract says the author will “prove the soundness of matching logic to the operational semantics of PIMP” and that the verifier “is sound and complete to matching logic for PIMP” (Abstract, p. 1).

The work is a formal development and one producer-consumer demonstration, not a performance evaluation. It assumes “the original PIMP program don’t contain variables in SVar,” that is, program variables do not collide with the logical-variable set (Section 3, p. 13). Inference: the result is a recipe for making concurrency interference an explicit proof obligation instead of trusting an ad-hoc verifier translation.

## technique 1: define executable parallel semantics as rewriting rules

What it is. PIMP extends IMP with `await`, parallel composition, arrays, and memory. A configuration is `<computation>k <environment>env <memory>mem`; environments map variables to integers and memory maps positive natural addresses to integers (Section 2, p. 3). The rewrite theory contains rules for assignment, arrays, conditionals, loops, `await`, parallel scheduling, and the environment action. The paper explains, “PAR1 and PAR2 semantic rules use non-determinism to simulate parallelism, but they are defined in such a way that the results are equivalent to those which would be obtained using true parallelism” (Section 2, p. 4).

How to use it.

1. Define the syntax of expressions, Boolean tests, sequential commands, `while`, `await`, and parallel `c1 k c2` (Section 2, Fig. 2, p. 4).
2. Define configuration components for code, environment, and memory (Section 2, p. 3, Fig. 2, p. 4).
3. Give a rewrite rule for each construct. For example, assignment updates the environment; array assignment evaluates a base and index and updates memory; `WHILE1` expands a true loop into `c; while b do c`; `WHILE2` terminates a false loop (Section 2, Fig. 2, p. 4).
4. Define `AWAIT` so its body is an indivisible command executed only when its guard is true; otherwise the process is blocked (Section 2, p. 3, Fig. 2, p. 4).
5. Define `PAR1` and `PAR2` to take one step from either parallel component, and define `ENV` to model updates caused by another computation executing in parallel (Section 2, Fig. 2, pp. 4–5).
6. Define concrete configurations and final configurations (Section 2, p. 5), and finite or infinite executions, called terminable when finite and ending in final configurations (Definitions 1–2, p. 5).

Verus form.

Evidence and limits. The paper proves propositions about its rewrite semantics, including that a terminable parallel execution can be decomposed into component executions (Proposition 3, statement p. 5, proof pp. 5–6). The paper treats the semantics as the trusted reference model; it does not measure interpreter speed or compare against a real language. Inference: its memory is a simple map from positive naturals to integers, so C/Rust layout, ownership, and pointer validity are outside the model unless added separately.

## technique 2: matching-logic configuration patterns and sequential proof rules

What it is. A matching-logic pattern combines a configuration term with existentially bound logical variables and a first-order constraint: `∃X((o = c) ∧ ϕ)` (Definition 6, p. 11). A correctness pair relates a pre-execution configuration pattern to a final configuration pattern. The proof system in Figure 3 gives rules for skip, assignments, arrays, sequencing, conditionals, `await`, loops, parallel composition, and the consequence and case-split rules `M-CONS` and `M-CASE` (Section 3, Fig. 3, p. 12).

How to apply it.

1. Choose logical variables for values that must persist across execution and keep program variables as syntactic configuration terms, since “one can’t quantify program variables because they are syntactic constants” (Section 3, p. 11).
2. Write a pre-pattern containing code, environment, memory, bound variables, and a constraint ϕ (Definition 6, p. 11).
3. Apply the corresponding rule. `M-ASGN1` substitutes the evaluated expression into the environment; `M-ARRAY` allocates a fresh address and extends the bound-variable set; `M-SEQ` composes proofs of the two commands (Fig. 3, p. 12).
4. For an `if`, prove both branches under the guard and its negation with `M-IF` (Fig. 3, p. 12).
5. For a loop, prove the body preserves ϕ under the true guard and conclude ϕ plus the false guard at exit with `M-WHILE` (Fig. 3, p. 12).
6. Use consequence (`M-CONS`) to strengthen or weaken constraints when the needed implication is valid (Fig. 3, p. 12).

Verus form. Inference: encode a configuration pattern as a ghost state record plus a `spec fn` predicate over that record. Use `requires` for the pre-pattern, `ensures` for the post-pattern, and `assert` or `proof fn` lemmas for each rule application. Use `decreases` for a recursive proof of an inductive execution relation when needed. Inference: existential logical variables become ghost values or quantified specifications; they are not runtime Rust variables.

Evidence and limits. The paper's soundness theorem states that an actual execution starting in a pattern satisfying Γ ends in a state satisfying Γ0 whenever Γ ⇓ Γ0 is derivable (Theorem 10, p. 13). The theorem reads: “if (γ0 , τ ) |= Γ and Γ ⇓ Γ0 is derivable, then (γn , τ ) |= Γ0” (Theorem 10, p. 13). It relies on the paper's definition of actual execution (Definition 9) and the no-name-collision assumption; Inference: it does not establish soundness for arbitrary external languages.

## technique 3: interference-free parallel rule

What it is. The parallel proof rule allows separate proofs of `c1` and `c2` only when they are interference-free. The paper says, “M-PAR rule in Figure 3 says that as long as c1 , c2 don’t interfere with each other, the effect of executing c1 and c2 in parallel is the same as executing c1 and c2 separately” (Section 3, p. 13). Definition 7 says a computation does not interfere with a component when it preserves that component's postcondition and every subcomputation's precondition; Definition 8 requires the two directions for all `await` or `:=` subcomputations that do not appear inside an `await` (Section 3, p. 13).

How to apply it.

1. Write a proof outline `pre(c1) c1 post(c1)` and similarly for `c2` (Definitions 7–8, p. 13).
2. Enumerate each assignment or `await` subcomputation of `c1` that is outside an `await`; check that `c2` preserves its postcondition and subcomputation preconditions (Definitions 7–8, p. 13).
3. Perform the symmetric checks for subcomputations of `c2` against `c1` (Definition 8, p. 13).
4. If both directions hold, apply `M-PAR`; both premises start from the same environment and memory and end in the same final environment and memory, and the conclusion conjoins the two constraints before and after (Fig. 3, p. 12).
5. Define an actual execution as a terminable execution in which every computation running in parallel is interference-free with the one being proved (Definition 9, p. 13).

Verus form. Inference: represent each process's rely facts and shared-state invariant as ghost predicates. Prove each process operation preserves the other's predicate with `proof fn` lemmas; use `requires` for the shared invariant at an operation and `ensures` for its preservation. Encode `await` as a verified transition that requires the guard and atomically updates the ghost state. Verus ownership can enforce disjoint mutable access, but shared producer-consumer memory needs a protocol or state-machine proof; the paper's interference relation does not arise automatically from Rust borrowing.

Evidence and limits. Theorem 10 proves soundness for actual executions, and `M-PAR` applies only when the interference-free side condition holds. The paper notes that “The easiest way to get "interference-free" is not to allow shared variables, but this is too restrictive to handle the synchronization of producer and consumer” (Section 3, p. 13). The conclusion lists removing the dependence on interference-freedom as future work (Section 6, p. 40). Inference: this is a proof obligation, not a scheduler guarantee; fairness and liveness are outside the stated theorem, which does not mention them.

## technique 4: symbolic matching-logic verifier with assertions

What it is. The verifier extends PIMP configurations with a formula cell, a bound-variable cell, and `assert` commands. Its rules rewrite a pattern into successor patterns and discharge assertions by implication (`V-ASSERT` requires that the current assertion implies the asserted one). The paper defines these rules but does not implement them. `V-IF` creates two branches with the guard and its negation; `V-WHILE` creates a body branch with an inserted assertion and an exit branch with the negated guard; `V-PAR` checks interference, symbolically executes both processes, and intersects their resulting states (Section 4, p. 21, Fig. 4, p. 22).

How to apply it.

1. Annotate the program: the precondition is the initial pattern `asspre`, and a final `assert asspost` is appended (Theorem 12, p. 23); the paper's mapping from proof derivations to annotated programs inserts `assert` before and after each construct (p. 28).
2. Rewrite assignments, array operations, and allocation symbolically, updating the environment, memory, and formula (Fig. 4, p. 22).
3. On a conditional, fork the pattern and conjoin the appropriate guard to each branch (rule `V-IF`, p. 22).
4. On a loop, fork a body pattern with the loop guard and a preserved assertion, and an exit pattern with the negated guard (rule `V-WHILE`, p. 22).
5. On parallel composition, require interference-freedom, compute each component's symbolic result, assert each result, and intersect the results before continuing (rule `V-PAR`, p. 22).
6. Reduce a pattern to the empty configuration only when each assertion follows from the current formula. Theorem 12 states the correspondence: “If <<k; assert asspost >k asspre >→∗ <·>, then <k>k asspre ⇓<·>k asspost is derivable from matching logic” (Section 4, p. 23).

Verus form. Inference: a Verus harness can use executable code for the transition and `assert` statements for local obligations, with a `proof fn` for each symbolic rule. Branch obligations become separate proof paths; loop obligations become `invariant` preservation and exit proofs; parallel composition becomes a lemma that combines two state-machine transitions under an interference predicate. Inference: the paper's rewrite engine and implication checker are not Verus features; implementing them would be a separate verified interpreter or a ghost proof library.

Evidence and limits. Theorem 12 gives soundness (part 1) and completeness (part 2) of the verifier relative to the paper's matching-logic proof system, not relative to Rust or Verus. The paper's example starts from `Γstart ≡<<in := 0; out := 0; i := 1; j := 1; assert ass1 ; (producer k consumer); assert asspost >k asspre >`; “< Γstart >→∗ < · > means Producer-Consumer is validated,” and Figure 8 lists the rewrite sequence ending in `< · >` (Section 5, pp. 37–38). Inference: since no verifier is implemented, this sequence is a hand-presented trace. No runtime, proof-size, or failure-rate measurements are reported.

## technique 5: producer-consumer proof outline

What it is. The example uses a bounded circular buffer `C` of size `N`, counters `in` and `out`, producer index `i`, consumer index `j`, and source/destination arrays `A` and `B` (Section 5, pp. 33–37). Producer reads `x := A[i]`, waits for `in-out < N`, writes `C[in mod N] := x`, increments `in` and `i`; consumer waits for `in-out > 0`, reads `C[out mod N]`, increments `out`, writes `B[j]`, and increments `j` (Fig. 5, p. 34).

How to apply it.

1. State the buffer invariant `0 ≤ in-out ≤ N`, index bounds, and the correspondence between buffer positions and source values (Figs. 6–7, pp. 35–36).
2. Write an assertion between consecutive statements, including after initialization and at the loop head (Figs. 6–7, pp. 35–36); two consecutive assertions denote a use of `M-CONS` (Section 5, p. 34).
3. Give the producer proof outline, covering the await guard and modular write (Fig. 6, p. 35).
4. Give the consumer proof outline, covering the await guard, modular read, and destination write (Fig. 7, p. 36).
5. Check interference: the paper states that the only consumer operation that might invalidate the producer's assertions is `out := out + 1`, lists two producer assertions (6 and 7 of Fig. 6) that could be affected, and checks them in detail; for the other direction it says only “Similarly, the producer does not interfere with the consumer” (Section 5, pp. 34–37).
6. State the outline of `producer k consumer` (p. 37) and run the verifier rules from the initialized state to the final assertion (Figure 8, pp. 37–38).

Verus form. Inference: represent the queue counters and buffer contents in a Rust struct, and define a ghost sequence relation connecting `A`, `C`, and `B`. Give producer and consumer methods `requires` clauses for capacity and nonempty conditions and `ensures` clauses preserving the sequence relation. A Verus state-machine proof can make each enqueue/dequeue atomic transition explicit. Inference: modulo arithmetic, aliasing, and the environment interference relation need explicit lemmas; the paper's integer-map model cannot be copied as a Rust memory proof.

Evidence and limits. The example demonstrates the proof rules and verifier rules on paper, but reports no runtime or tool output. `M` and `N` stay symbolic. Inference: trusted elements include the PIMP rewrite semantics, matching-logic rule soundness, arithmetic reasoning, and the initial/final assertions. The paper does not claim liveness of producer and consumer, scheduler fairness, or absence of deadlock.

## what is proved, measured, and trusted

The paper proves operational-semantics propositions, soundness of matching logic for actual PIMP executions (Theorem 10), and soundness/completeness of the symbolic verifier relative to the matching-logic proof system (Theorem 12). It demonstrates one producer-consumer validation, and says it achieved the goal of a proof system sound to a trusted operational semantics “in theory” (Section 6, p. 40). It does not measure scalability, compare solver times, implement the verifier, or prove correctness of a Rust implementation. Inference: its model and proof obligations are precise, but the trusted base includes the rewrite theory, the initial algebra, formula implication checks, and assumptions such as variable-name separation.

## techniques for the catalog

- rewriting-logic operational model: define executable language behavior as explicit configuration rewrite rules
- matching-logic proof outline: connect pre/post configuration patterns with first-order constraints and rule applications
- interference-free parallel rule: require mutual preservation of each process's assertions before composing proofs
- symbolic assertion verifier: branch, loop, and parallel rewrite rules carry formulas and discharge assertions
- producer-consumer outline: prove bounded-buffer safety with modular indices, await guards, and cross-process preservation
