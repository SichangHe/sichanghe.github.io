# (Quantified) Horn Constraint Solving for Program Verification and Synthesis
(authored by agents unless marked 🧑)
Tag: `rybalchenko2014quantified`, [paper](http://arxiv.org/abs/1405.7739v1)

## what the paper contributes

This paper gives a common encoding for verification and synthesis. Its claim is that “automatic tools for the verification of linear and branching time properties of procedural, multi-threaded, and functional programs as well as program synthesis can be naturally and uniformly seen as solvers of constraints in form of (quantified) Horn clauses over background logical theories.” (Abstract, p. 1) The architecture separates generating proof obligations from discovering a solution. The paper says this gives “a logical separation of concerns between constraint generation (also known as generation of proof obligations) and constraint solving (also known as proof discovery)” (Abstract, p. 1).

The paper is a formulation paper, not an implementation benchmark. It writes constraint systems for safety, backward safety, combined forward/backward reasoning, termination, information flow, temporal properties, and reactive synthesis (§2, pp. 2–4), then characterizes solver families (§3, p. 4). The paper is four pages of text plus references and reports no experimental denominator, runtime, or success percentage.

## technique 1: encode safety as existential invariant constraints

What it is. Represent a program by `init(v)` and `next(v,v')`. To prove `safe(v)` for every reachable state, ask a solver to find an invariant `inv` satisfying initiality, inductiveness, and safety. The paper's displayed constraint (under the heading "Safety") is:

`∃inv: (∀v: init(v) → inv(v)) ∧ (∀v∀v': inv(v) ∧ next(v,v') → inv(v')) ∧ (∀v: inv(v) → safe(v))` (§2, p. 2).

When to use it. Use it when the program's transition relation and safety predicate can be expressed in a background theory supported by the Horn solver. A satisfying interpretation for `inv` is the inductive invariant.

How to do it.

1. Define state variables `v`, initial states `init(v)`, transition relation `next(v,v')`, and target predicate `safe(v)` (§2, p. 2)
2. Introduce an existential predicate variable `inv` (§2, p. 2)
3. Generate the three Horn implications: initial states imply `inv`, `inv` is preserved by `next`, and `inv` implies `safe` (§2, p. 2)
4. Give the resulting constraints to a solver; any model of `inv` is a safe forward inductive invariant (§2, p. 2)

Verus form. Inference: state `safe` as an `ensures` clause on the public function and state the inductive relation as a loop `invariant` or a state-machine invariant. Inference: Verus does not expose an existential predicate search in Rust syntax, so an agent must propose the invariant expression and prove it with `requires`, `ensures`, and proof lemmas. The Horn architecture is useful as a backend design: generate obligations from Rust contracts separately from the solver that discharges them.

Evidence and limits. The paper gives the constraint and the statement "Any model of inv is such an invariant." (§2, p. 2), but no implementation measurement for this encoding. The paper does not claim that every solver finds a model of `inv`. Inference: the transition relation and `safe` predicate themselves remain trusted specifications.

## technique 2: switch proof direction without changing the solver

What it is. The same constraint-solving engine can use backward invariants, or both directions. The paper's backward system introduces `binv` such that every unsafe state is in `binv`, `binv` is backward closed through `next`, and no state is both `binv` and safe (§2, p. 2). It then combines `inv` and `binv` and requires their intersection to be false (§2, p. 2).

How to do it.

1. Keep `next` and `safe` fixed (§2, p. 2)
2. For backward reasoning, introduce `binv` and generate `¬safe(v) → binv(v)`, `binv(v') ∧ next(v,v') → binv(v)`, and `binv(v) ∧ safe(v) → false` (§2, p. 2)
3. For combined reasoning, existentially quantify `inv` and `binv`, generate both closure systems, and require `inv(v) ∧ binv(v) → false` (§2, p. 2)

Verus form.

Evidence and limits. The paper says, “All these reasoning approaches can be automated by the same solver, which can be made highly beneficial through consolidation of heuristics, optimizations, and improvements.” (§2, p. 2) Inference: this is an architectural claim, not an evaluation result; the paper does not compare solver success for the three forms. The paper also notes that the proof rule changes "by using the following constraint system (but not the solver/inference engine)" (§2, p. 2).

## technique 3: encode termination and temporal progress with well-founded relations

What it is. Termination adds an existential invariant `inv`, a relation `round`, and a well-foundedness condition `wf(round)`. The paper's clause `inv(v) ∧ next(v,v') → round(v,v')` makes `round` contain every transition from an invariant state, and `wf(round)` then rules out infinite sequences (§2, p. 2). The paper writes `wf` as "a second order predicate wf that holds for well-founded relations" and says each solver can prove well-foundedness "e.g., using abstract interpretation (Cousot and Cousot 2012), ranking functions (Turing 1949) or transition invariants" (§2, p. 2). The displayed termination constraint also contains the clause `¬safe(v) → binv(v)`, with `binv` not quantified; Inference: this looks like a typo carried over from the safety constraints.

For an existential temporal property, the paper encodes `E(p U q)` by requiring that from an invariant state not satisfying `q`, there exists a successor that remains invariant and advances a well-founded `round`; it also requires `inv → p` (§2, p. 3). The paper explains: “Note that we model the existence of a computation by relying on existential quantification in the constraints together with a recursive dependency” (§2, p. 3).

How to do it.

1. Define the initial and transition relations and the progress predicate (§2, pp. 2–3)
2. Existentially quantify `inv` and `round` (§2, p. 2)
3. Require invariant initialization and preservation (§2, p. 2)
4. Require every relevant transition to satisfy `round` and require `wf(round)` (§2, p. 2)
5. For `E(p U q)`, require that whenever `inv(v) ∧ ¬q(v)` there is a `v'` with `next(v,v') ∧ inv(v') ∧ round(v,v')`, require `inv → p`, and require `wf(round)` (§2, p. 3)

Verus form. Inference: prove termination with a decreasing `decreases` measure and a loop invariant; prove temporal progress with a state-machine transition relation and a ghost rank that decreases until the goal state. Inference: Verus's executable Rust still needs a concrete progress measure; the Horn existential search is a design pattern for generating candidate measures, not a direct Verus construct.

Evidence and limits. The paper provides logical encodings and lists well-foundedness techniques, but no measured termination cases. For the temporal case it relies on a cited proof system ("the proof system for CTL* (Kesten and Pnueli 2005)", §2, p. 3) and does not itself prove soundness of the encoding. Inference: a claimed proof relies on the soundness of `wf` and the chosen ranking or transition-invariant inference.

## technique 4: relational information-flow proofs by self-composition

What it is. Security is expressed over pairs of executions. An existential `io(v,v')` relation is initialized, closed over transitions, and constrained on pairs of final states; the paper's stated aim is that "any alternation of a (secret) program input is undetected by observing its (public) output", and it says the program satisfies non-interference "if the following constraint is satisfiable" (§2, p. 3). The paper explicitly says this captures pairs of computations “through self-composition of input/output relation of the program, instead of performing a source-to-source transformation” (§2, p. 3).

How to do it.

1. Define `init`, `next`, and `final` state predicates (§2, p. 3)
2. Existentially quantify `io` and require `init(v)` and `next(v,v')` to imply `io(v,v')` (the printed clause has no connective between `init(v)` and `next(v,v')`; the conjunction is Inference) (§2, p. 3)
3. Require relation closure across transitions (§2, p. 3)
4. Require that `v ≠ w ∧ io(v,v') ∧ io(w,w') ∧ final(v) ∧ final(w')` implies `w = w'`, exactly as printed (§2, p. 3). Inference: the printed conclusion `w = w'` sits oddly next to `v ≠ w`, so the intended clause may differ and the paper does not explain it

Verus form. Inference: define a ghost relational state containing two executions and prove a non-interference `ensures` clause for public outputs. Inference: use a state-machine or proof function to establish relation closure; Rust code need not be duplicated if the proof reasons over two ghost states. The paper's self-composition relation is a direct conceptual fit for a Verus ghost proof, but the exact encoding depends on available Verus specifications.

Evidence and limits. This section is a logical construction without experimental measurements. Inference: it assumes a correct `final` predicate and a suitable background theory, and says nothing about confidentiality of unspecified channels or external effects.

## technique 5: reactive synthesis as a quantified game

What it is. Synthesis introduces an unknown system transition `sys(v,v')` facing an adversarial environment transition `env(v,v')`. The paper says "The system's objective is to reach a state satisfying an assertion goal(v) regardless of environment's behavior" and turns the problem "into a game solving problem (Beyene et al. 2014)"; the solver must find `inv`, `round`, and the `sys` relation (§2, p. 3).

How to do it.

1. Specify `init`, adversarial `env`, desired `goal`, and unknown `sys` transitions (§2, p. 3)
2. Existentially quantify `inv` and `round` (§2, p. 3)
3. Require that `inv(v) ∧ ¬goal(v) ∧ env(v,v')` implies some `v''` with `sys(v',v'') ∧ inv(v'') ∧ round(v,v'')` (§2, p. 3)
4. Require `wf(round)` (§2, p. 3). Inference: this is what forces the system to reach the goal rather than postpone it forever

The paper adds only that "Other temporal objectives can be satisfied by relying on a temporal proof system, akin to temporal verification." (§2, p. 4)

Verus form. Inference: use a ghost state machine with environment and implementation transitions; verify that every allowed environment step has a corresponding implementation step preserving the invariant and decreasing a rank. Inference: Verus can verify a supplied Rust strategy, but this paper's existential synthesis of `sys` would require a separate generator that emits candidate Rust and then discharges Verus contracts.

Evidence and limits. The paper presents the game constraint but no synthesized program sizes, solver times, or success rates. Inference: the unknown transition relation is a mathematical object; compilation, resource bounds, and implementability remain outside the formulation.

## what is proved and what stays trusted

The paper states no theorem. It says of the safety constraint that "Any model of inv is such an invariant" (§2, p. 2), and for temporal properties it points to existing proof systems (§2, p. 3). Inference: in the paper's framework, a satisfying interpretation of the generated predicates is meant to establish the corresponding property over the supplied transition system. The paper does not provide an end-to-end verified solver, benchmark denominator, or empirical accuracy claim. Inference: trusted assumptions include the correctness of `init`, `next`, `safe`, `final`, `goal`, background theories, well-foundedness encoding, solver implementation, and the mapping from a concrete program to constraints. A Verus deployment would additionally trust the Rust-to-formula translation, solver, proof erasure, compiler, and any external-library contracts.

## techniques for the catalog

- Horn obligation separation: generate logical proof obligations from program semantics and solve them with a reusable backend
- forward and backward invariants: encode reachable-safe regions, unreachable-bad regions, or both in one constraint system
- well-founded progress: add ranking or transition relations and `wf` constraints for termination and temporal reachability
- relational self-composition: prove information flow by relating paired executions without source duplication
- quantified reactive synthesis: solve an adversarial environment game for an invariant-preserving system transition relation
- abstraction-based Horn solving: exploit recursion and Horn structure for iterative solver and invariant inference
