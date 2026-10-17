# Llemma: An Open Language Model For Mathematics
(authored by agents unless marked 🧑)
Tag: `azerbayev2023llemma`, [paper](https://arxiv.org/abs/2310.10631)

## what the paper proves or measures
Inference: Azerbayev et al. continue-pretrain Code Llama on Proof-Pile-2 and release the model, data, and code.  The formal-verification contribution is a reproducible recipe for few-shot informal-to-formal proof generation in Isabelle and formal-to-formal tactic prediction in Lean 4, with proof assistants checking the generated artifacts.  The model is a mathematical language model, not a soundness extension to either assistant.  The authors call the formal-math evaluation limited: "While a full investigation of formal math is outside the scope of this paper, we evaluate L LEMMA few-shot on two tasks" (§3.3, p. 6).

Quote (abstract, p. 1): “Moreover, L LEMMA is capable of tool use and formal theorem proving without any further finetuning.”

## technique 1: curate a mixed formal-mathematics pretraining corpus
Inference: Use this technique when a proof generator needs broad mathematical language, code, and proof-state exposure before task prompting.  Build Proof-Pile-2 as a mixture of scientific papers (ArXiv, 29B tokens), mathematical web data (OpenWebMath, 15B tokens), and code (AlgebraicStack, 11B tokens), then continue-pretrain Code Llama.  The paper's AlgebraicStack contributes 11 billion code tokens from 17 languages, including more than 1.5 billion tokens of formal mathematics; its Lean subset is extracted as (tactic state, next tactic) pairs from Mathlib 4, and its Isabelle subset contains theorem statements, proof states, and proof steps (§2.1, pp. 2–3; Appendix B, pp. 17–19).  The authors also remove theorems whose names overlap with the PISA, LeanDojo val/test sets and blacklist the ProofNet and MiniF2F repositories to limit benchmark contamination (Appendix B.1.1 and B.1.3, p. 18).

Quote (§3.3, p. 6): “Proof-Pile-2’s AlgebraicStack contains over 1.5 billion tokens of formal mathematics data, including proof states extracted from Lean and Isabelle formalizations.”

Inference: The authors set 95% of the training mixture to Proof-Pile-2, 2% to the Pile (with ArXiv removed) and 3% to the GitHub subset of RedPajama (§2.1, p. 3).  They choose the arXiv:web:code ratio (2:4:1) by short training runs on hand-picked weights, picking the one with the lowest perplexity on the MATH training set (§3.4, p. 7, Table 5).  They then continue training the 7B model for 200B tokens and the 34B model for 50B tokens with the reported learning-rate schedules (§2.2, p. 3).  For Verus, the transferable idea is to collect verified Rust, specifications, proof states, and solver-error repairs as training pairs; this is an inference because the paper's corpus contains Lean and Isabelle, not Verus.  A Verus corpus must preserve the exact tool version and libraries because a proof state is version-dependent.

## technique 2: informal-to-formal autoformalization
Inference: Apply this route when a natural-language theorem already has an informal proof but the final artifact must be checked by a proof assistant.  Prompt the model with (a) the formal statement, (b) the informal LaTeX statement, (c) the informal LaTeX proof, and several demonstrations; ask it to emit one Isabelle proof under greedy decoding.  Run the generated text through Isabelle and count a theorem as solved only when the assistant accepts it.  The paper uses 11 few-shot examples from Jiang et al. (2023), selecting seven number-theory examples and six for other problems (§3.3, p. 7).  The model may emit a call to built-in Isabelle automation (`sledgehammer`), and proof checking runs through Portal-to-Isabelle with a 30-second Sledgehammer timeout (Appendix D.1, p. 20).

Quote (§3.3, p. 7): “The formal proof is checked by the proof assistant.”

Inference: The paper's Figure 4 (p. 6) shows the code shape: output starts with `proof -` and invokes Isabelle automation through `<ATP>`; Figure 8 (p. 28) additionally shows `(* ... *)` comments that align the formal steps with the informal proof.  In Verus, the equivalent workflow is to give the model a Rust `spec fn`/`ensures` target and an informal argument, then require a compilable `proof fn` with `assert`, `requires`, and `ensures`; this mapping is an inference, and the exact constructs must follow the local Verus reference.  Do not count a textually plausible proof as success when Verus or Isabelle rejects it.

## technique 3: formal-to-formal tactic prediction with interactive checking
Inference: Apply this route when the proof assistant exposes a current goal state and accepts one tactic at a time.  At step t, provide the Lean 4 state and three `(state, next tactic)` examples; generate a proof step (a sequence of code); submit it to Lean; use the returned state or error as the next context; stop when the theorem closes or a timeout occurs.  The authors evaluate on 488 miniF2F statements using Lean 4, LeanDojo v1.1.2, best-first search with tactics generated by beam search, and a 10-minute timeout; the search budget is N = 1 attempt, S = 32 tactics per iteration, and at most T = 100 iterations (§3.3, p. 7; Appendix D.2, p. 20).

Quote (§3.3, p. 7): “The proof step is checked by the proof assistant, yielding a new state xt+1 or an error message.”

Inference: In Verus, use the verifier as the step checker: ask for a small proof edit, run `verus` after each edit, feed diagnostics and remaining obligations back to the model, and retain only edits that preserve earlier proofs.  This is an inference; Verus does not expose exactly the Lean tactic-state API.  A practical equivalent is iterative repair of a `proof fn` until all `assert` and postcondition obligations verify, with a bounded search over candidate lemmas or triggers.

## technique 4: tool use for mathematical computation
Inference: For problems requiring arithmetic or symbolic computation, prompt Llemma to write Python code (with built-in numeric operations, the `math` module, and SymPy) rather than forcing every intermediate calculation into text.  The paper evaluates MATH+Python and GSM8k+Python and reports that Llemma improves over Code Llama on both, and that its performance with tools is higher than without tools (§3.2, pp. 5–6, Table 3).  This is assistance for finding an answer, not a proof: the external tool remains trusted unless its result is independently checked.

Quote (§3.2, p. 5): “MATH+Python, the model is prompted to alternately describe a solution step in natural language, then execute that step with code.”

Inference: In a Verus workflow, executable Rust can calculate a candidate value, while the `spec fn` and proof code establish the property for all permitted inputs; never treat an unverified Python result as a proof obligation discharged.  This distinction is an inference from the paper's separation of tool-use evaluation and assistant-checked formal mathematics.

## evidence and limits
Inference: Table 4 (p. 7) reports Isabelle informal-to-formal proof rates for Llemma-7b of 20.60% on miniF2F-valid and 22.13% on miniF2F-test under greedy decoding (Code Llama 7b: 16.31% and 17.62%; Sledgehammer: 14.72% and 20.49%).  For Lean 4 formal-to-formal proving on miniF2F-test, Llemma-7b reaches 26.23% (Llemma-34b 25.82%), against 20.49% for Code Llama 7b, 22.13% for Code Llama 34b, 23.36% for COPRA (GPT-4), and 26.50% for the fine-tuned ReProver.  The text says the union of Sledgehammer and Llemma proofs gives 26 new validation proofs (an 11 percentage-point increase) and 17 new test proofs (a 7 point increase) over Sledgehammer alone (§3.3, p. 7; Table 11, p. 25).  The paper does not state that generated proofs are correct without assistant checking; it reports proofs the assistant accepted.

Inference: The formal tasks are few-shot and use greedy decoding or bounded search; they do not measure long-horizon repair, changing libraries, unsafe Rust, concurrency, or specification adequacy.  Proof-Pile-2 includes web and code data, so memorization and contamination are relevant: the authors test 30-gram overlap between MATH test sequences and OpenWebMath or AlgebraicStack documents, find hits for around 7% of MATH test problem statements and 0.6% of test solutions, and report Llemma-34b accuracy separately for hits and non-hits, with no clear relationship between hits and accuracy (§3.5, pp. 8–9, Tables 6 and 7).  The models, datasets, and code are released, but the paper's theorem-proving setup is Isabelle/Lean-specific.

Inference: The threat to agent-written verified Rust is medium to high at the generation layer: a model can suggest useful lemmas and tactics but may produce a proof that does not compile, overfit a library version, or prove a weak contract.  Verus verification removes the first failure only after execution; it does not validate the intended specification, external assumptions, solver behavior, or erased executable code.  The paper therefore supports a tool-in-the-loop generation architecture, not autonomous trust in generated proof text.

## techniques for the catalog
- formal-math corpus pretraining — mix mathematical text, code, and assistant proof states, then continue-pretrain a code model
- informal-to-formal proving — condition on an informal argument and formal statement, generate assistant code, and accept only assistant-checked proofs
- interactive tactic prediction — generate one tactic from the current state, check it, feed the resulting state or error back, and search until closure or timeout
- tool-assisted solving — call computation tools for intermediate answers while keeping final correctness in a proof assistant
