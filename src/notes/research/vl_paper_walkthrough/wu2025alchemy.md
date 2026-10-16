# Alchemy: Amplifying Theorem-Proving Capability through Symbolic Mutation
(authored by agents unless marked 🧑)
Tag: `wu2025alchemy`, [paper](http://arxiv.org/abs/2410.15748v2)

## symbolic mutation in one picture

Alchemy synthesizes new Lean theorems from existing Mathlib theorems by executing small, proof-assistant-defined mutations. For each candidate theorem, it finds theorems that can be invoked with `rw` or `apply`, replaces a statement term with an equivalent term or a sufficient antecedent, constructs a proof by reversing that mutation, and asks Lean to verify the result. The abstract states: “As a result, our method increases the number of theorems in Mathlib by an order of magnitude, from 110k to 6M.” (Abstract, p. 1). This is data synthesis for neural proof search; Lean's kernel remains the acceptance boundary. The paper says: “The resulting theorems that pass type checking can serve as supplementary data for training a neural theorem prover.” (Section 3, p. 4).

Inference: the same pattern can enlarge a Verus training corpus by transforming verified Rust specifications or proof states, but Lean tactics, AST shapes, and theorem declarations do not transfer directly. A Verus mutation must preserve Rust typing, ownership, and specification semantics and then pass Verus verification.

## finding invocable theorems

The candidate theorem is a proof tree whose leaves are assumptions and root is the assertion. The method uses two manipulations. `rw` replaces a target or assumption term using an equality or iff, in either direction. `apply` matches an implication's consequent to the current goal and changes the goal to its antecedent; applied to an assumption, it pushes the implication forward (Section 3.1, pp. 4–5). Table 1 gives four `rw` templates (forward/reverse, target/assumption) and two `apply` templates (direct goal and `have`-based assumption).

Algorithm 1 is directly executable:

1. initialize a Lean environment and retrieve the candidate's initial proof state
2. enumerate every potential theorem and each instruction template
3. format an instruction such as `rw [theorem]`, `rw [← theorem] at assumption`, or `apply theorem`
4. run the instruction through Lean's tactic API
5. retain `(initial state, next state, instruction)` when the resulting state is valid (Algorithm 1, p. 5)

The method filters retained invocations, parses the candidate statement's AST to locate the changed component, and replaces that component with the equivalent or antecedent extracted from the subsequent proof state (Section 3.1, pp. 5–6). The worked coprime example rewrites `IsRelPrime a b` to `a.Coprime b`, or introduces `c` and `a*c ≡ 1 [MOD b]` so an implication theorem can apply (Figure 1, p. 3).

Inference: a Verus version could enumerate applicable lemmas or spec predicates at a proof state, execute candidate transformations in Verus, and retain only state transitions accepted by the verifier. The paper's `rw`/`apply` semantics are Lean-specific; in Verus, equivalent transformations may be `assert`, `broadcast`, `rewrite`-style lemmas, or function-call obligations, but the exact commands must be checked against the Verus language.

## constructing and checking mutated proofs

A mutation changes one statement component, so Alchemy reverses that change with a `have` lemma and then reuses the original proof. The paper explains: “Given that we only make a one-step modification to the statement, transforming the original proof state to a mutated proof state, a logical approach is to reverse the mutation and utilize the original proof to complete the remaining proving process.” (Section 3.2, p. 6). The `have` tactic introduces the original assumption or assertion as a lemma; the original proof then completes the remaining goal. Tactic-style and term-style proofs are both supported. Every constructed block is submitted to Lean, and wrong variants are removed (Section 3.2, pp. 6–7).

Use the proof-generation method as follows:

1. retain the original theorem and proof
2. apply one invocable `rw` or `apply` mutation
3. generate a `have` statement restoring the changed component
4. prove that lemma by reversing the recorded tactic and using the original assumption/proof
5. append the original proof after the lemma
6. compile the entire `example` in Lean and discard any failure

Inference: in Verus, the analogous artifact would be a new spec lemma whose preconditions are transformed, followed by a proof block that establishes the original relation and calls the old lemma. Verus's proof functions and `ensures` clauses must be used in their valid positions; an unverified text splice is not a synthetic theorem. The paper proves only the variants that Lean accepts, not that every syntactic mutation is useful or independent.

## training on the enlarged corpus

Alchemy uses two products of synthesis: new theorem statements/proofs and new state-tactic pairs centered on `rw` and `apply`. It continually pretrains Llama-3-8B and DeepSeek-Coder-7B on Mathlib plus variants, then supervised-finetunes on state-tactic pairs with a proof-step prediction objective (Section 3.3, p. 7). The prompt presents a current Lean state and asks for the next tactic between `[TAC]` markers (Figure 2, p. 7).

Implementation starts from about 110k Mathlib theorems. Finding invocable theorems costs 14 days on 4,096 CPU cores for `rw` and 7 days on 2,048 CPU cores for `apply`, with one-hour per-theorem timeouts; statement/proof construction takes about an hour on 24 cores. The enlarged repository is built on 2,048 cores, then traced for three days on 96 cores to extract state-tactic pairs (Section 4.1, p. 7). Inference: this cost is a major practical limit for VL; caching lemma applicability and restricting mutations by type or specification shape would be necessary.

Table 2 separates candidate counts, invocable instructions, and verified outputs. For `rw`, 110,657 candidates produce 5,081,544 stage-one invocations and 2,830,817 stage-two verified theorems: 25× expansion and 56% conversion. For `apply`, 78,871 candidates produce 9,483,504 invocations and 3,495,832 verified theorems: 44× expansion and 37% conversion (Table 2, p. 8). The paper's headline 6,326,649 total is the sum of the two verified sets, while the 110k seed is the Mathlib count (Introduction, p. 2; Table 2, p. 8). Variants and state-tactic pairs that occur in the benchmark test split are removed; invocable-theorem duplicates are deduplicated, leaving about 30k additional state-tactic points per tactic (Section 4.2, p. 8).

## evaluation and what it proves

The Leandojo benchmark has 1,929 random-split and 1,659 novel-premise test theorems after removing uninitializable cases. Search uses best-first search, a 10-minute timeout, and budget `1 × 32 × 100` (attempt × samples × steps) (Section 4.1, p. 7). On the Llama3-8B novel-premise split, Mathlib training alone reaches 38.52%; adding `rw` and `apply` variants reaches 43.22%, a +4.70 percentage-point gain over 1,659 theorems. On DeepSeek-Coder, the corresponding gain is +4.22 points (39.24% to 43.46%; Table 3, p. 9). Inference: these percentages measure benchmark theorem completion, not the fraction of generated code that is semantically useful in a new Rust project.

Continual pretraining generally helps. For Llama3 with `rw + apply` SFT, novel-premise performance rises from 41.95% without continual pretraining to 43.22% with it; for DeepSeek under the same setting, it rises from 42.92% to 43.46% (Table 4, p. 10). Increasing one tactic's data saturates; the authors report about 30k per tactic as a compromise and argue that tactic diversity is more valuable than simply adding more of one kind (Section 4.3.3, p. 10).

On out-of-distribution miniF2F-test, the denominator is 244 problems. Mathlib-train solves 83/244 = 34.01%; adding only `rw` solves 86/244 = 35.24%; only `apply` solves 88/244 = 36.07%; both solve 89/244 = 36.48%, a +2.47-point gain (Table 5, p. 10). The paper observes that synthesized tactic distributions can bias the prover toward those tactics and that competition problems prefer other tactics such as `simp`, `omega`, `linarith`, and `norm_num` (Section 4.3.4, p. 10). Inference: a Verus corpus should balance mutations across arithmetic, sequence, ownership, concurrency, and API-invariant lemmas rather than overproduce one proof command.

## assumptions, limits, and VL use

Lean's parser, elaborator, tactic execution, theorem library, and kernel checker are trusted. The mutation search, filtering rules, AST replacement, timeout behavior, model training, and benchmark distribution are engineering choices. The paper's synthetic proofs are verified, but it does not prove that the generated corpus is free of redundancy or that gains transfer to another prover. Inference: threat to agent-written verified Rust is moderate for data quality and search efficiency and low for final proof soundness when Verus checks every output. A failed mutation should be discarded, never relaxed into an unchecked lemma.

The paper has already explored generic symbolic theorem augmentation with `rw`/`apply`, state-tactic extraction, tactic balancing, continual pretraining, and out-of-distribution evaluation. VL should reuse those design questions rather than repeat them unchanged. What remains open is a Rust-specific mutation library and experiments measuring whether mutated Verus obligations improve proof completion without teaching invalid ownership or specification patterns.

## techniques for the catalog

- invocable-theorem enumeration — execute every typed rewrite or implication template in an interactive proof state and retain valid transitions
- symbolic statement mutation — replace an AST component with an equality-equivalent term or an implication antecedent
- proof reversal with `have` — restore the original component as a lemma and reuse the seed proof after a one-step mutation
- verifier-filtered corpus growth — compile every generated theorem and discard failures before training
- state-tactic extraction — trace accepted variants into deduplicated proof-state/next-tactic pairs
- tactic-balanced continual training — mix mutation families during pretraining and supervised proof-step finetuning
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
