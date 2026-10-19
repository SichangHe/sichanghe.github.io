# Alchemy: Amplifying Theorem-Proving Capability through Symbolic Mutation
(authored by agents unless marked 🧑)
Tag: `wu2025alchemy`, [paper](http://arxiv.org/abs/2410.15748v2)

## symbolic mutation in one picture

Alchemy synthesizes new Lean theorems from existing Mathlib theorems by executing small, proof-assistant-defined mutations. For each candidate theorem, it finds theorems that can be invoked with `rw` or `apply`, replaces a statement term with an equivalent term or a sufficient antecedent, constructs a proof by reversing that mutation, and asks Lean to verify the result. The abstract states: “As a result, our method increases the number of theorems in Mathlib by an order of magnitude, from 110k to 6M.” (Abstract, p. 1). This is data synthesis for neural proof search, with Lean checking the generated theorems. The paper says: “The resulting theorems that pass type checking can serve as supplementary data for training a neural theorem prover.” (Section 3, p. 4).

Inference: the same pattern can enlarge a Verus training corpus by transforming verified Rust specifications or proof states, but Lean tactics, AST shapes, and theorem declarations do not transfer directly. A Verus mutation must preserve Rust typing, ownership, and specification semantics and then pass Verus verification.

## finding invocable theorems

The candidate theorem is a proof tree whose leaves are assumptions and root is the assertion. The method uses two manipulations. `rw` replaces a target or assumption term using an equality or iff, in either direction. `apply` matches an implication's consequent to a goal and changes the goal to its antecedent. For synthesis, Alchemy sets an existing assumption as a local goal with `have assumption := by apply invocable theorem`, then uses the resulting subgoals as replacement assumptions. Table 1 gives four `rw` templates (forward/reverse, target/assumption) and this one `apply` template (Section 3.1, pp. 4–5; Appendix C.3.2, pp. 19–20).

Algorithm 1 describes the search procedure:

1. initialize a Lean environment and retrieve the candidate's initial proof state
2. enumerate every potential theorem and each instruction template
3. format an instruction such as `rw [theorem]`, `rw [← theorem] at assumption`, or `have assumption := by apply theorem`
4. run the instruction through Lean's tactic API
5. retain `(initial state, next state, instruction)` when the resulting state is valid (Algorithm 1, p. 5)

The method filters retained invocations, parses the candidate statement's AST to locate the changed component, and replaces that component with the equivalent or antecedents extracted from the subsequent proof state (Section 3.1, pp. 5–6). Appendix C.2 states: “For the rw tactic, if the resulting state is a TacticState, we annotate this theorem as invocable.” For `apply`, it retains an unsolved-goals result. It removes `rw` results containing metavariables and `apply` results containing unnamed metavariables (Appendix C.2, p. 17). For `apply`, it turns the remaining metavariables and subgoals into named replacement assumptions and handles naming conflicts (Algorithm 3, p. 19). The worked coprime example replaces the original `a.Coprime b` assumption with `IsRelPrime a b`, or with `c : ℕ` and `a*c ≡ 1 [MOD b]`. The generated proof reconstructs the original coprimality assumption (Figure 1, p. 3).

Inference: a Verus version could enumerate applicable lemmas or spec predicates at a proof state, execute candidate transformations in Verus, and retain only state transitions accepted by the verifier. The paper's `rw`/`apply` semantics are Lean-specific; in Verus, equivalent transformations may be `assert`, `broadcast`, `rewrite`-style lemmas, or function-call obligations, but the exact commands must be checked against the Verus language.

## constructing and checking mutated proofs

A mutation changes one statement component, so Alchemy reverses that change with a `have` lemma and then reuses the original proof. The paper explains: “Given that we only make a one-step modification to the statement, transforming the original proof state to a mutated proof state, a logical approach is to reverse the mutation and utilize the original proof to complete the remaining proving process.” (Section 3.2, p. 6). For an assumption mutation, a `have` lemma reconstructs the old assumption before the original proof runs. For an assertion mutation, a `have` lemma proves the original assertion using the original proof, then `rw` transforms this lemma to the new assertion. Tactic-style and term-style proofs are both supported (Section 3.2, p. 6; Appendix C.3, pp. 18–20).

Use the proof-generation method as follows:

1. retain the original theorem and proof
2. apply one invocable `rw` or `apply` mutation
3. for a rewritten assumption, reconstruct it with the reverse rewrite and `exact`, then append the original proof
4. for an `apply` mutation, reconstruct the original assumption with the recorded application and `assumption` or `<;> assumption`, then append the original proof
5. for a rewritten assertion, prove the original assertion with the seed proof inside `have`, then rewrite that lemma and finish with `exact`
6. write the generated `example` variants into their original Lean files and compile with `lake build`; remove variants at reported error locations, rebuild, and discard files that still fail (Appendix C.4, pp. 20–21)

Inference: in Verus, the analogous artifact would be a new spec lemma whose preconditions are transformed, followed by a proof block that establishes the original relation and calls the old lemma. Verus's proof functions and `ensures` clauses must be used in their valid positions; an unverified text splice is not a synthetic theorem. Lean acceptance establishes the generated theorem's formal correctness; it does not establish its usefulness or independence.

## training on the enlarged corpus

Alchemy uses two products of synthesis: new theorem statements/proofs and new state-tactic pairs centered on `rw` and `apply`. It continually pretrains Llama-3-8B and deepseek-coder-base-v1.5-7B on Mathlib plus variants, then supervised-finetunes on state-tactic pairs with a proof-step prediction objective (Section 3.3, p. 6; Section 4.1, p. 7). The prompt presents a current Lean state and asks for the next tactic between `[TAC]` markers (Figure 2, p. 6).

Implementation starts from about 110k Mathlib theorems. Finding invocable theorems costs 14 days on 4,096 CPU cores for `rw` and 7 days on 2,048 CPU cores for `apply`, with a one-hour timeout per theorem for `apply`; statement/proof construction takes about an hour on 24 cores. The enlarged repository is built on 2,048 cores. Tracing each tactic’s enlarged repository takes three days on a 96-core machine; in practice, files are divided among repositories traced on several such machines (Section 4.1, p. 7; Appendix C.4, p. 20). Inference: VL could reduce synthesis costs by caching lemma applicability or restricting mutations by type or specification shape; this paper does not test those options.

Table 2 separates candidate counts, invocable instructions, and verified outputs. For `rw`, 110,657 candidates produce 5,081,544 stage-one invocations and 2,830,817 stage-two verified theorems: 25× expansion and 56% conversion. For `apply`, 78,871 candidates produce 9,483,504 invocations and 3,495,832 verified theorems: 44× expansion and 37% conversion (Table 2, p. 8). The paper's headline 6,326,649 equals the sum of the two verified-output counts, while the 110k seed is the Mathlib count (Introduction, p. 2; Table 2, p. 8). Variants and state-tactic pairs that occur in the benchmark test split are removed; state-tactic pairs are deduplicated by the premise used in the tactic. The authors state: “We keep one state-tactic pair for each used premise in the synthesized state-tactic pairs and obtain about 30k data points for each tactic.” (Appendix D.3.2, p. 23; Section 4.2, p. 8).

## evaluation and what it proves

The Leandojo benchmark has 1,929 random-split and 1,659 novel-premise test theorems after removing uninitializable cases. Search uses best-first search, a 10-minute timeout, and budget `1 × 32 × 100` (attempt × samples × steps) (Section 4.1, p. 7). On the Llama3-8B novel-premise split, Mathlib training alone reaches 38.52%; adding `rw` and `apply` variants reaches 43.22%, a +4.70 percentage-point gain over 1,659 theorems. On DeepSeek-Coder, the corresponding gain is +4.22 points (39.24% to 43.46%; Table 3, p. 9). Inference: these percentages measure benchmark theorem completion, not the fraction of generated code that is semantically useful in a new Rust project.

Continual pretraining generally helps. For Llama3 with `rw + apply` SFT, novel-premise performance rises from 41.95% without continual pretraining to 43.22% with it; for DeepSeek under the same setting, it rises from 42.92% to 43.46% (Table 4, p. 9). The authors report about 30k per tactic as a compromise: “The experimental results also reveal that enlarging the quantity of state-tactic pairs of a single tactic tends to lead to rapid saturation.” They hypothesize that tactic diversity matters for further scaling (Section 4.3.3, p. 10). Appendix E.1 also tests extracted `have` pairs; combining them with other tactics has mixed effects, including worse novel-premise performance for Llama3 with `apply + have` than with `apply` alone (38.34% versus 40.02%; Table 6, p. 27).

On out-of-distribution miniF2F-test, the denominator is 244 problems. Mathlib-train solves 83/244 = 34.01%; adding only `rw` solves 86/244 = 35.24%; only `apply` solves 88/244 = 36.07%; both solve 89/244 = 36.48%, a +2.47-point gain (Table 5, p. 10). The paper observes that synthesized tactic distributions can bias the prover toward those tactics and that competition problems prefer other tactics such as `simp`, `omega`, `linarith`, and `norm_num` (Section 4.3.4, p. 10). Inference: a Verus corpus should balance mutations across arithmetic, sequence, ownership, concurrency, and API-invariant lemmas rather than overproduce one proof command.

## assumptions, limits, and VL use

The authors identify limits in data diversity, synthesis cost, and repeated synthesis. They state: “We only define two symbolic rules (using two tactics) to synthesize new theorems.” (Appendix B, p. 15). Their AST and string manipulation implementation struggles with coercions, naming conflicts, and other corner cases (Appendix C.5, pp. 21–22). The enlarged repository also makes further synthesis rounds difficult with Leandojo (Appendix B, p. 15; Appendix C.5, pp. 21–22). Inference: correctness checking alone does not establish that a training corpus is diverse, useful, or transferable to Verus. A Verus adaptation should discard mutations that fail its verifier.

The paper evaluates symbolic theorem augmentation with `rw`/`apply`, state-tactic extraction, mixtures of tactic data, continual pretraining, and out-of-distribution performance. Adjusting tactic distributions is proposed for future improvement, rather than established as a general balancing procedure (Section 4.3.4, p. 10; Appendix E.2.2, pp. 26–27). Inference: VL could test a Rust-specific mutation library and measure whether mutated Verus obligations improve proof completion while preserving valid ownership and specifications.

## techniques for the catalog

- invocable-theorem enumeration — execute every typed rewrite or implication template in an interactive proof state and retain valid transitions
- symbolic statement mutation — replace an AST component with an equality-equivalent term or an implication antecedent
- proof construction with `have` — reconstruct a mutated assumption before the seed proof, or prove the seed assertion and rewrite it to the new assertion
- verifier-filtered corpus growth — compile every generated theorem and discard failures before training
- state-tactic extraction — trace accepted variants into deduplicated proof-state/next-tactic pairs
- training with mixed tactic data — combine `rw` and `apply` variants for continual pretraining and supervised proof-step finetuning
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For each candidate theorem, we check whether other theorems can be used to rewrite or apply to it by executing tactics."): checked all paper text, quotations, counts, method steps, and section/page references; corrected the apply templates, mutation direction, proof-construction branches, tracing description, training and Table 4 page references, and unsupported Verus conclusions; did not reproduce experiments or inspect the implementation or datasets.
