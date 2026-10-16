# RESOLVE: Language-Agnostic Validation of GPU Kernels Through Testing, Reduction, and Proof
(authored by agents unless marked 🧑)
Tag: `vedadi2026resolve`, [paper](https://doi.org/10.48550/arxiv.2610.05683)

## what is validated
RESOLVE separates concurrency validation from functional equivalence. Its three passes are binary counting, conflict tracing, and schedule perturbation; then an agent reduces both kernels to low-concurrency programs and F*/Pulse (through Kuiper) proves that both satisfy a common real-number specification. The paper states: “This sidesteps the need for numeric tolerances.” (abstract, p. 1). The candidate and reference must be deterministic and are compared bitwise on fixed-shape test inputs.

The RESOLVE Kernel Bench pairs 100 KernelBench Level 1 kernels with GPT-generated optimized candidates; all candidates had compiled and passed the benchmark's tolerance tests before RESOLVE (sec. 2.1, p. 3). Table 1 reports 31 candidates: 15 were deterministic and bitwise identical after the first phase, 2 were empty/no-memory-access kernels, 11 were reduced and formally verified, 2 were inconclusive for missing Kuiper features, and 1 was inconclusive for numerical approximation (sec. 6.2, pp. 8–9). The full workflow was run on 14 of the 85 remaining candidates; 11/14 completed, so the denominator is the selected 14, not all 100.

For synchronization mutants, 400 attempted mutations became 198 applicable, 143 runnable, and 92 flagged by the determinism tester. Thus the reported catch rate is 92/143, not 92/400; 51 misses included 3 faults in dead code, 28 races that did not change the final value, and 20 intra-warp races unreachable by NVBit perturbation (sec. 6.2, p. 9). Three fused MLP variants (CUTLASS, Gluon, Triton) were tested against eager PyTorch; Gluon and Triton were bitwise identical, and Gluon was carried through reduction/proof. Three mega-kernels exposed four root causes, and the agents repaired them, but the repair criterion was only “ran under the determinism tester without any nondeterminism showing up,” which the paper calls weaker than its full workflow (sec. 6.4, p. 11).

## technique 1: binary determinism and conflict-directed perturbation

when to use it
Use this when source-level GPU semantics are unavailable or too costly, and the required property is deterministic output for each fixed input. The tester treats the kernel as a black box and hashes all memory after each run; hashes save space, while comparisons remain equality tests (sec. 2.1, p. 3).

how to do it
1. Run the binary with NVBit and count memory-reference events per CTA, recording grid shape and TMA descriptors. This sizes the later trace buffer (sec. 3.1, p. 4).
2. Trace memory accesses, addresses, issuing threads, and asynchronous-transfer ranges. Identify overlapping byte ranges where at least one access is a write, categorized by global/shared memory and warp/CTA/cross-CTA scope.
3. Drop kernels with no potential conflict; sample whole CTAs if the trace cap would overflow. Two CTAs are the minimum needed to expose a cross-CTA conflict on the benchmark (sec. 3.1, p. 4).
4. Insert probabilistic stalls before selected conflicting memory instructions. Derive inter-block delay from CTA index and intra-block delay from warp identifier. Compare perturbed runs with an unperturbed run byte-for-byte on the same input and stop at the first mismatch (sec. 3.1, p. 5).
5. Repeat over ten seeded input-distribution families covering sparse, sentinel, awkward magnitudes, cancellation, quantization boundaries, ties, indices, masks, and lengths; run each kernel a fixed number of times (sec. 2.1, p. 3).

The paper cautions: “A clean campaign is not a proof of race freedom, but surviving it is strong, language-agnostic, black-box evidence that the kernel computes a deterministic function.” (sec. 3.1, p. 5). NVBit cannot perturb asynchronous loads, intra-warp races behind BSSY/BSYNC, or cross-CTA conflicts when CTAs are never resident together (sec. 3.1, p. 5).

Verus form
Inference: In a Rust/Verus product, this is a testing pre-pass for concurrent or unsafe host code, not a Verus proof. Instrument executions, vary schedules where the runtime permits, hash complete observable state, and treat mismatches as counterexamples. Verus can then prove a deterministic sequential specification only for the modeled subset; the binary perturbation evidence does not establish race freedom.

## technique 2: concurrency reduction preserving bitwise behavior

when to use it
Apply reduction after a candidate passed determinism testing and differs from its reference. The goal is to make concurrency simple enough for a verifier while preserving the candidate's tested behavior. The agent is instructed to reject barriers, atomics, cooperative launches, warp primitives, inline PTX, and synchronization hidden in macros/templates; split fused kernels into multiple launches; and turn repeated statements into loops/functions (sec. 4, pp. 5–6).

how to do it
1. Minimize concurrency, usually to one thread, but retain the minimum required by tensor-core (one warp) or Hopper warpgroup (four) instructions.
2. Run the reduced candidate and original on every test input and require exact bitwise equality—“no tolerance, no epsilon and no normalization” (sec. 4, p. 6).
3. Repeat for the reference kernel. Stop if candidate and reference reductions are already bitwise identical; otherwise pass both reduced programs to proof.

Verus form
Inference: For Rust, reduction can mean replacing parallel code with a sequential reference implementation and proving/refuting an equivalence relation over a fixed input model. Verus does not model GPU warp intrinsics or F*/Pulse's floating-point approximation relation; preserve only constructs supported by the local Verus verifier and mark any source-to-reduced equivalence as a separately tested assumption.

## technique 3: common algebraic specification and proof

how to do it
1. Extract/build Kuiper programs bit-equivalent by testing to each reduced kernel.
2. Write a tight real-number specification S that states the output as a function of inputs; a weak memory-safety-only specification is insufficient (sec. 5, p. 7).
3. Use F*/Pulse to prove each Kuiper program satisfies S. The shared specification establishes functional equivalence even when floating-point bits differ because both programs approximate the same real computation.
4. Reject cases that cannot be represented by Kuiper's approximation relation, such as Taylor degree-10 versus degree-11 exponentials or discontinuous `argmax`; the paper says numerical tolerance reasoning is future work (sec. 5, pp. 7–8; sec. 6.4, p. 12).

Verus form
Inference: The transferable pattern is two verified implementations linked to one precise specification. In Verus, write `requires`/`ensures` around a mathematical real or integer model only where the model is supported, and use proof functions/lemmas to connect each implementation to it. Do not claim floating-point equivalence from an unproved approximation relation; Verus syntax and floating-point support must be checked against the local Verus reference.

## evidence, trust, and threat to VL
On the 14 RKB kernels carried through full workflow, determinism median was 1.47 minutes, reduction 29.31 minutes, and specification/proof 112.18 minutes; median total was 142.96 minutes and 5.72M input tokens plus 73.4K output tokens (Table 2, p. 9). The cost and specification remain agent-heavy, while determinism testing uses no agent. Four reported mega-kernel issues were found, including two clear bugs; repairs changed warmed latency by −1.4%, −1.6%, +0.8%, and +10.5% (Table 4, p. 12). These percentages are per repaired kernel, not a benchmark average.

The trusted boundary includes NVBit/runtime behavior, test-input coverage, hash/equality checks, reduction correctness links, Kuiper/F*/Pulse semantics, and human review of specification tightness. The paper says each inspected RKB specification was tight, but that inspection is not automated. Inference: this threatens VL's verification product mainly as a workflow idea: agents can optimize aggressively, then use testing to discover concurrency failures and a verifier to certify a simpler semantic target. It does not replace Verus proofs of Rust code, and its binary-level blind spots and GPU-specific semantics make direct reuse limited. VL should not redo tolerance-only testing or assume a clean race campaign is a proof; it should consider test–reduce–prove pipelines for agent-written concurrent code.

## techniques for the catalog
- conflict-directed determinism testing — count and trace binary memory events, perturb only potential conflicts, and compare complete state bitwise across seeded inputs
- concurrency reduction — rewrite a kernel to the least concurrency needed, rejecting synchronization-heavy constructs while preserving bitwise outputs on tests
- shared-specification equivalence — prove reduced implementations satisfy one tight algebraic specification, avoiding arbitrary numeric tolerances
- agent repair with revalidation — use determinism reports to localize causes, patch code, and rerun the same tester, while labeling this weaker than formal proof

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
