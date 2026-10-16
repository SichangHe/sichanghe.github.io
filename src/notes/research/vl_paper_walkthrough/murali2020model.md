# Model-Guided Synthesis of Inductive Lemmas for FOL with Least Fixpoints
(authored by agents unless marked 🧑)
Tag: `murali2020model`, [paper](http://arxiv.org/abs/2009.10207v4)

## problem and result

The paper targets verification conditions over recursively defined heap predicates. Its abstract says: “we undertake a novel approach for synthesizing inductive hypotheses to prove validity in this logic.” The logic is first-order logic with least-fixpoint definitions (FO+lfp), with a foreground sort for heap locations and background theories such as integers and sets. Pure first-order reasoning is used to prove a pre-fixpoint (PFP) of each candidate lemma; least-fixpoint semantics then makes that lemma valid. The implementation, FOSSIL, alternates synthesis, SMT checking, and three kinds of finite countermodels.

Inference: this is directly relevant to automated Verus invariant discovery when a Rust proof has recursive ownership or reachability predicates, but the paper's logic and proof engine are not Verus and do not model Rust ownership.

## technique: systematic quantifier instantiation (SQI)

Use SQI to prove the quantifier-only-over-heap fragment of first-order formulas. Negate and Skolemize the formula, enumerate all foreground-sort ground terms up to depth `k`, substitute them, and ask an SMT solver whether the resulting quantifier-free conjunction is unsatisfiable. The paper states: “If 𝜓 [𝑇 ] is unsatisfiable then 𝜓 is unsatisfiable and therefore 𝛼 is valid.” Increase `k` until a proof is found.

Steps (Section 2.4, pp. 10–11): (1) negate and Skolemize `φ`; (2) form `T_k`, all foreground ground terms of depth at most `k`; (3) instantiate every quantified tuple with terms in `T_k`; (4) send the quantifier-free result to the background-theory decision procedure; (5) if unsatisfiable, report validity; otherwise increase `k`. Theorem 2.14 gives completeness for the paper's fragment, not all FO+lfp.

Verus form (Inference): instantiate quantified `spec fn` facts with terms generated from pointer variables and constructors, then discharge the ground obligations through Verus/Z3. Verus's triggers and quantifier instantiation are solver controls, not an exposed complete SQI procedure; a VL tool would need bounded explicit instantiations as proof hints and must retain a real Verus proof.

## technique: three counterexample classes

Type-1 models explain why the current target is not proved at depth `k`; Type-2 finite models falsify a proposed lemma under true least-fixpoint semantics; Type-3 models show that a proposed lemma's PFP is not proved at depth `k`. The paper summarizes the purpose: “By utilizing these three kinds of counterexample models, we narrow and guide the search space for lemma synthesis.”

Steps (Section 3.2, pp. 11–13): (1) run SQI on the target and retain a ground model of its failed instantiation as Type 1; (2) require a candidate to disagree with the Type-1 model so it helps the target; (3) run bounded SMT model search with a foreground-size bound and reject candidates falsified by Type 2; (4) run SQI on the candidate's PFP; (5) retain a Type-3 ground model when PFP proof fails; (6) constrain future synthesis to satisfy all retained models. A Type-2 model uses rank integers to encode the iteration at which each recursive predicate tuple enters its least fixpoint, with rank `-1` meaning never enters.

Verus form (Inference): use failing Verus proof states or counterexample traces as Type-1 constraints; use bounded Rust-state enumeration to reject false invariants as Type 2; and use failed induction/recursive proof obligations as Type 3. Verus does not expose least-fixpoint ranks, so ranking ghost state would be a new encoding and must itself be proved sound.

## technique: FOSSIL synthesis loop

The algorithm takes axioms `A`, recursive definitions `D`, a finite grammar `G`, target `α`, instantiation depth `k`, and expression-height bound `h`. The paper's algorithm first bounds the grammar, then repeatedly tries the target, synthesizes a lemma satisfying model constraints, checks its PFP, and either adds it or stores a new countermodel. If no grammar candidate exists, it restarts at larger `k` and `h`.

Concrete procedure (Figure 2, pp. 13–15): (1) build `G_h`; (2) initialize the valid-lemma sequence and Type-2/Type-3 sets; (3) check `A ∪ D_fp ∪ L ⇒ α` with SQI; (4) on failure, obtain Type 1; (5) synthesize `L(x)=∀x.R(x)→ψ(x)` that is false on a tuple in Type 1, true on every Type-2 witness, and whose PFP holds on every Type-3 witness; (6) check its PFP with SQI; (7) if valid, append it, clear Type 3, and retry the target; (8) otherwise search Type 2 at increasing model size, or add Type 3 when no bounded falsifier is found.

The running list-segment example synthesizes the composition lemma `lseg(x,y1) ⇒ (lseg(y1,y2) ⇒ lseg(x,y2))`, after rejecting a false lemma with a one-element-list Type-2 model and a valid-but-not-inductive lemma with Type 3.

Verus form (Inference): expose a grammar of candidate `ensures` predicates over a heap model, use bounded counterexamples to constrain synthesis, then ask Verus to prove each candidate's recursive induction obligation. Candidate lemmas should be `proof fn`s or `spec fn`s with contracts; executable functions cannot be replaced by proof-only lemmas. Ownership, borrowing, and mutable heap snapshots add constraints absent from FOSSIL.

## technique: ground Boolean synthesis

FOSSIL's custom synthesizer bounds grammar height and represents each production choice by a Boolean variable. Because countermodels are ground formulas and the grammar can be normalized so nonterminals produce formulas, candidate evaluation becomes a quantifier-free Boolean/SMT query. The paper reports: “We implement the above optimization and find it extremely effective on our benchmarks.”

Steps (Section 4.1, pp. 16–17): (1) enumerate production slots up to height `h`; (2) create Boolean variables for each production choice; (3) symbolically evaluate each candidate on each grounded model and tuple; (4) assert Type-1 falsity, Type-2 truth, and Type-3 PFP constraints; (5) solve the resulting ground query; (6) decode a satisfying assignment into a lemma. A generic SyGuS engine can replace this custom engine.

Verus form (Inference): encode choices among invariant templates and typed expression operators as Booleans, evaluate them on bounded heap states, then emit a concrete Verus contract. The grammar must enforce Rust/Verus types and ownership-safe expressions; a satisfying synthesis assignment is only a candidate until Verus verifies it.

## evidence, assumptions, and product threat

FOSSIL is implemented in Python with Z3Py and evaluated on 50 data-structure theorems and 673 synthetic theorems (Section 6). The paper compares counterexample ablations, custom synthesis with SyGuS, and other ADT/separation-logic tools. Its soundness claim concerns returned sequential lemmas whose PFPs and target are proved by SQI; relative completeness is only with respect to a grammar containing independently provable lemmas and fair growth of `k` and `h`. The foreground-only quantification restriction excludes, for example, general array properties quantified over integers. Type-2 exact least-fixpoint models, rather than under-approximations, are required when negation is present.

Inference: for VL, the strongest reusable idea is the separation of relevance, validity, and inductiveness counterexamples. The main threat is search cost and unsound state abstraction: a bounded heap model can miss a false invariant, while a solver-accepted contract can still misstate user intent. Existing FOSSIL already covers model-guided inductive lemma synthesis; VL should measure typed Rust/Verus adaptations rather than claim the generic loop as new.

## techniques for the catalog

- systematic quantifier instantiation — enumerate bounded foreground terms and use SMT unsatisfiability to prove first-order obligations
- type-1/2/3 countermodels — distinguish target relevance, semantic falsity, and failure of inductiveness
- fossil synthesis loop — alternate target proof, grammar-bounded lemma synthesis, PFP checking, and countermodel accumulation
- least-fixpoint rank models — encode exact recursive predicate semantics in bounded SMT counterexamples
- ground Boolean synthesis — turn finite grammar production choices and model constraints into a quantifier-free solver query
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
