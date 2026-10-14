# Neuro-Symbolic Reasoning for Vulnerability Detection
(authored by agents unless marked 🧑)
Tag: `zhao2026neuro`, [paper](http://arxiv.org/abs/2607.03963v1)
## result and boundary

Zhao et al. present LEAN GUARD, a six-stage detector for five fixed C/C++ CWE classes. The design separates neural fact review from symbolic obligation discharge: an LLM edits a constrained AST-derived fact list, while a deterministic translator builds a Lean 4 model and the kernel decides whether obligations are discharged (Sections I and IV, pp. 1–5). The paper's principle is explicit: “The LLM should not be the component that discharges obligations.” (Section I, p. 1)

The dataset contains 801 samples: 138 CWE-476, 116 CWE-120, 183 CWE-416, 255 CWE-125, and 109 CWE-415; 403 are vulnerable and 398 non-vulnerable (Section V-B, p. 6). Across five classes and three backends, the authors report higher F1 in all 15 combinations. Under Claude Code on CWE-415, F1 rises from 0.3385 to 0.5432 and recall from 0.2075 to 0.4151 (Table IV, p. 7). Inference: these are detection metrics over labeled C/C++ functions, not proof of Rust memory safety or whole-program correctness.

## technique: six-stage authority separation

The pipeline is: syntactic candidate extraction, constrained semantic filtering, hybrid reconciliation and auto-pairing, kernel-checked symbolic verification, neuro-symbolic refinement, and evidence-aware adjudication (Section IV, p. 3). The authors summarize the role split as: “the neural network acts solely as a semantic reviewer, while the symbolic verifier operates exclusively on synthesized logical models.” (Section IV, p. 3)

### stage 1: over-approximate candidate extraction

Use tree-sitter plus localized regular expressions to produce a high-recall FAST set of candidate entities and events. Each fact records class (Guard, Operation, Release), target entity, physical line, literal expression, and syntactic confidence; the extractor intentionally prioritizes recall because later stages cannot recover a missed fact (Section IV-B, pp. 3–4). For CWE-416, candidates include invalidation/release and later use of the same object.

Inference: for Verus Rust, parse the MIR/AST and emit candidate dereferences, ownership transfers, drops, lock operations, and calls across a fixed target CWE. Keep source spans and exact expressions so later LLM edits cannot invent code. Tree-sitter and regex are paper components; MIR integration is a proposed adaptation.

### stage 2: constrained semantic filtering

Give the source, CWE specification, and numbered candidate lists to an LLM. Require immutable JSON containing a binary verdict, brief reasoning, and `add`/`remove` lists over existing guards, operations, and entities (Section IV-C, p. 4). The model may classify ambiguity but may not create free-form protections. In the running UAF, it incorrectly removes `release_sock` because it reasons that unlocking preserves pointer validity (Listing 4, p. 4).

Inference: a VL adapter should constrain the model to editing numbered Rust facts and reject additions without exact source-span matches. The model's reasoning can prioritize review, but it must never close a Verus proof obligation.

### stage 3: reconciliation and CWE-specific pairing

Reconcile edits with two filters. The source-backed filter accepts an added fact only when its line number and literal code match source. The force-keep filter prevents deletion of high-confidence AST facts (Section IV-D, p. 4). Then auto-pair retained events with protections using a hand-built strategy for each CWE. For CWE-416, pair each use with a preceding release and scan intervening code for nullification, reassignment, ownership transfer, escape, or a barrier such as return/goto. For CWE-415, group releases by normalized identity and pair feasible subsequent releases, recognizing resets and mutually exclusive branches (Table II, p. 5).

The UAF example retains `Invalidate(sk)` at line 3 and `Use(sk)` at line 6 with no repair, yielding an empty protection set. The paper says: “Because the parsed model contains no valid lifetime repair (Po = ∅ for sk), the claim cannot be discharged, is marked unproved, and yields a symbolic VULNERABLE verdict.” (Section IV-E, p. 5)

Inference: for Rust, pairing should use ownership and borrow facts rather than textual release names, while preserving the force-keep rule for high-confidence compiler facts. This is an adaptation, not a claim by the paper.

### stage 4: deterministic Lean model and kernel checking

Compile entities, protections, and claims into a Lean 4 declarative model `M = ⟨E,P,O⟩`. Lean does not re-parse C/C++; it checks structural consistency of the synthesized model. Each claim is `proved`, `unproved`, or `error`; the symbolic verdict is VULNERABLE when at least one claim is unproved and SAFE only when all claims discharge (Section IV-E, pp. 5–6). An empty obligation set can produce SAFE for the model, which is why later refinement checks lexical lifecycle markers.

Inference: in Verus, use executable Rust plus `spec fn` models, `requires`/`ensures`, proof functions, `assert`, `calc`, and loop `invariant`s. A deterministic translator should generate Verus predicates from AST facts and then invoke `cargo verus`; never let the LLM write the final proof model directly. The paper's Lean kernel and dependent-type encoding do not carry over as syntax.

### stage 5: one-shot neuro-symbolic refinement

Run at most one refinement round under either trigger: a conflict between symbolic and neural verdicts, or an empty obligation set combined with lifecycle lexemes such as `free`, `unref`, or `destroy` for CWE-416/CWE-415 (Section IV-F, pp. 6–7). The conflict prompt exposes unproved claims and asks the LLM to re-examine source; the empty-model trigger searches for hidden releases. The round is not iterated to convergence.

Inference: a Verus pipeline can similarly expose failed obligations while preserving one bounded repair attempt. A bounded round limits feedback loops but can miss a repair requiring multiple model changes.

### stage 6: evidence-aware grading and adjudication

Grade symbolic evidence as strong, weak, noisy, or none from the residual unproved claims and noise/high-risk lexicons. Grade the neural explanation as strong, weak, or none by checking literal identifiers and CWE semantics. Use an asymmetric matrix keyed by `(VLean,QLean,VLLM,QLLM,|O|)`: strong non-noisy Lean vulnerability overrides a neural SAFE; a vacuous Lean model can defer to strong neural evidence; noisy unproved claims can be downgraded to SAFE (Section IV-G, Table III, pp. 6–7). The running example's strong symbolic VULNERABLE and neural SAFE/none therefore yields VULNERABLE.

Inference: for VL, adjudicate Verus evidence with explicit grades for proved, unproved, timeout, and model-empty states. Do not turn a timeout or absent model into SAFE; the paper's conservative policy is an inference target, not a Verus guarantee.

## evidence, denominators, and ablations

The main table uses best-of-three runs for CWE-120, CWE-416, and CWE-476, but single runs for CWE-125 and CWE-415 due to cost (Table IV caption, p. 7). The reported “all fifteen settings” means five CWE datasets × three backends, not 15 independent datasets. The authors' ablation removes AST extraction or deterministic translation. Translation success is 116/116 for the complete Claude/CWE-120 condition, but only 82/116 without translation; for Claude/CWE-416 it is 183/183 versus 158/183; for Claude/CWE-476, 138/138 versus 118/138 (Table V, p. 8). These denominators are samples per CWE condition.

The stability study repeats CWE-120, CWE-416, and CWE-476 three times; CWE-125 and CWE-415 are single runs. Six of nine paired t-tests reach p < 0.05, with df = 2; for Claude/CWE-416 the mean F1 difference is +0.069 ± 0.019, t = 6.21, p = 0.0250, and for Codex/CWE-416 +0.149 ± 0.006, t = 41.66, p = 0.0006 (Table VII, p. 9). The paper itself cautions that three runs give low power, and the three nonsignificant cases are attributed to inter-round variability (Section V-E, p. 9).

Cost is measured per sample over three runs for the three repeated classes. For CWE-416, time is 129 ± 5 seconds for Claude Code, 131 ± 6 for Codex, and 37 ± 1 for the pure LLM; Claude uses 7.87 ± 0.01 million input tokens, Codex 48.28 ± 0.82 million, and pure LLM 0.50 ± 0.00 million (Table VIII, p. 9). Inference: kernel checking adds a bounded cost, but agentic repository context dominates token use in this setup.

## what remains trusted and product threat

Lean's kernel checks the synthesized model, but translation soundness, candidate extraction, hand-built CWE semantics, dataset labels, and the mapping from C/C++ to the model remain trusted or empirically tested. The paper states: “a verdict from L EAN G UARD is only as trustworthy as the Lean encoding it checks.” (Section VI, p. 10) The authors also limit scope: each CWE has a hand-built specification, the target class is fixed, and they make no claim for unseen classes or whole-program vulnerabilities (Section VI, p. 10).

Inference: threat to an agent-written verified-Rust product is high for the specific failure mode of an LLM asserting safety without discharging obligations. The authority split, source-backed edits, deterministic translation, and conservative adjudication are directly reusable. The central risk remains specification/model incompleteness: a Verus theorem can be valid while missing an external library contract, unsafe pointer assumption, hardware behavior, or product security requirement.

VL should reuse the rule that the LLM proposes facts and a kernel-checked model discharges obligations. VL should not redo generic neuro-symbolic vulnerability detection, and it should not claim coverage beyond the selected specification. The paper's explicit future limitation is that automatic routing and a shared extraction layer are still needed (Section VI, p. 10).

## techniques for the catalog

- constrained fact editing — force the LLM to add or remove only numbered AST facts in immutable JSON
- source-backed reconciliation — accept additions only when exact source spans match and force-keep high-confidence facts
- CWE-specific auto-pairing — pair operations and protections with a deterministic strategy specialized to each weakness
- kernel-checked synthesized model — translate retained facts into Lean claims and classify every claim as proved, unproved, or error
- bounded neuro-symbolic refinement — retry once on verdict conflicts or empty lifecycle models
- evidence-aware adjudication — combine symbolic evidence quality, neural evidence quality, and obligation count conservatively
Checked 2026-10-13: audit record zhao2026neuro; paper-study comparison complete; gate executed; experiments not rerun
