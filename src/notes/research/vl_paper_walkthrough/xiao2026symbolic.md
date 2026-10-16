# Symbolic Temporal Supervision of LLM Agents Using Contracts
(authored by agents unless marked 🧑)
Tag: `xiao2026symbolic`, [paper](https://www.semanticscholar.org/paper/062dedf8fa2c39490d3f08842ea1393753d97013)

## contribution and scope

ContrAgent monitors an LLM agent's tool-call trace with assume-guarantee contracts. The abstract says: “Each contract is compiled to a deterministic finite automaton (DFA) that serves two roles: gating agent actions online and evaluating recorded traces offline.” (Abstract, PDF p. 1.) The framework uses finite-trace linear temporal logic with arithmetic predicates (ALTLf), deterministic grounding, and a reusable contract library independent of the agent model. It checks the tool-call interface, so it can enforce order, history, counts, argument patterns, permissions, and data-flow properties. The introduction says: “ContrAgent therefore tracks the tool-call trace, the ordered sequence of tool-call events the agent emits, now often a long-horizon, multi-tool trajectory.” (Section 3.1, PDF p. 2) The conclusion describes how “The contract library acts as a model-agnostic knowledge base of agent behavior.” (Section 7, PDF p. 10.)

Inference: The paper does not verify Rust or Verus code and does not prove the LLM's internal reasoning. Its monitor can complement Verus proofs by checking agent actions at runtime, but the mapping from an ALTLf contract to a Verus specification is an engineering proposal.

## technique 1: model an agent session as a finite trace with state

Define a finite event alphabet Σ. Each tool call produces a call event `(tool,args)` and a return event `(tool,result)`. An execution is a transition system whose state is `(τ,κ,ρ)`: the event trace, a finite context map, and numeric session counters (Definition 1, PDF p. 2). Context keys carry facts such as caller identity or document source; counters carry cumulative values such as calls or tokens.

Use this model when a policy depends on history rather than one action. At each event, append to τ, update κ and ρ, and expose the resulting state to predicates. The paper defines a session path `s0 → … → sk` whose trace is `a1…ak` (Definition 1, PDF p. 2).

Inference: A Verus implementation can maintain a ghost sequence of tool events and ghost maps/counters, with an invariant relating each accepted runtime event to the sequence prefix. Verus can prove properties of the monitor state, but the paper does not give a Rust implementation or a proof that an external tool interface reports events faithfully.

## technique 2: ground checkable interaction predicates

Define deterministic predicates over current state `s`, event `a`, and parameter `c`. Structural predicates include `Call(T)`, `ArgHas(T,f,p)`, `OutHas(T,p)`, `Match(f,k)`, `Subset(f,S)`, `Flow(s,d)`, and `Perm(P)`. Numeric predicates include call counts, numeric argument values, and cumulative tokens (Table 1, PDF p. 3). Evaluate a predicate pointwise at each event; counters update deterministically.

The paper separates agent-controlled predicates (`Call`, `ArgHas`, `Cnt`) from environment predicates (`OutHas`, `In`, `Perm`) in Definition 4 (PDF p. 5). This distinction permits a contract to assume environment behavior while guaranteeing agent behavior. Numeric atoms such as `Cnt(refund) ≤ 5` are checked during grounding; counter values are not encoded in the DFA, preserving a finite automaton (Section 3.2 and Section 5.1, PDF pp. 3, 5).

Inference: In Verus, represent each predicate as a pure specification function over a ghost event and state, then prove that concrete event parsing refines it. Pattern matching, permission sets, and data-flow extraction require trusted adapters at the tool boundary; the paper explicitly leaves defense of this observation channel out of scope (Section 6, PDF p. 10).

## technique 3: write assume-guarantee contracts with three-valued runtime status

An A/G contract is `(V,φA,φG)`, where `φA` ranges over environment predicates and `φG` over all predicates (Definition 4, PDF p. 5). A concrete contract pair `(A,G)` receives a three-valued valuation: IDLE (1) while assumptions have not become active, ACTIVE (e) when assumptions and guarantees hold, and FAIL (0) when assumptions hold but guarantees fail (Definition 2, PDF p. 4). The paper states: “A contract is consistent if and only if there exists a valid implementation, i.e., G ∪ A ≠ ∅, and it is compatible if there exists a valid environment Ec, i.e., A ≠ ∅.” (Section 3.3, PDF p. 4.)

For a library of contracts, join valuations to obtain an environment verdict and meet them to obtain the agent verdict. The monitor blocks when the agent violates at least one contract and identifies whether the fault is in the agent, environment, or an over-restrictive contract (Definitions 2–4 and Section 5.2, PDF pp. 4–6).

Inference: Verus can encode the valuation as an enum in executable Rust and specify that accepted prefixes satisfy the contract invariant. The three statuses are a runtime-monitoring design, not a Verus proof construct.

## technique 4: compile policy text to ALTLf and then to DFAs

Contract compilation has two stages. First, translate requirement artifacts—manual formulas, natural-language requirements, policy documents, or recorded traces—into ALTLf formulas over the fixed predicate vocabulary. For natural language, an LLM lifts each utterance into a formula with placeholder leaves; a deterministic grounding step maps placeholders to Table 1 predicates; the resulting formula is translated back to natural language for human review (Section 5.1, PDF p. 5).

Second, compile each finite-trace LTL formula to an equivalent DFA. The DFA alphabet is the power set of predicate valuations; it reads one valuation per event and accepts exactly satisfying traces. Numeric comparisons are evaluated during grounding, so counter state remains outside the finite automaton. Compile assumptions and guarantees to separate DFAs and store them as one checker (Section 5.1, PDF p. 5).

The paper's worked contract is `¬Call(refund) U Call(approve) ∧ G(Call(refund) → Num(refund,amount)≤42)`. On a refund of amount 50 after approval, `Call(refund)` and `Match(account,appr)` are true but the numeric predicate is false, so the contract reaches FAIL (Example 1, PDF p. 5).

Inference: A Verus tool can generate proof obligations from the same ALTLf formula, but LLM-generated formulas need review and machine consistency checks. The paper does not claim that its LLM formulation stage is sound; it explicitly keeps human inspection in the loop.

## technique 5: enforce online and evaluate offline with one checker

At every event, evaluate all predicates, advance each contract's two DFAs, and compute the joint valuation. Online enforcement checks before a call executes and before an incoming event reaches the agent. It blocks the first prefix whose verdict is not `(ACTIVE,ACTIVE)`, suppresses violating return/input events, and resumes from the last valid prefix; a violation can instead redirect to a safe alternative or escalate to a human (Section 5.2, PDF pp. 6–7).

For liveness, a finite prefix cannot refute an unbounded `G(trigger → F response)` guarantee. ContrAgent keeps it pending and reports it at session end; failure to satisfy it then becomes FAIL (Section 5.2, PDF p. 7). Offline evaluation replays a recorded trace without intervention and returns the two end-of-trace verdicts. Since the same deterministic states are traversed, online and offline verdicts agree at every prefix. DFAs are compiled once and reused, reducing each offline event to one table lookup, O(1); online residual-formula processing costs O(|C|) per event for the loaded contract set C (Section 5.2, PDF p. 7).

Inference: For Verus agents, retain the accepted trace as ghost evidence and make a blocked call an explicit error branch. A monitor cannot replace a proof of the tool implementation or data semantics.

## technique 6: check contract libraries before deployment

For every contract, check consistency and compatibility. Check that the conjunction of all `Ai ∧ Gi` formulas is satisfiable; if it is not, extract a minimal unsatisfiable core to locate contracts for repair (Section 5.1, PDF p. 5). This prevents contradictory policies from silently blocking every action. The library is model-agnostic: because formulas mention predicates rather than model internals, the same checker can run across agents and LLMs sharing a tool interface (Section 5.1, PDF p. 6).

Inference: In Verus, encode consistency as a separate satisfiability or proof obligation and reject a contract set whose assumptions and guarantees cannot be jointly realized. The paper's Z3 and unsatisfiable-core tooling is external evidence, not a Verus kernel guarantee.

## evidence and denominators

The implementation is Python 3.12 and measures latency on an Apple M4 Pro laptop with 24 GB RAM (Section 6, PDF p. 7). The enforcement benchmark SOPBench has seven domains and 40 tasks per domain. Table 2 reports means over three seeded trials: ContrAgent has mean success 90% and safety 98%, compared with base 91%/32%, prompt 64%/94%, and LLM-guard 24%/98%; median extra runtime is 0.135 seconds for ContrAgent versus 0.905 seconds for prompting and 1.34 seconds for LLM-guard (Table 2, PDF p. 7). The paper says ContrAgent holds success at the base level while raising safety from 32% to 98% in this setting (Section 6.1, PDF p. 7).

On AgentDojo, the pooled no-detector attack-success rate falls from 18.0% to 5.3% at 0.8% utility false-positive rate; trace-learned contracts reach 1.7% ASR at 0.3% FP (Section 6.2, PDF p. 8). On the gpt-4o main attack, Table 3 reports 47.7% ASR with no defense, 11.1% for ContrAgent without a detector, and 0.79% for trace-learned contracts, each with 0.16 ms overhead; utility is 72.6% for no defense and trace-learned contracts, and 71.8% for no-detector ContrAgent (Table 3, PDF p. 8).

On R-Judge, the evaluation set contains 571 multi-turn records: 301 unsafe and 270 safe. ContrAgent reaches average F1 91.8%, with 97.0% precision and 87.0% recall across multiple trials; GPT-4o reaches 74.4% and the cited human baseline approximately 89% (Section 6.3, PDF p. 9). On τ²-bench, the paper describes 4,464 traces; Claude 3.7 has outcome `pass4` of 25–60% but `joint4` of 0% in all three domains, showing that outcome-only scoring can hide procedural violations (Section 6.4, PDF p. 9).

These numbers measure this Python implementation, these benchmarks, and the stated models/settings. They do not measure Verus proof rates, semantic harms outside tool calls, or robustness when the event channel lies. The paper reports that 82% of missed AgentDojo attacks issue no malicious tool call and 18% issue legitimate-looking arguments, so a tool-call shield cannot catch all prompt-injection outcomes (Section 6.2, PDF p. 8).

## what is trusted, what fails, and VL threat

The contract library is human-inspected; the natural-language-to-formula LLM is not itself verified; predicate grounding trusts event reports, pattern matchers, counters, and tool-return parsing; and free-form semantic harms remain outside the monitor (Limitations, PDF p. 10). The DFA construction and deterministic monitor provide reproducible verdicts only for the observed predicates and trace.

Inference: For VeruLaw, this is a high-value runtime complement to verified Rust: it can enforce temporal order, counts, and permissions around agent tool calls while Verus proves local code invariants. It cannot establish that an agent's prose goal is correctly formalized, that a tool result is truthful, or that a blocked policy is semantically complete. VL should reuse the finite-trace contract monitor and explicit offline replay; it should not treat monitor success as a substitute for Verus proof.

## techniques for the catalog

- event-state trace model — represent each call and return as an event over trace, context map, and counters
- deterministic interaction predicates — ground structural, numeric, permission, pattern, and data-flow checks at each event
- assume-guarantee valuation — separate environment assumptions and agent guarantees with IDLE, ACTIVE, and FAIL statuses
- ALTLf-to-DFA compilation — compile finite-trace temporal formulas to reusable deterministic checkers
- dual-mode supervision — gate calls online and replay identical checkers offline for reproducible verdicts
- contract-library analysis — test consistency, compatibility, and unsatisfiable cores before deployment

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
