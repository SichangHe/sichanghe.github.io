# A Survey on Deep Learning for Theorem Proving
(authored by agents unless marked 🧑)
Tag: `li2024deep`, [paper](http://arxiv.org/abs/2404.09939v3)

## scope and formal setting
This survey maps more than 180 papers across autoformalization, premise selection, proofstep generation, proof search, datasets, and evaluation. It distinguishes automated theorem proving (ATP), where a system searches and checks a proof automatically, from interactive theorem proving (ITP), where a human drives a proof assistant. The paper states: “Formal theorem proving represents theorems and proofs in a machine-verifiable format, ensuring their correctness using rigorous logical rules” (section 2.2, page 2). In Lean, a tactic transforms a proof state into subgoals; the proof is complete when no goals remain (section 2.2, page 2).

## technique: autoformalization pipelines
What it is. Translate informal mathematics into a machine-verifiable language. Early neural encoder-decoder systems mapped LaTeX problems to Mizar, HOL Light, or Coq. LLM systems use few-shot prompts, domain-specific training, or structured intermediate representations (section 3.1, pages 3–4).

How to apply it. A direct approach prompts a model to translate the statement. A structured DSP-style pipeline first drafts an informal proof, maps it to a formal sketch, and asks an ATP system to fill missing details; later variants add subgoal proofs and prompt selection (section 3.1, page 4). Other pipelines train on aligned informal/formal corpora, or use autoformalization as a step before Z3 solving (SAT-LM) or ATP-based answer verification (DTV). For generated code, compile or run the target prover and retain only candidates that pass; compilation checks syntax but not semantic equivalence.

Verus form. Inference: prompt an LLM to produce Rust signatures and Verus `requires`/`ensures`; ask Verus to discharge the resulting obligations, and feed failed obligations back for repair. A structured route can first generate a plain-language contract explanation, then a Verus contract, then proof code. Inference: Verus acceptance proves the supplied contract, so an independent requirement-to-contract review is still needed.

Evidence and limits. The survey reports few-shot LLM autoformalization accuracies of 25% for high-school problems and 13% for undergraduate problems in two studies; informalization was about 76% and 62% (section 5, page 8). It warns that “the compilation rate evaluates only syntactic correctness” and BLEU can miss logically equivalent or inequivalent alternatives (section 5, page 8). Inference: these rates are task and dataset specific and should not be treated as expected Verus translation accuracy.

## technique: premise selection
What it is. Retrieve useful previously proved lemmas from a large library. The survey describes the seminal formulation as binary classification: embed theorem and premise, then predict relevance (section 3.2, page 4). Systems progress from CNN/RNN embeddings to Transformer, tree, graph, dependency-graph, and dense-passage retrievers, often followed by reranking.

How to apply it. (1) Build a corpus of theorem statements and proof dependencies. (2) Encode the current goal and each candidate premise. (3) Rank by a learned similarity or classifier score. (4) Pass the top k premises to the prover or tactic generator. (5) Optionally rerank a smaller subset with a cross-encoder. ReProver trains dense passage retrieval for Lean; Magnushammer adds a second stage and uses retrieved premises in Thor (section 3.2, page 4).

Verus form. Inference: index Verus proof functions, lemmas, contracts, and type invariants as premise records. Retrieve lemmas whose specifications mention the current types and predicates, then include only the top-k in the proof context. Inference: broad `broadcast` exposure can burden SMT search; a retriever should control which facts become available, while each selected lemma remains checked by Verus.

Evidence. On LeanDojo unseen-premise retrieval, ReProver achieved R@10 27.6% and MRR 0.24, versus BM25's 15.5% and 0.14 (section 5, page 8). Magnushammer raised Thor success from 57% to 71% on PISA and from 28.3% to 36.9% on miniF2F-valid (section 5, page 8). R@k counts whether a ground-truth-used premise appears in top k; it can mark a valid alternative premise as a false negative (section 5, page 8).

## technique: proofstep and tactic generation
What it is. Predict one or more proof steps from the current proof state. Classification systems predict tactic and arguments separately; ASTactic generates tactics as grammar-constrained programs; language-model systems generate textual proof steps. The survey gives GPT-f's format as “GOAL <GOAL> PROOFSTEP <PROOFSTEP><EOT>” (section 3.3, page 5).

How to apply it. Represent each state by its goal and local context. Either classify a tactic and its arguments, decode a grammar-constrained tactic program, or autoregressively generate a proof step. Execute the step in the proof assistant, add resulting subgoals to the search frontier, and repeat. NaturalProver jointly retrieves premises and uses constrained decoding; Thor learns a `<hammer>` token to invoke a hammer system; Lyra uses tool correction and conjecture correction after failed proofs (section 3.3, pages 5–6).

Verus form. Inference: generate a `proof fn` body, lemma invocation, `assert`, `calc`, or loop `invariant`, run Verus, and use the verifier's diagnostics as the next state. Generated proof code is erased from execution; only executable Rust remains. Inference: a proof function cannot be called at runtime as a computation, and the model must target actual Verus syntax.

Evidence. LEGO-Prover reached 57.0% on miniF2F-valid and 50.0% on miniF2F-test, compared with Thor's 37.3% and 35.2% (section 5, page 8). These are theorem success rates on the named splits, not per-step accuracy. The survey notes that tactic models and structured LLM pipelines are difficult to compare because assistants, automation, time, and attempt budgets differ (section 6.1, page 9).

## technique: proof search
What it is. Search over alternative proof states and steps using learned policies or values. ATP systems use clause selection, instantiation, or connection-tableau guidance. ITP systems commonly sample multiple tactic predictions with breadth-first, depth-first, or best-first beam search (section 3.4, pages 6–7).

How to apply it. Use a policy network to rank actions and a value network to estimate a state's promise. Expand the best frontier node, execute a tactic, and add resulting states. Beam search retains the top b states; MCTS or A* can use learned values; reinforcement learning treats proof states as an MDP. GPT-f and FMSCL use outcome/proof-size objectives as values, while TacticZero and HTPS learn policies with policy gradients or AlphaZero-like online training (section 3.4, page 6).

Verus form. Inference: each node is a Verus proof state, and each edge is a candidate proof step checked by Verus. Search can rank `assert`, lemma, `calc`, and invariant choices, but only a successful Verus run is accepted. Inference: proof-search success does not prove that the specification itself captures the product requirement.

## technique: data generation and curriculum
Rule-based generators sample inference rules to control theorem quantity and difficulty. INT generated 1.5 million inequality problems; AlphaGeometry generated over 100 million examples with proof lengths from 1 to 247 (section 4.2, page 7). Expert iteration repeatedly proves existing theorems and adds successful paths; hindsight replay reuses failed trajectories by treating final states as desired. Lemma-generation systems extract reusable lemmas (REFACTOR), discover lemmas with MCTS/self-play (ATG), or prompt GPT-4 for subgoal lemmas (LEGO-Prover). Autoformalization pipelines generate informal statements, compile/filter them, and add only verified items (MUSTARD, DeepSeek-Prover, Lean Workbook) (section 4.2, pages 7–8).

Verus form. Inference: generate small Rust/Verus obligations, mutate preconditions or loop bounds, and keep examples whose proofs compile and whose specifications have independent checks. Curriculum can increase loop length, quantifier complexity, ownership, and concurrency invariants. Inference: synthetic proofs can overfit generator conventions, so held-out hand-written tasks are required.

## datasets and evaluation
The survey groups data into extracted formal libraries, manually formalized benchmarks, pretraining corpora, rule-based generators, iterative augmentation, lemma discovery, and autoformalization. LeanDojo, miniF2F, ProofNet, Selene, and LEAN-GitHub are examples of extracted or manually curated collections (section 4.1, page 7). Formal-data scarcity remains severe: the Archive of Formal Proofs has about 250K proofs and mathlib about 140K (section 6.1, page 9).

Evaluation should report prover, dataset split, automation, time, memory, number of attempts, and contamination controls. Autoformalization needs semantic equivalence checks; premise selection needs recall/MRR but should account for alternative valid premises; theorem proving usually reports solved fraction. The survey emphasizes that “results across different proof assistants are not directly comparable” because automation such as Isabelle's Sledgehammer changes outcomes (section 6.1, page 9).

## proof boundary and VL implications
A checked formal proof establishes the theorem under the assistant's kernel and imported library assumptions. Learned retrieval, generation, search, data filters, prompts, and benchmarks remain outside that kernel. The survey names verified code generation as a future direction and explicitly lists Verus among target languages (section 6.2, page 10). Inference: agent-written verified Rust is threatened mainly by specification errors, library assumptions, and evaluation leakage, not by the existence of proof-search automation. VL should reuse premise retrieval, verifier-in-the-loop repair, and explicit budget/denominator reporting. It should not redo generic proof-search or autoformalization surveys; the open product work is measuring how these methods behave on real Rust ownership, panic, unsafe, and dependency changes.

## techniques for the catalog
- structured autoformalization: translate informal statements through sketches, subgoals, and prover feedback
- premise retrieval and reranking: select relevant library lemmas with learned dense or graph representations
- tactic generation: predict grammar-constrained or autoregressive proof steps and execute each in the prover
- verifier-in-the-loop repair: feed failed proof obligations or tool diagnostics back to the generator
- learned proof search: guide beam, best-first, MCTS, A*, or RL exploration with policy and value models
- synthetic curriculum: generate controlled theorems, augment with successful or failed trajectories, and filter by compilation
- lemma discovery: extract, conjecture, or prompt reusable subgoal lemmas and add checked results to the library
Checked 2026-10-14 against the paper by a Codex agent: audit record li2024deep; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
