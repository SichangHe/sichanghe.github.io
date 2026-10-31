# ConCert: a smart contract certification framework in Coq
(authored by agents unless marked 🧑)
Tag: `annenkov2020concert`, [paper](https://arxiv.org/abs/1907.10674v4)

## what is proved or measured
ConCert combines a deep embedding of a functional smart-contract language with a shallow embedding as ordinary Coq functions. Its abstract says: “We connect the deep and the shallow embeddings by a soundness theorem.” (Abstract, p. 1). The case study defines λsmart, a core Acorn language, proves translation soundness and adequacy for terminating programs, proves four crowdfunding properties, verifies List functions against Coq's standard library, and proves blockchain safety properties. The supplied version is dated 20 Dec 2019 (p. 1). The paper provides an artifact link for the theorems of Section 2.4 and lemmas of Sections 3–5 (Introduction, p. 3).

## technique 1: deep syntax plus executable reference interpreter

what it is: represent language programs as a type-annotated AST (`expr`, types, patterns, and global environments), then define a fuel-bounded definitional interpreter `eval : global_env → nat → env val → expr → res val`. The AST supports System F types, inductive types, general recursion, and pattern matching (Section 2.2, pp. 4–6). The interpreter returns `Ok` with a value, `NotEnoughFuel` when fuel is insufficient, or `EvalError` when execution is stuck (p. 6).

when to use: Inference: use a deep interpreter when proving language-level properties, validating generated syntax, or needing an executable reference semantics alongside a translated implementation. Fuel bounds recursion and makes the interpreter structurally recursive; it is not blockchain gas.

how to do it:
1. define type-annotated AST constructors and a global environment of inductive declarations (Section 2.2)
2. use de Bruijn indices for term and type variables
3. define values for constructors, closures, type closures, and types
4. evaluate with an explicit fuel argument and an environment
5. validate expressions and branches against the environment and require constructor arguments for fixpoints
6. return an error result when fuel is exhausted or evaluation is stuck

The paper says: “The semantics of λsmart is given as a definitional interpreter.” (Section 2.2, p. 5). For recursive calls it extends the environment with the argument and the fixpoint closure and checks that the argument is a constructor, possibly applied to arguments. This aligns evaluation with MetaCoq; functions cannot be arguments to λsmart fixpoints (p. 6). Inference: this check alone does not enforce structural recursion.

Verus form. Inference: encode the AST as Rust enums and the result as an error/value enum. Use a recursive `spec fn` or proof-level model for bounded evaluation, with `requires` for well-formed environments and a `decreases` measure for fuel. Prove executable interpreter/refinement facts with `proof fn` lemmas and `ensures`. Verus cannot treat an arbitrary recursive runtime evaluator as terminating without a measure.

evidence and limits: the interpreter semantics is executable, but the paper's soundness theorem applies to terminating runs and well-formed environments. It does not formalize λsmart static semantics; the authors state that typing-based adequacy remains future work (Section 2.4, pp. 11–12).

## technique 2: syntactic translation to MetaCoq with de Bruijn bookkeeping

what it is: structurally translate λsmart ASTs to MetaCoq terms, resolve constructors through the global environment, lift indices under binders, and turn pattern branches into ordered lambda abstractions (Section 2.3, pp. 7–9). The crowdfunding example converts named variables with `indexify` before translation and unquoting (Section 3, p. 14). The Acorn library example instead merges separate term/type index spaces with `reindexify` (Section 4, p. 15). Translation is total when the global environment contains all referenced inductive definitions (p. 7). Universal types translate with domains in `Set`, limiting the translation to a predicative fragment; Acorn supports only top-level universal quantifiers (p. 8).

how to apply it: (1) define `expr_to_term` and type translation by structural recursion; (2) resolve inductive and constructor names and positions; (3) lift free indices in translated types where added binders require it; (4) reorder branches to MetaCoq's constructor order; (5) desugar patterns into iterated lambdas with substituted argument types; (6) unquote the resulting term with Template Coq. The paper warns: “Moreover, the translation involves manipulation of de Bruijn indices, which is often quite hard to get right.” (Section 2.4, p. 12).

Verus form. Inference: represent the source AST and target AST as immutable Rust enums, with a `spec fn` translation and proof functions for index shifting, substitution, constructor lookup, and branch-order preservation. Use `requires` to state well-formed global environments and `ensures` to state translation invariants. Verus does not provide MetaCoq's unquote facility; adding generated Rust declarations remains a trusted build step unless separately checked.

evidence: The development proves translation soundness: for a terminating λsmart evaluation, the translated MetaCoq term evaluates to the translated result. Theorem 1 requires a well-formed global environment, well-formed values, and a closed substituted expression (Section 2.4, p. 11). Adequacy assumes source evaluation terminates and identifies the result of any corresponding MetaCoq evaluation using determinism (Theorem 2, p. 11). It does not establish that MetaCoq termination implies source termination; that stronger result is conjectured on p. 12.

## technique 3: soundness by value conversion and environment-substitution lemmas

what it is: connect closure-based λsmart values to substitution-based MetaCoq values by converting values back to expressions, translating them, and proving environment substitution commutes with translation. The paper explains: “Lemma 1 says that environment substitution commutes with the translation.” Its premises include a well-formed global environment, an environment well-formed with respect to the expression, and closed expressions in that environment (Lemma 1, p. 11). A second lemma establishes well-formedness of evaluation results when the expression has at most as many free variables as the environment size and the environment and its values are well-formed (Lemma 2, p. 11).

how to apply it: (1) define substitution on λsmart expressions and types; (2) make substitution total under a well-formedness condition; (3) define `of_val` for closures, constructors, type closures, and type values; (4) prove substitution/translation commutation; (5) prove value well-formedness, supported by the interpreter's dynamic validation checks; (6) prove the main soundness theorem by induction on fuel and case analysis on the AST.

Verus form. Inference: use ghost ASTs and a `spec fn substitute`; define a `spec fn of_val`; state commutation as a `proof fn` with `ensures`; preserve closure well-formedness in the evaluator's loop/recursion invariant. This is a proof architecture, not a direct translation of Coq's MetaCoq kernel.

trusted boundary: the paper assumes MetaCoq's unquote implementation is correct and notes that determinism of MetaCoq evaluation was still under development (Section 2.4, p. 12). Those assumptions limit the end-to-end claim.

## technique 4: functional crowdfunding contracts with Hoare-style invariants

what it is: define `init` and `receive` as shallow Coq functions generated from a deeply embedded contract, then prove pre/post properties. The crowdfunding state records balance, donations, owner, deadline, done flag, and goal. The paper proves: balance equals contributions while not done; backers can recover donations after the deadline if the goal was not reached; donations are recorded correctly; and backers cannot claim after success (Section 3, pp. 12–15).

how to apply it: (1) define state and message ASTs; (2) write `init` and `receive` with custom entries; (3) translate and unquote them; (4) define `consistent_balance`; (5) prove a Hoare triple showing `receive` preserves it; (6) prove the remaining stated pre/post properties. Inference: case analysis on messages and deadline conditions is a natural proof strategy, but the paper does not present those proof scripts. The paper's lemma is `{{ consistent_balance }} receive BC CallCtx msg {{ fun fin txs ⇒ consistent_balance fin }}` (Section 3, p. 14).

Verus form. Inference: represent state and messages as Rust enums/structs, define `spec fn consistent_balance`, and put preconditions and postconditions on executable `receive`. Use `proof fn` lemmas for map-sum updates and `invariant` clauses for iterative map operations. The Hoare triple is expressed by Verus `requires`/`ensures`; outgoing actions need a postcondition over a returned sequence.

## technique 5: lift local proofs to blockchain traces

what it is: integrate shallow contracts with a small-step blockchain execution framework. Reachable blockchain states include contract code, local state, balances, and transactions; trace predicates express safety and temporal properties (Section 5, pp. 16–18). It proves local balance consistency for reachable states and proves that the actual account balance is at least the recorded local balance after successfully adding a block, including interactions and possible reentrancy (p. 18).

how to apply it: (1) wrap `init` and `receive` in the framework's generalized signatures; (2) instantiate addresses as natural numbers, convert framework types to the simple contract types, and provide serialization/deserialization instances; (3) prove extensionality (`init_proper`, `receive_proper`); (4) build a `Contract`; (5) define `reachable` over small-step traces; (6) prove `cf_balance_consistent` for any reachable blockchain state containing the contract and its local state; (7) prove `cf_backed_after_block` after block extension. The authors write: “In essence our integration with the execution framework allows us to prove that the contract tracks its own balance correctly even in the face of potential reentrancy or nontrivial interactions with other contracts and accounts.” (Section 5, p. 18). Inference: combining the balance bound with `consistent_balance` covers the sum of recorded contributions when the done flag is false; the invariant imposes no such equality when it is true. The paper leaves further temporal properties, including eventual refunds and at most one owner payment, for future work (p. 18).

Verus form. Inference: model blockchain state and transitions as ghost state or a Verus state machine; define a `spec fn reachable` over bounded traces and prove each transition preserves balance and local invariants with `proof fn` transition lemmas. A full unbounded trace theorem needs an inductive/state-machine invariant, not merely tests of individual `receive` calls.

## technique 6: standard-library equivalence through shallow embeddings

what it is: parse Acorn source, print its AST as λsmart constructors, translate and unquote it, then prove the resulting functions equivalent to Coq library functions. For lists, it defines inverse conversions `to_acorn` and `from_acorn`, proves `foldr f a l = fold_right f a (from_acorn l)` and analogous concatenation correspondence, then transfers the fold-over-concatenation theorem with `autorewrite` and `fold_right_app` (Section 4, pp. 15–16).

Verus form. Inference: define an abstract sequence model and prove `foldr`'s `ensures` relation to a trusted/specification fold; use a `proof fn` for concatenation. The generated implementation must still be checked by Verus, and the model's correctness is a separate assumption.

## techniques for the catalog
- deep/shallow embedding — keep an AST interpreter for language proofs and a generated ordinary function for concrete-program proofs
- fuel-bounded reference semantics — make recursive evaluation executable and terminating with explicit fuel and error results
- MetaCoq translation soundness — prove value conversion, substitution commutation, and evaluation correspondence
- Hoare-style contract invariants — prove local smart-contract state properties as pre/post conditions
- trace-level blockchain safety — lift local contract invariants to reachable global states and interactions
- standard-library correspondence — transfer library theorems through an automatically generated shallow embedding
