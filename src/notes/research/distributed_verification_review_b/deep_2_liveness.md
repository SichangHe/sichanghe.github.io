# Liveness proofs: statements, assumptions, proof methods, costs, and cases
(authored by agents unless marked 🧑)

For this project's next step, I would start with Anvil/Welder for Verus properties and environment contracts, IronFleet/LiDO for implementation-connected progress proofs, LVR/implicit rankings for automation, and VeruSAGE for agent evaluation. Lion is a promising fresh lead whose full text remains unavailable. These are my recommendations, based on the evidence below.

## What matters for turning a vague request into a proof

My inference from the sources: the largest missing step is often deciding what the environment must eventually do. A proof can correctly establish a useless theorem if its assumptions exclude the failures the user wanted to handle. An agent should produce an inspectable contract before attempting the proof:

1. Identify the good event and its scope: one request gets a reply, every request gets a reply, a consensus instance decides, a lock waiter enters, or the system reaches a desired state and stays there
2. State what must remain stable: the request remains pending, the desired configuration stops changing, a sufficient set of machines remains operational, or a leader gets a sufficiently long turn
3. List progress assumptions separately: scheduling, message delivery, time bounds, fault recovery, resource limits, and interference from other participants
4. Find the intermediate milestones and the measure that cannot keep decreasing forever
5. Connect the model proof to the implementation, and list trusted components

These are different obligations. Eventual delivery does not bound delivery time. A fair scheduler does not stop a controller from repeatedly losing a version conflict. Consensus safety does not imply requests eventually finish. The concrete evidence for these distinctions is in IronFleet, Anvil, Welder, and the consensus entries below.

### A small vocabulary for stating the property

This paragraph explains notation rather than reporting an empirical result. A behavior is an infinite sequence of states. `□P` means P holds at every position; `◇P` means P holds at some current or future position. `P ~> Q` means `□(P ⇒ ◇Q)`: whenever P holds, Q eventually holds. `□◇P` means P occurs infinitely often; `◇□P` means P eventually remains true forever. A terminating execution can be represented by repeating its final state.

A human's “eventually works” can mean any of the following. None should be selected silently:

| Intended promise | Formal shape |
| --- | --- |
| This run eventually finishes | `◇Done` |
| Every pending request eventually gets a reply | `∀r. Pending(r) ~> Replied(r)` |
| Useful work keeps happening | `□◇Commit` |
| The state eventually stops drifting | `◇□Match` |
| If the desired state stays fixed, the system reaches it permanently | `∀d. □Desire(d) ~> □Match(d)` |
| A response arrives before a deadline | A timed response property; requires explicit clocks and timing assumptions |

Weak fairness means, from any point onward, an action that stays enabled must eventually execute. Strong fairness also covers an action that becomes enabled infinitely often but is repeatedly disabled. Fairness is usually attached to each relevant action or participant. Fairness of “some next step occurs” alone permits one participant to starve.

