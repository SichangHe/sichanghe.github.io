# ProofAug: Efficient Neural Theorem Proving via Fine-grained Proof Structure Analysis
(authored by agents unless marked 🧑)
Tag: `liu2025proofaug`, [paper](https://arxiv.org/abs/2501.18310)

## core idea

ProofAug is a response-processing procedure for language-model theorem proving. It analyzes the hierarchical structure of a generated full proof, replaces failing subproofs with placeholders at progressively coarser granularities, and invokes automation at each level. The abstract says: “we propose ProofAug, a procedure that equips LLMs with automation methods at various granularities through fine-grained structure analysis of model-generated proof proposals.” It also integrates with tree search through an Efficient Recursive Proving (ERP) module.

The paper targets a dilemma in Draft, Sketch, and Prove (DSP). Rough sketches leave intermediate conjectures too hard for automated theorem provers (ATPs); detailed sketches introduce unnecessary or syntactically difficult conjectures. ProofAug instead asks for a full proof, then derives compatible semi-proofs by replacing failed blocks with `sorry`. The authors state: “We first find its corresponding maximal compatible semi-proof (MCSP) that maintains most structural information yet can pass the check of ITP.” (Introduction, p. 2.) A semi-proof may contain placeholders and is not accepted as a final proof; every resulting proof must pass the interactive theorem prover (ITP).

The abstract also reports: “ProofAug also serves as a versatile plug-and-play module that seamlessly integrates with any tree-search algorithm.” (Abstract, p. 1.)

## unified state and response-processing model

The paper models an ITP as `(A,S,T)`: proof steps `A`, states `S`, and transition function `T`. `Parse` converts a response string to proof steps. A full proof `yf` is valid when the final state after concatenating theorem statement and proof has `finish = True` (Section 2.1, p. 3). Every generation method is decomposed into three actions: state selection, prompt formation, and response processing. ProofAug changes response processing while remaining compatible with other choices (Section 2.1, pp. 3–4).

The Isar implementation relies on hierarchical `proof...qed` blocks. The `proof(prove)` mode indicates a newly declared goal whose next step must be a proof method; `proof(state)` and `proof(chain)` carry other structural roles (Section 2.2, p. 4). This explicit structure lets the algorithm replace an inner block without discarding surrounding context.

Verus form.

## technique: maximal compatible semi-proof (MCSP)

The MCSP preserves as much of the initial proposal as the ITP can parse and execute. Algorithm 1 gives the procedure.

1. Parse the initial proof `yf0` into steps `a`; allocate state entries before each step and initialize the pointer at the initial state (Algorithm 1, p. 5).
2. Execute `a[i]` from the current state. On success, advance to the next step and state (Algorithm 1, p. 5).
3. On an error in `proof(prove)` mode, replace only `a[i]` with `sorry` and continue (Algorithm 1, p. 5).
4. On an error in another mode, find the innermost `proof...qed` block containing the failing step. Replace the block's contents with `Null`, put `sorry` at its end, and resume from the state before the block (Algorithm 1, p. 5).
5. If a failure is outside every block, return `Null`; otherwise continue until all steps pass or the proof reaches a finished state (Algorithm 1, p. 5).
6. Concatenate the resulting steps to obtain the MCSP. Compatibility means every `sorry` corresponds to a proof block or `by` clause and all other text is unchanged (Section 3.1, p. 5).

The method does not treat a `sorry` as evidence of correctness. It is a structural marker enabling later ATP calls. Inference: in Verus, the analogue is to retain surrounding Rust and replace the smallest failing proof obligation with a typed hole in an intermediate representation, while never compiling the hole as a product artifact. The final candidate must have no `external_body` or unproved placeholder on the function under verification.

## technique: bottom-up proof augmentation

After MCSP, Algorithm 2 walks the semi-proof. At each `sorry`, it invokes a fixed `<ATP>` method consisting of Isabelle `auto`, `simp`, `blast`, `fastforce`, `eval`, `sos`, `arith`, a field-simp combination, and Sledgehammer (Methods, pp. 6–7). If automation succeeds, the step is accepted and traversal continues. If it fails, the algorithm replaces the innermost enclosing block with `sorry` and retries at the coarser level. It stops when the theorem is proved, all compatible levels fail, or only a single `sorry` remains and `<ATP>` cannot prove the original theorem.

The key implementation sequence is:

1. Parse `FindMCSP(yf0)` and initialize the current state and pointer (Algorithm 2, p. 6).
2. For a non-`sorry` step, execute it directly; for `sorry`, execute `<ATP>` and record the error (Algorithm 2, p. 6).
3. If ERP is enabled and ATP fails, ask the model to complete the current proof state; test the completion, then extract failed tactics and try those as ATP input (Algorithm 2, p. 6).
4. If the error remains, replace the innermost block with `sorry`, move to its end, and continue (Algorithm 2, p. 6).
5. Return the fully instantiated proof only when the ITP reaches `finish = True` (Algorithm 2, p. 6).

Verus form. Inference: use deterministic proof automation (`assert`, `reveal`, arithmetic lemmas, and supported solver calls) at each hole, then retry after widening the hole to an enclosing proof block. The paper's Isabelle ATP list is not a Verus API. A Verus implementation should retain only constructs documented in the local Verus reference and should treat each solver success as a checked proof obligation, not as a runtime function result.

## technique: efficient recursive proving (ERP)

ERP extends ProofAug to tree search without restarting an entire proof. When ATP fails at a conjecture, the current partial proof and proof state are sent to the model. A successful completion is tested immediately. If it fails, the algorithm extracts failed tactics and retries them with ATP. New search nodes are added only for failed conjectures in the original MCSP. The state priority is the end position of the failed block: descendants are preferred to ancestors, and otherwise earlier semi-proof positions win (Section 3.3, pp. 6–7).

The authors explain the motivation: early errors can mislead a whole-proof tree search into spending budget after an invalid path. ERP instead checks whether a proposed reasoning path is valid before expanding it (Section 3.3, p. 6).

## experimental evidence

The primary experiments use Isabelle2022, PISA, 12 parallel instances on an Intel Xeon Gold 6326, and `deepseek-math-7b-base` on an RTX 3090. The ATP timeout is 10 seconds per proof step and 120 seconds for Sledgehammer (Section 4.2, p. 7). The benchmark is the Isabelle DSP version of miniF2F-test, plus a curated version that removes statements judged unprovable or inaccurate (Section 4.1, pp. 7–8).

Without ERP, ProofAug reaches 36.5%, 44.7%, and 52.5% at sample budgets 1, 10, and 100, versus DSP's 28.7%, 40.6%, and 49.2% in the authors' environment; the paper reports gains of 7.8%, 4.1%, and 3.3% (Section 4.3, p. 8). The denominator is the miniF2F-test theorem set under each attempt budget, and the exact baseline depends on their environment and prompts. With zero-shot ProofAug and ERP, the result rises from 54.5% to 56.1% at 500 queries per problem; without the query cap it reaches 57.4% (Section 4.4, p. 9).

Their mixed-strategy experiment solves 61.9% of the original miniF2F-test within about 1,700 model queries and 66.0% of the curated set within 2,100 requests (Table 2 and Section 4.5, pp. 8–9). The paper compares these with Subgoal-XL's 56.1% using 16,384 queries per problem (Table 2, p. 8). The Lean implementation improves Kimina-Prover-Preview-Distill-1.5B pass@1 from 44.3% to 50.4% on miniF2F-test (Appendix C, p. 13). These figures are Isabelle or Lean benchmark results, not Verus results; curation changes the denominator and makes the 66.0% number incomparable to the 61.9% original-set result without that qualification.

## what is trusted and what fails

The ITP verifies the final proof, but model prompts, parser correctness, block-boundary detection, ATP implementations, timeouts, and the benchmark formalizations remain trusted or operational assumptions. The paper reports that built-in automation is nondeterministic and exact reproduction can fail even in the same environment; they therefore recheck found proofs in Isabelle (Appendix D, p. 14). It also notes that miniF2F versions contain mistakes and inaccurate statements (Section 4.1, pp. 7–8).

The paper says ProofAug is strongest for declarative proof structures; procedural systems may need a converted declarative interface (Appendix C, p. 13). Its future work includes combining ProofAug with expert iteration and online learning, and fully exploiting its robustness in software engineering (Discussion, p. 9).

## techniques for the catalog

- maximal compatible semi-proof — execute a generated proof, replace failures with the smallest structurally compatible holes, and retain the verified context
- bottom-up proof augmentation — invoke automation at each hole and widen to enclosing blocks only after a finer obligation fails
- efficient recursive proving — branch only at failed conjectures using the preserved proof state and bounded model completions
- mixed strategy evaluation — combine prompts and proof-search modes, reporting dataset curation, query budgets, and denominators separately
