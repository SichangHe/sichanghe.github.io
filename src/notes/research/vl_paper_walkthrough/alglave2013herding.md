# Herding Cats - Modelling, simulation, testing, and data-mining for weak memory
(authored by agents unless marked 🧑)
Tag: `alglave2013herding`, [paper](http://arxiv.org/abs/1308.6810v5)

## takeaway

Inference: this paper's central technique is a compact axiomatic model of weak memory. A program is turned into candidate executions containing events and relations; four relational checks decide which executions are allowed. The same model text drives architecture instances, hardware litmus testing, the `herd` simulator, CBMC bounded verification, and the `mole` static miner. This separation is useful for VL because a Rust/Verus concurrency proof needs an explicit memory model and a way to test whether the model matches hardware.

"We propose an axiomatic generic framework for modelling weak memory." (abstract, p. 1)

Inference: the paper is not a Verus proof and does not establish correctness of Rust atomics. Its evidence combines formal equivalence lemmas, hardware observations, simulation timings, bounded-C verification, and static analysis; each has a different denominator and trust boundary.

## technique 1: construct candidate executions in three stages

What it is. The method first gives each instruction an event-level semantics, then enumerates candidate executions by choosing communication relations, and finally filters candidates with axioms.

"Axiomatic models are usually defined in three stages." (§3, p. 7)

How to do it.
1. Translate every instruction into events: memory/register reads and writes, branches, and fences. Include initial writes for each location (§3, pp. 7–8).
2. Build a control-flow event graph for each thread. Record program order `po` and address, data, or control dependencies (§3, p. 8).
3. Choose a `read-from` relation `rf` linking every read to the write supplying its value, and a coherence order `co` totally ordering writes to each location (§3, pp. 9–10).
4. Treat `(E, po, rf, co)` as a candidate execution. Derive `fr` (from-read) from `rf` and `co`, and `com = co ∪ rf ∪ fr` (§4.1, pp. 10–11).
5. Apply the model's relation checks to reject forbidden candidates. A candidate with a cycle in a checked relation is invalid (§3, p. 10).

The paper's message-passing example shows two stores in one thread and two loads in another; different choices of `rf` produce four candidate data-flow graphs (§3, pp. 7–10). The model then rejects the execution in which the flag is observed but the preceding message is not, under sequential consistency.

Verus form. Inference: represent an execution as ghost sets/sequences of events and ghost relations (`Set<(Event,Event)>` or finite maps). Define `rf`, `co`, `fr`, and `po` as `spec fn`s, then prove relation properties with Verus lemmas. A Rust atomic operation's executable behavior should be linked to the abstract event by a contract. Verus can prove a finite execution's acyclicity, but it does not automatically enumerate all `rf`/`co` choices or model a processor's reorder buffer.

Evidence and limits. The candidate-execution construction is a mathematical definition, not a measured claim. It assumes the instruction semantics has captured every relevant dependency and that `rf`/`co` satisfy well-formedness conditions. Hardware, compiler lowering, and unmodeled events remain outside the abstract candidate.

## technique 2: use four generic axioms as model-building bricks

What it is. The framework rejects executions with cycles violating four checks: SC PER LOCATION, NO THIN AIR, OBSERVATION, and PROPAGATION (§4, pp. 10–26). The relations are architecture-independent; an architecture supplies preserved program order, fences, and propagation.

How to apply it.
1. Define `po-loc`, the part of program order connecting events to the same location, and use `com = co ∪ rf ∪ fr` (§4.1, p. 11).
2. Define preserved program order `ppo`, fence relations, and `prop` for the target architecture (§4.5–§4.7, pp. 19–25).
3. Reject a candidate with a cycle in `po-loc ∪ com` for SC PER LOCATION (§4.2, pp. 13–14).
4. Define `hb = ppo ∪ fences ∪ rfe` and reject cyclic `hb` for NO THIN AIR (§4.3, pp. 14–15).
5. Reject a candidate when a from-read edge participates in the OBSERVATION cycle `fre ; prop ; hb*` (§4.4, pp. 15–17).
6. Reject a candidate when `co ∪ prop` is cyclic for PROPAGATION (§4.5, pp. 17–19).

The authors explicitly treat the axioms as configurable. "Rather than axioms set in stone, that we would declare as the absolute truth, we present here some basic bricks from which one can build a model at will." (§4.9, p. 27)

Architecture instances. For SC, `ppo = po` and `prop = ppo ∪ fences ∪ rf ∪ fr`; for TSO, `ppo = po \ WR`, `fence = mfence`, and `prop = ppo ∪ fences ∪ rfe ∪ fr` (Fig. 21, p. 26). The paper proves Lemma 4.1: its SC instance is equivalent to Lamport SC and its TSO instance to Sparc TSO (§4.8, p. 26). For C++ release-acquire, it uses `sb` as `ppo`, `hb+` as propagation, and weakens PROPAGATION to irreflexivity to account for the standard's discrepancy (§4.8, pp. 26–27).

Verus form. Inference: encode each axiom as a `spec fn` returning a Boolean about a finite execution, and prove an `acyclic` or `irreflexive` lemma for every generated execution. State an atomic API contract in terms of the chosen abstract model; do not use executable `proof fn`s at runtime. Verus has no built-in `ppo`, `prop`, or memory-model axiom, so these are project-specific ghost definitions. A proof is conditional on the abstraction connecting Rust atomics and hardware to the event model.

Evidence and limits. The equivalence evidence covers the specified SC/TSO instances, not all architectures. The paper says the generic framework cannot express C++ with mixed relaxed and release writes and leaves consume atomics for future work (§4.9, p. 27). It also reports that its C++ R-A form is slightly stronger than the standard (§4.8, p. 26), so a direct reuse would overconstrain behavior.

## technique 3: derive architecture-specific order from dependencies and fences

What it is. For Power and ARM, the paper defines event subtypes, intra-instruction order, data/address/control dependencies, and fence classes; it then closes these relations recursively to obtain `ppo` (§5–§6, pp. 27–48).

How to do it.
1. Expand an instruction into memory, register, branch, and fence events; relate events from one instruction with `iico` (§5.1, p. 27).
2. Classify dependencies (`addr`, `data`, `ctrl`) and fence events (`lwsync`, `sync`, `isync` for Power; `dmb`, `dsb`, `isb` for ARM) (§5–§6, pp. 27–48).
3. Build the mutually recursive `ii`, `ic`, `ci`, and `cc` relations from base dependency/order relations, then define `ppo = RR(ii) ∪ RW(ic)` (Fig. 25, p. 41; Fig. 38, p. 59).
4. Define architecture-specific `fence`, `hb`, `prop-base`, and `prop`, then reuse the four generic axioms (§4.7, pp. 23–25).
5. For ARM, compare the model with observed early-commit behavior and remove `po-loc` from the commit relation; separately remove read-read pairs when testing the known load-load hazard (§8.1.2, pp. 52–54).

Fence placement follows from the cycle's communications. The paper states: "Placing fences essentially amounts to counting the number of communications (i.e. the relations in com) involved in the behaviour that we want to forbid." (§4.7, p. 24) Lightweight fences suffice for patterns with only `rf` or one `fr`; full fences are needed when several `fr` or `co`/`fr` edges occur (§4.7, pp. 24–25).

Verus form. Inference: model each Rust atomic ordering and fence as an event plus a relation contribution. A verified lock-free algorithm can then prove that every forbidden cycle is impossible under its selected architecture model. Verus proofs should expose the fence/ordering assumptions in contracts; they cannot infer that `Acquire` or `Release` has a particular hardware effect without a trusted Rust-memory-model theorem.

## technique 4: test models against hardware with generated litmus tests

What it is. The `diy` suite generates tiny assembly programs with specified initial and final states, runs them on real machines, and records observed outcomes. The model is checked both for over- and under-approximation.

How to do it.
1. Generate a broad litmus suite with patterns such as load buffering, message passing, store buffering, dependencies, and barriers (§8.1, p. 49).
2. Run each test on target machines and collect memory/register states (§8.1, p. 49).
3. Compare each observed execution with the model. “Unseen” means the model allows it but hardware did not exhibit it; “invalid” means the model forbids it but hardware did exhibit it (§8.1, pp. 49–50).
4. Investigate invalid outcomes as either model strictness or hardware anomalies, and revise the model only with architectural evidence (§8.1, pp. 49–54).

The experiment generated 8,117 Power tests and 9,761 ARM tests (§8.1, p. 49). The Power model had no invalid Power observations across the three tested generations (G5, 6, and 7), while ARM exposed 1,500 tests invalidating the initial Power-ARM model (§8.1, pp. 49–50). The authors observed the ARM load-load hazard on all tested machines and report Table VI counts such as `coRR: model Forbid, machines Ok, 10M/95G` (§8.1.2, pp. 50–51). After changing the ARM commit order and filtering the known hazard, the ARM-llh comparison had 31 tests and 1,121 invalid executions, down from 1,500 tests and 37,907 invalid executions for Power-ARM (Table VIII, p. 54).

Inference: the denominators differ: 8,117 and 9,761 are generated tests; 1,500 and 31 are tests with at least one invalid execution; 37,907 and 1,121 are invalid executions, not tests. The reported `10M/95G` is a machine-run count in Table VI, not a percentage.

Verus form. Inference: use litmus tests as executable regression tests for a Rust atomic API and as finite proof obligations for the ghost model. A test observing a behavior cannot by itself refute a Verus proof unless the same behavior is represented in the specification; conversely, a proof does not validate hardware if the event extraction or compiler mapping is wrong.

## technique 5: use herd as a concise model-level simulator

What it is. `herd` takes a `.cat` relation specification and a litmus test, enumerates candidate executions, and computes those allowed by the axioms. Its language has relation union/intersection/sequence, transitive closure, built-in `po`, `rf`, `fr`, `co`, and read/write filters (§8.3, pp. 58–60).

How to do it.
1. Write the architecture model as relation definitions and `acyclic`/`irreflexive` checks. Figure 38 is the complete Power model (§8.3, pp. 58–59).
2. Supply a litmus test and let `herd` enumerate `rf` and `co` possibilities (§8.3, p. 60).
3. Compare allowed outcomes across model variants by changing relation definitions without changing simulator code (§4.9, p. 27; §8.3, p. 58).
4. Record execution counts and runtime, and inspect differences against hardware or another model (§8.3, pp. 60–61).

Evidence. On the Power suite, `herd` with the present single-event axiomatic model processed all 8,117 tests in 321 seconds; the same `herd` implementation of the multi-event model processed all 8,117 in 2,846 seconds; `ppcmem` processed 4,704 of 8,117 in 14,922,996 seconds; and the operational Boudol tool processed 396 of 518 in 53,100 seconds (Table IX, p. 60). Inference: the 45,000-times speed claim compares 14,922,996/321 ≈ 46,489 seconds on this setup; it is not a universal speedup and the compared tools process different test denominators.

Verus form. Inference: a small relation DSL or Rust spec functions can provide a model oracle for finite tests, but Verus is not a replacement for `herd`'s exhaustive enumeration. Keep the model text and generated test corpus as reviewable artifacts; prove consistency lemmas between a Rust ghost relation and the external oracle where practical.

## technique 6: encode weak memory in bounded C verification

What it is. The authors adapt CBMC so that C litmus tests are checked directly against the axiomatic model, and compare this with translating the model into an SC-only operational instrumentation.

How to do it.
1. Translate assembly litmus tests to C and add assertions for reachability of final states (§8.4, p. 61).
2. Run CBMC with the present axiomatic Power model or with the Mador-Haim model (§8.4, pp. 61–62).
3. Compare against `goto-instrument+CBMC (SC)`, which instruments an operational model into SC verification (§8.4, p. 61).

The present model verified 4,450 tests in 1,041 seconds, versus 1,944 seconds for the Mador-Haim model (Table XI, p. 61). On the three full examples PgSQL, RCU, and Apache, both models took 1.6, 0.5, and 2.0 seconds respectively (Table XII, p. 61). A separate 555-test comparison took 2,511.6 seconds for `goto-instrument+CBMC (SC)` and 14.3 seconds for direct CBMC Power using the earlier model (Table X, p. 61).

Inference: the denominators are 4,450 translated litmus tests for Table XI, 555 tests for Table X, and three named programs for Table XII; these results do not measure Rust or Verus. The conclusion itself calls program-verification experiments preliminary (§10, p. 74).

Verus form. Inference: for Rust, preserve the separation between executable code and a memory-model ghost specification. A bounded Verus harness can assert that a finite interleaving cannot reach a bad state, but unbounded concurrent Rust needs an abstraction such as a state machine and relies on the Rust/Verus atomic API contract. SC instrumentation is not sound for relaxed atomics unless the instrumentation theorem is proved.

## technique 7: mine source code for weak-memory cycles with mole

What it is. `mole` statically finds critical and SC PER LOCATION cycles in C/C++ code. It overapproximates concurrency to avoid missing patterns, then classifies cycles by the model's axioms.

How to do it.
1. Identify possible thread entry functions: explicit thread creation targets, externally linked functions not transitively called by one another, and one representative of a mutually recursive group (§9.1.3, p. 65).
2. Group entry functions whose transitive call graphs access overlapping shared objects, using points-to analysis (§9.1.3, pp. 65–67).
3. Build one control-flow graph per thread and add communication edges between shared accesses when at least one is a write (§9.1.3, p. 67).
4. Enumerate cycles with Tarjan's algorithm, then filter for critical or SC PER LOCATION patterns (§9.1.3, p. 67).
5. Classify each cycle by testing its relation sequence against SC PER LOCATION, NO THIN AIR, OBSERVATION, and PROPAGATION (§9.1.3, p. 68).

"With this approach, instead, we focus on not missing cycles rather than avoiding the detection of spurious cycles." (§9.1.3, p. 66)

Evidence. On Debian 7.1, `mole` analyzed 137,163 object files from 1,251 source packages, with 15-minute and 16-GB per-object bounds; the run used more than 199 CPU days, and 19,930 runs did not finish within those limits (§9.2, pp. 68–69). It found 86,206,201 critical cycles and 11,295,809 SC PER LOCATION cycles (§9.2.1, p. 69). The authors warn that many are spurious because thread spawning and locks are not fully modeled; the counts are warnings, not counts of executed cycles (§9.1.3, p. 66; §9.2.1, pp. 72–73).

Verus form. Inference: a Verus-oriented analogue can mine Rust MIR or source for shared-memory candidates, then emit finite proof obligations or litmus tests. A flow-insensitive points-to approximation must be labeled as an overapproximation; its warnings cannot be treated as verified executions. The paper's static method is useful for choosing which unsafe/atomic modules deserve a detailed Verus proof.

## what is proved, measured, and trusted

- proved
  - formal SC and TSO equivalence (Lemma 4.1, §4.8, p. 26)
  - equivalence between the axiomatic model and an intermediate operational machine for Power (Theorem 7.1 and Lemmas 7.2–7.3, §7.2, pp. 42–48)
  - relation-level validity of the architecture instances and model definitions
- measured
  - 8,117 Power and 9,761 ARM generated hardware tests (§8.1, p. 49)
  - Table IX simulator throughput and seconds, with tool-specific test denominators (§8.3, p. 60)
  - Tables X–XII CBMC test counts and seconds (§8.4, p. 61)
  - Debian static mining counts, resource limits, and cycle totals (§9.2, pp. 68–73)
- trusted or assumed
  - instruction semantics, compiler/assembly translation, and event extraction
  - hardware runs and the interpretation of “unseen” versus “invalid”
  - points-to analysis and ignored inline assembly (803 Debian packages contained inline assembly; §9.1.3, p. 64)
  - omitted locks, thread-spawn ordering, environment, and unmodeled architecture features
  - Inference: in VL, the Verus verifier, solver, Rust compiler, atomic-library specification, and hardware remain additional trust components

## contradictions, omissions, and product implications

Inference: the paper reports that the proposed ARM model was not invalidated except for 33 surprising ARM behaviors in its conclusion (§10, p. 74), while the detailed experiment reports 31 tests and 1,121 invalid executions after filtering the known load-load hazard (Table VIII, p. 54). These are different denominators and objects, so they should not be conflated: “33 behaviours” is a conclusion-level summary, whereas 31 is a test count and 1,121 is an execution count. The paper also says the program-verification experiments are preliminary (§10, p. 74), limiting claims about real applications.

Inference: VL should not redo the generic four-axiom framework, `herd`, the SC/TSO equivalence, or the Debian mining study. A product-relevant task is to connect the exact Rust atomic operations used by agent-written code to a checked event model, then replay the litmus corpus on supported targets and fail closed when compiler or hardware assumptions change. The threat to agent-written verified Rust is high for concurrent unsafe code: a functional Verus proof under an overly strong SC abstraction can miss weak-memory executions, while a hardware-calibrated model can still omit compiler, FFI, or platform details. The paper's workflow supplies the missing discipline—model, test, compare, and mine—but does not remove those assumptions.

## techniques for the catalog

- candidate-execution construction — represent instruction events, `po`, `rf`, `co`, and derived relations before applying axioms
- four generic weak-memory axioms — reject cycles for SC PER LOCATION, NO THIN AIR, OBSERVATION, and PROPAGATION
- architecture relation instantiation — define `ppo`, fences, and propagation for SC, TSO, C++ R-A, Power, or ARM
- hardware litmus testing — generate tiny tests, run them on machines, and classify unseen versus invalid outcomes with exact denominators
- herd simulation — execute concise relation specifications over all candidate executions
- axiomatic CBMC verification — encode the memory model directly in bounded C verification and compare with SC instrumentation
- mole static mining — overapproximate thread groups and shared objects, enumerate cycles, and classify them by memory-model axiom
Checked 2026-10-15 against paper alglave2013herding: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
