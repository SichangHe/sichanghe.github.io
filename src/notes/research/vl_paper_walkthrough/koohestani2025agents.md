# Are Agents Probabilistic Automata? A Trace-Based, Memory-Constrained Theory of Agentic AI
(authored by agents unless marked 🧑)
Tag: `koohestani2025agents`, [paper](https://arxiv.org/abs/2510.23487)

## core model

The paper classifies agent controllers by enforced persistent-memory interfaces, then transfers their interaction traces to automata and probabilistic models. A run is a sequence of concrete configurations, perceptions, and actions; projecting away hidden state yields a trace in `(perception, action)*`. A stochastic policy and uncertain tools induce a probability distribution over traces. The authors' abstract states are obtained by a finite map alpha from concrete configurations. They stress: “Instead of equating the concrete agent with a deterministic acceptor, we treat the agent-environment closed loop as inducing a probability distribution over finite interaction traces.” (abstract, p. 1).

The classification is architectural. Constant-bounded memory gives Regular agents and regular support; a LIFO stack gives Context-Free agents and context-free support; unrestricted read/write persistence gives Turing-complete (TC) agents and recursively enumerable support. The result is a choice of verification machinery, not a claim that an LLM's internal reasoning is interpretable.

## technique 1: trace semantics and finite abstraction

Use when an agent's internal implementation differs from its tools or framework but its observable interactions matter. Define finite perception alphabet Sigma after tokenization and action alphabet Gamma. Define concrete configurations C including control, memory, and bookkeeping. Record each run `c0 a0 u0 c1 ... cn`; project to `(a0,u0)...`. Define an abstraction alpha:C->S_hat with finite codomain. Require exactness for the property: if two concrete states map to one abstract state, they must enable the same abstract transitions for every perception. Build an abstract probabilistic model M_alpha over S_hat; use a Markov chain when outcomes are probabilistic and an MDP when environment/tool nondeterminism remains. The paper warns: “coarse abstractions can introduce spurious behaviors that do not correspond to any concrete execution.” (section 2, p. 2).

Verus form (Inference): represent an abstract state as a finite Rust enum, a trace as a sequence of finite symbols, and alpha as a `spec fn`. State exactness as a lemma relating equal alpha values to equal enabled transition sets. Prove trace projection and transition preservation with `proof fn`s and `ensures`; then export the finite model to an external probabilistic checker. Verus does not itself provide Markov-chain probability analysis, and proving alpha exact requires modeling every control-relevant input.

Evidence is theoretical: Definitions 3.1–3.4 and Theorem 4.6 establish that the induced finite model has the same abstract trace distribution under the stated environment interpretation (pp. 3–5). No implementation benchmark or measured probability appears.

## technique 2: regular-agent NFA and probabilistic model checking

Use when all persistent information that can influence control is constant-bounded and encoded in finite control. Enforce finite control states, finite Sigma and Gamma, and a framework rule preventing hidden growing stores. Construct an NFA whose states are abstract states, whose alphabet is Sigma×Gamma, whose initial state is alpha(c0), and whose transition exists when some concrete step consumes a perception and emits an action between the corresponding abstract states. Mark all states accepting. By Theorem 4.4, the accepted language equals feasible abstract traces and is regular.

For quantitative checks, choose an unsafe abstract set B_hat and query reachability probability `Pr_Malpha(◇B_hat)` or, for nondeterminism, scheduler extrema `sup_sigma Pr_sigma(◇B_hat)`. The paper says: “Because S_hat is finite, this yields a finite MC/MDP whose stepwise trace generation matches the pushforward semantics.” (section 4.3, p. 5).

Verus form (Inference): write a finite transition relation as a `spec fn`, prove each NFA edge corresponds to one controller step, and prove safety obligations as inductive invariants over traces. The probability calculation remains an external solver/model checker; Verus can verify the exported transition table and its invariants, not replace the quantitative engine.

The booking case demonstrates use: bounded slots for destination, date, budget, and confirmation yield regular traces; one can check the probability of calling `book` without confirmation, but regularity does not make that probability zero (section 9.1, p. 7).

## technique 3: context-free stack model and pushdown analysis

Use when hierarchical tasks need unbounded nesting but persistence is strictly LIFO. Enforce finite control and alphabets plus a finite stack alphabet; each step reads the top symbol and replaces it with a word (push, pop, or no-op). A strict call-return partition may require calls to push a return symbol and returns to pop it. Construct the support PDA over Sigma×Gamma with the same abstract control and stack updates. Theorem 5.3 makes its language exactly the context-free trace support.

For quantitative analysis, use a probabilistic pushdown system or pushdown MDP, with distributions over successor control/stack/action triples. Query reachability extrema over unsafe control-stack configurations. The authors qualify termination: “Termination is not implied by pushdown structure.” (section 9.2, p. 8); add retry bounds, ranking arguments, or finite execution limits.

Verus form (Inference): model stack operations with a verified `Vec`-like abstraction and prove push/pop preservation lemmas, frame well-formedness, and trace correspondence. Use `requires` for a nonempty pop and `ensures` for the resulting stack. A pushdown probability analysis still belongs to an external checker.

## technique 4: TC classification and bounded recovery

Use when an agent can grow persistent artifacts without bound and later read/write arbitrary addresses, or iterate without a structural step bound. Theorem 6.2 states that feasible finite traces are recursively enumerable and that every recursively enumerable language can be realized by a TC architecture simulating a Turing machine. General reachability inherits undecidability. Recover practical analysis by imposing step, time, token, or storage bounds, or by constructing a finite abstraction alpha and checking M_alpha.

Verus form (Inference): prove only bounded executions with a ghost step counter and finite store abstraction. A verified loop invariant can establish safety through the bound; it cannot establish unbounded reachability for a Turing-complete controller. External file or database effects must be represented by trusted contracts.

The booking example's TC design permits unbounded files, notes, database entries, arbitrary rereads, and repeated search/refinement. The paper concludes that TC is appropriate only when the specification explicitly requires this power (section 9.3–9.4, pp. 8–9).

## technique 5: right-sizing and multi-agent composition

Apply the architecture decision procedure: ask whether memory can grow; if no, use Regular. If yes, ask whether access is restricted to LIFO stack discipline; if yes, use Context-Free; otherwise use TC. The same software framework may fall into different classes depending on enforced interfaces. For multi-agent systems, products of Regular agents remain finite-state under finite scheduling; independent stacks yield pushdown composition. A shared unbounded read/write store makes even finite-control agents TC because it simulates a tape (sections 7–8, pp. 6–7).

Verus form (Inference): make memory interfaces Rust types: a bounded enum/array, a stack wrapper exposing only push/pop, or an explicitly untrusted external-store trait. Prove that verified code cannot call operations outside the intended interface. This is a useful containment boundary for agent-written Rust, but the policy's stochastic choices and external scheduler remain assumptions.

## limits and product threat

The theory assumes finite alphabets after tokenization or discretization, exact abstractions that preserve control-relevant distinctions, and computable environment behavior. It explicitly excludes the computational power of external oracles. Nondeterminism interpretation (worst case, best case, or strategy-restricted) changes quantitative guarantees, and abstraction can create spurious high-probability paths. No empirical agent evaluation validates the classifications.

Inference: this paper gives VL a direct design rule: choose the weakest memory interface that can express a task, then generate a finite or pushdown proof target. An agent that can reread arbitrary files, logs, or repositories is TC in the model; a Verus proof over a bounded wrapper does not cover those hidden channels. The product threat is therefore uncontrolled persistent context and scheduler behavior, not merely an incorrect local function. VL should make memory, tool arguments, and iteration bounds explicit before claiming model-checkable verification.

## techniques for the catalog

- trace abstraction — project concrete agent runs to finite observable perception/action traces and verify an exact finite abstraction
- regular controller model — encode bounded memory as finite control, construct an NFA, and run MC/MDP reachability checks
- pushdown controller model — enforce LIFO memory, construct a PDA, and use probabilistic pushdown analysis
- bounded TC fallback — impose execution or storage bounds and check the resulting finite abstraction when unrestricted memory is unavoidable
- architecture right-sizing — select the weakest memory class consistent with required interaction traces
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
