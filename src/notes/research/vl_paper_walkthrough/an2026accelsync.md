# AccelSync: Verifying Synchronization Coverage in Accelerator Pipeline Programs
(authored by agents unless marked 🧑)
Tag: `an2026accelsync`, [paper](https://arxiv.org/abs/2605.07881)

## property and scope
AccelSync checks whether accelerator pipeline synchronization orders each relevant write before a read of the same buffer across units or stages. The paper formalizes three edge kinds—program order (po), synchronization order (so), and barrier order (bo)—and defines happens-before as their transitive closure. The paper claims O(|E|²) checking time and soundness and completeness under its model (abstract, p. 1; Theorems 3.2–3.4, pp. 9–10). The guarantee is scoped: FIFO queues, fixed stages, documented visibility primitives, no hidden coherence, and resolved buffer identities (section 3.1, p. 5).

## technique 1: normalize kernels into typed events
Use this when checking generated or production accelerator code without executing it. Parse each frontend into events `Write(b)`, `Read(b)`, `EnQue(q)`, `DeQue(q)`, and `Barrier(p)` with stage, timestamp, and execution-unit metadata (sections 3.2–3.3.1, pp. 6–7). The paper uses fixed stages, sequential unit execution, and absence of dynamic concurrency to justify a finite event set (section 3.5, p. 10). Ascend C maps `ReduceMax` to VPU, `GetValue` to Scalar, and `DataCopy` to MTE; the BANG C frontend extracts asynchronous DMA, vector compute, and barrier events and models DMA, VPU, and IPU units (section 4.1, p. 12).

Steps: parse source or IR; resolve buffer aliases conservatively; identify queue pairs by FIFO index; lower template pipe barriers and SetFlag/WaitFlag to abstract barrier events; select a hardware model specifying stages, queues, synchronization identifiers, and coverage rules (sections 4.1–4.4, pp. 12–13). Inference: for a VL compiler, emit this event IR alongside Rust/Verus code so the same generated program can be checked for accelerator visibility before deployment.

Inference: represent each event as a Rust datatype and prove that each event buffer identity matches its resolved source allocation. Verus could verify deterministic parsing helpers; vendor API semantics and conservative treatment of unresolved aliasing would need separate justification.

## technique 2: construct the happens-before graph
For each unit within each stage, add po edges between consecutive events. Add stage-wide edges from DeQue to later events and from earlier events to EnQue. Match kth EnQue with kth DeQue on each FIFO queue and add so edges. For every hardware coverage rule `(primitive, stage, writer, reader)`, add bo edges from prior writes by the writer unit to subsequent reads by the reader unit on the same buffer, with a matching barrier between their timestamps (section 3.3.4, p. 7; Algorithm 1, p. 9). Compute transitive closure by BFS from every event; the paper claims O(|E|²) total time (section 3.5, pp. 9–10).

The softmax example is a complete application. `ReduceMax` writes `maxVal` on VPU and `GetValue` reads it on Scalar; because units differ, po adds no edge, and without a V-to-S barrier the graph has no path. AccelSync reports “VPU write to maxVal not visible to Scalar read; missing V-to-S synchronization coverage.” (section 3.7, p. 11). Inserting a barrier between timestamps creates the bo edge and discharges the pair.

Inference: encode the graph as ghost adjacency sets and prove a closure lemma. A `spec fn` can define `hb`; proof functions can show that a recognized barrier adds the expected edge and that reachability is transitive. The Verus proof establishes graph logic, not that a vendor primitive really has the modeled hardware effect.

## technique 3: barrier-sufficiency decision and diagnostics
Check every same-buffer Write-Read pair that crosses stages, plus pairs within one stage that cross units and have the write timestamp before the read timestamp. The program is barrier-sufficient iff `w →hb r` for all such pairs (Definition 3.1, p. 9). Return uncovered pairs; an empty set means safe under the model. The paper claims soundness and completeness relative to the event semantics: a missing path admits a feasible stale-read interleaving, while every ordered pair is visible in all modeled executions (Theorems 3.3 and 3.4, p. 10).

Inference: use each uncovered pair as a concrete proof obligation in VL. A generated Rust proof should be rejected until either a verified synchronization wrapper establishes the corresponding ordering or the compiler proves that no cross-unit pair exists. The paper's model does not cover dynamic synchronization identifiers, data-dependent topologies, undocumented ordering, or post-extraction aliasing (section 3.1, p. 5); the implementation treats out-of-scope cases conservatively.

## technique 4: parameterized hardware portability
Keep the checker fixed and replace only stages, queue links, and coverage rules. Ascend 910B2 uses directional VPU→scalar, cube→VPU, and MTE→VPU rules; MLU370 uses full `__sync()` and directional DMA barriers (Table 2, p. 8). Frontends normalize vendor syntax to the common event vocabulary. Porting the checker requires parameter substitution; supporting a new toolchain also requires frontend engineering (section 4.3, pp. 12–13; section 7, p. 25).

Evidence: the MLU370 frontend processed 162 BANG C files in 393 ms, reporting 160 SAFE and 2 UNSAFE (Table 12, p. 18). The MLU370 result includes 74 PyTorch ports, 83 mlu-ops files, and 5 GitHub examples; the two true UNSAFE reports came from the last group. False positives in the initial mlu-ops run came from unmodeled composite barriers, ping-pong aliasing, and loop-boundary synchronization (section 5.6, pp. 18–19).

## evidence and limits
The public CANN audit checked 6,292 kernels: 6,289 SAFE and 3 high-confidence risks, or 0.048% (Table 6, p. 15). Of these kernels, 5,618 (89.3%) had at least one cross-unit write-read pair and 14,827 pairs were checked (Table 8, p. 16), showing that most kernels exercised the cross-unit check. The largest kernel had 274 events and took 20.7 ms; the full corpus completed in under 48 seconds (section 5.6, p. 20). A controlled mutation suite produced 1,084 mutants, 688 non-equivalent; all 688 were detected (100%, Table 9, p. 17). On five framework-launched microbenchmarks, AccelSync detected 5/5 hazards while msSanitizer detected 2/5, with 7.1 ms median versus 2.8–4.1 s per kernel (section 5.5, pp. 17–18; Table 11, p. 18), approximately 400× lower cost.

The LLM-generated corpus contained 120 kernels with a 19.2% defect rate (95% CI [13.0%, 27.4%], abstract and section 5.7); 23 of the 120 generated kernels were flagged (section 5.7, p. 21). Hardware reproduction of one VPU→scalar class saw nondeterministic outputs in 20/29 valid runs under CANN 8.0.RC3, but hardware confirmation remains pending: after upgrade to driver 25.0.rc1.1, both synchronized and unsynchronized variants returned uninitialized memory patterns, preventing further reproduction (sections 5.3 and 5.6, pp. 16, 19–20; Table 14, p. 20). The authors' limitation is exact: “Completeness is scoped to the hardware event semantics defined in this section.” (section 3.6, p. 10).

Inference: this paper presents a high-value static precheck for agent-written accelerator Rust or Ascend kernels, but its hardware model and frontend alias analysis would need separate justification in a Verus integration. VL should adopt the event-graph obligation and require model provenance; it should not claim physical-device safety from a passing abstract check alone.

## techniques for the catalog
- typed event extraction: lower accelerator source into writes, reads, queues, and abstract barriers with unit and buffer identity
- happens-before graph: combine program, FIFO synchronization, and hardware barrier edges, then compute reachability
- barrier sufficiency: report relevant cross-stage or cross-unit same-buffer write-read pairs lacking a happens-before path
- parameterized hardware model: port the checker by changing stages, queues, and coverage rules; add a frontend for new syntax
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "If normalization cannot reliably recover the required event structure, the kernel is excluded rather than silently accepted."): checked all study quotations, numbers, section and page references, technique steps, and scope claims; corrected the paper link, pair-selection rule, references, portability requirements, hardware-reproduction caveat, and inference wording; did not reproduce experiments, inspect the artifact, or formally validate the proofs or proposed Verus integration.
