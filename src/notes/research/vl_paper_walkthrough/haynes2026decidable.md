# Decidable By Construction: Design-Time Verification for Truly Fearless Systems
(authored by agents unless marked 🧑)
Tag: `haynes2026decidable`, [paper](http://arxiv.org/abs/2603.25414v5)

## scope and status of the paper

This paper proposes a compiler architecture for Clef programs. Composer lowers a Program Semantic Graph (PSG) directly to CPU, GPU, NPU, and FPGA targets while retaining proof obligations. The abstract states: “Our Composer compiler preserves proofs while lowering Clef directly to native CPU, GPU, NPU and FPGA code, without translation through C or vendor APIs.” (Abstract, p. 1). BAREWire supplies memory-layout, IPC, and network boundary contracts; the PSG binds source values to their representations and accepted evidence.

The central organizing technique is four verification tiers. Tier 1 infers structural relationships; Tier 2 generates local arithmetic and representation obligations; Tier 3 instantiates reusable domain and system lemmas; Tier 4 handles relational and probabilistic proofs with project annotations. The authors state: “Tiers 1–3 require no developer annotations, with a quotation based lemma library design to extend coverage as use cases expand.” (Abstract, p. 1). This is a design proposal with worked derivations, not a reported implementation evaluation. The paper explicitly calls its result conditional: “This paper gives a conditional composition result and worked exact and probabilistic constructions; §10 describes how to assess their coverage, preservation and cost.” (Section 1, p. 2).

## technique 1: separate decidable structural constraints from richer proofs

What it is. Encode units of measure as integer-exponent equations and solve them with principal inference; keep range, lifetime, geometry, and capability facts in separate analyses with explicit transfer laws. The paper's proposition says a satisfiable finite dimensional-equation set has a principal solution and inconsistent equations are rejected (Proposition 2.1, p. 3).

When to use it. Use this split when a compiler must reject malformed operations automatically but richer predicates would make the ordinary type-inference problem intractable. The paper explains: “This separation gives the compiler a tractable structural foundation on which more extensive proofs can depend.” (Section 2, p. 3).

How to apply it.

1. Give each quantity a dimension represented by an integer exponent vector; multiplication adds vectors and division subtracts them (Section 2, p. 3).
2. Solve dimensional equations with principal Hindley–Milner-style generalization, preserving unconstrained parameters for later specialization (Section 2, p. 3).
3. Run geometric support, lifetime, range, and capability analyses as domains with their own transfer law, sound interpretation, and terminating procedure (Section 2, p. 3).
4. Exchange facts between domains only through explicit transfer rules and account for repeated solving when dependencies cycle (Section 2, p. 3).
5. Reject a use when its required bound or representation cannot be established within the analysis budget (Section 5.2, p. 10).

Verus form. Inference: model dimensions and ranges as mathematical datatypes in `spec fn`s; give executable constructors and operations `requires` clauses for compatible dimensions and `ensures` clauses for the resulting dimension. Prove transfer lemmas with `proof fn` and keep loop facts in `invariant` clauses. Inference: Verus does not automatically provide Clef's principal-unification algorithm; that algorithm and its soundness would be executable Rust plus separately proved lemmas.

Evidence and limits. The proposition is stated as a mathematical result under “integer exponents, declared base-measure identities, and the usual Hindley-Milner generalization conditions” (Proposition 2.1, p. 3). The paper gives no implementation size, benchmark corpus, solver-time denominator, or rejection-rate percentage. It also warns that finite support masks do not establish polynomial complexity in algebra dimension because a mask has 2^d positions (Section 2.2, p. 4). Differentiability and derivative correctness remain separate premises (Section 2.1, p. 3).

## technique 2: retain proof binding through a semantic graph

What it is. Store each proved fact together with its derivation, the concrete value or buffer to which it applies, and the state and premises under which it holds. A later proof consumes that evidence through a declared mode interface rather than treating it as an unbound global lemma.

How to apply it.

1. Construct a PSG node for each source value, operation, representation, ownership fact, and protocol event (Sections 1 and 3, pp. 2, 5).
2. Attach the proof statement, its derivation, and its binding to the actual buffer and state. The paper says: “Our PSG retains the proved statement, its derivation and its binding to the actual buffer and state.” (Section 3, p. 5).
3. Define a mode interface describing whether evidence is reusable, consumable, or tied to exclusive ownership (Section 3, p. 5).
4. When a representation or reasoning mode changes during lowering, transport evidence through an explicit shift rule and retain the original premises (Sections 3 and 6.2, pp. 5, 15–16).
5. Revalidate an instantiated law when its operation, representation, or reasoning mode changes (Section 6.5, p. 19).

Verus form. Inference: represent evidence as ghost state carried by structs, with ownership encoded by Verus's proof-oriented types and contracts. Use `requires` to state the preconditions of a mode shift and `ensures` to preserve the bound and its binding after the shift. Inference: Verus's ordinary Rust ownership can represent exclusive resources, but the paper's PSG compiler and mode calculus are not existing Verus constructs.

Evidence and limits. The paper's worked sum carries dimensions, accumulator bounds, ownership, partition identity, and BAREWire representation correspondence through the graph (Section 6.3, pp. 16–18). It does not provide a machine-checked implementation of PSG or a measured proof-reuse rate. The trusted base includes each registered lemma, each adapter between logical evidence and target operations, and the lowering correspondence.

## technique 3: tiered automatic verification with reusable lemmas

What it is. Assign each obligation to a tier, then let the compiler infer premises and instantiate library theorems. The table in Section 5 (p. 9) defines Tier 1 as structural relationships, Tier 2 as local arithmetic/range/representation conditions, Tier 3 as parameterized domain/system contracts, and Tier 4 as relations between computations, distributions, or realizations.

How to apply it.

1. Tier 1: infer dimensions, parametricity facts, and structural support before scheduling (Section 5.1, p. 10).
2. Tier 2: synthesize sound enclosures with abstract interpretation, widening, or bounded refinement; dispatch resulting conditions to admitted decision fragments such as quantifier-free linear integer arithmetic or fixed-width bitvectors (Section 5.2, p. 10).
3. Tier 3: register a parameterized theorem, identify its instance from the PSG, and discharge its supported premises automatically (Section 5.3, p. 11).
4. Tier 4: state a relation between executions, distributions, or realizations; supply project annotations for the two computations, initial-state relation, and observations (Section 5.4, p. 12).
5. Retain every completed judgment and its dependencies so a later tier can use it as a premise (Section 5, p. 9).

Verus form. Inference: Tier 1 and Tier 2 correspond to `spec fn` predicates and solver-backed `assert` obligations; Tier 3 corresponds to reusable `proof fn` lemmas over generic state and ownership; Tier 4 corresponds to relational specifications expressed as paired states and postconditions. Use executable Rust only for the checked operations, with proof code erased after verification. Inference: probabilistic couplings and Iris/Actris/Aneris adequacy require models beyond the Verus constructs documented in the local Verus reference.

Evidence and limits. The paper's evidence is a worked distributed sum, not a system evaluation. It says: “The compiler derives Tier 2 and supported Tier 3 obligations from ordinary code and the hypergraph's retained structure; application developers supply no per-project proof annotations at these tiers.” (Section 1, p. 2). No count of automatically discharged goals or fraction of supported programs is reported. Tier 4 is explicitly expected to need project annotations (Section 5.4, p. 12).

## technique 4: prove a distributed reduction by composing capacity, ownership, protocol, and boundary laws

What it is. Define a reference sum over one input snapshot, prove every partial sum fits a chosen accumulator, associate each payload with a disjoint partition and job identity, accept each partition at most once, and map sender and receiver representations through BAREWire. The final result is one rounding of the exact represented sum (Section 6.3, pp. 16–18).

How to apply it.

1. Fix terms `t_i = δ k_i`, an accumulator width `w`, and `K = 2^(w−1) − 1`; establish `|k_i| ≤ B` and `N B ≤ K` with Tier 2 linear arithmetic (Section 6.3, p. 16).
2. Instantiate a finite-sum lemma proving every subset sum is bounded by `N B` (Section 6.3, p. 16).
3. Give the merge primitive a resource contract: it consumes ownership of two disjoint accumulators and returns the first containing `s+t` while retaining the second (Section 6.3, p. 16).
4. Require each worker payload to cover a disjoint partition exactly once and carry job, epoch, and partition identity (Section 6.3, pp. 17–18).
5. Make acceptance atomic or serialized so concurrent handlers cannot accept a duplicate as fresh (Section 6.3, p. 17).
6. At completion, use partition disjointness and coverage to derive the exact sum, then apply the final-conversion law (Section 6.3, p. 18).
7. Prove liveness separately; the paper says message loss may prevent completion without changing the value of a completed join (Section 6.3, p. 18).

Verus form. Inference: encode the accepted-partition set, accumulator value, and snapshot identifier in a Verus state machine; use transition preconditions to require freshness and postconditions to preserve the sum invariant. Encode disjoint ownership with the proof-oriented resource patterns documented for Verus state machines. Inference: BAREWire layout correspondence and target-device realization must be modeled as trusted external specifications unless separately verified.

Evidence and limits. The derivation establishes a completed-result proposition under stated capacity, ownership, protocol, boundary, and realization premises (Section 6.3, pp. 16–18). It does not report execution trials, worker counts measured in experiments, or failure-rate data. Approximate arithmetic is handled by a separate error relation and union bound; the paper cautions that conditioning on completion can change the probability bound when completion depends on samples (Section 7.3, p. 23).

## technique 5: carry probabilistic and numerical error explicitly

What it is. Give worker errors `ε_i`, boundary errors `η_i`, output error `η_out`, and bad-event probabilities `δ_i`; then derive a completed-result error bound by the triangle inequality and union bound (Section 7.3, pp. 22–23). The paper's proposition states the bound as `Pr[completed ∧ |Ŝ−S| > E] ≤ min(1, Σ δ_i)` for the declared scheduler and sampling model (Proposition 7.2, p. 23).

How to apply it.

1. State each worker's conditional accuracy guarantee outside bad event `B_i`, with `Pr(B_i) ≤ δ_i` (Section 7.3, p. 23).
2. State the receiving interpretation error `|y_i−z_i| ≤ η_i` and exact accumulation capacity (Section 7.3, p. 23).
3. Sum `E = Σ(ε_i+η_i)+η_out` and apply the union bound; no independence between bad events is required (Section 7.3, p. 23).
4. Keep dimensions explicit: error bounds have the physical dimension of the result, while `δ_i` are dimensionless probabilities (Section 7.3, p. 23).
5. Account for retries: a fresh randomized recomputation is another attempt, while retransmitting an established payload is not a resampling (Section 7.3, p. 23).

Verus form. Inference: represent the error budget and event assumptions as specification predicates and prove deterministic implications for each non-bad execution. Verus can prove arithmetic inequalities and state invariants; a probability library and scheduler semantics would need external formalization. Inference: the Verus proof should expose the sampling model and completion condition rather than treating the displayed probability as unconditional.

## additional techniques in the full construction

The earlier sections cover the paper's central proof composition. The remaining construction adds four application patterns.

### dimensional, geometric, and sparse operations

The compiler carries dimensions into storage and target layout: “The implementation must distinguish the logical domain from host storage and target realization.” (Section 2.2, p. 4). Inference: apply this by preserving a dimension predicate from source through representation selection, then require each lowering edge to prove that its carrier and layout implement the same quantity. The paper's PHG also propagates blade support to remove coefficient products before scheduling (Sections 3.2 and 4.2, pp. 6–7). Inference: a Verus implementation can express support as a ghost set and prove that omitted indices are unreachable; it must still prove the target kernel's arithmetic correspondence.

### typed service boundaries and live replacement

A service response is bound to its request, units, current state, and error contract; BAREWire supplies representation correspondence and runtime acceptance (Section 4.3, pp. 7–8). Inference: make a Verus request identifier and contract version part of the state-machine invariant, and require a response transition to match them. For live replacement, the paper uses atomic publication, per-request version consistency, and a lifetime/quiescence law before reclaiming old resources (Section 4.4, p. 8). Inference: encode publication and retirement as transitions with `requires`/`ensures`; reclamation still depends on a proved quiescence model.

### differential compilation and revalidation

Composer tracks semantic dependencies and re-lowers only affected fragments; an edit that changes a participant, representation, or protocol premise renews the affected evidence (Sections 6.5 and 10.2, pp. 19, 29). Inference: a Verus build can cache proof artifacts by contract and dependency identifiers, but must invalidate them when a specification or linked implementation changes. The paper gives an evaluation plan—coverage, generation, solving, certificate checking, theorem application, and revalidation costs (Section 10.2, p. 29)—rather than measurements.

### runtime mechanism contracts

The paper distinguishes runtime projection, residual/penalty objectives, lookup, and geometric specialization; each has a separate result contract and execution cost (Section 8, pp. 25–26). Inference: in Verus, specify each mechanism's postcondition and retain runtime checks when a static proof does not cover all inputs. A lookup must validate version and interpretation; a projection must establish set membership or a declared tolerance; a specialization must prove omitted terms are zero. These are contracts for concrete operations, not automatic proofs of optimization quality.

## what is proved, measured, and trusted

The paper proves or states mathematical propositions conditional on explicit domains, registered lemmas, adapters, and target semantics. It gives no implementation measurements: no compiler size, build time, solver-time denominator, benchmark corpus, automatically solved-goal percentage, or comparison against another verifier appears in the supplied text. The worked examples show how evidence would compose, not that Composer currently accepts those programs.

Inference: the trusted base is broad: Clef's type and effect interpretation, each abstract-interpretation transfer function, decision procedures, Iris/Actris/Aneris or Rocq foundations, BAREWire contracts, target instruction and device semantics, and the compiler's proof-preserving lowering. Inference: a Verus implementation would additionally trust the Verus verifier, solver, proof erasure, Rust compiler, and specifications unless independently checked.

## implications for VeruLaw

Inference: the strongest reusable idea for VL is evidence binding: generated verified Rust should carry contracts tied to concrete buffers, states, protocol identities, and representations, so a proof cannot silently migrate to a different object after lowering or refactoring. Tiering also suggests separating cheap shape/range checks from reusable system lemmas and project-specific relational proofs.

Inference: VL should not redo a generic claim that dimensional inference, ownership logic, or distributed reductions can compose; this paper already presents that architecture and its worked sum. A distinct VL contribution would need an implemented Verus artifact and measurements over a declared corpus, neither of which this paper supplies. Inference: the threat to agent-written verified Rust is high when generated code crosses device or network boundaries, because the paper's guarantees are conditional on unmeasured adapters and target semantics. For ordinary single-process Rust, the tiered evidence-binding pattern is useful but the paper supplies no direct empirical risk estimate.

## techniques for the catalog

- principal dimensional inference: solve integer-exponent unit equations and reject inconsistent operations before richer analyses
- evidence-bound semantic graph: retain each fact with derivation, concrete object, state, and reusable-mode conditions
- four-tier verification: route structural, arithmetic, reusable-system, and relational obligations to progressively richer mechanisms
- verified distributed reduction: compose capacity, ownership, partition freshness, boundary correspondence, and final rounding laws
- explicit probabilistic budgets: combine worker, boundary, and output errors with a declared union bound and completion model
Checked 2026-10-15 against paper haynes2026decidable: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
