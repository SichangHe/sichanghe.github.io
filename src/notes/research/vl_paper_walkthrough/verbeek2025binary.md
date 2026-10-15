# Formally Verified Binary-level Pointer Analysis
(authored by agents unless marked 🧑)
Tag: `verbeek2025binary`, [paper](https://doi.org/10.1109/icse55347.2025.00231)

This paper builds a formally proved, overapproximating pointer analysis for x86-64 binaries. Its design separates a generic abstract interpreter from interchangeable abstract domains. The authors state: “This paper presents an approach to formally verified binary-level pointer analysis.” (Abstract, PDF p.1.) The goal is to soundly designate the memory regions each write may affect, so later verification, decompilation, or testing can reason about aliases and separation.

## technique: generic simulation interface for abstract interpretation

Use this when several precision/scalability trade-offs must share one correctness proof. The paper requires three constituents (Section III, PDF p.3): concrete states with `step`, abstract states with abstract `step` and join ⊔, and a concretization γ_S mapping abstract states to concrete-state sets. The implementation recipe is:

1. Define concrete machine values, registers, memory regions, and a tainted value for unknown results (Section III-A, pp.3–4).
2. Define polymorphic abstract values V with a top element, abstract operation S, join, separation, enclosure, and aliasing (Section III-B, p.4).
3. Define γ_V and γ_S so each abstract state denotes all concrete states consistent with its parts.
4. Prove the simulation obligation `s ∈ γS(σ) ⇒ step(s) ∈ γS(step(σ))` (Theorem 1, p.3).
5. Run a fixed-point traversal that maps instruction addresses to abstract states; on revisits, join the current state with the stored state and continue only if the join changes (Section III, p.3).
6. Prove the reachability invariant `s is reachable ⇒ s ∈ γS(φ(s.rip))` (Theorem 2, p.3).

The paper summarizes the purpose: “This theorem shows that the abstract semantics overapproximate the concrete ones.” (Section III, p.3.)

Verus form (Inference:): define machine and abstract states as datatypes, `spec fn` concretization relations, and pure transition functions. Prove simulation with `ensures`; represent join laws and monotonicity as lemmas. A verified worklist loop can maintain that every reachable concrete state is represented by the abstract state at its instruction pointer. Verus cannot directly import Isabelle/HOL proofs, so the semantics and lemmas must be re-expressed in Rust/Verus.

## technique: proof-obligation-driven domain instantiation

Use this when domain implementations should be replaceable without reopening the soundness proof. The paper states that “The above generic functions must satisfy a set of 26 proof obligations.” (Section III-B, PDF p.4.) The obligations include commutative-semigroup behavior of join, reflexive/transitive enclosure, overapproximation of join, separation, and abstract operations, plus compatibility of join with separation and enclosure (Figure 1, p.4).

Apply it as follows:

1. Choose a representation for abstract pointers and values.
2. Implement γ_V, abstract operation S, join ⊔, separation ⊲⊳, enclosure ⊑, and aliasing.
3. Prove each obligation once for the chosen representation.
4. Instantiate the generic algorithm; Theorems 1 and 2 then transfer soundness to the instance.
5. Add a termination bound: the authors cap set sizes, replacing an overlarge pointer set by ⊤. Larger caps improve precision but increase run time (Section V, PDF p.6).

Verus form (Inference:): encode the obligations as `proof fn` lemmas over a domain trait-like datatype; keep trait methods executable only where needed. Use set/map specifications and `ensures` to establish monotonicity and overapproximation. Do not put `ensures` on a `spec fn`; prove properties about it. The top fallback should be an explicit enum variant with a specification that contains every concrete value.

## technique: three precision tiers

The paper instantiates the interface with three domains (Section IV, PDF pp.4–5):

- C (constant computations) stores a non-empty set of symbolic expressions such as `{rsp0−8, rdi0+16}`; it is most precise but can grow large
- B (bases) stores recognized bases such as stack pointers, globals, allocations, or symbols, abstracting offsets while retaining separation information
- S (sources) stores the set of inputs used to compute a pointer, such as `{rdi0,rsi0,Fun getc}`; it is coarser but scalable

The running example demonstrates the intended degradation: a heap allocation is represented by a base, a stack address by a constant computation, and an input-dependent write by a source set (Example 1, PDF p.5). Join is set union, and abstract states map registers, flags, and memory regions to values.

Verus form (Inference:): define each domain as a Rust enum or set-backed struct, and a common `spec fn concretizes(v, concrete)` relation. Implement domain-specific join and prove that C concretization is included in the join concretization; B and S similarly. A product may select a tier by configuration while sharing one verified interpreter.

## technique: make separation assumptions explicit

Use this when alias analysis relies on environmental assumptions. For C pointers, the paper decides separation with an SMT query: two regions are separate iff no address satisfies both interval constraints (Section IV-A, PDF p.5). For B and S it defines algebraic relations, distinguishing “necessarily” separate from merely “desirable” separation (Figure 3, p.6). Examples include stack versus allocation, distinct allocation IDs, and function-return sources; different stack frames and different data sections are only desirable assumptions.

The paper warns: “The trusted code base is thus reduced to the validity of explicit and configurable assumptions such as ‘regions based on stack pointers of different functions are assumed to be separate’.” (Introduction, PDF p.2.) It also assumes partially overlapping accesses do not concern pointers and taints values read or written by such accesses (Section III-A, p.4).

Verus form (Inference:): encode necessary and desirable separation as separate predicates and require callers to supply the assumptions explicitly. Prove that any “necessary” relation implies disjoint concrete regions; keep “desirable” assumptions in a separately named axiom/spec boundary. This makes trust visible in the verified Rust API.

## technique: context-sensitive interprocedural summaries

Use this when binary callbacks or function pointers cross function boundaries. Analyze each function bottom-up, derive preconditions describing incoming pointer regions, and derive postconditions summarizing written/read regions and pointer values in return registers or globals (Introduction, PDF p.2). Compose summaries at callers. In the example, a global function pointer written at 0x2010 lets analysis resolve an indirect call to 0x6050 (Section V, Figure 4, PDF p.6).

Verus form (Inference:): represent summaries as spec records with pre/post predicates; prove a function’s postcondition from its body and call-site precondition. A verified caller can use the callee summary without re-analyzing the callee. Unresolved indirections remain unexplored, a stated limitation.

## evidence, assumptions, and product implications

The Isabelle/HOL development proves soundness; a Haskell mirror supplies experiments. On roughly 1.4 million assembly instructions, overall recall was 100%; Table II reports 94.2% of functions OK, 5.41% with unresolved indirections but resolved returns OK, and 0.39% ERR where precision could not show the return address was safe (Table II, PDF p.8). The denominator is all analyzed functions in the listed binaries; the setting is an Apple M1 Pro with 32 GB, with at most about 15 GB for vim. On the SPEC 2006 dataset, Table I gives average precision 94.7% (this paper) versus 98.4% BinPointer and 33.6% BPA for local, 93.0% versus 78.0% and 58.8% for global, and 50.2% versus 20.9% and 13.2% for heap (Table I, p.8). Recall is reported as 100% on that dataset, but the paper notes BinPointer also reported 100%.

What is proved is abstract overapproximation relative to the modeled concrete semantics and assumptions. Trusted parts include Isabelle/HOL, the concrete machine model, the partially-overlapping-access assumption, architecture scope (x86-64 only), no concurrency, manually chosen caps, and separation assumptions. The implementation does not resolve every indirection and can miss paths. The paper itself says: “A fundamental limitation is that not all indirections may be resolved, which may lead to unexplored paths.” (Introduction, PDF p.2.)

Inference: this is directly useful to VL as a reusable pattern for verified analyzers: specify an abstract domain contract once, prove a generic interpreter, and make precision a replaceable policy. Inference: for agent-written verified Rust, unsound pointer facts can invalidate higher-level proofs, while overly coarse `top` facts can make proofs vacuous or exploration explode. The paper’s explicit assumptions and denominated recall/precision evaluation are safeguards VL should preserve. Existing work already covers this generic binary pointer-analysis architecture; VL should not redo it without a concrete Rust/Verus integration gap.

## techniques for the catalog

- generic simulation interface — prove concrete-step inclusion and a reachability invariant once over an abstract-domain contract
- proof-obligation-driven domains — require join, concretization, separation, enclosure, and operation laws before instantiation
- precision tiers — provide constant, base, and source pointer domains with a shared sound interpreter
- explicit separation assumptions — distinguish necessary from desirable alias assumptions and expose them in the trust boundary
- fixed-point binary analysis — revisit instruction addresses, join states, and stop when a stored abstract state subsumes the current one
- context-sensitive summaries — derive pointer pre/postconditions per function and compose them across indirect calls
Checked 2026-10-15 against paper verbeek2025binary: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
