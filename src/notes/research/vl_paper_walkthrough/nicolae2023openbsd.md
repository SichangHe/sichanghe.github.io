# OpenBSD formal driver verification with SeL4
(authored by agents unless marked 🧑)
Tag: `nicolae2023openbsd` , [paper](http://arxiv.org/abs/2311.03585v1)

## contribution and scope

Nicolae, Irofti, and Leuștean adapt the seL4 Isabelle/HOL workflow to an OpenBSD Octeon random-number driver. The abstract states: “The proof was written in Isabelle/HOL, the code translation from C to Isabelle was done automatically by the use of the C-to-Isabelle Parser and AutoCorres tools” (PDF p.1). The result is a small proof-of-concept model, not verification of the whole OpenBSD kernel or real hardware.

## technique 1: separate verification from execution and state explicit contracts

What it is: structure kernel or driver operations into a validation phase that checks preconditions and an execution phase that mutates state. The paper says “The verification phase can be understood as a stage of validation of the preconditions” (section 2, PDF p.2) and that successful validation means execution will not return an error.

What the paper says about the split: it describes the two-phase split only as a property of seL4 system calls (section 2, PDF p.2, citing [8]): “Note that in the verification phase the system status is not changed otherwise this separation would no longer be relevant.” The paper does not apply the split to the octrng driver. The driver proofs (section 4.3) are plain Hoare triples, so only steps 1–2 below come from the paper's seL4 description, and steps 3–4 from its driver lemmas:

1. Validation phase: check input data and permissions, without changing system state.
2. Execution phase: run the function; the paper says it “will not return an error if the verification phase has been completed successfully.”
3. State each driver function's behavior as a Hoare triple {P} C {Q} with precondition, program, and postcondition (section 4.3, PDF p.10).
4. Prove the triple in Isabelle by unfolding the translated function and definitions, then computing the needed precondition with the weakest-precondition (`wp`) tool (section 4.3, PDF pp.10–11).

For `octrng_attach`, the precondition is `True`; the postcondition requires both output and entropy bits in the control register to be nonzero. For `octrng_rnd`, preconditions include timer value, queue capacity, and both enable bits; the postcondition states that the global random value equals the timer value (section 4.3, PDF pp.10–11).

Inference: in Verus, write these conditions as `requires` and `ensures` on Rust functions, and represent exclusive register access with ownership or ghost state. The validation/execution split is an API design pattern; Verus does not automatically infer the split. A Verus proof function cannot be called as runtime code, so executable checks must remain in ordinary Rust.

Evidence and limits: the paper calls the `octrng_attach` proof “straightforward” and says the `octrng_rnd` goals are “easy to prove by applying the auto method”; it shows the lemma statements but not the proof scripts. The lemmas establish only the modeled driver’s contract under the listed assumptions; no hardware behavior, scheduler callback, or full kernel integration is proved.

## technique 2: model memory and pointers with typed heaps

What it is: represent C pointers as addresses and separate heap regions by data type using the Burstall–Bornat model. The paper defines `datatype a ptr = Ptr word32` and a state record with `heap_int`, `heap_float`, and other typed maps (section 2.2, PDF p.3). This prevents aliasing between differently typed heaps in the model and makes memory safety conditions explicit.

What the paper describes (sections 2.1–2.2 and 3.2, PDF pp.2–3 and 5; it gives no numbered procedure for this technique):

1. Define an address type (`Ptr word32`) and one heap function per data type, so pointers of different types are kept apart (Burstall–Bornat model).
2. In seL4, represent allocation as explicit retyping of untyped memory, with authority held through capabilities; the properties of interest are that allocated objects lie within free memory and do not overlap (section 2.1, PDF pp.2–3).
3. AutoCorres abstracts the byte-level heap into separate typed heaps using the same model (section 3.2, PDF p.5).
4. Cost stated by the paper: this model “renders type casts unusable” (section 2.2, PDF p.3).

Of these, only item 3 (through AutoCorres) applies to the octrng work; the paper does not prove allocation or non-overlap properties for the driver.

Inference: Verus can encode analogous ownership and permissions with Rust references, tracked/ghost tokens, and explicit specifications for raw-pointer wrappers. The paper’s Isabelle pointer datatype and typed heaps do not carry over as Verus syntax; unsafe hardware accesses require trusted external specifications and a proof that the wrapper’s contract matches the platform.

## technique 3: C-to-Isabelle semantic translation with AutoCorres

What it is: generate a proof-producing semantic model instead of reasoning over C syntax. The paper lists six steps (section 3.2, PDF p.5): preprocess each C file; translate it to Simpl with the C-to-Isabelle parser; represent each structure as a record; generate a `globals` record and a locals record; translate functions into Simpl; and perform proofs on the generated functions to specify which global variables they modify. The post-translation abstraction is then done by AutoCorres.

AutoCorres converts deeply embedded parser output to a shallow semantic representation, abstracts 32-bit arithmetic to integers/naturals, models byte heaps as typed areas, and simplifies code. The paper says it supports loops, function calls, casts between types, pointer arithmetic, structures, and recursion, but not references to local variables, `goto` and `switch`, unions, floating-point arithmetic, or pointers to functions (section 3.2, PDF p.5). Section 3.3 (PDF pp.6–7) calls pointers to functions the most relevant restriction and adds compiler data-layout issues for unions and bit fields.

Inference: a Verus workflow could use a similar front end only if C is first rewritten or translated into Rust whose ownership and contracts preserve the C semantics. Verus itself verifies Rust, so AutoCorres’s C semantics and Isabelle theorem libraries are not reusable directly. The transferable lesson is to make the source-to-proof semantic bridge explicit and prove refinement obligations for it.

## technique 4: decouple hardware and kernel mid-layers

What it is: replace unavailable hardware and OpenBSD kernel services with a model that preserves behavior relevant to the driver contract. The authors replace bus operations with local-memory reads/writes, model only the needed control register, use a global timer instead of hardware randomness, and implement a circular task queue (section 4.2, PDF pp.8–9).

Elements of the model (section 4.2, PDF pp.8–9; the paper does not number them as steps):

1. Decouple the driver from the OpenBSD kernel mid-layer so it can stand on its own.
2. Replace `bus_space_x()` bus access with reads and writes to local memory; timing is ignored because “all actions are done sequentially.”
3. Keep a static `rng_regs` structure with only the control register (`control_addr`).
4. Provide helpers `set_register` and `get_register`; the latter reads the control register or returns the current timer if both output and entropy flags are set.
5. Add a global timer, incremented by `idle()`, and a simple scheduler loop with a circular-buffer task queue; callbacks are stored as function pointers (`timeout_fun`).
6. State that bus correctness and datasheet register behavior are assumptions (section 4, PDF p.7).

The paper states: “We assume that the bus works correctly and the register behavior matches the datasheet specifications” (section 4, PDF p.7). Inference: Verus should put these assumptions in named external contracts and isolate them behind a small hardware interface; proving the driver against a mock register model does not prove the real device.

## technique 5: prove loop termination with invariant and measure

What it is: for the scheduler’s main loop, define an invariant preserved at every iteration and a well-founded measure that decreases. The invariant is `0 ≤ timer ≤ TIMEOUT`; the measure is `TIMEOUT - timer` (section 4.3, PDF pp.11–12). Isabelle’s `whileLoop_add_inv` and `wp` discharge the resulting obligations.

What the paper says (section 4.3, PDF pp.11–12): the lemma `main_function` states that from a state with `timer = 0` and `running_tasks = 0`, `main'` ends with `timer = TIMEOUT`. The invariant is “a property that has to be true before, during and after the main loop ends”; the measure is “a value that has to decrease at each iteration.” The two definitions are `timer_limits_inv` and `timer_limits_measure`, applied via `whileLoop_add_inv`, yielding a goal “that can be further broken into smaller goals using the weakest precondition tool.” The paper does not show the finished proof of `main_function`, and it proves only the loop that increments the timer through `idle`, not the code that runs tasks.

Inference: the general recipe is: define a loop-state invariant, define a decreasing measure, show the invariant holds on entry and is preserved by the body, and show the exit condition gives the postcondition. These five steps are standard, not listed by the paper.

Inference: in Verus, write the invariant in the loop’s `invariant` clauses and the measure in a `decreases` clause. The exact Isabelle `whileLoop_add_inv` command is not Verus syntax.

## what is proved, trusted, and threatened

The paper states lemmas for `octrng_attach`, `octrng_rnd`, `idle`, and a bounded main loop (`main_function`), and describes how they are proved; it shows no proof scripts and no machine-checked proof output in the text. It does not prove the unparsed function-pointer callback, complete task scheduling, real bus timing, physical registers, hardware randomness, or the rest of OpenBSD. The paper lists workarounds for function pointers: the `DONT_TRANSLATE` annotation, Isabelle `quick_and_dirty`/`sorry_modifies_proofs` (which “assert those theorems as axioms rather than try to prove them”), and `calculate_modifies_proofs = false`; it says “Workarounds cannot provide the full proof” and that the authors used `DONT_TRANSLATE` (section 3.3, PDF p.7). Inference: the skipped function-pointer call is therefore an unverified gap in the model.

Inference: for agent-written verified Rust, the main threat is a model that is internally proved but disconnected from hardware, FFI, or scheduler behavior. VL should preserve the paper’s explicit refinement boundary and report every mocked component. Existing seL4/AutoCorres work already demonstrates C-to-theorem-prover translation and typed-memory modeling; VL should not claim these as new techniques without a concrete Rust/Verus contribution.

## techniques for the catalog

- contract-centered driver proofs — separate precondition validation from execution and prove Hoare-style state postconditions
- typed-heap memory modeling — represent pointers, heaps, allocation, and non-overlap with explicit typed state
- semantic C translation — preprocess C, translate to Simpl, and use AutoCorres to obtain a shallow proof model
- hardware/mid-layer abstraction — replace bus, registers, timer, and scheduler with explicit behavioral models and assumptions
- invariant-plus-measure loops — prove scheduler safety and termination with a preserved state invariant and decreasing measure

Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "In our case, we replace the bus access with simple reading or writing to local memory."): read all 13 pages of the paper text and checked every quotation, section and page reference, the six-step C-to-Isabelle list, the lemma contents (`octrng_attach`, `octrng_rnd`, `idle`, `main_function`), and the loop invariant and measure; changed technique 1 (the paper applies the verification/execution split only to seL4 syscalls, not to the driver), technique 2, 4 and 5 (the numbered steps were the earlier reviewer's, not the paper's, and are now relabeled or marked Inference), the AutoCorres unsupported-feature list (added references to local variables), the claim that the main-loop proof was completed (the paper does not show it), and the workaround wording; kept the tag and arXiv link as they match the paper's arXiv:2311.03585v1; did not check the cited external works (seL4 papers, Greenaway thesis), the gitlab repository, or the Verus-related Inference statements against Verus documentation.
