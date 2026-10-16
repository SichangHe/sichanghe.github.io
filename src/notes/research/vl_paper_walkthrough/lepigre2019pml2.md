# PML2: Integrated Program Verification in ML
(authored by agents unless marked 🧑)
Tag: `lepigre2019pml2`, [paper](http://arxiv.org/abs/1901.03208v1)

## scope and result

PML2 combines an ML-like call-by-value language with a type system used both for programming and proving. Programs and proofs share syntax; proof terms are accepted only when termination is established. The abstract states, “We present the PML2 language, which provides a uniform environment for programming, and for proving properties of programs in an ML-like setting.” (Abstract, p. 1) The paper is an introductory description, not a complete metatheory: it says its aim “is not to give the details of the realizability semantics, nor to prove new theoretical results.” (§1.3, p. 3)

## technique 1: specify program behavior with equality types

What it is. A type can contain an equality `t ≡ u` between arbitrary language terms. A proof is a terminating program inhabiting that type. Examples include commutativity of `add`, involutivity of `reverse`, and sortedness of `sort` (§1.1, p. 2). The type checker maintains an equational context and uses a partial decision procedure to simplify and discharge equations.

How to apply it. Define the data type and executable function. State the property as a universally quantified equality. Restrict quantification to a type when the property is valid only for that type. Construct a terminating function whose result has the equality type. In the paper, `add_Zero_n` is immediate because `add Zero n` unfolds to `n`; `add_n_Zero` recursively pattern-matches on `n` and calls itself on the predecessor (§3.1, pp. 8–9).

The distinction matters: unrestricted `∀n:ι` quantifies over every value, including booleans and functions, while `∀n∈nat` restricts the domain. The paper says, “Indeed, the equivalence add n Zero ≡ n does not hold when n is not a unary natural number.” (§3.1, p. 9)

Verus form. Inference: express the equality as a Verus `ensures` clause on an executable function or as a separate `proof fn`/lemma with `requires` and `ensures`. Use `assert` and recursive lemmas for the induction cases. Verus's `spec fn` and `proof fn` are separate constructs, so PML2's single syntax does not carry over; executable Rust remains ordinary Rust while proof code is erased.

Evidence and limits. The examples are accepted by the implementation version named in §1.2, and the paper states that examples are automatically checked when the document is generated (§3.3, p. 11). No benchmark denominator or proof-time study is reported. Equality relies on the implementation's decision procedure and on the accuracy of the specification.

## technique 2: build proofs by pattern matching and lemma calls

PML2 learns equations from two events: a case analysis adds the equation matching the constructor, and a lemma call adds that lemma's conclusion to the equational context (§3.2, p. 10). This makes induction look like functional programming. `add_comm` pattern-matches on `n`; the zero branch calls `add_n_Zero m`, and the successor branch calls `add_comm k m` followed by `add_n_S_m m k` (§3.2, p. 10).

Apply it by writing one branch per constructor, calling the induction hypothesis on structurally smaller data, and calling helper lemmas in the order needed by later goals. Optional `show`, `using`, `deduce`, and `qed` annotations expose the intended reasoning without changing the checker (§3.3, pp. 10–11).

Verus form. Inference: use a recursive `proof fn` for the induction hypothesis, `match` on the datatype, and helper lemmas with explicit `ensures`. `assert` or `reveal` may be needed to expose recursive definitions; the exact automation is Verus-specific. PML2's hidden equational-context updates are not a Verus guarantee, so generated proofs must state intermediate facts explicitly when the verifier cannot infer them.

## technique 3: use restriction and membership types for refined data

A restriction type `a | t ≡ u` contains values of `a` only when the equality holds. Combined with existential and membership types, it defines sets and refined data. The paper defines vectors as `{ l ∈ list<a> | length l ≡ s }` and then converts a vector to a list by identity because the vector type is a subtype (§3.4, pp. 11–12). The `app` function consumes vectors of sizes `m` and `n` and returns one of size `add m n` (§3.4, p. 12).

Use this technique when a data invariant should travel with a value. Define the executable measure (`length`), define the restricted type, prove the measure relation, and write functions whose input/output types expose the relation. The paper warns that the size index is a term, not a termination ordinal, and can even be ill-typed; such a vector type is simply empty (§3.4, p. 11).

Verus form. Inference: represent the refinement as a Rust data structure plus a `requires` predicate on constructors and methods, or as a ghost predicate over a value. Return-size relations become `ensures` clauses. Unlike PML2 subtyping, Rust does not automatically coerce every refined value to its base type; wrappers or proof lemmas are needed.

## technique 4: extract programs from classical proofs with continuations

PML2's control operator captures and restores continuations, giving computational content to classical logic. The paper defines `extract`, which returns either an even or odd substream from any natural-number stream (§4, pp. 12–15). `extract_aux` inspects the head, calls the corresponding continuation, and recursively extends one partial stream. The outer function saves continuations for the `InL` and `InR` alternatives.

The finite version `finite_extract` takes a natural `n` and returns an even or odd vector of length `n`; the paper notes that an intuitionistic version can inspect at most `2 × n` input elements (§4, p. 15). The example on three zeroes followed by ones returns even prefixes for lengths 0–2 and odd prefixes for lengths 3–4 (p. 16), demonstrating backtracking caused by looking ahead one element.

Verus form. Inference: model the result as an enum and represent the continuation algorithm with explicit state rather than Rust closures that escape arbitrarily. Use a ghost invariant tying the produced prefix to the input stream and prove bounded inspection for the finite version. Verus does not provide PML2's classical realizability semantics or `call/cc` primitive; this is a design translation, not a direct encoding.

## technique 5: enforce proof soundness through termination checking

PML2 permits general recursion operationally but requires proofs to terminate. The paper states, “It is important to note that, in our system, a program that is considered as a proof needs to go through a termination checker.” (§3.1, p. 9) Its termination checker types recursive definitions through a circular unfolding rule and rejects non-well-founded cycles using the size-change principle (§5, pp. 16–17). Sized types attach ordinals to inductive and coinductive structures; explicit size annotations can make otherwise rejected calls pass (§5.2, pp. 18–19).

Apply it by identifying a decreasing argument or size, adding a sized type when inference is too weak, and checking every recursive proof call. The rejected `add_n_Zero_loop` illustrates why an unguarded recursive call would prove any equation (§3.1, p. 9). The paper's `map` example passes with inferred sizes; a more precise `slist` index is needed when recursive calls pass through `map` (§5.2, pp. 18–19).

Verus form. Inference: use `decreases` clauses on recursive executable or proof functions and prove the measure decreases in each call. Verus termination obligations are explicit contracts rather than PML2's circular typing derivations. Inference: a generated proof should never use `external_body` to bypass this obligation, because that would move the key soundness argument into the trusted boundary.

## technique 6: prove hard termination by equivalence to an easy function

For McCarthy 91, PML2 treats the traditional recursive function as an untyped value object, defines a simple terminating function returning the same result, and proves pointwise equivalence on naturals (§5.3, pp. 19–21). A `check ... for ... because ...` annotation uses the easy function for type checking while retaining the hard function for execution; after erasure, the executable term is the hard implementation (§5.3, p. 21).

Apply it by defining the difficult implementation as a logical object, defining a terminating surrogate, proving equivalence under the intended domain, then using the equivalence annotation. The proof is domain-restricted: the paper explicitly says it did not prove equivalence of the two functions as untyped functions, which may be observationally distinguishable outside naturals (§5.3, pp. 20–21).

Verus form. Inference: prove a refinement lemma that the real Rust function equals a structurally terminating specification function for all inputs satisfying a domain predicate. Use the specification function only in proofs; do not substitute it for executable code unless the implementation itself is changed. This technique is especially useful for agent-generated code whose termination is hard to expose, but the domain assumptions must be explicit.

## technique 7: internal totality proofs for call-by-value reasoning

A totality proof has type `∃v, f x ≡ v`, asserting that a function applied to a value evaluates to some value. PML2 needs this because a call-by-value function cannot reduce an argument that is not yet a value. In the associativity proof, `add_total n p` supplies a value `v`, allowing the chain `add Zero (add n p) ≡ add Zero v ≡ v ≡ add n p` (§5.4, pp. 21–22).

Apply it by proving totality recursively alongside the function, invoking the totality lemma before pattern matching or reduction under a non-value argument. The paper says totality proofs “have a similar structure as the definition of the function itself” (§5.4, p. 22).

Verus form. Inference: use a ghost result/spec function and prove that the executable function returns a value satisfying the postcondition; Rust evaluates arguments eagerly, so the exact PML2 obstacle differs. The transferable idea is to expose an intermediate witness when automation cannot unfold a nested call.

## what is proved, measured, and trusted

The paper demonstrates type-checked examples: arithmetic equalities, vector append, classical stream extraction, termination of selected recursive programs, McCarthy 91 equivalence, and totality lemmas. It gives no quantitative benchmark suite, proof-size denominator, or runtime comparison. Trusted assumptions include the PML2 implementation, its partial equational decision procedure, termination checker, realizability model, and standard library lemmas. The paper reports that “we have not yet proved any subject reduction result for the system, and thus we only have a weak form of type safety.” (§6.3, p. 23) It also says proof traces for external checking are future work (§6.6, p. 24), so independently replayable certificates are not yet provided.

Inference: the threat to agent-written verified Rust is specification drift and hidden proof state. PML2's uniform proof/program syntax can guide generated proof structure, but Verus requires explicit contracts, decreases measures, and lemmas. Inference: the equivalence-to-surrogate technique could reduce proof search, while its domain-restricted nature makes unchecked substitution dangerous.

## what VL should not redo

Existing work already demonstrates proof-as-terminating-program, automatic equality-context management, sized termination checking, refined data types, classical extraction, and surrogate-based termination proofs. VL should reuse these patterns as design hypotheses and focus on their Rust/Verus encodings, explicit evidence, and specification inference. It should not claim PML2's metatheoretic strength: the paper itself lists missing subject reduction and external proof traces.

## techniques for the catalog

- equality-type specifications — state program properties as term equations inhabiting types
- equational-context proof programming — learn equations from pattern matches and lemma calls
- restriction and membership types — carry executable invariants such as vector lengths with values
- classical continuation extraction — compute alternatives from classical proofs using saved continuations
- size-change termination checking — reject non-well-founded proof recursion using sized types
- equivalence-guided termination — check a hard implementation through an equivalent terminating surrogate
- internal totality proofs — expose value witnesses needed for call-by-value equational reduction

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
