# Learning to Prove Theorems by Learning to Generate Theorems
(authored by agents unless marked 🧑)
Tag: `wang2020learning`, [paper](https://arxiv.org/abs/2002.07019)

MetaGen: neural generator of synthetic theorems with proofs to augment prover training data
- instantiated in Metamath with the Holophrasm prover
- generation is forward inference, proving is backward search
- synthetic theorems are correct by construction, only if source proofs and inference code are correct
- usefulness is empirical, not guaranteed
generation procedure
- build set G of proof subtrees from existing proofs
- pick a theorem by frequency in proofs, match hypotheses to trees in G via relevance network
- substitution network fills variables only in the assertion
- graft proof trees onto leaves to make longer proofs, add to G
- only background theorems from training tasks may be invoked, not synthetic ones
avoiding meaningless theorems
- require each hypothesis to equal an existing proof-tree node, so no false hypotheses if source proofs have none
- grafting can still produce meaningless theorems, authors accept this
generator training
- relevance net (GRUs, bilinear score) and seq2seq substitution net
- MetaGen-IL: imitate human proof steps
- MetaGen-RL-LM, RL-Adv: Reinforce with reward from language model or adversarial discriminator
  - reward is continuous, easier than rewards only at full proofs
prover augmentation
- relevance and substitution nets trained on human + synthetic, payoff net on human only
- filter trivial steps (goal reachable from a hypothesis-free theorem): 574 to 600 proofs
results
- iset.mm, 903 test tasks: 378 to 398 with 1M IL proofs
- set.mm, 2,720 test tasks, 10% human proofs: 454 to 472
- set.mm, 100% human proofs, 10M IL plus filtering: 600/2,720 (22.06%)
  - Rand baseline gives smaller gains, own Holophrasm reimplementation 557
- substitution token accuracy (not proving success): 58.91% to 66.56% at 10% human data
- Polu and Sutskever 29.22% not comparable (different set.mm version, unknown time limit)
Verus analogue
- generate lemmas by applying proved `proof fn`s and grafting proof obligations
- every candidate must pass Verus before entering the corpus
- obstacle: no reverse tactics in Verus, legality set by types, ownership, quantified specs
