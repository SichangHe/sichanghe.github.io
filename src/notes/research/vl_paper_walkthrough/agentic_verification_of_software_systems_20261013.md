# Agentic Verification of Software Systems
(authored by agents unless marked 🧑)
Tag: `tu2026agentic`, [paper](https://doi.org/10.1145/3808164)

## scope and contribution

The paper introduces AutoRocq, an LLM agent that constructs Rocq proofs while interacting with the theorem prover. The abstract states: “The iterative improvement of the proof is achieved by the proof agent communicating with the Rocq (formerly Coq) theorem prover to get additional context and feedback.” The output is a tactic sequence accepted by Rocq's trusted kernel. The authors evaluate mathematical lemmas, verification conditions extracted from C programs, and 60 Linux-kernel lemmas.

The formal-verification target is deductive verification. The paper describes the standard pipeline as follows: “These annotations define formal contracts for the intended behavior of the program, and the annotated code is translated into logical proof obligations.” Rocq tactics transform goals into subgoals; a completed proof is type-checked by the kernel. Inference: the same separation matters for Verus: executable Rust, specifications, and proof functions must be written so that Verus can generate and discharge obligations, while the verifier remains the acceptance authority.

## technique 1: agentic context-aware tactic generation

what it is

AutoRocq lets the model decide whether the current proof state contains enough information for the next tactic. If it is sufficient, it emits a tactic. If a definition or lemma is missing, it emits a query to Rocq's environment. The supported queries are Search, Print, Locate, About, and Check (Section 4.1, pp. 6–7). The paper explains: “The agent performs continuous context analysis: if the current context is deemed sufficient, the agent directly generates a tactic to advance the proof; if a key piece of information (e.g., the definition of a term is_sint32 or a proved lemma in an imported library) is missing, the agent can submit a context query to retrieve it.”

when to use it

Inference: use this when a proof obligation depends on a library fact, definition, type, or lemma whose name or exact statement is unknown. The authors warn that blindly appending long premise lists can add noise; an on-demand query keeps the prompt focused (Section 4.1).

how to do it

1. Give the agent the current proof tree and the top five historical tactics (Section 4.1 prompt).
2. Ask it to either produce a tactic or output one query command.
3. Send the query to Rocq and append the returned declarations or definitions to the next model context.
4. Repeat until the model emits a tactic that advances the goal. A concrete paper example is `Search (Z. abs _ <= _)`; Table 1 defines Search as returning matched declarations.
5. Search is the paper's primary discovery tool, by name pattern, type signature, or existing lemma names (Section 4.1); the other commands are Print (a definition), Locate (where an identifier is defined), About (type and summary), and Check (type of a term) (Table 1).

Verus form

Inference: implement this as a controller around Verus diagnostics and source-index queries. The controller can present the current verification condition, relevant `requires`/`ensures`, `invariant` clauses, and available lemma names to an LLM; generated Rust/Verus proof code must then be compiled by Verus. Inference: Rocq's interactive Search/Print commands have no direct Verus equivalent in the checked source, so a Verus agent needs repository indexing or compiler diagnostics to retrieve candidate lemmas and definitions. The Verus code should retain normal `requires`, `ensures`, `invariant`, `assert`, and proof `fn` constructs; only the orchestration layer differs.

evidence

On 70 randomly sampled SV-COMP verification lemmas, removing context search (`¬CS`) reduced success from 44.3% (31/70, Table 3) to 30.0% (21/70), a relative improvement of 47.6% for the full system over that ablation. Search was the most frequently invoked command in Figure 8. In the full SV-COMP set, AutoRocq proved 198/641 lemmas (30.9%) (Section 6.2). Inference: the denominator is the 641 extracted obligations, not all SV-COMP programs.

assumptions and limits

The query database must contain useful declarations, and the model must formulate a query that returns them. Inference: the query database must be useful as stated. The approach was tested in Rocq 8.18 (PALM used 8.12), not Verus. Inference: transfer to Verus depends on building an equivalent retrieval mechanism and on diagnostics exposing enough semantic context.

## technique 2: proof-tree-aware interpretation

what it is

AutoRocq maintains an explicit tree rather than a flat list of goals. Section 4.2 defines each node as a goal under context Σ, the root as the original goal, and each tactic edge as the generation of zero or more child subgoals. The paper states: “AutoRocq explicitly maintains a proof tree as it progresses in tactic generation.”

when to use it

Inference: use a tree when tactics branch, when proving one subgoal changes the strategy for siblings, or when the agent must understand how the current goal arose. The representation preserves tactic-to-subgoal relationships and lets the controller choose an open leaf while retaining the complete derivation history.

how to do it

1. Initialize a root node with the theorem goal and its global/local context (Section 4.2).
2. Apply a generated tactic through Rocq.
3. If the tactic closes the goal, mark that node a leaf and select another open node.
4. If it creates n subgoals, add n child nodes and focus on one child.
5. If it fails, leave the current node unchanged and use feedback handling.
6. After every update, traverse the tree to identify open subgoals and regenerate the next tactic sequence. The motivating `wp_goal` proof uses `destruct` to split cases, and four subgoals were generated in total (Section 4.2, Figure 1(b); the destruct case analysis is in Section 3).

Verus form

Inference: represent each Verus verification condition as a node containing the function, path condition, assumptions, and pending assertion. Branches correspond to `if`/`match` paths or lemma instantiations. Inference: Verus does not expose a Rocq-style interactive proof tree to source code, so the agent must maintain this tree externally from compiler feedback and generated proof blocks. The checked proof remains ordinary Verus code; the tree is orchestration metadata.

evidence

The ablation without proof-tree awareness (`¬PT`) achieved 40.0% (28/70) versus 44.3% (31/70) for AutoRocq (Table 3), a 10.7% relative improvement. Inference: this isolates a modest but measurable contribution on the sampled set; it does not show that trees are necessary for every theorem.

assumptions and limits

Inference: the tree helps only if it records Rocq's current subgoals accurately and the model can interpret hierarchical state; flat goals may be adequate for simple obligations. The reported benchmark does not establish behavior on concurrent or stateful Verus proofs.

## technique 3: context-assisted error repair and persistent-error search

what it is

AutoRocq sends Rocq failures back to the model. For a single error, the model revises the tactic using the error message and current tree (Section 4.3.1). If the same error persists, the agent assumes missing context and issues a query (Section 4.3.2). The paper says: “Based on the error that occurs, AutoRocq employs two strategies during tactic generation: (1) revising the tactic based on the error message when a single error occurs, and (2) initiating a context search to retrieve additional context when persistent errors occur.”

when to use it

Inference: use direct repair for syntax, wrong constructor shape, or a locally misapplied tactic. Escalate to context search when repeated repairs produce the same failure, indicating that a needed lemma or definition is absent.

how to do it

1. Apply a tactic to the focused subgoal.
2. On one failure, include the exact Rocq error, previous tactic, and proof tree in a repair prompt; the paper's example response is `destruct Hcases as [H10 | [Hn10 | Hle9]]` (Section 4.3.1).
3. Reapply the revised tactic and update the tree.
4. Count repeated failures. After the configured threshold, prompt the model to identify missing context and emit a query; the paper's example is `Search (Z. quot _ _)` (Section 4.3.2).
5. Add query results, generate a new tactic, and continue until success or a maximum-attempt termination condition.

Verus form

Inference: map compiler diagnostics and failed verification conditions to the repair prompt. A Verus agent can revise `assert`, `assert_by`, lemma calls, triggers, or invariants, then rerun `verus`. Inference: when the same diagnostic persists, query an index of repository definitions and proof lemmas rather than treating repeated text edits as progress. Do not encode `invariant` as a function call or use unsupported proof syntax; every proposed change must pass Verus.

evidence

Removing error feedback (`¬EF`) lowered success to 38.6% (27/70), while removing the history manager (`¬HM`) yielded 41.4% (29/70), compared with 44.3% (31/70) for full AutoRocq (Table 3). The authors use three errors before context search; one error reached 37.1% (26/70), and five reached 38.6% (27/70). Inference: these fractions are for the 70-lemma ablation sample, not the 641-lemma benchmark.

assumptions and limits

The threshold is empirical: the paper found 3 most effective among the settings 1, 3, 5 (Section 6.3). Inference: error messages must be informative, and repeated errors may also indicate an actually false goal or missing invariant rather than missing context.

## technique 4: on-the-fly historical proof learning

what it is

After each successful proof, AutoRocq stores the tactic, before/after goals, hypotheses and changes, theorem name, and tactic position in a JSON archive (Section 4.3.3 and 4.4). The paper says: “This rich historical information serves multiple purposes: (1) it enables AutoRocq to learn from successful proof patterns and reuse effective tactic sequences in similar contexts, (2) it provides detailed examples for context-aware tactic generation by showing how specific goals were transformed, and (3) it supports the feedback handling mechanism by offering concrete instances of successful problem-solving strategies.”

when to use it

Inference: use history when many lemmas share structural patterns, such as arithmetic side conditions or repeated library APIs. The paper says the archive helps with new lemmas of similar structure (Section 4.3.3) but does not say how records are ranked for retrieval.

how to do it

1. Record each successful tactic application with its full before/after state and metadata.
2. During a new proof, retrieve historical tactics (the context-analysis prompt requests the top five).
3. Present those records alongside the current tree.
4. Not in the paper (the reader's addition): treat a retrieved tactic as a suggestion that Rocq must accept in the current context.
5. Append newly successful records, making the archive improve within the proving campaign.

Verus form

Inference: store Verus proof snippets together with normalized verification conditions, diagnostics, referenced types, and lemma signatures. Retrieve examples as suggestions, then compile and verify them in the current crate. Inference: historical snippets cannot be trusted merely because they passed an earlier Verus version or specification; replay under the current dependencies is required.

evidence

The full system's 44.3% (31/70) success rate versus 41.4% (29/70) without the history manager is the paper's direct ablation evidence (Table 3). In the Linux case study, AutoRocq proved 12/60 (20%) lemmas; adding a CoqHammer call once per proof state on the first failed tactic application (AutoRocq-w/H) proved 18/60 (30%) (Table 4). Inference: the latter gain demonstrates tool augmentation, not history alone.

assumptions and limits

Inference: history can contain misleading tactics from a different context; the paper reports no separate measurement of retrieval quality. The model is GPT-4.1 at temperature 0; results may change with another model or archive composition.

## what is proved, measured, and trusted

The claimed certificate is a tactic script that Rocq replays (Section 4); the proof term it builds is type-checked by the Rocq kernel (Section 2.1). The paper explicitly states: “the certificate essentially comes from the trusted kernel of Rocq, which ensures that only derivations conforming to the formal rules of the proof assistant are accepted” (Section 6.5). Inference: the LLM, prompts, retrieval policy, Frama-C invariant candidates, and benchmark extraction are outside that kernel. Inference: a Verus deployment should treat Verus's checker and its trusted compilation/erasure path as the acceptance boundary, while treating generated specifications, external-library contracts, and model suggestions as assumptions requiring separate review.

The benchmark construction first used Frama-C RTE to add ACSL contracts, LLM-generated loop-invariant candidates, and Eva property testing, then WP to emit Rocq obligations (Section 5.1.3). The authors caution that property testing “cannot formally prove the correctness of an invariant.” Thus the 641-lemma benchmark includes 203 non-overflow (31.7%), 153 functional-correctness (23.9%), and 285 loop-invariant (44.5%) lemmas; the percentages sum to 100.1% by rounding. AutoRocq proved 824/1,717 CoqGym lemmas (48.0%) and 198/641 SV-COMP lemmas (30.9%), with 140 and 28 uniquely solved, respectively (Sections 6.1–6.2). For Linux kernel modules it proved 12/60 (20%); AutoRocq-w/H proved 18/60 (30%) (Section 7). Average successful SV-COMP proof time was 21.3 seconds for AutoRocq versus 105.5 for Rango, 45.4 for PALM, and 49.1 for Copra (Section 6.2). The paper reports $1.22 on average to prove a single lemma without token caching, throughout its experiments (Section 6.5); it does not break the figure down by benchmark.

## techniques for the catalog

- agentic context search — decide between a tactic and a targeted Search/Print/Locate/About/Check query, then feed the result back into generation
- proof-tree-aware interpretation — maintain subgoal nodes and tactic edges so the agent chooses and updates open branches with whole-proof context
- error-guided repair and escalation — revise a failed tactic once, then query for missing context after persistent identical errors
- historical proof memory — archive complete successful state transitions and retrieve similar records for subsequent tactic generation
