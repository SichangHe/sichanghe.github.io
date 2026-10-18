# Learning to Prove Theorems by Learning to Generate Theorems
(authored by agents unless marked 🧑)
Tag: `wang2020learning`, [paper](https://arxiv.org/abs/2002.07019)

## scope and result
This paper addresses sparse formal-proof data by training a generator that creates new theorems together with proofs, then using those synthetic proofs to train a prover. The authors call the generator MetaGen and instantiate it in Metamath with Holophrasm. Their abstract says: “we propose to learn a neural generator that automatically synthesizes theorems and proofs for the purpose of training a theorem prover” (abstract, p. 1). The generator performs forward inference; the prover later searches backward for a specified target. The paper states that “each of our synthetic theorem is guaranteed to be correct and its proof is automatically available” (section 2, p. 3). Inference: this guarantee holds only if the source proof trees and the inference implementation are correct, and usefulness is measured empirically, not guaranteed.

### when to use it
Inference: use this when human-written theorem/proof pairs are too few to train a search policy, which is the motivation in the paper's introduction. MetaGen starts from training proof tasks and repeatedly applies an existing theorem with a substitution to produce a new theorem. The new proof tree can then be reused as an existing tree.

### paper procedure
1. Build the set G of existing proof-tree subtrees; for each theorem with a proof, add every subtree rooted at every node (for a theorem without a proof, add each hypothesis as a single-node tree), retaining only the smallest tree among equivalent trees, which have the same root and leaf nodes (section 4.1, p. 5)
2. Choose an invocable theorem t according to its frequency in existing proofs (section 4.1, p. 5)
3. For each hypothesis of t, find compatible trees whose roots are reachable by substitution; select one with the relevance network and extend the substitution to match it (section 4.1, pp. 5–6)
4. Generate substitutions for variables appearing only in the assertion with the substitution network (section 4.1, pp. 5–6)
5. Graft compatible proof trees onto the one-step proof tree's leaves and add the resulting multi-step tree to G (section 4.1, p. 5)
6. Repeat to create synthetic theorem/proof pairs; synthesized theorems are not allowed as invoked theorems, because the generator restricts invocations to background theorems seen in training tasks (section 4.1, p. 5)

The authors try to avoid “meaningless” theorems (those with a false hypothesis, which are provable whatever the assertion says) by requiring each new substituted hypothesis to equal the full expression of a node in an existing proof tree. They state: “This prevents introducing false expressions as hypotheses, provided that the existing proofs have no false expressions” (section 4.1, p. 5). Longer proofs are made by grafting a tree whose root matches a shallow tree's leaf. Grafting itself can still produce meaningless theorems: Appendix D (p. 13) says “there does not appear to be an easy way to avoid meaningless theorems resulting from tree grafting”, and the authors graft anyway because “a lot of interesting mathematics do result from nontrivial combination of hypotheses.”

### Verus form
Inference: generate auxiliary Rust/Verus lemmas by applying existing proved `proof fn`s and grafting their proof obligations into a larger lemma. Keep each generated lemma's `requires` and `ensures` explicit; use `assert` facts and `invariant` clauses as the proof-tree nodes. A generated lemma must be passed to Verus before entering the training corpus. The paper (section 4.3, p. 7) says that for HOL Light, Coq and Isabelle, generating new theorems needs reverse tactics that “are unavailable in their ML environments”; Inference: Verus may face a similar obstacle, since its proof steps are not Metamath substitutions. Metamath substitution and parse-tree reachability are paper-specific; in Verus, type checking, ownership, and quantified specifications determine whether a proposed application is legal.

## technique 2: imitation and adversarial reinforcement learning for the generator

The generator has a relevance network and a sequence-to-sequence substitution network. The relevance network encodes candidate-tree tokens and context with two GRUs and a bilinear score, while the substitution network emits a variable's expression token by token (section 4.1, p. 6). With human proofs, MetaGen-IL uses imitation learning: it trains relevance to select the subtree used by a human proof step and trains substitution to produce the human expression (section 4.1, p. 6).

When only theorem statements are available, the paper uses reinforcement learning. MetaGen-RL-LM receives the cross-entropy of a generated theorem under a language model trained on human theorems. MetaGen-RL-Adv receives an adversarial binary classifier's loss; the discriminator is pretrained against MetaGen-Rand and updated online, while the generator minimizes the adversarial loss; both reward types are optimized with the Reinforce algorithm (section 4.1, p. 6). The authors say that “Our reinforcement learning task is much easier because the reward is continuous and there are many ways to generate theorems similar to human-written ones”, in contrast to provers that collect “rewards only upon finding full proofs” (section 2, p. 3).

Inference: train a Verus-lemma generator by imitation from verified proof traces, or by a reward that measures similarity to a corpus of verified lemmas. Any generated candidate must still compile and verify; a discriminator or language model cannot establish its contract. The corresponding Verus constructs are `proof fn`, `requires`, `ensures`, `assert`, and loop `invariant`; the paper's GRUs, softmax, and adversarial loss are search machinery.

## technique 3: synthetic data augmentation for a backward prover

Holophrasm uses Monte Carlo Tree Search with a payoff network, relevance network, and substitution network to search backward from a target theorem (section 4.2, pp. 6–7). The relevance and substitution networks are trained on human plus synthetic proofs, while the payoff network is trained on human-written proofs only (Appendix F.2, p. 17). The authors filter “trivial” proof steps from relevance-network training: “A goal is trivial if it is reachable from the assertion of a background theorem b and b has no hypotheses”, because it can be decomposed without generating new subgoals (section 5, implementation details, p. 8). The paper reports that this filtering raises proofs found from 574 to 600 (Table 3, p. 8; section 5.1, p. 9).

## evidence and denominators

The `iset.mm` corpus has 463 axioms and 8,916 theorem tasks split into 7,123 train, 890 validation, and 903 test tasks. `set.mm` has 1,099 axioms and 27,218 tasks split into 21,786 train, 2,712 validation, and 2,720 test tasks (section 5, p. 7). With 7,123 human proofs on iset.mm, adding 1M MetaGen-IL synthetic proofs raises test proofs found from 378 to 398 (Table 3, p. 8; denominator 903 test tasks). On set.mm with 2,179 human proofs (10%), MetaGen-IL raises proofs from 454 to 472 of 2,720 test tasks; 1M MetaGen-Rand reaches 457 (Table 3, p. 8). With 21,786 human proofs (100%), 10M MetaGen-IL reaches 600/2,720 after trivial-step filtering; without that filtering it reaches 574/2,720 (Table 3, p. 8).

For the substitution network on set.mm with 10% human proofs, accuracy is 58.91% without synthetic data and 66.56% with 1M MetaGen-IL examples (Table 2, p. 8). With 100% human proofs, accuracy rises from 81.57% to 83.90% with 10M MetaGen-IL examples (Table 2, p. 8). These percentages are validation-token accuracy, not theorem-proving success. The paper also reports its own GPU re-implementation of Holophrasm at 557 proofs with 100% human proofs, and 565 with 10M MetaGen-Rand (Table 3, p. 8). The paper notes a comparability caveat: Polu and Sutskever report 29.22% of test theorems, but they “appear to use a different version of the set.mm knowledge base which has about 38k proofs” and their time limit is not mentioned, while this paper reports 22.06% (section 5.1, p. 9).

## techniques for the catalog

- proof-tree theorem synthesis: apply legal inference steps and graft existing subtrees to create new theorem/proof pairs
- imitation or adversarial generator training: learn tree selection and substitutions from human proofs or a continuous similarity reward
- synthetic prover augmentation: train backward proof search on verified synthetic traces alongside human traces
- trivial-step filtering: remove proof steps that invoke a hypothesis-free theorem without creating subgoals when training relevance selection
