# Translating Scala Programs to Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `hupel2016translating`, [paper](http://arxiv.org/abs/1607.01539v1)

## purpose and architecture
This system connects Leon, which verifies a functional subset of Scala using automated theorem provers, to Isabelle/HOL, whose kernel checks interactive proofs. The abstract says: “We present a trustworthy connection between the Leon verification system and the Isabelle proof assistant.” (abstract, p. 1). The integration maps Pure Scala syntax into Isabelle/HOL through a shallow embedding, turns Leon verification conditions into Isabelle lemmas, and uses Isabelle tactics and its proof kernel instead of Z3 or CVC4.

The motivation is explicit: “Proofs in Isabelle, even those generated from automated tactics, are justified by a minimal inference kernel.” (Section 1, p. 2). Isabelle also brings its mathematical libraries. Inference: this is a certificate and independent-checking pattern that could be adapted to a Verus front end, but the paper does not discuss Rust or Verus.

## technique 1: shallow syntax translation

when to use it
Use the bridge for a functional, Pure Scala program in Leon's supported subset. Translate data types, expressions, functions, assertions, and proof annotations to Isabelle/HOL definitions and lemmas.

how to apply it
1. Represent Scala sealed-class algebraic data types as Isabelle `datatype` declarations. Figure 1 maps `sealed abstract class List[A]`, `Cons`, and `Nil` to `datatype 'a list = Nil | Cons 'a "'a list"` (Section 2.1, p. 3).
2. Translate recursive functions to Isabelle `fun` definitions and translate Leon `ensuring` postconditions into explicit Isabelle `lemma` statements. The paper's `size` example becomes a `fun size` definition and `lemma "size xs >= 0" by (induct xs) auto` (Figure 1, p. 3).
3. Map Scala terms syntactically rather than interpreting a Scala AST inside HOL. The authors call this “a shallow embedding, that is, we do not model Scala’s syntax, but rather perform a syntactic mapping from Scala constructs to their equivalents in HOL.” (Section 1, p. 2).
4. Do not preserve Scala identifier names: they are suffixed with unique numbers, and users refer back to the original names through the `<var _>` syntax inside embedded Isar (Section 4, p. 6).

verus form
Inference: the corresponding Verus bridge would lower a supported Rust subset into Verus declarations and proof obligations, preserving source-to-target name maps. Rust `requires`/`ensures` and `assert` obligations could become Verus proof lemmas, but Rust ownership and mutable references do not carry over from Pure Scala's functional semantics. A shallow translation must therefore restrict the accepted Rust subset and prove semantic correspondence separately.

evidence and limits
The mapping covers “almost complete” Pure Scala syntax, but arrays are among the unimplemented Leon primitives (Section 5, p. 7). The authors write that “Using a shallow embedding always carries the risk of semantics mismatches” and that, because the translation works through an internal API, “the user has no possibility to convince themselves of the correctness of the implemented routines short of inspecting the source code”; as mitigation, a textual Isar theory of the imported program can be requested (Section 5, pp. 7–8).

## technique 2: dependency ordering and recursive-function normalization

Isabelle theories are monotonic and disallow cyclic dependencies, while Scala permits arbitrary definition order and cyclicity. The importer therefore computes the function dependency graph, finds strongly connected components, collapses them into a directed acyclic graph, and processes components topologically (Section 2.2, p. 4). This is the required first pass before emitting definitions.

