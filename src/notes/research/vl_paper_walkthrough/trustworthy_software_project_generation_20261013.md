# Trustworthy Software Project Generation : a Case Study with an Interactive Theorem Prover
(authored by agents unless marked 🧑)
Tag: `fang2026trustworthy`, [paper](https://arxiv.org/abs/2605.26017)

source: Jian Fang and Yingfei Xiong (Peking University), arXiv:2605.26017v1, 25 May 2026, 10 pages, no appendix. The system is printed as "SPDDW L" in the extracted text.

earlier note: `topic_studies/formal_verification_rust/llm_for_verification/c_and_systems_proofs.md` holds seven lines on this paper (method in one line, 47 instructions, 30 minutes, 265 tests, 12 hours of fuzzing, the unverified host layer, the extraction assumption). What follows adds the workflow as steps, the shape of the plan and of the properties, the repair ladder, the Dafny comparison in detail, and the Verus forms.

## the proof covers LLM-written lemmas about an LLM-written core; extractor, host and specifications are trusted

Proved, by the Rocq kernel: the lemmas that an LLM agent wrote about the pure functions that the same pipeline wrote. For the one instruction shown, JALR, these are three per-function lemmas and a frame lemma, plus lemmas about the dispatcher `step` (register file length stays 32, register 0 stays zero, and others listed in technique 4). The paper prints two lemma statements with proofs elided as `Proof. ... Qed.` and one with its full proof, four tactic lines between `Proof.` and `Qed.` (Fig. 4, p.5).

Measured: one reported run of one task with one model; the paper reports no repeats. “All synthesis runs use Claude Opus 4.7 High as the underlying model, with a 30-minute timeout.” (Section V-B, p.7) Output sizes are in Table I (p.7): 821 lines of Rocq function definitions, 116 of types, 922 of properties, total 1,859; 2,848 lines of extracted C++ and 88 of host C++, total 2,936. Both sums check.

Trusted, by the paper's own words:
- the extractor: “SPDDW L assumes that the extraction backend faithfully preserves the operational semantics of the accepted source definitions.” (Section IV-E, p.7)
- the host code: “Consequently, machine-checked guarantees cover the extracted core relative to its specifications, not every line of the complete executable.” (Section II, p.2)
- Inference: the specifications themselves. The proving agent both states each theorem and proves it (Section IV-C, p.6), and no step compares the stated theorems with the RISC-V manual except the agent's own reflection after k failed repairs. A lemma that is true but weaker than the requirement would be accepted.
- Inference: the mapping of Rocq `Z` (unbounded) to C++ `int64_t` is part of the extraction assumption; the paper says “The architectural integer width is pinned to XLEN_nat = 32, so a machine word is a 32-bit integer represented as Z in Rocq and extracted to an int64_t that always holds a value in [0, 232 ).” (Section III-A, p.3; "232" is how the PDF text prints 2 to the power 32) but shows no lemma that every intermediate value fits in 64 bits.

## technique 1: pure core, effectful host

what it is: split a project into deterministic functions over explicit data, which are specified and proved, and a thin layer in the target language that does I/O, allocation and command-line handling, which is only tested.

when to use: a project whose behaviour that matters is a state transformer (interpreter, decoder, protocol state machine, parser) and whose effects are few.

how it is done:
1. the requirement analyzer assigns to a pure function every deterministic computation the requirement makes a correctness claim about: “Any deterministic computation whose correctness is asserted by the requirement—core logic, modeled state transformations, or arithmetic over domain values—is assigned to a pure function so that the proving agent can reason about it.” (Section IV-A, p.5)
2. I/O, allocation and command-line handling are written down as host obligations and are not claimed verified (Section IV-A, pp.5-6)
3. the whole machine is one record: register file as a list of 32 words, program counter, memory as an association list keyed by address, CSR file, halt flag, privilege mode, host-event trace (Section III-A, p.3)
4. each instruction is one handler from state and operands to state, for example `exec_JALR : state → reg_idx → reg_idx → word → state` (Section III-A, p.3)
5. SPDDW L generates common helper functions that the coding agent uses to build handlers, so that each handler is a pure, total Rocq term: `read_reg`, `write_reg` (no-op at index 0), `st_regs_pc`, `sext_from k`, `addr_mod`, `low_XLEN`, `jalr_target` (Section III-B, p.3)
6. after proof, extract the core and link it with the host layer (Section III-C, p.4)

the paper's code shape (Fig. 4, p.5):

```
Definition exec_JALR (s : state) (rd rs1 : reg_idx) (off : word) : state :=
  let link := low_XLEN (pc s + 4) in
  let summed := read_reg (regs s) rs1 + sext_from 12 off in
  st_regs_pc s (write_reg (regs s) rd link) (jalr_target summed).
```

Verus form. Inference: in Verus the split is between `exec fn` items with `requires`/`ensures` and items marked `#[verifier::external_body]` or given contracts with `assume_specification`; the second group is the host layer. No extraction step exists, because the verified `exec fn` is the Rust that is compiled, so the extraction assumption is replaced by trust in Verus's encoding, Z3 and rustc. Two things change. First, the model need not be the code: one writes a `spec fn` version of each handler over mathematical types (`int`, `Seq`, `Map`) and an `exec fn` over `u32`, `Vec` and a struct, whose `ensures` says its result equals the `spec fn` applied to the abstract view of the input. Second, machine arithmetic is real: Verus requires a proof that `pc + 4` does not overflow `u32` or an explicit wrapping operation, where the Rocq version folds with `low_XLEN` over `Z`. What does not carry over: the association-list memory and list register file are model types; executable Rust would use arrays or a `Vec`, and the length-32 invariant becomes a `#[verifier::type_invariant]` or a `requires`/`ensures` pair on every handler.

evidence: one project. “SPDDW L then extracted 2,848 lines of C++ from the verified Rocq sources; the host project contributes only 88 lines of glue code for I/O and runtime integration.” (Section V-B, p.7) 88 of 2,936 C++ lines is 3.0% (my division).

where it fails or what it assumes: effects that interleave with logic. The paper names Interaction Trees as one way to model effects inside the prover and chooses a simpler architecture instead (Section II, p.2). Inference: a CPU interpreter is close to the best case for this split; a server with timeouts, concurrency and retries has much more behaviour in the host.

## technique 2: the coding plan, with ambiguity as a blocker

what it is: a natural-language document, written before any code, that both the coding agent and the proving agent work from instead of the raw requirement.

when to use: when two agents (or two passes) must agree on types and signatures, and when the requirement leaves representation choices open.

how it is done:
1. the plan answers four questions: “It answers four questions: what data types represent the concepts in the ITP language, what pure functions must be implemented, which operations remain in the effectful host layer, and what logical properties the pure implementation must satisfy.” (Section IV-A, p.5)
2. type section: for each concept, its type in the prover and the target-language type after extraction. Unbounded integers are `Z`; bounded values are `Z` with a range predicate; fixed-size sequences are `list` with a length invariant; products are `Record`s. `Z` goes to `int64_t` in C or C++, `i64` in Rust, `int` or `int64` in OCaml (Section IV-A, p.5)
3. function section: the signature and the semantic clause of each function (Section IV-B, p.6); one computation per function (Section IV-A, p.6)
4. property section: per function, a computes clause and a list of state fields that must not change (Section IV-A, p.6)
5. if a choice is open, stop and ask: “Because the coding plan must be unambiguous for synthesis to proceed, the analyzer treats any underspecified choice as a blocker rather than guessing a default.” (Section IV-A, p.5) The examples given are the target language, the integer width of a domain value, and signed or unsigned comparison.
6. hand the finished plan to both agents. The coding agent may not pick another type for a concept the plan fixed, nor another signature (Section IV-B, p.6)

Verus form. Inference: the plan's type section should list three types per concept, not two: the `spec` type (`int`, `nat`, `Seq<u8>`), the `exec` type (`u32`, `Vec<u8>`), and the view function that relates them. The function section is a list of `spec fn` signatures and matching `exec fn` signatures; the property section is the `ensures` text in words. Step 5 carries over unchanged and matters more in Verus, since signed versus unsigned and width decide which overflow obligations exist.

evidence: none isolated. The paper has no run without the plan. It says the run “automatically synthesized a coding plan for each of the 47 instructions” (Section V-B, p.7).

where it fails or what it assumes: the paper does not say whether the analyzer asked any clarification question in the evaluated run. The claim of full automation is worded as holding after input: “This run is fully automatic: once we supply the requirements and target configuration, no human intervenes in the generated definitions, specifications, proofs or repairs, extraction, or C++ host integration.” (Section I, p.2) Inference: the target configuration is where the answers to step 5 would have been supplied; the count of such answers is not reported.

## technique 3: properties as computes clauses plus frame conditions

what it is: decompose each requirement clause into small lemmas about one function: what its output equals, and what it leaves alone.

when to use: any state-transforming function. The frame half is the one that is easy to forget.

how it is done:
1. for each function write lemmas for what it computes. For JALR: `jalr_link` (rd receives the low XLEN bits of pc + 4), `jalr_pc` (new pc is x[rs1] + sext(offset) with bit 0 cleared), `jalr_lsb_zero` (bit 0 of new pc is zero) (Fig. 3, p.4)
2. write a frame lemma listing every untouched field: memory, CSRs, halt flag, privilege mode, trace, every register other than rd, and the register file length (Fig. 3, p.4)
3. the stated reason for step 2: “Without these, an instruction that writes the correct rd and pc but quietly corrupts an unrelated register or shrinks the register file would still violate correctness.” (Section III-A, p.3)
4. the proving agent turns each plan property into a theorem over the accepted types and function, and writes a tactic script (Section IV-C, p.6)

the paper's code shape (Fig. 4, p.5):

```
Lemma exec_JALR_lsb_zero :
  forall s rd rs1 off, Z.modulo (pc (exec_JALR s rd rs1 off)) 2 = 0.
Proof. intros s rd rs1 off. unfold exec_JALR, st_regs_pc. simpl pc. apply jalr_target_even. Qed.
```

Verus form. Inference: with a `spec fn exec_jalr(s: State, rd: int, rs1: int, off: int) -> State`, each lemma is a `proof fn` with an empty body `{}` or a short one, for example `proof fn jalr_lsb_zero(s: State, rd: int, rs1: int, off: int) ensures exec_jalr(s, rd, rs1, off).pc % 2 == 0`. For the executable handler taking `&mut` state, the frame lemma becomes `ensures` clauses that compare each field with `old(s)`: every field not written equals its old value, and `forall|i: int| 0 <= i < 32 && i != rd ==> #[trigger] s.regs[i] == old(s).regs[i]`. What changes: in Verus an `exec fn` with `&mut` has no implicit frame, so each unchanged field must be stated or callers lose it; this is the same duty the paper's step 2 imposes. What does not carry over: `unfold`, `simpl`, `apply` have no counterpart; the solver unfolds a non-recursive `spec fn` by itself, and where it does not, the tools are `reveal(...)`, `assert(...) by { ... }` and calling a lemma `proof fn`.

evidence: the JALR lemmas are the only per-instruction properties shown. Table I gives 922 lines for all properties and proofs together; the number of lemmas is not reported.

where it fails or what it assumes: Inference: the three JALR lemmas and the frame lemma do pin down the post-state field by field, but the paper offers no check that this holds for the other 46 instructions, and no check that `jalr_target` or `sext_from` mean what the manual means; those helpers are definitions that the lemmas are stated in terms of. A lemma stated through a wrong helper is proved and wrong.

## technique 4: composition theorems over the dispatcher

what it is: after per-handler lemmas, prove invariants of the single `step` function that dispatches on the decoded instruction.

when to use: when many verified pieces are joined by a `match`, and the property wanted is about any step.

how it is done:
1. link handlers into `step : state → instr → state`; a halted state is returned unchanged; the arms shown wrap the handler in `pc_advance4` (Fig. 5, p.5)
2. state each structural invariant in the form: if it holds of `s` then it holds of `step s i`, for all `s` and `i`; a frame property instead concludes that a field of `step s i` equals that field of `s` (Fig. 5, p.5)
3. the properties listed: “SPDDW L then proves composition theorems stating that step preserves the global properties whenever each constituent handler does: the register file stays length 32, x0 stays zero, the program counter stays in [0, 232 ), non-CSR instructions leave the CSR file alone, and non-memory instructions leave memory alone.” (Section III-C, p.4; "232" is 2 to the power 32)
4. classifier predicates such as `is_csr i = false` select the instructions a frame property applies to (Fig. 5, p.5)

the paper's code shape (Fig. 5, p.5):

```
Lemma global_non_csr_csrs_frame :
  forall s i, is_csr i = false → halt s = false → csrs (step s i) = csrs s.
```

Verus form. Inference: write `spec fn inv(s: State) -> bool` as the conjunction of the structural facts and prove `proof fn step_preserves_inv(s: State, i: Instr) requires inv(s) ensures inv(step(s, i))`. The body is a `match i { ... }` in proof mode with one call to the per-handler lemma in each arm; with 47 arms this keeps each solver query small. For an executable interpreter loop the same `inv` goes in the loop's `invariant` clause, and a `decreases` clause is needed only if the loop is meant to terminate (a fuel counter is the usual device).

evidence: the lemmas exist and are accepted in the one run; their proofs are elided in the paper.

where it fails or what it assumes: the listed global properties are safety invariants and frames. Inference: none of them says that `step` on a decoded instruction equals the manual's semantics for that instruction, or that the decoder inverts the encoding in Fig. 2; functional correctness rests on the per-handler lemmas of technique 3 alone.

## technique 5: repair ladder with the proof state as feedback

what it is: a fixed escalation when the checker rejects something, routed to the agent responsible.

when to use: any generate-check-repair loop with separate code and proof roles.

how it is done (all from Section IV-D, p.6):
1. type errors in a definition (mismatch, undefined identifier, wrong arity) go to the coding agent with the compiler message; the fix is one term
2. a semantic error in a body shows up as a property the proving agent cannot prove; then the coding agent gets the plan, the current body and the error feedback
3. a proof error (tactic failure or open subgoal) goes to the proving agent together with the Rocq proof state at the failure point; it patches the script and retries
4. after k failed patches, stop patching and reflect: “Once k repair attempts all fail, the agent stops patching the script and reflects: it re-examines the theorem statement, the function body, and the type definitions against the original requirement to verify that each code faithfully represents what the requirement demands.”
5. if any of the three deviates from the requirement, regenerate it and prove again; if none does, write a new proof script from scratch
6. if that also fails within the threshold, hand the user the failing goal, the last script and the current function body

The value of k is not given, and the paper does not report how many times any rung was reached in the run.

Verus form. Inference: Verus is an SMT-backed verifier, the class the paper puts Dafny in (“Dafny represents an automated-verification paradigm (e.g., Verus [25]), where specifications are embedded in code and verification conditions are proved by an automated solver.”, Section V-A, p.7), so rung 3's input does not exist as such: a failed Verus run names the `ensures`, `assert`, `invariant` or call-site `requires` that failed, but shows no remaining goal with hypotheses. The nearest substitute an agent can build itself is to bisect: insert `assert(...)` statements for intermediate facts to find the first one the solver cannot prove, then prove that one with `assert(...) by { ... }`, a lemma `proof fn`, or `by (nonlinear_arith)` / `by (bit_vector)`. A solver timeout may carry no location beyond the function (the study's expectation, not checked against the Verus references), which would match what the paper reports for Dafny, that a timeout gives no useful information about why the obligation failed; the response that keeps feedback local is small functions and one lemma per fact, as in technique 3. Rungs 1, 2, 4, 5 and 6 carry over as written. Rung 5 needs one addition that is not in the paper: when the theorem statement (in Verus, the `requires`/`ensures`) is the part regenerated, the change should be shown to a human or checked against the plan, since it changes what is proved.

