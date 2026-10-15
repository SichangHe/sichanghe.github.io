# Towards Automating Blockchain Consensus Verification with IsabeLLM
(authored by agents unless marked 🧑)
Tag: `jones2026blockchain`, [paper](http://arxiv.org/abs/2601.07654v1)

## model and verified claim

The paper builds an Isabelle/HOL model of Bitcoin Proof of Work in which blocks form an n-ary tree, rather than the binary tree of earlier work. It assumes a majority of computing power is honest and that participants are synchronized. Under those assumptions it proves the common-prefix consensus property: honest chains agree up to the last `k` blocks. The Isabelle theorem shown in Section 4 is:

“theorem consensus: fixes t assumes "t ∈ traces" and "p ∈ longest (State (hd t))" and "p’ ∈ longest (State (hd t))" shows "take k p = take k p’"” (Sec. 4, p. 5)

The model is a verification target, not an implementation proof of Bitcoin. Inference: a Verus port would need a Rust model of traces, trees, longest-chain selection, and the same environmental assumptions before proving an executable node correct.

## technique: model protocol invariants before asking for proofs

When to use it. Formalize the data structure and safety property first when a protocol's correctness depends on explicit environmental assumptions. Here the n-ary tree represents arbitrary forks; common prefix is selected as the consensus safety property. The paper says, “Our consensus model builds on previous work [30] by generalizing the blockchain structure from a binary tree to an n-ary tree.” (Sec. 4, p. 4)

How to apply it.
1. Define the state, traces, tree operations, mining checks, and longest-chain function in Isabelle (Sec. 4, pp. 4–5).
2. State assumptions such as `t ∈ traces`, selected paths belonging to `longest(State(hd t))`, majority honesty, and synchronization (Sec. 4, pp. 4–5).
3. Prove helper lemmas for heights, maxima, branches, weakening distance/depth, mining and honest checks, and common prefix; the paper lists these in Table 1 (p. 4).
4. Prove the final consensus theorem from those lemmas (Fig. 1, p. 5).

Verus form. Inference: represent the tree and trace model with Rust structs and `spec fn` definitions, state majority/synchronization as `requires`, and prove helper lemmas as `proof fn`. Use `ensures` for common-prefix equality and loop `invariant` clauses for any executable traversal. The Isabelle theorem itself is a specification; it does not transfer as Rust code.

Evidence. Table 1 reports 175+193 lines for the binary model and 395 lines for the n-ary model. The `x+y` entries count original proof lines plus symmetric repetitions, so the paper's “more than double” comparison is about original-plus-symmetric LoP, not wall-clock time or a success denominator (Sec. 4, p. 5).

Limits. The result depends on majority honesty and synchronization, and omits chain quality under that assumption (Sec. 4, p. 4). Inference: violating either assumption is outside the theorem and must be modeled separately for a production threat analysis.

## technique: solver-in-the-loop LLM proof repair

What it is. IsabeLLM is a Scala interface between an Isabelle server, an LLM API, and Sledgehammer. The workflow uses the LLM for a high-level proof, Isabelle to compile it, and Sledgehammer to solve remaining lines. The paper summarizes: “The main idea is that we use an LLM to understand the high-level structure of a proof and then use Isabelle’s Sledgehammer tool to solve the intermediate steps that the LLM failed (if any).” (Sec. 5.1, p. 5)

How to apply it.
1. Place the `.thy` theory and `ROOT` file in the working directory and start IsabeLLM (Sec. 5.1, p. 6).
2. Build the theory with Isabelle. Extract unproven statements and build errors if the file does not complete (Sec. 5.1).
3. Send the theory context and one unproven lemma to the LLM through its API; inject the returned raw proof into the theory (Sec. 5.1).
4. Rebuild. If lines remain, call Sledgehammer with a 60-second timeout and default provers, then extract unresolved lines and errors (Sec. 5.2, p. 9).
5. Send the current proof state, failing line, and error back to the LLM. Repeat injection, build, and Sledgehammer until success or the configured maximum iterations (Secs. 5.1–5.2, pp. 6, 9).
6. Reset chat history after a lemma succeeds and update the initial context with the completed theory; persist per-lemma JSON histories (Sec. 5.2, p. 9).

The initial prompt includes the theory prefix and lemma; subsequent prompts include only the current proof state. The templates require “Return only the raw code without any additional text, explanations, formatting, or commentary.” (Table 3, p. 10)

Verus form. Inference: the same controller can send a Verus proof obligation and Rust context to an LLM, compile with `verus`, parse diagnostics, and retry. The trusted acceptance step must remain the Verus verifier; model output is untrusted text. Sledgehammer's theorem-prover search has no direct Verus equivalent, so the repair stage would use Verus diagnostics, SMT triggers, and bounded alternative proof scripts.

Evidence. The implementation extracts and injects Isabelle code, handles build errors, records chat history, generates prompts, and bounds iterations (Sec. 5.2, p. 9). Table 2 identifies “Failed Proof,” “Undefined Fact/Method,” “Lexical/Syntax Error,” and “Timeout” as handled failures (p. 8). The paper used Isabelle2022 because it was compatible with Scala-Isabelle (Sec. 5.1, p. 8).

Limits. The LLM can hallucinate theorem names or syntax, return empty output, loop on the same failed line, or propose an impossible proof (Secs. 5.2 and 7, pp. 9, 11–12). The tool automates proof of statements but not generation of statements, functions, locales, or sets (Sec. 7, p. 12). Inference: an agent that invents the specification remains a soundness risk even if every generated proof script compiles.

## technique: staged prompts and error classification

The paper classifies build feedback before retrying. A `sorry` marks an incomplete proof and identifies where to call the LLM; a failed tactic triggers Sledgehammer first; undefined facts or methods are removed as hallucinations; lexical/syntax errors are repaired or returned to the LLM; and timeouts cause checks for hanging `metis` or `blast` tactics (Table 2, p. 8). This classification makes retries conditional rather than blindly repeating the same prompt.

Inference: for Verus, classify diagnostics into syntax/type errors, failed postconditions, invariant failures, trigger/SMT timeouts, and unsupported features. Ask the model to modify only the failing proof region, then rerun Verus. Keep a per-obligation history and stop after a fixed budget; this mirrors the paper's maximum-iteration control.

The paper observed that “IsabeLLM was most successful when the LLM broke the proof step down into more manageable parts, which Sledgehammer could then solve itself.” (Sec. 6, p. 11) Inference: prompting for smaller intermediate lemmas is a practical tactic for VL's generated Rust proofs.

## measured evidence

The experiment attempted each of 16 lemmas 10 times, with at most 5 iterations per attempt; an empty LLM response was excluded from the iteration count, and an attempt was a failure if it exceeded the limit or exited early (Sec. 6, p. 10). Thus the denominator is 10 attempts per lemma, 160 attempted runs overall. Table 4 reports successful attempts and average iterations among successes:

- `subtree height`, `height mono`, `weaken distance`, `weaken depth`, and `check add (mining)`: 10/10, average 1 iteration
- `obtain max`: 9/10, 1.4 iterations; `foldr max eq`: 5/10, 2; `branch height`: 3/10, 2 (marked as completed with Isabelle2025 Sledgehammer)
- `sub longest`: 7/10, 1.1; `sub branch`: 5/10, 1.8; `common prefix`: 6/10, 1.5
- `height add (mining)`: 6/10, 2; `height add (honest)`: 8/10, 1.7; `check add (honest)`: 9/10, 1.2
- `bounded check`: 7/10, 1 (also marked Isabelle2025); `consensus`: 10/10, 1

The table's success counts sum to 135 successful attempts out of 160, or 84.375%; that percentage is an arithmetic inference from Table 4, not a percentage reported by the paper. The table mixes Isabelle2022 runs with two rows marked as solved using Isabelle2025 Sledgehammer; those rows are not a uniform-version denominator. The model used DeepSeek R1 through the free OpenRouter API (Secs. 5.1 and 6, pp. 8, 10).

## trust, gaps, and VL relevance

The proof assistant checks the final Isabelle theory; the LLM and Sledgehammer propose proof text. The consensus theorem is only as strong as the formal model and its majority/synchronization assumptions. The paper does not report a trusted-code base, proof-checking time, token cost, or memory denominator. Sledgehammer sometimes exhausted memory, and remote calls did not produce counterexamples for impossible proofs (Sec. 7, p. 12).

Inference: the reusable contribution for VL is the closed feedback loop: generate a local proof attempt, compile, classify exact verifier diagnostics, invoke a bounded secondary solver, and retry with a narrowed proof state. Existing work already demonstrates this architecture for Isabelle consensus lemmas; VL should avoid redoing a generic LLM-to-verifier demo. The unresolved work is Rust/Verus-specific statement synthesis, ownership-aware repair, counterexample handling, and robust stopping criteria. Inference: threat to a product from agent-written verified Rust remains high for wrong specifications and unmodeled assumptions, while syntax and routine lemma failures are amenable to this loop because the Verus verifier can reject them.

## techniques for the catalog

- model-first consensus proof: define protocol states, environmental assumptions, helper lemmas, and a final common-prefix theorem
- solver-in-the-loop repair: alternate LLM proof generation, Isabelle builds, Sledgehammer, and bounded retries
- diagnostic classification: map syntax, hallucinated facts, failed tactics, and timeouts to targeted repair actions
- staged prompting: give full theory context initially, then only the current proof state and error
- bounded proof search: cap iterations, persist per-lemma history, and stop instead of looping on a repeated failed step

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
