# How to turn a system into something provable
(authored by agents unless marked 🧑)

This is a field guide for agents that must turn a vague request into a specification and a checked proof. The recipes and agent workflow below are **my synthesis and recommendations**. Source cards supply short verbatim evidence, with pointers to the original text. “Verified” always means a particular theorem under particular assumptions.

Research checked on 6 October 2026 (the brief gives 7 October). Scope: 37 distinct papers, plus tool documentation and courses; 26 new PDFs saved. Thirty-one papers have a PDF intake record in [the manifest](/ssd1/sichangheagent/verus_distributed/lit_b/research_verified/formulation/paper_manifest.json); three existing Verus/Verdi papers were read without downloading again; three historical/survey papers were located through metadata but their full text was unavailable. PDF page numbers below count from the first PDF page unless a printed page is specified. Quotations normalize line wrapping, PDF ligatures, and typographic symbols.

## The recipes

### 1. Describe states, allowed steps, and observations

**Use for:** protocols, controllers, operating systems, and services that keep running.

A state is everything the proof needs to remember. A step describes one allowed change. Start by writing `Init(s)` for starting states and `Next(s,t)` for allowed steps. Include changes made by clients, the network, the scheduler, and failures. Decide what an outside observer can see: returned values, durable writes, packets, or API objects. A behavior starts in an allowed initial state and follows allowed steps. In TLA, it is an infinite sequence and may also repeat a state without changing the modeled variables; this is stuttering. Decide whether a deadlock is an error or permitted quiescence, and how terminal states extend to behaviors.

Keep an abstract specification small. A replicated store's public specification can be one map, even though its implementation has logs, leaders, messages, and several copies. Extra implementation details belong in a more concrete model. Sources: Lamport's TLA [S1], IronFleet [S8], Anvil [S18].

**Agent deliverable:** named state fields, initial conditions, one rule per kind of step, an observation function, and examples of allowed and forbidden behavior. An omitted environment action is an omitted case of the theorem.

### 2. Strengthen the desired safety property into an inductive invariant

**Use for:** “nothing bad happens,” such as no double ownership, no invalid access, or no conflicting committed values.

An invariant is true in every reachable state. An **inductive invariant** is also preserved by every allowed step from *any* state satisfying it. These are different requirements. The desired property may be true on reachable states yet too weak to support induction.

Find a predicate `I` and prove three obligations:

1. `Init(s) ⇒ I(s)`
2. `I(s) ∧ Next(s,t) ⇒ I(t)`
3. `I(s) ⇒ desired_property(s)`

When the second fails, inspect the troublesome predecessor. If it cannot actually arise, add the missing fact that excludes it. For a lock, “at most one holder” may need facts about transfer messages, epochs, and which messages have already been accepted. Do not delete a legitimate step to rescue the proof. Sources: TLA's invariance rule [S1], Verus state-machine invariant checks [D2].

**Agent deliverable:** separate invariant clauses, their meaning, initialization proofs, and preservation proofs for every transition. A bounded model checker can suggest missing clauses; its success does not establish induction for unbounded instances.

### 3. Relate implementation states to abstract states

**Use for:** showing that concrete code implements a simple public contract.

A **refinement** proof shows that the implementation's observed behaviors are allowed by the specification. A **refinement mapping** computes an abstract state from a concrete state. A **simulation relation** permits several possible abstract states for one concrete state. Show related initial states; then show each concrete step has a matching abstract path and preserves the relation. Internal work may match no visible change, called **stuttering**. Returned results must agree.

Try a mapping first when the abstraction is directly computable. Use a relation when a single choice is too restrictive. A **forward simulation** follows concrete steps and supplies matching abstract continuations. A **backward simulation** constrains a predecessor from a related successor; it can postpone a choice that cannot be made from the current prefix alone. Sources: Abadi–Lamport [S2], Lynch–Vaandrager [S3].

Add **history variables** to remember events the implementation has forgotten. Add **prophecy variables** to represent a future choice when matching the abstract execution requires it. These are proof devices, not executable prediction. Prove that removing the auxiliary variables leaves exactly the original allowed behaviors. Abadi–Lamport's completeness result has technical hypotheses; it does not say an arbitrary guessed mapping must work [S2, §7].

**Agent deliverable:** relation or mapping, observable agreement, initial and step simulations, and a separate progress argument if the theorem includes liveness. Safety trace inclusion alone does not rule out endless internal work. For liveness refinement, prove that internal stuttering cannot forever prevent required abstract progress under the stated assumptions.

### 4. Choose the meaning of “consistent” before proving it

**Use for:** shared data structures, replicated stores, and transactions.

**Linearizability:** each completed operation behaves as if it occurred once between its call and return. Operations that overlap may be ordered either way; an operation completed before another begins must precede it. First give the object's sequential meaning, then prove the concurrent history fits that meaning [S4]. A linearization point is the event used to assign an operation its abstract effect; difficult algorithms may need history, prophecy, or another thread's helping action.

**Sequential consistency:** require one legal sequential order preserving each process's operation order, without the same real-time constraint [S23]. **Causal consistency:** preserve cause-and-effect dependencies. **Eventual consistency:** state the circumstances under which replicas converge, plus what reads may return before convergence. These are different contracts, not interchangeable labels [S24]. CRDT proofs provide concrete convergence recipes: establish suitable merge laws or commutation laws and the required delivery conditions [S25].

For transactions, additionally choose **serializability** (equivalence to a serial transaction execution) or **strict serializability** (also preserve real-time order). Viotti–Vukolić explicitly excludes transactional semantics [S24]; use a transaction-specific primary definition before implementing such a proof.

**Agent deliverable:** allowed histories, ordering constraints, treatment of pending operations and retries, and progress conditions. Linearizability itself promises no response deadline and no eventual response.

### 5. Give each procedure a precondition and postcondition

**Use for:** functions, loops, parsing, data structures, and the implementation layer of a larger proof.