evidence: indirect, from the backend comparison below.

where it fails or what it assumes: rung 4 lets the same agent that failed to prove a theorem rewrite the theorem. The paper's claim “There is no way for the LLM to hallucinate a proof into acceptance; the compiler either finds a closed derivation or rejects the submission.” (Section IV-C, p.6) is about proofs. Inference: it does not cover a statement that was weakened until provable, and the only guard the paper reports is that same agent's reflection step in rung 4.

## technique 6: choose the backend by the feedback it gives on failure

what it is: a one-task comparison of an interactive prover (Rocq 9.0.1) and an SMT-based verifier (Dafny 4.11.0) under the same agent, task and time limit, read as evidence about which failure messages an agent can act on.

how it was done:
1. swap the backend; change the analyzer to emit Dafny type declarations, function signatures and pre/postcondition templates (Section V-C, pp.7-8)
2. run the same synthesis with the same 30-minute limit
3. inspect the failed run

evidence: “It generated 2,070 lines of Dafny code during that time but did not produce a complete, verified set of pre- and postconditions for all functions.” (Section V-C, p.8) The explanation offered: “Without a useful local error message, the agent cycles through alternative verification conditions, each triggering another solver timeout, until the experiment reaches its time budget.” (Section V-C, p.8) The Rocq run finished within 30 minutes and used about 21 million tokens (Section V-B, p.7).

