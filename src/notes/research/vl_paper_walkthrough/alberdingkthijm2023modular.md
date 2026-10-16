# Modular Control Plane Verification via Temporal Invariants
(authored by agents unless marked 🧑)
Tag: `alberdingkthijm2023modular`, [paper](http://arxiv.org/abs/2204.10303v2)

## problem and result

Timepiece verifies distributed routing control planes by giving each node a local interface describing routes that may appear at every logical time. The interface is an overapproximation, so it may admit more routes than a concrete execution, but it must include every actual state. The paper's abstract reports the motivation and scale: “Monolithic control plane verification cannot scale to hyperscale network architectures with tens of thousands of nodes, heterogeneous network policies and thousands of network changes a day.” (abstract, p. 1). Timepiece addresses this with temporal invariants and independent SMT checks per node.

The key correctness result is inductive. Initial conditions put each node's initial route in its interface at time zero. Inductive conditions require every merge of neighbor routes at time `t` to produce a route in the node's interface at `t+1`. A safety condition requires the interface to be contained in the desired property. The paper states, “The most important property of our system is soundness: the simulation states are included in any interface A that satisfies the initial and inductive conditions.” (§3, p. 12). For closed networks, it also proves completeness: exact singleton interfaces reproduce the concrete simulation (§3, p. 13).

Inference: The transferable pattern for VL is a per-component temporal contract whose inductive preservation is checked independently, then composed into a system property. Verus can encode the same idea for a transition system, but Timepiece's route algebra, SMT encoding, and network semantics are outside Verus unless modeled explicitly.

## technique 1: replace stable-state interfaces with time-indexed invariants

What it is. Stable-state modular analyses can be unsound because neighboring components can circularly justify routes that never occur in an execution. Timepiece adds logical time to each route and checks the whole step-by-step execution. The authors explain: “The basis of Timepiece’s approach is a temporal model of network execution.” (§2.3, p. 9).

How to apply it.

1. Define a network graph, route set, initialization function `I`, edge transfer functions `f`, and merge operator `⊕` (formal model, §3, pp. 11–12).
2. Define each interface `A(x)(t)` as the set of routes allowed at node `x` at time `t` (§2.3, p. 9).
3. Check the initial condition `I_x ∈ A(x)(0)` for every node (§2.3, p. 9).
4. For every node, time, and combination of routes from its neighbors' interfaces at that time, check that applying transfers, merging, and initialization yields a member of `A(x)(t+1)` (§2.3, p. 9; Eq. 2).
5. State the desired node property `P(x)(t)` and check `A(x)(t) ⊆ P(x)(t)` for all times (§3, p. 13).
6. Use induction on time to conclude that all simulation states satisfy the interfaces, then use the safety inclusion to conclude the property (§3, pp. 12–13).

The paper's temporal language includes `G(P)` for all times, `P1 Uτ Q2` for a predicate until witness time `τ`, and `Fτ(Q)` for eventual satisfaction (§2.3, p. 9; Fig. 12, p. 13). Exact witness times let a reachability proof state when a route must appear; without them, an interface can be too weak to prove eventual reachability (§2.3, pp. 10–11).

Inference: In Verus, represent logical time as a natural-number ghost parameter or transition-system state. A transition proof can require an invariant at time `t` and ensure it at `t+1`; a `spec fn` can define temporal predicates over state histories. Use Verus `invariant` clauses on bounded simulations and `requires`/`ensures` on transition functions. This is an encoding inference; the paper uses C#, Zen, Z3, and set predicates, not Verus.

Evidence and failure mode. Time-indexing detects the bad-interface example: a counterexample appears at time zero when an interface omits the initial route, and another at time one when a route produced by neighbors is absent (§2.3, pp. 10–11). Stable-state reasoning would miss this execution interference. The method assumes the network semantics and transfer functions accurately model the deployed control plane.

## technique 2: express interfaces with a small temporal-operator language

What it is. Rather than writing an unbounded set of time-indexed sets directly, users compose a deliberately small language of temporal operators and lifted union, intersection, and negation. The paper says the operators are “syntactic sugar for functions from a time t to a predicate.” (§3, p. 12).

How to apply it. Choose predicates over route state (local preference, path length, tags, prefix), then combine them with `G`, `Uτ`, and `Fτ`. For example, a reachability property for a node at distance `dist(v)` is `F_dist(v) G(s ≠ ∞)`, while a corresponding interface is `F_dist(v) G(s ≠ ∞)` (§6, p. 18). A bounded path-length property combines “no better routes appear” with eventual bounded length: `G(s = ∞ ∨ s.lp = 100) ⊓ F_dist(v) G(s.len ≤ dist(v))` (§6, p. 18). A hijack property uses a ghost `tag` to require an internal route for prefix `p` and `¬s.tag` (§6, p. 19).

The language intentionally limits expressiveness. The paper reports that it was sufficient for varied reachability and security properties while avoiding arbitrary temporal nesting that would make SMT obligations expensive (§3, p. 12; related work, §7, p. 22). Inference: VL can use a similarly restricted ghost-state DSL for protocol phases, retries, deadlines, and eventual conditions, then compile each operator into Verus predicates and proof obligations. The restriction should be documented as a soundness and automation boundary, not hidden as general temporal logic.

## technique 3: modular SMT checking with counterexample-guided strengthening

What it is. Timepiece encodes the initial, inductive, and safety conditions separately for each node and asks an SMT solver whether each formula is valid. Algorithm 1 runs the node checks in parallel. If the negation is satisfiable, the solver returns a concrete route, time, and symbolic-variable assignment as a counterexample (§4, pp. 13–14).

How to apply it.

1. Encode each node's initial, inductive, and safety conditions from the network, interface, and property (Algorithm 1, §4, p. 14).
2. Represent routes with suitable SMT sorts; the paper uses integer/Boolean route fields and Presburger arithmetic for the running example (§4, p. 14).
3. Use symbolic variables for external peers, multiple destinations, or nondeterminism, adding explicit preconditions as needed (§4, p. 14).
4. Ask `IsValid` for each formula. If false, call `GetCounterExample` (§4, p. 14).
5. Interpret an initial/inductive counterexample as an interface that fails to overapproximate behavior; interpret a safety counterexample as either a real bug or an interface too weak to prove the property (§4, p. 14).
6. Strengthen the local interface using the reported routes and time, then rerun the affected checks (§4, pp. 14–15).

Independent formulas make checks embarrassingly parallel; encoding cost grows with node in-degree, while safety formulas are generally small (§4, p. 14). Inference: Verus can follow the refinement loop with a failing proof obligation or counterexample model, but Verus's solver diagnostics are not Timepiece's `GetCounterExample` API. A Verus implementation should keep assumptions on symbolic inputs explicit because Timepiece notes that encoded assumptions are not themselves checked (§4, p. 14).

## technique 4: reuse role-based interfaces across topology changes

What it is. The authors generate interfaces parametrically from node roles, such as fattree pod/tier or internal versus external WAN node. They report: “As a node’s role determined its invariant, it is easy to extend or update these networks (e.g., adding a new pod or external neighbor) and reuse the appropriate existing invariant for a node of that role.” (evaluation, §6, p. 16).

How to apply it. Classify each component by a finite role, write one invariant schema per role, instantiate it for every node, and verify local conditions in parallel. Keep topology and policy definitions separate from role invariants so updates can reuse the schema (§6, p. 16). Inference: a Verus state machine can encode role-indexed invariants as a `spec fn` over node identifiers and prove that insertion of a node preserves the global invariant when its role assumptions hold. The paper does not establish that role classification is automatically inferred or that arbitrary updates preserve behavior.

## evidence, trusted assumptions, and product threat

The evaluation used synthetic fattrees with `k` from 4 to 40 (up to 2,000 nodes) and four properties, plus an Internet2 configuration with more than 200 nodes and 1,552 Junos policies (§6, pp. 16–20). The main hardware was a 96-vCPU, 384-GB Azure VM; modular checks ran in parallel, monolithic checks on one thread, and runs timed out at two hours (§6, p. 16). For all-pairs reachability on the 2,000-node fattree, Timepiece finished in 5.5 minutes with 99% of node checks under 9 seconds, while monolithic verification timed out at `k = 8` (§6, p. 18). For bounded path length, Timepiece solved `k = 40` in about 66 minutes with 99% of nodes under 2.4 minutes, while the monolithic check was impossible at `k = 4` (§6, p. 18). For route hijacking, 99% of node checks were under 3 seconds and the longest was 10.7 seconds at `k = 40`; all-pairs modular verification took at most 36.6 minutes (§6, p. 19). On Internet2, modular verification took 38.3 seconds on a 6-core MacBook Pro, median 0.6 seconds, 99th percentile 4.2 seconds, while monolithic verification exceeded two hours (§6, p. 20).

The Internet2 result is explicitly limited: the authors modeled only IPv4/BGP, abstracted some behavior as sound overapproximation, and did not know the intended routing behavior, so a counterexample might not be a real violation (§6, pp. 20–21). The implementation trusts C#, the NV and Zen modeling libraries, Z3, the route semantics, symbolic-input assumptions, and the supplied interfaces. Inference: Verus would add the verifier, compiler, solver, standard-library specifications, and deployment environment to that trusted base.

Inference: The threat to agent-written verified Rust is moderate and architectural. Timepiece demonstrates that local temporal contracts can scale and produce useful counterexamples, but it also shows the cost of writing and maintaining interfaces. VL should borrow role-indexed contracts, explicit time or phase state, and counterexample-guided strengthening for distributed agents. It should not claim that a verified local interface proves unmodeled network or real-world behavior.

## techniques for the catalog

- temporal interface invariant — index each component's allowed states by logical time and prove initial plus inductive closure
- restricted temporal DSL — combine global, until-witness, finally-witness, union, intersection, and negation operators over state predicates
- modular SMT checking — encode initial, inductive, and safety conditions per component, run them in parallel, and refine from counterexamples
- role-indexed invariant reuse — parameterize interfaces by component role so topology and policy updates reuse local schemas
- ghost-state security properties — add explicit tags or markers to prove reachability, isolation, route filtering, and anti-hijack conditions

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
