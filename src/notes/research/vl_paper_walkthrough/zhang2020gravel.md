# Automated Verification of Customizable Middlebox Properties with Gravel
(authored by agents unless marked 🧑)
Tag: `zhang2020gravel`, [paper](https://www.usenix.org/conference/nsdi20/presentation/zhang-kaiyuan)

Page references below use the printed proceedings pages, 221–239.

## purpose and verification boundary

Gravel targets “almost unmodified” C++ software middleboxes built from Click elements. Its central idea is to symbolically execute the implementation and check it against concise, high-level, trace-based specifications. The paper's abstract says: "Gravel allows developers to specify high-level middlebox properties and checks correctness in the implementation without requiring manual proofs." (Abstract, p. 221.) The framework separates a Click configuration graph, high-level properties, and an element-level specification for every element.

The workflow has two proof obligations. First, graph composition: composing element specifications according to the Click graph must satisfy the high-level property. Second, element refinement: every C++ implementation transition must have an equivalent transition in its element specification (Section 4, p. 229). The high-level properties and element specifications are written in Python; C++ is compiled to LLVM IR; Gravel symbolically executes both layers and asks Z3 for counterexamples. The trusted computing base includes the verifier, high-level specifications, Python, LLVM, Z3, and Click runtime. Element-level specifications are checked rather than trusted: "Note that the specification of each element is not trusted." (Section 4.3, p. 230.)

## technique 1: conservative symbolic-execution eligibility analysis

what it is and when to use it

A program is suitable when symbolic execution halts and its expression lies in a solver-decidable first-order fragment. Gravel's baseline uses conservative tests: no pointers in element state and no loops or recursion. The study covers all 290 Click elements and 56 configurations in the official repository that process packets in a run-to-completion model (Section 2, footnote 1, p. 222). The baseline can symbolically execute 130/290 elements (45%) and 9/56 configurations (16%) (Sections 2 and 2.2, pp. 222–223).

how to do it

1. Inspect each element's member fields. Reject state containing pointers; finite bit-vector fields can then be encoded in a bounded symbolic state (Section 2.2, p. 223).
2. Execute the LLVM bytecode with symbolic element state and packet content. Compare jump and call targets with executed-instruction history; the baseline rejects loops and recursive calls (Section 2.2, p. 223).
3. If both checks pass, derive a symbolic transition formula for all input packets, output packets, states, and state transitions (Section 2.1, p. 222).
4. Ask an SMT solver whether the formula implies the specification (Section 2.1, p. 222); Gravel checks element-level refinement as described in Section 4.2 (pp. 229–230).

The packet-counter example increments `cnt_` when `p.saddr == target_src_`. Its generated formula preserves the packet and target address, increments the count on a match, and leaves the count unchanged otherwise (Section 2.1, p. 222). The paper defines the criterion directly: "A program is suitable for automated verification if: 1. Symbolic execution of the program halts and yields a symbolic expression. 2. The resulting symbolic expression is restricted to an effectively decidable fragment of first-order logic." (Section 2.1, p. 222.)

Verus form (inference)

Inference: express the element transition as a Verus `spec fn` over an abstract state and packet, and prove a `proof fn` that executable Rust preserves the relation. Verus can prove bounded loops with invariants and decreases clauses, but it does not automatically make arbitrary C++ pointer behavior symbolic. The eligibility analysis therefore becomes a design restriction on generated Rust: bounded ownership-safe state and finite control are easier to verify; solver decidability remains an engineering assumption.

what evidence shows and what fails

The denominator for 45% is all 290 elements; 143 failed for pointers and 78 for unbounded execution, with 61 having both (Section 2.2, p. 223). A configuration is eligible only when every element is eligible, explaining the lower 9/56 rate. The criterion has false negatives: a pointer to a bounded array may be safe, but the baseline rejects it. It also cannot handle loops over packet payloads or symbolic iteration counts without extensions (Section 2.4, p. 225).

## technique 2: domain-specific symbolic-execution extensions

code unrolling and bounded-array detection

When a loop has a known small bound, Gravel unrolls the backward jump and raises an error if execution exceeds a configured threshold (Section 2.3, p. 223). For pointer-based arrays, a static bounds pass checks every access; the executor then models immutable, non-aliased array pointers with an uninterpreted function from byte offsets to bytes (Section 2.3, pp. 223–224). Array updates are recorded as index/value pairs (Section 2.3, p. 224).

SMT-encoded abstract data types

Rather than symbolically executing a linked implementation, Gravel supplies SMT models for `HashMap`, `HashSet`, and `Vector`. Developers may replace an element's pointer-and-loop state with one of these abstract types when all accesses use the type's interface (Section 2.3, p. 224). The `CheckIPAddress` example replaces a pointer plus size and a loop over `bad_src_` with a `HashSet` and `find`; the change removes unknown bounds and path explosion (Figure 2, p. 224).

concretization of control flow

Packet classifiers often store concrete finite transition tables behind a state-machine implementation. Gravel loads the configuration with concrete rules and runs the state-machine creation code. It ingests the resulting transition bytes as concrete values and symbolically verifies that the table memory remains unchanged. It then symbolically executes classification with those concrete rules, bounding the number of steps (Section 2.3, pp. 224–225). The paper says: "We then symbolically execute the packet classification code but replace the symbolic transition rules with the concrete values identified in the first step." (Section 2.3, p. 225.) This is useful when the transition structure is fixed by configuration but the packet fields are symbolic.

how to apply the extensions

1. Run the baseline pointer and loop checks (Section 2.2, p. 223).
2. Unroll bounded loops and enforce a threshold (Section 2.3, p. 223).
3. Analyze immutable pointers, aliases, and array bounds; encode arrays as uninterpreted functions (Section 2.3, pp. 223–224).
4. Replace pointer state with an SMT-encoded abstract type when its interface is sufficient (Section 2.3, p. 224).
5. For classifiers, construct the concrete transition table, verify its immutability, and use its concrete values during symbolic packet execution (Section 2.3, pp. 224–225).

After these steps, the eligible fraction rises to 226/290 elements (78%) and 37/56 configurations (66%). The incremental table is explicit: code unrolling gives 138/290 (48%), fixed-size-array detection 185/290 (63%), SMT abstract data types 218/290 (75%), replacing state 222/290 (77%), and concretization 226/290 (78%) (Table 1, p. 225). The remaining 64 elements include 19 payload loops, 26 unsupported pointer data structures, 11 state-dependent loops, and 8 deeply coupled pointer cases (Section 2.4, p. 225).

Verus form (inference)

Inference: use Rust `Vec` or map-like ghost state with explicit finite domains, prove bounds before indexing, and isolate classifier tables as immutable specifications. A Verus proof can establish that a bounded loop covers every entry and that an abstract map operation refines the concrete map. It cannot justify replacing a data structure unless the replacement's semantics and the concrete implementation are both specified.

## technique 3: high-level trace specifications with induction

what it is and when to use it

Gravel specifies properties as predicates over symbolic event traces. A property can describe incoming packets, time events, output packets, and state transitions without exposing C++ layout. The case studies cover NAT endpoint independence from RFC5382, firewall unsolicited-connection blocking, load-balancer persistence, proxy bidirectionality, and switch learning (Section 5.1, pp. 230–231).

The ToyLB example has `CheckIPHeader`, `CheckTCPHeader`, `FlowTable`, `RoundRobinSwitch`, and checksum elements. Gravel's `handle_packet(state,pkt)` and `handle_time(state,timestamp)` return an optional packet and new state; `verify(formula)` sends the formula to Z3 (Section 3.3 and Table 5, pp. 226–228, 236).

A one-event liveness property is direct: construct symbolic packet `p` and state `s0`, call `handle_packet`, and verify `Implies(is_tcp(p), Not(is_none(o)))` (Section 3.3, p. 227). Connection persistence needs induction because it quantifies over arbitrarily many events before expiration. The paper's steps are:

1. Define `steer_to(state,pkt,dst_ip,t)` by processing a time event and packet and checking output destination and payload preservation (Section 3.3, p. 227).
2. Prove the base case: after forwarding `p0` to `dst_ip`, a same-flow `p1` at any time `t <= t0+WINDOW` is forwarded there, assuming no intervening change to the post-`p0` state apart from the time event in `steer_to` (Section 3.3, p. 227).
3. Prove an inductive packet case: handling another packet preserves `steer_to` (Section 3.3, p. 227).
4. Prove an inductive time case: handling a time event before the future forwarding time preserves `steer_to`; the code assumes `t1 < t0` (Section 3.3, p. 228).

The paper explicitly notes: "This complexity means that we cannot formulate connection persistency with traces containing only a single event, but rather, we need to use induction to verify that the property holds on event traces of unbounded length." (Section 3.3, p. 227.)

Verus form (inference)

Inference: encode the event sequence as a ghost sequence and state an inductive invariant over its prefix. Use `requires` for packet-flow and timestamp assumptions, `ensures` for persistence, and a loop invariant for each event-processing iteration. Verus's proof is more explicit than Gravel's solver query; it can certify the induction but does not remove the need to model timeout and map semantics.

## technique 4: element refinement and graph composition

how to apply it

1. Declare each element's bounded abstract state: fixed-width variables and finite-domain maps (Section 3.4, p. 228).
2. Implement packet and time handlers as lists of condition-action pairs `Action(cond,{port:pkt},new_state)` (Section 3.4, pp. 228–229).
3. For graph composition, symbolically execute every high-level event through the directed element graph, breadth-first over branches; collect final states, output packets, and path conditions (Section 4.1, p. 229).
4. Check the high-level formula over each resulting symbolic state and output (Section 4.1, p. 229).
5. For element refinement, compile each C++ handler to LLVM IR, extract class layout, symbolically execute the IR, and check that every implementation transition has an equivalent element-specification transition (Section 4.2, pp. 229–230).
6. Set a traversal bound for graph loops. If execution reaches the bound, fail verification rather than silently assuming termination (Section 4.1, p. 229).

The two theorems are separate: graph composition proves that element specifications meet the middlebox property; element refinement proves implementation conformance. This modularity allows element specifications to be reused across middleboxes (Sections 3.4 and 4, pp. 228–229).

Verus form (inference)

Inference: represent each element as a Rust module with an abstract transition `spec fn`; prove implementation refinement with `ensures` relating concrete and abstract states. A graph composition proof can use a transition-system invariant over the element graph. Verus does not trust LLVM IR equivalence automatically, so generated Rust should be verified at source level or accompanied by a checked compilation/refinement argument.

## techniques for the catalog

- symbolic-execution eligibility: reject unbounded control flow and pointer state unless the resulting expression is solver-decidable
- domain-specific execution extensions: unroll bounded loops, analyze pointer aliases and arrays, encode abstract maps, and concretize classifier tables
- trace-based high-level properties: express RFC-style middlebox behavior as predicates over symbolic packet and time events
- inductive persistence proofs: verify unbounded connection properties with base, packet-step, and time-step cases
- modular graph composition: symbolically execute element specifications through a Click graph and check outputs against properties
- element refinement: compile C++ to LLVM IR and check every implementation transition against an abstract element specification
