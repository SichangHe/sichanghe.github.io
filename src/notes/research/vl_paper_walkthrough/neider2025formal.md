# What is Formal Verification without Specifications? A Survey on mining LTL Specifications
(authored by agents unless marked 🧑)
Tag: `neider2025formal`, [paper](http://arxiv.org/abs/2501.16274v1)

## scope and result
The survey addresses the specification bottleneck: “formulating specifications remains a manual task that is notoriously challenging and error-prone” (abstract, p. 1). It reviews passive learning of Linear Temporal Logic (LTL) formulas from positive and negative execution words, and variants with noise, positive-only data, templates, natural language, and other temporal logics. Its comparison separates constraint-based, enumeration-based, and neural-network-based search (Introduction, p. 2). The survey reports methods and guarantees. Inference: it supplies a comparison of existing approaches rather than a new verifier or a common experimental benchmark.

The basic input is a sample S=(P,N), where P contains desirable words and N undesirable words. An LTL formula is built from propositions, Boolean operators, and temporal X (next) and U (until); F, G, W, and R are derived operators. Formula size is the number of unique subformulas, and a syntax DAG shares repeated subformulas (Sections 2–3, pp. 2, 4–5). The standard goal includes minimality: “Given a sample S = (P, N ), compute a minimal LTL formula φ that is consistent with S” (Definition 1, p. 5). The survey explicitly warns that noisy or incomplete observations change this goal.

## technique 1: incremental SAT encoding of LTL syntax and semantics

what it is and when to use it

Constraint-based learning turns formula discovery into satisfiability problems. “At the heart of constraint-based approaches lies the idea of translating the learning problem into one or several satisfiability problems within a suitable logical framework (e.g., SAT or SMT)” (Section 4, p. 5). Inference: use the incremental SAT method when a minimal consistent formula is wanted and the sample can be encoded for a solver.

how to do it

1. start at candidate size n = 1 and create a syntax-DAG encoding ΦDAG_n. The encoding constrains each node to one operator and at most two children (Section 4, p. 6)
2. create Φcon_n that evaluates the candidate formula on each positive and negative word, using an encoding similar to bounded model checking (Section 4, p. 6)
3. conjoin ΦS_n = ΦDAG_n ∧ Φcon_n
4. call a SAT solver, such as Z3 in Neider and Gavran’s implementation, and increase n until ΦS_n is satisfiable
5. decode the satisfying assignment into an LTL formula. The survey states that satisfiability is equivalent to existence of a size-n consistent formula and that the assignment contains enough information to construct it (Section 4, p. 6)

Riener preprocesses unlabeled partial DAGs and searches by DAG structure; this decomposes the search and can enable parallelization. Camacho and McIlraith encode equivalent counter-free alternating finite automata with Pycosat. Arif et al. move the encoding to SyGuS with bit-vector arithmetic and CVC4SY, gaining synthesis heuristics. Ielo et al. formulate abduction and context-dependent learning in ASP, using CLINGO or ILASP (Section 4, pp. 6–7).

Verus form

Inference: represent each candidate specification as a Verus `spec fn` over mathematical traces, and state the learned contract in `requires`/`ensures` clauses on executable functions. A proof function can establish that a fixed candidate satisfies each trace; the SAT/SMT enumeration remains an external synthesis phase. Verus does not directly provide LTL syntax-DAG search, so the generated candidate would have to be imported as a fixed predicate and its temporal semantics encoded over sequences. Loop invariants and lemmas could relate a Rust monitor to the encoded temporal semantics.

what evidence shows it works and limits

The survey’s Table 1 reports sound, complete, minimal guarantees for several SAT methods on perfect positive-plus-negative data. These are formal guarantees of the encoding, not measurements of Rust verification effort. The approach searches increasing sizes and can be blocked by solver scalability (Section 5, p. 8). The standard sample has positive and negative labels; the survey treats noisy and positive-only samples separately (Sections 3–4.2, pp. 5–8).

## technique 2: MaxSAT for noisy examples

what it is and when to use it

For noisy data, exact consistency is relaxed. The survey defines the loss
l(S,φ) = (Σ_{u∈P}[u ⊭ φ] + Σ_{v∈N}[v |= φ])/(|P|+|N|),
which is the proportion of misclassified examples (Section 4.1, p. 7). Inference: use MaxSAT when labels or observations may be wrong and the goal is a small formula with low classification loss.

how to do it

1. build ΦDAG_n as hard clauses, preserving valid syntax
2. designate selected clauses from Φcon_n as soft clauses
3. ask a MaxSAT solver to satisfy every hard clause and maximize satisfied soft clauses

Gaglione et al. use Z3 MaxSAT. The survey states: “As a result, they obtain a minimal LTL formula that minimizes the specified loss function” (Section 4.1, p. 7). It does not detail a procedure for optimizing across formula sizes. The survey says that similar relaxations can extend most constraint-based approaches when their solver supports them.

Verus form

Inference: treat the loss calculation as a ghost `spec fn` over a finite trace set and prove an `ensures` clause for the selected candidate. The MaxSAT optimization itself is outside Verus; Verus can check the resulting contract against executable trace-generation code. The denominator must remain `|P|+|N|`, because changing it changes the meaning of the measured error.

Evidence and limits

The paper gives the loss definition and solver construction (Section 4.1, p. 7). Inference: minimizing sample loss does not establish that the formula expresses the intended requirement.

## technique 3: positive-only learning with specificity and counterexamples

what it is and when to use it

With only positive examples, the smallest consistent formula is `true`, which is uninformative. Roy et al. add “strongness—or specificity—as an additional optimization parameter besides the size of the formula” (Section 4.2, p. 7). They seek a most specific formula consistent with the positives and of size at most n. Inference: this is useful when negative traces are unavailable or unsafe to collect.

how to do it

1. set a size bound n and construct a formula consistent with the positive set using a SAT-based learner
2. analyze the current formula
3. if necessary, generate a new negative example that directs the search toward a more specific formula
4. repeat until no more-specific candidate exists; return the current formula (Section 4.2, pp. 7–8)

Chou et al. instead use domain-specific non-convex costs and a joint MILP encoding of costs and a syntax DAG, solved with IPOPT (Section 4.2, p. 8).

Verus form

Inference: encode observed positive traces as `requires` facts and candidate specificity as an implication between ghost predicates. A Verus proof can show that every observed trace satisfies the candidate; generating adversarial counterexamples and optimizing implication strength requires an external synthesis loop. The resulting candidate can be placed in an `ensures` clause, with loop invariants proving its temporal monitor implementation.

Evidence and limits

The stopping condition is explicit: “This iterative process continues until no formulas more specific than the current formula can be found, at which point the algorithm terminates” (Section 4.2, p. 8). Inference: this is specificity relative to the size bound, not evidence that the examples determine a unique intended requirement.

## technique 4: enumerative pattern mining and GPU search

Scarlet mines directed temporal patterns with dynamic programming. In the paper’s example, positive word `{p}{p}{q}{p}{r}{p}` and negative word `{p}{p}{r}{p}{q}` yield `F(q ∧ F(r))`, expressing the order q before r (Section 5, p. 8). The tool combines selected directed-LTL formulas with Boolean subset cover. The survey states that “Scarlet’s search strategy integrates syntax and semantics computations in a single, unified process” (Section 5, p. 8). Table 1 lists soundness, without completeness or minimality, for Raha et al. (p. 3).

Valizadeh et al. use relaxed unique checks (RUCs) for a bottom-up search, removing formulas with identical behavior on the sample. Divide-and-conquer partitions the sample, runs RUCs in parallel, and combines resulting formulas with Boolean operations. Bit-vector semantics map naturally to GPU execution (Section 5, p. 8). Ghiorzi et al. enumerate partial DAGs, apply rewrite rules such as `φ ∧ ¬φ ≡ false` and `¬ F φ ≡ G(¬φ)`, and alternately test positive and negative examples to remove tautologies and contradictions (Section 5, pp. 8–9).

Inference: a Verus implementation can encode a directed-LTL monitor as a recursive `spec fn` over a sequence and prove rewrite lemmas before using them to prune candidates. GPU RUC and Boolean-cover search remain external tooling; Verus would verify the chosen monitor and its Rust integration, not the GPU kernel unless separately modeled.

The survey describes RUC as resource-intensive on large samples, motivating partitioning (Section 5, p. 8). Its guarantees differ by method: Table 1 lists only soundness for Raha et al. and Valizadeh et al., but soundness, completeness, and minimality for Ghiorzi et al. (p. 3). Inference: enumeration alone does not determine which guarantees a learner provides.

## technique 5: graph neural networks for formula extraction

Luo et al. represent a word as a linear graph and train a GNN on positive and negative samples. Node features track satisfaction of candidate subformulas; message passing aggregates successor nodes according to LTL semantics. Learned weights are then decoded into an LTL formula approximating the network’s behavior. Wan et al. constrain network weights to encode LTL semantics faithfully, and the survey says that “a consistent LTL formula can always be reliably extracted from the trained GNN” (Section 6, p. 9).

The survey cautions: “due to the inherent uncertainty of neural network training, these approaches lack theoretical guarantees regarding the consistency of the learned LTL formulas” (Section 6, p. 9). Table 1 lists no guarantees for either GNN method (p. 3). Inference: the faithful extraction statement should not be read as an unconditional guarantee of sample consistency after training.

Inference: use a GNN only to propose a Verus predicate; require Verus to prove the predicate against executable traces before accepting it. A neural score is evidence for search priority, not a proof. The final specification still needs human review for intent; a proof establishes only the formal claim encoded in it.

## other settings and product implications

Templates let a user constrain missing propositions, operators, or subformulas; examples include GR(1) templates `G F?` and `G(? → X?)` (Section 7.1, p. 10). Natural-language systems parse English, train on labeled text–formula pairs, or use large language models (Section 7.2, p. 10). Related work learns STL, CTL, ATL, MTL, and PSL formulas (Section 7.3, pp. 10–11).

Inference: for VeruLaw, the reusable pattern is a staged pipeline: mine a candidate from traces or text, expose its exact formula and examples, then require Verus proofs for the Rust contract and monitor. The threat from agent-written verified Rust is specification error: a solver or model can produce a formula that is internally consistent yet captures the wrong requirement. The survey’s methods do not validate intent, library assumptions, hardware behavior, or proof erasure; those remain trusted in a Verus deployment. Existing work already covers SAT/MaxSAT, enumerative search, GPU pruning, neural extraction, templates, and natural-language translation, so VL should not redo these as undiscriminated formula-search projects. It should measure whether mined predicates reduce human contract effort while preserving independently checked Verus proofs.

## what is proved, measured, and trusted

Table 1 reports soundness, completeness, minimality, and language minimality for specific methods and data settings (p. 3). The survey gives qualitative scalability comparisons in Sections 5–6 (pp. 8–9), without a common runtime or accuracy experiment. Inference: guarantees about consistency with examples do not prove that the examples express the real system requirement. Using a learned formula in Verus additionally requires justifying its translation and intended meaning.

## techniques for the catalog

- incremental SAT syntax-and-semantics encoding: enumerate syntax-DAG sizes and solve ΦDAG_n ∧ Φcon_n until a consistent minimal LTL formula is decoded
- MaxSAT noisy learning: keep syntax clauses hard and selected example clauses soft to minimize the explicitly defined misclassification loss
- positive-only specificity loop: synthesize a positive-consistent formula and iteratively exclude counterexamples until no stronger bounded formula remains
- directed-pattern enumeration: mine temporal patterns with dynamic programming and combine them through Boolean subset cover
- GPU RUC divide-and-conquer: search sample partitions with RUCs and combine the resulting formulas with Boolean operations
- neural LTL extraction: represent words as linear graphs, train a GNN, and extract an LTL formula from its learned weights
- templates and sketches: constrain formula structure with domain placeholders before learning missing propositions or subformulas

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This iterative process continues until no formulas more specific than the current formula can be found, at which point the algorithm terminates."): checked the complete paper, quotations, numbers, section and page references, technique steps, tag, and arXiv link; corrected page references and enumeration guarantees, removed unsupported MaxSAT size-search and counterexample-generation details, and marked conclusions as inferences; did not check cited papers, implementations, or the proposed Verus adaptations.
