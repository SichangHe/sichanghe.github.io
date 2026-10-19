# The Tactician’s Web of Large-Scale Formal Knowledge
(authored by agents unless marked 🧑)
Tag: `blaauwbroek2024tactician`, [paper](https://arxiv.org/abs/2401.02950v2)

## what the paper provides

Blaauwbroek presents Tactician’s Web, a platform that exports Coq developments as synchronized text and semantic-graph data, records tactic proof states and actions, and lets agents suggest or execute tactics through Coq. The abstract says: “The Tactician’s Web is a platform offering a large web of strongly interconnected, machine-checked, formal mathematical knowledge conveniently packaged for machine learning, analytics, and proof engineering.” (Abstract, p. 1). The paper is infrastructure and representation research; it does not claim a new theorem prover or a proof of Rust programs.

Inference: for VL, the central reusable idea is to make the verifier’s exact semantic state available as structured training and retrieval data, while preserving a live checker connection. The Verus forms below are adaptations, not claims made by this Coq paper.

## technique 1: represent kernel terms as a semantic graph

What it is. The authors translate Coq’s kernel-level Calculus of Inductive Constructions (CIC) terms into an unordered directed graph with labeled nodes and labeled edges. Edges replace ordered child positions, and global definitions are direct references rather than names. Bound-variable references point to their binders, so alpha-equivalent terms can share structure. The target translation `f` is injective modulo chosen equivalences (Section 2.1, pp. 5–7).

The motivation is explicit: “Such an encoding also eliminates the need for an implicit algorithm to determine if two terms are equal (α-conversion). Two terms are equal if and only if their graph encodings are equal (bisimilar).” (Section 1, p. 2). The graph includes implicit arguments for regularity, collapses the universe hierarchy to `Set`, `Prop`, `SProp`, and one `Type`, and intentionally favors a small kernel language over user-facing notations (Section 2.1, pp. 5–7).

Steps from the paper:

1. Start from Coq’s elaborated kernel representation, rather than surface notation (Section 2.1, pp. 5–6).
2. Create labeled nodes for CIC constructs and labeled edges for each child role (Section 2.1, p. 5).
3. Replace local binder names with explicit binder edges and direct global-definition references (Section 1, pp. 2–3; Section 2.1, pp. 6–7).
4. Apply local-name invariance, universe collapse, and equality of type-casting strategies; do not identify terms modulo beta-reduction (Section 2.1, pp. 6–8).
5. Require injectivity modulo those equivalences; not every graph must decode to a valid term (Section 2.1, p. 6).

Verus form: Inference: define a typed graph model with ghost `Seq`/`Map` values and a `spec fn` that maps a Rust expression or proof-state record to its graph. Use `proof fn` lemmas to establish that alpha-renaming leaves the model unchanged and that references resolve to the intended definition. Inference: Verus’s Rust AST and verifier state are not Coq CIC; a graph is an external index, not a replacement for Verus’s own checked specification.

Limits. Kernel graphs omit non-kernel features such as typeclass and hint-database behavior (Section 6, pp. 41–42). Universe collapse is intentionally inconsistent as a full type theory, even though the author expects recovery in many applications (Section 2.1, p. 7). Fixpoint translation also drops the structurally decreasing parameter; the paper says: “Different choices can lead to changes in the reduction behavior of the fixpoint, and hence this translation loses a marginal amount of information.” (Section 2.4, p. 15). Inference: a VL graph must record omissions explicitly rather than imply semantic completeness.

## technique 2: preserve global context with a meta-graph

What it is. A proof depends on which definitions and imports were available at the moment it was compiled. Tactician stores chronological predecessor pointers and additional pointers to representatives of files loaded between definitions. Sections and module functors create branches in this abstract time; derived definitions point back to their origins (Section 2.6, pp. 19–22). The paper states: “Instead, each definition contains a pointer to the definition that chronologically precedes it, such that the global context can be recovered by following this sequence of pointers to the end.” (Section 2.6, p. 19).

Steps from the paper:

1. Record each definition’s preceding global-context pointer (Section 2.6, p. 19).
2. Add pointers to imported-file representatives so the context can be reconstructed (Section 2.6, p. 19).
3. When closing a section, retain both the open branch and discharged-definition branch and link derived definitions to originals (Section 2.6, pp. 20–21).
4. Do the same for module functors and each instantiation (Section 2.6, pp. 21–22).
5. Recover the available definitions by following global-context pointers; definitions transitively referenced through a definition's body must be available in its context (Section 2.6, pp. 19–20).

Verus form: Inference: key each retrieved proof artifact by Verus version, module imports, trait implementations, specifications, and external assumptions. Store a ghost or external dependency DAG and require a proof candidate to resolve every referenced item in the current context. Inference: ordinary source-file names are insufficient because dependency revisions can preserve names while changing contracts.

Evidence and risk. The paper warns that section/module derivations can cause data leakage and says randomized train/test splits are discouraged (Section 2.6, pp. 20–22). It states: “Instead, one should choose a split such that it is obvious that none of the training data depends on the testing data.” (Section 2.6, p. 20, footnote 7). Roughly half of the 520k definitions in the released corpus are derived through sections or modules (Section 4.2, p. 37, footnote 14). Inference: VL should split by dependency ancestry and account for derived copies rather than split random examples.

## technique 3: hash-share bisimilar subgraphs

What it is. Nodes receive identity hashes designed to agree exactly when their graphs are bisimilar, modulo hash collisions. Semantic, meta, and physical hashes respectively include CIC structure, global context, and filename. Shared subgraphs reduce storage and let an agent recognize repeated proof-state structure (Section 2.7, pp. 22–23).

Steps from the paper:

1. Compute bisimulation-respecting identity hashes; the paper refers to a separate publication for its `O(n log n)` algorithm (Section 2.7, p. 23).
2. Share subgraphs only across dependency-compatible files for a modular dataset (Section 2.7, p. 22).
3. Use semantic identity for term equivalence, meta identity for context-sensitive identity, and physical identity for dataset deduplication (Section 2.7, p. 23).
4. Use hashes for exact-state lookup or an oracle that returns a previously recorded action (Section 2.7, p. 22).

Evidence. In the Coq standard library, sharing reduces 157 million unshared nodes to 18.3 million, an 88.3% reduction, and edges from 294 million to 40.8 million (Section 5, pp. 39–40). The reported reductions are 85% within definitions, another 2% within compilation units, and another 1.3% across dependent units. The paper states: “Finally, allowing graph-sharing between all compilation units that depend on each other results in another 1.3% size reduction for a total reduction of 88.3% to 18.3 million nodes.” (Section 5, p. 40).

Verus form: Inference: hash normalized verified Rust obligations together with module context and verifier version, then retrieve exact prior proofs as candidates. Keep hash identity a cache key rather than a correctness claim; Verus must recheck after dependency changes. Inference: filename-sensitive identity is useful for avoiding accidental cross-project aliasing but cannot establish semantic equivalence.

## technique 4: model tactic proofs as state transitions

What it is. A Coq tactic script is represented as proof steps. Each step executes a tactic on a focus of unshelved proof states. For each focused state, an outcome records the starting state, tactic, generated proof term, and zero or more resulting states. Tactics are split into an opaque base tactic and kernel-term arguments; the base may be a compound expression. The simplified model assumes shelved states are solved as side effects. A proof is complete when no open proof state remains (Section 3.1, pp. 24–27).

The paper states: “We represent a tactical proof as a sequence of proof steps.” (Section 3.1, p. 27). It also states: “The proof states and proof term are represented in the data both in textual and graph format.” (Section 3.1, p. 27).

Steps from the paper:

1. Represent the current set of open proof states, distinguishing unshelved and shelved states (Section 3.1, pp. 24–25).
2. Choose a tactic focus through bullets, inherited focus, or selection (Section 3.1, p. 25).
3. Execute the tactic and record its generated term and child states for each outcome (Section 3.1, p. 27).
4. Retain the original execution order. Steps can be reordered according to the refinement partial order only when no shelved states are refined as side effects (Section 3.1, p. 28).

Verus form: Inference: model each Verus proof obligation and `assert`/`proof fn` invocation as a transition whose post-state is the remaining obligation set. A proof artifact should retain the diagnostic state before and after each accepted step. Inference: Verus checks whole Rust modules rather than exposing Coq-style mutable proof-state capabilities, so this transition model is an external search representation.

## technique 5: instrument and decompose tactics

What it is. Tactician inserts a recording tactical recursively into tactic expressions. It captures atomic behavior while treating control combinators such as focus restriction, `try`, and fallback as structural operations. Static decomposition expands syntactic sugar; dynamic decomposition records the branch selected by matching the current proof state. A final optional pass removes supplied names for new hypotheses so Coq generates them (Section 3.2, pp. 29–35).

Steps from the paper:

1. Recursively insert an instrumentation tactical into tactic expressions; failed branches leave no recorded execution in the proof tree (Section 3.2, pp. 29–31).
2. Record input states, output states, and generated proof terms; represent tactics by a base and graph arguments where supported (Sections 3.1–3.2, pp. 27–30).
3. Expand simple syntactic sugar such as `now` and intro patterns using rewrite rules (Section 3.2.1, pp. 31–33).
4. For dynamic scripts, record the selected tactic after substituting variables bound by matching the current proof state; some let-bindings can also be substituted (Section 3.2.2, pp. 33–34).
5. If multiple successes of an atomic tactic were consumed, abandon instrumentation of the surrounding expression and record its whole outcome (Section 3.2, p. 31).
6. Optionally remove supplied hypothesis names after execution; this is incomplete for some complex expressions (Section 3.2.3, pp. 34–35).

Evidence. Among 4.6 million recorded proof-state transitions, 76 violated the assumption that unshelved proof states are never dependencies refined as side effects (Section 3.1, p. 24). Violations involving shelved states that require explicit solving occur more often and cannot be counted from the dataset (Section 3.1, p. 25, footnote 11). Static decomposition can change behavior: “To ensure that proof scripts remain functional, we execute both the original tactic and the decomposed tactics and compare their result.” (Section 3.2.1, p. 31). Meaningfully different results cause decomposition to be abandoned; comparison includes hypothesis names and order and binder names in the conclusion's spine (Section 3.2.1, pp. 31–32).

Verus form: Inference: instrument generated proof actions by logging the exact obligation and verifier diagnostic externally; normalize local Rust variable names only after compilation, because names can affect macro expansion and diagnostics. Inference: do not replay a decomposed proof action without recompiling the complete Verus module; decomposition is a search aid, not a semantic guarantee.

## technique 6: provide synchronized datasets and live agent protocols

What it is. Datasets contain a shared graph of definitions and global contexts, tactic proof trees, and text renderings. Cap’n Proto supplies memory-efficient serialization and capability-based RPC; PyTactician exposes the data to Python (Sections 4.1–4.2, pp. 35–37). The published corpus covers 120 mutually co-installable Coq packages compatible with Coq v8.11, over 250 million nodes, 520k definitions, 266k theorems, and 4.6 million proof-state transformations (Section 4.2, pp. 36–37). The paper states: “Every proof state and definition in the graph is additionally represented in a textual format.” (Section 4.2, p. 36).

A prediction server receives a proof state and returns tactic suggestions; Coq’s `Suggest` and `synth` commands consume them. A proving client receives a capability for the state, executes arbitrary tactics, and explores a search tree. Cached graph stacks keep an external server synchronized as the document changes (Sections 4.3–4.4, pp. 37–38).

Verus form: Inference: expose a Rust/Verus obligation service that sends a versioned module context, contracts, and diagnostics to a generator, then accepts only a complete module that Verus verifies. Cache immutable graph fragments for imported specifications and invalidate on dependency or verifier changes. Inference: a remote capability should authorize candidate proof exploration, not bypass local verification.

## technique 7: benchmark agents at scale

What it is. The benchmarking framework uses Opam to install an appropriate Coq version and package dependencies, injects the specified version of Tactician, indexes lemmas, distributes compilation units over local or HPC resources, and records proof success, script, time, tactic inferences, and logs (Section 4.5, pp. 38–39). The paper states: “This framework has been shown to scale to benchmarking over 120k lemmas in parallel on more than a 1000 CPUs distributed over many machines.” (Section 4.5, p. 39).

Verus form: Inference: build a fixed-version benchmark that records obligation denominators, verifier-clean proofs, time, solver calls, repair attempts, and trust annotations. Partition by dependency family to avoid leakage. Inference: pass rates must distinguish all attempted obligations from only those reaching the agent, just as the paper distinguishes oracle reconstruction from agent performance.

## evidence, contradictions, and trust boundary

Oracle reconstruction shows the representation limits. For 131 thousand original corpus lemmas, text replay reconstructs 70.0% and graph replay 28.4%; for 11 thousand standard-library lemmas, the rates are 96.0% and 47.8% (Section 5, p. 40). The paper calls these lower bounds because an unrepresentable proof may have an alternative representable proof. On a 2,000-theorem test set in the separate neural-model evaluation, Graph2Tac and k-nearest neighbor each pass 26%, the text model 15%, and CoqHammer 18% (Section 5, p. 41). Inference: these reconstruction and model-evaluation denominators must not be mixed.

The graph oracle reconstructs fewer proofs than the text oracle, yet Graph2Tac outperforms the tested language model (Section 5, pp. 40–41). The author's interpretation is: “First, agents that incorporate as much online data into their model as possible are strongly advantaged over agents that rely on a static set of background knowledge.” (Section 5, p. 41). Representation limits include non-kernel objects, hint databases, complex/custom and Ssreflect tactics, printer/parser behavior and settings, and graph-based tactic-argument restrictions (Sections 5–6, pp. 40–42). Inference: these limits can affect retrieval and proof search in a Verus adaptation; graph artifacts should remain candidates checked by Verus.

Inference: VL should treat semantic-state extraction, dependency-aware context tracking, state-transition logging, graph sharing, and large-scale benchmark orchestration as existing ideas. A proposed adaptation is to index Verus contracts, proof functions, assertions, loop invariants, termination measures, ghost state, and external specifications. A useful experiment is whether retrieval from context-keyed verified artifacts improves verifier-clean proof rates on unseen dependency revisions without adding unchecked assumptions.

## techniques for the catalog

- semantic CIC graph — encode kernel terms as labeled nodes and direct binder/definition edges
- context meta-graph — preserve imports, section discharge, module instantiation, and abstract time
- bisimulation hashing — hash and share context-aware equivalent subgraphs for compression and lookup
- proof-state transitions — represent each tactic as a state-to-state refinement with a generated proof term
- tactic instrumentation — record tactic inputs, outputs, focus, terms, and dependencies inside Coq
- tactic decomposition — expand static sugar and record dynamic state-dependent branches
- tactic anonymization — remove local names after execution while retaining graph references
- synchronized proof dataset — export graph and text forms with cached context and Cap’n Proto access
- prediction server — suggest tactics to Coq without owning search control
- proving client — explore proof states through capability-based tactic execution
- parallel benchmark — construct package environments and distribute theorem evaluation at scale
- Verus adaptation — Inference: apply context-keyed retrieval and checker-clean artifact storage to verified Rust

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The proof states and proof term are represented in the data both in textual and graph format."): checked the entire paper and study, quotations, numbers, section/page references, and technique steps; corrected the paper link, page references, hashing description, proof-step outcomes, decomposition safeguards, and inference labels; did not check implementation, cited publications, experiments independently, or the proposed Verus adaptations.
