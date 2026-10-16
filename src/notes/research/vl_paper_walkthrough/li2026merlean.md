# MerLean-Prover: A Recursive Looping Harness for Lean 4 Theorem Proving
(authored by agents unless marked 🧑)
Tag: `li2026merlean`, [paper](https://www.semanticscholar.org/paper/66e4a58edad495958f8ea9b656e2e374c03cf775)

## what is proved or measured

MerLean-Prover is a Lean 4 harness that replaces `sorry` declarations with kernel-checkable proofs. It has Planning, Lean, and Check agent roles inside a recursive outer loop. The proof plan is the only shared global object: a topologically ordered list of statements with informal claims, sketches, dependencies, status, and an anchor containing the original target theorem declaration. The Lean agent edits code for one node; independent Check agents answer one true/false question at a time: mathematical correctness, decomposition need, or faithfulness to the anchored statement.

A run counts as solved only if every plan statement closes, the original theorem signature remains, and no `sorry`, `admit`, or user axiom remains. The final proof must pass transitive `#print axioms` with only `{propext, Quot.sound, Classical.choice}` allowed (Section 4, p. 4). On FormalQualBench, 23 PhD-qualifying theorems, the harness solves 10/23, compared with OpenGauss 8/23 (Table 1, p. 4). Nine of the ten close within four hours; one takes 4h40m. Total solved-run API spend is $1,183.45 over 19h54m, averaging $118.35 and 1h59m per solved problem (Table 2, p. 5). On the Putnam 2025 slice it closes 12/12 and is fastest on 8/12, with 789 total minutes versus Axiom’s 2,577 and Numina-Lean-Agent’s 3,889 (Table 3, p. 5).

The abstract states: “M ER L EAN -P ROVER is an end-to-end Lean 4 theorem prover that replaces sorry declarations with kernel-checkable proofs.” It reports “On F ORMAL Q UAL B ENCH, a benchmark of 23 PhD-qualifying-exam theorems, M ER L EAN -P ROVER solves 10/23.” These are benchmark closure rates, not percentages of arbitrary Lean goals.

## technique: anchored proof-plan decomposition

scope and purpose. Externalize long-horizon proof state as a dependency-ordered plan and revise the plan when a statement is false, too large, or no longer faithful to the target. Use this when context pressure and accumulated dependencies make one long agent prompt unreliable.

paper procedure.

1. Accept a `.lean` file containing one or more `sorry` declarations. Create a plan whose helper nodes precede dependent nodes; each node stores an informal statement, proof sketch, dependencies, and completion status (Section 2, p. 2).
2. Store the original theorem declaration with its `sorry` body as an anchor. The anchor preserves name, parameters, assumptions, and conclusion (Section 2, p. 2).
3. Give each agent invocation exactly one objective and the minimum context needed. The Planning Agent may edit only the plan; the Lean Agent writes Lean for one node; the Check Agent is read-only (Section 2, pp. 2–3).
4. Walk open nodes in dependency order. The Lean Agent iterates compilation and repair until `lake build` passes or its compile budget is exhausted (Section 2, p. 3).
5. When a node changes, invalidate downstream statements that depend on it and restart at the top of the revised plan. Do not reuse proofs checked against a stale statement (Section 2, p. 3).
6. Stop only when all nodes and the anchored target are closed, the anchor still matches the original signature, and the transitive proof contains no forbidden placeholders or axioms (Section 2, p. 3).

The paper summarizes the global invariant: “No single prompt is asked to carry all global constraints at once; instead, the harness enforces signature preservation, axiom-freedom, and faithfulness across the loop.” (Section 2, p. 3.)

The Burnside example shows plan growth. Its initial six-node plan reaches a clean build, but the Faithfulness check rejects a weakened node. Replanning adds a missing hypothesis and helper nodes; repeated decomposition grows the plan to 32 nodes before closure at frame 63 (Section 3, pp. 3–4). The appendix reproduces closed Lean source for the anchored theorem and helper, with no `sorry`, `admit`, or user axiom (Appendix C, pp. 8–11).

Verus form. Inference: represent the plan as an external dependency DAG for Rust functions and proof functions. Anchor every executable function’s original signature and contract (`requires`/`ensures`) before agents edit proof bodies. A node can correspond to a helper `proof fn`; downstream nodes are invalidated if the helper’s contract changes. Use `invariant` on loops inside executable functions and keep the DAG itself outside runtime code. Inference: the anchor is the control that prevents an agent from “solving” a weakened Verus contract.

evidence and limits. All eight repeated runs on each of four selected FormalQualBench problems produce clean proofs (Table 4, p. 5). The paper also reports one 17-hour outlier in a separate Banach–Stone run when the plan grows to 58 statements; the authors hypothesize poorly supported Mathlib routes but leave a full explanation open (Section 4, p. 5). Mathlib coverage and model capability remain limiting assumptions.

## technique: independent mathematical, decomposition, and faithfulness checks

scope and purpose. Separate three decisions that a compiler cannot answer alone: whether a node statement is true, whether it is too large for the current route, and whether a clean-build implementation still proves the original statement. Use independent read-only Check Agent calls after each Lean-agent attempt.

paper procedure.

1. If a node builds cleanly, send the file to Faithfulness. It checks that the clean-build statement still matches the anchored original (Figure 1; Section 2, p. 3).
2. If `sorry` remains, ask Math whether the node is mathematically correct as stated. A false statement triggers planning revision rather than endless code repair (Section 2, p. 3).
3. If Math says the statement is sound, ask Decomposition whether it should be split. A “yes” produces a plan diff with smaller helpers; a “no” retries the same statement (Section 2, p. 3).
4. Any failed check invokes Planning. Accepting the plan diff invalidates affected downstream state and restarts from the revised plan (Section 2, p. 3).
5. Count success only after an external goal audit confirms original signature, no `sorry`/`admit`, and the permitted axiom set (Section 2, p. 3; Section 4, p. 4).

Verus form. Inference: add three independent checks around a Verus candidate: a contract-model check for mathematical consistency, a decomposition check for missing helper lemmas or invariants, and a faithfulness check comparing the candidate function’s original contract and state model. A verifier pass proves the current contract, so the faithfulness check must compare contract text or a normalized snapshot. A proof function should not be called at runtime; runtime behavior stays in the executable function.

evidence and limits. The Burnside trace gives all three recovery cases: Faithfulness rejects a weakened frame-6 node; Decomposition splits nodes at frames 16, 20, and later; Math finds a missing hypothesis under node 13 (Section 3, pp. 3–4). These checks are LLM judgments, not kernel facts. The kernel certificate proves the final Lean term against its final statement; it does not prove that the statement expresses the intended mathematics.

## technique: recursive repair with controlled authority

scope and purpose. Give agents disjoint authority boundaries and let the harness route failures. Planning may edit only plan statements; Lean may edit Lean code for one node; Check is read-only. This limits a model’s ability to bypass a failed check by silently changing both specification and proof.

how to do it. On a compile failure, let the Lean Agent retry within its budget. On a mathematically false node, faithfulness failure, or decomposition request, ask Planning for a plan diff. Invalidate downstream nodes, rebuild the revised plan from the top, and preserve the original target anchor. Intermediate `sorry` scaffolding is allowed during Lean-agent work, but surviving placeholders are rejected at the external audit (Section 2, pp. 2–3). The loop’s success exit is available only when every plan statement passes and the anchored theorem still matches.

Verus form. Inference: map authority boundaries to separate tools or agents: one may edit specifications and proof plans, one may edit executable Rust bodies, and one may inspect Verus output and return a Boolean decision. Keep generated repair patches reviewable and reject any patch that changes `requires` or `ensures` without a fresh intent audit. A failed verifier run should not authorize `external_body`, unchecked assumptions, or removal of a required invariant.

evidence and limits. The harness closes all 10/23 FormalQualBench problems without fine-tuning, custom RL, or theorem-specific scaffolding (Table 1 and Section 4, pp. 4–5). Sonnet closes all four tested problems, while Haiku closes only the two short ones within 12 hours; on one short problem Haiku’s longer nine-statement plan costs $26.24 and 4h34m versus Opus’s $13.53 and 16m (Table 5, p. 6). Thus decomposition helps weaker models but can raise token traffic and wall-clock cost.

## what remains trusted, contradictions, and threat to VL

The trusted base includes Lean’s kernel, Mathlib declarations, the permitted axioms, the `lake` build, the transitive `#print axioms` audit, and the Check Agents’ semantic judgments. The paper’s “axiom-free” claim means no `sorryAx` or user-introduced axiom under the stated baseline; it does not mean that the theorem statement is faithful to a product requirement. The paper compares to published baselines whose runs and budgets come from their reports; the comparison is not a controlled re-run of every system.

The paper reports a “12/12” Putnam closure and also says it is fastest on 8/12; these counts answer different questions and must remain separate. The FormalQualBench total of 10/23 includes one solve outside the four-hour budget, while nine are within it. The repeated-run stability sample has four problems times eight runs, 32 attempts, all clean; it is not a 23-problem reliability estimate.

Inference: the threat to agent-written verified Rust is contract drift during recursive repair. A model may preserve compilability while weakening a precondition, dropping a state case, or hiding a requirement in a ghost predicate. MerLean’s anchored plan, independent faithfulness check, mathematical check, decomposition routing, and downstream invalidation are directly reusable controls. Inference: VL should record contract snapshots, check every repair against the original requirement, and report solved/attempted denominators under fixed time and cost budgets. Inference: the harness does not remove the need for Verus-specific models of ownership, unsafe code, external libraries, or environment behavior; those remain outside this paper’s evidence.

## techniques for the catalog

- anchored proof-plan decomposition — externalize a topological proof DAG and invalidate downstream work whenever a plan statement changes
- independent mathematical, decomposition, and faithfulness checks — route compiler-clean, false, oversized, or weakened statements through separate read-only decisions
- recursive repair with controlled authority — give planning, code-writing, and checking agents disjoint powers and stop only after anchor and axiom audits pass

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
