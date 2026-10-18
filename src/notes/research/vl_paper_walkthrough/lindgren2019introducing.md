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
3. use extractable data types so verified WhyML code can become executable OCaml (sections 2.2 and 3.3.2, pp. 67, 72); keep proof-only library theories, such as the Why3 standard-library maps, out of the extracted program, since they have no backing implementation (footnote 10, p. 70)
4. keep optional language extensions as desugarings into the verified core (section 3.2, p. 69)

Verus form

Inference: define Rust data types and executable functions for the core language, then write `spec fn`s for mathematical semantics and `requires`/`ensures` contracts for each interpreter/compiler phase. Use proof lemmas to relate executable ASTs to specification sequences or maps. Verus erases proof code rather than extracting WhyML, so the executable Rust must itself carry the implementation used after verification.

evidence and limits

The course had 20 students; the paper says that on average each question in the course evaluation was answered by more than half of them (section 4.1, p. 73). Students rated practical labs 4.9/6.0, teaching 5.2/6.0, and overall impression 4.9/6.0 (section 4.1, pp. 73–74); these are averages on a 6-point scale. All students met Grade 3 requirements, half met Grade 4, and a handful achieved Grade 5 (section 4.2.3, p. 75). These denominators are course participants and respondents, not a controlled educational experiment. The authors also report the lack of easily accessible Why3 documentation as a challenge (section 4.2.2, p. 75), and a student comment cites a "Lack of good information on Why3, somewhat fragmented feeling of lectures" (section 4.1, p. 74).

## technique 2: inductive structural operational semantics and fuelled partial correctness

what it is and when to use it

The “imp” VM is specified using small-step and big-step Structural Operational Semantics (SOS), stores, configurations, and inductive predicates. Expression evaluation is recursive; sequences and loops are not structurally decreasing, so the VM receives a fueling parameter. The paper states, "a fueling parameter is added, decreasing for each iteration (rendering a proof of partial correctness), where the VM is guaranteed to either return with an out of fuel error or a correct (final) configuration" (section 3.2, p. 70).

how to apply it

1. define lookup, arithmetic and Boolean reduction, assignments, sequencing, conditionals, and loops as SOS rules (section 3.2, p. 70)
2. encode command execution as an inductive predicate and prove transitivity (section 3.2, p. 70)
3. implement expression evaluation recursively over the algebraic syntax, which gives a well-founded termination condition (section 3.2, p. 70)
4. because sequences and loops are not structurally decreasing, add fuel that decreases for each iteration; the VM can return an out-of-fuel error (section 3.2, p. 70)
5. prove partial correctness of the VM against the SOS specification: it either returns an out-of-fuel error or a correct final configuration (section 3.2, p. 70)
6. back the logical store map with a list so the verified model can be extracted to executable OCaml (section 3.2, p. 70)

Verus form

Inference: represent the SOS relation as an inductive-style `spec fn` or recursive predicate over configurations and use a `fuel: nat` argument in a recursive proof. Prove that each recursive call decreases fuel with a `decreases` clause. Use `ensures` to relate the VM result to the SOS predicate and an explicit error variant. Verus’s recursive specification and proof syntax must be checked against the project’s supported constructs; the semantic pattern, rather than Why3 syntax, is the transferable part.

evidence and limits

The paper explicitly targets partial rather than total correctness: total correctness would require a well-founded termination measure for loops (footnote 7, p. 70). The paper states that for any terminating program a fueling parameter exists that renders a correct final configuration, because "imp" does not model execution errors (footnote 9, p. 70), and that ambitious students find the fuel measure by tracing SOS reductions (section 3.2, p. 70). Inference: a too-small fuel bound yields an out-of-fuel result, so fuel is a proof interface, not a proof that the original program terminates.

## technique 3: Hoare logic and weakest-precondition/VC generation

what it is and when to use it

The course teaches preconditions, postconditions, Hoare triples, rules for skip, assignment, composition, conditionals, while, and consequence, then computes weakest liberal preconditions for loop-free code and approximations for loops. The paper says, "From there we introduce an algorithm for computing Verification Conditions (VCs), but omit formal proof of correctness" (section 3.2, p. 70).

how to apply it

1. state a precondition and desired postcondition for each command (section 3.2, p. 70)
2. apply the Hoare rule matching the command structure; use consequence to strengthen preconditions or weaken postconditions (section 3.2, p. 70)
3. compute weakest liberal preconditions for loop-free fragments (section 3.2, p. 70)
4. Inference (not stated in the paper): for while commands, the approximation of the weakest precondition needs a loop invariant, whose VCs cover initialization, preservation, and exit
5. discharge generated VCs as Why3 tasks with SMT solvers (section 3.2, p. 70)

Verus form

Inference: write the pre/postconditions as `requires` and `ensures`; put loop invariants directly on `while` loops. Use `assert` and `proof fn` lemmas for arithmetic steps that automation cannot infer. A Verus contract proves the supplied invariant and postcondition, while a separately implemented WP generator would need its own specification and proof.

evidence and limits

