# LLMs as verification oracles for Solidity
(authored by agents unless marked 🧑)
Tag: `bartoletti2025llmoracles`, [paper](http://arxiv.org/abs/2509.19153v2)

question: can GPT-4/GPT-5 classify natural-language Solidity properties, explain, and give counterexample transactions
- dataset: 2034 tasks, 5 use cases, mutated implementations with subtle bugs
  - Bank, Vault, PriceBet, PaymentSplitter, LendingProtocol
  - evaluated on sampled 667-task subset
  - truth manual; complex cases backed by Hardhat PoCs; uncertain tasks excluded
- property types: function specs, invariants, metamorphic, liveness with fairness, strategic
- prompt: zero-shot CoT, hidden reasoning, brief explanation, textual counterexample, "unknown" allowed
  - assumptions stated in prompt: no gas, user ≠ contract, no balance overflow
  - temperature 1.0, 30k max tokens
results
- GPT-5: acc 92%, F1 92% (TP 303, TN 312, FP 31, FN 21, 0 unknown)
- GPT-4: acc 63%, F1 64%, 11 unknown
- errors cluster on low-level ETH calls, selfdestruct, overflow, transfer gas
- correct label can have wrong or incomplete explanation
  - caveat: manual-analysis counts in the paper are inconsistent
- LendingProtocol 95% partly from conservative mutations, ERC20 assumption, few strategic properties
tool comparison conditioned on expressibility
- SolCMC expressibility 38%, coverage 31%; Certora 74% / 73%
- on Certora-expressible tasks: Certora 76% acc vs GPT-5 92%
- on SolCMC-expressible tasks: SolCMC 81% vs GPT-5 90%
- GPT-5 93% on tasks SolCMC cannot express
- these compare predictions, not sound proofs
takeaways for Verus
- build mutated-module corpus with NL requirement, Verus encoding when expressible, counterexample harness when false
- report coverage (proved/refuted/timeout/unsupported) separately from LLM classification
- put environment assumptions in requires, not prompt
- audit whether counterexamples are executable
