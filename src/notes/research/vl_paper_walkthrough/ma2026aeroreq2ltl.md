# Automated LTL Specification Generation from Industrial Aerospace Requirements
(authored by agents unless marked 🧑)
Tag: `ma2026aeroreq2ltl`, [paper](https://arxiv.org/abs/2604.21715)

## purpose and formal-verification contribution

AeroReq2LTL translates industrial natural-language aerospace requirements into Linear Temporal Logic (LTL) through an intermediate, grounded representation. The paper's abstract identifies two design points: “a data dictionary that normalizes technical jargon into precise atomic propositions” and “a template-based requirement language that makes temporal cues and logical relations explicit before translation” (Abstract, p. 1). The goal is to remove the formalization bottleneck caused by requirements that depend on interface tables, domain terminology, implicit timing, and mode transitions.

The framework has three phases. First, layout-aware extraction reconstructs a complete target requirement paragraph and its associated interface artifacts. Second, an LLM rewrites the requirement into Templated Natural Language (TNL), grounded by SpaceKG and structured by SpaceRDL. Third, deterministic rules map TNL fields to syntactically valid LTL. The paper states, “This two-step process (NL → TNL → LTL) ensures that the final formal properties are syntactically valid and mathematically aligned with the intended aerospace control laws” (Section 3.1, p. 6). The result is a specification intended for existing model-checking or runtime-verification tools.

## technique 1: reconstruct context from engineering artifacts

When to use: use this for requirements whose meaning depends on module context, invocation cycles, signal names, data types, value ranges, or neighboring requirements.

Steps from Section 3.1 (pp. 5–6):

1. Parse the raw PDF with a layout-aware extractor. The authors use PDFplumber to preserve complex tables and paragraphs.
2. Build the target stream from complete functional requirement paragraphs, retaining invocation conditions such as a 128 ms control cycle.
3. Build the knowledge stream from interface-description tables, extracting signal names, data types, initial values, ranges, and explanatory text.
4. Pass both streams to downstream grounding and rewriting. The requirement is no longer interpreted as an isolated sentence.

The paper's motivating Req13 says angular rates below 0.15°/s for 44.8 s, or rate-damp mode lasting 128 s, causes a mode switch. The interface table identifies the timer variable and mode encodings. Without that context, an LLM can invent an atom or omit the cycle semantics.

Verus form (Inference): represent each extracted interface fact as a Rust type or specification constant, then write `requires` predicates over those variables. The invocation cycle and timer units should be explicit fields, and a state-machine transition can use a `requires` condition and `ensures` next-state relation. PDF extraction itself is outside Verus; it is an upstream evidence and review step. The extracted mapping must be checked against the implementation, because a verified formula over the wrong variable remains wrong.

## technique 2: SpaceKG semantic grounding

When to use: use SpaceKG when domain phrases, abbreviations, aliases, or empirical conditions must map to concrete implementation variables.

Construction steps from Section 3.2 (pp. 6–8):

1. Retrieve variable names, types, values, and explanations from interface tables.
2. Apply a BERT terminology extractor to classify domain terms, variables, and concrete values.
3. Have domain experts map complex empirical conditions to atomic expressions. For example, “the absolute values of the angular rates on all axes are less than 0.15°/s continuously for 44.8s” is normalized to a timer expression involving `dwCount`.
4. Store entities and relationships in a labeled graph. Nodes have classes for domain terms, aliases, program variables, and concrete values. Assignment/conditional edges encode relations such as “sun not detected” → `flagSP = FALSE`; semantic-mapping edges connect aliases such as “sun” and “sunlight” to `flagSP`.
5. Apply project-local updates for new documents, prioritizing local artifacts when one domain term maps to different variable names.

Verus form (Inference): make SpaceKG entries typed constants, enums, and predicates in a specification module. Prove mapping lemmas, for example that a `SunNotDetected` predicate is equivalent to `flagSP == FALSE`, then use that predicate in `requires` and `ensures`. The graph and BERT classifier are trusted inputs to the proof; Verus cannot establish that a human's semantic mapping is correct without a specification tying it to the real system.

Evidence: on 79 SSCS requirements, SpaceKG's extracted domain terms, variables, and expressions each had F1 above 0.8 (Section 4.3, p. 13). Removing SpaceKG reduced GPT-4o precision from 67/79=0.85 to 53/77=0.69 and recall from 67/76=0.88 to 53/76=0.70 (Table 4, p. 12). The table reports 0 missing and 23 wrong, plus 1 spurious, in the ablation; the precision denominator is the table's generated-output classification, while recall uses the 76 translatable requirements. These distinct denominators should not be conflated.

## technique 3: SpaceRDL and TNL for implicit temporal logic

When to use: use SpaceRDL when requirements omit temporal operators, trigger/sustain distinctions, mode scope, or whether a response is immediate, next-cycle, eventual, always, or until.

Steps from Sections 3.3 and 4.4 (pp. 8–15):

1. Parse the requirement into SpaceRDL fields: optional `workmode`, `condition`, mandatory `component`, `SHALL`, `timing`, and `action`. Timing keywords include immediately, next, eventually, always, and until.
2. Select a recurring template: state change, bound check, work-mode change, command process, conditional response, or maintenance state.
3. Instantiate TNL, preserving grounded atoms and explicit temporal intent. For Req39, the paper produces: `In (subMode=INM), the navigation computer shall immediately satisfy if (flagBD=FALSE & deTCount > 12.8) then (flagSTS=TRUE).`
4. Apply deterministic translation rules from each TNL field to LTL. The Req39 result is `G((subMode = INM ∧ flagBD = FALSE ∧ deTCount > 12.8) → (flagSTS = TRUE))`.
5. Feed the resulting formula to TRACE, which uses KLEE symbolic execution and GDB concrete traces to check the property (Section 4.4, p. 15).

Verus form (Inference): represent `workmode`, signal predicates, timer thresholds, and transitions as state-machine state. Translate “immediately” into the current transition's `ensures`, “next” into the next-state relation, and “always” into a loop or state-machine invariant. Use proof functions and lemmas for temporal composition. LTL itself is not a Verus syntax; the Verus model must encode the same transition semantics, and any liveness or unbounded temporal claim needs an explicit induction/invariant argument.

Removing SpaceRDL reduced precision to 41/79=0.52 and recall to 41/76=0.54, with 35 wrong and 3 spurious outputs (Table 4, p. 12). The paper attributes errors to missing implication premises and misplaced or omitted `X` operators. This is direct evidence that the intermediate structure, not only a stronger LLM, carries formalization quality.

## technique 4: deterministic TNL-to-LTL and downstream verification

The deterministic final stage eliminates free-form generation after semantic rewriting. Correctness is scored strictly: an LTL formula is correct only when logical and temporal semantics match; even replacing `X` with `F` is wrong (Section 4.2, p. 12). Non-temporal architectural summaries should produce no formula; producing one is spurious, while failing to produce an expected property is missing.

The ground truth comprised 79 production requirements in a 38-page SSCS document. Experts translated 76; 3 high-level summaries were excluded as non-temporal (Section 4.1, p. 10). With GPT-4o, AeroReq2LTL produced 67 correct, 0 missing, 9 wrong, and 3 spurious; precision 67/(67+9+3)=0.85 and recall 67/76=0.88 (Table 3, p. 11). The paper reports the same 85%/88% headline, but the precision denominator is not the 76 translatable requirements, so the fraction must be kept explicit. Baselines were substantially lower: NL2SPEC+GPT-4o had 46 correct and precision/recall 0.61/0.61.

In the end-to-end TRACE run, 67 correctly translated properties were supplied without manual intervention; 63/67 were successfully verified across modules (Table 5, p. 15). Module counts were remote control 17/17, gyroscope 13/15, attitude determination 10/12, control calculation 5/5, mode switch 6/6, fault handling 8/8, and thruster output 4/4. These are downstream tool-verification counts, not proof that the 67 formulas describe the human requirement.

## assumptions, trusted parts, and threat to VL

The framework trusts PDF extraction, BERT classification, expert mappings, the LLM's NL-to-TNL rewrite, deterministic translation rules, the expert ground truth, and TRACE/KLEE/GDB semantics. The paper's 79-requirement case study is one production system, and Section 4.5 warns that complete aerospace systems can exceed 1,000 behavioral requirements; dynamic SpaceKG construction and LLM latency then become bottlenecks. The 3 excluded summaries show that deciding what is temporal remains a human/domain judgment.

Inference: the threat to VeruLaw is medium to high at the requirements boundary. VL can adopt the sequence context reconstruction → typed grounding → structured intermediate contract → deterministic proof obligation. SpaceKG maps naturally to typed Rust constants and verified predicates; SpaceRDL maps to explicit state-machine transitions and invariants. However, generated LTL or Verus contracts can be perfectly proved while naming the wrong signal, threshold, timing point, or mode. VL should retain source traceability from every `requires`/`ensures` clause to interface evidence and require review of mappings before treating a proof as product assurance.

## techniques for the catalog

- dual-stream context reconstruction: preserve complete requirement paragraphs and interface tables before formalization
- SpaceKG grounding: map domain terms, aliases, values, and empirical conditions to typed implementation atoms
- SpaceRDL templating: force mode, condition, timing, component, and action fields into an explicit intermediate contract
- deterministic formal synthesis: translate grounded TNL by fixed rules and feed the resulting LTL to a verification tool
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
