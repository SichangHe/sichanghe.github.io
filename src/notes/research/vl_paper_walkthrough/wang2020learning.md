# Learning to Prove Theorems by Learning to Generate Theorems
(authored by agents unless marked 🧑)
Tag: `wang2020learning`, [paper](https://www.semanticscholar.org/paper/ea3e363b222c28abc695877de50a9929744eb2c8)

## scope and result
This paper addresses sparse formal-proof data by training a generator that creates new theorems together with proofs, then using those synthetic proofs to train a prover. The authors call the generator MetaGen and instantiate it in Metamath with Holophrasm. Their abstract says: “We propose to learn a neural generator that automatically synthesizes theorems and proofs for the purpose of training a theorem prover” (abstract, p. 1). The generator performs forward inference; the prover later searches backward for a specified target. The distinction matters: a generated theorem is guaranteed by construction only under the correctness of the source proof trees and inference implementation, while usefulness is measured empirically.

## technique 1: forward synthesis with proof-tree grafting

### when to use it
Use this when human-written theorem/proof pairs are too few to train a search policy. MetaGen starts from training proof tasks and repeatedly applies an existing theorem with a substitution to produce a new theorem. The new proof tree can then be reused as an existing tree.

### paper procedure
1. Build the set G of existing proof-tree subtrees; for each theorem with a proof, add every subtree rooted at every node, retaining only the smallest tree among equivalent root/leaf sets (section 4.1, p. 5)
2. Choose an invocable theorem t according to its frequency in existing proofs (section 4.1, p. 5)
3. For each hypothesis of t, find compatible trees whose roots are reachable by substitution; select one with the relevance network and extend the substitution to match it (section 4.1, pp. 5–6)
4. Generate substitutions for variables appearing only in the assertion with the substitution network (section 4.1, p. 6)
5. Graft compatible proof trees onto the one-step proof tree's leaves and add the resulting multi-step tree to G (section 4.1, p. 5)
6. Repeat to create synthetic theorem/proof pairs; synthesized theorems are not allowed as invoked theorems, because the generator restricts invocations to background theorems seen in training tasks (section 4.1, p. 5)

The authors prevent vacuous training examples by requiring each new substituted hypothesis to equal a complete expression already present at a proof-tree node. They state: “This prevents introducing false expressions as hypotheses, provided that the existing proofs have no false expressions” (section 4.1, p. 5). Longer proofs are made by grafting a tree whose root matches a shallow tree's leaf.

### Verus form
Inference: generate auxiliary Rust/Verus lemmas by applying existing proved `proof fn`s and grafting their proof obligations into a larger lemma. Keep each generated lemma's `requires` and `ensures` explicit; use `assert` facts and `invariant` clauses as the proof-tree nodes. A generated lemma must be passed to Verus before entering the training corpus. Metamath substitution and parse-tree reachability are paper-specific; in Verus, type checking, ownership, and quantified specifications determine whether a proposed application is legal.

## technique 2: imitation and adversarial reinforcement learning for the generator

The generator has a relevance network and a sequence-to-sequence substitution network. The relevance network encodes candidate-tree tokens and context with two GRUs and a bilinear score, while the substitution network emits a variable's expression token by token (section 4.1, p. 6). With human proofs, MetaGen-IL uses imitation learning: it trains relevance to select the subtree used by a human proof step and trains substitution to produce the human expression.

When only theorem statements are available, the paper uses reinforcement learning. MetaGen-RL-LM receives the cross-entropy of a generated theorem under a language model trained on human theorems. MetaGen-RL-Adv receives an adversarial binary classifier's loss; the discriminator is pretrained against MetaGen-Rand and updated online, while the generator minimizes the adversarial loss (section 4.1, p. 6). The authors emphasize that the generator's reward is continuous and has many successful paths, unlike a prover rewarded only on complete proofs (section 2, p. 2).

Inference: train a Verus-lemma generator by imitation from verified proof traces, or by a reward that measures similarity to a corpus of verified lemmas. Any generated candidate must still compile and verify; a discriminator or language model cannot establish its contract. The corresponding Verus constructs are `proof fn`, `requires`, `ensures`, `assert`, and loop `invariant`; the paper's GRUs, softmax, and adversarial loss are search machinery.

## technique 3: synthetic data augmentation for a backward prover

Holophrasm uses Monte Carlo Tree Search with a payoff network, relevance network, and substitution network to search backward from a target theorem (section 4.2, p. 6). The authors train it on human proof tasks plus MetaGen's synthetic tasks. They filter “trivial” proof steps from relevance-network training when a hypothesis is directly reachable from a hypothesis-free background theorem (implementation details, p. 8). This removes steps that create no new subgoals.

Inference: in VL, augment a proof-search model with synthetic, independently verified Verus lemmas and proof traces. Filter steps that merely invoke an unconditional lemma if the goal is to learn useful decomposition, but keep them in a separate corpus if they matter for runtime proof completion. The paper's MCTS is not a Verus primitive; the final acceptance criterion remains a successful verifier run.

## evidence and denominators

The `iset.mm` corpus has 463 axioms and 8,916 theorem tasks split into 7,123 train, 890 validation, and 903 test tasks. `set.mm` has 1,099 axioms and 27,218 tasks split into 21,786 train, 2,712 validation, and 2,720 test tasks (section 5, p. 7). With 7,123 human proofs on iset.mm, adding 1M MetaGen-IL synthetic proofs raises test proofs found from 378 to 398 (Table 3, p. 8; denominator 903 test tasks). On set.mm with 2,179 human proofs (10%), MetaGen-IL raises proofs from 454 to 472 of 2,720 test tasks; 1M MetaGen-Rand reaches 457 (Table 3, p. 8). With 21,786 human proofs (100%), 10M MetaGen-IL reaches 600/2,720 after trivial-step filtering; without that filtering it reaches 574/2,720 (Table 3, p. 8).

For the substitution network on set.mm with 10% human proofs, accuracy is 58.91% without synthetic data and 66.56% with 1M MetaGen-IL examples (Table 2, p. 8). With 100% human proofs, accuracy rises from 81.57% to 83.90% with 10M MetaGen-IL examples (Table 2, p. 8). These percentages are validation-token accuracy, not theorem-proving success. The paper notes a comparability caveat: Polu and Sutskever report 29.22% on a possibly different set.mm version and evaluation protocol, while this paper reports 22.06% (section 5.1, p. 9).

## what is proved, trusted, and assumed

The formal-system proof checker validates Metamath proof trees; the neural networks only choose trees and substitutions. The generator's “guarantee” depends on source proofs being correct and on substitution/grafting code preserving entailment. The authors identify a broader risk: “bugs in the prover can lead to catastrophic failure” (Broader Impact, p. 10). Inference: for VL, the trusted boundary includes Verus, its solver and specifications, proof erasure/compiler, and any external contracts. Synthetic data does not expand that boundary; it expands search training after each candidate is checked.

## implications for VL

Inference: the strongest transferable idea is verified synthetic-data bootstrapping. Generate many small lemmas from existing verified proof trees, graft them into deeper proofs, and use the resulting traces to train premise and tactic selection. The paper already establishes this pattern, including imitation versus adversarial reward, graph/tree reuse, trivial-step filtering, and separate relevance/substitution policies; VL should not redo them as unexplored formal-verification concepts. The threat to agent-written verified Rust is indirect but real: synthetic examples can bias search toward shallow or vacuous contracts, so corpus admission must require the intended contract and a successful Verus check.

## techniques for the catalog

- proof-tree theorem synthesis: apply legal inference steps and graft existing subtrees to create new theorem/proof pairs
- imitation or adversarial generator training: learn tree selection and substitutions from human proofs or a continuous similarity reward
- synthetic prover augmentation: train backward proof search on verified synthetic traces alongside human traces
- trivial-step filtering: remove proof steps that invoke a hypothesis-free theorem without creating subgoals when training relevance selection

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
