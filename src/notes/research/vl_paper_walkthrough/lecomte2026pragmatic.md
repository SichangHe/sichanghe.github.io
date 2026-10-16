# Pragmatic Uses of AI in Formal Methods–Based Railway Projects: Early Lessons and Perspectives (Extended Abstract)
(authored by agents unless marked 🧑)
Tag: `lecomte2026pragmatic`, [paper](https://doi.org/10.1007/978-3-032-26220-2_29)

## scope and trust boundary
This extended abstract reports four industrial activities rather than one unified algorithm: document assistance, AI support for B-method proof, an ML perception front end guarded by a verified controller, and multimodal translation of relay diagrams to propositional logic. Its governing engineering principle is explicit: “The results confirm that AI-assisted formalization is feasible and accessible, opening promising perspectives for advancing automation and trustworthiness in railway formal verification.” (abstract, page 605) The qualification is equally clear: “systematic verification of the responses returned by LLMs is necessary to check their accuracy before they can be relied upon for any engineering activity (analysis, development, testing).” (section 2.1, page 606)

## technique 1: local LLM assistance for large specifications
Inference: Use this for first-pass navigation of hundreds or thousands of pages of railway specifications, especially when documents are confidential. Run the LLM on internal infrastructure; provide PDF or DOCX documents; ask for summaries and questions that combine evidence from several sections; have an engineer validate every answer before using it in analysis or development.

The paper reports up to 30% time gain when discovering a new technical document (section 2.1, page 606), but responses were often partial, sometimes inaccurate, and occasionally speculative. Images and text volume caused omissions. The result is a search and synthesis aid, not a formal-verification technique by itself.

Verus form: Inference: use a local retrieval-and-summary tool to help an agent locate Rust APIs, requirements, and existing lemmas, while retaining source spans as review evidence. No generated summary should become a `requires`, `ensures`, or proof step without checking the cited source and compiling the resulting Verus code. The confidentiality architecture transfers directly; the 30% figure does not establish proof productivity.

## technique 2: AI-guided interactive B proofs
Inference: Use this when an industrial B project has many proof obligations and several automatic provers or tactics. The paper's approach applies machine learning to “guide and accelerate formal proof activities, notably through predictive support for automated provers.” (section 2.2, page 606) Keep inference local for confidentiality, let the predictor select which automatic prover to try, and preserve the normal B proof checker and traceability.

The reported experiment obtains up to 20% gain when selecting the best automatic prover instead of applying static proof tactics (section 2.2, page 606). The abstract does not state the number of obligations, project size, prover set, or denominator for this percentage; therefore it cannot be compared directly with a Verus benchmark. The authors frame AI as an enabler, not a replacement, and say it reduces manual effort while preserving correctness and traceability.

Verus form: Inference: an agent can rank candidate proof lemmas, solver triggers, or proof strategies, then submit the selected Rust proof to `verus`; only the checker result is authoritative. The predictor must not be a trusted axiom, and a `proof fn` cannot be called at runtime. Inference: log every generated candidate and checker result so failed suggestions remain auditable.

## technique 3: ML proposer plus formally verified safety controller
Inference: Use this when an opaque perception model is useful but certification requires a transparent vital function. The architecture constrains ML to perception and candidate generation. In the free-track use case, a convolutional neural network proposes a free-track path from camera images; an independent controller checks that proposal against geometric and physical constraints derived from railway knowledge. The controller is specified, developed, and verified in B, with refinement from safety requirements through subproperties covering algorithm, code, and execution platform (section 2.3, pages 607–608).

The key safety property is conservative distance: the computed free-track distance is always conservative with respect to real obstacles. Unsafe or imperfect ML outputs are rejected by the controller. The paper writes, “A key safety property guarantees that the computed free track distance is always conservative with respect to real obstacles.” (section 2.3, page 607)

Verus form: Inference: expose an untrusted Rust function that proposes a path, then pass its result to a verified controller whose `requires` describe sensor/state assumptions and whose `ensures` establish conservative distance and permitted actuation. Keep the ML result in ordinary data; prove that every accepted result satisfies the controller predicate. If the predicate fails, return a safe rejection or fallback. This mirrors a refinement proof, but B's toolchain and railway certification evidence do not automatically carry to Verus.

The limitation is architectural: only the controller's checked envelope is proved. Inference: perception errors outside that envelope and incomplete physical assumptions remain product threats; the controller's proof cannot establish that the neural network recognized the scene correctly.

## technique 4: multimodal translation of relay diagrams
Inference: Use this when legacy relay-based interlocking diagrams must be analyzed formally and manual redrawing is error-prone. Prompt a multimodal language model with the diagram and railway conventions; have it emit propositional-logic specifications compatible with B-method analyses; validate the result against known behavior and inspect detected anomalies. The proof of concept was tested on academic and industrial SNCF diagrams and reported detection of ringbell effects and short circuits (section 2.4, page 608).

The paper calls this an end-to-end translator but still says “expert validation remains essential for safety critical use.” (section 2.4, page 608) Verus form: Inference: treat the generated Boolean model as an untrusted specification candidate; translate it into Rust predicates only after a human checks symbol names, polarity, relay dependencies, and anomaly traces. Then prove the controller or interlocking implementation against the checked predicates. Diagram parsing accuracy itself is not proved by Verus.

## what was measured and what remains trusted
The only numeric outcomes are up to 30% document-discovery time gain and up to 20% prover-selection gain; neither has a supplied denominator or uncertainty in this four-page abstract. The perception and relay activities are proof-of-concept demonstrations without reported sample counts, false-negative rates, or complete proof obligations. Trusted artifacts are the B specifications, refinement proofs, safety controller implementation, expert validation, local deployment configuration, and domain assumptions. ML models, LLM summaries, generated proof scripts, and generated propositional formulas are proposers.

Inference: VeruLaw should reuse the certified-controller boundary and checker-only acceptance pattern. The paper's industrial lesson is already done work VL should not repeat as a generic claim that LLMs can summarize documents or suggest proofs; VL should instead measure checker acceptance, counterexample handling, and fallback behavior on its Rust/Verus workloads. Inference: direct use of an LLM as a certifying proof authority would threaten the product because this paper documents partial, inaccurate, and speculative outputs. A staged proposer–reviewer–Verus-checker pipeline limits that threat.

## techniques for the catalog
- local specification assistant: run document summarization and cross-section question answering locally, then validate every answer
- prover selection aid: use ML to rank automatic B provers while retaining the formal checker and traceability
- certified safety controller: let ML propose perception outputs and let a formally verified controller accept or reject them
- diagram-to-logic translation: convert relay diagrams to propositional specifications with multimodal prompting and expert validation

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
