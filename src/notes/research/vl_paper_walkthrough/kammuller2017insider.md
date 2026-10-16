# Insider threats and auctions: formalization, mechanized proof, and code generation
(authored by agents unless marked 🧑)
Tag: `kammuller2017insider`, [paper](https://doi.org/10.22667/jowua.2017.03.31.044)

## result and threat model

The paper formalizes a fictitious “cocaine auction” in Isabelle/HOL to study sweetheart deals and bidder collusion. It combines Isabelle’s inductive security-protocol method with the Isabelle Insider framework. The abstract states: “We use the existing example of a fictitious cocaine auction protocol from the literature to develop and illustrate our approach.” (abstract, page 1). The model includes arbitrary rounds, broadcast messages, an anonymity layer, cryptographic messages, and a Dolev–Yao-style spy. A sweetheart deal is a seller precommitting to a friend; “ringing” is bidders colluding. The model proves that faithful traces exclude the sweetheart outcome but cannot exclude collusion under the stated insider assumptions.

## technique 1: inductive trace specification

Use an inductive event-set when a protocol has unbounded rounds and an attacker may interleave messages. Define `cocaine_auction` as the least set of event lists closed under protocol rules. Add a base rule that broadcasts the server key to all friends; a bidding rule that accepts an authenticated bid and broadcasts it; a timeout rule that selects the previous winner; and a finish rule that announces the winner and meeting place. Add a `Fake` rule allowing the spy to prepend a message when the payload is synthesizable from `analz (spies evsf)`. Each rule extends a trace only when its preconditions hold, so malformed event sequences are outside the set.

The paper describes the result as follows: “Arbitrary numbers of rounds in an auction are enabled and yet inconsistent traces are excluded.” (section 4.2, page 40). To prove a security theorem, perform induction over membership in the inductively defined set. Isabelle’s rule inversion splits the proof into the base and extension cases. Most cases are discharged by contradictions between the theorem premise and the rule precondition; the meaningful case uses the event structure to expose the authenticated winner broadcast. This technique is reusable for protocol safety properties stated over every possible trace.

Verus form (Inference): represent an event list and protocol state as Rust data, define a `spec fn` for the inductive transition relation, and prove trace invariants by induction over a ghost sequence. Encode attacker knowledge as a set/map with explicit constructors for allowed synthesis. Verus does not provide Isabelle’s inductive-set package, so the transition closure and induction lemmas must be modeled directly. The cryptographic algebra remains an assumption unless a verified primitive and model are supplied.

## technique 2: proving absence of sweetheart deals

State the property as a trace theorem: if a trace ends with a winner announcement, then the winner’s key must have appeared in the final broadcast; require `0 < friends`. Prove `no_sweetheart_deal` by induction on `evs ∈ cocaine_auction`. The empty trace is immediate; protocol-extension cases that cannot end in a winner are eliminated; the finish case unfolds the final broadcast and identifies the winner. This is a safety result about the specification’s traces, not a proof that a real auction implementation follows it.

## technique 3: insider collusion with the homo oeconomicus assumption

Use the Insider framework when a participant may behave strategically while honest participants remain constrained by the protocol. Define an insider predicate from an actor’s state and a set of targets, then assume `homo oeconomicus`: a rational insider chooses actions that improve its economic objective. Apply the framework to the current auction round and prove that a colluding bidder can force the reserve price. The paper reports, “The collusion exhibits that the assumption homo oeconomicus suffices to prove that rational insiders may use collusion to force the reserve price.” (conclusion, section 5, page 62). The result also exposes the model’s limit: the inductive approach alone abstracts the agent datatype so that good agents cannot behave badly; integrating the Insider framework is required to reason about collusion.

Verus form (Inference): make actor strategy and insider assumptions explicit `spec fn`s over traces, and state economic objectives as ghost predicates. Prove attack existence as a witness trace under `requires` assumptions; prove prevention as an invariant only for honest strategy constraints. Do not encode an insider assumption as executable behavior or treat it as a universal security guarantee. The paper’s strategic reasoning is outside ordinary Rust safety proofs.

## technique 4: constructive refinement and verified code generation

The inductive predicate uses abstract `pubK` and an existential bidder choice, so Isabelle cannot generate executable code. Refine it in stages. First define `CA_i`, a recursive checker that validates each round. Then define `CA_i'''` with an explicit list `kl` of all bidders’ public keys. Replace the existential search with `winner_i`, which returns `Some K` only when the trace prefix has the expected server message; require `List.member kl K`. Define `CA_n'''` from the constructive round checker and the final-broadcast checker. Prove that `CA_i'''` conforms to `CA_i`, then that accepted traces belong to `cocaine_auction`. Finally invoke Isabelle’s export command to generate Scala.

The paper gives the practical sequence: “We provide an Isabelle definition of a constructive test predicate for correct cocaine auction traces.” Then, “We generate executable code for this test predicate in the programming language Scala using Isabelle’s code generation mechanism.” Finally, “We prove correctness of the test predicate: we additionally provide proofs that a trace of events that is accepted by the test function is also in the set of all cocaine auction traces defined in its specification.” (section 6.1, pages 63–64). The `kl` list is an explicit assumption needed for constructivity; it avoids an infinite existential over natural-number keys but shifts responsibility to key-list completeness.

Verus form (Inference): write an executable Rust checker over a finite key slice and a separate `spec fn` describing valid traces. Prove `checker(trace, keys) == true` implies the specification predicate, with a lemma requiring every legitimate bidder key occurs in `keys`. Keep cryptographic operations behind verified contracts; generated Rust is not correct merely because a checker accepts its own traces.

## evidence, trust, and VL relevance

The formal evidence is Isabelle theorem proofs over the inductive trace set, including no sweetheart deal and insider-collusion theorems, plus conformance proofs for the constructive checker. The paper does not give a runtime benchmark or a denominator-based empirical security rate. Trusted assumptions include the protocol model, cryptographic Dolev–Yao abstraction, key-list completeness, actor rationality, Isabelle/HOL and code generation, and the high-level mapping from auction requirements to rules. Inference: a VL product using agent-written verified Rust faces threat from omitted attacker actions and from an executable checker whose assumptions are not linked to deployment configuration. The paper’s reusable lesson is to make every abstraction-refinement assumption explicit and prove the checker is a subset of the specification; generic Rust code generation from Isabelle should not be repeated as a novelty claim.

## techniques for the catalog

- inductive trace closure: specify all protocol executions as the least event-set closed by normal and attacker rules
- inversion security proof: prove trace properties by induction, splitting on each constructor and eliminating impossible cases
- insider framework: model colluding rational actors with explicit state predicates and economic assumptions
- constructive predicate refinement: replace abstract keys and infinite existential choices with a finite key list and a computable winner function
- proof-carrying code extraction: prove the executable checker refines the inductive specification before exporting Scala code
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
