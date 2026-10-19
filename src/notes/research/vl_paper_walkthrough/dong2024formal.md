# Formal Theorem Proving by Rewarding LLMs to Decompose Proofs Hierarchically
(authored by agents unless marked 🧑)
Tag: `dong2024formal`, [paper](https://arxiv.org/abs/2411.01829v1)

## scope and result
The paper introduces Proof Decomposer (ProD), an Isabelle workflow in which a model proposes lemmas inside a proof and proves those lemmas as child nodes. “We design an RL-based training algorithm that encourages the model to decompose a theorem into lemmas, prove the lemmas, and then prove the theorem by using the lemmas.” (abstract, p. 1) Partial success supplies training signal: “even if a theorem is too challenging to be proved by the current model, a positive reward is still given to the model for any correct and novel lemmas that are proposed and proved in this process.” (abstract, p. 1)

Inference: the result concerns training a proof generator from verifier outcomes. It does not establish automatic discovery of specifications. The Isabelle decomposition procedure suggests an approach to test in Verus.

## technique 1: conditional proof trees

what it is
The input is a context and theorem statement. The output starts with `<use_invoke>` or `<no_invoke>`, then a conditional proof. A conditional proof inserts proposed statements between ordinary proof segments, enclosed by `<invoke>` and `</invoke>`. “A node in a proof tree is a tuple of premises, context, a theorem statement, and a conditional proof.” (§2, p. 4; output format in §3.1, pp. 5–6)

when to use it
Inference: try this when independently stated intermediate facts could simplify a direct proof. The paper distinguishes local correctness, where the parent verifies assuming the proposed lemmas, from global correctness, where a valid tree can be built entirely from locally correct nodes. Children must share their parent's premises and context. Nodes from different sampled trees can be combined. “Global correctness corresponds to the standard notion of correctness (i.e., whether the theorem is proved), and local correctness is a weaker concept, referring to the correctness of conditional proofs assuming the proposed lemmas.” (§2, p. 4)

how to do it
1. Give the model context `c` followed by statement `s`; generate the special token and conditional proof (§3.1, pp. 5–6).
2. Parse every proposed lemma and collect its statement with the parent's context for the next generation (Algorithm 1, lines 3–5, p. 6).
3. Generate proofs for these children recursively. At maximum depth, append `<no_invoke>` to each prompt to prevent further proposals (Algorithm 1, lines 6–8, p. 6).
4. Check local correctness by assuming the proposed lemmas. The Isabelle implementation moves them to the context with `sorry`, which registers statements without proving them; this checks the conditional proof only (§4.1, p. 8).
5. Determine whether locally correct nodes form a complete valid tree. To emit its complete proof, list statements and conditional proofs child-first and remove the proposal steps (§2, p. 4).

The cardinality example proposes separate lemmas for membership and non-membership, then combines them. The authors explain: “Finally, Line 4 proves the original theorem using the two proposed lemmas.” (§4.4, p. 11)

how training examples are constructed
The parser segments files into intervening contents, statements, and proofs. It repeatedly removes statement/proof pairs whose statements are no longer referenced in the remaining file. These removed theorems form `Ttree`; references from intervening contents can prevent removal. Each example's context retains earlier intervening contents and statements outside `Ttree`. For a proof step using a lemma in `Ttree`, the parser inserts that lemma's statement as a proposal immediately before the step. Premises come from predecessor files. For SFT, an additional example moves proposed lemmas into the context (§2, pp. 4–5).

The train/test split follows file dependencies so training examples never refer to test files. Appendix A.3 selects 10% of AFP entries on which no other entries depend as holdouts. This differs from randomly splitting theorems while keeping helper lemmas available. Table 1 reports pass@4 of 45.7% with lemmas and a random split, 39.7% with lemmas and a dependency split, and 35.7% without lemmas and with a dependency split (§4.2, p. 9; §A.3, p. 18).

Verus form
Inference: test representing each proposed lemma as a separate Verus proof function with an explicit contract, called from the parent proof. Treat invocation markers as generation metadata. Require verification of every child and the assembled parent under the original contract. This transfer is a proposal; the paper supplies no Verus implementation or evaluation.

evidence and limits
The SFT dataset contains 312k examples from AFP and Isabelle built-in files; the RL dataset contains 104k examples in `Ttree`. AFP test contains 4.3k theorems; AFP 2023 contains 2k from files submitted after Llemma's April 2023 knowledge cutoff. The model is Llemma 7B. The SFT baseline receives two epochs; ProD-RL starts after one SFT epoch and runs 20 rounds with 5k randomly sampled examples per round, using depth-3 training trees (§4.1, p. 8).

Testing uses temperature 0.7, the last 1k context tokens, and depth-2 trees. Pass@k counts a theorem as proved when a root conditional proof is globally correct with respect to all generated nodes from k independently sampled trees (§4.1, p. 8). Pass@16 is 40.8% for ProD-SFT and 45.5% for ProD-RL on AFP test, and 36.5% versus 39.5% on AFP 2023. SFT without lemma proposals scores 43.4% and 39.4%, respectively, so the improvement over that baseline on AFP 2023 is small (Table 2, p. 9; discussion, p. 10). Newly proposed correct lemmas absent from the training dataset constitute 37.7% of the training replay buffer (abstract, p. 1).

Isabelle is accessed through PISA, with a 10-second timeout per proof step (§4.1, p. 8). Sledgehammer fills low-level steps: testing first tries predefined tactics, then calls Isabelle's premise-selection tool with a 10-second timeout if those attempts fail (§A.3, pp. 17–18). Inference: these rates depend on the Isabelle environment and supplied premises; they do not measure Verus success or whether a contract captures an intended requirement.

## technique 2: verifier-shaped reinforcement learning

method
Start from an SFT model and repeat the following for a random batch (§3.2, pp. 6–7; Algorithm 2, p. 17).
1. Generate proof trees. Below maximum depth, force `<use_invoke>` for the top half of examples by invoke probability; select additional examples according to that probability. Also generate a proof without proposals for every node. At the root level, include human-written conditional proofs and generate proofs for their proposed lemmas too.
2. Check local correctness. Discard examples whose proposed lemma directly implies the theorem. Remove a proposal if the conditional proof remains correct after removing all references to it. Then determine global correctness and assign each node a binary reward from that result.
3. Train the policy with weighted cross-entropy. For a locally correct node with proof length `h` and proposed lemmas `li`, its weight is `w = γ^h ∏ Vϕ(li)`; otherwise the weight is zero. The value function estimates expected reward for a context and statement. Its output is `pt / (pt + pf)`, where `pt` and `pf` are the probabilities of `<true>` and `<false>`. Appendix A.3 gives `γ = exp(−0.0005)` (p. 18).
4. Add augmented examples for locally correct proofs by moving proposed lemmas into context. Include human-written conditional proofs and use a replay buffer to stabilize training.

Inference: an analogous Verus experiment could use verifier outcomes and explicit filters for trivial or unused lemmas. Value estimates and proof-length discounting would need testing in that setting.

why it helps
The paper calls the method “an instantiation of hindsight experience replay” because correct subtrees supply training examples even when the original theorem fails (§3.2, p. 7). RL without lemma proposals scores below its SFT baseline on both AFP test sets (Table 2, p. 9). Inference: this comparison supports the usefulness of lemma proposals in this training procedure, but does not isolate every component's contribution. The authors also find rephrased existing lemmas and correct new lemmas proposed during an incorrect parent proof (§4.4, pp. 11–12).

failure modes
Improvement mostly comes from theorems whose ground-truth proof depth is at most two; more complex theorems have low pass rates with little improvement (§4.3, p. 10; Fig. 4, p. 11). On miniF2F, pass@64 is lower than SFT without proposals: valid 41.4% versus 46.3%, test 39.3% versus 40.6% (Table 3, p. 13). “We also observe that when tested on miniF2F theorems, our model failed to propose meaningful lemmas.” (§6, p. 13) The authors offer a tentative explanation: “This may be because proving to miniF2F-level mathematics questions typically does not require hierarchical decomposition.” (§6, p. 13) Inference: for Verus, compare decomposition with direct proof generation rather than assuming decomposition always helps.

## what is proved, trusted, and relevant to VL
The paper's global-correctness construction yields a complete proof acceptable to the formal verifier (§2, p. 4). Inference: the benchmark measures proof generation for supplied statements and premises. It does not establish specification discovery or transfer to Rust. For VL, its clearest relevance is learning intermediate proof facts from checker feedback.

Inference: a distinct VL experiment could use fixed Verus specifications, train/test projects separated by dependencies, and verification of all generated child proofs without weakening the original contracts. Whether this reduces proof-generation cost remains to be measured in Verus.

## techniques for the catalog
- conditional proof trees: propose child lemmas, verify conditional proofs locally, and assemble globally correct trees child-first
- verifier-shaped RL: assign rewards from global correctness and train on conditional proofs with local-correctness and value-based weights, augmentation, and replay
- depth and proposal controls: prevent proposals at maximum depth, discard trivial proposals, and remove unused lemmas

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The results suggest that the baseline methods are more robust to heavier distribution shifts, while our method has a larger improvement when the test distribution is closer to the training distribution."): read the full paper, including references and appendices; checked quotations, numbers, section and page references, and technique steps; corrected the replay-buffer denominator, generation and reward details, dataset coverage, references, and tentative explanations; replaced the damaged mathematical quotation, used the paper's arXiv identifier for the link, and marked Verus/VL conclusions as inferences; did not reproduce experiments, inspect implementation code, or validate the proposed Verus transfer.
