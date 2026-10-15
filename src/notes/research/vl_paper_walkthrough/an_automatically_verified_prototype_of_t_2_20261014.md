# An Automatically Verified Prototype of the Android Permissions System
(authored by agents unless marked 🧑)
Tag: `cristia2022verified`, [paper](https://doi.org/10.21203/rs.3.rs-2088594/v1)

## scope and contribution

The paper presents a translation of an existing Coq Android-permissions model into {log}, a finite-set and relation constraint solver. The target is an executable prototype whose same clauses can be run and queried for proofs. The authors state: “The present work aims at showing that {log} [9]—a satisfiability solver and a constraint logic programming language—can be used as an effective automated prover for the class of proofs that must be discharged in the formal verification of systems such as the one carried out by De Luca and Luna.” (section 1, PDF page 2). The source Coq development contains a 13-component abstract state, 22 operations, and 14 analyzed properties (section 2.2, PDF pages 4–9).

Inference: For VL, the transferable pattern is to keep a high-level state-and-transition specification, but encode solver-friendly constraints so automation can discharge most obligations and leave a small residual set to a stronger prover.

## technique: encode a state machine with explicit validity invariants

What it is. The Coq model represents `System` as `State` plus `Environment`; state contains installed apps, previously verified apps, granted permission groups, and per-application permissions, while environment contains immutable manifests and defined permissions (section 2.2.1, PDF pages 4–5). A valid state is a conjunction of 13 predicates, including uniqueness of user-defined permission identifiers and map well-formedness. The paper gives the rule: “The definition of the valid state property is the result of conjoining 13 different predicates, which are defined within 200 lines of code (file Estado.v).” (section 2.2.1, PDF page 5).

When to use it. Use this decomposition when a verified system has a large record and each operation should preserve independent structural conditions. Proving each invariant separately avoids irrelevant hypotheses.

How to do it.

1. Define a record for dynamic state and a record for static environment (section 2.2.1, PDF pages 4–5).
2. Define validity predicates such as uniqueness (`notDupPerm`) and partial-map checks (`allMapsCorrect`) over the record (Figures 2–3, PDF pages 5–6).
3. For each action, define precondition and postcondition, then state that every valid pre-state and successful transition imply a valid post-state (Lemma 1, PDF page 7).
4. In {log}, encode each invariant separately and query `neg(I_k(S) & a(S,S_) implies I_k(S_))` (section 4.1, PDF page 15). The authors explain why: “This is so because attempting to prove Lemma 1 may make {log} to incur in a lengthy computation due to the presence of unnecessary hypothesis.” (section 4.1, PDF page 15).

Verus form. Inference: model `System` as a Rust struct containing state and environment, make the transition a `spec fn` or proof-level relation, and state each invariant as a `spec fn` predicate. A verified executable operation can use `requires` for the precondition, `ensures` for the postcondition, and `assert`/`assert forall` to expose facts needed by the SMT solver. For a loop, use a `while` invariant; do not model a `spec fn` as executable code. The decomposition into separate lemmas carries over, while {log}’s relational `pfun` primitive does not.

Evidence and limits. {log} discharged all 13 invariance lemmas, represented by 756 queries, in 920 seconds on the stated 4-core i7-6600U, 8-GB Ubuntu machine (Table 1 and section 4.3, PDF pages 18–19). The result assumes that the state predicates and transition encoding accurately represent Android; it does not prove the Android implementation itself.

## technique: translate records and quantified predicates into solver-native sets and relations

What it is. Coq lists and mappings are represented as finite sets and binary relations in {log}; fields are tuple components accessed through predicates. The paper notes: “More importantly, the type of each component of system is different from (although equivalent, in some sense) to the corresponding Coq type.” (section 3, PDF page 12). For example, a Coq list is represented by a finite set, and a mapping by `rel(idApp,set(idGrp))` constrained with `pfun`.

How to do it.

1. Make all implicit Coq parameters explicit in each {log} clause (section 3, PDF pages 10–11).
2. Encode records as tuples and define field-access predicates using unification (Figure 7 and section 3, PDF page 12).
3. Replace list membership and map lookup with set membership, relation composition, and `applyTo` (section 3, PDF pages 12–13).
4. Replace unrestricted Coq universal quantifiers with restricted universal quantifiers (RUQs) over finite sets. The paper’s rule is: “Therefore, as a general rule, we turn Coq’s universal quantifications into {log}’s RUQ.” (section 4.1, PDF page 14).
5. Split a predicate with disjunctive cases into separate clauses; `notDupPerm` becomes three clauses according to whether permissions come from application definitions or the system image (section 4.1, PDF pages 14–15).

Verus form. Inference: use Rust `Seq`/`Set` specifications only where the Verus library and existing VL patterns support them; otherwise represent maps with a sequence plus uniqueness invariant or a map abstraction already documented for Verus. State map-function properties as predicates and prove them with `requires`/`ensures`; use quantified `forall` in `assert` or invariant blocks, not {log}-specific RUQ syntax. The semantic warning carries over: changing list semantics to set semantics loses order and duplicates, so the invariant must state when that abstraction is sound.

Evidence and limits. The translation enables the exact same clause to execute as a prototype and to serve as a formula. However, the authors explicitly warn that formula-program duality “pays the price of reduced efficiency.” (section 2.3, PDF page 10). Inference: a Verus encoding should preserve executable data structures when runtime behavior matters instead of replacing them wholesale with mathematical sets.

## technique: encode updates as primitive relational constraints

What it is. Rather than copy Coq’s quantified `grantPerm` definition, the {log} model uses `foplus` to replace one relation image. Figure 7 encodes `grantAuto` by checking manifest membership, dangerous protection level, group authorization, and then applying `foplus(Perms,A,{P/PS},Perms_)` (section 3, PDF pages 10–13). The authors explain: “Therefore, line 11 is equivalent to state that (perms (state s)) is equal to (perms (state s’)) except in app where either (app,{p}) is added to (perms (state s)) or the new image of app is its old image plus {p}.” (section 3, PDF page 13).

How to do it.

1. Identify a quantified update relation in the source model (Figure 4, PDF pages 7–8).
2. Replace it with a primitive update constraint whose semantics is known to the solver (`foplus`) (section 3, PDF page 13).
3. Keep unchanged state components tied by an update predicate (`updateGrantAuto`) (section 3, PDF page 13).
4. Query the resulting transition both for execution and for satisfiability proofs (Remark 3, PDF page 13).

Verus form. Inference: write a pure Rust update function returning a new struct or cloned map, and prove frame properties with `ensures` clauses stating that unrelated fields are unchanged and only the target key changes. Use a `forall` assertion over keys for the frame condition; use `old(...)` in postconditions when comparing pre-state values. The solver-specific `foplus` primitive has no direct Verus equivalent.

## technique: prove properties by negated satisfiability queries and classify obligations

What it is. A property is proved by asking {log} to satisfy its negation. `false` means no counterexample exists; a returned assignment is a witness/counterexample. The authors state: “Every time we get a false answer we know that the query is unsatisfiable meaning that its negation is a theorem.” (section 4, PDF page 13). They classify properties as operation-sequence properties, existential properties, and universal properties (section 4.2, PDF page 16).

How to do it.

1. For an invariant, query the negation of preservation (`neg(I_k(S) & a(S,S_) implies I_k(S_))`) (section 4.1, PDF page 15).
2. For an existential claim, execute a clause and inspect the generated witness; `ExecAutoGrantWithoutIndividualPerms` returns a concrete vulnerable state (section 4.2, PDF pages 16–17).
3. For a universal safety claim, encode the negated implication; `CannotAutoGrantWithoutGroup` returns `false` when no violating transition exists (section 4.2, PDF page 17).
4. If a query is satisfiable unexpectedly, use its assignment as a counterexample to the model or property (section 4.2, PDF page 17).
5. For sequence properties that cannot be expressed directly, first prove an invariant for every operation, then use that invariant to establish the sequence claim (section 4.2, PDF page 16).

Verus form. Inference: encode universal safety directly as `ensures` on a transition or as a separate proof function; use `assert` to force the negated case and let Verus close it, or introduce a lemma that derives `false` from a hypothetical violating state. Existential witnesses require a constructive proof function that returns a value satisfying the predicate. Verus does not provide {log}’s automatic model extraction, so counterexamples are usually solver diagnostics or manually constructed test states.

Evidence. Of 27 Coq properties, {log} discharged 24 (13 invariance and 11 security) through 801 queries in 1,302 seconds; the 11 security properties used 45 queries and 381 seconds (Table 1, PDF pages 18–19). Three security properties remained manual Coq proofs, requiring under 500 lines, about 2% of the total Coq proof effort (section 5, PDF page 21). The denominator is 27 properties, not 801 queries; 24/27 is approximately 89%, reported as “≈ 90%” by the authors.

## technique: control solver complexity by minimizing hypotheses and delaying predicates

What it is. The authors reduce search by removing assumptions that do not contribute to a proof and delaying expansion of predicates until other constraints are processed (section 5, PDF pages 20–21). This addresses the computational complexity wall reached by automated proof.

How to do it.

1. Determine which hypotheses are needed for the target conclusion.
2. Drop irrelevant conjuncts from the query (hypothesis minimization) (section 5, PDF page 20).
3. Mark expensive predicates for delayed processing with {log}’s `delay` directive (section 5, PDF page 20).
4. Generate invariant queries automatically from annotated operation and invariant clauses; the paper reports that 90% of {log} proof text consists of generated invariance statements (section 4.3, PDF page 19).

Verus form. Inference: expose only relevant facts with local `assert` statements, keep expensive definitions opaque until a lemma needs them, and split large proofs into lemmas with narrow `requires`. The exact {log} `delay` directive is unavailable; Verus’s trigger and opacity behavior must be used according to the project’s documented constructs.

## what is proved, measured, and trusted

The proved claims are properties of the encoded Android abstract model: valid-state preservation and selected security properties. The measured claims are code size and solver time under one machine/tool setup. The trusted base includes the semantics and implementation of Coq, {log}, SWI-Prolog, the translation, and the correctness of the model’s abstraction from Android. Inference: a VL product would additionally trust the Verus verifier, SMT solver, Rust compiler/runtime assumptions, and any external-body declarations; those are outside this paper.

The paper’s central limitation is incomplete automation: 3 of 14 security properties were not discharged by {log}. It also warns that the Coq and {log} data types are only equivalent “in some sense,” and that formula-program duality reduces efficiency. Inference: VL should reuse the pattern of solver-native encodings and counterexample queries, but should not claim that automatic proof of a model establishes correctness of Android or of generated Rust without a refinement proof.

## what VL should not redo

The paper already supplies a complete state-machine decomposition, finite-set/relational encoding strategy, negated-query proof pattern, and empirical accounting for an Android permission model. Inference: VL should avoid re-deriving these generic patterns; effort should target a Verus-specific library for frame conditions, map invariants, witness construction, and controlled solver exposure.

Inference: threat to agent-written verified Rust is moderate. The paper demonstrates that automated proof can cover about 89% of model properties, but the remaining properties, abstraction choices, and trusted toolchain show that automation does not remove specification or refinement risk.

## techniques for the catalog

- state invariant decomposition — split a record’s validity into independent predicates and prove each operation preserves each predicate
- solver-native relational encoding — translate maps, updates, and quantifiers into finite sets, relations, RUQs, and primitive constraints
- negated satisfiability proving — prove universal properties by asking the solver for a counterexample to their negation
- staged fallback verification — discharge easy obligations automatically, then export the remaining model to a stronger interactive prover
- hypothesis minimization and predicate delay — reduce automated-search cost by retaining only necessary assumptions and delaying expensive predicates
Checked 2026-10-14 against the paper by a Codex agent: audit record cristia2022verified; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