where it fails or what it assumes: one run per backend; no repetition, no variance, no count of timeouts, no Dafny settings (time limit per query, whether functions were split), no report of how many of the Dafny functions did verify, and the token count of the Dafny run is absent. Inference: the comparison cannot separate poor SMT feedback from an agent that wrote large Dafny methods whose queries time out; a Dafny or Verus run with the technique-3 discipline of one small lemma per fact is not reported.

## contradictions and things that do not add up

- The contribution list says the comparison is made “without claiming that one verifier dominates in all settings” (Section I, p.2), while the boxed answer says “Explicit proof construction makes Rocq better suited to LLM-agent-driven development than approaches based on pre/postconditions and SMT solving.” (Section V-C, p.8; line-break hyphens removed). The second is a general claim drawn from one run.
- The task is called the unprivileged RV32I base, yet the machine state carries a CSR file and a privilege mode (Section III-A, p.3), and the cited manual page is titled “Unprivileged isa: Rv64” (reference [21], p.9). Inference: 47 is the instruction count of the older RV32I definition that still included the CSR instructions; the current base has 40. The paper does not list the 47.
- Fig. 3's caption calls `jalr_frame` an invariant “over the composed step function”, but its text is about one instruction; the properties over `step` are the separate lemmas of Fig. 5.
- Three citations for the closest related work are printed as “[?], [?], [?]” (Section I, p.2), so the works behind the "largest reported" claim cannot be identified from the paper.
- Section III-B says a failed check returns “the local proof state and the source fragment the error refers to”; Stage 2 in Section III says rejected implementations come back with “compiler feedback”. These agree only if the proof state is part of the compiler feedback; Section IV-D says it is given for proof errors.

