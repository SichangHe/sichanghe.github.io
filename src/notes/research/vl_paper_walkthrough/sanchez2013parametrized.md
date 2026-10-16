# Parametrized Invariance for Infinite State Processes
(authored by agents unless marked 🧑)

Tag: `sanchez2013parametrized`, [paper](http://arxiv.org/abs/1312.4043v2)

## what the paper proves or measures

Sánchez and Sánchez address uniform safety verification for an arbitrary number of concurrent processes manipulating unbounded data and heap state. The abstract describes the split: “The contribution of this paper is a general method for the verification of safety properties of parametrized programs that manipulate complex local and global data, including mutable state in the heap.” (Abstract, p. 1.) A parametrized system `S[N]` is correct when every instance with `N≥1` satisfies the property. Their proof rules reduce this unbounded family to finitely many verification conditions (VCs) whose count depends on the program and property, not on `N`; when specifications and transitions are quantifier-free, the generated VCs are quantifier-free (Sections 1 and 3, pp. 1–8).

The running example is a lock-coupling linked list with `Search`, `Insert`, and `Remove`, global ghost sets `reg` and `elems`, and a most-general client that repeatedly chooses an operation (Section 2, pp. 3–5). Leap generates VCs from the rules and discharges them with Z3/Yices-based decision procedures. The paper proves list shape, set representation, functional search/insert/remove properties, and ticket-based mutual exclusion. The authors state the core soundness result: “If P1, P2 and P3 hold, then S |= □ϕ.” (Theorem 1, Section 3, p. 8.)

## technique 1: encode arbitrary threads with parameterized arrays

what it is: replace the unbounded collection of local variables by arrays indexed by an uninterpreted `tid` sort. A local `v` becomes an array `v(k)`; program-counter and data updates become array reads and updates. Global variables remain ordinary terms. A formula `ϕ(k0,…,kn)` mentions only a finite set of symbolic thread identifiers.

when to use: use this representation when every thread runs the same program under asynchronous interleaving and the property is symmetric under renaming thread IDs.

how to do it (Sections 2–3, pp. 5–7):
1. define global and local variables and a local program counter
2. introduce sort `tid` with equality/inequality only, and arrays for every local variable
3. define parametrized initial condition `Θ(X)` by instantiating local conditions for symbolic IDs
4. translate each program instruction into a transition that updates the array at one symbolic index
5. define concretization by mapping symbolic IDs injectively to concrete IDs in `[N]`
6. state uniform validity as validity of every concretization for every `N`

The paper distinguishes a symbolic `v(k)` array term from a concrete `v[0]` variable (Section 3, p. 6). It also gives a two-thread list instance with 118 transitions, 59 per thread (Example 1, p. 6).

Verus form (Inference: the paper uses a C-like language and SMT arrays): model per-thread state as a ghost `Map<tid, State>` or a Verus state-machine map, and state transition predicates as `spec fn`. Use `requires`/`ensures` on transition proof functions and `invariant` clauses for any executable bounded loop. A map encoding requires explicit finite-support or lookup assumptions; Verus does not automatically provide the paper's uninterpreted infinite `tid` domain. Inference: a practical Rust implementation would verify a fixed representation plus a quantified abstraction lemma, while the paper's uniformity theorem remains a separate meta-level argument.

evidence and limits: the array encoding is sound under full symmetry and the stated transition semantics. The system is not automatically decidable in general; data theories need suitable decision procedures, and the framework requires user-supplied support invariants when a candidate is not inductive (Section 1, p. 3).

## technique 2: the basic parametrized invariance rule p-inv

what it is: prove a property `ϕ(k)` using three finite VC families. P1 proves initialization. P2 checks every transition by each thread ID appearing in the property. P3 checks a fresh arbitrary thread, while assuming the property for the property threads. The fresh-thread case captures interference from any number of additional processes.

when to use: use p-inv when the candidate property is itself inductive under both participating and unrelated thread steps.

how to do it (Figure 4, p. 8):
1. generate `Θ(k) → ϕ`
2. for every program transition `τ` and each symbolic ID `i` in `k`, generate `ϕ ∧ τ(i) → ϕ'`
3. for every transition, choose a fresh `j` and generate `ϕ ∧ (∧j≠x) ∧ τ(j) → ϕ'`
4. discharge these quantifier-free VCs in the data decision procedure
5. invoke Theorem 1 to conclude uniform safety

The paper explicitly says P1 generates one VC, P2 one per transition and property index, and P3 one extra per transition (Section 3, p. 8). Its soundness proof reduces a violating concrete run to one failed premise.

Verus form (Inference): write a ghost transition relation and a proof function whose `ensures` says the invariant is preserved for a transition by a participating thread. A second lemma can represent an arbitrary non-participating thread, with a `requires` clause carrying the invariant for all relevant ghost IDs. Use `assert` to instantiate map lookups and disjointness. Verus `invariant` is a loop clause, not a callable `invariant(...)`; p-inv is a proof schema that must be encoded as lemmas or state-machine transition proofs.

evidence and limits: p-inv is sound, but it can fail when a fresh thread needs the invariant as an assumption. This motivates support and strengthening rather than indicating an implementation error.

## technique 3: support invariants and the strengthening rule sp-inv

what it is: a support formula `ψ` is instantiated for all relevant substitutions and conjoined to the antecedent of a VC. This lets a proof assume that the fresh thread also satisfies a previously established invariant. Rule sp-inv uses an already proved support invariant, a candidate target, and three preservation conditions.

when to use: use it when p-inv's fresh-thread VC is false because the target property does not mention the fresh process, or when the candidate needs a stronger inductive context.

how to do it (Sections 3, pp. 8–9):
1. choose a parametrized support `ψ` and define the allowed substitutions over its thread variables
2. prove `□ψ` as S0
3. prove `Θ→ϕ` as S1
4. for transitions of property threads, prove the target after the step assuming support and target instances (S2)
5. for one fresh thread, prove the target after the step assuming support instances for the fresh and property threads (S3)
6. conclude `□ϕ` by Theorem 2

The authors define support semantically as a conjunction over substitutions and write the strengthened fresh-thread rule as `ϕ ⊳ (∧j≠x ∧ τ(j) → ϕ')` (Definition 1 and Figure 5, pp. 8–9). They note that sp-inv is complete in principle when support invariants are available, but the completeness proof is outside the paper (Section 5, p. 14).

Verus form (Inference): encode each support as a separate ghost predicate or state-machine invariant and prove it with a `proof fn` before using it in a target lemma. The target lemma's `requires` should include the support facts for the concrete thread IDs under consideration; its `ensures` should preserve the target. Quantified support over all threads may require a finite map invariant or a carefully bounded abstraction, because arbitrary quantifier instantiation is solver-sensitive in Verus.

evidence and limits: support is a proof assumption only after S0 has been verified. The paper's list proof uses support facts such as `region(i)`, `next(i)`, `order(i)`, and `lock(i)` (Section 4, pp. 11–12), showing that the method shifts work into meaningful auxiliary invariants.

## technique 4: graph proof rules for mutually dependent invariants

what it is: represent candidate invariants as nodes of a directed proof graph. An edge from `ψi` to `ψ` means `ψi` is support for proving `ψ`. The g-inv rule checks initialization and preservation for every node, using incoming support nodes. This avoids forcing mutually dependent facts into one monolithic invariant.

when to use: use it when shape, aliasing, lock ownership, and functional facts depend on one another and a single formula causes a complex decision procedure to time out.

how to do it (Figure 6, pp. 9–10):
1. create one node per invariant formula
2. add an edge for each support dependency
3. prove every node is initially true (G1)
4. for each node and every transition of each property thread, instantiate incoming supports and prove preservation (G2)
5. for each node, instantiate supports for one fresh thread and prove fresh-thread preservation (G3)
6. use Theorem 3 to conclude every node is invariant

For the list, the graph contains `list`, `order`, `lock`, `region`, `next`, and `disj` dependencies (Figure 8, p. 13). The paper says a shortest-path-to-violation argument proves graph soundness (Theorem 3, p. 10).

Verus form (Inference): use separate ghost predicates and proof lemmas with explicit `requires` for incoming support predicates and `ensures` for the node predicate. Keep the dependency graph as tool metadata and topologically or iteratively order lemma calls. Rust ownership can encode some lock/alias facts, but the paper's heap-layout predicates require a Verus state model and cannot be replaced by ownership alone.

evidence and limits: the graph makes the proof modular, but the decision procedure still needs to solve each generated VC. It does not synthesize the invariants; the paper lists invariant generation as future work (Section 5, p. 14).

## technique 5: concretize symmetric array formulas before SMT

what it is: Theorem 4 eliminates arrays indexed by symbolic thread IDs by checking finitely many assignments of the formula's `n` indices to `0,…,n−1`. For example, an arbitrary fresh-thread obligation for `p(i)` becomes `p[0] ∧ τ[1] → p'[0]`.

when to use: use it for fully symmetric systems where thread identities are compared only for equality and the formula has finite index diameter.

how to do it (Section 3, pp. 10–11):
1. count the symbolic IDs in `ϕ(k)`
2. enumerate all assignments to distinct representatives among `0,…,n−1`
3. replace array reads/updates with concrete per-thread variables
4. send each resulting quantifier-free formula to the decision procedure
5. accept the original formula iff every concretization is valid

The paper states: “ϕ(k) is valid if and only if α(ϕ) is valid” for all assignments in the representative set (Theorem 4, p. 10). This is a symmetry theorem, not a bounded-thread testing heuristic.

Verus form (Inference): instantiate a finite set of ghost thread representatives and prove a symmetry lemma relating renaming to state transitions. Then use ordinary `assert` and `proof fn` obligations over those representatives. Verus will not automatically derive the paper's array elimination theorem; the theorem and its symmetry assumptions must be proved or trusted outside the Rust crate.

evidence and limits: the reduction relies on full symmetry and quantifier-free transition/property formulas. Systems with identity-dependent behavior or non-symmetric scheduling do not meet the theorem's assumptions.

## technique 6: ticket mutual exclusion and counterexample-guided support discovery

what it is: encode an infinite-state ticket protocol with a shared increasing counter and either a minimum ticket variable or a set of tickets. Prove mutual exclusion by starting with a target `mutex(i,j)`, inspecting failed p-inv VCs, and adding the support invariants that the counterexample exposes.

how to do it (Appendix A and B, pp. 16–18):
1. give each thread a unique increasing ticket and wait until its ticket is minimum before entering the critical section
2. state `mutex(i,j)` as `i≠j → ¬(critical(i) ∧ critical(j))`
3. run p-inv and inspect the two countermodels for the await transition
4. add `minticket(i)` (a critical thread owns the minimum ticket) and `notsame(i,j)` (active threads have different tickets)
5. when those supports are not inductive, add `activelow(i)` (`active(i) → ticket(i) < avail`) and use the resulting proof graph
6. for the set variant, replace the minimum counter with `bag.min` and repeat the support dependencies

The appendix reports the two concrete countermodels: one has another critical thread with a different minimum ticket, and one has two threads with the same ticket (Appendix B, pp. 17–18). The authors then state: “Now, mutex can be verified using sp-inv with minticket and notsame as support.” (Appendix B, p. 18.)

Verus form (Inference): represent tickets and critical-section state in a ghost state machine. State uniqueness, lower-than-next-ticket, and minimum-ticket facts as transition invariants; prove mutual exclusion as a lemma with `requires` for the invariant and `ensures` for the disjoint critical-state conclusion. Feed failed Verus assertions back into new support lemmas, but keep the final transition proof independent of test traces.

## technique 7: full-symmetry reduction and location-scoped proof graphs

what it is: define semantic swap maps for every sort and show that initial states, transitions, and properties commute with swapping thread identifiers. Full symmetry lets a formula with arbitrary IDs reduce to representative IDs independent of the number of processes. Appendix C's Theorem 5 restates concretization for this setting, and Appendix E adds proof-graph support only at program locations where it is needed.

how to do it (Appendix C and E, pp. 19–25):
1. define a swap on `tid` and identity maps for unrelated sorts; define corresponding model, syntax, state, and transition maps
2. prove involution and interpretation-commutation conditions for all maps
3. prove initial-state, transition, and property preservation under swaps (Definition 2, p. 21)
4. instantiate only representative IDs `0,…,n−1` for a formula with `n` free IDs (Theorem 5, p. 22)
5. in the proof graph, attach supports to particular transition locations and premises, and use pruning/simplification tactics (Appendix E, pp. 24–25)

The paper states that the representative range is independent of the running thread count: “It is important to note that the range of the concrete indices is [n], independent of the number of running threads N.” (Appendix C, p. 21.)

Verus form (Inference): prove a ghost renaming lemma for the state representation and use it to reduce symmetric transition obligations to a finite representative set. Store location-scoped support requirements as metadata for proof functions; each proof function should have explicit `requires` facts for only the transitions it covers. Verus does not provide the paper's proof-graph parser or small-model bound, so those remain tool infrastructure outside the Rust crate.

## evidence, trusted boundary, and product threat

Leap's evaluation uses Z3 and Yices decision procedures, including TLL3 for linked-list heap layouts and Presburger-plus-finite-set procedures for ticket protocols (Section 4, pp. 11–13). Figure 7 reports 121 VCs for `order`, `lock`, and `next`; specialized tactics reduce `order` from a 998.35-second full-support run to 7.56 seconds with necessary support and 1.20 seconds with tactics. Several full-support rows time out at 30 minutes, while the tactic times are finite; these are settings in the table's single 2.8 GHz, 8 GB machine, not universal speed claims. The list row has 61 VCs, 38 solved by the position-only procedure and 23 by the specialized procedure; all-list and next full-support modes time out (Figure 7, p. 13).

The soundness theorems cover the proof rules and concretization under their formal assumptions. Trusted components include the transition model, user-provided invariants/support graph, SMT decision procedures and their small-model theorems, full symmetry, and the C-like-to-VC translation. Inference: VL should reuse finite-diameter thread reasoning, support invariants, modular proof graphs, and counterexample models as a way to discover missing facts. VL should not redo the paper's basic result that unbounded thread counts can yield finite VCs. Inference: threat to agent-written verified Rust is high for missing concurrency invariants and abstraction assumptions, while the graph and support organization offer a concrete way to expose those omissions. A Verus proof of one bounded execution is not evidence for the paper's uniform theorem unless the symmetry and concretization argument is also established.

## techniques for the catalog

- parameterized array encoding — represent all thread-local state with arrays indexed by symbolic thread IDs
- p-inv rule — check initialization, property-thread steps, and one fresh-thread step to prove uniform safety
- support strengthening — assume previously proved support invariants for fresh and property threads
- graph invariance — prove mutually dependent invariants as nodes with incoming support edges
- symmetry concretization — reduce finite-index array formulas to representative concrete thread assignments
- counterexample-guided support discovery — inspect small SMT models of failed VCs to add missing invariants

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
