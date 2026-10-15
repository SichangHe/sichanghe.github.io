# CAM-Bench: A Benchmark for Computational and Applied Mathematics in Lean
(authored by agents unless marked 🧑)
Tag: `long2026cam`, [paper](http://arxiv.org/abs/2605.17255v1)

## scope and result

CAM-Bench is a Lean 4 benchmark for computational and applied mathematics. The paper releases 1,000 proof targets derived from 778 textbook exercises in optimization, numerical linear algebra, and numerical analysis. Its construction contribution is a traceable pipeline that recovers textbook context, turns each exercise into a self-contained informal target, decomposes that target into semantic blocks, and produces Lean declarations with compiler and semantic checks. Its evaluation contribution is a file-level test of proof generation and interactive repair. The paper states: “We introduce CAM-Bench, a Lean 4 theorem-proving benchmark of 1,000 Lean proof targets in computational and applied mathematics” (Abstract, p. 1). It also states that the benchmark problems “often depend on locally introduced definitions, notation, algorithms, and elementary results” (Abstract, p. 1).

The paper’s techniques are useful to VL because they make context recovery, specification fidelity, incremental verification, and execution-guided repair explicit. Inference: a Verus benchmark built from real Rust exercises should preserve the same chain from source requirement to verified target instead of testing isolated theorem statements only.

## technique 1: recursive dependency expansion and source-grounded enrichment

what it is

A textbook exercise is represented as a root node in a dependency tree. References in its text are retrieved from a corpus and recursively expanded to a bounded depth. Every node stores source text, reference label, hop depth, and provenance. Cycles are prevented by ignoring references already on the current path. The tree is processed bottom-up so lower-level definitions are available when higher-level references are naturalized.

The paper’s Algorithm 1 gives the procedure (p. 4): “Starting from a raw exercise x, the procedure builds a bounded dependency tree T by repeatedly extracting references, retrieving the corresponding corpus items, and expanding their internal references up to depth budget D.” It then says: “Cyclic expansion is avoided by ignoring references already on the expansion path” (Section 3.1, p. 4). Naturalization merges child representations, resolves local references, standardizes notation, removes duplicated material, and cleans textbook-specific phrasing at the root. An implicit-condition recovery step makes conditions such as domain restrictions, positivity, dimensional compatibility, convexity, and regularity explicit only when supported by the source, recovered dependencies, or well-formedness requirements. Unresolved dependencies are held out rather than guessed.

when to use it

Use this when a requirement refers to definitions, algorithms, equations, assumptions, or earlier lemmas that are local to a document or codebase. Do not fill a missing dependency by invention. Retain provenance so each inserted fact can be audited.

how to do it

1. Create a root node for the raw exercise and set a depth budget D (Algorithm 1, p. 4)
2. Extract references from the node text (Algorithm 1, p. 4)
3. Retrieve each referenced corpus node; skip an empty result or a reference already on the path (Algorithm 1, p. 4)
4. Add and recursively expand each child with depth d−1 (Algorithm 1, p. 4)
5. Naturalize children bottom-up, inserting their text into the parent and resolving local references (Section 3.1, p. 4)
6. At the root, remove pedagogical phrasing while preserving objective, assumptions, quantifiers, domains, and conclusion (Section 3.1, p. 4)
7. Recover only source-supported implicit conditions; hold out unresolved dependencies (Section 3.1, p. 4)

The appendix makes the intermediate artifacts concrete: `problem`, `problem_clean`, `problem_with_context`, `problem_standardized_math`, and `problem_finally` (Appendix A.1, p. 13). Cleaning removes hints and exposition but preserves formulas, variables, constraints, assumptions, conclusions, numbering, and references (Appendix A.2, p. 13). The enriched record includes retrieved fragments, reference labels, provenance, and multi-hop expansions (Appendix A.3, p. 14).

Verus form

Inference: represent each recovered requirement as a Rust/Verus module boundary with explicit types and contracts. Put executable definitions in `fn`, mathematical definitions and predicates in `spec fn`, and proofs of recovered lemmas in `proof fn`; use `requires` and `ensures` to state recovered preconditions and postconditions. Keep a source identifier in comments or metadata next to each declaration. Expand references by generating declarations in dependency order, and reject a module when a required contract or type is unavailable. The paper is about Lean and does not prescribe these Verus constructs; the mapping is an inference from the dependency and provenance procedure.

what shows it works

The source review funnel starts with 1,550 candidates: 410 accepted (26.5%), 211 revised (13.6%), and 929 held (59.9%) (Table 5, p. 16). After targeted repair and re-review, 93 of 211 revise cases were accepted (44.1%); among the hold-derived pool, 338 of 578 were accepted (58.5%) (Table 5, p. 16). The final released corpus contains 778 retained exercises and 1,000 targets (Section 4.1, p. 6). These counts measure curation yield, not theorem truth independent of Lean.

where it fails or assumes

The method assumes a searchable corpus and recognizable references. Missing external context is filtered unless verified source material recovers it (Appendix B.2, p. 16). The paper warns that unconstrained rewriting can change meaning; repair “is not allowed to introduce unsupported new assumptions, replace the original task by a nearby easier statement, or alter the intended mathematical objective” (Appendix B.2, p. 16).

## technique 2: semantic block decomposition and frozen-context construction

what it is

A recovered exercise is split into typed semantic blocks before Lean generation. The paper lists hints, definitions (`defn`), optimization problems (`opt_prob`), algorithms (`algo`/`alg`), and theorem targets (`thm`) as block kinds (Table 8, p. 17). The theorem target is the root; definitions, assumptions, constructions, and context are supporting branches. Lean is generated one block at a time while all previously accepted declarations remain read-only.

The paper states: “Directly translating such mixed content into one Lean fragment can cause role confusion and makes errors difficult to localize” (Section 3.2, p. 5). It further states: “At each step, the system focuses on a single target block, while previously verified declarations, assumptions, notation, and auxiliary definitions are kept fixed as read-only context” (Section 3.2, p. 5).

when to use it

Use block decomposition when one requirement combines data types, algorithms, invariants, assumptions, helper claims, and a final property. Freeze accepted prefixes when local edits could otherwise invalidate earlier declarations or create cascading diagnostics.

how to do it

1. Convert the enriched exercise into ordered records `(index, source, source_idx, kind, content)` (Appendix C.1, p. 17)
2. Assign each record a role; exclude non-formalizable hints from generation while retaining provenance (Table 8, p. 17)
3. Start from a Lean scaffold and process records in index order (Algorithm 2, p. 18)
4. Insert an immutable source comment and derive a frozen context from the current prefix (Algorithm 2, p. 18)
5. Retrieve few-shot examples, translate the current block, and insert it (Algorithm 2, p. 18)
6. Compile; on success freeze the block, otherwise use diagnostics for bounded local repair (Algorithm 2, p. 18)
7. Run final compilation after all blocks (Algorithm 2, p. 18)

Verus form

Inference: map `defn` records to `spec fn` or data definitions, `algo` records to executable Rust functions plus loop invariants, and `thm` records to `proof fn` lemmas or a function contract. Keep previously verified declarations unchanged while editing the current function or proof. Use `requires`, `ensures`, `invariant`, and `decreases` where the Rust algorithm needs them; do not treat `invariant` as a call. The paper’s block kinds and frozen Lean context are source facts; this Verus mapping is an inference.

what shows it works

The benchmark construction pipeline produced 1,000 targets from 778 exercises (Section 4.1, p. 6). At Lean-level semantic validation, 92.5% of candidate declarations were classified usable and 7.5% unusable before correction or exclusion (Section 4.2, p. 7). Compilation used Lean 4.28.0 and Mathlib 4.28.0 through `lake env lean` (Appendix D.2, p. 20).

where it fails or assumes

A compilable declaration can still omit assumptions or weaken a conclusion. The paper explicitly says: “Compilation does not ensure semantic faithfulness” (Appendix C.3, p. 18). Block boundaries also assume that the exercise can be assigned coherent roles; non-formalizable tasks are skipped rather than forced into Lean.

## technique 3: alternating semantic review, history-aware repair, and rejection control

what it is

Every compilable block is compared with its semantic record. A structured reviewer reports whether it is usable, identifies missing assumptions, wrong boundary cases, or task drift, and proposes a fix. A semantic rewriter patches only the current block; compilation then checks the patch, and the block is reviewed again. A bounded history stores attempts, compiler errors, semantic outcomes, and rejection reasons so failed directions become negative constraints.

Algorithm 3 (p. 19) loops over blocks and review rounds: it extracts the current block, calls `REVIEW`, accepts it when the report accepts it, otherwise rewrites and patches it, recompiles, records failures, and retries. The paper says the pipeline rejects “strengthening assumptions, weakening conclusions, dropping quantifiers, altering variable dependencies, changing notation in a meaning-changing way, or modifying optimization objectives” (Section 3.2, p. 5).

when to use it

Use this whenever a compiler can establish syntax and typing but not semantic equivalence to the source requirement. Keep a finite repair budget and preserve rejected attempts for diagnosis.

how to do it

1. Extract the current declaration in frozen context (Algorithm 3, p. 19)
2. Review it against the source block and record a structured status (Algorithm 3, p. 19)
3. If accepted, append it to the accepted set; otherwise rewrite only that block under the report (Algorithm 3, p. 19)
4. Recompile the patch; if compilation fails, record diagnostics and invoke compilation repair (Algorithm 3, p. 19)
5. Re-review a compilable patch until accepted or the block is marked failed (Algorithm 3, p. 19)
6. Reject semantic degradation categories listed above (Section 3.2, p. 5)

Verus form

Inference: compare a Rust function’s `requires`/`ensures`, loop `invariant`s, and called lemmas against the recovered semantic record after Verus verifies it. Apply a local proof or contract patch, then rerun Verus. Preserve an attempt history outside executable code. A successful Verus check cannot by itself prove that the contract matches the requirement, so the semantic review remains necessary. This is an inference because CAM-Bench uses Lean rather than Verus.

what shows it works

The source-level review records multiple issue types and retains only accepted or corrected items. At Lean level, 92.5% of candidate declarations were usable (Section 4.2, p. 7). The paper’s evaluation further shows that interactive repair matters: GPT-5.4 rises from 11.70% verified Lean accuracy under pass@32 to 44.00% in the agentic setting, where compiler diagnostics and tool calls guide repair (Section 5.1, p. 7). These are file-level rates over N = 778 instances containing 1,000 sorry blocks (Section 5, p. 7).

where it fails or assumes

Reviewers are LLM-based diagnostic signals, not the trusted kernel. Repair can oscillate, and unresolved dependencies or non-formalizable tasks remain excluded. The agentic comparison is not token-matched: pass@32 uses 0.26–0.70 million tokens per instance, while GPT-5.4/agentic uses about 1.96 million (Section 5.1, p. 8; Appendix D.5, p. 21).

## technique 4: strict execution-based proof evaluation

what it is

Proof success is counted only when all `sorry` blocks in a file are filled and the complete Lean file verifies. The agent receives the informal theorem, fixed Lean statement, and accepted local declarations; it may query Lean search, test fragments, inspect diagnostics, and iteratively repair. Final validation rejects `sorry`, `admit`, `axiom`, `sorryAx`, `exact?`, and `apply?`, and requires original names, statements, assumptions, and definitions to remain unchanged (Appendix D.5, p. 21).

how to do it

1. Give the solver the normalized theorem, fixed target, and local context (Appendix D.5, p. 21)
2. Permit compiler and search-tool interaction for bounded turns (Appendix D.5, p. 21)
3. Insert only a proof body beginning with `by`; do not rewrite the theorem statement (Appendix D.5, p. 21)
4. Recompile after each attempt and retain diagnostics (Appendix D.5, p. 21)
5. Accept only a complete, clean file under the prohibited-artifact and integrity checks (Appendix D.5, p. 21)

Verus form

Inference: evaluate a Verus Rust project at the function or module level while preserving source signatures and contracts. Run Verus on the complete project, reject unverifiable proof holes or external-body shortcuts for the function being verified, and report solved instances only when every required proof obligation passes. The exact forbidden-token list is Lean-specific; the preservation and whole-project principles transfer as an inference.

what shows it works

On 200 uniformly sampled instances with an 8-hour budget and local validation, M2F solved 143/200 (71.5%) and Aristotle 125/200 (62.5%) (Section 5.2, p. 8; Tables 10–11, p. 22). The paper states: “An instance is counted as solved only if it is completed within 8 hours, the returned Lean project recompiles locally, preserves the original theorem statements and existing definitions, and contains no pseudo-proof artifacts” (Section 5.2, p. 8). Failure attribution is measured with denominators: among 57 failed M2F instances, long-horizon decomposition affected 39/57 (68.4%); among 75 Aristotle failures, 52/75 (69.3%); pass@32 pooled failed proof blocks had 71.5% long-horizon failures (Table 1, p. 9).

## what is proved, trusted, and still open

Lean’s kernel checks the accepted declarations and completed proofs. The construction additionally trusts source extraction, retrieval, LLM naturalization, semantic reviewers, and the correctness of the benchmark’s recovered statements. The paper says formal assistants “provide a rigorous way to evaluate whether model generated mathematics is not only plausible, but mechanically verifiable” (Section 1, p. 2), but its own 92.5% semantic-review statistic is a diagnostic filter rather than a kernel theorem about source equivalence. Inference: VL must keep the requirement-to-contract link as a separate trust boundary; Verus can prove a Rust contract while the contract is still the wrong requirement.

The headline percentages use different denominators and settings. The 19.67% DeepSeek value is pass@32 file-level Lean accuracy over N = 778 instances; 44.00% is GPT-5.4 in an interactive, higher-token setting; 71.5% and 62.5% are external-agent rates on a uniform sample of 200 instances. The source funnel percentages are candidate-review pools, not proof success. The paper reports the 778-to-1,000 relation consistently: one exercise can yield multiple targets. No arithmetic contradiction is apparent in these stated fractions, but cross-setting comparisons would be misleading.

Inference: the product threat is substantial for agent-written verified Rust. A model may produce a plausible informal argument yet fail on API grounding, type discipline, missing infrastructure, or long proof trajectories. CAM-Bench’s pass@1 informal accuracy of 70.0–83.8% versus below-20% pass@32 Lean accuracy for the strongest non-agentic baselines (Section 5.1, p. 8) predicts a similar gap when VL agents move from prose to Verus. The mitigations are context recovery, frozen incremental construction, semantic review against requirements, compiler-guided repair, and strict whole-project validation. VL should not redo the paper’s benchmark-construction ideas unchanged; it should adapt them to Rust APIs, ownership, contracts, loop invariants, and dependency assumptions.

## techniques for the catalog

- recursive dependency expansion — recover referenced definitions and assumptions through bounded, provenance-tracked recursive retrieval, holding out unresolved dependencies
- semantic block decomposition — split heterogeneous requirements into typed definitions, algorithms, assumptions, and theorem blocks before formal generation
- frozen-context compilation repair — translate one block at a time against an immutable verified prefix and use compiler diagnostics for bounded local fixes
- semantic review with rejection control — re-review compilable artifacts, preserve repair history, and reject changes that alter assumptions, quantifiers, domains, or conclusions
- strict execution-based evaluation — count success only after complete project verification with original statements preserved and proof shortcuts rejected
Checked 2026-10-15 against paper long2026cam: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
