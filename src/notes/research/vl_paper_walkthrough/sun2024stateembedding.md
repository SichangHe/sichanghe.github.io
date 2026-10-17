# Validating the eBPF Verifier via State Embedding
(authored by agents unless marked 🧑)
Tag: `sun2024stateembedding`, [paper](https://www.usenix.org/conference/osdi24/presentation/sun-hao)

## problem and oracle
The Linux eBPF verifier tracks an abstract state at each program point and must over-approximate every concrete runtime state. A logic bug occurs when a reachable concrete state is absent from that approximation: the verifier may accept an unsafe program. Existing formal specifications can be incomplete or diverge from changing code, while ordinary testing lacks an oracle. The paper’s central observation is: “In other words, any concrete state not contained in the approximation can invalidate the conclusion.” (§1, p. 616).

State embedding turns this containment requirement into a self-checking test. Start with an accepted program `P`, profile a concrete state `S` at a basic block, and construct `P'` containing `if S ∈ A then verifier_sink()`, where `A` is the verifier’s approximation. A correct verifier should detect the sink because it must include `S`; accepting `P'` means the verifier failed to include the observed state (§1, p. 616; §3.1, pp. 619–620). The sink is an intentionally invalid operation, such as writing to read-only register R10 in eBPF. The paper states: “Failure to detect the sink indicates a logic bug in the verifier.” (Corollary 3.1, p. 620). It also proves: “State embedding does not introduce any invalid operations except for the sink.” (Proposition 3.1, p. 620).

## technique 1: direct state embedding

how to apply it
1. Generate or select a deterministic, closed eBPF program `P`, without inputs or external interactions, and run the verifier. Keep only programs it accepts (§3.1, p. 619; Algorithm 1, p. 621).
2. Execute `P` with a tracer and record concrete register states at each basic block (§3.2, p. 621).
3. For each recorded state `S`, choose program operations implementing a containment test, commonly an equality branch `if (S == A)` (§3.1, p. 620).
4. Put the verifier sink on the branch-taken path. In eBPF, `r10 = 0` is an illegal write that causes a verifier error (Listing 2, p. 621).
5. Submit `P'` to the same verifier. A rejected `P'` with the sink reported confirms that the approximation contains `S`; an accepted `P'` indicates a logic bug (Corollary 3.1, p. 620).
6. Preserve the original program and runtime states for triage. Locate an instruction whose concrete runtime state is absent from the verifier’s approximation, then inspect preceding operations and the corresponding verifier code (§4.1, p. 622).

The authors prove that embedding introduces no invalid operation except the sink: the verifier’s abstract state splits on the branch, and the fall-through state remains safe (Proposition 3.1, p. 620).

Verus form (inference)
Inference: a Verus model could express the containment requirement as `contains(concrete, abstract)` and check it against recorded execution states. Such a proof would concern the supplied model; connecting it to the Linux verifier would require a separate justification. The paper does not implement or evaluate a Verus adaptation.

## technique 2: folded embedding with one sink

what it is and when to use it
Directly embedding each state can cause early termination at the first sink and redundant path exploration. The folded variant accumulates profiled register states into one global value and embeds one sink once (§3.1, p. 620).

how to apply it
1. Initialize the concrete folded value, reserve R9 to hold the corresponding value in the generated program, and create a map from basic blocks to folding functions (§3.2, Algorithm 2, p. 621).
2. Traverse the profiled basic-block trace. Generate a folding function when a block has no entry in the map, synthesizing ALU instructions for its collected registers (§3.2, p. 621).
3. Randomly select operations accurately tracked by the verifier and apply them to non-zero registers; exclude division and all unary operations (§3.2, p. 621).
4. Evaluate each block’s folding function with the concrete register values and preceding folded value. Loops may revisit a block but reuse its function (§3.2, p. 621).
5. Insert folding functions at their basic blocks, then embed the final folded state into a single containment test and sink (§3.2, p. 621).

The authors claim equivalent bug-detection capability over continuous testing because incorrect approximations are likely to propagate into the folded variable; the containment check makes the verifier fork once (§3.1, p. 620). They qualify this in §4.5: “In addition, the inserted arithmetic instructions may hinder some non-contained states, albeit with a low likelihood.” (p. 625). The paper’s example uses `if r9 != FoldedState goto+1; r10 = 0` (Listing 2, p. 621).

Verus form (inference)
Inference: a Verus `spec fn` could model the fold over a trace, with proofs that executable ALU updates match that model. Containment of the final folded value alone would not prove containment of every original state, because folding can hide mismatches.

## technique 3: continuous SEV workflow and generator

how to apply it
1. Generate instruction-valid, control-flow-valid eBPF programs as structured graphs, combining if/else blocks and back-edges while maintaining lightweight register and stack state (§3.2, p. 621).
2. Run the program generator and call `Verify(P)`; skip rejected programs (Algorithm 1, p. 621).
3. Profile accepted programs with a kernel tracer that records instruction index and register state in a shared buffer exposed through a virtual device and `mmap` (§3.2, p. 621).
4. Transform each accepted program with folded embedding and call `Verify(P')`.
5. Record `P'` as a bug when the verifier accepts it; repeat until termination, restarting the whole campaign if the VM is no longer alive (Algorithm 1, p. 621; §4.1, p. 622).
6. Deduplicate reports by root cause and retain the original program, runtime states, and transformed program (§4.1, p. 622).

The generator categorizes registers as uninitialized, scalar, or pointer and emits operations appropriate to each category, such as pointer offsets (§3.2, p. 621). Deterministic closed programs need only one profiling round, making states consistent across executions (§3.2, p. 621).

Verus form (inference)
Inference: a Rust/Verus harness could model the generator’s instruction structures and check well-formedness properties. A reference interpreter could supply traces, but their agreement with actual eBPF execution would need justification.

## technique 4: completeness and soundness diagnosis

State embedding primarily detects soundness bugs: unsafe programs accepted because a concrete state was missing from an approximation. It also detects completeness bugs. The authors treat rejection for an error other than the intentional sink as evidence of a completeness bug, since embedding should introduce no other invalid operation. Replacing the sink with valid operations specializes the method to completeness testing (§4.2, p. 623).

The one-month upstream campaign found 15 unique verifier logic bugs, 10 fixed by submission; 12 were soundness bugs and three completeness bugs (pp. 622–623). Table 1 attributes six to range analysis, three to memory-access validation, two to state pruning, two to control-flow checking, and two to other causes (p. 623). Two bugs enabled local privilege escalation, one through incorrect stack-depth tracking and one through sign information loss in a spill; the paper reports both affected kernels v5.10.33 and later (§1, p. 616; §2.2, p. 619; §4.3, p. 624).

## techniques for the catalog

- containment sink: embed a concrete state and an invalid sink so verifier acceptance exposes an abstraction bug
- folded state embedding: combine many profiled states with tracked ALU folds and check one final sink
- continuous SEV loop: generate, profile, transform, verify, and triage accepted programs until termination
- completeness specialization: replace the sink or inspect non-sink rejection to find false rejections
