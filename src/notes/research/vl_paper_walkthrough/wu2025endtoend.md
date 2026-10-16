# End-to-end Compositional Verification of Program Safety through Verified and Verifying Compilation
(authored by agents unless marked 🧑)
Tag: `wu2025endtoend`, [paper](http://arxiv.org/abs/2510.10015v1)

## scope and result
This paper addresses a gap between verified compilation and verifying compilation for open modules: a compiler may preserve semantics while a checker establishes a safety property such as ownership. The central abstraction is open safety over open labeled transition systems (LTS), with safety interfaces at module boundaries and an existential state invariant preserved at every small step. The authors instantiate it in Owlang, an ownership subset of Rust, compile it through an Owlang compiler and CompCertO, and compose it with unsafe C. The final hash-map example links safe Rust-like list code and C bucket code to safe assembly.

The key idea is stated directly: "We solve this challenge by presenting a “small-step” variant of partial correctness such that is composable at the boundary of modules and can be modularly preserved by the state-of-the-art verified compilers." Open safety means an invariant is maintained after every transition, and every invariant state either makes progress or is in an explicitly allowed error predicate. This avoids carrying an entire big-step history through compiler simulations.

## technique 1: open safety with boundary interfaces
What it is: for an open LTS `L : A ↠ B`, write `L |=E P ↠ Q`, where `P` and `Q` are safety interfaces for outgoing and incoming calls and `E` is the set of permitted error states. The definition quantifies an invariant `Inv` over a Kripke world and requires initial establishment, transition preservation, call/return interface conditions, and progress-or-error.

When to use it: use it for separately compiled modules that call an environment, call back into themselves, or cross language boundaries. Ordinary reachability safety is too tied to whole-program execution; open safety makes the module's assumptions and guarantees explicit.

How to apply it:
1. Choose interface worlds and pre/post conditions for calls and returns. The paper's safety interface stores a Kripke relation to express rely-guarantee changes.
2. Define `Inv` so every initial state admitted by `Q` satisfies it.
3. Prove `Inv` is preserved by each internal transition.
4. Prove each outgoing query satisfies `P`, and every environment reply satisfying `P` returns to `Inv`.
5. Prove final replies satisfy `Q` and every `Inv` state is in progress or `E` (Definition 4.1, Section 4.1).

The paper lists the core obligations verbatim: "Invariant under Transition: ∀ 𝑠 𝑠 ′, 𝑠 ∈ Inv ⇒ 𝑠 → 𝑠 ′ ⇒ 𝑠 ′ ∈ Inv;" and "Progress under Invariant: ∀ 𝑠, 𝑠 ∈ Inv ⇒ 𝑠 ∈ progress." The hidden invariant is analogous to a type but remains internal, allowing modules with different invariants to compose.

Verus form: Inference: model each interface as a ghost state record and `Inv` as a `spec fn` over concrete state and an abstract world. Use `requires` for incoming preconditions and `ensures` for outgoing postconditions; prove transition preservation with `proof fn` lemmas. Verus does not provide CompCertO's open-LTS semantics automatically, so a Rust implementation needs an explicit state machine and a refinement theorem.

## technique 2: parameterize partial safety by errors
What it is: allow a partially checked module to reach `E`, then use a verifying pass to prove a subset `E1` unreachable. Total safety is `E = ∅`. The paper's correctness condition is `JMK |=E P ↠ Q ⇒ Check(M) ⇓ ⇒ JMK |=E\E1 P·I ↠ Q·I`, where `I` is the checker-provided interface.

How to apply it: define a precise error predicate, such as `mem-err` for a next access that lacks the required CompCert permission; prove partial open safety of the source; prove that the checker establishes an interface `I` excluding the targeted errors; compose the stronger judgment with compilation. This allows optimization to preserve partial safety before a checker closes the gap.

Evidence: the paper verifies ownership checking with Theorem 5.3. It defines an ownership invariant `Iown` relating the abstract ownership state `OwnSt` to concrete memory footprints and proves `Iown ∩ mem-err = ∅`. The checker is a Kildall data-flow analysis. The running list/hash-map example has explicit ownership transitions for moving `*l` into `node`, transferring `node.val` to `process`, and restoring ownership on return.

Inference: in Verus, use a ghost ownership map and a `spec fn` footprint relation; prove that every dereference requires a valid owned footprint and that environment calls preserve untransferred memory. The paper's Kripke protection relation is a specification pattern, not a built-in Verus type.

## technique 3: preserve safety through open simulation
What it is: reuse CompCertO open backward simulations. If source open safety holds and target simulates source under convention `R`, the target satisfies safety interfaces transformed by the `⊳ R` operator. The paper states: "The small-step nature of open safety makes it preservable under open simulations." The operator carries calling conventions such as callee-saved registers into target interfaces.

How to apply it: for every compiler pass, provide an open simulation; prove source open safety; transform `P` and `Q` with `⊳ R`; chain passes by transitivity. For partial safety, first propagate the error-parameterized judgment and then apply the verifying compiler theorem. For interface composition, prove refinement `P ⊑ Q` by showing every `Q` precondition is a `P` precondition and `P` postconditions imply `Q` postconditions (Definition 6.2 and Theorem 6.3).

The paper's heterogeneous proof applies Theorem 4.4 to the end-to-end CompCertO simulation without changing existing compiler correctness proofs. It then refines the Owlang/C calling convention `RRC ⊳ RCA` to the Owlang compiler convention `RRA`, composes the two target safety judgments, links the assembly, and invokes soundness to derive closed reachability safety.

Inference: a Verus port would represent each pass as a transition-system relation and prove a relational simulation lemma. It cannot simply assert that generated Rust is safe because a source proof passed; the boundary convention and compiler transformation must be in the proof.

## technique 4: ownership invariant and rely-guarantee interface
The ownership checker maps variables to memory footprints. `Iown` requires nonrepeated footprints and well-typed values; its reply relation protects memory outside the transferred footprint with an accessibility relation. To apply it, identify which blocks a call transfers, require the environment not to mutate protected blocks, and re-establish `Iown` after return. This is the technique that prevents an unsafe C function from freeing a Rust-owned list tail.

Evidence: the development is 45.4k Rocq LOC over CompCertO, including 1.7k LOC for open safety, 25.3k for the Owlang compiler, 11.4k for ownership checking, and 7.1k for the hash-map proof. It took about 15 person-months. The paper reports that automating the manual small-step invariant proof and integrating other verification tools remain future work.

## trusted boundary, contradictions, and product threat
The formal trusted base includes Rocq, CompCertO's existing correctness proofs, the semantics of the source and target languages, and the environment's compliance with safety interfaces. The paper's result is an end-to-end theorem for its modeled Owlang/C/assembly example, not arbitrary Rust, unsafe code, or an unverified compiler. It explicitly leaves borrow checking and broader tool integration for future work.

Inference: the threat to a product of agent-written verified Rust is medium to high at FFI, compiler, and library boundaries. Verus can prove a Rust ownership invariant, but the guarantee stops at any unmodeled C/FFI call or compiler transformation. VL should reuse the open-safety decomposition—partial property, checker interface, simulation, and composition—instead of redoing a monolithic whole-program proof. The paper's negative result about big-step preservation is already done and need not be rediscovered.

## techniques for the catalog
- open safety invariant — preserve a hidden state invariant and progress-or-error at every small step of an open module
- error-parameterized partial safety — prove a checker excludes a subset of explicitly modeled error states
- simulation-preserved safety — transport interfaces through open backward simulations with a calling-convention operator
- ownership rely-guarantee interface — protect untransferred memory footprints across foreign calls
- interface refinement and composition — strengthen preconditions, weaken postconditions, and link heterogeneous modules
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
