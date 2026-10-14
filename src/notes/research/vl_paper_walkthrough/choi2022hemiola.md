# Hemiola: A DSL and Verification Tools to Guide Design and Proof of Hierarchical Cache-Coherence Protocols
(authored by agents unless marked 🧑)
Tag: `choi2022hemiola`, [paper](https://doi.org/10.1007/978-3-031-13188-2_16)

Hemiola is a Coq-embedded domain-specific language for hierarchical cache-coherence protocols. It restricts topology, channels, and rule shapes so that every expressible protocol is serializable: each concurrent execution has an equivalent one-transaction-at-a-time execution. This removes interleavings from the main invariant proof. The paper’s abstract says the DSL “guides the user to design protocols that never experience inconsistent interleavings while handling transactions concurrently.”

## design by topology and rule templates

What it is. Hemiola models a cache hierarchy as a tree. A parent and child communicate over three ordered channels. A protocol is a set of per-cache rules, but every rule must be an instance of one of nine templates. A template supplies message directions, preconditions, state transition, and lock operations. The paper says: “The Hemiola DSL limits protocols to satisfy abstract conditions that can guarantee noninterference by-construction.” (§3, p. 321).

When to use it. Use this pattern when a distributed protocol has a stable hierarchy and each transaction follows parent-child message flows. It is useful when arbitrary interleavings make invariant proofs explode. It excludes designs that need a non-tree topology or rule behavior outside the templates.

How to apply it.

1. Choose a tree of cache nodes, with leaves as L1 caches and the root as memory (§3.2, p. 322).
2. Give each parent-child edge three ordered channels, matching the paper’s request and response directions (§2, pp. 319–321; §3.2, p. 322).
3. Define cache state, message kinds, initial state, and a unique rule index. Hemiola requires a precondition and transition function for each template (§3.1, p. 322).
4. Select a template for each message flow. For example, `rquu` receives a processor write request and sends an upward request; the paper’s compact rule is `rule getMRqUpUp from template rquu { receive rqWr(); assert (status == S); send rqM(); }` (§2, p. 321).
5. State only the local precondition and transition. The template automatically checks and updates its lock state and channels (§3.2, pp. 323–324).
6. Prove the resulting global invariant over the DSL semantics. The serializability theorem then supplies the reduction from concurrent histories to sequential transactions.

The built-in locking discipline replaces explicit transient states. An uplock is set on an upward request and released on its response; a downlock is set on a downward request and released on corresponding child responses. While locked, further requests in that direction are blocked (§3.2, p. 323). The paper states: “The user, however, does not need to deal with this lock state while using the DSL; locks are managed implicitly by Hemiola.”

Verus form. Inference: represent each cache’s lock state with an enum in executable Rust and a ghost tree index. Encode allowed transitions as `requires` and `ensures` on functions such as `send_up` and `send_down`; use a loop `invariant` for the queue and lock relation. A `proof fn` can establish that a child-parent step preserves the tree invariant. Verus has no template language that automatically guarantees serializability, so the templates and their proof would be a separate verified library. Inference: Rust enums and ownership can carry lock state, but the paper’s implicit channel discipline must become explicit API contracts.

Evidence. The paper proves a language-level theorem: `OnTree S t ∧ GoodRules S t → Serializable S` (§4.4, p. 330). The proof uses commuting reductions. This is a mechanized Coq proof of the DSL, not a probabilistic test.

Failure and assumptions. The guarantee applies only to systems satisfying the tree and template conditions. The paper notes that hardware may implement the logical channels with FIFOs or buses, so the refinement of those components remains a trusted boundary. The DSL handles single-line protocols; a compiler extends them to multiple lines (§3.2, p. 323).

## serializability as proof reduction

What it is. A transaction is an atomic history triggered by external requests. A history is serializable when every reachable state has an equivalent sequential history made by concatenating transactions (§4.2, pp. 327–328). Thus an invariant can be proved one transaction at a time.

How to apply it.

1. Define the one-rule-at-a-time transition semantics and reachable states (§4.1, pp. 325–326).
2. Define an atomic history by starting with an external input and appending rules whose inputs consume live messages from the history (§4.2, p. 327).
3. Call an atomic history triggered by external requests a transaction.
4. Prove that each legal concurrent history reaches the same state as some sequential concatenation of transactions.
5. Prove the target invariant for the initial state and show that one transaction preserves it. The paper explains: “Since a transaction is an (external) atomic history, we can make use of corresponding atomic invariants.” (§4.3, p. 330).

Verus form. Inference: represent a transaction trace with a ghost `Seq` of labels and define a `spec fn` for the sequential transition relation. A `proof fn` can show that every implementation step preserves the global invariant and that a transaction preserves the corresponding atomic predicate. Full serializability over arbitrary concurrent traces needs a ghost state-machine model and induction over histories; it is not obtained from an ordinary Rust loop invariant.

## predicate messages and atomic invariants

What it is. A predicate message attaches a logical predicate to a live message: whenever that message is present, the predicate holds in the current state. Directly proving such a predicate under interference is cumbersome because another transaction may invalidate it. Hemiola instead proves an atomic invariant over one transaction history, then uses serializability to lift it to the concurrent system. The paper defines an atomic invariant as a predicate that holds for every atomic history with its initial and live messages (§4.3, p. 329).

When to use it. Use this when a response message carries a fact about remote cache states, such as “all the caches inside of the subtree of Ci have been invalidated” before granting Modified status.

How to apply it.

1. Name each message and the state fact it should carry.
2. Write the atomic invariant as a conjunction of clauses of the form `message ∈ live_messages → predicate(state)` (§4.3, p. 329).
3. Prove the clauses by induction over the atomic history’s transition steps. The paper’s example starts with an invalidation response, propagates its predicate through a parent transition, and discharges the final response clause (§4.3, pp. 329–330).
4. Combine the atomic invariant with the ordinary global invariant at each transaction boundary: `IA(mi, si) ∧ I(si) → IA(mi+1, si+1) ∧ I(si+1)` (§4.3, p. 330).
5. Use the serializability theorem to conclude the invariant for every reachable concurrent state.

Verus form. Inference: store message predicates in a ghost map from message identifiers to propositions over a ghost cache state. Each enqueue function gets an `ensures` clause that records the predicate; each dequeue proof consumes it and establishes the receiver’s state fact. A `proof fn` over a transaction trace can establish the atomic invariant. Verus does not automatically attach predicates to FIFO elements, so this ghost map and its preservation lemmas are required.

Evidence and limits. The case studies prove inclusive and noninclusive MSI and noninclusive MESI protocols parameterized by arbitrary cache trees (§5, pp. 330–334). The predicate-message technique removes the need to enumerate interference cases. The paper does not give a denominator for proof effort or compare annotation counts. It does report hardware evaluation: simulations count transactions in `5 × 10^5` cycles; FPGA tandem verification covers “over 10^9 memory requests for each protocol” (§6.2, p. 334). The simulations use random workloads with locality and compare Hemiola2 and Hemiola3 against RiscyOO; the authors caution against drawing strong conclusions from precise measurements (§6.2, p. 334).

## compilation and hardware evidence

The compiler takes a single-line Hemiola protocol and generates a multiline Kami implementation. It supplies NCID and miss-status holding-register components, accepts cache configuration, and pipelines asynchronous line accesses (§6.1, pp. 333–334). Kami’s Coq toolchain then translates to Bluespec and synthesizes an FPGA implementation (§6.2, p. 334). Hemiola3 has four 32 KB four-way L1 caches, two 128 KB eight-way L2 caches, and a 512 KB 16-way last-level cache; Hemiola2 has four L1 caches and one last-level cache, with 32-byte lines (§6.2, p. 334). Both fit the FPGA’s lookup-table and flip-flop budgets. The authors explicitly leave pipeline verification as future work (§6.2, p. 334), so the protocol proof does not cover the complete optimized controller.

Inference: for agent-written verified Rust, Hemiola’s strongest lesson is to make safe concurrency a property of an API or DSL before generating protocol instances. Its threat is scope: a product protocol that needs a different topology, transport, or pipeline falls outside the theorem, and the compiler and hardware components remain assumptions unless separately verified.

No earlier study in the walkthrough notes covers Hemiola’s serializability-by-template and predicate-message methods.

## techniques for the catalog

- serializable protocol DSL: restrict topology, channels, and rule templates so every legal protocol has a sequential transaction explanation
- implicit directional locks: replace transient-state combinations with automatically managed uplocks and downlocks
- predicate messages: attach state predicates to live messages and prove them as atomic invariants
- transaction-level invariant proof: prove one transaction preserves the invariant, then lift through serializability
- verified protocol compilation: compile a single-line protocol to a multiline Kami implementation and synthesize hardware
Checked 2026-10-14: audit record choi2022hemiola; paper-study comparison complete; gate executed; experiments not rerun
