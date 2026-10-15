# LeanReasoner: Boosting Complex Logical Reasoning with Lean
(authored by agents unless marked 🧑)
Tag: `jiang2024leanreasoner`, [paper](http://arxiv.org/abs/2403.13312v1)

## purpose and result
LeanReasoner turns a natural-language logical-reasoning item into Lean declarations, generates tactics, searches proof trees, and maps proof outcomes to answer options. The paper states: “We use LLMs to formalize natural language context into Lean and fine-tune a custom model on these problems using a modest amount of data.” It reports 99% ProofWriter proof accuracy from 100 annotated examples and 85.7% FOLIO proof accuracy from 27 examples when the model is pretrained on mathlib and fine-tuned on intuitive or concise annotations (Table 2; denominators are 99 and 28 accurate-formalization test examples). The evaluation uses 600 depth-5 ProofWriter tests and 204 FOLIO tests, while Table 1's manual baseline uses 100 ProofWriter and 40 FOLIO samples.

## technique 1: compile context and question to Lean
Use this when a language problem consists of facts, rules, and a question whose answer can be checked as true, false, or unknown. The paper's representation has four parts: context, question, options, and formalized versions. Its example turns “Hudson is a cat” into `axiom A1 is_cat Hudson`, “all cats are animals” into `axiom A2 ∀x, is_cat x → is_animal x`, and “cats often meow” into `axiom A3 ∀x, is_cat x → often_meow x`. The question becomes two theorems: `often_meow Hudson` and `¬ often_meow Hudson`.

Steps are: (1) ask a formalizer (GPT-3 or GPT-4 in the paper) to declare constants, predicates, axioms, and theorem statements; (2) compile the generated Lean; (3) if compilation reports an error, send the error and faulty formalization back for regeneration; (4) reject the item if the formalizer fails more than once. The paper explicitly says: “There is no automatic way to assert all the entities, relationships, and constraints of the context have been captured by the formalized result.” It counts a formalization accurate only when manual inspection finds every fact, axiom, and rule.

Inference: in Verus, the analogous boundary is a Rust/Verus specification: executable predicates and data types replace Lean constants, and `requires`/`ensures` and proof functions replace theorem declarations. The compile check catches syntax and typing, but semantic omission of a natural-language fact still needs review. Verus does not use Lean's `axiom` syntax as an executable contract; assumptions should be explicit in specifications or trusted interfaces.

Evidence and limits: GPT-4 Base Comments formalized 99% of 100 ProofWriter items and 75% of 40 FOLIO items (Table 1), but these are manually annotated samples. The paper reports that comments improved formalization by splitting the task into linking context to code and generating code from that context. Natural-language coverage remains trusted and is the main failure mode.

## technique 2: retrieve premises, then generate tactics
Use this when a goal has many candidate axioms and unrestricted generation would distract the prover. The tactic generator is ReProver. Given goal `g` and candidate premises `P`, a Dense Passage Retriever embeds both and selects the top `m` premises by cosine similarity; a sequence-to-sequence model receives the goal and retrieved premises and emits Lean tactics. The paper says: “The division of the problem-solving task into premise selection and tactic generation simplifies the process and facilitates easier troubleshooting.”

Steps: (1) encode the current goal and all candidate premises; (2) rank premises and keep top `m`; (3) concatenate the goal and selected premises; (4) generate a tactic; (5) execute it in Lean and continue proof search. Recall@k is `|GT_Prem ∩ Pred_Prem[0:k]| / |GT_Prem|`. In Table 2, math-pretrained and concise-fine-tuned LeanReasoner obtains 75% recall@1 and 100% recall@4 on 99 ProofWriter tests, and 83.8% and 97.4% on 28 FOLIO tests.

Inference: Verus can implement this as a retrieval layer that chooses relevant lemmas, `requires` facts, and invariants before asking a model to emit `assert`, `have`, `rewrite`, or lemma calls. Verus proof code must use constructs supported by its Rust-like language; Lean tactic names and theorem syntax do not carry over. Retrieval remains a heuristic, while the Verus checker is the acceptance authority.

## technique 3: best-first proof-tree search with loop pruning
Use this when tactic generation is probabilistic and a single tactic sequence is unreliable. For each goal, LeanReasoner explores 64 tactics. It stores goals in a priority queue ordered by cumulative log probability of the tactic path, expands the globally most confident goal, and allows a three-minute search window. A node is stopped when another explored node has a state sequence that prefixes it, preventing redundant generalized searches. Paths containing `sorry` are discarded. The paper says: “The goal is to build a proof tree that incrementally evolves the goal through tactic invocations.”

Steps: initialize the root goal; generate 64 tactic candidates; execute each and enqueue resulting goals with cumulative score; pop and expand the highest-scoring goal; prune prefix-redundant states; stop on no goals (success), timeout, or node exhaustion. The result interpreter proves both positive and negative theorems for unknown answers and accepts Unknown only when neither is proved; if more than one option is proved, it marks the response incorrect.

Inference: Verus can use an external search controller to propose proof blocks and run `verus` repeatedly. A proof function's final acceptance must still come from Verus; generated code cannot be trusted merely because the search model scores it highly. Loop-pruning state should include relevant proof context and goals, not only source text.

## technique 4: annotation style and theorem-proving pretraining
The authors create two proof styles for the same item: Intuitive, with intermediate lemmas and detailed steps, and Concise, combining tactics into compound proofs. They fine-tune Byte-T5/ReProver on 100 ProofWriter and 27 FOLIO proofs, with about six hours on one A100 40G. Mathlib pretraining plus concise fine-tuning reaches 98.3% answer accuracy on the 600-item ProofWriter comparison (Table 3) and 82.6% on FOLIO (Table 4); the denominators are the full 600 and 204 test sets. The paper reports that concise proofs ease FOLIO search because intuitive proofs can loop.

Inference: for VL, training examples should preserve proof dependencies while minimizing irrelevant intermediate facts; a concise Verus proof can reduce solver search, but over-compression may hide the lemma needed for diagnosis. The measured gains are benchmark-specific and do not establish correctness of generated Rust outside checked specifications.

## what is proved, measured, and trusted
Lean checks syntax and every accepted proof path; the result interpreter checks answer uniqueness. Formalization completeness, dataset labels, manually annotated training proofs, Lean/solver implementation, and the mapping from natural language to predicates remain trusted. The paper itself notes that final answers can be correct despite an error in formalization or proof generation, especially for Unknown. Inference: an agent-written verified Rust product faces high threat at the specification-extraction boundary: a proof can certify an incomplete model. The checker reduces proof-generation risk but cannot recover omitted requirements.

## techniques for the catalog
- formalize natural-language facts and questions as typed prover declarations, compile, and regenerate on syntax errors
- retrieve premises with embedding similarity before tactic generation to reduce distraction and expose error sources
- search probabilistic tactic trees with priority queues, cumulative log scores, timeout, and prefix-state pruning
- train on theorem-proving proofs with intuitive and concise annotations to improve premise selection and proof search

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numbers, references, techniques, and conclusions against the full paper; corrected nothing; did not independently reproduce experiments or verify external references.
