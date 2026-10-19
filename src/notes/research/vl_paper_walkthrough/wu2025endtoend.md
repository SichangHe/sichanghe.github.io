# End-to-end Compositional Verification of Program Safety through Verified and Verifying Compilation
(authored by agents unless marked 🧑)
Tag: `wu2025endtoend`, [paper](http://arxiv.org/abs/2510.10015v1)

## scope and result
This paper combines verified compilation (proved semantics preservation) and verifying compilation (compiler checks that establish safety) for open modules. The central abstraction is open safety over open labeled transition systems (LTS), with safety interfaces at module boundaries and an existential state invariant preserved at every small step. The authors instantiate it in Owlang, compile it through Clight and CompCertO to x86-64 assembly, and compose it with C bucket code in a hash-map example (§§5–6, pp. 19–25). Owlang's scope is limited: "Like Rust, Owlang supports automatic heap management and ownership transfer of heap values. However, it does not support references or borrowing." (§1.2, p. 5).

The key idea is stated directly: "We solve this challenge by presenting a “small-step” variant of partial correctness such that is composable at the boundary of modules and can be modularly preserved by the state-of-the-art verified compilers." (§2.2, p. 8). Open safety means an invariant is maintained after every transition, and every invariant state either makes progress or is in an explicitly allowed error predicate (Definition 4.1, pp. 14–15). This avoids carrying an entire execution history through compiler simulations.

## technique 1: open safety with boundary interfaces
What it is: for an open LTS `L : A ↠ B`, write `L |=E P ↠ Q`, where `P` and `Q` are safety interfaces for outgoing and incoming calls and `E` is the set of permitted error states. The definition quantifies an invariant `Inv` over a Kripke world and requires initial establishment, transition preservation, call/return interface conditions, and progress-or-error.

When to use it: separately compiled modules with external calls, callbacks, or interactions across languages. The paper explains the failure of ordinary reachability-safety preservation: "A key property of open simulations is that they make no assumption about simulations in the environment." (§2.1, p. 8).

How to apply it:
1. Choose interface worlds and pre/post conditions for calls and returns. The paper's safety interface stores a Kripke relation to express rely-guarantee changes.
2. Prove every query admitted by `Q` can initialize the module and every resulting initial state satisfies `Inv`.
3. Prove `Inv` is preserved by each internal transition.
4. Prove each outgoing query satisfies `P`; every reply satisfying the corresponding postcondition permits resumption, and every resumed state satisfies `Inv`.
5. Prove final replies satisfy `Q` and every `Inv` state is in progress or `E` (Definition 4.1, Section 4.1).

The paper describes the hidden invariant as follows: "On the other hand, unlike types, our invariants are not visible outside of a module as they are existentially quantified (that is why it does not appear in the notation 𝐿 |= P ↠ Q)." (§2.2, p. 9). Module composition uses complementary safety interfaces, without requiring matching internal invariants (Theorem 4.3, pp. 15–16).

Verus form: Inference: model each interface as a ghost state record and `Inv` as a `spec fn` over concrete state and an abstract world. Use `requires` for incoming preconditions and `ensures` for outgoing postconditions; prove transition preservation with `proof fn` lemmas. Verus does not provide CompCertO's open-LTS semantics automatically, so a Rust implementation needs an explicit state machine and a refinement theorem.

## technique 2: parameterize partial safety by errors
What it is: allow a partially checked module to reach `E`, then use a verifying pass to exclude a subset `E1 ⊆ E`. Total safety is `E = ∅`. Definition 4.2 (§4.1.1, p. 15) requires `JMK |=E PA ↠ QB ⇒ Check(M) ⇓ ⇒ JMK |=E\E1 PA·IA ↠ QB·IB`. The added interfaces describe the checker's assumptions: "The safety interfaces I𝐴 and I𝐵 are the formalized assumptions of this verifying pass, e.g., type interfaces for type checker and aliasing discipline for the Rust borrow checker."

How to apply it: define a precise error predicate, such as `mem-err` for a next access that lacks the required CompCert permission; prove partial open safety of the source; prove that a successful check excludes those errors under its boundary interfaces; propagate total safety through compilation. Owlang's checker excludes temporal memory errors, with an explicit limit: "it does not prevent spatial memory errors such as index-out-of-range" (§1.2, p. 5). Other safety obligations remain in the partial-safety proof.

Evidence: Theorem 5.3 (§5.1.2, p. 21) combines the partial-safety invariant with an ownership invariant `I_own` and proves `I_own ∩ mem-err = ∅`. The internal invariant differs from the boundary interface `Iown`. The implementation uses data-flow analysis: "Similar to move checking in the Rust borrow checker [42], our ownership checking is implemented as a data-flow analysis based on the Kildall algorithm from CompCert." (§5.1, p. 20). Figures 12–13 show ownership moving from `*l` to `node`, then `node.val` to `process`, and returning when the result is assigned back.

Inference: in Verus, use a ghost ownership map and a `spec fn` footprint relation; prove that every dereference requires a valid owned footprint and that environment calls preserve untransferred memory. The paper's Kripke protection relation is a specification pattern, not a built-in Verus type.

## technique 3: preserve safety through open simulation
What it is: reuse CompCertO open backward simulations. If source total open safety holds and target simulates source under convention `R`, the target satisfies safety interfaces transformed by the `⊳ R` operator (Theorem 4.4, p. 16). The paper states: "The small-step nature of open safety makes it preservable under open simulations:" (§2.2, p. 9). The operator carries calling conventions such as callee-saved registers into target interfaces.

How to apply it: reuse the compiler's open simulation; prove source total open safety; transform `P` and `Q` with `⊳ R`; chain passes by transitivity. Partial safety needs an additional proof: related source error states must correspond to target states that either make progress or belong to the designated target error predicate (Definition 4.6 and Theorem 4.7, p. 18). Ordinary backward simulation alone does not suffice: "For instance, a memory error should not be transformed into a division-by-zero error. Such transformations are not ruled out by backward simulation." (§4.3.1, p. 18). For interface refinement `P ⊑ Q`, every world and query admitted by `Q` must admit a `P` world for which all permitted `P` replies satisfy `Q` (Definition 6.2 and Theorem 6.3, p. 24).

The heterogeneous proof applies Theorem 4.4 to CompCertO without changing its existing correctness proofs: "Importantly, no modification to the existing proofs in CompCertO is required." (§6, p. 24). It aligns the C target's interfaces using the equivalence `RRC ⊳ RCA ≡ RRA`, composes the target safety judgments (Theorem 4.3), and transfers safety to syntactically linked assembly using CompCertO's linking adequacy and Theorem 4.4. Adding `main` and initialization yields a complete program; Theorem 4.8 then establishes closed reachability safety (§6, pp. 24–25).

Inference: a Verus port would represent each pass as a transition-system relation and prove a relational simulation lemma. It cannot simply assert that generated Rust is safe because a source proof passed; the boundary convention and compiler transformation must be in the proof.

## technique 4: ownership invariant and rely-guarantee interface
The checker computes ownership status; the proof's resource environment `Ω` maps variables to memory footprints (Definition 5.4, p. 22). The boundary interface `Iown` requires footprints without duplicate blocks and semantically well-typed arguments. Its reply condition protects memory outside the transferred footprint, restricts newly acquired blocks to fresh allocations, and requires a well-typed return value (Definitions 5.5–5.6, pp. 22–23). The reason for the protection is concrete: "For instance, if the environment (i.e., process) frees the block 𝑏 nx , then 𝐼 own cannot be reestablished after process returns as node is in OwnSt." (§5.1.2, p. 22). To apply it, identify transferred blocks, prove the environment respects the boundary conditions, and re-establish the internal invariant on return.

Evidence: "Our Rocq development took about 15 person-months and 45.4k lines of code (LOC) on top of CompCertO [24, 55]." (§7, p. 25). The reported components are 1.7k LOC for open safety, 25.3k for the Owlang compiler, 11.4k for ownership checking, and 7.1k for the hash-map verification. Most hash-map proof code handles manual source verification: "Automating this process or integrating state-of-the-art verification tools is left as future work." (§7, p. 25).

## trusted boundary, contradictions, and product threat
The paper does not enumerate a trusted computing base. It states: "The formal development of this work is fully formalized in the Rocq theorem prover." (§1.2, p. 5). Environment compliance is an explicit premise: "The checked module is guaranteed to adhere to Iown automatically, but it also relies on the environment to respect Iown as well; otherwise, the memory safety guarantee may no longer hold." (§5.1.2, p. 21). Borrow checking and integration with existing verification tools remain future work (§8, p. 28).

Inference: VL could reuse the decomposition into partial safety, checker assumptions, compiler simulation, and target composition. Applying it to agent-written Rust verified with Verus would require separate proofs connecting Verus's guarantees, foreign calls, and the compiler to this semantic framework. The paper provides no Verus implementation or product-risk measurement.

## techniques for the catalog
- open safety invariant — preserve a hidden state invariant and progress-or-error at every small step of an open module
- error-parameterized partial safety — prove a checker excludes a subset of explicitly modeled error states
- simulation-preserved safety — transport interfaces through open backward simulations with a calling-convention operator
- ownership rely-guarantee interface — protect untransferred memory footprints across foreign calls
- interface refinement and composition — strengthen preconditions, weaken postconditions, and link heterogeneous modules
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "As discussed earlier, the composition of modules does not require knowledge of the internal structure of Inv𝑡 ."): checked the entire paper including references and Appendix A against the study's quotations, numbers, references, and technique steps; corrected initialization and resumption obligations, partial-safety preservation prerequisites, ownership invariant/interface distinctions, and unsupported trusted-base and product-risk claims; did not check the Rocq artifact, reproduce its proofs, or validate the proposed Verus adaptations. The paper identifier arXiv:2510.10015v1 appears on p. 1.
