# Hermes: Unlocking Security Analysis of Cellular Network Protocols by Synthesizing Finite State Machines from Natural Language Specifications
(authored by agents unless marked 🧑)
Tag: `alishtiaq2024hermes`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/al-ishtiaq)

## what the paper proves or measures

Hermes turns cellular standards written in natural language into communicating finite-state machines (FSMs), then checks the FSMs with nuXmv and validates counterexamples with the specification and ProVerif. Its components are NEUTREX, IRSynthesizer, and FSMSynthesizer. The abstract says: “Our security analysis of the extracted models uncovers 3 new vulnerabilities and identifies 19 previous attacks in 4G and 5G specifications, and 7 deviations in commercial 4G basebands.” (Abstract, p. 4445.)

The paper measures extraction accuracy, attack coverage, and implementation deviations. End-to-end Hermes FSMs reach 81.14–87.21% action/condition accuracy against manually built gold FSMs for selected 4G/5G NAS procedures (Table 4, p. 4454; Section 8.3, pp. 4454–4455). Appendix A includes start states in conditions and end states in actions. Its scores measure matched condition terms, also conditioned on action presence for action accuracy; they are not percentages of wholly correct transitions (p. 4462). In the security evaluation, the authors correct model errors using counterexamples, identify 19 prior and 3 new vulnerabilities, and manually verify feasibility. Inference: the security claims are conditional on the extracted model, its manual repair, the chosen LTL properties, and the scope of the specification documents.

## technique 1: nested grammar and neural transition-component extraction

what it is: identify nested spans for start state, end state, conditions, and actions in each specification paragraph. Hermes defines a control-block grammar and trains NEUTREX, a constituency parser with a domain-specific CellulaRoBERTa embedding model.

when to use: Inference: use this when natural-language rules contain nested conditions, actions, and state changes whose relationships cannot be captured by flat entity tagging.

how to do it:
1. Define a grammar with `<control>`, `<start_state>`, `<end_state>`, `<condition>`, and `<action>` tags; permit nested control blocks, nested conditions, and conditions within action spans (Section 4.1, p. 4449).
2. Manually annotate representative specification documents. Hermes annotates 4G NAS Release 16, 5G NAS Release 17, and 5G RRC Release 17; about 16,000 datapoints required about 2,800 person-hours, with four cellular researchers annotating and two domain experts verifying (Section 7, pp. 4453–4454).
3. Pretrain CellulaRoBERTa from more than 22,000 cellular documents, cleaned by removing headers, footers, non-ASCII characters, tables, and figures (Section 4.3, p. 4450).
4. Use NEUTREX’s two-stage parsing workflow: biaffine span scoring and CKY bracketing, then labeling each span with the grammar labels (Section 4.2, pp. 4449–4450).
5. Weight label loss more heavily during early training, then set equal weights. The paper uses `λ1=0.1, λ2=0.9` initially and `λ1=λ2=0.5` later, for 200 epochs, selecting the best model on a held-out development set (Section 7, p. 4453).

Verus form: Inference: this NLP pipeline is outside Verus. Its output should be treated as an untrusted candidate FSM. Inference: represent the candidate as a Rust or ghost transition datatype, review its correspondence to the source specification, and separately prove that the Rust implementation refines the reviewed model.

evidence: Table 2 reports labeled span F1 scores of 65.20%, 68.20%, and 68.69% for its three cellular train/test settings (p. 4454). Section 8.3 explains the higher end-to-end scores: “In these cases, the rest of the framework is robust enough to capture the logical meanings of the identified TCNL s and correctly produce the transitions.” (p. 4455.) Span F1 and the action/condition match scores in Table 4 measure different things.

limits and assumptions: the dataset is cellular-specific and manually labeled. Hermes does not resolve underspecification or conflicts across documents. Inference: training accuracy cannot establish that a safety-critical transition was not omitted.

## technique 2: domain-specific intermediate language and type-guided translation

what it is: translate extracted natural-language transition components (TCNLs) into a typed intermediate representation (TCIR) through a DSL rather than directly generating unrestricted logic. The DSL supplies commands, argument positions, and types for messages, agents, channels, variables, timers, counters, and state updates.

when to use: Inference: use an intermediate language when natural language has many equivalent word orders and no large corpus of direct text-to-logic annotations.

how to do it:
1. Define DSL commands for actions and conditions, extracting action verbs as command names with a parts-of-speech tagger, identifying their arguments, and manually defining output logical forms and an interpreter (Section 5.1, p. 4450).
2. Extract domain keywords and assign types such as agent, message, channel, and timer using automated extraction plus manual typing; link identifiers to single-token keywords using Levenshtein distance (Section 5.2, p. 4450).
3. Parse each TCNL with a dependency tree. Move logical operators above their connected tokens using post-order traversal. IRTranslator then matches a DSL command and recursively resolves arguments using dependency relations and keyword types (Sections 5.3–5.4, pp. 4451–4452).
4. Normalize different sentence orders to the same AST. The paper’s example maps variants of “auth_reject or tau_reject” to channel assertions using type and syntactic information (Section 5.4, p. 4452).
5. Resolve omitted arguments by searching the control block, paragraph, and previous paragraphs with heuristic backtracking (Section 5.4, p. 4452).
6. Represent “may”, “should”, and “can” directives with uniform random variables so automated reasoning explores possible choices nondeterministically (Section 5.4, p. 4452).

