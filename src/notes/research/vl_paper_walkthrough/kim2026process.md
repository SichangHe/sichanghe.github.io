# Process-Verified Reinforcement Learning for Theorem Proving via Lean
(authored by agents unless marked 🧑)
Tag: `kim2026process`, [paper](http://arxiv.org/abs/2606.20068v1)
## result and setup

Kim and Yun use Lean as a process oracle during reinforcement learning (RL). Lean parses each generated proof into tactic AST nodes, identifies locally elaborated tactics and the first error, and supplies both a binary proof outcome and tactic-level rewards. The paper's central claim is: “the Lean proof assistant itself can serve as a symbolic process oracle, supplying both outcome-level and fine-grained tactic-level verified feedback during training.” (Abstract, p. 1)

Training uses 10,000 samples randomly drawn from STP (3.26 million proofs), a Lean REPL with a 15-second timeout, a 7B model, and tactic rewards `d1 = −0.05`, `d2 = −0.1` (Section 5.1, p. 6). The main STP-Lean result is 57.1% ± 0.8 pass@32 and 59.2% ± 0.5 pass@64 on MiniF2F-Test, versus 55.9% ± 0.2 and 56.7% ± 0.2 for STP-Lean; on ProofNet-Test it is 18.6% ± 0.3 and 19.0% ± 0.3 versus 17.2% and 19.1% (Table 1, p. 6). Inference: these are benchmark generation results, not a formal guarantee that an RL policy remains sound; every accepted proof still depends on Lean's kernel.

## technique: formalize verifier feedback as tactic rewards

What it is. A response `Y` is parsed into tactics `(T1,…,TN)` in AST order. Lean's global score `g(Y)` is 1 if the entire proof passes and 0 otherwise. The per-tactic score `φ(Y,T)` is 1 for a globally passing proof, `d1` for a tactic without an error in a globally failing proof, and `d2` for a tactic containing an error (Sections 3.1 and 4.1, pp. 3–5). The paper emphasizes that an elaborated tactic can be locally sound while later subgoals remain: “Lean ensures tactic-level soundness, while proof-level completeness depends on whether the entire sequence resolves all goals.” (Section 3.1, p. 3)

How to apply it. (1) Generate a group of Lean responses for one theorem. (2) Parse each response's AST and sort tactic nodes by source position. (3) Read Lean's error log and info tree. (4) Set `g(Y)=1` only when the complete proof verifies. (5) Assign each tactic a scalar according to global success and local error status. (6) Convert tactic scores to process rewards in the RL objective. The tactic-level MDP has states equal to partial proof prefixes, actions equal to single tactics, deterministic concatenation transitions, and EOS absorbing states (Section 3.2, p. 4).

Verus form. Inference: use `cargo verus` as the hard oracle for generated Rust proof fragments. Parse candidate proof blocks into Verus-relevant units such as lemma calls, `assert`, `calc`, and invariant steps; classify a unit as locally accepted only if the verifier accepts the prefix. A locally accepted step may still leave unsolved obligations, so retain a separate whole-function score. Verus does not expose Lean's info-tree API, therefore the parser and error-location adapter would be new VL infrastructure. Use only constructs documented in the Verus notes: `requires`, `ensures`, `invariant`, `assert`, `calc`, `spec fn`, and proof functions.

Evidence and limitations. The authors compare outcome-only, tactic-only, and combined rewards. For STP at budget 64, outcome-only is 57.9% ± 0.5 MiniF2F and 19.0% ± 0.3 ProofNet; tactic-only is 56.8% ± 0.6 and 17.9% ± 0.8; combined is 59.2% ± 0.5 and 19.0% ± 0.3 (Table 2, p. 7). Inference: the combined signal's advantage is strongest on MiniF2F in this table, while ProofNet's combined score ties outcome-only at pass@64, so “consistently improves” should be read as an aggregate claim rather than every cell improving.

## technique: first-error propagation

The problem is causal credit assignment. Once tactic `Tj` is the first error, later tactics are generated under an invalid prefix. The method therefore sets `j = min{i : Ti contains an error}` and assigns `d2` to every `Tk` for `k ≥ j`; tactics before `j` receive `d1` when the proof fails (Section 4.1, p. 5). The authors explain: “once the first erroneous tactic Tj occurs, the continuation Tj+1, . . . , TN is conditioned on an invalid prefix, and therefore cannot constitute a valid reasoning process.” (Section 4.1, p. 5)

Steps. (1) Sort tactics by AST source position. (2) Find the earliest tactic carrying an error. (3) Mark that tactic and all subsequent tactics erroneous for reward assignment. (4) Keep earlier locally elaborated tactics as partially successful. (5) Compute the process reward for each tactic from this transformed sequence. This is a deterministic post-processing rule; Lean's transition function remains prefix concatenation and feedback changes only reward (Sections 3.2 and 4.1, pp. 4–5).

Verus form. Inference: after each generated proof fragment, identify the first verifier error in the prefix and assign the error penalty to that fragment and every later fragment in the same candidate. Earlier accepted fragments can receive a smaller penalty or positive relative advantage, but only the complete `cargo verus` result determines proof validity. A source-position parser is necessary because Rust tokens do not map one-to-one to Verus proof obligations. Do not infer soundness from a locally parsed token; require verifier acceptance.

Evidence and limits. The paper reports that return-based credit produced unstable optimization, while first-error rewards avoid assigning positive return through an invalid prefix (Section 4.2, p. 5; discussion before Section 5, p. 6). This is a design rationale, not a separate causal experiment with a denominator. Inference: first-error propagation can over-penalize useful recovery text after a parser artifact, and it assumes Lean's first error reliably identifies the causal break.

## technique: first-token credit assignment in GRPO

GRPO normally applies one normalized response-level advantage to every token. The authors add process advantage only at the first token of each tactic. For token `t` in response `Yi`, they define `Ai,t = Aoutcome,i,t + 1{t = first(Ti,s(i,t))} · Aprocess,i,s(i,t)` and optimize the standard clipped GRPO objective (Section 4.2, p. 5). The paper's reason is that the first token is the tactic keyword that determines subsequent subgoals and strategy (Section 5.3, p. 7).

Apply it. (1) Sample `G` responses per question. (2) Normalize binary outcome scores across the group. (3) Compute process rewards with first-error propagation and subtract the group's mean outcome reward as a dynamic baseline. (4) Locate each tactic's first token. (5) Add that tactic's advantage only at the first token; leave other tokens with outcome advantage alone. (6) Apply the clipped GRPO loss with KL penalty against the reference policy (Sections 3.3, 4.1–4.2, pp. 4–5).

The paper tests alternatives: distribute tactic reward over all tokens, put it on the last token, or add high-entropy token selection. First-token assignment gives the most stable improvements in Table 3 (Section 5.3, p. 7). Inference: a Verus generator could assign proof-obligation feedback to the first token of each lemma call or assertion, but Rust macro expansion and multiline `calc` blocks make token boundaries less canonical than Lean tactics.

## technique: combine global and local objectives

Outcome-only RL is sparse and can plateau; tactic-only RL is dense but lacks a global objective. The authors report that combining them lets outcome rewards enforce proof-level correctness while tactic rewards provide local credit (Section 5.3, pp. 7–8). In Table 2, STP-Lean combined at pass@32 is 57.1% ± 0.8 versus 55.7% ± 1.0 outcome-only and 55.6% ± 0.6 tactic-only on MiniF2F; ProofNet is 18.6% ± 0.3 versus 17.4% ± 0.6 and 18.3% ± 0.0. The denominator is the benchmark's pass@32 evaluation with reported mean ± standard deviation, not the 10k training samples.

Inference: the combination is directly relevant to VL training if verifier calls are already part of generation. It still requires enough examples where intermediate Verus obligations are informative; no experiment here measures unsafe Rust, concurrency, or solver-trigger sensitivity.

## appendix findings and explicit failure mode

The reward ablations test the mechanism rather than only the headline model. With first-error propagation removed, STP at budget 64 reaches 58.2% ± 0.7 on MiniF2F and 18.3% ± 0.3 on ProofNet; the complete method reaches 59.2% ± 0.5 and 19.0% ± 0.3 (Table 4, p. 8). Removing the difficulty baseline gives 57.4% ± 0.7 and 18.3% ± 0.5, while using one equal tactic penalty gives 58.7% ± 0.8 and 18.1% ± 0.6. These rows use the same 7B model and sample budgets, so the denominator is the benchmark pass@64 sample budget.

Timeout is itself a training technique. The authors compare 5, 10, 15, and 30 seconds; 5 seconds yields too few valid reward signals, while 15 seconds gives the best overall balance, and shorter 10–15 second limits can outperform 30 seconds because they bias training toward concise proofs (Section 5.3, p. 8). Inference: a Verus training loop should record timeout as a distinct verifier outcome and tune it against proof completeness, rather than silently treating timeout as a logical error.

The appendix gives a concrete limitation. On `imo_2019_p1`, the model introduces many hypotheses and then calls `omega`; the call is the first Lean error. First-error propagation penalizes `omega` and later tactics but not the earlier `intro`, `have`, and `simp`, even though those steps were strategically unproductive (Appendix H, pp. 25–26). The paper says: “our current scheme only punishes the terminal failing step and fails to capture that the earlier (locally successful) steps did not make meaningful progress toward solving the global goal.” (Appendix H, p. 26) Inference: VL should measure proof-state progress or obligation reduction in addition to first-error status if it wants to discourage locally valid but globally dead-end Verus steps.

Appendix J explicitly treats potential-based reward shaping as a conceptual model, not a theorem of policy optimality. The authors write: “We emphasize that we do not claim any formal optimality guarantee for this shaped reward in our large-scale LLM and Lean setting.” (Appendix J.4, p. 28) Inference: the same distinction must appear in a VL training claim; verifier-grounded rewards are evidence about search, not a correctness theorem for the learned policy.

## what is proved, measured, and trusted

Lean's kernel checks the final proof and elaborated tactic steps. The measured claims are pass@32/pass@64 percentages on MiniF2F-Test and ProofNet-Test, with 7B models, specified budgets, and standard deviations. The paper notes that tree-search baselines count verifier expansions while these experiments count whole-proof samples, so budgets are not directly comparable (Table 1 footnote, p. 6). Training relies on Lean version/tooling, the REPL timeout, reward constants, model initialization, and the STP dataset; those are outside the proof theorem.

Inference: threat to agent-written verified Rust is medium. A Verus-aware process oracle could improve credit assignment and reduce wasted proof generations, but it would not prove that a generated specification matches product intent. Verus's solver and supported Rust subset remain trusted components, and local acceptance cannot establish whole-function correctness. VL should reuse first-error and first-token measurements; it should not claim Lean benchmark gains transfer without a Verus experiment.

## techniques for the catalog

- tactic-level verifier reward — parse proof ASTs and convert local elaboration plus whole-proof outcomes into scalar rewards
- first-error propagation — penalize the first verifier error and every later tactic generated from its invalid prefix
- first-token credit — attach process advantage to the first token that chooses each tactic's strategy
- combined outcome/process GRPO — optimize global proof success together with dense verifier-grounded local feedback
- verifier as process oracle — use the proof assistant during training, not only for final evaluation
Checked 2026-10-13: audit record kim2026process; paper-study comparison complete; gate executed; experiments not rerun
