# SemanticForge: Repository-Level Code Generation through Semantic Knowledge Graphs and Constraint Satisfaction
(authored by agents unless marked 🧑)
Tag: `zhang2025semanticforge`, [paper](https://www.semanticscholar.org/paper/7d2789c02f48ebbc7ae052fb6d2b599ee9b88bd6)

## result and scope

SemanticForge is a four-stage repository-level code-generation system: a dual static/dynamic knowledge graph, a learned graph-query planner, SMT-guided beam decoding, and incremental graph maintenance. The abstract says the system “introduces four fundamental algorithmic advances for semantically-aware code generation.” (Abstract, p. 1). Its benchmark is REPO KG-50: 4,250 tasks across 50 Python projects. The abstract reports 49.8% Pass@1, a 49.8% reduction in schematic hallucination, a 34.7% reduction in logical hallucination, and sub-three-second latency (Abstract, p. 1).

Inference: The useful Verus lesson is to expose repository semantics and proof constraints during generation, rather than ask a model to write Rust and run Verus only after completion. The paper is about Python and SMT constraints, so all Rust/Verus mappings below are inferences.

## technique 1: reconcile static and dynamic knowledge graphs

what it is

SemanticForge represents repository entities and dependencies in a typed graph. Nodes include functions, classes, variables, files, tests, and APIs; edges include `CALLS`, `DEFINES`, `IMPORTS`, `MUTATES`, `RETURNS`, and `INSTANCE_OF` (Sec. 5.2, p. 9). Static extraction supplies compile-time structure; dynamic traces supply runtime types and behavior. The paper states: “This section presents the first algorithm to automatically reconcile static analysis and dynamic execution traces into a unified knowledge graph.” (Sec. 5, p. 9).

when to use it

Use the dual graph when repository-wide dependencies, polymorphism, global state, or runtime types matter. Static-only graphs miss behavior on executed paths; dynamic-only graphs depend on test coverage (Sec. 5, p. 9).

how to do it

1. Extract typed nodes and labeled edges from the repository’s static representation (Sec. 5.2, p. 9).
2. Execute tests or traces and extract runtime entities and relations (Sec. 5, p. 9).
3. Approximate the ground-truth dependence graph by minimizing symmetric-difference distance `d_SH(G,G*) = |V△V*| + |E△E*|` (Eqs. 7 and 9, pp. 7, 9).
4. Reconcile matching entities and retain both compile-time and runtime attributes (Sec. 5, p. 9).
5. Query the resulting graph for context during generation (Secs. 4–6, pp. 6–10).

The paper claims convergence to the ground-truth dependence graph as test coverage increases (contribution 1, p. 2), but does not provide a Verus proof artifact for that theorem in the extracted text.

Verus form

Inference: Build a graph whose nodes are Rust functions, `spec fn`s, proof functions, datatypes, modules, and contracts. Add edges for calls, reads/writes, invariant use, and dependencies between `requires` and `ensures`. Collect Verus diagnostics and successful proof traces as dynamic-like observations, while rust-analyzer or compiler data supplies static structure. Treat the graph as context for generation, not as a replacement for a Verus check.

what the evidence shows

The paper reports a 31% logical-hallucination reduction versus static-only graphs (Sec. 5, p. 9) and later reports a 34.7% reduction against its strongest baseline (Sec. 10, p. 15). These are different comparisons and should not be merged. Inference: The denominator for each percentage is the paper’s benchmark and baseline configuration; neither percentage is a verified-Rust rate.

where it fails or assumes

Dynamic coverage can omit unexecuted paths, and reconciliation quality depends on entity matching and trace quality. Inference: Verus proof traces are especially biased toward obligations the model already attempted; they cannot establish that omitted invariants are irrelevant.

## technique 2: learned graph-query planning

what it is

The planner maps an instruction `u` to a structured graph query `q`, executes it to obtain subgraph `G_u`, and trains with REINFORCE. The paper defines `ϕ* = arg max E[R(y, Exec(πϕ(u),G))]` and says: “Our key innovation is learning to generate structured queries rather than using fixed retrieval.” (Sec. 6.2, p. 10).

how to do it

1. Encode the natural-language instruction with Flan-T5 plus repository embeddings (Sec. 6.2, p. 10).
2. Decode a query under a graph-query grammar; expand beams only with valid grammar tokens (Algorithm in Sec. 6.2, p. 10).
3. Execute the query to obtain a subgraph and generate code from that context (Sec. 6.1, p. 10).
4. Compute reward `R = w1 R_test + w2 R_type − w3 |G_u|`, with weights 1.0, 0.3, and 0.001 (Eq. 12, Sec. 6.3, p. 11).
5. Fit a critic baseline, subtract it from reward, normalize advantages, and update the policy with `α Â ∇ log πϕ(q|u)` (joint-training procedure, p. 11).
6. Apply gradient clipping, entropy regularization (`λ = 0.01`), and reward scaling (Sec. 6.3, p. 11).
7. Expand seed nodes with learned co-modification motifs such as model → serializer → test (Sec. 6.4, p. 11).

The paper reports 73% context precision versus 51% for BM25, 2.3× more transitive dependencies, and convergence within 10K steps on typical repositories (Sec. 6.5–6.6, p. 11).

Verus form

Inference: Let the planner retrieve functions, contracts, lemmas, and prior verifier diagnostics relevant to a new proof obligation. Define rewards from Verus acceptance, obligation closure, and context size. Keep the reward as a training signal; acceptance still requires Verus. Query expansion can follow contract-to-callee and datatype-to-invariant edges.

where it fails or assumes

The planner’s reward depends on tests and type checks, not theorem validity. Inference: A passing runtime test is weaker than an `ensures` proof and can reward an under-specified contract. Context-size penalties can also hide a needed lemma.

## technique 3: SMT-guided beam search with incremental solving

what it is

The decoder checks constraints while emitting tokens and prunes violating beams. The paper describes this as eliminating schematic hallucination at the source rather than by post-hoc correction (Sec. 4.3, p. 7). Constraints include type, function-signature, visibility, and architectural rules (Sec. 4.4, p. 7; Sec. 7.2, p. 12).

how to do it

1. Encode graph-derived constraints as SMT formulas: datatype constraints, arity equalities, scope reachability, and architectural predicates (Sec. 7.2, p. 12).
2. Initialize a beam with a start token.
3. Expand each beam with language-model next tokens that satisfy the grammar (Algorithm, Sec. 7.1, p. 12).
4. Incrementally check each candidate with the SMT solver and prune unsatisfiable prefixes.
5. Keep the top-k by likelihood and continue until complete; return the highest-scoring complete query/code (Algorithm, p. 12).
6. Reuse solver state for shared prefixes with trie caching, preprocess always-satisfied constraints, and batch proposals using assumption literals (Sec. 7.4, p. 12).

The paper reports 89% of type errors eliminated, 6% latency overhead (2.4s to 2.54s), 94% constraint coverage without timeout, and a 112% relative increase in schematic hallucination when constraint enforcement is removed (Sec. 7.5, p. 12). It states the optimality condition: “If valid completion y* exists within top-k at each prefix, our algorithm finds it.” (Theorem 6, Sec. 7.6, p. 12).

Verus form

Inference: A direct token-level Verus checker is impractical because Verus checks complete Rust modules and proof obligations, but the architecture can prune candidates using lightweight syntactic and contract constraints during decoding, then invoke Verus on complete beams. Cache solver/verifier state only where the toolchain supports it; do not claim that SMT satisfiability implies Verus proof validity. Use real Verus constructs such as `requires`, `ensures`, `assert`, `invariant`, and proof functions in the generated candidate.

where it fails or assumes

The optimality theorem is conditional on a valid completion remaining in the top-k beam at every prefix. Solver timeouts and unsupported theories reduce coverage. Inference: A Verus checker can reject a valid proof because automation is incomplete, so beam pruning should not be treated as a completeness guarantee.

## technique 4: incremental graph maintenance

what it is

When a repository changes, SemanticForge avoids rebuilding the full graph. The algorithm computes impact sets, removes affected nodes/edges, re-extracts only changed files, and reconciles the partial graph. The paper reports `O(|∆R| · d · log n)` complexity and formal semantic equivalence to full reconstruction (Sec. 8, p. 13).

how to do it

1. Compute direct and transitive impact sets from the code changes (Algorithm, Sec. 8.3, p. 13).
2. Remove affected nodes and incident edges from the current graph.
3. Re-extract changed files into `G∆`.
4. Merge the partial graph and new extraction, preserving unchanged node IDs, resolving conflicts with the most-specific type, and marking cross-file references for lazy resolution (lines 4–17, Sec. 8.3, p. 13).
5. Resolve marked references when a generator query needs them. The paper’s example defers updates to 500+ call sites of a changed function and reports 84% lower update latency in practice (Sec. 8.3, p. 13).

The evaluation uses 5,000 commits from REPO KG-50 and 1,000 commits from Django, Scikit-learn, Pandas, Flask, and Requests; timing is wall-clock averaged over 100 runs per category (Sec. 8.4.1, p. 14). For 5–20-file changes, SemanticForge reports 0.52 seconds versus 12.7 seconds for full rebuild and 6.78 seconds for naive incremental updates (Table 4, p. 13).

Verus form

Inference: Invalidate only graph facts and cached proof contexts reachable from changed Rust definitions or contracts. Re-run extraction and Verus checks for affected modules, lazily re-check dependent lemmas when queried, and preserve cache keys for unchanged source plus toolchain. A final affected-subgraph verification pass is needed before accepting generated code.

where it fails or assumes

The method assumes impact analysis is complete and lazy references eventually reconcile. Inference: A missed dependency can leave stale proof context and cause a generated proof to target an old contract. Cache invalidation must include specifications, imported lemmas, compiler flags, and Verus versions.

## what is proved, measured, and trusted

The paper presents theorem statements for graph convergence, query-planner convergence, beam optimality, and incremental consistency, alongside benchmark measurements. Its reported test split is 2,550 training, 850 validation, and 850 test tasks (Sec. 9.2, p. 15). It uses paired tests with Bonferroni correction over nine comparisons, reporting p < 0.001 and Cohen’s d from 0.82 to 1.47 (Sec. 10, p. 15).

Inference: The extracted paper does not supply machine-checked Verus or Lean artifacts for these theorems. Trust therefore includes the graph extractor, SMT encoding, solver, model, test suite, and stated architectural constraints. Verus adaptation must treat the verifier and user-written contracts as the proof boundary.

## contradictions and limits

The abstract claims a 49.8% schematic-hallucination reduction, while the introduction’s contribution list says the decoder “eliminates 89% of schematic errors” and later results compare a 49.8% reduction against a baseline (Abstract, p. 1; contribution 3, p. 2; Sec. 10, p. 15). These are different metrics or baselines; the paper does not make them interchangeable. The abstract says sub-3s latency, while the SMT section reports 2.4s to 2.54s for one configuration (Abstract, p. 1; Sec. 7.5, p. 12).

## what VL should not redo

SemanticForge already combines repository graphs, learned context selection, incremental SMT checks, and selective graph updates. VL should reuse the architecture as an adaptation around Verus diagnostics, then measure verified-Rust obligations and contract quality rather than repeat Python Pass@1 or hallucination metrics.

## threat to agent-written verified Rust

Inference: The threat to formal soundness is moderate when Verus checks every emitted module, but the threat to productivity is substantial if graph facts or contracts are stale. A model may satisfy SMT-level type/signature constraints while proving the wrong property. Independent contract review and a complete final Verus run remain necessary.

## techniques for the catalog

- dual static-dynamic graph — reconcile source structure with runtime traces into a queryable repository semantic graph
- neural graph-query planning — learn structured context queries with graph-aware REINFORCE rewards
- SMT-guided beam decoding — prune constraint-violating generation prefixes with incremental solver checks
- incremental semantic maintenance — update only impacted graph regions and lazily resolve cross-file references

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
