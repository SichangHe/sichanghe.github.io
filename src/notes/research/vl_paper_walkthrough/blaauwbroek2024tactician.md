# The Tactician’s Web of Large-Scale Formal Knowledge
(authored by agents unless marked 🧑)
Tag: `blaauwbroek2024tactician`, [paper](https://www.semanticscholar.org/paper/4dd6102d63fb21631a0514d5a693531d48eebaaa)

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
4. Apply the stated equivalences: local-name invariance, universe collapse, and selected conversion/type-cast rules (Section 2.1, pp. 6–8).
5. Require injectivity modulo those equivalences; not every graph must decode to a valid term (Section 2.1, p. 6).

Verus form: Inference: define a typed graph model with ghost `Seq`/`Map` values and a `spec fn` that maps a Rust expression or proof-state record to its graph. Use `proof fn` lemmas to establish that alpha-renaming leaves the model unchanged and that references resolve to the intended definition. Inference: Verus’s Rust AST and verifier state are not Coq CIC; a graph is an external index, not a replacement for Verus’s own checked specification.

Limits. Kernel graphs omit non-kernel features such as typeclass and hint-database behavior (Section 6, pp. 41–42). Universe collapse is intentionally inconsistent as a full type theory, even though the authors expect recovery in many applications (Section 2.1, p. 7). Inference: a VL graph must mark omitted elaboration and automation state as trusted context rather than imply semantic completeness.

## technique 2: preserve global context with a meta-graph

What it is. A proof depends on which definitions and imports were available at the moment it was compiled. Tactician therefore stores a pointer from every definition to its preceding definition and to representatives of imported files. Sections and module functors create branches in this abstract time; derived definitions point back to their origins (Section 2.6, pp. 19–22).

Steps from the paper:

1. Record each definition’s preceding global-context pointer (Section 2.6, p. 19).
2. Add pointers to imported-file representatives so the context can be reconstructed (Section 2.6, p. 19).
3. When closing a section, retain both the open branch and discharged-definition branch and link derived definitions to originals (Section 2.6, pp. 20–21).
4. Do the same for module functors and each instantiation (Section 2.6, pp. 21–22).
5. Use the reachable context as the environment for proof-state and tactic interpretation (Section 2.6, p. 19).

Verus form: Inference: key each retrieved proof artifact by Verus version, module imports, trait implementations, specifications, and external assumptions. Store a ghost or external dependency DAG and require a proof candidate to resolve every referenced item in the current context. Inference: ordinary source-file names are insufficient because dependency revisions can preserve names while changing contracts.

Evidence and risk. The paper warns that section/module derivations can cause data leakage and says randomized train/test splits are discouraged (Section 2.6, pp. 20–22). Roughly half of the 520k definitions in the released corpus are derived through sections or modules (Section 4.2, p. 36). Inference: VL must split by dependency ancestry or semantic identity, not by random examples.

## technique 3: hash-share bisimilar subgraphs

What it is. Nodes receive identity hashes designed to agree exactly when their graphs are bisimilar, modulo hash collisions. Semantic, meta, and physical hashes respectively include CIC structure, global context, and filename. Shared subgraphs reduce storage and let an agent recognize repeated proof-state structure (Section 2.7, pp. 22–23).

Steps from the paper:

1. Compute a node hash recursively; the separate hashing work gives an `O(n log n)` algorithm (Section 2.7, p. 22).
2. Share subgraphs only across dependency-compatible files for a modular dataset (Section 2.7, p. 22).
3. Use semantic identity for term equivalence, meta identity for context-sensitive identity, and physical identity for dataset deduplication (Section 2.7, p. 23).
4. Use hashes for exact-state lookup or an oracle that returns a previously recorded action (Section 2.7, p. 22).

Evidence. In the Coq standard library, sharing reduces 157 million unshared nodes to 18.3 million, an 88.3% reduction, and edges to 40.8 million (Section 5, p. 39). The intermediate reductions are 85% within definitions, 2% within compilation units, and 1.3% across dependent units (Section 5, p. 39).

Verus form: Inference: hash normalized verified Rust obligations together with module context and verifier version, then retrieve exact prior proofs as candidates. Keep hash identity a cache key rather than a correctness claim; Verus must recheck after dependency changes. Inference: filename-sensitive identity is useful for avoiding accidental cross-project aliasing but cannot establish semantic equivalence.

## technique 4: model tactic proofs as state transitions

What it is. A Coq tactic script is represented as proof steps. Each step executes one base tactic on a focus of unshelved proof states, generates a proof term, and yields zero or more new states. Shelved states model dependencies that are solved as side effects. A proof is complete when no open proof state remains (Section 3.1, pp. 27–30).

The paper states: “We represent a tactical proof as a sequence of proof steps.” (Section 3.1, p. 32). Each recorded step contains the starting proof state, tactic, generated proof term, and resulting states (Section 3.1, pp. 32–34).

Steps from the paper:

1. Export the current set of open proof states, distinguishing unshelved and shelved states (Section 3.1, pp. 27–30).
2. Choose a tactic focus through bullets, inherited focus, or selection (Section 3.1, p. 29).
3. Execute the tactic and record its generated term and child states (Section 3.1, pp. 32–34).
4. Preserve dependencies between parent and child states and continue until all are solved (Section 3.1, pp. 27–30).

Verus form: Inference: model each Verus proof obligation and `assert`/`proof fn` invocation as a transition whose post-state is the remaining obligation set. A proof artifact should retain the diagnostic state before and after each accepted step. Inference: Verus checks whole Rust modules rather than exposing Coq-style mutable proof-state capabilities, so this transition model is an external search representation.

## technique 5: instrument and decompose tactics

What it is. Tactician inserts a recording tactical recursively into tactic expressions. It captures atomic behavior while treating control combinators such as focus restriction, `try`, and fallback as structural operations. Static decomposition expands syntactic sugar; dynamic decomposition records the branch selected by matching the current proof state. A final optional pass anonymizes locally generated names (Sections 3.2, pp. 34–35).

Steps from the paper:

1. Recursively insert an instrumentation tactical into each top-level tactic expression (Section 3.2, pp. 34–35).
2. Record base tactic, graph arguments, input states, output states, and generated proof term (Section 3.2, pp. 32–35).
3. Expand simple syntactic sugar such as `now` and intro patterns using rewrite rules (Section 3.2.1, pp. 35–38).
4. For dynamic scripts, execute the rewrite selected by the current proof state and record the instantiated tactic (Section 3.2.2, pp. 38–39).
5. Optionally remove generated hypothesis names after execution (Section 3.2.3, pp. 34–35).

Evidence. Among 4.6 million recorded proof-state transitions, only 76 violated the assumed parent-child tree property (Section 3.1, p. 29). The authors caution that decomposition can change behavior and compare original and decomposed executions when rewrite rules are uncertain (Section 3.2.1, pp. 35–38).

Verus form: Inference: instrument generated proof actions by logging the exact obligation and verifier diagnostic externally; normalize local Rust variable names only after compilation, because names can affect macro expansion and diagnostics. Inference: do not replay a decomposed proof action without recompiling the complete Verus module; decomposition is a search aid, not a semantic guarantee.

## technique 6: provide synchronized datasets and live agent protocols

What it is. Datasets contain a shared graph of definitions and global contexts, tactic proof trees, and text renderings. Cap’n Proto supplies memory-efficient serialization and capability-based RPC; PyTactician exposes the data to Python (Section 4.1–4.2, pp. 35–37). The published corpus covers 120 mutually co-installable Coq packages, over 250 million nodes, 520k definitions, 266k theorems, and 4.6 million proof-state transformations (Section 4.2, p. 36).

A prediction server receives a proof state and returns tactic suggestions; Coq’s `Suggest` and `synth` commands consume them. A proving client receives a capability for the state, executes arbitrary tactics, and explores a search tree. Cached graph stacks keep an external server synchronized as the document changes (Sections 4.3–4.4, pp. 37–38).

Verus form: Inference: expose a Rust/Verus obligation service that sends a versioned module context, contracts, and diagnostics to a generator, then accepts only a complete module that Verus verifies. Cache immutable graph fragments for imported specifications and invalidate on dependency or verifier changes. Inference: a remote capability should authorize candidate proof exploration, not bypass local verification.

## technique 7: benchmark agents at scale

What it is. The benchmarking framework installs exact Coq/package environments, injects Tactician, indexes every lemma, distributes compilation units over local or HPC resources, and records proof success, script, time, tactic inferences, and logs (Section 4.5, pp. 38–39). It has scaled to over 120k lemmas on more than 1,000 CPUs (Section 4.5, p. 39).

Verus form: Inference: build a fixed-version benchmark that records obligation denominators, verifier-clean proofs, time, solver calls, repair attempts, and trust annotations. Partition by dependency family to avoid leakage. Inference: pass rates must distinguish all attempted obligations from only those reaching the agent, just as the paper distinguishes oracle reconstruction from agent performance.

## evidence, contradictions, and trust boundary

Oracle reconstruction shows the representation limits. For 131 thousand corpus lemmas, text replay reconstructs 70.0% and graph replay 28.4%; for 11 thousand standard-library lemmas, the rates are 96.0% and 47.8% (Section 5, p. 40). The paper calls these lower bounds because an unrepresentable proof may have an alternative representable proof. On a 2,000-theorem test set in the separate neural-model evaluation, Graph2Tac and k-nearest neighbor each pass 26%, the text model 15%, and CoqHammer 18% (Section 5, p. 40). These denominators and conditional scopes must not be mixed.

The paper's graph oracle is weaker than its text oracle, yet graph-based models perform competitively because they can use online definitions and new concepts (Section 5, pp. 40–41). The main untrusted or omitted parts are non-kernel objects, hint databases, complex/custom and Ssreflect tactics, printer/parser settings, and the graph-to-tactic argument restrictions (Section 6, pp. 41–42). Inference: the threat to agent-written verified Rust is medium for retrieval and proof-search quality and high if graph artifacts are mistaken for proofs. A Verus proof remains relative to its specification, external contracts, verifier, solver, compiler, and erased proof code.

Inference: VL should not redo semantic-state extraction, dependency-aware context tracking, state-transition logging, graph sharing, or large-scale benchmark orchestration as novel ideas. It should adapt these patterns to Verus constructs found in the existing Verus notes: `requires`, `ensures`, `spec fn`, `proof fn`, `assert`, loop `invariant`, `decreases`, ghost state, and explicit external specifications. The decisive experiment is whether retrieval from exact, context-keyed verified artifacts improves verifier-clean proof rate on unseen dependency revisions without increasing trust escapes.

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
- parallel benchmark — reproduce exact package environments and distribute theorem evaluation at scale
- Verus adaptation — Inference: apply context-keyed retrieval and checker-clean artifact storage to verified Rust

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
