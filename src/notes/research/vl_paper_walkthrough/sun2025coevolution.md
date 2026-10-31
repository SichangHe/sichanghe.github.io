# Co-Evolution of Types and Dependencies: Towards Repository-Level Type Inference for Python Code
(authored by agents unless marked 🧑)
Tag: `sun2025coevolution`, [paper](https://arxiv.org/abs/2512.21591)

## problem and evidence

PyTIR infers Python type annotations across an entire repository. Its central data structure is an Entity Dependency Graph (EDG); its core loop repeatedly refines both the graph and inferred types, then validates annotations with a static type checker. The paper states: “PyTIR constructs an Entity Dependency Graph (EDG) to model the objects and type dependencies across the repository.” (abstract, p. 1) It evaluates 12 repositories selected from TypyBench, with developer-authored annotations as ground truth and pre-existing type errors masked before inference (§4.1.2, p. 12).

The default system uses DeepSeek-V3, a five-entity cluster limit, up to three LLM attempts per entity, PyAnalyzer for AST-based dependency extraction, and Mypy for validation (§3.2.3, p. 8; §3.5.1, p. 10; §4.1.1, pp. 11–12). Overall TypeSim is .89 and TypeExact .84; the paper reports 27.1% improvement over TIGER's .70 TypeSim and 40% relative improvement over the strongest baseline in the abstract (Table 3 and §4.2, pp. 13–16). It reports 554 introduced Mypy errors aggregated over 12 repositories, versus 2,654 for HiTyper and 8,577 for TIGER (Table 2, p. 15). The paper's abstract says PyTIR “removed new type errors introduced by the tool by 92.7%,” but the detailed comparison to HiTyper is 79.1% (2,654 to 554), so the paper does not reconcile these percentages. Inference: the 92.7% claim should not be treated as the reduction against HiTyper.

## technique 1: Entity Dependency Graph construction

what it is: EDG is a directed graph `G=<V,E>` whose nodes are repository-visible variable, function, and class entities, and whose edges represent inter-entity type dependencies (§3.2, pp. 7–9). The approach lifts variable-occurrence dependencies to repository entities. Function parameters and return values form one function entity; local variables and nested functions are not explicit annotation targets, and class entities supply context without requiring annotation (§3.2.1, pp. 7–8).

how to do it:

1. parse repository files into ASTs and identify module variables, class attributes, functions/methods, and user-defined classes (§3.2.1–§3.2.3, pp. 7–9)
2. extract edges with four patterns: call, access, inheritance, and definition dependencies (§3.2.2, p. 8)
3. use PyAnalyzer to locate accessed objects while analysing each statement (§3.2.3, p. 8)
4. leave dependencies that cannot yet be resolved for discovery during later EDG refinement (§3.2.3, p. 9)

The paper defines call edges from a variable/function to a called function, access edges to a read variable, inheritance edges between subclass and superclass, and definition edges from a variable to the function assigning it (§3.2.2, p. 8). It acknowledges that pattern extraction can add superfluous edges and miss edges; the authors claim that LLM attention tolerates the former and refinement progressively recovers the latter (§3.2.2, p. 8).

Verus form (Inference: the paper targets Python, not Verus): build an immutable graph in Rust with a `spec fn` describing edge validity and node identity. Use `requires` for valid node indices and `ensures` for insertion preserving acyclicity only where the operation claims it. A proof function can establish that each recorded edge refers to an existing node and that a finite edge set matches the declared dependency pattern. Dynamic Python behaviour, reflection, and PyAnalyzer's soundness remain outside that proof.

evidence and limits: The motivating Flask example required a missing usage-definition dependency before the type of `f` could be inferred (§2.2, p. 6). The evaluation covers 12 repositories with 163 to 1,980 entities each (Table 1, p. 12), not arbitrary Python ecosystems. Inference: EDG is a useful context index for verified Rust repositories, but a Verus product would need a language-specific dependency model and a proof that extraction covers every relevant call and alias.

## technique 2: SCC collapse, bounded clusters, and topological contexts

what it is: PyTIR converts the EDG to a DAG by collapsing mutually dependent entities into strongly connected-component (SCC) clusters, then limits cluster size to five entities for LLM context windows (§3.3, p. 9).

how to do it:

1. compute maximal SCCs in the EDG with networkx (§3.3.1, p. 9)
2. collapse each SCC into an entity cluster, yielding a DAG (§3.3.1, p. 9)
3. if a cluster exceeds five entities, greedily remove internal edges whose removal splits the SCC until the size bound holds (§3.3.1, p. 9)
4. remove already annotated entities and select in-degree-zero clusters as current targets (§3.3.2, p. 9)
5. process targets in topological order so dependent annotations are available as context (§3.1, p. 7; §3.3.2, p. 9)

Verus form (Inference): represent clusters as a finite sequence and prove that each selected target has no unannotated predecessor in the residual DAG. Termination of a fixed-DAG worklist would require a decreasing count of unannotated nodes; this alone does not cover later edge additions or annotation invalidations. The greedy edge-removal heuristic intentionally loses some dependency information; Verus can prove the algorithm's stated bound, not that removed edges are semantically irrelevant.

The paper defines an edge `e → f` when `e` depends on `f`, but selects clusters with “in-degree zero” (§3.2.2, p. 8; §3.3.2, p. 9). Inference: dependency-first traversal requires reversing those edges or selecting zero out-degree under that definition; the prose does not explain this convention.

evidence: All repositories had more than 50% of entities annotated within five iterations and more than 80% within 30 iterations (§4.5, pp. 16–17). The average completion time was 3.56 hours per repository (§4.5, p. 17). The paper says edge removal “marginally reduces inference accuracy while preserving critical dependency relationships” (§3.3.1, p. 9), but does not give a separate ablation for the five-entity bound.

## technique 3: co-evolutionary EDG refinement and type generation

what it is: In each iteration, the LLM first identifies missing dependency edges, then generates types only for clusters whose dependencies are complete. New edges and conflict-free annotations update the EDG (§3.1, pp. 6–7; §3.4, p. 10).

how to do it:

1. construct a compact context containing cluster definition code and current dependency annotations (§3.4.1, p. 10)
2. ask the LLM whether the context is sufficient and to name missing dependencies (§3.4.1, p. 10)
3. defer type generation for clusters where missing dependencies were identified (§3.4.2, p. 10)
4. for clusters with no identified missing dependencies, prompt the LLM to emit type annotations using a fixed template (§3.4.2, p. 10)
5. validate generated annotations, then update the EDG with the discovered edges and validated types; repeat until all nodes have inferred annotations, as specified by the overview (§3.1, p. 7)

The Flask example illustrates the order: inferring `ctx` as `RequestContext` exposes the missing dependency to `RequestContext._after_request_functions`; the completed chain then permits the type of `f` (§2.2, pp. 5–6).

Verus form (Inference): model type facts and dependency facts as ghost state associated with graph nodes. Track discovered dependencies and checker-accepted annotations explicitly. Any proof of progress would need to account for new edges and invalidated annotations; the paper supplies no decreasing measure for this changing graph. Keep emitted types in a checked representation rather than trusting free-form strings. An abstract worklist proof would still not establish that an LLM discovered every missing edge.

evidence: Removing EDG information while retaining conflict resolution produced TypeExact=.81 and 659 errors; full PyTIR reached .84 and 554 errors (Table 3, p. 16). The dependency-only ablation without fixing reached TypeExact=.81 but 3,478 errors, showing that context without validation is insufficient (§4.4, p. 16).

## technique 4: checker-in-the-loop validation and backtracking repair

what it is: Every generated annotation is applied to a working copy and checked with Mypy. A reported conflict causes immediate reversion, targeted re-inference, and backtracking; persistent failures fall back to `Any` (§3.5, pp. 10–11).

how to do it:

1. add one generated annotation to a copy of the unannotated repository (§3.5.1, p. 10)
2. run Mypy; if it reports an error, flag the newly added annotation and revert it (§3.5.1, p. 10)
3. retract the suspected source and re-infer it with the Mypy diagnostic (§3.5.2, pp. 10–11)
4. handle parameter/call-site conflicts by narrowing permissive types or invalidating restrictive annotations (§3.5.2, p. 11)
5. handle superclass/subclass signature conflicts by invalidating and re-inferring the parent with the child constraint (§3.5.2, p. 11)
6. feed other raw errors back to the LLM until conflict-free or the threshold is reached (§3.5.2, p. 11)
7. replace an unresolvable annotation with `Any` as a conservative final fallback (§3.5.2, p. 11)

evidence: PyTIR introduced 554 errors over all 12 repositories: 543 assignment, 6 var-annotated, and 5 other errors; it reported zero arg-type, attr-defined, return-value, call-arg, override, and name-defined errors (Table 2, p. 15). The authors explain that assignment and var-annotated categories were excluded during iterative refinement because they often reflect missing annotations (§4.3, p. 15). Inference: the zero counts do not mean all semantic errors disappeared; some classes were deliberately suppressed or treated as incomplete information.

## technique 5: component and model ablations

what it is: The study separates EDG extraction, conflict repair, and LLM choice with four variants: no strategies, no dependency extraction, no fixing, and DeepSeek-R1 instead of DeepSeek-V3 (§4.1.4, p. 13; §4.4, p. 16).

how to apply it:

1. run a native isolated-snippet baseline
2. add checker/backtracking without EDG
3. add EDG without conflict fixing
4. run the complete pipeline
5. optionally substitute a reasoning model and report accuracy, introduced errors, and cost (§4.4, p. 16)

Verus form (Inference): maintain separate proof modules for graph extraction, candidate contracts, and repair policy, then run verification with each module disabled to attribute failures. This is an experimental decomposition, not a Verus language construct.

evidence: DeepSeek-R1 reduced introduced errors from 554 to 335 while TypeExact changed from .84 to .83 (Table 3, p. 16). The paper reports a higher computational cost for R1 but no wall-clock denominator for that comparison (§4.4, p. 16). Inference: the R1 configuration produced fewer reported Mypy errors here, while exact-match accuracy was slightly lower; this comparison alone does not establish the cause.

## what is proved, measured, and trusted

The paper measures type similarity, exact identity, Mypy errors, iterations, and time against developer-authored annotations. It does not formally prove that the inferred annotation matches runtime semantics. Trusted inputs include ground-truth repository annotations, PyAnalyzer and Mypy, model outputs, AST extraction, and the decision to suppress selected Mypy error categories. The benchmark starts from sanitized repositories with `# type: ignore` inserted for pre-existing errors (§4.1.2, p. 12), so real repositories with legacy defects may behave differently (§5, pp. 17–18).

The abstract’s 92.7% claim is not reconciled with the detailed 79.1% reduction against HiTyper. Table 2 also has an internal inconsistency: its TypeGen error rows sum to 8,577 and its Tiger rows sum to 5,202, while the total row assigns 5,202 to TypeGen and 8,577 to Tiger (p. 15).

## techniques for the catalog

- Entity Dependency Graph — model repository-visible objects and inter-procedural type constraints as graph nodes and edges
- SCC clustering and topological contexts — collapse cycles, bound cluster size, and infer nodes whose dependencies are ready
- co-evolutionary refinement — alternate missing-edge discovery and type generation until all annotation targets are processed
- checker-in-the-loop backtracking — apply one annotation, run a static checker, revert conflicts, and re-infer with diagnostics
- component ablation — separate dependency context, conflict repair, and model choice to measure each contribution
