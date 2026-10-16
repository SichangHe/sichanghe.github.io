# Analysis and Transformation of Constrained Horn Clauses for Program Verification
(authored by agents unless marked 🧑)
Tag: `deangelis2021analysis`, [paper](http://arxiv.org/abs/2108.00739v1)

## scope and result

The paper is a survey of constrained Horn clause (CHC) encodings, analyses, and transformations for software verification. Its central reduction is satisfiability: encode a program and its property as CHCs, then show that the error goal is false. The paper states, “The first step in CHC-based software verification is the encoding of a verification problem in CHC form” (Section 1, p. 3). It also states that “Since satisfiability of CHCs is undecidable, a terminating automatic solver yields one of three answers: satisfiable, unsatisfiable or unknown” (Section 1, p. 4). Thus a successful satisfiability proof is a proof of the encoded property, subject to the encoding and constraint theory.

The running example is `sum_upto`, which loops while `x > 0`, accumulates `r`, and decrements `x`. The Hoare triple `{m≥0} sum = sum_upto(m) {sum≥m}` is encoded with one false goal and three defining clauses (Section 1, pp. 3–4). The clauses use `M>=0` as the precondition, `sum_upto(M,Sum)` as terminating evaluation, and `M>Sum` as the negated postcondition. The paper says, “CHC solvers can show that this set of CHCs is indeed satisfiable and hence the validity of the Hoare triple is proven” (Section 1, p. 4).

## technique: encode imperative verification as CHCs

When to use it: use this reduction when a source language has an executable or relational semantics and the property can be expressed as predicates on initial and final states. The paper gives both an interpreter-based route and direct proof-rule encodings.

Steps from the paper:

1. Represent statements, states, and execution as first-order terms and an `exec(S,St0,St1)` relation. In the small-step style, define `step` and its reflexive transitive closure `run`; complete execution is a run ending at `halt` (Section 4.1.1, pp. 23–24). In the big-step style, define `exec` compositionally, for example, assignment by `eval` followed by `replace`, and sequencing by two `exec` calls (Section 4.1.2, p. 24).
2. Define predicates `pre(St)`, `post(St)`, and `error(St)`; the paper's Hoare goal is `false :- pre(St0), prog(S), exec(S,St0,St1), error(St1)` (Section 4.1.4, p. 26).
3. Specialise the semantics interpreter with respect to the concrete source statement and goal. The paper calls this an instance of the first Futamura projection and says, “an interpreter specialised (by partial evaluation) with respect to a source program P can be seen as a compilation of P into the language of constrained Horn clauses” (Section 4.1.3, p. 25).
4. Check satisfiability of the specialised clauses. For `sum_upto`, specialisation yields `asg1`, `sum_upto`, and recursive `while4` clauses; the goal becomes `false :- M>Sum, M>=0, asg1(M,Sum)` (Example 15, pp. 25–26).

Inference: in Verus, the direct analogue is to write an executable Rust function, a `requires` precondition, and an `ensures` postcondition, then use `proof fn` lemmas and loop `invariant` clauses to discharge the generated obligations. The CHC interpreter and partial evaluator are replaced by Verus's source-to-VC pipeline, so the state relation and explicit `exec` predicate usually do not carry over. The mathematical precondition and postcondition do carry over.

Evidence and limits: the paper's evidence is a worked derivation, not a benchmark. The `sum_upto` clauses prove the stated triple only when termination is represented by `sum_upto`; the paper explicitly treats satisfiability as undecidable and permits `unknown` (Section 1, p. 4). Compiler-based translation can introduce an additional trusted component: SeaHorn “takes as input the optimized LLVM bitcode and emits verification conditions as Constrained Horn Clauses (CHC)” (Section 4.4, p. 28), while the survey says the cited tools do not formally prove translation correctness and rely on compiler correctness (Section 4.4, p. 28).

## technique: semantics-preserving fold/unfold transformation

When to use it: use fold/unfold when a solver cannot handle the original clauses, especially when quantified array constraints or an inconvenient recursion pattern obscure a simple invariant.

Steps from the array-sum example (Section 3.1, pp. 16–18):

1. Start with `all_pos`, `asum`, and the false goal for the sum property.
2. Apply the definition rule to introduce `newa` whose body is the false goal's conjunction.
3. Unfold `asum` in `newa`; delete the base clause whose constraints are unsatisfiable.
4. Unfold `all_pos`; simplify equivalent constraints.
5. Fold the recursive body back through `newa`, using the entailment condition required by the folding rule.
6. Fold the original false goal through `newa`, then delete clauses no longer reachable from constrained goals.

The resulting recursive clause and false goal are satisfiable in the Array domain because the least model for `newa` is empty. The paper's formal guarantee is: “S0 is D-satisfiable if and only if Sn is D-satisfiable” (Theorem 1, Section 3.1, p. 18). It also warns that the folding clause must have been unfolded earlier; otherwise self-folding can turn an unsatisfiable set into a satisfiable one (the `p`, `q`, and `false :- q` counterexample, p. 18).

Inference: in Verus, this is a proof-engineering transformation rather than a Rust syntax transformation. One can expose a helper `proof fn` or a recursive specification function whose body mirrors the folded predicate, then prove equivalence lemmas with `ensures`; Verus has no CHC fold rule, so the preservation theorem must be established as a lemma. The warning about self-folding corresponds to avoiding circular lemmas whose assumptions already contain the conclusion.

Evidence and limits: the paper gives the complete clause sequence and a theorem, but no aggregate success percentage or solver-time denominator for this example. The transformation preserves satisfiability, not necessarily the same model: the paper says, “they may have different D-models, simply because they may contain different predicate symbols” (Section 3.1, p. 18). Quantified array formulas can still be needed before transformation, and automation depends on choosing useful definitions (the “eureka step,” p. 19).

## technique: CHC specialisation and redundant-argument removal

When to use it: specialise around the false goal when irrelevant predicates, list terms, or state arguments make solving harder. Remove arguments that do not affect the goal before solving constraints.

Specialisation steps (Section 3.2, pp. 19–20): define `sp(X) :- p(X,[0])`; unfold one step; delete the branch with unsatisfiable `0>0`; fold the original goal and recursive branch through `sp`. The specialised clauses discard predicate `q` and list structure, leaving an LIA problem whose least model is computed in two immediate-consequence iterations (Example on pp. 19–20). The paper identifies two controls: local control chooses atoms and when to stop unfolding; global control introduces finitely many definitions, using generalisation and widening when necessary (pp. 20–21).

Redundant argument filtering (RAF) and bottom-up FAR remove arguments from all predicate occurrences. In Example 13, removing `Y` from `q(X,Y)` makes `X<Y` replaceable by `true`; FAR then removes the remaining argument and leaves `false :- q2` and `q2 :- true` (Section 3.3, pp. 21–22). The paper says, “Removing redundant arguments can be a useful pre-processing step since removing variables leads to the elimination of constraints” (Section 3.3, p. 21).

Inference: in Verus, the analogue is to state helper lemmas over only the variables needed by the postcondition, and to use ghost state or a narrower `spec fn` rather than carrying irrelevant runtime fields into a proof. Verus's Rust types and ownership prevent arbitrary argument deletion when an argument controls memory or borrowing; only logically irrelevant ghost/spec arguments can be removed safely.

Evidence and limits: the examples show fewer clauses and a simpler constraint domain, but no measured speedup denominator. Termination of specialisation needs finite generalisation; an overly aggressive generalisation can lose precision. FAR is not, in general, reconstructed by ordinary fold/unfold because it uses constrained facts globally (Section 3.3, p. 22).

## technique: abstract interpretation for invariants

When to use it: use bottom-up analysis to infer an over-approximate model and loop invariants, or top-down call-success analysis when properties depend on calling context.

Bottom-up steps (Section 5.1, pp. 29–31): choose a complete lattice and concretisation; define an abstract transformer `UP` satisfying `TPD ◦ γ ⊆ γ ◦ UP`; iterate from bottom; apply widening if there are infinite ascending chains; test whether the false goal is true in the concretised over-approximation. For `sum_upto`, convex polyhedra widen away the sequence `X=<1, X=<2, ...`; at Step 5 the inferred facts include `sum_upto(X,R) | R>=X, R>=0`, and the false goal is true in the concretisation, proving satisfiability (Example 16, pp. 30–31).

Top-down analysis builds finite analysis graphs whose nodes contain abstract call and success descriptions. The construction follows and-trees, tabulates repeated calls, and applies widening; the paper states that “the concretisation of the analysis graph is a safe over-approximation of the and-trees generated by the concrete semantics” (Section 5.2, p. 34). Its Ciao example checks `Sum>=M` and reports a `checked success` assertion for `sum_upto` under `M>=0` (Example 18, pp. 35–36).

Inference: in Verus, a bottom-up invariant is written as a loop `invariant` over the mutable variables, and an abstract-domain fact becomes a ghost/spec predicate or arithmetic lemma. Verus does not expose CHC analysis graphs as a user construct; call-sensitive facts are normally encoded with function contracts and separate lemmas.

Evidence and limits: widening guarantees finite convergence only for the chosen abstract domain; the result is an over-approximation, so a failed abstract check may be spurious. The paper supplies concrete polyhedral facts and steps but no overall benchmark denominator in this survey section.

## technique: CEGAR and PDR refinement

When to use it: use abstraction refinement when a coarse over-approximation cannot establish the goal. CEGAR adds predicates from spurious counterexamples; PDR incrementally strengthens interpretations.

CEGAR starts with a predicate set `Pred`, abstracts CHC predicates into Boolean combinations, and uses spurious counterexamples plus Craig interpolation to extend `Pred` (Section 5.3, p. 38). PDR maintains `⟨I0,...,In⟩` with `I0 = TPD(∅)`, `Ik ⊆ Ik+1`, and `TPD(Ik) ⊆ Ik+1`; it either reaches a fixpoint or finds a derivation of the false goal (Section 5.3, pp. 38–39). In Example 21, PDR refines `while` first with `R2>=R1+X`, repeats the same refinement at the next frame, and terminates when the frames coincide, proving the `sum_upto` triple (pp. 39–40).

Inference: in Verus, CEGAR/PDR is an external invariant-discovery strategy. The discovered relation, such as `R2>=R1+X`, becomes a loop invariant or lemma postcondition; Verus then checks it with `invariant` and `ensures`. Verus does not provide PDR frames as source constructs.

The paper's evidence is the explicit two-frame derivation, not a broad success rate. PDR effectiveness depends on derivation search and interpolation; the survey says it “highly relies on the underlying strategy” (Section 5.3, p. 40). Since CHC satisfiability is undecidable, no technique here guarantees an answer for every program.

## what is proved, trusted, and left open

The paper proves preservation theorems for stated CHC transformations and gives sound over-approximation conditions for analyses. It measures no common benchmark table in this survey; its numerical evidence is local to examples (for instance, two immediate-consequence iterations in the specialisation example and five polyhedral steps in Example 16). The translation route trusts the semantics interpreter, partial evaluator, compiler, and constraint solver; the survey explicitly says compiler-based approaches rely on compiler correctness (Section 4.4, p. 28). The correctness of a source contract and the adequacy of a chosen abstraction remain outside the CHC proof.

Inference: the threat to agent-written verified Rust is high when agents select a wrong contract, omit a state component in translation, or use an overly coarse invariant; the solver can still prove the encoded false-goal absence. The threat is lower for routine arithmetic loops when a complete contract and invariant are supplied, because the paper's examples show a repeatable path from semantics to clauses to a checked model. VL should reuse these established ideas rather than reimplement CHC specialisation, widening, CEGAR, or PDR without a measured gap.

## techniques for the catalog

- semantics-to-chc encoding — represent program execution and a negated postcondition as CHCs, then check satisfiability
- fold/unfold transformation — introduce, unfold, fold, simplify, and delete clauses under a satisfiability-preservation theorem
- goal-directed specialisation — partially evaluate clauses around a verification goal and generalise to terminate
- redundant-argument removal — remove predicate arguments that do not affect the goal to simplify constraints
- abstract interpretation — compute a widened over-approximation of CHC models as inferred invariants
- call-success analysis — tabulate abstract call and success constraints in a finite analysis graph
- cegar refinement — add interpolated predicates when an abstract counterexample is spurious
- pdr — refine a sequence of over-approximations until a fixpoint proves the goal or a derivation refutes it
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