The paper encodes the WP/VC algorithms as shallow embeddings in Why, and the lecture omits a formal proof of correctness of the VC algorithm (section 3.2, p. 70; section 3.3.3, pp. 72–73). Inference: the paper does not say that the student compiler proofs depend on this in-house generator; they use Why3's own generated obligations, so they rest on Why3 and the SMT solvers being correct (section 2.2, p. 67).

## technique 4: per-phase semantic preservation in compiler correctness

what it is and when to use it

What is proved in the course varies by part. Students implement and prove a VM against the SOS specification (section 3.3.2, p. 72). The stack-machine lecture reviews the proof approach from Double WP, focusing on arithmetic and Boolean expression compilation, with command-layer proof details only briefly reviewed (lecture 7, p. 71). The MIPS code generator is only required to pass assembling, linking and testing, with optional WhyML modelling for ambitious students (lecture 8, p. 71). Register allocation may be proved in WhyML by ambitious students, while others use OCaml (section 3.3.3, p. 73). For AST optimizations, students are assigned to model transformations such as constant reduction, structural equality, dominance, and dead-code removal in WhyML and prove semantic preservation, then integrate the extracted code (lecture 10, p. 71).

how to apply it

1. Inference: define source and target semantics and a relation between source values and target stack/register states; the paper gives the source SOS and the VM (sections 3.2–3.3.2, pp. 69–72) but does not describe such a relation for MIPS
2. review the proof that compiling expressions to the stack machine preserves arithmetic and Boolean evaluation, then the command layer more briefly (lecture 7, p. 71, as taught, not required of students)
3. implement an unoptimized stack-based code generator; at a minimum it must pass assembling, linking and testing (lecture 8, p. 71)
4. implement register allocation for expression trees; ambitious students prove it in WhyML, others implement it in OCaml (lecture 9, p. 71; section 3.3.3, p. 73)
5. model AST transformations and prove semantic preservation; integrate extracted implementations and compare optimized/unoptimized code (section 3.2, p. 71)
6. as covered in the final lecture, Why3 can export verification conditions with proof context to Coq, so an interactive proof is possible when automatic solvers do not suffice (lecture 12, p. 72)

Verus form

Inference: model source/target correspondence with a relation `spec fn` over ASTs, stacks, or register maps. Give each compiler phase a contract preserving that relation, then prove composition lemmas. Use ghost maps for register allocation and `Seq` models for instruction lists. Keep the generated executable separate from proof-only correspondence data. The paper does not state that the course composes phase proofs end to end.

evidence and limits

The course gives students boilerplate code as a baseline, and assignments are open-ended with a minimal passing requirement and optional requirements towards higher grades (section 2.3, p. 68). The authors say that with the move to Why3 1.0 non-termination of "imp" evaluation and VM execution is "now treated by the native diverges contract in WhyML", allowing partial-correctness proofs without fueling parameters (section 4.3, p. 76). Inference: this illustrates that termination engineering is tool-version dependent.

## trust, reuse, and threat to VL

The paper states that Why3 extraction gives a path for certified programming "given the assumption that the Why3 platform and SMT solver(s) are correctly implemented" (section 2.2, p. 67). The paper's other tools (OCaml, binutils assembler and linker, the SyncSim simulator) are used in the course (section 2.2, p. 67), and it does not claim to verify them. The proofs it describes are against the SOS semantics of "imp", whose integers are unbounded (footnote 8, p. 70); in 2016 students used signed MIPS operations that raise exceptions on arithmetic overflow, which the authors say ensures partial correctness (section 4.3, p. 76). Inference: for VL, the strongest reusable pattern is to start with a small verified kernel, add one semantic boundary at a time, and record every extraction, solver, library, and hardware assumption. The threat to agent-written verified Rust lies in specification scale: introducing advanced Rust features too early can push the proof workload beyond the available automation, just as object orientation and type classes were out of reach in this course.

## techniques for the catalog


- semantics-first scoping — choose a small core language whose syntax, execution, and compilation fit the proof budget

- fuelled partial correctness — add an explicit decreasing fuel parameter and prove correctness of successful executions

- Hoare VC generation — derive loop and command obligations from pre/postconditions and discharge them with SMT

- per-phase semantic preservation — prove a phase (here the VM, optionally register allocation, and AST transformations) preserves the specified semantics; Inference: composing such phase proofs is the natural next step, not shown in the paper

- extraction-aware teaching — use extractable verified data and executable code while stating the extraction and solver assumptions
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The compiler should be able to generate assembly output, and at a minimal pass assembling, linking and testing."): I read the whole paper and checked every quotation, number (20 students, 9 weeks, ratings 4.9/5.2/4.9, grade outcomes), section/page reference and technique step against it; I changed the claims that overstated what students prove (only the VM, optionally register allocation, and AST transformations are student proofs; MIPS code generation is only tested), the trust assumptions (the paper names only Why3 and the SMT solvers), the respondent count wording, the fragmented-lectures attribution, the loop-invariant step and the dependence on the in-house WP generator (now marked Inference), and the catalog entry on composition; I did not check the cited external works (Double WP, CompCert, register-allocator gallery) or the Verus mappings beyond confirming they are labelled Inference.