## how strong the validation is

“The LLM generated 265 test cases covering all 47 instructions; all 265 passed against the extracted C++ interpreter.” (Section V-D, p.8) “The AFL++ campaign ran for 12 hours and executed 98.2 million inputs, completing 211 full fuzzing cycles.” (Section V-D, p.8) It found no crash and no hang.

Inference: both checks are weak as evidence of ISA conformance. The tests come from an LLM (the paper does not say which; presumably the model family that wrote the specifications), so a shared misreading passes; the fuzzer's oracle is crash or hang, which a wrong result does not trigger. The paper does not run an independent conformance suite or compare against a reference emulator.

## techniques for the catalog

- pure core / effectful host split — put every deterministic computation the requirement makes a claim about into proved pure functions and leave I/O and allocation in a thin tested layer
- coding plan with ambiguity as blocker — fix types, signatures, host obligations and properties in one document before code, and ask the user instead of guessing any open representation choice
- computes clause plus frame lemma — for each state transformer prove what each written field equals and, separately, that every other field and the container sizes are unchanged
- composition theorems over a dispatcher — prove each structural invariant for the single `step` function by case on the instruction, reusing per-handler lemmas
- repair ladder — route type errors to the coder, proof errors with the goal state to the prover, and after k failed patches re-read statement, body and types against the requirement before re-proving or handing the goal to the user
- backend chosen by failure feedback — prefer a checker whose failure names a concrete remaining goal; under SMT, keep obligations small so a timeout still localises