Verus form: Inference: use Rust enums for typed DSL commands and verified conversion functions whose `ensures` clauses preserve argument types and Boolean meaning. Inference: unresolved context should become an explicit proof obligation or review item, not an implicit guess. Inference: a Verus `spec fn` can define the transition semantics after translation.

evidence: given human-annotated TCNLs, the synthesizers score 92.23–94.45% on the action/condition metrics against gold FSMs (Table 4, p. 4454). Section 5.4 reports “totaling 94 DSL commands provided in [8]” (p. 4452). The logical forms are hand-defined: “Finally, we manually define the output logical forms for each DSL rule and implement an interpreter to generate them.” (Section 5.1, p. 4450.)

limits and assumptions: a DSL cannot express every operation. The authors note that “limitations in our logical abstraction do not allow us to model some actions, e.g., list modifications (adding or removing).” (Section 5.4, p. 4452). Inference: omitted DSL constructs create false security confidence if the missing operation affects authentication, counters, or key state.

## technique 3: compile IR components into complete communicating FSMs

what it is: FSMSynthesizer combines TCIRs into transitions and partitions them into one FSM per participant. Each FSM is `F = ⟨S,S0,T⟩`, with states, an initial state, and transitions; channels connect participants (Section 3.1, p. 4447).

when to use: Inference: use this to obtain a machine-checkable model from many local transition statements while preserving logical relations among conditions, actions, and states.

how to do it:
1. Group TCIRs by control block.
2. Combine conditions connected by `and`, `or`, and `not` from the constituency tree.
3. Select start and end states from state IRs. If no end state is mentioned, retain the current state (Section 6, p. 4452).
4. Merge transitions with the same start state and equivalent conditions by combining their actions. If condition C1 implies C2 but they are not equivalent, add T2’s actions to T1 and replace T2’s condition with C2 and not C1 (Section 6, p. 4453).
5. Recover missed actions by scanning untagged text in control blocks for action verbs and DSL arguments, then translating matches to IR (Section 6, p. 4453).
6. Compile all transitions from the document and partition them by participant. Run consistency checks and emit a Graphviz-like FSM whose guards and actions are propositional logic, suitable for nuXmv (Section 8.4, p. 4455).

Verus form: Inference: define a Rust transition relation over typed states and prove that every compiled transition preserves state invariants. Inference: keep the generated FSM as a specification artifact; executable Rust should refine it through a proof that each branch implements one allowed transition.

evidence: the generated FSMs include 13 services and 11 modes, plus counters, sequence numbers, timers, message fields, and protocol behavior (Section 5.4, p. 4452). Section 8.3 reports: “However, despite the efforts in IRSynthesizer and FSMSynthesizer, we find that 16 transitions are missing in MHermes .” (p. 4455; error breakdown in Table 7, p. 4456.)

limits and assumptions: Hermes analyzes one document at a time in its experiments; procedures spanning several standards remain partial (Section 10, p. 4459). Section 5.4 states: “However, compared to prior works [14, 29, 64, 71], Hermes does not model interactions among multiple base stations or multiple network functions in the core network.” (p. 4452.) Inference: the resulting FSM is a partial model unless all referenced documents and entities are included.

## technique 4: adversary-instrumented model checking and counterexample-guided refinement

what it is: translate FSMs to nuXmv, add a Dolev–Yao attacker that can drop, modify, inject, or replay messages, and check LTL security properties. Validate each counterexample against the standard, repair erroneous transitions, and repeat. Remaining traces are modeled in ProVerif to test cryptographic feasibility.

when to use: Inference: use this when an automatically extracted FSM is imperfect but useful for finding candidate attacks, and when model checker traces can expose both protocol flaws and extraction errors.

how to do it:
1. Transpile the FSM to nuXmv and instrument each communication channel with Dolev–Yao actions (Section 8.4, p. 4455).
2. State prior and new security properties in LTL.
3. Run nuXmv. A violating trace contains message exchanges and internal variable updates.
4. Compare the trace with the original specification. If a transition is wrong, correct it and rerun; the authors call this counterexample-guided model refinement (Section 8.4, p. 4455).
5. Manually encode remaining counterexamples in ProVerif to check feasibility under cryptographic assumptions (Section 8.4, p. 4455).

Verus form: Inference: use nuXmv traces as candidate Rust test sequences and proof obligations. Inference: encode the FSM as a Verus transition system, prove each Rust handler refines an allowed transition, and prove safety properties as inductive invariants; this does not establish arbitrary LTL liveness properties. Inference: Verus will not validate an NLP-generated transition; the refinement proof and specification review are the trusted boundary.

