# Towards Automated Formal Verification of zkEVMs Using LLM-Guided Constraint Synthesis
(authored by agents unless marked 🧑)
Tag: `huang2026towards`, [paper](https://arxiv.org/abs/2607.19795)

## what is proved and measured

VeriSynth translates Rust zkEVM opcode implementations into executable Python/Z3 transition models. It treats the language model as a formalization frontend and Z3 as the final arbiter. The paper's central limitation is explicit: “An unsatisfiable query establishes correctness only within the modeled state and assumptions, rather than for the entire zkEVM implementation.” (Sec. III-D, p. 4). Thus a passing query proves the encoded obligations for the extracted semantic unit, not equivalence to all Ethereum or circuit behavior.

The execution state is σ = ⟨pc, stack, memory, storage, gas, environment⟩. For a unit (u), VeriSynth builds variables (V_u), implementation constraints (C_u^{impl}(σ,σ')), and an obligation Φu. It checks (C_u^{impl} \land \lnot Φ_u): satisfiable means a counterexample state; unsatisfiable means no counterexample under the abstraction. The paper reports 87/95 injected bugs detected (91.6%) on its negative benchmark, compared with 44/95 (46.3%) for direct LLM and 58/95 (61.1%) for conversational LLM (Table III, p. 6). Detection is defined only on negative samples; “systematic false-alarm estimation on positive samples is deferred to future” (Table III caption, p. 6).

## technique: semantic decomposition into verification units

Use this when source semantics are spread across opcode handlers, helper functions, and state objects. The paper groups code by the state transition it jointly defines, rather than by Rust function boundaries. Its SSTORE example combines reading the old value, no-op detection, warm-access updates, gas calculation, and the storage write (Sec. III-B, p. 3).

Steps from Sec. III-A/B (pp. 3–4):

1. Parse and normalize the Rust source with a language front end.
2. Identify reads and writes of stack, memory, storage, gas, refund, context, and status.
3. Assign each fragment to one of five semantic families: arithmetic/bitwise, memory/storage, gas/refund, call/create, or environment/context.
4. Group fragments contributing to one transition into semantic unit (u), preserving dependencies through explicit interfaces.
5. Define (M_u=\langle V_u,C_u,\Phi_u\rangle) and synthesize constraints for the whole unit.

The paper states: “The purpose of decomposition is not merely to reduce prompt length, but to expose state effects that can be modeled independently while preserving explicit dependencies through unit interfaces.” (Sec. III-B, p. 3).

Inference: in Verus, the unit should be a Rust function or proof-facing module with explicit state structs. Use executable fields for pre/post state, `requires` for valid entry states, and `ensures` for state effects and frame conditions. A decomposition that omits a helper's write can leave a post-state unconstrained, so each unit boundary needs a proof that all relevant fields are either updated or equal to their old values. This is a design inference; the paper emits Python/Z3, not Verus.

Evidence: removing decomposition reduced detection to 72/95 (75.8%) and executability to 81.1% (Table V, p. 7). The denominator is the 95-sample negative benchmark; the ablation changes only decomposition while retaining the other pipeline components.

Failure: call/create units remain hardest because execution context, return values, address creation, memory effects, and failure propagation interact. VeriSynth detected 18/21 (85.7%) there (Table IV, p. 7), lower than arithmetic/bitwise 21/22 (95.5%).

## technique: retrieval-grounded model synthesis

Use this when the solver model needs stable names, types, and transition schemas. After decomposition, the system retrieves top-k previously validated units from a database (D=\{(u_r,M_r,meta_r)\}). Similarity combines code-embedding cosine similarity and family match: “the retrieved examples serve as semantic anchors for executable model construction.” (Sec. III-B, p. 3).

Steps:

1. Build a reference database only from models that pass syntax, sort, solver-execution, and semantic checks.
2. Compute target/reference similarity from embedding similarity and opcode-family match.
3. Exclude entries sharing source-file identity or opcode unit with the target to avoid retrieval leakage.
4. Retrieve the top-k compatible units by family, accessed state components, and symbolic types.
5. Put the anchors in the LLM prompt as modeling priors; do not copy them as templates.
6. Generate the target's declarations, transitions, frame conditions, and obligations.

Inference: a Verus analogue would retrieve verified proof patterns for bit-vector widths, state-machine transitions, and frame lemmas, then ask an LLM to instantiate them. Retrieval cannot be treated as evidence of the new function's correctness; Verus must reprove the generated code and specifications.

Evidence: removing retrieval lowered detection to 68/95 (71.6%) and executability to 78.9% (Table V, p. 7). This measures one ablation on the same 95 negatives, not general retrieval quality.

## technique: typed symbolic constraint synthesis

Use this for implementation-level properties involving fixed-width arithmetic, arrays, branches, and resource accounting. The system represents EVM words as fixed-width bit-vectors, control flags as Booleans, and memory/storage as symbolic arrays. It splits state into pre and post variables, translates branches to guarded constraints or Z3 `If`, and translates assignments to equalities.

Steps from Sec. III-C (p. 4):

1. Declare pre-state σ and post-state σ′ for stack, memory, storage, gas, refund, context, and status.
2. Encode each branch guard and path condition.
3. Encode assignments as post-state equalities.
4. Add a frame equality for every component not modified, such as `mem' = mem`.
5. Use consistent bit-vector widths and explicit exceptional-status variables.
6. Add family-specific obligations: arithmetic equivalence, stack-height preservation, storage consistency, gas/refund bounds, and failure/return propagation.
7. Query (C_u^{impl} \land \lnot Φ_u); retain a model as a repair witness when satisfiable.

The paper's illustrative SSTORE constraints are: “no op := (cur = val), warm′ := true, gas cost := ite(no op, 0, sstore cost(cur, val)), gas′ := gas − gas cost, store′ := ite(no op, cur, val).” (Sec. III-C, p. 4). Its obligations include `gas′ ≥ 0`, `no op ⇒ store′ = cur`, and `¬no op ⇒ store′ = val`.

Inference: Verus can express the same transition with a ghost pre-state, `old(...)` in `ensures`, bit-vector types, and quantified or functional specifications for arrays. Verus's executable Rust assignments remain; Python/Z3 `If` syntax does not carry over. A Verus proof must establish frame properties explicitly, usually through postconditions or lemmas.

Limit: the query is only as complete as the extracted unit, state abstraction, and obligations. A model that reproduces a faulty implementation can still satisfy a weak obligation; the paper separates (C_u^{impl}) from validated Φu specifically to reduce this risk (Sec. III-A, p. 3).

## technique: verification-guided auto-repair

Use this when generated scripts fail syntax, typing, solver construction, or semantic checks. VeriSynth classifies errors as parse, sort, execution, and semantic and feeds only the relevant diagnostic and model fragment back to the LLM.

Steps from Sec. III-D and Tables I–II (pp. 4–5):

1. Parse and import the generated Python script.
2. Construct symbolic expressions and detect missing declarations and sort mismatches.
3. Execute the solver query under a bounded timeout.
4. Check semantic obligations; if satisfiable, record the counterexample witness.
5. Classify the failure: parse diagnostics repair syntax/imports; sort errors align widths; execution errors repair invalid APIs; semantic witnesses refine guards, transitions, or constraints.
6. Apply the fixed-priority minimal repair action and repeat until accepted or the maximum budget is reached.

The bounded process has a maximum of three repairs and an average of 1.8 rounds per sample (Table VI, p. 8). Removing auto-repair reduced detection from 87/95 (91.6%) to 63/95 (66.3%) and executability to 66.3% (Table V, p. 7). Removing Z3 validation reduced detection to 45/95 (47.4%), showing that the solver, rather than LLM judgment, determines acceptance.

Inference: in Verus, compiler diagnostics and failed proof obligations can drive a bounded repair loop for `requires`, `ensures`, invariants, and proof lemmas. The repair agent must not weaken a specification merely to make Verus pass; a successful proof of a weakened obligation is not evidence of the intended property. This is an inference from the paper's explicit distinction between candidate generation and solver validation.

## benchmark and practical evidence

The benchmark has 95 negative samples, each with one localized injected bug across five families. VeriSynth's family counts are arithmetic/bitwise 21/22 (95.5%), memory/storage 24/26 (92.3%), gas/refund 14/15 (93.3%), call/create 18/21 (85.7%), and environment/context 10/11 (90.9%) (Table IV, p. 7). The sample denominator is always the family total, not 95 unless labeled overall.

For practical comparison, Scroll's handwritten mutation tests exposed 55/95 bugs and VeriSynth 87/95 (Table VII, p. 8). By category, handwritten tests found 44/75 opcode-semantic and 11/20 execution-path bugs; VeriSynth found 69/75 and 18/20. The reported rates are 57.9% and 91.6%, respectively. Inference: these are mutation-detection results on a self-constructed benchmark, not field defect rates or proof completeness.

The full system's executability rate is 93.7% (Table V, p. 7). Average cost is about 100,000 tokens per sample, about 9.5 million for 95 samples, with 1.8 average and three maximum repair rounds (Table VI, p. 8). The experiments use GPT-4o; the paper proposes future false-alarm estimation on positive samples and cross-project validation (Sec. VII, p. 9).

## what remains trusted and threat to agent-written verified Rust

Fact: Z3 decides satisfiability of the generated model, but the encoded state, obligations, extraction, and mutation benchmark remain assumptions. Fact: the authors say “The LLM is not treated as a correctness oracle” (Sec. III-D, p. 5). Inference: for Verus, this architecture threatens products mainly through omitted state effects, weak specifications, incorrect foreign-function models, and proof repairs that silently change the requirement. It is useful as a model-construction and regression aid, not as evidence that arbitrary Rust implements Ethereum semantics. VL should not redo a generic LLM-plus-SMT pipeline; the open Verus-specific work is linking generated contracts to owned Rust code and checking external dependencies, compiler/erasure behavior, and real zkEVM semantics.

## techniques for the catalog

- semantic decomposition: group scattered Rust code into state-transition units whose interfaces expose every relevant read and write
- retrieval-grounded synthesis: retrieve independently validated semantic models to anchor types, schemas, and solver APIs
- typed SMT encoding: represent pre/post EVM state, guards, assignments, frame conditions, and safety obligations with fixed-width bit-vectors and arrays
- verification-guided repair: classify compiler and solver feedback, apply bounded localized repairs, and recheck executable semantic constraints

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
