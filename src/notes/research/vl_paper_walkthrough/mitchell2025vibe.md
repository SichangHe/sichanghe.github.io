# Position: Vibe Coding Needs Vibe Reasoning: Improving Vibe Coding with Formal Verification
(authored by agents unless marked 🧑)
Tag: `mitchell2025vibe`, [paper](https://doi.org/10.1145/3759425.3763390)

## what the paper claims

The paper is a position paper about adding a formal-verification side-car to iterative LLM coding. Its central proposal has four parts: autoformalize application requirements, validate the resulting targets against code, return actionable verifier feedback to the coding model, and let the developer control the targets. The authors call this Type III Vibe Reasoning. They contrast it with Type I systems, which reject outputs and return counterexamples, and Type II systems, which constrain or post-process generation so that outputs satisfy a specification.

The motivation is accumulated natural-language constraints. The paper identifies constraint inconsistency, partial-propagation bugs across modules, state-machine divergence, and duplication debt (section 2, PDF p. 2). It argues that tests and memory do not reliably reconcile those constraints. Its concrete security evidence is a cited evaluation of 318 repository programs in which the strongest model produced secure and correct code for 28%; that denominator and setting belong to the cited benchmark, not to an experiment performed in this paper (section 1, PDF p. 1). The authors state the intended loop plainly: “We advocate for a side-car system throughout the vibe coding process which: (1) Autoformalizes specifications (2) Validates against targets, (3) Delivers actionable feedback to the LLM, and (4) Allows intuitive developer influence on specifications.” (Abstract, PDF p. 1)

Inference: For VeruLaw, this is a product architecture claim rather than a measured result. A Verus side-car could maintain contracts and proof obligations while the coding agent edits Rust, but the paper does not show that Verus can infer the right contracts from arbitrary natural language.

## technique 1: classify the verifier loop

Type I uses a formal method to filter candidates and send feedback such as a counterexample back to the LLM until a valid candidate is reached. Type II uses formal methods to post-process or constrain output so that it satisfies the specification by construction (section 3.1, PDF pp. 2–3). Type III is the paper's proposed system, in which formal methods are incorporated "in a way such that human involvement becomes collaborative, rather than an overhead cost" (section 3.1, PDF p. 3). Its integration step feeds verifier feedback to the LLM as Type I does and may invoke Type II techniques if the LLM cannot fix the code (section 4.3, PDF p. 4). The Type III side-car is organized as (1) autoformalizing specifications, (2) continuous verification, and (3) integration of human and verifier feedback (section 4, PDF p. 3). The paper says, “Each block in Figure 3b denotes an event (e.g., requesting user feedback on a verification target or autoformalizing a specification). Red arrows represent failures (e.g., failure to verify), and communicate that information to various parts of the system.” (section 4, PDF p. 3)

Inference: How to apply it: (1) keep the coding agent and verifier as separate components; (2) have the side-car create or update a target when code changes; (3) run the lightest suitable check; (4) route a failure to a repair prompt or a constrained transformation; and (5) expose the proposed target and change to the developer. The three component names are in section 4; the explicit numbered procedure is an implementation inference from that architecture.

Inference: Verus form: use Rust `requires` and `ensures` on executable functions, `invariant` clauses on loops, and `assert` or proof functions for intermediate facts. The side-car can ask the model to propose these annotations, run Verus, and feed diagnostics back into the next edit. Inference: Type I maps most directly to Verus counterexample-driven repair; Type II could select a verified library implementation or a proof-preserving rewrite. Verus annotations remain source-level promises and must not be placed on `spec fn` as executable contracts.

Inference: Evidence and limits: the paper supplies the architecture and related work, not a Type III benchmark. It therefore proves no soundness or productivity claim for the side-car. Inference: the trusted base includes Verus, its solver, Rust compilation, the generated contract, and the developer’s acceptance of that contract.

## technique 2: autoformalize with scope/spec templates

The proof-of-concept represents each target as a pair: Scope identifies code locations, and Spec states the desired property (section 5, PDF p. 5). The authors use four templates.

* Exhaustive Switch: require that switch cases equal union members or that a default calls `assertNever`; TypeScript then rejects a newly added variant if handling is incomplete. The paper gives `export function assertNever(x: never): never { throw new Error(...) }` and says, “The goal of Exhaustive Switch is to prevent silent failures when union types are extended, to enforce exhaustive handling of union types across the codebase, and ensure that future buggy variants fail quickly.” (section 5, PDF p. 5)
* Discriminated Union: find comparisons on a string field such as `action.type`, create a union containing observed values, and replace comparisons with a switch over the union. The example uses `ADD_TODO`, `REMOVE_TODO`, and `TOGGLE_TODO` (section 5, PDF p. 5).
* Union Alias: centralize semantically related strings in a union such as `MessageType = 'info' | 'warning' | 'error'`, then annotate producers and consumers with that type (section 5, PDF p. 5).
* `satisfies` Guard: for a finite-key object map, require `Record<K,V>` and successful compilation so keys and values are checked (section 5, PDF p. 5).

Inference: How to apply it: identify a recurring bug pattern, bind its locations and observed values into Scope, instantiate the Spec, run syntax and compilation checks, and present the proposed change. The paper says the LLM instantiates templates and that verification currently uses “lightweight syntactic checks and compilation success” (section 5, PDF p. 5). Inference: this method is useful when a product needs fast, local checks before attempting a full functional proof.

Inference: Verus form: encode a finite-state API with an enum rather than string tags, and use exhaustive `match` in executable Rust. Add `requires`/`ensures` for map-domain and value properties, and use a `spec fn` to describe a finite map only when a mathematical view is needed. Inference: unlike TypeScript’s compiler check, Verus must prove the contract and does not automatically discover every cross-module producer and consumer.

## technique 3: continuous verification and human integration

The side-car chooses tools and scale according to development speed. The paper directs it to focus on core components, prefer lightweight analyses, and prioritize important targets (section 4.2, PDF p. 3). Developers can weigh cost and stop a check (section 4.2, PDF p. 4) or relax a specification to a soft constraint (section 4.3, PDF p. 4). Integration feeds verifier feedback to the LLM, and if a Type I repair fails, Type II transformations may be selected (section 4.3, PDF p. 4). The authors warn that one repair can regress another and propose incorporating checks into the build process.

Inference: Verus form: run `verus` on changed modules in the fast loop, retain a broader proof build for release, and preserve all affected contracts as regression obligations. Inference: soft constraints should be represented as suggestions outside the proof, because a weakened Verus `ensures` changes what is proved. Human review should approve specification changes and any relaxation.

## proof-of-concept evidence

The prototype integrates with Claude Code through hooks on code changes. It targets a TypeScript order-status toy example (Listing 1, section 5, PDF p. 4). The paper says LLM edits adding `shipped` and `cancelled` leave `OrderBadge` without a `shipped` case and `processOrder` without a `cancelled` action, and that the Exhaustive Switch spec "is capable of detecting the bugs in the code of Listing 1" (section 5, PDF p. 5). The paper reports that the prototype “can emit the lines in red in Listing 1, flagging and fixing both bugs.” (section 5, PDF p. 5) No sample count, success denominator, latency, or comparison is reported. The result is therefore a demonstration, not an evaluation.

Inference: the direct product threat is substantial because the architecture assumes that generated specifications match intent. A verifier can prove a wrong or incomplete contract. The paper itself says LLM-generated specifications may not align with developer intent and recommends approval, rejection, or revision (section 4.1, PDF p. 3). VeruLaw should therefore preserve the natural-language target, generated Verus contract, proof diagnostics, and human decision as separate review artifacts.

## what remains trusted and what VL should not redo

The paper’s contribution is the developer-first side-car framing, four concrete template shapes, and a TypeScript hook prototype. It does not provide a Verus implementation, a contract-accuracy benchmark, a proof-completeness study, or measured Type III reliability. Inference: VL need not re-propose the generic three-part loop; it should test the missing engineering questions: contract alignment, regression across edits, proof latency, and human acceptance rates. The paper’s Type I/II taxonomy is also useful as existing prior art for describing VL’s repair and generation modes.

## techniques for the catalog

- type iii side-car: autoformalize targets, verify continuously, return actionable feedback, and keep the developer in control
- scope/spec templates: bind code locations and desired properties before instantiating a recurring check
- exhaustive state checks: encode finite variants and reject unhandled cases at compile or proof time
- continuous verification: choose lightweight checks for changed critical components and escalate when needed
- human specification review: show target meaning, impact, and trade-offs so developers approve or revise contracts
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Verification techniques that are too slow may be undesirable. The system must make trade-offs by focusing on core components, preferring lightweight analyses when possible, and prioritizing the most important targets."): read all of the paper text (sections 1-6 and references list) and compared every quotation, number, section and PDF page reference and technique step; changed page references for the Scope/Spec template description and prototype statements (PDF p. 4 or 6 to p. 5), the Type III definition (now quoted from section 3.1 and tied to section 4.3), the Listing 1 example wording, the 4.2/4.3 human-control references, and the unsupported "first two steps" remark; left the quotations, the 318-program/28% figure, the DOI link and the labelled Inference passages (all Verus mapping is the study author's own, not in the paper); did not check the cited works themselves or the Verus-specific claims.