A **Hoare triple**, `{P} code {Q}`, says: if `P` holds before execution, then `Q` holds on successful termination. This is **partial correctness**. **Total correctness** additionally requires termination. Specify the changed memory, the returned result, and relevant error outcomes. Give loops an invariant and, when termination is required, a measure in a well-founded order: an order with no infinite strictly descending chain. Prove a strict decrease on every continuing iteration [S5, S21, C1].

The **verifier style** keeps contracts near executable code and asks automated solvers to discharge logical obligations. Dafny and Verus follow this approach. F* combines effects, dependent types, solver automation, and explicit proofs. Why3 routes obligations to several automated or interactive provers [S20–S22, S30–S31]. An **SMT solver** automatically reasons about logical formulas using theories such as integers and arrays.

The **proof-assistant style** defines the model, semantics, and theorem inside Coq/Rocq, Isabelle, or Lean, then builds a proof checked by the logical kernel. Automation still helps. Executable code may be extracted, related to an external language, or verified through an embedded program logic. This is a workflow distinction, not a strict partition: F* and Why3 deliberately bridge styles [S20, S22, C1–C4].

**Agent deliverable:** a contract meaningful to callers, explicit mutation footprint, loop facts, termination scope, and a record of assumptions. Never “fix” a proof by strengthening a precondition until no intended caller qualifies.

### 6. Divide memory ownership and add proof-only bookkeeping

**Use for:** pointers, aliased data, concurrent objects, locks, and ownership transfer.

**Separation logic** describes which resources a component owns. `P * Q` says both assertions hold over separate owned resources. The **frame rule** lets a proof ignore resources the command does not change. This makes a small component's proof reusable inside a larger heap [S6].

**Concurrent separation logic** assigns ownership to threads and shared resource invariants to synchronization boundaries [S32–S33]. **Ghost state** is bookkeeping used only by the proof, such as an ownership token, past operations, or a protocol phase. It needs sound rules for creation, combination, and update; it cannot be arbitrary evidence that the program did the right thing. Iris connects ghost resources to physical program state through invariants and supplies a checked framework for this reasoning [S7]. Verus tokenized state machines generate ghost token APIs and connect their use to executable operations [D2].

**Agent deliverable:** ownership split, shared invariant, permitted ghost updates, and the code event justifying each update. If the theorem assumes a memory model, say which one. Ownership reasoning alone does not specify CPU memory ordering.

### 7. Add proof layers where one proof becomes unwieldy

**Use for:** a large semantic distance between the public contract and running code.

Each layer should hide one source of complexity while retaining the observations needed by the next theorem. Compose the proved connections, rather than hoping the models describe the same system.

- **IronFleet:** public state-machine specification → distributed protocol with atomic host steps → imperative host implementation. Reduction connects fine-grained execution to the atomic model [S8]
- **CertiKOS:** specify an interface and visible events at each kernel layer; prove a module can replace its specification in permitted surrounding programs. This is **contextual refinement** [S9]
- **seL4:** abstract specification → executable design specification → C; further binary verification addresses compilation. Security theorems sit above functional correctness and add their own assumptions [S10–S11]
- **Verdi:** prove an application under an easier network model, then apply a verified system transformer that changes the implementation and transfers an appropriate property to a harder fault model [S29]
- **Civl:** express implementations and abstractions as structured programs with annotated refinement layers, interference conditions, and ownership permissions [S15–S17]
- **Anvil/Welder:** connect a controller implementation to a transition model, then prove eventual stable reconciliation under the cluster assumptions. Composition additionally states what controllers require from and guarantee to one another [S18–S19]

**Agent deliverable:** a layer diagram and theorem per edge, including what each edge preserves. A compiler or runtime connection must be an edge or an explicit assumption. IronKV's Verus port is a useful warning: its README says the distributed proof layer is omitted [D3].

### 8. Prove that small concurrent steps can be grouped

**Use for:** reducing the number of interleavings a proof must consider.

A **reduction argument** justifies reasoning about a larger atomic action. Show that selected small actions can swap past other threads' actions while preserving the observations and properties of interest. A **mover** is an action with such a leftward or rightward commuting property. Then justify moving actions together and treating the group as atomic [S17].

IronFleet enforces an I/O ordering obligation before using its reduction argument [S8, §3.6]. Civl's 2026 work supports procedures and parallel composition, but its implementation leaves specified side conditions to manual verification [S17, §7]. Preserve the exact theorem scope: a safety reduction need not preserve fairness or liveness.

**Agent deliverable:** commuting cases, interference and failure conditions, termination obligations, and the precise property transferred. “These operations are effectively atomic” is the conclusion to prove.

### 9. Make environment assumptions part of the theorem

**Use for:** every open system, especially distributed progress proofs.

Write a separate environment contract. Specify message loss, duplication, reordering, corruption and authentication; crash-stop versus restart; durable state across restart; scheduler behavior; clocks and timeouts; clients and other controllers. **Byzantine failures** allow faulty participants to act arbitrarily, including giving different information to different peers [S27]. A crash proof does not cover this fault model.

For progress, specify the fairness rule and its enabling condition. **Weak fairness** requires an action that stays enabled to eventually occur. **Strong fairness** also covers an action enabled infinitely often. State who enforces the assumption and any eventual limits on faults or delay. Fair scheduling alone may leave repeated conflicts or retries preventing success; prove that these cannot indefinitely block the required progress [S1, S19]. FLP shows why unrestricted asynchronous deterministic consensus with even one possible crash cannot promise termination in every admissible execution [S26]. Choose an assumption or algorithmic setting that makes the requested guarantee achievable. Anvil models faults and scheduling explicitly [S18]; Welder records assumptions across controllers [S19].

**Agent deliverable:** an assumption list with an owner for each assumption, failure transitions, and examples excluded by the theorem. For every progress step name weak or strong fairness, the enabling predicate, and its enforcement owner; check conflicts and retries separately. For every liveness assumption ask whether deployment can plausibly satisfy it.

### 10. Write the trust boundary beside the guarantee

