# Simulating reachability using first-order logic with applications to verification of linked data structures
(authored by agents unless marked 🧑)
Tag: `levami2009simulating`, [paper](https://doi.org/10.2168/LMCS-5(2:12)2009)

## purpose and result

Lev-Ami et al. make first-order theorem provers reason about transitive closure (TC), which is needed for dynamically allocated linked structures. The abstract states: “This paper shows how to harness existing theorem provers for first-order logic to automatically verify safety properties of imperative programs that perform dynamic storage allocation and destructive updating of pointer-valued structure fields.” (Abstract, p. 1.) The method is conservative: formulas describe a superset of concrete states, so proving the abstraction proves the original property, but failure can be caused by incompleteness.

The paper's central limitation is explicit: “If χ′ is proven valid in FO then χ is also valid in FO(TC); however, if we fail to prove that χ′ is valid, it is still possible that χ is valid.” (Section 1, p. 3.) It assumes programmer-supplied preconditions, postconditions, and loop invariants. The paper demonstrates destructive singly linked-list reversal, mark-and-sweep collection, and precise reachability updates.

## technique 1: replace transitive closure with axiomatized relation symbols

Use this when a theorem prover handles first-order formulas but not `TC[f](u,v)`. Replace each TC occurrence by a fresh binary relation `f_tc`, then add sound first-order axioms.

Steps from Sections 2–4 (pp. 4–15):

1. Write the loop-maintenance or procedure formula as `ψ₁[τ] ∧ Tr[τ,τ′] → ψ₂[τ′]`, with before and after vocabularies (Section 2.2).
2. Replace every `TC[f]` with `f_tc` to obtain `χ′`.
3. Add the basic closure axiom `T1[f]`: `f_tc(u,v) ↔ (u=v) ∨ ∃w. f(u,w) ∧ f_tc(w,v)`. This is sound for reflexive transitive closure.
4. Add induction instances when proving absence of paths. The paper introduces an induction axiom scheme and shows it is complete for word models, but no recursively enumerable complete TC axiomatization exists in general (Section 3 and Proposition 4.1).
5. Give the resulting first-order formula and axioms to SPASS. If SPASS proves `σ → χ′`, the original FO(TC) property follows by soundness.

Inference: In Verus, represent reachability as a ghost `spec fn` over a mathematical relation or sequence and state closure/induction lemmas with `ensures`. Rust pointer fields remain executable, while the relation and path witnesses are ghost state. Verus's SMT-based proof is not a first-order theorem prover, so the paper's axiom injection becomes explicit lemmas and `assert` chains; this translation is an inference.

## technique 2: coloring axioms for path absence

Use coloring when the hard goal is that no path exits a region, or that every path must pass through a region. A color is a unary predicate over nodes. The paper's three schemes are NoExit, GoOut, and NewStart. The paper says that “NoExit[A, f], says that if no f-edges leave color class, A, then no f-paths leave A.” (Section 1, p. 3.)

Steps (Sections 3.2 and 5, pp. 7–8, 17–22):

1. Select initial colors from unary predicates in the specification and program variables. Add forward and backward reachability colors such as `r_x,f(v) := ∃w. x(w) ∧ TC[f](w,v)`.
2. For NoExit, prove the premise that no edge leaves color `C`; add the conclusion that no TC path leaves `C`.
3. For GoOut, prove that all `f` edges from `A` enter `B`; conclude that every path leaving `A` passes through `B`.
4. For NewStart, prove that all `g` edges inside `C` are also `h` edges; combine it with NoExit to prove that no new paths arise inside `C`.
5. Feed the conclusions to SPASS while proving the target formula. In the reverse-list example, the instances used (Fig. 9, p. 20) are NoExit and NewStart over the reachability colors `r_x′,n`, `r_x′,n′`, `r_y,n`, `r_y,n′`, plus GoOut over the unary colors `x`, `x′`, `y`.

The paper's reverse invariant partitions nodes between the `x` and `y` lists and states that original edges remain on `x` while edges on `y` are reversed (Section 5.1, pp. 16–17). The proof of the premise `NoExit[r_x′,n,n′]` proceeds by refutation (Section 5.2, p. 17, Fig. 8): assume `x′(u1)`, `n_tc(u1,u2)`, `¬n_tc(u1,u3)` and `n′(u2,u3)`; then `¬n(u2,u3)` by T2, so the changed edge leaves `u2`, hence `x(u2)`; by the definition of `x′`, `n(u2,u1)` holds, giving a cycle between `u1` and `u2` that contradicts acyclicity of the list at `x`.

Inference: A Verus proof can define colors as predicates over a ghost set of allocated nodes, then prove `forall` closure lemmas. `NoExit` becomes an invariant-preservation lemma; `GoOut` and `NewStart` become path decomposition lemmas. Verus has no built-in TC axiom scheme, so each use requires a concrete finite-path induction lemma.

## technique 3: directed color search and automatic axiom instantiation

Use this when manually choosing all colors is impractical. The paper limits the search to colors appearing in the goal, their forward/backward reachability, and Boolean combinations.

Steps (Sections 5.3–5.5, pp. 19–21):

1. Start with unary predicates in the target and pre/postconditions, then add forward and backward reachability colors.
2. Add initial colors inferred from code: roots, edge-change starts, and edge-change ends. For reverse, Table 5(b) (p. 20) gives `x, y` for Roots[n], `x′, y′` for Roots[n′], `x` for StartChange[n,n′], and `y, x′` for EndChange[n,n′].
3. Enumerate Boolean combinations up to a bounded complexity level.
4. Run phases in order: try GoOut premises, then NoExit, then NewStart. Add a coloring conclusion only when the theorem prover proves its premise.
5. After each level, retry the target formula. The pseudocode (Fig. 10, p. 21) loops until the goal is proved; the prototype is a Perl script calling SPASS and limits the time SPASS may spend on each formula, because SPASS may not terminate on an invalid formula (Section 5.5).

The paper warns that “the set of possible colors to choose from is doubly-exponential in the number of initial colors; giving all the axioms directly to the theorem prover is infeasible.” (Section 5.4, p. 20.) Its prototype automatically chooses useful axioms for the examples, but the authors describe the method as heuristic and incomplete.

Inference: For Verus, generate candidate ghost lemmas from root and field predicates, then let proof failures guide which path lemmas to add. The search policy can be an external proof-generation tool; the final Verus source should contain only checked lemmas and invariants.

## technique 4: precise first-order updates for unit edge changes

Use this when a heap operation adds or removes exactly one pointer edge and reachability must be updated. For adding `s→t`, the paper gives the precise relation `e′_tc(v1,v2) ↔ e_tc(v1,v2) ∨ (e_tc(v1,vs) ∧ e_tc(vt,v2))`. It proves this with colors forward from `t` and backward from `s` (Section 6.1.1, pp. 26–27).

For removing an edge in an acyclic graph with at most one path between nodes, use `e′_tc(v1,v2) ↔ e_tc(v1,v2) ∧ ¬(e_tc(v1,vs) ∧ e_tc(vt,v2))`. The paper says “There is no known precise formula for updating the transitive closure of a general graph”; for functional graphs it cites Hesse's formulas, which use an auxiliary binary or a ternary relation, and “Without these additions, it is not possible to give precise update formulas in the presence of cyclicity.” It proves the formula above for acyclic functional graphs and trees using NewStart and NoExit instances (Section 6.1.2, pp. 26–27, Table 6(b),(c)).

Inference: A Verus pointer proof can maintain a ghost reachability relation and update it with these formulas only under the same acyclicity/unique-path assumptions. The executable pointer mutation remains ordinary Rust; the ghost update lemma must prove that no other path was created or destroyed.

## techniques for the catalog

- first-order transitive-closure axiomatization: replace `TC[f]` with `f_tc` and prove sound closure and induction lemmas
- coloring axioms: use NoExit, GoOut, and NewStart colors to prove path absence and path-through-region facts
- directed color search: enumerate root, reachability, and Boolean-combination colors in phased theorem-prover search
- unit-edge reachability update: maintain precise closure formulas for edge insertion and restricted acyclic edge removal
