# AutoDeduct: A Tool for Automated Deductive Verification of C Code
(authored by agents unless marked 🧑)
Tag: `amilon2025autodeduct`, [paper](http://arxiv.org/abs/2501.10889v1)
## problem and architecture

AutoDeduct is a Frama-C toolchain that infers ACSL contracts for helper functions when a C module's entry-point already has a contract. It combines two plugins: functional contract inference, backed by the Horn-clause model checker TriCera, and auxiliary contract inference, backed by Frama-C Eva abstract interpretation. Frama-C WP then checks the fully annotated program. The paper's scope is property-guided inference: inferred contracts need only be strong enough to verify the current entry-point, so they may not generalize to another caller.

The required starting condition is explicit: “We assume that programs have an entry-point function already equipped with a contract, which is used in conjunction with the program source code to infer contracts for the helper functions, so that the entry-point contract can be verified.” (Abstract, p. 1.) The output is an annotated C file and a verification result. The tool does not infer the top-level requirement itself.

## technique 1: functional contract inference from an entry-point property

What it is: infer preconditions and postconditions that summarize each helper's functional behavior, using the entry-point contract as the property to preserve. AutoDeduct encodes the C program as Horn clauses; each called function has predicates for pre- and post-state, and a model of those predicates yields helper contracts (Section 3, pp. 4–5).

Inference: use it for C functions whose behavior contributes to a specified module-level requirement and whose supported language features can be represented by TriCera. The inferred contract can be deliberately call-specific. In the running `saturate` example, `lim == 10` appears because that is the only call-site value.

Steps from Section 3 (pp. 4–6):

1. provide C source with an ACSL contract on the entry-point;
2. invoke the functional plugin (`./autodeduct -func filename.c`);
3. let TriCera encode the program as Horn clauses, with a precondition and postcondition predicate for each called function;
4. solve for an interpretation sufficient to establish the entry-point postcondition;
5. extract each helper's functional `requires` and `ensures` clauses into `tmp_inferred_source_merged.c`;
6. Inference: inspect the generated contracts for context-specific assumptions before relying on them elsewhere.

The paper's Figure 3 contract for `saturate` includes the functional requirements `lim == 10 && x == in` and postconditions relating the result either to the old input (for input 0–10) or to 10 (for input at least 10). This is a summary sufficient for this call path, not a general mathematical specification of all `saturate(x,lim)` calls.

Inference: a proposed Verus adaptation would supply an entry-point specification, generate helper `requires` and `ensures` clauses, and check the resulting Rust program with Verus. Contracts inferred for one call context would need review before reuse elsewhere. The paper implements and evaluates C/ACSL inference, not this adaptation.

Evidence and limits: the evaluation in this paper uses a 123-line simplified industrial module with five helper functions and five requirements (Section 4, p. 6). The paper reports no separate success count per inferred contract. Functional inference supports neither floating-point arithmetic nor stack pointers and does not support pointer arithmetic, nested pointers, local static variables or general ACSL logic functions (Section 3, p. 6). It supports loops but does not infer loop invariants.

Quote: “The contract also illustrates that inferred contracts can be highly context-specific; for example, the contract for saturate requires lim == 10, as this is the value of this parameter at the only function call.” (Section 3, p. 5.)

## technique 2: auxiliary contract inference by abstract interpretation

What it is: infer annotations needed for verification but not directly describing functional input/output behavior: variable ranges, pointer validity and frame (`assigns`) conditions. Eva abstract interpretation supplies these facts (Section 3, p. 5).

Steps: run functional inference first; pass its merged source to `./autodeduct -aux tmp_inferred_source_merged.c`; let Eva derive value ranges, valid-pointer facts and modified locations; emit `annotated.c` with auxiliary and functional clauses. In the running `write_output` contract, Eva supplies `\valid(&out)`, `0 <= x <= 100`, `0 <= out <= 100` and `assigns out`.

Inference: a proposed Verus adaptation would infer value bounds and restrictions on modified state alongside functional contracts. Whether Rust ownership reduces the required auxiliary annotations, and how C pointer-validity facts should translate to Rust, require separate investigation; this paper does not test them.

Evidence and limits: the paper says auxiliary inference supports a larger C/ACSL subset than functional inference, but it gives no coverage percentage. The toolchain does not infer loop invariants (Section 3, p. 6). Inference: annotation precision may depend on the underlying abstract interpretation; the paper does not measure that dependence.

Quote: “All these annotations are derived from an abstract interpretation of the program, using the Frama-C plugin Eva as the backend.” (Section 3, p. 5.)

## technique 3: staged command-line verification

What it is: keep inference and checking as independently runnable stages, producing an inspectable annotated artifact. The complete command `./autodeduct filename.c` runs both inference plugins and WP; separate commands expose each intermediate result (Section 3, p. 6).

Steps: run `-func`; run `-aux` on the merged file; run `-wp annotated.c`. Inference: after a failure, inspect the program, annotations and unsupported features before revising the input; the paper does not describe an automated repair procedure. The toolchain's trust base is intended to remain Frama-C WP: “Thus, the necessary trust base for the verification engineer does not extend beyond the mature WP plugin of Frama-C.” (Section 3, p. 3.)

Inference: a proposed Verus pipeline would generate helper contracts, retain the annotated Rust artifact, and run Verus to check it. A proposed contract should count as verified only after the verifier accepts the resulting program. The paper does not implement this pipeline.

Evidence: the paper reports a fully annotated output and a successful WP result for its case study, but no comparison against another contract-inference tool. The architecture diagram labels the possible verification outcomes “Verification succeeded” and “Verification failed” (Figure 2, p. 4); no automated repair loop is described.

## related foundations: weakest and strongest conditions

What it is: the paper situates AutoDeduct among specification-inference techniques. Weakest preconditions give the weakest sufficient condition for a postcondition; strongest postconditions characterize final states reachable from a precondition. The paper describes symbolic execution for programs without unbounded loops, counterexample-guided abstraction refinement for precondition inference, and multi-abduction for inference across multiple functions (Section 1, p. 2).

Inference: start from the module postcondition and propagate it backward through helper calls (weakest-precondition style), or start from entry assumptions and propagate forward (strongest-postcondition style); simplify the resulting predicates; use counterexamples to strengthen a candidate; and solve all helper contracts together when a single-function summary is too weak. The paper presents these as related foundations, not as separate AutoDeduct modes.

Inference: a Verus adaptation could propose assertions or intermediate state predicates from entry assumptions and desired results, then check them with the verifier. This is a proposed specification-generation strategy, not an evaluated AutoDeduct feature; failed proof obligations would require diagnosis rather than automatic treatment as concrete counterexamples.

Evidence and limits: no new numbers are reported for these related techniques. The paper's own inference remains Horn-clause/property-guided rather than a claim that it computes mathematically weakest contracts. It warns that contracts “may not generalise to other contexts” (Section 3, p. 4), which limits reuse.

Quote: “In the domain of contract inference tools, we consider AutoDeduct as a toolchain for property-guided contract inference, meaning that it infers contracts that are strong enough for verifying the current program, but they may not generalise to other contexts.” (Section 3, pp. 3–4.)

## evaluation and denominators

The evaluation uses one automotive C module adapted from industrial software. The original is about 1,400 lines; its previous verification with manual annotations took two person-months. After removing code irrelevant to the selected requirements and rewriting some pointer constructs, the tested version is 123 lines, has one contracted entry point, five helper functions without contracts, and five engineer-written requirements represented by separate `ensures` clauses (Section 4, p. 6). On this single 123-line case, verification succeeds in roughly 23 seconds: 18 seconds functional inference, 2 seconds auxiliary inference and 3 seconds WP checking. The denominator is one module; there is no multi-module or per-function success rate.

The authors state: “We did not compare AutoDeduct against other tools, since we are not aware of any existing toolchain for deductive verification that can automatically verify such C programs using contract inference.” (Section 4, pp. 6–7.) Inference: the timing does not establish superiority over other tools. The original two-person-month effort and the 23-second run concern different versions of the module, so they do not establish a controlled speedup.

## what is proved and what stays trusted

The paper states: “The verification with WP ensures that the entry-point function satisfies the provided contract, and that every helper function satisfies its inferred contract.” (Section 3, p. 3.) TriCera and Eva generate annotations that WP then checks. The authors therefore place the necessary trust base at WP, as quoted above. Inference: successful verification establishes the supplied contract; it does not independently establish that the contract captures the intended industrial requirement. This study does not audit WP, its dependencies, the inference implementations or their soundness.

## techniques for the catalog

- entry-contract-guided functional inference — infer helper `requires` and `ensures` sufficient to prove a supplied module contract
- Horn-clause contract solving — encode calls as pre/post predicates and extract a satisfying interpretation as contracts
- auxiliary abstract-interpretation inference — derive value ranges, pointer validity and frame conditions with Eva-like analysis
- staged annotation and verification — run functional inference, auxiliary inference and final proof as inspectable stages
- related-work foundation: state-summary specification inference — weakest/strongest conditions and counterexample-guided methods; not a separately implemented AutoDeduct mode
