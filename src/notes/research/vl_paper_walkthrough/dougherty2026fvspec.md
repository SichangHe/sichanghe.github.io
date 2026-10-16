# FVSpec: Real-World Property-Based Tests as Lean Challenges
(authored by agents unless marked 🧑)
Tag: `dougherty2026fvspec`, [paper](https://doi.org/10)

FVSpec converts property-based tests (PBTs) from ordinary Python repositories into Lean verification challenges. Its key contribution is a reproducible path from tests written without formal verification intent to typed implementations and theorem statements with `sorry` proof holes. The paper states that it “first scrape[s] 7,413 distinct PBTs from real-world Python repositories” and automatically translates 2,623 of them (35%) into 9,415 Lean specifications (Abstract, p.1).

## technique 1: scrape, license-filter, extract, and deduplicate real PBTs

What it is. The scraper discovers repositories through the Hypothesis dependency graph, removes explicitly non-permissive licenses, shallow-clones accepted repositories, finds `@given` tests with ripgrep, and recovers the transitive closure of locally defined functions using surrounding Python (§3.1, p.4). A 24-hour run found 54,345 PBTs. Repository grouping and then SHA-256 hashing of whitespace-normalized tests removes copies. The released corpus contains 7,413 distinct tests from 497 repositories (§3.1.1–3.1.2, pp.4–5).

When to use it. Use this to build realistic training or evaluation data for specification and proof agents. It samples production code and black-box interactions rather than programs designed for verification. It is unsuitable as a semantic ground truth by itself: a PBT can omit preconditions or encode a bug.

How to apply it.

1. Crawl the dependency graph for a PBT framework (§3.1, p.4)
2. Record repository metadata and skip explicitly AGPL, GPL, LGPL, or MPL repositories (§3.1, p.4)
3. Shallow-clone and locate PBT decorators with ripgrep (§3.1, p.4)
4. Parse the surrounding source and recover locally defined dependencies (§3.1, p.4)
5. Hash tests after removing comments/blank lines and collapsing whitespace; keep one canonical copy selected by stars, forks, then row id (§3.1.1, p.4)
6. Preserve URLs, licenses, and source identifiers with each test (§2, p.2)

Inference: for Verus, this gives candidate `requires`/`ensures` contracts and input generators, but Python semantics must be translated into Rust types and ownership. A PBT is evidence of intended behavior, not a Verus proof. The Rust implementation and its model must be checked separately.

Evidence. The released corpus spans 497 repositories; no repository contributes more than 11.5% and the top ten contribute 30.8% (§3.1.2, p.5). The paper reports, “The median PBT is just 10 LoC, but exercises around 2.8× its own length in project code” (§3.1.2, p.5). The median PBT is 10 lines and exercises 2.8× its own length in project code (§3.1.2, p.5). These figures describe this corpus, not all Python software.

## technique 2: agentic transpilation into implementation/specification pairs

What it is. For each PBT, tree-sitter extracts the function under test and local dependency closure. A formalization agent emits `Impl.lean` (a computable Lean port) and `Spec.lean` (one theorem per PBT assertion, initially `sorry`). Lean LSP type-checking feeds compiler errors back into a repair loop (§3.2, p.5). The isort example yields `isort_sorted` and `isort_perm` theorems from the PBT’s sortedness and multiset assertions (Figure 2, p.3).

How to apply it.

1. Discover the function and transitive local dependencies with tree-sitter (§3.2, p.5)
2. Generate a Lean implementation with no `sorry` and separate theorem file (§3.2, p.5)
3. Translate every assertion into a generalized theorem, retaining `sorry` as the proof placeholder (§2, p.2)
4. Run Lean LSP checks after each generation; return diagnostics to the agent until success or a fixed budget (§3.2, p.5)
5. Build every retained sample and drop failures, classifying failures into nine families (§3.2, p.6)
6. Analyze ASTs for definitions, theorem counts, residual `sorry`, and axiom dependencies (§3.2, p.6)

Inference: Verus can use the same split: executable Rust in one module, `spec fn` contracts and `proof fn` lemmas in another, with `requires` and `ensures` generated from PBT assertions. Rust ownership, panic behavior, integer widths, and side effects must be modeled explicitly; Lean code does not port directly. The generation loop should run `verus` and feed diagnostics back to the agent.

Pre-validation is essential. The paper drops Unit-typed tautologies, unresolved or ill-typed names, and specification declarations leaked into `Impl.lean` (§2, pp.2–3). It reports a residual 0.7% of samples with naked theorem declarations in the implementation file (§2, p.3). The benchmark also records axiom dependencies because Lean can be gamed by changing the question; submissions are not automatically failed for extra axioms (§2, p.3). Inference: a Verus benchmark must reject `external_body` on the function being verified and must report all trusted external specifications.

Evidence. Of 7,413 distinct PBTs, 2,623 formalized (35%) into 9,415 samples (§4, p.6). The paper states, “A complete Lean implementation was generated for 59% of samples; the remaining 41% ship against a stub Impl.lean” (§4, p.6). A complete Lean implementation exists for 59% of samples; 41% use a signature-only stub (§4, p.6). The mean sample has 8 theorems, median 6, maximum 66; median structural faithfulness is 0.65 (§4, p.6). These denominators are samples after post-production, not all scraped PBTs.

## technique 3: represent effectful boundaries as uninterpreted interfaces

What it is. For database, socket, filesystem, clock, or queue interactions, the agent translates entities and operators relevant to the property into Lean structures and inductive types. Pure plumbing becomes opaque axiom declarations threaded through theorem parameters (§3.2, p.6). The theorem then holds for all interpretations of those axioms.

When and how to use it. Use this only when the PBT constrains an abstract contract rather than timing or concrete side effects. Identify effectful calls, expose the state needed by the property, replace infrastructure with an abstract interface, and make each abstract operation a theorem parameter or axiom. Keep the original source and boundary metadata for audit.

Inference: Verus can encode the interface as a trait or abstract state machine with `spec fn` summaries and explicit `requires`/`ensures`. A trusted external contract may model a database operation, but it must be listed as a trust assumption. Verus can prove client code relative to that contract; it cannot prove the real database, network, latency, or hidden global state from an uninterpreted summary.

Evidence and failure. The paper says, “If the property is fundamentally about timing, memory, ordering of side effects, or wall-clock latency, an uninterpreted axiom cannot witness it” (§5, p.8). It also warns that hidden side effects behind a pure signature may be inlined as pure, producing a compiling but mismatched theorem (§5, p.8). Inference: such axiomatization threatens a verified Rust product whenever the abstraction discards exactly the behavior the product promises.

## technique 4: quality scoring and proof baselines

The benchmark scores parameter, type, strategy, assertion, and dependency coverage, then computes a weighted structural-faithfulness difference (§4.1, p.6). A difficulty grader labels samples easy/hard. Three models receive Lean LSP access and are scored by proved-ever (all `sorry` removed and `lake build` succeeds) and partial credit (fraction of holes removed). The paper reports average success of 70% on easy and 49% on hard samples (Abstract, p.1), with Figure 8 showing per-model pass@5 rates.

Inference: for Verus, retain separate metrics for compilation, complete proof, residual trusted axioms, contract coverage, and semantic faithfulness. Passing `verus` alone does not show that the generated contract matches the PBT or product requirement.

Known weaknesses. Structural faithfulness is heuristic; the paper gives a 0.75-scoring sample whose theorem is true but wrongly models an alert dictionary as an append-only list because dependency resolution missed the real state and a `Nodup` precondition (§5, p.8). Dependency coverage is 1.0 whenever no dependencies are resolved, affecting 3,793 samples (40.3%) (§5, p.8). Difficulty labels come from Claude Haiku and are not human-calibrated (§5, p.8). Inference: VL should treat these labels as triage, never as evidence that a Verus proof captures behavior.

What has already been done. FVSpec already provides the real-PBT-to-Lean pipeline, LSP repair loop, artifact filtering, side-effect abstraction, and large-scale baseline evaluation. Inference: rebuilding this same Lean-only benchmark would add little. The unfilled opportunity is a Rust/Verus version with ownership-aware translation, executable semantic tests, explicit external-contract accounting, and a stronger checker for specification equivalence.

## techniques for the catalog

- real-PBT corpus mining — discover, license-filter, extract, hash-deduplicate, and preserve provenance for property tests
- implementation/spec split — generate executable code separately from theorem statements with proof holes
- LSP repair loop — compile after every generation and feed diagnostics to the formalization agent
- pre-validation and axiom audit — remove tautological or ill-typed challenges and report trusted declarations
- side-effect abstraction — model relevant state while threading infrastructure as explicit opaque parameters
- structural faithfulness scoring — measure parameter, type, strategy, assertion, and dependency preservation
- proved and partial metrics — score complete builds separately from fractions of discharged obligations
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
