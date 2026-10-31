# NetSMC: A Custom Symbolic Model Checker for Stateful Network Verification
(authored by agents unless marked 🧑)
Tag: `yuan2020netsmc`, [paper](https://www.usenix.org/conference/nsdi20/presentation/yuan)

## purpose and assumptions

NetSMC verifies stateful network policies by combining a restricted network semantics, a restricted temporal-policy language, and custom symbolic model-checking algorithms. The motivation is a formal undecidability result: even isolation on stateful networks is undecidable, so a practical verifier must trade away some behavior, policy expressiveness, or completeness. The paper's central claim is: "First, we identify key domain-specific insights to develop a more compact network semantic model which is equivalent to a general semantic model for checking a wide range of policies under practical conditions." (Abstract, printed p. 181.)

The key semantic relaxation is one packet in every network state. A network state is `(located packet, table valuation)`. A packet is processed by an NF, moved across a link, or replaced at Drop/Exit by a new ingress packet (Section 4.3, printed p. 185). This omits interleavings. The authors prove that for every closed finite interleaving trace of an order-preserving network, there is a closed finite one-packet trace with the same per-packet traces (Lemma 1, printed p. 186; definitions and proof in Appendix C, printed pp. 197–198). Consequently, isolation, tag preservation, and tag-based isolation are equivalent under the two models for order-preserving networks (Corollary 2, printed p. 186). Appendix C defines this condition using a total packet order: every execution must respect that order whenever reversing two packets’ processing at an NF could change their outputs or final tables (Definitions 4–5, printed p. 197).

The assumption is material. The paper gives a counterexample in which packet `p1` passes the first firewall, the second firewall processes packet `p2` in the reverse direction, and then permits `p1` to reach the destination; NetSMC's one-packet model misses this violation (Section 8, printed p. 192). It assumes no indefinite packet loops, although transient loops are allowed (Section 4.3, printed p. 185). NF operations are restricted to header tests, table lookups, simple counting, nondeterministic finite-domain choices, forwarding, dropping, and field modification. It does not model arbitrary NF computation, multicast, broadcast, or network failures directly (Sections 4.1 and 8, printed pp. 184 and 192).

## technique 1: a symbolic stateful-NF model

what it is and when to use it

Model each NF as `(locations, state tables, rules)`. A rule has tests over packet fields, locations, and table values, followed by sequential updates and actions. Table updates include assignment, increment, and decrement; actions are `fwd(e)`, `drop`, and `modify(f,e)` (Section 4.1, printed p. 184). The model assumes exactly one rule matches an incoming packet; the authors say first-match rules can be translated into this form (Section 4.1, printed p. 184). Inference: use this model when the relevant behavior of a real NF can be represented by these operations.

how to do it

1. List packet fields and their value domains; introduce `Drop` and `Exit` locations (Section 4.1, printed p. 184).
2. Create one finite key-value state table for each NF state component (Section 4.1, printed p. 184).
3. Encode packet-processing behavior as mutually exclusive rules whose tests check packet fields or table entries and whose commands update tables and forward, drop, or modify the packet (Section 4.1, printed p. 184).
4. Encode a topology as links between locations and use the one-packet transition rules (Section 4.3, printed p. 185).

The firewall example records flows initiated by the internal network in `Trust`: an internal packet sets `Trust[src,dst]:=1` and forwards; an external packet forwards only when `Trust[dst,src]=1`, otherwise it drops (Figure 3, printed p. 185). The load balancer uses `Connected` and `Server` tables: the first service-bound packet from a client nondeterministically chooses a backend, stores it by source address, and later packets from that client reuse it (Figure 4, printed p. 185). These examples show how stateful behavior becomes a finite rule system rather than executable middlebox code.

Verus form (inference)

Inference: represent each NF state table as a ghost `Map` or finite sequence and each rule as a proof-oriented transition function. A Verus `spec fn` can state the transition relation and an invariant can state, for example, that a reverse flow is forwarded only when `Trust[dst,src] == 1`. A `proof fn` can prove each rule preserves the invariant. The implementation's packet parser, map representation, and external middlebox remain trusted unless their exact behavior is modeled and verified.

what is proved and what fails

Theorem 3 states: "NetSMC returns True if and only if N satisfies the policy P under the one-packet model." (Section 6.4, printed p. 189.) Lemma 1 and Corollary 2 transfer selected results to order-preserving interleaving networks. For policies requiring packet-interleaving reasoning, the authors describe NetSMC as a sound-but-incomplete bug-finding tool (Section 1, printed p. 182). Its policy language excludes generic past operations, arbitrary nesting of temporal operators, generic until, and arbitrary quantification (Sections 8–9, printed p. 192).

## technique 2: restricted LTL policies translated to CTL

what it is and when to use it

NetSMC accepts a subset of linear temporal logic with predicates over packet fields, location, and table values. Temporal operators include eventuality `F`, globally `G`, next `X`, and two packet-traversal operators for properties during one packet's traversal. The outer form is universally quantified over specified domains (Section 5, printed p. 186). The restriction is deliberate: the formulas translate to computation tree logic (CTL), enabling CTL model checking (Appendix E, printed p. 199).

how to do it

1. Define a basic predicate, such as `src=x`, `loc=H`, or `susp[x]>10` (Section 5, printed p. 186).
2. Combine predicates with negation, conjunction, and disjunction (Section 5, printed p. 186).
3. Add only the supported temporal forms: `F g`, packet-scoped eventuality, or `X(g ⇒ r)`, `G(g ⇒ r)`, and packet-scoped `G(g ⇒ r)`. Here `g` is a basic formula and `r` is another supported temporal formula. Write `F_packet(g)` for the paper's packet-scoped eventuality, defined as `(loc≠Drop ∧ loc≠Exit) U g`, where `a U b` requires `b` eventually and `a` at every preceding state. The packet-scoped global form is `r U (loc=Drop ∨ loc=Exit)`. The service-chaining formula is `∀x∈Dept. G(src=x ∧ susp[x]>10 ⇒ G(src=x ⇒ F_packet(loc=H)))` (Section 5, printed p. 186).
4. Close the formula with outer quantification over the allowed host or packet domain (Section 5, printed p. 186).
5. Translate the restricted LTL formula into CTL and verify it symbolically (Section 6, printed p. 187).

Verus form (inference)

Inference: encode the policy as a recursive ghost predicate over a sequence of abstract packet states. Use Verus `requires` to state the initial-state domain and `ensures` to state the temporal property over the returned trace; use loop invariants for the trace traversal. Verus does not automatically supply CTL/LTL model checking, so the translation and finite-domain quantifier reasoning would have to be implemented as verified lemmas or kept in an external checker whose result is checked by a proof certificate.

what works and limits

Table 2 reports successful checks and bug finding for nine scenarios: conditional reachability, data isolation, pipeline, flow affinity, dynamic service chaining, reachability, tag-based isolation, tag preservation, and NAT consistency (Section 7.2, printed pp. 191–192). Verification times range from 0.001 s to 2.23 s in the reported setups; bug-finding times range from 0.0006 s to 0.98 s (Table 2, printed p. 191). The table lists one verification time and one bug-finding time per scenario; it does not state the number of repeated runs. Inference: these results do not establish a success percentage over all possible policies. The authors explicitly say that a policy such as “at some time in the future, a packet from h1 to h2 is delivered” is beyond scope (Section 8, printed p. 192).

## technique 3: EFO symbolic states and pre-image computation

what it is and when to use it

Represent a large set of concrete network states as an existential first-order (EFO) formula in disjunctive normal form. A clause is a conjunction of atomic predicates such as `x∈D`, `x≠y`, `loc=x`, `f=x`, and `T[key]=y`; the formula is a disjunction of clauses (Section 6.2, printed p. 187). For example, `Trust[x,y]=1` denotes all firewall states containing a trusted flow. The authors state: "The existential quantifications are only at the outermost level (we thus omit quantifiers) and we operate on the inner formulas without quantifiers." (Section 6.2, printed p. 187.) They claim this encoding suffices for all symbolic state sets generated while checking their policies.

The checker computes the states satisfying each sub-formula of the negated policy from the innermost formulas outward. Figure 5 illustrates checking `G p`: start with states violating `p`, repeatedly add their one-step predecessors, and stop when the pre-image is contained in the accumulated set (Section 6.1, printed p. 187). To compute a pre-image, NetSMC unions three cases: an NF transition, link traversal, and replacement of a packet at Drop or Exit (Algorithm 1, printed p. 188).

how to do it

1. Negate the policy and compute its sub-formulas from the innermost formulas outward. For the `G p` example, encode the states violating `p` as an EFO formula `f` (Section 6.1, printed p. 187).
2. For each NF rule, call `COMPUTE_PRE_RULE` to transform the target clauses, add the rule’s tests, and constrain the predecessor to each location belonging to that NF (Algorithm 1, printed p. 188).
3. Process a command sequence backwards. For `modify(f,e)`, translate `e` to constraints `g_e` and a value variable `x_e`; remove the target clause’s `f=x` atom and add `g_e ∧ x=x_e`. The variable `x` denotes the required post-action field value; use a fresh variable if the clause does not constrain that field (Algorithm 2, printed p. 188).
4. For `drop`, remove the target location atom and constrain its value variable to `Drop`. For `fwd(e)`, replace the target location atom with the expression constraints and equality of the target location variable and `x_e`. Neither action sets the predecessor location to the destination; Algorithm 1 separately constrains it to the processing NF’s location. For table updates, enumerate whether each tested entry was updated or left unchanged (Algorithms 1–2, printed pp. 188–189).
5. For a new ingress packet, remove packet-field and location atoms, preserve table and variable constraints, constrain the predecessor location to Drop or Exit, and constrain the target location variable to each possible ingress location (Algorithm 1, printed p. 188).
6. Union the predecessor formulas. In the `G p` example, repeat union and containment checking to a fixpoint. If an initial state belongs to the resulting violation set, report a violation; otherwise report verification (Sections 6.1 and 6.3, printed pp. 187–188).

The table-update routine is the crucial case split: for a constraint `T[x]=y`, either the update writes that entry (`x` equals the update key and `y` equals the new value) or the entry is different from the update key. The paper states: "The algorithm returns the disjunction of all formulas for each possible transition." (Section 6.3, printed p. 188.)

Verus form (inference)

Inference: represent EFO clauses as ghost sequences of predicates and define `Sat` as the set of concrete Rust-model states satisfying a clause. Prove each pre-image transformer sound and complete with respect to the abstract transition relation, then prove a loop invariant that every accumulated state can reach a violation. At convergence, prove that all states able to reach a violation are included. Use `proof fn` lemmas for assignment, increment, decrement, and packet replacement; keep the SMT or query-engine implementation outside the trusted proof unless its output carries a verified certificate.

## technique 4: containment via query homomorphisms

what it is and when to use it

Containment `Sat(f1) ⊆ Sat(f2)` is the termination test for the fixpoint. General SMT solving is slow, so NetSMC maps each EFO clause to a conjunctive database query. For clauses without problematic inequalities, containment follows from a homomorphism from a clause in `f2` to a clause in `f1`. Inequalities and finite domains require additional splitting.

how to do it

1. Split each conjunctive clause in `f1` into atomic clauses relative to `f2`: make variable-equality cases explicit, and refine domains so that each source-variable domain is contained in or disjoint from each target-variable domain (Section 6.4, printed p. 189).
2. For each resulting clause, first check emptiness; an empty clause is contained trivially (Algorithm 3, printed p. 189).
3. For each non-empty clause, search for a homomorphism from some clause of `f2` to it. If no such homomorphism exists, return false; if every clause passes, return true (Algorithm 3, printed p. 189).
4. Use the resulting containment check in every fixpoint iteration (Section 6.1, printed p. 187).

The paper's algorithm handles finite domains because a homomorphism may not exist even when a clause is contained, including an example where `x,y∈{0} ∧ T1[x]=1 ∧ T1[y]=0` is empty because both keys denote the same entry. It therefore explicitly checks emptiness before homomorphism (Section 6.4, printed p. 189).

Verus form (inference)

Inference: define a ghost mapping from symbolic variables to variables or constants and prove that mapped predicates are preserved. A Verus lemma can establish that a successful homomorphism implies set containment; a separate emptiness lemma handles finite-domain contradictions. This proof can certify the algorithm's result without trusting a general SMT solver, but the clause normalizer and domain arithmetic must be included in the verified model.

what works and measured evidence

On a 20-core 2.8 GHz server with 128 GB RAM, NetSMC verifies server-to-host isolation for a stateful firewall with 300 hosts in 51 s versus VMN's 1,477 s (reported as 28×), and a load balancer with 400 hosts in 0.03 s versus 2,693 s (Section 7.1, printed p. 190). On fattree with eight stateful NFs, VMN takes 1,072 s and NetSMC 5 s (reported as 200×). NetSMC verifies a fattree with 147 stateful NFs in half an hour; the paper says VMN cannot scale to larger networks within 12 hours (Section 7.1, printed p. 190). Replacing custom containment with Z3 costs 1,844 s at 48 fattree NFs versus the custom method's roughly 16× lower time; the reported speedups are 42× on Ai3 and 25× on Sprint (Section 7.1, printed p. 190). NuSMV with a fixed table size of 16 takes 1,163 s versus NetSMC's 0.015 s, and NetSMC is 750× faster than Cubicle in that experiment (Section 7.1, printed p. 191). Inference: these measurements establish performance for the tested configurations, not universal speed bounds.

## trusted boundary and threat to verified Rust

Theorem 3 proves the checking algorithm relative to the one-packet semantics; Corollary 2 proves equivalence for selected policies on order-preserving networks. The prototype is implemented in Python (Section 7, printed p. 189). For model fidelity, the evaluation uses Alembic and manually translates programs not supported by Alembic (Section 7, printed p. 190). Inference: these formal results do not themselves verify the Python implementation, model extraction, manual translations, or deployed packet ordering. Section 8 (printed p. 192) explicitly limits interleaving coverage, NF operations, policy syntax, and failure handling.

## techniques for the catalog

- one-packet stateful semantics: sequentialize packet processing and prove equivalence to interleavings only for order-preserving networks
- rule-based NF abstraction: model state tables, tests, updates, forwarding, dropping, and field modification as finite transition rules
- restricted temporal policies: specify practical LTL formulas that translate to CTL for efficient model checking
- EFO symbolic states: encode sets of packet-and-table states as existential first-order disjunctive formulas
- pre-image fixpoint checking: compute predecessor formulas for NF, link, and packet-ingress transitions until containment
- query-homomorphism containment: decide symbolic-state inclusion by equality/domain splitting, emptiness checks, and conjunctive-query homomorphisms
