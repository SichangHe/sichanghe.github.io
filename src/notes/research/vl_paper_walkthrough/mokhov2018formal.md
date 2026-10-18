# Formal Verification of Spacecraft Control Programs Using a Metalanguage for State Transformers
(authored by agents unless marked 🧑)
Tag: `mokhov2018formal`, [paper](http://arxiv.org/abs/1802.01738v1)

## scope and contribution

The paper presents a single Haskell-embedded state-transformer semantics for the REDFIN spacecraft processor. The paper uses the same semantics for concrete simulation, symbolic simulation, and SMT proofs; it states that it can also be compiled for code generation, but demonstrates only the compilation of a high-level expression to REDFIN instructions. The authors state: “The approach uses a metalanguage to describe the semantics of a program as a state transformer, which can be compiled to multiple targets for testing, formal verification, and code generation.” (abstract, p. 1)

REDFIN is a small, deterministic processor intended for FPGA spacecraft electronics. Its data path is configurable from 8 to 64 bits, instruction words are 16 bits, and it has 47 instructions (p. 3). The core has no caches, pipeline, speculative execution, interrupts, or concurrent effects on subroutine timing (pp. 3–4). Inference: these restrictions are hardware design choices that the verification model relies on, rather than results established by the program proofs.

## technique 1: explicit symbolic state-transformer semantics

What it is. The complete machine state is a product of register bank, memory, instruction counter and register, program, flags, and clock. The authors write: “The state space of the entire processing core is a Cartesian product of state spaces of every component.” (section 3.1, p. 4) Each instruction and program denotes a function `T : S -> S`; a one-instruction program is fetch, counter increment, and instruction execution, while a composite program composes the transformer of its tail with the head (section 3.2, pp. 5–6).

How to apply it. Define symbolic types for every state component using SBV arrays and bit-vector values. Define a `Redfin a` state monad whose `transform` maps a state to a value and next state. Implement each instruction as a transformer, compose an execution cycle with `do` notation, and model conditional effects with symbolic `ite`. For example, the paper’s `abs` reads a register, computes `Prelude.abs`, sets `Overflow` in one candidate state when the result is negative, merges the candidates with `ite`, and writes the result (section 3.2, p. 7). A branch instruction reads `Condition`, computes `ite condition (ic + offset) ic`, and writes the counter (p. 7).

Evidence and limits. This encoding gives one executable semantics for simulation and proof, but the authors explicitly admit: “Our monadic metalanguage is embedded in Haskell and does not have a rigorous formalisation, i.e. we cannot prove correctness of the REDFIN semantics itself.” (section 6, p. 15) The machine model, instruction definitions, and SBV translation therefore remain trusted assumptions. The paper reports no proof that hardware implements this model.

Inference: In Verus, represent the executable machine state as a Rust struct and define a pure `spec fn` for the mathematical transition of each instruction. Keep the executable step function and its `ensures` contract separate; prove that one step refines the spec with `proof fn` lemmas. Use `requires` for valid addresses and bounded machine values, and `ensures` for the resulting state. Verus has no Haskell state monad or SBV `ite` API requirement; symbolic branching is expressed by ordinary Rust conditionals in executable code plus specifications and proof lemmas. This is an inference because the paper does not discuss Verus.

## technique 2: bounded symbolic simulation

What it is. `simulate steps state` recursively executes exactly `steps` cycles. If `Halt` is set, it keeps the current state; otherwise it transforms the state once and recurses. The paper says: “In each state we need to merge two possible futures depending on the value of the Halt flag: (i) continue the simulation starting from the nextState if the flag is not set, and (ii) remain in the current state if the flag is set, since in this case the processor must remain idle.” (section 3.3, p. 8)

How to apply it. Choose a step bound at least as large as the expected program execution. Initialize a symbolic state with `boot`, fixing the program and making selected inputs symbolic. Run `simulate`; project the output register, flags, memory, clock, or other state fields. Concrete values use the same function, so a printed memory dump is a test while symbolic values produce an SMT formula. The energy example simulates 100 steps and prints six memory cells and register `r0`, obtaining `Memory dump: [10, 5, 3, 5, 5, 100]` and `R0: 20` (section 4, pp. 9–10).

Evidence and limits. The paper does not provide a general termination proof from `simulate`; its energy theorem requires `halted` after the chosen 100 steps, so termination within 100 steps is checked for that program only. Inference: a fixed bound establishes behavior only for executions that finish within that bound, and the choice of bound (at least the expected program length) is left to the engineer. Inference: a Verus proof should instead expose a loop or recursion invariant stating that the remaining instruction count decreases and that halted states are stable, then prove the bound is sufficient for the particular program.

## technique 3: contract checking with quantified inputs and counterexamples

What it is. Functional requirements are written as SBV properties over universally quantified symbolic inputs. The energy program computes `abs (t1 - t2) * (p1 + p2) div 2`. The first requirement assumes only non-negative `p1` and `p2`, requires halt, equality with the high-level expression, and non-negative output (section 4, pp. 10–11).

How to apply it. Quantify every input with `forall`; constrain the environmental assumptions; initialize symbolic data memory; simulate; extract result and flags; return a conjunction of required postconditions. Run `proveWith z3`. The unconstrained-time property generated an SMT formula with 122 clauses and was falsified in 3.0 seconds on a 2.90 GHz Intel Core i5-4300U with 8 GB RAM, Z3 4.5.1 (section 4, p. 11). The counterexample was `t1 = 5190405167614263295`, `t2 = 0`, `p1 = 149927859193384455`, `p2 = 157447350457463356`; overflow made the result negative. The paper’s exact conclusion is: “The solver has found a counterexample demonstrating that the program does not satisfy the above requirement.” (p. 11)

Refinement is done by adding mission bounds: each time is non-negative and at most 30 years in milliseconds, and each power is between zero and one watt in milliwatts. The strengthened formula has 134 clauses and Z3 returns `Q.E.D.` in 4.8 seconds (p. 11). This is a specification-repair loop: use the counterexample to discover missing environmental assumptions, then rerun the proof.

Inference: In Verus, encode the input bounds as `requires` clauses on the verified function, return the mathematical result in an `ensures` clause, and prove arithmetic overflow safety with intermediate `proof fn` lemmas or range facts. The Rust implementation must use a representation whose arithmetic behavior is modeled; Verus contracts do not automatically make machine overflow impossible. This Verus mapping is an inference.

## technique 4: equivalence checking for hand optimization

What it is. A typed high-level expression is compiled to REDFIN instructions, then an optimized handwritten assembly program is checked against it on every valid input. The paper says a direct unoptimised translation of the high-level expression uses 79 instructions, while a hand-written program uses 9 (section 4, pp. 11–12). The paper gives the complete nine-instruction shape: load `t1`, subtract `t2`, absolute value, load and add powers, store, multiply, arithmetic shift right by one, halt.

How to apply it. Quantify the same inputs and apply the mission constraints. Boot and simulate both programs for the same bound. Extract `r0` from both final states and assert equality. The paper reports 52 SMT clauses and `Q.E.D.` in 11.5 seconds (section 4, p. 12); the machine and solver setup are the same as above. Because equality is checked for all constrained inputs, an engineer can replace generated code with hand-crafted code while preserving the checked functional behavior.

Inference: In Verus, define a reference `spec fn` and prove the optimized executable function’s `ensures` equals that specification. For two executable implementations, prove a lemma relating their returned values under identical `requires` bounds. Verus does not execute both programs symbolically by default, so the state relation and arithmetic lemmas must be written explicitly. This is an inference.

## technique 5: SMT optimization for timing bounds

What it is. The state includes a clock, and every instruction transformer adds its cycle cost with `delay`. The authors use SBV optimization with existential inputs to minimize and maximize the final clock. The exact property is `optimize Independent`, with `minimize "Best case"` and `maximize "Worst case"` (section 4, p. 13).

How to apply it. Add clock updates to every instruction and memory/register access, constrain the legal input range, simulate the program, and optimize the final clock. In the example, the authors modify the semantics of `abs` to add one extra cycle for a negative argument, to make the example more interesting. Z3 finishes in 0.5 seconds; the best case is 12 cycles and the worst case 13, with the worst case attained when `t1 - t2 = -2` (section 4, p. 13). The reported objective models show concrete witnesses for both extrema.

Inference: In Verus, express a per-step cost in the state and prove a loop invariant relating elapsed cost to executed instructions and branch cases. Verus proves inequalities and bounds but is not an optimization engine; extrema would require a separate bounded search or a proved analytical bound. This is an inference.

## what is proved, measured, and trusted

With Z3, the paper shows that the energy program violates the first requirement, proves the bounded-input energy postcondition (non-negative result, halted, equal to the Haskell expression) within 100 simulation steps, proves equivalence of the two implementations on the bounded inputs, and finds timing extrema for the modeled REDFIN semantics. It measures clause counts and solver times: 122 clauses/3.0 s for the failing property, 134/4.8 s after refined bounds, 52/11.5 s for equivalence, and 0.5 s for timing optimization, all on the stated laptop and Z3 4.5.1. It reports that typical programs have hundreds of instructions; testing yields sub-second SMT problems, while formal verification of hundreds-instruction programs took 10–15 minutes (section 5.2, p. 14). It also warns that a single multiplication-factorization problem can take half an hour (p. 14).

Trusted parts include the Haskell/SBV implementation, the translation to SMT, Z3, the chosen 100-step bound, the REDFIN model, the compiler from high-level expressions, and the environmental assumptions. Hardware correctness is future work. The paper itself says: “Although proving properties about the hardware implementation is left for future work, the developed infrastructure provides a way to generate testsuites for the processing core from the formal semantics of REDFIN instructions.” (section 5.2, p. 14)

Inference: For agent-written verified Rust, the direct product risk is high when generated code depends on an incomplete machine or arithmetic model: a passing proof can certify the wrong state transformer. The reusable low-risk idea is the single semantic source for tests, proofs, and code, provided the model-to-hardware and compiler links receive independent evidence. This risk assessment is an inference.

## what VL should not redo

Inference: the paper already demonstrates the basic single-source pattern, bounded symbolic execution, counterexample-guided contract refinement, equivalence checking, and clock optimization for a small deterministic processor. A new VL experiment should measure a distinct boundary, such as whether an agent can infer environmental bounds and preserve equivalence while changing real Rust implementations. Repeating the same REDFIN energy example would add no new evidence.

## techniques for the catalog

- explicit state-transformer semantics — model every machine component as a symbolic state and compose instruction transformers
- bounded symbolic simulation — execute a fixed number of cycles while merging halted and continuing symbolic states
- counterexample-guided contract refinement — quantify inputs, prove an SMT postcondition, then strengthen assumptions from a counterexample
- equivalence checking — prove optimized low-level code returns the same result as a typed reference on all constrained inputs
- timing optimization — add clock costs and use SMT minimization/maximization to obtain best and worst execution witnesses
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "However, to formally verify their functional correctness, we need to inspect every valid combination of input values, which can be done by an SMT solver."): I read the whole paper text and the whole study, and checked every quotation, page and section reference, number (47 instructions, 8 to 64 bits, 16-bit words, 122/134/52 clauses, 3.0/4.8/11.5/0.5 s, 79 vs 9 instructions, 12 and 13 cycles, counterexample values, 10-15 minutes, half an hour), the Z3 4.5.1 laptop setup, the code descriptions and the tag line (authors, year 2018, arXiv 1802.01738v1 link as printed in the paper). I changed: the section reference of the rigorous-formalisation quote (section 6, not 5.1), the simulate quote (now complete), the code-generation claim (stated, not demonstrated), the 100-step termination wording, the 79/9-instruction page range (pp. 11-12), the abs timing note (the paper modifies abs for the example), the proof summary sentence, and added Inference labels to unsupported conclusions. I did not check the Verus mappings (marked Inference, not in the paper), the cited references, or any claim about the unreleased REDFIN toolchain.
