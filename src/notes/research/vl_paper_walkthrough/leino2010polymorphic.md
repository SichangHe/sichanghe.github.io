# A Polymorphic Intermediate Verification Language: Design and Logical Encoding
(authored by agents unless marked 🧑)
Tag: `leino2010polymorphic`, [paper](https://www.semanticscholar.org/paper/7f8db62d17088defaa56f949d7ee0406d6a60715)

## purpose and architecture

The paper presents Boogie 2 as an intermediate verification language between source-language front ends and SMT solvers. Its abstract states: “Intermediate languages are a paradigm to separate concerns in software verification systems when bridging the gap between programming languages and the logics understood by theorem provers.” (Abstract, PDF p. 312) Boogie 2 adds impredicative, higher-rank polymorphism, polymorphic maps, type quantification, and a type system that rejects ill-typed intermediate programs. The paper gives two translations of typed expressions into simply typed logic suitable for SMT solvers.

The architecture is useful when several source verifiers need one common verification-condition language. The paper says: “In fact, we give two different translations into simply typed logic, and we present performance figures from substantial benchmarks that compare these.” (Section 1, p. 313) Source front ends encode heaps, procedures, and specifications in Boogie; Boogie generates verification conditions; a translator encodes types and expressions for an SMT solver. The paper's benchmarks include Spec#, VCC, HAVOC, Dafny, and Boogie regression suites (Sections 1 and 5, pp. 312–325).

## technique 1: use a typed intermediate language with polymorphic maps

What it is. Boogie declares built-in `bool`, mathematical `int`, arbitrary bit-vectors, user type constructors, polymorphic functions, and first-class maps. Distinct type instantiations denote disjoint sets. A type-safe object store can be modeled as `HeapType = [α][Ref, Field α] α`, with `Heap[r,age]` an integer and `Heap[r,isMarried]` a boolean (Section 2, pp. 313–316).

How to apply it.

1. Declare uninterpreted constructors such as `Ref` and `Field α`.
2. Declare polymorphic map types for state; use map select `m[i]` and map update `m[i := x]`.
3. Declare polymorphic functions and axioms, quantifying over type variables and values. For example, `Left(Cons(a,b))=a` is quantified over arbitrary element types.
4. Require each type parameter to occur in a function or map domain/result so type inference can determine its instantiation. Add an explicit coercion `e:t` when the context is otherwise ambiguous.
5. Represent source-language modifies clauses by relating `old(Heap)` and `Heap`; polymorphic field quantification allows one clause to range over all field result types (Section 2.2, pp. 314–317).

Boogie maps are first-order individuals with select/store operations, so they can model higher-order-looking values while remaining suitable for first-order SMT theories. Extensionality is deliberately not assumed; users add extensionality axioms only when required (Section 2.2, p. 316).

Verus form. Inference: use Rust generic types and traits for executable typing, and ghost/specification maps for heap abstractions. Verus's `Map`-like specifications, `spec fn`, `requires`, `ensures`, and `old` expressions can state pre/post relations, but Verus does not provide Boogie's impredicative type quantifiers or polymorphic map encoding directly. Inference: keep type invariants in Rust's type system where possible and state cross-type logical facts as lemmas.

Evidence and boundaries. The paper's type system is a design and encoding result, not a proof that every source front end's heap model is adequate. Map extensionality and user axioms remain assumptions.

## technique 2: represent types as first-order terms

What it is. Encode all Boogie types as terms in a simply typed target with sorts `bool`, `int`, `U` (non-built-in individuals), and `T` (encoded types). Introduce `type: U→T` and, for each type constructor `C`, a function `C# : T^arity(C)→T`; constructor tags and inverse functions express injectivity and disjointness (Section 3, pp. 318–320).

How to apply it.

1. Normalize polymorphic map types to type constructors, selecting most-general map-type skeletons to avoid overlapping encodings.
2. Translate a source type expression to a term of sort `T`.
3. Add axioms stating constructor disjointness, injectivity, and selector/inverse behavior.
4. Encode polymorphic map select/store with separate symbols for each map skeleton and explicit type parameters.
5. Embed `int` and `bool` into `U` with cast functions `i2u` and `u2i`, plus round-trip axioms.

The paper warns that a naive constructor per map type can encode a shared instance twice; its most-general-skeleton construction avoids this overlap (Section 3, pp. 319–321). The target remains first-order and can be translated further to untyped logic with domain predicates if a solver requires it.

Verus form. Inference: a Verus front end could encode Rust generic type identity with ghost type tags and injectivity lemmas, but ordinary Verus proofs rely on Rust's static type checker rather than reifying types as SMT terms. This encoding is therefore a backend design option for a multi-language verifier, not a direct Rust annotation.

Evidence. The paper proves the encoding definitions and uses them in the two expression translations; it does not claim that arbitrary SMT models enforce every omitted semantic property. The target solver, type axioms, and front-end translation remain trusted.

## technique 3: translate expressions with type guards

What it is. The first expression encoding carries type information through logical guards. A polymorphic function becomes a `U`-typed function with a post-translation axiom stating the type of its result; quantified variables are guarded by equalities such as `type(x)= [[t]]` (Section 4.1, pp. 321–323).

How to apply it.

1. Translate source individuals to `U` and source types to `T` terms.
2. For each quantifier over values and types, add guards that each value has the translated type.
3. Add a result-type axiom for every translated polymorphic function.
4. Translate built-in `int` and `bool` operations through cast functions and corresponding type axioms.
5. Preserve user-supplied triggers by encoding each trigger expression with the same type machinery.

The paper's `Mojo` example adds `type(Mojo(x))=int#`, then separate guarded axioms for integer and `GuitarPlayer` arguments (Section 4.1, pp. 321–322). Type guards are general and support arbitrary polymorphic functions, but they add axioms and can burden e-matching.

Verus form. Inference: this resembles adding explicit ghost predicates that guard a polymorphic lemma with the relevant Rust type or trait invariant. Verus's type checker already rejects ill-typed terms, so duplicating all type guards in specifications is usually unnecessary unless a dynamic type/tag model is being verified.

## technique 4: translate with explicit type arguments

What it is. The second encoding passes each type parameter as an ordinary extra function argument. A polymorphic function `f<α>(x)` becomes `f#(type-argument,x)`; triggers then match on terms carrying the required type information, avoiding most type guards (Section 4.2, pp. 323–324).

How to apply it.

1. Reify each inferred type parameter as a term of sort `T`.
2. Add those terms as leading arguments to translated functions and map operations.
3. Translate quantifiers so type variables are ordinary `T` variables.
4. Ensure triggers mention the explicit type arguments, making e-matching type-specific.
5. Use this encoding when solver performance matters more than complete generality; the paper says it is not applicable to every source feature but is faster on the tested workloads.

Verus form. Inference: model a generic lemma with an explicit ghost type parameter or trait witness when SMT triggers need help. Verus does not expose SMT trigger control in the same way, so the correspondence is conceptual. Inference: avoid inventing runtime type arguments solely for proof; keep them in proof-only state.

## technique 5: preserve triggers and evaluate translations

What it is. Triggers guide SMT e-matching for quantified formulas. The translator must encode trigger terms without changing their matching behavior. The paper evaluates type guards, type arguments, and an intentionally unsound “No Types” translation that erases type information (Sections 1 and 5, pp. 312, 324–325).

How to measure it. Boogie 2 generates verification conditions for more than 10,000 benchmark conditions. Z3 2.01 runs each condition three times, with a 120-second timeout (1,800 seconds for Boogie tests), on an Intel Core 2 Duo 3.16 GHz with 4 GB RAM (Section 5, p. 325). The type-argument encoding is close to “No Types”; type guards are on average 55% slower on VCC and similar on HAVOC. Across related work, the paper reports its maximum slowdown as 95% for type guards and 45% for type arguments (Section 5, pp. 325–326). The denominators are the benchmark conditions in each category, and the percentages are averages under this solver and hardware setting.

Verus form. Inference: treat quantifier triggers and solver context as part of proof performance, while checking semantics independently. A Verus benchmark should record solver version, timeout, successful obligations, and whether quantifier facts are exposed. Inference: a trigger-preserving translation is relevant to VL only if VL introduces a polymorphic intermediate representation; ordinary Rust type checking may make the typed encoding unnecessary.

## what is proved, trusted, and still missing

The paper gives a formal type system, two logical encodings, and performance evidence that advanced types are feasible. Its conclusion says: “Our experimental data support the idea that including such advanced features in an intermediate verification language is both desirable for verifier front ends and feasible for performance.” (Section 6, p. 326) It does not provide a machine-checked proof of the full Boogie implementation, Z3, the source-language front ends, or the adequacy of user axioms. The unsound “No Types” baseline is explicitly a comparison point, not a usable correctness translation.

Inference: VL should preserve a typed intermediate layer if it combines multiple front ends or models polymorphic libraries. It should retain explicit type information in generated SMT formulas and maintain user triggers through translation. Reimplementing Boogie's complete polymorphic map encoding is unnecessary for a Rust-only verifier unless a concrete generic-heap benchmark requires it.

Inference: for agent-written verified Rust, the direct threat is medium at the infrastructure boundary and low at ordinary function proofs. Agents can generate specifications whose generic types or map axioms are inconsistent, or trigger solver blowups by exposing too many quantified facts. Verus's static typing blocks many malformed terms, but it does not validate the semantic adequacy of ghost type models or external-library contracts. The paper does not study agent-written Rust, so this threat estimate is an inference.

## techniques for the catalog

- typed intermediate verification language — use a shared polymorphic, map-aware IR to separate source front ends from solver logic
- first-order type-term encoding — represent type constructors, maps, and built-in casts as simply typed terms with axioms
- type-guard translation — preserve typing by adding result-type axioms and guards to quantified formulas
- explicit type-argument translation — pass type terms as function arguments so SMT triggers remain type-specific
- trigger-preserving evaluation — compare typed translations and an unsound type-erasing baseline with fixed solver, timeout, and denominator
Checked 2026-10-14 against the paper by a Codex agent: audit record leino2010polymorphic; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
