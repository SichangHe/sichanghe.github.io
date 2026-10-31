# ProofSketcher: Hybrid LLM + Lightweight Proof Checker for Reliable Math/Logic Reasoning
(authored by agents unless marked 🧑)
Tag: `kommuru2026proofsketcher`, [paper](http://arxiv.org/abs/2604.06401v1)

## result and scope
ProofSketcher separates proposal from acceptance. The paper says: “The LLM produces a typed proof sketch with explicit step tags and typed holes.” A lightweight kernel expands each node into obligations, and acceptance requires every obligation to be discharged by trusted inference or a checked certificate. The LLM, retrieval, and external solvers remain untrusted. The paper evaluates miniF2F-test, LeanDojo-test, and ProofNet-test; a problem counts as solved only when the kernel accepts a replayable proof. Table I reports pass rates, with the benchmark denominator implicit in the named test split: ProofSketcher is 92.21% on miniF2F-test, 58.25% on LeanDojo-test, and 44.62% on ProofNet-test. The table gives no item counts, confidence intervals, or runtime values in the text excerpt.

## technique: typed sketch generation
Use this when full tactic scripts are too detailed for an LLM and informal prose is too weak to check. Apply the paper's Phase 1 procedure (Section IV-A):

1. Give the system theorem `T`, context `Γ`, and logic `L` (first-order equality, optionally linear integer arithmetic).
2. Retrieve a bounded set of candidate lemmas/definitions as non-trusted hints (Section III-A).
3. Ask the LLM for a sketch `S` in the ProofSketch DSL.
4. For every node, record its goal formula, method tag (`rewrite`, `split`, `induction`, or `contradiction`), referenced facts, and typed subgoals.
5. Represent unfinished subgoals as typed holes; all holes must eventually be discharged.

The paper defines the interface: “The sketch is a structured plan with explicit step types (rewrite, case split, induction, contradiction) and typed holes.” Its stated benefit is a smaller search space and localized repair compared with direct tactic generation.

Inference: In Verus, a typed sketch can be an intermediate record consumed by a generator that emits Rust proof functions and `requires`/`ensures`; the final Verus verifier, not the sketch parser, must establish the contract. Verus has no ProofSketch DSL in the paper, so this mapping is an inference.

## technique: deterministic obligation extraction
Use this to turn high-level intent into finite, checkable goals. In Phase 2 (Section IV-B), a trusted kernel parses `S` and deterministically emits `O = {(Γ_i ⊢ ϕ_i)}` according only to node tags and typed fields. A split node emits obligations under `Γ ∪ {c}` and `Γ ∪ {¬c}`. A rewrite node emits obligations justifying the equality and the rewrite at the chosen term position. Each obligation carries provenance: source node id, local context, and required theory fragment (Section III-A).

Inference: A Verus version would lower each sketch node to one or more `proof fn`s or assertion obligations, preserving source-node identifiers in generated names. Branch assumptions become branch-local `if` contexts; rewrite obligations become lemmas or `assert ... by { ... }`. The paper does not specify this translation.

## technique: certificate-gated discharge and trust boundary
Use this when external automation is useful but cannot be trusted directly. Phase 3 (Section IV-C) discharges each obligation either by kernel-native propositional/equality/explicit-instantiation rules or by an external solver. For the latter, translate `(Γ_i, ϕ_i)`, require a proof certificate, validate it with a trusted checker, then record the result as a derived kernel step. A failed certificate marks the obligation failed. The paper states: “a solver call has to provide a certificate which gets verified by a small trusted checker and, thus, maintains a minimal trusted computing base.”

The stated trusted computing base contains “(i) the kernel, (ii) the certificate checker, and (iii) proof object storage/replay.” Retrieval, the LLM, and solvers are outside it. The translation layer is a remaining risk: the discussion says it “should be minimized and tested heavily because it is a common source of subtle unsoundness.”

Inference: In Verus, SMT is already part of verification, but an agent-generated auxiliary solver result should be accepted only through Verus's normal verifier and any separately checked proof artifact. The Verus trust boundary must include the translation from generated Rust/specifications to solver queries; this is an inference from the paper's boundary argument.

## technique: localized repair with incremental caching
Use this when a proof almost works and whole-proof regeneration is expensive. Phase 4 (Section IV-D) is:

1. On failure, return a record containing node id, cause, `Γ_i`, and `ϕ_i`.
2. Classify the cause as missing lemma, failed instantiation, invalid rewrite, or unsatisfied precondition.
3. Prompt the LLM to edit only the failed node and its direct subgoals, yielding `S'`.
4. Hash each node by goal, method, inputs, and hints; reuse cached proofs for unchanged nodes.
5. Re-check incrementally. Stop when all obligations pass and emit a replayable proof object, or reject after at most `R` repair iterations.

The reliability analysis records the first failing node and mean repair repetitions, but the paper provides no numeric means in the text or figures' captions. It warns that overly abstract sketches create huge obligations and solver calls, while overly detailed sketches approach tactic scripts. The recommended compromise is an explicit explanation of why each step should succeed plus certified lemmas.

Inference: In Verus, retain verifier diagnostics keyed to generated proof-node identity and regenerate only the affected proof function or assertion block. Verus's diagnostics and dependency behavior may differ, so this is a design inference, not a reported result.

## techniques for the catalog
- typed proof sketch: have an LLM emit tagged, typed nodes and holes instead of an unchecked full script
- obligation extraction: deterministically expand each node into sequent-shaped goals with provenance
- certificate-gated automation: accept external solver results only after trusted certificate checking
- localized incremental repair: edit the first failing node and reuse cached proofs for unchanged nodes