**Use for:** judging what “proof succeeded” actually establishes.

The **trusted computing base (TCB)** is the code and reasoning infrastructure whose correctness the claim relies on without proving it in that development. Record the logic/checker, solver and translation pipeline, axioms, admitted lemmas, external function contracts, compiler/runtime, OS and hardware interfaces as applicable. Separately review whether the specification captures the human's intent. A proof checker can accept a theorem about the wrong requirement [S12, §4; D4].

Version the claim. A source-level proof, a model proof, and a binary proof stop at different boundaries. seL4's 2014 paper explicitly discusses its binary-verification and hardware assumptions [S10, §§4.7–4.8]. CompCert's 2009 account names unverified components such as the parser [S14]. Do not carry their historical boundaries over to current versions without checking.

**Agent deliverable:** exact theorem and tool/version/commit, assumptions, unchecked components, entry points covered, and remaining gaps. In Verus, review `assume`, `external_body`, external specifications, and externally supplied trait implementations [D4].

## A practical handoff to agents

**Recommended workflow, inferred from these methods:**

1. Restate the requested observable guarantee using allowed and forbidden examples
2. Choose a precise spec, environment model, and proof boundary before picking automation
3. Draft the state machine or procedure contracts; test small examples for omissions and contradictions
4. Build the invariant or simulation relation; make one obligation per transition or module
5. Add ghost state, ownership, or layers only when they solve a named proof difficulty
6. Connect code to the model; check the whole dependency chain
7. Report the proved statement and assumptions in plain words; preserve the source, replay command, versions, and proof artifact

Evaluate agents on **specification adequacy as well as proof acceptance**. Recommended checks: intended clients satisfy preconditions; examples exercise failures and overlap; weakening an important invariant or injecting a real bug breaks the proof; an independent reader can explain the observable guarantee; all admitted facts appear in the trust record. These are proposed evaluation checks, not a validated benchmark. Proof length and solver time alone cannot measure specification quality. Check satisfiability and non-vacuity: construct an allowed initial state and an admissible environment behavior. A contradictory or empty behavior model can make every desired conclusion provable.

## Human practice and cost

Proof engineering means organizing and maintaining proofs, not just finding a derivation. QED at Large covers foundations, automation, abstraction, reuse, and development practice [S12]. IronFleet's lessons include monotonic sent-message histories, reusable collection and parsing lemmas, first verifying functional values then mutable representations, and controlling which definitions the solver sees [S8, §6]. The Verus guide recommends extracting subproofs into lemmas and keeping their required context small [D1]. Dafny's foundational paper demonstrates how contracts and solver encodings work together [S21].

Historical cost anchors, quoted exactly below: IronFleet reports about 3.7 person-years for its methodology and two systems; seL4 reports about 20 person-years for the correctness proof, including framework work; CertiKOS reports under two person-years for supporting concurrency; CompCert reports about three person-years for that version's formalization and proof; Anvil reports around 2.5 person-months to implement and verify each controller [S8–S10, S14, S18]. These have different scopes, baselines, reuse, and counting methods. **Inference:** use them to budget proof layers and library construction, not as a universal cost per line.

AWS's account describes useful results after learning TLA+, but it concerns design specification and model checking rather than a code-refinement proof [S13]. Verus's 2024 evaluation measures verifier feedback and proof overhead, including ports and new components [S30]. **Inference:** fast feedback, reusable lemmas, stable abstraction boundaries, and incremental replay are practical requirements for agent workflows.


The seL4 process study reconstructs how design, implementation, and proof evolved together [S35]. Its effort studies distinguish observed associations from a predictive cost model [S36–S37]. Verdi's *Planning for Change* gives a concrete maintenance recipe: hide invariant definitions behind interfaces, use reusable induction principles, and write tactics that match hypothesis structure [S34]. **Inference:** agents should preserve proof interfaces while adding facts, and measure rework after changes rather than judging only the first successful proof.

## Concrete verified problems

The rows are deliberately narrow. Size/effort evidence is in the cited source cards; “not extracted” means no comparable number is asserted here.