**P01. Defining Liveness.** Bowen Alpern and Fred B. Schneider. *Information Processing Letters* 21, 1985, pp. 181–185. [Paper](https://www.cs.cornell.edu/fbs/publications/DefLiveness.pdf). Defines liveness using the ability to extend every finite execution prefix to a satisfying infinite execution. This explains why ordinary finite tests cannot establish eventual success. Evidence, abstract, p. 181: “Every property is shown to be the intersection of a safety property and a liveness property.” Relevance: separate a user's combined requirement into “nothing bad happens” and “something eventually happens,” while preserving both.

### P02. The Temporal Logic of Actions

Leslie Lamport. *ACM TOPLAS* 16(3), 1994, pp. 872–923. [Author PDF](https://lamport.azurewebsites.net/pubs/lamport-actions.pdf). The author-hosted manuscript has its own page numbers; references here use those. Provides state/action reasoning, fairness rules, temporal implication, and a well-founded progress rule.

Evidence, §5.3 / manuscript p. 18: “Rule WF1 is used to deduce a leads-to property” and “from a weak fairness condition”. Figure 5 and §5.3 contain the exact premises; §5.2 explains weak and strong fairness. These excerpts are parts of the same explanatory sentence.

WF1 in plain terms, under the transition relation N and fairness of a non-stuttering A action:

- While P holds, any allowed step preserves P or reaches Q
- An A step from P reaches Q
- P implies that a non-stuttering A step is enabled

Therefore P leads to Q. The hard work often sits in invariants needed to prove these three premises. Chaining `P ~> Q` and `Q ~> R` gives `P ~> R`. The LATTICE rule in Figure 5 extends a finite chain: from each stage, eventually finish or reach a strictly smaller stage in a well-founded order. “Well-founded” means there is no infinite descending chain. Natural numbers, lexicographic tuples, and strict subsets of a finite set are common choices; the proof must establish the relevant order's properties.

Relevance: a useful agent should select and justify a progress rule, then solve its local premises. Guessing an invariant alone does not supply the liveness argument. §7 also illustrates transferring fairness through refinement: preserving state transitions is only part of preserving a temporal specification.

### P03. Specifying Systems

Leslie Lamport. Addison-Wesley, 2002. [Open book](https://lamport.azurewebsites.net/tla/book-21-07-04.pdf). This is the practical reference for expressing TLA+ behaviors, fairness, and temporal properties; see chapters 8 and 14. Evidence, title-page subtitle: “The TLA+ Language and Tools for Hardware and Software Engineers.” Relevance: supplies a language and model-checking workflow for making a user's assumptions explicit before implementation verification. No isolated human-effort figure extracted.

### P04. Coalescing: Syntactic Abstraction for Reasoning in First-Order Modal Logics

Damien Doligez, Jael Kriener, Leslie Lamport, Tomer Libal, Stephan Merz. ARNL workshop, 2014. [Author PDF](https://lamport.azurewebsites.net/pubs/coalescing.pdf). Routes mathematical obligations to ordinary first-order provers and temporal combinations to a propositional temporal prover, hiding expressions each backend cannot interpret correctly.

Evidence, §7, PDF pp. 12–13: “combining action-level reasoning and temporal logic proof rules”; difficult remaining steps can involve “well-founded orderings”. These are the authors' explanation of liveness, not a claim that coalescing fully automates it. The paper's historical implementation limitations must be dated; they do not establish current TLAPS limitations.

### T01. Current TLAPS support: distinguish temporal reasoning from automation

TLA+ Proof System developers, ongoing repository; [README](https://github.com/tlaplus/tlapm/blob/d8b9747a1dce9b4816bcc1ff130ccf7a3af2ce37/README.md), [library](https://github.com/tlaplus/tlapm/blob/d8b9747a1dce9b4816bcc1ff130ccf7a3af2ce37/library/TLAPS.tla), [SimpleEventually example](https://github.com/tlaplus/tlapm/blob/d8b9747a1dce9b4816bcc1ff130ccf7a3af2ce37/examples/SimpleEventually.tla). Checked the local repository as well as its official URLs; did not run TLAPS.

Current evidence: README names the “LS4 decision procedure for propositional temporal logic”. The library says the old named temporal rules are “superseded by the PTL decision procedure”. The latter comment occurs **after** the module terminator, in an obsolete section. Do not copy those old RuleWF1/RuleSF1 declarations as active trusted library lemmas.

`SimpleEventually.tla` proves `System ⇒ ◇(x = TRUE)` from a next-state specification and weak fairness, using `ExpandENABLED`, ordinary state/action obligations, and `PTL`. This is concrete source evidence that saying “TLAPS cannot prove liveness” is too broad. Propositional temporal automation is narrower than arbitrary quantified temporal induction. The draft `simple_liveness/SimpleSpec.tla` contains omitted proofs and an explicit comment rejecting a proposed quantified leads-to theorem; it should not be advertised as a fully checked example.

Relevance: use PTL for temporal bookkeeping, mathematical backends for local steps, and explicit induction for the remaining arguments. Gap: no independently reproduced modern large TLAPS liveness proof or complete current support matrix in this search.

### P05. IronFleet: Proving Practical Distributed Systems Correct

Chris Hawblitzel, Jon Howell, Manos Kapritsos, Jacob R. Lorch, Bryan Parno, Michael L. Roberts, Srinath Setty, Brian Zill. SOSP, 2015. [Paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2015/10/ironfleet.pdf), [artifact](https://github.com/microsoft/Ironclad/tree/main/ironfleet). A Dafny implementation proof connects a distributed protocol to a small abstract state machine. Its temporal library embeds TLA over infinite maps from step numbers to states.

Evidence budget for this paper: §4.1 reports WF1 in “only 16 lines”; §7.1 reports “approximately 3.7 person-years”; Figure 12's liveness proof cells are “7869” and “2093”. These figures describe respectively the library rule, total methodology plus two systems, and protocol-level liveness proof lines for IronRSL and IronKV. They are different costs.

Source reading, §§4–5:

- Humans build a chain of milestones and apply a variant of WF1 at each link
- Protocol actions are made always enabled by doing nothing when their productive branch does not apply. A round-robin scheduler proof establishes that each action runs repeatedly
- Bounded-time and delayed bounded-time WF1 variants handle timers, batching, and rate limiting
- To combine milestones, prove each eventually holds forever, then combine the finite collection. Merely proving each holds sometime would not establish simultaneity
- Opaque definitions, controlled unfolding, and quantifier triggers keep the SMT solver's search manageable

IronRSL proves a retrying client eventually receives a response under detailed eventual assumptions: a surviving quorum, minimum scheduler frequency, maximum network delay, bounded input bursts, bounded clock error, enough memory, and no progress stop at overflow-prevention limits (§5.1.4). IronKV's reliable transmission proves eventual packet receipt if repeatedly sent packets are eventually delivered (§5.2). IronKV's liveness row should not be generalized into unconditional availability of every store operation under arbitrary lease failures.

Figure 12 additionally gives 2,941 IronRSL and 1,340 IronKV executable lines, 1,824 TLA-library proof lines, and 208 temporal-logic specification lines. These are transcriptions of the labeled cells, not measurements made here. Theorem boundary (§§2.3, 3.7): humans inspect the centralized specification, the top-level assertion connecting host loops to the abstract behavior, and the main event loop. Dafny, compiler/runtime, OS, hardware, and network/environment assumptions remain trusted. Relevance: an excellent example of implementation-connected proofs within that boundary, and of design changes made specifically to simplify progress reasoning.

### P06. Anvil: Verifying Liveness of Cluster Management Controllers

Xudong Sun, Wenjie Ma, Jiawei Tyler Gu, Zicheng Ma, Tej Chajed, Jon Howell, Andrea Lattuada, Oded Padon, Lalith Suresh, Adriana Szekeres, Tianyin Xu. OSDI, 2024, pp. 649–666. [Paper](https://www.usenix.org/system/files/osdi24-sun-xudong.pdf), [presentation](https://www.usenix.org/conference/osdi24/presentation/sun-xudong), [artifact branch](https://github.com/anvil-verifier/anvil/tree/osdi24), [temporal library](https://github.com/anvil-verifier/verus-tla).

Proves Eventually Stable Reconciliation (ESR): if a desired state remains fixed, the controller eventually makes the managed state match it and keeps it matching. The model includes the network, API server/data store, other controllers, clients, and faults. Rust code is verified using Verus; temporal logic is encoded as predicates over executions rather than assumed native SMT temporal support.

Evidence: §4.4.1, p. 656, “70+ such temporal reasoning lemmas”; §6, p. 659, “around two person-months”; §7.1, p. 660, “2.5 person-months”; Table 1 ESR proof cells “7245”, “5211”, “7079”. The two-month figure is the first ZooKeeper ESR proof, during which the proof strategy was developed; the 2.5-month figure is implementing and verifying each controller. The three cells are ZooKeeper, RabbitMQ, and FluentBit ESR proof lines.

Source reading, §§4.3–5:

1. Specify weak fairness for controller/environment actions
2. Assume disruptive faults eventually stop; explicit disable-fault actions model this
3. State interference assumptions. In the original model, built-in StatefulSet/DaemonSet updates eventually pause until the target controller succeeds
4. Prove the environment eventually becomes stable, including draining requests for older desired states
5. Prove progress from any state reached before stabilization, then show the matched state remains matched

The last two steps prevent a common error: proving only that a freshly initialized controller works in an already healthy environment. Reused environment lemmas handle races with the garbage collector. Table 1 implementation sizes are 1,134, 1,598, and 1,208 lines respectively. §6 reports “around two person-weeks” for ESR of the subsequent controllers; the text does not justify assigning that as the entire implementation-plus-proof cost of either controller. §7.1 says about 40% of the ESR proof is invariants.

Concrete failures exposed by proof attempts (§6): a crash during ZooKeeper scaling, attempts to update immutable fields, RabbitMQ services with colliding names, and a safety violation from a stale orphan StatefulSet. Relevance: the nearest precedent for this project's Verus distributed-liveness goal, with a reusable property shape, proof library, environment, and measured effort. Its fairness and interference conditions are part of the theorem, not implementation guarantees established for all of Kubernetes.

### P07. Welder: Compositional Liveness Verification of Cluster Control Planes

Zhizhen Cathy Cai, Nikhil Date, Jiawei Tyler Gu, Cody Rivera, Tej Chajed, Oded Padon, Tianyin Xu, Xudong Sun. SOSP, September–October 2026. [Author PDF](https://cathy-cai.page/pubs/welder26.pdf), [DOI](https://doi.org/10.1145/3830418.3843868), [artifact branch](https://github.com/anvil-verifier/anvil/tree/sosp26). Extends Anvil to prove interacting controllers in compatible groups, with explicit rely conditions, guarantee conditions, progress dependencies, and composition rules.

Evidence: §4.2, PDF p. 7, “Our fairness assumption states that the RoC loop terminates”; §7.1, PDF p. 10, “1.5 person-years”; Table 1, PDF p. 11, “37487 (36215)”. The last cell is total CORE proof lines with ESR lines in parentheses, excluding separate model/conformance columns. These excerpts total fewer than 25 words.

Source reading, §§4–7: normal weak/strong fairness of individual API actions does not ensure a controller wins a read/update version race. Welder introduces a Retry-on-Conflict loop and assumes that loop terminates. The abstraction hides retries from clients while preserving the atomic update behavior. This is a domain-specific progress condition stronger than action fairness alone, and should be reviewed as an assumption rather than presented as a consequence of ordinary scheduler fairness.

The Iter-ESR rule breaks an apparent circularity: a Deployment incrementally changes ReplicaSet desired state while depending on ReplicaSet progress. Strong induction on the remaining replica difference proves stability and progress together. Controllers also prove state-preservation conditions under others' allowed interference. §7.1 reports about a year building Welder and verifying ReplicaSet/Deployment, and 40 days for RabbitMQ. Table 1 gives CORE (ESR) proof lines: ReplicaSet 7,726 (7,305); Deployment 10,327 (10,201); StatefulSet 12,085 (11,937); RabbitMQ 6,920 (6,772); composition 429 (0).

Relevance: a directly applicable 2026 result. It shows why “verify each component eventually succeeds” is inadequate when components change each other's desired states or contend on shared objects.

## Consensus: where the assumptions enter the proof

These are original protocol papers and mathematical proof arguments unless a separate mechanization is identified. Their implementations do not by themselves make the published arguments machine-checked implementation proofs. The compact records below are also the starting points for studying partial synchrony and leader progress.

### P08. Impossibility of Distributed Consensus with One Faulty Process

Michael J. Fischer, Nancy A. Lynch, Michael S. Paterson. JACM 32(2), 1985, pp. 374–382. [Open PDF](https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf). Establishes a nonterminating admissible execution for deterministic consensus in an asynchronous model with one possible crash. Evidence, abstract, p. 374: “the possibility of nontermination, even with only one faulty process”. Scope: their formal model and deterministic agreement requirements, not a claim that every deployed consensus system always fails. Relevance: an agent must reject unconditional deterministic consensus termination in this model or seek explicit stronger assumptions.

### P09. Consensus in the Presence of Partial Synchrony

Cynthia Dwork, Nancy Lynch, Larry Stockmeyer. JACM 35(2), 1988, pp. 288–323. [Open PDF](https://groups.csail.mit.edu/tds/papers/Lynch/jacm88.pdf). Defines versions of partial synchrony: unknown finite timing bounds, or known bounds that become valid at an unknown stabilization time. Evidence, abstract, p. 288: “the bounds are known, but are only guaranteed to hold starting at some unknown time T”. A modern GST contract should identify which version it uses, bounds on both messaging and processing where needed, and the fault threshold.

My inference: “the network eventually recovers” should be replaced with the exact eventual bounds needed by the proof. A deterministic response deadline measured from the request's initial arrival cannot follow from an unbounded unknown GST alone.

### P10. Paxos Made Simple

Leslie Lamport. *ACM SIGACT News* 32(4), 2001. [Paper](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf). Separates agreement safety from progress; §2.4 gives an execution in which alternating higher-numbered proposals prevent a value from being chosen. Evidence, p. 1: “We won’t try to specify precise liveness requirements.” Evidence, §2.4, p. 7: “a distinguished proposer must be selected”. The paper does not claim a complete mechanized termination specification. A sole successful proposer communicating with a majority can finish; selecting it needs assumptions beyond arbitrary asynchrony. Relevance: a clear adversarial execution for evaluating whether an agent has merely proved agreement.

### P11. In Search of an Understandable Consensus Algorithm

Diego Ongaro and John Ousterhout. USENIX ATC, 2014; linked extended paper. [PDF](https://raft.github.io/raft.pdf), [project and implementations](https://raft.github.io/). Raft's randomized leader election uses timing to obtain a stable leader. Evidence, §5.6, PDF p. 10: “broadcastTime ≪ electionTimeout ≪ MTBF”. The surrounding text defines broadcast time and mean time between failures as averages and explains why split votes become unlikely. Treat this as engineering timing guidance, not an exact deterministic GST theorem or machine-checked implementation liveness claim.

### P12. Practical Byzantine Fault Tolerance

Miguel Castro and Barbara Liskov. OSDI, 1999, pp. 173–186. [Official full-text entry](https://usenix.org/publications/library/proceedings/osdi99/full_papers/castro/castro_html/castro.html), [§3 service properties](https://usenix.org/publications/library/proceedings/osdi99/full_papers/castro/castro_html/node3.html), [§4.5.2 liveness](https://usenix.org/publications/library/proceedings/osdi99/full_papers/castro/castro_html/node4.html). Read the official HTML because tried PDF locations failed.

Evidence, §3: “clients eventually receive replies to their requests”; §4.5.2: “unless message delays grow faster than the timeout period indefinitely”. The source's precise condition permits retransmissions and requires at most `(n−1)/3` faulty replicas; §3 phrases the delay condition relative to `2^t`. Its liveness proof increases view timeouts, aligns enough correct replicas in one view, and rotates through primaries until a correct one gets sufficient time. Relevance: do not silently replace this particular eventual-growth condition with a different modern GST contract.

### P13. HotStuff: BFT Consensus in the Lens of Blockchain

Maofan Yin, Dahlia Malkhi, Michael K. Reiter, Guy Golan Gueta, Ittai Abraham. PODC, 2019; arXiv version 6. [Paper](https://arxiv.org/abs/1803.05069), [implementation](https://github.com/hot-stuff/libhotstuff). A leader-based Byzantine replication protocol under partial synchrony, with progress coordination separated into a Pacemaker.

Evidence, Theorem 4, PDF p. 9: “if all correct replicas remain in view v” and “the leader for view v is correct”. These are fragments from the theorem and definition. The full theorem also requires remaining in that view for a bounded period `Tf` after GST. The proof establishes a sufficiently informed proposal, votes in successive phases, then a decision. §5 describes the Pacemaker’s role. It must eventually obtain synchronized leadership with enough time; communication fairness alone is insufficient. Relevance: model the progress coordinator and its guarantees rather than prove only the voting core.

### P14. The latest gossip on BFT consensus

Ethan Buchman, Jae Kwon, Zarko Milosevic. arXiv, 2018; linked version 3 posted 2019. [Paper](https://arxiv.org/abs/1807.04938), [historical implementation](https://github.com/tendermint/tendermint). Tendermint consensus with gossip, locks, valid values, growing timeouts, and rotating proposers.

Evidence, system model §II, PDF p. 3: “all communication among correct processes after GST is reliable and ∆-timely”; Lemma 7, PDF p. 11: “Algorithm 1 satisfies Termination.” The proof additionally uses gossip dissemination of already observed messages. It first establishes a favorable round in which everyone decides, then argues such a round eventually occurs. This is a paper proof, not evidence that any current Tendermint or successor implementation has the same verified behavior. Relevance: extract all dissemination and proposer assumptions, including those outside the headline GST sentence.

### Recent agents, termination, and model-checker support

Evidence checked during this run. Six recent-agent papers below were inspected as PDF text; no duplicate PDFs downloaded. Tool documentation was fetched from official sites and raw GitHub files. These fragments distinguish proving a whole infinite execution makes progress, completing one lemma in an existing proof, and proving a function terminates.

### Recent LLM evidence on Anvil proof completion: VeruSAGE

**P15. VeruSAGE: A Study of Agent-Based Verification for Rust Systems.** Chenyuan Yang, Natalie Neamtu, Chris Hawblitzel, Jacob R. Lorch, Shan Lu. arXiv:2512.18436, first submitted December 2025; inspected v2, 15 April 2026. [Paper](https://arxiv.org/abs/2512.18436), [full text](https://arxiv.org/html/2512.18436v2), [source and benchmark](https://github.com/microsoft/verus-proof-synthesis). PDF already present in collection under the full title and authors.

This is evidence that agents can complete Anvil proof tasks, with partial relevance to its distributed liveness development. The reported project-level rates are not liveness-only rates. Section 3.1, PDF p.3, selects Anvil's `vreplicaset` controller and its `temporal_logic` and `vstd_ext` libraries. Table 5, PDF p.6, gives the following exact rows (column order: project, tasks, o4-mini, GPT-5, Sonnet 4, Sonnet 4.5):

> “AL 104 48% 79% 86% 100%”
>
> “AC 63 19% 32% 24% 37%”

AL denotes Anvil Library; AC denotes Anvil Controller. Each model uses its best agent setting. The different success rates matter: the Anvil library task group has a substantially higher success rate than the controller task group. Individual tasks are not classified here as liveness, safety, or helper lemmas. Table 3 p.3 reports average AC task files of 4,016 lines: 2,037 specification, 39 lemma signatures, 69 target proof, and 1,871 other lines. AL averages 84 total lines. These are task-file sizes, including retained dependencies; they are not the total controller's proof size or author-hours.

**Scope limit:** Section 3.1 p.3 preserves each target's existing preconditions and postconditions, strips proof annotations, and retains dependencies through their signatures with bodies marked `external_body`. This measures lemma/function proof completion under established specifications and trusted dependency contracts. It does not measure deriving the desired liveness property or fairness assumptions from a vague request, and it does not reprove every dependency for every task. Section 4 p.6 stops runs after success, 20 minutes, or 20 proof steps; the overall reported average of 7.2 minutes per task on p.2 is across projects, not specifically liveness tasks.

**Inference for evaluation:** Anvil AL and AC supply candidate proof-completion tasks for a liveness benchmark after auditing each target’s actual property. Add a separate end-to-end task that asks the agent to state the fairness assumptions, choose the temporal statement, and close all necessary lemmas. Without that extra stage, a high lemma-completion score can conceal weak understanding of the system's actual progress promise.

### Recent agent termination evidence, with narrow scope

**P16. Vero: Can AI Agents Build Formally Verified Software Repositories?** Zhe Ye, Hantao Lou, Yuechun Sun, Peiyang Song, Zhengxu Yan, Timothe Kasriel, Qingyang Zhang, Kaiyu Yang, Soonho Kong, Jingxuan He, Dawn Song. arXiv:2608.13522v1, 13 August 2026. [Paper](https://arxiv.org/abs/2608.13522), [repository](https://github.com/sunblaze-ucb/vero). Existing collection PDF read, especially appendix p.31.

Vero evaluates joint Lean implementation and proof work over multi-module repositories. Its sorted-container case gives a concrete obstacle involving a ranking measure: binary search uses `termination_by hi - lo`, but proving the result requires preserving the relation between the shrinking index window and the sorted enclosing list. Appendix p.31 says:

> “no configuration supplies it”

The quoted “it” is that window invariant, required by the 25 unattempted proof-only specifications described immediately before the sentence. In code-and-proof mode the agent instead uses structural list recursion and linear search. The same page reports O(n) lookup instead of O(log n), and O(n²) construction instead of O(n log n). The authors explain the scored contracts constrain input/output behavior, not time complexity.

**Inference:** A benchmark that rewards any terminating implementation can encourage an agent to simplify the algorithm until the proof becomes easy. For “TLA+ to verified Rust,” preserve implementation and cost requirements when they are part of the user's intent. This example concerns function termination and correctness, not fairness or distributed progress.

**P17. AlphaVerus: Bootstrapping Formally Verified Code Generation through Self-Improving Translation and Treefinement.** Pranjal Aggarwal, Bryan Parno, Sean Welleck. ICML 2025. [Paper and official proceedings](https://proceedings.mlr.press/v267/aggarwal25a.html), [repository](https://github.com/cmu-l3/alphaverus). Existing collection PDF read. Appendix Listing 3, PDF pp.23–24, translates recursive and iterative search from Dafny to Verus; the recursive source uses:

> “decreases j-i”

The translated recursive Rust function retains the shrinking search-range measure; the iterative version uses a decreasing cursor. This is a concrete example of agents handling termination annotations during verified translation. It does not establish automated discovery of distributed fairness assumptions.

**P18. AutoVerus: Automated Proof Generation for Rust Code.** Chenyuan Yang, Xuheng Li, Md Rakib Hossain Misu, Jianan Yao, Weidong Cui, Yeyun Gong, Chris Hawblitzel, Shuvendu Lahiri, Jacob R. Lorch, Shuai Lu, Fan Yang, Ziqiao Zhou, Shan Lu. PACMPL 9, OOPSLA2, 2025; arXiv:2409.13082v3, 22 August 2025. [Paper](https://arxiv.org/abs/2409.13082), [repository](https://github.com/microsoft/verus-proof-synthesis). Existing PDF inspected. Figure 10/recursive Fibonacci monotonicity example, PDF around article p.396:13 and conclusion example, uses:

> “decreases m - n”

The example demonstrates recursive proof termination as part of automated proof generation. The benchmark is small Rust verification tasks, not an end-to-end distributed liveness benchmark.

**P19. VeriStruct: AI-assisted Automated Verification of Data-Structure Modules in Verus.** Chuyue Sun, Yican Sun, Daneshvar Amrollahi, Ethan Zhang, Shuvendu Lahiri, Shan Lu, David Dill, Clark Barrett. arXiv:2510.25015v4, 3 March 2026. [Paper](https://arxiv.org/abs/2510.25015). Existing PDF inspected. Its repair-action table explicitly lists:

> “Prove measure drops, adjust decreases expressions, update loop variables”

This is an explicit agent action for failed decreases obligations. The study verifies data structure modules; no distributed fairness-liveness evaluation was found in the inspected text. Repository URL not verified during this slice.

**P20. VeriSkill: A Self-Evolution Framework for Program Verification Skills.** Changguo Jia, Tianqi Zhao, Zhiyou Xiao, Weiming Zhang, Minghui Zhou. arXiv:2607.27733v1, 30 July 2026. [Paper](https://arxiv.org/abs/2607.27733). Existing PDF inspected. Its diagnostic categorization includes:

> “invariant initialization, invariant preservation, memory safety, or termination”

This shows termination failures are part of the proposed verifier-guided skill improvement process. The inspected text did not establish a separate termination-only score or a distributed liveness benchmark. Repository URL not verified.

### Native termination support: Verus, Dafny, Lean

**Verus guide, “Lightweight termination checking.”** Verus developers, living documentation, checked during this run. [Guide](https://verus-lang.github.io/verus/guide/exec_termination.html), [source](https://github.com/verus-lang/verus/blob/main/source/docs/guide/src/exec_termination.md), [repository](https://github.com/verus-lang/verus).

Current behavior has a crucial qualification. The guide says recursive spec and proof functions must terminate; exec functions may fail to terminate. Exec decreases clauses check local progress while assuming callees terminate. Exact qualification:

> “it should be treated as a lint, not a complete guarantee of termination”

`#![verifier::exec_allows_no_decreases_clause]` disables the exec check for a function/module/crate. Therefore do not interpret a current Verus exec `decreases` clause alone as a whole-program total-correctness theorem.

The [recursive function tutorial](https://verus-lang.github.io/verus/guide/recursion.html) explains the shrinking measure and boundedness needed for spec recursion. The [decreases reference](https://verus-lang.github.io/verus/guide/reference-decreases.html), “Helping Verus prove termination,” explains when the human adds inline proof or a `via` lemma. Its `floor_log2(n)` example requires proving that `n >> 1 < n` when `n > 1`; bit-vector proof support supplies the missing fact. This is a useful concrete split between proposing a rank and proving it actually drops.

**Dafny Documentation, “Termination.”** Dafny developers, living documentation. [Tutorial](https://dafny.org/latest/OnlineTutorial/Termination), [repository](https://github.com/dafny-lang/dafny). The tutorial explains one mechanism for loops and recursion:

> “Dafny employs a single technique for handling either case, decreases annotations.”

Dafny guesses `B-A` for common `A < B` loops and often guesses decreasing recursive parameters. Measures can use integers, sequence length, strict set inclusion, and lexicographic tuples. The tutorial's Ackermann example uses `decreases m, n`; a decrease in the earlier tuple component permits later components to grow. `decreases *` opts eligible executable methods/loops out of termination checking; its Collatz example illustrates why such an escape is needed. These mechanisms prove termination of a computation, not eventual message delivery or scheduling fairness.

**Lean Language Reference, “Recursive Definitions,” §7.6.** Lean developers, current reference inspected during this run. [Reference](https://lean-lang.org/doc/reference/latest/Definitions/Recursive-Definitions/), [repository](https://github.com/leanprover/lean4). §7.6.3 provides `termination_by`, well-founded relations, and decreasing-proof tactics. Its explanation identifies the common array-index case:

> “there is a measure of termination that decreases at each recursive call, but the measure is not itself an argument”

The human can use structural recursion when the input literally gets smaller, or state a separate well-founded measure and discharge decrease obligations. The current reference also describes partial fixpoints and partial definitions. The presence of recursive Lean code is therefore not enough to conclude termination without inspecting the definition mode and theorem statement.

**Veil: A Framework for Automated and Interactive Verification of Transition Systems.** Verse Lab maintainers, current Veil 2.0 prerelease README. [Source](https://github.com/verse-lab/veil), [README snapshot](https://github.com/verse-lab/veil/blob/626901534a8c788e45b350328021cd4d7a942c32/README.md). It embeds transition-system verification in Lean and combines SMT automation with interactive proof. Its current README explicitly describes:

> “proving safety (and, in the future, liveness) properties”

Do not list current Veil as an established liveness-proof tool. README examples include ring leader election and FloodSet crash agreement, but their presence alone does not establish an eventual-election/termination proof. No liveness-specific effort statistic found.

### Model checking: what a successful run means

**Apalache, “Temporal properties and counterexamples.”** Philip Offtermatt, 2022 tutorial, current documentation checked during this run. [Tutorial](https://apalache-mc.org/docs/tutorials/temporal-properties.html), [source](https://github.com/apalache-mc/apalache/blob/main/docs/src/tutorials/temporal-properties.md), [repository](https://github.com/apalache-mc/apalache). A requested traffic light eventually turns green, represented by `[](requestedGreen => <>isGreen)`. Allowing permanent stuttering produces a loop in which the request remains true and the light never turns green. The run says:

> “Checker reports no error up to computation length 10”

That is bounded evidence. Its temporal encoding turns a violating infinite execution that repeats a state into a finite prefix plus loop, often called a lasso. A loop counterexample establishes an actual possible infinite execution; failing to find one at a chosen bound does not prove all larger bounds.

**Apalache, “Supported Features.”** Apalache maintainers, living document. [Support table](https://apalache-mc.org/docs/apalache/features.html), [source](https://github.com/apalache-mc/apalache/blob/main/docs/src/apalache/features.md). Current temporal-operator table supports `[]`, `<>`, and leads-to, but lists `WF_e(A)`, `SF_e(A)`, and `ENABLED A` as unsupported with this exact instruction:

> “Has to be specified manually”

This is a concrete burden: users must spell out the enabling predicate/fairness condition instead of relying on automatic general action-enabledness translation. The earlier PDR-017 design document by Igor Konnov and Philip Offtermatt, revised 1 April 2022, §“lasso executions,” also says the lasso property is specific to finite-state systems. Infinite-state violations can progress forever without repeating an exact state. [Design document](https://github.com/apalache-mc/apalache/blob/main/docs/src/adr/017pdr-temporal.md).

**Spin manual, `ltl` and Pan options.** Gerard J. Holzmann/Spin maintainers; `ltl` page updated 6 September 2017, current page checked 2026. [LTL syntax](https://spinroot.com/spin/Man/ltl.html), [Pan options](https://spinroot.com/spin/Man/Pan.html), [repository](https://github.com/nimble-code/Spin). Inline LTL supports always, eventually, until and combinations; model checking negates a positive requirement and searches for a violating accepting cycle. Pan documents:

> “-f add weak fairness (to -a or -l)”

`-a` searches accepting cycles; `-l` searches non-progress cycles. This makes fairness an explicit verification-run choice. Exhaustive checking establishes a result for the finite Promela model; bounded-depth or bitstate search modes have different coverage, so record the selected mode and any exhausted resource bound. An implementation-level guarantee still needs a justification that the model describes the implementation.

**nuXmv, official Features page.** Fondazione Bruno Kessler maintainers, current page checked 2026. [Features](https://nuxmv.fbk.eu/features.html), [manual](https://nuxmv.fbk.eu/downloads/nuxmv-user-manual.pdf). The page explicitly lists:

> “K-liveness”

under algorithms for both finite-state and infinite-state systems, alongside IC3, bounded model checking and abstraction/refinement methods. The home page identifies finite-state SAT-based and infinite-state SMT-based checking. This is evidence of liveness-capable checking, but one should record the exact algorithm and whether it returns a proof, counterexample, unknown, or only bounded success. No case-specific proof-size or human-effort statistic was collected in this slice.

**TLC implementation and Toolbox documentation.** TLA+ maintainers, current sources checked 2026. [Liveness implementation](https://github.com/tlaplus/tlaplus/blob/master/tlatools/org.lamport.tlatools/src/tlc2/tool/liveness/LiveCheck.java), [Toolbox](https://tla.msr-inria.inria.fr/tlatoolbox/doc/model/executing-tlc.html), [repository](https://github.com/tlaplus/tlaplus). The source implements liveness graph construction and workers, returning `TLC_TEMPORAL_PROPERTY_VIOLATED` on a violation. Its worker failure comment includes:

> “such as going out of memory”

A run that fails this way is not a liveness proof. The Toolbox documents the concrete model's constants and generated `MC.tla`/`MC.cfg`; preserve those settings with results. This slice did not inspect TLC's formal correctness proof or its full fairness-fragment support; the TLA+ sources above supply the mathematical account.

### Additional concrete cases

Paper entries above identify the authors; the linked artifacts contain the proof sources. “Lemma completion” means the specification was already supplied.

| Case | Guarantee and tool | Evidence, size, effort, source |
|---|---|---|
| Anvil temporal lemma completion | existing temporal-logic theorem proved in Verus by an agent; under supplied contracts and assumed dependency signatures; property mix not audited | VeruSAGE AL: 104 tasks, Sonnet 4.5 100%; Table 5 p.6; AL task-file average 84 lines, Table 3 p.3; [paper](https://arxiv.org/abs/2512.18436), [artifact](https://github.com/microsoft/verus-proof-synthesis) |
| Anvil `vreplicaset` lemma completion | parts of existing controller safety/liveness proof, Verus; under supplied contracts and assumed dependency signatures; property mix not audited | VeruSAGE AC: 63 tasks, Sonnet 4.5 37%; task-file average 4,016 lines; not end-to-end property discovery; same paper/artifact |
| Sorted container binary search | recursive computation terminates and returns correct index, Lean | Vero p.31: rank `hi-lo`; agents replace binary search with linear search in joint code/proof mode; [paper](https://arxiv.org/abs/2608.13522), [artifact](https://github.com/sunblaze-ucb/vero) |
| Recursive/iterative search translation | shrinking-range/cursor computation, Dafny to Verus | AlphaVerus Listing 3 pp.23–24; no case-specific hours; [paper](https://proceedings.mlr.press/v267/aggarwal25a.html), [source](https://github.com/cmu-l3/alphaverus) |
| Ackermann | recursive function terminates, Dafny | lexicographic `m,n`; official tutorial, no effort statistic; [tutorial](https://dafny.org/latest/OnlineTutorial/Termination), [source](https://github.com/dafny-lang/dafny) |
| Integer base-2 logarithm | recursive spec function terminates, Verus | prove `n >> 1 < n` using bit-vector reasoning; [reference](https://verus-lang.github.io/verus/guide/reference-decreases.html), [source](https://github.com/verus-lang/verus) |
| Requested traffic light | request eventually followed by green, Apalache | bounded temporal check; permanent stuttering gives lasso violation; [tutorial](https://apalache-mc.org/docs/tutorials/temporal-properties.html), [example source](https://github.com/apalache-mc/apalache/blob/main/docs/src/tutorials/TrafficLight.tla) |

### Search gaps for recent automation

Searched for `liveness large language model`, `termination large language model`, `LLM ranking function termination proof 2025`, `liveness proof large language models 2026`, `ranking functions synthesis language models`, and Veil/Lean liveness through Crossref, DBLP, arXiv, Semantic Scholar, OpenAlex, GitHub, Google, Bing, and DuckDuckGo using HTTP. Most discovery endpoints returned HTTP 429/403, connection resets, a bot challenge, or unusable redirection pages; Bing's results were unrelated to the multiword query and were discarded. Crossref partially worked but yielded no dedicated LLM distributed-liveness system beyond the papers recovered from the existing collection. This is a search limitation, not evidence that such papers do not exist. No dedicated 2024–2026 LLM ranking-synthesis/termination benchmark was confidently identified here. The substantive recent agent result with liveness relevance is VeruSAGE’s Anvil subset; its project rates are not liveness-only scores. No fresh PDF was saved because all important agent papers read were already present.

## Ivy: dynamic abstraction and temporal prophecy

**P21. Reducing liveness to safety in first-order logic**, Oded Padon, Jochen Hoenicke, Giuliano Losa, Andreas Podelski, Mooly Sagiv, Sharon Shoham, POPL 2018 (online December 2017), [DOI](https://doi.org/10.1145/3158114). [Open author PDF](https://www.wisdom.weizmann.ac.il/~padon/reducing-liveness-to-safety-in-first-order-logic/popl18-reducing-liveness-to-safety-in-first-order-logic.pdf), [artifact](https://www.wisdom.weizmann.ac.il/~padon/reducing-liveness-to-safety-in-first-order-logic/). Full paper recovered and read after ACM access failed; POPL Article 26. The reduction picks a finite projection after a finite execution prefix (the freeze point), then proves there cannot be two later states identical in that projection with all fairness requirements fulfilled between them. This is a safety proof about a finite bad pattern. Because the projection remains finite, repeated projected states must arise in an infinite bad execution. A fixed finite projection can miss progress involving arbitrarily many predecessors; choosing the projection after seeing the execution handles a bound determined by the current state. User still supplies inductive invariants. **Inference:** an agent should propose the finite objects whose progress matters to one pending request, and distinguish false projected cycles from real executions.

Original-paper evidence, §7.2 pp.26:27–28: finding the invariants “requires a sophisticated user”; conjecture counts for liveness are “2 − 4 times higher” than for safety. This is an invariant-count comparison, not a measured person-time ratio. Humans applied the reduction manually, supplied a nesting structure where needed, and repaired inductive invariants with graphical counterexamples. Figure 10 has ticket, alternating bit, TLB shootdown, Paxos, Multi-Paxos, and Stoppable Paxos examples. Paxos assumes fair actions of a chosen leader/quorum, eventual delivery between them, and eventual cessation of competing proposals. Multi-Paxos proves every log position eventually agreed; Stoppable Paxos proves each position eventually agreed or beyond the stopped log, for one fixed-membership incarnation (§7.1 pp.26:26–27). Relevance: a direct precedent for useful liveness properties proved without numerical rankings, but with significant human abstraction/invariant work.

**P22. Temporal prophecy for proving temporal properties of infinite-state systems**, Oded Padon, Jochen Hoenicke, Kenneth L. McMillan, Andreas Podelski, Mooly Sagiv, Sharon Shoham, FMSD 57:246–269, 2021; preliminary FMCAD 2018. [Open PDF](https://link.springer.com/content/pdf/10.1007/s10703-021-00377-1.pdf), [Ivy source](https://github.com/kenmcmil/ivy). Prophecy adds a logical guess about the future to split difficult executions into cases. It refines the projection until genuine progress is visible; the guess changes proof state, not executable behavior. The ticket example has dynamically created threads and arbitrary finite task queues; even a dynamic projection initially misses a future thread's task-counter value (§2). Predicting a thread will stay in its critical section lets the proof capture its task count, derive eventual exit, and contradict the prediction. Exact assumption: “if every process is scheduled infinitely often” (§2, p.249). The guarantee is every waiting thread eventually enters the critical section. Ivy derives prophecy formulas from user-supplied temporal conjectures; graphical counterexamples guide invariant repair (§7.1, pp.261–262).

Figure 3 (p.263) separates **model lines**, **inductive conjectures**, and **checking time**, not human authoring time:

| case | model lines; conjectures; checker seconds |
|---|---|
| ticket with task queues | 90; 60; 7 |
| alternating bit protocol | 143; 70; 25 |
| hybrid reliable broadcast | 166; 58; 25 |
| TLB shootdown | 468; 102; 240 |

Alternating bit guarantees each queued sender value eventually reaches receiver. Requires both endpoints infinitely often scheduled and repeated sending eventually producing repeated receipt on both data and acknowledgement channels (§7.2.2, p.263). Hybrid broadcast proves correctness (all correct processes receive external input ⇒ some accepts) and relay (one accepts ⇒ all accept), alongside safety (§7.2.3). TLB shootdown proves eventual completion with fair scheduling and strong fairness for locking a page (§7.2.4). These are strong evaluation cases because they require discovering separate scheduling/channel/lock assumptions.

## LVR and implicit ranking functions

**P23. Mostly Automated Verification of Liveness Properties for Distributed Protocols with Ranking Functions.** Jianan Yao, Runzhou Tao, Ronghui Gu, Jason Nieh. POPL 2024, Article 35. [Open author PDF](https://www.cs.columbia.edu/~rgu/publications/popl24-yao.pdf), [DOI](https://doi.org/10.1145/3632877), [artifact](https://doi.org/10.5281/zenodo.10039066). Full paper recovered and read after the initial publisher access failure.

LVR converts a progress goal into ranking and safety obligations: a measure decreases, stays nonnegative, cannot leave the pending condition without reaching the good state, and cannot deadlock. It infers integer variables, bounds, changes per transition, and polynomial coefficients; mypyvy and P-FOL-IC3 discharge safety obligations. Humans supply missing variables, bounds, contradictory transition cases, and tiers for more complex rankings.

Evidence, §7 p.35:22: “it relies on a slightly stronger fairness assumption”; §9.2 p.35:27: “37 out of 40”, “manually in a few hours each”, and “less than a second”. Context: default bounded scheduling, automatically discharged safety obligations, the three remaining hand-written invariant proofs, and each final coefficient-solving query. The cheap solver query is not the whole verification cost.

The fairness detail is essential. Default scheduling uses a symbolic but globally bounded interval `Mperiod`. The paper explicitly notes that execution at times 1, 2, 4, 8, ... satisfies infinitely-often scheduling yet violates every fixed interval bound. §7 offers prophecy variables for a separate bound at each scheduling decision, plus a three-tier ranking, to retain the original fairness condition. An agent must record which encoding it selects.

Tables 3–5 establish eight models: ticket lock (68 model lines), hybrid reliable broadcast (137), alternating bit (127), TLB shootdown (361), Paxos (133), multi-Paxos (135), stoppable Paxos (160), sliding window (119). Table 5 includes hours of manual invariant work for TLB shootdown and sliding window, despite sub-second coefficient queries. §9.2's comparison with IronFleet explicitly acknowledges stronger abstraction: LVR's multi-Paxos leaves out the local scheduler and I/O queue. The reported line savings therefore do not establish equal effort savings for a verified runnable implementation.

Relevance: an agent-friendly breakdown into local obligations, with a visible choice between stronger bounded fairness and more complicated ordinary-fairness proofs. A small successful synthesized ranking is not evidence that the right environment contract was inferred.

**P24. Implicit Rankings for Verifying Liveness Properties in First-Order Logic**, Raz Lotan and Sharon Shoham, TACAS 2025, pp.375–393; full-version arXiv December 2024. [Open proceedings PDF](https://link.springer.com/content/pdf/10.1007/978-3-031-90643-5_20.pdf), [full version](https://arxiv.org/abs/2412.13996), [artifact](https://doi.org/10.5281/zenodo.14584594). An implicit ranking compares old/new states through formulas without explicitly calculating a complicated numerical measure. Constructors combine pointwise, lexicographic, multiset/permutation and domain-wide reasoning. This avoids directly asking SMT to manipulate unbounded sums and cardinalities. User provides the ranking composition, other proof-rule formulas, and sometimes existential witness hints; Z3 checks the generated conditions. Temporal form is `(∧ᵢ ∀x. □◇rᵢ(x)) ⇒ □(p ⇒ ◇q)` (§6, p.388), making fairness part of the theorem. Quote: “All examples are successfully verified within 10 minutes” (§6, p.388). Domains are finite but unbounded in these examples; this is not unrestricted infinite-domain completeness. Verified cases (§6): toy stabilization; binary counter; token-ring nonstarvation; Chang–Roberts leader election; termination of SAT backtracking and an abstract CDCL/backjumping algorithm; Dijkstra k-, 4-, and 3-state stabilization and repeated privilege access; Ghosh 4-state stabilization. No person-months found.

## LiDO, LiDO-DAG, and a 2026 liveness bug

**P25. LiDO: Linearizable Byzantine Distributed Objects with Refinement-Based Liveness Proofs**, Longfei Qiu, Yoonseung Kim, Ji-Yong Shin, Jieung Kim, Wolf Honoré, Zhong Shao, PLDI 2024, Article 193, [paper](https://flint.cs.yale.edu/flint/publications/lido.pdf), [extended report](https://flint.cs.yale.edu/flint/publications/lido-tr.pdf), [Coq artifact](https://doi.org/10.5281/zenodo.10909272). Abstract object includes a pacemaker (round and remaining time), allowing the implementation's liveness argument to reduce to local bounded-progress safety obligations and refinement of live traces. Partial synchrony provides unknown GST after which messages/process steps have bounded delay; theorem assumes live network traces (§4.2). Human proof splits leader entry, sending request, voter responses, and receiving votes into timed stages.

Model refinement uses Server, Voting, and Network layers; the protocol-independent liveness proof can be reused (§4.3). Unpipelined Jolteon model+safety about 4,000 Coq lines, liveness about 1,800; pipelined liveness about 2,000 (§4.3 p.193:19, §5 p.193:20). Verbatim evidence: “Proving its liveness took around 1,800 lines”; “required around 2,000 lines”. Table 1 itemizes liveness 357+523+953 lines. Pipelining needs two consecutive honest leaders and control of timeout interference; proving one round succeeds is insufficient (§5). The paper connects its models to extracted Coq implementations; this is broader than a finite model check, with the network/environment contracts still assumed.

No authoring person-time found.

**P26. LiDO-DAG: A Framework for Verifying Safety and Liveness of DAG-Based Consensus Protocols**, Longfei Qiu, Jingqi Xiao, Ji-Yong Shin, Zhong Shao, PLDI 2025, Article 203. [Paper](https://flint.cs.yale.edu/flint/publications/lido-dag.pdf), [report](https://flint.cs.yale.edu/flint/publications/lido-dag-tr.pdf), [artifact](https://doi.org/10.5281/zenodo.15223659). Extends LiDO with DAG dissemination/ordering abstraction, and proves partially synchronous Narwhal, Bullshark, Sailfish in Coq. It explicitly excludes asynchronous probabilistic variants (§2 p.203:5). Main liveness: vertices built by synchronous processes eventually enter the consensus log (§3.3, Theorem 3.6). Extra fairness ensures each synchronous builder succeeds in creating a vertex within a fixed number of time segments; mere repeated global commit can starve an individual builder (Definition 3.8). Table 2 p.203:20: model spec 747/proof 1500 lines (586/397 imported); Narwhal spec 2307/proof 9697 (1706/6813 imported); Bullshark 603/4343; original Sailfish 270/3479; modified Sailfish 339/3040. Human effort: “two persons over three months” (§5, p.203:21). Code volume includes reuse and safety+liveness together; it is not incremental liveness-only cost. Verification revealed a Sailfish latency improvement (§4.3).

**P27. Mechanized Safety and Liveness Proofs for the Mysticeti Consensus Protocol under the LiDO-DAG Framework**, Longfei Qiu, Jingqi Xiao, Zhong Shao, IEEE S&P 2026. [Paper](https://flint.cs.yale.edu/flint/publications/sp26.pdf), [artifact](https://zenodo.org/records/17345693), [author page](https://flint.cs.yale.edu/flint/publications/sp26.html). Counterexample allows honest participants to jump arbitrarily over rounds and prevents every block from ever committing (§3). Authors restrict jumping, introduce catchup time GCT, and prove strong progress after both GST and GCT; weak liveness guarantees creation of new honest leader vertices and honest certificates, rather than actual commits (§4). New Coq/Rocq proof contribution: “6271 lines”; “two persons in two months” (§5.5, PDF p.13). Authors report auditing Sui implementation and finding it susceptible; that is their dated paper finding, not a verified current deployment claim. **Inference:** excellent agent benchmark: detect a liveness counterexample, distinguish a too-weak progress theorem from input coverage, repair the protocol, and account for new assumptions explicitly.

## Bythos: composition with TLA proof rules in Coq

**P28. Compositional Verification of Composite Byzantine Protocols**, Qiyuan Zhao, George Pîrlea, Karolina Grzeszkiewicz, Seth Gilbert, Ilya Sergey, CCS 2024 pp.34–48. [DOI](https://doi.org/10.1145/3658644.3690355), [repo](https://github.com/verse-lab/bythos), [artifact](https://doi.org/10.5281/zenodo.12787570). Existing collection PDF was read. Coq embeds TLA, exposes weakly fair delivery, and proves pending packets eventually delivered and protocol phases eventually complete. Core human proof: identify finite sufficient packet sets for each phase; prove their delivery causes the next phase; chain phases with leads-to transitivity (§2.3–3.2, pp.38–41). Fairness is explicitly conditional on delivery to honest processes, not Byzantine cooperation. Source `Protocols/PB/Liveness_tla.v` states `init ∧ □next ∧ WFDelivery ⊢ sent ~~> output`, via intermediate `all_echoes`; the final proof invokes `leads_to_trans`. Code quotation is independently useful because it shows exactly how users state the assumption and pending request.

Table 1 (§5, p.45) breaks down liveness-specific spec/proof lines: Bythos reusable liveness library 160/181; Provable Broadcast 92/67; Reliable Broadcast 144/161; Accountable Confirmer 172/200; Accountable Reliable Broadcast composition 3/7. Full development about 7100 Coq lines and trusted OCaml shim about 200. Repeated Provable Broadcast composition proofs (twice/thrice) each 5 lines. Concise composition still needs connector invariants; ARB connector spec/proof 48/92. Important author caveat: knowledge lemmas “discovered manually through trial and error” (§5 p.45); every case has 10–20 knowledge lemmas. No authoring time stated. Scope: asynchronous eventual delivery, fixed honest-membership constraints; probabilistic termination unsupported, partial synchrony assumptions future work (§5–6 pp.45–47). This matters because the composed proof is tiny only after humans find and prove reusable interfaces and connector facts.

## Iris: Trillium, Lilo, Lawyer

**P29. Trillium: Higher-Order Concurrent and Distributed Separation Logic for Intensional Refinement**, Amin Timany, Simon Oddershede Gregersen, Léo Stefanesco, Jonas Kastberg Hinrichsen, Léon Gondelman, Abel Nieto, Lars Birkedal, POPL 2024 Article 9. [Paper](https://iris-project.org/pdfs/2024-popl-trillium.pdf), [extended version](https://arxiv.org/abs/2109.07863), [repo](https://github.com/logsem/trillium). Defines trace refinement in Iris, and Fairis instantiation transfers liveness from a model to concurrent programs under fair scheduling. Threads carry logical roles and fuel that bounds stuttering implementation steps; every model step replenishes fuel. Fuel excludes an implementation looping forever without model progress (§4). Fairness means an enabled role cannot be neglected indefinitely (§4.3). User supplies model, refinement relation, resources/invariants, fuel discipline. Soundness needs relative image finiteness (for each concrete step, finitely many compatible model choices); models can still have unbounded branching if the concrete state fixes the choice (§4.2.2).

Concurrency examples: CAS countdown terminates; choosing arbitrary natural then decrementing terminates; two threads increment shared counter in alternating even/odd steps, guaranteeing repeated progress (§4.2). Separate distributed instantiation proves single-decree Paxos and CRDT refinement to TLA+ models (§5). **Do not classify its Paxos example as a consensus-liveness proof:** paper's implementation/model example transfers agreement safety, and §5.2 client proves learners agree. Effort quote for the Paxos client proof: “about 1100 lines of proof scripts” (footnote 9, p.9:27). No person-time found. §6–7 expressly discuss limits of modular lock-termination specs; next works address these.

**P30. Lilo: A Higher-Order, Relational Concurrent Separation Logic for Liveness**, Dongjae Lee, Janggun Lee, Taeyoung Yoon, Minki Cho, Jeehoon Kang, Chung-Kil Hur, OOPSLA1 April 2025 Article 125, [PDF](https://iris-project.org/pdfs/2025-oopsla-lilo.pdf), [DOI](https://doi.org/10.1145/3720525), [artifact](https://zenodo.org/records/14927742). Coq-mechanized logic combining Fair Operational Semantics, thread-local simulation, logical promises, obligations, and progress credits. A promise says another thread will establish a condition; obligation records responsibility; credit bounds delay and prevents circular promises that never become true (§2–4). Scheduler credit expresses eventual scheduling. Delayed promises permit causal ordering of obligations without exposing thread identities in library interfaces (§6). Handles termination and infinite recurring progress through refinement (abstract and §3).

Cases (§7 pp.125:22–24): spinlock clients and lock handoff (requires finite contention/delay obligations); ticket lock acquisition (requires eventual unlock by holders); Treiber stack and elimination stack operations (finite usage obligation, not unconditional wait-freedom); nested-lock increment client. Quote: “a liveness obligation that obligates finite usage of the stack” (§7.2, p.125:23). Authors reuse safety invariants and extend with obligations/credits. No LoC/person-time located. Its elimination stack has a limitation: full logically atomic triple would require Hoare triples inside invariants, left future work in footnote 4, p.125:23; do not oversell the claim as arbitrary Iris higher-order modularity.

**P31. Lawyer: Modular Obligations-Based Liveness Reasoning in Higher-Order Impredicative Concurrent Separation Logic**, Egor Namakonov, Justus Fasse, Bart Jacobs, Lars Birkedal, Amin Timany, OOPSLA1 April 2026 Article 132. [PDF](https://iris-project.org/pdfs/2026-oopsla-lawyer.pdf), [DOI](https://doi.org/10.1145/3798240), [artifact](https://doi.org/10.5281/zenodo.18457697). Rocq/Iris mechanized fair termination, using a logical transition system of obligations rather than instrumenting executable code. Fuel decreases on program steps; a well-founded hierarchy orders dependencies between pending obligations to rule out cycles (§2–3). Ticket-lock module and client verified separately against a fair-lock interface (§4). Library interface obliges lock holder eventually to release (§4.2); fair scheduling alone is insufficient if a holder never unlocks.

Quote: “mandates the eventual release of an acquired lock” (§4.2 p.132:20). Other examples include producer/consumer signals, nested locks and lock handoffs (Fig.13). No effort count found. Limits (§6 pp.132:24–25): finite sets of levels/degrees constrain arbitrarily growing lock-coupling structures; progress guarantees for independent modules and liveness of nonterminating programs are future work. Contrast with Lilo should preserve both tools' exact semantic scope rather than one undifferentiated 'Iris supports liveness'.

## ByMC: fully parameterized model checking

**P32. ByMC: Byzantine Model Checker**, Igor Konnov and Josef Widder, ISoLA 2018, [DOI](https://doi.org/10.1007/978-3-030-03424-5_22), [repo](https://github.com/konnov/bymc), [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks). Original chapter PDF was not recovered; the substantially expanded primary survey was read.

**P33. Survey on Parameterized Verification with Threshold Automata and the Byzantine Model Checker**, Igor Konnov, Marijana Lazić, Ilina Stoilkovska, Josef Widder, LMCS 19(1:5), 2023, [PDF](https://lmcs.episciences.org/10824/pdf), [DOI](https://doi.org/10.46298/lmcs-19(1:5)2023), [preprint](https://arxiv.org/abs/2011.14789). Nodes count threshold messages; counter abstraction groups indistinguishable nodes. SMT checks accelerated representative executions; safety and liveness are checked for every admissible number of processes/faults, not one finite instance. Environment assumptions (fault threshold, reliable/fair delivery, rounds) are explicit in model and temporal formulas. Quote: “the number n of processes in the system is a parameter” (abstract p.5:1). §3.2 demonstrates eventual delivery fairness and liveness-to-safety reduction; §6 details tool generations.

Table 4 (§6.2 p.5:20) identifies verified safety+liveness for folklore reliable broadcast, Srikanth–Toueg reliable broadcast, asynchronous Byzantine agreement, nonblocking atomic commit (Guerraoui and Raynal variants), condition-based consensus, CF1S, C1CS, BOSCO. Randomized Ben-Or, randomized Byzantine consensus, randomized k-set agreement, RS-BOSCO get safety and almost-sure termination **under round-rigid adversaries**, which is a restrictive adversary model (§5 and Table 4), not arbitrary adversary guarantees. Table 6 lists synchronous cases separately. Tendermint one-round agreement analysis is safety and should not be counted as a complete Tendermint eventual-decision proof (§8). No human person-time found. Benchmarks contain compact models rather than verified runnable implementations; explicit admissible parameter ranges and fairness formulas make useful automated-proof evaluations.

## Ivy, ranking, Coq, and Iris case index

| problem | guarantee and tool | effort evidence; paper and artifact |
|---|---|---|
| ticket lock with task queues | every waiting thread enters, fair scheduling; Ivy | model 90 lines, 60 conjectures; [P22](https://doi.org/10.1007/s10703-021-00377-1) Fig.3 p.263; [Ivy](https://github.com/kenmcmil/ivy) |
| alternating bit | every submitted item received, fair endpoints+channels; Ivy | model 143 lines, 70 conjectures; same [P22 figure](https://doi.org/10.1007/s10703-021-00377-1); [Ivy](https://github.com/kenmcmil/ivy) |
| hybrid reliable broadcast | eventual accept+relay; Ivy | model 166 lines, 58 conjectures; same [P22 figure](https://doi.org/10.1007/s10703-021-00377-1); [Ivy](https://github.com/kenmcmil/ivy) |
| TLB shootdown | shootdown eventually completes, fair scheduling+strong lock fairness; Ivy | model 468 lines, 102 conjectures; same [P22 figure](https://doi.org/10.1007/s10703-021-00377-1); [Ivy](https://github.com/kenmcmil/ivy) |
| token ring | nonstarvation; implicit rankings/Z3; Lotan and Shoham; under P24 specified fairness; finite but unbounded domain | user ranking/hints; all suite cases checked <10 min; [P24](https://arxiv.org/abs/2412.13996) §6 pp.388–390; [artifact](https://doi.org/10.5281/zenodo.14584594) |
| Chang–Roberts leader election | eventual elected leader; implicit rankings/Z3; Lotan and Shoham; under P24 specified fairness; finite but unbounded domain | user ranking/hints; all suite cases checked <10 min; [P24](https://arxiv.org/abs/2412.13996) §6 pp.388–390; [artifact](https://doi.org/10.5281/zenodo.14584594) |
| Dijkstra k-state | eventually one privilege; every participant gets repeated privilege; implicit rankings/Z3; Lotan and Shoham; under P24 specified fairness; finite but unbounded domain | same [P24 suite](https://arxiv.org/abs/2412.13996); [artifact](https://doi.org/10.5281/zenodo.14584594); human effort unstated |
| Dijkstra 4-state | eventually one privilege; every participant gets repeated privilege; implicit rankings/Z3; Lotan and Shoham; under P24 specified fairness; finite but unbounded domain | same [P24 suite](https://arxiv.org/abs/2412.13996); [artifact](https://doi.org/10.5281/zenodo.14584594); human effort unstated |
| Dijkstra 3-state | eventually one privilege; every participant gets repeated privilege; implicit rankings/Z3; Lotan and Shoham; under P24 specified fairness; finite but unbounded domain | same [P24 suite](https://arxiv.org/abs/2412.13996); [artifact](https://doi.org/10.5281/zenodo.14584594); human effort unstated |
| Ghosh 4-state | eventually one privilege; every participant gets repeated privilege; implicit rankings/Z3; Lotan and Shoham; under P24 specified fairness; finite but unbounded domain | same [P24 suite](https://arxiv.org/abs/2412.13996); [artifact](https://doi.org/10.5281/zenodo.14584594); human effort unstated |
| SAT backtracking | terminates; implicit rankings/Z3; Lotan and Shoham | same [P24 suite](https://arxiv.org/abs/2412.13996); [artifact](https://doi.org/10.5281/zenodo.14584594) |
| abstract CDCL | terminates; implicit rankings/Z3; Lotan and Shoham | same [P24 suite](https://arxiv.org/abs/2412.13996); [artifact](https://doi.org/10.5281/zenodo.14584594) |
| unpipelined Jolteon | safety+liveness under partial synchrony; Coq/LiDO | about 1800 liveness lines; [P25](https://flint.cs.yale.edu/flint/publications/lido.pdf) §4.3 p.193:19; [artifact](https://doi.org/10.5281/zenodo.10909272) |
| pipelined Jolteon | eventual commit using consecutive honest leaders; Coq/LiDO | about 2000 liveness lines; [P25](https://flint.cs.yale.edu/flint/publications/lido.pdf) §5 p.193:20; [artifact](https://doi.org/10.5281/zenodo.10909272) |
| Narwhal | every honest/synchronous vertex eventually committed; Coq/LiDO-DAG; under P26 partial synchrony, fault threshold, and builder fairness | 2307 spec/9697 proof lines incl reuse; [P26](https://flint.cs.yale.edu/flint/publications/lido-dag.pdf) Table2; [artifact](https://doi.org/10.5281/zenodo.15223659) |
| Bullshark | same; Coq/LiDO-DAG; under P26 partial synchrony, fault threshold, and builder fairness | 603/4343 lines; [P26](https://flint.cs.yale.edu/flint/publications/lido-dag.pdf) Table2; [artifact](https://doi.org/10.5281/zenodo.15223659) |
| Sailfish original | same; Coq/LiDO-DAG; modification reduces worst-case latency; under P26 partial synchrony, fault threshold, and builder fairness | 270/3479 lines; Table2; all three developed by two people over three months; [P26](https://flint.cs.yale.edu/flint/publications/lido-dag.pdf), [artifact](https://doi.org/10.5281/zenodo.15223659) |
| Sailfish modified | same; Coq/LiDO-DAG; modification reduces worst-case latency; under P26 partial synchrony, fault threshold, and builder fairness | 339/3040 lines; Table2; all three developed by two people over three months; [P26](https://flint.cs.yale.edu/flint/publications/lido-dag.pdf), [artifact](https://doi.org/10.5281/zenodo.15223659) |
| repaired Mysticeti | honest leader vertices created/certified; every new honest leader vertex after catchup committed in bounded time; Rocq/LiDO-DAG | 6271 new proof lines, two people/two months; [P27](https://flint.cs.yale.edu/flint/publications/sp26.pdf) §5; [artifact](https://zenodo.org/records/17345693) |
| Provable Broadcast | honest valid sender eventually obtains proof; Coq/Bythos; under P28 honest-node membership and eventual delivery conditions | liveness 92 spec/67 proof lines; Table1 p.45; [P28](https://doi.org/10.1145/3658644.3690355); [source](https://github.com/verse-lab/bythos/tree/main/Protocols/PB) |
| Reliable Broadcast | honest sender's value eventually delivered to every honest node; Coq/Bythos; under P28 honest-node membership and eventual delivery conditions | 144/161; [P28](https://doi.org/10.1145/3658644.3690355); [source](https://github.com/verse-lab/bythos/tree/main/Protocols/RB) |
| Accountable Confirmer | terminating convergence; conflicting confirmations expose faulty nodes; Coq/Bythos; under P28 honest-node membership and eventual delivery conditions | 172/200; [P28](https://doi.org/10.1145/3658644.3690355); [source](https://github.com/verse-lab/bythos/tree/main/Protocols/ABC) |
| Accountable Reliable Broadcast | honest broadcast eventually confirmed by all honest nodes; Coq/Bythos; under P28 honest-node membership and eventual delivery conditions | 3/7 liveness, 48/92 connector; [P28](https://doi.org/10.1145/3658644.3690355); [source](https://github.com/verse-lab/bythos/tree/main/Protocols/RBABC) |
| CAS countdown | fair termination; Iris/Fairis/Trillium; under P29 fair scheduling and refinement conditions | effort unstated; [P29](https://iris-project.org/pdfs/2024-popl-trillium.pdf) §4.2; [source](https://github.com/logsem/trillium) |
| arbitrary-natural countdown | fair termination; Iris/Fairis/Trillium; under P29 fair scheduling and refinement conditions | effort unstated; [P29](https://iris-project.org/pdfs/2024-popl-trillium.pdf) §4.2; [source](https://github.com/logsem/trillium) |
| alternating even/odd CAS increments | infinite recurring progress; Iris/Fairis/Trillium; under P29 fair scheduling and refinement conditions | effort unstated; [P29](https://iris-project.org/pdfs/2024-popl-trillium.pdf) §4.2; [source](https://github.com/logsem/trillium) |
| ticket lock and client | acquisition terminates if holders eventually unlock; Lilo; Lawyer | effort unstated; separately checked modular interface in [P31](https://iris-project.org/pdfs/2026-oopsla-lawyer.pdf) §4; [artifact](https://doi.org/10.5281/zenodo.18457697) |
| spinlock client | operation termination with finite contention/usage obligations; Coq/Lilo | effort unstated; [P30](https://iris-project.org/pdfs/2025-oopsla-lilo.pdf) §7; [artifact](https://zenodo.org/records/14927742) |
| Treiber stack client | operation termination with finite contention/usage obligations; Coq/Lilo | effort unstated; [P30](https://iris-project.org/pdfs/2025-oopsla-lilo.pdf) §7; [artifact](https://zenodo.org/records/14927742) |
| elimination stack client | operation termination with finite contention/usage obligations; Coq/Lilo | effort unstated; [P30](https://iris-project.org/pdfs/2025-oopsla-lilo.pdf) §7; [artifact](https://zenodo.org/records/14927742) |
| folklore reliable broadcast | reliable-broadcast safety and eventual delivery; parameterized ByMC models; Konnov et al. | human effort unstated; [P33](https://lmcs.episciences.org/10824/pdf) Table4; [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks) |
| Srikanth–Toueg reliable broadcast | reliable-broadcast safety and eventual delivery; parameterized ByMC models; Konnov et al. | human effort unstated; [P33](https://lmcs.episciences.org/10824/pdf) Table4; [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks) |
| asynchronous Byzantine agreement (ABA) | agreement safety and eventual termination under the modeled fairness; parameterized ByMC models; Konnov et al. | human effort unstated; [P33](https://lmcs.episciences.org/10824/pdf) Table4; [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks) |
| Guerraoui nonblocking atomic commit (NBACG) | atomic-commit safety and eventual termination; parameterized ByMC models; Konnov et al. | human effort unstated; [P33](https://lmcs.episciences.org/10824/pdf) Table4; [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks) |
| Raynal nonblocking atomic commit (NBACR) | atomic-commit safety and eventual termination; parameterized ByMC models; Konnov et al. | human effort unstated; [P33](https://lmcs.episciences.org/10824/pdf) Table4; [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks) |
| condition-based consensus (CBC) | agreement and eventual decision under its condition; parameterized ByMC models; Konnov et al. | human effort unstated; [P33](https://lmcs.episciences.org/10824/pdf) Table4; [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks) |
| CF1S consensus | consensus safety and liveness under its modeled conditions; parameterized ByMC models; Konnov et al. | human effort unstated; [P33](https://lmcs.episciences.org/10824/pdf) Table4; [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks) |
| C1CS consensus | consensus safety and liveness under its modeled conditions; parameterized ByMC models; Konnov et al. | human effort unstated; [P33](https://lmcs.episciences.org/10824/pdf) Table4; [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks) |
| BOSCO | consensus safety and liveness under its modeled conditions; parameterized ByMC models; Konnov et al. | human effort unstated; [P33](https://lmcs.episciences.org/10824/pdf) Table4; [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks) |
| Ben-Or randomized consensus | safety and almost-sure termination under round-rigid adversaries; parameterized ByMC models; Konnov et al. | human effort unstated; [P33](https://lmcs.episciences.org/10824/pdf) Table4; [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks) |
| randomized Byzantine consensus (RABC) | safety and almost-sure termination under round-rigid adversaries; parameterized ByMC models; Konnov et al. | human effort unstated; [P33](https://lmcs.episciences.org/10824/pdf) Table4; [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks) |
| randomized k-set agreement | safety and almost-sure termination under round-rigid adversaries; parameterized ByMC models; Konnov et al. | human effort unstated; [P33](https://lmcs.episciences.org/10824/pdf) Table4; [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks) |
| RS-BOSCO | safety and almost-sure termination under round-rigid adversaries; parameterized ByMC models; Konnov et al. | human effort unstated; [P33](https://lmcs.episciences.org/10824/pdf) Table4; [benchmarks](https://github.com/konnov/fault-tolerant-benchmarks) |

## Gaps and follow-up reference searches

- LVR full paper was ultimately recovered from Ronghui Gu’s publication list; its archived artifact is linked above. Executable artifact reproduction was not attempted.
- Original ByMC 2018 chapter PDF remains unavailable; its expanded 2023 survey was read. The original POPL 2018 reduction was ultimately recovered through Oded Padon’s author page.
- Bythos PDF was already in collection and not redownloaded. New save count excludes it.
- 'Cited by' services were unreliable (OpenAlex shared-IP daily budget exhausted; DBLP search response empty; Semantic Scholar discovery initially unavailable; its DOI endpoint later supplied Lion’s abstract). Reference follow-up succeeded through temporal prophecy's reference 36 (original reduction), implicit rankings' references 27–28 (2024 full version/2025 artifact), LiDO author's publication list (2025 DAG/2026 Mysticeti), and Iris project list (2025 Lilo/2026 Lawyer).
- Bythos paper references 2022 **Holistic Verification of Blockchain Consensus** (Bertrand et al.) and ByMC survey discusses Tendermint; useful next stop for distinguishing full consensus liveness from one-round agreement checks.
- Lion was followed up through publisher metadata and its abstract; see P34 for its remaining full-text gap.

## Implementation and protocol case index

Each row names a concrete proof target. Numbers are the authors' labeled source-code counts, with the short verbatim evidence and context in the corresponding paper entry. No claim here assigns overall project time to a single liveness lemma. An archived artifact can serve as source when no canonical repository was established.

| Problem | What was guaranteed; tool; authors | Size/effort and sources |
| --- | --- | --- |
| Boolean next-state progress | eventually x becomes true under weak fairness; TLAPS developers | no measured human effort; [proof source](https://github.com/tlaplus/tlapm/blob/main/examples/SimpleEventually.tla) |
| IronRSL request retry | client eventually receives reply under eventual quorum/timing/resource conditions; Dafny; Hawblitzel et al. | 7,869 protocol liveness proof lines; [P05 paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2015/10/ironfleet.pdf), [source](https://github.com/microsoft/Ironclad/tree/main/ironfleet) |
| IronKV reliable transmission | submitted packet eventually received under fair delivery; Dafny; Hawblitzel et al. | 2,093 protocol liveness proof lines; same P05 paper/source; total methodology plus systems 3.7 person-years |
| ZooKeeper controller | ESR after desired-state/fault/interference stabilization; Verus; Sun et al. | 7,245 ESR proof lines, first ESR proof about two person-months; [P06 paper](https://www.usenix.org/system/files/osdi24-sun-xudong.pdf), [source](https://github.com/anvil-verifier/anvil/tree/osdi24) |
| RabbitMQ controller | ESR and replicas never decrease; Verus; Sun et al.; under fixed desired state, eventual fault/conflict cessation, and P06 action fairness | 5,211 ESR lines, 358 safety lines; same P06 paper/source |
| FluentBit controller | ESR including incremental feature changes; Verus; Sun et al.; under fixed desired state, eventual fault/conflict cessation, and P06 action fairness | 7,079 ESR lines; same P06 paper/source |
| ReplicaSet controller | population eventually matches desired count and remains matched; Verus/Welder; Cai et al.; under P07 desired-state stability, fault, fairness, rely, and dependency conditions | 7,305 ESR lines; [P07 paper](https://cathy-cai.page/pubs/welder26.pdf), [source](https://github.com/anvil-verifier/anvil/tree/sosp26) |
| Deployment controller | rolling updates eventually reconcile while depending on ReplicaSet progress; Verus/Welder; Cai et al.; under P07 desired-state stability, fault, fairness, rely, and dependency conditions | 10,201 ESR lines; same P07 paper/source |
| StatefulSet controller | eventually reconciles ordered stateful workloads; Verus/Welder; Cai et al.; under P07 desired-state stability, fault, fairness, rely, and dependency conditions | 11,937 ESR lines; same P07 paper/source |
| RabbitMQ plus StatefulSet | compositional reconciliation with explicit dependencies; Verus/Welder; Cai et al.; under P07 desired-state stability, fault, fairness, rely, and dependency conditions | RabbitMQ 6,772 ESR lines; all four controllers total 1.5 person-years; same P07 paper/source |
| Paxos, original dynamic abstraction | eventual decision after stable leader/quorum conditions; Ivy; Padon et al. | [P21](https://www.wisdom.weizmann.ac.il/~padon/reducing-liveness-to-safety-in-first-order-logic/popl18-reducing-liveness-to-safety-in-first-order-logic.pdf) §7; [artifact](https://www.wisdom.weizmann.ac.il/~padon/reducing-liveness-to-safety-in-first-order-logic/) |
| Multi-Paxos, original dynamic abstraction | every position eventually agreed; Ivy; Padon et al.; under P21 stable-leader, quorum-action fairness, and reliable-delivery assumptions | same [P21 paper](https://doi.org/10.1145/3158114) and [artifact](https://www.wisdom.weizmann.ac.il/~padon/reducing-liveness-to-safety-in-first-order-logic/) |
| Stoppable Paxos, original dynamic abstraction | position agreed or beyond final stopped log, fixed membership; Ivy; Padon et al.; under P21 stable-leader, quorum-action fairness, and reliable-delivery assumptions | same [P21 paper](https://doi.org/10.1145/3158114) and [artifact](https://www.wisdom.weizmann.ac.il/~padon/reducing-liveness-to-safety-in-first-order-logic/) |
| Ticket lock | every waiter enters; LVR/Z3/mypyvy; Yao et al.; under P23 encoded scheduling/delivery/fault assumptions; global interval bounds by default | 68 model lines, missing hints listed Table 4; [P23 paper](https://www.cs.columbia.edu/~rgu/publications/popl24-yao.pdf), [artifact](https://doi.org/10.5281/zenodo.10039066) |
| Hybrid reliable broadcast | correct node eventually accepts a message broadcast by non-Byzantine nodes; LVR; Yao et al.; under P23 encoded scheduling/delivery/fault assumptions; global interval bounds by default | 137 model lines; same P23 paper/artifact |
| Alternating bit | each sender datum eventually received despite allowed loss; LVR; Yao et al.; under P23 encoded scheduling/delivery/fault assumptions; global interval bounds by default | 127 model lines; same P23 paper/artifact |
| TLB shootdown | processors eventually update stale translations; LVR; Yao et al.; under P23 encoded scheduling/delivery/fault assumptions; global interval bounds by default | 361 model lines, manual invariant work in Table 5; same P23 paper/artifact |
| Paxos | eventually some value chosen under stated progress assumptions; LVR; Yao et al.; under P23 encoded scheduling/delivery/fault assumptions; global interval bounds by default | 133 model lines; same P23 paper/artifact |
| Multi-Paxos | consensus extends a growing log; LVR; Yao et al.; under P23 encoded scheduling/delivery/fault assumptions; global interval bounds by default | 135 model lines; abstract protocol, excluding IronFleet I/O/scheduler; same P23 paper/artifact |
| Stoppable Paxos | consensus with stopping/reconfiguration; LVR; Yao et al.; under P23 encoded scheduling/delivery/fault assumptions; global interval bounds by default | 160 model lines; same P23 paper/artifact |
| Sliding window | eventual delivery despite packet loss/reordering; LVR; Yao et al.; under P23 encoded scheduling/delivery/fault assumptions; global interval bounds by default | 119 model lines; manual invariant work in Table 5; same P23 paper/artifact |

Original Paxos, Raft, PBFT, HotStuff, and Tendermint papers above supply protocol-level progress arguments; this index does not recast them as verified implementations. The Ivy, Iris, LiDO, Bythos, ByMC, ranking, and recent-agent cases appear in the adjacent indexes with their distinct proof scope.

## Newly found 2026 Verus liveness: Lion

**P34. Lion: Modular Verification of Async Runtime Liveness**, Ti Zhou, Zihao Zhang, Omar Chowdhury, Shuai Mu, Proceedings of the ACM SIGOPS 32nd Symposium on Operating Systems Principles, online 28 September 2026, [DOI](https://doi.org/10.1145/3830418.3843879). Publisher metadata verified via [Crossref](https://api.crossref.org/works/10.1145/3830418.3843879); Semantic Scholar-indexed abstract recovered via [Semantic Scholar DOI endpoint](https://api.semanticscholar.org/graph/v1/paper/DOI:10.1145/3830418.3843879?fields=title,authors,abstract,openAccessPdf,url). **Abstract-only evidence:** authors build a Tokio-compatible Rust async runtime verified with Verus. Property: a yielding task eventually resumes when its awaited event fires. They use an append-only logical event log and translate LTL to first-order conditions in the style of Kamp's theorem, so monotonic timestamps support liveness reasoning without native temporal operators.

Main theorem abstracts sufficient environment/calling assumptions and instantiates them per runtime; a bijection connects abstract log events to concrete actions. Abstract performance quote: “at least 95% of unverified-runtime throughput on nine real-world workloads”. **Inference:** this is especially relevant to deriving progress proofs across real Rust modules and supports investigating a different liveness encoding than Anvil's infinite-execution predicates. It is not evidence of automatic informal-spec generation or LLM assistance. Crossref and Semantic Scholar metadata report an open CC-BY PDF, but ACM PDF URL returns HTML access challenge; guessed author sites failed.

Exact environmental assumptions, proof/code size, workloads and artifact remain unverified. No PDF saved.

## Suggested evaluation, inferred from the evidence

Evaluate the whole contract, not only acceptance by a prover. My proposed evaluation separates five tasks:

1. **Property formulation.** Given a plain request, produce the intended event, quantifier scope, and temporal formula. Test ambiguous requests such as “the cluster recovers” against eventual matching, permanent matching, and recurring commits
2. **Assumption formulation.** Require separate scheduling, messaging, timing, faults, interference, resource, and client assumptions. Check whether strengthening fairness or dropping supported failures silently makes the theorem easier
3. **Proof construction.** Ask for milestones, invariants, a rank or a reduction, and checkable proof obligations. Score completeness of dependencies, admitted facts, and trusted components
4. **Counterexample and repair.** Remove one fairness premise or introduce one known liveness bug; require a concrete infinite execution or a faithful finite loop that witnesses it. Useful cases include Paxos proposer dueling, permanent stuttering, Anvil name collisions, and Mysticeti round jumping
5. **Implementation preservation.** Retain required algorithm, interface, performance, and failure handling. Vero's binary-to-linear-search substitution illustrates why functional correctness alone misses this dimension

A liveness benchmark should include both valid and impossible tasks. Record a principled rejection or a request to clarify environmental assumptions as a possible correct outcome. Otherwise it rewards proof-shaped answers to unachievable specifications.

Record proof-checker outcome separately from finite testing, bounded checking, parameterized proof, probabilistic termination, and an unbounded implementation theorem. Also distinguish case-specific human authoring time from prover runtime, model lines from proof lines, reused library lines from newly written proof, and lemma completion from specification synthesis.

Starter tasks, in increasing scope: Dafny Ackermann; Verus recursive logarithm; TLAPS `SimpleEventually`; Apalache traffic light with/without explicit fairness; Ivy ticket queues; LVR alternating bit; implicit-ranking token ring; Bythos reliable-broadcast composition; Anvil ReplicaSet lemma completion; Anvil ESR contract/proof; Welder controller composition; LiDO timed consensus; Mysticeti counterexample and repair. These are recommendations, not published benchmark difficulty rankings.

## Search coverage and remaining limits

The built-in web search failed with HTTP 404. Direct requests to open author pages, USENIX, Microsoft Research, arXiv PDFs, publisher pages, Crossref, official tool docs, and checked-out source repositories supplied the evidence. DBLP returned unusable/empty responses; Google required JavaScript; several API discovery routes were throttled. Successful searches followed references and author/project publication lists rather than depending solely on query hits.

Reference chains actually followed: TLA proof rules → IronFleet → Anvil → Welder; POPL dynamic abstraction → temporal prophecy → implicit rankings; IronFleet → LVR's actual comparison and stronger fairness encoding; LiDO → LiDO-DAG → Mysticeti; Trillium → Lilo → Lawyer; ByMC → its expanded survey; Anvil → VeruSAGE's library/controller tasks. Citation-index “cited by” coverage is incomplete because discovery endpoints were unavailable. This report does not claim exhaustiveness.

The requested personal notes destination is outside the permitted writable roots. The review notes are saved here; no claim is made that the external notes tree was updated. PDFs were checked for `%PDF`, existing collection entries were reused, and new papers were saved under per-paper directories. Temporary failed downloads and an incorrectly guessed arXiv identifier were discarded from the paper inventory.

Repository evidence snapshots: TLAPS `d8b9747a1dce9b4816bcc1ff130ccf7a3af2ce37`; Veil `626901534a8c788e45b350328021cd4d7a942c32`; Anvil `a597f9de7dbeb056403bd60b0a2ca67f686a5e1f`; Ironclad `2fe4dcdc323b92e93f759cc3e373521366b7f691`; Ivy `8858a0241ed37141757b7a051acc24c58e49c2f3`. These identify checked-out source evidence, not independent reproduction of the proofs. Living documentation claims describe the pages inspected during this run; future changes require rechecking those pages.
