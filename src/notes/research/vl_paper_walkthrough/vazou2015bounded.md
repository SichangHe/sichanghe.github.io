# Bounded Refinement Types
(authored by agents unless marked 🧑)
Tag: `vazou2015bounded`, [paper](https://arxiv.org/abs/1507.00385)

## scope and result

The paper introduces bounded quantification for refinement types. Its central claim is that constraints between abstract refinements add higher-order expressive power while preserving automatic, decidable SMT checking. The abstract says the technique is used for relational algebra and safe database access, Floyd–Hoare logic in a state-transformer monad, and a refined IO monad tracking capabilities and resource use. The implementation is in Liquid Haskell; the paper supplies source for the examples (abstract and §1, p.1).

The trust story is a theorem about the calculus, not a measurement of deployed systems. The paper defines a translation from bounded calculus λB to the existing abstract-refinement calculus λP, proves semantic preservation, and states: “The Soundness of λB follows by combining the above Semantics Preservation Lemma with the soundness of λP.” (§3.5, p.7). It then gives the operational result: “To Typecheck a λB program e we translate it into a λP program e′ and then type check e′; if the latter check is safe, then we are guaranteed that the source term e will not crash” (§3.5, p.7). These claims assume the soundness of the base type system, the translation, the SMT theory, and the implementation; the paper does not evaluate adversarial specifications or compiler/runtime behavior.

## technique 1: constrain abstract refinements with bounds

What it is: an abstract refinement is a predicate parameter such as `p :: Int → Bool`; a bound is a logical relation restricting which concrete predicates may instantiate it. This repairs the modularity failure of ordinary first-order refinements. In the `find` example, the continuation must be called only with values at least as large as the starting value. The paper defines `UpClosed p = λx → p x ⇒ p (x+1)` and gives `find` the bound `(UpClosed p) ⇒ (Int → Bool) → (Int<p> → a) → Int<p> → a` (§2.2, p.2).

How to apply it, following the paper:

1. Identify the relation a higher-order argument must preserve. For `find`, require that membership in `p` is preserved by incrementing (§2.2, p.2).
2. Write that relation as a bound between abstract refinements. The paper's exact example is “bound UpClosed ( p :: Int → Bool ) = λx → p x ⇒ p ( x +1)” (§2.2, p.2).
3. Put the bound in the polymorphic function signature and instantiate `p` at the call site with the concrete predicate `λv → n ≤ v` (§2.2, p.2).
4. Generate the extra verification condition; the paper says the instantiation generates `n ≤ x ⇒ n ≤ x+1`, which the SMT solver checks (§2.2, p.2).

Inference: in Verus, represent the relation as a `spec fn` over mathematical values, expose it as a `requires` fact on a proof-level helper, and use `ensures` to carry the instantiated relation through calls. Verus has no bounded-refinement type syntax, so the type-directed instantiation becomes explicit ghost arguments or lemma calls. The executable Rust function remains ordinary; only the specification and proof layer changes. Inference: keep the bound quantifier-free where possible, because the paper's decidability argument depends on SMT-decidable refinement logic.

Evidence and limits: the paper's soundness theorem is the formal evidence; there is no benchmark denominator or runtime comparison. It warns that inference requires monotonic constraints: abstract variables may appear only positively, so implications are restricted to bounds (§3.6, p.8). This is a real limitation when a desired predicate occurs negatively.

## technique 2: elaborate bounds into ghost functions

What it is: each bound is translated to a first-order function type whose result carries the bound formula. A bound is implemented by a ghost function that returns `true`; its type proves the constraint. At a use site, a call to that ghost materializes the bound as a verification condition (§2.4, p.4).

The paper's procedure is concrete:

1. Translate `Chain p q r` into `ChainTy p q r = x:a → y:b → z:c → {v:Bool | q x y ⇒ p y z ⇒ r x z}` (§2.4, p.4).
2. Treat the bound function as an extra ghost parameter when checking the bounded function.
3. Convert applications to administrative normal form and insert a ghost call after intermediate values are named. The paper shows `t1 = g x`, `t2 = f t1`, then `_ = $chain x t1 t2` (§2.4, p.4).
4. At a caller, create a lambda returning `true`, such as `compose (λ_ _ _ → true) incr incr`; function subtyping checks that this lambda satisfies `ChainTy` (§2.4, p.4).

The resulting verification condition is quantifier-free and is discharged by SMT. The paper notes a cost bound: materialization can insert up to `n^k` calls, where `k` is the number of bound parameters and `n` the number of in-scope variables, although it says the practical number is small in `compose` (§2.4, p.4).

Inference: Verus can use a ghost `proof fn` or lemma with `requires` equal to the bound and `ensures` equal to its instantiated consequence. Call the lemma after naming intermediate values; do not make a `proof fn` part of executable code. Inference: this is a proof-encoding pattern, not a Rust type feature, and the lambda-returning-`true` trick must become an explicitly proved lemma rather than an unchecked assumption.

## technique 3: bounded specifications for higher-order combinators

The paper demonstrates three reusable patterns. For composition, `Chain` relates input/output pairs of two functions: if `q x y` and `p y z`, then `r x z`. It instantiates `p,q` with relations of the form `v == x + 1` and `r` with `v == x + 2`, proving the composed increment example (§2.3, p.3). For filtering, a `Witness p w` bound connects a Boolean test to an arbitrary refinement: “which says that for any boolean b such that w x b holds, if b is True then p x also holds” (§2.3, p.3). This proves a positive-only list from an `isPos` test without a special latent-predicate construct. For folding, `Inductive inv step` states that an invariant over the accumulator is preserved by each list element; instantiating `inv` with `v == len xs` and `step` with `b' == b+1` verifies a length-counting fold (§2.3, pp.3–4).

How to use these patterns:

1. Choose an abstract relation for each function boundary.
2. State the closure, witness, or induction obligation as a bound.
3. Instantiate the abstract refinements from the concrete call.
4. Let constraint generation and abstract interpretation solve the resulting Horn constraints.

Inference: Verus equivalents are a `spec fn` relation over `Seq` or scalar values, a `proof fn` establishing composition, and a loop `invariant` for the fold case. Verus does not infer these relations automatically, so an agent must propose them and Verus must check every obligation. Inference: for a Rust iterator, preserve the paper's logical relation but replace Haskell's higher-order type with explicit closure contracts or a ghost model of the sequence.

## technique 4: infer instantiations with monotonic abstract interpretation

The implementation generates templates with fresh refinement variables, emits subtyping constraints, and solves them with abstract interpretation borrowed from Liquid Typing (§3.6, p.8). The paper states: “Inference Requires Monotonic Constraints.” It therefore prohibits implications outside bounds, pushes antecedents into the environment, and keeps unknown predicates in positive positions. This is what makes call-site instantiation automatic while retaining quantifier-free SMT obligations.

Inference: Verus has no Liquid inference pass. A product can imitate the workflow by generating candidate `spec fn`s and `requires`/`ensures`, then asking Verus for counterexamples, but this is an agent-side synthesis loop rather than a Verus feature. The assumption that candidate predicates are monotonic must be checked by the synthesis tool; Verus alone will not infer a missing higher-order relation.

## technique 5: typed relational algebra and database schemas

The paper encodes rows as dictionaries whose keys and values carry refinements, then defines refined tables and operators. A schema refinement fixes the domain and value type for each key; the movie example rejects a year below 1888 or a misspelled `Dir` key (§4.1, pp.8–9). Operators preserve schemas: `union` and `diff` return the same schema, `select` constrains predicates to available fields, and `project` changes the domain to exactly the selected fields (§4.2, p.9). The paper emphasizes that “All schema reasoning happens at the granularity of the logical refinements” (§4.2, p.9), and erasing refinements leaves well-typed Haskell but loses safety for operations such as dynamic lookup.

Inference: in Verus, model a row with a ghost `Map<String, Univ>` or a fixed Rust struct, and use `spec fn` predicates for key sets and value tags. Use `requires` for schema membership and `ensures` to preserve or restrict the key set. The paper's dynamic dictionary operations do not carry over directly to Rust ownership; a fixed struct or a ghost map plus explicit bounds is safer.

## technique 6: RIO state transformer, Floyd–Hoare combinators, and capability framing

RIO indexes a stateful computation by a precondition over `World` and a two-state postcondition. The paper then encodes mutable variables with McCarthy `select`/`update`, whose quantifier-free theory SMT solvers decide (§5.2, p.11). `ifM` and `whileM` receive bounds corresponding to Floyd–Hoare premises: loop invariance, exit implication, and a one-state postcondition. The worked `whileTest` decrements a nonnegative counter and verifies that it ends at zero (§5.2, pp.11–12).

The capability extension maps file handles to privilege sets. API contracts distinguish privilege-preserving operations (`eqP`) from allocation and privilege derivation (`alloc`, `copyP`, `derivP`). Recursive `copyRec` initially loses facts about source and destination; the paper introduces a `Stable i` bound and frames `i` through the recursion, then verifies the client with the minimal listed privileges (§6.1–6.3, pp.12–13).

Inference: Verus can represent `World` as a ghost state model, use `requires`/`ensures` for pre/post relations, and place `invariant` clauses on loops. Use `old(...)` in postconditions for pre-state values, and prove frame properties with lemmas over unchanged map entries. Inference: capability tokens can be represented by ghost sets or linear ghost state, but the paper's Haskell dictionary semantics and Shill runtime assumptions require a Rust-specific API model. Inference: this technique is directly relevant to VL when verifying resource access, because it makes permissions and non-revocation explicit; it does not by itself prove the real filesystem or OS behavior.

## what is proved, measured, and trusted

The paper proves semantic preservation and type soundness of λB and demonstrates checked libraries in Liquid Haskell. It reports no corpus size, success fraction, timing, or comparison denominator. The examples are evidence that the encoding works, not evidence of industrial scale. The trusted base includes the λP soundness result, SMT solver correctness, Liquid Haskell implementation, primitive state/file-system model, and the user's refinements. Inference: a wrong or overly strong refinement can produce a valid proof of the wrong property; erasing refinements preserves host-language typing but removes the guarantees. Inference: for agent-written verified Rust, the threat is high for specification omission and model mismatch, medium for proof-generation errors if Verus checks all generated obligations, and concentrated in external APIs, ghost models, and inferred contracts.

No earlier study in the local walkthrough has this paper's specific bounded-refinement encoding; its closest reusable Verus ideas are explicit contracts, loop invariants, ghost state, and proof lemmas. VL should not redo the paper's abstract interpretation or dictionary/RIO encodings unchanged; it should adapt the closure, witness, induction, and framing patterns to Rust APIs and measure whether generated proofs remain stable under dependency and model changes.

## techniques for the catalog
- bounded refinement bounds — constrain abstract predicates with logical relations so higher-order specifications remain modular
- ghost-function elaboration — translate each bound into a first-order ghost function and materialize it at use sites
- closure, witness, and induction bounds — specify composition, filtering, and folds through reusable relational obligations
- monotonic refinement inference — synthesize call-site predicates by solving positive Horn constraints with abstract interpretation
- schema-refined relational algebra — preserve database key and value invariants through typed dictionary and table operators
- RIO Floyd–Hoare indexing — encode stateful pre/postconditions, branches, and loops as bounded refinements
- capability framing — track resource privileges and preserve stable facts across recursive state transformations
Checked 2026-10-14: audit record vazou2015bounded; paper-study comparison complete; gate executed; experiments not rerun
