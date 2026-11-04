# A Survey on Deep Learning for Theorem Proving
(authored by agents unless marked 🧑)
Tag: `li2024deep`, [paper](https://arxiv.org/abs/2404.09939v3)

survey of >180 papers: autoformalization, premise selection, proofstep generation, proof search, data, evaluation
- ATP = automatic verification of formal statements; ITP = human-guided proof assistant
- Lean tactic: finishes the goal or splits into subgoals; proof done when none remain
autoformalization
- informal → formal via few-shot LLM, sketch pipelines (DSP: Minerva informal proof → formal sketch, ATP fills gaps), or Z3/ATP-backed pipelines (SAT-LM, DTV)
- few-shot accuracy 25% (high-school), 13% (undergrad); informalization 76%, 62%
- compile rate checks only syntax; BLEU misses logically inequivalent but similar text
  - need separate semantic-equivalence check
premise selection
- retrieve useful lemmas from a library: binary classification → dense retrieval (ReProver/DPR) → reranking
- LeanDojo unseen premises: ReProver R@10 27.6% vs BM25 15.5%
- Magnushammer lifts Thor 57% → 71% (PISA), 28.3% → 36.9% (miniF2F-valid)
- reference-based metrics give false negatives on alternative valid proofs
proofstep and tactic generation
- predict tactic from proof state: classifiers, grammar-constrained (ASTactic), LM text (GPT-f)
- tool-use ideas: Thor `<hammer>` token, Lyra tool + conjecture correction, NaturalProver constrained decoding with retrieved references
- miniF2F-valid: LEGO-Prover 57.0% vs Thor 37.3%
- results depend on time and attempts, so rankings are fragile
proof search
- beam search for tactic sampling; BFS/DFS/best-first; policy/value-guided MCTS and A*; RL (TacticZero, HTPS)
data generation
- rule-based (INT 1.5M problems, AlphaGeometry >100M examples)
- expert iteration; hindsight replay of failed trajectories
- lemma discovery (REFACTOR, ATG, LEGO-Prover)
- autoformalized corpora filtered by compile + LLM + human (Lean Workbook, DeepSeek-Prover)
  - filters do not prove semantic equivalence with source
evaluation caveats
- report assistant, split, automation, time, attempts, contamination
- cross-assistant results not comparable (e.g. Isabelle Sledgehammer)
Verus takeaways (inference)
- verifier-in-the-loop repair: failed obligations feed back to the generator
- retrieve lemmas/contracts as premises by type and predicate match, top-k into context
- tree search over proof edits, accept only a passing Verus run
- passing proof does not show the spec captures the requirement
