# Cuvée: Blending SMT-LIB with Programs and Weakest Preconditions
(authored by agents unless marked 🧑)
Tag: `ernst2020cuvee`, [paper](http://arxiv.org/abs/2010.05023v1)

## purpose and contribution
Cuvée extends SMT-LIB with abstract While programs and weakest-precondition terms. The paper says, “Cuvée is a program verification tool that reads SMT-LIB-like input files where terms may additionally contain weakest precondition operators over abstract programs.” (Abstract, p. 1). The implementation symbolically executes these operators into first-order SMT-LIB and delegates satisfiability to an SMT solver. The design target is interoperability: retain SMT-LIB's standardized syntax while allowing guided functional-correctness proofs.

The distinctive annotation technique is replacing loop invariants with a loop precondition and postcondition. The abstract states, “A notable technical aspect of Cuvée itself is the consequent use of loop pre-/postconditions instead of invariants, and we demonstrate how this lowers the annotation burden on some simple while programs.” (Abstract, p. 1). Inference: use this when a loop contract can summarize the permitted entry and exit states and when symbolic execution can discharge the resulting premises; it is less suitable when a strong inductive invariant is the natural reusable fact.

## technique 1: weakest-precondition SMT-LIB embedding

What it is. Cuvée adds `(wp p t)`, `(box p t)`, and `(dia p t)` terms. The paper defines wp as total correctness, box as weakest liberal precondition (nontermination allowed), and dia as an existential terminating execution. A Hoare triple `[φ] p [ψ]` is encoded as `(=> φ (wp p ψ))` (Syntax, §2, pp. 2–3). This is useful when a verification condition already lives in SMT-LIB and should compose with quantifiers, arrays, and ordinary first-order terms.

Steps (Inference: the study's reading of §2, p. 2; the paper gives no step list). (1) Write the postcondition as an SMT-LIB Boolean term. (2) Build a program using `assign`, `block`, `if`, `while`, or `spec`. (3) Wrap it in `(wp p t)` for total correctness, `(box p t)` for partial correctness, or `(dia p t)` for angelic choice. (4) Assert the negation of the implication from the precondition (the paper's `assert-counterexample φ p ψ` "roughly translates to (assert (not (=> φ (wp p ψ))))", §2, p. 3) and ask the backend for satisfiability. The paper states, “Cuvée translates such inputs into first-order SMT-LIB by symbolically executing these programs.” (Abstract, p. 1).

The core rules are executable substitutions: parallel assignment substitutes all right-hand sides simultaneously; block nests wp operators; an if creates implications for both branches (Proof Rules, §3, p. 4). Specification statements assert a precondition, havoc selected variables, then assume a postcondition. They encode assertion, assumption, and havoc directly (Syntax, §2, p. 3). The `old` term records a pre-state; inside a specification statement it refers to that statement's pre-state.

Verus form (Inference: the paper does not discuss Verus). A Rust function would keep executable assignments and branches, then state `requires` and `ensures` clauses. A loop normally needs `invariant` clauses; Verus has no Cuvée `wp`, `box`, or `dia` syntax. A Cuvée havoc/spec statement corresponds to an abstract value constrained by a precondition and postcondition, which in Verus would plausibly be a ghost variable plus a lemma. Cuvée's simultaneous assignment must be preserved with temporaries if Rust evaluation order would otherwise differ. `old` in a Verus postcondition is written `old(expr)` where supported by the Verus construct.

Evidence and limits. The tool is Scala code using SMT backends; the paper gives command lines `./cuvee <file> -o <out>` and `./cuvee <file1> ... -- ./z3 -in` (Tool Description, §4, p. 5). An `unsat` result means no counterexample to the requested contract (Syntax, §2, p. 3). This trusts the SMT solver, translation, and the supplied specification. The paper reports no benchmark table or aggregate success denominator.

## technique 2: loop pre/postcondition rule

What it is. A loop is written `(while b p :termination t :precondition φ :postcondition ψ)`. All three annotations are optional (§2, p. 3). For `assert-counterexample` with an unannotated top-level while loop, the paper says Cuvée "implements special cases ... to derive the loop specification from such a contract" (§2, p. 3). The loop rule shown in Fig. 2 is stated for `box` and omits termination conditions; it has three premises (Proof Rules, §3, p. 4): abstract all iterations with a specification statement; prove the base case when `b` is false; prove the inductive case by showing one body execution followed by the abstract remaining-loop specification establishes `ψ`.

Apply it step by step. (1) Choose `φ` describing states at loop entry and `ψ` relating entry to exit states (Inference: `ψ` may use `old` for the pre-loop state). (2) Supply a termination measure `t` (Inference: needed for total correctness; the paper's Fig. 2 rule omits termination). (3) Discharge the three premises generated by the rule: the whole-loop specification statement followed by `Q`, the exit/base premise, and the body/inductive premise. (4) Let symbolic execution substitute assignments and let the SMT solver discharge the first-order premises. The paper warns that “The interaction between the different occurrences of old is somewhat intricate” (Proof Rules, §3, p. 5). Within the inductive specification statement `old` refers to the state after the first iteration, while in the final `ψ` it refers to the state before the first iteration (§3, p. 5).

Verus form (Inference). Encode `φ` as `requires`, `ψ` as `ensures`, and the loop's inductive fact as `invariant` clauses. Encode a termination measure with a `decreases` clause. The three Cuvée premises become ordinary Verus proof obligations around the loop body; there is no direct way to write a Cuvée specification statement that assumes an arbitrary future state. A ghost snapshot can model the pre-loop state for postconditions.

Example and evidence. The paper's maximum-array example (from VerifyThis 2012) has precondition `x ≤ y`, increments `x` or decrements `y` based on array values, and uses `:termination (- y x)`. Its postcondition quantifies `z` between `(old x)` and `(old y)` and proves `a[z] ≤ a[x]` (Example, §5, pp. 5–6). The authors say, “Cuvée infers the precondition and postcondition of the loop from the specified contract, such that the example is solved without further interaction.” (Example, §5, p. 5). This is one worked example, not a measured success rate; no denominator is supplied.

## what is proved, trusted, and missing

The proved object is satisfiability of translated first-order verification conditions, hence validity of the stated contract when the solver returns unsat. The executable Scala translator, SMT solver, semantics of arrays and quantifiers, and correctness of the contract remain trusted. The paper plans recursive procedures and standardization (Conclusion, §6, p. 6), so procedure calls and a broad empirical comparison are outside the demonstrated system.

## techniques for the catalog
- weakest-precondition embedding — express abstract programs as `(wp)`, `(box)`, and `(dia)` terms and symbolically reduce them to SMT-LIB
- specification statements — model assertion, assumption, havoc, and transition relations with pre/postconditions and `old`
- loop contracts without invariants — prove whole-loop, exit, and inductive premises from loop precondition, postcondition, and termination measure
- counterexample command — encode a Hoare triple's negation so an `unsat` solver result certifies no counterexample
