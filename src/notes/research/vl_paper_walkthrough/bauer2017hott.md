# The HoTT Library: A formalization of homotopy type theory in Coq
(authored by agents unless marked 🧑)
Tag: `bauer2017hott`, [paper](https://doi.org/10.1145/3018610.3018615)

The HoTT Library is a large Coq development of univalent foundations: basic homotopy type theory, univalence, higher inductive types, synthetic homotopy theory, category theory, and modalities. The paper is primarily a library-engineering and foundational-methods report, rather than a verification of an executable system. Inference: it is useful to VL because it shows how a proof corpus can control universes, axioms, abstraction boundaries, automation, and review at scale.

## technique 1: explicit axiom and universe discipline

What it is. The library uses Coq's cumulative, universe-polymorphic type theory and records which theorems require axioms such as function extensionality. The paper says, “Any theorem that uses function extensionality must then state this fact explicitly with a ‘{Funext} assumption.” (Section 3.2, p. 5)

When to use it. Use explicit assumptions when a development combines foundational axioms, multiple universes, and reusable modules. It prevents a theorem from silently depending on stronger principles than its interface advertises.

How to do it. Define a dummy class for each optional axiom (the paper shows `Funext`), make the axiom quantify over an instance, and add that instance as an implicit theorem parameter. Let Coq infer universe levels where possible, but inspect constraints with `Set Printing Universes` and `Show Universes`; add annotations only when inference creates inconsistency or unusable constraints. The library chooses half-adjoint equivalences as its canonical equivalence record and proves other definitions equivalent to it (Section 2, pp. 2–3).

Verus form. Inference: model optional assumptions as ghost predicates or explicit trait/specification parameters; require them in `requires` clauses or lemma parameters. Verus has a fixed SMT-oriented sort discipline rather than Coq's universe hierarchy, so universe polymorphism itself does not carry over.

Evidence and limits. The paper reports 16,800 lines of specifications, 13,000 lines of proofs, and 4,500 lines of comments (Introduction, p. 1). The paper states that Coq’s typechecker kernel is the final consistency checker, while univalence, function extensionality, universes, and private-inductive implementation remain trust concerns (Section 2, p. 2). The authors note that universe heuristics can create undesirable constraints and that manual universe management is difficult (Section 3.1, p. 4).

## technique 2: type classes and record/Σ transfer

What it is. Type classes automatically infer structures such as equivalences, truncation levels, and pointed types, with the authors identifying mere propositions as safe cases for instance search because all instances are equal (Section 3.2, p. 4). The library's `issig` tactic transfers general theorems about iterated dependent sums (Σ-types) to record types. The paper reports: “we implemented a tactic issig that allows us to automatically transfer general facts about iterated Σ-types to record types.” (Section 3.2, p. 4)

How to do it. Define mathematical structures as records with fields and class instances; keep class search for propositions whose instances are equal; avoid rules that trigger unbounded searches (the paper gives inverse-of-inverse as an example). For a new record, invoke `issig` to derive equivalences with a Σ encoding and reuse generic lemmas. Use pointed-type classes (`IsPointed`, `pType`, `pMap`, `pHomotopy`) so base points and paths are inferred (Section 2, p. 3).

Verus form. Inference: use traits and associated spec functions for reusable algebraic structure, but make proof-relevant data explicit because trait resolution does not prove semantic uniqueness. Encode the Σ/record correspondence as a `proof fn` lemma with `ensures`; do not assume automatic type-class search establishes the theorem.

Evidence and limits. The authors warn that instance search can be unpredictable and identify mere propositions as safe cases (Section 3.2, p. 4); they also use classes for pointed types (Section 2, p. 3). The tactic reduces duplicated proof work but is tied to Coq's dependent records and equality behavior.

## technique 3: transparency-aware proof terms and rewrite automation

What it is. In homotopy type theory, equality is proof-relevant, so the library keeps many definitions transparent and maintains explicit coherent proof terms. It builds rewrite databases for path lemmas and custom tactics (`transparent assert`, stronger `apply`). The paper states: “Since equality in homotopy type theory is proof-relevant, our lemmas are more often transparent than in most Coq developments.” (Section 3.3, p. 5)

How to do it. Prefer definitions whose computation remains visible when later proofs need their exact paths; write coherent composites explicitly where automated rewriting could hide required data. Register path lemmas in a rewrite database; simplify with standard J-elimination; use `transparent assert` when an intermediate proof must remain available; use the custom unifier for dependent applications. Keep opaque definitions only where abstraction or compilation benefit outweighs proof-term access (Section 3.3–3.4, pp. 5–6).

Verus form. Inference: use `spec fn` definitions for logical computations and expose their bodies to proofs when unfolding is needed; use `broadcast` or explicit lemmas for repeated rewrites. Verus's SMT solver does not expose Coq-style proof-term transparency, so proof scripts must state the needed algebraic lemmas.

Evidence and limits. The paper gives the explicit Eckmann–Hilton path composite as an example and reports that primitive record projections halved whole-library compilation time (Section 3.2–3.3, p. 5). Automation can obscure dependencies; generalized rewriting was future work at the time.

## technique 4: higher inductive types through private inductives

What it is. Coq lacked native higher inductive types (HITs), so the library uses Licata's trick with private inductive types. Inside a module, constructors and induction are available; outside, only exported functions compute on constructors. The paper explains: “Private inductive types are defined inside a module, within which they behave as usual. Outside the module their induction principles and pattern matching are no longer available.” (Section 4, p. 6)

How to do it. (1) Declare a private inductive with point constructors, such as `zero` and `one` for an interval. (2) Add path constructors as axioms inside the module. (3) Define the induction/recursion principle inside the module, arranging the match to depend on the path argument so Coq does not identify incompatible principles. (4) Export the recursor and beta lemma, but not the raw induction principle. (5) Repeat for circles, suspensions, truncations, quotients, and pushouts. The interval implementation and its `interval_ind_beta_seg` are in Figure 1 (Section 4, p. 6).

Verus form. Inference: represent a HIT's point constructors with a Rust enum and path laws as ghost axioms/lemmas; expose only recursors and beta properties. This is an abstraction pattern, not a direct Verus encoding of univalence or higher paths.

Evidence and limits. The library formalizes the interval, circle, suspensions, truncations, set quotients, homotopy colimits, and synthetic results such as the circle's fundamental group (Section 4, p. 6). The construction depends on private-inductive implementation safety and axiomatized path constructors; the paper notes universe-level anomalies and unsupported inductive-inductive types.

## technique 5: modalities as universe-polymorphic modules

What it is. A modality has a universal property quantified over every universe level. A record with one shared universe cannot express this, so the library encodes modalities as Coq modules whose fields each receive their own universe quantification. The paper says, “The library formalizes a modality as a module type so that it can have the correct universal property.” (Section 5, p. 7)

How to do it. Define a module type with the modality operator and universal property; use an extra `Modality : Type` field/display-map trick for families such as n-truncations; instantiate general modality theorems to truncations. Accept the software-engineering cost of module wrappers and explicit universe constraints. Keep the public interface abstract while the module implementation remains controlled (Section 5, p. 7).

Verus form. Inference: represent a modality as a trait/specification interface parameterized by a type and prove its universal property as explicit lemmas. Quantification over all type universes has no direct Verus analogue; restrict the interface to the concrete sorts needed by the Rust development.

Evidence and limits. General modality proofs are reused for truncations (Section 5). The approach complicates families and module arguments, and the paper says users rarely see the universe issues only because the module hides them.

## technique 6: repository engineering for large proofs

What it is. The library uses two-reviewer acceptance, a style guide, generated documentation, continuous integration, and reproducible packaging. The paper states: “We have a strict ‘two pairs of eyes’ policy according to which a code change may be accepted only after it has been reviewed by two other developers.” (Section 7, p. 8)

How to do it. Put definitions and proofs under version control; require two independent reviews; generate Coqdoc/Proviola browsable code; run Travis on every change; monitor compile time and bisect regressions; distribute installation scripts and OPAM packages. Keep the standard library replacement and custom Coq build explicit so users can reproduce the environment (Section 7, p. 8).

Verus form. Inference: apply the same review, CI, reproducible-toolchain, and generated-documentation controls to Verus crates. These controls reduce process risk but do not prove program properties.

Evidence and limits. The library compiles with standard Coq 8.5.1 and later after upstream changes (Section 6, p. 7). Inference: it remains dependent on Coq kernel behavior, axioms, and a customized foundational library; the paper is not an empirical safety evaluation of deployed software.

## what is proved, measured, and trusted

The paper reports formalization of a broad body of homotopy-type-theoretic and synthetic mathematics with explicit interfaces and reusable abstractions. Reported measurements: 16,800 specification lines, 13,000 proof lines, 4,500 comment lines, compilation improvements, and successful reuse by independent developments. Inference: the trusted components include Coq's kernel and module/private-inductive implementation, theorem statements, univalence/function-extensionality axioms, universe consistency, and external mathematical assumptions. No executable network or systems implementation is verified.

Inference: The threat to agent-written verified Rust is organizational and foundational rather than direct memory corruption: hidden axioms, unstable toolchains, opaque proof dependencies, and unreviewed automation can undermine confidence even when individual lemmas verify. VL should borrow explicit assumption tracking, layered interfaces, reproducible CI, and two-person review. It should not redo this library's homotopy mathematics unless a product feature requires it.

## techniques for the catalog

- explicit axiom/universe interfaces: make every non-core axiom and universe constraint visible in theorem parameters
- proof-relevant type-class reuse: use classes only for proposition-like structures and transfer generic Σ proofs to records
- transparency-aware automation: preserve coherent proof terms while applying controlled rewrite databases and tactics
- private-inductive higher types: implement higher inductive behavior behind private constructors, recursors, and beta laws
- module-encoded modalities: use universe-polymorphic module fields for universal properties quantified over all levels
- proof-library engineering: enforce review, CI, generated documentation, and reproducible packaging for large formal developments
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "When we adapted the library to use primitive projections, the compilation time for the entire library dropped by a factor of two."): checked the whole paper text, quotations, sections, pages, numerical claims, techniques, authors/year and tag; corrected issig quotation/page, scope of type-class safety advice, trust wording and inference labels; link from the fetch record (study_queue.json); did not inspect the Coq repository or cited works.
