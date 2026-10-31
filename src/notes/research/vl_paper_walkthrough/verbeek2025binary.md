# Formally Verified Binary-level Pointer Analysis
(authored by agents unless marked 🧑)
Tag: `verbeek2025binary`, [paper](https://arxiv.org/abs/2501.17766)

This paper builds a formally proved, overapproximating pointer analysis for x86-64 binaries. Its design separates a generic abstract interpreter from interchangeable abstract domains. The authors state: “This paper presents an approach to formally verified binary-level pointer analysis.” (Introduction, PDF p.1.) The goal is to soundly designate the memory regions each write may affect, so later verification, decompilation, or testing can reason about aliases and separation.

## technique: generic simulation interface for abstract interpretation

Inference: use this when several precision/scalability trade-offs must share one correctness proof. The paper requires three constituents (Section III, PDF p.3): concrete states with `step`, abstract states with abstract `step` and join ⊔, and a concretization γ_S mapping abstract states to concrete-state sets (continued on PDF p.4). The implementation recipe is:

1. Define concrete machine values, registers, memory regions, and a tainted value for results of partially overlapping accesses (Section III-A, p.4).
2. Define polymorphic abstract values V with a top element, abstract operation S, join, separation, enclosure, and aliasing (Section III-B, p.4).
3. Define γ_V and γ_S so each abstract state denotes all concrete states consistent with its parts.
4. Prove the simulation obligation `s ∈ γS(σ) ⇒ step(s) ∈ γS(step(σ))` (Theorem 1, p.4).
5. Run a fixed-point traversal that maps instruction addresses to abstract states; on revisits, join the current state with the stored state and continue only if the join changes (Section III, p.4).
6. Prove the reachability invariant `s is reachable ⇒ s ∈ γS(φ(s.rip))` for paths of resolved control-flow transfers (Theorem 2, p.4).

The paper summarizes the purpose: “This theorem shows that the abstract semantics overapproximate the concrete ones.” (Section III, p.4.)

Inference: Verus form: define machine and abstract states as datatypes, `spec fn` concretization relations, and pure transition functions. Prove simulation with `ensures`; represent join laws and monotonicity as lemmas. A verified worklist loop can maintain that every reachable concrete state is represented by the abstract state at its instruction pointer. Verus cannot directly import Isabelle/HOL proofs, so the semantics and lemmas must be re-expressed in Rust/Verus.

## technique: proof-obligation-driven domain instantiation

Inference: use this when domain implementations should be replaceable without reopening the soundness proof. The paper states that “The above generic functions must satisfy a set of 26 proof obligations.” (Section III-B, PDF p.4.) The obligations include commutative-semigroup behavior of join, reflexive/transitive enclosure, overapproximation of join, separation, and abstract operations, plus compatibility of join with separation and enclosure (Figure 1, p.5).

Apply it as follows:

1. Choose a representation for abstract pointers and values.
2. Implement γ_V, abstract operation S, join ⊔, separation ⊲⊳, enclosure ⊑, and aliasing.
3. Prove each obligation once for the chosen representation.
4. Instantiate the generic algorithm; Theorems 1 and 2 then transfer soundness to the instance.
5. Add a termination bound: the authors cap set sizes, replacing an overlarge pointer set by ⊤. Larger caps improve precision but increase run time (Section V, PDF p.8).

Inference: Verus form: encode the obligations as `proof fn` lemmas over a domain trait-like datatype; keep trait methods executable only where needed. Use set/map specifications and `ensures` to establish monotonicity and overapproximation. Do not put `ensures` on a `spec fn`; prove properties about it. The top fallback should be an explicit enum variant with a specification that contains every concrete value.

## technique: three precision tiers

The paper instantiates the interface with three domains (Section IV, PDF pp.4–7):

- C (constant computations) stores a non-empty set of symbolic expressions such as `{rsp0−8, rdi0+16}`; it is most precise but can grow large
- B (bases) stores recognized bases such as stack pointers, globals, allocations, or symbols, abstracting offsets while retaining separation information
- S (sources) stores the set of inputs used to compute a pointer, such as `{rdi0,rsi0,Fun getc}`; it is coarser but scalable

The running example represents a write through a heap pointer plus a dynamic offset by a base, a stack address by a constant computation, and an input-dependent write by a source set (Example 1, PDF p.5; Figure 2, p.6). Join is set union (p.7), and abstract states map registers, flags, and memory regions to values (Section V, p.7).

Inference: Verus form: define each domain as a Rust enum or set-backed struct, and a common `spec fn concretizes(v, concrete)` relation. Implement domain-specific join and prove that C concretization is included in the join concretization; B and S similarly. A product may select a tier by configuration while sharing one verified interpreter.

## technique: make separation assumptions explicit

Inference: use this when alias analysis relies on environmental assumptions. For C pointers, the paper decides separation with an SMT query: two regions are separate iff no address satisfies both interval constraints (Section IV-A, PDF pp.5–6). For B and S it defines algebraic relations, distinguishing “necessarily” separate from merely “desirable” separation (Figure 3, p.7). Examples include stack versus allocation, distinct allocation IDs, and function-return sources; different stack frames and different data sections are only desirable assumptions.

The paper states: “The trusted code base is thus reduced to the validity of explicit and configurable assumptions such as “regions based on stack pointers of different functions are assumed to be separate”.” (Introduction, PDF p.2.) It also assumes partially overlapping accesses do not concern pointers and taints values read or written by such accesses (Section III-A, p.4).

Inference: Verus form: encode necessary and desirable separation as separate predicates and require callers to supply the assumptions explicitly. Prove that any “necessary” relation implies disjoint concrete regions; keep “desirable” assumptions in a separately named axiom/spec boundary. This makes trust visible in the verified Rust API.

## technique: context-sensitive interprocedural summaries

Inference: use this when binary callbacks or function pointers cross function boundaries. Analyze each function bottom-up, derive preconditions describing incoming pointer regions, and derive postconditions summarizing written/read regions and pointer values in return registers or globals (Introduction, PDF p.2). Compose summaries at callers. The paper explicitly limits the presentation: “Due to space limitation, we focus our presentation on intraprocedural analysis and do not expand on the above technique for composition.” (Introduction, PDF p.2.) In the example, a global function pointer written at 0x2010 lets analysis resolve an indirect call to 0x6050 (Section VI, Figure 4, PDF p.8).

Inference: Verus form: represent summaries as spec records with pre/post predicates; prove a function’s postcondition from its body and call-site precondition. A verified caller can use the callee summary without re-analyzing the callee. Unresolved indirections remain unexplored, a stated limitation.

## evidence, assumptions, and product implications

The Isabelle/HOL development proves soundness; a Haskell mirror supplies experiments. Across binaries totaling roughly 1.4 million assembly instructions, observed recall was 100%; Table II reports 94.2% of functions OK, 5.41% with unresolved indirections but resolved returns OK, and 0.39% ERR where precision could not show the return address was safe (Section VII-B, PDF p.10; Table II, p.11). Recall compares static predictions with memory writes observed using PIN; it is not an exhaustive execution check (Section VII-A, pp.9–10). The function-status denominator is all analyzed functions in the listed binaries; the setting is an Apple M1 Pro with 32 GB, with at most about 15 GB for vim. On the SPEC 2006 dataset, Table I gives average precision 94.7% (this paper) versus 98.4% BinPointer and 33.6% BPA for local, 93.0% versus 78.0% and 58.8% for global, and 50.2% versus 20.9% and 13.2% for heap (Table I, p.11). Recall is reported as 100% on that dataset, but the paper notes BinPointer also reported 100%.

The abstract-overapproximation theorem concerns the modeled concrete semantics and assumptions; the reachability theorem covers resolved control-flow paths (Section III, p.4). For partially overlapping accesses, the paper specifies: “Overapproximation then concerns untainted values only.” (Section III-A, p.4.) The scope is x86-64 without concurrency (Introduction, p.2). The manually chosen caps ensure termination and affect precision and runtime, but the paper states: “They do not affect correctness.” (Section V, p.8.) The Isabelle/HOL development was mirrored in Haskell for the experiments (Introduction, p.2); the paper does not establish verification of that Haskell implementation. The implementation does not resolve every indirection and can miss paths. The paper itself says: “A fundamental limitation is that not all indirections may be resolved, which may lead to unexplored paths.” (Introduction, PDF p.2.)

## techniques for the catalog

- generic simulation interface — prove concrete-step inclusion and a reachability invariant once over an abstract-domain contract
- proof-obligation-driven domains — require join, concretization, separation, enclosure, and operation laws before instantiation
- precision tiers — provide constant, base, and source pointer domains with a shared sound interpreter
- explicit separation assumptions — distinguish necessary from desirable alias assumptions and expose them in the trust boundary
- fixed-point binary analysis — revisit instruction addresses, join states, and stop when a stored abstract state subsumes the current one
- context-sensitive summaries — derive pointer pre/postconditions per function and compose them across indirect calls
