# Theory-Scale Auto-Formalization of Logics for Computer Science
(authored by agents unless marked 🧑)
Tag: `zhang2026theoryscale`, [paper](https://www.semanticscholar.org/paper/91d8c13af9d7c0bdb4bde12bef4a2eaf5dd95bf0)

## scope and artifact

LCS-Bench turns the Logics for Computer Science textbook into a stand-alone Lean development and derives auto-formalization and theorem-proving tasks from it. The paper’s abstract reports “327 textbook items, over 4,076 Lean declarations, and more than 85K lines of Lean code.” (Abstract, p. 1) It covers definitions, inductive syntax, algorithms, examples, lemmas, theorems, and meta-theory rather than isolated statements. The benchmark contains 1,271 instances across five tracks: item and subsection auto-formalization, auto-formalization with distractors, declaration-level proving, and item-level proving.

The measured headline is deliberately limited. Across 14 models, the best item-level auto-formalization pass rate is 20.1%, achieved by Claude Opus 4.6 in agentic mode; this is a pass fraction on the IAF benchmark, not a theorem-proving success rate over all textbook material (Section 5.2, p. 7). The repository formalizes 341 textbook items, 327 enter the benchmark, and 55% of theorem and lemma items are proved; the remaining formalizations are reviewed by experts (Section 1, p. 2).

## technique 1: concept and formal-signature graphs

What it is. Before writing Lean, the pipeline builds a textbook-self-consistent concept graph and a formal signature graph. Concept nodes are terms or clauses and edges encode relations such as IS-A, HAS-A, RELIES-ON, and DEFINED-BY. The signature graph maps each concept to its Lean kind, constructors, fields, companion definitions, and embedding level. Deep syntax is represented by inductive types; semantic properties use `Prop`; meta-theorems connect the two.

When to use it. Use this for theory-scale work where definitions and lemmas depend on declarations introduced many pages earlier. Planning prevents an agent from choosing a shallow encoding for syntax that later needs induction, or from silently losing a standing assumption.

How it is done. Convert the source into item-level records. Extract concepts and relations into the concept graph. For every concept, plan a Lean declaration and its constructors or fields in the signature graph. Assign deep, shallow, or mixed embedding. Resolve the graph in dependency order before implementation. The paper says: “Before any Lean code is implemented, an agent analyzes the textbook’s mathematical structure and generates a two-layer intermediate representation (IR) blueprint for faithful, self-contained formalization.” (Section 3, p. 4)

Verus form. Inference: use a design document or machine-readable schema mapping each protocol concept to Rust structs, enums, `spec fn`s, and proof functions before coding. Deep syntax should be an enum/struct datatype; semantic validity can be a `spec fn`; soundness connects the two. Verus has no built-in concept graph, so graph consistency and dependency ordering are external checks. Stable item identifiers can be retained as comments or metadata, but they do not affect verification.

Evidence and failure. Figure 3 shows the graph feeding three implementation rounds. Human review was still needed for missing assumptions and vacuous statements; a graph is a planning aid, not a faithfulness proof. A wrong embedding-level decision can make later meta-theorems impossible or encourage an unfaithful shortcut.

## technique 2: dependency-ordered three-round implementation

What it is. The implementation stage respects planned dependencies. Round 1 defines inductive types and structures. Round 2 defines functions, abbreviations, instances, examples, evaluators, normalizers, and semantic predicates. Round 3 writes theorem and lemma statements with `sorry` bodies. Every declaration receives a stable `@[lcsitem]` item tag, while `lcsmain` marks the primary authored declaration.

When to use it. Use this when a large formalization must stay buildable while proofs are unfinished. Separating declarations from proofs lets the team detect type and dependency errors before spending effort on proof search.

How it is done. First implement syntax and data structures. Then implement computational and semantic definitions. Then state all theorems with placeholders. After each round run `lake build`; a review script compares declarations against the signature graph and detects vacuous statements, missing cases, identity stubs, and dead tags. The paper states that “The goal is theory-scale coherence: all statements type-check, all dependencies compile, and the overall structure faithfully mirrors the textbook.” (Section 3, p. 4)

Verus form. Inference: mirror this with Rust modules ordered from datatypes, to executable/spec definitions, to proof functions. Compile after each layer with Verus. Temporary placeholders must be removed before claiming verification; Verus’s trusted boundary differs from Lean’s `sorry`, so a final artifact must contain no unproved `assume` or unreviewed `external_body` in the property being verified.

Evidence. The resulting artifact has 4,076 declarations and 85K lines, including 28K proof lines (Section 1, p. 2). This demonstrates scale and buildability, not that every theorem has a machine-checked proof.

## technique 3: sorry filling with counterexample search and issue triage

What it is. The review stage fills theorem placeholders, checks formal correctness and faithfulness, and searches for counterexamples when proof search stalls. Issues are tracked and triaged; a claimed resolution receives a three-way review against the textbook, signature graph, and implementation history. Human experts repair source definitions and propagate changes through dependent declarations.

When to use it. Use this when a failed proof may indicate either a difficult theorem or a wrong statement. Counterexample search distinguishes false foundations from merely incomplete automation, while issue tracking prevents local workarounds from hiding upstream errors.

How it is done. Attempt to prove each statement. If it stalls, attempt the negation or run a counterexample search. Inspect dependencies and classify the issue as missing assumptions, vacuity/signature drift, or an accumulated workaround on a false foundation. Rewrite the earliest incorrect declaration, then re-implement and re-prove downstream declarations. The paper warns: “A common failure is signature drift toward an overly loose statement, admitting unintended witnesses and making downstream lemmas trivially provable but unfaithful.” (Section 3, p. 5)

Verus form. Inference: pair each `ensures` claim with adversarial Rust models or executable counterexample tests, then use Verus to prove the corrected specification. Keep an issue record linking the source requirement, type signature, and dependent lemmas. If a specification is too weak, a proof may succeed vacuously; do not treat successful verification as evidence of faithfulness without reviewing the statement. Use explicit `requires` for standing assumptions and preserve them through helper lemmas.

Evidence. The project reports six person-months of expert work, 190K feedback tokens, more than 600 tracked issues, and direct rewrites of roughly 30% of major definitions, assumptions, and core theorems (Section 3, p. 5). These numbers describe construction effort and human trust, not model accuracy. The paper identifies a concrete missing eigenvariable side condition that caused repeated downstream failures until a human repaired the foundation (Figure 4, p. 5).

## technique 4: definitional-equivalence evaluation

What it is. For auto-formalization, each instance supplies textbook text, dependent Lean context, and a declaration skeleton. A model emits `Submission.lean`. The DefEq Checker tests definitional equivalence between the expected and submitted declaration, supporting definitions, theorems, inductives, and constructors rather than only logical equivalence. Distractor declarations form the IAF-D track.

When to use it. Use definitional equivalence when a benchmark must reject statements that are logically related but encode a different data type, constructor order, or computational behavior. Use theorem compilation separately for proof correctness.

How it is done. Build a context containing only required dependencies; strip theorem proofs for auto-formalization; provide the skeleton; compile the submission; check expected declarations, absence of `sorry`, absence of new axioms, and definitional equivalence. For theorem-proving tracks, replace bodies with `sorry` and require all placeholders to be filled. The paper states: “No existing metric handles the heterogeneous declaration kinds present in our dataset (constants, definitions, theorems, inductives, and constructors).” (Section 4, p. 6)

Verus form.

Evidence. The dataset has 327 IAF points, 116 SSAF points, 327 IAF-D points, 420 DTP points, and 81 ITP points (Tables 1–2, p. 6). The IAF track covers 86% of textbook items in chapters 3–10 (Section 4, p. 6). Evaluation gives the 20.1% best IAF pass rate after three repeats per item; up to 20 agent turns are allowed for IAF, 64 for SSAF, and 20 for DTP/ITP (Section 5.1, p. 7). These denominators and budgets define the claim.

## techniques for the catalog

- concept/signature graph planning — map source concepts and dependencies to Lean declarations and embedding levels before implementation
- dependency-ordered implementation — build datatypes, definitions, then theorem statements with compilation and structural review after each round
- counterexample-guided faithfulness review — distinguish hard proofs from false or vacuous specifications and repair the earliest bad declaration
- definitional-equivalence checking — evaluate heterogeneous auto-formalized declarations by structure and computation as well as theorem compilation
