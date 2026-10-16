# AutoDeduct: A Tool for Automated Deductive Verification of C Code
(authored by agents unless marked 🧑)
Tag: `amilon2025autodeduct`, [paper](http://arxiv.org/abs/2501.10889v1)
## problem and architecture

AutoDeduct is a Frama-C toolchain that infers ACSL contracts for helper functions when a C module's entry-point already has a contract. It combines two plugins: functional contract inference, backed by the Horn-clause model checker TriCera, and auxiliary contract inference, backed by Frama-C Eva abstract interpretation. Frama-C WP then checks the fully annotated program. The paper's scope is property-guided inference: inferred contracts need only be strong enough to verify the current entry-point, so they may not generalize to another caller.

The required starting condition is explicit: “We assume that programs have an entry-point function already equipped with a contract, which is used in conjunction with the program source code to infer contracts for the helper functions, so that the entry-point contract can be verified.” (Abstract, p. 1.) The output is an annotated C file and a verification result. The tool does not infer the top-level requirement itself.

## technique 1: functional contract inference from an entry-point property

What it is: infer preconditions and postconditions that summarize each helper's functional behavior, using the entry-point contract as the property to preserve. AutoDeduct encodes the C program as Horn clauses; each called function has predicates for pre- and post-state, and a model of those predicates yields helper contracts (Section 3, pp. 3–5).

When to use: use it for C functions whose behavior contributes to a specified module-level requirement and whose supported language features can be represented by TriCera. The inferred contract can be deliberately call-specific. In the running `saturate` example, `lim == 10` appears because that is the only call-site value.

Steps from Section 3 (pp. 3–5):

1. provide C source with an ACSL contract on the entry-point;
2. invoke the functional plugin (`./autodeduct -func filename.c`);
3. encode helper calls and control flow as Horn clauses with pre/post predicates;
4. solve for an interpretation sufficient to establish the entry-point postcondition;
5. extract each helper's functional `requires` and `ensures` clauses into `tmp_inferred_source_merged.c`;
6. inspect the generated contracts for context-specific assumptions before relying on them elsewhere.

The paper's Figure 3 contract for `saturate` includes the functional requirements `lim == 10 && x == in` and postconditions relating the result either to the old input (for input 0–10) or to 10 (for input at least 10). This is a summary sufficient for this call path, not a general mathematical specification of all `saturate(x,lim)` calls.

Verus form (Inference: the paper is C/ACSL, not Rust): let the entry-point's desired behavior be the Rust function's `ensures`; ask a contract-inference tool to propose `requires` and `ensures` for helper functions; then run Verus on the complete Rust program. Verus syntax uses `requires`/`ensures` clauses and proof functions, while the Horn solver remains an external proposal engine. Inference: a Verus helper contract inferred for one call path should be marked as context-specific and not silently reused as a public API contract.

Evidence and limits: the only functional inference evaluation is a 123-line simplified industrial module with five helper functions and five requirements (Section 4, p. 6). The paper reports no separate success count per inferred contract. Functional inference supports neither floating-point arithmetic nor stack pointers and does not support pointer arithmetic, nested pointers, local static variables or general ACSL logic functions (Section 3, p. 6). It supports loops but does not infer loop invariants.

Quote: “The contract for saturate requires lim == 10, as this is the value of this parameter at the only function call.” (Section 3, p. 5.)

## technique 2: auxiliary contract inference by abstract interpretation

What it is: infer annotations needed for verification but not directly describing functional input/output behavior: variable ranges, pointer validity and frame (`assigns`) conditions. Eva abstract interpretation supplies these facts (Section 3, p. 5).

Steps: run functional inference first; pass its merged source to `./autodeduct -aux tmp_inferred_source_merged.c`; let Eva derive value ranges, valid-pointer facts and modified locations; emit `annotated.c` with auxiliary and functional clauses. In the running `write_output` contract, Eva supplies `\valid(&out)`, `0 <= x <= 100`, `0 <= out <= 100` and `assigns out`.

Verus form (Inference): derive or ask for Rust preconditions such as non-null/index bounds and frame facts about mutable references; encode functional behavior separately in `ensures`. Rust's ownership and borrowing statically constrain many frame conditions, but Verus still needs explicit bounds and loop invariants for array/slice accesses. Inference: Eva's pointer-validity annotations have no direct textual equivalent for a borrowed `&mut` reference; raw-pointer Rust requires separate validity assumptions.

Evidence and limits: the paper says auxiliary inference supports a larger C/ACSL subset than functional inference, but it gives no coverage percentage. Its auxiliary plugin does not solve the missing loop-invariant problem. The generated frame facts are sufficient only for the analyzed program and may depend on Eva's abstract domain precision.

Quote: “All these annotations are derived from an abstract interpretation of the program, using the Frama-C plugin Eva as the backend.” (Section 3, p. 5.)

## technique 3: staged command-line verification

What it is: keep inference and checking as independently runnable stages, producing an inspectable annotated artifact. The complete command `./autodeduct filename.c` runs both inference plugins and WP; separate commands expose each intermediate result (Section 3, p. 6).

Steps: run `-func`; run `-aux` on the merged file; run `-wp annotated.c`; if WP fails, inspect the fully annotated C and rerun after correcting the entry contract or unsupported construct. The toolchain's trust base is intended to remain Frama-C WP: “Thus, the necessary trust base for the verification engineer does not extend beyond the mature WP plugin of Frama-C.” (Section 3, p. 4.)

Verus form (Inference): mirror this as a pipeline that first proposes helper `requires`/`ensures`, writes a Rust artifact, and then runs `verus` as the final gate. Retain the generated Rust and diagnostics; never treat the inference stage as proof. Inference: because Verus checks the source directly, no separate equivalent of WP's ACSL parser is needed, but the proposal generator still needs a stable intermediate file for review.

Evidence: the paper reports a fully annotated output and a successful WP result for its case study, but no comparison against another contract-inference tool. A failed run produces either “Verification succeeded” or “Verification failed” in the architecture diagram; no automated repair loop is described.

## technique 4: contract inference guided by weakest/strongest state summaries

What it is: the paper situates AutoDeduct among specification-inference techniques. Weakest preconditions compute a sufficient pre-state from a postcondition; strongest postconditions characterize final states from a precondition; symbolic execution computes strongest postconditions for loop-free programs; counterexample-guided abstraction refinement and multi-abduction infer preconditions or multiple-function specifications (Section 1, pp. 2–3).

How to use the applicable idea: start from the module postcondition and propagate it backward through helper calls (weakest-precondition style), or start from entry assumptions and propagate forward (strongest-postcondition style); simplify the resulting predicates; use counterexamples to strengthen a candidate; and solve all helper contracts together when a single-function summary is too weak. The paper presents these as related foundations, not as separate AutoDeduct modes.

Verus form (Inference): use Verus `assert` chains and proof functions to propagate postconditions backward or state summaries forward; use failing proof obligations as counterexamples to strengthen `requires` or loop `invariant` clauses. Verus does not expose a built-in generic weakest-precondition command, so this is a specification-generation strategy around the prover.

Evidence and limits: no new numbers are reported for these related techniques. The paper's own inference remains Horn-clause/property-guided rather than a claim that it computes mathematically weakest contracts. It warns that contracts “may not generalise to other contexts” (Section 3, p. 4), which limits reuse.

Quote: “AutoDeduct as a toolchain for property-guided contract inference, meaning that it infers contracts that are strong enough for verifying the current program, but they may not generalise to other contexts.” (Section 3, p. 4.)

## evaluation and denominators

The evaluation uses one automotive C module adapted from industrial software. The original is about 1,400 lines and previously required two person-months of manual annotation. Because unsupported constructs were removed, the tested version is 123 lines, has one contracted entry point, five helper functions without contracts, and five engineer-written requirements represented by separate `ensures` clauses (Section 4, p. 6). On this single 123-line case, verification succeeds in roughly 23 seconds: 18 seconds functional inference, 2 seconds auxiliary inference and 3 seconds WP checking. The denominator is one module; there is no multi-module or per-function success rate.

The paper explicitly says it “did not compare AutoDeduct against other tools, since we are not aware of any existing toolchain for deductive verification that can automatically verify such C programs using contract inference.” (Section 4, p. 6.) Therefore the timing is a prototype measurement, not evidence of superiority. The original 2 person-month effort and the 23-second run use different versions of the module, so they must not be presented as a controlled speedup.

## what is proved and what stays trusted

WP proves the entry-point contract and every inferred helper contract for the supplied C artifact. TriCera's Horn-clause solution and Eva's abstract interpretation generate the annotations, but correctness of the generated contracts is established only when WP checks the final program. The entry-point contract, its relationship to the real requirement, and the supported-language assumptions remain trusted. The C parser, ACSL semantics, TriCera encoding, Eva abstraction and WP implementation are part of the toolchain trust base; the paper's stated engineering trust boundary is “beyond the mature WP plugin,” which does not mean the requirement translation is proved.

## what VL should not redo and product threat

Already done here: property-guided helper-contract inference from one entry contract; separate functional and auxiliary inference; abstract-interpretation frame/range/pointer annotations; staged artifact production; and a real industrial-style timing case. VL should test how these patterns map to Rust and Verus, especially whether ownership reduces auxiliary annotations and how to infer loop invariants, which AutoDeduct explicitly leaves unimplemented.

Inference: threat to a product that emits agent-written verified Rust is moderate. Automatic helper contracts could reduce specification effort, but context-specific contracts can overfit a call graph, and the paper's sole successful case is a reduced 123-line module. The most serious gap for VL is loop invariants and unsupported pointer/alias patterns; a Verus pipeline should require explicit human- or agent-supplied invariants and keep the final verifier run as the only acceptance criterion.

## techniques for the catalog

- entry-contract-guided functional inference — infer helper `requires` and `ensures` sufficient to prove a supplied module contract
- Horn-clause contract solving — encode calls as pre/post predicates and extract a satisfying interpretation as contracts
- auxiliary abstract-interpretation inference — derive value ranges, pointer validity and frame conditions with Eva-like analysis
- staged annotation and verification — run functional inference, auxiliary inference and final proof as inspectable stages
- state-summary specification inference — use weakest/strongest summaries and counterexamples to strengthen contracts across calls
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
