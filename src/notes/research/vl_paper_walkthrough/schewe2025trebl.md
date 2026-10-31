# TREBL – A Relative Complete Temporal Event-B Logic. Part I: Theory
(authored by agents unless marked 🧑)
Tag: `schewe2025trebl`, [paper](http://arxiv.org/abs/2509.01462v5)

## scope and result

The paper defines TREBL, a temporal fragment of the logic of Event-B. Its target is liveness (existence, progress, persistence, and reachability) for state-based machines while retaining first-order/set-theoretic state predicates. The central engineering move is to represent one-step and multi-step updates as logical set values. Temporal operators then become derived formulas interpreted over states; machine satisfaction is evaluated at initial states. The authors state: “The verification of liveness conditions is an important aspect of state-based rigorous methods.” (abstract, p. 1). They claim that “We identify a fragment called TREBL of this logic, in which all liveness conditions of interest can be expressed, and define a set of sound derivation rules for the fragment.” (abstract, p. 1)

## technique: Event-B state and transition logic

Use an Event-B machine with state variables, events, guards, before-after predicates, initialization, and invariants. An event has parameters, a guard, and a before-after predicate; an event is enabled when some parameter values satisfy its guard. A successor state satisfies the event's before-after predicate. A trace starts in an initialized state and repeatedly takes event successors; finite traces terminate only at deadlock. The paper gives the operational definition: “Each event ei ∈ E has the form any x̄ where Gi (x̄, v̄) then Ai (x̄, v̄, v̄ ′ ) end, where x̄ are the parameters, the first-order formula Gi (x̄, v̄) is the guard and Ai (x̄, v̄, v̄ ′ ) is the action of ei .” (Section 1.1, p. 6)

How to apply it:
1. Declare state variables and their types (Section 1.1, p. 6).
2. For each operation, write a guard `Gi(x,v)` and before-after relation `PAi(x,v,v')`; deterministic assignment is shorthand for an equality and set-choice assignment for membership (Section 1.1, p. 7).
3. Define initialization and invariant `ι(v)` (Sections 1.1 and 1.3, pp. 7, 9).
4. Discharge initialization `M |= ι` and preservation `M |= ∀v(ι → Nι)`; the latter quantifies all states, including unreachable states, because reachability is undecidable in general (Section 1.3, pp. 9–10).
5. Express local transition facts with `N φ` (all successors), `N¹ φ` (some successor), `leadsto`, `leadslocto`, and `dlf` (Section 1.2, pp. 7–9).

Verus form (Inference): represent states and guards with specification predicates, and each event with a relation between pre-state and post-state. Prove that initialization establishes the invariant and every permitted transition preserves it. A separate scheduling model would determine which event sequences count as executions.

Evidence and limits: the paper's bounded counter example proves preservation of `x ≤ N` by expanding `N(x ≤ N)` to `(x < N → x + 1 ≤ N) ∧ (x > 0 → x − 1 ≤ N)` (Example 1.1, p. 9). This is a proof obligation, not an empirical benchmark. Preservation must hold for every state satisfying the invariant, including unreachable states. The authors explain: “Condition (1.10) requires the preservation of consistency with respect to ι by all events in all states S of M , but there may exist states S satisfying ι that are not reachable from the initial state, i.e. S does not occur in a trace of M , and for such states consistency preservation is obsolete.” (Section 1.3, p. 10).

## technique: update sets and multi-step semantics

To reason about traces without making traces first-class, encode each event's update as a set of `(location, new-value)` pairs. Introduce a logical constant for each state-variable location. `USet_e(x,X)` asserts the guard, before-after predicate, and that `X` contains exactly the event's updates; `USet(X)` existentially selects an enabled event. The paper says: “In order to represent such sets in the logic we need new constants8 ci that are in a one-to-one correspondence with the state variables vi (1 ≤ i ≤ n).” (Section 1.4, p. 10)

Apply it by:
1. Define `USet_e` for every event and `USet` as their disjunction (equations 1.11–1.12, p. 10).
2. Define `[X]φ` to mean that applying the represented update to the current state makes `φ` true; values that do not represent an update set make the modal formula vacuously true (Section 1.4, p. 11).
3. Define the empty multi-step update `USet*(0,X) ↔ X = ∅`.
4. Recursively define `USet*(k+1,X)` by choosing one update `Y`, recursively choosing `Z` after applying `Y`, and composing them with `comp(Y,Z,X)` (equations 1.13–1.14, p. 11).
5. Use update sets only for actual finite transition sequences; account for terminal states with `U*c` when defining eventuality (Sections 1.4–1.5.1, pp. 11–13).

Verus form (Inference): use a ghost map of locations to values and a relation for exactly `k` transitions. Prove that sequential application agrees with update composition, and connect each modeled update to the concrete operation. Require update validity explicitly when interpreting an update as an executable operation.

Evidence: equations (1.11)–(1.14) and the explicit explanation of finite-trace behavior provide the formal construction (pp. 10–12). The paper reports no implementation timing or proof statistics. The construction uses constants representing locations and before-after predicates defining event successors. The text contains an apparent inconsistency. It first says: “For the interpretation of such a formula in a state S with a variable assignment ζ we obtain false, if valS,ζ (X) represents the update set ∆ and the interpretation of φ in the state S + ∆ with assignment ζ gives false.” It then says: “Note that according to this definition we obtain true, if valS,ζ (X) represents the update set ∆ and the interpretation of φ in the state S + ∆ with assignment ζ gives false.” (Section 1.4, p. 11). Inference: use the preceding formal interpretation, but independently validate this semantics before implementing it.

## technique: derive temporal operators over all, one, and selected traces

Define `□φ`, `♢φ`, and `φ U ψ` as shortcuts in the extended state logic. For all-trace ALWAYS, quantify over every natural step count and update set: `∀n∀X(USet*(n,X) → [X]φ)` (equation 1.15, p. 13). EVENTUALLY is obtained by negating the existence of a trace whose every reachable state violates `φ`; the finite-trace correction uses `U* c` (equation 1.16, p. 13). The intended UNTIL meaning requires a `ψ` state with `φ` at every earlier state: “for all traces S0 , S1 , . . . of M there exists some i ≥ 0 with Si |= ψ and Sj |= φ for all j < i.” (Section 1.5.1, p. 13; equation 1.17 is on p. 14).

The same construction gives one-trace operators `□¹`, `♢¹`, and `U¹`: define the intended existence of a trace with the corresponding property using update sets and prefix conditions (equations 1.18–1.20, p. 14). The paper emphasizes the semantic payoff: “This will allow us some generalisations such as temporal formulae that hold over defined sets of traces.” (Section 1.5, p. 12)

For a definable subset, select traces satisfying `♢□χ` (eventually permanently `χ`), then restrict `□χ φ` and `♢χ φ` to those traces. Equations (1.21)–(1.22) add a continuation witnessing the selection condition (pp. 15–16). This removes the earlier tail-homogeneity restriction in the completeness theorem.

Verus form (Inference): encode finite prefixes with ghost sequences, and state universal and existential execution claims separately. Universal claims require reasoning about every permitted transition; existential claims require a compatible witness execution. An unbounded liveness formalization must also specify infinite executions, terminal states, and any scheduler assumptions.

## technique: TREBL liveness fragment and security encodings

TREBL closes the Event-B logic under selected constructors: invariance `Xφ`, reachability `Yφ`, existence `XYφ`, persistence `YXφ`, progress `X(ψ → Yφ)`, and first-order quantifiers, where `X` is `□` or `□¹`, and `Y` is `♢` or `♢¹` (Definition 1.2, pp. 16–17). The inner formula `φ` may itself be in TREBL, while the progress antecedent `ψ` must be in the underlying Event-B logic. UNTIL and selected-trace operators are used in the extended logic, but are excluded from the TREBL grammar. The paper states: “Further note that for the definition of TREBL we only used the operators occurring in the common liveness conditions above, but we did not use U-formulae or definable sets of traces.” (Section 1.6, p. 17).

The security example models a multilevel stack. Guards enforce write-up/read-down access; transition invariants constrain low-clearance stacks and users after each operation. The paper states: “The invariants are organised according to what each class of operation can actually modify.” (Example 1.3, p. 19). To apply this technique, identify each event class, write a primed-variable post-state condition for the resources that must remain unchanged, and prove `□φ_event` by invariant induction. Using the paper’s definition of `fired_i` as the only enabled event with the specified parameters (equation 1.1, p. 7), fairness is expressed as `∀x̄ □(enabled_i(x̄) → ♢fired_i(x̄))` (Example 1.4, p. 19). The PAP2 conference-paper privacy requirement is expressed directly as a transition invariant preventing output of non-final content to non-authors; this is an alternative encoding of that requirement, not a general encoding of bounded deducibility. The authors write: “In essence, BD security requires a relation between different traces to hold, which is beyond the fragment of Lext we are dealing within this article.” (Example 1.5, footnote 15, p. 20).

Verus form (Inference): write one `ensures` predicate per event class over old and new state, then prove a loop or transition dispatcher preserves it. Fairness needs an explicit scheduler assumption or a ranking argument; invariant preservation alone cannot prove that an enabled event is eventually selected. For cross-trace privacy, use a relational proof with two ghost executions; do not claim a single-state invariant proves a two-trace property unless the event-level noninterference condition is strong enough.

## technique: variant-based derivation rules

The paper’s variant rules reduce the liveness proof obligations to well-founded decreases and associated premises. A c-variant `var_c(t,φ)` requires `t ≠ 0` and strict decrease when `φ` holds and an event is enabled. With `□dlf(φ)`, Lemma 2.3 proves `conv(φ)`, corresponding to `□♢¬φ`. Rule E therefore uses `var_c(t,¬φ)` and `□dlf(¬φ)` to prove `□♢φ` (Section 2.2.1, pp. 22–23). An lc-variant weakens the event quantifier to require one decreasing successor and proves one-trace convergence and its mixed variants (Lemma 2.5, pp. 24–25). A d-variant strictly decreases outside the eventual set and never increases inside it; rule P proves `♢□φ` (Lemma 2.7, pp. 26–27). An ld-variant is the one-trace version (Lemma 2.9, pp. 27–28). Mixed persistence uses paired pld/pd variants, with a prefix rank and a suffix rank (Lemmas 2.11–2.14, pp. 28–30). Reachability uses e/e¹ variants that decrease while `¬φ` holds and carry a Boolean flag for the initial condition (Lemmas 2.15–2.17, pp. 30–32).

How to use a variant:
1. Choose a well-founded carrier (usually naturals, finite sets, or a lexicographic product) and a zero/minimum (Section 2.2, pp. 22–32).
2. State the variant formula with universal event preservation for all-trace claims or existential decreasing successors for one-trace claims.
3. For E and P, prove the explicit deadlock-freedom premise `□dlf(¬φ)` (pp. 23, 26). For R and R¹, establish the printed initial flag premise `b=0` and the corresponding variant formula (pp. 30–31).
4. Apply the corresponding rule E, P, or R; for mixed temporal operators use the paired variant and prefix conditions.
5. For progress `□(φ → ♢ψ)`, introduce a simultaneous cd-variant with arguments `(¬ψ,¬χ)` for an intermediate predicate `χ`, plus conditional c-variants guarded by a Boolean that records whether an invariant has been violated (Lemmas 2.18–2.22, pp. 32–37). Diversified progress uses the analogous one-trace transition predicates (Lemmas 2.23–2.25, pp. 37–40).

The paper’s bounded-buffer example instantiates this method with `t′ = N + 1 − buf + 2·req` for progress and `t(buf)=buf` for recurring availability (Section 2.5, pp. 41–43). For eventual quota completion it uses a lexicographic d-variant `(M − produced_count, buf, 1 − req)` (pp. 43–44). These are concrete proof shapes, not performance measurements.

Verus form (Inference): prove ranking lemmas over the transition relation, using natural or lexicographic measures and ghost phase flags as appropriate. A terminating proof function alone does not establish liveness of the modeled system; its premises must cover the executions being claimed.

## technique: conservative refinement and relative completeness

For each required variant, the paper constructs a conservative refinement that adds bookkeeping but preserves the original traces under projection. c/lc/e refinements add a copy of the state, a list, status flags, and (for local convergence/reachability) a counter; d/ld refinements add sets of encountered values and fixed bounding sets; mixed persistence variants add two such pairs and a phase flag. c/lc/e refinements recover original traces by selecting `s=1` states and projecting to original variables (Lemmas 2.4, 2.6, 2.17). d/ld and mixed persistence refinements use projection alone (Lemmas 2.8, 2.10, 2.14; pp. 23–31, Appendix A, pp. 51–56). The key claim is: “We say that we obtain relative completeness, if we can show that whenever M |= φ holds for a machine M satisfying the conditions above and TREBL formula φ, then there exists a derivation, i.e. M ⊢ φ holds.” (Section 3, p. 44)

To apply it, first prove consistency and include every state formula that holds in all reachable states in the invariant; then refine the machine with ghost bookkeeping sufficient to define the required variant; finally apply induction on the rank of the TREBL formula. Theorem 3.1 gives soundness; Theorem 3.2 gives relative completeness under (i) consistency, (ii) invariant closure, and (iii) sufficient refinement (pp. 44–48). Nested temporal constructors are handled by a rank induction and appendix rules (Section 2.4 and Appendix B).

Verus form (Inference): this is analogous to adding ghost fields and ghost transitions while proving a projection/refinement lemma. The concrete Rust API can remain unchanged if ghost fields are erased, but the proof must establish that every concrete execution corresponds to a ghost execution and vice versa. Relative completeness is conditional: it does not say an arbitrary Verus program has an automatically discoverable ranking function.

## technique: prefixes for nested temporal operators

Appendix B extends the variant method when temporal constructors are nested. A Boolean state variable `b` records whether a prefix satisfying `¬φ` has ended; a prefix formula (`pre` for all traces, `pre1` for one trace) forces `b` to change at most once. The subsequent variant is guarded by `b=1`. For example, a prefixed d-variant is `pvard(φ,(t,b),ψ) ≡ pre(¬φ,b) ∧ vard(t,ψ ∧ b=1)` (Appendix B, p. 58). The authors state: “The rules above are for the derivation of TREL formulae, where we use invariance, existence, persistence and reachability constructors inside a progress rule constructor.” (Appendix B.3, p. 60)

Apply this by (i) proving the prefix bookkeeping relation, (ii) proving a variant after the prefix, and (iii) applying the corresponding prefixed rule (`PRE`, `PRP`, `PR¹E`, or `PR¹P`) to obtain nested progress. Prefixes can be combined with simultaneous and conditional variants (`psvarcd` and `pcvarc`) for formulas such as `◇□(φ → ◇ψ)`. Multiple progress operators use `PRPR`/`PR¹PR`, which mask the prefix with `b=1` before applying the inner progress rule (Appendix B, pp. 60–62).

Verus form (Inference): model `b` as ghost phase state and prove a monotonic phase invariant (`b` never returns from 1 to 0). State the inner liveness lemma with `requires b==1`; prove the outer prefix lemma separately. This decomposition prevents an inner ranking argument from being incorrectly applied before the trigger condition occurs. The paper's nested rules remain conditional on the same well-foundedness and deadlock assumptions as the non-nested rules.

## what is proved, measured, and trusted

The paper claims proofs of soundness of the Event-B derivation rules (Theorem 3.1), relative completeness under the three relativity assumptions (Theorem 3.2), and existence of conservative refinements supplying variant terms (Lemmas 2.4, 2.6, 2.8, 2.10, 2.14, 2.17). The paper reports no experimental sample size, runtime, percentage, or benchmark denominator. Trusted: first-order/set-theoretic reasoning, the Event-B semantics and consistency proof obligations, well-foundedness of the chosen variant carriers, and the refinement projection argument. Inference: a Verus implementation would additionally trust the Verus verifier, SMT solver soundness assumptions, and any scheduler model used for liveness.

The paper itself limits scope. Bounded deducibility's relation between traces is outside the presented fragment (Example 1.5, p. 20). Invariant preservation also covers unreachable states satisfying the invariant because reachability is undecidable in general (Section 1.3, p. 10). Relative completeness requires sufficient refinement and does not provide an algorithm that discovers useful variants for an existing implementation. Inference: agent-written verified Rust is threatened mainly at the specification boundary: a model can prove safety while omitting fairness, scheduler behavior, or cross-trace confidentiality. TREBL's explicit variant and refinement discipline is a useful checklist for those omissions.

## techniques for the catalog

- Event-B transition predicates — model guarded parameterized events with before-after relations and prove initialization plus invariant preservation
- update-set temporal encoding — represent one-step and composed multi-step updates as set values and define temporal operators as state formulas
- all/one/selected trace operators — derive universal, existential, and stability-selected temporal claims from update-set reachability
- TREBL liveness fragment — express invariance, existence, progress, persistence, reachability, fairness, and transition security in a restricted temporal grammar
- well-founded variant rules — prove liveness by strict decrease, nonincrease in target states, and deadlock-freedom premises
- simultaneous and conditional variants — discharge progress obligations involving convergence, divergence, intermediate predicates, and phase flags
- conservative refinement — add state copies, lists, sets, counters, and status flags while preserving traces by selection/projection or projection alone
- relative-completeness induction — derive every valid TREBL formula under consistency, invariant closure, and sufficient refinement assumptions
