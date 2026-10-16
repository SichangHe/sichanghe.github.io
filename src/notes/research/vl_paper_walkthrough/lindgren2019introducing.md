# Introducing Certified Compilation in Education by a Functional Language Approach
(authored by agents unless marked 🧑)
Tag: `lindgren2019introducing`, [paper](https://doi.org/10.4204/eptcs.295.5)

## result and setting

This paper reports a nine-week, half-time introductory compiler course that teaches semantic modelling and certified compilation to students with little formal-methods experience. The implementation uses OCaml, Why3, SMT solvers, and extraction to OCaml; students build and verify a compiler for a small imperative language called “imp”. The authors state, "Targeting students with little or no experience in formal methods, the proof process is highly automated using the Why3 framework" (abstract, p. 65).

Inference: the course is a process template for teaching or bootstrapping VL contributors. It does not evaluate Rust or Verus; mappings below are inferences.

## technique 1: choose a small semantics-first language and an extractable verifier

what it is and when to use it

The course deliberately limits the source language so that syntax, semantics, VM execution, and compilation correctness fit into nine weeks. The authors caution that “advanced language features, like object orientation, subtyping, type classes/traits, etc. will be out of reach for modelling and proofs in an introductory course” (section 2.1, p. 67). Why3 separates Why specifications from WhyML implementations, generates verification conditions, and calls SMT solvers; the paper says, "Why3 integrates to a variety of Satisfiability Modulo Theories (SMT) solvers for discharging Verification Conditions (VCs) generated for WhyML programs" (section 2.2, p. 67).

how to apply it

1. define a small AST and an operational semantics before writing the compiler (sections 3.1 and 3.2, pp. 68–70)
2. implement semantic functions in WhyML and prove their contracts with automatically generated VCs (section 2.2, p. 67)
3. use extractable data types so verified WhyML code can become executable OCaml; map proof-only theories away from the extracted program (section 2.2, p. 67)
4. keep optional language extensions as desugarings into the verified core (section 3.2, p. 69)

Verus form

Inference: define Rust data types and executable functions for the core language, then write `spec fn`s for mathematical semantics and `requires`/`ensures` contracts for each interpreter/compiler phase. Use proof lemmas to relate executable ASTs to specification sequences or maps. Verus erases proof code rather than extracting WhyML, so the executable Rust must itself carry the implementation used after verification.

evidence and limits

The course evaluation had 20 students; more than half answered each question. Students rated practical labs 4.9/6.0, teaching 5.2/6.0, and overall impression 4.9/6.0 (section 4.1, pp. 73–74). All students met Grade 3 requirements, half met Grade 4, and a handful achieved Grade 5 (section 4.2.3, p. 75). These denominators are course participants and respondents, not a controlled educational experiment. The authors also report incomplete Why3 documentation and fragmented course materials as problems (sections 4.1–4.2, pp. 74–75).

## technique 2: inductive structural operational semantics and fuelled partial correctness

what it is and when to use it

The “imp” VM is specified using small-step and big-step Structural Operational Semantics (SOS), stores, configurations, and inductive predicates. Expression evaluation is recursive; sequences and loops are not structurally decreasing, so the VM receives a fueling parameter. The paper states, "a fueling parameter is added, decreasing for each iteration (rendering a proof of partial correctness), where the VM is guaranteed to either return with an out of fuel error or a correct (final) configuration" (section 3.2, p. 70).

how to apply it

1. define lookup, arithmetic and Boolean reduction, assignments, sequencing, conditionals, and loops as SOS rules (section 3.2, p. 70)
2. encode command execution as an inductive predicate and prove transitivity (section 3.2, p. 70)
3. implement expression evaluation recursively over algebraic syntax and prove its recursive cases (section 3.2, p. 70)
4. add fuel that decreases on each sequence/loop iteration; return an explicit out-of-fuel result (section 3.2, p. 70)
5. prove partial correctness: if execution returns a final configuration, it satisfies the SOS relation (section 3.2, p. 70)
6. back the logical store map with a list so the verified model can be extracted to executable OCaml (section 3.2, p. 70)

Verus form

Inference: represent the SOS relation as an inductive-style `spec fn` or recursive predicate over configurations and use a `fuel: nat` argument in a recursive proof. Prove that each recursive call decreases fuel with a `decreases` clause. Use `ensures` to relate the VM result to the SOS predicate and an explicit error variant. Verus’s recursive specification and proof syntax must be checked against the project’s supported constructs; the semantic pattern, rather than Why3 syntax, is the transferable part.

evidence and limits

The paper explicitly targets partial rather than total correctness: total correctness would require a well-founded termination measure for loops (footnote 7, p. 70). For any terminating program, some fuel exists, but a poor bound yields an out-of-fuel result; this is a proof interface assumption, not a proof that the original program terminates.

## technique 3: Hoare logic and weakest-precondition/VC generation

what it is and when to use it

The course teaches preconditions, postconditions, Hoare triples, rules for skip, assignment, composition, conditionals, while, and consequence, then computes weakest liberal preconditions for loop-free code and approximations for loops. The paper says, "From there we introduce an algorithm for computing Verification Conditions (VCs), but omit formal proof of correctness" (section 3.2, p. 70).

how to apply it

1. state a precondition and desired postcondition for each command (section 3.2, p. 70)
2. apply the Hoare rule matching the command structure; use consequence to strengthen preconditions or weaken postconditions (section 3.2, p. 70)
3. compute weakest liberal preconditions for loop-free fragments (section 3.2, p. 70)
4. supply a loop invariant for while commands and generate a VC for initialization, preservation, and exit (section 3.2, p. 70)
5. discharge generated VCs as Why3 tasks with SMT solvers (section 3.2, p. 70)

Verus form

Inference: write the pre/postconditions as `requires` and `ensures`; put loop invariants directly on `while` loops. Use `assert` and `proof fn` lemmas for arithmetic steps that automation cannot infer. A Verus contract proves the supplied invariant and postcondition, while a separately implemented WP generator would need its own specification and proof.

evidence and limits

The paper’s WP/VC algorithms are shallow Why embeddings, and the authors explicitly omit a formal proof that the generator itself is correct (section 3.2, p. 70). This means the student compiler proofs rely on Why3’s generated obligations and solver correctness, plus trust in the embedded generator.

## technique 4: compiler correctness by compositional preservation

what it is and when to use it

Students verify a stack-machine backend, MIPS code generation, register allocation, and AST transformations. For expression compilation they prove that generated code preserves arithmetic and Boolean meaning; for AST optimizations they prove semantic preservation and integrate extracted code into the compiler. The authors assign transformations such as constant reduction, structural equality, dominance, and dead-code removal and require proofs that the transformations preserve semantics (section 3.2, p. 71).

how to apply it

1. define source and target semantics and a relation between source values and target stack/register states (sections 3.2–3.3, pp. 70–72)
2. prove each expression compiler preserves evaluation, then lift the result to commands (section 3.2, p. 71)
3. implement a simple stack-based code generator and test assembled output (section 3.2, p. 71)
4. implement register allocation for expression trees and prove its correctness, optionally in WhyML (section 3.2, p. 71)
5. model AST transformations and prove semantic preservation; integrate extracted implementations and compare optimized/unoptimized code (section 3.2, p. 71)
6. use Coq interactively for proof obligations that Why3 automation cannot close; Why3 can export tasks to Coq (section 3.2, p. 72)

Verus form

Inference: model source/target correspondence with a relation `spec fn` over ASTs, stacks, or register maps. Give each compiler phase a contract preserving that relation, then prove composition lemmas. Use ghost maps for register allocation and `Seq` models for instruction lists. Keep the generated executable separate from proof-only correspondence data.

evidence and limits

The course uses boilerplate to focus students on semantics and proofs; assignments are open-ended with mandatory and optional proof depth (section 2.3, p. 68). The authors report that moving to Why3 1.0 would replace the manual fueling workaround with WhyML’s native `diverges` contract for partial correctness (section 4.3, p. 76). That change illustrates that termination engineering is tool-version dependent.

## trust, reuse, and threat to VL

The paper’s certified path assumes Why3, SMT solvers, extraction, OCaml, assembler/linker, and the MIPS simulator are correctly implemented (section 2.2, p. 67). It proves the selected “imp” compiler components against the specified SOS semantics; it does not prove the real C/OCaml/MIPS ecosystem or the omitted WP-generator correctness. Inference: for VL, the strongest reusable pattern is to start with a small verified kernel, add one semantic boundary at a time, and record every extraction, solver, library, and hardware assumption. The threat to agent-written verified Rust lies in specification scale: introducing advanced Rust features too early can push the proof workload beyond the available automation, just as object orientation and type classes were out of reach in this course.

## techniques for the catalog


- semantics-first scoping — choose a small core language whose syntax, execution, and compilation fit the proof budget

- fuelled partial correctness — add an explicit decreasing fuel parameter and prove correctness of successful executions

- Hoare VC generation — derive loop and command obligations from pre/postconditions and discharge them with SMT

- compositional compiler preservation — prove each phase preserves a source/target relation, then compose the phase lemmas

- extraction-aware teaching — use extractable verified data and executable code while stating the extraction and solver assumptions
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
