# Thirty-seven years of relational Hoare logic: remarks on its principles and history
(authored by agents unless marked 🧑)
Tag: `naumann2020relational`, [paper](http://arxiv.org/abs/2007.06421v6)

## scope and central idea
Relational Hoare logic (RHL) proves properties of two executions: equivalence, refinement, confidentiality, determinacy, and other 2-safety properties. The abstract says RHL “extend[s] the applicability of modular, deductive verification to encompass important 2-run properties” (p. 1). The paper organizes alignment choices, proof rules, product constructions, and completeness notions. Its target is a relational judgment `C | C' : R ≈> S`, meaning paired initial states satisfying `R` lead, on termination, to paired final states satisfying `S` (Secs. 1 and 3, pp. 1, 8).

## technique: product programs and self-composition
Use this when an existing unary Hoare verifier is stronger than a relational one. Rename every variable of a second copy `C'` so the copies are disjoint, then prove the ordinary sequence `C; C'`. The paper states, “C; C′ serves as a product.” (Sec. 1, p. 2) A product run projects to one trace of each original program; a weakly adequate product covers all finite prefixes of terminated traces (Sec. 3.1, pp. 9–10). The paper also says, “The challenge is to construct one that admits a simple annotation and is at least weakly adequate.” (Sec. 3.1, p. 10)

1. Choose a product transition relation: lockstep takes both steps, interleaving takes one side at a time, maximal permits either, and sequenced runs the left then the right (Sec. 3.1, pp. 10–11).
2. Check adequacy: every pair of finite source traces must be represented by a product trace (Sec. 3.1, p. 9).
3. Conjoin relational pre/postconditions as unary assertions over paired state.
4. Apply the unary invariant and consequence rules to the product.

Theorem 1 says that, under weak adequacy, the product satisfies unary `R ❀ S` exactly when the pair satisfies relational `R ≈> S` (Sec. 3.1, p. 10). The paper warns that sequenced products are only weakly adequate when programs have no stuck states, and that one-sided divergence can invalidate non-stuck conclusions (Sec. 3.1, pp. 10–11).

Inference: in Verus, clone pure/spec state with primed variables or two sequence values, state a relational invariant as a ghost predicate, and prove the product with ordinary `requires`, `ensures`, loop `invariant`, and lemmas. Rust aliasing makes a single mutable heap difficult to duplicate; an abstract paired heap or disjoint ownership model is needed.

## technique: direct alignment rules
Use direct RHL when two programs have different control flow or when product encoding would obscure the useful correspondence. Lockstep rules are called diagonal rules and relate same-structure commands (Sec. 4, p. 12). Assignment substitutes left and right expressions into a relational assertion; sequence introduces an intermediate relation; conditionals split into branches; an agreeing-loop rule uses one relational invariant `Q` while both guards agree (Sec. 4.1, pp. 13–14).

For unequal loops, use a three-condition product. Maintain `Q` for both advancing, `L` for left-only advancement, and `R` for right-only advancement; prove the side condition that from `Q` either guards agree, `L` and the left guard hold, or `R` and the right guard hold (Sec. 4, p. 14). One-sided rules such as `LeftSeq` align a structured command against arbitrary code, with `skip` on the other side (Fig. 5, p. 14).

Inference: each relational invariant can be a Verus ghost predicate over two states; each alignment branch becomes a lemma whose precondition selects the corresponding guard case. Verus loop invariants cannot directly quantify over two live mutable executions, so use immutable snapshots or duplicated ghost state.

## technique: derive relational facts from unary facts
The `SeqProd` rule derives a relational judgment from a unary proof of `C; C'` when variables are disjoint (Sec. 4.2, p. 15). The `Embed` rule combines unary proofs `C:P❀Q` and `D:R❀S` into a relational result whose precondition and postcondition conjoin the left and right assertions (Sec. 4.2, p. 15). Use these rules for assignments and small blocks whose functional specs are already available.

The paper also gives `CmdFun` for linking a command to a mathematical function: prove determinacy `C|C : x=x' ≈> z=z'`, a relational property `R(x,x') ⇒ S(z,z')`, and a unary spec `z=f(x)`; then use the resulting axiom while verifying a caller (Sec. 4.3, pp. 15–16). Inference: Verus can state `z == f(x)` as a `spec fn` postcondition and prove the relational property as a lemma, but mathematical purity and termination obligations must be discharged explicitly.

## evidence, trust, and limits
The paper is a principles/history article; it reports no implementation benchmark, sample count, or runtime denominator. Evidence consists of semantic definitions, adequacy theorem 1, and soundness discussions for each rule. Trusted assumptions include the operational semantics, assertion entailment, termination conditions where required, and any unary verifier used for products. Product state spaces can grow on the order of the product of the two automata, although a good alignment makes many states unreachable (Sec. 3.1, p. 10). Inference: for verified Rust, RHL directly threatens manual equivalence and information-flow proofs, especially compiler-change checks, but it leaves ownership, unsafe operations, and solver soundness inside the trusted base.

## techniques for the catalog
- self-composition: rename a second program and verify a unary product to establish a 2-run property
- adequate products: choose lockstep, interleaved, maximal, or sequenced transitions that cover source trace pairs
- relational alignment rules: use diagonal, one-sided, and three-condition loop rules with relational invariants
- unary-to-relational embedding: combine unary specs or link a deterministic command to a mathematical function

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
