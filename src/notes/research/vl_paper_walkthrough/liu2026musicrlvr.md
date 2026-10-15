# Do Language Models Need Music Supervision? Verifiable Rewards for Multi-Constraint Symbolic Music Generation
(authored by agents unless marked 🧑)
Tag: `liu2026musicrlvr`, [paper](https://arxiv.org/abs/2609.23665)

## task and benchmark

The paper treats symbolic music generation as a constraint-satisfaction problem. A prompt requests a subset of eight properties of a monophonic ABC tune: key, meter, length, pitch range, final note, rhythm, melodic leap, and four-bar structure. Each property has a deterministic `music21` verifier. A tune is successful only when it parses and every requested verifier passes. The authors build MusicConstraintBench with 2,180 items plus 400 paraphrases. The paper reports, “The all-satisfied rate drops sharply as the number of simultaneous constraints increases” (section 1, p. 1): Llama-3.1-70B scores 0.630 on single-constraint items and 0.044 on four-constraint items.

The benchmark separates density (Single n=200, Mixed n=300, High-k n=160), compositional generalisation (Seen n=200, Unseen n=200, Dense n=500), parameter extrapolation (Edge n=500), structure (n=120), and wording variation (section 4, p. 6). These denominators matter: rates in Table 2 are fractions of each suite, and the overall “All” column is over all 2,180 items.

## technique 1: hard validation gate before reward

What it is. Parse each model completion as ABC and reject malformed or unparseable output before any property receives credit. Only a parseable score enters the deterministic verifiers. The paper explains, “the gate scores every rejected output 0 before any credit is assigned.” (section 3.3, p. 5).

When to use it. Use a gate whenever partial checks could reward a fragment that does not constitute a valid artifact. In this task, a fragment could mention a key and range without forming a tune.

How to do it.
1. Sample an ABC completion from the policy (section 3, p. 3).
2. Parse and apply format checks; return rejection `⊥` for malformed ABC (sections 3.1 and 3.3, pp. 4–5).
3. If accepted, run only verifiers for the requested families (Figure 2, p. 4).
4. Set the reward to zero for rejection; otherwise compute family scores (section 3.3, p. 5).

Verus form. Inference: make a Rust parser return `Option<Score>` and prove that downstream verifier calls receive only a well-formed score. Use `requires`/`ensures` for parser and score invariants; keep parsing failures outside the reward path. Inference: this is analogous to refusing to assign proof credit to a Rust value that does not satisfy representation invariants.

Evidence and limits. The gate and verifiers were calibrated without annotators: 32 constructed scores had known values, six single-property mutations flipped exactly one target family, and meter checks agreed with declared meter on all 400 IrishMAN tunes tested (section 3.2, p. 5). The authors evaluate compliance, not musical quality; polyphony and richer forms are outside scope (Limitations, p. 11).

## technique 2: graded per-family reward plus all-satisfied bonus

What it is. Binary all-satisfied reward gives every near miss the same zero. MusicRLVR instead averages a score for each requested family and mixes it with a binary all-satisfied indicator. The paper sets λ=0.7, so the graded average contributes 70% and the joint-success bonus 30%. Seven families are binary; structure receives graded repetition credit plus binary contrast credit (section 3.3, pp. 5–6).

How to do it.
1. For completion `y`, run the gate and family verifiers to obtain `s_f` (section 3.3, p. 5).
2. Compute the mean over the k requested families (section 3.3, p. 5).
3. Add `(1−λ)A`, where `A` is one only when every requested family passes; set λ=0.7 (equation 5, p. 5).
4. For structure, use the paper's fixed split: `0.7 × repetition credit + 0.3 × contrast verdict` (section 3.3, p. 5).
5. Normalize rewards within each GRPO prompt group (equation 4, p. 5).

Verus form. Inference: represent each property as a proved predicate returning `bool`; define a specification-level conjunction for all-satisfied and a runtime score for optimization. Prove that the all-satisfied indicator is one only when every predicate is true. Inference: graded reward guides search but is not itself a correctness proof.

Evidence. Table 6 evaluates ablations over all 2,180 items. The default reaches 0.580; removing or changing components lowers “All” to 0.502–0.553. The matched Direct configuration reaches 0.807 on Mixed (n=300), 0.985 on Single (n=200), 0.575 on High-k (n=160), and 0.580 overall (Table 2, pp. 7–8). These are all-satisfied rates, not average partial scores. Graded credit reduces zero-variance groups from 0.550 to 0.307 over the first 50 updates and from 0.717 to 0.660 over all 300 updates (section 5.5, p. 10).

## technique 3: verifier-driven GRPO training

What it is. Group Relative Policy Optimization (GRPO) samples a group of completions for one prompt, scores each with the verifier reward, normalizes by the group mean and standard deviation, and applies token-level advantages with a clipped policy objective and KL penalty. No learned reward model or value network is used (sections 3.3–3.4, pp. 5–6).

How to do it.
1. Sample G=8 completions for each prompt (section 3.4, p. 6).
2. Gate and score every completion using equation 5 (section 3.4, p. 6).
3. Compute group-relative advantages with ε=10^-4 (equation 4, p. 5).
4. Assign each completion's advantage to its tokens and optimize the PPO clipped surrogate with a KL penalty β toward the initial checkpoint (section 3.4, p. 6).
5. Train full-parameter Qwen3-4B-Instruct-2507 for 300 optimizer steps on 6,000 synthetic prompts, with learning rate 1×10^-6, β=0.04, and clip ε=0.2 (section 3.4, p. 6).

Verus form. Inference: use GRPO only to search for candidate Rust/proof text; run Verus after generation as the acceptance verifier. Proof functions and `spec fn`s define properties, while policy training remains ordinary executable code. Inference: a reward model cannot replace Verus's proof obligation because a high reward may still represent a failed property.

Evidence. Direct MusicRLVR raises Qwen3-4B Mixed from 0.160 to 0.807 (n=300) and overall from 0.068 to 0.580 (n=2,180), while preserving general benchmarks: IFBench strict 32.0→29.3, MMLU-Redux 83.9→84.4, and GSM8K 93.9→94.1 (Tables 2 and 4, pp. 7–9). The paper states, “MusicRLVR raises Qwen3-4B from 0.160 to 0.797 on Mixed in under four hours of training” (conclusion, p. 11); this 0.797 is the Direct GRPO binary-reward comparison in Table 2, whereas the final default graded configuration is 0.807. Inference: the differing numbers should not be merged; they correspond to different reward settings.

## technique 4: generalisation tests and verifier reranking

What it is. Evaluate held-out constraint combinations, parameter values outside training, more simultaneous constraints, and free-form wording. At inference, sample multiple completions and select the one with the highest verifier score.

How to do it.
1. Exclude four family pairs from both training pools and evaluate them as Unseen (section 4, p. 6).
2. Expand meter, length, leap, range, and rhythm domains for Edge (section 5.4, p. 9).
3. Request four or more constraints in High-k/Dense although training prompts contain at most three (section 5.4, p. 9).
4. Render 60 hand-written free-form requests and score them with the same gate and verifiers (section 5.4, p. 9).
5. Sample k completions at temperature 1.0 and choose the highest verifier score (Table 3, p. 8).

Evidence. Direct reaches 0.595 on Unseen (n=200) versus a best zero-shot 0.195, and 0.300 on Edge (n=500) versus 0.160 (section 5.4, p. 9). On free-form requests, Direct reaches 0.583 for Qwen3-4B and 0.717 for Qwen3-8B, while the zero-shot 4B model reaches 0.067 (section 5.4, p. 9). Verifier reranking eight samples raises Direct Mixed from 0.807 greedy to 0.897 best-of-eight (Table 3, n=300), while zero-shot Qwen3-4B rises 0.160 to 0.393.

## what is trusted and threat to VL

The trusted components are the ABC parser, deterministic `music21` routines, prompt-to-constraint rendering, and training/evaluation code. The paper validates routines on constructed scores and 400 corpus tunes but does not prove the implementation of `music21`. It measures stated-constraint compliance, not perceptual quality. Inference: for agent-written verified Rust, the reusable pattern is gate → per-property proofs → conjunction bonus → verifier-guided search. The principal threat is reward/specification mismatch: a model can optimize a checker that omits intended behavior. Independent specification review and Verus proofs of the actual Rust predicates are required. The paper's own reward ablations show that removing any component harms dense-constraint performance; VL should not collapse all proof feedback into one binary success bit.

## techniques for the catalog

- hard validation gate: reject malformed artifacts before assigning any property credit
- graded verifier reward: average per-property scores and add a joint all-satisfied bonus
- verifier-driven GRPO: normalize deterministic verifier rewards within prompt groups and update the policy
- generalisation and reranking: test held-out constraints and select among sampled candidates by verifier score
Checked 2026-10-15 against paper liu2026musicrlvr: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
