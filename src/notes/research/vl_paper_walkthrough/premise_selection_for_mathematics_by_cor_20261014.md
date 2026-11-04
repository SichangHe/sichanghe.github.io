# Premise Selection for Mathematics by Corpus Analysis and Kernel Methods
(authored by agents unless marked 🧑)
Tag: `alama2011premise`, [paper](https://arxiv.org/abs/1108.3446)

2-phase premise selection for ATP over Mizar: exact dependencies, then learned ranking
- benchmark: 2,078 problems, 33 articles, Vampire 10s
  - baseline Vampire/SInE solves 548
  - MOR-60 with fine dependencies solves 795 (+45.1%)
  - MOR-40/100 combined solves 824 (+50.4%)
exact dependency extraction
- split each article into one-item micro-articles
- greedily remove environment items while recompiling, keep only checker-required ones
  - minimal only w.r.t. the checker, alternative proofs may exist
  - costly, needs many checker reruns
- fine dependencies shrink problems
  - funct_1: 22.94 vs 42.05 old MPTP dependencies per theorem
  - chainy 548/2078 (26.4%), bushy-old 1,023 (49.2%) on the pruned-problem comparison
- Verus analogue: drop imports/lemma calls one at a time, rerun, keep needed ones (inference)
learning from the proof matrix
- label mu(c,p)=1 iff premise p used in recorded proof of conjecture c
  - only one human proof per theorem, labels miss alternatives
- features: binary occurrence of symbols/subterms, de Bruijn variables
- naive Bayes: linear in features, assumes conditional independence
- MOR: kernel multi-output regularized regression
  - Gaussian kernel, solve A=(K+lambda I)^-1 Y
  - lambda, sigma by grid search, 70/30 split
  - top-50 recall: ~80% SNoW vs 88% MOR, measured against Mizar labels not solved problems
- Verus analogue: external lemma-ranking service, Verus stays the authority (inference)
