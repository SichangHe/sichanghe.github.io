# Generating Logical Specifications from Requirements Models for Deduction-based Formal Verification
(authored by agents unless marked 🧑)
Tag: `klimek2014generating`, [paper](http://arxiv.org/abs/1402.1985v1)

## result and pipeline

Inference: This paper turns UML requirements models into temporal-logic specifications and checks manually chosen properties with semantic tableaux. Its abstract states, “The work concerns automatic generation of logical specifications from requirements models.” (abstract, p. 1) The intended output is a set of formulas suitable for deductive verification of liveness and safety.

The paper's six-step methodology is explicit: “1. use case diagrams … 2. use case scenarios … 3. activity diagrams … 4. automatic generation of logical specifications from requirements models; 5. manual definition of the desired model properties; 6. formal verification of a desired property using the semantic tableaux method.” (section 2, p. 6) Steps 1–3 are engineer-authored (section 7: “All the above steps require the assistance of an engineer and cannot be done automatically.”, p. 20); generation (step 4) and tableau reasoning (step 6) are automatic; defining the property (step 5) is manual, and the loop between steps 5 and 6 repeats the check for further properties.

Verus form (Inference): A Verus workflow can use this separation: derive candidate `requires`/`ensures` and state predicates from requirements artifacts, then let Verus check executable Rust against them. Temporal formulas are not Verus syntax, so a translation layer or a state-machine encoding is required. The paper does not claim automatic generation of Rust contracts or proof of translation correctness.

## technique 1: atomic activities and workflow patterns

Inference: Normalize scenarios into atomic activities and model each activity diagram only with predefined structural patterns. The paper defines an activity as “the smallest unit of computation” (section 3, p. 8) and says, “The following workflow patterns are predefined: sequence, concurrent fork/join, branching and loop while for iteration” (section 5, p. 13).

Steps from the paper:
1. draw use-case diagrams to identify actors and services (section 3, pp. 7–8)
2. write one scenario per use case and extract atomic activities `a1,…,an`; collect them in the set `AA` (section 3, p. 8)
3. build one activity diagram for each scenario using only those activities and the four predefined patterns (section 5, pp. 13–14)
4. allow nesting of patterns; require each pattern to have one entry and one exit activity (nesting: section 5, p. 13; entry/exit: section 6, pp. 15–16)
5. translate each activity diagram into a nested logical expression `WL` (section 6, p. 15)

Inference: The restriction to patterns is a deliberate abstraction: “It is assumed that only predefined patterns can be used for modeling of activity behavior.” (section 5, p. 13) The author states, “Such structuring is not a limitation when modeling arbitrarily complex sets of activities.” (section 5, p. 13), without proof. This assumes the chosen pattern library captures the requirements' control structure; the paper does not provide a completeness proof against arbitrary UML semantics.

Verus form (Inference): Encode each atomic activity as a state transition and each pattern as a Rust state-machine module. Sequential composition becomes a transition chain; concurrency needs explicit ownership or a Verus transition-system invariant; branches become mutually exclusive guards; loops need an invariant and `decreases`. Pattern composition can generate skeleton contracts, but the generated contracts still require review because activity names do not determine data invariants.

## technique 2: pattern-to-temporal-logic generation

Inference: Define each pattern once as a set of temporal formulas, then recursively substitute summaries for nested patterns. The paper explains that logical specifications are large and manual construction is “monotonous, error-prone and … difficult for inexperienced analysts” (section 6, pp. 14–15). Its generation process is three steps: “1. analysis of activity diagrams to extract all predefined workflow patterns, 2. translation of the extracted patterns to a logical expression WL, 3. generating a logical specification L from logical expressions.” (section 6, p. 15)

Steps from Algorithm 1 (section 6, p. 18):
1. initialise `L := ∅`
2. process every workflow pattern in `WL` from left to right
3. if all arguments are atomic, add the pattern's predefined formulas to `L`
4. if an argument is itself a pattern, compute its joined entry and exit formulas
5. substitute the disjunction of those entry and exit formulas wherever the nested argument occurs
6. add the substituted formulas to `L`

The paper's worked example is `Concur(a,b,c,d)`, which produces formulas including `a ⇒ ◇b ∧ ◇c`, `b ∧ c ⇒ ◇d`, and mutual-exclusion constraints such as `□¬(a ∧ d)` (section 6, p. 17). For nested `Branch(Seq(a,b),c,d,e)`, the paper substitutes `a ∨ b` for the nested argument and unions the resulting set with the formulas of `Seq(a,b)` (section 6, pp. 17–18).

Inference: Joined-entry (`w◮`) and joined-exit (`w◭`) formulas are found recursively by replacing a first or last nested argument with that nested workflow's corresponding summary (section 6, p. 17). The paper concludes, “Thus, the worst-case complexity is bounded above by quadratic function.” (section 6, p. 19) because joined-formula searches can scan to the expression's beginning or end; it says average time tends to linear. This is an informal argument; no runtime measurements, implementation, or input-size denominator are provided.

Verus form (Inference): A contract generator can perform the same AST pass: emit transition obligations for atomic activities, then summarize nested modules with entry/exit predicates. Generated Rust/Verus code should use `requires`, `ensures`, and explicit state predicates; temporal operators must become reachability or invariant lemmas. The pattern algorithm is transferable as syntax processing, but its temporal formulas are not executable Verus proofs.

## technique 3: semantic-tableaux deduction

Inference: Check a desired property `Q` by conjoining generated formulas and proving `C(L) ⇒ Q` indirectly. The proposed architecture has a Logical Specifications Generator `G`, specification `L`, property `Q`, and an ST Temporal Prover `T` (section 4, Fig. 5, pp. 10–12). The paper writes the prover input as `f1 ∧ … ∧ fn ⇒ Q` (section 4, p. 11).

Steps from the paper:
1. generate `L` with `G` and choose a property `Q` manually (section 4, p. 12)
2. form the conjunction `C(L)` of all generated formulas (section 4, p. 11)
3. negate the implication and place it at the root of a semantic tableau (section 4, p. 11)
4. decompose formulas using temporal-tableau rules and search every branch for contradiction (section 4, pp. 10–11)
5. if the tree is closed, the initial formula is true and the prover answers Yes; the paper says open branches of the tree give “information about the source of an error” (section 4, p. 10; section 7, p. 23)

The paper states, “When all branches of a tree have contradictions, it means that the inference tree is closed.” (section 4, p. 10) It also claims that reporting the source of an error through open branches is an advantage over the traditional axiomatic approach, and calls tableaux “global, goal-oriented and ‘backward’, while resolution is local and ‘forward’” (section 4, p. 10). The prover output is only Yes/No; the paper does not specify a certified kernel or report prover performance.

Verus form (Inference): A Verus proof can encode `Q` as a postcondition or state invariant and use lemmas to derive it from generated assumptions. Counterexamples would come from failed verification conditions rather than tableau open branches. A trusted tableau checker could be integrated as an external certificate producer, but the paper's soundness evidence does not establish that such a translation preserves Verus semantics.

## evidence from the insurance example

Inference: The paper instantiates two activity diagrams (`AD2`, `AD3`) for insurance damage liquidation and vehicle carriage. It generates `L2` and `L3`, then checks four properties: liveness `b ⇒ ◇g`, liveness `k ⇒ ◇h`, and safety `□¬(i ∧ g)` and `□¬(i ∧ l)` (section 7, pp. 21–22). The author states, “All branches of the semantic trees are closed, i.e. Formulas from 6 to 9 are satisfied in the considered requirements model.” (section 7, p. 23) The paper says, “Presentation of a full inference tree for both cases exceeds the size of the work.” (section 7, p. 23), so no tableau is shown for these properties, and no prover is named.

Inference: The denominator is four properties over two diagrams in one illustrative domain; there is no benchmark suite, error rate, or independent oracle. The paper says the method scales by summing specifications from more activity diagrams, but reports no measured scale. It also leaves implementation of the generation module and selection of a concrete prover as future work (section 8, p. 23).

## trust, assumptions, and VL relevance

Inference: The trusted elements are the engineer's use cases, scenarios, activity diagrams, predefined pattern formulas, the translation algorithm, and the tableau prover. The consistency and completeness discussion assumes the predefined pattern specifications are themselves consistent and complete, with “the logician is responsible for consistency of predefined specifications” (section 6, p. 19). The paper calls it an “open question” whether the algorithm preserves consistency, then gives informal arguments based on nesting and disjoint atomic activities rather than a proof (section 6, pp. 19–20).

Inference: Threat to agent-written verified Rust is moderate. The paper already supplies a requirements-to-property pipeline and a reusable recursive generation algorithm; VL should not redo these ideas as a new contribution. The product risk is semantic drift: an automatically generated contract can be internally valid while the UML model or pattern formula omits a requirement. A VL integration would need traceability from each generated obligation to its source activity and human review of `Q`.

## techniques for the catalog

- requirements decomposition: derive atomic activities from use-case scenarios and structure activity diagrams with sequence, concurrency, branch, and loop patterns
- recursive temporal-spec generation: translate nested pattern expressions into formula sets using joined entry and exit summaries
- tableau property checking: negate `C(L)⇒Q`, decompose the temporal tableau, and accept only when every branch closes
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The proposed algorithm for automatic extraction of logical specifications is based on the assumption that all workflows for activity diagrams are built using only well-known workflow patterns"): read the whole paper text (pages 1-23 plus references) and the whole study; checked every quotation, section and page reference (page numbers are PDF page numbers, 1-23 of the arXiv v1 file), the six methodology steps, Algorithm 1 steps, the tableau steps, the example properties and the author, year and arXiv link; changed page numbers throughout (they were wrong), the claim that open branches beat forward resolution (the paper compares with the axiomatic approach), the open-branch step (it said counterevidence), the claim that consistency is treated as unresolved (the paper gives informal arguments), and added that no tableau or prover is shown for the example; did not check the cited external works, the Verus-form inferences (my own, not from the paper), or the figures beyond their text labels.
