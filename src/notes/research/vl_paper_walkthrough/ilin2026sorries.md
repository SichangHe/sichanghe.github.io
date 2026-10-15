# Sorries Are Not the Hard Part: An Expert-Review Case Study of a Semi-Autonomous Formalization
(authored by agents unless marked 🧑)
Tag: `ilin2026sorries`, [paper](http://arxiv.org/abs/2606.13925v1)

## scope and central result
This paper evaluates a Lean formalization of Grothendieck's vanishing theorem after proof completion and after expert review. Its central claim is that kernel acceptance is necessary but does not measure whether a formal library is reusable. “The initial version compiles with no sorries, but an expert review found serious problems in definitions, theorem generality, file organization, and the API.” (Abstract, p. 1.) The project formalizes a theorem about a Noetherian topological space, sheaf cohomology, and topological Krull dimension; the proof depends on presheaves, sheaves, stalks, exact sequences, filtered colimits, and derived-category cohomology (Section 1, p. 2).

The study compares State A, the first sorry-free version, with State B after an expert's checklist, automated refactoring, compression, and mathlib-style cleanup. State A was produced during nine active days (March 27–April 4); review lasted one week; response/refactoring about two weeks; compression/polish April 27–May 1 (Table 1, p. 4). The paper reports 5,000 lines of code and 19,393 tool calls (Figures 3–4, pp. 5–6), but does not claim these are universal costs.

## technique 1: separate proof completion from library-quality review

What it is. Treat a completed proof as the start of review, not the terminal condition. The review inspects definitions, theorem statement generality, namespaces, file organization, and public APIs as artifacts that future users must compose. “Formal libraries as shared interfaces” (Section 2, p. 2) is the paper's framing: definitions must combine and APIs must support reasoning without unfolding implementations.

When to use it. Use this technique whenever an agent is contributing to a reusable verification library, not merely answering an isolated benchmark theorem. It applies directly to VL because verified Rust APIs are product interfaces: a proof can pass while a future agent cannot safely reuse the definitions.

How to apply it. (1) Run the formalization loop until the project builds without `sorry` or forbidden axioms. (2) Freeze that artifact as State A. (3) Have an expert inspect the source as library code, not just the target theorem. (4) Convert comments into a checklist covering definitions, theorem surfaces, proof style, namespaces, file structure, and API composition. (5) Ask the agent to implement explicit local checklist items. (6) Run a second expert review of State B and record which issues remain global design judgments. The paper's conclusion recommends: “after the proof checks, ask an expert to review the public definitions, theorem statements, namespaces, and API surface, then measure how well the system responds.” (Conclusion, p. 8.)

Verus form. Inference: after `verus` proves a Rust crate, review public structs, traits, contracts, `spec fn`s, and proof APIs for generality and composability. Freeze executable behavior while allowing proof-only refactors; require a second review before calling the crate reusable. Verus proves contracts, not API quality.

Evidence. State A was sorry-free, yet Table 2 records confusing file names, unnecessary definitions, over-specific intermediate theorems, repeated unfolding instead of an API, and long proof walls (Table 2, p. 4). State B fixed file names and specific requested theorem changes; definitions remained the weakest category and API design improved only partially (Table 2, p. 4). This before/after result is qualitative and based on two reviews, not a benchmark percentage.

Failure and assumptions. Expert review is expensive and the paper does not provide an automated metric for future reuse. “The case study shows why” proof completion is incomplete, but it does not prove that every formal project requires the same review schedule (Section 1, p. 2). Inference: VL should treat expert review as evidence about product suitability rather than as a replacement for kernel proofs.

## technique 2: design definitions at the right abstraction level

What it is. Choose definitions that future proofs can use through stable properties, rather than wrappers or one-off encodings that force unfolding. The authors state: “Definitions were the weakest point.” (Section 4, p. 4.) A bad definition creates transport work when a later user needs a different level of generality.

When to use it. Use this technique before proving many downstream lemmas. It is most valuable for foundational data types and mathematical or systems abstractions whose representation will outlive one theorem.

How to apply it. (1) Identify objects that the target proof and likely downstream proofs will need. (2) Decide their mathematical/general interface before writing implementation-specific wrappers. (3) Define canonical operations and properties as named lemmas. (4) Check that later users can use those lemmas without unfolding the definition. (5) Reject duplicate aliases, one-character wrappers, and definitions introduced only to make the current proof easy. (6) Re-run downstream proofs after refactoring to detect transport cost. The paper gives the rationale: “Bad definitions create future transport costs.” (Section 4, p. 4.)

Verus form. Inference: expose a small spec-facing trait or abstract predicate, with `spec fn` properties and proof lemmas, instead of forcing clients to unfold representation invariants. Keep executable representation private where possible. Inference: use `ensures` to state the stable API and helper `proof fn`s to establish algebraic properties; do not make an implementation wrapper the only way clients can reason.

Evidence. In State A, the agent created dozens of often unnecessary definitions; State B's review did not noticeably improve that category (Table 2, p. 4). The paper gives concrete examples of aliases such as `familyMap f := Sigma.desc f` and equivalent sheaf definitions that save little typing but can break instance equality (Section 4, pp. 5–6). The authors report that such choices can make future instances fail to be definitionally equal (Section 4, p. 6).

Failure and assumptions. Correct abstraction requires global judgment about future users; local compiler feedback cannot establish it. Inference: an agent optimizing only proof closure will prefer the shortest current path and may choose an abstraction that makes later Rust clients brittle.

## technique 3: build a principled API instead of unfolding

What it is. Add a focused interface around a foundational definition, with reusable lemmas and names, then use the interface in downstream proofs. In the case study, the first review required APIs for `Sheaf.H` and `topologicalKrullDim`. “The agent did not build an API for cohomology at all and instead just repeatedly unfolded the definition.” (Section 4, p. 5.)

When to use it. Use this when a proof repeatedly unfolds the same object or creates many highly specific lemmas. An API should capture the small set of properties that downstream code needs.

How to apply it. (1) Find repeated unfoldings and duplicated local facts. (2) Group them by the abstract object and identify canonical properties. (3) Define named lemmas for those properties. (4) Refactor downstream proofs to use those lemmas rather than representation details. (5) Inspect the resulting API for excess, specificity, and navigability. (6) Repeat expert review; local checklist completion is insufficient for an open-ended interface request.

Verus form. Inference: for a Rust verified data structure, create proof-facing lemmas around invariants and operations, then rewrite clients to call those lemmas. A good Verus API should let callers prove behavior without exposing ghost representation or repeating quantifier instantiations. Inference: this is a design recommendation, not a property Verus can automatically check.

Evidence. After review, the dedicated cohomology API substantially cleaned later files, but its own file became nearly 800 lines with 24 highly specific lemmas (Section 4, p. 5). The topological Krull dimension API was closer to library quality because the object was simpler and prompting was specific (Section 4, p. 6). This mixed result shows that “API exists” is not enough.

Failure and assumptions. The paper reports that the agent could not identify many generality mistakes without explicit requests and remained weak at global choices (Section 4, p. 6). A short or compiling API can still be noisy or over-broad. Inference: VL needs API review criteria tied to expected client use, not only line counts or proof success.

## technique 4: decompose expensive proofs and use bounded external proving

What it is. When elaboration or proof checking exceeds a heartbeat budget, split the proof into named sublemmas and cache reusable instances instead of raising the global budget. The paper reports that stripping heartbeat overrides regressed the sorry count from 3 to 24; recovery came from `inferInstanceAs` caching and splitting large proofs into named sublemmas (Section 3, p. 3). Aristotle submissions were used as bounded local assistance: successful calls closed bounded lemmas, while disproven calls supplied information (Section 4, p. 7).

How to apply it. (1) Detect repeated expensive elaboration or large monolithic tactic blocks. (2) Extract stable intermediate lemmas with explicit statements. (3) Cache expensive typeclass instances where appropriate. (4) Retry under the default heartbeat budget. (5) Use an external prover only for bounded local lemmas, and check every result in the main kernel. (6) Do not delegate choices of public definitions or theorem surfaces to the bounded prover.

Verus form. Inference: split large Verus proofs into named `proof fn`s with explicit `requires`/`ensures`; keep solver contexts small and avoid raising timeouts as the primary repair. Inference: an external tactic or model may suggest a lemma, but `verus` remains the acceptance oracle and the API decision remains human-reviewed.

Evidence and limits. The heartbeat episode is a project log observation, not a controlled ablation. The paper says: “A proof too expensive to check is usually a proof that should be decomposed.” (Section 3, p. 3.) Bounded calls helped local goals but never solved the hard decisions about which definitions should exist (Section 4, p. 7).

## what is proved, measured, and trusted

The Lean kernel proves the final theorem terms; compilation gates detect syntactic and environmental failures; expert reviews assess reusability, abstraction, and API design. The evidence consists of one project, two expert reviews, qualitative tables, timeline/telemetry logs, and examples of definitions and proofs. The authors explicitly warn that “the proof terms themselves are the least important part” for library quality because they are erased at runtime (Section 4, p. 7).

Inference: trusted components include the theorem statement supplied by humans, the expert's mathematical judgment, Lean/mathlib definitions, the checker, and any external libraries. The paper does not claim that State B is a universally good API or that its qualitative review predicts future maintenance.

Inference: the threat to VL is substantial at the specification and API layers. Agent-written verified Rust can satisfy a narrow or awkward contract while imposing future transport costs on every client. VL should not redo the paper's generic observation that proof completion alone is insufficient. A useful extension is to measure contract generality, client proof reuse, and refactor transport cost across multiple Rust libraries.

## techniques for the catalog

- post-proof expert review — inspect definitions, theorem surfaces, namespaces, and APIs after kernel success
- abstraction-level definition design — choose representations and interfaces that avoid downstream transport and unfolding
- principled proof API construction — replace repeated unfolding with a small set of reusable properties and lemmas
- proof decomposition under resource limits — split expensive proofs and cache instances instead of raising global budgets
- bounded external lemma assistance — use external provers for local suggestions while retaining the main kernel as oracle

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
