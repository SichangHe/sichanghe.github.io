# Kinetic: Verifiable Dynamic Network Control
(authored by agents unless marked 🧑)
Tag: `kim2015kinetic`, [paper](https://www.usenix.org/conference/nsdi15/technical-sessions/presentation/kim)

## scope and claim
Kinetic is a Python-embedded network-control language whose dynamic policy is a finite-state machine (FSM), compiled to OpenFlow through Pyretic and checked with NuSMV. The paper states, “Kinetic also automatically verifies the correctness of these control programs with respect to user-specified temporal properties.” (abstract, p. 1). Its verification target is control-plane behavior across events, rather than only a snapshot of installed rules.

## technique: FSMs for dynamic policy
Use an FSM when forwarding behavior changes after external or packet events. States carry Pyretic policies; events trigger transitions. The paper's intrusion example has an `infected` Boolean and a `policy` variable: initially `infected=False` and `policy=identity`; an infection event changes the first variable and the endogenous transition changes policy to `drop`.

Steps from sections 3.1 and 4.2.1: (1) identify state variables and their types and initial values; (2) write transition functions as ordered cases over event, constants, and other variables; (3) give each state a Pyretic policy; (4) register event drivers; (5) compile the resulting FSM to the runtime. Figure 8's code uses `@transition`, `self.case(...)`, `self.default(...)`, `FSMVar(type=..., init=..., trans=...)`, and `FSMPolicy(lpec, fsm_def)` (section 4.2.2, p. 7). The NuSMV translation declares variables in `VAR`, initial values in `init`, and next-state relations in `next`/`case` (section 4.4, pp. 8–9). A whole-sentence example is: “The policy variable in lines 12–16 shows that the value transitions to drop if infected is True, while the default is identity.” (section 4.4, p. 9).

Inference: in Verus, a runtime controller can use an enum for policy and a Boolean or enum for state; a `proof fn` can establish a transition relation for a finite model, with `requires` and `ensures` contracts on pure specifications. Verus does not execute NuSMV CTL, so temporal properties need an explicit finite-state model and proof lemmas; the Pyretic/OpenFlow runtime remains outside the proof.

## technique: located packet equivalence classes (LPECs)
Use LPECs to avoid a monolithic state space. An LPEC is a packet filter defining a group whose packets share one FSM instance and therefore one state. Without this abstraction, N hosts and a two-state policy require 2^N global states; Figure 7 decomposes that into N two-state FSMs. The paper says, “Each LPEC has an FSM, which has a set of states, where each state has a Pyretic policy; and a set of transitions between those states, where transitions occur in response to events that the operators defines.” (section 4.2.2, p. 7).

Steps: (1) choose the packet fields that define equivalence; (2) return a Pyretic `match` filter as the projection map; (3) instantiate the generic FSM per distinct class; (4) route an event to the affected class; (5) recompile only the changed policy. The stateful-firewall example defines a symmetric source/destination IP pair so inbound and outbound packets share state (section 3.2, pp. 4–5). The IDS example uses `return match(srcip=pkt['srcip'])` (Figure 8b, p. 7).

Inference: model the projection as a ghost predicate over packet headers and prove that packets mapped to one class receive the same abstract transition. Verus can prove disjointness and coverage of finite classes with set predicates, but packet parsing and switch behavior need trusted specifications.

## technique: composition of independent FSMs
Use sequential (`>>`) composition when one policy's output feeds the next, and parallel (`+`) composition when policies act on independent copies. Composition reduces the representation of independent task states from a product to a sum; verification still combines them into one FSM (Section 4.4). The paper gives ten binary tasks as 1,024 monolithic states versus 20 decomposed states, and a three-task authenticated/IDS/rate-cap policy as 2^3 versus 2·3 states (section 4.2.3, pp. 7–8). Its example is `(web_auth + 802.1X_auth) >> ids >> rate_limiter` (section 3.3, p. 5).

Steps: (1) define each task as its own FSM; (2) choose sequence or parallel semantics from packet-flow dependence; (3) compose policies; (4) verify the combined model, not only individual components. The paper says, “To verify this program, Kinetic generates a single FSM model for input to a model checker.” (section 3.3, p. 5).

Inference: Verus proofs should state refinement of each component and a composition lemma. Parallel composition needs disjointness or commutativity assumptions; sequential composition needs a postcondition that is a valid precondition for the next component.

## technique: incremental runtime compilation
Kinetic reduces compilation cost in three stages. It decomposes product automata; combines rules directly when LPECs are disjoint; and expands an LPEC only after that class transitions from its common default. The paper says, “Kinetic does not need to expand the FSM for an LPEC unless and until it experiences a state transition; until that point, the Kinetic runtime can simply apply whatever default policy is defined for that FSM.” (section 4.3, p. 8). It also memoizes previously compiled policies.

Inference: verify an optimized compiler by specifying a reference cross-product semantics and proving that disjoint insertion, default sharing, and memoization preserve emitted policy. This is an inference because the paper reports the optimization but no Verus proof.

## technique: CTL model checking and counterexamples
Use CTL to state branching-time requirements such as `AG(infected -> AX policy=drop)`, `AG(policy=ﬂood -> AG EF(port>0))`, and `AG(... -> AX policy!=drop)` (Table 3, p. 10). Kinetic parses each FSM variable and transition, emits an SMV model, and invokes NuSMV. For failed properties it returns the violating sequence of events and variable changes (section 4.4, pp. 8–9). CTL operators used include `A`, `E`, `X`, `F`, `G`, and `U` (Table 2, p. 3).

Inference: represent the finite transition system as a Verus datatype and prove safety properties by induction over transitions; liveness (`F`, `U`) requires a ranking or fairness assumption. Verus cannot replace NuSMV's exhaustive symbolic search automatically, so the model-checking result is evidence external to the Rust proof.

## evidence, trust, and limits
The user study had 667 assignment attempts and 631 successful completions (95%); 70% of successful students finished in under three hours. About 79% thought Kinetic made configuration easier and 84% thought verification easier (section 5.1, pp. 9–11). In Table 4, the walled-garden implementations used 17 Kinetic lines versus 22 POX, 46 Pyretic, and 416 Floodlight lines for the IDS/firewall program; line counts are implementation-specific. The test used campus event statistics and randomly distributed authentication events across the FSMs (Section 5.2); it modeled 42,000 LPECs and about 1,330,220 WPA authentication events per day (Table 5, p. 11), evaluating up to 1,000 events/s; handling and recompilation stayed around or below a few hundred milliseconds (section 5.2, pp. 11–12). Verification used four states for one FSM and 384 for a composed FSM, 1,000 independent trials per point, and over 100 syntactically valid random CTL properties; all completed within 35 ms (section 5.2, p. 12).

The verified object is the generated FSM's logical transition behavior. Inference: the deployment trust boundary includes the Kinetic parser/compiler, NuSMV, Pyretic runtime, OpenFlow switches, event-driver correctness, and the correspondence between model and deployed network. The paper explicitly notes that data-plane snapshot tools such as VeriFlow and HSA are complementary and that consistent-update guarantees are still needed during transitions (section 6, pp. 12–13). Inference: agent-written verified Rust faces moderate risk here: finite transition proofs are tractable, but event delivery, compiler correctness, temporal liveness assumptions, and switch semantics can invalidate a proof-to-deployment link.

## what VL should reuse
Inference: reuse FSM state separation, LPEC partitioning, compositional policy structure, and CTL-like specifications. Existing snapshot checkers already cover static data-plane invariants; VL should not redo that work. Inference: a Verus implementation should prove a small reference transition system and compiler refinement, then treat OpenFlow/event integration as explicit trusted boundaries.

## techniques for the catalog
- FSM dynamic policy: encode event-driven forwarding behavior as typed variables, transitions, and state policies
- LPEC partitioning: map packet groups to independent FSM instances to avoid exponential global state
- FSM composition: combine independent policies sequentially or in parallel and verify the combined model
- incremental compilation: expand and recompile only LPECs whose state changed, sharing defaults and memoized results
- CTL model checking: compile FSMs to NuSMV and check temporal assertions with counterexample traces
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Figure 8: Logical FSM for an IDS in Kinetic, and the Kinetic code that implements the policy."): checked the complete paper, quoted text, FSM/LPEC semantics, composition and runtime steps, CTL translation, study counts and performance numbers; replaced an ellipsized quotation, clarified combined verification and synthetic event distribution, labeled recommendations and trust conclusions as inference, and used the publisher URL printed in the paper; did not reproduce experiments or inspect implementation.
