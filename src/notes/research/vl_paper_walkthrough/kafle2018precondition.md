# Precondition Inference via Partitioning of Initial States
(authored by agents unless marked 🧑)
Tag: `kafle2018precondition`, [paper](http://arxiv.org/abs/1811.06771v1)

## purpose and result
The paper infers sufficient preconditions (SPs) for both safe and unsafe terminating states by repeatedly over-approximating each set, partitioning initial states, and analyzing only the overlap that remains unknown. Its abstract states: “Each iteration maintains over-approximations of the set of safe and unsafe initial states.” The method is for programs encoded as constrained Horn clauses (CHCs), with predicates `init`, `safe`, and `unsafe`; correctness is relative to the states the encoding marks. The authors prove soundness and report 176 optimal results among 261 integer programs.

## technique 1: encode a program and define necessary/sufficient preconditions
Use CHCs with an initial predicate and explicit terminal predicates. A clause `init(A,B)` represents an initial state; recursive clauses represent transitions; `unsafe` and `safe` clauses identify error and graceful termination. The running example translates a decrementing loop and assertion into five clauses. The paper says: “The clause c4 states that an “unsafe” state is reached if B < 0 after exiting the loop whereas the clause c5 states that the program terminates gracefully if B ≥ 0.” (Section 1, p. 2).

The necessary precondition (NP) is an over-approximation of initial states that can reach a target. Extract the disjunction of constraints on initial clauses. Then form SPs by subtraction: `SP_safe = NP_safe ∧ ¬NP_unsafe`; `SP_unsafe = NP_unsafe ∧ ¬NP_safe` (Section 3, p. 5). If their conjunction is unsatisfiable, the pair is optimal: necessary and sufficient conditions coincide. The running example initially gives both NPs as `true`; after specialization it obtains `NP_safe = B ≥ 0` and `NP_unsafe = B < 0 ∨ A ≥ 1`, hence first SPs `B ≥ 0 ∧ A ≤ 0` and `B < 0` (Section 1, pp. 2–3).

Verus form (Inference): represent the input relation as a `requires` predicate on a verified Rust function, and prove safety with `ensures`; use a separate specification predicate for the unsafe/error region when analyzing bug preconditions. Verus does not natively consume CHCs, so this is a translation and proof-organization pattern, not a direct implementation of the paper’s solver.

Evidence and limits: the paper’s soundness depends on every derivation of `safe` or `unsafe` containing an initial node and on the user having encoded all states of interest. It explicitly warns: “Hence the correctness of the preconditions depends on the user specified set of states.” (Section 1, p. 2). Unmodeled buffer overflow or floating-point exceptions are outside the result.

## technique 2: goal-directed CHC transformations
Apply transformations that preserve derivations of a selected goal while strengthening NPs.

1. partial evaluation (PE) specializes the CHC program to `safe` or `unsafe`, creating polyvariant predicate versions. Apply it to both goals, then disjoin constraints in specialized `init` clauses. The paper reports that “due to polyvariant specialisation the predicates init and wh are split, leading to a more precise approximations” (Section 3, p. 7)
2. constraint specialization (CS) propagates constraints top-down from a goal and bottom-up from facts, computes invariants for recursive calls, and conjoins them to clauses. In the example it propagates `B ≥ A` from `unsafe` and `A = 1, B = 1` from the fact, producing `A ≥ B, B ≥ 0` at calls (Section 3, pp. 7–8)
3. trace elimination (TE) represents an AND-tree and removes it with tree-automata difference, preserving other trees. If a feasible safe/unsafe tree is removed, project its constraints to initial variables (`θ_t`) and disjoin that formula into the corresponding NP; infeasible-tree removal changes no NP (Section 3, pp. 8–9)

Verus form (Inference): PE corresponds to splitting verified helper functions/spec predicates by call context; CS corresponds to adding loop invariants and `assert`/`assert`-proved facts before calls; TE corresponds to proving one execution trace and adding its projected input condition as a disjunct. Verus’s `spec fn`, `requires`, `ensures`, `invariant` clauses, and `assert` are the relevant constructs; the CHC tree-automata machinery itself does not carry over.

Evidence: each transformation is justified as goal-preserving or accompanied by `θ_t` (Lemma 2, Section 3, p. 9). The paper does not report independent accuracy for each transformation, so any claim that one is universally best is Inference: unsupported by the experiments.

## technique 3: iterative partition-and-refine algorithm
Algorithm 1 runs both goal analyses, accumulates classified SPs, and restricts the next iteration to the overlap of current NPs.

1. initialize accumulated SPs to `false`, residual set `ϕ_old` to all initial states, and transformed programs `P_s`, `P_u` to `P`
2. run a chosen sequence of PE, CS, and TE on each program; extract `NP_s` and `NP_u`, adding any `θ_t`
3. let residual `ϕ_new = NP_s ∧ NP_u`; if `false`, return accumulated SPs plus current NPs
4. if `ϕ_new` does not strengthen `ϕ_old`, stop and return only states classified by subtraction
5. otherwise accumulate `NP_s ∧ ¬NP_u` and `NP_u ∧ ¬NP_s`, under-approximate both programs by conjoining `ϕ_new` to every initial clause, and repeat

The paper explains: “the algorithm either explores a strictly smaller set of initial states that have not yet been classified as safe or unsafe or, terminates.” (Section 4, p. 12). The example’s PE→CS sequence reaches disjoint NPs and returns `SP_safe = (B ≥ 0 ∧ A ≤ 0) ∨ (B ≥ A ∧ A ≥ 1)` and `SP_unsafe = B < 0 ∨ (B ≥ 0 ∧ A > B)` (Section 4, pp. 11–12).

Verus form (Inference): maintain a ghost/specification residual predicate and prove each iteration’s disjoint region with `ensures`; call verified helper lemmas on the residual input predicate. The algorithm’s formula implication and DNF conversion would usually be discharged by SMT or explicit lemmas, while Verus does not automatically generate CHC under-approximations.

Nontermination side effect: states outside both NPs may be inferred as nonterminating when all terminating states are modeled. The paper’s loop example derives `a ∈ [0,10]` as such a region, but says primary nontermination analysis is future work (Section 4, p. 13).

## evidence and measured limits
The implementation is PI-Horn in Ciao Prolog, using Parma Polyhedra Library and Yices2; transformation length is fixed at three, PE→CS→TE. It tests 261 integer programs: 150 SV-COMP’18, 83 DAGGER/TRACER, and 28 prior precondition benchmarks. The setup is a 16GB, 2.7GHz MacBook Pro with a 300-second timeout (Section 5, pp. 13–14).

Table 1 reports, over all 261 programs, 176 optimal, 38 nontrivial safety-only, 17 nontrivial unsafety-only, 12 nontrivial for both, and 20 trivial for both; totals sum to 263 classifications because the table counts results per iteration in addition to the per-program optimum. The authors summarize: “The results show our tool is able to generate non-trivial preconditions for 83% of the programs while timing out for 9%.” (Section 5, p. 15). They also report 5.94 seconds average per instance excluding timeouts and optimal preconditions for 67% (176/261). The comparison totals 219 versus 218 nontrivial-or-optimal results against WP-Rahft, but the paper says quality differs and direct comparison is difficult.

What is proved/trusted: soundness of returned SPs is proved from CHC transformation properties, under-approximation, and disjunctive composition (Theorem 1, Section 4, p. 12). Trusted components include the CHC encoding, the constraint theory decision procedure/projection, Ciao, PPL, Yices2, and the user’s safe/unsafe model. Inference: a Verus product inherits analogous trust in its Rust model, solver, compiler, and specification.

Threat to VeruLaw (Inference): useful input contracts could be synthesized by running this partitioning idea over Rust/Verus verification conditions, especially when safe and unsafe behaviors overlap. The main threat is limited: it does not verify Rust ownership or implementation semantics, and residual DNF growth, timeout, and unmodeled nontermination can make inferred contracts incomplete or expensive. VL should not redo the paper’s PE/CS/TE CHC machinery as a claimed novelty without a Rust-specific integration and measurement.

## techniques for the catalog
- precondition partitioning — maintain safe/unsafe over-approximations and analyze their overlap
- CHC goal specialization — use PE, CS, and TE to strengthen NPs while preserving target derivations
- iterative residual refinement — restrict initial clauses to unresolved overlap and accumulate disjoint SPs
- nontermination side classification — treat states outside modeled safe/unsafe NPs as candidate nontermination

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
