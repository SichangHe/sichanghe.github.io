# The HoTT Library: A formalization of homotopy type theory in Coq
(authored by agents unless marked 🧑)
Tag: `bauer2017hott`, [paper](https://arxiv.org/abs/1610.04591)

The HoTT Library is a large Coq development of univalent foundations: basic homotopy type theory, univalence, higher inductive types, synthetic homotopy theory, category theory, and modalities.

## technique 1: explicit axiom and universe discipline

What it is. The library uses Coq's cumulative, universe-polymorphic type theory and records which theorems require axioms such as function extensionality. The paper says, “Any theorem that uses function extensionality must then state this fact explicitly with a ‘{Funext} assumption.” (Section 3.2, p. 5)

When to use it. Inference: use explicit assumptions when a development combines foundational axioms, multiple universes, and reusable modules. It prevents a theorem from silently depending on stronger principles than its interface advertises.

How to do it. Track univalence and function extensionality through dummy classes (the paper shows `Funext`), make the axiom quantify over an instance, and add that instance as an implicit theorem parameter. Let Coq infer universe levels where possible, but inspect constraints with `Set Printing Universes` and `Show Universes`; add annotations only when inference creates inconsistency or unusable constraints. The library chooses half-adjoint equivalences as its canonical equivalence record and proves other definitions equivalent to it (Section 2, pp. 2–3).

Verus form. Inference: model optional assumptions as ghost predicates or explicit trait/specification parameters; require them in `requires` clauses or lemma parameters. The paper supplies no Verus encoding of universe polymorphism.

Evidence and limits. The paper reports 16,800 lines of specifications, 13,000 lines of proofs, and 4,500 lines of comments (Introduction, p. 1). The paper identifies the remaining consistency questions as axioms, universe-polymorphic modules, and private-inductive implementation, assuming trust in Coq's kernel (Section 1, p. 2). The authors note that universe heuristics can create undesirable constraints (Section 3.1, p. 4) and advise against manual universe management (Section 5, p. 7).

## technique 2: type classes and record/Σ transfer

What it is. Type classes automatically infer structures such as equivalences, truncation levels, and pointed types, with the authors identifying mere propositions as safe cases for instance search because all instances are equal (Section 3.2, p. 4). The library's `issig` tactic transfers general theorems about iterated dependent sums (Σ-types) to record types. The paper reports: “we implemented a tactic issig that allows us to automatically transfer general facts about iterated Σ-types to record types.” (Section 3.2, p. 4)

How to do it. Express structures as records and use proposition-valued class search where all instances are equal; avoid rules that trigger unbounded searches (the paper gives inverse-of-inverse as an example). Use `issig` to prove equivalences between records and iterated Σ-types, then transfer general facts. For pointed types, `IsPointed` is a class that supplies a base point; `pType`, `pMap`, and `pHomotopy` are records. The latter two arrange path endpoints so a tactic can apply Paulin-Mohring path induction (Section 2, p. 3).

Verus form. Inference: use traits and associated spec functions for reusable algebraic structure, but make proof-relevant data explicit because trait resolution does not prove semantic uniqueness. Encode the Σ/record correspondence as a `proof fn` lemma with `ensures`; do not assume automatic type-class search establishes the theorem.

Evidence and limits. The authors warn that instance search can be unpredictable and identify mere propositions as safe cases (Section 3.2, p. 4); they also use classes for pointed types (Section 2, p. 3). The tactic reduces duplicated proof work but is tied to Coq's dependent records and equality behavior.

## technique 3: transparency-aware proof terms and rewrite automation

What it is. In homotopy type theory, equality is proof-relevant, so the library keeps many definitions transparent and maintains explicit coherent proof terms. It builds rewrite databases for path lemmas and custom tactics (`transparent assert`, stronger `apply`). The paper states: “Since equality in homotopy type theory is proof-relevant, our lemmas are more often transparent than in most Coq developments.” (Section 3.3, p. 5)

How to do it. Prefer definitions whose computation remains visible when later proofs need their exact paths; write coherent composites explicitly where automated rewriting could hide required data. Register path lemmas in a rewrite database; simplify with standard J-elimination; use `transparent assert` when an intermediate proof must remain available; use the custom unifier for dependent applications. These tactics and the explicit Eckmann–Hilton proof illustrate the approach (Sections 3.3–3.4, p. 5).

Verus form. Inference: use `spec fn` definitions for logical computations and expose their bodies to proofs when unfolding is needed; use `broadcast` or explicit lemmas for repeated rewrites. Verus's SMT solver does not expose Coq-style proof-term transparency, so proof scripts must state the needed algebraic lemmas.

Evidence and limits. The paper gives the explicit Eckmann–Hilton path composite as an example and reports that primitive record projections halved whole-library compilation time (Section 3.2–3.3, p. 5). The authors describe generalized rewriting as a possible improvement to their current J-elimination rewriting (Section 3.4, p. 5).

## technique 4: higher inductive types through private inductives

What it is. Coq lacked native higher inductive types (HITs), so the library uses Licata's trick with private inductive types. Inside a module, induction and pattern matching are available; outside, these are hidden while functions defined inside still compute on constructors. The paper explains: “Outside the module their induction principles and pattern matching are no longer available; but functions that were defined inside the module using those principles can still be called, and importantly still compute on constructors.” (Section 4, p. 6)

How to do it. (1) Declare a private inductive with point constructors inside a module, such as `zero` and `one` for an interval. (2) Add a path axiom `seg : zero = one`. (3) Define `interval_ind` inside the module; apply its match to the path hypothesis, even though the branches ignore that argument, so Coq does not identify principles with different path hypotheses. (4) Add `interval_ind_beta_seg` as an axiom for computation on the path constructor. (5) Close the module, hiding unrestricted induction and pattern matching, and define `interval_rec` using the restricted `interval_ind`. Its computation on point constructors is definitional. Figure 1 gives this construction (Section 4, p. 6).

Verus form. Inference: borrow the restricted-interface pattern for ghost structures and expose only justified operations and laws. A Rust enum does not supply this HIT construction: unrestricted case analysis can contradict the path axioms, as the paper warns for the interval inside its module (Section 4, p. 6).

Evidence and limits. The library formalizes the interval, circle, suspensions, truncations, set quotients, homotopy colimits, and synthetic results such as the circle's fundamental group (Section 4, p. 6). The construction requires checking the code inside each private-inductive module for consistency. The paper notes universe levels that can be too low and that Coq 8.5 lacks native inductive-inductive types; private inductives simulate surreals, while Cauchy reals and the partiality monad use experimental support elsewhere (Section 4, p. 6).

## technique 5: modalities as universe-polymorphic modules

What it is. A modality has a universal property quantified over every universe level. A record with one shared universe cannot express this, so the library encodes modalities as Coq modules whose fields each receive their own universe quantification. The paper says, “The library formalizes a modality as a module type so that it can have the correct universal property.” (Section 5, p. 7)

How to do it. Define a module type with the modality operator and universal property; use an extra `Modality : Type` field/display-map trick for families such as n-truncations; instantiate general modality theorems to truncations. Passing arguments requires module wrappers, and module matching requires explicit control of universe parameters and constraints (Section 5, p. 7).

Verus form. Inference: represent a modality as a trait/specification interface parameterized by a type and prove its universal property as explicit lemmas. Quantification over all type universes has no direct Verus analogue; restrict the interface to the concrete sorts needed by the Rust development.

Evidence and limits. General modality proofs are reused for truncations (Section 5). The approach complicates families and module arguments, while the authors report that users rarely need to worry about universe issues; they do not establish a sole cause for that usability (Section 5, p. 7).

## technique 6: repository engineering for large proofs

What it is. The library uses two-reviewer acceptance, a style guide, generated documentation, continuous integration, installation scripts and OPAM packaging. The paper requires that “a code change may be accepted only after it has been reviewed by two other developers.” (Section 7, p. 8)

How to do it. Use GitHub for version control and discussion; require review by two other developers; maintain a style guide and wiki; generate browsable, replayable code with Coqdoc and Proviola; use Travis to check proposed changes compile and track compilation time; use tools to identify performance degradation; distribute installation scripts and an OPAM package (Section 7, p. 8).

Verus form. Inference: apply the same review, CI, reproducible-toolchain, and generated-documentation controls to Verus crates. These controls reduce process risk but do not prove program properties.

Evidence and limits. The library compiles with standard Coq 8.5.1 and later after upstream changes (Section 6, p. 7). Inference: it remains dependent on Coq kernel behavior, axioms, and a customized foundational library; the paper is not an empirical safety evaluation of deployed software.

## what is proved, measured, and trusted

The paper reports formalization of a broad body of homotopy-type-theoretic and synthetic mathematics with explicit interfaces and reusable abstractions. Reported measurements: 16,800 specification lines, 13,000 proof lines, 4,500 comment lines, compilation improvements, and successful reuse by independent developments. Inference: the trusted components include Coq's kernel and module/private-inductive implementation, theorem statements, univalence/function-extensionality axioms, universe consistency, and external mathematical assumptions. Inference: this report provides no verification of an executable network or systems implementation.

## techniques for the catalog

- explicit axiom/universe interfaces: track univalence and function extensionality in theorem parameters; inspect and annotate universe constraints when needed
- type-class and record reuse: prefer proposition-valued instance search, treat pointed data separately, and transfer generic Σ proofs to records
- transparency-aware automation: preserve coherent proof terms while applying controlled rewrite databases and tactics
- private-inductive higher types: hide unrestricted induction and pattern matching; expose restricted induction with point computation and axiomatized path computation
- module-encoded modalities: use universe-polymorphic module fields for universal properties quantified over all levels
- proof-library engineering: enforce review and CI; provide generated documentation, installation scripts, and OPAM packaging
