# Are Agents Probabilistic Automata? A Trace-Based, Memory-Constrained Theory of Agentic AI
(authored by agents unless marked 🧑)
Tag: `koohestani2025agents`, [paper](https://arxiv.org/abs/2510.23487)

## core model

The paper classifies agent controllers by enforced persistent-memory interfaces, then transfers their interaction traces to automata and probabilistic models. A run is a sequence of concrete configurations, perceptions, and actions; projecting away hidden state yields a trace in `(perception, action)*`. A stochastic policy and probabilistic tools induce a probability distribution over traces; with nondeterminism, analysis fixes a scheduler interpretation. The authors' abstract states are obtained by a finite map alpha from concrete configurations. They stress: “Instead of equating the concrete agent with a deterministic acceptor, we treat the agent-environment closed loop as inducing a probability distribution over finite interaction traces.” (abstract, p. 1).

The classification is architectural. Constant-bounded memory gives Regular agents and regular support; a LIFO stack gives Context-Free agents and context-free support; unrestricted read/write persistence gives Turing-complete (TC) agents and recursively enumerable support. These correspondences identify verification machinery under the paper's architectural and abstraction assumptions (sections 4–6, pp. 3–5).

## technique 1: trace semantics and finite abstraction

Inference: use this method when observable interactions matter across differing controller implementations. Define finite perception alphabet Sigma after tokenization and action alphabet Gamma. Define concrete configurations C including control, memory, and bookkeeping. Record each run `c0 a0 u0 c1 ... cn`; project to `(a0,u0)...`. Define an abstraction alpha:C->S_hat with finite codomain. For Regular control, require exactness as in Definition 4.2: concrete states with equal abstractions must enable the same abstract transitions for every perception. Section 10.4 separately requires abstraction fidelity for the property being checked. Build an abstract probabilistic model M_alpha over S_hat; use a Markov chain when outcomes are probabilistic and an MDP when environment/tool nondeterminism remains. The paper warns: “coarse abstractions can introduce spurious behaviors that do not correspond to any concrete execution.” (section 2, p. 2).

Inference: for a Verus implementation, represent an abstract state as a finite Rust enum, a trace as a sequence of finite symbols, and alpha as a `spec fn`. State exactness as a lemma relating equal alpha values to equal enabled transition sets. Prove trace projection and transition preservation with `proof fn`s and `ensures`; then export the finite model to an external probabilistic checker. Verus does not itself provide Markov-chain probability analysis, and proving alpha exact requires modeling every control-relevant input.

Evidence is theoretical: Definitions 3.1–3.4 introduce trace semantics and abstraction (p. 3); Theorem 4.6 states equality of the induced abstract trace distributions under a fixed environment interpretation (p. 4). No implementation benchmark or measured probability appears.

## technique 2: regular-agent NFA and probabilistic model checking

The Regular construction applies when all persistent information that can influence control is constant-bounded and encoded in finite control (Definition 4.1, p. 3). Enforce finite control states, finite Sigma and Gamma, and a framework rule preventing hidden growing stores. Construct an NFA whose states are abstract states, whose alphabet is Sigma×Gamma, whose initial state is alpha(c0), and whose transition exists when some concrete step consumes a perception and emits an action between the corresponding abstract states. Mark all states accepting. Under exactness, Theorem 4.4 equates the NFA language with trace support (p. 4). The policy must assign nonzero probability to every enabled transition, or the support generator must retain only transitions with nonzero closed-loop probability.

For quantitative checks, choose an unsafe abstract set B_hat and query reachability probability `Pr_Malpha(◇B_hat)` or, for nondeterminism, scheduler extrema `sup_sigma Pr_sigma(◇B_hat)`. The paper says: “This depends on how tool/environment uncertainty is represented.” (section 4.3, p. 4).

Inference: for a Verus implementation, write a finite transition relation as a `spec fn`, prove each NFA edge corresponds to one controller step, and prove safety obligations as inductive invariants over traces. The probability calculation remains an external solver/model checker; Verus can verify the exported transition table and its invariants, not replace the quantitative engine.

The booking case demonstrates use: bounded slots for destination, date, budget, and confirmation yield regular traces; one can check the probability of calling `book` without confirmation, but regularity does not make that probability zero (section 9.1, p. 7).

## technique 3: context-free stack model and pushdown analysis

The Context-Free construction applies when persistence is restricted to a single unbounded LIFO stack (Definition 5.1, p. 4). Enforce finite control and alphabets plus a finite stack alphabet; each step reads the top symbol and replaces it with a word (push, pop, or no-op). A strict call-return partition may require calls to push a return symbol and returns to pop it. Construct the support PDA over Sigma×Gamma, preserving the finite control and finite stack information needed to determine enabled transitions (Definition 5.2, p. 4). Theorem 5.3 states that its language equals context-free trace support (p. 5).

For quantitative analysis, use a probabilistic pushdown system or pushdown MDP, with distributions over successor control/stack/action triples. Query reachability extrema over unsafe control-stack configurations. The authors qualify termination: “Termination is not implied by pushdown structure; it is a property that can be analyzed under additional assumptions (for example, bounded retry policies, ranking arguments, or explicit step limits) or as a bounded-execution query on a finite abstraction.” (section 9.2, p. 7).

Inference: for a Verus implementation, model stack operations with a verified `Vec`-like abstraction and prove push/pop preservation lemmas, frame well-formedness, and trace correspondence. Use `requires` for a nonempty pop and `ensures` for the resulting stack. A pushdown probability analysis still belongs to an external checker.

## technique 4: TC classification and bounded recovery

The TC definition requires an unbounded persistent store with arbitrary read/write access across steps and iteration without a global structural step bound (Definition 6.1, p. 5). Unbounded iteration alone does not meet this definition. Theorem 6.2 claims that feasible finite traces are recursively enumerable and, conversely, that every recursively enumerable language can be realized by a TC architecture simulating a Turing machine (p. 5). General reachability inherits undecidability. Recover practical analysis by imposing step, time, token, or storage bounds, or by constructing a finite abstraction alpha and checking M_alpha.

Inference: for a Verus implementation, prove only bounded executions with a ghost step counter and finite store abstraction. A verified loop invariant can establish safety through the bound; this does not provide a general decision procedure for unbounded TC reachability. External file or database effects must be represented by trusted contracts.

The booking example's TC design permits unbounded files, notes, database entries, arbitrary rereads, and repeated search/refinement. The paper concludes that TC is appropriate only when the specification explicitly requires this power (sections 9.3–9.4, p. 7).

## technique 5: right-sizing and multi-agent composition

Apply the architecture decision procedure: ask whether memory can grow; if no, use Regular. If yes, ask whether access is restricted to LIFO stack discipline; if yes, use Context-Free; otherwise use TC. The same software framework may fall into different classes depending on enforced interfaces. For multi-agent systems, section 7 states that products of Regular agents remain finite-state under interleaving with finite scheduler bookkeeping (pp. 5–6). It also asserts an analogous Context-Free result with separate stacks and a finite-state scheduler; no detailed construction is supplied. With a shared unbounded read/write store and serialized scheduling or atomic read/write operations, finite control can simulate a Turing machine (p. 6). Right-sizing appears in section 8 and Figure 1 (pp. 6–7).

Inference: for a Verus implementation, make memory interfaces Rust types: a bounded enum/array, a stack wrapper exposing only push/pop, or an explicitly untrusted external-store trait. Prove that verified code cannot call operations outside the intended interface. This is a useful containment boundary for agent-written Rust, but the policy's stochastic choices and external scheduler remain assumptions.

## techniques for the catalog

- trace abstraction — project concrete agent runs to finite observable perception/action traces and verify an exact finite abstraction
- regular controller model — encode bounded memory as finite control, construct an NFA, and run MC/MDP reachability checks
- pushdown controller model — enforce LIFO memory, construct a PDA, and use probabilistic pushdown analysis
- bounded TC fallback — impose execution or storage bounds and check the resulting finite abstraction when unrestricted memory is unavoidable
- architecture right-sizing — select the weakest memory class consistent with required interaction traces
