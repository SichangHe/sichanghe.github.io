# LeanArchitect: Automating Blueprint Generation for Humans and AI
(authored by agents unless marked 🧑)
Tag: `zhu2026leanarchitect`, [paper](https://arxiv.org/abs/2601.22554)

LeanArchitect is a Lean 4 package that keeps a formalization blueprint synchronized with Lean declarations. The paper's central design claim is: "LeanArchitect allows developers to annotate Lean declarations with blueprint metadata, automatically infers dependency and proof-status information, and generates synchronized LATEX blueprint content directly from the Lean environment." (Introduction, p. 2). The blueprint is a project-management graph, not a replacement for Lean's proof checker. Lean remains authoritative for tagged formal nodes, while the informal exposition and outline remain in LaTeX.

## technique: annotate declarations and infer a dependency/status node

What it is. Attach the new `@[blueprint]` attribute to each relevant Lean definition or theorem. The annotation can give a LaTeX label, natural-language statement, proof text, and management fields. LeanArchitect then recursively traverses constants in the declaration's type and value to infer dependencies and checks whether `sorry` occurs to infer proof status (Methods §§3.1–3.3, pp. 3–4). The paper's example tags `MyNat.add_comm` with label `thm:add-comm`, gives the statement "Addition in $N$ is commutative.", and records a proof explanation that cites `lem:zero-add` and `lem:succ-add` (§3.2, p. 4).

Inference: When to use it: use this for a theorem or definition that should be visible in a large project's dependency graph, especially when its statement and proof evolve alongside a formalization. Leave a `sorry` placeholder while a node is being planned; status will show that the proof is not complete.

Steps from the paper:

1. Add `@[blueprint "thm:add-comm" (statement := /-- Addition in $N$ is commutative. -/)]` above the declaration (§3.2, p. 4).
2. Put the declaration's proof and any proof-side blueprint comment in the Lean body; the example uses `sorry_using [MyNat.succ_add]` to document a dependency (§3.2, p. 4).
3. At attribute elaboration, LeanArchitect builds a `Node` and stores it in the `blueprintExt` environment extension (§3.3, p. 4).
4. It recursively visits constants in the type and value, collecting dependencies, and checks for `sorry`; the generated node stores separate statement and proof text, status, and `uses` labels (§3.3, p. 4).
5. Inference (not a numbered step in the paper): inspect the resulting node or graph to find missing, unexpected, or semantically suspicious edges. The paper reports such findings in §§4.1–4.2 (pp. 6–7) but gives no procedure.

Verus form. Inference: put the executable Rust function beside a `spec fn` describing its mathematical statement, and put the proof of an intermediate dependency in a `proof fn` with `requires` and `ensures`. Inference: a sidecar manifest can assign each Rust function or proof function a blueprint label and list its declared dependencies; Verus itself has no `@[blueprint]`, `sorry_using`, or Lean environment extension. Inference: use Verus verification status rather than searching for `sorry`: a node is complete only when its contracts and proof functions verify, and any `assume` or trusted external body must remain explicitly recorded as trusted. Inference: a dependency extractor should follow names occurring in `requires`, `ensures`, `spec fn` bodies, and proof calls, then compare that graph with the sidecar labels.

Evidence and limits. The paper gives a concrete representation with `statement.leanOk := true`, `statement.uses := ["def:nat"]`, `proof.leanOk := false`, and proof uses `lem:zero-add` and `lem:succ-add` (§3.3, p. 4). This proves that the package records the intended metadata for the example; it does not prove that every inferred edge captures semantic dependence. In the PrimeNumberTheoremAnd case, dependency visualization exposed a semantically incorrect Erdős 392 statement whose AI-generated proof did not depend on surrounding lemmas (case study §4.1, p. 6). Inference: for agent-written Rust, this is a medium-to-high threat reduction for omitted proof dependencies, but it cannot establish that a specification states the right requirement.

## technique: export deterministic fragments into an existing blueprint

What it is. LeanArchitect's Lake build integration extracts each module's nodes and renders LaTeX fragments. A blueprint imports a node with `\inputleannode{thm:add-comm}`; the generated fragment contains the theorem label, Lean identifier, inferred `\leanok` status, `\uses` dependencies, statement, and proof. The paper says: "The export process is deterministic and incremental." (Methods §3.4, p. 5). The final PDF and web graph are still produced by `leanblueprint` (§3.4, p. 5).

Inference: When to use it: use this when the project already has a human-written LaTeX outline and needs synchronized formal status and dependency data. Keep prose and ordering in LaTeX, but let LeanArchitect generate facts that can be recovered from Lean.

Steps from the paper:

1. Add the package to the Lean project (the authors added it to the lakefile, §4.2, p. 6) and mark declarations with `@[blueprint]` (§3.2, p. 4).
2. Run the module, library, or package Lake blueprint facet; it writes artifacts under `.lake/build/blueprint` (§A.2, p. 15).
3. Import the generated macros in the LaTeX blueprint and replace a hand-written node with `\inputleannode{label}` (§3.4, p. 5; macros saved and imported as described in §A.2, p. 15).
4. Run `leanblueprint` to build the PDF, HTML, and dependency graph (§3.4, p. 5).

Verus form. Inference: generate a deterministic Markdown or graph fragment from the Verus source and its verified contracts, then include that fragment in a human-maintained design document. Inference: a build script can fail closed when Verus fails, when a referenced function is absent, or when a contract is marked trusted; it should never turn a failed proof into a green status. Inference: unlike LeanArchitect's LaTeX macros, this exporter would be VL tooling around Verus, not a Verus language construct.

Evidence and limits. The paper gives the exact expansion shape for `thm:add-comm` (§3.4, p. 5), but reports no timing, failure rate, or independent audit of generated LaTeX. Its limitation section says: "the additional build steps of LeanArchitect deepen the build pipeline and increase the possibility for build and CI failures." (§5, p. 9). Blueprint nodes that exist only in informal LaTeX still require manual management (§5, p. 9). Inference: a VL exporter should preserve the distinction between verified Rust and informal design nodes and include build failures in CI evidence.

## technique: migrate and debug existing hand-maintained blueprints

What it is. `blueprintConvert` parses an existing blueprint, finds Lean declarations, inserts `@[blueprint]` tags, and replaces manual nodes with `\inputleannode`; it can infer dependencies or preserve user choices (Methods §3.5, p. 5; Appendix A.2, p. 15). The authors' procedure was to add LeanArchitect to the lakefile, run the conversion script, and then compare the converted blueprint with the original (§4.2, pp. 6–7). Inference: correcting the source or annotations after that comparison is the natural next step; the paper does not describe it as a separate procedure.

Evidence. The authors ran conversion on five projects—Carleson, Brownian Motion, Infinity Cosmos, Fermat's Last Theorem, and Prime Number Theorem And—at Lean v4.25.0 (§4.2, pp. 6–7). They found an isolated Carleson node that was not used, a missing Brownian Motion dependency edge, Mathlib theorems lacking `\mathlibok`, and Infinity Cosmos applying `\leanok` and `\uses` only to statements and not to proofs of theorems (§4.2, p. 7). PrimeNumberTheoremAnd's initial conversion took approximately one day; after conversion, `\lean`, `\leanok`, `\uses`, and `\mathlibok` were inferred automatically (§4.1, p. 6). The paper says: "In general, the conversion script successfully converts projects into LeanArchitect format." (§4.2, p. 7)

Verus form. Inference: a Rust migration tool can read existing proof modules, create labels for executable functions and `proof fn`s, and emit a dependency report before changing source. Inference: treat every discrepancy as an audit finding: a missing `requires` dependency, a proof that passes only because of a trusted declaration, or a function whose contract is disconnected from its implementation should block migration until reviewed. Inference: this is a process pattern, not evidence that Verus can infer semantic dependence from arbitrary Rust.

## technique: use a dependency graph as an AI proof-work interface

What it is. LeanArchitect's case study uses a graph to expose incomplete, compositional subgoals. GPT-5 Pro drafts a structured proof and Lean file with `@[blueprint]` lemmas and `sorry`; Aristotle attempts to fill the sorry nodes; GPT-5 Pro refines the blueprint from remaining failures; a human proves the rest (case study §4.3, pp. 7–9). The paper reports that after refinement Aristotle proved all but three nodes (§4.3, p. 7), after which the authors corrected the affected statements for a `deriv`/`derivWithin` issue and proved the remaining lemmas by hand (§4.3, p. 8).

Steps from the paper:

1. Choose a theorem naturally decomposable into intermediate lemmas; the example is multivariate Taylor's theorem in integral form (§4.3, p. 7).
2. Have GPT-5 Pro emit the Lean outline, tagging intermediate lemmas and leaving them as `sorry` (§4.3, p. 7).
3. Visualize the graph, run Aristotle in sorry-filling mode, and locate the unproved nodes (§4.3, pp. 7–8).
4. Have GPT-5 Pro refine the blueprint from the remaining failures, rerun Aristotle, and have a human prove what remains (§4.3, pp. 7–8; the paper's steps 4–5).

Verus form. Inference: represent each planned subgoal as a `proof fn` contract and make the final executable function's `ensures` the graph sink. Inference: an agent can work on one proof function at a time with only its named `requires`, `ensures`, and definitions, while a driver reruns Verus after each candidate. Inference: do not use an unproved placeholder in accepted Rust; a draft node must be rejected until its proof function verifies or its assumption is explicitly trusted. Inference: Verus diagnostics are weaker than a graph's semantic diagnosis, so a failed SMT obligation is not by itself evidence that the statement is false.

Evidence and limits. The mathematical target and the five-step AI/human pipeline are printed in §4.3 (p. 7); the final Lean statement is on p. 8. The paper reports no denominator for a general success rate: the only count is this case, where Aristotle left three nodes before human completion. It also states: "simply asking the language model to ‘refine’ the blueprint did not reliably address the underlying causes of failure" (§4.3, p. 9). The authors identify limited prover diagnostics and suggest counterexamples, missing-lemma suggestions, or structured failure traces (§4.3, p. 9). Inference: the workflow reduces search scope but leaves specification design, diagnostic interpretation, and final proof engineering as material threats to agent-written verified Rust.

## what is proved, measured, and trusted

LeanArchitect proves no mathematical theorem by itself; Lean checks the tagged declarations and the package reports extracted metadata. The evidence consists of one external adoption (PrimeNumberTheoremAnd, which is also one of the five projects in the conversion test), conversions of five projects at Lean v4.25.0, and one Taylor-theorem AI/human case (§§4.1–4.3, pp. 6–9). The paper gives an approximately one-day migration time and a three-node residual in the Taylor case, but no total-node denominator, speed baseline, or statistical study. Inference: trusted elements include Lean, the LeanArchitect implementation and extractor, `leanblueprint`, the correctness of labels and prose, and the user's mathematical specification. Inference: product threat is highest where an agent can make a wrong statement that still verifies; dependency visualization can expose suspicious missing edges but does not prove semantic intent.

## what VL should reuse

Inference: VL should reuse the paper's separation between authoritative formal declarations, generated synchronization artifacts, and human-authored exposition. Inference: it should not redo the basic idea of a proof-dependency graph without measuring whether Verus agents actually repair proofs faster or with fewer specification errors. Inference: the missing experiment for VL is a denominator-based study over real Rust modules: graph-guided generation versus flat context, measured by verified functions, proof time, repair count, and specification defects.

## techniques for the catalog

- declaration metadata and dependency inference — annotate formal declarations, recursively collect referenced constants, and record proof status and prose in a graph node
- deterministic blueprint export — render verified metadata into incremental build artifacts consumed by a human-maintained document
- blueprint migration audit — convert manual nodes, then inspect isolated, missing, and contradictory dependency/status edges
- graph-guided AI proof decomposition — let an agent draft small subgoals, run an automated prover, refine residual nodes, and finish the remainder by hand
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "A minor source of disruption was that existing pull requests had to be manually updated by their authors to conform to the new annotation format."): read all pages of the paper text; checked every quotation, section and page reference, the technique steps, the five-project list, the one-day migration figure, the three-node residual, and the Lean v4.25.0 version; changed the paper link (it pointed to the Carleson paper's DOI, now the paper's own arXiv 2601.22554 from the paper text), corrected page references for §5 (p. 9), the three-node result (p. 7), the lakefile step, and Appendix A.2 (p. 15), changed "four-stage" to the paper's five steps, reworded the Infinity Cosmos finding, and marked uncited steps and the trusted-elements list as inference; did not check the cited external repositories, the figures' node counts, or the Verus-form sections beyond marking them as inference.
