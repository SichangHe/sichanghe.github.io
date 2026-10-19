# ProofWala: A Framework for Multilingual Proof Data Synthesis and Theorem-Proving
(authored by agents unless marked 🧑)
Tag: `thakur2026proofwala`, [paper](https://doi.org/10.4230/LIPIcs.ITP.2026.24)

## scope and main result

ProofWala is infrastructure for extracting proof data, interacting with multiple interactive theorem provers (ITPs), training proof-step models, and running parallel proof search. The paper targets Lean 4 and Rocq (formerly Coq). Its abstract describes “a multilingual proof engineering framework built around itp-interface, a reusable library for programmatic interaction with ITPs.” (Abstract, PDF p. 1.) The system's central engineering choice is to map assistant-specific proof states and tactic executions to one state-transition interface, then use cloned environments for concurrent search.

Table 1b reports 442,607 training proof-step/state pairs from 76,997 training theorems across CompCert, MathComp, GeoCoq, and Mathlib4. CategoryTheory is separate: “The CategoryTheory dataset is excluded from initial training and reserved for domain adaptation experiments.” (Section 4.1, PDF p. 9.) The supplied version is published at ITP 2026 and lists DOI 10.4230/LIPIcs.ITP.2026.24 (PDF p. 1). It trains fixed-capacity CodeT5-Base (220M parameters) models on Rocq-only, Lean-only, and mixed data, and evaluates proof search with a 600-second timeout, or 1,200 seconds for GeoCoq (Sections 4.3 and 5.1, PDF pp. 11–12).

## technique 1: normalize proof assistants as a state-transition system

What it is. ProofWala models an obligation as a goal and its local hypotheses, and a proof state as a finite set of obligations. A tactic transforms one state into another; a completed proof is the distinguished empty-obligation state QED. The paper states, “We model interactive theorem proving as a structured state-transition system operating over proof obligations.” (Section 2, PDF p. 3.) More formally, it defines a transition `T(O, a)` and extends it to a tactic sequence `Tseq`; the objective is `Tseq(Oin, α) = QED` (Section 2, PDF p. 4).

When to use it. Inference: use this abstraction when one tool must collect and compare proof traces from different assistants, or when a search procedure should not depend on one assistant's internal API.

How to do it.
1. Represent each current goal together with its hypotheses as an obligation, and collect obligations into a state (Section 2, PDF pp. 3–4).
2. Define an initial state from the theorem statement and a QED state with no obligations (Section 2).
3. Expose a finite or enumerable tactic set and a transition function that applies a tactic to a state (Section 2).
4. Treat a failed tactic as an unchanged state in the paper's high-level model; retain the underlying error separately in an implementation (Section 2 footnote, PDF p. 4).
5. Search for a tactic sequence whose resulting state is QED (Section 2).

Verus form. Inference: model each Verus verification condition as an obligation containing a goal formula and the local assumptions available to the verifier. A generated proof step might be a Rust expression, a `requires`/`ensures` edit, an `invariant` clause, or a proof function body. The driver can record the Verus diagnostics and the next obligation after each candidate edit. Verus syntax and diagnostics are not the Lean/Rocq tactic transition API, so the adapter must define its own state serialization. Inference: do not represent a failed Verus run as a successful unchanged proof; keep failure diagnostics in the transition record so search can learn from them.

Evidence. Figure 1 gives a Lean theorem and tactic trace; the proof starts with a goal and reaches an empty obligation set after `rintro`, `simp`, and `exact` steps (Section 2, PDF p. 4). ProofWala's extracted transitions are replayed in the assistant kernel, which the authors say ensures that the data corresponds to valid kernel-level execution (Section 4.1, PDF p. 9).

Limits and assumptions. The common abstraction fits tactic-oriented Lean and Rocq. The paper says extending it to document-oriented Isabelle is challenging because proofs are processed as structured theory files rather than stepwise tactics (Section 3.1, PDF pp. 6–7). Inference: a common abstraction does not establish equivalent state semantics across all ITPs.

## technique 2: instrument the assistant inside its elaborator and extract repository structure

What it is. Instead of controlling Lean only through an external REPL, ProofWala runs meta-programs inside the Lean elaborator. This gives tactic-level traces plus declaration metadata and dependency edges across an entire project. The paper's implementation list includes “semantically faithful tactic-level execution and state tracing,” declaration extraction, repository-wide dependency graphs, nested tactic handling, and proof-environment cloning (Section 3.1, PDF p. 6).

When to use it. Inference: use in-process instrumentation when file-level replay loses nested goals, declaration relationships, or the context needed to clone a proof state. Use repository-level extraction when training data or search needs imports and dependencies.

How to do it.
1. Hook the assistant's native meta-programming or elaboration API rather than only a line-oriented REPL (Section 3.1).
2. Execute tactics in the assistant and record state transitions; the extracted JSON stores the pre-state, tactic, and post-state (Sections 3.1 and 4.2, PDF pp. 6 and 10).
3. Extract declarations such as inductive definitions and constants, with namespaces, imports, and dependency information (Sections 1 and 3.1, PDF pp. 2 and 6).
4. Store declaration metadata and dependency edges in a queryable database. ProofWala uses SQLite and provides a Streamlit explorer (Section 3.1, PDF p. 6; Section 5.6, PDF p. 15).
5. Isolate version-specific internal APIs behind a compatibility layer. The Lean backend supports releases 4.15.0 through 4.24.0 in the reported implementation (Section 3.1, PDF p. 6).

Verus form. Inference: a Verus backend should capture the Rust source revision, module and function names, specifications, verification command, solver diagnostics, and dependency versions for every candidate. Verus does not expose Lean's elaborator, so this would be an external compiler/driver integration around Verus invocations. A declaration database could record which specs, proof functions, and lemmas a target function depends on; the dependency graph is useful for selecting context and detecting stale generated proofs. Inference: a passing Verus run is the semantic event to record, not a text-level similarity between proof files.

Evidence. The extracted traces are used to construct 442,607 state/tactic pairs from 76,997 theorems (Section 4.1, PDF p. 9). The paper emphasizes that kernel replay makes extracted transitions semantically valid. For Isabelle support through PISA, the authors report: “each PISA instance requires a full Isabelle installation and heap image (tens of gigabytes), leading to prohibitive memory and storage requirements when scaling to many parallel environments.” (Section 3.1, PDF p. 7.)

Limits and assumptions. Inference: isolating API changes does not eliminate upgrade work. The paper's large-scale implementation focuses on Lean and Rocq; preliminary Isabelle support is not a scalable result. Inference: declaration metadata and dependency graphs alone cannot ensure that a model uses a dependency correctly.

## technique 3: construct a unified, assistant-agnostic training record

What it is. Every extracted example is stored as a transition `(Oi, ai, Oi+1)`: start goals, an applied proof step, and resulting goals. The paper says, “The extracted proof traces are stored in a unified JSON format that abstracts over assistant-specific details while preserving full semantic information about proof states and tactic transitions.” (Section 4.2, PDF p. 10.) Prompt formatting is identical across Lean and Rocq and omits the originating assistant and repository.

When to use it. Inference: use this representation when training one model on multiple proof languages or when comparing proof search behavior across repositories without assistant-specific input tokens.

How to do it.
1. Serialize hypotheses and goals for the current state (Section 4.2).
2. Serialize the tactic or proof step that executed successfully (Section 4.2).
3. Serialize the resulting hypotheses and goals plus metadata such as theorem name, file path, namespace, and dependencies (Section 4.2).
4. Format the record into a standard prompt asking for the next tactic (Section 4.2).
5. Build controlled monolingual and multilingual data mixes so training steps and batch sizes are comparable (Section 4.3, PDF p. 11).

Verus form. Inference: use a JSON record with Rust module/function identifiers, the current Verus diagnostic obligations, candidate source edit, resulting diagnostics, and dependency metadata. A single prompt format could hide whether an example came from a particular Verus project, but Verus proof text is not interchangeable with Lean/Rocq tactics. Preserve the exact source and tool version outside the model prompt so the candidate can be replayed.

Evidence. Table 1b reports per-mix counts. The Multilingual mix has 442,607 training pairs, 24,395 test pairs, and 11,433 validation pairs, spanning 76,997 training, 2,533 test, and 1,972 validation theorems (Table 1, PDF p. 9). The component counts are 205,604/20,072/7,213 for Rocq and 237,003/4,323/4,220 for Lean in train/test/validation; these sum to the reported multilingual training count for the two source mixes.

Limits and assumptions. The paper says prompts omit the assistant and repository (Section 4.2, PDF p. 10). Inference: this omission does not hide language identity completely, because goals and hypotheses retain assistant-specific syntax. The paper does not establish that this representation is optimal for Verus verification conditions handled by an SMT solver.

## technique 4: clone proof environments and search in parallel

What it is. ProofWala maintains multiple assistant environments initialized to identical frontier states. Candidate tactics are executed concurrently in those clones, and the pool reuses environments whose internal state matches the current frontier. This supports best-first and beam search and can distribute work with Ray. The paper states, “This design enables concurrent exploration of multiple branches of the proof tree.” (Section 3.2, PDF p. 7.)

When to use it. Inference: use environment pooling when candidate proof steps are independent and assistant startup or context reconstruction is expensive.

How to do it.
1. Initialize a pool of environments at the initial proof state (Figure 4, PDF p. 8).
2. Ask the guidance model for up to `width` candidate tactics for each frontier state (Figure 4).
3. Filter the pool for environments already at that state; initialize more if none match (Figure 4).
4. Execute candidates concurrently and update the pool with successor states (Figure 4).
5. Return success when any successor reaches QED; otherwise prune to the top `width` frontier states. Return failure on timeout or an empty frontier (Figure 4).
6. Optionally distribute pool workers across processes or machines using Ray (Section 3.2, PDF p. 7).

Verus form. Inference: run separate Verus processes or isolated workspaces for candidate Rust/specification edits. Cache a verified source state and clone it before applying each candidate, while recording compiler and dependency versions. Verus proof checking invokes an SMT solver, so process isolation and deterministic resource limits are needed to prevent one candidate's generated files or solver settings from contaminating another. Inference: a candidate is a valid search edge only after Verus accepts the resulting source; textual edits that fail verification should be logged as failed transitions.

Evidence. Parallel Beam Search in Figure 4 specifies initialization, candidate generation, filtering, parallel execution, state updates, QED termination, and top-k pruning (PDF p. 8). On MiniF2F, increasing Ray workers from 8 to 20 raises pass@5 from 22.54% to 26.23% and reduces average proving time from 83.32 seconds to 74.56 seconds (Section 5.5, PDF p. 14). That paragraph does not state the number of evaluated MiniF2F theorems.

Limits and assumptions. Cloning is cheap enough for Lean and Rocq in the reported setup but expensive for Isabelle. Inference: this experiment does not establish that more workers improve every theorem or hardware configuration. Pool correctness depends on matching each environment to the exact frontier state.

## technique 5: use model-guided beam search and log proof trees

What it is. A proof-step model assigns a likelihood to a tactic at a state. Beam or best-first search expands high-scoring candidates, while a proof tree records only tactics that execute successfully. The paper says, “Because tactics are only added when they execute without error in the underlying ITP, the tree represents valid state transitions in the proof environment.” (Section 3.2, PDF p. 7.)

How to do it.
1. Generate candidate tactics conditioned on a serialized state and rank them by model negative log-likelihood (Section 5.1, PDF p. 12).
2. Execute candidates in cloned environments and retain successor states (Sections 3.2 and Figure 4).
3. Add successful transitions to an annotated tree with states, tactic applications, scores, timestamps, and outcomes (Section 3.2 and Section 5.4, PDF pp. 7 and 14).
4. Prune the frontier to a beam width and continue until QED or timeout (Figure 4).
5. Compute node count, edge count, branching factor, proof length, and search time from the tree (Section 5.4).

Verus form. Inference: use model scores only to order candidate source edits or proof hints. Let Verus verification decide which edges enter the tree. Record the exact verified source state and the obligations discharged at each edge; this can support proof repair and model training. Verus has `proof fn`, `spec fn`, `requires`, `ensures`, and `invariant` constructs, but a generated proof function is not executable product code; the search driver must keep proof generation and runtime code separate.

Evidence. Multilingual pass@1/pass@5 is 26.84%/30.58% on Lean's 991-theorem test set versus 24.92%/28.25% for Lean-only; paired bootstrap p = 0.018 (Table 3, PDF p. 13). CategoryTheory has 101 test theorems: multilingual fine-tuning reaches 44.55% pass@1 and 53.47% pass@5 versus 36.63% and 45.54% for Rocq-only, p = 0.008 (Table 3). MathComp's multilingual versus Rocq-only pass@5 is 30.52% versus 30.15%, p = 0.355; GeoCoq is 35.84% versus 34.46%, p = 0.135; CompCert is 21.96% versus 20.76%, p = 0.191 (Table 3). Among these five comparisons, only Lean and CategoryTheory meet the paper's stated 0.05 threshold (footnote 11, PDF p. 12). Multilingual pass@1 is lower than Rocq-only on MathComp (27.9% versus 28.28%) and GeoCoq (30.89% versus 32.87%); the gains are not uniform across k (Table 3).

The search instrumentation also reports average tree and timing values, rather than only pass rates. For example, the Lean multilingual model has average tree size 4.729 nodes and 4.689 edges, compared with 3.989 and 3.536 for Lean-only (Table 5, PDF p. 13); average proof length is 2.0363 tactics and average search time 30.5296 seconds versus 2.0679 tactics and 20.7370 seconds (Table 6, PDF p. 14). The paper does not specify here whether these averages include unsuccessful searches.

Limits and assumptions. Inference: exploring more valid branches need not produce a proof, and pass@k can depend on timeout, beam width, and candidate generation. The paper's model is CodeT5-Base with a maximum of 34,000 gradient updates, batch size 128, and maximum 2,048 tokens (Table 2, PDF p. 11); larger models or retrieval systems are outside this controlled comparison.

## what is proved, measured, and trusted

The paper describes execution in the assistant rather than a formal correctness proof of ProofWala: “The extraction process replays tactic scripts inside the assistant’s kernel and records semantically valid state transitions in the unified representation described in Section 2.” (Section 4.1, PDF p. 9.) It measures dataset sizes, pass@k, paired bootstrap significance, tree structure, proof lengths, and times (Tables 1 and 3–6). On transfer, it states that improvements outside Lean/Mathlib “are smaller and not statistically significant, and should be interpreted as indicative trends.” (Section 5.2, PDF p. 12.) CategoryTheory adaptation is separately reported as statistically significant.

Inference: assistant-checked transitions do not establish correctness of the surrounding extraction, prompt serialization, environment pooling, or distributed execution code. Model scores guide search; assistant execution checks proposed tactics.

## threat to a product of agent-written verified Rust

Inference: ProofWala lowers the engineering cost of generating and testing many proof candidates, which could increase the rate at which an agent produces Verus-accepted code. It does not solve specification errors, unsafe external assumptions, or mismatches between a proof obligation and the product requirement. Parallel search also increases the number of generated artifacts and therefore makes candidate provenance and deterministic replay important. The paper's measured transfer gains are modest on several datasets and statistically significant on only two of the reported comparisons; this limits any claim that multilingual or cross-assistant data will automatically improve Verus proof generation.

## techniques for the catalog

- state-transition abstraction — represent obligations, tactics, successor states, and QED in one assistant-agnostic model
- in-process proof instrumentation — execute inside the elaborator to trace tactics and extract declarations and dependencies
- unified proof-step records — serialize `(start state, tactic, end state)` in one JSON format for multiple assistants
- environment pooling — clone identical proof environments and execute candidate tactics concurrently
- parallel beam search — rank model-proposed tactics, execute them in parallel, and prune frontier states
- semantic proof-tree logging — record only successfully executed transitions with scores, timing, and outcomes
- multilingual data mixing — train fixed-capacity models on Lean and Rocq data under matched optimization budgets
- transfer evaluation — compare pass@k with explicit theorem counts and paired-bootstrap p-values
- declaration database exploration — query SQLite dependency graphs and visualize declaration relationships
