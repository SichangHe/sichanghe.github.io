# Stellar Colosseum: A Many-Agent Harness for Long-Horizon Research in Mathematics and Theoretical Computer Science
(authored by agents unless marked 🧑)
Tag: `lindeng2026stellar`, [paper](http://arxiv.org/abs/2609.15983v2)

## scope and evidence

Stellar Colosseum is a model-agnostic orchestration harness for long research tasks. Its abstract states that it “uses a readiness gate to decide when a route is mature enough to decompose” and “routes verifier findings back to the affected part of the argument” (Abstract, p. 1). The workflow separates strategy exploration, readiness, proof decomposition, local subproblem solving, and global verification (section 3.1, p. 5). It does not provide a formal proof kernel: its graders and model critiques remain trusted.

On TCS-Bench, the benchmark has 300 theorem-proving tasks from FOCS, STOC, and SODA papers (section 6, p. 13). The reported cross-model selection solved 213/300 tasks, 71.0%; the table also reports 54.0% (Gemini 3.1 Pro Colosseum), 55.0% (Gemini 3.7 Flash Colosseum), and 77.3% oracle best-of-two, which is an upper bound (Table 2, p. 13). In competitive programming, execution feedback raised accepted solutions from 213/222 to 218/222 and performance rating from 3918 to 4263 (Table 5, p. 14). These are grader- and benchmark-specific measurements.

## technique 1: strategy exploration and readiness gate

What it is. The system first generates alternative proof routes, reformulations, intermediate claims, and links to known results. A readiness gate decides whether uncertainty is localized enough to build a proof plan. A route passes when its central mechanism is stable, unresolved claims can be assigned to sections, and no unresolved bridge is likely to change the target or architecture (section 4.2.1, p. 8).

How to apply it.

1. Ask parallel agents for typed strategy proposals. Each proposal states its mechanism, required lemmas, expected bottleneck, and a falsifiable test (section 4.1.1, p. 6).
2. Attack every proposal with counterexamples, boundary cases, invalid implications, circularity, theorem misuse, and missing assumptions (section 4.1.2, pp. 6–7).
3. Preserve objections with their candidate; a clean record can mean weak tests, while a precise objection enables repair (section 4.1.2, p. 7).
4. Pass a route only when remaining uncertainty is section-local and its key statement, role, and expected proof path are explicit (section 4.2.1, p. 8). Otherwise continue exploration.

Verus form. Inference: treat each strategy as a ghost record containing a proposed contract, assumptions, candidate lemmas, and known counterexamples. A readiness gate can be an external script that requires every unresolved claim to have a named Verus proof obligation. Verus can check the resulting contracts and lemmas, but cannot decide that a natural-language route is “mature”; that judgment and candidate diversity stay outside the verifier.

Evidence and limits. The paper's open-ended research examples use tree configurations with “slightly over 100 leaf nodes” for exploration (section 4.4, p. 9), but the paper does not give a universal cost or optimal gate threshold. Inference: a VL pipeline should measure whether the gate reduces wasted Verus proof attempts, rather than assume that more strategies improve correctness.

## technique 2: sectioned dependency graph and local retries

What it is. The decomposer converts a selected route into numbered sections and a directed acyclic graph (DAG). Each node is a mathematical subproblem; edges list completed sections it may use. Independent nodes run in parallel. A local reviewer checks each section against its assigned task and dependencies; a failed section is retried without restarting unaffected work (sections 4.2.2–4.2.3, pp. 8–9).

How to apply it.

1. Write a numbered proof skeleton and one precise subproblem per section.
2. Add an edge for every prerequisite result; document order controls exposition, while the DAG controls work order (section 4.2.2, p. 8).
3. Solve eligible nodes in parallel, passing only relevant completed sections to each solver.
4. Run a local review before committing a section. If incomplete or defective, rerun that node with the failed section and review attached; retain completed nodes (section 4.2.2, p. 8).
5. Replace placeholders with accepted bodies and submit the assembled proof to global review.

Verus form. Inference: map each DAG node to a Verus module or `proof fn` whose `requires` list names predecessor postconditions and whose `ensures` gives the node result. Keep executable Rust unchanged while iterating on proof functions and lemmas. Local retry means editing one lemma/module and rerunning Verus; the DAG itself is orchestration metadata, not a Verus construct. Cycles must be rejected before proof generation because Verus contracts cannot justify circular dependencies.

Evidence and limits. The paper reports that independent sections are solved in parallel and that rejected proofs return to revision or re-exploration (section 3.1, p. 5). It gives no ablation isolating local retry from the other stages. Inference: VL should record repair time and unaffected-node reuse to test whether section-level retries reduce proof maintenance effort.

## technique 3: targeted falsification with overlapping tree aggregation

What it is. At each difficult stage, many candidates are generated, each is adversarially reviewed, and candidate–critique bundles are synthesized through overlapping random subsets. If `C^(ℓ)` has `mℓ` candidates, each next-level node samples `kℓ` distinct inputs uniformly; groups overlap, so a candidate gets multiple chances to contribute (section 4.1.3, pp. 7–8). Aggregation is constructive: it may merge compatible components, retain competing branches, repair a local flaw, or keep an unresolved conflict. It is not a vote.

How to apply it.

1. Choose stage-specific schemas (strategy, skeleton, section, verifier finding, or revision) and generate a population with varied prompts, temperatures, tools, and attack lines (section 4.1.1, p. 6).
2. Attach falsification records covering “counterexamples and boundary cases” and “misuse of a theorem, computation, or external reference” (section 4.1.2, pp. 6–7).
3. Configure widths `(m0,…,mL)` and sample sizes `kℓ`; sample without replacement within a group, independently across groups (section 4.1.3, p. 7).
4. Have each aggregator merge or repair arguments while carrying objections forward. The root returns a candidate and unresolved objections (section 4.1.3, p. 8).

Verus form. Inference: generate alternative contracts or lemma proofs, then have reviewers search for counterexamples with bounded test harnesses or failed Verus obligations. Tree aggregation can select a proof artifact whose contracts compile, but the aggregation policy itself is unverified. Use explicit `assert` and proved lemmas to preserve only compatible mathematical claims; do not treat a majority of model outputs as evidence.

Evidence and limits. The paper says that “failure to find a defect does not establish correctness” (section 4.1.2, p. 7). Thus the falsification stage improves defect discovery but leaves residual hallucination risk. Inference: for VL, only successful Verus verification can turn a candidate into evidence; model agreement is at most a prioritization signal.

## technique 4: global verification and localized feedback

What it is. A global verifier rereads the original problem and assembled proof, with local reviews as audit context. It checks wrong assumptions, notation drift, omitted cases, and mismatch with the target. Each defect is tied to the section or claim where it arises; cross-section dependency errors identify both the supporting and using sections (section 4.2.3, p. 9).

How to apply it.

1. Submit the full assembled proof plus local review records.
2. Run multiple independent global reviews and aggregate them with the same tree mechanism; retain concrete objections rather than averaging them away (section 4.2.3, p. 9).
3. If rejected and the strategy remains viable, replace affected sections or modify the outline, then reassemble and verify. If the central strategy fails, return to exploration (section 4.2.3, p. 9).
4. Carry the rejected draft and feedback into the next round; retaining a draft does not endorse its claims (section 4.3.1, p. 9).

Verus form. Inference: run `cargo verus` on the complete Rust crate after local lemma checks, and map compiler diagnostics to the module or proof function that owns the obligation. A global review can detect specification drift between modules, but only Verus establishes the encoded contracts. The revision loop must avoid weakening `requires` or `ensures` merely to make the build pass.

Evidence and limits. On TCS-Bench, cross-model critique selection achieved 213/300 (71.0%), while the oracle best-of-two was 232/300 (77.3%) and is explicitly unachievable as a selector (Table 2, p. 13). The grader is reference-assisted and optimized on 100 expert-labelled proofs, so it is a trusted measurement component rather than an independent formal checker (section 6, p. 13).

## technique 5: shared knowledge directory and execution probe

The knowledge curator records reusable theorems and lemmas with hypotheses, failed approaches and failure points, references with needed statements, and observations with evidence (section 4.3.2, p. 9). Entries retain source and caveats, allowing later agents to avoid repeating failed routes. Inference: in VL, store verified lemma names, exact contracts, failed proof obligations, and dependency versions; require a Verus compile result before labelling an entry “verified.” A text directory alone remains trusted memory.

For programs, the same DAG ends in an implementation node. The execution probe compiles and runs candidate C++ on public samples and generated stress inputs, returning checker outcomes and resource measurements to the revision loop; hidden tests remain inaccessible (section 7, p. 14). Inference: the analogous VL probe is Verus verification plus runtime tests for executable behavior. Runtime tests cannot establish properties outside tested inputs, and Verus cannot establish requirements omitted from contracts.

## what is proved, measured, and trusted

Measured results are benchmark scores and acceptance counts, not formal soundness. The paper's own conclusion calls Colosseum a “model-agnostic many-agent harness” (section 8, p. 14). Trusted components include the language models, prompts, strategy gate, falsification quality, tree aggregation, benchmark grader, source references, and correctness of specifications. The paper does not prove that a selected proof is mathematically valid; it reports grader outcomes and case studies.

Inference: the threat to agent-written verified Rust is medium to high if Colosseum outputs are treated as proof evidence before Verus checking. Its decomposition, localized retries, and defect routing can reduce engineering search cost. They do not close specification gaps, external-library assumptions, unsafe code boundaries, or solver trust. VL should reuse the DAG and feedback architecture, while making Verus compilation the acceptance gate and retaining every unresolved objection.

## techniques for the catalog

- readiness-gated strategy exploration — generate and falsify routes until uncertainty is localized enough for a stable proof plan
- dependency-graph proof construction — solve section subproblems in DAG order and retry only failed sections
- overlapping adversarial aggregation — sample candidate–critique bundles through a tree that carries objections and competing branches
- localized global verification — map defects to affected sections, revise or re-explore, and reverify the whole artifact
- persistent research memory — retain drafts, caveats, failed approaches, references, and evidence for later rounds
- execution feedback loop — compile and run implementations, then feed checker and resource results into local revision

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
