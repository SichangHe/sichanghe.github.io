# Hemiola: A DSL and Verification Tools to Guide Design and Proof of Hierarchical Cache-Coherence Protocols
(authored by agents unless marked 🧑)
Tag: `choi2022hemiola`, [paper](https://doi.org/10.1007/978-3-031-13188-2_16)

Hemiola is a Coq-embedded domain-specific language for hierarchical cache-coherence protocols. It restricts topology, channels, and rule shapes so that every expressible protocol is serializable: each concurrent execution has an equivalent one-transaction-at-a-time execution. This removes interleavings from the main invariant proof. The paper’s abstract says the framework “guides the user to design protocols that never experience inconsistent interleavings while handling transactions concurrently.”

## design by topology and rule templates

What it is. Hemiola models a cache hierarchy as a tree. A parent and child communicate over three ordered channels: one parent-to-child channel and two child-to-parent channels, for requests and responses (§2, p. 319). A protocol is a set of per-cache rules, but every rule must be an instance of one of nine templates (§3.2, p. 324). A template supplies message directions, preconditions, state transition, and lock operations. The paper says: “the Hemiola DSL limits protocols to satisfy abstract conditions that can guarantee noninterference by-construction.” (§3, p. 321).

When to use it. Inference: use this pattern when a distributed protocol has a stable hierarchy and each transaction follows parent-child message flows, and when arbitrary interleavings make invariant proofs explode. It excludes designs that need a non-tree topology or rule behavior outside the templates.

How to apply it.

1. Choose a tree of cache nodes, with leaves as L1 caches and the root as main memory (§3.2, p. 322).
2. Give each parent-child edge three ordered channels, matching the paper’s request and response directions (§2, pp. 319–321; §3.2, p. 322).
3. Define cache state, message kinds, initial state, and a unique rule index. Each rule template is instantiated with a rule index, a precondition, and a transition function (§3.1, p. 322).
4. Select a template for each message flow. For example, `rquu` (request-up-up) receives a processor write request and sends an upward request; the paper’s compact rule is `rule getMRqUpUp from template rquu { receive rqWr(); assert (status == S); send rqM(); }` (§2, p. 321).
5. State only the local precondition and transition. The templates “employ proven-safe network structures and automatically check/set/release associated locks” (§2, p. 321); the precondition and state transition of a template are checked and performed automatically (§3.2, p. 324).
6. Prove the resulting global invariant over the DSL semantics, assuming transactions execute one at a time. The paper says serializability lets a user “verify the protocol assuming that transactions are executed one-at-a-time” (abstract; §4.3, p. 330).

The built-in locking discipline replaces explicit transient states. An uplock is set when a cache makes an upward request and released when it gets the corresponding response; a downlock is set when a cache makes downward requests and released when it gets the corresponding child responses. The cache cannot make further upward requests while uplocked, or further downward requests while downlocked (§3.2, p. 323). The paper states: “The user, however, does not need to deal with this lock state while using the DSL; locks are managed implicitly by Hemiola.” (§3.2, p. 323).

Verus form. Inference: represent each cache’s lock state with an enum in executable Rust and a ghost tree index. Encode allowed transitions as `requires` and `ensures` on functions such as `send_up` and `send_down`; use a loop `invariant` for the queue and lock relation. A `proof fn` can establish that a child-parent step preserves the tree invariant. Inference: Verus has no template language that automatically guarantees serializability, so the templates and their proof would be a separate verified library. Inference: Rust enums and ownership can carry lock state, but the paper’s implicit channel discipline must become explicit API contracts.

Evidence. The paper proves a language-level theorem: `OnTree S t ∧ GoodRules S t → Serializable S` (§4.4, p. 330). The proof uses commuting reductions (§4.4, p. 330). The introduction calls it a “fully machine-checked proof of soundness” in Coq (§1, p. 318); it is a mechanized proof of the DSL, not a probabilistic test.

Failure and assumptions. The guarantee applies only to systems satisfying the tree and template conditions. The paper notes that the topology and network settings are required logically and that the hardware implementation may use components such as finite-capacity FIFOs or buses that can simulate the requirements (§3.2, p. 323). Inference: the refinement of those components is a trusted boundary. The DSL supports single-line protocols; a protocol compiler extends them to all cache lines (§3.2, pp. 323–324).

## serializability as proof reduction

What it is. A transaction is an atomic history whose initial messages are external requests. A legal history is serializable when every state it reaches is also reached by some sequential history, a concatenation of transactions (§4.2, pp. 327–328). The paper concludes: “an invariant can be proven by showing that any transaction preserves it” (§4.3, p. 330).

How to apply it.

1. Define the one-rule-at-a-time transition semantics, histories, and reachable states (§4.1, pp. 325–326).
2. Define an atomic history inductively: a singleton history with one internal label is atomic, with the rule’s input and output messages as initial and live messages; appending a step `l` to an atomic history keeps it atomic if `l` consumes its inputs from the live messages of the history (§4.2, p. 327).
3. Call an atomic history a transaction if its initial messages are external requests (§4.2, p. 327).
4. Prove that each legal concurrent history reaches the same state as some sequential concatenation of transactions. For Hemiola this is the serializability theorem, which holds for every system built from a good tree and good rules (§4.4, p. 330).
5. Show that one transaction preserves the target invariant. Inference: the base case for the initial state is also needed. The paper explains: “Since a transaction is an (external) atomic history, we can make use of corresponding atomic invariants.” (§4.3, p. 330).

Verus form. Inference: represent a transaction trace with a ghost `Seq` of labels and define a `spec fn` for the sequential transition relation. A `proof fn` can show that every implementation step preserves the global invariant and that a transaction preserves the corresponding atomic predicate. Full serializability over arbitrary concurrent traces needs a ghost state-machine model and induction over histories; it is not obtained from an ordinary Rust loop invariant.

## predicate messages and atomic invariants

What it is. A predicate message is an invariant of the form “an important property holds whenever the system includes a certain message in a certain channel”; the paper gives the intuition of “messages that logically carry predicates that must be true so long as those messages remain in play” (§4.3, p. 328). Proving such a predicate directly is cumbersome because another transaction may break it; the paper shows that two rsM messages in flight would break one (Fig. 6, p. 328). Hemiola instead proves an atomic invariant over one transaction history, then uses serializability to lift it to the concurrent system. An atomic invariant `IA` is a predicate that holds for any atomic history, relating the live messages and the final state (§4.3, p. 329).

When to use it. Use this when a response message carries a fact about remote cache states, such as “all the caches inside the subtree of Ci have been invalidated” when a child sends the invalidation response rsI (§5.3, p. 333).

How to apply it.

1. Name each message and the state fact it should carry.
2. Write the atomic invariant as a conjunction of clauses of the form `message ∈ live_messages → predicate(state)` (§4.3, p. 329).
3. Prove the clauses by induction over the atomic history’s transition steps. The paper’s example (Fig. 7) starts with the step by r1, whose live message is rsI and which makes C1 invalid; the next step, by the parent, yields live message rsM whose predicate follows from the rsI predicate; the last step, by r2, has live message rsWr, which carries no predicate, so the invariant holds trivially (§4.3, p. 329).
4. Combine the atomic invariant with the ordinary global invariant at each step: `IA(mi, si) ∧ I(si) → IA(mi+1, si+1) ∧ I(si+1)` (§4.3, p. 330).
5. Inference: use the serializability theorem to conclude the invariant for every reachable concurrent state, since each reachable state is reached by a sequential history.

Verus form. Inference: store message predicates in a ghost map from message identifiers to propositions over a ghost cache state. Each enqueue function gets an `ensures` clause that records the predicate; each dequeue proof consumes it and establishes the receiver’s state fact. A `proof fn` over a transaction trace can establish the atomic invariant. Verus does not automatically attach predicates to FIFO elements, so this ghost map and its preservation lemmas are required.

Evidence and limits. The case studies prove inclusive and noninclusive MSI and noninclusive MESI protocols parameterized by a tree that decides the topology (§5, pp. 330–333). The paper says serializability lets one design and prove predicate messages “in the simpler form, not taking any interference into account” (§4.3, p. 328). I did not find a measure of proof effort or annotation counts in the paper. It does report hardware evaluation: simulations count transactions in 5 × 10^5 cycles with random workloads that mimic temporal and spatial locality; the FPGA tandem verification covers over 10^9 memory requests for each protocol (§6.2, p. 334). Hemiola2 and Hemiola3 were simulated, and RiscyOO, whose cache sizes were set the same as Hemiola2, is the hand-written baseline; the authors say “one should not draw too many conclusions from the precise measurements” (§6.2, p. 334).

## compilation and hardware evidence

The compiler takes a single-line Hemiola protocol and generates a multiline implementation described in Kami (§6, p. 333). It uses prebuilt Kami components: NCID, and miss-status holding registers (MSHRs) for uplocks and downlocks; it takes a cache configuration as an argument and uses a prebuilt pipeline to handle multiple line accesses in parallel (§6.1, pp. 333–334). Kami’s synthesis toolchain transliterates the result to Bluespec and synthesizes it for an FPGA, a Xilinx Virtex-7 VC707 (§6.2, p. 334). Hemiola3 has four 32 KB 4-way L1 caches, two 128 KB 8-way L2 caches, and a 512 KB 16-way last-level cache; Hemiola2 has four L1 caches and the last-level cache, with 32-byte lines in all protocols (§6.2, p. 334). Both stayed within the FPGA’s lookup-table and flip-flop budgets. The authors leave verification of the pipeline as a future-work direction (§6.2, p. 334). Inference: the protocol proof does not cover the complete optimized controller.

Inference: for agent-written verified Rust, Hemiola’s strongest lesson is to make safe concurrency a property of an API or DSL before generating protocol instances. Its threat is scope: a product protocol that needs a different topology, transport, or pipeline falls outside the theorem, and the compiler and hardware components remain assumptions unless separately verified.

## techniques for the catalog

- serializable protocol DSL: restrict topology, channels, and rule templates so every legal protocol has a sequential transaction explanation
- implicit directional locks: replace transient-state combinations with automatically managed uplocks and downlocks
- predicate messages: attach state predicates to live messages and prove them as atomic invariants
- transaction-level invariant proof: prove one transaction preserves the invariant, then lift through serializability
- verified protocol compilation: compile a single-line protocol to a multiline Kami implementation and synthesize hardware
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Note that the invariant proof was straightforward since no other state transitions interfere with an atomic history."): read the whole paper text and checked every quotation, section and page reference, number, and technique step against it; changed the abstract quotation to say the framework (not the DSL) does the guiding, lowercased the §3 quotation to match, fixed the atomic-history definition (it starts from one internal-label step, not an external input), the atomic-invariant example and per-step combination, the quote location and wording for the subtree-invalidation example (§5.3, p. 333), the RiscyOO comparison, the §5 page range, and the page ranges for single-line protocols; marked own conclusions "Inference:" and deleted the unsupported claim about earlier walkthrough notes; did not check the references, the figures beyond their captions and text, the Coq artifact, or the dissertation.
