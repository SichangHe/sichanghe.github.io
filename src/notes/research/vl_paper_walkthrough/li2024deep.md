# A Survey on Deep Learning for Theorem Proving
(authored by agents unless marked 🧑)
Tag: `li2024deep`, [paper](https://arxiv.org/abs/2404.09939v3)

## scope and formal setting
The authors survey “more than 180 research papers” across autoformalization, premise selection, proofstep generation, proof search, datasets, and evaluation (section 1, page 2). They distinguish automated theorem proving (ATP), which verifies formal statements automatically, from interactive theorem proving (ITP), where humans interact with proof assistants. They state: “Formal theorem proving represents theorems and proofs in a machine-verifiable format, ensuring their correctness using rigorous logical rules.” (section 2.2, page 2). In Lean, “Applying a tactic either finishes the goal or decomposes it into simpler sub-goals, and the proof is complete when no further goals remain.” (section 2.2, page 3).

## technique: autoformalization pipelines
What it is. “Autoformalization aims to convert informal theorems and proofs into machine-verifiable formats automatically.” Early neural encoder-decoder systems translated LaTeX problem texts into Mizar; subsequent studies used similar architectures for HOL Light and Coq. LLM approaches use few-shot prompting, mathematical training corpora, or structured pipelines (section 3.1, pages 3–4).

How to apply it. A direct approach prompts a model to translate the statement. DSP uses Minerva to draft informal proofs and map them to formal sketches, “with ATP systems employed to fill in the missing details in the proof sketch.” Zhao et al. improve the informal proofs with subgoal proofs and the formal sketches with prompt selection (section 3.1, pages 3–4). Other pipelines train on datasets containing both informal and formal mathematics, or use autoformalization as a step before Z3 solving (SAT-LM) or ATP-based answer verification (DTV). Inference: run the target prover on generated formalizations, then separately review whether they express the intended informal statement.

Verus form. Inference: prompt an LLM to produce Rust signatures and Verus `requires`/`ensures`; ask Verus to discharge the resulting obligations, and feed failed obligations back for repair. A structured route can first generate a plain-language contract explanation, then a Verus contract, then proof code. Inference: separately review whether the supplied contract captures the intended requirement.

Evidence and limits. The survey reports few-shot LLM autoformalization accuracies of 25% for high-school problems and 13% for undergraduate problems in two studies; informalization was about 76% and 62% (section 5, page 8). It warns that “the compilation rate evaluates only syntactic correctness” and that BLEU struggles with formalizations that are semantically similar but logically inequivalent to the reference (section 5, page 9). Inference: these rates are task and dataset specific and should not be treated as expected Verus translation accuracy.

## technique: premise selection
What it is. “Given a large collection of previously proven lemmas, premise selection is to retrieve the helpful lemmas that can contribute to a successful proof.” The survey describes the seminal formulation as binary classification: embed theorem and premise, then predict relevance (section 3.2, page 4). Systems progress from CNN/RNN embeddings to Transformer, tree, graph, dependency-graph, and dense-passage retrievers, often followed by reranking.

How to apply it. Inference: build a corpus of lemma statements and proof dependencies, encode the goal and candidate premises, rank them by relevance, and pass selected premises to the prover. The survey says ReProver trains its retriever “based on dense passage retrieval (DPR)” for Lean, and describes several methods that “design a second phase to re-rank the selected subset of premises” (section 3.2, page 4). Magnushammer selects premises for Thor (section 5, page 9).

Verus form. Inference: index Verus proof functions, lemmas, contracts, and type invariants as premise records. Retrieve lemmas whose specifications mention the current types and predicates, then include only the top-k in the proof context. Inference: evaluate retrieval by whether the selected lemmas help Verus finish the proof.

Evidence. On LeanDojo unseen-premise retrieval, ReProver achieved R@10 27.6% and MRR 0.24, versus BM25's 15.5% and 0.14 (section 5, page 9). Magnushammer raised Thor success from 57% to 71% on PISA and from 28.3% to 36.9% on miniF2F-valid (section 5, page 9). R@k “measures the ratio of correctly used premises in ground-truth proof within the top-k selections” (section 5, page 8). These reference-based metrics can overlook valid premises used by alternative proofs, “causing false negatives” (section 5, page 9).

## technique: proofstep and tactic generation
What it is. Predict one or more proof steps from the current proof state. Classification systems predict tactic and arguments separately; ASTactic generates tactics as grammar-constrained programs; language-model systems generate textual proof steps. The survey gives GPT-f's format as “GOAL <GOAL> PROOFSTEP <PROOFSTEP><EOT>” (section 3.3, page 5).

How to apply it. Inference: represent the state by its goal and local context, generate a tactic, execute it in the proof assistant, and repeat on the resulting goals. The survey says NaturalProver trains GPT-3 “with constrained decoding to encourage using retrieved references in the proof steps”; Thor learns a `<hammer>` token for hammer invocation. Lyra uses “tool correction and conjecture correction” to refine incorrect GPT-4 proofs (section 3.3, page 5).

Verus form. Inference: generate a `proof fn` body, lemma invocation, `assert`, `calc`, or loop `invariant`, run Verus, and use the verifier's diagnostics as the next state.

Evidence. The survey reports LEGO-Prover at 57.0% on miniF2F-valid and 50.0% on miniF2F-test, compared with Thor with expert iteration training at 37.3% and 35.2% (section 5, page 9). Its evaluation measure is the “success rate in proving theorems within a test set” (section 5, page 9). Appendix A, Table 2 (page 27) lists the Isabelle miniF2F results as 57.0% for LEGO-Prover on validation at pass@100 and 51.2% for Lyra on test at pass@200. Section 6.1 warns that “resource constraints during evaluation, such as time and the number of attempts, can significantly affect performance and the relative ranking of different methods” (pages 9–10).

## technique: proof search
What it is. Search over alternative proof states and steps using learned policies or values. ATP systems use clause selection, instantiation, or connection-tableau guidance. ITP systems commonly use beam search to sample tactic predictions and breadth-first, depth-first, or best-first heuristics to traverse the search space (section 3.4, pages 5–6).

How to apply it. The survey describes supervised policy or value networks guiding Monte Carlo Tree Search (MCTS) or A*, and reinforcement learning that “models proof search as a Markov decision process”. GPT-f and FMSCL use outcome and proof-size objectives for best-first search; TacticZero uses policy gradients; HTPS uses AlphaZero-like online training (section 3.4, page 6). Inference: for a tactic-based implementation, rank candidate steps or states with these models, execute selected tactics, and continue until all goals close or the search budget runs out.

Verus form. Inference: each node is a Verus proof state, and each edge is a candidate proof step checked by Verus. Search can rank `assert`, lemma, `calc`, and invariant choices, but only a successful Verus run is accepted. Inference: proof-search success does not prove that the specification itself captures the product requirement.

## technique: data generation
Rule-based generators produce data “by iteratively sampling inference rules from a pre-defined set.” INT generated 1.5 million inequality training problems; AlphaGeometry generated over 100 million training examples with proof lengths from 1 to 247 (section 4.2, page 8). Expert iteration repeatedly proves existing theorems and adds successful paths; hindsight replay reuses failed trajectories by treating final states as desired. Lemma-generation systems extract reusable lemmas (REFACTOR), discover lemmas with MCTS/self-play (ATG), or prompt GPT-4 for subgoal lemmas (LEGO-Prover). MUSTARD generates problems and informal proofs, then translates them to Lean for verification. DeepSeek-Prover autoformalizes competition problems and filters statements through model scoring and hypothesis rejection. Lean Workbook filters autoformalized questions through “Lean’s compilation, LLMs’ evaluation, and human diagnostics at each round” (section 4.2, page 8). Inference: these filters do not by themselves establish semantic equivalence with the source problem (section 5, page 9).

Verus form. Inference: generate small Rust/Verus obligations, mutate preconditions or loop bounds, and keep examples whose proofs compile and whose specifications have independent checks. Inference: vary proof difficulty and evaluate on held-out human-written tasks to test generalization beyond the generator.

## datasets and evaluation
The survey groups data into extracted formal libraries, manually formalized benchmarks, pretraining corpora, rule-based generators, iterative augmentation, lemma discovery, and autoformalization. LeanDojo, miniF2F, ProofNet, Selene, and LEAN-GitHub are examples of extracted or manually curated collections (section 4.1, page 7). The survey reports “250K proofs” for the Archive of Formal Proofs and “140K proofs” for mathlib (section 6.1, page 9); these are counts reported in the 2024 paper.

Inference: report proof assistant, dataset split, automation, time, number of attempts, and contamination controls. Autoformalization needs semantic equivalence checks; premise selection needs recall/MRR but should account for alternative valid premises; theorem proving usually reports solved fraction. The survey emphasizes that “results across different proof assistants are not directly comparable” because automation such as Isabelle's Sledgehammer changes outcomes (section 6.1, page 9).

## proof boundary and VL implications
The survey identifies verified code generation as a future direction: “one can train or prompt LLMs to synthesize program invariants” or generate programs in verification-friendly languages, including Verus (section 6.2, page 10). Inference: apply premise retrieval, repair using verifier feedback, and explicit evaluation budgets to verified Rust. Check separately whether generated contracts express the intended requirement. The survey does not evaluate these proposed Verus applications.

## techniques for the catalog
- structured autoformalization: translate informal statements through sketches, subgoals, and prover feedback
- premise retrieval and reranking: select relevant library lemmas with learned dense or graph representations
- tactic generation: predict grammar-constrained or autoregressive proof steps and execute each in the prover
- verifier-in-the-loop repair: feed failed proof obligations or tool diagnostics back to the generator
- learned proof search: guide beam, best-first, MCTS, A*, or RL exploration with policy and value models
- synthetic proof data: generate controlled theorems, add successful proofs, or reuse failed trajectories through hindsight replay
- lemma discovery: extract, conjecture, or prompt reusable subgoal lemmas and add checked results to the library
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Without a specific application as the context, it is unclear what evaluation setting makes the most sense."): read the full paper including references and Appendix A; checked quotations, numbers, section/page references, technique descriptions, and the arXiv link; corrected page references, retrieval metrics, pipeline descriptions, and Thor attribution, removed unsupported implementation claims, and marked proposed applications as inferences; did not independently check cited studies, reproduce experiments, or test Verus applications.
