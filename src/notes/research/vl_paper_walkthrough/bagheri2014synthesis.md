# Synthesis from Formal Partial Abstractions
(authored by agents unless marked 🧑)

Tag: `bagheri2014synthesis`, [paper](https://www.semanticscholar.org/paper/40d439bf684ee3104d5a1b86ce210f6daa880766)

## scope and result

This dissertation develops specification-driven synthesis for selected parts of model-driven development. It uses relational specifications in Alloy and the Alloy Analyzer's finite-domain model finding instead of hand-coded translators. The central workflow specifies source and target languages, writes mapping predicates, supplies a partial application model, and asks the analyzer for satisfying target instances that are then unparsed into architecture descriptions, code frameworks, or database schemas. The abstract says: “Synthesis is thus driven by finite-domain constraint satisfaction.” (Abstract, p. v) It deliberately synthesizes partial artifacts rather than complete applications.

## technique 1: synthesis from conjoined relational specifications

What it is. A source-language model, target-language model, application instance, and mapping rules are all written as relational logic. The analyzer searches finite structures satisfying their conjunction. The dissertation describes the four elements as source and target language specifications, mapping rules, and an application model (Introduction, pp. 5–6). Alloy signatures define element types and relations; facts constrain every instance; predicates express mapping conditions; assertions state properties to check.

How to apply it.

1. Define the source language's signatures and relations. The example declares an Alloy `Class` with `attrSet`, `id`, `parent`, and `isAbstract` fields (Listing 1.1, p. 7).
2. Define the target language similarly, including the structures a valid target must contain.
3. Encode the concrete application model as facts or an Alloy instance.
4. Add mapping predicates relating source elements to target elements. The example requires a table to contain fields corresponding to inherited attributes of a non-abstract class (Listing 1.2, pp. 8–9).
5. Run the Alloy Analyzer to find satisfying instances; unparse the low-level instance into SQL, an architecture description, or another target representation.

The paper states: “Given source and target languages specifications, mapping rules, and an application model as inputs, a relational logic model finder then automatically transforms the given model instance into one (or more) target model instance(s).” (Introduction, p. 6)

Verus form. Inference: Use Verus `spec fn` predicates for source and target invariants, ghost types for mapping relations, and proof lemmas to show that a generated Rust representation satisfies the target predicate. A generator can enumerate finite candidate architectures, while Verus proves each selected candidate's refinement. Inference: Verus itself is not a finite model finder and does not synthesize arbitrary Rust from relational constraints, so this is an external synthesis-plus-proof pipeline.

Evidence and limits. Alloy's bounded search gives instances only within the chosen scope; a satisfying instance is not proof that all larger instances satisfy the mapping. The dissertation relies on the Analyzer, SAT translation, scope, and unparser. It claims reduced translator coding, but the generated artifacts still require hand-written extensions in the code-framework case.

## technique 2: architectural synthesis with Monarch

Monarch maps an abstract application model to architectures in a selected style. Four specifications are conjoined: application type, concrete application model, architectural style, and mapping predicates (Introduction, pp. 11–12). The analyzer computes satisfying architectural models; Alloy2ADL translates the results to a human-readable architecture description (Chapter 3, §§3.2–3.3).

How to apply it.

1. Choose an application type, such as sense-compute-control, and formalize its allowed elements.
2. Formalize an architectural style, such as implicit invocation, as Alloy signatures and facts.
3. Encode the concrete application, for example the Lunar Lander model (§3.4, pp. 38–45).
4. Write mapping predicates connecting application roles to style components and connectors.
5. Ask the Analyzer for all or selected satisfying instances and pass them through Alloy2ADL.

The dissertation reports eight architectural mappings in the evaluation of the Monarch approach (§3.5, p. 46), but this is a count of mappings explored, not a universal correctness denominator. Inference: a Verus analogue could generate a Rust module topology and trait wiring from a style predicate, then prove API contracts for each component. Inference: the style specification and mapping rules remain the critical trusted requirements; synthesis cannot repair a wrong architecture predicate.

## technique 3: partial code-framework synthesis with Pol

Pol synthesizes platform-specific implementation models from partial architecture and platform specifications, then binds code fragments that encode platform usage patterns (Chapter 1, §1.7.2, pp. 12–13). The target is intentionally a partial framework: formal constraints determine structure and bindings, while developers supply design fragments and hand-written extensions.

How to apply it.

1. Specify application architecture and target platform constructs in relational logic.
2. Add mapping predicates from architectural elements to platform constructs.
3. Ask the Analyzer for an implementation model satisfying style, platform, and mapping constraints.
4. Declare design fragments and binding relations that match fragments to implementation-model elements.
5. Generate the code framework from those matches and complete the remaining application code manually.

Verus form. Inference: design fragments can be Rust modules containing executable code plus Verus contracts; the binding relation chooses where modules are instantiated. Verus then checks `requires`/`ensures` contracts and data invariants for each generated binding. Inference: generated structure does not prove external platform semantics or unsafe FFI behavior.

## technique 4: exhaustive ORM tradeoff-space synthesis

The dissertation formalizes object-relational mapping strategies in Alloy and uses a model finder to enumerate candidate mappings for each object model (Chapter 1, §1.7.3, p. 13; Chapter 5). Optional class-specific strategies constrain the search. Six quality metrics classify candidates into quality-equivalence classes; because metrics conflict, the output is a Pareto frontier rather than one optimum.

How to apply it.

1. Encode classes, attributes, inheritance, tables, fields, and associations as relational signatures.
2. Formalize each ORM strategy as predicates.
3. Supply the object model and any class-specific strategy constraints.
4. Enumerate satisfying mappings in the chosen finite scope.
5. Compute the six metrics, group equivalent candidates, and present Pareto-optimal choices for a human to select.

Verus form. Inference: represent each candidate schema as a ghost value and prove serialization/deserialization round-trip lemmas for the chosen candidate. Verus can verify one mapping's safety and functional contract; it does not optimize six conflicting metrics or enumerate the frontier.

## evidence, trust, and product implications

The work demonstrates three applications: Monarch architecture synthesis, Pol partial code frameworks, and ORM mapping spaces. It uses Alloy's SAT-backed finite model finding and reports case studies rather than a common benchmark denominator. The dissertation's own claim is that formal analyzers can validate specifications and mapping rules; it says: “By expressing essential properties intended to follow from the specifications and mapping rules, one can use automated analysis to check them.” (Introduction, p. 7) Trusted components include Alloy's semantics and Analyzer, finite scope choices, formal source/target models, mapping predicates, unparser/code generators, and human judgment in choosing among Pareto-optimal candidates. Inference: for agent-written verified Rust, the threat is medium: synthesis can generate architecture and data-mapping scaffolding, but it does not replace Verus proofs of memory safety, concurrency, cryptographic correctness, or external-library behavior. Existing specification-driven synthesis and Alloy model finding already cover generic constraint-based artifact generation; VL should not redo this as a novel verification technique. A useful integration is to use Alloy/ SAT for finite design-space exploration and Verus for deductive proof of the selected Rust implementation.

## techniques for the catalog

- relational partial synthesis — conjoin source, target, application, and mapping specifications and find satisfying finite instances
- Monarch architecture mapping — synthesize style-conforming architectures from abstract application models
- Pol code-framework synthesis — bind platform usage fragments to a synthesized implementation model
- ORM tradeoff exploration — enumerate schema mappings, classify six quality metrics, and present Pareto frontiers
- assertion-based validation — state intended mapping properties as Alloy assertions and search for counterexamples

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
