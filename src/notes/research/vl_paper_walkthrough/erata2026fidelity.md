# Fidelity Probes for Specification-Code Alignment
(authored by agents unless marked 🧑)
Tag: `erata2026fidelity`, [paper](https://doi.org/10.1007/)

## problem and core object

The paper checks whether a natural-language specification describes an existing implementation. It calls the implementation A and the candidate specification B. A fidelity probe is a behavior question, a reference answer derived from A, and a category and source location. A language model answers from B alone; a separate comparator decides whether the two answers agree. The abstract states: "Each probe pairs a question about program behaviour with a reference answer derived from the code." (Abstract, p. 1.) The fidelity score is the fraction of agreeing probes, while disagreements are classified as contradictions or coverage gaps (Introduction, p. 2; Sect. 3, p. 3).

The motivating COBOL discount example asks about the exact 1,000 threshold and the premium increment. A wrong threshold is a contradiction; an omitted premium rule is a gap (Sect. 1, p. 2). The method is intended for requirements recovered during modernization, where the same wrong rule could otherwise be copied into new code and its tests (Introduction, p. 2).

Inference: for VL, the analogous object is a Verus specification attached to Rust code. Questions should be generated from executable control flow, data flow, calls, and contracts, then answered from `requires`, `ensures`, invariants, and ghost models. This can test specification-code alignment before accepting agent-written verified Rust, but the paper does not analyze Rust, Verus, or machine-checked contracts.

## technique: generate and score fidelity probes

Use this when a specification cannot itself be executed but needs a repeatable alignment test. Formally, the generator returns Q(A) = {(qᵢ, yᵢ, κᵢ)}, where qᵢ is a question, yᵢ a code-derived answer, and κᵢ a behavior category. Each probe stores a source location or extracted fact. The answerer receives only B and returns an answer, a supporting passage, and a support flag; it does not see A or yᵢ (Sect. 3, p. 3).

A separate comparator receives qᵢ, yᵢ, and the specification answer. It allows wording and some specificity differences. Agreement is written ŷᵢ ≡ yᵢ. If the comparator rejects and the answer is supported, the verdict is contradiction; if the support flag is uncertain, the verdict is gap. For a test set T, fidelity F(A,B;T) is the number of agreement verdicts divided by |T|, and contradiction and gap rates satisfy F + C + G = 1 (Sect. 3, p. 3). The paper says: "The fraction of agreeing probes gives the fidelity score." (Introduction, p. 2.)

The application procedure is:

1. Choose the behavior scope and identify observable outputs, stored-data changes, and external interactions that the modernization must preserve (Definition 3.1, p. 3).
2. Generate direct questions and code-derived reference answers, or select static-analysis facts and verbalize them (Sect. 3, pp. 3–4).
3. Record each question's source location, requirement identifiers, category, and reference answer (Sect. 3, p. 3).
4. Ask an answerer to answer from the specification alone and provide a supporting passage or an uncertainty flag (Sect. 3, p. 3).
5. Ask a comparator to judge agreement, allowing bounded wording differences (Sect. 3, p. 3).
6. Compute F, C, and G, and attach a contradiction or gap action to each non-agreeing probe (Sect. 3, p. 3).

Evidence: in the 120-probe CardDemo audit, 119 reference answers were judged correct by an expert (119/120); initial-specification comparator verdicts were confirmed for 93/120 and final-specification verdicts for 109/120 (Table 7, p. 9). These denominators are human-reviewed samples, not all 911 held-out probes. The method assumes that reference answers, answerer support flags, and comparator judgments are sufficiently reliable; the paper explicitly says all three are model judgments (Sect. 3, p. 3).

Verus form. Inference: derive a probe from a Rust function's branch conditions, state updates, call effects, and postconditions. Example question forms are `what value is returned when this guard holds?`, `which map entry changes after this operation?`, and `what does the postcondition guarantee about untouched elements?` The reference answer can be computed from a small executable harness or a specification-level model, while the answerer sees only the Verus contract. Inference: a contradiction means the contract asserts a behavior inconsistent with the body or model; a gap means the contract does not state a behavior in scope. The comparator must not be treated as proof, because only Verus can establish a formal implication.

## technique: direct and graph-grounded probe generation

The direct channel asks an LLM to read A and produce questions and answers. The symbolic route first selects facts from control-flow, data-flow, and call-graph analysis, then an LLM informalizer phrases each fact in business language (Sect. 3, pp. 3–4). The channels are mixed with α and graph weights β; α = 1 is direct generation, α = 0 is graph-only, and intermediate values combine them (Sect. 3, p. 4). Within a graph channel, facts are shuffled and sampled without replacement with at most one fact per region, so probes are dependent rather than independent random draws (Sect. 3, p. 4).

The three symbolic question shapes are: CFG asks what observable effect follows a condition, DFG asks which input and transformation produce an output, and call-graph probes ask what follows an event (Table 1, p. 4). Every probe must satisfy the observable rule: it asks about user-visible outputs, stored business data, or interactions with other systems; internal mechanisms count only when they affect that behavior (Definition 3.1, p. 4). The paper states: "The probe may concern an effect itself or the business rules and conditions that determine it." (Definition 3.1, p. 4.)

Inference: a Verus implementation can build analogous CFG, data-dependency, and call summaries from Rust MIR or syntax, then phrase facts in the project's domain vocabulary. The observable filter must be adapted to the product's intended API, persistence, and external effects. Internal ghost state should be probed only when it constrains an executable guarantee.

Evidence: on 90 CFG facts from 19 programs, deterministic templates achieved 22.2% fidelity, 67.8% gaps, and 10.0% contradictions, while the LLM informalizer achieved 44.4%, 41.1%, and 14.4%, respectively (Table 4, p. 7). The denominator is 90 facts for both methods. Among 34 facts with different agreement decisions, the informalizer agreed on 27 and the template on seven; this is a disagreement subset, not a new sample denominator (Sect. 5.2, p. 7). The higher score does not prove that every informalized question preserves the fact's meaning; the authors state that renderings can ask different questions (Sect. 5.2, p. 7).

## technique: fresh curriculum and fixed held-out evaluation

Use this when iterative repair can overfit the feedback questions. For each specification version Bₖ, sample a fresh curriculum T_train^(k) from failures and keep T_test fixed. The reviser sees only curriculum failures, never held-out questions or verdicts. Both sets score the same Bₖ before the next revision; the loop stops at a fixed revision budget or an improvement threshold and does not select a checkpoint using held-out scores (Sect. 3, pp. 3–4).

The revision action for a failed probe contains its type, requirement identifiers, edit guidance, and evidence. Gaps trigger ADD to supply behavior; contradictions trigger FIX to correct a claim or REMOVE to delete unsupported behavior. The reviser is asked to make local edits and preserve requirement identifiers, but it returns the whole document and can introduce regressions elsewhere (Sect. 3, p. 3). The paper says: "A language model revises the specification using findings from fresh probes." (Sect. 1, p. 2.)

CardDemo uses 15 COBOL programs and 911 fixed held-out probes. Seven revisions increase pooled fidelity from 0.587 to 0.885, contradictions fall from 120 to 46, and gaps from 256 to 59 (Sect. 5.1, p. 5). The 13-program core excludes two cross-program cases and uses 785 probes; pooled fidelity rises 0.590 to 0.932 (Sect. 5.1, p. 5). The full-loop baseline reaches 0.885, single-shot revision 0.784, fixed probes 0.908 but with a 3.7 percentage-point curriculum-test gap, and free-form revision 0.817 on the same 911 probes (Table 3 and Sect. 5.2, pp. 6–7). “Overfits” labels the fixed-probe gap; it does not establish fitting to exact wording (Sect. 5.2, p. 7).

Verus form. Inference: maintain a frozen probe set generated from executable behavior, resample a separate curriculum after each contract edit, and never let the agent choose a checkpoint by held-out score. Store the exact code revision, Verus version, and probe denominator with every score. Inference: a high held-out contract score still does not prove functional equivalence; run Verus proofs and independent tests as separate gates.

## technique: repair–regression analysis

Each revision can repair failed probes and break previously agreeing probes. Let πₖ be the fraction of failures repaired and rₖ the fraction of agreements that regress. The paper models the next fidelity as Fₖ₊₁ = (1 − rₖ)Fₖ + πₖ(1 − Fₖ), with balance point F† = πₖ/(πₖ + rₖ) when πₖ + rₖ > 0. Under constant rates and |1 − π − r| < 1, fidelity converges to π/(π + r) (Sect. 4, p. 4). The model explains plateaus, but forecasting later revisions requires the assumption that rates stay stable (Sect. 4, p. 4).

Table 2 checks accounting on the core trajectory. For example, B0→B1 has 439 held, 24 regressions, 204 improvements, and 118 stuck probes, yielding 0.590→0.819; B6→B7 has 713 held, 21 regressions, 19 improvements, and 32 stuck, yielding 0.935→0.932 (Table 2, p. 6). Across all 15 programs, the final revision has 21 improvements and 21 regressions and leaves fidelity unchanged (Sect. 5.1, p. 6).

Inference: for VL, report both solved proof obligations and newly failing obligations after each generated contract edit. A repair that weakens a postcondition can improve probe agreement while reducing assurance, so contract strength and verifier success must be tracked separately.

## limitations, trust, and product threat

Additional systems show transfer but use distinct populations: System B has 32 PL/1 programs and 1,668 probes, with one revision from 0.576 to 0.856; PetClinic has 25 Java files and 203 fixed questions, improving 0.744 to 0.990; Redis documentation has six C modules and 600 probes, with 13 contradictions and 242 gaps (Table 6, p. 8). Private systems cannot be independently reproduced. Human reviewers found five incorrect claims among 30 applied edits, and blind equivalence confirmed 48/50 pairs called equivalent (Table 7, p. 9). The authors caution: "High fidelity does not certify behavioural equivalence." (Sect. 6, p. 9.)

The trusted boundary includes the reference implementation, static analyses, probe generator, answerer, comparator, reviser, and the human's chosen modernization scope. Probes can miss cross-file behavior, shared errors can survive resampling, and the authors did not independently assess complete revised documents (Sect. 6, p. 9). Evaluation consumed 434.8 million input tokens and 39.6 summed program-hours (Sect. 6, p. 9).

Inference: the threat to agent-written verified Rust is moderate to high for specification quality, not for proof soundness. A product that reports only successful Verus proofs can still accept an underspecified contract. The paper already provides a concrete alignment workflow, held-out scoring, graph-grounded probes, and repair-regression accounting; VL should not redo these as generic natural-language contributions. Inference: a Rust contribution should test whether probes detect weak `ensures`, vacuous `requires`, omitted mutation effects, and trusted external bodies, and should require Verus to prove the final contract separately.

## techniques for the catalog

- fidelity probes: ask behavior questions with code-derived answers and compare them against specification-only answers
- contradiction and gap diagnosis: distinguish an explicit conflicting claim from missing or ambiguous coverage
- graph-grounded generation: source probes from control-flow, data-flow, and call-graph facts, then informalize them
- observable-behavior filtering: retain questions about outputs, stored data, and external interactions in modernization scope
- fresh curriculum with frozen test: revise from newly sampled failures while scoring every version on an unseen fixed set
- repair–regression accounting: model gains and losses with repair and regression rates and report their denominators
Checked 2026-10-15 against paper erata2026fidelity: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
