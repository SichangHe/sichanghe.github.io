# A Note on an Inferentialist Approach to Resource Semantics
(authored by agents unless marked 🧑)
Tag: `gheorghiu2024inferentialist`, [paper](http://arxiv.org/abs/2405.06491v1)

## scope and result

This short note (3 pages, arXiv:2405.06491v1) summarizes a proof-theoretic account of resource semantics for distributed systems; it credits the account to Gheorghiu et al. (2024), “Inferentialist resource semantics” (arXiv:2402.09217), which it says “initiated” it (p. 2). It does not present a verifier implementation, benchmark, or Rust case study. Its one formal device is a judgment relation called support, which the paper says is “inductively defined” (p. 2). The account is meant to express both readings the authors consider useful for systems modelling: linear logic's number-of-uses reading of resources and the sharing/separation reading of Bunched Implications (BI). The authors define resource semantics as “an interpretation of its formulae as assertions about states of processes and is expressed in terms of the resources that are manipulated by those processes.” (p. 1.)

The target is a distributed system modeled as locations, resources, and processes that consume, create, move, combine, copy, or delete resources. The paper distinguishes dynamics from structure: the number-of-uses reading of linear logic (LL) “concerns the dynamics of the system” and is available through LL's proof theory, while the sharing/separation reading of BI “concerns the composition and state of the system” and proceeds through BI's model-theoretic semantics (p. 1). It suggests that proof-theoretic semantics (P-tS), where “meaning emerges from rules of inference” (p. 2), can express both in one account. The result is a semantic design pattern, not evidence that a Verus proof or a product is correct.

## technique: model a system as resources, policies, and assertions

what it is and when to use it

Make the system state explicit as resources and describe process executions as a policy. Inference: use this before choosing a program-logic contract when correctness depends on ownership, consumption, creation, or movement of state. The paper's definition allows assertions about ground states and about “‘higher-order’ statements about state transitions” (p. 1).

how to do it

1. Identify locations and the resources situated at them. The paper describes a system as “interconnected locations, at which are situated resources, relative to which processes execute” (p. 1). It does not list kinds of resource; treating data items, capabilities or permissions as resources is Inference.
2. Describe process behavior as operations that consume/use, create, move, combine, copy, or delete resources. The paper says this manipulation “includes, inter alia, consuming/using resources, creating resources, copying/deleting resources, and moving resources between locations” (p. 1).
3. Write an assertion `ϕ` describing a possible system state. In the paper's general rule, `ϕ` is “an assertion describing (a possible state of) the system.” (p. 2.)
4. Write a policy `Γ`. The paper says `Γ` “specifies a policy describing the executions of a system's processes” (p. 2).
5. Choose a concept of atomic resource `R(A)` and a contextual atomic resource `S(·)`. The paper says that whenever `S(·)` “is combined with some atomic resource in U ∈ R(A), it returns a ‘richer’ atomic resource S(U)” (p. 2).
6. Choose bases `B`, `C`. The paper says they are “a basic concept in P-tS” and “model the policy governing the system described by the assertions”; in (Gen-Inf), `C` is an arbitrary model that extends `B` (p. 2). The paper does not say how to construct a base.

Verus form

Inference: In Verus, an owned Rust value or a ghost permission can represent a resource; a `requires` clause or a state-machine precondition can state the initial assumptions and constrain execution. Use `ensures` for the resulting assertion and `invariant` for a loop's preserved resource relation. Verus's ownership types and proof-oriented APIs can encode some separation structure, but the paper's resource semantics is a general logical framework rather than a Verus interface. The mapping is an inference from the paper's resource vocabulary.

evidence and limits

The paper supplies no implementation or measured result. Its evidence is the explicit semantic definition and the support rule below. Inference: it assumes that the chosen resource model and policy faithfully represent the distributed system, so a proof of a derived assertion would remain conditional on those modeling choices.

## technique: combine number-of-uses and sharing/separation readings

what it is and when to use it

Use LL-style reasoning for how many times a resource can be used and BI-style reasoning for how resources are composed or separated. The paper says “Both readings are useful, but they are individually limited for systems modelling: sharing/separation expresses the structure of distributed systems, and number-of-uses expresses the dynamics of the resources involved” (pp. 1–2). Inference: use the combined view when a verification claim needs both exclusive use and spatial composition.

how to do it

1. Record usage constraints in the LL sense. The paper says the number-of-uses reading “is available only through LL's proof theory, and is not reflected in LL's truth-functional semantics” (p. 1).
2. Record composition and separation in the BI sense. The paper says the sharing/separation reading “concerns the composition and state of the system”, is “best exemplified by its essential place in program verification — see, for example, the use of Separation Logic”, and “proceeds through the (ordered-monoidal/relational) model-theoretic semantics of BI” (p. 1).
3. Express both through proof-theoretic inference. The authors write, “We suggest that proof-theoretic semantics (P-tS) (Schroeder-Heister, 2018) offers a unified framework for resource semantics able to express both parts of a distributed system.” (p. 2.)
4. Inference (not in the paper): check that each inference preserves the resource interpretation, so that a policy step consumes, creates, or rearranges resources as specified while the surrounding context remains valid.

Verus form

Inference: Model exclusive ownership with Rust's ownership and borrowing plus ghost permissions, and model separated heap regions with separate proof predicates or abstract state components. A Verus transition-system invariant can combine the two: each transition consumes a permitted token and preserves disjointness or separation facts. This is an application idea, not a technique evaluated by the paper.

evidence and limits

The paper cites Separation Logic as an example of the BI reading but gives no Verus encoding and no performance data (p. 1). It does not specify a general algorithm for deriving Rust invariants. The unified framework remains abstract until a concrete resource model, policy, and inference system are supplied.

## technique: use the generalized support judgment

what it is and when to use it

The paper's one formal device is an inductively defined judgment called support, written in the paper with a double-bar turnstile carrying `S(·)` above and `B` below (the text extraction loses the symbols); here written `Γ ⊩_B^{S(·)} ϕ`. The paper says it means: “if policy Γ were to be executed with contextual resource S(·) based on the model B, then the result state would satisfy ϕ” (p. 2). Inference: use it to state a resource-sensitive postcondition that quantifies over extensions of the current model and over possible atomic resources.

how to do it

1. Take an arbitrary base `C ⊇ B` and an atomic resource `U ∈ R(A)`. The rule (Gen-Inf) on p. 2 reads: `Γ ⊩_B^{S(·)} ϕ` iff for all `C ⊇ B` and all `U ∈ R(A)`, if `⊩_C^{U} Γ` then `⊩_C^{S(U)} ϕ` (the superscripts are my reading of the extracted formula; the paper calls this the definition of “transmission of validity”).
2. Check whether policy `Γ` is met in `C` using `U`. This is the antecedent of (Gen-Inf).
3. Form the richer atomic resource `S(U)`.
4. Require that `ϕ` is supported in `C` with `S(U)`. This is the consequent of (Gen-Inf).
5. Read the judgment as universal over all such `C` and `U`. The paper explains, “if policy Γ is met in model C using some resource U, then Γ could be executed, and the resulting state — which consumes U in the available contextual resource S(·) — satisfies ϕ.” (p. 2.)
6. Inference: define the concrete inference rules for the selected logic and resource operations. The paper says only that support is inductively defined and cites other papers for the logics (LL: Gheorghiu et al. 2023 and Buzoku 2024; BI: Gu et al. 2024); this note gives no inference rules and no executable checker (p. 2).

Verus form

Inference: A Verus specification can state the same shape as a transition-system invariant: for every allowed transition and resource token, the post-state satisfies the asserted predicate and the token is consumed exactly as specified. Encode the universal obligations as proof functions over abstract state and resource types; use `requires` for `C ⊇ B`, `ensures` for `ϕ`, and `invariant` for repeated process steps. Verus cannot directly express the paper's support relation without defining these abstract types and rules.

evidence and limits

The support rule is a semantic proposal. The paper gives no soundness theorem relative to a concrete operational semantics, no completeness theorem, and no experiment. It points to earlier applications “to both modelling the security architecture of an airport and to multi-factor authentication”, but these are cited as prior work rather than developed in this note (p. 2). Inference: the rule's usefulness depends on showing that a chosen inference system faithfully models the target distributed process.

## techniques for the catalog

- resource-state modeling: represent distributed locations, resources, process operations, assertions, policies, and bases explicitly
- combined linear and separation reading: use number-of-uses rules for dynamics and sharing/separation rules for state composition
- generalized support judgment: quantify over model extensions and atomic resources to state resource-sensitive policy postconditions
- inference-based resource semantics: define meaning through inductive rules that preserve resource consumption, creation, movement, and composition
