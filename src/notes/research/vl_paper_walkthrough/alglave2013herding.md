# Herding Cats - Modelling, simulation, testing, and data-mining for weak memory
(authored by agents unless marked 🧑)
Tag: `alglave2013herding`, [paper](http://arxiv.org/abs/1308.6810v5)

Page numbers below are the journal page numbers printed in the paper's running header ("Herding cats N" / "N J. Alglave et al."), not PDF page indices.

## takeaway

Inference: this paper's central technique is a compact axiomatic model of weak memory. A program is turned into candidate executions containing events and relations; four relational checks decide which executions are allowed. The same four axioms are reused by the architecture instances (SC, TSO, C++ release-acquire, Power, ARM), the `herd` simulator, the CBMC bounded verifier, and `mole`'s cycle classification (which uses the SC instance); hardware litmus tests check the model against real machines. This separation is useful for VL because a Rust/Verus concurrency proof needs an explicit memory model and a way to test whether the model matches hardware.

"We propose an axiomatic generic framework for modelling weak memory." (abstract, p. 1)

Inference: the paper is not a Verus proof and does not establish correctness of Rust atomics. Its evidence combines formal equivalence lemmas, hardware observations, simulation timings, bounded-C verification, and static analysis; each has a different denominator and trust boundary.

## technique 1: construct candidate executions in three stages

What it is. The method first gives each instruction an event-level semantics, then enumerates candidate executions by choosing communication relations, and finally filters candidates with a constraint specification.

"Axiomatic models are usually defined in three stages." (§3, p. 7)

How to do it.
1. Translate every instruction into events: memory/register reads and writes, branches, and fences. Include fictitious initial writes for each location (§3, p. 8; §5, p. 27).
2. Build an event graph for each thread (the control-flow semantics). Record program order `po` and address, data, or control dependencies (§3, p. 8).
3. Choose a read-from relation `rf` giving, for each read, the write it takes its value from, and a coherence order `co` that totally orders the writes to each location (§3, p. 9; §4.1, p. 11).
4. Treat `(E, po, rf, co)` as a candidate execution (§4.1, p. 10). Derive `fr` (from-read) from `rf` and `co`, and `com = co ∪ rf ∪ fr` (§4.1, p. 11).
5. Apply the constraint specification: the model rejects a candidate that contains a cycle in a relation the specification requires to be acyclic (or irreflexive) (§3, pp. 9–10).

The paper's message-passing example (Fig. 1, p. 8) has two stores in one thread and two loads in the other; the choices of `rf` give four candidate data-flow graphs (Fig. 3, p. 9). The paper says the SC constraints rule out the candidate in which the read of `x` reads the initial state while the read of `y` observed the update of `y` by the other thread (§3, p. 10).

Verus form. Inference: represent an execution as ghost sets/sequences of events and ghost relations (`Set<(Event,Event)>` or finite maps). Define `rf`, `co`, `fr`, and `po` as `spec fn`s, then prove relation properties with Verus lemmas. A Rust atomic operation's executable behavior should be linked to the abstract event by a contract. Verus can prove a finite execution's acyclicity, but it does not automatically enumerate all `rf`/`co` choices or model a processor's reorder buffer.

Evidence and limits. The candidate-execution construction is a mathematical definition, not a measured claim. Inference: it is only as faithful as the instruction semantics (events and dependencies); hardware, compiler lowering, and unmodeled events remain outside the abstract candidate. The paper itself notes that its semantics does not handle ARM conditional execution and that its hypotheses about it are untested (§5.2.2, p. 31).

## technique 2: use four generic axioms as model-building bricks

What it is. The framework rejects executions that violate four checks, given in Fig. 5 (p. 15): SC PER LOCATION, NO THIN AIR, OBSERVATION, and PROPAGATION (§4, pp. 10–27). The axioms are architecture-independent; "An architecture is a triple of functions (ppo, fences, prop)" (§4.1, p. 13), which supplies preserved program order, fences, and propagation.

How to apply it.
1. Define `po-loc`, the part of program order connecting events to the same location, and `com = co ∪ rf ∪ fr` (§4.1, p. 11; Fig. 5, p. 15).
2. Define `ppo`, the fence relations, and `prop` for the target architecture (§4.7, pp. 23–25 for Power/ARM fences and propagation; §4.8, pp. 25–26 for SC, TSO, C++ R-A; §6, pp. 33–37 for Power `ppo`).
3. SC PER LOCATION: require `acyclic(po-loc ∪ com)` (§4.3, pp. 15–16). This forbids the five patterns of Fig. 6.
4. NO THIN AIR: define `hb = ppo ∪ fences ∪ rfe` and require `acyclic(hb)` (§4.4, pp. 16–17).
5. OBSERVATION: require `irreflexive(fre; prop; hb*)` (§4.5, pp. 17–20; Fig. 5, p. 15).
6. PROPAGATION: require `acyclic(co ∪ prop)` (§4.6, pp. 21–23; Fig. 5, p. 15).

The authors explicitly treat the axioms as configurable. "Rather than axioms set in stone, that we would declare as the absolute truth, we present here some basic bricks from which one can build a model at will." (§4.9, p. 27) They say one can "disable the NO THIN AIR check, or restrict the SC PER LOCATION check so that it allows load-load hazard ..., or weaken the PROPAGATION axiom" (§4.9, p. 27).

Architecture instances (Fig. 21, p. 26). SC: `ppo = po`, `prop = ppo ∪ fences ∪ rf ∪ fr`. TSO: `ppo = po \ WR`, `ffence = mfence`, `prop = ppo ∪ fences ∪ rfe ∪ fr`. C++ R-A (the paper writes ≈ there to flag a discrepancy with the standard): `ppo = sb`, `fences = ∅`, `prop = hb`, with `hb = sb ∪ rf`, so `prop = hb+` (§4.8, p. 26). Lemma 4.1 states that the SC instance is equivalent to Lamport's SC and the TSO instance to Sparc TSO (§4.8, pp. 25–26); the proof cites [Alglave 2012] for the SC/TSO definitions (p. 26). The C++ R-A instance differs from the standard's HB VS MO axiom, which requires irreflexivity of `hb+; mo` where this framework requires acyclicity via PROPAGATION; "To adapt our framework to C++ R-A, one simply needs to weaken the PROPAGATION axiom to irreflexive(prop; co)" (§4.8, p. 26).

Verus form. Inference: encode each axiom as a `spec fn` returning a Boolean about a finite execution, and prove an `acyclic` or `irreflexive` lemma for every generated execution. State an atomic API contract in terms of the chosen abstract model; do not use executable `proof fn`s at runtime. Verus has no built-in `ppo`, `prop`, or memory-model axiom, so these are project-specific ghost definitions. A proof is conditional on the abstraction connecting Rust atomics and hardware to the event model.

Evidence and limits. The paper presents the SC/TSO equivalence as a proof for those two instances, not for all architectures. §4.9 says the framework handles only one type per kind of event: it can express C++ "when all the reads are acquire and all the writes are release, but nothing more", not a model where some writes are relaxed and others release (§4.9, p. 26). The conclusion leaves the complete C++ model, "in particular including consume atomics", for future work (§10, p. 73). Its C++ R-A form is "slightly stronger" than the standard (§4.8, p. 26). Inference: reusing it directly would overconstrain behavior relative to the C++ standard.

## technique 3: derive architecture-specific order from dependencies and fences

What it is. For Power and ARM, the paper defines event kinds, intra-instruction causality order `iico`, address/data/control dependencies, and fence classes; it then defines `ppo` through four mutually recursive relations (§5, pp. 27–32; §6, pp. 33–37).

How to do it.
1. Expand an instruction into memory, register, branch, and fence events; relate events from one instruction with `iico` (§5, §5.1, p. 27).
2. Define dependencies `addr`, `data`, `ctrl`, `ctrl+cfence` over register data flow `dd-reg` (Fig. 22, p. 29). Fence classes: Power `ffence = sync`, `lwfence = lwsync \ WR`, `cfence = isync`; ARM `ffence = dmb ∪ dsb`, `lwfence = ∅`, `cfence = isb` (Fig. 17, p. 23).
3. Build the mutually recursive `ii`, `ic`, `ci`, and `cc` relations (init/commit parts of events) from base relations `ii0`, `ic0`, `ci0`, `cc0`, then define `ppo = (ii ∩ RR) ∪ (ic ∩ RW)` (Fig. 25, p. 33). The same Power model in `herd` syntax is Fig. 38, p. 59.
4. Define `fences`, `hb`, `prop-base`, and `prop` for Power and ARM (Fig. 18, p. 23), then reuse the four generic axioms.
5. For ARM, the paper weakens `cc0` to `dp ∪ ctrl ∪ (addr; po)`, i.e. removes `po-loc` from the commit relation, to allow the "early commit" behaviours such as mp+dmb+fri-rfi-ctrlisb (§8.1.2, p. 53). For its "ARM llh" experiments it additionally removes read-read pairs from `po-loc` in SC PER LOCATION, because the tested machines show the load-load hazard (Table VII, p. 53; §8.1.2, p. 54).

Fence placement follows from the cycle's communications. The paper states: "Placing fences essentially amounts to counting the number of communications (i.e. the relations in com) involved in the behaviour that we want to forbid." (§4.7, p. 24) Per §4.7 (p. 24): for behaviours with only `rf`, or one `fr` and otherwise `rf` (mp, wrc, isa2), a lightweight fence on the first thread plus preserved program order on the others suffices; for `co` and `rf` only (2+2w, w+rw+2w), lightweight fences on each thread suffice; for more than one `fr`, or both `co` and `fr` (sb, rwc, r), full fences on each thread are needed.

Verus form. Inference: model each Rust atomic ordering and fence as an event plus a relation contribution. A verified lock-free algorithm can then prove that every forbidden cycle is impossible under its selected architecture model. Verus proofs should expose the fence/ordering assumptions in contracts; they cannot infer that `Acquire` or `Release` has a particular hardware effect without a trusted Rust-memory-model theorem.

## technique 4: test models against hardware with generated litmus tests

What it is. The `diy` tool suite generates tiny assembly programs ("litmus tests") with specified initial and final states, runs them on real machines, and records observed memory and register states (§8.1, p. 49). The model is compared with the observations in two directions: behaviours the model allows but hardware never showed ("unseen"), and behaviours the model forbids but hardware showed ("invalid").

How to do it.
1. Generate a litmus suite illustrating features such as lb, mp, sb and their variations with dependencies and barriers (§8.1, p. 49).
2. Run each test on target machines and collect final states (§8.1, p. 49).
3. Compare with the model. "unseen" is the number of tests the model allows but the hardware does not exhibit; "invalid" is the number of tests the model forbids but the hardware does exhibit (§8.1, pp. 49–50).
4. The paper reads an unseen result as the model being too coarse or the behaviour being allowed by the architect but not yet implemented; it reads an invalid result as the model being too strict or the behaviour being a hardware bug (§8.1, pp. 49–50). Where designers told the authors a behaviour was desirable, they weakened the ARM model (§8.1.2, pp. 51–53).

Numbers. The experiment generated 8,117 Power tests and 9,761 ARM tests (§8.1, p. 49). Table V (p. 49): Power, 0 invalid and 1,182 unseen; ARM, 1,500 invalid and 1,820 unseen. Power machines tested were Power G5, 6 and 7 (§8.1.1, p. 50). The ARM Power-ARM model was invalidated by ARM hardware, including a load-load hazard (a coRR violation) that ARM acknowledged as a bug in Cortex-A9 cores; the authors "observed the load-load hazard bug on all tested machines" (§8.1.2, p. 50). Table VI (p. 51) lists counts such as `coRR: model Forbid, machines Ok, 10M/95G`; the paper's text does not define the `M`/`G` notation (the caption reads "Some counts of invalid observations on ARM machines"). Inference: it is a raw count pair, not a percentage. For the ARM llh model, 1,500 tests with 37,907 invalid executions (Power-ARM) fall to 31 tests with 1,121 invalid executions (Table VIII and text, p. 54).

Inference: the denominators differ: 8,117 and 9,761 are generated tests; 1,500 and 31 are tests that exhibited invalid executions; 37,907 and 1,121 are invalid executions, not tests ("A given test can have several executions", p. 54).

Verus form. Inference: use litmus tests as executable regression tests for a Rust atomic API and as finite proof obligations for the ghost model. A test observing a behavior cannot by itself refute a Verus proof unless the same behavior is represented in the specification; conversely, a proof does not validate hardware if the event extraction or compiler mapping is wrong.

## technique 5: use herd as a concise model-level simulator

What it is. `herd` takes a model specified as relations over events with irreflexivity or acyclicity checks, plus a litmus test, and computes all executions the model allows (§8.3, p. 58). The language has `let`, `let rec`, union `|`, intersection `&`, sequence `;`, transitive closure `+`, reflexive-transitive closure `*`, the empty relation `0`, built-in relations such as `po-loc`, `rf`, `fr`, `co`, `addr`, `data`, and read/write restrictions such as `RR(r)` (§8.3, p. 58).

How to do it.
1. Write the architecture model as relation definitions and `acyclic`/`irreflexive` checks. Fig. 38 is "the entirety of our Power model" (§8.3, pp. 58–59).
2. Supply a litmus test; `herd` enumerates `rf` and `co` possibilities (§8.3, p. 60).
3. Compare allowed outcomes across model variants by editing the model text without changing simulator code (§4.9, p. 27; §8.3).
4. Compare the number of tests processed and the user time against other simulators (Table IX, p. 60).

Evidence. Table IX (p. 60, "(user) time in s"): `herd` with the present single-event axiomatic model processed all 8,117 Power tests in 321 s; `herd` with the multi-event model of Mador-Haim et al. processed all 8,117 in 2,846 s; `ppcmem` processed 4,704 tests in 14,922,996 s; the operational tool of Boudol et al. processed 396 tests in 53,100 s. The text says ppcmem and Boudol et al. run under memory bounds of 40 GB and 6 GB and process 4,704 of 8,117 and 396 of 518 tests respectively (p. 60). The paper claims "herd is about 45000 times faster than ppcmem, and ppcmem fails to process about half of the tests" (p. 60). Inference: the Table IX ratio is 14,922,996/321 ≈ 46,489, but the two tools processed different test sets (herd all 8,117, ppcmem 4,704), and the paper says "ppcmem is not coded as efficiently as it could be", so it is not a universal speedup.

Verus form. Inference: a small relation DSL or Rust spec functions can provide a model oracle for finite tests, but Verus is not a replacement for `herd`'s exhaustive enumeration. Keep the model text and generated test corpus as reviewable artifacts; prove consistency lemmas between a Rust ghost relation and the external oracle where practical.

## technique 6: encode weak memory in bounded C verification

What it is. The authors use a modified CBMC bounded model checker for C that implements the axiomatic models directly, and compare this with the earlier instrumentation approach that transforms a program so a tool in SC mode can check it (§8.4, p. 61).

How to do it.
1. Translate assembly litmus tests to C and check reachability of the final state (§8.4, p. 61: "verify the reachability of the final state of more than 4000 litmus tests (translated to C)").
2. Run CBMC with the present axiomatic Power model or with the model of Mador-Haim et al., both implemented in CBMC (§8.4, p. 61).
3. Compare against `goto-instrument+CBMC (SC)`, which instruments an operational model equivalent to [Alglave et al. 2012] so that CBMC in SC mode can check it (§8.4, p. 61).

Numbers. Table XI (p. 61): CBMC with the Mador-Haim model, 4,450 tests, 1,944 s; with the present model, 4,450 tests, 1,041 s. Table XII (p. 61): on PgSQL, RCU and Apache both models took 1.6, 0.5 and 2.0 respectively (the table gives no unit; Table X's column is "time in s"); the paper observes that these times "are not affected by the choice of either of the two axiomatic models". Table X (p. 61): for 555 tests, `goto-instrument+CBMC (SC)` took 2,511.6 s and CBMC (Power) 14.3 s, both with the model of [Alglave et al. 2012], i.e. not the present model.

Inference: the denominators are 4,450 translated litmus tests for Table XI, 555 tests for Table X, and three named programs for Table XII; these results do not measure Rust or Verus. The conclusion calls the program-verification experiments preliminary: "we regard our experiments w.r.t. verification of programs as preliminary" (§10, p. 74).

Verus form. Inference: for Rust, preserve the separation between executable code and a memory-model ghost specification. A bounded Verus harness can assert that a finite interleaving cannot reach a bad state, but unbounded concurrent Rust needs an abstraction such as a state machine and relies on the Rust/Verus atomic API contract. SC instrumentation is not sound for relaxed atomics unless the instrumentation theorem is proved.

## technique 7: mine source code for weak-memory cycles with mole

What it is. `mole` statically finds critical cycles and SC PER LOCATION cycles in C code (implemented as the `--static-cycles` option of `goto-instrument`, §9.1, p. 63). It overapproximates concurrency, then classifies cycles by the model's axioms.

How to do it.
1. Identify possible thread entry functions: explicit POSIX or kernel thread creation targets; any set of externally linked functions none of which is transitively called from another in the set; one arbitrary function from a mutually recursive group (§9.1.3, p. 65). For each entry point it creates 3 threads (p. 67).
2. Group entry functions whose transitively called functions access intersecting sets of objects, using a points-to analysis (§9.1.3, p. 67).
3. Build one control-flow graph per thread and add communication edges between shared accesses to the same object when at least one is a write (§9.1.3, p. 67).
4. Enumerate cycles with Tarjan's 1973 algorithm, then filter for static critical cycles or SC PER LOCATION cycles (§9.1.3, p. 67).
5. Classify each cycle by testing its relation sequence against the axioms: for the classification the model is instantiated for SC (Fig. 21); SC PER LOCATION first, then NO THIN AIR, OBSERVATION, and PROPAGATION last (§9.1.3, p. 68).

"With this approach, instead, we focus on not missing cycles rather than avoiding the detection of spurious cycles." (§9.1.3, p. 65)

Evidence. The target was Debian 7.1. Of its more than 17,000 packages, 1,590 source packages (9.3%) used POSIX or Linux kernel threads (§9, p. 62). `mole` ran on 137,163 object files from 1,251 source packages, with a 15-minute and 16-GB bound per object file; the authors "spent more than 199 CPU days in cycle search, yet 19 930 runs did not finish within the above time and memory limits" (§9.2, p. 68). It found 86,206,201 critical cycles plus 11,295,809 SC PER LOCATION cycles, in 551 different patterns (§9.2.1, p. 69). Among the static cycles, the authors report 4,775,091 occurrences of iriw (4.897%), 4,606,915 of coRR (4.725%), and 2,300,724 of coRW2 (2.360%) (§9.2.1, p. 72).

Limits stated by the paper. The analysis ignores program logic such as locks, so "any numbers of cycles given in this section cannot be taken as a quantitative analysis of cycles that would be actually executed" (§9.1.3, p. 65); results "are best understood as warnings similar to those emitted by compilers" (§9.2.1, p. 72). Cycle enumeration does not take thread-spawn ordering into account (p. 73). Its flow-insensitive, field-insensitive points-to analysis may still miss cycles (§9.1.3, p. 67). Only a subset of inline assembly (such as memory barriers) is interpreted; inline assembly appears in 803 of the packages analysed (§9.1.3, p. 64). In the RCU and PostgreSQL examples, where harnesses allowed separating genuine from spurious cycles, the paper reports that all RCU cycles other than one coWW and one mp are spurious (§9.2.1, p. 73).

Verus form. Inference: a Verus-oriented analogue can mine Rust MIR or source for shared-memory candidates, then emit finite proof obligations or litmus tests. Its warnings cannot be treated as verified executions, and (as in `mole`) an unsound points-to analysis can miss cycles. The paper's static method is useful for choosing which unsafe/atomic modules deserve a detailed Verus proof.

## what is proved, measured, and trusted

- proved
  - SC and TSO instances equivalent to Lamport SC and Sparc TSO (Lemma 4.1, §4.8, pp. 25–26; the proof cites [Alglave 2012])
  - equivalence between the axiomatic model and an intermediate operational machine (Theorem 7.1 and Lemmas 7.2–7.3, §7.2, pp. 40–45); the paper says the equivalence proof was implemented in Coq (p. 41)
  - a valid path of the PLDI machine of Sarkar et al. leads to a valid path of the intermediate machine (§7.3, pp. 45–49)
- measured
  - 8,117 Power and 9,761 ARM generated hardware tests (§8.1, p. 49; Table V)
  - Table IX simulator throughput and seconds, with tool-specific test denominators (§8.3, p. 60)
  - Tables X–XII CBMC test counts and times (§8.4, p. 61)
  - Debian static mining counts, resource limits, and cycle totals (§9.2, pp. 68–73)
- trusted or assumed
  - instruction semantics, compiler/assembly translation, and event extraction
  - hardware runs and the interpretation of "unseen" versus "invalid"
  - points-to analysis; inline assembly beyond a relevant subset is ignored (803 Debian packages contained inline assembly; §9.1.3, p. 64)
  - omitted locks, thread-spawn ordering, environment, and unmodeled architecture features
  - Inference: in VL, the Verus verifier, solver, Rust compiler, atomic-library specification, and hardware remain additional trust components

## contradictions, omissions, and product implications

Inference: the paper gives two different counts for the ARM behaviours its model still forbids. The abstract says "more recently 31 additional anomalies" (p. 1) and §8.1.2 says "we still have 31 behaviours that our model forbids yet are observed on hardware" (p. 56); Table VIII's ARM llh row is described as "31 tests and 1121 invalid executions" (p. 54). The conclusion instead says the models are not invalidated "except for the 33 surprising ARM behaviours detailed in Sec. 8" (§10, p. 73). The paper does not explain 31 versus 33. Do not conflate either with the 1,121 invalid executions, which count executions, not tests. The paper also calls its program-verification experiments preliminary (§10, p. 74), limiting claims about real applications.

Inference: VL should not redo the generic four-axiom framework, `herd`, the SC/TSO equivalence, or the Debian mining study. A product-relevant task is to connect the exact Rust atomic operations used by agent-written code to a checked event model, then replay the litmus corpus on supported targets and fail closed when compiler or hardware assumptions change. The threat to agent-written verified Rust is high for concurrent unsafe code: a functional Verus proof under an overly strong SC abstraction can miss weak-memory executions, while a hardware-calibrated model can still omit compiler, FFI, or platform details. The paper's workflow supplies the missing discipline (model, test, compare, and mine) but does not remove those assumptions.

## techniques for the catalog

- candidate-execution construction: represent instruction events, `po`, `rf`, `co`, and derived relations before applying axioms
- four generic weak-memory axioms: reject cycles for SC PER LOCATION, NO THIN AIR, OBSERVATION, and PROPAGATION
- architecture relation instantiation: define `ppo`, fences, and propagation for SC, TSO, C++ R-A, Power, or ARM
- hardware litmus testing: generate tiny tests, run them on machines, and classify unseen versus invalid outcomes with exact denominators
- herd simulation: execute concise relation specifications over all candidate executions
- axiomatic CBMC verification: encode the memory model directly in bounded C verification and compare with SC instrumentation
- mole static mining: overapproximate thread groups and shared objects, enumerate cycles, and classify them by memory-model axiom
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "A memory read r consists of an init i(r), where it reads its value, and a commit part c(r), where it becomes irrevocable."): I read the whole paper text (lines 1 to 4112) and the whole study, and checked each quotation, number, table value, section and page reference, and technique step against it. I changed: page and section references for the four axioms (§4.3 to §4.6, pp. 15–23, not pp. 11–19), Fig. 25 (p. 33, not p. 41), Theorem 7.1 and the proofs (pp. 40–45, not 42–48), the mole quote (p. 65, not 66), the consume-atomics remark (§10, p. 73, not §4.9), the mixed-event-types remark (p. 26); the "33 behaviours" statement (§10, p. 73) now noted as an unexplained 31 versus 33 inconsistency in the paper rather than a test-versus-behaviour difference; the claim of a proof of "relation-level validity" was deleted as unsupported; the CBMC step "add assertions", the step about revising the model only on architectural evidence, and the 45,000-times arithmetic sentence were corrected; the mole limits (points-to may miss cycles, spawn ordering, partial inline assembly) were added. I did not check the PDF figures beyond the extracted text, the cited external papers or web pages, the Coq scripts, the herd/mole artifacts, or the arXiv page itself (the link is the arXiv identifier printed in the paper text); the Verus-form paragraphs are my inferences and not checked against any Verus documentation.
