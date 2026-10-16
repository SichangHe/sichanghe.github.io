# (Quantified) Horn Constraint Solving for Program Verification and Synthesis
(authored by agents unless marked 🧑)
Tag: `rybalchenko2014quantified`, [paper](http://arxiv.org/abs/1405.7739v1)

## what the paper contributes

This paper gives a common encoding for verification and synthesis. Its claim is that “automatic tools for the verification of linear and branching time properties of procedural, multi-threaded, and functional programs as well as program synthesis can be naturally and uniformly seen as solvers of constraints in form of (quantified) Horn clauses over background logical theories.” (Abstract, p. 1) The architecture separates generating proof obligations from discovering a solution. The paper says this gives “a logical separation of concerns between constraint generation (also known as generation of proof obligations) and constraint solving (also known as proof discovery)” (Abstract, p. 1).

The paper is a formulation paper, not an implementation benchmark. It writes constraint systems for safety, backward safety, combined forward/backward reasoning, termination, information flow, temporal properties, and reactive synthesis (§2, pp. 2–4), then characterizes solver families (§3, p. 4). No experimental denominator, runtime, or success percentage is reported.

## technique 1: encode safety as existential invariant constraints

What it is. Represent a program by `init(v)` and `next(v,v')`. To prove `safe(v)` for every reachable state, ask a solver to find an invariant `inv` satisfying initiality, inductiveness, and safety. The paper's displayed constraint is:

`∃inv: (∀v: init(v) → inv(v)) ∧ (∀v∀v': inv(v) ∧ next(v,v') → inv(v')) ∧ (∀v: inv(v) → safe(v))` (§2, p. 2).

When to use it. Use it when the program's transition relation and safety predicate can be expressed in a background theory supported by the Horn solver. A satisfying interpretation for `inv` is the inductive invariant.

How to do it.

1. Define state variables `v`, initial states `init(v)`, transition relation `next(v,v')`, and target predicate `safe(v)` (§2, p. 2)
2. Introduce an existential predicate variable `inv` (§2, p. 2)
3. Generate the three Horn implications: initial states imply `inv`, `inv` is preserved by `next`, and `inv` implies `safe` (§2, p. 2)
4. Give the resulting constraints to a solver; any model of `inv` is a safe forward inductive invariant (§2, p. 2)

Verus form. Inference: state `safe` as an `ensures` clause on the public function and state the inductive relation as a loop `invariant` or a state-machine invariant. Inference: Verus does not expose an existential predicate search in Rust syntax, so an agent must propose the invariant expression and prove it with `requires`, `ensures`, and proof lemmas. The Horn architecture is useful as a backend design: generate obligations from Rust contracts separately from the solver that discharges them.

Evidence and limits. The paper gives the constraint and its logical interpretation, but no implementation measurement for this encoding. The result depends on finding a model of `inv`; the paper does not claim that every solver finds one. The transition relation and `safe` predicate themselves remain trusted specifications.

## technique 2: switch proof direction without changing the solver

What it is. The same constraint-solving engine can use backward invariants, or both directions. The paper's backward system introduces `binv` such that every unsafe state is in `binv`, `binv` is backward closed through `next`, and no state is both `binv` and safe (§2, p. 2). It then combines `inv` and `binv` and requires their intersection to be false (§2, p. 2).

How to do it.

1. Keep `next` and `safe` fixed (§2, p. 2)
2. For backward reasoning, introduce `binv` and generate `¬safe(v) → binv(v)`, `binv(v') ∧ next(v,v') → binv(v)`, and `binv(v) ∧ safe(v) → false` (§2, p. 2)
3. For combined reasoning, existentially quantify `inv` and `binv`, generate both closure systems, and require `inv(v) ∧ binv(v) → false` (§2, p. 2)

Verus form. Inference: encode the forward invariant as the normal loop or state-machine invariant and the backward predicate as a ghost `spec fn` over states, with proof lemmas establishing disjointness. Inference: this can guide VL's proof search: try a forward invariant, a backward “bad-state” barrier, or both, while keeping the executable Rust unchanged.

Evidence and limits. The paper says, “All these reasoning approaches can be automated by the same solver, which can be made highly beneficial through consolidation of heuristics, optimizations, and improvements.” (§2, p. 2) This is an architectural claim, not an evaluation result. The paper does not compare solver success for the three forms.

## technique 3: encode termination and temporal progress with well-founded relations

What it is. Termination adds an existential invariant `inv`, a transition relation `round`, and a well-foundedness condition `wf(round)`. The closure clause requires every transition from an invariant state to decrease according to `round` (§2, p. 2). The paper notes that a solver may establish well-foundedness with abstract interpretation, ranking functions, or transition invariants (§3, p. 4).

For an existential temporal property, the paper encodes `E(p U q)` by requiring that from an invariant state not satisfying `q`, there exists a successor that remains invariant and advances a well-founded `round`; it also requires `inv → p` (§2, pp. 3–4). The paper explains: “Note that we model the existence of a computation by relying on existential quantification in the constraints together with a recursive dependency” (§2, p. 3).

How to do it.

1. Define the initial and transition relations and the progress predicate (§2, pp. 2–3)
2. Existentially quantify `inv` and `round` (§2, p. 2)
3. Require invariant initialization and preservation (§2, p. 2)
4. Require every relevant transition to satisfy `round` and require `wf(round)` (§2, p. 2)
5. For `E(p U q)`, require a successor preserving `inv` and `round` whenever `q` is false, and require `inv → p` (§2, p. 3)

Verus form. Inference: prove termination with a decreasing `decreases` measure and a loop invariant; prove temporal progress with a state-machine transition relation and a ghost rank that decreases until the goal state. Inference: Verus's executable Rust still needs a concrete progress measure; the Horn existential search is a design pattern for generating candidate measures, not a direct Verus construct.

Evidence and limits. The paper provides logical encodings and lists solver techniques, but no measured termination cases. A claimed proof relies on the soundness of `wf` and the chosen ranking or transition-invariant inference.

## technique 4: relational information-flow proofs by self-composition

What it is. Security is expressed over pairs of executions. An existential `io(v,v')` relation is initialized, closed over transitions, and required to relate final states so that changing a secret input cannot change the public output (§2, p. 3). The paper explicitly says this captures pairs of computations “through self-composition of input/output relation of the program, instead of performing a source-to-source transformation” (§2, p. 3).

How to do it.

1. Define `init`, `next`, and `final` state predicates (§2, p. 3)
2. Existentially quantify `io` and require initial states to relate to their successors (§2, p. 3)
3. Require relation closure across transitions (§2, p. 3)
4. For distinct initial states, require related final states to agree on the public result (§2, p. 3)

Verus form. Inference: define a ghost relational state containing two executions and prove a non-interference `ensures` clause for public outputs. Inference: use a state-machine or proof function to establish relation closure; Rust code need not be duplicated if the proof reasons over two ghost states. The paper's self-composition relation is a direct conceptual fit for a Verus ghost proof, but the exact encoding depends on available Verus specifications.

Evidence and limits. This section is a logical construction without experimental measurements. It assumes a correct `final` predicate and a suitable relational background theory; it does not prove confidentiality of unspecified channels or external effects.

## technique 5: reactive synthesis as a quantified game

What it is. Synthesis introduces an unknown system transition `sys(v,v')` facing an adversarial environment transition `env(v,v')`. The solver must find `inv`, `round`, and a system move that reaches `goal` regardless of environment behavior (§2, pp. 3–4).

How to do it.

1. Specify `init`, adversarial `env`, desired `goal`, and unknown `sys` transitions (§2, p. 4)
2. Existentially quantify `inv` and `round` (§2, p. 4)
3. Require an invariant-preserving system successor for every environment successor while `goal` is false (§2, p. 4)
4. Require `wf(round)` so the strategy reaches the goal (§2, p. 4)

Verus form. Inference: use a ghost state machine with environment and implementation transitions; verify that every allowed environment step has a corresponding implementation step preserving the invariant and decreasing a rank. Inference: Verus can verify a supplied Rust strategy, but this paper's existential synthesis of `sys` would require a separate generator that emits candidate Rust and then discharges Verus contracts.

Evidence and limits. The paper presents the game constraint but no synthesized program sizes, solver times, or success rates. The unknown transition relation is a mathematical object; compilation, resource bounds, and implementability remain outside the formulation.

## solver architecture and implications for VL

The paper groups solvers by recursion-only safety, well-founded extensions for liveness, universal quantification for quantified invariants, and existential quantification for synthesis and branching-time questions (§3, p. 4). It reports that “Solvers often take advantage of the fact that constraints have Horn-like structure, which enables iterative, abstraction based solving approaches.” (§3, p. 4) Constraint logic programming is identified as an implementation route, including HSF and extensions (§3, p. 4).

Inference: VL could separate Rust/Verus obligation generation from proof search, allowing invariant, ranking, and relational solvers to be reused across APIs. Inference: this is a threat to a product that treats one solver strategy as the verifier itself: changing proof direction or adding a progress relation can materially alter what is discoverable without changing the executable Rust. Inference: the paper already supplies the generic encodings VL should not re-invent as product-specific ad hoc checks. VL's product risk is specification risk: a satisfiable Horn model proves the generated predicates, not that those predicates capture the real system requirement. The paper measures no implementation reliability, runtime, or trusted-base reduction, so those remain open engineering questions.

## what is proved and what stays trusted

Proved, in the paper's framework, is that a satisfying interpretation of the generated predicates establishes the corresponding logical property over the supplied transition system. The paper does not provide an end-to-end verified solver, benchmark denominator, or empirical accuracy claim. Trusted assumptions include the correctness of `init`, `next`, `safe`, `final`, `goal`, background theories, well-foundedness encoding, solver implementation, and the mapping from a concrete program to constraints. Inference: a Verus deployment additionally trusts the Rust-to-formula translation, solver, proof erasure, compiler, and any external-library contracts.

## techniques for the catalog

- Horn obligation separation: generate logical proof obligations from program semantics and solve them with a reusable backend
- forward and backward invariants: encode reachable-safe regions, unreachable-bad regions, or both in one constraint system
- well-founded progress: add ranking or transition relations and `wf` constraints for termination and temporal reachability
- relational self-composition: prove information flow by relating paired executions without source duplication
- quantified reactive synthesis: solve an adversarial environment game for an invariant-preserving system transition relation
- abstraction-based Horn solving: exploit recursion and Horn structure for iterative solver and invariant inference
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