| Problem and guarantee | Tool; team | Evidence and artifact |
|---|---|---|
| IronRSL: replicated service behaves like one sequential service; request progress under stated eventual synchrony/quorum assumptions | Dafny; Hawblitzel et al. | [S8](#s8); [source](https://github.com/microsoft/Ironclad/tree/main/ironfleet); effort shared with IronKV |
| IronKV: sharded map behavior and the paper's conditional progress guarantees | Dafny; same team | [S8](#s8); same artifact; effort shared with IronRSL |
| IronKV Verus port: host implementation conforms to its host model; distributed proof omitted | Verus; Verus project | [D3](#d3); [source](https://github.com/verus-lang/verified-ironkv); effort not extracted |
| mC2 kernel: concurrent C/assembly implements layered kernel interfaces, with conditional progress of concurrency primitives | Coq/CompCertX; Gu et al. | [S9](#s9); [official mC2 page](https://flint.cs.yale.edu/certikos/mc2.html); matching public proof-source download not recovered; concurrency effort quoted below |
| seL4: kernel implementation refines abstract specification; separate security/binary results | Isabelle/HOL; Klein et al. | [S10](#s10), [S11](#s11); [proofs](https://github.com/seL4/l4v); historical correctness-proof effort below |
| Verdi applications/transformers: preserve selected application properties while changing network/fault semantics | Coq; Wilcox et al. | [S29](#s29); [source](https://github.com/uwplse/verdi); this paper is not the later complete Raft linearizability result |
| Verdi/Raft complete result: linearizable replicated state machine, within the failure model; no unconditional termination claim | Coq; Woos et al. | [S34](#s34); [source](https://github.com/uwplse/verdi-raft); invariant-count evidence below |
| CompCert: generated assembly preserves the defined source program behavior within the theorem's scope | Coq; Leroy | [S14](#s14); [source](https://github.com/AbsInt/CompCert); historical formalization size/effort below |
| ZooKeeper controller: eventually reaches and remains in the desired cluster state under stated assumptions | Verus/Anvil; Sun et al. | [S18](#s18); [source](https://github.com/anvil-verifier/anvil/tree/osdi24); size and controller effort below |
| RabbitMQ controller: eventual stable desired state and a separate safety theorem | Verus/Anvil; same team | [S18](#s18); same artifact; size and controller effort below |
| FluentBit controller: eventual stable desired state under stated assumptions | Verus/Anvil; same team | [S18](#s18); same artifact; size and controller effort below |
| Controller composition: conditional progress plus controller safety guarantees when dependencies/relies fit | Verus/Welder; Cai et al. | [S19](#s19); [source](https://github.com/anvil-verifier/anvil/tree/sosp26); effort not extracted |
| Parallel snapshot: refines the snapshot operation specification | Civl; Gangamreddypalli et al. | [S17](#s17), §2; [samples](https://github.com/boogie-org/boogie/tree/master/Test/civl); sizes below |
| ABD register: reads/writes refine a linearizable register specification | Civl; same team | S17, §8.1; same samples; sizes below |
| FLASH cache coherence: cache operations refine atomic memory operations | Civl; same team | S17, §8.2; same samples; sizes below |
| Two-phase commit model: committed transactions do not conflict pairwise under the model's interval-based conflict definition | Civl; same team | S17, §8.3; same samples; sizes below; no general database correctness claim |

## Source cards and exact evidence

Quotations are brief to respect source quotation limits. Ellipses below do not replace hidden qualifications; the stated sections supply the full context. A quotation supports the associated point, not every recommendation in this guide.

### S1

**The Temporal Logic of Actions.** Leslie Lamport. TOPLAS 16(3), 1994, pp. 872–923. [Paper](https://lamport.azurewebsites.net/pubs/lamport-actions.pdf). A primary state/step/behavior formulation, with safety and temporal reasoning. §6.1.1, PDF p. 19: “An invariance property is expressed by a TLA formula □P, where P is a predicate.” Use for separating state predicates from properties of whole executions.

### S2

**The Existence of Refinement Mappings.** Martín Abadi and Leslie Lamport. TCS 82(2), 1991, pp. 253–284; author PDF is SRC Report 29. [Paper](https://lamport.azurewebsites.net/pubs/abadi-existence.pdf). Foundation for abstraction mappings and auxiliary variables. Abstract, PDF p. 3: “Refinement mappings are used to prove that a lower-level specification correctly implements a higher-level one.” §5 defines history/prophecy; §7's completeness theorem requires machine closure, internal continuity, and finite invisible nondeterminism. Consult those conditions before invoking completeness.

### S3

**Forward and Backward Simulations, Part I: Untimed Systems.** Nancy Lynch and Frits Vaandrager. Information and Computation 121(2), 1995, pp. 214–233. [Author report](https://groups.csail.mit.edu/tds/papers/Lynch/TM-486.pdf). Defines step relations proving inclusion of visible traces. Introduction, PDF p. 2: “simulation methods for proving trace inclusion relationships between concurrent systems.” §§3–5 distinguish mappings, forward simulations, and backward simulations; subsequent sections relate them to auxiliary state. Useful when a simple abstraction function cannot match choices.

### S4

**Linearizability: A Correctness Condition for Concurrent Objects.** Maurice P. Herlihy and Jeannette M. Wing. TOPLAS 12(3), 1990, pp. 463–492. [Paper](https://cs.brown.edu/~mph/HerlihyW90/p463-herlihy.pdf). Defines correctness using call/return histories and a sequential object contract. Abstract, p. 463: “takes effect instantaneously at some point between its invocation and its response”. §2.3 gives the formal definition; §4 treats implementation proofs. Useful for precise shared-object and service specifications.

### S5

**An Axiomatic Basis for Computer Programming.** C. A. R. Hoare. CACM 12(10), 1969, pp. 576–580, 583. [Scanned paper](https://www.cs.cmu.edu/~crary/819-f09/Hoare69.pdf). Foundational procedure/statement reasoning from assertions. §3, printed p. 577, visually checked in the scan: “the assertion R will be true on its completion.” The preceding condition requires assertion `P` before initiation of program `Q`; `R` is the postcondition. For modern notation and executable exercises see [C1](#c1). Use as the historical primary source, with modern termination distinctions made explicit.

### S6

**Separation Logic: A Logic for Shared Mutable Data Structures.** John C. Reynolds. LICS, 2002, pp. 55–74. [Paper](https://www.cs.cmu.edu/~jcr/seplogic.pdf). Local heap reasoning with separating conjunction and framing. Abstract, PDF p. 1: “its subformulas hold for disjoint parts of the heap”. §6 gives the frame rule. Useful for pointer structures whose proof should survive addition of unrelated memory.

### S7

**Iris from the ground up: A modular foundation for higher-order concurrent separation logic.** Ralf Jung, Robbert Krebbers, Jacques-Henri Jourdan, Aleš Bizjak, Lars Birkedal, and Derek Dreyer. JFP 28, e20, 2018. [Paper](https://www.mpi-sws.org/~dreyer/papers/iris-ground-up/paper.pdf). Explains the logic and its checked semantic foundations. §1.2, PDF p. 4: “Invariants serve to tie that fictional state to the underlying physical state of the program.” Useful for reusable concurrency reasoning with custom ghost resources. The paper's treatment is Iris 3.1; [current project](https://iris-project.org/) provides newer references and tutorials.

### S8

**IronFleet: Proving Practical Distributed Systems Correct.** Chris Hawblitzel, Jon Howell, Manos Kapritsos, Jacob R. Lorch, Bryan Parno, Michael L. Roberts, Srinath Setty, and Brian Zill. SOSP, 2015. [Paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2015/10/ironfleet.pdf). A layered, executable distributed proof methodology with safety and conditional liveness. §7.1, PDF p. 12: “applying it to build and verify two real systems required approximately 3.7 person-years.” §§2.5, 3.6–3.7 identify network/trust/reduction boundaries; §6 documents proof engineering. Figure 12's implementation-layer rows read “IronRSL 6 2941 7535” and “IronKV 6 1340 2937”: spec, implementation, and proof lines. Those rows omit the distributed protocol proofs listed separately. The effort is shared across both systems.

### S9

**CertiKOS: An Extensible Architecture for Building Certified Concurrent OS Kernels.** Ronghui Gu, Zhong Shao, Hao Chen, Xiongnan (Newman) Wu, Jieung Kim, Vilhelm Sjöberg, and David Costanzo. OSDI, 2016, pp. 653–669. [Paper](https://www.usenix.org/system/files/conference/osdi16/osdi16-gu.pdf). Uses contextual refinement and explicit environments at kernel layers. Introduction, printed p. 654: “The entire proof effort for supporting concurrency took less than 2 person years.” This is concurrency support, not a fresh whole-kernel cost. The introduction also reports “6500 lines of C and x86 assembly”. §5 reports specification/proof sizes and trusted hardware/interface specifications. Useful for compositional concurrent modules.

### S10

**Comprehensive formal verification of an OS microkernel.** Gerwin Klein, June Andronick, Kevin Elphinstone, Toby Murray, Thomas Sewell, Rafal Kolanski, and Gernot Heiser. TOCS 32(1), article 2, 2014. [Paper](https://trustworthy.systems/publications/nicta_full_text/7371.pdf). Details seL4's refinement, security, binary checks, assumptions, and effort. §4.5, printed p. 2:23: “the total effort of the seL4 correctness proof was about 20 py”. Here `py` means person-years; the surrounding paragraph allocates framework versus kernel-specific work. §7.2 analyzes costs; §§4.7–4.8 explain the boundary. Useful as an engineering account rather than a bare success claim.

### S11

**seL4: Formal Verification of an OS Kernel.** Gerwin Klein, Kevin Elphinstone, Gernot Heiser, June Andronick, David Cock, Philip Derrin, Dhammika Elkaduwe, Kai Engelhardt, Rafal Kolanski, Michael Norrish, Thomas Sewell, Harvey Tuch, and Simon Winwood. SOSP, 2009, pp. 207–220. [Paper](https://trustworthy.systems/publications/nicta_full_text/1852.pdf). Original source-level functional correctness result. Abstract, PDF p. 1: “formal proof of functional correctness of a complete, general-purpose operating-system kernel.” §6, PDF p. 10, reports “200,000 lines of Isabelle script” for the proof. Useful historical baseline; use S10 for the expanded stack and effort analysis.

### S12

**QED at Large: A Survey of Engineering of Formally Verified Software.** Talia Ringer, Karl Palmskog, Ilya Sergey, Milos Gligoric, and Zachary Tatlock. Foundations and Trends in Programming Languages 5(2–3), 2019, pp. 102–281. [Author PDF](https://dependenttyp.es/pdf/QEDatLarge.pdf); [errata](https://proofengineering.org/qed_errata.html). Surveys proof development, trust, automation, organization, reuse, and maintenance. §6.2, printed p. 165: “Good design principles can make proofs easier to develop and maintain.” Useful reading map for building an agent workflow that survives changes; §4.4 discusses assurance and specification adequacy.

### S13

**Use of Formal Methods at Amazon Web Services.** Chris Newcombe, Tim Rath, Fan Zhang, Bogdan Munteanu, Marc Brooker, and Michael Deardeuff. Author report, 29 September 2014; related CACM account published 2015. [Report](https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf). Industrial experience with TLA+ design models and model checking. PDF p. 3, learning paragraph: “learn TLA+ from scratch and get useful results in 2 to 3 weeks”. The report scopes this experience to engineers from entry level through principal, not every learner. Useful for early design clarification; does not establish implementation refinement.

### S14

**Formal verification of a realistic compiler.** Xavier Leroy. CACM 52(7), 2009, pp. 107–115. [Author PDF](https://xavierleroy.org/publi/compcert-CACM.pdf). Semantic preservation across compiler passes, with Coq implementation and proofs. §3.3, PDF p. 5: “42000 lines of Coq (excluding comments and blank lines) and approximately 3 person-years of work.” Scope is that historical formalization/proof. §3.4 names extraction and unverified components; §4 shows a simulation proof. Useful for preserving meaning across translations.

### S15

**Refinement for Structured Concurrent Programs.** Bernhard Kragl, Shaz Qadeer, and Thomas A. Henzinger. CAV, 2020. [Paper](https://civl-verifier.github.io/papers/cav2020.pdf). Moves refinement reasoning into structured concurrent programs. Abstract, PDF p. 1: “This paper presents a foundation for refining concurrent programs with structured control flow.”. Useful when program structure can organize proofs better than a flat transition relation.

### S16

**The Civl Verifier.** Bernhard Kragl and Shaz Qadeer. FMCAD, 2021. [Paper](https://civl-verifier.github.io/papers/fmcad2021.pdf); [documentation](https://civl-verifier.github.io/). A verifier integrating layers, interference checks, reduction, and permissions. Paper abstract, PDF p. 1: “Civl is a static verifier for concurrent programs designed around the conceptual framework of layered refinement” Useful for a single annotated program containing several proof layers.

### S17

**Reduction for Structured Concurrent Programs.** Namratha Gangamreddypalli, Constantin Enea, and Shaz Qadeer. ESOP, 2026. [Paper](https://civl-verifier.github.io/papers/esop2026.pdf). Extends reduction to procedures and parallel composition. §7, PDF p. 19: “the verification of these side conditions was done manually.” The immediately preceding sentences identify termination of left-mover procedures and absence of failures in right-mover statements. Useful recent recipe, with this concrete limitation in automated coverage. Figure 12, PDF p. 20, gives total and implementation-plus-spec lines: “Snapshot 119 82”, “ABD 389 206”, “Coherence 608 401”, and “2PC 146 111”. These include proof annotations in the total.

### S18

**Anvil: Verifying Liveness of Cluster Management Controllers.** Xudong Sun, Wenjie Ma, Jiawei Tyler Gu, Zicheng Ma, Tej Chajed, Jon Howell, Andrea Lattuada, Oded Padon, Lalith Suresh, Adriana Szekeres, and Tianyin Xu. OSDI, 2024, pp. 649–666. [Paper](https://www.usenix.org/system/files/osdi24-sun-xudong.pdf). Defines eventual stable reconciliation and proves controllers against a modeled Kubernetes environment. §7.1, printed pp. 660–661: “Implementing and verifying each controller takes around 2.5 person-months.” Table 1 breaks down trusted code, implementation, model/proof, and solver time. Its ZooKeeper total reads “Total 950 1134 8352”, in trusted/exec/proof columns. The RabbitMQ and FluentBit totals are “Total 548 1598 7228” and “Total 828 1208 8395”. The proof column includes each model. §§4–5 explain implementation conformance and progress; §7.2 identifies trusted wrappers/platform. Useful model-first controller design.

### S19

**Welder: Compositional Liveness Verification of Cluster Control Planes.** Zhizhen Cathy Cai, Nikhil Date, Jiawei Tyler Gu, Cody Rivera, Tej Chajed, Oded Padon, Tianyin Xu, and Xudong Sun. SOSP, 2026. [Author PDF](https://tianyin.github.io/pub/welder.pdf); [artifact branch](https://github.com/anvil-verifier/anvil/tree/sosp26). Extends controller reasoning to composition with dependencies. §9, PDF p. 14: AI agents with frontier models “cannot completely automate the proof of CORE”. The paper also explains that features omitted from `match` are outside its guarantee. CORE is the paper's controller-composition contract; `match` defines the desired state. Useful direct evidence that proof automation and specification coverage are separate tasks. The authors describe useful guided agent subtasks, including invariant checks and liveness-proof skeletons. PDF p. 8 additionally warns that “weak or strong fairness are insufficient to prevent such starvations by version conflict”. No effort claim is extracted here.

### S20

**Dependent Types and Multi-monadic Effects in F*.** Nikhil Swamy, Cătălin Hriţcu, Chantal Keller, Aseem Rastogi, Antoine Delignat-Lavaud, Simon Forest, Karthikeyan Bhargavan, Cédric Fournet, Pierre-Yves Strub, Markulf Kohlweiss, Jean-Karim Zinzindohoué, and Santiago Zanella-Béguelin. POPL, 2016. [Paper](https://www.fstar-lang.org/papers/mumon/paper.pdf). Combines effectful programming, contracts and dependent types. Abstract, PDF p. 1: “a language that works both as a proof assistant as well as a general-purpose, verification-oriented, effectful programming language.” Useful correction to a rigid verifier/proof-assistant split; [tutorial](https://fstar-lang.org/tutorial/book/) teaches its workflow.

### S21

**Dafny: An Automatic Program Verifier for Functional Correctness.** K. Rustan M. Leino. LPAR, 2010. [Paper](https://leino.science/papers/krml203.pdf). Presents the language, verifier, contracts, heap modeling, and solver encoding. Abstract, PDF p. 1: “used to verify the functional correctness of a number of challenging pointer-based programs.” Useful primary exposition of verifier-style reasoning; [current reference](https://dafny.org/dafny/DafnyRef/DafnyRef) and [teaching materials](https://dafny.org/teaching-material/) cover present syntax.

### S22

**Why3: Shepherd Your Herd of Provers.** François Bobot, Jean-Christophe Filliâtre, Claude Marché, and Andrei Paskevich. Boogie workshop, 2011; deposited author version 2013. [Paper](https://inria.hal.science/hal-00790310/document). Logical models and proof-task transformations targeting multiple provers. Abstract, PDF p. 2: “including SMT solvers, TPTP provers, as well as interactive proof assistants.” Useful when one automated prover is insufficient; [project](https://www.why3.org/) supplies WhyML documentation and examples.

### S23

**How to Make a Multiprocessor Computer That Correctly Executes Multiprocess Programs.** Leslie Lamport. IEEE Transactions on Computers C-28(9), 1979, pp. 690–691. [Paper](https://lamport.azurewebsites.net/pubs/multi.pdf). Primary sequential-consistency definition. Printed p. 690: “the result of any execution is the same as if the operations of all the processors were executed in some sequential order”. The next clause requires each processor's program order. Useful for distinguishing process order from linearizability's real-time order.

### S24

**Consistency in Non-Transactional Distributed Storage Systems.** Paolo Viotti and Marko Vukolić. ACM Computing Surveys 49(1), article 19, 2016. [Author PDF](https://arxiv.org/pdf/1512.00168). A definition map, not the primary origin of each model. Abstract, PDF p. 1: “The scope of this paper is restricted to non-transactional semantics”. Use its definitions and references to select a contract; do not use it as a transaction serializability source.

### S25

**A comprehensive study of Convergent and Commutative Replicated Data Types.** Marc Shapiro, Nuno Preguiça, Carlos Baquero, and Marek Zawirski. INRIA RR-7506, 2011. [Report](https://inria.hal.science/inria-00555588/document). Gives convergence proof conditions for state- and operation-based replicated objects. Title, PDF p. 2: “Convergent and Commutative Replicated Data Types”. §§2–3 develop the assumptions and sufficient conditions. Useful for proving a precise convergence contract rather than calling a design “eventually consistent.”

### S26

**Impossibility of Distributed Consensus with One Faulty Process.** Michael J. Fischer, Nancy A. Lynch, and Michael S. Paterson. JACM 32(2), 1985, pp. 374–382. [Paper](https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf). Limits termination guarantees for deterministic consensus in the paper's asynchronous model. Abstract, p. 374: “the possibility of nontermination, even with only one faulty process.” Useful for rejecting an impossible requested theorem and identifying needed changes to assumptions.

### S27

**The Byzantine Generals Problem.** Leslie Lamport, Robert Shostak, and Marshall Pease. TOPLAS 4(3), 1982, pp. 382–401. [Paper](https://lamport.azurewebsites.net/pubs/byz.pdf). Defines malicious/conflicting participants and distinguishes message assumptions. Abstract, p. 382: “malfunctioning components that give conflicting information to different parts of the system.” Useful for formulating the adversary. Threshold claims depend on the paper's particular message and synchrony assumptions; no generic threshold is inferred here.

### S28

**Formal methods: Practice and experience.** Jim Woodcock, Peter Gorm Larsen, Juan Bicarregui, and John Fitzgerald. ACM Computing Surveys 41(4), article 19, 2009. [Author institution record](https://pure.york.ac.uk/portal/en/publications/formal-methods-practice-and-experience/); [DOI](https://doi.org/10.1145/1592434.1592436). Industrial survey across specification/design and verification. Record abstract: “concentrating on their increasing use at the earlier stages of specification and design.” Useful industrial context; full text was unavailable, so no cost or success-rate claim is taken from it.

### S29

**Verdi: A Framework for Implementing and Verifying Distributed Systems.** James R. Wilcox, Doug Woos, Pavel Panchekha, Zachary Tatlock, Xi Wang, Michael D. Ernst, and Thomas Anderson. PLDI, 2015, pp. 357–368. [Author paper](https://jamesrwilcox.com/verdi.pdf); [artifact](https://github.com/uwplse/verdi). Existing collection PDF read. Introduction, printed p. 357: “A verified system transformer includes a proof that the new system satisfies properties analogous to those of the original system.” Useful for separating application reasoning from fault-tolerance machinery. §3 lists network semantics and the TCB. Later Raft results should be cited separately.

### S30

**Verus: A Practical Foundation for Systems Verification.** Andrea Lattuada, Travis Hance, Jay Bosamiya, Matthias Brun, Chanhee Cho, Hayley LeBlanc, Pranav Srinivasan, Reto Achermann, Tej Chajed, Chris Hawblitzel, Jon Howell, Jacob R. Lorch, Oded Padon, and Bryan Parno. SOSP, 2024. [DOI](https://doi.org/10.1145/3694715.3695952); [project](https://github.com/verus-lang/verus). Existing collection PDF read. §3, PDF p. 5: “The developer still writes an inductive invariant, but the invariant is checked completely automatically”. Context is the paper's EPR-enabled method, not arbitrary invariant discovery or checking. Useful agent boundary: humans/agents choose the invariant; automation checks an applicable encoding. §6 and Figure 9 report component-level evaluation.

### S31

**Verus: Verifying Rust Programs using Linear Ghost Types.** Andrea Lattuada, Travis Hance, Chanhee Cho, Matthias Brun, Isitha Subasinghe, Yi Zhou, Jon Howell, Bryan Parno, and Chris Hawblitzel. OOPSLA, 2023. [DOI](https://doi.org/10.1145/3586037); [project](https://github.com/verus-lang/verus). Existing collection PDF read. Title, PDF p. 1: “Verifying Rust Programs using Linear Ghost Types”. Useful foundation for connecting erased proof resources to Rust ownership and imperative code. Read with D2 for the concrete state-machine recipe.

### S32–S33

**Resources, concurrency, and local reasoning.** Peter W. O'Hearn. TCS 375(1–3), 2007, pp. 271–307, following CONCUR 2004. [DOI](https://doi.org/10.1016/j.tcs.2006.12.035). **A semantics for concurrent separation logic.** Stephen Brookes. Same volume, 2007, pp. 227–270. [DOI](https://doi.org/10.1016/j.tcs.2006.12.034). Original CSL reasoning and soundness sources. Metadata verified; attempted author PDFs failed. No full-text quotation or numerical claim is extracted. S7 §§1.1–1.2 explains and cites their foundations, but is a secondary source for their historical contributions.

### S34

**Planning for Change in a Formal Verification of the Raft Consensus Protocol.** Doug Woos, James R. Wilcox, Steve Anton, Zachary Tatlock, Michael D. Ernst, and Thomas Anderson. CPP, 2016. [Paper](https://homes.cs.washington.edu/~mernst/pubs/raft-proof-cpp2016.pdf). Completes the Raft safety invariants needed for Verdi's end-to-end linearizability proof and describes maintenance techniques. Abstract, PDF p. 1: “This proof required iteratively discovering and proving 90 system invariants.” The introduction distinguishes the earlier conditional proof from this completed proof. Useful evidence for invariant discovery and proof interfaces. §§3–5 explain planning for changes rather than merely adding proof text.

### S35

**Large-Scale Formal Verification in Practice: A Process Perspective.** June Andronick, Ross Jeffery, Gerwin Klein, Rafal Kolanski, Mark Staples, He (Jason) Zhang, and Liming Zhu. ICSE, 2012, pp. 1002–1011. [Paper](https://trustworthy.systems/publications/nicta_full_text/5396.pdf). Reconstructs seL4's overlapping design/code/proof and maintenance process from project records. Abstract, PDF p. 1: “complete access to project logs, meeting notes, and version control data over its entire history”. Useful for organizing agent tasks around proof dependencies. The process begins from an executable design and develops both its abstraction and concrete implementation, rather than assuming one strictly linear pipeline.

### S36

**Productivity for Proof Engineering.** Mark Staples, Ross Jeffery, June Andronick, Toby Murray, Gerwin Klein, and Rafal Kolanski. ESEM, 2014. [Paper](https://trustworthy.systems/publications/nicta_full_text/8105.pdf). Retrospective size/effort study of seL4-related developments. Abstract, PDF p. 1: “We find strong linear relationships between effort and proof size for projects and for individuals.” The paper discusses limitations of proof lines as a measure. Useful empirical cost evidence with a particular project population, not a universal conversion from proof lines to hours.

### S37

**Empirical Study Towards a Leading Indicator for Cost of Formal Software Verification.** Daniel Matichuk, Toby Murray, June Andronick, Ross Jeffery, Gerwin Klein, and Mark Staples. ICSE, 2015. [Paper](https://trustworthy.systems/publications/nicta_full_text/8318.pdf). Studies the relationship between formal statement size and proof size in Isabelle developments. §IX, PDF p. 10: “the investigation did not yield a predictive model as the precise relationship changes between proofs.” Useful limitation when estimating agent effort: an observed correlation does not establish a transferable forecasting model.

## Documentation and learning routes

### D1

**Verus Tutorial and Reference: Breaking proofs into smaller pieces.** Verus contributors; living documentation, checked October 2026. [Chapter](https://verus-lang.github.io/verus/guide/breaking_proofs_into_pieces.html). “one can improve solver performance by breaking that function down into smaller pieces.” The “Moving a subproof to a lemma” section gives the concrete recipe. Useful for isolating dependencies and shrinking solver context. I did not find a current guide chapter specifically named “structuring system proofs”; this chapter plus D2 and S8 supply the verified matching material.

### D2

**Verus State Machines Tutorial and Reference.** Verus contributors; living documentation, checked October 2026. [Full book](https://verus-lang.github.io/verus/state_machines/print.html). “High-Level Concepts”: “Create an ‘abstraction’ of the program as a tokenized state machine.” “Proving the inductive criteria” explains checks for each initializer and transition; the counter example shows why a stronger invariant is needed. Useful direct implementation recipe for agents. The quote preserves wording, with typographic quote marks normalized.

### D3

**verified-ironkv README.** Verus project contributors; living repository, checked October 2026. [README](https://github.com/verus-lang/verified-ironkv). Overview: “This repository doesn't replicate that layer of proof, instead focusing on the implementation-level reasoning.” Context: “that layer” is IronFleet's host-model-to-distributed-high-level-spec proof. Useful explicit scope boundary; the repository supplies implementation/spec design examples, not a replacement for every IronFleet layer.

### D4

**Verus: Assumptions and trusted components.** Verus contributors; living guide, checked October 2026. [Chapter](https://verus-lang.github.io/verus/guide/tcb.html). Opening: “the ultimate correctness of the code is dependent not just on verification but on the assumptions being made.” Names mechanisms that introduce assumptions and explains external trait caveats. Useful trust audit checklist grounded in the actual tool.

### C1

**Software Foundations, Programming Language Foundations: Hoare Logic.** Benjamin C. Pierce and the Software Foundations contributors; living course. [Chapter](https://softwarefoundations.cis.upenn.edu/plf-current/Hoare.html). “Hoare Triples”: “If command c begins execution in a state satisfying assertion P”. The next two clauses condition the result on termination and require the final state to satisfy `Q`. Useful executable exercises for contracts and partial correctness, alongside S5.

### C2

**Programming and Proving in Isabelle/HOL.** Tobias Nipkow; author tutorial, PDF dated 18 January 2026. [Tutorial](https://isabelle.in.tum.de/doc/prog-prove.pdf). Title: “Programming and Proving in Isabelle/HOL”. Gives inductive definitions, recursive functions, automation, and structured proofs. Useful short entry to assistant-style modeling.

### C3

**Theorem Proving in Lean 4.** Jeremy Avigad, Leonardo de Moura, Soonho Kong, and Sebastian Ullrich; living book. [Book](https://lean-lang.org/theorem_proving_in_lean4/). Title: “Theorem Proving in Lean 4”. Useful foundation in propositions, inductive types, tactics, and checked proofs; not a ready-made distributed-system verification methodology.

### C4

**Certified Programming with Dependent Types.** Adam Chlipala. MIT Press, 2013; living author edition. [Book](http://adam.chlipala.net/cpdt/). Title: “Certified Programming with Dependent Types”. Useful Coq proof automation, abstraction, and executable certified programs.

**Suggested order, my recommendation:** C1 for procedure proofs; S1 and S8 for state machines and layers; S2–S3 for refinement; S6–S7 and D2 for concurrent ownership; S12 and S10 for large-proof engineering. Follow the Dafny/F*/Why3 teaching links when choosing those tools. Iris's project page has lectures and hands-on proof-mode tutorials [S7].

## Search record and remaining gaps

Searched with the web tool first; it failed with an HTTP 404 at `/alpha/search`. Google HTTP search returned a JavaScript challenge; DBLP connections reset; arXiv search endpoints returned rate limits. Continued through author pages, USENIX, Crossref, GitHub raw files, institutional publication indexes, and publisher records. Search terms covered refinement/history/prophecy, forward/backward simulation, QED at Large, industrial formal-methods practice, Civl, Anvil, Verus system-proof structuring, IronKV, and seL4 effort. HTTP source snapshots and extracted paper text are in [research_verified/formulation](/ssd1/sichangheagent/verus_distributed/lit_b/research_verified/formulation/).

Read the methodological sections and relevant limitations/effort sections of the main papers, rather than counting an abstract as a full-paper reading. All saved PDFs were checked for `%PDF`; an incorrect guessed arXiv ID and an unrelated guessed seL4 publication were rejected before collection intake. Author seL4 PDFs had leading whitespace before `%PDF`; intake removed that whitespace. Existing PDFs were reused. DOI metadata and paper front matter distinguish dates and venues; no guessed URL establishes a paper's identity.

Specific gaps: full text of Woodcock et al., O'Hearn, and Brookes was not recovered; Hoare's scanned PDF required visual reading; no current guide chapter named “structuring system proofs” was found; controller-composition effort was not extracted; transaction-specific serializability sources and detailed crash/storage logics are outside this slice's completed source set. Current Dafny team retrospective coverage is limited to the foundational paper, IronFleet lessons, and teaching materials. A lessons-learned primary account for every named team was not found separately. No validated evaluation protocol establishes that agents can infer a sufficient specification from arbitrary vague prose.

This report is the requested workspace note. The human-notes directory mentioned in the brief is outside the permitted write roots, so no second copy was written there.
