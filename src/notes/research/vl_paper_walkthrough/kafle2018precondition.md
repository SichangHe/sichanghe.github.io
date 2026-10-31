# Precondition Inference via Partitioning of Initial States
(authored by agents unless marked 🧑)
Tag: `kafle2018precondition`, [paper](http://arxiv.org/abs/1811.06771v1)

## purpose and result
The paper infers sufficient preconditions (SPs) for both safe and unsafe terminating states by repeatedly over-approximating each set, partitioning initial states, and analyzing only the overlap that remains unknown. Its abstract states: “Each iteration maintains over-approximations of the set of safe and unsafe initial states.” The method is for programs encoded as constrained Horn clauses (CHCs), with predicates `init`, `safe`, and `unsafe`; correctness is relative to the states the encoding marks. The authors give proof sketches of soundness (Theorem 1) and report 176 optimal results among 261 integer programs.

## technique 1: encode a program and define necessary/sufficient preconditions
Use CHCs with an initial predicate and explicit terminal predicates. A clause `init(A,B)` represents an initial state; recursive clauses represent transitions; `unsafe` and `safe` clauses identify error and graceful termination. The running example translates a decrementing loop and assertion into five clauses. The paper says: “The clause c4 states that an “unsafe” state is reached if B < 0 after exiting the loop whereas the clause c5 states that the program terminates gracefully if B ≥ 0.” (Section 1, p. 2).

The necessary precondition (NP) is an over-approximation of initial states that can reach a target. Extract the disjunction of constraints on initial clauses. Then form SPs by subtraction: `SP_safe = NP_safe ∧ ¬NP_unsafe`; `SP_unsafe = NP_unsafe ∧ ¬NP_safe` (Section 3, pp. 5–6). If the conjunction of the two NPs is unsatisfiable, the precondition is optimal: necessary and sufficient conditions coincide (p. 6). The running example initially gives both NPs as `true`; after the transformations it obtains `NP_safe ≡ B ≥ 0` and `NP_unsafe ≡ B < 0 ∨ A ≥ 1` (Section 3, p. 7; the introduction on p. 3 prints the first disjunct as `B ≤ 0`), hence first SPs `B ≥ 0 ∧ A ≤ 0` and `B < 0` (Section 1, pp. 2–3).

Verus form (Inference): represent the input relation as a `requires` predicate on a verified Rust function, and prove safety with `ensures`; use a separate specification predicate for the unsafe/error region when analyzing bug preconditions. Verus does not natively consume CHCs, so this is a translation and proof-organization pattern, not a direct implementation of the paper’s solver.

Evidence and limits: the paper’s soundness depends on every derivation of `safe` or `unsafe` containing an initial node and on the user having encoded all states of interest. It explicitly warns: “Hence the correctness of the preconditions depends on the user specified set of states.” (Section 1, p. 2). Unmodeled buffer overflow or floating-point exceptions are outside the result.

## technique 2: goal-directed CHC transformations
Apply transformations that preserve derivations of a selected goal while strengthening NPs.

1. partial evaluation (PE) specializes the CHC program to `safe` or `unsafe`, creating polyvariant predicate versions. Apply it to both goals, then disjoin constraints in specialized `init` clauses. The paper reports that “due to polyvariant specialisation the predicates init and wh are split, leading to a more precise approximations” (Section 3, p. 7)
2. constraint specialization (CS) propagates constraints top-down from a goal and bottom-up from facts, computes invariants for recursive calls, and conjoins them to clauses. In the paper's small example (Figure 3) it propagates `B ≥ A` from `unsafe` and `A = 1, B = 1` from the fact (the fact in Figure 3 reads `A = 1, B = 0`, so the text is inconsistent with the figure), producing the invariant `A ≥ B, B ≥ 0` at calls (Section 3, pp. 7–8)
3. trace elimination (TE) removes one AND-tree while preserving the rest; the method represents the program and the trace as finite tree automata, removes the trace by automata difference, and reconstructs a program (Section 3, p. 8, details in [22]). If a feasible safe/unsafe tree is removed, project its constraints to initial variables (`θ_t`) and disjoin that formula into the corresponding NP; infeasible-tree removal changes no NP (Section 3, pp. 8–9)

Verus form (Inference): PE corresponds to splitting verified helper functions/spec predicates by call context; CS corresponds to adding loop invariants and `assert`/`assert`-proved facts before calls; TE corresponds to proving one execution trace and adding its projected input condition as a disjunct. Verus’s `spec fn`, `requires`, `ensures`, `invariant` clauses, and `assert` are the relevant constructs; the CHC tree-automata machinery itself does not carry over.

Evidence: PE, CS and removal of infeasible trees preserve the goal and the initial clauses; removal of a feasible tree does not, and is handled by adding `θ_t` (Lemma 2, adapted from [23], Section 3, p. 9). The paper says its experiments use PE, then CS, then TE because “CS is most effective when performed after PE” (Section 4, p. 12). The paper does not report independent accuracy for each transformation, so any claim that one is universally best is Inference: unsupported by the experiments.

## technique 3: iterative partition-and-refine algorithm
Algorithm 1 runs both goal analyses, accumulates classified SPs, and restricts the next iteration to the overlap of current NPs.

1. initialize accumulated SPs to `false`, residual set `ϕ_old` to all initial states, and transformed programs `P_s`, `P_u` to `P`
2. run a chosen sequence of PE, CS, and TE on each program; extract `NP_s` and `NP_u`, adding any `θ_t`
3. let residual `ϕ_new = NP_s ∧ NP_u`; if `false`, return the accumulated SPs disjoined with the current NPs (Algorithm 1, lines 8–10)
4. if `ϕ_old → ϕ_new` (the approximation does not get stronger), stop and return the accumulated SPs disjoined with the subtraction results `NP_s ∧ ¬NP_u` and `NP_u ∧ ¬NP_s` (lines 11–13)
5. otherwise accumulate `NP_s ∧ ¬NP_u` and `NP_u ∧ ¬NP_s`, under-approximate both programs by conjoining `ϕ_new` to every initial clause (Definition 5), and repeat. The paper notes that `ϕ_new` must first be converted to DNF, which “may blow up the number of resulting clauses (only the initial ones)” (Section 4, p. 11)

The paper explains: “the algorithm either explores a strictly smaller set of initial states that have not yet been classified as safe or unsafe or, terminates.” (Section 4, p. 12). In the worked example, PE at iteration 0 leaves overlapping NPs, and CS at iteration 1 on the program restricted to `B ≥ 0 ∧ A ≥ 1` gives disjoint NPs; the final SPs are `SP_safe = (B ≥ 0 ∧ A ≤ 0) ∨ (B ≥ A ∧ A ≥ 1)` and `SP_unsafe = B < 0 ∨ (B ≥ 0 ∧ A > B)` (Section 4, p. 11). The paper adds that applying CS then PE to the original program gives the optimal NPs directly, which “suggests that a sequence of transformations can potentially avoid the costly DNF conversion” (p. 12).

Verus form (Inference): maintain a ghost/specification residual predicate and prove each iteration’s disjoint region with `ensures`; call verified helper lemmas on the residual input predicate. The algorithm’s formula implication and DNF conversion would usually be discharged by SMT or explicit lemmas, while Verus does not automatically generate CHC under-approximations.

Nontermination side effect: states outside both NPs may be inferred as nonterminating when all terminating states are modeled. The paper’s loop example derives `a ∈ [0,10]` as such a region, but says primary nontermination analysis is future work (Section 4, p. 13).

## evidence and measured limits
The implementation is PI-Horn in Ciao Prolog, using Parma Polyhedra Library and Yices2; transformation length is fixed at three, PE→CS→TE. It tests 261 integer programs: 150 SV-COMP’18, 83 DAGGER/TRACER, and 28 prior precondition benchmarks. The setup is a MacBook Pro with 16GB memory and a 2.7 GHz Intel Core i5, with a 300-second timeout (Section 5, pp. 13–15; the timeout is in the Table 1 caption on p. 15).

Table 1 (p. 15) reports, over 261 programs, 176 optimal; 38 with non-trivial SPs for safety (excluding optimal), of which 26 have trivial SPs for unsafety; 17 with non-trivial SPs for unsafety, of which 5 have trivial SPs for safety; 12 non-trivial for both; 20 trivial for both; and 219 non-trivial or optimal in total. Inference: the columns do not partition the programs, since 176 + 38 + 17 + 12 + 20 = 263 exceeds 261; the table's 219 equals 176 + 26 + 5 + 12, consistent with the 12 programs being counted in both the 38 and the 17. The authors summarize: “The results show our tool is able to generate non-trivial preconditions for 83% of the programs while timing out for 9%.” (Section 5, p. 15). They also report 5.94 seconds average per instance excluding timeouts and optimal preconditions for 67% (176/261). The comparison totals 219 versus 218 programs with non-trivial SPs against WP-Rahft (the tool of Kafle et al. [23]), but the paper says the two “differ in the quality (such as optimality)” and that “a direct comparison is difficult due to different outcomes” (pp. 14–15). The paper also reports that refinement increases program size and hurts performance, “This explains why we solve fewer and fewer problems after iteration 2” (p. 15; Table 1 opt column: 58, 87, 21, 5, 2, 2, 1 for iterations 0 to 6).

What is proved/trusted: soundness of returned SPs is proved from CHC transformation properties, under-approximation, and disjunctive composition (Theorem 1, Section 4, p. 12). Trusted components include the CHC encoding, the constraint theory decision procedure/projection, Ciao, PPL, Yices2, and the user’s safe/unsafe model. Inference: a Verus product inherits analogous trust in its Rust model, solver, compiler, and specification.

## techniques for the catalog
- precondition partitioning — maintain safe/unsafe over-approximations and analyze their overlap
- CHC goal specialization — use PE, CS, and TE to strengthen NPs while preserving target derivations
- iterative residual refinement — restrict initial clauses to unresolved overlap and accumulate disjoint SPs
- nontermination side classification — treat states outside modeled safe/unsafe NPs as candidate nontermination
