# OpenProver: Agentic and Interactive Theorem Proving with Lean 4
(authored by agents unless marked 🧑)
Tag: `kripner2026openprover` , [paper](https://www.semanticscholar.org/paper/2afd06688ad508215a252a23531527cc481ca50a)

## scope and result
OpenProver is an open-source theorem-proving system that combines a planner, parallel workers, independent verifiers, persistent memory, Lean checking, and an interactive terminal UI. The paper's core claim is architectural: “OpenProver integrates a PlannerWorker-Verifier architecture inspired by recent ATP agentic systems such as Aletheia.” (Abstract, p. 1) Lean provides an executable acceptance check for every submitted proof. Inference: the same separation can organize Verus proof generation, but the paper evaluates Lean only and does not prove that the architecture transfers to Rust or Verus.

The reported experiment evaluates 185 ProofNet theorems with a 100k-token budget per problem. Table 2 reports Kimi-K2.5 success of 36.8% for linear rollout and 57.3% for OpenProver, and Leanstral success of 21.1% and 28.1%, respectively (Section 4, p. 5). The denominator is 185 theorems for each model and method; the paper gives percentages but not the integer success counts. Inference: percentages imply about 68 versus 106 successes for Kimi and 39 versus 52 for Leanstral, but those rounded integers are not author-reported and should not be presented as exact counts.

## technique 1: planner-worker-verifier decomposition

What it is

The system has one Planner maintaining global state, independent Workers exploring separate proof directions, and Verifiers independently checking each Worker output. The paper states: “Workers are independent agents spawned by the Planner.” (Section 2.1, p. 3) and “For each finished Worker, we spawn a Verifier tasked with producing an independent natural language feedback with the goal of revealing flaws in the Worker output.” (Section 2.1, p. 3)

When to use it

Use this architecture when proof search has many plausible strategies and a single chain of reasoning can anchor on an early mistake. Independence is intended to reduce correlated errors, while the verifier supplies negative feedback before the planner commits to an approach. It assumes a checker or reviewer can inspect worker artifacts.

How to apply it

1. Give the Planner the theorem, current Whiteboard, repository summary, and recent history.
2. Let it emit a reasoning trace, free-form output, and a list of actions. Algorithm 2 says to “Run a1, . . . , ak in parallel and wait for completion” (Algorithm 2, p. 4).
3. Spawn Workers with plaintext tasks such as proving a lemma, seeking a counterexample, or formalizing an informal proof (Section 2.1, p. 3).
4. Spawn a fresh Verifier for each completed Worker; do not expose the Worker's reasoning trace to that verifier (Section 2.1, p. 3).
5. Feed worker results and verifier feedback to the next Planner step; repeat until a proof is found or budget is exhausted (Section 2.3, p. 4).

Verus form (inference)

Inference: represent each Worker as an agent asked to produce a candidate Rust lemma, invariant, or Verus proof. A Verifier runs `verus` on the candidate and reports diagnostics; a second verifier can inspect assumptions or `external_body` boundaries. The Planner should merge only artifacts that pass verification and should keep independent attempts separate until checked. Verus's acceptance is stronger than natural-language review, but it still depends on the specification and trusted compilation boundary.

Evidence and limits

The evidence is the architecture and the ProofNet comparison. No ablation isolates workers from verifiers, so the paper does not establish which component causes the gain. Independent natural-language feedback can itself be wrong; only Lean checking certifies a formal proof.

## technique 2: whiteboard and repository memory

What it is

The Planner periodically writes a compact Markdown Whiteboard containing the current plan, failed attempts, and ideas to revisit. Longer snippets are stored in a Repository of Markdown or Lean files. The paper says: “Lean Items are only stored if they pass the Lean formal verification; otherwise, the errors and warnings are fed back to the Planner.” (Section 2.2, p. 4)

How to apply it

1. Initialize Whiteboard `W`, repository `R`, and history `H` to empty (Algorithm 1, p. 4).
2. At each Planner step, provide `W`, repository slugs/summaries, recent history, and theorem `T`.
3. Use `write_whiteboard` for a compact plan and `write_items` for detailed failed attempts, lemmas, literature notes, and Lean snippets (Table 1, p. 3; Section 2.2, p. 4).
4. Store a Lean item only after Lean verification; on failure, return errors and warnings instead of the item.
5. End with `discussion.md` summarizing the search and result (Algorithm 1, p. 4).

Verus form (inference)

Inference: use a small planner state file for the active contract and proof obligations, and a repository of candidate `.rs` proof snippets, invariant notes, and failed diagnostics. A staging hook should run Verus before promoting a snippet to the trusted repository. Keep source, tool version, and command-line options with each accepted artifact so a later agent can reproduce it. This is a workflow recommendation; the paper does not specify Verus storage.

Evidence and limits

The memory design addresses context limits, but no experiment measures repository retention or error reduction. A compact summary can omit a critical assumption, and a failed proof may be incorrectly discarded if the checker configuration changes.

## technique 3: Lean feedback at three points

What it is

OpenProver integrates Lean in three ways: formalize a natural-language proof and repair errors; let the Planner verify intermediate Lean items; and let Workers call `lean_verify`, `lean_search`, and `lean_store` (Section 2.4, pp. 4–5). The paper lists the tools: “lean_verify – Verify the correctness of a Lean snippet” and “lean_search – Perform semantic search over Mathlib … obtaining the k most relevant definitions.” (Section 2.4, p. 5)

How to apply it

1. Supply a Lean theorem file containing one or more `sorry` placeholders.
2. After natural-language proof search, submit a generated Lean proof; on errors or warnings, repair it and, if needed, return to the informal proof (Section 2.4, p. 4).
3. During search, verify intermediate lemmas as repository items.
4. Let Workers search Mathlib and append imports, namespaces, definitions, or proven sublemmas with `lean_store`.
5. Treat formalization difficulty as a separate bottleneck: the paper notes that “formalization is often more challenging than the informal proof search.” (Section 2.4, p. 5)

Verus form (inference)

Inference: provide workers a `verus` command, a source search tool for existing Verus specifications, and a store operation for imports and proved lemmas. Run the checker after each candidate lemma, preserve diagnostics, and reject any snippet that relies on unsupported axioms or unverified external bodies. The paper's `sorry` placeholder has no safe Verus analogue; generated Rust should be accepted only when all required proofs verify.

## technique 4: human steering and reproducible budgets

The terminal UI streams all agents, exposes planner history and Whiteboard state, and allows a user to interrupt workers or the planner. Manual mode asks the user to approve each action set; autonomous mode skips approval (Section 3, p. 5). Inference: this is useful for VL debugging because a human can stop a proof direction before it consumes solver budget, while audit logs preserve why it was stopped.

The experiment fixes a 100k-token budget per theorem and compares against a linear conversation with unlimited Lean verifications under the same token budget (Section 4, p. 5). The denominator is 185 ProofNet theorems per model/method, and the setting is autonomous mode. The paper does not report runtime, token use distribution, confidence intervals, or per-theorem paired outcomes. Inference: VL evaluation should publish these missing denominators and distinguish a verification timeout from an invalid proof.

## what is proved and trusted

Lean checks the generated proof terms, so accepted Lean artifacts receive kernel-level assurance under Lean's trusted base. The architecture, memory policy, and natural-language feedback are not formally proved. The experiment measures pass percentages, not semantic correctness beyond Lean acceptance. Trusted elements include theorem statements, Lean/mathlib, model outputs, prompt policy, token budgets, and the authors' baseline implementation.

## threat to VL and what not to redo

Inference: threat to a product generating agent-written verified Rust is moderate. The system offers a concrete orchestration pattern and an empirical baseline, but its results are Lean-specific and the paper does not evaluate Verus, Rust ownership, unsafe code, or specification adequacy. VL should reuse independent worker directions, checker-gated artifact promotion, persistent failure memory, and interactive steering. It should not redo a generic claim that formal checking is useful; the novel engineering question is whether Verus diagnostics and ownership contracts benefit from this architecture under matched budgets.

## techniques for the catalog

- planner-worker-verifier loop — delegate independent proof attempts, verify each independently, and feed feedback to a stateful planner
- checker-gated repository — persist formal snippets only after Lean or Verus acceptance and return diagnostics otherwise
- three-point proof checking — verify final proofs, intermediate lemmas, and worker tool calls during search
- interactive budgeted orchestration — let a human inspect or interrupt agents while preserving autonomous reproducibility under a fixed token budget

Checked 2026-10-15 against the paper by a Codex agent for openprover_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
