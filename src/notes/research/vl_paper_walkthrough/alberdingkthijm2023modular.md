# Modular Control Plane Verification via Temporal Invariants
(authored by agents unless marked 🧑)
Tag: `alberdingkthijm2023modular`, [paper](https://doi.org/10.1145/3591222)

## problem and result

Timepiece verifies distributed routing control planes by giving each node a local interface describing routes that may appear at every logical time. The interface is an overapproximation, so it may admit more routes than a concrete execution, but it must include every actual state. The paper's abstract reports the motivation and scale: “Monolithic control plane verification cannot scale to hyperscale network architectures with tens of thousands of nodes, heterogeneous network policies and thousands of network changes a day.” (abstract, p. 1). Timepiece addresses this with temporal invariants and independent SMT checks per node.

The key correctness result is inductive. Initial conditions put each node's initial route in its interface at time zero. Inductive conditions require every merge of neighbor routes at time `t` to produce a route in the node's interface at `t+1`. A safety condition requires the interface to be contained in the desired property. The paper states, “The most important property of our system is soundness: the simulation states are included in any interface A that satisfies the initial and inductive conditions.” (§3, p. 12). For closed networks, it also proves completeness: exact singleton interfaces reproduce the concrete simulation (§3, p. 13).

## technique 1: replace stable-state interfaces with time-indexed invariants

What it is. Stable-state modular analyses can be unsound because neighboring components can circularly justify routes that never occur in an execution. Timepiece adds logical time to each route and checks the whole step-by-step execution. The authors say in the introduction: “The basis of Timepiece’s approach is a temporal model of network execution, where we reason over the states of nodes at all times.” (§1, p. 2). The unsoundness of the stable-state strawperson procedure is shown in §2.2 (pp. 7–8), and the temporal fix is in §2.3 (p. 9).

How to apply it.

1. Define a network graph, route set, initialization function `I`, edge transfer functions `f`, and merge operator `⊕` (formal model, §3, pp. 11–12).
2. Define each interface `A(x)(t)` as the set of routes allowed at node `x` at time `t` (§2.3, p. 9).
3. Check the initial condition `I_x ∈ A(x)(0)` for every node (§2.3, p. 9).
4. For every node, time, and combination of routes from its neighbors' interfaces at that time, check that applying transfers, merging, and initialization yields a member of `A(x)(t+1)` (§2.3, p. 9; Eq. 2).
5. State the desired node property `P(x)(t)` and check `A(x)(t) ⊆ P(x)(t)` for all times (§3, p. 13).
6. Use induction on time to conclude that all simulation states satisfy the interfaces, then use the safety inclusion to conclude the property (§3, pp. 12–13).

The paper's temporal language includes `G(P)` for all times, `P1 Uτ Q2` for a predicate until witness time `τ`, and `Fτ(Q)` for eventual satisfaction (§2.3, p. 9; Fig. 12, p. 13). Exact witness times let a reachability proof state when a route must appear; interfaces that hold at all times (Fig. 7) are too weak to prove that w can reach e, and Fig. 8 adds witness times to fix this (§2.3, p. 10).

Inference: In Verus, represent logical time as a natural-number ghost parameter or transition-system state. A transition proof can require an invariant at time `t` and ensure it at `t+1`; a `spec fn` can define temporal predicates over state histories. Use Verus `invariant` clauses on bounded simulations and `requires`/`ensures` on transition functions. This is an encoding inference; the paper uses C#, Zen, Z3, and set predicates, not Verus.

Evidence and failure mode. Time-indexing detects the bad-interface example: a counterexample appears at time zero when an interface omits the initial route, and, if the interface is patched to allow ∞, another at time one where v's route ⟨100, 1, true⟩ is absent from the interface (§2.3, p. 10). The stable-state strawperson procedure accepts the corresponding bad interfaces (Fig. 4; §2.2, pp. 7–8). The method assumes the network semantics and transfer functions accurately model the deployed control plane.

## technique 2: express interfaces with a small temporal-operator language

What it is. Rather than writing an unbounded set of time-indexed sets directly, users compose a deliberately small language of temporal operators and lifted union, intersection, and negation. The paper says “The temporal operators 𝑄 are syntactic sugar for functions from a time 𝑡 to a predicate.” (§3, p. 11).

How to apply it. Choose predicates over route state (local preference, path length, tags, prefix), then combine them with `G`, `Uτ`, and `Fτ`. For example, the fattree reachability property is `F^4 G(s ≠ ∞)` (4 is the fattree diameter), while its interface is `F^dist(v) G(s ≠ ∞)` with `dist(v)` the node's distance to the destination (§6, p. 18). The bounded path-length interface combines “no better routes appear” with an eventual bound: `G(s = ∞ ∨ s.lp = 100) ⊓ F^dist(v) G(s.len ≤ dist(v))` (§6, p. 18). The hijack property is `F^4 G(s.prefix = p ∧ ¬s.tag)`; it uses a boolean ghost `tag` to mark routes from the external hijacker, and its interface adds `G(s.prefix = p → ¬s.tag)` (§6, p. 19).

The language intentionally limits expressiveness. The paper reports that this “(intentionally small) language” was “sufficient to express a wide variety of reachability and security properties” (§3, p. 12), and that none of its properties needed more than one witness time (footnote 8, p. 16). The related-work section says it “carefully limits the expressiveness of this language, e.g., by not allowing arbitrary nesting of temporal operators, while allowing efficient verification of the proof obligations using SMT solvers” (§7, p. 21), although §3 (p. 12) does describe nesting `U` and `F` operators.

## technique 3: modular SMT checking with counterexample-guided strengthening

What it is. Timepiece encodes the initial, inductive, and safety conditions separately for each node and asks an SMT solver whether each formula is valid. Algorithm 1 runs the node checks in parallel. If the negation is satisfiable, the solver returns a concrete route, time, and symbolic-variable assignment as a counterexample (§4, pp. 13–14).

How to apply it.

1. Encode each node's initial, inductive, and safety conditions from the network, interface, and property (Algorithm 1, §4, p. 14).
2. Represent routes with suitable SMT sorts; the paper uses integer/Boolean route fields and Presburger arithmetic for the running example (§4, p. 14).
3. Use symbolic variables for external peers, multiple destinations, or nondeterminism, adding explicit preconditions as needed (§4, p. 14).
4. Ask `IsValid` for each formula. If false, call `GetCounterExample` (§4, p. 14).
5. Interpret an initial/inductive counterexample as an interface that fails to overapproximate behavior; interpret a safety counterexample as either a real bug or an interface too weak to prove the property (§4, p. 13).
6. Strengthen the local interface using the reported routes and time, then rerun the affected checks (§4, pp. 14–15).

Independent formulas make checks embarrassingly parallel; encoding cost grows with node in-degree, while safety formulas are generally small (§4, p. 14). Inference: Verus can follow the refinement loop with a failing proof obligation or counterexample model, but Verus's solver diagnostics are not Timepiece's `GetCounterExample` API. A Verus implementation should keep assumptions on symbolic inputs explicit because Timepiece notes that encoded assumptions are not themselves checked (§4, p. 14).

## technique 4: reuse role-based interfaces across topology changes

What it is. The authors generate interfaces parametrically from node roles, such as fattree pod/tier or internal versus external WAN node. They report: “As a node’s role determined its invariant, it is easy to extend or update these networks (e.g., adding a new pod or external neighbor) and reuse the appropriate existing invariant for a node of that role.” (evaluation, §6, p. 16).

How to apply it. Classify each component by a finite role, write one invariant schema per role, instantiate it for every node, and verify local conditions in parallel. Keep topology and policy definitions separate from role invariants so updates can reuse the schema (§6, p. 16). Inference: a Verus state machine can encode role-indexed invariants as a `spec fn` over node identifiers and prove that insertion of a node preserves the global invariant when its role assumptions hold. The paper does not establish that role classification is automatically inferred or that arbitrary updates preserve behavior.

## techniques for the catalog

- temporal interface invariant — index each component's allowed states by logical time and prove initial plus inductive closure
- restricted temporal DSL — combine global, until-witness, finally-witness, union, intersection, and negation operators over state predicates
- modular SMT checking — encode initial, inductive, and safety conditions per component, run them in parallel, and refine from counterexamples
- role-indexed invariant reuse — parameterize interfaces by component role so topology and policy updates reuse local schemas
- ghost-state security properties — add explicit tags or markers to prove end-to-end properties; Table 1 (p. 11) lists reachability, isolation, waypointing and others, and §6 evaluates hijack prevention and block-to-external with ghost tags
