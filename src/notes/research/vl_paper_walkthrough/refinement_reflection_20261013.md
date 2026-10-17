# Refinement Reflection: Complete Verification with SMT
(authored by agents unless marked 🧑)
Tag: `vazou2017refinement`, [paper](https://arxiv.org/abs/1711.03842)

source: Vazou, Tondwalkar, Choudhury, Scott, Newton, Wadler, Jhala, arXiv:1711.03842v1 (9 Nov 2017); published as Proc. ACM Program. Lang. 2, POPL, Article 53 (January 2018). The arXiv file has 59 pages (the article's reference line also says 59 pages): main text pp.1–31, appendices A to J pp.32–59. Page numbers below are the article's (53:N written as p.N).

## the problem and the three answers

An SMT-based verifier must reason about functions the user defines. The usual way is to give the solver each definition as a universally quantified axiom and let heuristics (triggers, fuel) decide where to instantiate it. The paper's objection to that way: "These heuristics make it difficult to characterize the kinds of proofs that can be automated, and hence, explain why a given proof attempt fails [30]." (Section 1, p.2)

The paper gives three things, implemented in Liquid Haskell:
1. refinement reflection: put a function's body into its own result type, so every call site states one unfolding of the definition, with no quantifier
2. proofs as programs: a theorem is a function type, a proof is a total function of that type; case split is branching, induction is recursion, a lemma use is a call. This covers quantified statements too, by encoding connectives as data types
3. Proof by Logical Evaluation (PLE): a search that keeps unfolding function applications whose branch condition the solver proves from the hypotheses, until the goal is proved or nothing new can be unfolded; proved sound, complete for equational proofs, and terminating when the environment is transparent (technique 5)

The abstract's one-line statement of the first: "The key idea is to reflect the code implementing a user-defined function into the function’s (output) refinement type." (Abstract, p.1)

## technique 1: reflect a total function into the logic in three steps

what it is: a way to let specifications mention a user function while keeping every verification condition quantifier-free.

when to use it: the property to prove talks about what a recursive function computes (`fib 2 = 1`, `xs ++ [] = xs`), and the function provably terminates and is total.

steps (Section 2.2, p.5; formal version Section 4.4, pp.16–17):
1. definition: declare an uninterpreted function symbol of the same name in the logic. On its own it only obeys congruence (equal arguments give equal results), so `fib 2 = 1` is unprovable
2. reflection: strengthen the function's result type with its body. For `fib` the tool derives the predicate `fibP n`: `n == 0 ⇒ fib n = 0`, `n == 1 ⇒ fib n = 1`, `n > 1 ⇒ fib n = fib (n-1) + fib (n-2)`, and the type becomes `fib :: n:Nat → { v:Nat | v = fib n && fibP n }`. Formally `Reflect` adds the conjunct `v = e` to the result refinement, where `e` is the body
3. application: nothing more is needed; the ordinary typing rule for a call substitutes the argument. In the paper's words: "With the reflected refinement type, each application of fib in the code automatically unfolds the definition of fib once in the logic." (Section 2.2, p.5)

The paper's example proof of `fib 2 = 1` is a term that merely mentions three calls: `pf_fib2 = let { t0 = fib 0; t1 = fib 1; t2 = fib 2 } in ()`. The resulting verification condition is `(fibP 0 ∧ fibP 1 ∧ fibP 2) ⇒ (fib 2 = 1)`, valid although `fib` is uninterpreted. "The SMT solver automatically combines the facts, once they are in the antecedent." (Section 2.2, p.5)

preconditions for soundness (Sections 2.1 and 4.4):
- termination: each recursive function needs a measure, a natural number that decreases at each recursive call; written `/ [n]` after the type, or guessed to be the first argument (Section 2.1, p.4)
- totality: a missing case is completed by a call to `error`, whose argument type has refinement `false`, so the checker must prove that call dead (Section 2.1, p.5)
- why: "This restriction is crucial for soundness, as diverging expressions can lead to inconsistencies." and "For example, reflecting the diverging f x = 1 + f x into the logic leads to an inconsistent system that is able to prove 0 = 1." (Section 4.4, p.17)
- reflection is opt-in per function: "We require an explicit reflect annotation as not all Haskell functions can be reflected into logic, either because it is unsound to do so (e.g. due to divergence) or because of limitations of our current implementation." (Section 2.5, p.9)

what is and is not trusted about the reflected body: "First, the reflected refinement is not trusted; it is itself verified (as a valid output type) during type checking." (Appendix D.4, p.38)

Verus form (inference; the paper is about Liquid Haskell and names Dafny and F* as the systems it differs from):
- a Verus `spec fn` plays the role of the reflected function: it is a total mathematical function that specifications may call, and a recursive one must carry a `decreases` clause, the counterpart of the termination measure
- the code shape differs in one respect. In the paper one Haskell function is both run and reasoned about. In Verus the executable `fn` is separate and is tied to the `spec fn` by a contract such as `ensures r == fib(n as nat)`; the body is written twice
- the unfolding mechanism differs: the paper unfolds once per call written in the proof; Verus (like Dafny, by the paper's description of Dafny) unfolds recursive definitions under a fuel bound, and the user raises it with `reveal_with_fuel` or supplies the unfolded equation in an `assert`
- `fib` as a Verus `spec fn` (not run through Verus here):

```rust
spec fn fib(n: nat) -> nat
    decreases n
{
    if n == 0 { 0 } else if n == 1 { 1 } else { fib((n - 1) as nat) + fib((n - 2) as nat) }
}
```

evidence: the typing rules are proved sound (Theorem 4.1, p.18: typing implies membership in the type's denotation, and evaluation preserves typing; proofs in Appendix E, pp.42–43, by reduction to the earlier calculus of Vazou et al. 2014). Use in practice is Table 1 (see the evaluation part below).

limits: only provably terminating, total functions. Diverging code may exist beside proofs but cannot be reflected: "Note that, while the unification function can itself diverge, and hence cannot be reflected, our method allows terminating and diverging functions to soundly coexist." (Section 7, p.26)

## technique 2: write the proof as a total program (case split = branch, induction = recursion, lemma = call)

what it is: a proposition is a type `x:τ → { p }` (a function returning unit, refined by `p`); any total inhabitant proves `p` for all `x`. The paper's summary: "Reflection allows the user to write equational proofs of programs just by writing other programs e.g. using pattern-matching and recursion to perform case-splitting and induction." (Abstract, p.1)

when to use it: the solver cannot find the proof alone because it needs a case analysis, an induction hypothesis, or a previously proved lemma at specific arguments.

steps, from the paper's examples (Sections 2.1 to 2.3, pp.3–8):
1. state the theorem as a function type. `fibUp :: n:Nat → { fib n ≤ fib (n+1) }`
2. split cases with pattern matching or guards. `fibUp` has cases `0`, `1`, and `n`; in each, mentioning `fib` at the needed arguments unfolds it, and linear arithmetic finishes (p.7)
3. for induction, call the theorem itself on a smaller argument and state the measure. `fMono`, which shows that a locally increasing `f` is increasing on all `x < y`, is declared with `/ [y]`: "We prove the theorem by induction on y as specified by the annotation / [y] which states that y is a well-founded termination metric that decreases at each recursive call [56]." (Section 2.3, p.7) Case `x+1 == y` uses the hypothesis `up x`; case `x+1 < y` calls `fMono f up x (y-1)` and then `up (y-1)`
4. use a lemma by calling it: `fibMono = fMono fib fibUp` instantiates the general theorem (p.8)
5. keep proof terms honest: no `lazy` (which turns off termination checking) and no `unsoundError`. The paper compares the first to an escape hatch elsewhere: "Haskell terms marked as lazy could unsoundly be used as proof terms, much like Coq’s unsoundness with respect to Admitted." (Section 2.1, p.4), and states its own assumption: "In the sequel (and in our evaluation) we assume that proof terms are generated without any unsound uses of lazy or unsafeError." (Section 2.1, p.5)

Verus form (inference): this is the `proof fn` style. A `proof fn` with parameters, `requires` and `ensures` is the theorem; `if`/`match` in its body is the case split; a recursive call with a `decreases` clause is the induction hypothesis; calling another `proof fn` is using a lemma. The two fib theorems (not run through Verus here):

```rust
proof fn fib_up(n: nat)
    ensures fib(n) <= fib(n + 1),
{
    if n == 0 {
    } else if n == 1 {
        assert(fib(2) == fib(1) + fib(0));
    } else {
        assert(fib(n + 1) == fib(n) + fib((n - 1) as nat));
    }
}

proof fn fib_mono(n: nat, m: nat)
    requires n < m,
    ensures fib(n) <= fib(m),
    decreases m,
{
    if n + 1 == m {
        fib_up(n);
    } else {
        fib_mono(n, (m - 1) as nat);
        fib_up((m - 1) as nat);
    }
}
```

What changes: Verus separates proof code from executable code by mode, so the paper's unit-typed Haskell values, and its worry about evaluating them, do not arise. What does not carry over directly: `fMono` takes the function `f` and a proof about `f` as arguments; the Verus sketch above is specialised to `fib` because passing a proof as a value is the paper's device, not a Verus one. The escape hatches to audit in Verus are `assume`, `admit()` and `#[verifier::external_body]`, the counterparts of `lazy`, `unsoundError` and the paper's assume operator.

evidence: Table 1's "Without PLE Search" columns are the explicit proofs (written as in techniques 2 to 4, with no PLE): 1524 lines of proof for 1176 lines of implementation and 1279 of specification, checked in 148.76 s with 1626 SMT queries (Table 1, p.26).

limits: the user finds the case split, the induction variable and the lemma instances. Nothing here searches for them.

## technique 3: equational (calculational) proof combinators

what it is: a small library that lets a proof be written as a chain `e1 =. e2 =. e3 ** QED`, each link checked by the solver, optionally with a reason.

steps (Section 2.3, pp.6–7; library details Appendix I.1, pp.52–54):
1. define one combinator per relation of the logic (equality, disequality, the four orderings). Its type does the checking: "The refinement type of ⊙ requires that x ⊙ y holds and then ensures that the returned value is equal to x." (Section 2.3, p.6) For equality: `(=:) :: x:a → y:{ a | x = y } → { v:a | v = x }` with body `x =: _ = x`
2. end a chain with `** QED`, which casts any value to the unit proof type
3. to justify a link with a lemma, use the variant taking a proof argument, `(=?) :: x:a → y:a → { Prop | x = y } → { v:a | v = x }`, and the because-combinator `∵`, which is function application with the precedence of the proof operators
4. merge both variants into one operator `=.` with an optional proof argument, via a two-instance type class (`OptEq`)
5. write the chain. `fib3_2 = fib 3 =. fib 2 + fib 1 =. 2 ∵ fib2_1 ** QED` (p.7); the full associativity proof of list append is the left column of Figure 1 (p.9), with the induction hypothesis `∵ app_assoc xs ys zs` on the middle link

Verus form (inference): the same chain is a `calc!` block or a sequence of `assert(a == b);` statements, and the because-step is an `assert ... by` block whose body calls the lemma. Verus needs none of the type-class machinery; that part exists because the paper builds the notation inside Haskell.

evidence: the appendix shows the cost of this style when nothing is automated: the map-fusion proof is a chain of 4 terms for the empty list and 10 for the cons case, one of them printed twice (Appendix A, p.32).

limits, from the paper: "While equational proofs can be very easy, writing them out can quickly get exhausting." (Section 2.4, p.8) Two library operators are not verified: an assume operator `(==?)` and function extensionality `(=*)`; of the first the paper says "Proofs including the assume operator are not considered complete, as via assume operator any statement can be proven," (Appendix I.1, p.54).

## technique 4: quantified statements without quantifiers in the logic (natural deduction as types)

what it is: keep every refinement quantifier-free and push quantifiers and connectives into the type structure (Figure 3, p.11):
- a native quantifier-free formula `e` is the type `{ e }`
- implication is a function from proofs to proofs; negation is a function into `{ False }`
- conjunction is a pair; disjunction is `Either`
- for-all is a dependent function `x:τ → ϕ`; exists is a dependent pair `(x :: τ, ϕ)` holding the witness and the proof about it

when to use it: the statement nests quantifiers inside connectives or alternates them, and one wants the solver to see only ground, decidable queries. The motivation is the limit of the simpler encoding: "One limitation of this encoding is that quantifiers cannot exist inside refinement’s logical connectives (like ∧ and ∨)." (Section 2.1, p.4)

steps (Section 3, pp.11–14):
1. translate the formula by Figure 3
2. build the proof term by the natural-deduction rules, which coincide with typing rules (Figure 5, p.14): for-all introduction is a lambda, elimination is application; exists introduction is building the pair, elimination is a `case` on it; disjunction elimination is a `case` on `Either`
3. let the solver do every quantifier-free part. Conversions between a formula as a type and as an SMT proposition go both ways; for `p ∧ (q ∨ r)` the paper gives `flatten` and `expand` (pp.12–13)
4. examples: `(∃x.∀y. p x y) ⇒ (∀y.∃x. p x y)` is proved by the term `\e y → case e of {(x, ex) → (x, ex y)}` (p.12); the statement that `xs = ys ++ ys` for some `ys` implies `len xs` is even is proved by `evenLen xs (ys, pf) = (len ys, lenAppend ys ys &&& pf)`: unpack the witness `ys`, return the witness `len ys`, cite the lemma (p.13); induction on naturals is the recursive term `ind` (p.14)

claim proved: Theorem 3.1 (p.12), if a formula has a natural-deduction derivation then a term of the corresponding type can be constructed; Appendix C (p.35) proves that an inhabited type is a valid formula. The converse fails by design: "The reason for that is that our system is using the classical logic of the SMTs, which includes the law of the excluded middle." (Section 3.2, p.12)

Verus form (inference): Verus allows `forall` and `exists` inside specifications, so the encoding is not required; what transfers is a discipline that avoids trigger-dependent proofs:
- universal statement: make the bound variables parameters of a `proof fn` and call it at the needed arguments, instead of an `ensures forall` that the solver must instantiate
- existential conclusion: return the witness from the `proof fn` and state the property of the returned value in `ensures`; to use an existential hypothesis, obtain the witness with `choose`
- implication: the hypothesis goes in `requires`
- disjunction: branch with `if` in the proof body
- where a quantified fact is unavoidable, establish it with `assert forall ... by`
The `evenLen` shape in Verus would be a `proof fn` taking `xs` and the witness `ys` with `requires` that `xs` equals `ys` appended to itself, returning `n` with `ensures` that the length of `xs` is `n + n`, whose body calls the length-of-append lemma.

evidence: the "Logical Properties" row of Table 1 (p.26): 20 lines of specification, 33 of proof, 2.71 s, 32 queries; and "Fold Universal", which combines this encoding with PLE.

limits: proof terms are explicit; the paper notes PLE gives no help on them (see technique 5 evidence).

## technique 5: Proof by Logical Evaluation (PLE)

what it is: an algorithm that automates the unfolding steps of technique 1, replacing both hand-written unfold calls and fuel. It treats the solver's set of known equalities as the place where evaluation happens.

when to use it: the remaining work in a proof is computation with definitions (the long equality chains), after the user has given case splits, induction hypotheses and lemma calls.

steps (overview Section 2.4, p.8; algorithm Section 6.1 and Figure 9, pp.21–22):
1. guard normal form: rewrite each reflected function as a list of pairs (guard, body), with all `if`s hoisted to top-level guards and no lambdas in guards or bodies. `fibP` in technique 1 is the example
2. seed: start from the hypotheses Φ of the verification condition, plus instances for the function applications that occur in the goal p
3. instantiate: for each application `f(t)` occurring as a subterm of the current hypotheses, and each guarded case `(p_i ⇒ b_i)` of `f`, ask the solver whether the hypotheses imply `p_i` with `t` substituted. If yes, the equation `f(t) = b_i[t/x]` is an instance (procedure `Instantiate`, Figure 9)
4. unfold: add all instances to the hypotheses (procedure `Unfold`)
5. loop: if the solver proves the goal from the current hypotheses, return true; if unfolding added nothing new, return false; otherwise repeat from step 3 (procedure `loop`, Figure 9)

The paper's small example: for `true ⇒ fib 3 = 2`, the guard `3 > 1` is enabled, giving `fib 3 = fib (3−1) + fib (3−2)`; the search goes on to unfold at 2, 1 and 0 and stops because no further guard is enabled (Section 2.4, p.8).

what the user still writes: "(The user must still provide instantiations of lemmas and induction hypotheses.)" and "That is, the user must provide case statements and the recursive structure, but can elide the long chains of =. applications." (Section 2.4, p.8) With PLE, `fib3_2 = ()`, and list-append associativity shrinks from the chains in the left column of Figure 1 (3 terms for the empty list, 5 for cons) to `app_assoc [] ys zs = ()` and `app_assoc (x:xs) ys zs = app_assoc xs ys zs` (Figure 1, p.9).

why guards matter: a case is unfolded only when its guard is already provable. Inference: that is what stops the search; on a symbolic `fib n` with `n` unconstrained, no guard is provable, so nothing is unfolded. The fuel alternative, in the paper's example from the Dafny benchmark suite: `pos n` is `0` when `n < 0` and `1 + pos (n-1)` otherwise, and the goal relates `pos n` to `3 + pos (n-3)` for `n > 5`. "Dafny (and F*’s) fuel-based approach fails to check the above, when the fuel value is less than 3." Then: "In contrast, PLE (1) does not require any fuel parameter, (2) is able to automatically perform the required unfolding to verify this example, and (3) is guaranteed to terminate." (Section 2.4, p.9)

the three guarantees (Section 6, pp.21–25; proofs Appendix B, pp.32–35):
- soundness (Theorem 6.2, p.22): if PLE returns true, the goal evaluates to true under every substitution allowed by the environment. The paper's intuition: "Intuitively, PLE is sound as it reasons about a finite set of instances by conservatively treating all function applications as uninterpreted [36]."
- completeness for equational proofs (Theorem 6.10, p.24): an equational proof is defined by three rules (Figure 10, p.23): reflexivity; a step that unfolds once and lets the solver conclude an equality; and a final solver check relating the two reached terms. If such a proof exists, PLE returns true. The argument: an equational proof exists exactly when some bounded depth of unfolding suffices, and the loop computes the limit of bounded unfoldings
- termination (Theorem 6.16, p.25), under the condition that the environment is transparent, defined as either inhabited (some concrete values satisfy it) or inconsistent (the solver proves false from it). The argument: an endless run would give an infinite chain of logical unfolding steps; with an inhabitant, that chain maps to an infinite run of the real, total function, which cannot exist

why termination is not trivial: sound and complete search is easy by enumerating instances, and the paper says of that: "Such a monkeys-with-typewriters approach is rather impractical: it may never terminate." (Section 6.3, p.24) The non-transparent case is an environment that is false for every value yet not refutable without induction, such as `lenA xs = 1 + lenB xs` for two copies of list length; the paper sets it aside: "Thus, non-transparent environments are somewhat pathological and, in practice, we only invoke PLE on transparent environments." (Section 6.3, p.24)

Verus form (inference): none of the Verus constructs found in the notes performs this search; Verus unfolds recursive `spec fn`s by fuel, the scheme the paper argues against, and offers proof by computation for terms that evaluate. PLE can still be used in two ways:
- as a recipe for a proof agent. When Verus fails on a goal about recursive `spec fn`s, list the applications in the goal and hypotheses; for each, find the branch of its definition whose condition is already known (by an `assert` of that condition that verifies); add `assert(f(t) == body_of_that_branch);`; rerun; repeat with the applications that the new equations introduce; stop when the goal verifies or no new branch condition is provable. This is Figure 9 with the agent in the role of the loop and Verus in the role of the validity check. It is not in the paper
- as a diagnosis. If such unfolding reaches a fixpoint without proving the goal, the completeness theorem says no pure definition-unfolding proof exists; the missing piece is a case split, an induction hypothesis or a lemma. That tells a repair agent which kind of edit to try next
- what does not carry over: the termination guarantee assumes the tool controls unfolding. Under fuel, a Verus proof can also fail because fuel was too low (the `pos` example) or become slow because fuel was raised with `reveal_with_fuel` on a term whose guards are not decided

evidence: see the next part; PLE-specific numbers are the right half of Table 1.

limits:
- complete only relative to unfolding; the paper's title word is qualified in the text by the sentence about lemmas and induction hypotheses quoted above
- no help for non-equational proofs: "Since PLE searches for equational properties, there are some proofs, that rarely occur in practice, that PLE cannot simplify, e.g. the logical properties from § 3." (Section 7, p.27)
- failed proofs get harder to read: "However, the increased automation of SMT and proof-search can sometimes make it harder for a user to debug failed proofs." (Section 9, p.29)
- fuel can win on speed and on zero-input cases; for the `swap` idempotence example the paper concedes: "On the other hand, Dafny’s fuel-based axiom instantiation automatically unfolds the definition of swap twice, thereby completing the proof without any user input." (Section 2.5, p.10)

## technique 6: data types through testers and selectors, case as nested if

what it is: to reflect functions that pattern-match, give each constructor a tester (`isNil`, `isCons`) and field selectors (`sel1`, `sel2`), and translate a `case` into nested `if`s over testers with selectors standing for the bound variables.

steps (Section 5.1, p.20; Appendix D.5, pp.38–39; Appendix F.2, pp.44–45):
1. for each constructor create tester and selector functions; "The above selectors can be modeled precisely in the refinement logic via SMT support for ADTs [36]." (Section 5.1, p.20)
2. strengthen each constructor's result type with the value of every measure on it; for cons: `len v = 1 + len xs`, `!isNil v`, `isCons v`, `sel1 v = x`, `sel2 v = xs` (Appendix D.5, p.39)
3. translate `case x = e of {D_i y_i → e_i}` to `if isD_1 p then p_1 else ... else p_n` with `y_i` replaced by selector applications
4. result for list append: `if isNil xs then ys else sel1 xs : (sel2 xs ++ ys)` (Appendix F.2, p.45)

the reason given: "We favor selectors to the axiomatic translation of HALO [60] and F* [52] to avoid universally quantified formulas and the resulting instantiation unpredictability." (Appendix F.2, p.45)

Verus form (inference): nothing to build; a `spec fn` may `match` on a Rust `enum`, and Verus generates the solver-level datatype. The transferable point is the guard structure: a `match` arm is a guard in the sense of technique 5, and an unfolding of a recursive `spec fn` over a `Seq` or an enum is justified only in a context where the arm is known (the sequence is known empty or non-empty).

## technique 7: higher-order functions by defunctionalization, with ground α/β instances and an assumed extensionality axiom

what it is: the logic is first-order, so a lambda becomes a term `lam x p` and an application `app f a`, both uninterpreted (Section 5.1, pp.19–20). The paper states the price: "Encoding of λ-abstractions and applications via uninterpreted functions, while sound, is imprecise as it makes it hard to prove theorems that require α- and β-equivalence or extensional equality." (Appendix H, p.50)

steps to regain precision without quantified axioms (Appendix H.1, pp.50–51):
1. keep binder names from a numbered pool with the invariant that an outer binder's index is greater than any inside it
2. for each `lam x_i e` and binder `x_j` with `i < j` in the verification condition, add the α-instance `lam x_i e = lam x_j e[x_i/x_j]`
3. for each `app (lam x e) e_x` with `e_x` free of lambdas, add the β-instance `app (lam x_i e) e_x = e[e_x/x_i]`
4. check the strengthened condition; soundness holds because the instances are true in the intended models
5. for equality of functions that depends on a definition, use an operator that turns a proof of `f x = g x` for all `x` into `f = g` (Appendix H.2, p.51). Its status: "Of course, =* cannot be implemented; its type is assumed."

The paper calls this combination "an not provably complete, but sound and decidable approach" (Appendix H, p.50), and of extensionality proofs says the method "requires a cumbersome indirect proof" (Appendix I.1, p.55).

Verus form (inference): a Verus user does not write this encoding; the lesson is where precision is lost. Equalities between function values need an explicit pointwise argument, and a proof that relies on function extensionality rests on an axiom, here an assumed one. Any Verus proof step that equates two closures or two `Map`/`Seq` values should be reduced to pointwise facts.

## technique 8: laws as proof-carrying class methods, required by clients

what it is: package the algebraic laws that a client depends on as extra methods of a type class whose types are the laws, so that an instance cannot be written without proofs, and make the client's signature require the verified class.

steps (Section 7, pp.26–28; Appendix J, pp.56–59):
1. state each law as a refinement type (Figure 11, p.28): monoid left/right identity and associativity; functor identity and distribution; four applicative laws; three monad laws; order reflexivity, antisymmetry, transitivity, totality; commutativity
2. add the laws as methods, e.g. `class VerifiedMonoid a ⇒ VerifiedCommutativeMonoid a where commutes :: x:a → y:a → { x <> y = y <> x }` (Appendix J.3, p.58)
3. give the operation that needs the law a constrained type: `mapReduce :: VerifiedMonoid b ⇒ (a → b) → Vec a → b` (Appendix J.2, p.56); `updateRVar :: VerifiedCommutativeMonoid a ⇒ a → RVar s a → Par s ()` (Appendix J.3, p.58)
4. prove instances by techniques 2 to 5, and compose: a product of verified monoids is a verified monoid, used for a 3-component acceleration (Appendix J.2, pp.56–57)
5. when executable code needs a theorem at a point, insert it with `withTheorem :: x:a → Prop → { v:a | v = x }` (Section 7, p.27)

Verus form (inference): a Rust trait whose items include a `spec fn` for the operation's meaning and `proof fn`s whose `ensures` clauses are the laws; a generic `fn` bounded by that trait may call the law in a `proof { }` block where it needs it. Verus erases proof code, so step 5's device and the runtime measurements below are specific to Haskell.

evidence on runtime cost (Appendix J; one Intel Xeon E5-2699 v3, 18 cores, 64 GiB): proofs are Haskell values and class dictionaries exist at run time, so cost was measured. Concurrent sets, 1 million parallel inserts over 10 iterations, 1 to 16 threads (Figure 18, p.57): "There is a slight observable difference between the two lines because the extra proof methods do exist at runtime." (Appendix J.1, p.56) n-body with 2,048 bodies over 5 iterations and a parallel sum of an array of 3x10^9 elements (Figure 19, p.58): the paper reports almost identical run time for n-body and no appreciable difference for the reducer. The figures are plots; the paper gives no numbers. In the main text the claim is unqualified: "Proof terms have no runtime overhead as they will never be evaluated." (Section 7, p.27)

limits:
- the n-body monoid proof is about real numbers, the program runs on doubles: "Floating point numbers notoriously violate associativity, but we use this approximation because Haskell does net yet have an implementation of superaccumulators [15]." (footnote, Appendix J.2, p.57) Inference: determinism of the floating-point program is then not what was proved
- library instances cannot be verified in place: "Class instances methods can not be reflected." (Appendix I.2, p.55); they are redefined as plain functions, and for `Maybe` the paper says a `Monoid a` class-constraint assumption had to be raised to proceed

## the evaluation, with sums checked

Table 1 (p.26), caption: "We report verification Time (in seconds, on a 2.3GHz Intel® Xeon® CPU E5-2699 v3 with 18 physical cores and 64GiB RAM.), the number of SMT queries and size of Proofs (in lines)." Thirteen benchmarks in five groups. Per row: implementation lines, specification lines; then proof lines / seconds / SMT queries without PLE; then the same with PLE.
- Fibonacci: 7, 10; 38 / 2.74 / 129; 16 / 1.92 / 79
- Ackermann (12 properties): 20, 73; 196 / 5.40 / 566; 119 / 13.80 / 846
- Monoid laws (Peano, Maybe, List): 33, 50; 109 / 4.47 / 34; 33 / 4.22 / 209
- Functor laws: 48, 44; 93 / 4.97 / 26; 14 / 3.68 / 68
- Applicative laws: 62, 110; 241 / 12.00 / 69; 74 / 10.00 / 1090
- Monad laws: 63, 42; 122 / 5.39 / 49; 39 / 4.89 / 250
- Logical properties: 0, 20; 33 / 2.71 / 32; 33 / 2.74 / 32
- Fold universality: 10, 44; 43 / 2.17 / 24; 14 / 1.46 / 48
- SAT solver: 92, 34; 0 / 50.00 / 50; 0 / 50.00 / 50
- Unification: 51, 60; 85 / 4.77 / 195; 21 / 5.64 / 422
- Concurrent sets: 597, 329; 339 / 40.10 / 339; 229 / 40.70 / 861
- n-body: 163, 251; 101 / 7.41 / 61; 21 / 6.27 / 61
- Parallel reducers: 30, 212; 124 / 6.63 / 52; 25 / 5.56 / 52
- Total: 1176, 1279; 1524 / 148.76 / 1626; 638 / 150.88 / 4068

Inference: all eight column totals equal the sums of their rows.

What the benchmarks prove (Section 7, pp.26–27): the SAT solver returns `Nothing` or an assignment satisfying the formula; unification, when it returns a substitution, makes the two terms identical; neither is proved complete or terminating.

## statements in the paper that its own data or text do not support

- proof-size reduction: the text says "by a factor of 2−5×" (Section 7, p.27). Inference from Table 1: the total ratio is 1524/638 = 2.39; per benchmark it runs from 1.0 (Logical properties, 33 to 33) through 1.48 (Concurrent sets), 1.65 (Ackermann), 2.4 (Fibonacci) up to 6.6 (Functor, 93 to 14). Three of the twelve benchmarks with proofs fall below 2 and one lies above 5
- speed: the text says PLE "does not impose a performance penalty" and that checking the compact proofs is "typically faster" (Section 7, p.27). In Table 1 total time rises from 148.76 s to 150.88 s; Ackermann takes 13.80 s against 5.40 s; Unification, Concurrent sets and Logical properties are also slower; eight benchmarks are faster and one equal
- query count: the text says proof search "can make an order of magnitude many more SMT queries" and gives 1626 to 4068 (p.27), which is a factor of 2.5. Only Applicative (69 to 1090) exceeds a factor of ten; Fibonacci's count falls (129 to 79)
- n-body and Parallel reducers show the same query counts with and without PLE (61 and 52) while their proofs shrink from 101 to 21 and from 124 to 25 lines; the paper does not explain how search removed four fifths of the proof text without one additional query
- the SAT solver row has 0 proof lines and identical figures in both halves, so it does not exercise PLE; it contributes 50.00 s, a third of each time total
- "Complete Verification" in the title: completeness is proved for equational proofs built from unfoldings, and termination needs transparency, which the text says is "readily met in practice" (Section 2.4, p.8) without a measurement
- Section 3.2 (p.12) announces that "conjunction and universal elimination can be derived" and then displays the rules labelled ∨-E and ∀-E
- three listings do not typecheck as printed: `swap` returns `x2:x1:x2` where the tail should be the list `xs` (Section 2.5, p.10); the `pos` example binds `y` in its type and uses `n` in the refinement (Section 2.4, p.9); the PLE version of `fMono` calls `fMono up x (y-1)` without the argument `f` (Section 2.4, p.8)
- Section 4.5 says "All but two of the rules are standard" (p.17); Appendix D.6 says "All but three" (p.39), the third being T-Fix, which Figure 14 does not show
- notation shifts between main text (`=.`, `** QED`, `Prop`) and Appendix I.1 (`==.`, `*** QED`, `Proof`)

## what is trusted

Inference, from statements spread over the paper: the Liquid Haskell implementation of reflection, translation and PLE; the SMT solver's answers, with no proof certificates (the paper lists certificates as an advantage of Coq, Agda and Isabelle and says "The issue of extracting checkable certificates from SMT solvers is well understood [12, 35] and easy to extend to our setting.", Section 8, p.29, without doing it); the termination and totality checker; the Haskell compiler; the assumed extensionality operator where used; and, for n-body, the identification of doubles with reals. The metatheory (Theorems 4.1, 5.2, 6.2, 6.10, 6.16) is proved on paper for a core calculus, not mechanised, and for some lemmas the main text points to the extended version.

Engineering limits listed by the authors (Appendix I.2, pp.55–56): lambda arguments in refinements need explicit types; class instance methods cannot be reflected; "Only user defined data types can currently used in verification."; and "There is no module support.", so all definitions and theorems live in one module.

## already established here

- that a verifier can reason about recursive user functions with quantifier-free queries only, by reflection plus guarded unfolding: established, with soundness, relative completeness and termination theorems
- that fuel-bounded unfolding is incomplete for plain equational goals (the `pos` example) and that guard-directed unfolding to a fixpoint is the principled replacement: established
- the proofs-as-programs style now standard in Verus (`proof fn`, recursion as induction, calls as lemma uses) is described here in full for a refinement type checker
- not addressed: imperative code, mutable state, loops and loop invariants, ownership, machine integers, modules; any automation of case splits, induction or lemma choice; any language model

## techniques for the catalog

- refinement reflection: declare a total function as an uninterpreted symbol and put its body into its result type, so each written call contributes one quantifier-free unfolding
- termination-and-totality gate for logical functions: admit a function into specifications only with a decreasing measure and exhaustive cases, since a diverging definition proves 0 = 1
- proofs as total programs: state a theorem as a function type and prove it by a terminating function, using branches for case splits, recursion for induction and calls for lemmas
- equational proof combinators: chain terms with relation operators whose types make the solver check each link, with an optional because-argument that supplies a lemma
- natural deduction as types: keep refinements quantifier-free and encode for-all as a dependent function, exists as a dependent pair, and as a pair, or as a sum, implication and negation as functions
- witness-passing existentials: prove an existential by returning the witness with a proof about it, and use one by unpacking the pair
- guard normal form: rewrite each definition as (condition, body) pairs with all conditionals hoisted, so that unfolding can be conditioned on a decided branch
- Proof by Logical Evaluation: repeatedly add the defining equation of every function application whose guard the solver can prove, until the goal is proved or no new equation appears
- unfolding fixpoint as diagnosis: when guard-directed unfolding saturates without proving the goal, the missing ingredient is a case split, induction hypothesis or lemma, not more unfolding
- transparency condition: run unfolding search only in contexts that are inhabited or refutable, which is what guarantees it stops
- tester-and-selector reflection of data types: translate pattern matching into nested conditionals over constructor tests and field selectors in place of quantified axioms
- defunctionalized lambdas with ground α/β instances: encode lambdas and application as uninterpreted symbols and add only the renaming and reduction equalities for terms present in the goal
- assumed extensionality operator: turn a pointwise equality proof into function equality through an explicitly unverified axiom, to be counted in the trusted base
- proof-carrying law classes: add laws as proof methods of a class and make clients require the verified class, so instances cannot exist without proofs
- theorem insertion in executable code: pass a proof term to an identity-typed helper to add a lemma instance to the verification context at a program point
