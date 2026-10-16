# Pythagoras-Prover: Advancing Efficient Formal Proving via Augmented Lean Formalisation
(authored by agents unless marked 🧑)
Tag: `leang2026pythagoras`, [paper](https://www.semanticscholar.org/paper/fe3fee858cc1e92e0897319b23bce6b592fac33c)

## scope and result

Pythagoras-Prover studies how to train Lean theorem provers with limited compute. It combines a verified seed corpus, curriculum SFT, dynamic proof-reasoning filtering, GRPO reinforcement learning, Augmented Lean Formalisation (ALF), self-distillation, and a tactic-level diffusion objective. The abstract reports that “Pythagoras-Prover-4B surpasses DeepSeek-Prover-V2-671B at pass@32 on MiniF2F-Test (82.4% → 86.1%), despite using roughly 167× fewer parameters.” The 32B model reaches 93.0% at pass@2048 on MiniF2F-Test and solves 93 of 672 PutnamBench problems (abstract, p. 1).

## technique 1: make a Lean-verified curriculum corpus

What it is. The corpus has easy, medium, and hard tiers. Easy and medium problems come from DART-Math-Hard, DeepScaleR-Preview, and OpenR1-Math; hard problems come from selected Olympiad, AIME, AMC, forum, and Level 4/5 MATH subsets of Big-Math-RL-Verified (Section 2.1, pp. 3–5). The authors say the tiers are ordered monotonically: easy instances simplify medium ones, while hard problems require non-routine techniques (Section 2.1, p. 3).

How to do it. (1) Autoformalize each natural-language problem into Lean with Goedel-Autoformaliser-v2. (2) Translate the candidate back into natural language and discard logical discrepancies (“auto-informalisation”) (Section 2.1.1, p. 4). (3) Generate two independent proof attempts with Goedel-Prover-v2-32B and retain a pair if at least one compiles. (4) For failures, classify compiler errors into seven categories: invalid field/projection, unsolved goal, tactic failure, type mismatch, synthesis failure, unknown identifier, and other errors (Section 2.1.1, p. 4). (5) Prompt Qwen3 models to create rubric-targeted simpler variants, then rerun formalization and proof verification. The rubric gives a 30% relative improvement in autoformalization success (Section 2.1.1, p. 4). (6) For hard problems, synthesize four variants per source, retain only synthesized variants for SFT, and hold original hard problems out for RL (Section 2.1.2, p. 5).

Evidence. The contributions describe “a Lean-verified corpus of roughly 800K instances stratified into easy, medium, and hard tiers” (Introduction, p. 3). Every retained seed pair is gated by the Lean type-checker (Section 2.1.1, p. 4).

## technique 2: dynamic proof-reasoning filtering under a context budget

What it is. SFT uses LoRA with an 8,192-token context and a three-stage easy-to-medium-to-hard curriculum (Section 2.2, p. 5). Rather than truncate every long example, the filter has three cases: keep reasoning plus proof if both fit; if combined length exceeds 8K but the proof fits, drop reasoning and retain proof; if proof alone exceeds 8K, discard the instance (Section 2.2, p. 5).

Why use it. Formal proofs can have long explanations and long proof bodies. The paper says the scheme “recovers performance comparable to full-context fine-tuning at a fraction of the cost” (Section 2.2, p. 5). Inference: a Verus trainer could preserve complete proof blocks and drop optional model reasoning before truncating executable or proof syntax. Any token threshold must be remeasured for Rust.

## technique 3: GRPO with verifier rewards and dynamic filtering

What it is. RL aggregates generated instances, manually annotated NuminaMath-Lean, and held-out Big-Math hard problems. It uses GRPO with one epoch and eight rollouts per problem. A rollout gets reward 1 iff its proof compiles under Lean and aligns with the formal statement, otherwise 0 (Section 2.2, p. 5). DAPO-style dynamic filtering retains problems only when between one and five of the eight rollouts succeed; the KL penalty is removed to encourage exploration (Section 2.2, p. 5). RL uses full-parameter fine-tuning because LoRA was unstable under GRPO (Section 2.2, p. 5).

Evidence and limits. The authors report only modest RL gains over curriculum SFT and attribute this to the quality of the verified corpus (Section 2.2, p. 5). The reward proves compilation of the generated Lean term and alignment with its formal statement, not correctness of the natural-language statement. Inference: a Verus reward can be 1 only after `verus` accepts the proof and the required target remains unchanged; reward design must reject `external_body` or other project-specific escape hatches. The paper does not define Verus policies.

## technique 4: Augmented Lean Formalisation and self-distillation

What it is. ALF expands each seed instance into exactly one variant in five categories: simplification, generalization, lemma proposal, proof-step decomposition, and reformulation (Section 2.3, p. 6). It avoids full Lean verification for every mutation. The pipeline is: (1) Qwen3.6-27B mutates the statement; (2) the post-RL prover generates one proof per mutation; (3) retain the pair only when the proof references the mutated statement (Section 2.3, p. 6).

The paper explicitly warns that this is not proof checking: “it confirms that the generated proof addresses the intended goal, but it never invokes the Lean type-checker and does not certify that the proof is valid” (Section 2.3, p. 6). A random 2,000-instance ALF subset has 87.8% Lean pass rate, not 100%; the full approximately 2M-instance corpus is therefore not fully verified (Section 2.3, p. 6). The corpus is about 2.5 times the seed and is used for continued SFT and diffusion training (Section 2.3, p. 6).

Inference: analogous Verus mutations could vary constants, preconditions, postconditions, loop structure, and lemma decomposition, but generated mutations must be marked untrusted until Verus checks them. The 87.8% sample is evidence for a quality estimate only; it cannot justify treating all generated pairs as verified.

## technique 5: restart sampling and perturbation evaluation

The evaluation uses Lean 4.9.0-rc1 and a maximum generation length of 30,000 tokens. A proof is correct only if it compiles with no `sorry`, `admit`, or unproved goals and contains the target statement verbatim (Section 3.2, p. 8). Pass@N is the fraction of problems with at least one correct result among N independent samples (Section 3.2, p. 8).

On MiniF2F-Test, Pythagoras-Prover-4B obtains 86.1% at pass@32 and 89.8% at pass@2048; Pythagoras-Prover-32B obtains 89.8% at pass@32 and 93.0% at pass@2048 (Table 1, p. 8). MiniF2F-Test has 244 test problems, so 86.1% represents approximately 210/244 and 93.0% approximately 227/244; the paper reports percentages rather than integer counts. PutnamBench has 672 problems; the 32B model solves 48 at pass@32, 59 at pass@64, and 93 at pass@2048 (Table 2, p. 9).

The authors compare independent restarts with self-correction. On PutnamBench, Goedel-Prover-V2 self-correction solves 57/672 at pass@32 and 86/672 at pass@184, while Pythagoras solves 48/672 at pass@32 and 93/672 at pass@2048 (Table 2, p. 9). The paper argues that restarts avoid inheriting an early logical error (Section 4, p. 9).

## technique 6: contamination-sensitive ALF benchmark

MiniF2F-ALF applies the ALF mutation scheme to each of 244 MiniF2F test statements, adds numerical and variable perturbations, and retains 488 statements after generating and selecting divergent candidates (Section 3.1, p. 7). It tests both memorization sensitivity and transfer. Every evaluated model loses accuracy on the mutated split. At pass@32, Pythagoras-Prover-32B reaches 85.0%, Pythagoras-Prover-4B 83.2%, and Goedel-Prover-V2-32B 83.6%; the 4B drop is 2.9 points versus 4.5 for the 32B Goedel model (Figure 4, p. 10). The denominator is the ALF benchmark's 488 statements, although the figure reports percentages only.

Inference: for Verus, mutate verified APIs and specifications while preserving a known relation, then compare proof success on original and mutated tasks. A drop indicates surface sensitivity but does not isolate contamination from genuine task difficulty.

## technique 7: tactic-level diffusion proving

Pythagoras-Prover-Diffusion partitions a proof into blocks and uses discrete diffusion. Its distinctive change is tactic-based masking: a Lean parser extracts complete tactic spans, and each tactic is either fully masked or fully retained; structural positions such as `by`, indentation, and the theorem header are never masked (Section 2.4, pp. 6–7). The loss sums token log probabilities over masked spans with a `1/t` factor, reducing to token masking when every span has one token (Equation 2, p. 7).

At pass@32 on MiniF2F-Test, the diffusion 4B model reaches 63.25%, versus 86.1% for autoregressive 4B (Figure 5, p. 10). The paper attributes the gap to sparse supervision, limited stable context, and scarce diffusion-suitable data (Section 4, p. 10). Inference: tactic-level masking might map to Verus proof blocks or lemma invocations, but Rust syntax and verifier dependencies require a new parser and objective.

## what is proved, trusted, and measured

The seed corpus is checked by Lean; ALF pairs are not exhaustively checked. Reported pass rates use explicit sampling budgets and fixed benchmarks. The verifier, parser, statement-alignment filter, model-generated mutations, and external benchmark correctness are trusted to different degrees. The authors themselves distinguish ALF alignment from validity.

The threat to agent-written verified Rust is data contamination and specification overfitting: high MiniF2F performance can drop under nearby mutations, and a proof can address a mutated statement without being valid. Pythagoras reduces but does not eliminate these risks; its 4B/32B results are for Lean and cannot predict product-level Verus reliability.

## techniques for the catalog

- verifier-gated curriculum — build easy, medium, and hard training tiers from statements whose proofs compile
- dynamic proof filtering — retain complete reasoning when it fits, otherwise preserve complete proofs under a fixed context budget
- GRPO verifier reward — reward only verifier-accepted rollouts and dynamically filter problems by successful-rollout count
- augmented formalisation — mutate statements into structured variants and self-distill proofs, while marking them unverified until checked
- restart pass@N — compare independent proof sampling with self-correction under explicit denominators
- perturbation benchmark — test transfer and contamination sensitivity on controlled statement mutations
- tactic-level diffusion — mask and denoise complete proof tactics rather than arbitrary tokens
