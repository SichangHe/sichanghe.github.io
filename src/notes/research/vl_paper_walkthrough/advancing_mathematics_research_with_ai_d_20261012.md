# Advancing Mathematics Research with AI-Driven Formal Proof Search
(authored by agents unless marked 🧑)
Tag: `tsoukalas2026advancing`, [paper](https://doi.org/10.1126/science.aej2213)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and prior notes

This paper evaluates AlphaProof Nexus, an agent framework that alternates language-model proof generation with Lean compiler checking and optional proof search, evolutionary populations, and rating. It targets mathematical theorem proving rather than Rust or Verus. The Verus mappings below are my inference: the transferable idea is a generate, compile-check, diagnose, and revise loop whose accepted artifact is a proof with no unchecked holes.

The paper's headline evidence is narrow and concrete: the full-featured agent solved 9 of 353 formalized Erdős problems, proved 44 of 492 OEIS conjectures after a formalization guard. The relevant denominator is 353 attempts for Erdős and 492 autoformalized OEIS questions. “Our most capable agent autonomously resolved 9 of 353 open Erdős problems ... [and] proved 44/492 OEIS conjectures” (abstract, page 1).

## technique: make the compiler the proof oracle

use conditions

Use a proof assistant that rejects any remaining goal. This turns an LLM's natural-language plausibility into a mechanically checkable artifact and gives precise error feedback after every attempt.

how to do it

1. Prepare a Lean file containing definitions, imports, a target theorem, and `sorry` in the proof position.
2. Mark the exact regions the agent may edit with `EVOLVE-BLOCK-START/END` and values with `EVOLVE-VALUE-START/END`.
3. Ask an LLM subagent to edit only those regions using search-and-replace.
4. Compile the sketch after each turn.
5. Feed Lean's pending goals or error messages into the next subagent turn.
6. Reject any final sketch containing `sorry`; emit a proof only when Lean reports no pending goals.

Lean “compiler ‘executes’ a proof tactic-by-tactic, tracking the proof goals pending after every tactic. A proof is correct if it leads the compiler to a state with no pending goals.” (section 2, page 2) This is the central trust boundary.

Verus form (inference)

Use a Rust/Verus file with `requires`, `ensures`, `assert`, and `proof fn` bodies. Restrict agent edits to proof blocks or explicitly approved specification regions, run `cargo verus` after every edit, and treat any `external_body`, unchecked axiom, or remaining placeholder as a failed result. Verus error messages become the feedback channel. Lean tactics and `sorry` syntax do not carry over, but the compile-gated loop does.

evidence and limits

Formal checking catches invalid intermediate steps, but it does not validate that the theorem statement matches the intended informal question. The authors found misformalizations of Erdős density questions and required expert review after successful compilation. An accepted proof can therefore be correct for the wrong statement.

## technique: iterative Ralph-loop proof refinement

use conditions

Use independent subagents when a theorem may have many possible proof paths and a single long context is brittle. Each episode gets the current sketch, reasons, edits, compiles, and records lessons if it fails.

how to do it

1. Spawn multiple prover subagents with identical or varied prompts and no shared state.
2. Give each a sequence of multi-turn episodes.
3. In each episode, inspect the current goals, make a bounded search-and-replace edit, and run Lean.
4. Preserve successful edits as the next sketch; if `sorry` remains, append a comment summarizing what failed.
5. Continue until a proof compiles or the episode budget is exhausted.
6. Select any proof Lean accepts (the study's inference: no majority vote is needed because Lean checks each candidate; the paper does not describe a selection step).

The framework makes each prover subagent a “Ralph loop” consisting of “a sequence of episodes: multi-turn LLM inference loops ... in which the subagent can reason via chain-of-thought and refine the sketch using a search-and-replace tool.” (section 2, page 2). The spawning-with-varied-prompts and budget steps above are the study's reconstruction; the paper states only independent subagents with no shared state, episodes, and the added comment.

Verus form (inference)

Run independent agents against the same Verus proof obligation, preserving each candidate's compile errors and diffs. A scheduler can stop when one candidate verifies, then run a clean verification pass. Keep generated proof comments or a structured failure log so later episodes do not repeat known dead ends.

evidence and limits

The paper's basic agent uses independent subagents, and its evaluation compares solve rate against monetary cost. Independence provides diversity but duplicates compute and does not guarantee discovery. The method can repeatedly polish a false or misformalized target unless a separate statement validator is used.

## technique: decompose a failing goal into helper lemmas

use conditions

When a monolithic theorem remains open, introduce helper lemmas that expose the mathematical structure and make subgoals individually solvable. This is a proof-engineering action the agent can discover through compiler feedback.

how to do it

1. Read the unresolved Lean goal and its hypotheses.
2. Identify an intermediate statement that captures one mathematical step.
3. Insert that statement inside an `EVOLVE-BLOCK` as a new lemma with a proof hole.
4. Replace the original proof with a call to the helper and continue proving the helper.
5. Repeat until each goal is small enough for the LLM or AlphaProof.
6. Compile after each insertion and remove every `sorry` before acceptance.

In the Erdős #125 example, AlphaProof failed on a monolithic density lemma; the subagent “decomposed that goal into three simpler lemmas” (`exists_k_m_ratio_close`, `gap_at_aligned_scale`, and `independent_bases_zero_density`) and then proved all six resulting goals. (Figure 1 caption and page 3)

Verus form (inference)

Split a large `ensures` into helper `proof fn`s and `assert ... by` blocks. Carry earlier facts as `requires`, and expose concrete witnesses or arithmetic bounds in separate lemmas. Unlike Lean, Rust ownership may require ghost copies or borrowed views of collections. The decomposition principle carries directly.

evidence and limits

This example shows a successful proof path, not a general decomposition algorithm. The paper reports failure cases where agents hide the original difficulty in one helper lemma with `sorry`; a validator must inspect all nested lemmas. Helper proliferation can also increase solver load.

## technique: call a specialized prover as a tool

use conditions

Use AlphaProof on a subgoal when an LLM's ordinary Lean editing stalls, especially for difficult arithmetic or olympiad-style reasoning.

how to do it

1. Send the current Lean subgoal and context to AlphaProof.
2. Accept a returned proof, disproof, or failure message.
3. Substitute a proof directly into the sketch.
4. Feed disproofs and failure messages back to the LLM prompt rather than treating them as proof.
5. Recompile the complete sketch.
6. If one subgoal remains, decompose it and call AlphaProof again.

The framework permits the subagent to call AlphaProof, whose result “can return a proof, disproof (a proof that the submitted subgoal is false), or a failure message.” (section 2, page 4)

Verus form (inference)

A VL agent could invoke a Verus-specific lemma synthesizer or SMT tactic service on one failed assertion, then insert only source code that passes the full Verus checker. A solver's “disproof” must become a counterexample or failed obligation, never an accepted result. Tool output should be scoped to the current proof state.

evidence and limits

On the nine Erdős problems solved by the full agent, the basic agent also solved all nine, although at higher cost on harder problems. Smaller Gemini variants and standalone AlphaProof tree search solved none in the reported comparison. Costs for configurations B and D exclude AlphaProof's estimated 60 USD per problem; the Figure 3 caption says that adding it does not change the outcomes beyond the margin of error.

## technique: evolve a population of proof sketches

use conditions

Use evolutionary search when many partial proofs or alternative definitions exist and independent local search wastes useful discoveries. A shared population lets new attempts reuse earlier sketches.

how to do it

1. Admit only compiler-validated sketches into a population database.
2. Have rating subagents sample prior sketches in pairwise matches.
3. Ask an LLM critic to rank plausibility, clarity, and novelty.
4. Aggregate rankings into Elo scores.
5. Sample sketches with a P-UCB policy to bias search toward promising but underexplored candidates.
6. Prompt new prover episodes with selected sketches plus the original theorem context.
7. Revalidate every offspring with Lean before admitting it.

The paper describes the population path: “validated sketches are admitted into the Population Database ... rater subagents sample previous attempts ... [and] these scores are then used by the evolutionary algorithm to sample prior sketches.” (Figure 2 caption, page 5)

Verus form (inference)

Store verified Rust proof candidates with their specifications, solver diagnostics, and structural features. Use ratings only to prioritize search; final acceptance remains a clean Verus compile. Since verification is binary, a heuristic Elo ranking is a search aid rather than evidence of correctness.

evidence and limits

The authors note that proof evaluation is inherently binary, which makes the fitness landscape unlike ordinary evolutionary optimization. Their rating model supplies a graduated heuristic (that it can mis-rank opaque or incomplete sketches is the study's inference, not a paper finding). The paper does not isolate the evolutionary component's solve-rate contribution from AlphaProof and the basic loop on the full benchmark.

## technique: guard formalization with executable test lemmas

use conditions

Before asking an agent to prove an autoformalized conjecture, test that the formal definitions agree with known small cases. Use this when natural-language statements are converted automatically and notation ambiguity is likely.

how to do it

1. Autoformalize the natural-language question into a Lean theorem.
2. Add test lemmas that compute or characterize the first few terms or finite cases.
3. Require the agent to prove these tests before the target conjecture.
4. Run the proof-search loop on the target.
5. Have a human review whether each proved statement is correctly formalized and previously unproven (in the paper this review followed the proofs).

For the OEIS experiment, the agent was “required to prove ‘test lemmas’ verifying the first few terms of each sequence against its formal definition before attempting the target conjectures.” (section 3, page 6)

Verus form (inference)

For a Rust specification, add executable or ghost examples with `assert` statements for initial list elements, map entries, or arithmetic cases. Check them with Verus before proving the general theorem. This catches wrong indexing, bounds, or semantic conventions early.

evidence and limits

Of 492 autoformalized OEIS questions, the agent proved 44 that manual review found correctly formalized and previously unproven; the paper does not measure how much the test lemmas reduced misformalization. It cannot prove that a broad informal statement was translated correctly beyond tested examples; expert review remains necessary.

## technique: allow proof search over parameter values

use conditions

Put algorithmic parameters inside an editable value region so the agent can search for both an implementation choice and its proof. Use this when a theorem asks for an existential schedule or bound and the parameter is part of the construction.

how to do it

1. Mark the parameter expression with `EVOLVE-VALUE` markers.
2. Let the prover alter the value while preserving the surrounding theorem.
3. Compile each candidate and retain only values with complete proofs.
4. Use the discovered parameter in a final, fixed theorem statement.

In optimization, the agent searched the learning schedule for Anchored Gradient Descent-Ascent and proved an exact `O(1/t)` convergence rate. The paper says it “allowed the agent to simultaneously search for the schedule and the proof, ultimately discovering a novel parameter choice that yields the stronger guarantee.” (section 4, page 6)

Verus form (inference)

Expose constants or ghost parameters in a bounded search harness, then generate a final Verus lemma with the selected constant fixed. Do not let an agent mutate the specification predicate or postcondition while searching; only the construction parameter should vary.

evidence and limits

The result is one optimization case, and a later paper extended it. It demonstrates joint synthesis, not a general method for discovering optimal Rust algorithms. Any parameter search must retain the same theorem statement and trusted model.

## technique: validate the target statement separately from the proof

use conditions

Use a validator that checks the theorem text or protected regions were not changed while the agent edited proof blocks. This is essential when agent edits can otherwise weaken or replace the specification.

how to do it

1. Store a hash or parsed representation of definitions, theorem name, and statement outside editable markers.
2. Permit edits only inside marked blocks and values.
3. After generation, compare the protected representation with the input.
4. Reject changes to the target proposition, imports, or semantic definitions unless explicitly authorized.
5. Compile the unchanged statement with no `sorry`.
6. For natural-language problems, have experts compare the formal statement to the source question.

In the full-featured architecture, the sketch is checked by a validator “to ensure the problem statement was not changed unsafely and the proof compiles.” (Figure 2 caption, page 5) The hash, AST-comparison and rejection steps above are the study's design, not the paper's.

Verus form (inference)

Build a Verus proof harness where the specification module is read-only to the agent and only proof bodies are writable. Diff the AST or canonicalized spec before and after. Reject `assume`, `external_body`, untrusted axioms, and weakened postconditions unless the project explicitly tracks them.

evidence and limits

The authors found two density misformalizations (#125 and #741(i)) and corrected lower versus upper density after the agent found proofs. This shows why compilation alone is insufficient. The validator prevents edits but does not itself establish semantic equivalence to an informal source.

## technique: use failed sketches as structured diagnostics

use conditions

Keep failed formal attempts and unresolved goals as useful research artifacts instead of discarding them. Formal failures tell a mathematician which exact subgoal remains, even when no complete proof is found.

how to do it

(The steps below are the study's reconstruction; the paper says only that formal sketches let experts focus on unresolved subgoals.)
1. Preserve the latest compile-checked sketch after each episode.
2. Record unresolved goals and tool errors in a structured comment.
3. Rank or cluster failures by the missing definition, lemma, or domain concept.
4. Give the artifacts to a human collaborator for reformulation or new domain knowledge.
5. Re-run the proof search after adding only the missing context.

The discussion says formal sketches let experts “focus on the unresolved subgoals rather than re-verifying the entire argument.” (section 6, page 11)

Verus form (inference)

Store failed Verus proof states, SMT countermodels, and compiler diagnostics as an issue queue. An agent can propose a next lemma against one state, while a human can change the specification or supply a domain invariant. Preserve failed states separately from accepted proofs so they cannot enter a release build.

evidence and limits

This is a collaboration claim rather than a measured time reduction. The paper reports that many failed sketches hid a target-sized `sorry` or hallucinated literature lemma. Failed artifacts help only if the system checks all nested goals and marks trust boundaries.

## empirical results, trust, and threat to VL

The headline full-featured run attempted all 353 formalized Erdős problems, stopping each search after at most 3,000 episodes when unsolved, and solved 9. It proved 44 of 492 OEIS questions after test-lemma checks and manual formalization review. Agent comparisons used 100 independent one-subagent attempts for basic configurations A/B and 10 attempts of 10 subagents for C/D. Solve rate was computed as the fraction of successful chunks; monetary cost summed attempts up to the first success in each chunk. The paper reports that Codex solved 7/9 of the nine solved Erdős problems in a separate 12-hour goal-mode comparison, while Claude Code solved 0/9; these are tool-specific and not evidence that either system solves the full 353-problem set.

Lean's kernel/compiler, imported mathlib definitions, protected theorem statements, and any trusted axioms are inside the accepted proof boundary. The LLM, population ratings, and AlphaProof are search components: they may be wrong, but their output is rejected unless Lean checks it. Human reviewers remain trusted for the informal-to-formal statement correspondence. The system's use of `sorry` during search is safe only if the final validator rejects every remaining occurrence.

The paper's main failures are material: agents frequently put the core difficulty into a helper lemma with `sorry`, and top sketches cited hallucinated literature lemmas. Most Erdős problems remained unsolved, and success concentrates in domains with mature Lean libraries and decomposable subgoals. Cost variance is high; the authors say discovery cost includes running the full-featured agent over all 353 problems, and AlphaProof costs about 27.5 TPU hours (estimated 60 USD) per problem.

For VL, my inference is that compile-gated multi-agent loops can materially reduce proof-authoring time, but they do not replace specification, invariant design, or trust accounting. The threat is an agent that reports a successful-looking Rust proof while weakening a postcondition, leaving an `external_body`, or hiding an unproved helper. A protected-spec validator and final clean Verus run address these concrete failure modes. The paper's Lean numbers should not be treated as Verus performance estimates.

VL should not redo a generic generate-and-check demo. The reusable parts are protected edit regions, per-episode compiler feedback, helper-lemma decomposition, test lemmas for autoformalized statements, and validated population search. New work should measure these components on Verus-specific proof obligations, with denominators for attempts, successful proofs, statement mutations, and remaining trust assumptions.

## techniques for the catalog

- compiler-gated proof loop — alternate LLM edits with Lean/Verus compilation and accept only hole-free proofs
- independent Ralph episodes — run stateless multi-turn subagents and carry forward compile-checked sketches
- helper-lemma decomposition — split monolithic goals into smaller lemmas and recheck every nested proof
- specialized prover calls — invoke a stronger proof engine on one subgoal and feed failures back to the loop
- evolutionary sketch population — rank validated candidates with ratings and sample them using P-UCB search
- formalization test lemmas — prove finite sanity cases before attempting autoformalized conjectures
- parameter-and-proof search — expose construction values for joint synthesis while protecting the theorem
- protected statement validation — prevent agents from changing specifications and reject residual placeholders
- failure-artifact collaboration — retain unresolved formal goals as precise inputs for human reformulation

Audited 2026-10-12 against the paper: checked every number (9 of 353, 44 of 492, 3000 episodes, 100 and 10 attempts, 7 of 9 and 0 of 9, 27.5 TPU hours and 60 USD), page references, quotations, the Erdos 125 decomposition and the Figure 3 comparison. Changed: removed a sentence about 22 micro-tests and 867 lines that came from a different paper (Aeneas borrow-checking), corrected the OEIS result wording and the order of the manual review, fixed the validator quotation to match the Figure 2 caption, fixed two page references (test lemmas on page 6, discussion quote on page 11), and marked reconstructed steps and the study's inferences as such. Verus-form paragraphs are marked as inference and contain no code to check.
