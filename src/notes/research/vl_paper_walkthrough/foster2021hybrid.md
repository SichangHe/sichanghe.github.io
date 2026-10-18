# Hybrid Systems Verification with Isabelle/HOL: Simpler Syntax, Better Models, Faster Proofs
(authored by agents unless marked 🧑)
Tag: `foster2021hybrid`, [paper](https://arxiv.org/abs/2106.05987)


## framework

The paper extends an Isabelle/HOL shallow-embedding framework for hybrid programs. Its abstract lists three changes: “an algebraic model for hybrid program stores, a shallow expression model for hybrid programs and their correctness specifications, and domain-specific deductive and calculational support.” (Abstract, p. 1) The resulting workflows either certify a unique ODE solution and use it for weakest-precondition reasoning, or assert invariant sets and prove them abstractly (Section 1, p. 2).

Programs are state transformers. Sequential composition, choice, tests, and iteration are interpreted algebraically; partial correctness is `P ⊆ wlp α Q`. Continuous evolution maps an initial store to all reachable states along ODE solutions that respect a guard (Section 2, pp. 3–4). Inference: the framework therefore separates program structure from the mathematical flow and invariant proofs.

## technique 1: lens-based hybrid stores, frames, and projections

What it is. A lens has `get` and `put` operations for a variable or substore and satisfies round-trip laws. Independent lenses commute. Lens sums represent variable sets, composition projects vectors, and frames describe variables a command may mutate. The paper states: “This makes reasoning about hybrid stores local.” (Section 3, p. 5)

How to apply it.

1. Declare a `dataspace` with typed constants, assumptions, and variables. Isabelle creates a lens for each variable and independence assumptions (Section 3, p. 5).
2. Combine independent variable lenses with sum to represent a frame such as `{x,y,z}`; use composition and quotient to project a vector or local continuous store (Section 3, pp. 5–7).
3. Define `α nmods A` to mean command `α` leaves frame `A` unchanged. Prove non-modification compositionally: `(x := e) nmods A` when `x` is independent of `A`, and sequential composition and `if` preserve `nmods A` when their components do (Section 3, p. 6).
4. Apply the frame rule: if `α nmods A`, `(−A) ] I` (the paper's side condition that `I` does not depend on `−A`), and `{P} α {Q}` holds, conclude `{P∧I} α {Q∧I}` (equation (1), p. 6). Inference: in the water-tank use, `I` is `flw = F` and `A` is `{flw, hm}`, so `I` mentions only variables in `A`, not outside it.

The water-tank example declares discrete pump state `flw`, continuous level `h`, measurement `hm`, and time `t`. An ODE assigns derivatives only to `h` and `t`; the lemma `dyn nmods {flw, hm}` is proved by `simp add: closure`, and the frame rule then shows `flw = F` is preserved by the ODE (Section 7, pp. 12–13).

Verus form. Inference: represent a store as a Rust struct and a frame as a ghost set or tuple of fields. Prove non-modification with field-level `ensures` clauses and use a helper lemma to carry predicates over untouched fields. The get/put algebra and independence conditions would have to be written as ghost specifications unless a library supplies them (not checked against Verus). Rust ownership may enforce some separation, but the paper’s arbitrary typed lens composition would need additional proof lemmas.

Evidence and limits. The paper derives the frame rule and states the side conditions `α nmods A` and `(−A) ] I`. Inference: users still trust the Isabelle kernel, the store model, and the lens independence assumptions the `dataspace` command generates; the approach is local only when those side conditions are discharged; the paper does not discuss stores beyond the ones it generates.

## technique 2: shallow expressions and syntax translation

What it is. Isabelle syntax translations map readable expressions such as `x + y` to semantic functions that read lenses from a store. The translation inserts store variables and λ-binders, and the pretty printer then prints the result back into user syntax. The paper says: “We reuse this pipeline with small modifications for our bidirectional expression transformation, including pretty printing.” (Section 4, p. 7)

How to apply it.

1. Define typed lenses for program variables and logical constants in the dataspace.
2. Parse a free variable according to its type: a lens variable becomes `λs. getx s`; otherwise it is left as a logical variable (Section 4, p. 7).
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
5. Add a fresh variable `y` (with `y ./ x` and `y ] (G, e)`) with derivative `y' = k·y` for a constant `k`, to show `∃v. I[v/y]` invariant when `I` is an invariant of the extended system (ghost rule (13), pp. 10–11). The paper says the extension makes the new invariant easy to prove with rules (10)–(12) and limits the derivative of `y` to `k·y`.

The circular pendulum proof computes the derivative of `r² = x²+y²` under `x'=y,y'=-x` and reduces it to zero with `dInduct` (Section 7, p. 12). The exponential-decay example proves `x>0` for `x'=-x` by adding ghost `y` with `y'=y/2` and invariant `x y² = 1` (Section 7, pp. 13–14).

Verus form. Inference: encode the continuous state and invariant as ghost/spec values and prove derivative identities as `proof fn`s. The executable Rust controller can preserve discrete invariants with loop `invariant` clauses; the ODE evolution itself needs an abstract transition contract. Ghost variables correspond to proof-only state and should not be emitted. Verus does not provide Isabelle’s Fréchet derivative or ODE tactic, so derivative arithmetic and flow soundness must be supplied as lemmas or trusted specifications.

## technique 4: automated proof methods and certified flows

What it is. `hoare-wp-auto` computes `wlp` by simplification, reduces substitutions and side conditions, and then applies the baseline tactic `expr-auto` to the remaining goals. `dInduct` computes framed derivatives; `dInduct-auto` applies `expr-auto` after `dInduct` plus further HOL-Analysis simplification lemmas; `dInduct-mega` iteratively tries facts, differential weakening, cuts, and induction with backtracking (Section 6, pp. 11–12). The paper says: “The following steps are executed iteratively until all goals are proved or no rule applies” (Section 6, p. 12).

For the solution workflow, `local-flow` certifies that a supplied flow is the unique solution to an ODE; `local-flow-auto` tries several Lipschitz constants, “such as 0.5, 1 and 2”; the Picard–Lindelöf theorem can then be given to `hoare-wp-auto`, which replaces the ODE by its local flow (Section 6, pp. 11–12). The paper says flows can be supplied using a computer algebra system. Inference: use this when a closed-form flow is available and invariant reasoning otherwise.

Verus form. Inference: Verus’s solver automation and proof functions might support analogous arithmetic steps, but Eisbach-style tactic search and backtracking have no direct counterpart (not checked against Verus). A certified flow would be a specification lemma stating that an executable step matches the mathematical solution over its domain; uniqueness and Lipschitz assumptions remain explicit.

## evidence, trust, and implications

The water-tank proof uses `dInduct-mega`, frame reasoning, and `dProve` to verify a controller loop; the autonomous-boat example proves vector invariants such as `s² = v·v` and unchanged velocity and orientation `φ` when `a = 0` (Section 7, pp. 12–15). The paper reports examples rather than a single aggregate denominator or runtime table. It claims a framework tested on “a large set of hybrid verification benchmarks” (Section 1, p. 3), but does not quantify that phrase in this paper.

The paper states its rules as theorems proved in Isabelle/HOL and presents example proofs. Inference: trusted assumptions include the model’s ODE semantics, user-provided flows and Lipschitz facts, any future translation from modelling languages (the paper lists Modelica as future work), and Isabelle libraries. Inference: for VeruLaw, the local-frame discipline is a medium-threat, high-value pattern for controller code because it limits proof obligations to modified state. Continuous dynamics remain high threat when numerical code, solver tolerances, or plant assumptions are outside the verified model. VL should reuse frame-based modularity and explicit flow/invariant contracts rather than redo generic differential-induction foundations.

## techniques for the catalog

- lens-based frames — model typed stores with independent projections and prove untouched state with a separation-style frame rule
- shallow expression translation — preserve readable specifications while translating program variables to semantic store operations
- framed differential induction — calculate derivatives only over mutable continuous variables and combine cuts, frames, and ghosts
- automated flow and invariant tactics — use weakest-precondition, differential-induction, and certified-flow methods to discharge routine obligations
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We have developed a proof method called local-flow for certifying that a flow is the unique solution to an ODE."): read the whole paper text; checked the quotations, section and page references, rule and equation numbers, the frame-rule side condition, the technique steps and the water-tank, pendulum, decay and boat examples; changed the frame-rule step (page 6, side condition `(−A) ] I`), tool-description details in techniques 2 and 4, the ghost-rule step, the boat summary, and marked unsupported gloss as Inference; replaced the DOI link with the arXiv link from the paper text; did not check the Verus comparisons against Verus documentation, the DOI target, or the Isabelle proofs.
