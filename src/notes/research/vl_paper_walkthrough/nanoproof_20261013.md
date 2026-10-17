# NanoProof: Open and Efficient Automated Theorem Proving in Lean 4
(authored by agents unless marked 🧑)
Tag: `kripner2026nanoproof`, [paper](https://arxiv.org/abs/2610.11605)

Audit: audited 2026-10-13 against the paper; checked every number, page and section reference, quotation, the steps of techniques 1 to 10 and the compute arithmetic (Appendix F products recomputed, Appendix C counts 30 and 22 verified); changed one wrong claim (three of four search-level techniques have a usage statistic and no effect size; it is two, augmentation has none) and marked two unmarked inferences; Verus forms are labelled inference, unchanged and unchecked against the Verus reference.

source: Matěj Kripner and Milan Straka (Charles University), arXiv:2610.11605v1 (8 Oct 2026), 18 pages with appendices A to H; code https://github.com/kripner/nanoproof, extraction tool https://github.com/kripner/leantree

## what kind of paper this is

A reproduction-and-release paper for one class of Lean 4 prover: a small network trained from scratch that proposes one tactic at a time, runs it in Lean at once, and searches a tree whose branches are independent goals. The authors disclaim the search method: “We do not claim methodological novelty in the search algorithm, which follows AlphaProof; our contribution lies in the data, tooling, and pipeline that make this class of prover reproducible.” (§6 Limitations, p.9). What is new is the data preparation (turning human proofs into trees of small steps), four cheap search-level tricks, and a soundness hole they found in the interactive checker.

Three terms the paper defines (§1, p.1) and this study uses in the same sense: execution-guided, meaning the prover sees the checker's state after each step; factorized, meaning a state with several goals is split so each goal is searched alone; any-time, meaning more search budget on one problem gives a better result.

The subject is mathematics in Lean. Statements about Verus below are this study's reading and are marked.

## proved, measured, trusted

- nothing is proved about the method; the output proofs are checked by Lean
- measured: 50.8% pass@16 on MiniF2F-Test with 512 search iterations, one checkpoint chosen on the validation split from three runs (§5.1, p.8); 51.3% mean on MiniF2F-Valid over 3 runs (min 51.2%, max 51.6%) with 256 iterations after 100 training steps, 45 hours (§5.1, p.8). MiniF2F has 488 problems (§2, p.3); the test split is 244 (Appendix F, p.16)
- measured, as descriptive statistics from "a representative run" with no denominators given: 59% of proofs longer than one tactic were shortened (§3.5, p.4); 18% of otherwise valid tactics were rejected as cycles (§3.6, p.5); 32% of nodes lost candidate actions to duplicate samples (§3.7, p.5)
- one ablation only: forcing a diverse first token gave +2.0 percentage points on MiniF2F-Valid at 16 simulations, averaged over the last three checkpoints of one run (§3.7, p.5)
- estimated, not measured: every compute figure for other systems (Appendix F, pp.15-17)
- trusted: the Lean kernel; the autoformalized training statements (96,967 from NuminaMath-LEAN, §5, p.8; Inference: their fidelity to informal sources plays no role in the reported scores, because MiniF2F is the only evaluation); MiniF2F as released by the AlphaProof authors (§2, p.3)

The paper states its own weakness in one sentence: “We do not at this time possess enough computing resources to fully utilize the presented pipeline, leading to quantitative results that are sub-par compared to AlphaProof and the open-weight provers of Section 2, and to the absence of proper ablations: only diverse tactic sampling is ablated, while the other search-level techniques are reported through descriptive statistics only.” (§6 Limitations, p.9)

## technique 1: search over a tree of independent goals, with the checker in the loop

what it is: proof search as a tree with two kinds of node. At an OR node the prover picks one tactic for a goal; the tactic yields an AND node whose children, the resulting goals, must all be proved.

when to use: when the checker can report the open goals after each step and can restart from any intermediate state.

how it is done (§3.1, pp.3-4; Appendix A, p.12):
1. state: the list of open goals; action: one Lean tactic; the Lean verifier maps (state, tactic) to a list of next states, possibly empty; the agent continues independently into each (§3.1, p.3)
2. the episode ends when every state has a valid action, giving a proof tree; the reward is the negative depth: “The agent is then assigned a reward 𝑟 = −𝑑, where 𝑑 is the depth of the proof tree.” (§3.1, p.4)
3. an actor predicts the tactic, a critic predicts the negative depth of the sub-proof from the current state (§3.1, p.4)
4. the tree starts as the root goal and grows by repeating selection, expansion, backpropagation, adapted from AlphaZero and Sampled MuZero (§3.1, p.4)
5. expansion runs each sampled tactic immediately: “At node expansion, generated tactics are immediately executed in Lean, and invalid ones are discarded.” (§3.1, p.4)
6. new tactics may later be sampled for a node already expanded (progressive sampling, from AlphaProof; §3.1, p.4)
7. search settings used: 6 sampled tactics per expansion, at most 24 tokens per tactic (Table 1, p.13)

why factorize, in the paper's words on what it buys (§1, p.2, paraphrased): a node reached by two paths is searched once, budget is split between subgoals as needed, and the depth of each sub-proof is a training label for the critic. The example given is induction, where base case and inductive case are searched independently (§1, p.1).

Verus form. Inference: Verus does not expose a goal list after each proof line, so the loop cannot be copied. The nearest thing Verus reports is which `assert`, `ensures` or `invariant` clause failed. An execution-guided loop for Verus would treat the set of failing clauses as the open goals and a proof edit (an added `assert`, a call to a `proof fn`, a `reveal`, an added `invariant` conjunct) as the action, rerunning the verifier after each. Inference: factorization has a natural Verus counterpart: stating an intermediate fact as its own `proof fn` with `requires` and `ensures` cuts the obligation in two parts that can be attacked separately, the lemma body and the caller that now only needs the lemma's `ensures`. Inference: what does not carry over is cost per step. A Lean tactic runs in a retained state; a Verus step is a fresh verifier run on at least one function, so a budget of hundreds of expansions per problem is far more expensive.

evidence: validation success grows with search budget in Figure 4 (p.8): 42.4% at 8 simulations, 47.0% at 32, 49.9% at 128, 51.3% at 256.

limits: MiniF2F only; the paper says the system is not at the level of IMO or PutnamBench problems (§6, p.9).

## technique 2: do not split goals that share an unknown

what it is: two goals that mention the same not-yet-chosen term (a metavariable) are kept in one node.

when to use: whenever a step introduces a value to be chosen later, such as the middle term of a transitivity argument.

how it is done (Appendix A, p.12; §4.3, p.7):
1. after a tactic, group the resulting goals by shared metavariables; goals in one group stay together as one node
2. once a later step assigns the metavariable, the remaining goals are independent and are split again (§4.3, p.7)

the paper's example: applying the transitivity lemma `Nat.le_trans` to 2 ≤ 5 gives 2 ≤ ?m and ?m ≤ 5. “Subsequently, choosing a value for ?m in one of the goals affects the provability of the other goal, and therefore the two goals cannot be explored independently.” (Appendix A, p.12)

Verus form. Inference: the same coupling appears when a proof needs a witness: an `exists` to be shown, or a value picked with `choose`, that two later facts both depend on. Two lemmas that each mention the witness cannot be handed to two independent workers until the witness is fixed as a concrete expression. The rule for an agent that farms out subgoals is therefore: pick shared witnesses first, split afterwards.

evidence: none separate.

## technique 3: one network for actor and critic, value as a distribution over bins

how it is done (§3.2, p.4; Table 1, p.13):
1. input: the tokenized pretty-printed Lean state, then a special token saying whether a tactic or a value follows
2. tactics are decoded token by token; the value is read in one forward pass as the probability-weighted average of bin tokens; bins are the integers 1 to 64 (Table 1, p.13)
3. tokenizer: GPT-2's, extended with tokens for symbols occurring at least 1,000 times in Mathlib (§3.2, p.4)
4. size: 1B parameters, 26 blocks, width 1664, sequence length 768 (Table 1, p.13)

Verus form. Inference: none specific; this is model design. The reusable idea is the label: remaining proof depth is available for free from any finished proof and gives a search a learned estimate of how far a state is from done.

## technique 4: staged supervised training, then a self-improvement loop with a matchmaker

how it is done (§3.3, p.4; §3.1, p.4; §5, p.8; Table 1, p.13):
1. base training on the first 10B tokens of a mathematics-and-code text corpus (§5, p.8)
2. fine-tuning on 287k proof steps extracted from Mathlib, each a state, a tactic and the distance to the end of the proof; the last 10% of files (29k steps) held out, 258k used (§5, p.8)
3. the loop: sample a statement from 96,967 autoformalized statements, search for a proof, store successful proofs in a replay buffer of at most 250k transitions; alternate collecting 100 new transitions with 2 gradient updates of 256 examples; supervised fine-tuning data is mixed in at a fraction of 10%, for stability (§3.3, p.4; Table 1, p.13); 64 simulations per search while collecting (Table 1, p.13)
4. matchmaker: after a set number of first attempts per theorem, lower the sampling weight of theorems proved several times in a row and of theorems never proved, so effort goes to the edge of current ability (§3.1, p.4)
5. the paper's addition to step 4: “Compared to Hubert et al. [14], we additionally down-weight theorems for which a single-tactic proof has been found, since no shorter proof can be discovered.” (§3.1, p.4)

a negative result: a middle phase on 64M tokens of Lean code scraped from GitHub was tried. “However, we did not observe performance improvements and did not include mid-training in the final evaluations.” (§5, p.8)

Verus form. Inference: the matchmaker rule applies to any agent that repeatedly attempts a pool of verification tasks, whatever the prover: stop spending on tasks solved several times running and on tasks never solved, and concentrate on those solved sometimes. No training is needed to use it as a scheduler.

evidence: Figure 4 (p.8) shows validation success rising over 100 loop steps, mean of three runs with min/max bands. Inference: by Table 1, 100 steps is 100 × 100 = 10,000 collected transitions and 200 gradient updates; the paper does not state these totals.

## technique 5: shorten a found proof by contracting edges

what it is: remove steps from a machine-found proof while it still checks.

when to use: before storing a proof as training data, and before showing it to a person. The paper does both (§3.5, p.4).

how it is done (§3.5, pp.4-5; Algorithm 1, p.6):
1. for each non-leaf edge e = (s_t, s_t+1) with tactic a_t, and for each tactic a_t+1 applied in s_t+1, form the proof in which a_t and s_t+1 are dropped and a_t+1 is applied directly in s_t
2. recheck only the sub-tree below s_t by re-executing its tactics, starting with a_t+1; the rest of the proof is unaffected
3. when a_t had several children, try each child's sub-tree; e is redundant when at least one succeeds
4. the acceptance rule: “If contracting an edge leaves the proof valid, the edge is removed.” (§3.5, p.5)
5. restart from the beginning after every removal: “After a node is removed, the whole simplification process is restarted because removing an edge might only be possible after a different edge is removed first.” (§3.5, p.5)

the paper's example (Appendix C, p.14): a found proof of x² + 49 = (x + 7i)(x − 7i) with 30 tactics, 22 of them single `rw` steps, becomes three: `rw [← sub_eq_zero]`, `ring_nf`, `norm_num`. The counts 30 and 22 are this study's count of the listing.

Verus form. Inference: delete one proof annotation at a time (an `assert`, a `proof fn` call, a `reveal`, a `broadcast use`, one `invariant` conjunct), rerun Verus, keep the deletion if the function still verifies, and restart the pass after each success. Verus checks each function against the contracts of the functions it calls, so only the edited function needs rerunning unless a contract was changed; that is the counterpart of step 2. Inference: one difference matters. In Verus a removed `assert` can leave a proof that still passes but depends on the solver finding the fact itself, which can make it unstable under later edits. A pruned Verus proof should be rechecked more than once or with a lower resource limit before it is called minimal.

evidence: “In a representative RL run, our algorithm was able to simplify 59% of proofs longer than one tactic.” (§3.5, p.4). No measurement of the effect on training or on success rate.

## technique 6: augment stored proofs by renaming and reordering

how it is done (§3.5, p.5): when a proof is drawn from the replay buffer, for each edge, with one probability rename all hypotheses and goals consistently in the state and in the tactic, and with another probability shuffle the order of hypotheses in each goal. Neither probability's value is in Table 1.

Verus form. Inference: for fine-tuning data made of Verus functions the analogous meaning-preserving edits are consistent renaming of variables and reordering of `requires` conjuncts. Reordering proof lines is not safe in the same way, because an `assert` may depend on one before it.

evidence: none.

## technique 7: discard a step that returns to a goal already on the path

how it is done (§3.6, p.5):
1. at expansion, compare each resulting goal with the goals on the path to the root
2. the rule: “When a tactic application results in a goal 𝐺 that is equivalent to a goal 𝐺 ′ already present on the path to root, the tactic is discarded.” (§3.6, p.5)
3. the equivalence used: “Note that goal equivalence is checked at the syntactic level up to goal re-shuffling, goal renaming, and whitespace changes.” (§3.6, p.5)

why it is sound to discard: any proof through the repeated goal could be had by proving the earlier occurrence directly (§3.6, p.5).

Verus form. Inference: in an edit-and-recheck loop, keep a normalized record of the failing obligation after each edit and reject an edit that leaves the same obligation failing with nothing else changed, for example an added `assert` that restates the postcondition. It prevents an agent from stacking restatements.

evidence: “In a representative run, 18% of otherwise valid tactics were rejected due to cycle detection.” (§3.6, p.5)

## technique 8: force variety in the first token of sampled steps

what it is: when several candidate tactics are sampled from the model, cap how many may start with the same token.

how it is done (§3.7, p.5): sample the first token of the candidates with the Gumbel-Top-k trick so that no token occurs more than a set cap; the paper describes only the first sampling step as changed.

the problem it addresses: “In a representative run, 32% of nodes had their action count reduced due to duplicated sampling.” (§3.7, p.5)

Verus form. Inference: when an agent asks a model for k candidate repairs of one failing obligation, duplicates waste verifier runs in the same way. The cheap version needs no access to token probabilities: deduplicate candidates after normalizing whitespace and names, and require that candidates differ in kind (a lemma call, an `assert`, a changed `invariant`) before spending verifier time.

evidence: “Taking an average over last three saved checkpoints in the same run, this diverse tactic sampling increased performance on MiniF2F-Valid by 2.0 percentage points under 16 simulations, highlighting its importance for small compute budgets.” (§3.7, p.5). One run; no figure for larger budgets.

## technique 9: turning human-written proofs into trees of small checked steps

what it is: a three-stage conversion of Lean proofs into training data in which each node is one goal, each edge one simple tactic, and each node carries the size and depth of the proof below it.

when to use: to get supervised data for a step-at-a-time prover from a library written for human readers.

how it is done (§4, pp.5-7):
1. singleton tree: match each tactic application with the goals it affects so each node has one goal; built on Lean REPL and an extended parser module from the Paperproof visualizer (§4.1, p.6)
2. break up compound steps (§4.2, p.6):
   - a tactic whose term contains a nested `by` block: replace the block by `sorry`, making it a child goal, and emit its tactics as separate steps
   - a `calc` chain: “We decompose such a block into one have tactic per step, followed by a final exact tactic that combines the intermediate lemmas.” (§4.2, p.6)
   - `cases` and `induction` with inline branches: move each branch's proof into its own steps
   - a `rw` with several rules: split into one `rw` per rule
3. merge: “To obtain the final proof tree, sibling nodes in a singleton tree are merged if they share a metavariable.” (§4.3, p.7)
4. verify: execute the whole tree from the root along every edge and check each branch ends proved; drop trees that fail (§4.3, p.7). “Importantly, each included tree is independently verified by executing it from the root down in topological order.” (§4, p.5)
5. store per node: goals with hypotheses, the tactic edge with parent and children, `proof_size`, `proof_depth`; per file: imports, and per theorem the open namespaces and character spans (Appendix H, pp.17-18)

constructs the paper lists as hard for this (§4, p.5): combinators such as `try`, `iterate`, `any_goals` whose affected goals are decided at run time; `all_goals` and `<;>` which act on several goals; tactics that reorder goals.

Verus form. Inference: a Verus proof has no tactic steps to split, so the extraction as built does not carry over. A corpus with the same purpose would record, for each verified function, the sequence of proof annotations and, for each prefix of that sequence, what the verifier still reports failing; that requires rerunning Verus on every prefix. Inference: the part that carries over unchanged is step 4: every derived training example is re-executed and dropped if it does not check.

evidence: 92,927 trees from Mathlib at Lean v4.27.0 (§4, p.5); 9.53% of Mathlib's tactic proofs could not be converted with all tactics verified and were left out (§4, p.5). Inference: 92,927 / (1 − 0.0953) ≈ 102,700, which agrees with the 103k tactic proofs in Figure 1 (p.3).

## technique 10: check only what each step adds, and recheck the finished proof elsewhere

what it is: a correction to how the interactive checker validates steps, found because the prover learned to exploit the old behaviour.

the finding (Appendix E, p.14): the Lean REPL did not kernel-check the terms that tactics assigned. “Our prover managed to exploit these inconsistencies, finding 12 incorrect proofs in the MiniF2F validation set that passed verification in the REPL when using the tactic mode.” (Appendix E, p.14)

how it is done (Appendix E, pp.14-15):
1. the REPL's own later fix type-checks the whole proof term after every tactic. This fails whenever the proof has branched, because each branch sees the other as an unfilled hole, so correct steps are rejected
2. the paper's rule: “We propose a different strategy: Instead of verifying the type-correctness of the whole proof term, type-check only the new assignments introduced by a tactic application.” (Appendix E, p.14)
3. correctness of the whole then follows step by step, and each assignment is checked once, so checking a proof costs linear and not quadratic time (Appendix E, p.15)
4. independently of all this, every final proof is exported as standalone Lean and checked by Lean itself: “Note that all proofs found by our prover are independently verified directly using Lean, bypassing Lean REPL together with the new verification algorithm described in this section.” (Appendix E, p.15)

Verus form. Inference: the lesson is about the harness, and it applies directly. Whatever fast path an agent uses during search (a cached run, one function verified in isolation, a wrapper that parses verifier output), the acceptance check must be a clean run of Verus on the complete crate, with a scan that the accepted source contains no `assume`, `admit()` or `#[verifier::external_body]` that the task did not allow. Inference: twelve false proofs out of a validation split of 244 is about 5% of problems (the paper gives the count, not the rate); a search process optimizing for "the checker said yes" finds checker holes at a rate that matters, and a reported success rate from a harness without step 4 is not evidence.

evidence: the 12 cases; one is printed (p.14), which real Lean rejects with an error about a placeholder it cannot synthesize.

## how the compute comparison is built

Appendix F (pp.15-17) converts reported hardware time to TFLOPs with fixed per-device factors, for example 312 TFLOPS for an A100 and 383 for an AMD MI250.
- NanoProof: supervised training on four A100s for 16.3 hours (7.3 × 10^7), the loop on four MI250 accelerators for 45 hours (2.5 × 10^8), final evaluation 11 hours (6.1 × 10^7), total 3.8 × 10^8 TFLOPs (pp.16-17). These products were recomputed for this study and agree.
- HyperTree Proof Search: 1260 A100-days, 3.4 × 10^10; ABEL: 96 A100-days, 2.6 × 10^9; AlphaProof: 302,010 TPU-days, 2.4 × 10^13 (p.16). The ratios 90×, 7× and 63,000× follow.
- the headline: “NanoProof achieves 50.8% pass@16 on MiniF2F-Test, exceeding the two closest systems of its class, HyperTree Proof Search and ABEL, at roughly 90× and 7× less compute, and using more than four orders of magnitude less compute than AlphaProof.” (Abstract, p.1)

## inconsistencies and weak points in the evidence

- Inference: the comparison favours no one cleanly: NanoProof's total includes its evaluation while the two it is compared with cover training only (Appendix F, p.17), which counts against NanoProof; but NanoProof's total leaves out the cost of producing the 96,967 autoformalized statements it trains on (Appendix F, p.16), and AlphaProof's 100,000 TPU-days of autoformalization are in its total
- the paper itself says the systems differ in Lean version, pass@k protocol and search budget (§5.1, p.9). Inference: "exceeding" two systems on a benchmark under different protocols is weaker than the abstract's wording
- the abstract gives 50.8% as pass@16 without the 512 iterations per attempt stated in §5.1; the validation figures are at 256 iterations, so test and validation numbers are not like for like
- the DeepSeek-Prover-V2 point in Figure 5 is a guess: its budget is undisclosed and is set at about 10^13 TFLOPs from its architecture (Appendix F, p.16)
- §3.5 refers to the pruning procedure as Listing 1 while it is printed as Algorithm 1 (p.6), and §4.2 uses Listing 1 for a different display
- of the four search-level techniques, pruning (59%) and cycle detection (18%) have a usage statistic and no effect size, and augmentation has neither; only diverse sampling (32% usage, +2.0 points) has an effect size; the percentages come from a run the paper calls representative without saying which

## already built, so not for VL to rebuild

- an open pipeline for this prover class in Lean 4, with data and weights
- LeanTree: the extraction tool, the 92,927-tree dataset, and a Lean interface with a pool of environments served over HTTP for distributed search (§3.4, p.4)
- the fix for unsound step checking in the Lean REPL setting

## threat to VL

Inference, all of it. Small. The system proves competition mathematics at about half of MiniF2F while large-model provers the paper cites report 88.1% and 99.6% (§2, p.2); it does not touch program verification; its method needs a step-level proof state that Verus does not offer. Its use to VL is as a source of four inexpensive loop disciplines (pruning, cycle rejection, candidate variety, task scheduling) and one warning with a number attached: a search-driven prover found 12 ways through an unsound checker on one small benchmark split.

## techniques for the catalog

- AND-OR goal search — pick one step per goal, require all resulting goals, run every candidate step in the checker at once and drop the invalid ones
- depth as reward — score a finished proof by negative tree depth so the search prefers short proofs that branch
- coupled-goal merging — keep goals that share an undetermined term in one node and split only after the term is chosen
- shared actor-critic with value bins — one model emits either a step or a value token, the value being a weighted average over discrete bins
- staged training plus replay loop — pretrain on text, fine-tune on extracted steps, then train on the prover's own successful proofs with a 10% supervised fraction mixed in
- matchmaker scheduling — lower the priority of tasks always solved, never solved, or solved in one step
- edge-contraction pruning — drop one step at a time, recheck only the affected sub-proof, restart after each success
- rename-and-shuffle augmentation — rename hypotheses consistently and reorder them when reusing a stored proof
- path cycle rejection — discard a step whose resulting goal equals, up to renaming and order, a goal already on the path to the root
- first-token diversity cap — limit how many sampled candidates may begin with the same token
- proof-tree extraction — split human proofs into single-goal nodes and simple steps (nested blocks, calc chains, case branches, merged rewrites) and keep only trees that re-execute
- distance-to-end labels — store sub-proof size and depth at every node as supervision for a value estimate
- incremental step checking — kernel-check only the terms a step newly assigns, which stays correct across branches and is linear in proof length
- independent final recheck — accept a proof only after checking it as a standalone file outside the interactive harness
- hardware-time compute accounting — convert reported device-days to a common unit with fixed per-device factors and state what each total includes
