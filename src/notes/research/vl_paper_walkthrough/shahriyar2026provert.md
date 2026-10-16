# PROVE-RT: Generating Mechanized Theorem Prover Scripts for Real-Time Systems using LLMs
(authored by agents unless marked 🧑)
Tag: `shahriyar2026provert`, [paper](https://www.semanticscholar.org/paper/cdb0a57a95e3002a31ff1d8e847dec6032b95804)

## what the paper proves or measures

Shahriyar, Ahmed, and Al Arafat present PROVE-RT, an LLM-assisted pipeline that turns real-time schedulability analyses from research papers into mechanically checked PROSA/ROCQ scripts. PROSA supplies definitions and machine-checked results for task models, schedules, workload, interference, and schedulability. The pipeline does more than predict a next tactic: it must recover formal constructs, dependencies, contexts, and proof obligations that are implicit in prose and equations. The paper summarizes its core design as “dependency-aware informal sketches, retrieval from processed PROSA documentation, staged skeleton generation, and proof completion.” (Abstract, p. 1.)

The corpus contains 1,191 retained papers and 13,134 normalized informal sketches. The curated evaluation contains 300 sketches sampled from 109 papers. A generated sketch counts as successful only when every section is formalized in dependency order, the completed script compiles under ROCQ 9.1.0, no `Admitted` remains, and the proof-integrity checker reports no violation (Section VII-C, p. 17). Dense retrieval formalizes 134/300 sketches, 44.7%; BM25 126/300, 42.0%; hybrid 123/300, 41.0%; direct GPT-5 0/300, and direct Claude 1/300, 0.33% (Table II, p. 17; Table III, p. 20). These are PROSA-specific script outcomes, not evidence that an LLM's informal extraction is sound. The authors also caution that “This creates a substantial burden on the LLM’s context handling and reasoning capabilities.” (Introduction, p. 2.)

## technique 1: extract invariants, sketches, and a dependency DAG

what it is: transform a schedulability analysis `A` into system invariants `I`, informal sketches `Kj`, and a directed acyclic dependency graph `GD = (I,D)` (§IV, pp. 4–5; §V-A, p. 6). An invariant may be a definition, hypothesis, assumption, lemma, theorem, corollary, fixpoint, or other formal claim. Each sketch records the statement, intuition, and intended proof outline. An edge `(ip, ij)` means `ij` depends on `ip`, so `ip` must be introduced first. ROCQ's forward-reference discipline makes this order a compilation requirement.

when to use it: use this representation when the source is a paper's prose and equations rather than an existing theorem-prover goal. It exposes hidden prerequisites before asking a model to write syntax and prevents a later lemma from referring to a not-yet-defined abstraction.

how to do it:
1. Give an extraction LLM the schedulability paper, examples, and guardrails for distinguishing mechanization-relevant constructs from explanatory text (§V-A, p. 6; §VII-D, p. 17).
2. For every candidate invariant, emit its formal statement, variables, assumptions, conclusion, and plain-language proof sketch (Appendix A1, pp. 27–29).
3. Resolve each named prerequisite to an earlier invariant and add the dependency edge (§V-A, p. 6).
4. Canonically match dependency names by exact matching, normalized matching (case, punctuation, underscores, whitespace), then character-level fuzzy matching only above 0.88 (§VII-A, pp. 16–17).
5. Reject cycles and unresolved-dependency ratios above 0.15; mark weaker structural issues for review (§VII-A, p. 17).
6. Topologically order the retained DAG and generate one unit-level sketch at a time (§IV-A, p. 5; §V-A, p. 6).

The extraction and validation process retained 13,134 invariants in six categories: 6,817 definitions (51.9%), 4,144 lemmas (31.6%), 1,822 theorems (13.9%), 228 corollaries (1.7%), 115 fixpoints (0.9%), and 8 hypotheses (0.1%) (Table I, p. 17). A sketch can contain multiple invariants, so the 13,134 count is not a count of papers or sketches.

Verus form: Inference: represent an extracted invariant as a Rust record containing a name, `spec fn` statement, dependencies, and proof role. Generate `proof fn`s and `spec fn`s in topological order; use `requires` for genuine hypotheses and `ensures` for the invariant result. A dependency graph can be checked by an external generator and mirrored by module ordering, but Verus does not infer that a natural-language extraction is complete. Do not encode a claim as an assumption merely to make the proof pass.

evidence and limits: the paper uses Gemini-2.5-Flash for extraction and a deterministic validator, but it does not formally verify the extraction against the source papers. Fuzzy matching can recover formatting variants but can also create a wrong edge if the identifier threshold admits a near name. The authors state that deeper chains make failures propagate through earlier generated blocks (§VIII, p. 19).

## technique 2: build a retrieval-ready PROSA corpus with dependency recovery

what it is: process PROSA's HTML documentation into fragments that pair formal code and explanatory text, then retrieve relevant examples and documentation for each sketch. Proof-oriented Analysis and Results modules use code-block-plus-description chunks; other modules use section chunks (§V-B, pp. 6–7). The corpus contains 5,097 fragments from 356 source files (§VII-D, p. 17). The retrieval query is the sketch's statement, intuition, and conclusion, run independently and merged into a top-`k` context (§V-C, pp. 7–8).

how to do it:
1. Extract definitions, assumptions, lemmas, proof examples, and descriptions from PROSA documentation (§V-B, p. 7).
2. For each target sketch, use its statement, intuition, and conclusion as separate retrieval queries (§V-C, p. 7).
3. Retrieve top-5 candidates from one strategy—BM25, dense embeddings, or hybrid—and merge them into `Rj` (§VII-D, p. 17).
4. For proof-oriented candidates, inspect identifiers before `Proof.` as the strongest dependency signal, explicit `apply`/`rewrite` references as medium, and other proof tokens as weak (§V-C, pp. 7–8).
5. Match those identifiers to earlier declarations, recursively recover their earlier sections, order imports and code for compilation, and first try a lean context; fall back to all predecessor sections if the lean version fails (§V-C, p. 8).
6. Provide the recovered context together with the current partial script to the generator (§V-D, p. 8).

Verus form: Inference: index Verus library modules with paired code and explanatory text. Query from the target's specification statement, proof intuition, and desired postcondition; retrieve named lemmas and their dependency modules. Use `requires`/`ensures` signatures and `spec fn` definitions as retrieval anchors. The retrieval system is untrusted context selection; Verus remains the checker. Exact PROSA type-class resolution and ROCQ section syntax do not carry over.

evidence and limits: dense retrieval achieves 134/300 end-to-end sketches (44.7%), while hybrid compiles the most individual sections, 608/1,393 (43.6%); dense compiles 597/1,393 (42.9%) (Table III, p. 20). The denominator changes from sketches to sections, so 44.7% and 43.6% are not directly comparable. By construct kind, dense proves 125/278 definitions (45.0%), while BM25 proves 9/19 lemmas (47.4%) and 3/3 theorems (100.0%) (Table IV, p. 20). Dense's overall lead does not mean it is best for every proof-bearing construct.

## technique 3: generate a structurally complete skeleton with deferred proof bodies

what it is: separate declaration and context generation from proof search. For each sketch, the skeleton model receives `Kj`, retrieved context `Rj`, dependency graph `GD`, and earlier script `S<j`, then emits a structurally complete PROSA/ROCQ block. Definitions, imports, variable declarations, type-class contexts, and statements must be concrete; every proof-bearing body is temporarily `Admitted` (§V-D, pp. 8–9). The paper explains, “Generating the correct type signature of a P ROSA/ROCQ construct, including its name, variable bindings, typeclass constraints, and statement, is generally more tractable for a language model than simultaneously discovering a valid proof strategy.” (Section V-D, p. 8.)

how to do it:
1. Prompt with the sketch last so it remains the immediate objective, after context and previous script (§V-D, p. 9).
2. Require every lemma, theorem, or corollary to use an `Admitted` placeholder and forbid proof tactics in this stage (§V-D, p. 9).
3. Require all non-proof-bearing constructs in full because they are needed for type checking (§V-D, p. 9).
4. Reject unsupported hypotheses, restating the target as an assumption, or vacuous encodings; genuine preconditions must stay in the formal statement (§V-D, p. 9).
5. Check the generated block for admitted-only proof bodies, append it to `S<j`, and compile with `coqc`; regenerate on structural errors (§V-D, p. 9).

Verus form: Inference: use a two-phase file in which executable functions, `spec fn` definitions, `requires`, `ensures`, and lemma signatures are fixed first, while proof bodies are generated afterward. Verus has no `Admitted` placeholder described in the project's valid construct guidance; a staging placeholder must stay outside the accepted Verus file or be represented by an explicit generation marker removed before verification. Never use `external_body` on the function whose proof is being evaluated. A compile check of declarations is a structural gate, not proof completion.

evidence and limits: staged skeletons let the checker localize undefined identifiers, missing imports, wrong types, or missing type-class instances before proof tactics are attempted (§V-D, p. 9). The method still trusts the model's invariant statement and generated non-proof definitions. A structurally compilable skeleton can encode a wrong theorem.

## technique 4: complete proofs under an integrity checker and compiler-guided repair

what it is: replace each deferred proof with a generated proof fragment, compile the complete script, and iteratively repair failures using the compiler message and its location. The proof-completion prompt receives the partial script, skeleton, sketch, and retrieved context (§V-E, pp. 9–10). A proof-integrity checker rejects changing the original theorem, adding unsupported axioms or parameters, leaving `Admitted`/`admit`/`Abort`, or moving the proof burden into a new global lemma or definition (§V-E, p. 10).

how to do it:
1. Select one deferred proof block in dependency order and provide its full surrounding skeleton and retrieved context (§V-E, p. 9).
2. Ask the LLM for a complete proof body, replacing only that `Admitted` (§V-E, p. 9).
3. Run the integrity checker for forbidden constructs and edits outside the intended proof region (§V-E, p. 10).
4. Compile the resulting script with ROCQ; accept only when it compiles and the checker reports no violation (§V-E, p. 10).
5. On failure, extract the compiler error and location, add them to a repair prompt with the sketch and retrieval context, and retry until success or budget exhaustion; then roll back and mark the section failed (Fig. 3, p. 10).

The illustrative retry proof defines `W_i_k_i`, states `W_i_k_i (k_i * (R_star + W_i_0)) = ...`, unfolds the definition, and lets `lia` discharge natural-number addition commutativity (Section VI-D, pp. 12–13). The example demonstrates the staged boundary: the skeleton first type-checks with a deferred obligation, then the completed proof compiles with `Qed`.

Verus form: Inference: preserve the original Rust function signature, `requires`, and `ensures`; let the model edit only proof blocks, `assert`s, loop `invariant`s, and calls to already declared proof functions. Run Verus after each attempt and feed its exact diagnostic to repair. A final acceptance requires no trust escape such as `external_body` on the target and no weakened contract. The paper's `Admitted`, `Qed`, `coqc`, and `lia` are ROCQ constructs; Verus equivalents must be checked against the project's valid syntax.

evidence and limits: PROVE-RT-DENSE succeeds on 134/300 sketches (44.7%); BM25 126/300 (42.0%); hybrid 123/300 (41.0%). Direct GPT-5 produces 0/300 PROSA mechanizations and Claude-Opus-4.6 1/300, although Claude produces 39/300 compilable generic ROCQ scripts and only 1 uses PROSA (§VIII, p. 18). The checker therefore measures target-library mechanization, not generic ROCQ syntax. Repair success remains 55.3% failures in the best setting, and deeper dependency chains reduce success (Fig. 5, p. 19).

## technique 5: construct and evaluate a reusable invariant corpus

what it is: collect schedulability papers, extract formal invariants and sketches, validate dependency graphs, and publish the structured corpus for retrieval and evaluation. The collection starts with 1,991 IEEE records, downloads PDFs through authenticated Selenium, removes duplicates to about 1,870 unique papers, and retains 1,191 papers after structural filtering (§VII-A, pp. 16–17). Sampling uses 109 curated papers and proportional stratification over dependency-depth categories to select 300 sketches with seed 42 (§VIII, p. 18).

how to do it:
1. Search specified real-time venues and retrieve paper metadata and full text (§VII-A, p. 16).
2. Convert PDFs to structured XML with GROBID before LLM extraction (§VII-A, p. 16).
3. Extract invariant fields, sketches, and dependency names; validate exact, normalized, and fuzzy links (§VII-A, pp. 16–17).
4. Label papers keep, review, or reject and retain only structurally usable graphs (§VII-A, p. 17).
5. Stratify the evaluation sample by sketch section count and evaluate all generation modes on the same 300 sketches (§VIII, p. 18).

Verus form: Inference: build a benchmark where each task includes a fixed Rust implementation, specification, dependency graph, and expected proof obligations. Keep extracted prose and generated Verus code separate, and score only Verus-accepted proofs with immutable contracts. Use section count or dependency depth as a difficulty proxy, while recording that it is not a semantic complexity measure.

evidence and limits: the paper's success criterion requires all sections of a sketch to compile in dependency order, so local section success can exceed end-to-end success. Hybrid has 608/1,393 compiled sections but only 123/300 fully proven. The corpus is valuable training and evaluation infrastructure, but extraction quality, paper selection, and one-domain coverage remain trusted limitations.

## trusted boundary, contradictions, and scope

The ROCQ kernel/compiler, PROSA library, imported MathComp libraries, retrieval corpus, extraction validator, integrity checker, and the source paper's intended invariant statements form the effective trust boundary. The paper's mechanized result is conditional on those formal statements and imported definitions; a proof can compile while formalizing the wrong reading of a schedulability claim. The paper reports 44.7% in the abstract and Table II for dense retrieval; Table II also reports hybrid 123/300 and BM25 126/300. The 41.0% and 42.0% figures therefore have the same denominator, while the separate 608/1,393 and 597/1,393 numbers are section-level and must not be presented as sketch success. The abstract's “success rate of 44.7%” is accurate only for dense retrieval on the 300-sketch evaluation.

## techniques for the catalog

- invariant-and-sketch extraction — turn paper prose into formal claims, informal proof plans, and a dependency DAG before code generation
- dependency-aware retrieval — retrieve code and documentation from a proof library, recursively recovering prerequisites in compilation order
- deferred-proof skeletons — generate type-correct declarations and contexts first while deferring proof bodies to a separate stage
- integrity-checked proof repair — replace only the intended proof block, compile, feed exact diagnostics back, and reject axioms or target edits
- corpus and denominator design — validate extracted graphs and report full-sketch success separately from local section compilation
