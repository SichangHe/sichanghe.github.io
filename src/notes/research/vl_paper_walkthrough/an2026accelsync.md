# AccelSync: Verifying Synchronization Coverage in Accelerator Pipeline Programs
(authored by agents unless marked 🧑)
Tag: `an2026accelsync`, [paper](https://doi.org/10.1145/3704865)

## property and scope
AccelSync checks whether accelerator pipeline synchronization orders every cross-unit write before a later read of the same buffer. The paper formalizes three edge kinds—program order (po), synchronization order (so), and barrier order (bo)—and defines happens-before as their transitive closure. Its abstract states, “We prove that synchronization coverage is decidable in O (|E| 2 ) time and that our checker is both sound and complete under the modeled semantics.” (abstract, p. 1). The guarantee is scoped: FIFO queues, fixed stages, documented visibility primitives, no hidden coherence, and resolved buffer identities (section 3.1, p. 5).

## technique 1: normalize kernels into typed events
Use this when checking generated or production accelerator code without executing it. Parse each frontend into events `Write(b)`, `Read(b)`, `EnQue(q)`, `DeQue(q)`, and `Barrier(p)` with stage, timestamp, and execution-unit metadata (section 3.2, pp. 6–7). Fixed-stage and queue restrictions make the event set finite. Ascend C maps `ReduceMax` to VPU, `GetValue` to Scalar, and `DataCopy` to MTE; BANG C maps asynchronous DMA, vector, matrix, and barrier intrinsics similarly (section 4.1, pp. 12–13).

Steps: parse source or IR; resolve buffer aliases conservatively; identify queue pairs by FIFO index; lower template pipe barriers and SetFlag/WaitFlag to abstract barrier events; select a hardware parameter file. Inference: for a VL compiler, emit this event IR alongside Rust/Verus code so the same generated program can be checked for accelerator visibility before deployment.

Verus form (Inference): represent each event as a Rust datatype and prove extraction invariants such as the invariant that an event buffer identity equals its resolved source allocation Verus can verify deterministic parsing helpers, but vendor API semantics and unresolved aliasing remain assumptions.

## technique 2: construct the happens-before graph
For each unit, add po edges between consecutive events. Add stage-wide edges from DeQue to later events and from earlier events to EnQue. Match kth EnQue with kth DeQue on each FIFO queue and add so edges. For every hardware coverage rule `(primitive, stage, writer, reader)`, add bo edges from prior writes by the writer unit to later reads by the reader after a matching barrier (Algorithm 1, pp. 9–10). Compute transitive closure by BFS from every event in O(|E|²).

The softmax example is a complete application. `ReduceMax` writes `maxVal` on VPU and `GetValue` reads it on Scalar; because units differ, po adds no edge, and without a V-to-S barrier the graph has no path. AccelSync reports “VPU write to maxVal not visible to Scalar read; missing V-to-S synchronization coverage.” (section 3.7, p. 11). Inserting a barrier between timestamps creates the bo edge and discharges the pair.

Verus form (Inference): encode the graph as ghost adjacency sets and prove a closure lemma. A `spec fn` can define `hb`; proof functions can show that a recognized barrier adds the expected edge and that reachability is transitive. The Verus proof establishes graph logic, not that a vendor primitive really has the modeled hardware effect.

## technique 3: barrier-sufficiency decision and diagnostics
Check every same-buffer Write-Read pair that crosses stages or units and has write timestamp before read. The program is barrier-sufficient iff `w →hb r` for all such pairs (Definition 3.1, p. 9). Return uncovered pairs; an empty set means safe under the model. This is both sound and complete relative to the event semantics: a missing path admits a feasible stale-read interleaving, while every ordered pair is visible in all modeled executions (Theorems 3.3 and 3.4, pp. 10–11).

Inference: use each uncovered pair as a concrete proof obligation in VL. A generated Rust proof should be rejected until either a verified synchronization wrapper establishes the corresponding ordering or the compiler proves that no cross-unit pair exists. The paper's model does not cover dynamic synchronization identifiers, data-dependent topologies, undocumented ordering, or post-extraction aliasing (section 3.1, p. 5); those cases must be conservative or rejected.

## technique 4: parameterized hardware portability
Keep the checker fixed and replace only stages, queue links, and coverage rules. Ascend 910B2 uses directional VPU→scalar, cube→VPU, and MTE→VPU rules; MLU370 uses full `__sync()` and directional DMA barriers (Table 2, p. 8). Frontends normalize vendor syntax to the common event vocabulary, so a new backend is a parameter substitution (section 4.3, p. 13).

Evidence: the MLU370 frontend processed 162 BANG C files in 393 ms, reporting 160 SAFE and 2 UNSAFE (Table 12, p. 18). The MLU370 result includes 74 PyTorch ports, 83 mlu-ops files, and 5 GitHub examples; the two true UNSAFE reports came from the last group. False positives in the initial mlu-ops run came from unmodeled composite barriers, ping-pong aliasing, and loop-boundary synchronization (section 5.6, pp. 18–19).

## evidence and limits
The public CANN audit checked 6,292 kernels: 6,289 SAFE and 3 high-confidence risks, or 0.048% (Table 6, p. 15). Of these kernels, 5,618 (89.3%) had at least one cross-unit write-read pair and 14,827 pairs were checked (Table 8, p. 16), so the low risk rate is not a no-op result. The largest kernel had 274 events and took 21 ms; the full corpus completed in under 48 seconds (p. 3). A controlled mutation suite produced 1,084 mutants, 688 non-equivalent; all 688 were detected (100%, Table 9, p. 17). On five framework-launched microbenchmarks, AccelSync detected 5/5 hazards while msSanitizer detected 2/5, with 7.1 ms median versus 2.8–4.1 s per kernel (Table 11, p. 18), approximately 400× lower cost.

The LLM-generated corpus contained 120 kernels with a 19.2% defect rate (95% CI [13.0%, 27.4%], abstract and section 5.7); the denominator is those 120 generated kernels. Hardware reproduction of one VPU→scalar class saw nondeterministic outputs in 20/29 valid runs under CANN 8.0.RC3, but the effect disappeared after a driver upgrade and is explicitly unconfirmed (section 5.3, p. 16). The authors' limitation is exact: “Completeness is scoped to the hardware event semantics defined in this section.” (section 3.6, p. 11).

Inference: this paper presents a high-value static precheck for agent-written accelerator Rust or Ascend kernels, but its trusted hardware model and frontend alias analysis are outside Verus. VL should adopt the event-graph obligation and require model provenance; it should not claim physical-device safety from a passing abstract check alone. Sequential verifiers and golden tests already exist and miss these visibility hazards, so redoing them would not add coverage.

## techniques for the catalog
- typed event extraction: lower accelerator source into writes, reads, queues, and abstract barriers with unit and buffer identity
- happens-before graph: combine program, FIFO synchronization, and hardware barrier edges, then compute reachability
- barrier sufficiency: reject every cross-unit same-buffer write-read pair lacking a happens-before path
- parameterized hardware model: port the checker by changing stages, queues, and directional coverage rules
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
