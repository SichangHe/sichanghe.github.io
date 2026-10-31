# Integrating Symbolic Execution with LLMs for Automated Generation of Program Specifications
(authored by agents unless marked 🧑)
Tag: `yang2026integrating`, [paper](https://arxiv.org/abs/2506.09550v4)

## scope and result

Yang et al. present SESpec, which combines path-sensitive symbolic execution, invariant templates, an LLM, and Frama-C verification. The abstract states: “Our method first employs symbolic execution to derive precise strongest postconditions for loop-free code segments.” Symbolic states and generated templates then guide loop-invariant synthesis (p. 1). The objective includes preconditions, postconditions, and loop invariants, with an optional verification goal (§2.1, p. 6). The supplied version identifies itself as “arXiv:2506.09550v4 [cs.SE] 20 Jan 2026” (p. 1); the tag uses that version's year, and the link uses its arXiv identifier rather than the placeholder DOI on p. 2.

The evaluation uses 395 programs across SyGuS, OOPSLA, SV-COMP, NLA, numer-S, Frama-C, pIp, and list-S (Table 1, p. 17). Frama-C 29.0 (Copper) uses WP, Z3, the Typed memory model, and a three-second timeout per query (§6.1, p. 17). The authors report: “Overall, SESpec successfully verified 354 out of 395 programs (nearly 90%).” This total spans all eight benchmarks and includes both loop-invariant and full-specification tasks (§6.2, pp. 17–18).

## technique 1: symbolic execution for specification generation

when to use it

Inference: use symbolic execution to supply path conditions and memory values when an LLM would otherwise have to infer dataflow or aliasing from source text.

steps from the paper

1. Flatten reachable memory into atomic locations and track memory values and aliasing (§3.1, pp. 8–9).
2. Represent each execution path by a path condition and a symbolic store. Initialize these at the function entry from the precondition and initial symbolic values (§3.1, pp. 8–9).
3. Generate a default precondition for initialized, valid reachable memory. The paper states: “In our approach, a default weakest precondition is automatically generated, requiring that all accessible atomic memory locations at the entry point are initialized and contain valid symbolic values.” Other requirements can be supplied by users (§3.1, p. 9; §2.1, p. 6).
4. Explore paths until a loop or function call. At a call, pause the caller, recursively generate the callee specification, and resume using that summary. Store generated function specifications for reuse (Algorithm 1, §3.2, pp. 9–10).
5. For a loop-free segment under a given precondition, disjoin its reachable symbolic states to obtain the strongest postcondition (§3.1, p. 9). Loop invariants are synthesized separately (§4, pp. 10–13).
6. Translate QCP symbolic results into natural-language explanations and ACSL skeletons for the LLM. The paper states: “A key design choice of the Translator is that the internal QCPL representation is never exposed to the LLM.” Verified ACSL specifications are translated back into QCPL to resume execution (§5.1, pp. 14–16).

Verus form

Inference: represent symbolic state relations as Verus specification predicates, then express generated contracts with `requires` and `ensures`. This requires a Rust-specific memory model; the paper establishes no direct translation from its flattened C memory model to Rust ownership. Proof lemmas could justify summaries used by callers, while symbolic execution itself would require a separate implementation.

Evidence and limits

Table 1 reports 197/204 linear-loop programs and 56/58 iteration-free programs solved, but 0/3 external/recursive-call programs (p. 17). The authors state: “Our current approach does not yet cover recursive functions or programs involving library functions and system calls, which we leave as future work.” (§6.2, p. 18). Inference: strongest-postcondition precision for loop-free segments does not establish that synthesized summaries containing loops are the strongest possible specifications.

## technique 2: symbolic-execution-derived invariant templates

when to use it

Inference: use templates to give an LLM known state relationships and constrain the missing parts of an invariant, especially for conditional loop entry and unchanged variables.

steps from the paper

1. Ask the LLM to reason about the original outermost loop in natural language (Algorithm 2, §4.1, pp. 10–11).
2. Run `LoopAnalysis` on a single-iteration unfolding, recursively handling calls and nested loops, then derive unchanged and non-inductive variables from the resulting postcondition (Algorithm 3, §4.2, p. 11).
3. Treat nested loops differently: “nested loops are processed purely via LLM (NestedLoopLLMCall), which infers invariants directly from the code context without relying on preconditions and templates, due to the lack of well-defined preconditions of nested loops.” (§4.2, p. 11).
4. For the outermost loop, generate five template forms: unchanged variables, loop-skip properties, non-inductive variables, inductive variables, and optional verification goals. These incorporate path conditions, symbolic values, and loop-entry conditions; undetermined formulas are left for the LLM (§4.3, p. 12).
5. Have the LLM complete the templates using symbolic results and code context, annotate the loop, and invoke verification-driven refinement (Algorithm 2, §§4.1–4.4, pp. 10–13).

For example, the motivating skeleton is `loop invariant (0 < \at(pIp, Pre)->len) ==> PLACE_HOLDER_for_i;` (§2.1, p. 6). Inductive specifications also receive two illustrative examples, one for arrays and one for singly linked lists (§5.2, p. 16).

Verus form

Inference: generate Rust loop `invariant` clauses from symbolic relationships, including implications for conditional entry and equalities for unchanged values. Translate ACSL state references and pointer properties into the supported Verus state model. This is a proposed adaptation, not an evaluated result of SESpec.

Evidence and limits

The ablation selects 100 programs: 70 loop-related and 30 function-related, with refinement capped at three iterations (§6.4, p. 20). Figure 5 reports loop validity/accuracy of 37.50%/28.75% for Only LLM, 62.86%/60.00% for LLM+SE, and 95.71%/87.21% for LLM+SE+REFINE. The function-specification block reports 26.67%/16.67%, 50.00%/46.67%, and 86.67%/86.67%, respectively (p. 20). Only LLM and LLM+SE use Pass@3; the refinement configuration uses Pass@1 with up to three refinement iterations (§6.4, p. 20).

Inference: the ablation has reporting inconsistencies. The loop percentages do not all correspond to integer counts out of the stated 70 cases, and the prose claims “achieving perfect scores across all metrics in the first setting” despite Figure 5's lower values (§6.4, p. 20). The figures above reproduce the displayed values without resolving those inconsistencies.

## technique 3: error-directed invariant refinement

what it is and when to use it

The paper states: “Loop invariants generated by the LLM are not always valid (able to pass formal verification) or sufficiently strong to guarantee the verification goal.” (§4.4, p. 12). Refinement addresses syntax errors as well as failed proof obligations.

steps from the paper

1. Run the verifier and collect errors; associate invariant errors with their candidate invariants (Algorithm 4, §4.4, p. 13).
2. Repair syntax errors directly. Strengthen invariants that pass Base and Preservation but fail the verification goal. Weaken or adjust invariants failing Base or Preservation while still implying the postcondition (§4.4, pp. 12–13).
3. Discard and regenerate invariants failing all checks, using specialized LLM prompts for the selected refinement strategy (§4.4, p. 13).
4. Reverify and repeat until success or the iteration limit. At the limit, eliminate invalid invariants to retain a valid subset (Algorithm 4, p. 13).

Inference: a valid subset after elimination need not prove the verification goal. The paper distinguishes validity, which requires Base and Preservation for loops, from accuracy, which additionally requires the goal (§6.3, p. 18).

Verus form

Inference: classify Verus diagnostics to guide changes to contracts, invariants, or proof lemmas. Check both invariant preservation and the desired postcondition after each revision. The paper does not evaluate Verus diagnostics or Rust proof repair.

Evidence and limits

Figure 5 reports the refinement improvements given above. The authors also report marginal gains from Pass@3 to Pass@5 on NLA, numer-S, and pIp (§6.3, p. 18). Inference: those observations support convergence within the reported settings, not a guarantee for harder nested loops.

## what is proved, trusted, and already done

QCP supplies symbolic states and Coq-verified postconditions; Frama-C discharges generated ACSL proof obligations using SMT solvers (§5.1, p. 14). The paper notes: “However, QCP requires manual annotations for loop invariants and callee function pre/postconditions, and may introduce unproven lemmas that require additional Coq proofs.” (§5.1, p. 14). Inference: these component descriptions do not themselves establish an end-to-end soundness proof for the translator and complete synthesis workflow.

The paper claims no fine-tuning, retrieval, synthesized datasets, or few-shot prompting (§7, p. 23), while describing two illustrative inductive-specification examples in its prompts (§5.2, p. 16). Inference: its broad no-few-shot claim requires that qualification, and using pretrained models alone cannot establish absence of benchmark exposure.

Inference: the transferable proposal for agent-written verified Rust is to derive semantic context mechanically before asking an agent to generate proof annotations, then refine them using verifier failures. Whether this helps with Rust ownership, library contracts, or nested loops requires separate evaluation. The 354/395 result concerns C/ACSL, not Verus.

## techniques for the catalog

- strongest-postcondition guidance: symbolically execute path conditions and stores so loop-free behavior constrains generated contracts
- invariant skeleton completion: generate variable and loop-entry templates, then have an LLM fill unknown relationships; nested loops use a separate LLM-only path
- error-directed refinement: classify syntax and proof failures, repair or revise invariants, and remove invalid candidates at the iteration limit
