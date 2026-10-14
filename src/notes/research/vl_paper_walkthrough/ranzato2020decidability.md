# Decidability and Synthesis of Abstract Inductive Invariants
(authored by agents unless marked 🧑)
Tag: `ranzato2020decidability`, [paper](http://arxiv.org/abs/2004.03170v2)

## central result

Ranzato studies when a safety proof has an inductive invariant inside a chosen abstract domain, and how to synthesize one when it exists. A transition system has states `Σ`, initial states `Σ0`, transition relation `τ`, and safety property `P`. An invariant `I` must contain `Σ0`, be closed under successors, and imply `P` (p. 3). The paper's abstract-domain assumption is that every concrete property has a best over-approximation and every transition transformer has a best correct approximation (BCA). Under that assumption, the strongest abstract invariant is the least fixpoint of the abstract transformer.

The abstract states: “We consider here inductive invariants belonging to an abstract domain A as defined in abstract interpretation, namely, ensuring the existence of the best approximation in A of any system property.” (p. 1). The main principle is: an abstract invariant exists exactly when the least fixpoint of the BCA proves the safety property. This converts a search over all candidate invariants into a fixpoint computation. The paper derives decidability and synthesis results for Kildall's constant-propagation domain and Karr's affine-equalities domain, then derives a co-inductive greatest-fixpoint algorithm for disjunctive logical domains.

Inference: VL can use this result to decide whether a chosen invariant vocabulary is expressive enough before asking an agent to fill proof annotations. The paper is not about Verus or Rust; the Verus forms below are proposed encodings, marked as inferences.

## technique 1: model a program as a transition system and abstract its transformer

Use this when a verified Rust routine can be expressed as a finite control-flow graph with a mathematical state. A program has control nodes `Q`, variables in `V^n`, transfer functions, and edges labelled by transfers (Section 4, pp. 8–9). The state space is `Q × V^n`; `postP` maps a vector of sets, one per control node, to successor sets. Reachable states are the least fixpoint `lfp(λX.Σ0 ∪ postP(X))` (p. 8).

Steps:
1. Define concrete states and initial states.
2. Define each assignment, nondeterministic assignment, and guard as a set-valued transfer function.
3. Build the control-flow relation and `postP`.
4. Choose an abstract domain `A` represented by a Galois insertion `(α,γ)` or an upper closure `µ`.
5. Compute the BCA `α ◦ postP ◦ γ` (or `µ ◦ postP`) on abstract states.
6. Check the abstract least fixpoint against the abstract or concrete safety property (Sections 2.3, 3.1, and 4).

The paper's abstract principle is stated as: “there exists an abstract inductive invariant in A proving a property P of a transition system T iff the best abstraction T A in A of the system T allows us to prove P.” (p. 1). Lemma 3.2(a) gives the stronger concrete-property test: `γ(lfp(α f γ)) ⊆ c'` iff some abstract invariant proves concrete property `c'` (p. 5).

Inference: In Verus, the concrete state can be a `struct` or tuple represented by a `spec fn` view. The abstract state can be a ghost record containing selected facts. Define executable transitions and a mathematical `post` relation, then prove each transition preserves the abstract invariant with `ensures`. The BCA is an external synthesis procedure; Verus checks the resulting invariant rather than computing it natively.

## technique 2: synthesize the least abstract invariant by ascending iteration

Use this when the abstract domain has computable join and BCA, a decidable order, and the ascending-chain condition (ACC). Corollary 3.5 gives `AINV(f,A,c,a')`:

```
i := α(c)
while i ≤A a' {
    if α f γ(i) ≤A i return i
    else i := α f γ(i)
}
return no abstract inductive invariant
```

(p. 6). The sequence is ascending, so ACC ensures termination. If it returns `i`, that value is the least abstract invariant proving the property; if an iterate exceeds `a'`, no invariant in `A` can prove the property (p. 6).

Steps: abstract the initial set; repeatedly apply the BCA; join with the initial abstraction; stop at a post-fixpoint below the target property; report failure when the target is exceeded (Corollary 3.5, p. 6). The paper emphasizes that the output is the least invariant in the domain, not necessarily the strongest concrete invariant.

Inference: A Verus implementation can mirror this algorithm over a finite ghost lattice, with a `proof fn` proving monotonicity and an executable driver generating candidate invariants. Each candidate must then be checked by Verus loop invariants and `ensures`; the driver itself need not run in the product. A finite-height domain such as a bounded set of predicates gives a direct termination argument, whereas an unbounded `Seq` of lemmas does not satisfy ACC automatically.

## technique 3: Kildall constant propagation and exact BCA computation

Use constant propagation when the desired invariant states that a variable is always one integer at a control point. For one variable, `CONST = Z ∪ {⊥,⊤}` with a flat order; `⊥` denotes no states, a concrete integer denotes exactly that value, and `⊤` denotes any integer (p. 9). The product `CONST^n` has finite height `2n` (p. 9).

The paper derives BCA algorithms for affine assignments `xj := Σ mi xi + b` and linear guards. Given an abstract tuple, an affine expression is either a singleton `{k}` when all relevant operands are constants, or all integers `Z`; the assignment updates `xj` to `k` or `⊤` accordingly (pp. 10–11). A guard preserves the tuple when its expression is a known satisfying constant, yields `⊥` when a known constant violates it, and otherwise leaves the tuple unchanged. Equality guards have an additional case that can refine one unknown variable when all other terms determine the required value (p. 11).

The resulting theorem states: “The Monniaux problem (5) on C ONST for programs in CCONST , r.e. sets of initial states and recursive sets of state properties is decidable.” (p. 11). The same theorem says `AINV` synthesizes the least invariant when the safety property is representable in `CONST` (p. 11).

Example 4.2 starts with `x1 := 0; x2 := 2` and nondeterministic branches. Four iterations reach the invariant asserting `x2 = 2` at the target node; the paper reports the sequence `J0` through `J4` and says `J4` is the least invariant proving the property (pp. 11–12). No runtime or benchmark denominator is reported; this is a symbolic worked example.

Inference: In Verus, constant propagation is useful for integer loop invariants: define a ghost option-like value for each variable and prove that assignments update the option according to the same singleton-or-top cases. A direct Verus `spec fn` can express the abstract transfer, while `assert` lemmas discharge arithmetic. What does not carry over is automatic synthesis inside Verus; the finite-domain iteration must be implemented externally or as proof code.

## technique 4: Karr affine-equality invariants

Use affine equalities when the required facts are linear relationships such as `x1 + 2*x2 = 0`. Karr's domain `AFF` is the set of affine subspaces of `Q^n`, equivalently finite conjunctions of affine equalities. Its closure is `aff(X)`, the affine hull of a set; the lattice has finite height `n+1` because strict inclusion increases dimension (p. 12).

Steps: represent each abstract state as an affine subspace; compute BCA for affine assignments using a kernel or affine-basis representation; compute joins as affine hulls of unions; iterate the abstract transformer to a fixpoint (pp. 12–13). Nondeterministic assignments are handled as the join of two single assignments. Positive equality guards have computable BCA; generic disequality guards do not have a known BCA and are conservatively replaced by the identity transformer (p. 13).

The theorem states: “The Monniaux problem (5) on A FF for programs in CAFF , r.e. sets of initial states and recursive sets of state properties is decidable.” (p. 13). Example 4.4 reaches an invariant at `q4` containing `x1 + x2 + 1 = 0` after three iterations and identifies it as the least affine invariant proving the target (pp. 13–14).

Inference: In Verus, encode affine relations as `int` equalities in a ghost predicate and use arithmetic lemmas to show assignments preserve them. A candidate invariant can be a conjunction in a `spec fn`; loop `invariant` clauses carry the relations. Verus's integer arithmetic solver can check individual preservation steps, but it does not provide Karr's affine-subspace join or synthesis algorithm. Disequality branches require explicit case splits or a weaker invariant because the paper itself has no exact BCA for them.

## technique 5: exploit or diagnose fixpoint completeness

A domain is fixpoint-complete for a transformer when abstracting concrete reachability gives the same result as iterating the abstract BCA. The paper notes that affine assignments are pointwise complete in both `CONST` and `AFF`, so unguarded affine programs enjoy fixpoint completeness (pp. 12, 14). Guards break this property: in `CONST`, filtering two states by `x1=0` before abstraction yields `⊥`, while filtering the abstraction first can yield `(0,0)` (p. 12). In `AFF`, a similar example shows that an equality guard is not pointwise complete (p. 14).

Steps: test `α ◦ t` against `α ◦ t ◦ γ ◦ α` for each transfer; if equal, lift pointwise completeness to fixpoint completeness; otherwise retain the BCA but do not claim equality with concrete reachability (Sections 3.2, 4.1, and 4.2).

Inference: For VL, this is a contract audit: a generated invariant may be exact for straight-line arithmetic but lose precision at guarded branches. Marking a lemma as an exact abstraction result requires proving the relevant completeness equation; otherwise state only sound over-approximation. Verus's `ensures` proves the chosen relation, not completeness unless that relation is included explicitly.

## technique 6: co-inductive backward synthesis for disjunctive domains

Use this when the abstract domain `L` is closed under arbitrary unions, equivalently when its upper closure is additive and its lower closure `µ̂L` is available. The paper defines a quasi-order on states, an `Avoid` operator, and an abstract transition relation that adds down-closure transitions (Section 5, pp. 15–16). Under well-quasi-order assumptions, it derives a greatest-fixpoint algorithm:

```
I := Σ
while Σ0 ⊆ I {
    if I = µ̂L(pre(I) ∩ I ∩ P) return I
    I := I ∩ µ̂L(pre(I) ∩ I ∩ P)
}
return no inductive invariant in L
```

(Algorithm 1, p. 18). The loop maintains `I ∈ L`; termination follows from the descending-chain condition. The output is the greatest, logically weakest inductive invariant proving `P` (p. 18). Algorithm 2, which repeatedly intersects with `Avoid(s)` for an inductiveness counterexample `s`, is proved equivalent to Algorithm 1 (Theorem 5.5, pp. 18–19).

Inference: In Verus, the backward algorithm can guide generation of weakest useful ghost predicates: start with the safety predicate, identify a state or transition violating closure, and strengthen by intersecting a predicate that excludes it. A well-founded measure over predicate candidates is required for termination. Verus has no built-in greatest-fixpoint domain, so this is a synthesis architecture around Verus checking, not a direct language feature.

## evidence, trust, and product implications

The paper proves general order-theoretic lemmas and gives two domain theorems plus symbolic examples. It reports no empirical success percentages, execution times, or corpus sizes. All quantitative bounds are structural: `CONST^n` has height `2n` (p. 9), `AFF` has height `n+1` (p. 12), and the algorithms terminate under ACC, DCC, or wqo assumptions. Trust includes the chosen abstraction, computability of each BCA, the correctness of transfer-function models, and the safety property's representation. The paper explicitly notes that generic affine disequality BCA is unknown (p. 13), so replacing it by identity loses precision.

Inference: The threat to agent-written verified Rust is an expressive-domain mismatch. A proof can be impossible because the selected ghost vocabulary cannot express the needed invariant, rather than because the implementation is wrong. VL should classify failures by domain: constants, affine equalities, heap shape, ownership, or disjunction. It should then either switch to a domain with a computable BCA or report that no invariant in the current domain can prove the property. This avoids wasting agent iterations on annotations that cannot exist in the chosen abstraction.

Inference: Existing Verus infrastructure already checks concrete loop invariants and arithmetic lemmas; VL should reuse it as the validation layer. The paper's new contribution for VL is a pre-check and synthesis taxonomy: define an abstract state space, compute or approximate its transfer, and distinguish the case where no invariant exists in this domain from a proof-search failure.

## techniques for the catalog

- abstract inductive invariant principle: reduce existence of a domain-restricted invariant to a least fixpoint of the best correct abstract transformer
- least-fixpoint synthesis: iterate the abstract transformer from the initial abstraction until a post-fixpoint or a target violation
- constant-propagation BCA: compute exact abstract effects of affine assignments and linear guards in the finite-height constant domain
- affine-equality synthesis: iterate affine-subspace transformers and joins to derive Karr-style linear relations
- completeness audit: test pointwise transfer completeness before claiming abstract and concrete fixpoints coincide
- co-inductive backward synthesis: compute a greatest fixpoint by repeatedly intersecting safety, predecessor, and abstract-avoidance facts
- domain expressiveness diagnosis: report when no invariant exists in the selected abstract domain under its computability assumptions
Checked 2026-10-14: audit record ranzato2020decidability; paper-study comparison complete; gate executed; experiments not rerun
