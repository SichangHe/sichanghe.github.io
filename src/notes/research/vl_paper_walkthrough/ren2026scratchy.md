# Scratchy: Visual-Scratchpad Multimodal Reasoning for Cryptographic Proof Generation in EasyCrypt
(authored by agents unless marked 🧑)
Tag: `ren2026scratchy`, [paper](https://doi.org/10.48550/arxiv.2609.06226)

source: Ren, Li and Zhang, arXiv:2609.06226v1 (5 Sep 2026), 12 pages including Appendix A. Page numbers are PDF pages.

## the claim in one paragraph

EasyCrypt is a proof assistant for cryptographic security proofs: the user writes probabilistic programs ("games"), states judgments about one program or about a pair of programs, and proves them with tactics. The paper asks whether a multimodal LLM writes more accepted EasyCrypt proof bodies when the facts, obligations, rules and goal of the proof are drawn as a typed, directed graph and given as an image. On 64 proof-hole tasks times four models, the full graph condition (PG) gets 54/256 proofs accepted by EasyCrypt, against 24/256 for a graph with shuffled edges and 11/256 for the strongest text condition (Table 3, p.8). The graph is not produced by the LLM: it is compiled from a hand-structured proof sketch that already names the tactic route. That is the main caveat, developed under technique 1.

Abbreviations the paper uses for its six input conditions (Table 3 caption, p.8): NR no relation knowledge, TH theorem-only text, CR coarse proof-relation text, GD generic diagram, SG shuffled-edge graph, PG professional graph.

## technique 1: the structured natural-language proof sketch (SNPS)

What it is: a proof plan written into six fixed fields, so that a program without an LLM can turn it into a graph. §4.1, p.5: “The SNPS contains six fields, including T HREAT M ODEL, P ROGRAM FACTS, P ROOF O BLIGATIONS, P ROOF RULES, S ECU - RITY G OAL , and R ELATIONS .” The first five declare objects; the sixth declares directed dependencies with source, target and meaning.

When to use: a proof whose difficulty is coordination, where the needed definitions, assumptions and intermediate claims are all in the context but spread over several declarations, and the order and direction of use matter.

Steps (§4.1, p.5):

1. Gather the inputs: security setting, task description, local EasyCrypt corpus, formal environment, target obligation.
2. Write the threat model: the security consequence the proof addresses.
3. List program facts: declarations and assumptions available as evidence, copied with their identifiers.
4. List proof obligations: the intermediate claims.
5. List proof rules: the permitted transformations.
6. State the security goal: the target obligation itself.
7. List relations: for each dependency, its source, target and meaning.
8. Copy every identifier and formula exactly from the corpus, environment or target; the paper requires they be written as they occur there (§4.1, p.5).

The paper's example (Figure 4, p.6) for the target `equiv PIR_secure1: PIR.main ~ PIR.main : true ==> ={PIR.s}` has a fact node holding that declaration, an obligation node, a goal node, and a rule node whose text is “Follow proc then inline then wp then while then auto; reuse the visible symbols PIR.s.” The official proof of that target is `proc; inline *; wp. while (={j, PIR.s}); auto.` (Listing 1, p.6).

Who writes the SNPS: not in the paper. It is listed as an input (§4.1), the two compilers are deterministic, and §4.4 (p.7) limits the LLM to the last step. The conclusion lists “refine SNPS authoring” as future work (p.9). Inference: in the evaluation the sketches were written by the authors with the official proofs available, since the Figure 4 rule node reproduces the official tactic order; so PG measures proof completion from a near-complete plan, not proof discovery.

Verus form. Inference: the paper is not about Verus. A Verus proof sketch with the same fields would be: program facts = the function's `requires` clauses, the `ensures` of callees, and the `open spec fn` definitions in scope; proof obligations = the failing `ensures`, `invariant` or `assert` reported by Verus, plus intermediate `assert`s planned; proof rules = the `proof fn` lemmas to call, `reveal` of an `opaque` function, `assert ... by (nonlinear_arith)` or `by (bit_vector)`, and `assert forall ... by` with a chosen `#[trigger]`; goal = the function's `ensures`; relations = which fact feeds which obligation through which rule. What changes: Verus has no tactic sequence, so a route is an ordered list of proof statements, not of tactics. What does not carry over: the threat-model field has no Verus counterpart unless the specification is a security property.

Evidence: only as part of PG; no condition isolates the SNPS as text (see the part on what the ablation does not separate).

Assumes: a correct plan exists before generation. A wrong SNPS is compiled faithfully into a wrong picture.

## technique 2: deterministic compilation of the sketch into a typed relation graph

What it is: a parser from SNPS to G = (V, E, τ, λ): nodes, directed edges, a type per node, a label per node.

Steps (Algorithm 1 and §4.2, p.5):

1. Parse the six ordered fields.
2. For each declared proof object add a node; its field fixes its type τ; its label λ keeps the prose description, the EasyCrypt identifier and the formula.
3. For each entry of the relations field add one directed edge.
4. Order dependency paths toward the target obligation.
5. Return the graph.

Two rules make the graph trustworthy as a rendering of the sketch. No inference: “The compiler consequently performs parsing, matching, and normalization without inferring relations absent from the SNPS.” (§4.2, p.5). Fixed edge direction: “Edges point from a justification to the claim it supports.” (§4.2, p.6).

Verus form. Inference: the same graph can be built without any sketch for part of its content, because Verus source already gives typed objects: `spec fn`, `proof fn`, `requires`, `ensures`, `invariant`, and the call graph between them. Only the route (which lemma for which obligation) needs an author.

Limit: step 4 is one line in the algorithm; how paths are ordered when several reach the target is not in the paper.

## technique 3: structure-preserving rendering, with layouts for relational and game-hopping proofs

What it is: a renderer R from graph to image whose invariant is stated in §4.3, p.6: “Structure preservation means that node roles, semantic labels, edge directions, and the path to ϕ remain directly readable in the output.”

Steps (Algorithm 2 and §4.3, p.6):

1. Arrange nodes by role.
2. Render each node's text, formula and code as a card; colour and icon encode the type.
3. For each edge draw tail marker, arrowhead and relation label.
4. Highlight the dependency paths that end at the target.
5. For a relational proof (two programs proved equivalent) place the left and right games side by side and connect aligned state values, with a transition cue, at corresponding program points; put the relational invariant next to the state correspondence it constrains.
6. For a game-based proof order the games along the reduction and show the bound of each hop next to that hop, where the distance of a hop is the absolute difference of the two games' probabilities of outputting 1 (equation 5, p.6).

Verus form. Inference: steps 5 and 6 are cryptographic layouts with no direct Verus use. Steps 1–4 apply to any failing Verus function: cards for the preconditions, the loop invariants, the failing clause and the candidate lemmas, with arrows for intended use. Whether an image helps a model on Verus is untested here.

Evidence for the claim that edges matter and not just a picture: PG 54/256 against SG 24/256 (shuffled edges) and GD 19/256 (generic diagram), pooled over Claude Opus 5, Gemini 3.7 Flash, GPT-5.6-Sol and Kimi K3 (Table 3, p.8). The paired comparison (Table 4, p.8) over the 256 model–task pairs: PG against SG wins 39, loses 9, ties 208, gain +11.7 percentage points, 95% interval [3.5, 19.8]; PG against CR wins 53, loses 10, ties 193, gain +16.8 points, interval [8.8, 24.6].

Limit: SG (24) beats GD (19), so a graph with wrong edges is not worse than a generic diagram; and for Claude Opus 5 both image controls score 1/64, below coarse text at 5/64 (Table 3). Inference: a picture is not a free gain; for at least one model a non-faithful image hurt.

## technique 4: fragment synthesis, reinsertion and checking

What it is: the model returns only the proof body; the system puts it back where the official proof was and runs EasyCrypt.

Steps (§4.4, p.6–7):

1. Give the multimodal model the task, local corpus, target, SNPS text and the image (equation 6).
2. The model follows the route in four phases. §4.4, p.6: “The graph route organizes generation into program unfolding, state alignment, rule application, and goal discharge.”
3. Insert the returned fragment at the original location of the proof.
4. EasyCrypt parses and type-checks the reconstructed file, discharges obligations, and closes the target; the outcome is accept or reject.
5. On reject, the open proof state returns to reconstruction (§4.4, p.7).

Step 5 was not exercised in the evaluation: §5.2, p.7 states “Each model produces one response for every task under six paired representation conditions.” and the conclusion defers verifier-feedback repair to future work.

Verus form. Inference: the equivalent contract is to ask for the body of one `proof fn`, or the `proof { }` block and loop `invariant`s of one executable function, and splice it into the unchanged file before running Verus. Reinsertion by the harness, not by the model, guarantees the signature, `requires` and `ensures` stay as given, which the Ada/SPARK study in this batch shows is otherwise left to the prompt.

## technique 5: relational loop invariant as the decisive step (the paper's worked contrast)

What it is: when two loops are proved equivalent, the proof must state which variables stay equal across iterations; automation alone does not find it.

The example (§6.1 and Listing 2, p.8–9), for the PIR target, same model GPT-5.6-Sol:

- official, accepted: `proc; inline *; wp. while (={j,PIR.s}); auto.`
- with PG, accepted: `proc; inline *; wp; while (={j} /\ ={PIR.s}). wp; rnd; skip; auto. auto.`
- with CR, rejected: `by proc; inline *; wp; auto.`

The paper's diagnosis (§6.1, p.8): “The rejected output invokes autoimmediately and never states what must remain synchronized across iterations.” The run-together word is the paper's.

Steps, read off the accepted fragments: expose both procedures (`proc`), unfold calls (`inline *`), push the postcondition backward (`wp`), apply the two-program loop rule with an invariant equating the loop counter and the tracked state, handle the random sampling in the body with `rnd`, close the rest with `auto`.

Verus form. Inference: Verus has no two-program judgment. The same fact is proved by giving each program a `spec fn` model and proving the outputs equal in a `proof fn` by induction with a `decreases` clause, or, for one executable loop, by an `invariant` that relates the exec state to a ghost copy. What carries over is the lesson, not the tactic: the model must be told, or must derive, the synchronized-state invariant before any solver call can succeed.

## technique 6: proof-hole benchmark from an official corpus, with fixture preflight

What it is: Scratchy-eval, 114 tasks from 26 source groups and 37 official files of 13,761 lines; 64 generation tasks (55 lemmas, 7 equivalence judgments, 2 expectation-Hoare judgments) and 50 multiple-choice tasks (§5.1, p.7).

Steps (§5.1, p.7; §5.2, p.7; Appendix A.1, p.11):

1. Pin a snapshot of the official repository.
2. Select a declaration; keep its imports, definitions and dependency prefix; replace only its proof body with a hole. §5.1, p.7: “Each generation fixture preserves the imports and dependency prefix of an official target but replaces its proof.”
3. Keep the official proof hidden from the model, for preflight and analysis only (A.1, p.11).
4. Build static-validity items: an official statement plus syntactically defective alternatives; build semantic items asking the formal role of a construct.
5. Before any model call, compile every fixture. §5.2, p.7: “Before any model call, 164 fixtures are dynamically checked: the 64 hidden reference proofs and four isolated options for each of the 25 static-validity tasks.” (64 + 4 × 25 = 164.)
6. Score generation by acceptance, not by text match. §5.1, p.7: “Exact agreement with the official fragment is only diagnostic because several valid proofs may establish the same target.”

Verus form. Inference: take verified Verus crates, blank one `proof fn` body or one function's proof annotations, keep the rest of the crate, and first confirm that the original verifies and that the blanked file fails. Step 5 for answer options means running Verus on each option alone, so that a multiple-choice key is machine-confirmed.

Evidence that step 6 matters (§5.3, p.7): “Among the 54 compiling PG outputs, only 10 exactly match the official fragment.” The other 44 are different accepted proofs.

Limits: the multiple-choice half does not discriminate; pooled accuracy is 194/200 to 199/200 in every condition (Table 3), so the Overall row (253/456 for PG against 199/456 for NR) is mostly a constant. The official EasyCrypt files are public, and the paper reports no contamination control. Appendix A.2 (p.11–12) itself calls the set a focused benchmark and not a census.

## technique 7: paired six-way representation ablation

What it is: an experimental design that holds model, task, response contract and output budget fixed and varies only how proof relations are shown.

Steps (§5.2 and §5.1, p.7):

1. Define controls on both sides of the claim: three text conditions (NR, TH, CR), a generic diagram (image present, no task relations), a shuffled-edge graph (same nodes, wrong structure), and the full graph.
2. Run every model once on every task under every condition: 114 × 6 = 684 units per model, 2,736 in total.
3. Rotate the order of conditions deterministically by task.
4. Report passed/total per model and pooled, then paired wins, losses and ties per model–task pair.
5. Compute confidence intervals by bootstrap over the 26 source groups, not over tasks, because tasks from one source share dependencies.
6. Count successes unique to the full condition. §5.4, p.8: “Moreover, 36 of the 54 PG successes are not reproduced by any of the five ablations for the same model and target.” The rest: 14 shared with a visual control, 2 with a text condition, 2 with both (36 + 14 + 2 + 2 = 54).

Verus form. Inference: this design transfers unchanged to any VL question about whether giving the agent some input X helps: add a control that has X's form but wrong content, pair by model and task, and resample by crate.

### what the ablation does not separate

§5.2, p.7: “The complete condition receives the local source, task-specific professional graph, and EasyCrypt decoding card; the other conditions remove source details, proof paths, identifiers, or edge structure to test which parts of the visual proof state contribute to generation.” So PG differs from each control in several things at once, and the content of the decoding card is not in the paper. No condition gives the full SNPS, with its route and identifiers, as text without the image. Inference: the data show that the full package beats degraded packages; they do not show that the image, as opposed to the route information in it, causes the gain.

## results by proof kind, and failure classes

By judgment type, PG / SG / CR, pooled over four models (§5.4, p.8): lemmas 49/220, 23/220, 10/220; relational equivalence 5/28, 1/28, 1/28; expectation-Hoare 0/8 in all, in the paper's words “None of the eight model–task pairs formed by the two ehoare targets compiles under any condition.”

By source family (Figure 5, p.7, percentages only; denominators computed here from Table 5's task counts times four models): PG reaches 33.3% on complex cryptography (12/36), 21.4% on reduction paths (6/28), 22.8% on extended cryptography (21/92); SG leads on foundations (12.5% against PG's 10.0%, of 40) and program analysis (25.0% against 20.8%, of 24).

Failure classes among failed PG units (§5.5, p.8): parse errors 30, rewrites that find nothing to rewrite 30, incomplete proofs 19, `by` blocks that cannot close their goal 11; together 90, which the paper gives as 44.6% (90/202, where 202 = 256 − 54). The paper's conclusion from this: “The remaining bottleneck is therefore often the local instantiation of the proof route in exact EasyCrypt syntax.” Inference: with the plan supplied, about four in five attempts still fail, and at least 30 of 202 fail before any logic is checked; for a low-resource proof language the syntax gap dominates even a correct plan. Verus is closer to Rust than EasyCrypt is to anything in training data, so this share should be smaller there, but it is the same class of failure as invented lemma names and wrong `vstd` paths.

## what is proved and what stays trusted

- Proved, per accepted output: EasyCrypt accepts the reconstructed file with the official statement unchanged.
- Trusted: EasyCrypt and the SMT solvers its `smt()` tactic calls; the official statements and axioms (Listing 3, p.11, has two `axiom` declarations in the task context).
- Not checked: that the SNPS is a correct plan. This is harmless for soundness because the checker decides, but it is where the human effort sits.

## contradictions and numbers that do not line up

- Arithmetic in Tables 3, 4 and 5 is consistent: column sums, 54/256 = 21.1%, the 2.25× and 4.91× ratios, 114 × 6 × 4 = 2,736, and the family counts summing to 64 all check.
- The preliminary study (§3, p.4; Figure 1, p.1) on ten tasks and four hosted models gives PG 25/40, shuffled graph 20/40, generic diagram 19/40, and for text: no relation 11/40, coarse relation 8/40, theorem text 6/40. There the best text condition is the one with no relation information, and shuffling edges costs 5 of 40. On the full benchmark the order of the text conditions reverses (NR 5, TH 9, CR 11 of 256) and absolute rates fall from 62.5% to 21.1%. Inference: the ten preliminary tasks were much easier or more tuned than the benchmark, and the preliminary study alone would not support the fidelity claim.
- Claude Opus 5 is the best model in the preliminary study (7/10 under PG, Figure 2(a), p.4) and the worst on the benchmark (9/64).
- The contribution list (p.3) names “an EasyCrypt verification loop”, while every reported number is single-shot.
- The local-model diagnostic (§3, p.4) says expert-utilization differences stay positive across 30 layers of Gemma-4-26B-A4B, comparing a reference profile with a comparison profile that the text does not define; it is offered as a sign that the image is used, not as a causal result, and nothing later depends on it.
- The abstract calls the 64 tasks security-form proof generations; §1 and §5.1 call them free-form.

## what VL should not redo

Inference: the benchmark recipe (proof holes with preflight, acceptance scoring, source-group bootstrap) and the control design (a wrong-structure control beside a no-structure control) are complete and reusable. The open question the paper leaves, and the one worth a VL experiment, is the missing condition: the same route and identifiers as plain text.

## threat to a product of agent-written verified Rust

Inference: negligible as a competitor. It targets EasyCrypt security proofs, depends on a human-structured plan per task, has no repair loop, and reaches 21.1% with frontier models. It is useful as evidence for one design choice: agents do better when the dependency route from available facts to the goal is made explicit before they write proof text.

## techniques for the catalog

- six-field proof sketch — write facts, obligations, rules, goal and directed relations in fixed fields with identifiers copied verbatim, before any proof text is generated
- no-inference sketch-to-graph compiler — turn each sketch item into a typed node and each stated relation into a justification-to-claim edge, adding nothing
- structure-preserving proof-state image — render the graph so roles, formulas, edge directions and the path to the goal stay readable; left and right programs side by side for relational goals, games in hop order with bounds for reductions
- fragment-only generation with harness reinsertion — the model returns the proof body, the harness splices it into the unchanged file and the checker decides
- synchronized-state invariant first — for two-loop equivalence, state which variables stay equal across iterations before calling automation
- proof-hole benchmark with preflight — blank one proof in a pinned official file, keep its dependency prefix, and compile every reference proof and answer option before any model call
- acceptance over exact match — score by checker verdict; here 44 of 54 accepted proofs differed from the reference
- wrong-structure control — ablate with a shuffled-edge graph and a generic diagram so that structure fidelity is separated from image presence
- source-group bootstrap — resample by source project, not by task, when tasks share dependencies
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