evidence: the authors check 20 prior and 7 new LTL properties over 4G NAS, 5G NAS, and 5G RRC FSMs (Section 8.4, p. 4455). The analysis identifies 19 previous and 3 new vulnerabilities, corrects 47 transitions, and finds 8 erroneous nuXmv counterexamples during refinement (Section 8.4, p. 4456). The authors state: “We correct 47 transitions to refine the model through the counterexample-guided refinement process.” (Section 8.4, p. 4456.) These counts concern the evaluated releases.

limits and assumptions: the model checker can produce spurious traces because the FSM is imperfect. The paper reports five spurious counterexamples in the unannotated 5G NAS Release 15 analysis (Section 8.5, pp. 4457–4458). Inference: no attack count should be treated as confirmed until specification and cryptographic feasibility checks pass.

## technique 5: implementation conformance and efficiency checks

what it is: compare the Hermes 4G NAS FSM with FSMs of nine baseband implementations using DIKEUE’s equivalence checker, and measure extraction, checking, and manual-validation costs.

when to use: Inference: use this to detect implementation deviations from a formal specification model and to estimate whether automated extraction reduces recurring maintenance effort.

how to do it:
1. Run DIKEUE between the Hermes FSM and each implementation FSM.
2. Manually inspect discrepancies; separate true deviations from false positives caused by an imperfect Hermes model.
3. Record which deviations are detected by both tools and which require multi-document context.
4. Measure each pipeline stage on the stated hardware.

Verus form: Inference: represent the implementation and abstract FSM as two transition systems and prove a refinement or trace-inclusion relation. Inference: failed refinement should identify a concrete input trace for Rust debugging, while a passing relation remains conditional on the abstract FSM’s completeness.

evidence: Hermes identifies 7 implementation deviations also found by DIKEUE; DIKEUE finds 2 additional deviations caused by conflicts between separate documents, and Hermes yields 3 false positives that the authors manually verify (Section 8.6, p. 4458). The authors state: “In addition, due to imperfect FSM, we face 3 false positive deviations, which we manually verify.” (Section 8.6, p. 4458.) Table 10 reports NEUTREX training of 4 h 3 min and 4 h 9 min, prediction of 16–42 s per document, formal checking of 67–117 s, and counterexample verification of 2 h 34 min to 6 h 16 min (p. 4458). Section 8.7 specifies an NVIDIA RTX A6000 for NEUTREX training/prediction and an Intel Core i7-10610U with 48 GB RAM for keyword extraction; it does not identify the hardware for every remaining stage.

limits and assumptions: manual keyword typing, DSL extension, property definition, and counterexample analysis remain necessary (Section 10, p. 4459). Inference: the system reduces model construction effort but does not remove expert review.

## what is proved, what remains trusted, and product threat

Hermes checks LTL properties of generated finite-state models with nuXmv and manually models remaining counterexamples in ProVerif to assess cryptographic feasibility (Section 8.4, p. 4455). Inference: these checks do not establish sound extraction, complete coverage of standards, or correctness of arbitrary implementations. For end-to-end assurance, the dependencies include the grammar, annotation quality, CellulaRoBERTa/NEUTREX predictions, DSL and context heuristics, FSMSynthesizer, model-checker semantics, manually chosen LTL properties, and the human validation process.

The paper distinguishes its evaluation gold FSMs from an official standard: “However, 3GPP does not provide any such FSM for cellular protocols.” (Section 10, p. 4459.) Inference: for agent-written verified Rust, Hermes’s central product threat is specification extraction error: an agent can omit a transition, infer an argument from context incorrectly, or encode an optional requirement as mandatory, after which Verus may prove the wrong model. Inference: keep extraction untrusted, review the abstract model, and prove that concrete Rust transitions refine it. This proof still depends on the reviewed model representing the intended requirements.

Inference: VL need not recreate the cellular NLP pipeline unless it needs that domain. Reusable ideas are typed intermediate representations, explicit treatment of “may/should/can” as nondeterminism, adversary-instrumented model checking, and counterexample-guided model repair. Inference: VL should adapt these as a front end for Rust protocol specifications only when it can preserve exact source spans and require a human-reviewable mapping for every transition.

## techniques for the catalog

- nested transition extraction — parse natural-language conditions, states, and actions with a domain grammar and constituency model
- typed DSL translation — map varied text to stable logical commands using dependency trees and argument types
- FSM synthesis — compile intermediate components into participant FSMs, channels, guards, and actions
- adversary-instrumented checking — add Dolev–Yao drop, modify, inject, and replay actions and check LTL properties
- counterexample-guided refinement — validate traces against specifications, repair transitions, and repeat model checking
- implementation conformance comparison — compare extracted FSM traces with implementations and manually classify deviations
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "A counterexample from nuXmv is basically a trace of message exchanges and internal variable updates leading to the violation of the property."): checked the full paper, quotations, numbers, references, technique steps, and limitations; corrected the abstract quote, page and section references, accuracy interpretation, training description, synthesis steps, timing claims, and inference labels; did not reproduce experiments or inspect external artifacts.
