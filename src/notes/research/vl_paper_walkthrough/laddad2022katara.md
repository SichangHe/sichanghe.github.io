# Katara: synthesizing CRDTs with verified lifting
(authored by agents unless marked 🧑)
Tag: `laddad2022katara`, [paper](https://doi.org/10.1145/3563336)

## result and boundary

Katara takes a sequential C/C++ data type plus a small operation-ordering policy and synthesizes a state-based CRDT. Its correctness target is observable behavior over arbitrary operation sequences, with convergence obtained from a join-semilattice state representation. The abstract says: “Katara is able to automatically synthesize CRDTs for a wide variety of scenarios, from reproducing classic CRDTs to synthesizing novel designs based on specifications in existing literature.” (Abstract, p.1)

The key user artifact is a sequential reference, not a CRDT proof written by hand. The paper says: “Users need only to annotate their sequential data types with a simple function that defines the order in which conflicting operations should appear to occur.” (§1, p.2) Katara extracts LLVM semantics, synthesizes candidate state and runtime logic, checks bounded candidates, then synthesizes invariants for unbounded verification (§6, p.18; §5.3, pp.17–18).

Inference: this is relevant to VL as a pattern for generating verified Rust data structures from a reference API and a compact policy. It is a synthesis system, not a Verus implementation, so the Verus forms below are translations of the proof obligations rather than claims about the paper's tool.

## technique 1: sequential reference plus ordered semantics

What it is. A sequential type is modeled by `st(s,o)`, `query(s,q)`, and `initialState`; a CRDT has corresponding starred functions plus `merge`. Since distributed operations may arrive in different orders, Katara lets the user define `opOrder(o1,o2)`, meaning o2 may occur after o1. The paper explains: “Instead of having to consider all potential interleavings of operations in a distributed system, operation orderings make it possible for users to specify the distributed behavior in terms of a sequential execution model.” (§3.2, p.7)

When to use it. Use an ordering when the sequential operations do not commute but the desired CRDT gives one conflict-resolution policy, such as Add-Wins or Two-Phase Set semantics. Optional timestamps extend ordering lexicographically; Katara uses Lamport timestamps and requires positive timestamps (§3.3, pp.7–8).

How to apply it.

1. Implement the sequential state transition and query in C/C++ (§3, pp.5–6).
2. Define `opOrder`; for example, place removes before inserts for a Grow-Only Set, or inserts before removes for a Two-Phase Set (§3.2, p.7).
3. Enable timestamps when conflicts are ordered by time; the combined order first compares timestamps, then the user policy (§3.3, p.7).
4. Add `opPrecondition` constraints, including timestamp > 0 when timestamps are enabled (§3.3, p.8).
5. Synthesize and verify a CRDT only for executions satisfying the policy.

Verus form. Inference: encode `Op`, `State`, and `CrdtState` as Rust enums/structs; write executable `step` and `query` methods, and `spec fn op_order(a,b) -> bool` plus `spec fn op_precondition(a) -> bool`. A proof function can quantify over an operation sequence and require each adjacent pair to satisfy `op_order`. Timestamp arithmetic needs `requires` bounds and `ensures` for monotonicity. Inference: the ordering is part of the functional contract; it does not prove that an external network delivers operations in that order.

Evidence. Table 1 has nine benchmark specifications, each with a 16–24 LoC sequential type; operation orderings were at most 4 LoC of integer comparisons (§7.1, p.20). The synthesis succeeds for every benchmark listed in Table 1 (§7.1, pp.20–21).

Limits. The resulting semantics intentionally relax strict equivalence for non-commutative operations (§3.2, p.7). Inference: a policy that omits a required ordering can make a mathematically correct proof certify the wrong user behavior.

## technique 2: bisimulation-style state equivalence

What it is. Katara synthesizes `equivalent*(s,s*)`, relating a sequential state and CRDT state. It proves three rules: equivalent initial states, preservation after every valid operation, and equal query results. The paper states: “We encode this proof by introducing the state equivalence function, which relates the states of the sequential reference and synthesized CRDT.” (§4.1, p.8)

How to apply it.

1. Define the initial equivalence condition.
2. Require that `equivalent*` plus `opPrecondition(o)` implies equivalence after `st` and `st*` (§4.1, p.8).
3. Require equal `query` and `query*` results whenever states are equivalent (§4.1, p.8).
4. Synthesize the relation as an inductive invariant; strengthen it when the transition rule cannot be proved.

Verus form. Inference: write `spec fn equivalent(s: SeqState, c: CrdtState, q: Query) -> bool`, and a `proof fn` with `requires equivalent(...) && op_precondition(op)` and `ensures equivalent(next_seq, next_crdt, q)`. A second lemma proves query equality. Use `invariant` on any sequence-processing loop to preserve equivalence for the processed prefix. Inference: the query parameter should be explicit when a whole-state relation is too expensive.

Evidence. Figure 3 gives the exact three verification rules (§4.1, p.8). The paper reports that all nine benchmarks obtain inductive invariants and provably correct CRDTs over unbounded executions (§7.1, p.21).

Limits. Equivalence is a user-observable relation, not necessarily representation equality. A weak relation can be vacuous unless the query rule and reachable-state invariant constrain it; the paper notes that the relation may need to be stronger because it also reasons about future states (§4.1, p.8).

## technique 3: state-based convergence by semilattice construction

What it is. Katara restricts CRDT state to compositions of join-semilattices. The merge operation is the lattice join, so associativity, commutativity, and idempotence follow from the chosen state representation. The paper says: “By limiting the search space of state types to compositions of join-semilattices, we are able to achieve convergence—normally the most difficult property of CRDTs to verify—entirely by construction.” (§1, p.3)

How to apply it. Enumerate lattice compositions such as `MaxInt`, `OrBool`, `Set`, `Map`, `LexicalProduct`, and `FreeTuple` (§5.1, pp.13–14). Define state transition as `merge(state, f*(operation))`; synthesize only `f*` and queries (§5.2.1, p.13). For a non-idempotent operation, enable node IDs and store per-node portions in maps; queries reduce those portions (§5.2.2, pp.15–16).

Verus form. Inference: define a ghost/specification `join` and prove `commutative`, `associative`, and `idempotent` lemmas once for each state component. The executable update calls the join with a synthesized or hand-written delta. Use `ensures` to preserve the lattice laws and `proof fn` lemmas to show merge convergence. Node-owned maps need a key-ownership invariant and a proof that gossip cannot overwrite another node's owned region. Inference: Rust's `HashMap` behavior and iteration order need explicit specifications if used in executable code.

Evidence. Katara synthesized General Counter using two node-keyed maps and reductions, and Add-Wins Set using two timestamped maps (Figure 12, pp.21–22). All generated designs in Table 1 were verified (§7.1, p.21).

Limits. The grammar restricts the design space. Maps are not handled by CVC5's unbounded theory; the implementation falls back to bounded Rosette verification with a large bound (§6.2, p.19). Inference: “verified” for map-heavy candidates depends on the adequacy of that bound unless an independent unbounded proof is supplied.

## technique 4: query-parameterized equivalence

What it is. Whole-state equivalence becomes difficult for unbounded maps and sets. Katara adds a query parameter q so that equivalence checks only the state portion relevant to one query. The paper states: “By giving the equivalence function a specific query, the synthesized logic can now focus on comparing the parts of each state that are relevant to that query.” (§4.3, p.10)

How to apply it. Add q to the initial and inductive equivalence rules; pass q to the query rule (Figure 5, p.10). Seed equivalence with direct query equality, then synthesize a relation and CRDT invariant. For a map query, this can reduce comparison to one key (§4.3, p.10).

Verus form. Inference: define `equivalent(s,c,q)` rather than requiring equality of all map entries. Prove a projection lemma that the implementation's `query(c,q)` depends only on the projected entries. Use `requires` to state the projection and `ensures` for equal query results. Inference: this is sound only if every public observation is represented by a query and the projection lemma is complete.

Evidence. The optimization is part of the formal conditions in Figure 5 (§4.3, p.10), and the paper attributes substantial synthesis simplification to it (§4.3, p.10).

## technique 5: bounded-log pruning followed by unbounded invariant synthesis

What it is. Katara uses two verification encodings. The first stores a bounded operation log and quickly rejects candidate states and runtime functions. The second removes the log and synthesizes invariants for unbounded executions. The paper says: “To reduce this impact, we employ a two-phase synthesis approach where we synthesize the core logic of candidate CRDTs with verification conditions that check a bounded number of operations ... and separately synthesize the invariants to prove unbounded correctness.” (§4.4, p.10)

How to apply it.

1. Choose a small `logBound` (Algorithm 1 starts at 2) and enumerate semilattice state structures (§5.3, pp.17–18).
2. Reject candidates whose bounded log is not valid, in-order, or coherent with the candidate state; the log is a verification variable and cannot be used by synthesized code (§4.4, pp.10–11).
3. Synthesize state transition, query, and relation with bounded rules.
4. Re-synthesize `invariant*` and `orderWithState*` against unbounded rules (§5.2.4, pp.16–17).
5. If unbounded synthesis fails, increase log bound and invariant grammar depth, then retry; return only a candidate with a successful unbounded proof (Algorithm 1, p.18).

Verus form. Inference: use a ghost sequence of operations for bounded search and separate `proof fn` lemmas for the unbounded induction. The final Rust proof should quantify over arbitrary next operations and use loop `invariant` clauses for prefixes; a finite test log is only a pruning heuristic. Inference: never expose the ghost log to executable behavior.

Evidence. For Add-Wins Set, pruning evaluates all 86 candidates in under 15 minutes, while unpruned candidates can take up to an hour each (Figure 13, p.22). Table 2 reports up to a 5× speedup for sets (§7.2, p.22). The numbers are benchmark-specific: 86 candidates is the denominator for that Add-Wins Set plot.

Limits. Bounded success alone is not a proof. If the unbounded invariant grammar is too small, the process retries with larger depth; some candidate may remain undiscovered (§5.3, p.18).

## technique 6: typed grammars and solver encodings

What it is. Katara synthesizes state transitions, queries, relations, and invariants from type-directed grammars. Specialized integer types—`OpaqueInt`, `ClockInt`, and `EnumInt`—remove semantically impossible expressions and shrink the search (§5.2.3, pp.15–16). Runtime logic is lowered to SMT; CVC5 handles sets, while Rosette/Z3 handles bounded structures (§6, pp.18–19).

How to apply it. Extract LLVM IR from the sequential C/C++ source, inline user-defined functions, map primitive and collection APIs to SMT theories, and turn basic blocks into conditional specifications (§6.1, p.18). Generate grammar productions consistent with argument and return types; increase expression depth iteratively. For non-idempotent operations, add node-ID map reads, writes, and reductions (Figure 9, p.15).

Verus form. Inference: model the same restriction with Rust types and `spec fn` signatures so impossible expressions are rejected before proof search. Use `assert` and `broadcast proof fn` only where solver facts are needed; keep collection specifications explicit. Inference: Verus does not synthesize Rust from a grammar automatically, so a VL implementation would need a separate generator whose output is then verified.

Evidence. Table 2 reports default and no-pruning times for nine benchmarks on an AMD Ryzen 9 3900X, 12 threads, 48 GB RAM, LLVM 11, Rosette 4.1, and CVC5 1.0.2 (§7.1, p.20). Times range from 21 seconds for Add-Wins Set to 21m17s ±11s, and from 26 seconds for LWW Register to 11m3s ±4s for General Counter (Table 2, p.20); each denominator is repeated synthesis runs summarized by the reported standard deviation.

Limits. CVC5 has no map theory in this implementation; “the bounds we use for the fallback are sufficiently large to consistently produce correct synthesized results,” the authors report (§6.2, p.19). This is empirical evidence, not a universal completeness guarantee.

## what is proved, trusted, and already done

The proved claim is that generated CRDT operations and queries match the sequential reference under the declared ordering and that the state merge converges for the supported semilattice construction. The measured claims are synthesis success, time, pruning speed, and alternative designs for nine benchmark specifications (§7, pp.19–23). Trusted or bounded parts include LLVM semantic extraction, Rosette/CVC5/Z3, collection theories and axioms, the grammar, the sequential reference, operation-ordering policy, and hardware/runtime behavior. Inference: the reference implementation and ordering policy are the dominant product trust boundary because a wrong reference can be proved perfectly.

The paper reports a novel map-based Two-Phase Set using an `OrBool` map and default `true`, alongside the classic design (Figures 14, pp.22–23). Inference: VL should not redo generic synthesis of CRDTs from sequential types, semilattice-based convergence, query-parameterized equivalence, or two-phase bounded/unbounded pruning without a new Rust/Verus result. A product of agent-written verified Rust still faces specification omission, unsupported library semantics, bounded fallback proofs, and synthesis timeouts. Inference: the strongest reusable idea is to force a small reference contract and have the generator return only after an independent unbounded proof.

## techniques for the catalog

- ordered sequential lifting — specify a sequential type plus `opOrder` and synthesize CRDT behavior for ordered executions
- bisimulation state equivalence — synthesize an inductive relation preserving transitions and query results
- semilattice convergence by construction — compose join-semilattices so merge is associative, commutative, and idempotent
- query-parameterized equivalence — compare only state projections relevant to a quantified query
- bounded-log pruning — reject candidates with finite operation logs before unbounded invariant synthesis
- typed SMT grammars — constrain generated expressions by specialized types and lower supported APIs to solver theories
- node-owned non-idempotent state — use node-keyed maps and reductions to synthesize counters and related operations
Checked 2026-10-14: audit record laddad2022katara; paper-study comparison complete; gate executed; experiments not rerun