Naively translated recursive equations are poor simplifier rules because they can rewrite forever. The importer (the paper's wording: a “verified routine” integrated into Isabelle) splits definitions into cases with Haskell-style top-level pattern matching. The paper says: “This can be avoided by splitting the resulting definition into cases that use Haskell-style top-level pattern matching.” (Section 2.2, p. 4). The verified routine emits terminating equations and gives a “better induction principle” for later proofs (Section 2.2, p. 4).

For recursion, use Isabelle's function package: it lowers recursive equations to a non-recursive definition and proves termination, by default searching for a lexicographic ordering over function arguments (Section 2.3, pp. 4–5). Leon's separate termination pass becomes integrated with Isabelle's kernel-checked construction. Negative recursive datatypes are rejected by Isabelle; this gives a well-formedness check that Leon lacked (Section 2.3, p. 5).

verus form
Inference: this suggests topologically ordering mutually recursive Rust specs before generating proof obligations and using Verus recursive-function termination measures (`decreases`) where supported. The pattern-matching normalization is an external translation step. Verus's `decreases` proof must be explicit; the Isabelle package's automatic lexicographic search is not a Verus construct.

## technique 3: trustworthy reuse of library definitions

A shallow import creates fresh constants, so an imported `List.map` is not automatically the same constant as Isabelle/HOL's `List.map`. The importer first loads the whole Pure Scala program unchanged, then, for each annotated function, proves an equivalence `f' = f` between the imported and library definitions and registers the theorem with Isabelle automation (Section 2.4, p. 5). This preserves reusability without trusting a user annotation that silently substitutes a library function.

The paper describes the design: “We first import the whole program unchanged, creating fresh constants. Later, for each annotated function, we try to prove an equivalence of the form f ′ = f where f ′ is the imported definition and f is the existing Isabelle library function.” (Section 2.4, p. 5). Because this proof step is slow and not every equivalence can be proven automatically, the paper adds a flag that skips the equivalence proofs for Pure Scala library functions and “just asserts the theorems as axioms” (Section 2.4, p. 5). Inference: this weakens the trust guarantee, since the asserted equivalences are no longer checked.

verus form
Inference: a Verus bridge should keep imported Rust definitions distinct from trusted Verus library specs, then prove equivalence lemmas before enabling rewrite use. Marking equivalences as axioms would enlarge the trusted base and should be reported as such. Verus has no generic Isabelle-style theorem registration mechanism; this would be a tool convention.

## technique 4: proof-backend integration and guided induction

Leon treats a backend as a function from assumptions to `sat`, `unsat`, or `unknown`; Isabelle implements that interface but never returns `sat`, because failed Isabelle proofs do not provide a suitable counterexample (Section 3.1, p. 6). Communication uses the authors' libisabelle library, which extends PIDE for non-IDE applications, which adds a remote procedure call layer; calls between the JVM process running Leon and the Isabelle process are typed and asynchronous. The paper says that common error sources such as pretty printing of Isabelle terms or escaping “are completely eliminated” (Section 3.2, p. 6).

Proof annotations embed Isar methods in Scala. In Figure 2, `@proof(method = """(induct "<var xs>", auto)""")` supplies induction for `sumConstant`; `mapFstZip` uses `(clarsimp, induct rule: list_induct2, auto)` for simultaneous induction (Section 4, Figure 2, p. 7). Running Leon with Isabelle shows that all conditions hold; the first one (`sumReverse`) reuses a library lemma and the other two need the annotation. Leon+Z3 cannot prove any of the three; when instructed to perform induction it can prove `sumConstant`, and the same holds for CVC4. Leon has no way to specify the custom induction rule that `mapFstZip` needs (Section 4, p. 7).

verus form
Inference: the analogous design is a Rust annotation or generated proof module that selects named Verus lemmas and induction structure, while Verus's verifier checks the resulting proof. A failed proof should be “unknown” rather than treated as a counterexample unless a separately sound counterexample procedure exists.

## evidence, numbers, and trusted base
Coverage evidence is quantified: Leon's standard library has 177 functions and 289 verification conditions; Isabelle proves 206 of 289, approximately 71% (Section 5, p. 7). The denominator is all 289 conditions in that library, not all Pure Scala programs. Arrays and some primitives are excluded, so the percentage does not measure arbitrary Scala.

Performance is measured on a contemporary dual-core laptop: defining 13 data types takes approximately 30 seconds, adding all functions takes another 70 seconds, while Leon+Z3 takes less than 10 seconds (Section 5, p. 8). The comparison is setup-specific and includes definitions without proofs in the first timing. Isabelle's extra cost comes from constructing and kernel-justifying HOL definitions.

The trusted core is Isabelle's proof kernel and definitional mechanisms; the shallow translator and semantic correspondence remain implementation risks. The authors provide a textual Isar theory containing definitions and lemma statements but no proofs for inspection (Section 5, p. 8). Inference: for VL, the useful lesson is an independently checked proof-certificate path and explicit equivalence lemmas. Inference: the direct product threat is medium: a bridge could catch unsound solver results, but implementing Rust ownership, mutable state, and Verus semantics is substantial. VL should reuse this trust-boundary pattern rather than redo the paper's Scala-specific importer.

## techniques for the catalog
- shallow language embedding — map a verified source-language subset directly to proof-assistant constructs
- dependency and recursion normalization — order strongly connected components and emit terminating case equations
- library equivalence bridge — prove imported definitions equal trusted library constants before reuse
- kernel-backed solver adapter — expose the proof assistant as a verification backend with typed communication
- guided induction annotations — embed explicit induction and simplification methods for hard verification conditions

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "However, when importing Pure Scala programs, all its data types and functions are defined again in a runtime Isabelle theory."): read the whole paper (arXiv 1607.01539v1, 9 pages) and checked every quotation, number (177 functions, 289 conditions, 206 proved, 71%, 13 data types, 30 s, 70 s, under 10 s), section and page reference, and the technique steps against it; changed the name-handling step, the Figure 2 page (p. 7, not p. 6), the Leon+Z3/CVC4 comparison (Z3 proves none of the three, only sumConstant with induction), the "stronger" to "better" induction principle, the process-communication description, the semantic-mismatch warning (now quoted), and marked the axiom-flag trust weakening and the product-threat judgment as Inference; did not check the Verus-form paragraphs beyond confirming they are labeled Inference, the cited external works, or the Leon/Isabelle software itself.
