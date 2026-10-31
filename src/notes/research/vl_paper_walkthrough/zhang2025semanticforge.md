# SemanticForge: Repository-Level Code Generation through Semantic Knowledge Graphs and Constraint Satisfaction
(authored by agents unless marked 🧑)
Tag: `zhang2025semanticforge`, [paper](https://arxiv.org/abs/2511.07584)

## result and scope

SemanticForge is a four-stage repository-level code-generation system: a dual static/dynamic knowledge graph, a learned graph-query planner, SMT-guided beam decoding, and incremental graph maintenance (Sec. 4.1, p. 6). Its benchmark is REPOKG-50: 4,250 tasks across 50 Python repositories (Sec. 9.1, pp. 16–17). Table 8 reports 49.8% Pass@1 versus 34.2% for Code-Llama-34B and 42.3% for CodePlan: gains of 15.6 and 7.5 percentage points. It reports schematic hallucination rates of 14.7% versus GPT-4-Code’s 29.3%, and logical hallucination rates of 23.1% versus 35.4% (Table 8, p. 22). Sec. 10.1 reports the latter comparisons as relative reductions of 49.8% and 34.7% (p. 21). The abstract claims sub-three-second latency (p. 1); conflicting timing figures are discussed below. All results here are paper reports, not reproduced measurements.

Inference: The useful Verus lesson is to expose repository semantics and proof constraints during generation, rather than ask a model to write Rust and run Verus only after completion. The paper is about Python and SMT constraints, so all Rust/Verus mappings below are inferences.

## technique 1: reconcile static and dynamic knowledge graphs

what it is

SemanticForge represents repository entities and dependencies in a typed graph. Nodes include functions, classes, variables, files, tests, and APIs; edges include `CALLS`, `DEFINES`, `IMPORTS`, `MUTATES`, `RETURNS`, and `INSTANCE_OF` (Sec. 5.2, p. 8). Static extraction supplies compile-time structure; dynamic traces supply runtime types and behavior. The authors claim: “This section presents the first algorithm to automatically reconcile static analysis and dynamic execution traces into a unified knowledge graph.” (Sec. 5, p. 8). The formal objective is to minimize symmetric-difference distance from the ground-truth dependence graph: `d_SH(G,G*) = |V△V*| + |E△E*|` (Eqs. 7 and 9, p. 8).

when to use it

Sec. 5 describes complementary limits: static analysis cannot resolve polymorphic behavior or runtime types, while dynamic analysis may miss unexecuted paths (p. 8). Inference: Use the dual graph when these runtime distinctions affect repository-wide dependencies.

how to do it

1. Extract static repository structure through whole-program analysis, using the typed schema above (Secs. 5.2–5.3, p. 8).
2. Instrument tests to collect dynamic traces (Sec. 5.3, p. 8).
3. Merge the two analyses by refining polymorphic targets. Traces add edges and constraints that confirm or specialize static predictions (Sec. 5.3, pp. 8–9). The construction uses pylance and custom trace instrumentation (p. 9).
4. Query the resulting graph for context during generation (Sec. 6.1, p. 10).

The paper claims convergence to the ground-truth dependence graph as test coverage approaches 100%, referring the proof to supplementary material (Sec. 5.3, p. 9). That material was not checked.

Verus form

Inference: Build a graph whose nodes are Rust functions, `spec fn`s, proof functions, datatypes, modules, and contracts. Add edges for calls, reads/writes, invariant use, and dependencies between `requires` and `ensures`. Collect Verus diagnostics and successful proof traces as dynamic-like observations, while rust-analyzer or compiler data supplies static structure. Treat the graph as context for generation, not as a replacement for a Verus check.

what the evidence shows

Table 3 reports extraction times of 8.2 seconds for static analysis and 12.7 seconds for dual analysis on 100K lines of code; average edges increase from 48.2K to 63.1K (p. 9). Table 9 reports Pass@1 rising from 42.5% to 49.8% and logical hallucination falling from 35.5% to 23.1% when dynamic analysis is included (p. 22): changes of 7.3 and 12.4 percentage points. Sec. 5 separately claims a 31% logical-hallucination reduction versus static-only approaches (p. 8). Inference: That claim does not match Table 9’s relative reduction, and none of these measurements establishes a verified-Rust success rate.

where it fails or assumes

Dynamic coverage can omit unexecuted paths (Sec. 5, p. 8). Inference: Reconciliation also depends on correct entity matching and trace collection. Verus diagnostics describe attempted obligations; they cannot establish that omitted invariants are irrelevant.

## technique 2: learned graph-query planning

what it is

The planner maps an instruction `u` to a structured graph query `q`, executes it to obtain subgraph `G_u`, and trains with REINFORCE. The paper defines `ϕ* = arg max E[R(y, Exec(πϕ(u),G))]` (Eq. 8, p. 8) and says: “Our key innovation is learning to generate structured queries rather than using fixed retrieval.” (Sec. 6.2, p. 10).

how to do it

1. Encode the natural-language instruction with Flan-T5 plus repository embeddings (Sec. 6.2, p. 10).
2. Decode a query under a graph-query grammar; expand beams only with valid grammar tokens (Algorithm in Sec. 6.2, p. 10).
3. Optimize the query through predicate pushdown and traversal elimination, then execute it to obtain a subgraph and generate code from that context (Secs. 6.1–6.2, p. 10).
4. Compute reward `R = w1 R_test + w2 R_type − w3 |G_u|`, with weights 1.0, 0.3, and 0.001 (Eq. 12, Sec. 6.3, p. 11).
5. Fit a critic baseline, subtract it from reward, normalize advantages, and update the policy with `α Â ∇ log πϕ(q|u)` (joint-training procedure, p. 11).
6. Apply gradient clipping, entropy regularization (`λ = 0.01`), and reward scaling (Sec. 6.3, p. 11).
7. Expand seed nodes with learned co-modification motifs such as model → serializer → test (Sec. 6.4, p. 11).

Training starts with 10K synthetic instruction-query pairs derived from static dependencies (Sec. 6.3, p. 11). Eq. 12 adds `R_type` with a positive coefficient, although the accompanying text says it measures “type violations (0-1)” (p. 11). Inference: The intended direction of that reward component is unclear; the formula should not silently be rewritten as a type-correctness reward.

The paper reports 73% context precision versus 51% for BM25, 2.3× more transitive dependencies, and convergence within 10K steps on typical repositories (Sec. 6.5–6.6, p. 11).

Verus form

Inference: Let the planner retrieve functions, contracts, lemmas, and prior verifier diagnostics relevant to a new proof obligation. Define rewards from Verus acceptance, obligation closure, and context size. Keep the reward as a training signal; acceptance still requires Verus. Query expansion can follow contract-to-callee and datatype-to-invariant edges.

where it fails or assumes

Eq. 12 uses tests, a type-related reward, and context size (p. 11). Inference: A passing runtime test cannot establish an `ensures` proof and can reward an under-specified contract. Context-size penalties can also hide a needed lemma.

## technique 3: SMT-guided beam search with incremental solving

what it is

The decoder checks constraints while emitting tokens and prunes violating beams. The paper describes this as eliminating schematic hallucination at the source rather than by post-hoc correction (Sec. 4.3, p. 7). Constraints include type, function-signature, visibility, and architectural rules (Sec. 4.4, p. 8; Sec. 7.2, p. 12).

how to do it

1. Encode graph-derived constraints as SMT formulas: types use algebraic datatypes, signatures use uninterpreted functions, visibility uses graph reachability, and architectural patterns use custom predicates (Sec. 7.2, p. 12).
2. Initialize the beam with an empty sequence and a satisfiable constraint state (Sec. 7.3, p. 12).
3. Expand each beam with the language model’s proposed next tokens.
4. Add the extended prefix’s constraints to its solver state. Retain a candidate only if Z3 reports satisfiable (Sec. 7.3, p. 12).
5. Keep the top-k candidates by score and continue until all beams are complete (Sec. 7.3, p. 12). The implementation uses beam width five (Sec. 9.4, p. 19).
6. Reuse solver state for shared prefixes with trie caching, preprocess always-satisfied constraints, and batch proposals using assumption literals (Sec. 7.4, p. 12).

The paper reports 89% of type errors eliminated, 6% latency overhead (2.4s to 2.54s), and 94% constraint coverage without timeout (Sec. 7.5, p. 13). Table 9 reports schematic hallucination rising from 14.7% to 31.2% when constraint enforcement is removed (p. 22), approximately a 112% relative increase. Theorem 6 conditions its search guarantee on a valid completion remaining within the top-k at every prefix (Sec. 7.6, p. 13).

Verus form

Inference: Adapt the architecture by pruning candidates with lightweight syntactic and contract constraints, then invoking Verus on complete modules. Cache solver/verifier state only where the toolchain supports it; SMT satisfiability alone does not establish a Verus proof. Candidate code can use `requires`, `ensures`, `assert`, `invariant`, and proof functions. This adaptation was not evaluated in the paper.

where it fails or assumes

The beam condition above limits the guarantee. Sec. 11.4 states: “The 100ms timeout prevents blocking but may allow constraint violations in edge cases.” (p. 29). Inference: That qualification limits the earlier unconditional correctness claims. A Verus adaptation also needs to distinguish an invalid candidate from a proof that automation cannot establish.

## technique 4: incremental graph maintenance

what it is

When a repository changes, SemanticForge avoids rebuilding the full graph. The algorithm computes impact sets, removes affected nodes/edges, re-extracts only changed files, and reconciles the partial graph. The paper reports `O(|∆R| · d · log n)` complexity and formal semantic equivalence to full reconstruction (Sec. 8, p. 13).

how to do it

1. Compute direct impact using AST semantic differences, then transitive impact using dependency types. Type changes propagate transitively; implementation changes often remain local (Sec. 8.2, p. 13).
2. Remove affected nodes and incident edges from the current graph.
3. Re-extract changed files containing directly impacted entities into `G∆` (Sec. 8.3, p. 14).
4. Merge the partial graph and new extraction, preserving unchanged node IDs, resolving conflicts with the most-specific type, and marking cross-file references for lazy resolution (Sec. 8.3, p. 14).
5. Resolve marked references when a generator query needs them. The paper’s example defers updates to 500+ call sites of a changed function and reports 84% lower update latency in practice (Sec. 8.3, p. 14).

The evaluation uses 5,000 commits from REPOKG-50 and 1,000 commits from Django, Scikit-learn, Pandas, Flask, and Requests; timing is wall-clock averaged over 100 runs per commit-size category (Sec. 8.4.1, p. 14). For 5–20-file changes, SemanticForge reports 0.52 seconds versus 12.7 seconds for full rebuild and 6.78 seconds for naive incremental updates (Table 4, p. 14).

Verus form

Inference: Invalidate only graph facts and cached proof contexts reachable from changed Rust definitions or contracts. Re-run extraction and Verus checks for affected modules, lazily re-check dependent lemmas when queried, and preserve cache keys for unchanged source plus toolchain. A final affected-subgraph verification pass is needed before accepting generated code.

where it fails or assumes

The semantic-equivalence proof sketch relies on updating all affected entities and eventual consistency for cross-references (Theorem 8, Sec. 8.5, p. 16). Inference: A missed dependency can leave stale proof context and cause a generated proof to target an old contract. Cache invalidation must include specifications, imported lemmas, compiler flags, and Verus versions.

## what is proved, measured, and trusted

The paper claims graph convergence with increasing test coverage (Sec. 5.3, p. 9), states query-planner convergence and complexity results (Theorems 4–5, p. 11), and states conditional beam optimality and complexity results (Theorems 6–7, p. 13). Incremental semantic equivalence and `O(|∆R| · d · log n)` complexity have proof sketches (Theorems 8–9, p. 16). These are claims and mathematical arguments, not machine-checked proofs inspected here.

The reported split is 2,550 training, 850 validation, and 850 test tasks; Code-Llama-34B remains frozen while the planner trains (Sec. 9.1, p. 17). Sec. 10.1 reports paired t-tests with Bonferroni correction over nine comparisons, p < 0.001, and Cohen’s d from 0.82 to 1.47 (p. 21). SWE-agent was not evaluated experimentally (comparison limitations, p. 4). Sec. 9.1 promises public data and code upon acceptance (p. 17); availability was not checked.

Inference: A Verus adaptation must account for errors in graph extraction, SMT encoding, models, tests, and architectural constraints. Its proof boundary must remain the verifier and the contracts actually checked.

## contradictions and limits

The introduction says the decoder “eliminates 89% of schematic errors” (innovation 3, p. 2), whereas Sec. 7.5 reports 89% of type errors eliminated (p. 13). Table 8’s aggregate schematic-hallucination comparison against GPT-4-Code supports the separate 49.8% relative reduction (p. 22). Inference: These statements cannot establish one interchangeable error-reduction figure.

Timing reports differ: Table 8 gives 2.4 seconds and 13.9GB (p. 22), while Table 13 gives 2.50 seconds and 14.2GB, including 0.23 seconds for SMT checking, described as 13.5% overhead over base generation (p. 26). Sec. 7.5 gives 6% decoder overhead (p. 13), and Sec. 10.2 gives 8.3% (p. 22). The paper does not reconcile these overhead figures.

The main split specifies 20% validation (Sec. 9.1, p. 17), but baseline tuning specifies 10% (Sec. 9.3, p. 19). Sec. 10.2 calls a combined 14.6-percentage-point degradation super-additive despite single-component losses summing to 16.2 (p. 23). Inference: Those numbers do not support that interaction claim. Theorem 9 gives update complexity `O(|∆R| · d · log n)` (p. 16), whereas Table 2 gives `O(|∆R|)` (p. 7).

The authors identify remaining algorithmic-reasoning limitations, context-window constraints, test-suite dependence, and SMT timeouts (Secs. 11.3–11.4, p. 29). Inference: Structural constraint satisfaction should not be presented as full functional correctness.

## threat to agent-written verified Rust

Inference: Stale graph facts can waste proof attempts, and SMT-level type/signature constraints do not establish that a contract expresses the intended property. Review contracts and run Verus on the final code. This paper provides no evidence for assigning a numerical or qualitative risk level to verified Rust.

## techniques for the catalog

- dual static-dynamic graph — reconcile source structure with runtime traces into a queryable repository semantic graph
- neural graph-query planning — learn structured context queries with graph-aware REINFORCE rewards
- SMT-guided beam decoding — prune constraint-violating generation prefixes with incremental solver checks
- incremental semantic maintenance — update only impacted graph regions and lazily resolve cross-file references
