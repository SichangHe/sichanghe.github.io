# Limits to Verification and Validation of Agentic Behavior
(authored by agents unless marked 🧑)
Tag: `jilk2016limits`, [paper](http://arxiv.org/abs/1604.06963v2)

## scope and central result

Section numbers below count the paper's unnumbered headings in order (Introduction = §1, Formalizing Specification and Verification = §2, Implementing Verification = §3, Specifying and Validating a Deontology = §4, The Agentic Boundary = §5, Discussion = §6); page numbers are the paper's printed ones. The paper defines a general computational agent, adapted from Hutter (2007), as a policy mapping alternating input/output histories to its next action. A history is a pair of equal-length strings, and a deontology is a set `G` of Good histories. The paper requires viability: the empty history is Good, and after every Good history and possible next input there is some action that keeps the history Good. It then defines property `V`: a policy has `V` when every action it chooses after a Good history keeps the resulting history in `G`. The decision problem `D_V(P)` asks whether policy `P` has `V`; an affirmative answer is called verification. The theorem is: “For an agent with policy P: H → Y and a non-trivial, viable deontology G, D_V is not computable.” (Theorem, §2, p. 4).

The proof constructs one Good policy and one Bad policy and applies Rice's theorem. Viability supplies a policy `P_G` that always chooses an action preserving `G`. Non-triviality supplies a Bad history; the proof constructs `P_B` that, at some Good history, chooses an action leading to a history outside `G`, and behaves arbitrarily elsewhere. Since `V` is a non-trivial property of a computable partial function, Rice's theorem makes deciding membership in `V` impossible. The paper's recapitulation is precise: “We showed that under such a formalism the question of whether an agent does in fact always exhibit Good behavior is not computable.” (end of §2, p. 4).

The paper itself notes in footnote 5 (p. 4) that the essence of the result is mentioned without proof in Yudkowsky (2008) and that undecidability of verification in general is well known in computer science, and it only conjectures, rather than proves, that any computationally analyzable agentic behavior reduces to this formalism (end of §2, p. 5).

Inference: This is a limit on a general decision procedure, not a claim that every concrete Verus proof is impossible. A Verus proof can establish a supplied contract for a bounded program; it cannot make the general policy-membership problem decidable or establish that a contract captures all physical consequences.

## technique 1: model behavior as histories and a deontology

What it is. Represent perceptions in `X`, actions in `Y`, and an execution prefix as alternating I/O histories. Define Good behavior extensionally as `G ⊆ H`, then state the safety property over every Good prefix and every next input. This separates the agent's action policy from the environment and makes the standard explicit.

How to apply it, following the paper.

1. Choose discrete input and output alphabets `X` and `Y` and represent a run as equal-length strings (formalism, §2, pp. 2–3).
2. Define histories `H` as pairs whose input and output strings have equal length (formalism, §2, p. 3).
3. Specify Good histories as a set `G ⊆ H`; require the empty history and an extendability witness for every input (formalism, §2, p. 3).
4. Define the policy `P: H → Y` and check the quantified condition for `V` (formalism, §2, p. 3).
5. Treat an affirmative decision for `D_V(P)` as verification, while retaining the distinction between actions and later consequences (formalism, §§2, 5, pp. 3, 9–11).

Evidence and limits. The construction covers arbitrary computable policies and every non-trivial viable `G`, then proves the decision problem non-computable (Theorem and proof, §2, p. 4). The model assumes discrete I/O; the paper says no-op and time symbols can encode other alternation patterns, while an entirely analog agent is outside computability for still more basic reasons (objections, §2, p. 5). It also assumes agreement about which consequences are desirable, explicitly acknowledging that this agreement is difficult (Introduction, pp. 1–2).

Inference: In Verus, model a finite-state or protocol agent with a state type and a ghost sequence or transition-system state. Put safety preconditions in `requires`, postconditions in `ensures`, and preservation facts in loop `invariant` clauses or transition-system invariants. A `spec fn` can describe Good states, while executable Rust performs the transition. The paper's arbitrary-history and environment quantifiers may require an abstract state machine rather than executable strings. This is an encoding recommendation, not a result stated by the paper.

## technique 2: use a deontological governor as a verified output filter

What it is. Instead of reproving an adaptive agent after every internal change, place a separate governor immediately before actuators. The governor receives perceptions, actions, and a proposed next action; it emits that action only if the action conforms to a computable deontology, otherwise it substitutes a conforming action. The paper calls it a “deontological governor” and says it is “a kind of computational superego” (Implementing Verification, §3, pp. 6–7).

How to apply it, following the paper.

1. Make the deontology computable and define the proposed-action interface (Implementing Verification, §3, pp. 6–7).
2. Implement the governor to test the proposed action and select a conforming replacement when necessary; viability guarantees that a replacement exists, and the paper notes that testing each symbol in `Y` is a worst-case search (footnote 6, p. 7).
3. Verify the governor against the deontology; the paper says a governor for a computable deontology should be "relatively straightforward to build, and perhaps equally straightforward to verify through a manual proof" (Implementing Verification, §3, p. 7).
4. Install it as the last computation before actuator values and separately verify that installation is correct (Implementing Verification, §3, p. 7).
5. Include anti-tampering behavior in the deontology; the paper says tampering actions must be excluded from the deontology and that this "may create further computability issues" (Implementing Verification, §3, p. 7).

Evidence and limits. The proposed advantage is architectural: “Once it is built and verified, it does not need to change along with the internal agent code, is robust to agent learning, and can be installed as the very last step prior transmitting the output values to the actuators of the agent.” (Implementing Verification, §3, p. 7). Its cost is semantic coupling: each project likely needs its own governor, and sensor or actuator changes require a deontology update (same section). A non-decidable deontology cannot be implemented as a governor at all (Specifying and Validating a Deontology, §4, p. 7).

Inference: A Verus version would expose a governor function with `requires` describing a valid deontology and `ensures` stating that the returned action is permitted. A `proof fn` could establish that the fallback search returns a permitted action, while executable code performs the search. The proof must include the installation boundary and any actuator adapter; proving only an internal filter leaves the paper's tampering and semantic-boundary problem unresolved.

## technique 3: restrict specifications with partial histories and regular expressions

What it is. The paper reduces specification burden by observing that recent context, rather than an entire unbounded history, often determines whether an action is Good. It proposes a “partial history” and regular expressions for the don't-care prefix. The exact claim is: “Because regular languages are decidable, this aspect of the approach does not affect decidability.” (Specifying and Validating a Deontology, §4, p. 8).

How to apply it. Identify the recent context relevant to an action, mark older portions as don't-care, and encode the resulting language with a regular expression or equivalent finite automaton (Specifying and Validating a Deontology, §4, p. 8). Check that the abstraction still classifies every relevant action context; the paper presents this as a tractability aid, not as a proof that outcomes are safe. Inference: a Verus implementation can represent the automaton state as ghost state, prove each transition preserves an allowed-state predicate, and use `ensures` to connect the returned action to the automaton's acceptance condition.

The limit is that action-level decidability does not solve outcome validation. The paper says, “To truly ensure Good outcomes, it is necessary to work backward, either from acceptable outcomes to elaborate the Good actions, or from unacceptable outcomes to restrict actions via complement.” (Specifying and Validating a Deontology, §4, p. 8). It then requires a world model for physical consequences and notes that physics is incomplete and chaotic (pp. 8–9). Inference: a Verus contract over a finite protocol state can prove only the modeled state property; it cannot silently upgrade that property into a guarantee about unmodeled sensors, actuators, humans, or physics.

## technique 4: audit layered architectures for intention/action gaps

What it is. The paper analyzes architectures with an internal “homunculus” or decision apparatus whose logical intentions are easy to verify, while perception and action execution remain outside the proof boundary. It argues that this can verify intentions rather than actions. Its warning is: “Logical reasoning about intentions within a homunculus is not a substitute for rules of action for an outer agent.” (The Agentic Boundary, §5, p. 11).

How to apply the audit (Inference: this procedure is the study's own reading of the paper's argument, not a procedure the paper states). Draw the boundary around every component claimed to be verified; list the semantics connecting logical symbols to sensor readings, plans, commitments, and actuator effects; then check whether each connection has a proved model or is merely assumed (The Agentic Boundary, §5, pp. 10–11). Test mandates such as “never kill a human” against novel methods and ambiguous causal notions; the paper uses this example to show that finite taxonomies can be bypassed (p. 11). Inference: for VL, each generated Rust function should have a contract whose state variables correspond to concrete memory and I/O effects, and trusted adapters should be named explicitly. A proof of a high-level intent state alone is insufficient evidence for the generated program's external behavior.

## what is proved, measured, and trusted

The paper proves non-computability by a Rice-theorem reduction; it reports no benchmark, experiment, denominator, or runtime measurement. It argues that manual proofs must be redone after every agent revision and are especially burdensome for learning systems because all perceptual histories matter (Implementing Verification, §3, p. 6). It also argues that validating physical outcomes would require a complete analytic world model: “for an agent operating in the physical world, it would require a complete and analytic physical model of the world so as to predict consequences.” (Discussion, §6, p. 12).

Inference: the paper does not discuss Verus or Rust. The trusted base for a Verus product therefore includes the specification's meaning, any abstract environment and actuator model, external libraries and hardware, the verifier and solver, and the connection between proof-level state and deployed effects. The paper's threat to agent-written verified Rust is, in this reading, high at the claim boundary: formal contracts can sharply reduce bugs inside a modeled Rust component, but they cannot justify certainty about an adaptive agent's unconstrained actions or real-world consequences. The paper's governor idea can be read as a reusable containment pattern; its undecidability and boundary analysis are reasons to state narrower claims and trusted assumptions explicitly.

## techniques for the catalog

- history-based deontology — define I/O histories, Good set `G`, viability, and policy property `V` before attempting verification
- non-computability audit — use the Good/Bad policy construction and Rice's theorem to detect when general policy checking cannot be automated
- deontological governor — verify a separate last-step output filter and require a conforming fallback action
- regular partial-history specification — encode relevant context with finite-state or regular-language rules to keep the deontology decidable
- intention/action boundary audit — enumerate semantic links from logical intentions to sensors, plans, actuators, and consequences and mark unproved links as assumptions

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Our best models of the world (i.e., physics, chemistry) remain incomplete, and in any case due to chaotic effects and non-analyticity (e.g., the three-body problem), only limited prediction is possible."): I read the whole paper text and the whole study, and checked each quotation, the theorem and proof description, the four techniques, and section and page references against the paper; I changed the proof description of `P_B`, the governor steps 3 and 5 to match the paper's hedged wording, added the section numbering convention, footnote 5 and the conjecture caveat, and labelled the audit procedure and the Verus remarks as inference; I did not check the Verus encoding suggestions beyond marking them as inference, the cited works other than through the paper, or the link, which is kept from the fetch record because the paper text gives no DOI or URL.
