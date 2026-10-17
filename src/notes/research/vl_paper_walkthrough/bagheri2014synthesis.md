# Synthesis from Formal Partial Abstractions
(authored by agents unless marked 🧑)

Tag: `bagheri2014synthesis`, [paper](https://arxiv.org/abs/1411.0481)

Source note: the paper is Hamid Bagheri's University of Virginia PhD dissertation (cover dated May 2013), posted as arXiv:1411.0481v1 on 3 Nov 2014. Page numbers below are the dissertation's printed page numbers.

## scope and result

This dissertation develops specification-driven synthesis for selected parts of model-driven development. It uses relational specifications in Alloy and the Alloy Analyzer's finite-domain model finding instead of hand-coded translators. The central workflow specifies source and target languages, writes mapping predicates, supplies a partial application model, and asks the analyzer for satisfying target instances that are then unparsed into architecture descriptions, code frameworks, or database schemas. The abstract says: “Synthesis is thus driven by finite-domain constraint satisfaction.” (Abstract, p. v) The approach deliberately targets selected aspects of a system rather than complete applications (Introduction §1.4, p. 5: “the approach targets selected aspects of a system for modeling and synthesis, rather than trying to impose a top-down MDD approach to whole system development”).

## technique 1: synthesis from conjoined relational specifications

What it is. A source-language model, target-language model, application instance, and mapping rules are all written as relational logic. The analyzer searches finite structures satisfying their conjunction. The dissertation describes the four inputs as source and target language specifications, mapping rules, and an application model (Introduction §1.4, pp. 5–6). Alloy signatures define element types and relations; facts constrain every instance; predicates are parameterized reusable constraints; assertions state properties to check (§3.3.2, pp. 35–36).

How to apply it.

1. Define the source language's signatures and relations. The example declares an Alloy `Class` with `attrSet`, `id`, `parent`, and `isAbstract` fields (Listing 1.1, p. 7).
2. Define the target language similarly, including the structures a valid target must contain (the example target is a relational schema with tables and fields; §1.5, p. 8).
3. Encode the concrete application model as facts or an Alloy instance.
4. Add mapping predicates relating source elements to target elements. The example says the table encompasses relational fields corresponding to all inherited attributes of the given class, should the class not be abstract (Listing 1.2, p. 8; explanation pp. 8–9).
5. Run the Alloy Analyzer to find satisfying instances; unparse the low-level Alloy objects into SQL (§1.5, p. 9), an architecture description (§3.3.4, p. 37), or another target representation.

The paper states: “Given source and target languages specifications, mapping rules, and an application model as inputs, a relational logic model finder then automatically transforms the given model instance into one (or more) target model instance(s).” (Introduction, p. 6)

Verus form. Inference: Use Verus `spec fn` predicates for source and target invariants, ghost types for mapping relations, and proof lemmas to show that a generated Rust representation satisfies the target predicate. Inference: A generator can enumerate finite candidate architectures, while Verus proves each selected candidate's refinement. Inference: Verus itself is not a finite model finder and does not synthesize arbitrary Rust from relational constraints, so this is an external synthesis-plus-proof pipeline.

Evidence and limits. The Alloy Analyzer is a bounded checker, so a scope of instances must be specified (§3.3.2, p. 36). Inference: a satisfying instance is therefore not proof that all larger instances satisfy the mapping. The dissertation relies on the Analyzer (Kodkod as constraint solver, §3.3.2, p. 36; SAT4J as SAT solver in the evaluations, pp. 71, 91) and on the unparsers. It claims to “substantially” eliminate hand coding of translators (Hypotheses, §1.6, p. 9), but the generated artifacts still require hand-written extensions in the code-framework case (§4.4.9, p. 64). The author notes that producing the required specifications “will be a specialized skill requiring knowledge of formal methods” (§6.3, p. 100) and that no human-subject study has been done.

## technique 2: architectural synthesis with Monarch

Monarch maps an abstract application model to architectures in a selected style. Four specifications are conjoined: application type, concrete application model, architectural style, and mapping predicates (§1.7.1, pp. 11–12). The analyzer computes satisfying architectural models; Alloy2ADL translates the results to a human-readable architecture description, here Acme (§§3.2–3.3, pp. 27–38). Application models are drawn in GME using architecture-independent modeling language (AIML) meta-models and translated by a GME interpreter into Alloy (§§3.3.1–3.3.2, pp. 33–35).

How to apply it.

1. Choose an application type, such as sense-compute-control (SCC), and formalize its allowed elements (Sensor, Actuator, Controller; Figure 3.6, p. 38).
2. Formalize an architectural style, such as implicit invocation (II), as Alloy signatures and facts (Figure 3.7, p. 39).
3. Encode the concrete application, for example the Lunar Lander model (§3.4.4, pp. 42–43).
4. Write mapping predicates connecting application roles to style components and connectors (Figure 3.5; §3.4.3, pp. 40–41).
5. Ask the Analyzer for satisfying instances and pass them through Alloy2ADL (§§3.4.5–3.4.6, pp. 42–45).

Division of responsibility (§3.4.5, pp. 42–43): “Alloy Analyzer guarantees that computed descriptions conform to the given architectural style. The mapping predicates are responsible for ensuring that computed architectural models refine given application models.”

Evidence. The text says “I have developed eight architectural mappings validating the approach (cf. Figure 3.12)” (§3.4.3, p. 40). Figure 3.12 (§3.5, p. 46) shows four application types, three styles, and seven non-empty cells (the paper's text and figure disagree on eight versus seven; this note does not resolve it). The experiments replicate informal studies from the literature (KWIC, Lunar Lander, MIDAS), so they test consistency with published manual results. Inference: this is a count of mappings explored, not a universal correctness denominator. The author notes that the tool considers mainly structural refinement and that the styles tried are “canonical styles of academic interest” (§3.5, p. 48; §6.3, p. 99). Inference: a Verus analogue could generate a Rust module topology and trait wiring from a style predicate, then prove API contracts for each component. Inference: the style specification and mapping rules remain the critical trusted requirements; synthesis cannot repair a wrong architecture predicate.

## technique 3: partial code-framework synthesis with Pol

Pol synthesizes platform-specific implementation models from partial architecture and platform specifications, then binds code fragments that encode platform usage patterns (§1.7.2, p. 12; Chapter 4, §§4.2.1–4.2.2, pp. 54–57). The target is intentionally a partial framework: formal constraints determine structure and bindings, while developers supply design fragments and hand-written extensions (§4.4.9, p. 64).

How to apply it.

1. Specify the architectural style, the application architecture, and a partial platform model (classes, methods, constraints as Alloy signatures, relations, invariants) in relational logic (§4.2.1, p. 55).
2. Add implementation-mapping predicates from architectural elements to platform constructs (Listing 4.3, p. 62).
3. Ask the Analyzer for an intermediate implementation model (IIM) satisfying style, platform, and mapping constraints.
4. Declare design fragments (parameterized code templates for platform usage patterns) and a bindings file whose IL-variables are queries over the IIM that fill the template parameters (§4.2.2, pp. 56–57; §4.4.7, p. 62).
5. Let the ILParser generate the framework (interfaces, abstract methods, platform-specific classes), then complete the remaining application code by hand (§§4.4.8–4.4.9, pp. 63–64).

Evidence (CyberHealth case study, §4.6, pp. 67–71): the implementation is over 12 thousand lines of code with more than 34% synthesized; the platform models are about 50 to 90 lines each; the slowest synthesis (scope bound of 30 elements) took about 100 seconds. Three evolution experiments changed hand-written code by 96, 0, and 570 lines (Figure 4.5, p. 69). The author calls the evidence “fairly strong support for our hypothesis of technical feasibility” (p. 67) and notes that code that was synthesized is “absolutely consistent” with style rules “modulo possible errors in our design (code) fragments” (§4.7, p. 72).

Verus form. Inference: design fragments can be Rust modules containing executable code plus Verus contracts; the binding relation chooses where modules are instantiated. Inference: Verus then checks `requires`/`ensures` contracts and data invariants for each generated binding. Inference: generated structure does not prove external platform semantics or unsafe FFI behavior.

## technique 4: exhaustive ORM tradeoff-space synthesis (Spacemaker)

The dissertation formalizes object-relational mapping strategies in Alloy and uses a model finder to enumerate candidate mappings for each object model (§1.7.3, p. 13; Chapter 5, pp. 75–93). Object models are written in an Alloy DSL called Alloy-OM (Class, Attribute, Association; §5.2.1, pp. 77–80). Strategies formalized: own association table, foreign key embedding, merging into single table; class relation, concrete class relation and single relation inheritance; and the fine-grained Union Superclass, Joined Subclass and Union Subclass (§5.2.2, p. 81). Optional class-specific strategies constrain the search. Six metrics (TATI, NCT, NCRF, ANV, NIC, RIM; §5.2.3, p. 84) partition candidates into equivalence classes: two alternatives are equivalent if all metric values are equal. Because quality characteristics conflict, “there is generally no single optimum solution but there are several pareto-optimal choices” (§5.2.3, p. 85).

How to apply it.

1. Encode classes, attributes, inheritance, and associations in Alloy-OM; tables and fields appear on the target side (pp. 77–82).
2. Formalize each ORM strategy as a predicate (Listing 5.4, p. 82).
3. Supply the object model and any class-specific strategy constraints, or use the generic mixed strategy to let the model finder choose per class (p. 83).
4. Enumerate satisfying mappings in the chosen finite scope. For large models, split the object model by removing many-to-many association bridges and solve the sub-models separately (§5.2.4, pp. 85–86).
5. Compute the six metrics with Alloy queries, keep at most one candidate per equivalence class, and present Pareto-optimal choices with their metrics for a human to select (pp. 84–85).

Evidence (§5.3, pp. 88–92). On one hierarchy, 760,000 candidates were reduced to 40 equivalence classes in under 10 seconds. The ecommerce model (15 classes, 9 associations, 7 inheritance relationships) ran out of memory without decomposition; with splitting into three sub-models, synthesis time was on the order of seconds for one and minutes for the other two. Comparing against mappings from Holder et al., the referential integrity constraint in Figure 5.5b “is not mentioned in the source reference” but appears in the mapping derived by Spacemaker (§5.4, p. 92).

Verus form. Inference: represent each candidate schema as a ghost value and prove serialization/deserialization round-trip lemmas for the chosen candidate. Inference: Verus can verify one mapping's safety and functional contract; it does not optimize six conflicting metrics or enumerate the frontier.

## technique 5: assertion-based validation of mapping rules

Mapping rules are validated by writing assertions in Alloy and running `check` (§5.2.5, pp. 86–88). Listing 5.5 gives two examples: no table is associated with an abstract class, and each table's fields correspond to attributes of its classes. The paper notes that relational logic is undecidable, so assertions cannot be proved in general, and that the Analyzer is “a bounded checker, guaranteeing the validity of assertions only within a bounded instance space” (p. 87). In the experiments the Analyzer reported no counterexamples within the scope used. Inference: this finds counterexamples but does not prove the rules correct beyond the scope.

## evidence, trust, and product implications

The work demonstrates three applications: Monarch architecture synthesis, Pol partial code frameworks, and ORM mapping spaces. It uses Alloy's finite model finding and reports case studies rather than a common benchmark. The dissertation's own claim is that formal analyzers can validate specifications and mapping rules; it says: “By expressing essential properties intended to follow from the specifications and mapping rules, one can use automated analysis to check them.” (Introduction, p. 7) It states its own limits: only structural refinement so far, small models, and no application “to solve previously unsolved problems in engineering practice” yet (§6.3, pp. 99–100). Inference: trusted components include Alloy's semantics and Analyzer, finite scope choices, formal source/target models, mapping predicates, unparser/code generators, design fragments, and human judgment in choosing among Pareto-optimal candidates. Inference: for agent-written verified Rust, the threat is medium: synthesis can generate architecture and data-mapping scaffolding, but it does not replace Verus proofs of memory safety, concurrency, cryptographic correctness, or external-library behavior. Inference: existing specification-driven synthesis and Alloy model finding already cover generic constraint-based artifact generation, so VL should not redo this as a novel verification technique. Inference: a useful integration is to use Alloy/SAT for finite design-space exploration and Verus for deductive proof of the selected Rust implementation.

## techniques for the catalog

- relational partial synthesis — conjoin source, target, application, and mapping specifications and find satisfying finite instances
- Monarch architecture mapping — synthesize style-conforming architectures from abstract application models
- Pol code-framework synthesis — bind platform usage fragments to a synthesized implementation model
- ORM tradeoff exploration — enumerate schema mappings, classify six quality metrics, and present Pareto frontiers
- assertion-based validation — state intended mapping properties as Alloy assertions and search for counterexamples

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The slowest synthesis time (for a bound of 30 elements) was about 100 seconds, confirming that the proposed technology based on a bounded model checker is reasonable at the scale of our experiments."): read all 6341 lines of the text (front matter, chapters 1 to 8; bibliography skimmed) and viewed the PDF page with Figure 3.12; checked every quotation, page and section reference, listing contents, and the technique steps and numbers (760,000 candidates, 40 classes, 12 thousand lines, 34%, 100 seconds, Figure 4.5 hand-written lines); changed the link to the arXiv page from the paper text, added a source note, corrected the "eight mappings" citation (the text says eight on p. 40, while Figure 3.12 on p. 46 shows seven non-empty cells), corrected Pol's section pages, added evidence from Chapters 3 to 6, a section on assertion-based validation, and "Inference:" marks on my own conclusions; did not check the Verus-form ideas (my own inferences, not from the paper), the cited references, or the figures other than Figure 3.12.
