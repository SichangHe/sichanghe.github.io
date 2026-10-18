# Learning to Reason in Large Theories without Imitation
(authored by agents unless marked 🧑)
Tag: `bansal2019learning`, [paper](https://arxiv.org/abs/1905.10501)

## scope and result
Bansal et al. address theorem proving when a goal has a very large repository of possible premises and no human proof traces for training. They combine deep reinforcement learning (RL), learned tactic/premise scores, and a tf-idf retrieval list used for exploration. The abstract states: "We suggest an exploration mechanism that mixes in additional premises selected by a tf-idf (term frequency-inverse document frequency) based lookup in a deep reinforcement learning scenario." (Abstract, p.1)

The base environment is HOList over HOL Light. A proof step applies a tactic to a goal and selected premises; if all resulting subgoals are proven, the original goal is proven (§3, pp.2–3). Figure 1's induction example uses `MATCH_MP_TAC NAT_INDUCTION`, then `ARITH_TAC` on the base and induction goals (§3, p.2).

## technique: learned tactic and premise selection

Use this when a proof assistant exposes many candidate theorems but only a few tactics. Steps from §3 (pp.2–3):

1. Encode the current goal and each available premise, and score tactics and premises with the learned model (§3)
2. For each tactic, pass its top-k premises as arguments; this creates candidate tactic applications (§3)
3. Expand candidate applications with breadth-first search, using a bound on how many candidates per goal are explored (§3)
4. In imitation learning, train on goal/tactic/premise tuples extracted from human proofs; in this paper, replace those labels with proofs found by the RL loop (§3–§4)

The authors report around 10,000 potential premises per proof step (§3, p.3), making premise selection the branching bottleneck. The architecture is a GNN plus dense scoring in Figure 2. Inference: a Verus adaptation could rank candidate lemmas, `requires` facts, and proof functions for a failing verification condition, but this is a search heuristic rather than a change to Verus's proof semantics. Inference: a ranking model must never bypass Verus checking; each selected candidate remains subject to the verifier.

## technique: RL loop with exploit/explore premise lists

Use this when human proof data is unavailable and a prover can generate new successful traces. Steps from §4 (pp.3–4):

1. Run several theorem provers in lockstep with policy training; use the current model to try training-set statements (§4)
2. When a statement is proven, add its proof to the growing training data (§4)
3. Prune unnecessary premises before learning from the proof (§4.3)
4. For a goal, select a learned exploitation list `{P1,…,Pk1}` and an exploration list `{Q1,…,Qk2}`; interleave them before proposing tactic actions (§4)
5. Tune `k1` upward for exploitation and `k2` upward for exploration; the Reference setup has `k2=0` (§4)

The authors explain the purpose: "The provers try to prove the statements in the training set using the model for proof guidance as it is training." (§4, p.4) They also warn that the loop can stall if it cannot prove any new theorem, so exploration is needed to expand the horizon (§4.1, pp.4–5). For zero-human loops the training needs some non-empty starting data; the authors generate it by trying all training theorems with a randomly initialized model (Appendix A.2, p.13). Inference: in Verus, this means generating alternative lemma contexts or trigger sets for a verification condition, then accepting only contexts for which Verus produces a proof. Inference: unlike HOL Light's premise arguments, Rust code and specifications may constrain which facts can be made visible, so this requires a Verus-specific interface.

## technique: tf-idf retrieval for exploration

Use this when learned scores are initially weak and a symbolic retrieval signal can find lexically related premises. Steps from §4.1 (pp.4–5):

1. Treat the goal as a query and the theorem repository as documents (§4.1)
2. Represent each expression as a token vector and score cosine similarity `s(G,P)=<r(G)/||r(G)||, r(P)/||r(P)||>` (§4.1)
3. Set `r(P)i=tf(P,i)idf(i)`, with `idf(i)=log(N/ni)`; test boolean, logarithmic, and natural term-frequency weighting (§4.1)
4. Evaluate offline on 20% of the complex-corpus training proofs using average relative maximum rank and recall@k, then choose the best weighting before an expensive RL run (§4.1)
5. Add dropout `p=0.1` to zero components of the goal representation and vary retrieval results across repeated attempts (§4.1)

Table 1 chooses boolean weighting: recall@128 is 0.31, versus 0.21 logarithmic and 0.11 natural, and boolean has the lowest average relative maximum rank (0.24, versus 0.35 and 0.46) (§4.1, p.5). The text names k = 8, 16, 32 and 64, but Table 1 columns are recall@16, @32, @64 and @128; this mismatch is in the paper. Inference: a Verus tool could tokenize spec-function names, field names, and quantified predicates, but lexical similarity may miss semantic equivalence and should only propose lemmas.

## technique: safe over-approximation of premises

Use this when a tactic tolerates extra premises and trying a larger set is cheaper than precise selection. Steps from §4.2 (pp.5–6):

1. Sample successful human proof steps for MESON and REWRITE (§4.2)
2. Append random irrelevant premises of lengths 1, 2, 4, 8, 16, and 32 (§4.2)
3. For MESON, measure whether the proof still succeeds within a one-second timeout; for REWRITE, measure whether the result is unchanged (§4.2)
4. Use the measured tolerance to inform the design of exploration; the paper states that it designed experiments "to inform different choices" (§4, p.4), and does not state a rule that maps these tables to a list size (§4.2). In the appendix, `k2` is derived as max(ceil(k/2), k2') with `k2'` in [0, 8] for exploration loops (Appendix A.2, p.13)

The experiment sampled until it had 250 successful steps and used five random lists for each length (§4.2, p.6). Table 2 reports MESON success rates 0.995, 0.986, 0.97, 0.873, 0.53, and 0.06 for 1–32 extra premises; REWRITE unchanged rates are 0.99, 0.979, 0.954, 0.93, 0.858, and 0.731. The paper says: "However, MESON tends to time out with more than 32 extra premises." (§4.2, p.6)

Inference: for Verus, expose extra lemmas only after a similar per-lemma or per-context timeout study; Z3's behavior is not established by this HOL Light experiment. Inference: over-approximation should be bounded by proof time and solver memory, with failed attempts discarded.

## technique: greedy premise pruning and hard negatives

Use this when successful proofs contain irrelevant premises that would teach the model a false dependency. Steps from §4.3 (p.6):

1. For a successful step with premises `{Pi}`, rerun it without the last premise `Pn` (§4.3)
2. If the result is unchanged, drop `Pn`; continue backward through the list (§4.3)
3. Use dropped premises as hard negatives so highly ranked but useless premises are demoted (§4.3)
4. Pruning also ensures that unnecessary premises added for exploration are not learned from (§4.3)

Inference: in Verus, remove one `requires` fact, lemma invocation, or trigger candidate at a time and rerun verification; record removed facts as negative training examples. This is a proposed transfer, not a procedure in the paper's Rust setting.

## evidence, assumptions, and VL implications
Appendix A fixes the policy network and prover setup: eight workers, Adam, a 1e−4 initial learning rate, 16 GNN hops, BFS search, a 300-second training-prover timeout, and 500-ms tactic timeouts (Appendix A.1–A.2, pp.12–13). Appendix A.3 (p.13) lists eight V100 GPUs for training and 2,000 CPUs for provers; Appendix B reports up to 2,000 theorem provers, five days of training, and "over 25 years of CPU resources and 40 days of GPU resources" for a single loop (Appendix B, pp.13–14). These settings bound the reported results and make the cost of repeating the method explicit.

The main experiment trains for 8 million steps on 10,214 training theorems and evaluates the final checkpoint on 3,225 held-out validation theorems (§5, pp.6–7). Zero Explore proves 56.3% of the 3,225 at the final checkpoint and 64.2% cumulatively; pure imitation is 49.95%, while Human Explore is 59.9% final and 69.1% cumulative (Figure 4, p.7). The prose immediately below Figure 4 writes the single-checkpoint comparison as “59.9% vs 56.3%” and the cumulative comparison as “69.1% vs 64.1%” (§5, p.7), while the figure labels Zero Explore as 56.31% final and 64.2% cumulative; the cumulative 64.1/64.2 discrepancy is internal to the paper. Zero Reference reaches only 7.0% final and 7.3% cumulative; the authors say it runs into "the failure mode of not being able to prove new statements and thus stalling" (§5, p.8). The authors summarize: "The main takeaway is that the best RL loop trained without human proof data outperforms the model trained purely on human data, and approaches the performance of the best RL loop trained with human data." (Figure 4 caption, p.7)

The ablations (§6, p.8; Figure 5, p.8) report final/cumulative validation percentages: Zero Seeded 53.09/60.6 (seed proofs from hand-engineered retrieval and random tactics cover around 20% of training statements; it does not stall but stays below Zero Explore); retrieval-only premise selection (`k1=0`) 22.54/43.8; 0% dropout 54.2/63.4 against 56.31/64.2 with 10% dropout ("a very slight gain requiring further verification"); Human Reference 59.47/68.2 against Human Explore 59.91/69.1 (no significant difference). The §6 text rounds the retrieval-only cumulative result to 43% and Zero Explore to 64%.

The reported success is checked HOL Light proof success under the benchmark's premise-availability constraint (§5, p.6). Inference: the trusted components include HOL Light, the HOList environment, the learned policy, the reward/search implementation, and the assumption that the training and validation splits are representative. Inference: product threat is medium to high for agent-generated Verus proofs because premise selection and solver-context exploration can determine proof cost, but this work does not establish Rust or Verus correctness. Inference: VL should reuse offline retrieval tests, bounded exploration, and pruning; it should not redo this paper's basic tf-idf and zero-imitation RL design without a Rust-specific benchmark.

## techniques for the catalog

- learned premise selection — score tactics and premises, pass top-k premises, and search candidate applications
- RL proof-data loop — continually train on proofs found by the current prover
- tf-idf exploration — retrieve lexical neighbors of a goal to seed premise exploration
- over-approximate premise lists — test bounded irrelevant premises for tactic tolerance
- greedy pruning — remove unnecessary premises and learn from them as hard negatives
- dropout retrieval — randomly mask goal-token features to diversify repeated exploration

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Continuous validation performance (represented by dots in the plots) runs every 80,000 training steps on a random sample of validation theorems, and reports the fraction of proven theorems from that sample."): I read the whole paper text and checked every quotation, the Table 1, Table 2 and Figure 4 numbers, the appendix hyperparameters and resource figures, and the technique steps against sections 3 to 6 and the appendices. I changed the link to the arXiv page given in the paper (arXiv:1905.10501v3), fixed a quotation that dropped "The main takeaway is that", fixed the p.4–5 and p.8 page references, removed an unsupported claim about the recall denominator, removed an unsupported rule mapping Table 2 to exploration size and an unsupported "repeat after exploration" pruning step, added the ablation numbers and seed-data note, and marked the remaining conclusions as Inference. I did not check the page numbers of the figure internals beyond the text layout, the cited external works, or any of the Verus transfer claims, which are the study's own inferences.
