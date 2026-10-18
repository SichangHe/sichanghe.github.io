# WaveCert: Translation Validation for Asynchronous Dataflow Programs via Dynamic Fractional Permissions
(authored by agents unless marked 🧑)
Tag: `lin2023wavecert`, [paper](https://arxiv.org/abs/2312.09326)

## purpose and result

WaveCert validates a compiler that translates sequential LLVM programs into asynchronous dataflow graphs for RipTide coarse-grained reconfigurable arrays. It proves equivalence on a canonical schedule, then proves that every schedule converges to that result using dynamically inferred linear permissions. The abstract states the target: “We address this challenge by developing a translation validation technique for dataflow compilers to ensure that the dataflow program has the same behavior as the original imperative program on all possible inputs and schedules of execution.” (Abstract, PDF p. 1.) The method covers functional behavior, liveness, and deadlock freedom under its channel model.

## technique 1: canonical-schedule cut-simulation

What it is. WaveCert first compares the source imperative program and target dataflow program on a deterministic canonical schedule that fires target operators in the source instruction order. A simulation relation is represented by paired cut points: symbolic source and target configurations plus equations relating their variables and memory.

When to use it. Use this when the target has many asynchronous schedules but the compiler can provide a mapping from source instructions to target operators. The authors explain, “First, we use symbolic execution to prove that there is a simulation between the input imperative program and the output dataflow program on a canonical schedule.” (Section 1, PDF p. 2.)

How to do it.

1. Obtain the source program, compiled target graph, and compiler hint mapping source instructions to target operators (Section 3, PDF p. 4; Section 4, PDF p. 10).
2. Place source cut points at function entry, each loop-header back edge, and exit so symbolic execution can summarize unbounded loops (Section 4.4, PDF p. 13).
3. Place target initial and final cut points; dynamically infer loop cut points while mirroring source execution because dataflow lacks structured control flow (Section 4.4).
4. At each source cut point, symbolically execute every branch until it reaches another source cut point, recording path conditions (Section 4.3, PDF pp. 11–12).
5. Map each source trace to target operators with the canonical schedule and symbolically execute those operators under the corresponding path condition (Section 4.3).
6. Check cut-point subsumption: the resulting source and target configurations must instantiate a target cut point and satisfy its correspondence equations, including equal memory (Section 4.3).

In Figure 2’s loop, the source updates `B[i]=A[i]+1`; the target graph includes carry operators for loop variables and a dependency path to protect overlapping arrays (Section 3, PDF pp. 4–5). The paper’s formal relation is memory based: “The correspondence equality Memllvm = Memdf means that the memory state should be the same at each cut point.” (Figure 4 caption, PDF p. 6.)

Verus form. Inference: represent source/target states as ghost structs, define a correspondence predicate with `spec fn`, and prove each canonical transition preserves it with `requires`/`ensures`. Use a verified loop with `invariant` for source cut points and target channel summaries. This is a relational proof between two executions, not a direct translation of one Rust function; the compiler hint and target operational semantics must be trusted or separately verified.

Evidence and limits. If all cut-point branches pass, WaveCert obtains a simulation relation and equivalence on the canonical schedule (Sections 4.1–4.3). The approach is heuristic and not complete: “In general, program equivalence for Turing-complete models like LLVM and dataflow programs is undecidable, so our best hope is to have good heuristics to infer the cut points for the specific input/output programs of the compiler.” (Section 4.4, PDF p. 12.) The canonical schedule needs a one-to-one correspondence between LLVM instructions and dataflow operators, so deduplication and streamification are unsupported (Section 7, PDF pp. 21–22).

## technique 2: dynamic linear permission tokens for confluence

What it is. To generalize from the canonical schedule to all asynchronous schedules, WaveCert attaches permission tokens to channel values and symbolically solves for a consistent, linear flow. A write token can split into k read tokens; reads can merge back to write. Operators cannot duplicate or invent tokens. Satisfiable constraints imply race freedom and confluence.

How to do it.

1. Choose memory locations L and read-splitting bound k, defining the permission algebra with zero, disjoint sum, and partial order (Definition 8, Section 5.1, PDF pp. 14–15).
2. Attach a fresh permission variable to every value in every channel at each symbolic cut point (Section 5.2, PDF pp. 17–18).
3. Require channel permissions to be pairwise disjoint (Definition 11).
4. For every operator transition, enforce linearity: output permissions are contained in input permissions; a load requires `read l`; a store requires `write l` (Definition 12, PDF pp. 15–16).
5. Carry fresh variables through canonical symbolic execution, remove consumed input permissions, and equate permissions when a branch returns to a cut point (Algorithm 1, PDF p. 17).
6. Ask an SMT solver whether all accumulated constraints are satisfiable in the permission algebra (Algorithm 1, PDF p. 17; Section 5.2, PDF p. 18; Section 6, PDF p. 19).

The paper summarizes the key invariant: “These permission tokens are passed between operators via channels, and operators are not allowed to duplicate or create new tokens (i.e., permission tokens are used linearly).” (Section 3, PDF p. 7.) For the Figure 2 example, a satisfying assignment passes write permission around the loop of operators 2, 5, 7, 8, 9 (Section 3, PDF p. 8). Unsatisfiable constraints do not prove a race: the paper lists a possible data race (needing manual inspection), too small a k, or confluence not provable by this method (Section 5.2, PDF p. 18).

Verus form. The paper directly reports that its bounded-confluence theorem was machine-checked in Verus: “we have formalized a machine-checkable proof of Theorem 3 in Verus.” (Section 5.1, PDF p. 16.) Inference: model a token as a ghost linear resource and prove transition lemmas that consume input resources and produce only subresources; use Verus’s linear ghost types and `invariant` clauses for channel ownership. Do not encode permissions as runtime values unless the implementation needs them; the proof resource is ghost state.

Evidence and limits. The bounded theorem says a trace with a consistent augmentation converges with any trace bounded by its operator multiset (Theorem 3, Section 5.1). Full confluence is obtained by applying this to all cut-point branches (Section 5.2). If constraints are unsatisfiable, the graph may race, (k) may be too small, or the property may be unprovable by this method (Section 5.2). Current permissions cover whole memory regions such as an array; index-dependent slices are future work (Section 7, PDF p. 22).

## technique 3: lift unbounded-channel proofs to bounded channels and liveness

What it is. Real CGRAs have finite channel buffers, so an unbounded-channel proof alone could miss deadlock caused by a full output and an empty alternate path. WaveCert bounds the canonical execution’s intermediate channel size by some integer K, then reuses simulation and confluence results for any real buffer of size at least K.

How to do it.

1. During canonical cut-point execution, compute the finite set of intermediate symbolic configurations and take their maximum channel occupancy K (Section 5.3, PDF p. 19).
2. Verify cut-simulation and confluence in the unbounded-channel model (Sections 4–5).
3. Verify that the confluence argument remains valid in the bounded-channel model; the authors formalized this lifting in Verus (Section 5.3).
4. Require hardware channel capacity at least K; conclude equivalence and therefore progress/deadlock freedom when the sequential program progresses (Section 5.3).

The paper states, “As a result, in the bounded-channel model, the dataflow program is still equivalent to the input imperative program, which guarantees the liveness property of the dataflow program that it will always make progress if the sequential imperative program is able to make progress.” (Section 5.3, PDF p. 19.)

Verus form. Inference: express a channel-capacity invariant over queue lengths and prove each operator firing preserves `len(queue) <= K`; combine it with the relational state invariant and a progress lemma. The capacity threshold is an assumption about hardware configuration, not something the source-level proof establishes.

Evidence and limits. Inference: the guarantee depends on finite canonical branches, a correct K, and a sequential source that is itself deadlock free (the paper argues “the sequential program is deadlock-free”). The paper does not verify later passes such as configuring the dataflow program on the actual hardware (Section 7, PDF p. 22).

## technique 4: compiler-bug discovery through failed proof obligations

What it is. WaveCert’s failed simulation or confluence checks are diagnostic artifacts. In 21 benchmark programs, the simulation check failed on three (sort, SpSlice, sha256) because of compiler bugs (Figure 5, PDF p. 20); the text says these failures reveal “two compilation bugs” and that after fixing them the checks succeed “for these two programs” (Section 6, PDF pp. 19–20), although three programs are named. Across testing, 8 RipTide bugs were found and confirmed by the RipTide authors; four came from sort, SpSplice, sha256 and variations, and four from test cases outside the evaluation (Abstract, PDF p. 1; Section 6.1, PDF pp. 20–21).

How to use it.

1. Compile each source program and run simulation and confluence checks (Section 6).
2. If simulation fails, inspect unequal final memory or violated correspondence equations; this exposed a signed-extension bug where a 1-bit constant became 32-bit −1 (Section 6.1, PDF p. 21).
3. If confluence fails, inspect the unsatisfiable permission core; a nested-loop load/store race produced 57 conflicting constraints out of 420 (Section 6.1, PDF p. 21).
4. Repair the compiler and rerun both checks; the paper reports that the checks then succeed (Section 6, PDF p. 20).

Verus form. Inference: treat a failed proof as a counterexample requiring source or compiler repair, and retain the proof obligations as regression tests. Verus can prove the checker’s lemmas, but a verified checker does not make an unchecked compiler output correct without running the checker.

Evidence and limits. The benchmark has 21 programs, and Figure 5 reports lines of source, operator counts, permission constraints, and separate simulation/confluence times. Most total checks finish within 15 seconds; the maximum confluence time shown is 26.68 seconds for SpMSpMd, while the contributions list says “Most verification result takes around 10 seconds with a maximum of about 30 seconds.” (Section 1, PDF p. 2.) The table’s times are per test case, not an average over all 21.

## what is proved, measured, and trusted

When both checks pass, the proved claim is equivalence of source and target on all inputs and schedules represented by the semantics, plus liveness under the bounded-channel argument. Measured evidence is 8 confirmed compiler bugs, 21 benchmark programs, and the timing/constraint counts in Figure 5. The paper states the trusted computing base of WaveCert is 3,121 lines of Python with three main components: about 800 lines of dataflow semantics, about 1,000 lines of LLVM semantics, and about 750 lines for the simulation and confluence checks. The RipTide compiler (about 21,000 lines of C++, with under 50 lines of added hint generation) is the thing being validated, not part of that count (Section 6, PDF p. 20). Inference: Z3 and the compiler hints also matter, but the paper does not list Z3 in the count, and says the cut-point heuristics need not be sound (Section 4.4, PDF p. 13). The authors note that later hardware configuration is not verified (Section 7, PDF p. 22). Inference: agent-written verified Rust faces analogous risk if an optimizer, code generator, or hardware interface lies outside the checked semantics.

## techniques for the catalog

- canonical cut-simulation — symbolically execute source and target at paired cut points under a deterministic schedule
- dynamic linear permissions — attach nonduplicable read/write tokens to channel values and solve constraints for race freedom
- confluence lifting — use cut-point coverage and permission consistency to generalize canonical equivalence to all schedules
- bounded-channel liveness — derive a capacity bound from symbolic execution and prove progress for channels at least that large
- proof-failure diagnostics — use unequal states and unsatisfiable permission cores to locate compiler bugs
