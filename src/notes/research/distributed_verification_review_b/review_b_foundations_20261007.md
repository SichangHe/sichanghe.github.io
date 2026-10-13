# Formulating guarantees and connecting models to code
(authored by agents unless marked 🧑)

human specification practice

- [High-Level Specifications: Lessons from Industry](https://lamport.azurewebsites.net/pubs/high-level.pdf)
  - Brannon Batson and Leslie Lamport, FMCO 2002 proceedings, published 2003
  - engineers write assertions and inspect counterexamples to understand their own protocol
  - authors, §4.2, printed p.15: “developing meaningful global invariants and having TLC check them”
  - inference: preserve examples of wanted and unwanted behavior before searching for proof helpers
- [Specifying Systems](https://lamport.azurewebsites.net/tla/book.html)
  - Leslie Lamport, Addison-Wesley, 2002
  - title-page subtitle: “The TLA+ Language and Tools for Hardware and Software Engineers”
  - chapters 2–5 develop initial states and allowed next steps
  - chapters 8 and 14 cover progress conditions and model checking
  - inference: translation does not decide which failures or observations the human cares about

separating forbidden events from required progress

- [Defining Liveness](https://www.cs.cornell.edu/fbs/publications/DefLiveness.pdf)
  - Bowen Alpern and Fred B. Schneider, Information Processing Letters, 1985
  - authors, abstract, p.181: “Every property is shown to be the intersection of a safety property and a liveness property.”
  - safety: a forbidden event never occurs
    - a finite bad execution prefix proves a violation
  - liveness: a required event eventually occurs
    - no finite prefix alone proves its violation
  - the theorem concerns infinite execution sequences
  - inference: name the actual property instead of classifying it from a familiar protocol label
- [Impossibility of Distributed Consensus with One Faulty Process](https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf)
  - Michael J. Fischer, Nancy A. Lynch and Michael S. Paterson, JACM, 1985
  - authors, abstract, p.374: “the possibility of nontermination, even with only one faulty process”
  - deterministic processes, complete asynchrony, reliable delivery, one possible crash
  - inference: an agent must reject unconditional terminating consensus under these assumptions
    - silently adding timing bounds changes the request
    - a conditional guarantee must name its added assumptions

connecting different descriptions of the same behavior

- refinement: every implementation behavior is allowed by the specification
- [The Temporal Logic of Actions](https://lamport.azurewebsites.net/pubs/lamport-actions.pdf)
  - Leslie Lamport, TOPLAS, 1994
  - author, abstract: “both expressed by logical implication”
    - proving a system satisfies its specification
    - proving one system implements another
  - internal steps may leave the abstract observation unchanged
  - inference: safety correspondence needs an additional argument against endless internal activity for a progress guarantee
  - downloaded manuscript has a 1993 draft header
- [The Existence of Refinement Mappings](https://lamport.azurewebsites.net/pubs/abadi-existence.pdf)
  - Martín Abadi and Leslie Lamport, Theoretical Computer Science, 1991
  - author report dated 1988
  - authors, §1.2, report p.5: “S1 is machine closed”
    - the progress condition does not secretly exclude an otherwise allowed finite prefix
  - same passage: “S2 has finite invisible nondeterminism”
    - hidden internal choices satisfy the stated finiteness condition
  - same passage: “S2 is internally continuous”
    - a disallowed behavior is recognizable from its observable execution and finitely much internal behavior
  - these are hypotheses of the completeness theorem
  - inference: existence under hypotheses does not supply an efficient mapping-discovery algorithm
- [Auxiliary Variables in TLA+](https://arxiv.org/abs/1703.05121)
  - Leslie Lamport and Stephan Merz, arXiv v2, 2017
  - authors, abstract, PDF p.2: “without changing its semantics—that is, the set of behaviors that it describes”
  - proof-only variables record past events, predict choices, or reconcile different numbers of steps
  - examples include MinMax, integer sending and a simplified Afek snapshot algorithm
  - [specification sources](https://lamport.azurewebsites.net/tla/auxiliary/auxiliary.html)
  - inference: invented proof state must preserve actual behavior
- [Refinement in State-Based Formalisms](https://lamport.azurewebsites.net/pubs/refinement.pdf)
  - Leslie Lamport, SRC Technical Note 1996-001, 1996
  - §1 title: “A Tale of Two Clocks”
  - an hour clock and minute clock illustrate hiding internal steps
  - inference: a small task with an independently intelligible observation mapping

wishes comparing several executions

- [Hyperproperties](https://www.cs.cornell.edu/fbs/publications/Hyperproperties.pdf)
  - Michael R. Clarkson and Fred B. Schneider, Journal of Computer Security, 2010
  - authors, §1, p.1157: “Important security policies cannot be expressed as properties of individual execution traces of a system”
  - some confidentiality guarantees compare executions with different secrets
  - a hyperproperty describes sets of executions
  - inference: identify this need before forcing a privacy request into a single-execution invariant

proposed task contract

- agent recommendation
- preserve the client's observations and small allowed and forbidden histories
- record faults, scheduling, delivery, clocks, persistence and recovery assumptions
- separate safety, progress and real-time bounds
  - eventually supplies no latency bound
- report model proofs and executable-code proofs independently
- permit proof helpers while preserving the required behavior and allowed environment
- challenge assumptions, properties and code with independent examples and faults
  - verifier acceptance alone does not establish faithful intent

coverage

- nine foundation sources discussed
- three missing PDFs saved in the paper collection
  - Hyperproperties
  - Auxiliary Variables in TLA+
  - High-Level Specifications
- short papers read in full
- longer refinement papers and book read in relevant sections
- no independent reproduction of proofs
