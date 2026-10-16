# Formal Semantics for Agentic Tool Protocols: A Process Calculus Approach
(authored by agents unless marked 🧑)
Tag: `schlapbach2026formal`, [paper](https://arxiv.org/abs/2603.24747)

## what is proved
The paper formalises Schema-Guided Dialogue (SGD) and Model Context Protocol (MCP) as communicating π-calculus processes. It defines syntax, operational semantics and labelled transition systems, maps SGD intents to MCP schemas, and proves weak bisimulation under mapping Φ. The abstract states: “We present the first process calculus formalization of SGD and MCP, proving they are structurally bisimilar under a well-defined mapping Φ.” (Abstract, p.1). The reverse mapping is partial and lossy: Resource, Prompt and ToolsList are outside the image, and transactionality, error recovery and dependencies can disappear. Four metadata extensions define MCP+; Theorem 7.1 claims a bijective bisimulation between MCP+ and SGD (Section 7.3, p.15).

## technique 1: process-calculus protocol model
what it is: represent agent/tool interactions as terms with explicit invocation, validation, execution, result and error transitions. SGD syntax includes `Intent`, `Slot`, `CollectSlot`, `Execute`, `Result`, `Error`, parallel composition, channel restriction and replication (Section 3.1.1, p.3). MCP syntax includes `Tool`, `Resource`, `Prompt`, `ToolsList`, `ToolCall`, `Validate`, `Execute`, `Result` and `Error` (Section 3.2.1, p.4).

how to apply:
1. define each service operation with required and optional slots
2. define the MCP JSON schema and tool metadata
3. write transition rules for complete and incomplete parameters
4. distinguish silent administrative transitions from observable calls, execution, results and errors
5. form an LTS whose states are well-formed process terms

The train example requires `from`, `to` and `date`, permits `class`, and marks the transaction as requiring confirmation (Section 3.1.2, pp.3–4). Inference: model a Verus protocol as a ghost state enum plus transition relation `spec fn step`; prove transition lemmas with `requires` and `ensures`. Use a loop `invariant` for a bounded executor. A Verus proof covers the encoded state machine, not an arbitrary network or MCP implementation.

## technique 2: schema mapping and weak bisimulation
what it is: map an SGD intent to a JSON-schema tool, encode bindings as JSON, and relate action labels. The paper defines “Action Equivalence” with `invoke(n,p) ≈ call(n,p)`, `collect(s,v) ≈ τ`, and equal execute/result/error labels (Section 4.3, p.8).

how to apply:
1. map required slots to JSON `required` and all slots to `properties`
2. map slot type, description and enumerated values
3. map execution bindings with `JSON.encode`
4. define a relation `R = {(S, Φ(S))}`
5. prove each source transition has a matching target transition and vice versa
6. conclude weak bisimulation after absorbing MCP validation τ steps

The main theorem is quoted as: “Theorem 4.3 (SGD ∼ MCP under Φ). ∀S ∈ SGD. S ∼ Φ(S).” (Section 4.4, p.8). Inference: represent `R` as a ghost predicate over paired states and prove one-step correspondence with `ensures`; represent τ steps as internal ghost transitions. Do not claim this proves real tool effects unless the `invoke_api` semantics are themselves specified and verified.

## technique 3: Gorla-style reverse analysis
what it is: test whether the mapping is a valid encoding, surjective and fully abstract. The paper checks compositionality, name invariance, operational correspondence, divergence reflection and success sensitiveness (Section 5.1, pp.9–10).

how to apply:
1. define a reverse mapping on the executable Tool fragment
2. check compositionality for parallel, restriction, replication and null
3. check operational correspondence in both directions
4. search for target terms with no source preimage
5. construct source terms that differ observably but map to identical targets

The reverse map is undefined for Resource, Prompt and ToolsList (Section 5.3, p.10). Transactional and non-transactional intents map to the same MCP schema because the approval flag is prose only; this breaks full abstraction (Section 5.4, pp.10–11). Inference: for Verus APIs, test round-trip identity as lemmas over typed metadata and reject lossy encodings at compile time.

## technique 4: four type-system safety principles
P1 semantic completeness requires descriptions to carry useful entities, examples and constraints. The paper defines `sem_density(s) = |entities(s)| / |tokens(s)|` and a threshold θ, with a `WellDescribed` rule (Section 6.1, p.12). P2 explicit action boundaries adds `side_effects ∈ {read, write, delete, none}` and requires approval for writes/deletes; Theorem 6.2 says every such execution is preceded by approval (Section 6.2, p.12). P3 failure-mode documentation enumerates `(ErrorType, RecoveryStrategy)` such as retry, fallback, user prompt and abort (Section 6.3, p.13). P4 inter-tool relationship declaration lists `Requires`, `ProducesInputFor` or `ExclusiveWith`; Theorem 6.3 requires a dependency predecessor in every valid trace (Section 6.4, p.13).

Inference: encode these as Rust enums and ghost metadata. `requires` can enforce that a write tool has `requires_approval`; `ensures` can establish that an approval event precedes execution; `spec fn` can check dependency ordering. Keep metadata in the verified representation rather than descriptions parsed at runtime.

## technique 5: MCP+ full-equivalence extension
MCP+ removes Resource and Prompt from the equivalence fragment and adds metadata fields `side_effects`, `requires_approval`, `failure_modes`, `summary` and `dependencies` (Section 7.1, p.14). Φ+ maps transactionality to side effects and approval, descriptions to summaries, errors to failure modes and dialogue dependencies to dependency metadata (Section 7.2, p.14). Theorem 7.1 claims both round trips are identities.

## techniques for the catalog
- π-calculus protocol semantics — model tools, resources, calls, errors and parallel composition as labelled processes
- schema mapping — translate required/optional slots into typed JSON schemas
- weak bisimulation — prove matching observable traces while hiding validation transitions
- reverse encoding analysis — test compositionality, correspondence, surjectivity and full abstraction
- semantic-density typing — require descriptions to contain measurable domain information
- explicit action boundaries — type side effects and enforce approval before writes or deletes
- failure-mode typing — enumerate errors and recovery strategies as machine-readable metadata
- dependency declarations — encode required tool ordering and prove predecessor traces
- MCP+ round trips — extend metadata until forward and reverse mappings are identities
