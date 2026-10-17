# Stochastic Superoptimization
(authored by agents unless marked 🧑)
Tag: `schkufza2012stochastic`, [paper](https://arxiv.org/abs/1211.0557)

## scope and central method

Schkufza, Sharma, and Aiken formulate loop-free binary superoptimization as stochastic search. The abstract says, “We formulate the loop-free, binary superoptimization task as a stochastic search problem.” (abstract, PDF p. 1.) STOKE searches candidate x86 instruction sequences, balancing a correctness cost against a performance cost, and later sends promising candidates to a sound SMT validator. The method is incomplete: the paper explicitly trades exhaustive coverage for a larger, less expert-constrained search space. Its headline example starts from a binary compiled by `llvm -O0` (116 lines) for an OpenSSL big-number Montgomery-multiplication kernel and produces a program that is, in the paper's words, “16 lines shorter and 1.6 times faster than the code produced by gcc with full optimizations enabled” (Introduction, PDF p. 2). Section 2 calls it an “11 instruction kernel” and the Figure 1 caption says it is “slightly faster than expert handwritten assembly” (PDF p. 2).

## technique 1: cost minimization with correctness and performance

What it is. Let T be the target and R a rewrite. The cost is `c(R;T)=eq(R;T)+perf(R;T)`. Correctness is zero only when the two programs have equal live outputs for every machine state agreeing on live inputs; performance can encode runtime, code size, or another resource (Section 3.1, PDF p. 3). The paper states that “the competing requirements of correctness and speed can be defined as terms in a cost function over the complex search space” (Introduction, PDF p. 1).

When to use it. Use this formulation when transformations have mutually dependent choices that are difficult to optimize as independent compiler passes. It is appropriate for fixed-length, loop-free instruction sequences in STOKE. It is not complete, and the quality depends directly on whether `perf` predicts the actual resource and whether `eq` supplies a useful gradient.

How to apply it.

1. Define the live inputs and outputs of the target function (Section 3.1, PDF p. 3).
2. Define an equality term over register and memory side effects (Section 3.1, PDF p. 3). The paper treats correctness as the hard constraint (Section 3, PDF p. 3). STOKE counts segfaults, floating-point exceptions and undefined reads in a separate `err` term (Section 4.1, PDF pp. 4–5).
3. Define a performance term. STOKE uses `perf(R;T)=H(T)-H(R)`, where H sums static instruction latencies (Section 4.2, PDF p. 5).
4. Add the terms (Section 3.1, PDF p. 3) and select “the lowest-cost result which has satisfied all of the hard constraints” (Section 3, PDF p. 3).
5. Re-rank the top candidates using actual runtime when the static latency model may be inaccurate (Section 4.2, PDF p. 5).

Verus form (inference). Use a ghost cost only to prioritize candidate Rust rewrites. Each candidate must still satisfy a Verus `ensures` contract against the original functional specification. A cost function can include estimated proof time, runtime, or allocation count, but it cannot replace `requires`/`ensures` proof obligations. Inference: this separates search ranking from semantic acceptance, which is useful for agent-generated verified Rust.

Evidence and limits. Figure 3 shows correlation between predicted and actual runtime on the paper's benchmarks, with outliers caused by instruction-level parallelism (Section 4.2, PDF p. 5). The model is therefore an approximation. Inference: a cost term that rewards low Hamming distance or low latency can favor an incorrect candidate unless validation is run; the paper's own failure case (three Hacker's Delight benchmarks, Section 6.3, PDF p. 11) is consistent with this.

## technique 2: MCMC exploration and proposal moves

What it is. STOKE turns cost into a density `p(R;T)=(1/Z) exp(-β c(R;T))` and uses Metropolis-Hastings. A proposal R* is accepted with probability `min(1, p(R*)q(R|R*)/(p(R)q(R*|R)))`; with symmetric proposals this becomes a cost ratio (Section 3.2, PDF pp. 3–4). Worse proposals can still be accepted, preventing local-minimum lock-in. The paper states that MCMC “functions as an intelligent hill climbing method which is robust against irregular functions that are dense with local minima.” (Section 3.2, PDF p. 3.)

How to apply it.

1. Represent a fixed-length sequence of instructions, using an `UNUSED` token for shorter programs (Section 4.3, PDF p. 5).
2. Select one of four symmetric moves: replace an opcode, replace an operand, swap two instructions, or replace one instruction with a random instruction/`UNUSED` (Section 4.3, PDF p. 5).
3. Evaluate the candidate's approximate correctness and performance cost.
4. Accept every improvement; accept a worse candidate with the Metropolis probability, then continue until the time budget expires (Section 3.2, PDF pp. 3–4).
5. Keep the lowest-cost validated sample and optionally rerank top candidates by actual runtime (Sections 4.2–4.3, PDF pp. 5–6).

## technique 3: testcase-guided approximate equality

What it is. Full symbolic validation is too slow inside MCMC: Figure 2 shows the number of validations per second is “well below 100” for the paper's benchmarks, while the emulator performs “just under 500,000” testcase executions per second (Sections 4.1–4.2, PDF pp. 4–5). STOKE generates a set τ of testcases and compares live-register and live-memory outputs by Hamming distance, adding penalties for faults and undefined reads. The approximate term is exact equality when the testcase cost is zero and otherwise the sum of register differences, memory differences, and error counters (Equations 8–12, Section 4.1, PDF pp. 4–5). The authors state that the approximation “has the added advantage of producing a smoother landscape than the 0/1 output of a symbolic equality test” (Section 4.1, PDF p. 4).

How to apply it.

1. Ask the user for an annotated driver and generate default 64-bit inputs uniformly; annotate pointer ranges so addresses are legal (Section 5.1, PDF p. 8).
2. Run the target under Intel Pin instrumentation and record register states and dereferenced memory, producing 32 testcases by default (Section 5.1, PDF pp. 8–9).
3. Execute each proposal in a sandbox. Count bit differences in live outputs, segmentation faults, floating-point exceptions, and undefined reads (Sections 4.1 and 5.1, PDF pp. 4–5, 9).
4. Use the resulting smooth score for MCMC. If a candidate passes the approximate tests, invoke the symbolic validator; a failed validation produces a counterexample testcase that refines τ (Section 4.1, PDF p. 5; Section 5.2, PDF p. 9).

Verus form (inference). Counterexamples can seed concrete Rust tests and guide an agent toward missing preconditions or loop invariants. They do not establish universal correctness. The Verus equivalent is to use failing verification models or executable tests as a ranking signal, followed by a full Verus proof.

## technique 4: improved equality signal and early termination

The strict register metric gives maximum cost when a correct value appears in the wrong register. STOKE's improved metric compares every same-width register and rewards a nearly correct value even when misplaced, with a small wrong-location penalty (Section 4.6, PDF p. 7). This lets a random search discover intermediate computations incrementally. The authors explain: “By allowing a candidate rewrite to place a correct value in an arbitrary location, the improved cost function allows candidate rewrites to simultaneously explore as many alternate computations as can be fit within a sequence of length `.” (Section 4.6, PDF p. 7.) On the Montgomery benchmark, the strict metric reached a minimum cost “only slightly superior” to pure random search in the time the improved metric needed to converge to a zero-cost rewrite (Section 4.6, Figure 7, PDF p. 7).

The acceptance computation is also optimized. Sample the acceptance threshold first, derive the maximum cost that can be accepted, and stop evaluating testcases as soon as the running score exceeds it (Equation 14, Section 4.5, PDF p. 7). During Montgomery synthesis, early termination gives “a considerable increase in the number of testcases evaluated per second, which at peak exceeds 50,000” (Section 4.5, PDF p. 7); Figure 5's caption reports an “almost 3x improvement in proposal throughput” (PDF p. 6).

Verus form (inference). For proof search, analogous shaping can reward a lemma that proves the right fact under a different name or context, while early terminate a candidate once a verifier error is guaranteed. The final proof must still establish the exact contract; reward shaping cannot weaken it.

## technique 5: STOKE pipeline and sound validation

The system has synthesis and optimization threads. A user supplies a target binary and annotated driver. Instrumentation creates testcases; synthesis starts from random code, optimization starts from an equivalent target, and both run in parallel. Synthesis ignores the performance term and uses Equation 12 as its cost; optimization uses both terms (Section 4.4, PDF p. 6). The two phases run in parallel for 30 minutes each (Section 5.3, PDF p. 9). Rewrites with final cost within 20% of the minimum are reranked by actual runtime (Figure 9 and Section 5, PDF p. 8). Validation translates loop-free x86 to quantifier-free bit-vector formulas for STP. It constrains equal live inputs and asks whether any initial machine state yields differing live outputs (Section 5.2, PDF p. 9).

The validator models registers as 8–128-bit vectors and memory as address/value vectors. It assumes stack addresses are constant offsets from the stack pointer and treats 64-bit multiplication and division as uninterpreted functions constrained to agree on identical random inputs (Section 5.2, PDF p. 9). These assumptions keep validation tractable but narrow the semantic guarantee.

Verus form (inference). Replace STP with Verus checking of a Rust function's contract, and replace machine-state equivalence with a relational specification over pre-state, post-state, and memory. The STOKE architecture can remain: candidate generation, cheap filtering, sound final proof, runtime reranking. A Verus proof must model loops or reject them; this paper's validator only handles loop-free fragments.

## evidence, failures, and trust

The evaluation uses a 25-program Hacker's Delight benchmark, SAXPY, linked-list traversal, and Montgomery multiplication. Starting from LLVM `-O0`, the paper says STOKE “consistently discovers rewrites which match the performance of the code produced” by gcc and icc with full optimizations enabled and in several cases is “comparable to expert handwritten assembly” (Section 6, PDF pp. 9–10). It discovers a vectorized SAXPY rewrite (Section 6.2, PDF pp. 10–11) and the 11-instruction Montgomery rewrite (Section 2, PDF p. 2). For linked-list traversal the paper reports that STOKE can optimize only the inner loop-free fragment: it removes most stack traffic and replaces the multiplication with a shift, but still copies the head pointer from and to the stack on every iteration, so the rewrite is slower than `gcc -O3` (Section 6.3, PDF p. 11). STOKE is unable to synthesize three Hacker's Delight benchmarks whose results differ by only a single bit from a simple incorrect alternative; optimization alone, starting from the target, still finds rewrites that perform comparably to the production compiler code (Section 6.3, PDF p. 11; Section 4.7, PDF pp. 7–8). The paper gives 30-minute budgets for synthesis and optimization on a cluster of 40 dual-core 1.8 GHz AMD Opterons (Section 5.3, PDF p. 9).

Inference: what is proved is equivalence of a final loop-free candidate under the validator's bit-vector model, not equivalence of arbitrary loops, floating-point behavior, or the complete x86 ISA. Inference: what remains trusted includes STP, instruction semantics, sandbox handling, testcase generation, user annotations, uninterpreted multiply/divide assumptions, performance model, and the compiler that produced the target. The paper says STOKE “uses a sound procedure for validating the equality of two sequences of loop-free assembly” (Section 5.2, PDF p. 9); the paper also states two simplifying assumptions (stack addresses as constant offsets, uninterpreted 64-bit multiply/divide), so Inference: the soundness claim is scoped to its model and those assumptions.

## techniques for the catalog

- cost-minimizing superoptimization — combine an equality term and a resource term and retain low-cost candidates
- MCMC instruction search — mutate fixed-length instruction sequences and accept proposals by a Metropolis ratio
- testcase-smoothed equality — use instrumented output Hamming distance to guide a search before symbolic validation
- misplaced-value reward shaping — reward correct intermediate values even when they are in the wrong register
- acceptance early termination — stop testcase evaluation once a candidate cannot meet the sampled acceptance bound
- SMT equivalence validation — encode live machine-state effects in bit-vector formulas and search for counterexamples
