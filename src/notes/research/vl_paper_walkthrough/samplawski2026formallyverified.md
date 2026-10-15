# Formally Verified Code Synthesis for Structured Data Translation in a Medical Internet of Things
(authored by agents unless marked 🧑)
Tag: `samplawski2026formallyverified`, [paper](http://arxiv.org/abs/2606.20776v1)

## problem and result
The paper builds a neuro-symbolic pipeline that evolves LLM-generated translators between a medical device’s JSON schema and HL7 FHIR JSON. A PVS theorem prover is the evaluator: a candidate receives fitness 1 only when its transformation theorem satisfies schema constraints, otherwise 0. The verified PVS theorem is then deterministically translated into C for deployment in a Medical Internet of Things (MIoT) network. The abstract says, “This formal verification stage ensures structured data translated by the generated code will always be in the target output schema.” (Abstract, PDF p. 1.)

The system uses ShinkaEvolve’s multi-island evolutionary loop. The paper states, “This results in a binary fitness function: 0 for an invalid theorem and 1 for a valid theorem.” (§3, PDF p. 3) Each iteration selects a parent and K inspiration programs, prompts an LLM to edit, rewrite, or mutate a candidate, evaluates it with PVS, stores the result and score in a database, and continues asynchronously (§3, PDF p. 2). The authors state, “The transform is correct only if this theory is proven.” (§3, PDF p. 2.)

The case study integrates a pulse oximeter. Ten experiments use two islands and 20 generations each (§4, PDF p. 3). The first successful theorem occurs at generation 5.0 ± 4.3 (range 1–14), success rate over generated programs is 37.4 ± 22.4%, total API cost is $0.87 ± 0.18, cost before first success $0.18 ± 0.19, total wall time 42.7 ± 8.1 minutes, and time to first success 10.4 ± 9.9 minutes (Table 1, PDF p. 3). These are means and standard deviations over ten runs; the success denominator is all generated programs, not ten trials.

## technique 1: schema-constrained theorem synthesis

what it is and when to use it

Represent input compliance, output compliance, and a translation as PVS functions/theorems. Use this when generated code must satisfy a structured output schema, especially where downstream systems require exact keys, types, and constants. The authors provide a skeleton that returns an empty JSON dictionary and ask the model to synthesize `transform` in a PVS DSL (§3–4, PDF pp. 2–3).

how to do it

1. Define an input JSON schema and an output schema. The pulse-oximeter input constrains `finger_present`, `pleth`, `pulse_rate`, `spo2`, and `valid`; FHIR output constrains `Observation` fields, code constants, subject, date, and value quantity (Appendix Listings 3–4, PDF pp. 6–10).
2. Define `input_compliant?`, `output_compliant?`, and `transform` over the JSON datatype. The paper’s constraints require `requires(obj)` and `ensures(obj,new_obj)`; its example requires the output to be a JSON dictionary (Listing 1, PDF p. 3).
3. State a theorem: for every compliant input, `output_compliant?(transform(obj))` and `ensures(obj,transform(obj))` hold (Listing 1, PDF p. 3).
4. Include a PVS reference and an example transform in the LLM prompt because the model only weakly knows the DSL (§3, PDF p. 3).
5. Use PVS to prove the theorem; assign binary fitness 1 on proof success and 0 on failure (§3, PDF p. 3).

The verified example extracts `spo2`, constructs an `Observation` dictionary, and emits fixed FHIR constants such as `resourceType`, LOINC code `2710-2`, unit `%`, and a fixed subject reference (Appendix Listing 5, PDF pp. 11–12).

Verus form

Inference: In Verus, model JSON values as an enum/map representation with `spec fn` predicates for input and output schema compliance. Define `transform` as a pure specification function or verified executable Rust function, then state `requires input_compliant(input)` and `ensures output_compliant(result) && semantic_relation(input,result)`. Verus can prove the contract, but it does not translate a PVS theorem into C; a separate code-generation/refinement proof is needed. A generated candidate must not weaken the schema predicate to obtain a proof.

Evidence and limits

The binary evaluator guarantees only the PVS theorem stated. The paper’s output schema is syntactic and semantic alignment with clinical intent is not independently evaluated. The final C translation is described as deterministic, but the case study does not report a proof that generated C preserves the PVS function for all JSON values. Inference: this is a critical trust boundary for a medical deployment.

## technique 2: multi-island evolutionary search with LLM operators

what it is and when to use it

Use an evolutionary database to explore many candidate translations while retaining verification as the objective. ShinkaEvolve maintains islands of programs and fitness scores; each generation selects a parent and K inspiration programs from the same island, then prompts an LLM to edit, rewrite, or mutate a candidate (§3, PDF p. 2).

how to do it

1. Seed each island with a skeleton PVS theory and the schemas.
2. Select a parent and K inspiration programs with their fitness scores.
3. Prompt the LLM with the PVS reference, example transform, schemas, parent, and inspirations; ask for one candidate transform.
4. Run PVS and assign 0/1 fitness from theorem validity.
5. Store candidate and score in the SQL database; repeat asynchronously with multiple workers (§3, PDF p. 2).
6. After the generation budget, retain a verified theorem and pass it to deterministic C translation.

Verus form

Inference: A Verus implementation can keep candidate Rust functions and contracts in a search database, use `cargo verus` as the binary fitness checker, and preserve only candidates whose fixed schema lemma verifies. Evolutionary mutation remains untrusted search. Candidate contracts should be immutable or separately checked so an agent cannot make the goal weaker.

Evidence and limits

The ten-run case study found a first verified theorem by generation 5.0 ± 4.3 and overall generated-program success 37.4 ± 22.4% (Table 1, PDF p. 3). The paper reports total cost $0.87 ± 0.18 and first-success cost $0.18 ± 0.19; the latter is about 20% of the total mean but both are per experiment. The initial skeleton is intentionally invalid, so success rates measure search candidates, not end-to-end clinical reliability.

## technique 3: adaptive model selection with Thompson sampling

what it is and when to use it

The ensemble includes o4-mini, GPT-5, GPT-5-mini, and GPT-5-nano. At each generation, a Thompson-sampling bandit dynamically chooses a model using observed success (§4.2, PDF p. 4). Use this when model cost and proof success differ and generation budget is limited.

how to do it

1. Initialize model-selection weights.
2. Sample one model per generation.
3. Verify its candidate with PVS and record binary success.
4. Update the bandit’s posterior/weights from success; resample for later generations.
5. Compare selection share with share of successful programs.

Across all experiments, GPT-5 was selected 33.7% of the time but produced 53.5% of successful programs; o4-mini was selected 25.3% and produced 14.1% of successes; GPT-5-mini was 26.3% selected and 28.2% successful; GPT-5-nano was 14.7% selected and 4.2% successful (Figure 2, PDF p. 4). The authors explicitly note that the algorithm considers success rate but not resource cost (§4.2, PDF p. 4).

Verus form

Inference: Use Verus verification success as the reward, but include token/API cost and proof time in a separate objective or constrained policy. A model selected often because it emits many candidates can still be poor if candidates exploit weak contracts or consume unacceptable resources.

## technique 4: verified-theorem to executable-code translation

what it is and when to use it

PVS’s DSL is not operational MIoT code. After proving the theorem, additional tooling deterministically translates the verified transform into C (§3, PDF p. 3). Use this split when the proof language is expressive but the deployment target requires efficient native code.

how to do it

1. Freeze the proven PVS transform and schema theorem.
2. Translate the theorem’s JSON operations into C using the deterministic translator.
3. Compile C for the MIoT environment.
4. Preserve the same input/output representation and schema assumptions.

Verus form

Inference: Verus executable Rust can eliminate a separate PVS-to-C stage, but any FFI, serialization library, or C boundary requires contracts and refinement proofs. The translation tool and compiler remain trusted unless independently verified.

## what is proved, what stays trusted, and product threat

PVS proves the stated schema theorem for the PVS `transform`; experiments measure search success, generations, model selection, cost, and wall time. The paper does not prove that the JSON schemas capture clinical intent, that the deterministic C translator preserves semantics, or that the MIoT runtime and libraries satisfy assumptions. Inference: For VeruLaw, the main reusable pattern is evolutionary generation with an immutable formal contract and a checker in the loop. The main threat is contract drift or a translation boundary that is outside the proof. VL should reuse the checker-gated search pattern while adding explicit Rust refinement and dependency assumptions; it should not claim that a proved schema predicate establishes medical correctness.

## techniques for the catalog

- schema-constrained theorem synthesis — define input/output predicates and prove every generated transform preserves the target schema
- multi-island verifier-gated evolution — mutate candidates with LLMs, score them by theorem checking, and retain verified programs in a search database
- Thompson-sampling model selection — adaptively choose LLMs from observed proof success while separately tracking cost
- verified-theorem operationalization — deterministically translate a proven specification into deployment code and identify the translation as a trust boundary
Checked 2026-10-15 against paper samplawski2026formallyverified: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
