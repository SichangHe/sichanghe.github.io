# Proof Strategy Extraction from LLMs for Enhancing Symbolic Provers
(authored by agents unless marked 🧑)
Tag: `fang2025proof`, [paper](https://arxiv.org/abs/2510.10131v2)
## scope and result

Strat2Rocq extracts intermediate proof strategies from a language model, formalizes them as reusable Rocq lemmas, and gives those lemmas to CoqHammer. The abstract describes two stages: “In an offline stage, Strat2Rocq extracts proof strategies from LLMs and formalizes them as lemmas in Rocq. In an online stage, given a theorem to be proved, Strat2Rocq augments the proof context with these extracted lemmas, enabling CoqHammer to leverage the LLM-derived strategies for more effective automated proving.” (Abstract, PDF page 1) On 2,394 theorems from CompCert, Ext-Lib, Coq-Art, and Vfa, Claude 3.7 Sonnet produced 4,583 proved extracted lemmas, 1.91 per original theorem on average (Table 1). With three-fold cross-validation and a 20-second CoqHammer timeout, the total proved-theorem count rose from 880 to 998, a 13.41% increase (Table 2). The percentage uses 880 baseline proofs as its denominator: (998 − 880)/880 = 13.41%. The evaluation corpus contains 2,394 theorems.

Inference: the transferable idea for VeruLaw is to mine reusable Verus lemmas from agent traces and insert only verifier-checked lemmas into later proof contexts. The paper uses Rocq and CoqHammer; it does not show that extracted lemmas help Rust ownership or concurrent invariants.

## technique 1: offline natural-language strategy extraction

What it is. For each training theorem, Strat2Rocq first asks the LLM for a step-by-step natural-language proof. The authors argue that LLMs are stronger at producing natural-language proofs and hypothesize that these proofs reflect internal reasoning: “Consequently, the NL proof is likely to reflect the internal reasoning process of the LLM.” (Section 2.1, PDF page 5). Section 2.1 says the prompt supplies “Type Definitions,” “Function Definitions,” and “Script So Far” before the theorem statement.

How to do it.

1. Select a proved theorem from the training set.
2. Retrieve all referenced type definitions and function definitions using the project context.
3. Include the preceding script so the model sees local declarations and notation.
4. Prompt the backend model for a step-by-step natural-language proof.
5. Keep the whole NL proof in the same chat session for generalization. The method does not parse and formalize each step independently (Section 2.2, PDF pages 6–7). In the running `sqr` example, the response includes simplifying `power x 2`, then `power x 1`, and the sub-step `power x 1 = dot x one`.

The paper's prompt begins with: “You are an expert at Rocq theorem proving . Please give a step - by - step natural language proof for the given theorem .” This is a direct quote from Figure 3, PDF page 5.

Verus form. Inference: provide the model with Rust type and function signatures, contracts, relevant trait or data-structure definitions, and the file context preceding the target function. Ask for a natural-language proof plan before asking for Verus code. Inference: the plan should distinguish executable facts from ghost facts and name ownership or invariant transitions, because Rust proof obligations are not captured by a bare mathematical statement. This adaptation is not in the paper.

Evidence and limits. About half of generated NL steps are not successfully generalized and formalized. The paper attributes failures to hallucinated NL proofs, failure to identify a standalone lemma, and inability of the proof agent to prove a proposed lemma. Thus the NL stage supplies candidates, not trusted facts. Inference: an NL step must never enter a Verus context until compiled and verified.

## technique 2: generalize each NL step and formalize it as a lemma

What it is. Stage 1's second step asks the model to convert the NL proof's steps into general lemmas and prove them. Figure 4 gives three tasks: “Generalize the proof steps above as general lemmas .”, “Formalize each lemma in Rocq , and provide the formal proof .”, and “Return a Rocq script that includes all formalized lemmas and proofs .” (PDF page 6) The authors deliberately formalize individual steps rather than a complete NL proof, making autoformalization smaller.

How to do it.

1. Reuse the chat context containing the theorem, definitions, script, and NL proof.
2. Ask the model to generalize the properties identified in the NL proof so the strategies are not restricted to the training theorem.
3. Ask it to emit each generalized statement and a Rocq proof in one script.
4. Run a proof agent that iteratively repairs lemma statements and proofs.
5. Keep only lemmas that compile and prove; discard failures after the configured round limit.

The running example turns the sub-step into `Lemma power_1: forall x: A, power x 1 = x. Proof. trivial. Qed.` (Example 4, PDF page 7). The paper explains that this lemma is later inserted into CoqHammer's context.

Verus form. Inference: generalize a model-described fact into a `proof fn` or `lemma`-style Verus proof function with explicit `requires` and `ensures`, then run Verus. The exact accepted syntax must follow the project's Verus version and existing guide; the paper's Rocq syntax does not carry over. Inference: preserve the original function's type and ownership parameters, and avoid marking the target executable function `external_body` merely to make a generated lemma pass. The paper does not define a Verus translation.

Evidence and limits. With Claude, the 2,394 input theorems yield 8,714 NL steps and 4,583 successfully proved lemmas. The ratio is 4,583/2,394 = 1.91, matching Table 1. CompCert yields 1,611 lemmas from 1,000 theorems (1.61); Coq-Art yields 2,409 from 947 (2.54). These are counts of extracted lemmas, not proof success rates on held-out theorems.

## technique 3: proof-agent repair with typed error modules

What it is. Strat2Rocq uses a proof agent after the model proposes a lemma and proof. The agent retries up to `round_limit` rounds. For known error classes it invokes a specialized repair prompt; otherwise it sends the raw error to a default repair agent. Section 2.4 says: “When an error message matches one of these predefined types, the corresponding module is invoked.”

How to do it.

1. Pass the proposed lemma, proof, and `round_limit` to the agent.
2. Compile it in Rocq.
3. Classify the error against predefined error types.
4. Invoke the matching repair module, or the raw-error fallback.
5. Recompile and repeat until success or the limit is reached.
6. Return a corrected lemma or report failure. The experiments set `round_limit` to 8 (Section 3, PDF page 9).

Verus form. Inference: classify Verus diagnostics into syntax, type/ownership, missing-proof, solver-timeout, and specification categories, then use focused repair prompts. Keep a hard retry bound and preserve the original contract. Inference: a timeout or resource exhaustion must not be treated as evidence that a lemma is false. The paper evaluates this repair agent in Rocq with an eight-round limit.

Evidence and limits. The paper explicitly says failures in proving a lemma depend on the underlying proof agent and that a stronger agent could produce a richer strategy library. Inference: the extracted-lemma count depends on the capability of the repair loop as well as the extraction prompt.

## technique 4: online context augmentation for symbolic proving

What it is. In Stage 2, all extracted lemmas are inserted into the target theorem's context before CoqHammer searches. The paper states: “After extracting lemmas from the training set, given a target theorem to be proved, we insert the extracted lemmas into the context of the target theorem, thereby making them accessible to CoqHammer during the proof search.”

How to do it.

1. Use the proved lemmas extracted from the training set in the offline stage.
2. Add the library to the context of a held-out theorem.
3. Run the symbolic prover with its normal configuration.
4. Let the prover's relevance mechanism select candidate lemmas.
5. Record whether the theorem is proved within the timeout.

CoqHammer uses KNN-based selection and retrieves a fixed number of candidates regardless of total context size. The authors claim: “This design ensures that, even when many new lemmas are added to the context, the efficiency of CoqHammer remains largely unaffected.” (Section 2.4, PDF page 8). Inference: a fixed candidate count alone does not establish constant retrieval cost; the paper provides no retrieval-time comparison. In the evaluation, the fixed number is 1,024 and timeout is 20 seconds (Section 3.2, PDF page 11).

Verus form. Inference: add extracted `proof fn`s or trusted library lemmas to the Verus module or import context, then run the ordinary verifier. Inference: a retrieval layer should choose candidate lemmas by obligation text and API names, but every selected lemma must be in the same trust regime and compiled against the exact dependency versions. The paper does not address module visibility, Rust crates, or version drift.

Evidence and limits. Table 2 compares three-fold cross-validation with and without mined lemmas. Raw totals for Claude are 880 versus 998; project-level increases are CompCert 293→345 (17.75%), Ext-Lib 78→82 (5.13%), Coq-Art 446→501 (12.33%), and Vfa 63→70 (11.11%). The denominator for each percentage is the baseline count in that project row, while the aggregate 13.41% is 118 additional proofs divided by 880 baseline proofs. The paper also reports that 42.52% of the improvement involves theorems originally proved by developers using induction; it does not provide the raw numerator in the text.

## technique 5: strategy lemmas circumvent unsupported induction and improve selection

The authors describe the running `power_commute_with_x` theorem as requiring induction and state that CoqHammer does not support induction (Section 3.2, PDF page 11). Adding `power_1` rewrites it to an equality of powers whose remaining goal follows from commutativity of natural-number addition. The paper says: “This avoids the need for induction and enables CoqHammer to successfully prove the target theorem.” A second case study reports that CoqHammer selects the generated `contra_2` and then proves the target (Section 3.2, PDF page 12). However, its printed formulas are inconsistent with its explanation. The target is `forall x (i: interval), In x i → ∼empty i`; `contra` is printed as `forall x (i: interval), ∼empty i → In x i`; and `contra_2` is `forall x (i: interval), empty i → In x i → False`. The authors call `contra` the target’s contrapositive and say the generated lemma is equivalent to it. Inference: as printed, `contra` is neither that contrapositive nor equivalent to `contra_2`; `contra_2` instead expresses the target. The reported selection outcome does not resolve this formula error.

Verus form. Inference: mine lemmas that summarize inductive or recursive reasoning into reusable contracts, then use them to reduce a later obligation to solver-supported arithmetic or rewriting. Inference: maintain both semantic equivalence and ownership preconditions; a syntactic rewrite that loses a borrow or invariant condition is invalid. The induction example supports this pattern in Rocq; the paper provides no Verus code, and its selection example has the formula inconsistency described above.

## technique 6: backend diversity and RAG for LLM agents

The authors rerun extraction with OpenAI o3-mini. The authors test the union of the two lemma sets: CoqHammer proves 1,019 theorems using the union, versus 998 with Claude's set and 987 with o3-mini's set. Section 3.3 reports that o3-mini increases proved theorems by 12.16% and “the number of tactics automated by 26.27%” (PDF page 12). The theorem counts appear in Table 2; the paper does not give corresponding tactic counts or a tactic metric definition.

For LLM agents, the system adds retrieval-augmented generation over all context lemmas and optionally enables CoqHammer. In Setting I, an LLM plus CoqHammer proves 1,401 theorems and rises to 1,457 (+4.00%) with Strat2Rocq; in Setting II, an LLM without CoqHammer rises from 1,128 to 1,158 (+2.65%). Token use falls from 1.379×10^7 to 1.298×10^7 (−5.87%) in Setting I and 1.798×10^7 to 1.727×10^7 (−3.94%) in Setting II. Each percentage uses the baseline theorem count or token total in its own setting as the denominator. Table 4 also shows regressions: Vfa drops from 128 to 118 proofs in Setting I and from 105 to 94 in Setting II; Coq-Art drops from 584 to 581 in Setting II.

Verus form. Inference: use multiple model backends to mine complementary Verus lemmas, then retrieve them for an agent that can call Verus. The verifier remains the arbiter; model agreement is not evidence. Inference: token savings may translate to fewer model calls, but Verus compile time and solver time must be measured separately.

## what is proved, measured, and trusted

For retained extracted lemmas, Section 3.1 reports “the number of lemmas successfully proved by our proof agent” (PDF page 9). The evaluation counts successfully proved Rocq theorems; it does not report an audit of axioms or assumptions. The study measures extracted-lemma counts, CoqHammer theorem counts under three-fold cross-validation, project-level improvements, backend-LLM comparisons, ablations, LLM-agent theorem counts, and token totals. The corpus contains CompCert (1,000 randomly sampled theorems), all available Ext-Lib, Coq-Art, and Vfa theorems, totaling 2,394.

Inference: LLM outputs and error classifiers propose or repair candidate proofs; they are not trusted justifications merely because the workflow uses them. Proof validity depends on Rocq checking under the supplied definitions and assumptions. Whether a formal theorem captures the intended software requirement is a separate question. Inference: a Verus adaptation must likewise account for verifier assumptions, external-body contracts, dependency specifications, and the adequacy of the stated requirements. A verified lemma can express less than a product requires.

## contradictions, assumptions, and failure modes

The abstract claims a 13.41% success-rate increase; Table 2's raw counts show 118 additional proofs over an 880 baseline, which is 118/880 = 13.41%. Project percentages use the same baseline-count denominator, while the extraction ratios in Table 1 use input-theorem counts. These denominators differ and should not be conflated. Section 3.1 reports: “We observe that about half of the NL steps are not successfully generalized and formalized as lemmas.” (PDF page 9). Inference: this attrition does not identify how many candidates are false, since the reported causes also include missed lemma extraction and proof-agent limitations.

The paper's direct-to-formal ablation removes NL proof generation and yields 1,670 lemmas versus 4,583 (a 63.56% decrease) and 936 versus 998 proved theorems (a 6.21% decrease). The counts support the stated percentages: 2,913/4,583 = 63.56% and 62/998 = 6.21%. Failures include hallucinated logic and failure to identify arithmetic lemmas. Inference: Verus's richer state and ownership context may increase these failure modes, so lemma provenance and automated recompilation are essential.

## what VL should reuse and what it should not redo

Inference: VL can reuse offline proof-plan extraction, generalization into small reusable lemmas, verifier-backed repair, online context augmentation, relevance retrieval, and evaluation with held-out theorem sets. Tables 1–4 establish results for Rocq projects and the tested configurations. Inference: VL should test whether mined Verus lemmas improve automation, survive crate upgrades, reduce proof repair time, or cause solver instability.

Threat to a product of agent-written verified Rust. Inference: the threat is material to proof throughput and automation because a mined library could let agents solve recurring ownership or invariant obligations without human invention. Inference: Verus checking limits what the resulting proofs establish to the supplied contracts and assumptions; weak contracts, unsound external assumptions, or stale dependency specifications can still make a reusable lemma misleading. The paper contains no evidence about Rust execution, unsafe code, or production APIs.

## techniques for the catalog

- offline NL proof planning — prompt an LLM with definitions and file context to expose intermediate proof steps
- generalized lemma formalization — convert each step into a reusable, verifier-proved lemma
- typed proof-agent repair — classify proof errors and retry with specialized repair prompts under a round limit
- online lemma-context augmentation — expose the mined library to a symbolic prover with fixed candidate retrieval
- induction bypass by lemmas — summarize recursive reasoning so a prover can finish with supported rewriting or arithmetic
- multi-backend and RAG integration — union complementary lemma sets and retrieve them for symbolic or LLM agents

## evidence references

The workflow and prompt examples are in Sections 2–2.2, PDF pages 3–7. Online proving and implementation are Sections 2.3–2.4, PDF pages 7–8. Dataset and extraction counts are Section 3 and Table 1, PDF pages 8–10. The paper’s first-page identifier is arXiv:2510.10131v2, dated 4 March 2026; the existing citation tag is retained. CoqHammer results and case studies are Section 3.2 and Table 2, PDF pages 11–12. Backend and ablation results are Sections 3.3–3.4 and Table 3, PDF pages 12–13. LLM-agent results are Section 3.5 and Table 4, PDF pages 13–14.
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Specifically, we partition the collected theorems into three disjoint parts with equal size, and conduct three separate experiments."): checked the complete paper, all study quotations, numbers, section/page references, and technique steps; corrected the improvement denominator, reasoning claims, extraction workflow, proof-trust discussion, and unsupported retrieval-cost claim; flagged the printed contra/contra_2 inconsistency and undocumented tactic metric; did not reproduce experiments, inspect implementation code, or audit proof assumptions.
