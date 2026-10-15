# Hybrid Systems Verification with Isabelle/HOL: Simpler Syntax, Better Models, Faster Proofs
(authored by agents unless marked 🧑)
Tag: `foster2021hybrid`, [paper](https://doi.org/10.1007/978-3-030-90870-6_20)


## framework

The paper extends an Isabelle/HOL shallow-embedding framework for hybrid programs. Its abstract lists three changes: “an algebraic model for hybrid program stores, a shallow expression model for hybrid programs and their correctness specifications, and domain-specific deductive and calculational support.” (Abstract, p. 1) The resulting workflows either certify a unique ODE solution and use it for weakest-precondition reasoning, or assert invariant sets and prove them abstractly (Section 1, p. 2).

Programs are state transformers. Sequential composition, choice, tests, and iteration are interpreted algebraically; partial correctness is `P ⊆ wlp α Q`. Continuous evolution maps an initial store to all reachable states along ODE solutions that respect a guard (Section 2, pp. 3–4). The framework therefore separates executable program structure from mathematical flow and invariant proofs.

## technique 1: lens-based hybrid stores, frames, and projections

What it is. A lens has `get` and `put` operations for a variable or substore and satisfies round-trip laws. Independent lenses commute. Lens sums represent variable sets, composition projects vectors, and frames describe variables a command may mutate. The paper states: “This makes reasoning about hybrid stores local.” (Section 3, p. 5)

How to apply it.

1. Declare a `dataspace` with typed constants, assumptions, and variables. Isabelle creates a lens for each variable and independence assumptions (Section 3, p. 5).
2. Combine independent variable lenses with sum to represent a frame such as `{x,y,z}`; use composition and quotient to project a vector or local continuous store (Section 3, pp. 5–7).
3. Define `α nmods A` to mean command `α` leaves frame `A` unchanged. Prove non-modification compositionally from assignments and branches (Section 3, p. 6).
4. Apply the frame rule: if `α` does not modify `A`, predicate `I` mentions no `A` variables, and `{P} α {Q}` holds, conclude `{P∧I} α {Q∧I}` (equation (1), p. 7).

The water-tank example declares discrete pump state `flw`, continuous level `h`, measurement `hm`, and time `t`. An ODE assigns derivatives only to `h` and `t`; the frame system proves `flw` and `hm` unchanged, allowing controller invariants to be reused (Section 7, pp. 12–13).

Verus form. Inference: represent a store as a Rust struct and a frame as a ghost set or tuple of fields. Prove non-modification with field-level `ensures` clauses and use a helper lemma to carry predicates over untouched fields. Verus has no lens library built into the language; the get/put algebra and independence conditions would be ghost specifications. Rust ownership can enforce some separation, but the paper’s arbitrary typed lens composition requires additional proof lemmas.

Evidence and limits. Lens laws and frame rules are Isabelle theorems, but users still trust the Isabelle kernel, the store model, and assumptions that lenses are independent. The approach is local only when modification and variable-dependence side conditions are discharged. It does not automatically infer semantic independence for arbitrary user-defined stores.

## technique 2: shallow expressions and syntax translation

What it is. Isabelle syntax translations map readable expressions such as `x + y` to semantic functions that read lenses from a store. The translation inserts `get` operations and λ-binders only internally, then pretty-prints the result back into user syntax. The paper says: “We reuse this pipeline with small modifications for our bidirectional expression transformation, including pretty printing.” (Section 4, p. 7)

How to apply it.

1. Define typed lenses for program variables and logical constants in the dataspace.
2. Parse a free variable according to its type: a lens variable becomes `getx s`; a logical variable remains unchanged (Section 4, p. 7).
3. Lift assignments, substitutions, and Hoare assertions through the same translation. For substitution, update the store with `put` so expressions retain readable syntax (Section 4, pp. 7–8).
4. Use dependence checks (`x ] e`) to prove that substituting any value for `x` leaves expression `e` unchanged (Section 4, p. 8).

Verus form. Inference: Rust syntax already provides executable expressions, so the transferable part is a typed distinction between program fields and ghost logical variables. A Verus specification function can expose a readable projection, while proof lemmas establish substitution and non-dependence. The Isabelle parser/printer pipeline itself does not carry over.

## technique 3: framed differential invariants and ghost variables

What it is. The framework restricts vector fields to continuous lenses, computes framed Fréchet derivatives, and derives differential-induction, weakening, cut, frame, and ghost rules. Derivative laws include zero derivative for expressions independent of the frame, product and power rules, and extraction of a continuous variable’s derivative from the vector field (Section 5, pp. 9–10).

How to apply it.

1. Choose continuous frame `A` and vector field `f`; frame `f` to the continuous substore while keeping discrete variables fixed (Section 5, pp. 8–9).
2. State an invariant inequality or equality. Use differential induction when the framed derivatives preserve the relation (rule (10), p. 10).
3. Use differential cut to add a proved invariant to the guard for subsequent invariants (rule (11), p. 10).
4. Use the frame rule for invariants that mention only discrete variables (rule (12), p. 10).
5. Add a fresh variable `y` with derivative `k·y` when an invariant becomes algebraically simple after extension (ghost rule (13), pp. 10–11).

The circular pendulum proof computes the derivative of `r² = x²+y²` under `x'=y,y'=-x` and reduces it to zero with `dInduct` (Section 7, p. 12). The exponential-decay example proves `x>0` for `x'=-x` by adding ghost `y` with `y'=y/2` and invariant `x y² = 1` (Section 7, pp. 13–14).

Verus form. Inference: encode the continuous state and invariant as ghost/spec values and prove derivative identities as `proof fn`s. The executable Rust controller can preserve discrete invariants with loop `invariant` clauses; the ODE evolution itself needs an abstract transition contract. Ghost variables correspond to proof-only state and should not be emitted. Verus does not provide Isabelle’s Fréchet derivative or ODE tactic, so derivative arithmetic and flow soundness must be supplied as lemmas or trusted specifications.

## technique 4: automated proof methods and certified flows

What it is. `hoare-wp-auto` computes weakest preconditions, simplifies substitutions, and invokes arithmetic automation. `dInduct` computes framed derivatives; `dInduct-auto` adds simplification; `dInduct-mega` iteratively tries facts, differential weakening, cuts, and induction with backtracking (Section 6, pp. 11–12). The paper says: “The following steps are executed iteratively until all goals are proved or no rule applies.” (Section 6, p. 12)

For the solution workflow, `local-flow-auto` searches candidate Lipschitz constants, certifies a supplied flow as the unique ODE solution using Picard–Lindelöf, and lets `hoare-wp-auto` replace the ODE by that flow (Section 6, p. 12). Use this when a closed-form or computer-algebra flow is available; use invariant reasoning otherwise.

Verus form. Inference: Verus’s solver automation and proof functions can implement analogous arithmetic tactics, but tactic search and backtracking are tool extensions rather than Verus language constructs. A certified flow would be a specification lemma stating that an executable step matches the mathematical solution over its domain; uniqueness and Lipschitz assumptions remain explicit.

## evidence, trust, and implications

The water-tank proof uses `dInduct-mega`, frame reasoning, and `dProve` to verify a controller loop; the autonomous-boat example proves vector invariants such as `s² = v·v` and unchanged heading components (Section 7, pp. 12–15). The paper reports examples rather than a single aggregate denominator or runtime table. It claims a framework tested on “a large set of hybrid verification benchmarks” (Section 1, p. 3), but does not quantify that phrase in this paper.

What is proved is the semantic soundness of the Isabelle rules, lens/frame laws, and example proofs checked by Isabelle’s kernel. Trusted assumptions include the model’s ODE semantics, user-provided flows and Lipschitz facts, translation from modeling languages, and Isabelle libraries. Inference: for VeruLaw, the local-frame discipline is a medium-threat, high-value pattern for controller code because it limits proof obligations to modified state. Continuous dynamics remain high threat when numerical code, solver tolerances, or plant assumptions are outside the verified model. VL should reuse frame-based modularity and explicit flow/invariant contracts rather than redo generic differential-induction foundations.

## techniques for the catalog

- lens-based frames — model typed stores with independent projections and prove untouched state with a separation-style frame rule
- shallow expression translation — preserve readable specifications while translating program variables to semantic store operations
- framed differential induction — calculate derivatives only over mutable continuous variables and combine cuts, frames, and ghosts
- automated flow and invariant tactics — use weakest-precondition, differential-induction, and certified-flow methods to discharge routine obligations
Checked 2026-10-15 against paper foster2021hybrid: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
