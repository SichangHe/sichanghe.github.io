# A Pilot Benchmark for NL-to-FOL Translation in Planetary Exploration
(authored by agents unless marked 🧑)
Tag: `moore2026pilot`, [paper](https://arxiv.org/abs/2605.17911)

## paper's problem and contribution
The paper introduces a manually annotated benchmark for translating long natural-language planetary mission descriptions into First-Order Logic (FOL). The abstract says: “We introduce a pilot benchmark for translating natural language (NL) into First-Order Logic (FOL) within the domain of planetary exploration.” (§Abstract, PDF p. 1). The source material is NASA Planetary Data System documentation covering missions from 2003–2013 (§II, PDF p. 2)

The benchmark keeps temporal structure, agent roles, and operational dependencies explicit. It provides predicate vocabularies and typed constants so that experiments can vary the amount of schema knowledge supplied to a model (§Abstract and §III, PDF pp. 1, 3). This is a specification-generation resource rather than a verified autonomy system; no generated FOL is executed in a mission controller

The abstract calls it “a foundation for research at the intersection of language understanding and formal reasoning, grounded in real-world, safety-critical mission data.” (§Abstract, PDF p. 1)

## technique 1: manually translate mission prose into structured FOL

what it is

Each multi-phase mission segment is paired with a FOL representation. Temporal relationships encode ordering, duration, and dependency; predicates relate agents, actions, and outcomes (§II, PDF p. 2). The example translates a launch narrative into existential event objects with predicates such as LaunchEvent, Agent, DateUTC, TimeUTC, From, After, and DurationMinutesApprox (§II–III, PDF pp. 2–3)

when to use it

Use this representation when natural-language requirements contain entities, events, temporal relations, operational roles, and nested dependencies. The authors motivate FOL because mission documents must support “semantic mapping, inform task planning and scheduling, enforce safety conditions during navigation, and support verification and validation (V&V) of autonomous decisions.” (§IV, PDF p. 4)

how to do it

1. Select a mission document from the PDS collection and isolate a coherent multi-phase segment (§II, PDF p. 2)
2. Identify events and entities, including spacecraft, subsystems, instruments, and external entities (§II, PDF p. 2)
3. Introduce existential variables for events and conjoin type and role predicates. In the paper's example, the launch becomes ∃e with LaunchEvent(e) and Agent(e, Spirit MER2) (§II, PDF p. 2)
4. Convert dates, times, locations, and numeric measurements into typed predicates such as DateUTC, TimeUTC, LocalTZ, At, and AzimuthDeg (§II, PDF p. 2)
5. Represent temporal sequencing and duration with predicates such as After, StartsAfterMinutesApprox, and DurationMinutesApprox (§II, PDF pp. 2–3)
6. Represent operational dependencies and participating agents, for example Uses(d, YoYoDespinSystem) and ActsOn(d, UpperStageStack) (§II, PDF p. 3)
7. Preserve the whole composition as a single logical form rather than independent sentence labels (§III, PDF p. 3)

what transfers to Verus

Inference: In Verus, event and entity records can be executable Rust structs, while `spec fn` predicates express temporal and role relations. Inference: A proof function can show that a parsed mission state satisfies safety invariants such as ordering or duration bounds, using `requires` and `ensures`; this is an application design inferred from the benchmark, not a result of the paper. Inference: FOL quantifiers do not carry directly into executable Rust, so bounded domains, finite sequences, or ghost sets are needed for a Verus proof

## technique 2: separate predicate vocabulary and typed constants

what it is

The dataset extracts and standardizes predicate vocabularies across documents and separates typed constants into entities, temporal values, and numerical quantities (§II, PDF p. 3). This allows the same paired examples to support unconstrained generation or schema-guided generation

how to use it

1. Build a vocabulary of predicate signatures used in the annotated examples (§II, PDF p. 3)
2. Assign types to constants, such as event entities, temporal literals, and numeric values (§II, PDF p. 3)
3. For an unconstrained condition, ask the model to produce a complete logical form from prose (§III, PDF p. 3)
4. For a schema-guided condition, provide predicates and type constraints before generation (§III, PDF p. 3)
5. Compare whether prior vocabulary and type information improve compositional translation (§III, PDF p. 3)

The benchmark has 251 unique predicate signatures, 125 entity constants, 16 date literals, 13 time literals, and 51 numeric values (§V, PDF p. 4). Each example averages 30.3 unique predicates, 13.0 quantifiers, and 12.2 entity constants; the ranges are 17–50, 5–25, and 6–18 respectively (Table I, PDF p. 4)

what transfers to Verus

Inference: A Verus generation prompt should expose the exact Rust types, field names, and allowed specification predicates before asking for contracts. Inference: Typed constants can become enums or newtypes, reducing accidental mixing of event IDs, times, and quantities. Inference: The benchmark does not measure whether schema conditioning improves Verus proof success

## technique 3: evaluate translation with controlled baseline generation

what it is

The preliminary evaluation feeds each full natural-language description to local instruction models and requests a FOL representation directly, with no explanation or intermediate steps (§VI, PDF p. 5). Outputs are capped at 500 tokens. Models include Qwen1.5-1.8B, Mistral-7B-Instruct-v0.3, Phi-3-mini, Llama-3.1-8B-Instruct, and Gemma-2-9B-IT (§VI, PDF p. 5)

how to do it

1. Provide the complete mission segment as the prompt (§VI, PDF p. 5)
2. Request only the corresponding FOL representation, without intermediate explanation (§VI, PDF p. 5)
3. Cap output at 500 tokens (§VI, PDF p. 5)
4. Compare the generated structure with the manually annotated FOL, recording temporal omissions, hallucinated predicates/entities, and global incoherence (§VI, PDF pp. 5–6)
5. Release raw outputs alongside the benchmark for later quantitative evaluation (§VI, PDF p. 6)

The paper reports recurring failures: temporal ordering, duration, and dependency are omitted, misrepresented, or contradicted; later or nested details are missed; and models hallucinate predicates, entities, or relationships (§VI, PDF pp. 5–6). It recommends decomposition, few-shot schema constraints, guided decoding with formal grammars, and hybrid neuro-symbolic pipelines as future directions (§VI, PDF p. 6)

what transfers to Verus

Inference: This baseline can be adapted by asking an agent to emit Rust contracts directly, then compiling with Verus and checking generated proof obligations. Inference: A stronger Verus evaluation should score both parser/proof success and semantic coverage against a fixed reference model. Inference: The paper's qualitative mismatch observations cannot be interpreted as Verus pass rates

evidence and limits

The pilot contains 11 multi-phase segments from five unique mission sources (§V, PDF p. 4). Natural-language length averages 257.6 words with an 84–412 range, and FOL length averages 286.9 tokens with a 174–434 range (Table I, PDF p. 4). The evaluation is qualitative and intentionally not a comprehensive model comparison (§VI–VII, PDF pp. 5–6). The authors list small scale, manual-annotation subjectivity, lack of quantitative equivalence metrics, and fixed single-pass generation as limitations (§VII, PDF p. 6)

## what is proved, measured, and trusted

The paper provides manually constructed paired data and descriptive statistics. It does not prove that each annotation is the unique or complete logical interpretation of the mission prose. It does not execute generated FOL against a planner or safety monitor. Inference: the annotation protocol and predicate schema are trusted by downstream users, while model outputs remain untrusted until checked

Inference: For agent-written verified Rust, the main threat is specification omission in long, nested requirements. The benchmark's event-role and temporal decomposition is useful training material, but its 11 examples cannot establish coverage of production requirements. Inference: A product should combine schema-constrained generation with proof checks and explicit review of assumptions; compiling a contract cannot show that a missed mission clause was intended to be absent

There are no percentage results whose denominators could be confused: the paper reports counts, means, and ranges, and describes failures qualitatively. The 50-model? No such experiment is reported; the evaluated set is five named local models (§VI, PDF p. 5)

## techniques for the catalog

- event-and-role FOL annotation — map mission prose to existential events, typed entities, temporal relations, and operational predicates
- schema and type separation — publish predicate signatures and typed constants to support controlled translation settings
- direct long-form baseline — evaluate single-pass model translation with fixed output length and qualitative failure analysis
- decomposition direction — use smaller segments, schema constraints, guided grammars, or neuro-symbolic checks as the paper's proposed next steps
Checked 2026-10-14 against the paper by a Codex agent: audit record moore2026pilot; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
