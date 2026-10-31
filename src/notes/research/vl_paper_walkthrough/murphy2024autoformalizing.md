# Autoformalizing Euclidean Geometry
(authored by agents unless marked 🧑)
Tag: `murphy2024autoformalizing`, [paper](https://arxiv.org/abs/2405.17216)

## problem and system

Murphy et al. study translating informal Euclidean theorem statements and proofs into Lean. Diagrams supply unstated reasoning that a formal proof must handle. Their approach combines a language model, a Lean implementation of the formal system E, and an SMT-based symbolic reasoning engine. The engine supports both implicit diagrammatic reasoning and semantic evaluation of generated theorem statements. The authors explain: “The key insight is that equivalence checking can be made feasible in specific domains (such as Euclidean geometry) by combining domain knowledge with automated reasoning tools, such as satisfiability modulo theories (SMT) solvers (Barrett & Tinelli, 2018).” (Section 1, p. 1.)

LeanEuclid contains 173 manually formalized theorems and proofs: all 48 propositions from Elements Book I and 125 UniGeo problems, with 25 randomly selected from each of five categories. Each example includes an informal theorem, proof, and diagram in LaTeX, plus a formal theorem and proof in Lean. For UniGeo, the authors manually add diagrammatic details missing from the textual questions (sections 1 and 3.4, pp. 2 and 6).

E has points, lines, circles, segments, angles, and triangles. Construction rules introduce objects; non-construction reasoning derives properties of existing objects. The trust limitation is explicit: “Our symbolic reasoning engine (Sec. 3.3) relies on SMT solvers, whose results currently cannot be fully certified by Lean.” (Section 3.1, p. 4, footnote 1.)

## technique 1: semantic equivalence evaluation

E3, the Euclidean Equivalence Engine, compares a predicted theorem Tpred with a reference Tgt. The authors write: “E3 performs a separate satisfiability check for each direction, each of which can succeed or fail.” They also state: “As such, E3 also performs a separate check to see whether a contradiction can be found in Tpred.” This additional check concerns the prediction, not a separate satisfiability test of each theorem (section 4.1, p. 6).

How to apply the reported procedure:

1. Express both statements in E and attempt to prove `Tpred ⇒ Tgt` and `Tgt ⇒ Tpred` using SMT. Check Tpred separately for a contradiction.
2. If equivalence is unproved, record which implication, if either, was proved. Failure to prove an implication does not itself establish a counterexample.
3. For approximate comparison, require matching quantities and types of bound variables. Rank candidate variable correspondences by a string similarity heuristic and examine the best n.
4. For each correspondence, try to prove each prediction precondition from the reference preconditions, and each reference precondition from the prediction preconditions. Compare postconditions in both directions likewise. Include the preconditions as assumptions for the postcondition checks only if the preconditions were proved equivalent.
5. Record the number of resolved obligations for each correspondence. This measures partial agreement rather than proving whole-statement equivalence (section 4.1, p. 6; Appendix E.5, pp. 38–39).

The engine normally uses non-construction reasoning. For equivalence checking it additionally has nine simple construction rules, listed in Appendix A (p. 18). Approximate checking cannot assess every rejected prediction: for GPT-4's 5-shot Elements results, only 10 of 36 rejected predictions had the required bound variables. Beyond seven predictions proved equivalent, five resolved more than 90% of the clause obligations (section 5.1, p. 7).

Evidence. Table 1 reports 18.9% proved theorem equivalence for GPT-4 and 21.0% for GPT-4V with 5-shot prompts. A separate manual evaluation examined 86 Elements formalizations from the two models' 5-shot outputs. Humans accepted all 16 E3 successes and three of its 70 failures, giving the paper's estimated false negative rate of 15.8%. This was a check of logical equivalence results, not a validation of the approximate score. The authors also identify one semantically equivalent prediction that was unfaithful to the source wording (section 5.1, p. 7; Appendix E.3, pp. 37–38).

Inference: specification evaluation should distinguish semantic equivalence from fidelity to the requested statement. For a Verus workflow, a corresponding experiment would compare generated and reference predicates by implications in a shared theory, retain unresolved obligations, and check a sample manually. The paper does not implement or evaluate this transfer.

## technique 2: symbolic completion of diagrammatic gaps

The `euclid_apply` tactic applies an axiom or existing theorem forward. The proof author supplies its objects explicitly. If a required premise is missing, the tactic invokes the symbolic engine; if the premise is proved, the tactic introduces the rule's conclusions and any constructed objects. Otherwise it fails (section 3.2, p. 5).

How to apply. Encode the existing objects and relations, and have the model generate tactics for explicit textual steps. For a missing premise, send the engine all non-construction rules in E, the current objects and relations, and the negation of the premise. The engine proves the premise by refutation: “The target conclusion is successfully proved if the solver returns UNSAT (not satisfiable).” (Section 3.3, p. 6.) The tactic continues with that result; the paper does not describe inserting a separately generated Lean proof and rerunning Lean.

Diagrammatic automation has diagrammatic, metric, and transfer rules, together with SMT's built-in theories. It cannot introduce auxiliary objects through construction rules. Those constructions remain explicit proof steps. For Proposition 1, the author explicitly constructs two circles; the engine establishes their intersection relation so that an explicit intersection construction can introduce a point (sections 3.2–3.3, p. 5; Appendix A, p. 18).

The authors manually formalized all 48 Elements propositions using this approach. This is separate from the models' much lower proof success rates. Inference: completion depends on the supplied axioms and SMT implementation; it should not be described as fully certified by Lean given footnote 1. A Verus adaptation could propose missing facts and require proofs of those facts, but that would be an additional design, not a demonstrated result here.

## technique 3: few-shot proof generation and manual repair

The proof prompt supplies an informal proposition and proof, a formal proposition, tactic instructions, and available axioms and helper theorems. For Elements, helper theorems include earlier propositions and their variants. Five fixed proof demonstrations are Propositions 2, 6, 12, 32, and 42. UniGeo uses randomly selected demonstrations from a separate set (section 4.2, pp. 6–7; Appendix D.2–D.3, pp. 25 and 31).

The experiment generates an entire proof from one query and checks it as-is. It tests 43 Elements proofs and 100 UniGeo proofs. Table 2 reports UniGeo success rates of 25% for GPT-4 and 31% for GPT-4V with five demonstrations; UniGeo zero-shot prompts produced no accepted proofs. Both models successfully formalized only Elements Propositions 1 and 17. Across the 143 evaluated proofs, the reported combined success rates are 18.8% and 23.1%, respectively (section 5.2, p. 8).

The authors manually repair incorrect Elements proofs with as few changes as possible: fix invalid tactics, add missing tactics, remove irreparable tactics, and leave unnecessary valid tactics unchanged. Median Levenshtein similarity between generated and repaired Elements proofs is 61.7% for GPT-4 and 64.0% for GPT-4V. These are not UniGeo repair measurements. Section 5.2 specifies 41 failed Elements proofs per model; Appendix F.1 instead says 43 remaining proofs, an internal count inconsistency (p. 8 and p. 39).

Inference: the repair examples suggest testing argument correction and theorem-variant selection as repair operations. Text similarity measures editing distance, not correctness or human time. A generate–check–repair workflow for Verus is a proposed application; this paper evaluates standalone generation followed by manual repair, not an iterative model repair system.

## techniques for the catalog

- theorem equivalence evaluation: prove both implications, check the prediction for contradictions, and distinguish semantic equivalence from source fidelity
- approximate statement comparison: rank variable correspondences and count resolved precondition and postcondition obligations
- implicit premise completion: use restricted symbolic reasoning while keeping object constructions explicit
- proof repair measurement: report as-is acceptance separately from similarity to manually repaired Elements proofs
