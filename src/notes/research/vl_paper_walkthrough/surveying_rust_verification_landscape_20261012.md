# Surveying the Rust Verification Landscape
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.
Tag: `blanc2024surveying`, [paper](https://arxiv.org/abs/2410.01981)

## bibliographic identity and scope

Alex Le Blanc and Patrick Lam, “Surveying the Rust Verification Landscape,” arXiv:2410.01981v1, 2024. This paper is a research proposal and survey rather than a completed benchmark. Its central questions are what properties should be verified, how they should be verified, and which Rust code should be prioritized. The authors focus on a practical program: verifying safety properties of the Rust standard library, while comparing tools and human factors.

## problem and threat model

Rust's type system prevents many memory-safety bugs and data races, but `unsafe` code can bypass those safeguards. The threat is therefore undefined behavior in unsafe implementation code, plus ordinary functional errors and domain-specific violations. The paper stresses that standard-library failures propagate widely: applications and crates depend on it, so proving a client while assuming an unverified library leaves a large trusted base. The authors also distinguish safety from functional correctness: proving absence of crashes or invalid memory behavior does not establish that an algorithm meets its intended contract.

The target is not all code at once. The paper divides the ecosystem into client applications, third-party crates, and the standard library. It argues that the standard library is the most fundamental target and that its challenges are a practical superset of many ordinary crate challenges, while acknowledging that some client-specific techniques will not transfer. This is an inference about prioritization, not an empirical claim that every client is easier.

## verification methods and trust boundary

The survey contrasts bounded model checking with deductive or symbolic verification. Kani translates Rust MIR to Goto-C and uses CBMC; it explores every execution up to a selected bound and can handle some unsafe code. Prusti and Creusot use deductive contracts and invariants for safe Rust, with different borrow encodings. Aeneas translates Rust to a pure functional calculus. Verus keeps specifications and proofs in Rust and uses Rust's type and borrow checking, but the authors note difficulties with some reborrowing patterns. Gillian-Rust and RefinedRust use separation-logic approaches for safe and unsafe code; RefinedRust additionally produces foundational proofs checkable in a general proof assistant.

Every approach leaves a trust boundary. A bounded proof is only as strong as the bound and the modeled undefined behavior. Contracts for compiler intrinsics may be assumed without proving their implementation. A foundational proof reduces reliance on the verifier but can increase annotation and engineering cost. The paper states the practical objective plainly: “Our first strict requirement is that the tool must support the verification of unsafe Rust code”. For this project, the authors select Kani because it supports unsafe code, automates checking of some memory-safety properties, and can sometimes avoid writing invariants (lighter workflow than separation-logic tools).

## technique: choose the property and target before the tool

(The step lists in this and the next technique are the study's own organization of Sections 2, 4 and 5; the paper gives no step list.)

Step 1: classify the desired guarantee as generic safety, functional correctness, or a domain-specific property. Step 2: identify the dependency level: standard library, reusable crate, or client. Step 3: select code whose proof will either protect many dependents or force useful new techniques. This avoids spending effort on a narrow client proof while a foundational unsafe component remains an assumption. The paper's rationale is that “verifying the standard library maximizes the direct output,” while difficult library problems can also maximize indirect technique output.

For VL, this is a portfolio rule: prioritize shared runtime, memory, and verification infrastructure before isolated examples; record which downstream claims rely on unverified libraries.

## technique: bounded exploration as an engineering front end

Step 1: translate the Rust program to the model checker and state explicit contracts for externally modeled functions. Step 2: choose a bound that covers the intended finite scenario and inspect counterexamples. Step 3: add loop invariants only where bounded exploration cannot cover the required behavior. Step 4: separately report what remains unbounded. Bounded checking avoids writing invariants for every loop and explores all executions within the bound, but linked lists and other unbounded structures expose its limit. The paper says bounded checking “does not require loop invariants to verify loops” in the bounded case; this is a conditional benefit, not a proof of unbounded correctness.

## technique: turn natural-language intrinsic contracts into community-reviewed assumptions

For compiler intrinsics such as `transmute`, extract the safety conditions from Rust documentation, translate them into machine-readable contracts, and seek community agreement on the translation. Then verify callers against those contracts while clearly labeling implementation correctness as an assumption when the intrinsic body is compiler-provided. The proposed transmute target is high value because it is widely used and can create invalid values. This technique gives VL a concrete assumption-audit workflow: every external primitive gets a contract, provenance, reviewer, and explicit guarantee status.

## limitations and failure modes

The paper is a proposal, so its tool comparison and prioritization are reasoned recommendations rather than measured results. Kani's bounds can miss behaviors beyond the explored depth; contracts for intrinsics may be unsound if translated incorrectly (study's inference); and Kani's current undefined-behavior coverage does not include every race, aliasing, or lifetime violation. Deductive systems shift cost to invariants, specifications, and separation-logic reasoning. The authors explicitly identify the power-versus-annotation tradeoff as a human factor. A VL workflow should therefore preserve bounds, modeled behaviors, assumptions, and unsupported Rust features beside every result.

## relevance to VL

The most reusable lesson is to treat verification as a system boundary design problem. Select guarantees and dependency targets first, choose a verifier whose trust and automation match those targets, and expose every unverified intrinsic or bounded region. For VL's agent workflow, require a property taxonomy, a dependency map, an assumption ledger, and a residual-behavior report before calling a proof complete. The following staged workflow is the study's inference, not the paper's proposal (the paper only speculates that Gillian-Rust and RefinedRust are more powerful but harder to use than Kani): use bounded exploration to find concrete failures cheaply, then apply deductive or foundational methods where unbounded invariants and library-level guarantees matter.

## techniques for the catalog

- property-and-dependency prioritization: classify safety, functional, and domain properties, then start at foundational libraries
- bounded exploration with explicit residual bounds: use model checking for finite behavior and report what remains unbounded
- intrinsic contract extraction: translate documentation into reviewed machine-readable assumptions and track implementation guarantees separately
- verifier choice by trust and annotation budget: match automation, unsafe support, proof strength, and human effort to the target

## evidence and status

All quotations above were copied from the extracted text of the cited PDF. This study was written from the full paper text and was not ChatGPT-checked.
Audited 2026-10-12 against the paper: read the full text; checked identity, tool descriptions, Sections 3 to 5 claims and all quotations; corrected the Kani selection reasons (MIR information was a Section 3 point, not a stated selection reason), a quotation end punctuation, and marked the step lists, the intrinsic-unsoundness remark and the staged workflow as the study's own inference; no numbers in the study to check.
