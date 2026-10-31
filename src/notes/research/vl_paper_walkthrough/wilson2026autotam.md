# AutoTam: Specifying Secure Protocol Implementations with Tamarin Model Generation
(authored by agents unless marked 🧑)
Tag: `wilson2026autotam`, [paper](https://doi.org/10.48550/arxiv.2606.19937)

## what the paper proves and measures

AutoTam is a protocol-specific language, interpreter, and translator. A developer writes executable protocol roles as states, transitions, and calls to predefined cryptographic, message, and network functions. The same description is interpreted to run the implementation, translated into Tamarin rewrite rules, and symbolically executed with KLEE. The paper's central theorem is trace inclusion: every concrete execution trace has a matching generated Tamarin trace. It assumes a symbolic Dolev-Yao adversary and explicitly leaves computational soundness outside scope.

The language restricts control flow to a high-level protocol state machine. Each state has output then input parts; transitions may cycle. Requirement 1 prevents a transition from overwriting variables live at another transition from the same state. Requirement 2 forbids non-network failures in a state's output part. These restrictions make one extended transition translatable to one Tamarin rule. The authors state, “In this paper, we present AutoTam, which consists of a domain-specific language in which protocol implementations can be written, symbolic models for verification can be extracted, and automated testing using symbolic execution can be performed.” (Section 1.1, p. 3) and prove that generated models preserve traces under the requirements (Theorem 1, Section 5.3, p. 7).

Two case studies are evaluated. The Diffie-Hellman role descriptions are 68 and 74 lines, and the generated model is 107 lines; WireGuard descriptions are 222 and 243 lines, with a 242-line generated model (Table 5, p. 9). Tamarin verifies all listed DH properties in under 5 seconds and the WireGuard model in 359.62 seconds after adding a manually written sources lemma (Table 6, p. 9). KLEE explores 965 and 1,262 DH paths with zero errors, and 44 and 4,120 WireGuard paths with zero errors; the WireGuard responder takes 16 minutes 33 seconds (Table 8, p. 10). The interpreter reaches roughly the throughput of WireGuard-go, but the comparison is expressly not fully fair because routing differs (Section 7.6, p. 11). The implementation omits WireGuard denial-of-service mitigation, timed renegotiation, concurrent transport I/O, and most transport security lemmas (Sections 7.2–7.4, pp. 8–10).

## technique: restricted state-machine DSL

What it is: describe each role as named states with `Output` and `Input` statement lists, and transitions connecting states. Network sends may occur only in output; receives only in input; output precedes input. The paper gives the concrete shape:

```
[ StateName ] {
  Output { [ Statements ] }
  Input { [ Statements ] }
}
Transition ([ FromState ] , [ ToState ]) { [ Statements ] }
```

The authors explain, “To ensure we can soundly extract a model from our implementation, we limit control-flow to a high-level protocol state machine only” (Section 4.1, p. 4).

When to use it: use this for cryptographic protocols whose control flow can be represented as finite-state roles, including loops represented by cyclic transitions. It does not directly cover arbitrary intra-procedural branching or unrestricted loops; choices are made as alternative protocol transitions.

How to do it:

1. Enumerate protocol states and each state's output and input operations.
2. Put every possible network send in output and every receive in input.
3. Encode each message-format or cryptographic action as a predefined function call.
4. Add transitions for every branch and cycle.
5. Check Requirement 1: no transition writes a variable live at a sibling transition's start.
6. Check Requirement 2: output contains no equality checks, AEAD validation, signature verification, or other non-network failure.

Verus form: Inference: represent a role state as a Rust enum and each transition as a function with `requires` and `ensures`. A `spec fn` can define the transition relation and an invariant can state that output precedes input. Use Verus proof functions to show that each transition preserves state and message-shape invariants. Verus does not impose AutoTam's symbolic-model restrictions; those remain design rules that a reviewer or checker must enforce.

Evidence and limits: the DH and WireGuard descriptions demonstrate that the DSL handles finite-state handshake and transport loops. The paper assumes descriptions are syntactically valid and satisfy both requirements in its soundness proof (Section 5.3, p. 7). Therefore the theorem does not cover malformed programs or implementations using unsupported control flow.

## technique: executable-to-Tamarin translation

What it is: translate each extended transition (previous state's input, transition statements, next state's output) into one Tamarin rule. Statement translators map `recv` to `In`, `send` to `Out`, generated secrets to `Fr`, cryptographic calls to symbolic terms, and equality checks to action facts. The running example translates `split`, `RequireSize`, `GenSecret`, and `Concat` into a rule with state facts and an action trace fact.

When to use it: use this when the implementation and the symbolic model should share one source description. The method assumes every callable function has both an executable implementation and a Tamarin translation function.

How to do it:

1. Parse all role descriptions and transform statements to single-static-assignment form (Section 5.2, p. 7).
2. For each transition, join the prior state's input, transition body, and successor state's output.
3. Emit one rewrite rule with a precondition state fact, network/input facts, and fresh facts.
4. Emit postcondition state and output facts, plus an action fact identifying the transition.
5. Apply the translation table: `[SET]` substitutes terms, `[IN]` adds preconditions, `[OUT]` adds postconditions, and `[ACTION]` adds equality restrictions.
6. Add key-share rules and generated security lemmas where requested.

Verus form: Inference: implement the executable parser and protocol operations in Rust, and define a pure specification mapping each operation to an abstract message term. Contracts can state that serialization followed by parsing returns the original value; proof functions can establish those lemmas. Verus can verify the Rust implementation against the abstract mapping, while Tamarin still checks the unbounded symbolic protocol traces.

Evidence and limits: Table 1 and Appendix Table 10 enumerate mappings. The generated WireGuard model has 180 protocol lines and includes expanded HKDF operations, but only MAC1 and partial transport are modeled (Table 7, p. 10). The translation theorem assumes the function translation table soundly captures concrete implementations; the paper says it omits formal details of variable mapping and key sharing (Section 5.3, p. 7).

## technique: trace-inclusion soundness proof

What it is: prove that all concrete global traces map to traces of generated Tamarin rules. The proof first removes partially completed transitions without changing the completed-transition sequence (Lemma 1), completes truncated traces (Lemma 2), and observes that nondeterministic choice only adds traces (Lemma 3). Theorem 1 then maps every concrete trace to a rule trace with the same transition sequence.

When to use it: use this proof pattern when a compiler collapses several executable statements into one symbolic rule and failures can roll back a transition. It requires the two control-flow requirements and a symbolic adversary model.

How to do it:

1. Define concrete participant, global, and transition traces.
2. Define the mapping from an execution trace to its fully completed transition sequence.
3. Show partial transitions can be removed without changing that sequence (Lemma 1, Section 5.3, p. 7).
4. Show truncated traces can be extended to complete traces (Lemma 2, Section 5.3, p. 7).
5. Show deterministic traces remain allowed when transition choice becomes nondeterministic (Lemma 3, p. 7).
6. Map each complete extended transition to its generated Tamarin rule and conclude trace inclusion (Theorem 1, p. 7).

Verus form: Inference: encode concrete and abstract states as ghost data and prove a refinement relation with `ensures`; use loop invariants for the trace prefix and a proof function for each transition mapping. Verus can check a Rust implementation's refinement to an abstract transition system, but cannot prove Tamarin's symbolic adversary semantics or computational cryptographic soundness.

Evidence and limits: the paper proves trace inclusion, not equality. Its theorem guarantees that every concrete trace has a model trace; extra symbolic traces may remain. The authors explicitly state, “A treatment on the computational soundness of a symbolic model is out of scope for this work” (Section 5.3, p. 7). The proof also assumes the translation table and key-share rule accurately model external functions.

## technique: automatic security lemmas and non-vacuity checks

What it is: AutoTam generates Tamarin lemmas for weak secrecy and injective agreement when the user supplies transition-event names and agreement variables. It also emits a reachability lemma for each handshake, ensuring that authentication and secrecy lemmas do not hold merely because no run reaches the handshake.

When to use it: use built-in templates for standard properties once protocol events and agreement variables are identified. Add a reachability check before trusting a successful security proof.

How to do it:

1. Mark transition names that represent protocol events.
2. Identify variables whose agreement should be established.
3. Request generated weak-secrecy and injective-agreement lemmas (Section 5.4, p. 8).
4. Generate a reachability lemma for each handshake.
5. Run Tamarin and inspect failed proofs; for WireGuard, add a sources lemma when required (Section 7.3, p. 9).

Verus form: Inference: encode authentication events as ghost state and use `ensures` to relate peer identities and keys. Secrecy requires a separate threat model and is not a native Verus memory-safety property. A reachability lemma can correspond to a proof function that constructs a valid handshake trace, but unbounded attacker reasoning remains in Tamarin.

Evidence and limits: all DH generated properties verify in under 5 seconds; WireGuard's listed properties verify in 359.62 seconds only after manual sources-lemma guidance (Table 6, p. 9). The paper says only basic authentication and secrecy are automatically generated and that advanced transport properties are not its focus (Section 7.4, p. 10).

## technique: KLEE dynamic symbolic execution of implementations

What it is: execute the interpreter with symbolic network bytes and symbolic cryptographic outputs. Replace concrete cryptographic functions and `memcmp` with abstractions, delay message-length concretization, and explore paths. The analysis checks that no memory access exceeds the largest symbolic buffer length.

When to use it: use this to find memory errors and enumerate parser behavior over arbitrary network input without relying on concrete packets. It assumes bounded packet sizes for finite exploration and faithful function abstractions.

How to do it:

1. Compile the AutoTam interpreter for KLEE.
2. Replace cryptographic implementations with symbolic-return abstractions.
3. Make network input fully symbolic and delay length concretization.
4. Provide a symbolic `memcmp` abstraction.
5. Explore all paths and record exceptions and path counts.
6. Treat zero out-of-bounds errors as evidence for the analyzed bound, not all-input functional correctness.

Verus form: Inference: use Verus contracts on parsing functions to prove slice bounds and length relationships, replacing bounded path exploration with quantified proofs where feasible. Keep KLEE as a complementary bug-finding tool for environmental and parser cases that are hard to encode. Verus cannot prove properties of an unmodeled cryptographic primitive without an explicit trusted specification.

Evidence and limits: KLEE reports zero errors on all four roles; the WireGuard responder explores 4,120 paths in 16 minutes 33 seconds (Table 8, p. 10). WireGuard transport is limited to one message for this analysis, and the search space is finite because packet size is capped at 512 bytes (Section 7.5, p. 10). Zero exceptions therefore supports the tested bound, not arbitrary unbounded inputs.

## techniques for the catalog

- state-machine protocol DSL — express executable roles as output/input states and cyclic transitions under two soundness restrictions
- executable-to-symbolic translation — compile each extended transition and predefined operation into a Tamarin rewrite rule
- trace-inclusion proof — relate concrete global traces to generated symbolic traces through three lemmas and a theorem
- automatic security lemmas — generate weak-secrecy, injective-agreement, and reachability properties from event annotations
- sources-lemma guidance — add a manual Tamarin invariant when generated WireGuard proofs need partial-deconstruction facts
- KLEE symbolic execution — explore symbolic network inputs and cryptographic abstractions for bounded memory safety
