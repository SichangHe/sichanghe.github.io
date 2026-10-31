# Cameleer: A Deductive Verification Tool for OCaml
(authored by agents unless marked 🧑)
Tag: `pereira2021cameleer`, [paper](https://doi.org/10.1007/978-3-030-81688-9_31)

## purpose and architecture
Cameleer verifies GOSPEL-annotated OCaml by translating it to WhyML for Why3. The abstract states: “The formally-specified program is fed to our toolchain, which translates it into an equivalent one in WhyML, the programming and specification language of the Why3 verification framework.” The paper says the tool “handles a realistic subset of the language” (Introduction, p. 678), and the conclusion describes it as “a tool for automated deductive verification of OCaml programs, with bounded mutability” (section 6, p. 686).

The design follows the specifying programmer: “the person who writes the code should also be able to naturally provide suitable specification.” (Introduction, p. 678). The paper adds: “we believe specification and implementation should co-exist and evolve together” (p. 678). GOSPEL annotations are written in comments of the form `(*@ ... *)` next to the code (section 2, p. 678), and “GOSPEL terms are written in a subset of the OCaml language” (p. 678).

Inference: the direct-source-plus-intermediate-language pattern transfers to Rust plus Verus: preserve source structure, translate annotations to a proof-oriented IR, and use an existing automated backend. The paper does not claim Rust or Verus support.

## technique 1: behavioral contracts in GOSPEL
When to use: attach preconditions, postconditions, exceptional postconditions, loop invariants, and variants directly to an OCaml implementation. The paper extends GOSPEL beyond interface files with “implementation primitives, such as loop invariants and ghost code” (Introduction, p. 678).

Steps from the binary-search example (section 2, pp. 678–680, Fig. 1):
1. name the returned value in the contract's first line
2. require that the comparison argument `cmp` is a total preorder following the OCaml convention (negative, positive, or zero result); GOSPEL, hence Cameleer, assumes `cmp` is pure
3. require that the array is sorted according to `cmp`
4. state the regular postcondition (`ensures`): the returned index is within the bounds of `a` and its value equals `v`
5. state the exceptional postcondition (`raises`): when `Not_found` is raised, no index within bounds holds a value equal to `v`
6. give two loop invariants: the search limits stay within the bounds of `a`, and every index `i` with `a.(i)` equal to `v` lies within the current search limits
7. give a decreasing measure (`variant`) to prove loop termination
8. run `cameleer binary_search.ml`, which opens the Why3 IDE; the paper reports twelve verification conditions, “All of these are easily discharged by SMT solvers.” (p. 679)

A functor variant takes a module of type `OrderedType`; the `@logic` attribute makes `cmp` both a program and a logical function so an axiom about it can be stated. The paper reports it “generates the exact same twelve verification conditions as the higher-order counterpart” (p. 680).

Verus form (Inference): write the same contract with `requires`, `ensures`, and `invariant` on a Rust function and `while` loop; use `decreases` for termination. GOSPEL syntax, exceptional postconditions, WhyML translation, and OCaml pattern semantics do not carry over directly.

## technique 2: translation to WhyML
Cameleer's core is a translation from GOSPEL-annotated OCaml into WhyML, defined as “a set of inductive inference rules between the source and target languages [26]” (section 3, p. 681). GOSPEL annotations become WhyML specification, and supported OCaml constructions, including ghost code, map to “semantically-equivalent WhyML constructions” (p. 681); e.g., `let[@ghost]` becomes a WhyML ghost function and `assert false` becomes `absurd` (pp. 681–682). Why3 has no functor syntax, so an OCaml functor argument is encoded as a nested `scope` inside the functor's scope (p. 682).

Pipeline (section 3, pp. 680–682, Fig. 3): the GOSPEL toolchain parses the annotated program via ppxlib and attaches specification to OCaml AST nodes; Cameleer translates the decorated AST to WhyML using the Why3 API; OCaml is registered as a Why3 input language, so Why3 tools work on `.ml` files directly. If the Why3 type-and-effect system rejects the program, “the reported error is propagated back to the level of the original OCaml code” (p. 681). The user writes only the OCaml code and GOSPEL specification and “never needs to manipulate or even care about the generated WhyML program” (p. 681). The implementation is “1.8K non-blank lines of OCaml code” (p. 681).

Inference: use this pipeline when the source language shares much with a mature intermediate verification language; a Rust-to-Verus front end should similarly reject unsupported ownership, aliasing, and trait features rather than silently weaken contracts.

## technique 3: ghost code and lemma functions
Ghost code is “code that has no computational purpose and is used only to ease specification and proof effort” (Introduction, p. 678). The evaluation states that ghost lines in Fig. 4 “stands for ghost fields in record types, ghost functions, and lemma functions”, and “the arithmetic compiler example uses lemma functions to prove, by induction, results about semantics preservation” (section 4, p. 684). Cameleer uses the Why3 extract tool to erase ghost code (section 3, p. 682).

Verus form (Inference): represent ghost state with proof-only variables and `proof fn` lemmas; keep executable functions separate. A Verus lemma needs explicit `requires` and `ensures`; the paper's WhyML declarations are not Verus syntax.

## technique 4: case studies and evaluation
The test suite has “over 1000 lines of OCaml code” verified with Alt-Ergo 2.4.0, CVC4 1.8, and Z3 4.8.6 (section 4, p. 683). It includes code from the OCaml standard library (`List.fold_left`, Stack), ocaml-containers (Leftist Heap), and OCamlgraph (applicative Queue), plus numerical, sorting and searching, functor-based data-structure, historical, and CPS examples (p. 683). The largest case study is a toy compiler from arithmetic expressions to a stack machine; Union Find has the most involved specification (p. 684). Some case studies “required some form of manual interaction in the Why3 IDE”, described as “very simple proofs by induction (of auxiliary lemmas) and case analysis” (pp. 684–685).

Evidence: Fig. 4 reports per case study the number of verification conditions, lines of OCaml, GOSPEL, and ghost code, proof replay time in seconds, and whether the proof is immediately discharged (p. 683). Runtimes are averages over ten runs on a Lenovo Thinkpad X1 Carbon 8th Generation, Linux Mint 20.1, OCaml 4.11.1, and Why3 1.3.3 (developer version) (p. 684). The authors “believe the required annotation effort is reasonable, although non-negligible” (p. 685).

Limits: Why3 rejects recursive mutable data types such as the Queue `cell` type, because they “can introduce arbitrary memory aliasing which breaks the bounded-mutability principle of Why3” (section 3, p. 683). The conclusion says Cameleer targets a subset “which roughly corresponds to caml-light, with basic support for the module language (including functors)”; WhyML's alias restriction “limits our support for higher-order functions and mutable recursive data structures”; objects, GADTs, and polymorphic variants are unsupported (section 6, pp. 686–687). Planned work targets Viper and CFML (p. 687).

## what is proved, measured, and trusted
Fact: the paper reports Why3 verification conditions discharged for the translated WhyML programs of its case studies.

## techniques for the catalog
- source-level behavioral contracts: co-locate preconditions, regular and exceptional postconditions, invariants, and variants with implementations
- annotated-language translation: compile contracts and code into an intermediate verification language with automated provers, propagating backend errors to the source level
- ghost and lemma functions: add erased ghost fields, ghost functions, and induction lemmas to close proof obligations
- bounded-mutability verification: accept only programs whose aliasing is statically known, rejecting others such as recursive mutable data types
