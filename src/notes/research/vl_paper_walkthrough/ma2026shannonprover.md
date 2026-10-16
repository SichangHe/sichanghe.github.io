# ShannonProver: Towards Automating Formal Cryptographic Proofs
(authored by agents unless marked 🧑)
Tag: `ma2026shannonprover`, [paper](https://doi.org/10.48550/arxiv.2607.02847)
## what the paper builds

ShannonProver is an agentic system for writing EasyCrypt proofs of cryptographic lemmas. A human cryptographer supplies the protocol specification, security definitions, assumptions, and main theorem. The system automates decomposition into intermediate games and lemmas, then proves those lemmas with checker-in-the-loop agents. EasyCrypt accepts or rejects every tactic, so the LLM supplies search while the proof assistant supplies the final validity check. The paper summarizes the boundary: “The agent may hallucinate or make mistakes along the way, but this cannot compromise soundness: EasyCrypt rejects every invalid proof attempt, so once the agent produces a script that passes the check, the theorem is certified.” (section 1, p. 1).

The workflow follows three phases. Phase I is human specification. Phase II decomposes the main theorem into games and intermediate lemmas. Phase III writes tactic-level scripts. ShannonProver automates Phases II and III, with a decomposer and a lemma prover. The phases can interleave: failed lemma proofs return feedback that causes the decomposer to split or restructure a lemma. This matters for VL because proof engineering is not just one-shot generation; decomposition and local proof obligations constrain each other.

Inference: for agent-written verified Rust, the direct analogue is a reviewed specification and theorem, an agent that proposes lemmas and proof structure, and Verus as the acceptance boundary. Inference: the paper’s guarantee is conditional on the human-supplied EasyCrypt model and theorem; it does not prove that the protocol specification captures real requirements or that external implementations match the model.

## technique: hierarchical decomposition with feedback

what it is

The decomposer writes intermediate games and lemma statements, then hands independent lemmas to the lemma prover. A successful proof is returned; a failed proof returns feedback. The decomposer can finish a lemma itself, request continuation, restate or split it, add helper lemmas, or change the decomposition.

when to use

Use this when a monolithic theorem is too large for a checker-in-the-loop agent and when proof structure requires cryptographic insight. The paper says experts themselves work by specifying, decomposing, and then proving lemmas rather than writing the final script as one block.

how to do it

1. receive the formal specification and main theorem
2. propose intermediate games and lemmas
3. dispatch independent lemmas concurrently
4. continue proving some lemmas while others run
5. inspect proof success or failure feedback
6. split, restate, add helper lemmas, or revise the decomposition
7. assemble the accepted lemma scripts and run a final EasyCrypt check

Figure 2 shows a failed L4 attempt split into L4a and L4b while L1 and L3 continue. The paper reports complete MEE-CBC and ChaCha20-Poly1305 proofs in about two and five hours respectively (section 1, p. 2).

Verus form

Inference: represent each intermediate claim as a Verus `proof fn` with `requires` and `ensures`, and keep the top-level theorem as a proof function that calls those lemmas. Inference: split a failed proof obligation into smaller proof functions or helper lemmas, then rerun Verus after each accepted change. Inference: ordinary Rust execution is unaffected because `proof fn` code is erased; decomposition quality remains a search concern, while Verus checking is the soundness gate.

## technique: state-aware proof-state compiler

what it is

The proof-state compiler computes context that is mechanically determined by the current EasyCrypt state and project. It has three layers: state projection attaches current goals, errors, and derived facts; ProofIR parses the goal and agent attempt into typed structures; resource and binding analysis either exposes applicable resources or realizes a selected tactic with state-determined arguments.

when to use

Use it when agents waste context on rereading files, choose a lemma by misleading names, or submit mechanically malformed tactic calls. A resource may apply only while a procedure call remains visible; inlining can remove the syntactic shape needed by a higher-level lemma.

how to do it

1. take the current checker state and project only facts for that state
2. parse the goal and attempted tactic into typed ProofIR
3. if no resource is selected, match available lemmas structurally against the goal
4. display all matching resources with instantiated statements
5. after the agent chooses one, infer only arguments fixed by operation, resource, and state
6. fill hypotheses only when the current context proves the premise
7. submit the realized tactic to EasyCrypt; leave unresolved premises as new goals

The running example has an agent submit `call (Alossless_F _ _)`; the compiler infers the module argument and realizes `call (Alossless_F (<: D2(O).O) _)`, leaving the losslessness premise to prove (section 3.4, pp. 6–7). The paper states: “The agent chooses the resource; the compiler fills in only what the state determines and leaves the lemma’s premise to the agent as a new subgoal.” (section 3, p. 4).

Verus form

Inference: build a state-aware context layer around Verus diagnostics that resolves known function arguments, available lemmas, and current triggers, but leaves semantic proof choices to the agent. Inference: the layer should generate valid Rust/Verus syntax only when the type and state determine it; unresolved facts should become explicit proof goals rather than guessed annotations. Inference: this is orchestration around Verus, not a replacement for Verus’s type checker or solver.

## technique: structural resource exposure and binding

what it is

Resource exposure matches proof resources to the current goal by syntax and typed structure rather than names or text. Binding analysis checks applicability, infers module/procedure parameters from the matching object, fills a premise only if an identical hypothesis exists, and asks EasyCrypt to elaborate the result.

when to use

Use it when a project has many lemmas with similar names or when module arguments are difficult for an LLM to infer. The method prevents semantic mislocalization and preserves higher-level resources until they no longer apply.

how to do it

1. identify a goal object such as a procedure call
2. find imported resources whose statements have the same structure
3. compare procedure names, enclosing modules, and typed parameters
4. instantiate uniquely determined arguments
5. use an existing matching hypothesis if available
6. leave any other premise as a new subgoal
7. reject ambiguous or inapplicable completions instead of choosing a different resource

The paper emphasizes that matching is deterministic and syntactic, while resource selection remains the agent’s strategic decision (sections 3.3–3.4, pp. 6–7).

Verus form

Inference: use Verus’s typed signatures and visible proof context to construct candidate lemma calls, preserving the distinction between syntax completion and semantic reasoning. Inference: generate calls to `proof fn` lemmas only when their `requires` facts are available; otherwise expose the missing precondition as a goal. Inference: never mark an executable function `external_body` merely to bypass an unresolved premise, because that would remove the proof obligation rather than solve it.

## technique: multi-agent tree search

what it is

ShannonProver represents checker-accepted proof states as a tree. An agent can backtrack within its branch. A deterministic orchestrator spawns agents from shared checkpoints, prunes stalled branches, records failed attempts as negative memory, and runs promising branches in parallel.

when to use

Use this for non-linear proof search, especially invariant-synthesis and game-hop/reduction lemmas where an accepted tactic can lead to a dead end many steps later. Procedural lemmas are more nearly straight-line and may need only local backtracking.

how to do it

1. create a root node for the initial proof state
2. extend a branch only when EasyCrypt accepts a tactic
3. let an agent undo and retry from an earlier node when it recognizes a wrong turn
4. when an agent stalls, spawn another agent from a shared checkpoint
5. record failed approaches so new agents do not repeat them
6. prune branches that fall behind
7. assemble the first complete accepted path and check the final proof

In the 40-lemma sampled ablation, 38% of solved invariant runs and 43% of solved game-hop runs backtracked, with about 2.0–2.3 events per solved run. Spawning raised the solve rate for invariant plus game-hop runs from 67% with one backtracking agent to 90% with the orchestrator; the paper states: “The orchestrator is not an LLM agent, but instead a deterministic algorithm that manages the same proof tree from above.” (section 4.3, p. 7). both configurations solved 82% within 15 minutes and diverged later (section 6.3, pp. 10–11). These fractions use the sampled lemma categories, not all project lemmas.

Verus form

Inference: model each Verus verification state as a branch containing source, diagnostics, and accepted proof edits. Inference: run independent proof-generation attempts from checkpoints, retain only branches that pass Verus, and use failed diagnostics as negative memory. Inference: concurrent search changes cost and coverage, not the soundness of a final Verus pass.

## evaluation and evidence

The prototype contains about 89,000 lines: 86,000 Python and 3,000 OCaml, including about 33,000 for tree search, 26,000 for the compiler, 24,000 for EasyCrypt integration, and 7,000 for decomposition (section 6, p. 9). The controlled ablation samples 40 lemmas across procedural, invariant-synthesis, and game-hop/reduction shapes. It uses Opus 4.82 with high reasoning effort, gives access to project and EasyCrypt source files, and allows at most three give-up announcements before counting no proof progress (section 6.1, p. 9).

The compiler ablation shows little change in first-attempt error rates but sharply lower error friction, the fraction of API spend on consecutive rejected tactics. Figure 7 reports baseline versus ShannonProver error-generation rates of 0.10 versus 0.07 for procedural, 0.08 versus 0.12 for invariant, and 0.11 versus 0.13 for game-hop; error friction falls from 10.8% to 0.0%, 12.3% to 0.3%, and 9.8% to 1.3%, respectively (section 6.2, pp. 9–10). The paper therefore presents the compiler as mechanical-context support, not a proof oracle. It states: “The proof-state compiler mainly reduces the cost of errors rather than their number: the agent still makes mistakes, but it spends far less of its budget recovering from them.” (section 6.2, p. 10).

The ChaCha20-Poly1305 case contains 27 procedural, 8 invariant-synthesis, and game-hop/reduction lemmas shown in Figure 10. Proving all lemmas once costs $233.65 in API calls and completes within a day. The 27 procedural lemmas cost $40.98, invariant-synthesis costs $76.99, and game-hop/reduction costs $115.68 (section 6.3, p. 11). The authors also report complete MEE-CBC and CMAC case studies in the appendices. These results support feasibility for EasyCrypt cryptographic developments under supplied specifications and decompositions.

The paper evaluates proof quality by expert judgments of concision, maintainability/readability, and semantic proof idiom. Figure 10 shows room for improvement on invariant and game-hop proofs. Inference: a checker pass establishes theorem validity in the modeled system, but does not ensure concise, maintainable, or human-understandable proof structure.

## trusted boundary and product threat

EasyCrypt, its parser and checker, the compiler’s correctness, and the cryptographer’s specification and imported lemmas are trusted. Inference: the LLM and orchestration heuristics are untrusted search components because every final script is checked. Inference: for agent-written Verus, the corresponding trusted boundary includes Verus, the SMT solver, Rust/Verus compilation and erasure, external library contracts, and the reviewed specification. Inference: the paper suggests high threat reduction for proof-writing labor, but it does not remove specification errors, missing environmental assumptions, or semantic mismatch between a model and deployed code.

What VL should not redo is a monolithic checker-in-the-loop agent that receives only the latest goal and error. The paper’s ablations show that state-aware context and branch management address distinct failure modes. Inference: VL should reuse these mechanisms around Verus diagnostics rather than treating LLM proof generation as a single completion request.

## techniques for the catalog

- hierarchical lemma decomposition — split a main theorem into intermediate games and lemmas, then revise the decomposition from proof feedback
- proof-state projection — recompute a state-centered view of current goals, errors, and relevant facts
- typed resource exposure — match applicable lemmas structurally and show state-instantiated resources
- binding analysis — fill mechanically determined arguments while leaving semantic premises as explicit goals
- multi-agent tree search — backtrack, spawn parallel branches, prune stalled paths, and retain negative memory
- checker-gated proof assembly — accept only tactic paths and final scripts that the proof assistant verifies
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
