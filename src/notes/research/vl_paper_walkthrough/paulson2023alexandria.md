# Large-Scale Formal Proof for the Working Mathematician — Lessons learnt from the ALEXANDRIA Project
(authored by agents unless marked 🧑)
Tag: `paulson2023alexandria`, [paper](https://arxiv.org/abs/2305.14407)

## scope and results

This paper reports six years of the ALEXANDRIA project formalising advanced mathematics in Isabelle/HOL. Its abstract says: “Six years of intensive formalisation activity seem to show that even the most advanced results, drawing on multiple fields of mathematics, can be formalised using the tools available today.” The projects cover analysis, number theory, combinatorics, graph theory, probability, set theory, and algebraic geometry. Examples include Szemerédi’s regularity lemma and Roth’s theorem, ordinal partition theory, Grothendieck schemes, additive combinatorics, Fisher’s inequality, and chapters of Apostol’s number theory.

The paper is a lessons report rather than a controlled benchmark. One formalization of Szemerédi’s lemma and Roth’s theorem took under six months (§5.1, pp. 4–5), while additive-combinatorics results were formalized over seven months from April to November 2022 (§5.2, p. 5). The Isabelle Archive of Formal Proofs (AFP) is described as having “nearly 4 million lines of proof text and well over 700 separate entries” (§6, p. 7). The author reports completing every project attempted, but identifies errors and omissions in source mathematics and the continuing human effort required as the central obstacles (§7, pp. 8–9).

## technique 1: staged formalization with domain experts

What it is. ALEXANDRIA hired professional mathematicians who were initially inexperienced with Isabelle/HOL, then assigned increasingly advanced exercises and used their difficulties to improve methods, libraries, and tooling (§3, p. 3). The warmup phase included irrational series, projective geometry, quantum computing, quaternions, polynomial-root counting, and algebraically closed fields.

How to apply it. Inference: the steps below are my distillation of the narrative in §§3–5, not a procedure the paper states. (1) Start with small exercises that expose notation and library gaps. (2) Progress to deep results proposed by team members (§4–§5, p. 4). (3) Collaborate in small groups and contribute to one another’s tasks (§4, p. 4; §5, p. 4). (4) Record errors in source papers and infelicities in definitions while formalizing. (5) Consolidate reusable results in a shared library; the paper reports reorganising and consolidating the Isabelle/HOL analysis library as a first-year task (§3, p. 3). The project found, for example, confusion between ⊂ and ⊆ and one flatly incorrect minor claim while formalizing Szemerédi’s lemma (§5.1, p. 5).

Verus form. Inference: a Verus team should pair systems engineers with domain owners, begin with small verified Rust components, and use failures to improve shared specifications and lemma libraries. The transferable practice is staged complexity and collaborative review; Isabelle’s locale and Isar syntax do not carry over directly.

Evidence and limits. The six-year project completed a broad set of formalizations, but elapsed time and staffing are reported narratively, without a common denominator or counterfactual. The method assumes experts can invest in formalization and that a mature library exists or can be built.

## technique 2: abstraction and locale-based library design

What it is. The project manages deep hierarchies through Isabelle locales and explicit carrier sets. For Grothendieck schemes, the paper reports that formalization “was straightforward, following a new approach based on locales to manage the deep hierarchies of definitions” (§4, p. 4). For abstract groups, rings, and topological spaces, Isabelle/HOL type classes were used to inherit laws for concrete structures, while abstract theories were declared with explicit carrier sets (§7, p. 9).

Steps. Inference: the paper names locales, type classes and carrier sets but gives no step list; this recipe is my reading. (1) Separate an abstract theory’s carrier, operations, and laws from concrete instances. (2) Package assumptions in locales so theorems can be reused under a hierarchy. (3) Instantiate the locale for each structure. (4) Register derived laws in the library so later developments inherit them. (5) Avoid relying on type-class mechanisms where they cannot express the abstract theory cleanly.

Verus form. Inference: model reusable Rust abstractions with traits and ghost/spec predicates, keep carrier and closure assumptions explicit, and prove generic lemmas once before instantiating concrete types. Verus traits and `requires`/`ensures` contracts replace locales only approximately; mathematical type-class inference should not be assumed to supply missing invariants.

Limits. The paper says that in simple type theory “axiomatic type classes are less powerful than they otherwise would be” and are “not useful for defining the theories of groups, rings or topological spaces,” while they let one define the quaternions, prove laws and inherit entire libraries (§7, p. 9). On dependent types, the author says Lean users “repeatedly fall foul of intensional equality: that i = j does not guarantee that T (i) is the same type as T (j)” (§7, p. 9), and that “the first definition of schemes had to be discarded for this reason.”

## technique 3: legible structured proofs

What it is. ALEXANDRIA deliberately writes human-readable Isabelle/Isar proofs so mathematicians can inspect the reasoning rather than trust an opaque kernel result. The paper states: “Since we can see these details of the reasoning, we have reasons to believe that the proof is indeed correct: we do not simply have to trust the computer” (§5.4, p. 7). Structured `have`, `also`, `finally`, and `show` steps expose intermediate equalities and transformations.

Steps. These describe the paper’s worked Isar example (deriv_sum_int, pp. 6–7). (1) State a named lemma with explicit patterns for recurring expressions. (2) Introduce an intermediate derivative or algebraic fact with `have`. (3) Chain equalities using `also` and justify each with simplification or a named theorem. (4) Close the intermediate fact and use it to prove the main statement. (5) Use tactic style only where expansion or program verification makes structured prose impractical (§5.4, pp. 6–7).

Verus form. Inference: expose meaningful intermediate lemmas and invariants in `proof fn`s, with each lemma carrying a precise `ensures`. Verus proof functions are erased and cannot run at runtime; executable functions must remain separate. The paper’s readability goal transfers, while Isar commands and syntax do not.

Limits. The author notes that page-long formulas and code-verification obligations sometimes force traditional tactic sequences (§5.4, p. 7). Legibility therefore competes with expansion and automation; no readability metric is reported.

## technique 4: concept-oriented library search

What it is. SErAPIS searches pre-installed Isabelle libraries and AFP using keywords, abstract mathematical concepts, and combinations of query types. The paper motivates it with the question of how to take advantage of the AFP’s nearly 4 million lines of proof text when developing new proofs (§6, pp. 7–8).

Steps. Inference: the paper describes SErAPIS only at the level above, so this recipe is my reconstruction. (1) Index the local proof libraries. (2) Accept queries ranging from exact terms to conceptual descriptions. (3) Combine query types to narrow relevance. (4) Inspect candidate definitions and lemmas before writing a new proof. The paper cautions that relevance to an abstract concept is difficult to determine, so multiple query forms are useful.

Verus form. Inference: index Verus specifications, lemma names, contracts, and doc comments; support exact and concept searches; show candidate dependencies and examples before an agent writes a new lemma. Search results are suggestions and must be checked by Verus.

Evidence and limits. The paper reports the search engine’s existence and strategies, but no precision/recall or time-saving denominator. 

## technique 5: machine-learning assistance checked by the prover

What it is. Language models generate Isabelle proof skeletons and identify relevant lemmas from existing corpora. The paper observes: “And as the texts we want would be inserted into Isabelle proofs, we can immediately check their correctness” (§6, p. 8). It also proposes an Isabelle Parallel Corpus pairing natural-language and Isabelle texts for autoformalization.

Steps. Inference: the paper reports that language models can generate proof skeletons [31] and identify relevant lemmas [21] but does not describe a loop; this recipe is mine. (1) Retrieve relevant library material. (2) Prompt a model to propose a proof skeleton or lemma references. (3) Insert the proposal into Isabelle. (4) Run the prover and retain only code that checks. (5) Ask a human to repair failed obligations and improve structure. This is an assistance loop, not a claim that generated text is correct by itself.

Verus form. Inference: let agents propose Rust/Verus skeletons, contracts, and lemma calls; run `verus` after each candidate; feed diagnostics into the next proposal; and accept only a verified build. Keep model output, compiler diagnostics, and human intent separate so a syntactically accepted but semantically wrong specification is still reviewed.

Evidence and limits. The paper gives no success rate for generated skeletons. It reports that source mathematics often contains almost-right proofs and that formalization exposes those errors (§7, p. 8). The checker and the specification remain trusted; generated suggestions are not evidence until checked.

## what is proved, trusted, and threatening to VeruLaw

The paper’s formal developments are checked by Isabelle/HOL, but the report does not provide machine-checked certificates for its project-management claims or a full audit of every source theorem. Trusted components include Isabelle’s kernel, imported AFP theories, axiomatized foundations, definitions chosen by authors, and the human interpretation of informal mathematics. The paper explicitly reports a false claim and definition confusions found during formalization, demonstrating that source prose is not automatically trustworthy.

Inference: VeruLaw should prioritize reusable specification libraries, structured proof explanations, concept search, and a prover-checked generation loop. A mature library and domain-expert review reduce duplicated work; VL should not redo ALEXANDRIA’s generic library/search lessons. The product threat from agent-written verified Rust is high at the specification boundary and moderate at the proof boundary: Verus can reject an invalid proof, but it cannot detect that the verified contract encodes the wrong requirement. The paper says “Obvious claims are often tiresome to prove” and that “much more library material is needed” (§7, pp. 8–9); Inference: obvious claims and library gaps are a large share of the labor, though the paper gives no breakdown. The paper does not measure Rust, Verus, adversarial agents, or deployment safety, so those threat estimates are inferences rather than reported results.

## techniques for the catalog

- staged expert formalization — progress from warmup exercises to deep results while recording library and source errors
- locale and carrier abstraction — organize reusable theories with explicit carriers and hierarchical contexts
- legible structured proofs — expose intermediate reasoning so humans can inspect checked arguments
- concept-oriented search — combine keyword and abstract-concept queries over a large proof library
- prover-checked ML assistance — generate proof skeletons or lemma suggestions and retain them only after checker validation
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "Intensional equality is adopted by almost all dependent type theories, including Coq and Agda: without it, type checking becomes undecidable."): read the whole paper (arXiv 2305.14407v2, 10 pages plus references) and the whole study; checked every quotation word for word, section and page references (§4 p. 4, §5.1 p. 5, §5.2 p. 5, §5.4 pp. 6-7, §6 pp. 7-8, §7 pp. 8-9, §8 p. 10), the 4 million lines and 700 entries figures, the six-month and seven-month durations, and the warmup project list. Changed: the paper link (the DOI given was that of reference 1, Bordg and Doña Mateo, not this paper; replaced with the arXiv link from the paper text); one quotation that dropped the word "And"; the discarded-schemes statement, which the paper attributes to Lean users; the type-class limits, now quoted; the claim that obvious claims dominate labor, now an inference; an unsupported sentence on library navigation, deleted; and the step lists of techniques 1, 2, 4 and 5 and the Isar steps of technique 3, now marked as my reconstruction rather than the paper's procedure. Not checked: the cited works (references 1-40), the Verus mappings (all marked Inference), and the PDF figures or layout beyond the text extraction.
