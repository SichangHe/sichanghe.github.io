# Testing, Credible Compilation, and Verification in the Axon Verified Compiler in Lean and Claude Code
(authored by agents unless marked 🧑)
Tag: `rinard2026testing`, [paper](https://arxiv.org/abs/2605.01660)

source: Martin C. Rinard, arXiv:2605.01660v3 (31 Jul 2026), PAgE '26 workshop, 13 pages, no appendix; code at https://github.com/rinard/Axon

earlier record in the notes: `distributed_verification_db/topic_agents.md`, entry "Axon (2026)", marked there as "parts read". Two of its lines do not match this paper. It says one optimization has about 1,000 lines of code and over 4,500 lines of proof; in the paper that is the certificate checker, not an optimization (Section 5.2, p.8, quoted under technique 2). It says the bugs were in the unverified parser, printer and machine model; the paper's listed bugs are in the code generator, the register allocator, the optimizations, their certificates and the checker (Sections 4.1 to 4.3, pp.5-6). Everything below is beyond that record.

## what the paper is

An experience report by one human supervisor. Claude Code (Opus 4.6/4.7) wrote, in Lean 4, a compiler from a small Fortran-like language to ARM64 assembly, its semantics, and its proofs. The human did not read the verified code: “The correctness proofs eliminated any need to audit or even examine checked or verified code for correctness and I did not do so.” (Section 1.1, p.1). The paper teaches how four validation methods (testing, checked certificates, proofs, audits) were divided over the parts of one system, and which agent failure modes showed up while proving.

Pipeline (Figure 1, p.2; Section 2, p.2): text → parser → AST → flattening → TAC (three address code) → optimization passes, each emitting TAC plus a certificate → certificate checker → code generator → ASM → pretty printer → text assembly. Parser and pretty printer are unverified. AST → TAC and TAC → ASM are proved. Optimizations are unproved but checked per run.

## the theorems, the measurements, and the trusted list

proved (Section 5.3, p.8), all about the verified compiler driver, AST data structure in, ASM data structure out
- characterization: a produced ASM program can only halt, stop with a divide by zero error, stop with an out of bounds error, or diverge
- refinement: any such behavior of the ASM program is also a behavior of the AST program; for a halt, the declared variables and arrays hold identical values
- totality: a well formed AST program always yields an ASM program
- checker correctness: if the certificate checker accepts, the original and transformed TAC programs satisfy well formedness, refinement and characterization (Section 2.1, p.3)

measured
- size: 38,188 non-blank non-comment Lean lines, of which `theorem` 30,997, `def` 5,680, `partial def` 750, `inductive` 529, `structure` 166, `abbrev` 28, `instance` 25, `opaque` 7, `axiom` 6 (Table 1, p.7); the nine rows sum to 38,188
- time: 34 days, one supervisor, one sequential agent (Section 3, p.3; Section 6, p.11)
- run time and compile time on the 24 Livermore kernels, best of 5, one MacBook Pro M4 Pro (Tables 3 and 4, p.10)

trusted, by the paper's own list (Section 4.4 "Supervisor Audits", p.6; Section 5.1, p.7)
- the source semantics, which is the specification: roughly 200 lines
- the ASM small step semantics: roughly 500 lines
- the parser: roughly 650 lines
- the ASM pretty printer: roughly 580 lines, of which roughly 250 emit the verified instructions and the rest is prologue, epilogue, stack frame sizing and error handlers
- Lean 4, assembler, linker, operating system, hardware
- 6 lines of `axiom` and 7 of `opaque` about IEEE floating point: language and machine float operations are identical, and float addition commutes
- none of the first four was rigorously audited: “While I scanned these unverified components and concluded that they look broadly plausibly correct, I did not attempt a rigorous audit.” (Section 4.4, p.6)

## technique 1: split a system into proved phases and checked phases

what it is: decide per component whether to prove it once (full verification) or leave it unproved and check each of its outputs with a proved checker (credible compilation, also called translation validation). “Axon adopts a hybrid verification strategy — verification for the unoptimized AST → ASM path and credible compilation for the optimization passes.” (Section 2.2, p.3)

when to use which, as the paper argues it (Section 2.2, p.3)
1. prove a component when it is implemented once and its proof is a plain induction with exhaustive case analysis over language constructs; the paper calls such proofs a good fit for current coding agents
2. prove it when you need totality; a checker can reject, so a checked phase cannot be shown to always produce output
3. check a component when it changes often: “Credible compilation supports this rapid development because optimization changes typically do not trigger proof updates and can be safely deployed as soon as the changes are implemented.” (Section 2.2, p.3)
4. check it when proving it would need heavy theory; for dataflow optimizations the paper names lattice theory, Galois connections, and abstraction and concretization functions
5. check it when a partly wrong implementation is still useful, because wrong outputs are discarded
6. arrange the driver so the proved path alone always gives a correct, possibly slower, result, and each checked step is optional: the driver runs the optimizations “(discarding any that do not pass the certificate checker)” (Section 5.3, p.8)

Verus form (Inference: the paper uses Lean, not Verus)
- proved phase: an exec function with `requires` on input well formedness and `ensures` relating output to input through a `spec fn` semantics
- checked phase: the producer is ordinary unverified Rust; one way to keep Verus from looking inside it is `#[verifier::external_body]` on the producer with no `ensures`, so nothing about its result is assumed. A verified exec function `check(orig, new, cert) -> (ok: bool)` carries `ensures ok ==> refines(new@, orig@)`, with `refines` a `spec fn`. The caller keeps `new` only when `ok` holds, else keeps `orig`
- what does not carry over: Lean's `partial def` (Section 5.1, p.7) lets a caller's proof quantify over every possible return value. Inference: in Verus the same effect comes from the producer having no postcondition
- what changes: Lean proofs here are tactic scripts found by search; Verus proofs are mostly `requires`, `ensures`, `invariant`, `decreases` and `assert` hints discharged by an SMT solver, so the paper's observation that proof search dominates wall clock time (Section 3.1, p.4) is not evidence about Verus

evidence
- delivery gap: “Nevertheless, because of long proof times, the implemented functionality typically ran well ahead of the verification and the project spent most of its time unverified.” (Section 3, p.4). The paper adds that this gap was much smaller for checked components than for proved ones; it gives no number
- a new register allocation spill heuristic was suggested, implemented and tested by the agent in under an hour, improving performance by up to a factor of 1.85: “Because the register allocator uses a credible compilation approach, the update required no proof changes and was therefore immediately deployable.” (Section 4.4, p.6)

where it fails or what it assumes
- “A tradeoff is that optimizations may fail and be discarded when compiling programs that exercise optimization bugs.” (Section 2.2, p.3)
- checking costs time on every run (technique 2, evidence)
- Inference: the paper compares the two styles inside one project by one person with no control; the quantitative comparison is in a separate paper it cites as [36], not here

## technique 2: certificates with program-point and relational invariants, checked by a proved checker

what it is: the unproved pass emits its output plus a certificate; a proved checker accepts only if the certificate establishes the property. “A certificate checker rejects the optimization if the certificate does not establish these properties.” (Section 2.1, p.3)

how it is done
1. certificate contents, as sketched in the day-1 prompt (Section 5.4 "Certificate Infrastructure", p.9): the original and transformed programs; invariants on each program; a mapping from transformed commands to original commands; a function from transformed variables to original expressions; a function from each control flow transition in the transformed program to zero or more transitions in the original
2. two invariant kinds (Section 5.2, p.7): single program invariants hold at one program point; relational invariants hold between a point in the transformed program and a point in the original
3. invariant forms in use (Section 5.2, p.8): a variable equals a constant; a variable equals a binary operation of two variables; a variable equals a float add of a variable and a float multiply of two variables; relationally, a transformed variable equals an original variable or constant
4. prove once: checker accepts implies well formed output, refinement and characterization (Section 2.1, p.3)
5. on reject, drop that pass's output and continue (Section 5.3, p.8)
6. not in the paper: the checking algorithm itself; the paper cites the original credible compilation report [37] and the repository for it

evidence
- size: “The certificate checker implementation comprises roughly 1000 lines of code with the proof of correctness comprising over 4,500 lines of code.” (Section 5.2, p.8). All nine optimizations together are roughly 1,350 lines, about half optimization and half certificate generation (same paragraph)
- agent ability: the agent wrote certificate generators with no supervision for every pass except Loop Invariant Constant Motion (LICM), which needed several hints on certificate structure and a debugging session (Section 5.2, p.8)
- three rejection causes, all seen (Section 4.2, p.5): a wrong optimization; a wrong certificate for a right optimization; a checker too narrow for a right certificate
  - wrong optimization: early LICM assumed a variable assigned a constant in a loop holds that constant throughout the loop; rejected for a loop assigning several constants to one variable. “Here credible compilation enables the safe deployment of an optimization that is, in general, unsound but can be successfully applied in the common case.” (Section 4.2, p.5)
  - wrong certificate: Dead Assignment Elimination certificates claimed the removed assignment's variable held the assigned value; rejected, then fixed by the agent (Section 4.2, pp.5-6)
  - narrow checker: it only accepted comparisons with a variable on the left; LICM needed a constant on the left; fixing it generalized the checker to general expressions and cascaded into its proofs, days 22 to 24 (Section 4.2, p.5; Section 5.4, p.9)
- cost: “For more lightweight optimizations the certificate checking overhead is substantial, comprising roughly 90% or more of the total optimization overhead.” (Section 5.6, p.10). For Dead Assignment Elimination about 30%; for Register Allocation under 2% (same section). Optimized compile times in Table 4 (p.10) run from 0.37 s to 102.84 s against 0.11 s to 1.08 s unoptimized

Verus form (Inference)
- certificate as a plain Rust struct with a `View` to a spec-level value; invariants as data, with a `spec fn holds(inv, state) -> bool`
- checker as an exec function returning `bool` with `ensures ok ==> ...`; the soundness argument as a `proof fn` over the `spec fn` semantics, called from the checker's proof blocks
- quantified facts about all program points would be `forall` in `ensures`, which in Verus needs trigger choice (`#[trigger]`); Lean has no counterpart of this concern, and the paper says nothing about it

where it fails or what it assumes
- Inference: an over-narrow checker costs optimization, not correctness (a rejected pass is discarded, Section 2.2, p.3); nothing in the theorems says how often passes are accepted. The paper reports no acceptance rate
- the bounds check elimination at the start of TAC → ASM uses interval invariants and is not a certificate-checked pass (Section 5.2, p.8)

## technique 3: twin checkers joined by a bridge theorem

what it is: write the checker twice, once as a logical formula and once as executable code, and prove them equivalent. “A bridge theorem establishes the equivalance of the two frameworks, with the executable checker running in the compiler and the propositional checker supporting effective proof factoring.” (Section 5.4, p.9)

how it is done (Section 5.4, p.9)
1. propositional checker: a formula true exactly when the certificate checks; the agent created this first ("initially")
2. executable checker: code returning true or false; added in response to the supervisor's guidance
3. bridge theorem: the two agree; proved on day 3
4. checker correctness theorem: if the checkers return true, the original and transformed programs are semantically equivalent; proved on day 6
5. the checker frameworks and theorems were updated throughout as language features were added (the paper's Section 5.4 says the key properties were essentially proved by day 26 and refinements continued until day 33)

Verus form (Inference): this split is native. The formula is a `spec fn check_spec(...) -> bool`; the code is an exec function with `ensures ok == check_spec(orig@, new@, cert@)`, which is the bridge; the correctness theorem is a `proof fn` with `requires check_spec(o, n, c)` and `ensures refines(n, o)`. What does not carry over: in Lean the bridge is a separate theorem about two definitions; in Verus it is the postcondition of the exec function, re-proved whenever the code changes.

evidence: dates only (days 1, 3, 6, 26, 33). No ablation shows that one checker alone would have been harder.

## technique 4: a three-theorem contract that rules out the empty implementation

what it is: state correctness as refinement plus characterization plus totality, because the first two alone are satisfied by a compiler that rejects everything. “This closes the loop — a hypothetical driver that rejected all AST programs would satisfy the characterization and refinement theorems.” (Section 5.3, p.8)

how it is done (Section 5.3, p.8)
1. define well formed input by executable checks: it type checks, has no duplicate declarations, uses no reserved names (those starting with `__`), has no goto
2. characterization: enumerate every allowed outcome; termination is stated as the program counter reaching a named termination block; divergence as, for all N, N steps are possible without terminating
3. refinement: each target outcome is a source outcome; fix what is observable (declared variables and arrays, not temporaries or registers); the compiler computes a layout relating their addresses
4. totality: well formed input implies output is produced

Verus form (Inference): an exec function `compile(p) -> (r: Option<Asm>)` with `ensures r.is_some() ==> refines(r.unwrap()@, p@)` and `ensures well_formed(p@) ==> r.is_some()`. The second clause is the totality theorem. Divergence quantified over all N is a `forall` over step counts in a `spec fn`.

where it fails: the refinement direction is target to source only. Inference: a nondeterministic source semantics could allow behaviors the target never shows; the paper does not discuss this.

## technique 5: make a hard theorem easy by adding a run-time check upstream

what it is: when a proof stalls because the needed property of the input is hard or false, stop proving and add a check in an earlier component that establishes the property. “The agent sometimes started to spin trying to prove difficult or false theorems where the best solution was to widen the scope and introduce additional checks elsewhere that made the theorem easy to prove.” (Section 3.2, p.4)

how it is done, from the paper's cases
1. notice the agent spinning on a property of an intermediate form needed by a later phase (Section 3.2, p.4)
2. move the obligation: add a check or extra structure to the certificate checker or the flattener; the named example is explicit typing information for compiler temporaries (Section 3.2, p.4)
3. a second case: the code generator's simulation proof needs writes to one TAC register not to change another, but integer and boolean TAC registers could alias one machine register. “The proof failed until the certificate checker contained a check ensuring that distinct TAC registers map to distinct machine registers.” (Section 4.3, p.6)
4. not in the paper: a rule for when to stop proving and widen; the paper only says a more self-aware agent would help

Verus form (Inference): turn the stuck `assert` or `ensures` into a `requires` of the later function, then discharge that `requires` by an exec check in the earlier function whose `ensures` states the checked fact; or carry the fact in a struct with `#[verifier::type_invariant]`. What changes: the check costs run time and can fail, so the totality clause of technique 4 must be re-examined.

where it fails: Inference: the paper does not say who added the checks in each case, and says a more self-aware agent that can pull back and widen scope would help, so it reports no autonomous widening.

## technique 6: cheap tests before proofs, and for what proofs cannot see

what it is: run differential and targeted tests first so that common bugs do not surface as failed proofs. “Here testing surfaced the bugs earlier and with less effort than surfacing the bugs in a failed proof attempt.” (Section 4.1, p.5)

how it is done (Section 4.1, p.5; Section 5.5, p.9)
1. have the agent write test programs and a reference version of each; compare outputs. Two of three reported bugs were found this way (signed remainder overwrote the dividend or divisor register; values allocated to reserved register x18)
2. have the agent write targeted tests for one feature; the bounds check bug (the branch tested a garbage register) was found this way
3. bring in an outside benchmark: the 24 Livermore kernels, introduced on day 18 (the agent extracted and translated them from Fortran, Section 5.5), ran correctly for the first time on day 20, and broke again at times until day 28 (Section 5.4, p.9)
4. turn each environment bug into an explicit check: after x18, a register usage check forbids x16, x17 and x18

evidence that testing covers what proof does not: “Because the machine model focuses on the behavior of the hardware and not the software, there is no obvious place to put this constraint in the machine model and a correctness proof can easily miss this case.” (Section 4.1, p.5)

evidence that proof covers what testing does not (Section 4.3, p.6): three bugs surfaced only as failed proofs. A float copy from a stack variable to a register variable generated no code; the variable collector skipped boolean expressions in conditionals and assignments; the register aliasing case of technique 5.

Verus form (Inference): unchanged in kind. ghost code is erased before compilation (the Verus papers), so exec functions compile as ordinary Rust and differential tests can run on them before the `ensures` is attempted (the test setup is unchecked). The x18 class of bug corresponds in Verus to a fact assumed at an `assume_specification` or `#[verifier::external_body]` boundary that the real platform does not satisfy.

where it fails: Inference: three bugs per method is a sample the author chose to discuss (“I discuss three bugs that testing surfaced.”, Section 4.1, p.5); no total counts are given.

## technique 7: plan, probe, revise, execute, with a validation step per item

what it is: the supervisor's loop for each next step (Section 3.1, p.4)
1. pick a next step: a language feature, an optimization, or a theorem
2. agent drafts a plan
3. agent identifies and runs probes, defined as experiments that resolve uncertainties or decision points in the plan
4. agent revises the plan from the probe results
5. agent executes item by item, updating the plan after each
6. “Each new item typically executed in a new session and completed with a validation step — for language feature additions often executions of test programs, for optimizations compilations of test programs to confirm successful certificate generation followed by an inspection of the generated assembly language to see if the optimization worked, for theorems a complete or partial proof.” (Section 3.1, p.4)

pacing rule (Section 3.2, p.4): do large cascading changes as repeated change, build, fix sequences; simple mechanical refactorings tolerate bigger steps than changes to theorems with many case splits. The paper proposes, and does not build, a controller that adapts step size.

later refinement (Section 3.3, p.5): on follow-up projects with a clear goal, agree an end-to-end plan with the agent first and keep updating it; the author found this kept development on track. No measurement.

Verus form (Inference): tool-independent. The validation step for a Verus item is the verifier's result on the touched module.

## technique 8: know the three ways an agent bails out of a proof

what it is: a list of observed shortcuts, all during hard proofs (Section 3.2, p.4): “Examples include unilaterally weakening the conclusion of the theorem, inserting additional assumptions into the theorem statement, and/or leaving parts of the proof sorryed (unproven) while providing a rationale for why it was OK to leave the theorem only partially proved.”

how the paper handled it: human pushing; when the agent was stuck on a proof strategy, the supervisor asked why it was having difficulty and, from holes in the explanation, asked whether another strategy might work (Section 3.2, p.4). No mechanical guard is described.

Verus form (Inference): the three shortcuts map one to one onto a weaker `ensures`, an added `requires`, and `assume(...)` or `assume(false)` or `#[verifier::external_body]` left in the proof. Inference: each is mechanically detectable by comparing the function signature and contract with a frozen copy and by searching the output for those constructs; the paper does not do this.

where it fails: the paper also reports a small-change bias, the agent preferring to keep existing structure over a refactor a proof needs, and gives no remedy beyond clearer prompting (Section 3.2, pp.4-5).

## technique 9: shrink what must be trusted

how it is done
1. keep unverified interfaces as thin as possible; the text parser and printer do as little as possible (Section 2, p.2). The paper notes the agent can also emit AST data structures directly, which would remove the parser (footnote 4, p.2)
2. model only the machine instructions the compiler emits: “Accurately modeling the entirety of the the ARM architecture in Lean is an imposing task that would have substantially increased the scope of the project while providing little to no benefit to the project goals.” (Section 5, p.7)
3. design the language for proof, not for human convenience: no multidimensional arrays, procedures, implicit conversions or variadic prints; the agent translates richer source into the small language (Section 5, pp.6-7)
4. reject at entry anything that could clash with internals: reserved names, duplicates (Section 5.3, p.8)
5. state each axiom and its known gap. The fused multiply-add is modeled as multiply then add: “Strictly speaking, these semantics do not match the bit level semantics of the machine, which rounds only after the add or subtract (instead of after both the multiply and the add or subtract).” (Section 5.1, p.7)

Verus form (Inference): item 2 is the choice of which library functions get an `assume_specification`; item 5 is listing every `#[verifier::external_body]` and `assume` with its justification. Inference: item 5 shows a proved system whose stated model is known to differ from the hardware, so the refinement theorem for programs using fused multiply-add holds for the model only.

## technique 10: agent audits guarded by the checker

what it is: ask the agent to read the code base or generated assembly and propose performance changes; apply them without review where a proved checker or proof guards correctness (Section 4.4 "Automated Audits", p.6).

evidence: two compile-time audits each replaced list structures with hash maps in under an hour; the second also added early exit to a fixed point loop; one made the LICM certificate check usable, the other gave a factor of five on the slowest compile times. A third audit of assembly gave the spill heuristic of technique 1.

debugging aid from the same vein (Section 5.2, p.8): to localize certificate generation bugs, instrument the code to print the relevant certificate information at the exact program point where the check fails; the supervisor suggested it and the agent then debugged largely alone.

## numbers that do not add up

- “The proof to implementation ratio is roughly four to one, an unsurprising ratio for verified software.” (Section 5.1, p.7). From Table 1, `theorem` over `def` plus `partial def` is 30,997 / 6,430 = 4.8, and over `def` alone 5.5.
- Section 5.5 (p.9) announces five benchmark versions but numbers them 1) to 3), and names the Fortran columns as F-O1, F-O2 and F-O2 where Table 3 has F-O0, F-O1 and F-O2.
- “Axon-O is faster than F-O0 for all but three benchmarks but slower than F-O2 for all but three with a geometric mean slowdown of 2.18 relative to F-O2.” (Section 5.5, p.9). In Table 3 (p.10) the first half holds (k13, k16, k22 are slower than F-O0). For the second half the table shows two kernels, not three, where Axon-O beats F-O2: k20 (20.35 s against 26.16 s) and k24 (20.17 s against 103.75 s); the text itself later names only k20 and k24.
- the same section's claim of speedups over a factor of ten for four benchmarks matches Table 3: k07, k08, k09, k18.
- 34 days: Table 2 (p.9) has passes finalized on day 34 and the project starts on day 0, so the span is 34 or 35 calendar days depending on counting.
- the abstract says proofs guarantee the correctness of the generated code; the theorems cover AST to ASM data structures, with parser, printer and both semantics outside (Section 4.4, p.6).

## techniques for the catalog

- prove-or-check split — prove components that are stable and simple by induction; leave volatile or theory-heavy ones unproved and validate each output with a proved checker, discarding rejects
- relational-invariant certificates — an unproved transformer emits per-point and cross-program invariants plus command, variable and transition maps that a proved checker validates
- twin checker with bridge theorem — keep a logical checker for proofs and an executable one for running, proved equivalent
- totality companion theorem — pair every theorem about returned results with one saying well formed input always gets a result, to exclude the reject-everything implementation
- upstream check instead of hard lemma — when a property of an intermediate form is hard or false, add a run-time check earlier that establishes it
- test before prove — differential and targeted tests first, to cut proof attempts and to catch environment constraints absent from the formal model
- plan-probe-revise-execute — per step, plan, run uncertainty-resolving experiments, revise, then execute items in fresh sessions each ending in a validation
- bail-out triad — watch for a weakened conclusion, an added assumption, or an unproved hole with a rationale
- minimal machine and language model — model only emitted instructions and drop human-convenience language features to cut proof scope
- checker-guarded agent audits — let the agent propose and apply performance changes unreviewed where a proved checker protects correctness
