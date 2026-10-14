# HyperTree Proof Search for Neural Theorem Proving
(authored by agents unless marked 🧑)
Tag: `lample2022hypertree`, [paper](https://arxiv.org/abs/2205.11491)

## scope and result

Lample et al. present Evariste, a transformer prover whose search procedure is HyperTree Proof Search (HTPS). The paper's central problem is backward proof search: a tactic turns one goal into zero or more subgoals, and every resulting subgoal must be proved. The paper states, “The automated prover builds a hypergraph with the theorem to be proved as the root node, tactics as edges and subgoals as nodes.” (Section 1, p. 2). A proof is a hypertree whose leaves are empty sets. The reported headline results are 82.6% cumulative validation coverage on Metamath, 58.6% cumulative coverage on miniF2F-valid in Lean, and 91.3% cumulative coverage on the Equations identities split (Sections 7.1.1–7.1.3, pp. 11–12). These are cumulative training-time rates unless explicitly called pass@k; they are not guarantees for arbitrary new goals.

Inference: for Verus, the analogous search state is a Rust/Verus verification goal and its current assumptions, while an action is a candidate proof command, lemma invocation, invariant, or specification edit. The Verus verifier remains the final checker; a model's score cannot replace that check.

## technique: hypergraph proof search (HTPS)

When to use it: use HTPS when a tactic/action can create several obligations and all obligations must be discharged. The paper explicitly motivates this asymmetry: “In theorem proving, we need to provide a proof of all subgoals created by a tactic” (Section 1, p. 2). It is useful when breadth-first search explodes and when a critic can estimate whether an unfinished goal is solvable.

How the paper does it:

1. initialize a hypergraph with only the root goal. A hyperedge is `(goal, tactic, children)`, where children is the possibly empty set of subgoals (Appendix A.1, p. 18)
2. selection recursively follows PUCT or regularized-policy scores from the root, constructing one partial proof hypertree with solved and unexpanded leaves. Several selections are run sequentially with virtual loss so model calls can be batched (Sections 4.1, p. 6)
3. expansion asks the policy model for `B` tactics at each unexpanded leaf, executes each candidate in the formal environment, keeps valid tactics, and inserts their child goals. The paper's worked example uses `B = 2`; invalid tactics are rejected and nodes are classified solved, invalid, or unsolved (Section 4.2, p. 7)
4. back-propagation assigns solved leaves value 1, invalid leaves 0, and other leaves the critic value. A parent's value is the product of its children's values, then `N(g,t)` and `W(g,t)` are updated and `Q=W/N` is used in future selection (Section 4.3, p. 7)
5. stop when the root is solved or the expansion budget is exhausted. Cycles encountered during simulation are removed, virtual counts are undone, and search restarts (Appendix A.3, p. 19)

The exact recursive status rules matter operationally. A node is solved if one tactic has no subgoals or all children solved; a node is invalid if it has no valid tactics or every tactic has an invalid child (Appendix A.1, p. 18). The selection algorithm chooses the highest-prior expandable tactic, adds its children, and repeats until no expandable leaf remains (Algorithm 1, Appendix A.3, p. 19). The paper explains the value calculation with a concrete example: “Because g2 is solved, we set vT (g2 ) = 1. The values of g3 and g4 are estimated with the critic model, e.g. vT (g3 ) = cθ (g3 ) = 0.1.” (Section 4.3, p. 7).

Verus form: Inference: represent each candidate proof step as a branch that is actually submitted to Verus. A branch's children are the new verification obligations produced by a `requires`/`ensures` contract, `assert`, `by` proof block, loop invariant, or lemma call. Keep the checker result as the solved/invalid signal. Verus proof code should use ordinary supported constructs such as `proof fn`, `lemma`, `requires`, `ensures`, `assert`, and `invariant` declarations; `invariant` is a declaration on a loop, not a function call. Inference: a practical implementation would generate candidate snippets, invoke Verus, parse all resulting diagnostics, and store a DAG keyed by normalized goal state. Do not treat a generated `proof fn` as runtime code, and do not put `external_body` on the function whose body is being verified.

Evidence and limits: HTPS alone, with a supervised policy, reaches 65.4% pass@32 on Metamath validation and 58.6% cumulative miniF2F-valid after online training (Table 3, p. 12; Table 2, p. 11). On Metamath test, Evariste reaches 72.4% pass@32 versus 61.2% for the supervised model (Table 3, p. 12). These denominators are theorem splits and eight or 32 independent searches, not individual proof obligations. The search assumes the policy can propose at least some valid tactics, the formal environment rejects invalid actions, and the product-of-child-values approximation is useful; the paper says it assumes subgoal solvability is independent “for simplicity” (Section 4.3, p. 7). It also reports that many miniF2F theorems remain unsolved despite large attempt counts (Section 8, p. 14).

Inference: Verus goals can share mutable context and trigger solver behavior that is unlike independent children, so the product model is a heuristic. A Verus integration must preserve the exact source and dependency context for each branch and must re-run the verifier before accepting a proof.

## technique: online training from proof searches

When to use it: use online training when the initial supervised corpus does not cover the target goals and solved or failed searches can provide new examples. The paper's architecture has asynchronous provers, a controller, and distributed trainers. “Provers are asynchronously running proof searches using a version of the models synchronized with the trainers, coupling training and data extraction in an online procedure that leads to continuous performance improvements.” (Section 5, p. 8).

Steps:

1. pretrain an encoder-decoder transformer with a masked seq2seq objective on mathematical arXiv LaTeX (about 6 billion tokens and 40 GB), then fine-tune a policy on environment-specific proofs (Section 6.2, p. 10; Section 5.3, p. 9)
2. run many asynchronous HTPS provers. The controller assigns statements and collects statistics; provers periodically pull fresh model weights (Section 5.2, p. 8)
3. after a successful search, extract policy examples from a minimal proof hypertree. Minimality is measured by proof steps for Metamath/Equations and total tactic CPU time for Lean (Section 5.2, p. 8)
4. extract critic examples from solved, invalid, and sufficiently visited nodes. Targets are 1 for solved, 0 for invalid, and the selected tactic's final `W/N` estimate for internal nodes (Section 5.2, p. 8)
5. place policy and critic samples in separate finite queues, discard oldest samples when full, uniformly sample batches, weight the two objectives equally, and continue sampling supervised data (Section 5.2, p. 8)
6. keep the online learning rate at `3 × 10^-5` after warm-up; the reported standard run uses 16 trainers and 32 provers on 48 V100 GPUs for Metamath and Equations (Section 6.3, p. 10)

The paper reports an ablation showing why the targets and filtering are material. On Equations identities, minimal proofs of all solved nodes reach 78.1% cumulative rate, while all proofs reach 40.6%; on Metamath validation, minimal root proofs reach 68.6% pass@8 (Table 4, p. 13). Removing the critic reduces Metamath validation from 68.6% to 64.8% and Equations from 78.1% to 65.6%; hard 0/1 internal targets reduce Equations to 63.1% (Table 5, p. 13). Refreshing model weights every five minutes performs better over time than one-hour, six-hour, or no updates (Section 7.2.4, p. 14; Figure 7).

Verus form: Inference: collect `(goal state, verified proof action)` pairs only after Verus accepts the action and retain failed attempts as critic negatives, with a separate target for “likely solvable.” A worker can run Verus in a sandbox, serialize diagnostics and assumptions, and a trainer can update a tactic-ranking model. The policy objective can predict a lemma name and arguments or a proof block; the critic can predict a probability that the current obligation is solvable under the current context. Inference: minimality should be measured by proof obligations, verifier time, or proof-script size, but the metric must be recorded with its denominator because a shorter script can be slower or less maintainable.

What is trusted: the paper's prover submits generated tactics to Metamath, Lean, or Equations, so the kernel/environment checks final validity. The learned policy, critic, queues, and controller are heuristic components. Inference: for VL, the Verus verifier, Rust compiler, external libraries, and the specification remain trusted boundaries; training success does not establish that a specification captures the intended product behavior.

## technique: environment preparation and search randomization

The authors avoid starting online search from a random model. They fine-tune on environment-specific data and use exact token formats. For Metamath, the model emits `LABEL MANDATORY_SUBSTS <EOU> LABEL_STATEMENT PREDICTABLE_SUBSTS <EOS>`; decoding stops at `<EOU>` during search so predictable substitutions are not generated (Section 6.1, p. 9). They also construct a dependency DAG and forbid tokens that would leak a theorem's dependencies into its own search (Section 6.1, p. 9). For Lean they use fixed versions and byte-pair encoding; for Equations they generate synthetic proofs and then train online only on the Identities split (Section 6.1, pp. 9–10).

They sample, rather than fix, search parameters per proof: tactic samples 8/16/32/48, temperature 0.8–2.0, length penalty 0–1.2, expansion budget 1,000–10,000, depth penalty 0.8/0.9/0.95/1, and exploration constant 0.01–100 (Appendix C, p. 28). The motivation is goal-specific depth versus breadth and a changing model (Appendix C, p. 28). Randomized parameters improve Equations identities from 73.8% with fixed parameters to 78.1% (Table 5, p. 13).

Verus form: Inference: normalize Rust/Verus goals without erasing types, ownership facts, module paths, or imported specifications. Keep dependency-aware forbidden-action rules so a generated proof cannot call a lemma that is unavailable in the current module or introduce a circular proof dependency. Sample decoding and verifier budgets during training, but report fixed evaluation budgets and pass@k separately. Inference: parameter randomization is useful for exploring brittle solver contexts, yet every accepted artifact still needs deterministic verification in CI.

## what the paper proves, measures, and leaves open

The measured claims are pass rates, cumulative solved fractions, training compute, and ablations across three environments. Table 2's Lean pass@64 uses 64 trials; its 58.6% miniF2F-valid number is cumulative because those statements were online-training inputs. Table 3's Metamath 82.6% is cumulative validation coverage, while 65.6% is test pass@32. The paper does not prove a theorem that HTPS is complete, optimal, or transferable to Rust. It reports no denominator for the total number of Equations identities in the prose, so the 91.3% rate should be treated as the table/split's aggregate rather than reconstructed as an unverified count. It also acknowledges that generated proof-search data may be insufficient long term and suggests automated theorem generation (Section 8, p. 14).

Inference: the threat to a product generating agent-written verified Rust is substantial for proof-authoring cost and search latency, especially where a goal has many independent subgoals. HTPS does not remove the need to specify contracts, loop invariants, ghost state, or trusted interfaces, and Verus's solver failures may be less regular than the paper's tactic environments. A realistic VL design should therefore use HTPS-like ranking and online data collection around a strict Verus check, with reproducible source snapshots and human review of specifications.

## what VL should not redo

The paper already establishes the value of hypergraph search over path-only search, minimal-proof filtering, soft critic targets, asynchronous online updates, and per-attempt parameter randomization on Metamath, Lean, and Equations. Repeating those comparisons without a Verus-specific question would add little. A new VL experiment should instead measure transfer to Rust ownership, contract inference, solver-context stability, and repair cost under dependency or API changes.

## techniques for the catalog

- hypergraph proof search: recursively select a partial hypertree, expand valid tactics, and back-propagate all-child values until the root is solved
- online proof-search training: train policy and critic models continuously from minimal verified proofs and solved, invalid, and internal search nodes
- minimal-proof filtering: retain shortest proofs under an environment-specific step or CPU-time metric for policy training
- soft critic targets: train internal nodes on their final search value `W/N` rather than hard zero/one labels
- stochastic search parameters: sample decoding and HTPS budgets per goal to balance depth, breadth, and model drift
- dependency-aware environment setup: use exact token formats, theorem DAGs, forbidden dependencies, and fixed evaluation versions before online search
Checked 2026-10-14: audit record lample2022hypertree; paper-study comparison complete; gate executed; experiments not rerun
