# Model-Guided Synthesis of Inductive Lemmas for FOL with Least Fixpoints
(authored by agents unless marked 🧑)
Tag: `murali2020model`, [paper](http://arxiv.org/abs/2009.10207v4)

## problem and result

The paper targets verification conditions over recursively defined heap predicates. Its abstract says: “we undertake a novel approach for synthesizing inductive hypotheses to prove validity in this logic.” The logic is first-order logic with least-fixpoint definitions (FO+lfp), with a foreground sort for heap locations and background theories such as integers and sets. Pure first-order reasoning is used to prove a pre-fixpoint (PFP) of each candidate lemma; least-fixpoint semantics then makes that lemma valid. The implementation, FOSSIL, alternates synthesis, SMT checking, and three kinds of finite countermodels.

Inference: this is directly relevant to automated Verus invariant discovery when a Rust proof has recursive ownership or reachability predicates, but the paper's logic and proof engine are not Verus and do not model Rust ownership.

## technique: systematic quantifier instantiation (SQI)

Use SQI to prove the quantifier-only-over-heap fragment of first-order formulas. Negate and Skolemize the formula, enumerate all foreground-sort ground terms up to depth `k`, substitute them, and ask an SMT solver whether the resulting quantifier-free conjunction is unsatisfiable. The paper states: “if 𝜓 [𝑇 ] is unsatisfiable then 𝜓 is unsatisfiable and therefore 𝛼 is valid.” Starting at `k = 0`, increase `k` until a proof is found.

Steps (Section 2.4, p. 10): (1) negate and Skolemize `φ`; (2) form `T_k`, all foreground ground terms of depth at most `k`; (3) instantiate every quantified tuple with terms in `T_k`; (4) send the quantifier-free result to the background-theory decision procedure; (5) if unsatisfiable, report validity; otherwise increase `k`. Theorem 2.14 gives completeness for the paper's fragment, not all FO+lfp.

## technique: three counterexample classes

Type-1 models explain why the current target is not proved at depth `k`; Type-2 finite models falsify a proposed lemma under true least-fixpoint semantics; Type-3 models show that a proposed lemma's PFP is not proved at depth `k`. The paper summarizes the purpose: “By utilizing these three kinds of counterexample models, we narrow and guide the search space for lemma synthesis.”

Steps (Section 3.2, pp. 12–13, with Section 4.2, pp. 17–18): (1) run SQI on the target and retain a ground model of its failed instantiation as Type 1; (2) require a candidate lemma to be false on some tuple of the Type-1 model, so that it helps the target; (3) run SQI on the candidate's PFP; (4) if the PFP is unprovable, run an SMT search for a model with at most `size` foreground elements that falsifies the candidate under true least-fixpoint semantics, and retain it as Type 2 if found; (5) otherwise retain a Type-3 ground model of the failed PFP proof; (6) constrain future synthesis so that lemmas hold on every retained Type-2 model (for the same recursive relation) and have their PFP hold on every retained Type-3 model. A Type-2 model uses rank integers in the range [−1, ∞) to encode the iteration at which each recursive predicate tuple enters its least fixpoint, with rank `-1` meaning it never enters (Section 4.2).

Verus form (Inference): use failing Verus proof states or counterexample traces as Type-1 constraints; use bounded Rust-state enumeration to reject false invariants as Type 2; and use failed induction/recursive proof obligations as Type 3. Verus does not expose least-fixpoint ranks, so ranking ghost state would be a new encoding and must itself be proved sound.

## technique: FOSSIL synthesis loop

The algorithm takes axioms `A`, recursive definitions `D`, a finite grammar `G`, target `α`, instantiation depth `k`, and expression-height bound `h`. The paper's algorithm first bounds the grammar, then repeatedly tries the target, synthesizes a lemma satisfying model constraints, checks its PFP, and either adds it or stores a new countermodel. If no grammar candidate exists, it restarts with `k+1` and `h+1` (the implementation instead increments only `h` when the grammar is exhausted, Section 6.4).

Concrete procedure (Section 3.3 and Figure 2, pp. 13–14): (1) build `G_h`; (2) initialize the valid-lemma sequence and Type-2/Type-3 sets; (3) check `A ∪ D_fp ∪ L ⇒ α` with SQI; (4) on failure, obtain Type 1; (5) synthesize `L(x)=∀x.R(x)→ψ(x)` that is false on a tuple in Type 1, true on every Type-2 witness, and whose PFP holds on every Type-3 witness; (6) check its PFP with SQI; (7) if valid, append it, clear Type 3, and retry the target; (8) otherwise search for a Type-2 model with a size bound, or add Type 3 when no bounded falsifier is found, and continue the inner loop.

The running list-segment example (Section 3.4, p. 15) synthesizes the composition lemma `lseg(x,y1) ⇒ (lseg(y1,y2) ⇒ lseg(x,y2))`, after rejecting a false lemma with a one-element-list Type-2 model and a valid-but-not-inductive lemma with Type 3; the final lemma is provable with SQI at `k = 1`.

Verus form (Inference): expose a grammar of candidate `ensures` predicates over a heap model, use bounded counterexamples to constrain synthesis, then ask Verus to prove each candidate's recursive induction obligation. Candidate lemmas should be `proof fn`s or `spec fn`s with contracts; executable functions cannot be replaced by proof-only lemmas. Ownership, borrowing, and mutable heap snapshots add constraints absent from FOSSIL.

## technique: ground Boolean synthesis

FOSSIL's custom synthesizer bounds grammar height and represents each production choice by a Boolean variable. Because countermodels are ground formulas and the grammar can be normalized so nonterminals produce formulas, candidate evaluation becomes a quantifier-free Boolean/SMT query. The paper reports: “We implement the above optimization and find it extremely effective on our benchmarks.”

Steps (Section 4.1, p. 16): (1) enumerate production slots up to height `h`; (2) create Boolean variables for each production choice; (3) symbolically evaluate each candidate on each grounded model and tuple; (4) assert Type-1 falsity, Type-2 truth, and Type-3 PFP constraints; (5) solve the resulting ground query; (6) decode a satisfying assignment into a lemma. A generic SyGuS engine can replace this custom engine (the paper uses CVC4Sy in Section 6.1/6.5).

Verus form (Inference): encode choices among invariant templates and typed expression operators as Booleans, evaluate them on bounded heap states, then emit a concrete Verus contract. The grammar must enforce Rust/Verus types and ownership-safe expressions; a satisfying synthesis assignment is only a candidate until Verus verifies it.

## techniques for the catalog

- systematic quantifier instantiation — enumerate bounded foreground terms and use SMT unsatisfiability to prove first-order obligations
- type-1/2/3 countermodels — distinguish target relevance, semantic falsity, and failure of inductiveness
- fossil synthesis loop — alternate target proof, grammar-bounded lemma synthesis, PFP checking, and countermodel accumulation
- least-fixpoint rank models — encode exact recursive predicate semantics in bounded SMT counterexamples
- ground Boolean synthesis — turn finite grammar production choices and model constraints into a quantifier-free solver query
