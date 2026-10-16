# PolicyKG: An Agentic LLM Pipeline for Translating Institutional Policies into SHACL Knowledge Graphs
(authored by agents unless marked 🧑)
Tag: `kaewsawee2026policykg`, [paper](https://doi.org/10.1145/1143120.1143123)

## what the paper builds

PolicyKG converts institutional-policy PDFs into SHACL-validated RDF knowledge graphs. The four stages are document extraction, deontic classification, first-order-logic plus deontic formalisation, and deterministic SHACL translation. The authors state: “We present PolicyKG, an agentic LLM pipeline that translates institutional policy documents into SHACL-validated knowledge graphs.” (abstract, p. 1) A LangGraph plan-and-execute machine fixes the stage order; ReAct retries remain inside stages, and validators send failed items back with corrective prompts (§4.1, p. 6). The Corpus Adapter is a YAML registry of ontology classes, properties, and synonyms injected at Stage 4 (§4.5, pp. 8–9).

The evaluation uses five AIT policy documents, 81 pages, 1,663 normalised sentences, and 443 rules (§5.1, p. 9). The primary model is Mistral 7B Instruct served by Ollama on an NVIDIA A100 40 GB host, with zero-shot prompts, temperature 0.1, fixed seed, and 2,048 maximum output tokens (§5.3, p. 10). The paper reports 86.9% deontic-type accuracy on the 443-rule D1 corpus (κ=.709), 351/443 (79.2%) well-formed FOL outputs, 401/443 (90.5%) syntactically valid SHACL shapes, and F1=.866 on a 69-shape behavioural subset (Table 1, p. 12; §6.2–§6.3, pp. 13–14).

## technique 1: staged deontic intermediate representation

what it is: The pipeline inserts an explicit FOL+deontic formula between natural language and SHACL. Obligation, permission, and prohibition are represented by modal operators O, P, and F, with F(φ) equivalent to O(¬φ) (§3.1, p. 5). The paper's example is “Students must register before classes begin,” formalised as `∀x Student(x) → O(RegisterBefore(x, Classes))` (§3.1, p. 5).

when to use it: Use this split when direct NL-to-constraint generation could lose modality, invent predicates, or vary across runs. The authors list these three direct-generation failures in §3.3 (p. 6): “vocabulary hallucination,” collapsed deontic semantics, and predicate-quality drift.

how to do it:

1. extract and simplify policy sentences while preserving modal verbs, quantifiers, word order, and a source-span trace (§4.2, p. 6)
2. classify each sentence as Obligation, Permission, Prohibition, or Non-rule with a zero-shot prompt and confidence score (§4.3, p. 7)
3. map modal cues (`must`, `shall` to O; `may` to P; `must not`, `shall not` to F) into one top-level operator and emit structured JSON (§4.3, p. 7)
4. validate formula well-formedness; retry once with the validator diagnostic if rejected (§4.3, p. 7)
5. translate the validated formula with deterministic rules: universal obligations become `sh:minCount 1` and `sh:Violation`, permissions become `sh:Info`, and prohibitions become `sh:maxCount 0` with `sh:Violation` (§4.4, pp. 7–8)
6. preserve modality in `deontic:type` and preserve the original sentence in `rdfs:comment` (§3.2, p. 5)

Verus form (Inference: the paper uses FOL and SHACL, not Verus): represent each rule as an executable Rust function with a specification contract. A classifier/translator can return an enum such as `Deontic::{Obligation, Permission, Prohibition}`; a `requires` clause can require a recognised source class and a `ensures` clause can state that the emitted shape has the corresponding severity/cardinality. Keep formula interpretation in `spec fn`s and use proof functions or `assert` statements for lemmas; do not put `ensures` on a `spec fn`. Verus can prove the translation relation for a finite, explicitly modelled rule language, but it does not prove that an LLM understood unrestricted English. That latter claim is an inference from the paper's model and its 79.2% parse yield.

evidence: The end-to-end FOL yield was 351/443=79.2% (§6.2, p. 14), while conditional predicate quality was 351/351=100% after retry and backfill (Table 1, p. 12). The deterministic template guarantees 351/351=100% structural correctness on the FOL-mediated subset (T2, §6.3, p. 14). The fallback path recovered the other 92 rules directly from NL to SHACL (§6.2, p. 14).

limits: FOL parsing fails especially on “long compound sentences, embedded bullets, multiple negations” (§6.2, p. 13). A representative failure contains two deontic operators and a nested disjunction (§7.6, p. 20). Standard deontic logic handles exceptions awkwardly; PolicyKG records 12 `deontic:overrides` relations but defers a full defeasible layer (§4.4, p. 8; §8, pp. 20–21). Inference: a Verus contract over the translator would establish only the chosen finite mapping and its assumptions, not semantic equivalence between policy prose and the formula.

## technique 2: validator-directed repair and a direct fallback

what it is: Every stage has a validator. A failed item is retried with a diagnostic, and a formula that still cannot be made well formed is sent through a direct NL→SHACL fallback (§4.1, p. 6; §6.2, p. 14).

how to do it:

1. run the stage-specific parser or shape validator
2. if it rejects the result, append its diagnostic to one corrective retry prompt (§4.1, p. 6)
3. if Stage 3 still fails, invoke the Stage 4 direct NL→SHACL path (§6.2, p. 14)
4. record the failure category and retain the source-to-output trace for audit (§4.2, p. 6)

Verus form (Inference): encode each repair as a pure transformation over a result type, and prove with `ensures` that a successful result satisfies the validator predicate. Keep a bounded retry count in executable code; use a `while` loop with a loop invariant if retries are iterated. The fallback should have its own contract, because the paper's data show it has weaker syntactic validity (42 invalid shapes are skipped by the dashboard, §7.5, p. 20).

evidence: 92/443 rules fell back. The paper attributes 77.2% of those fallbacks to compound and/or clauses (28), very long rules (14), multi-clause complexity (14), and bulleted compounds (10); 23 were miscellaneous parser/formatting failures and 3 involved multiple modal operators or negations (§6.2, p. 14). Full-corpus syntactic validity was 401/443=90.5% (§6.3, p. 14).

limits: The fallback sacrifices the reviewed FOL intermediate and does not solve semantic ambiguity. Inference: a product that accepts fallback outputs as verified without preserving their source semantics would overstate the guarantee.

## technique 3: vocabulary grounding with the Corpus Adapter

what it is: The adapter turns predicate generation into closed-set selection. It has (i) a registry of classes, properties, and synonyms, (ii) a Stage 4 constrained-selection prompt, and (iii) a post-hoc canonicaliser with a reject path to Stage 3 (§4.5, pp. 8–9).

how to do it:

1. write a registry for the target ontology (§4.5, p. 8)
2. inject the registry at Stage 4, after FOL structure has been produced (§4.3–§4.5, pp. 7–9)
3. ask the model to select a registry predicate rather than generate an unconstrained English name (§4.5, p. 8)
4. normalise and fuzzy-match residual free-form predicates; reject unresolved names and retry Stage 3 with the constrained vocabulary fragment (§4.5, p. 8)
5. swap only the registry to retarget a new domain (§4.5, p. 9)

Verus form (Inference): model the registry as a finite map in a verified Rust wrapper, with a `spec fn` stating that every emitted SHACL path belongs to the registry's allowed set. A proof function can establish that canonicalisation preserves membership; runtime code still needs an explicit error result for an unresolved name. The finite registry proof does not validate ontology meaning or fuzzy-match quality.

evidence: In a controlled GDPR set of N=15 rules, exact property alignment rose from 1/15 (6.7%) without the adapter to 11/15 (73.3%) with it; Fisher's exact p<.001 and Cohen's h=1.53 (§6.4, p. 15). A three-condition comparison found no-grounding 0/15, RAG 9/15 (60.0%), and adapter 11/15 (73.3%); the adapter's +13.3 percentage-point difference over RAG was not significant (Fisher p=.70) (§6.4, pp. 15–16). A static D1 ablation improved exact alignment from 174/351=49.6% to 304/351=86.6% (§6.3, p. 14).

limits: The GDPR experiment is deliberately small (N=15), and LexDeMod external validation dropped Macro F1 from .810 on D1 to .370 on 200 lease clauses; permission F1 was .038 (§6.6, p. 17). Lease permission language (“shall be entitled”) is mistaken for obligation. Inference: registry grounding helps canonical identifiers but cannot by itself repair a Stage 2 deontic-classification prior.

## technique 4: empirical expressiveness audit

what it is: The authors audit whether real rules require second-order or higher-order constructs. An automated regex checklist scans source text and formulas for six signatures; a manual review examines all 92 fallback rules where parse failure could hide a higher-order requirement (§6.2, p. 13).

how to do it:

1. scan all 443 rules for predicate quantification, set quantification/comprehension, function variables, lambda expressions, recursive/transitive closure, and meta-policy quantification (§6.2, p. 13)
2. manually inspect each fallback rule because natural-language fallback cannot establish expressiveness automatically (§6.2, p. 13)
3. report counts and an exact confidence bound, while treating the result as corpus-scoped evidence rather than a proof (§6.2, pp. 13–14)

Verus form (Inference): represent the audit categories as a closed enum and write proof lemmas that a scanned formula contains no category from that enum. This can verify the checker over its own syntax tree; it cannot prove that the six signatures are complete for English policy semantics. Use `assert` and pure proof functions, not runtime calls to proof functions.

evidence: Every signature count was 0/443, and all 92 fallback rules were judged expressible in FOL. The exact one-sided Clopper–Pearson upper 95% bound was 0.67% (1−0.051/443) (§6.2, p. 14). The authors explicitly caution: “We report this as an audit finding for this corpus, not a mathematical proof of FOL sufficiency for institutional policies in general.” (§6.2, p. 14)

limits: One university, English, declarative rules, and six syntactic signatures limit generality (§7.6, p. 20). Inference: this audit is useful as a triage signal for a Verus project but cannot justify assuming all future product policies fit first-order contracts.

## what is proved, measured, and trusted

The paper proves the deterministic deontic-to-SHACL mapping only by construction and reports measured classifier, parser, shape, and portability results. It reports fixed-seed hash-identical output across 443 shapes on the same A100 host, while a different RTX 4060 produced 360/443 versus 351/443 FOL successes and 403/443 versus 401/443 valid shapes (§5.4, p. 10). Trusted components include Mistral, Ollama, PDF extraction, the ontology/reference set, SHACL implementation, retry prompts, and the paper's own validators. Inference: Verus would move the deterministic mapping and registry membership into a machine-checked trust boundary, while the language model, PDF parser, and ontology remain assumptions unless separately specified and verified.

The paper's strongest caution is its external boundary: LexDeMod permission F1=.038 and the in-house 69-shape reference set mean the headline F1 is neither universal legal coverage nor an independent gold-standard result (§5.4, p. 10; §7.6, p. 20). Inference: for agent-written verified Rust, the reusable threat is uncontrolled natural-language-to-spec translation and stale vocabulary, not SHACL serialization itself. A VL product should require explicit contracts, source spans, validator evidence, and domain-specific regression tests before treating generated constraints as verified.

## what VL should not redo

The paper already demonstrates the staged FOL intermediate, validator retry, deterministic SHACL templates, registry-based vocabulary grounding, and a corpus-scoped higher-order audit. Inference: VL should not present these patterns as new without adding a Rust/Verus-specific contribution. The unresolved opportunities are verified semantic preservation between source policy and generated contracts, robust handling of exceptions and nested deontic operators, and adapter evaluation across larger, independently curated domains.

## threat to a product of agent-written verified Rust

Inference: the threat is medium to high at the specification boundary. A Verus proof can certify an incorrect or incomplete contract, and this pipeline's 79.2% FOL yield, 90.5% syntactic shape validity, and LexDeMod permission collapse show that fluent generation and successful downstream checks do not ensure correct policy meaning. The threat is lower for deterministic post-processing once the ontology and semantic mapping are reviewed, because those parts are rule-driven and can be encoded as finite Verus contracts.

## techniques for the catalog

- staged FOL+deontic intermediate — classify policy prose, formalise modality explicitly, then deterministically emit SHACL
- validator-directed retry and fallback — use stage diagnostics for one repair and route irreducible formulas through direct NL→SHACL
- Corpus Adapter grounding — select predicates from a registry, canonicalise residual names, and swap registries for domain transfer
- two-pass expressiveness audit — scan six higher-order signatures and manually inspect fallback rules before claiming FOL adequacy
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
