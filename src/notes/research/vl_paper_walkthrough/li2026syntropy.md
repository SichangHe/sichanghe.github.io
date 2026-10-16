# Specification-Guided Synthesis of Deadlock-Free Communication Protocol Refinements with Large Language Models
(authored by agents unless marked 🧑)
Tag: `li2026syntropy`, [paper](https://www.semanticscholar.org/paper/38efdd7650fc2fbd6ab2059a3c634234bb9cfd44)

## verified target
Syntropy synthesizes asynchronous multiparty-session-type (MPST) subtypes with an LLM, then filters and checks them against asynchronous multiparty subtyping (AMS). The source type describes participant communication; a subtype may reorder independent actions, accept more inputs, or offer fewer outputs while preserving safety and deadlock freedom. The authors write that MPST “captures global interaction structures and enforcs properties such as communication safety and deadlock freedom.” (Introduction, p. 1) The paper reports 95.6%–99.5% validity in its abstract, but each figure/table has its own denominator and model; percentages below retain those settings.

## technique 1: specification representation and training
What it is: train an open model to generate subtype sequences conditioned on a supertype and transformation labels. The model-friendly grammar makes sends/receives sequential, choices explicit, and recursion delimited by `REC_X_OPEN`/`REC_X_CLOSE` (Section 3.1, pp. 3–4). Training instances are `{S, [{T_i,l_i}], n}` from MPST literature plus synthetic data; prompt tokens are masked so only assistant subtype output contributes to loss (Section 3.1, p. 4).

Steps from the paper:
1. Collect supertypes from MPST literature and generate additional synthetic structures (Section 4.1.1, p. 7).
2. Encode sends as `p!m;T`, receives as `p?m;T`, choices as branches, and recursion with explicit open/close tokens (Section 3.1, p. 4).
3. Label examples with Identity, Unfold, RefA (receive reordering), RefB (send reordering), RefOut (covariance), and RefIn (contravariance), using the valid/invalid examples in Table 1 (Section 3.1, p. 4).
4. Fine-tune with LoRA rank 64, α=32, dropout 0.05, sequence length 8k, AdamW, cosine schedule, 0.1 warmup, and 3 epochs (Section 3.1, p. 4).
5. Weight subtype tokens 1.0 and auxiliary labels/counts 0.2; mask system/user prompts from loss (Section 3.1, p. 4).

Verus form (inference): encode a protocol as a Rust ghost enum/tree and state an `is_subtype(sub, super)` `spec fn`; prove generated transitions satisfy it with lemmas. The LLM and LoRA training are outside Verus. Rust message handlers need `requires`/`ensures` for channel state, and deadlock freedom still needs a scheduler/channel model.

Evidence and limits: the training set has 704 supertypes and 10,800 pairs (100 literature-derived, 604 synthetic subtype-source counts as reported) while the test set has 100 supertypes (43 literature, 57 synthetic) (Section 4.1.1, p. 7). The paper notes literature supertypes lack canonical targets, so additional subtypes are heuristically generated and checked; this can bias training toward the checker.

## technique 2: two-level constrained generation
What it is: Algorithm 1 combines beam search with token-level derivative feasibility and a complete-candidate widening-based fixpoint check. The paper states: “A prefix is rejected only when no completion of the current partial tree can satisfy the subtyping constraints.” (Section 3.2.2, p. 5).

Steps from Algorithm 1 (Section 3.2.2, pp. 5–6):
1. Parse supertype S to session tree T_S; initialize beam `{(ε,0)}` and empty candidate set Ω.
2. At each decoding step, expand each beam with top-2k model tokens; parse each prefix to partial tree T′.
3. Level 1 computes `Feasible(T′,T_S)` by derivative reasoning; prune false prefixes and retain feasible non-EOS beams.
4. On EOS, parse the complete tree T_f and run Level 2 `SimCheck(T_f,T_S)`. Add only accepted candidates to Ω.
5. Keep top-k cumulative-log-probability beams after each step; return Ω.
6. In Level 2, maintain obligations over pairs of subtype/supertype states; match sends and branching receives, and use widening at recursion points to force fixpoint termination (Section 3.2.2, pp. 5–6).

The checker is sound but incomplete: acceptance implies AMS validity, while rejection may reject a valid subtype; protocols above about 701 grammar units can exceed practical limits (Section 3.2.2, p. 6). Inference: this is a useful verifier-in-the-loop pattern for VL generation, but it gives a lower bound on correctness when the checker is incomplete. The paper explicitly says: “This checker accepts only candidates satisfying the asynchronous subtyping relation, while some valid ones may be rejected.” (Section 3.2.2, p. 6)

Verus form (inference): implement `Feasible` and `SimCheck` as ghost recursive functions over finite trees, with explicit `decreases` measures for recursion/widening. Executable beam search can call an unverified checker, but accepted output must be rechecked by Verus lemmas before use. Verus has no `ensures` on a `spec fn`; put postconditions on proof/executable wrappers.

## technique 3: refinement transformations
AMS permits covariance (fewer outputs), contravariance (more inputs), and independent asynchronous reorderings R1/R2 (Section 2, p. 3). For a concrete federated-learning aggregator, the paper gives `T_a = μt.p?upd_p.q?upd_q.⊕{m!std.t,m!wtd.t}` and a subtype that receives q before p; Figure 3 shows that reordered FSM. Apply transformations compositionally: select an independent receive/send for RefA/RefB, drop output branches for RefOut, add input branches for RefIn, and unfold recursion when needed (Table 1, p. 4). The paper's worked example says: “As the updates from p and q are independent, the two FSMs are refinements of each other.” (Section 2, p. 2).

Verus form (inference): model channels as ghost queues and prove each reorder preserves a trace projection or queue-permutation invariant. Branch variance becomes set inclusion predicates. This does not prove a real network implementation unless send/receive code is linked to the model.

## evidence, failures, and product implications
On the 100-supertype test set, Qwen2.5-Coder-7B direct generation produced 85.0% syntactic validity and 60.4% semantic validity among syntactically valid outputs; monitoring produced 96.7% syntactic and 99.2% semantic validity (Table 3, p. 8; denominator 100 test supertypes/model). Across models with monitoring, semantic validity was 99.5% for CodeLlama-7B, 95.7% StarCoder2-7B, 96.4% Qwen2.5-7B, and 95.6% Qwen2.5-Coder-32B (Table 3, same test setting). Monitoring raised token use from 8.6M to 27.5M for Qwen2.5-Coder-7B (Table 3, p. 8), approximately 3× as the authors state. The ablation removes monitoring and drops semantic validity to 60.4%; removing the prompt gives 93.9% versus 99.2% with it (Figure 9, p. 9). These numbers are checker acceptance, not proof that deployed implementations are deadlock-free.

Already done that VL should not redo: typed MPST/AMS transformations and a sound derivative checker already provide the protocol-level contract; VL should focus on translating accepted trees into verified Rust handlers and connecting queue semantics. Inference: threat to agent-written verified Rust is medium to high for distributed code—Syntropy constrains protocol shape, but does not verify resource bounds, data invariants, unsafe code, or generated Rust. Trusted components include the grammar parser, AMS checker, model, beam implementation, and dataset's heuristic subtype generator.

## techniques for the catalog
- MPST-conditioned subtype training — fine-tune on typed supertype/subtype pairs with explicit transformation grammar
- token-level derivative filtering — prune prefixes that cannot complete to a valid asynchronous subtype
- widening-based final checking — verify complete session trees with coinductive derivatives and recursion widening
- variance and reordering refinement — apply covariance, contravariance, and independent send/receive anticipation

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
