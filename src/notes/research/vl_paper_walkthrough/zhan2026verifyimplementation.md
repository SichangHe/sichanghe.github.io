# Verify Implementation Equivalence of Large Models
(authored by agents unless marked 🧑)
Tag: `zhan2026verifyimplementation`, [paper](https://www.semanticscholar.org/paper/55a3eab01a4c6dea45ab2558c7d512e6490e9634)

## problem and result

Zhan, Hu, Xia, and Li study equivalence checking when two implementations of the same large model use different operators, tensor layouts, fused kernels, and execution plans. Their Emerge framework captures HuggingFace Transformers and vLLM computation graphs, places both in a joint e-graph, discovers relations from execution values, synthesizes rewrite rules when existing rules fail, validates each rule with SMT or constraint-aware randomized testing, and propagates accepted equivalences by e-graph rebuilding. The abstract says: “Instead of writing rules manually, Emerge represents the two implementations in an e-graph, infers candidate relations from execution values, and synthesizes rewrite rules on demand when existing rules are insufficient.” (abstract, p. 1)

The paper’s central distinction is evidence strength. Rules whose semantics can be symbolically represented are formally proved with SMT. Opaque or fused operators are accepted only after constrained random tests and are labeled empirically validated. The authors report 10 of 13 known implementation bugs detected, 8 previously unknown issues found and confirmed by developers, and equivalence established for five correct model pairs, from GPT-2 70M to Mistral 12B (abstract, p. 1; Sections 5.2–5.4, pp. 8–9). This is implementation equivalence for exercised computation graphs, not a proof that the two programs agree on every input or unobserved branch.

## technique: construct a joint e-graph and maintain equivalence classes

Use this when two implementations have different graph structure but should compute the same function. Emerge models each computation graph as a DAG `G=(V,E)`, forms a joint graph with the union of nodes and edges, and maintains a node equivalence relation whose partitions are e-classes (Section 3.1, p. 3). Each e-class carries execution data and the relation set `R` of validated rewrite rules. The paper states: “Implementation Equivalence is a graph-level semantic notion: it asks whether two implementations realize the same function.” (Section 3.1, p. 3)

Steps from the paper:

1. Capture graph `G1` and graph `G2` from the two implementations (Section 3.1, p. 3; Section 4, p. 6).
2. Set `V=V1∪V2`, `E=E1∪E2`, initialize e-classes, attach concrete values from dynamic execution, and initialize `R` empty or with seed rules (Section 3.1, p. 3).
3. Propose candidate relations between e-classes, first try existing rules, and synthesize a rule if none applies (Section 3, p. 3).
4. Validate the rule before inserting it into `R`, merge the related e-classes, and rebuild until congruence reaches a fixpoint (Sections 3.4–3.6, pp. 5–6).
5. Declare equivalence when the designated output nodes share an e-class; otherwise stop at the iteration limit and localize the first unexplained mismatch (Sections 3.1 and 3.7, pp. 3, 6).

Verus form (Inference: Emerge is a graph equivalence checker, not a Rust verifier): represent each Rust implementation with an executable function and a mathematical `spec fn` model. Put the two models in a ghost representation, use `requires` to state input compatibility, and use `ensures` to state equality of outputs. A Verus proof function can establish equality through a sequence of helper lemmas and `assert` statements; e-classes have no direct Verus construct. For a data structure, ghost sets or maps can record abstract state, while executable Rust remains the object being verified. Inference: the product must verify each implementation against the same contract or prove a refinement relation; merging two syntax graphs alone does not establish Rust behavior.

Evidence: Emerge’s positive benchmark has five model families and establishes that output nodes are in one e-class for every pair. End-to-end times are 11.03 seconds for GPT-2 70M, 22.59 seconds for Qwen 0.5B, 147.99 seconds for Phi 3.8B, 148.33 seconds for Llama3 8B, and 350.09 seconds for Mistral 12B (Figure 3a, p. 8). The denominator is five full-model pairs, one per listed family, on one Intel Xeon Platinum 8358P CPU, 2 TB memory, one NVIDIA A800 80GB GPU, Ubuntu 20.04.6; each run permits at most two main verification iterations (Section 5.1, p. 7). Disabling any one of the key optimizations makes the complete benchmark exceed one hour (Section 5.3, p. 8). The result assumes captured graphs include the behavior of interest and that model pairs execute compatible inputs.

## technique: infer input relations from values with transformation witnesses

Use this when corresponding leaves have different names, layouts, or fused representations. Emerge first compares concrete values attached to e-classes with an absolute/relative tolerance of `10^-2` (Section 3.2, p. 4). Direct equality is insufficient for transpose, concatenation, or partitioning, so it searches a context-free transformation grammar:

`E → transpose(E,axis1,axis2) | concat(E,…,E,axis) | reshape(E,shapes) | split(E,size,axis)` (Section 3.2, p. 4).

Steps from the paper:

1. Compare the values of candidate e-classes `u` and `v` (Section 3.2, p. 4).
2. If they do not match directly, enumerate bottom-up expressions from the transformation grammar until one maps one value to the other (Section 3.2, p. 4).
3. Add the transformation as an auxiliary node; if the nodes are leaves, merge them directly, otherwise defer acceptance to rule application or synthesis (Section 3.2, p. 4).
4. Use natural inverses, such as `concat`/`split`, to search in one direction and obtain the reverse relation (Section 3.2, p. 4).

The running example infers `w1 ⇔ transpose(w2)` and later a shape-guarded relation `split(a,512,dim=2) ⇔ chunk(a,chunks=3,dim=-1)` when the shape satisfies `[i,3×512]` (Section 2, p. 2). Verus form (Inference): define mathematical sequence or matrix views with `spec fn`s, state shape and divisibility in `requires`, and prove a lemma that transpose/reshape/partition preserves the abstract value. Use `ensures` for the transformed result and loop `invariant`s for element-index traversal. Verus does not provide Emerge’s tolerance comparison or graph-generated auxiliary nodes; approximate floating-point equality requires a deliberately stated mathematical model and proof assumptions.

The paper’s specialized practical input matcher uses shape-compatible weights and embedding-table identity only to narrow candidates; final acceptance still goes through the core value-based relation inference (Section 4.1, p. 7). This preserves the claimed verification boundary while reducing candidate pairs. Inference: a VL implementation should treat heuristic matching as search guidance and never as proof evidence.

## technique: synthesize the most general rule by a shared abstraction frontier

Use this when two candidate e-classes have no applicable rule but their subgraphs depend on the same logical inputs. An abstraction frontier is a set of e-classes whose values jointly determine a target. Emerge recursively enumerates frontiers from a coarse `{n}` atom toward children, then takes the Cartesian product of frontier-pattern pairs for the two targets (Section 3.3, pp. 4–5). A pair yields a rule only when the frontiers are equal. Because enumeration proceeds coarse to fine, the first match is the most general candidate under the current graph.

Steps from Algorithm 2 (Section 3.3, pp. 4–5):

1. Enumerate `(S_u,p_u)` patterns for representative `u` and `(S_v,p_v)` for representative `v` (Algorithm 2, lines 2–3).
2. Iterate over their Cartesian product in coarse-to-fine order (lines 4–5).
3. When `S_u == S_v`, return `Rule(p_u,p_v)` (lines 5–6).
4. To enumerate one target, yield `({n}, Atom(n))`; recursively expand non-input operators through child patterns and form the union of child frontiers (lines 9–26).
5. If no shared frontier exists, reject synthesis for that pair (Section 3.3, p. 5).

The paper warns that stopping at an internal node produces an overly specific rule such as `linear(layernorm(a),transpose(c),b) ⇔ addmm(b,layernorm(a),c)`; expanding one step produces the more general `linear(a,transpose(c),b) ⇔ addmm(b,a,c)` (Section 3.3, p. 5). Verus form (Inference): choose the weakest sufficient abstraction for a lemma: quantify over abstract sequence/map inputs instead of concrete intermediate values, and expose the abstraction through `spec fn`s plus `ensures`. Use proof functions to connect the concrete body to that abstraction. Verus has no e-graph frontier enumeration; a VL agent could search candidate lemmas, but Verus must check each lemma and its call sites.

Evidence: across five full-model positive examples, Emerge synthesizes 86 rule instances corresponding to 54 unique rules; each model uses 14–21 rules, and 12 of the 54 recur in at least two models (Section 5.4.1, p. 9). Of the 86, 64 are SMT-formally verified and 22 empirically validated (Section 5.4.1, p. 9). These denominators are rule instances across the five benchmark pairs, not model outputs or bug cases.

## technique: validate rules with the strongest applicable evidence

Use this before any rewrite can merge e-classes. Emerge first rejects malformed or unsupported rules with a structural pre-check, classifies the remaining rule as Scalar-Logic, Tensor-Rearrangement, or Opaque-Heavy, and chooses validation accordingly (Section 3.4, p. 5). The paper says: “Only rules that pass this pre-check proceed to semantic validation.” (Section 3.4, p. 5)

For Scalar-Logic, lower arithmetic, Boolean, and bitwise expressions to SMT real/Boolean terms and ask the solver to prove the negation of equivalence unsatisfiable. For Tensor-Rearrangement, model tensor elements as distinct symbolic array variables, lower transpose/reshape/split/concat to index transformations, and prove element-wise equality under shape constraints (Section 3.4, p. 6). Rules proved by SMT receive the “formally verified” label.

For Opaque-Heavy rules, first solve inferred preconditions, then sample inputs satisfying shape, domain, and operator-specific constraints. Shape-aware generation enforces matrix alignment, reshape consistency, and chunk/split divisibility. Domain-aware sampling supplies admissible values for operators such as embedding and checks index bounds. Rules that have unsatisfiable preconditions are rejected rather than accepted vacuously (Section 3.4, p. 6). Passing this path gives the “empirically validated” label.

Verus form (Inference): map Scalar-Logic and Tensor-Rearrangement to `spec fn` definitions, `requires` shape/domain constraints, `ensures` equality, and proof functions that establish element-wise facts. Use loop `invariant`s for array-index bounds and `decreases` for termination where loops are involved. There is no sound Verus analogue of accepting a fused kernel from random tests; such a kernel must remain an explicitly trusted `external_body` boundary or be modeled and proved, and the target function itself should not be marked `external_body`. Inference: a VL gate should record formal and empirical evidence separately and never present the latter as a proof.

## technique: apply validated rules and rebuild to a fixpoint

Use this to propagate local equivalences through larger graphs. Rule application is candidate-driven: relation inference proposes `(u,v)`, then Emerge searches for a substitution from rule variables to e-classes. Matching is e-class-aware, so any representative in an e-class may match (Section 3.5, p. 6). Constants and operator parameters are syntactically matched rather than substituted. After each merge, rebuilding canonicalizes parent references, detects newly congruent parents, merges them onto a worklist, and refreshes execution values by re-executing affected operators (Section 3.6, p. 6).

Verus form (Inference): the analogue is modular proof composition. Prove a helper lemma for each local rewrite, then call it from a larger proof function; use `assert` to expose the equality needed by the next helper. Loop `invariant`s preserve the abstract relation while a worklist is processed. Verus’s borrow checker and specifications replace e-class congruence; there is no automatic graph rebuild. The executable graph and ghost model must stay aligned through explicit `ensures`.

## technique: localize failures at the earliest unmatched frontier

Use this when outputs do not merge. Emerge traces the mismatch backward through data dependencies, abstracts away nodes judged semantically transparent, and reports the earliest frontier with no cross-graph counterpart (Section 3.7, p. 6). This gives a likely root cause rather than only reporting different final tensors. In the known-bug study, six of ten detected bugs were localized exactly, three to the same functional block, and one farther downstream; three bugs were missed because data-dependent branches were not exercised or behavior lay outside graph extraction (Section 5.2.1, p. 8).

Verus form (Inference): use the first failed `assert` or unsatisfied `ensures` as a proof frontier, then walk backward through the call chain and ghost abstraction lemmas. Keep the smallest counterexample state and the exact failing obligation as the next agent context. This is a debugging workflow, not a Verus construct; Verus does not automatically compute Emerge’s “earliest unexplained mismatch.”

## evidence, assumptions, and product threat

For known bugs, the paper collected 13 independently fixed issues from vLLM and HuggingFace issue trackers, reproduced the faulty paths, and compared Emerge with TTrace under the same configurations (Section 5.2.1, p. 8). Emerge detected 10/13; TTrace detected 7/13. Emerge’s exact localization was 6/13, same-block localization 3/13, and downstream localization 1/13; the remaining three were missed (Section 5.2.1, p. 8). For eight newly discovered issues, two were already confirmed and patched, while the other six were confirmed by developers and had follow-up fixes under review (Section 5.2.2, p. 8). The abstract summarizes: “Our evaluation shows that Emerge establishes equivalence for correct implementation pairs at practical cost, while also providing useful by-products for debugging: it detects 10 of 13 known implementation bugs, uncovers 8 previously unknown implementation issues that were later confirmed by developers.” (abstract, p. 1)

The paper’s formal evidence covers only rules whose operator semantics are symbolically modeled. Twenty-two of 86 accepted rules rely on randomized tests; the authors state that such rules “may still be unsound, potentially leading to false equivalence.” (Section 6.1, p. 9) The execution-driven method can miss untriggered data-dependent branches, and the authors specifically mention Mixture-of-Experts routing and LongRoPE thresholds (Section 6.2, p. 9). Graph capture through TorchDynamo may omit behavior, and external validity beyond Transformers/vLLM is untested (Section 6.1, p. 9).

Inference: Verus can adopt Emerge’s search decomposition, abstraction-frontier idea, explicit evidence levels, and failure localization. It should replace graph equivalence with contracts over the actual Rust functions, preserve ownership and mutation facts, and accept a candidate only after Verus checks the unchanged implementation. Inference: threat to agent-written verified Rust is moderate to high for cross-implementation claims: Emerge’s SMT path resembles proof obligations, but empirical opaque-kernel checks and unexercised branches correspond to trusted assumptions in a Verus product. Inference: the product must not claim that a verified wrapper proves an opaque dependency; it should expose every `requires`, `ensures`, trusted external specification, and untested branch.

Inference: VL should not redo generic e-graph congruence or the observation that symbolic rewrites are stronger than random tests; this paper already gives an implementation and measured boundary. A useful remaining question is whether a Verus-specific equivalence agent can synthesize abstraction lemmas while keeping the two Rust bodies and their contracts in the same proof scope.

## techniques for the catalog

- joint e-graph equivalence — place two divergent computation DAGs in shared e-classes and merge outputs after validated relations
- value-guided transformation inference — discover transpose, reshape, concat, and split relations from execution values and constraints
- shared-frontier rule synthesis — enumerate common abstraction frontiers to produce the most general rewrite rule
- tiered rule validation — use SMT for symbolic operators and constrained random tests for opaque kernels, with evidence labels
- congruence rebuilding — propagate each accepted local merge through parent nodes until a fixpoint
- earliest-frontier localization — trace an unmatched output backward to the first unexplained cross-graph divergence

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
