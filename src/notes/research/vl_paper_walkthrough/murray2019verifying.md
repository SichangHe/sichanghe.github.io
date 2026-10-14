# Verifying that a compiler preserves concurrent value-dependent information-flow security
(authored by agents unless marked 🧑)
Tag: `murray2019verifying`, [paper](http://arxiv.org/abs/1907.00713v1)

## scope and result

The paper addresses compilation of concurrent programs whose information-flow policy depends on runtime values. Its motivating gap is that source reasoning does not by itself constrain compiled behavior: “It is common to prove by reasoning over source code that programs do not leak sensitive data.” (Abstract, p. 1). The target property is concurrent value-dependent noninterference (CVDNI), a two-execution property. The paper supplies a decomposition of the difficult secure-refinement obligation, proves the decomposition sound in Isabelle/HOL, and applies it to the Covern `wr-compiler`, translating a locking While language to generic RISC assembly.

The security setting has shared memory, locks, and an attacker that reads permanently Low locations not subject to synchronization (Section 2, pp. 3–4). A location's classification can depend on another location's value. In the phone example, `source` is Low exactly when `domain = LOW`; therefore `domain` is a control variable of `source` (Section 2, p. 3). A thread proof assumes that other threads obey the lock discipline and do not leak High values; the analyzed thread must establish the same compositional contract (Section 2, pp. 3–4).

## technique 1: compositional CVDNI for shared-memory threads

What it is. The paper uses a per-thread security property, `com-secure`, whose witness is a strong-low-bisimulation over pairs of executions. The relation compares Low-equivalent states while accounting for mode state (the assumptions and guarantees governing which variables other threads may read or write). Prior theorems show that if each thread satisfies this property, parallel composition satisfies the whole-program property (Section 2.1, pp. 5–6). This avoids an exponential state-space blow-up: “to avoid a state space explosion that is exponential in the number of threads, we must do this compositionally: one thread at a time, then combining the results of these analyses.” (Section 2, p. 3).

When to use it. Use this proof boundary when a program has many concurrent threads and a global noninterference claim can be factored into assumptions about each thread's synchronization and interference. The assumptions must describe lock-governed access and the set of attacker-observable Low locations. A value-dependent policy additionally requires preserving the control variables that determine classifications.

How to apply it.
1. Define the classification function `L` and identify every control variable `Cvars v` on which the classification of location `v` depends (Section 2.1, pp. 5–6).
2. Define mode states for lock ownership and the memory-equivalence relation used by the attacker (Sections 2.1–2.2, pp. 5–7).
3. For one thread, define a strong-low-bisimulation witness relating two executions and require the thread to preserve it under its own steps and allowed changes by other threads (Definition 2 and the surrounding text, pp. 5–6).
4. Prove each thread's `com-secure` obligation, then invoke the cited compositionality theorem to obtain the concurrent result (Section 2.1, p. 6; Section 6, pp. 15–16).

Verus form. Inference: represent the per-thread state and mode state as Rust structs; use a `spec fn` for `L`, `Cvars`, and Low-equivalence, and use `requires`/`ensures` on proof functions for each transition. Model the lock discipline with ghost state and invariants. Verus can express the relational witness as a predicate over two ghost states, but the Isabelle definitions and theorem statements do not transfer syntactically. Inference: a verified Rust implementation still needs an explicit assumption that environment threads satisfy their contracts; Verus does not infer that assumption from ordinary Rust locking.

Evidence and limits. The paper's compositionality is a theorem in Isabelle/HOL, and the case study proves the two CDDC threads' compositional property before compilation (Section 6, p. 15). The guarantee is conditional on the lock protocol, the classification/control-variable model, and the absence of unsupported source features such as the High-branching case excluded by the compiler theorem (Section 5.5.4, p. 15).

## technique 2: decompose secure refinement into three obligations

What it is. The original secure-refinement condition is a cube-shaped, two-sided simulation obligation (`coupling-inv-pres`) comparing two abstract and two concrete executions. The new predicate `secure-refinement-decomp B R I abs-steps` replaces that cube with (a) ordinary square-shaped refinement paced by an `abs-steps` function, and (b) side conditions grouped under `decomp-refinement-safe` (Definition 7, Section 3, pp. 8–9). The paper states: “The decomposition requires the provision of a new refinement parameter that we will call abs-steps or the pacing function, whose role is to dictate the pace of the refinement by returning the number of abstract steps that ought to be taken for a single concrete step.” (Section 3, p. 8).

When to use it. Use this method when a compiler or transformation must preserve a relational security property and a direct cube proof is too large. It is especially useful when ordinary semantic simulation is easy, while termination, timing, and coupling-invariant preservation can be proved as separate local facts.

How to apply it.
1. Define `R` relating abstract and concrete local configurations, and prove `preserves-modes-mem R` and `closed-others R` (Definitions 4–5; Section 3, p. 8).
2. Define a symmetric concrete coupling invariant `I`; prove `cg-consistent I` and `sym I` (Definition 7, p. 8).
3. Define `abs-steps` giving the number of abstract steps matching each concrete step for every `R`-related pair (Definition 7, p. 8).
4. Prove paced refinement: every concrete step from an `R`-related pair has an abstract execution of exactly `abs-steps` steps ending in an `R`-related pair (Definition 7 and Figure 4a, pp. 8–9).
5. Prove `decomp-refinement-safe`: (i) `stops` is equal for `I`-related concrete configurations, (ii) `abs-steps` is equal on the two sides of `I`, and (iii) `I` is closed under lockstep concrete execution while preserving mode state (Definition 8 and Figure 4b–c, pp. 8–9).
6. Apply Theorem 9, `secure-refinement-decomp ... ==> secure-refinement ...`, then use the earlier theorem that secure refinement carries the CVDNI witness to the concrete program (Section 3, pp. 8–9).

The three side conditions have distinct meanings. Equal `stops` prevents termination leaks; equal pacing prevents timing leaks; closure of `I` maintains the memory-access assumptions needed for thread composition (Section 3, p. 9). The B- and R-edges can expose facts already available from a verification technique or compiler, reducing the invariant proof burden (Section 3, p. 9).

Verus form. Inference: encode `R`, `I`, and `abs_steps` as `spec fn`s over ghost representations. A proof function for each transition can use `requires` to assume membership in `R`/`I` and `ensures` to establish the corresponding successor relation. Use `while` loop invariants for closure and mode-state equality; use `assert` and lemma proof functions to discharge arithmetic equalities about step counts. `abs_steps` is a specification function, not a runtime proof call. Inference: Verus has no direct cube diagram primitive, so the decomposition is a proof organization pattern implemented with separate lemmas.

Evidence. In a reproduced refinement example, the direct Isabelle theory had about 3.6K proof lines; the decomposed version had approximately 2K proof lines, a 44% reduction (Section 4, p. 9). The adaptation changed fewer than 10 lines of the coupling invariant and pacing function and added about 30 helper-definition lines; the rest of the theory and dependencies were shared (Section 4, p. 9). The 44% denominator is the original approximately 3.6K proof lines, not all 4.6K definition-plus-proof lines. The result is a proof-size proxy, not a measured runtime or human-hours reduction; the paper explicitly says proof size is used as a proxy (Section 4, p. 9).

## technique 3: track lock-protected stability to validate compiler optimizations

What it is. The `wr-compiler` tracks a register record and an assumption record. The assumption record records variables currently protected by `AsmNoW` or `AsmNoRW`; a variable is stable when it and every control variable in `Cvars v` are recorded as protected (Section 5.4, pp. 12–13). `regrec-stable` requires every expression cached in a register to mention only stable variables. `no-unstable-exprs` is a structural static check that rejects a While program that accesses a lock-protected variable without the relevant lock. Together these conditions let the compiler omit redundant loads while preserving shared-memory contents.

The implementation call is explicit: `compile-cmd C l nl c` returns an annotated instruction list, labels, a final compilation record, and a failure flag; it can reject a data race or an expression deeper than the target limit (Section 5.4, p. 12). The record-consistency predicate requires every cached register value to equal its expression evaluated in memory and requires the assumption record to match the mode state (Section 5.5.1, pp. 13–14).

When to use it. Use stability tracking when an optimization reuses a value loaded from shared memory. The optimization is sound only while the variable and all policy-control variables cannot be changed by another thread. If the lock is released or a control variable is unstable, cached expressions must not be reused.

How to apply it.
1. At each program point, maintain `S = (AsmNoW, AsmNoRW)` for variables protected by the current lock/mode state (Section 5.4, p. 12).
2. Define `var-stable S v` requiring `v` and all `Cvars v` to be in the protected sets (p. 12).
3. Require `regrec-stable C` for the register-expression map and run `no-unstable-exprs` over the source command (p. 13).
4. Compile expressions while retaining a register entry only when its variables remain stable; otherwise emit a load and update the record (Sections 5.4–5.5, pp. 12–13).
5. Prove the compiler invariant that every successful output register record remains stable (Lemma 20, Appendix D.3, p. 22 in the extended text).

Verus form. Inference: model `S` as ghost sets and `var_stable` as a `spec fn`; store cached expressions in a ghost map or a ghost predicate describing the runtime register map. Add loop invariants stating `regrec_stable` and consistency between registers and memory. A lock wrapper can update ghost ownership on acquire/release, but the compiler's rejection check remains a proof-side function over an AST. Inference: Rust's ownership rules prevent some aliasing errors, but they do not establish this value-dependent stability condition for shared memory; the condition must be stated and proved.

Evidence and limits. The paper proves lemmas that `Rwr` preserves modes and memory and is closed under changes by other threads (Lemmas 11–12, Section 5.5.1, p. 14), and that successful compilations produce only stable register records (Lemma 20, Appendix D.3). The optimization scope is deliberately narrow: the authors say that shared data limits current optimizations to avoiding redundant loads, while loop hoisting and constant folding are not implemented (Section 7, p. 16). Stability is an assumption about synchronization, not a guarantee for programs that violate the lock discipline.

## technique 4: choose a pacing function and coupling invariant for the compiler

What it is. `abs-stepswr` classifies RISC instructions. Loads, operations, and constant moves emitted by expression compilation either advance the While loop once in the special `while` case or leave it still; epilogue jumps and no-ops take zero abstract steps; all other instructions advance in lockstep (Section 5.5.2, p. 14). The coupling invariant `Iwr` relates two concrete states only when they are at the same program counter in the same RISC program (Section 5.5.3, p. 15). With a `no-high-branching` source relation, this prevents the compiler from introducing a branch on a sensitive value (Section 5.5.4, p. 15).

How to apply it. Define the instruction-class cases, prove the paced simulation lemma (Lemma 14), prove closure of `Iwr` under lockstep execution, and discharge the three decomposition side conditions. Then combine Lemma 15 with Theorem 9 and the source CVDNI witness to obtain Corollary 16 (Sections 5.5.2–5.5.4, pp. 14–15).

Verus form. Inference: define `abs_stepswr` as a pure specification function over an instruction enum and abstract command; prove a transition lemma with `ensures` that the abstract command advances by that count. Represent `Iwr` as equality of ghost program identifiers and instruction counters. `no_high_branching` can be a predicate over two memory snapshots; prove branch-condition equality before any conditional jump. Inference: `old(memory)` in an `ensures` clause can relate pre-state values, but it does not replace the relational two-run ghost state needed here.

Evidence. The main theorem states that successful compilation, input requirements, a consistent initial compilation record, and the generated program together imply an `Rwr` relation (Theorem 17, Section 5.5.4, p. 15). The CDDC case study compiles two While threads (about 150 lines total) to about 250 RISC instructions and derives concurrent security using the compiler and compositionality theorems (Section 6, pp. 15–16). The paper reports these as program sizes; it does not give a percentage success rate or runtime denominator.

## what is proved, measured, and trusted

Proved in Isabelle/HOL: soundness of the decomposition (Theorem 9), correctness of `Rwr`, pacing and coupling lemmas, successful-compilation refinement (Theorem 17), and CVDNI preservation for the supported source class (Corollary 16; Sections 3 and 5.5). Measured: proof-size reduction from approximately 3.6K to 2K proof lines (44%), compiler size of approximately 7K lines, verification plus compilation of the two-thread CDDC model of approximately 1.6K Isabelle lines, and the CDDC sizes above (Introduction footnote, p. 3; Section 4, p. 9; Section 6, pp. 15–16). Trusted: Isabelle/HOL's kernel and the mechanized definitions, the source CVDNI proofs, lock-discipline assumptions about other threads, the classification model, and the compiler's input checks. The paper notes that its CDDC model is a two-thread precursor and leaves adaptation to the three-thread Covern model with shared-data invariants for future work (Section 6 footnote, p. 15).

Inference: for VeruLaw, the highest product risk is relational proof burden around concurrency, timing, and value-dependent policies, rather than ordinary sequential memory safety. The decomposition and stability patterns are reusable as proof architecture, but they assume explicit ghost models of locks, environment interference, and two-run observations. Existing work already supplies a mechanized secure-compilation architecture and a concrete CDDC assembly result; VL should avoid rediscovering the cube-to-square decomposition and should instead test whether Verus can express its side conditions economically. Inference: the strongest gap is support for source programs with High-dependent branching and for richer shared-data invariants, because the reported compiler theorem excludes High branching and the three-thread extension is future work.

## techniques for the catalog

- compositional CVDNI: prove a per-thread strong-low-bisimulation under lock and environment assumptions, then compose the thread theorems
- secure-refinement decomposition: replace a cube-shaped relational proof with paced square refinement plus termination, timing, and coupling side conditions
- lock-based stability tracking: cache shared expressions only when the variable and every policy-control variable are protected, rejecting unstable accesses
- compiler pacing and coupling: classify target instructions with an abstract-step function and relate paired concrete runs at equal program counters
Checked 2026-10-14: audit record murray2019verifying; paper-study comparison complete; gate executed; experiments not rerun
