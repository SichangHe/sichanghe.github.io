# Towards Formal Verification of LLM-Generated Code from Natural Language Prompts
(authored by agents unless marked 🧑)
Tag: `councilman2025llm`, [paper](https://doi.org/10.48550/arxiv.2507.13290)
## what the paper builds

The paper defines a pipeline for checking LLM-generated Ansible against a user-reviewed formal description. Its system, Astrogator, introduces a Formal Query Language, compiles both query and playbook into a State Calculus, symbolically interprets both, and unifies their initial/final state pairs. The central problem is that natural language has no formal semantics. The paper states: “This means traditional approaches that provide formal guarantees, such as program synthesis and verification, are not immediately applicable: without a formal specification, what property would one prove?” (section 1, p. 2). The proposed answer is a readable specification that the user confirms before verification.

The paper formalizes intent as a set U of acceptable target programs. A program p is correct exactly when p belongs to U, but U cannot be tested directly. A formalizer F maps description d to specification s. The user checks s; then the verifier checks p against the semantics of s and reports choices made in under-specified parts. The paper explicitly limits the guarantee: after checking p ∈ [[s]], “the task of determining whether p ∈ 𝒰 is one that only the user can solve” (section 3, p. 6). Inference: the verifier proves conformance to the accepted query, while the human remains responsible for whether that query captures intent.

## technique: user-checkable formal queries

what it is

A Formal Query Language expresses actions in natural-language-like syntax while giving them precise semantics. Its grammar has sequences of sentences, atomic verb-description-argument forms, and conditional sentences. Examples include `move file from remote ... to remote ...`, `install numpy`, and `if os is Debian ...`. The design principles are that queries remain high-level and that users need no package-name or module-specific expertise.

when to use

Use this when an LLM receives an ambiguous natural-language request and the correctness target must be reviewed before code is trusted. The paper gives this ambiguity as a full example: “For example, as described previously, on Debian the package name for numpy is python3-numpy, but a user may not know this off the top of their head and might believe a reasonable name like numyp is correct.” (section 4.1, p. 7). A user must resolve that ambiguity in the formal query.

how to do it

1. take the natural-language description
2. produce a query made from verbs, high-level descriptions, separators, and values; use conditional forms when behavior depends on OS or existence
3. show the query to the user for approval
4. retain domain descriptions such as `numpy`, `apache server`, or `zsh configuration file for user="dev"` rather than forcing implementation names
5. compile the approved query into State Calculus code

The paper’s Figure 3 grammar gives `query ::= ε | sentnc | sentnc . query`, with `sentnc` supporting atoms and `if cond then sentnc otherwise sentnc`; Table 2 supplies concrete description/query pairs (section 5.1, pp. 8–9). The paper says, “The formal query language must be sufficiently high-level and interpretable that a user can easily understand whether a query matches their intent or not.” (section 5.1, p. 8).

Verus form

Inference: represent a reviewed query as a Rust data type whose fields encode actions, paths, predicates, and branches. A `spec fn` can map that query to an abstract state transition relation; `requires` can state environmental assumptions and `ensures` can state the resulting abstract state. Inference: a proof function can establish that a generated implementation’s post-state satisfies the query relation, but the human review of the query remains outside Verus. Inference: Verus does not automatically recover the user’s intended set U from prose, so this front-end review is still required.

evidence and limits

The query examples and grammar demonstrate expressiveness for file, package, user, shell, and conditional operations. The knowledge base supplies implementation-specific facts while preserving high-level terms. Limits are explicit: a query may be under-specified; the system reports extra assumptions and actions rather than deciding whether they are acceptable. The paper’s Ansible implementation hand-curates its knowledge base and does not solve automatic query generation.

## technique: State Calculus semantic model

what it is

State Calculus models side-effecting programs as transformations of a state containing attributes and elements. Attributes map labels to values; elements represent objects such as files or users and can contain nested state. Its syntax includes assignments, stateful calls, attribute reads (`get`), updates (`add`), return/failure, conditionals, existence tests, case, and loops (section 5.2.1, pp. 9–10). A file owner read is represented as `x ← get file(/path).owner`; an update is `add file(/path).owner ⇐ "user"`.

when to use

Use this model for a DSL whose important behavior is state change rather than pure return values. It gives both the formal query and generated program a common semantic language, so comparison does not depend on comparing source syntax.

how to do it

1. define the state’s attribute and element labels
2. define stateful module functions and pure functions
3. translate each query action to state updates and reads
4. translate each source-language task to a stateful call with the same state effects
5. interpret both translations symbolically and compare their transitions

The paper defines a symbolic state as partial maps that retain only relevant attributes and elements. Unknown `get` values become symbolic values; unknown `exists` tests fork execution into present and absent branches. Symbolic conditionals interpret both branches, while a symbolic list loop executes once with a symbolic element and records that it represents all elements (section 5.2.2, pp. 10–11). The paper states: “The result of the interpreter is a set of symbolic initial-final symbolic state pairs that reflect the behavior of the program under different initial states.” (section 5.2.2, p. 10).

Verus form

Inference: encode a concrete state as a Rust struct and its abstract state as Verus `Map`, `Set`, or `Seq` values exposed by a `spec fn` view. Inference: model each module as an executable function with `requires` for valid inputs and `ensures` describing the state change; use `old(state)` in postconditions when relating pre-state values to post-state values. Inference: represent symbolic branching with proof cases over predicates and prove each branch’s postcondition, while representing loop behavior with a loop invariant and a `decreases` clause when termination must be proved. Inference: Verus’s solver checks these contracts, but it does not provide Astrogator’s generic symbolic interpreter automatically; the state model and abstraction must be written.

what is trusted and where it fails

The paper’s semantics depend on hand-written module descriptions and the chosen abstraction level. Its file model can omit hard-link identity unless an inode element is added (section 5.4.2, p. 14). Symbolic loops are intentionally imprecise and do not support arbitrary while-loops; the paper calls arbitrary loops a common verification challenge (section 7.2, p. 19). Inference: omitted state fields can make a proof vacuous with respect to real behavior, so a Verus state view needs independent review.

## technique: unification-based verifier

what it is

The unifier compares query and program symbolic state pairs. For every query pair, it seeks a program pair whose initial state is consistent and whose final state matches. Program initial assumptions may be fewer than query assumptions. Symbolic values can be concretized in program results to match query constants, and compatible symbolic list values can be unified. Query symbolic values cannot be concretized to match a program constant because they denote all possible values (section 5.2.3, pp. 11–12).

when to use

Use this when multiple initial environments and branches must be covered and source-level equivalence is too strict. It checks that every specified final effect occurs while allowing a generated program to avoid irrelevant assumptions.

how to do it

1. compile query and program to State Calculus
2. symbolically interpret both into initial/final pairs
3. for each query pair, find a program pair with a consistent initial state
4. require all query final effects to occur in the program final state
5. unify symbolic values where the representation permits it
6. report additional program assumptions and actions for human review

For under-specified queries, consistency requires common assumptions not to disagree; program-only assumptions are reported. Program-only final attributes/elements are permitted and reported as additional actions, but every query action must still match exactly (section 5.2.3, p. 12). The paper states: “Similarly, for final states, we had previously assumed that the program’s and query’s final states must be the same but now we permit the program’s to include additional actions (i.e., additional elements or attributes) and we report any of these as additional actions.” (section 5.2.3, p. 12).

Verus form

Inference: express the query relation as a `spec fn` over pre-state and post-state and prove an implementation `ensures` clause that includes every required effect. Inference: model permitted extra effects explicitly in the relation, or prove a separate predicate that classifies them; Verus’s `ensures` does not itself produce a user-facing list of assumptions. Inference: branch coverage requires proving each branch, and symbolic-value compatibility must be encoded as equalities or quantified specifications suitable for Verus’s solver.

## technique: compiler and knowledge base

what it is

Astrogator compiles queries using built-in verb rules and compiles Ansible playbooks using module definitions written in a Module Description Language. Module descriptions specify argument types, optional or mutually exclusive arguments, enums, elements, attributes, and stateful behavior. A knowledge-base interface lowers high-level descriptions to concrete facts: for example, `apache server` maps to `apache2` and `apt` on Debian and `httpd` and `dnf` on RHEL; a zsh configuration description maps to the user’s `.zshrc` path (sections 5.4–5.5, pp. 13–15).

how to do it

1. define each supported module’s argument and result types
2. state mutually exclusive and optional arguments
3. write its state effect in the module language
4. compile each playbook task in order, converting built-in variables to state reads
5. implement knowledge-base functions for package, file, and similar descriptions
6. compile formal-query verbs and descriptions through those functions

The paper says, “The actual compilation of an Ansible program into the State Calculus is surprisingly simple.” (section 5.4.1, p. 13). Inference: the difficult work is the module semantics and the domain knowledge, not task sequencing.

Verus form

Inference: represent module specifications as Rust functions whose `requires` constrain argument combinations and whose `ensures` describe state updates. Inference: use `spec fn` definitions for trusted package/file mappings and prove callers use only mappings covered by those definitions. Inference: if mappings come from external documentation or a database, their correctness remains a trusted assumption unless separately verified.

## evaluation, evidence, and contradictions

The benchmark has 21 Ansible tasks, reference solutions averaging 1.67 tasks and at most four. Six LLMs each produced ten programs per task, yielding 1,260 programs. The setup used Debian 12.11.0, Ubuntu 24.04.2, and RHEL 9.6 virtual machines, reset from snapshots between runs; a program was correct only if it passed all tests on all applicable systems (section 6.1, p. 15). Of 1,260, 42 (3.3%) failed post-processing, 5 (0.4%) did not terminate, 596 (47.3%) failed to execute, 226 (18.0%) executed but failed tests, and 334 (26.5%) were correct. GPT-4o produced 108/210 correct (51.4%); open-source models produced 226/1050 (21.5%) (section 6.2, pp. 15–16).

Astrogator accepted 277/334 correct programs (82.9%) and rejected 856/926 incorrect programs (92.4%), processing all 1,260 in about 70 seconds (section 6.3, p. 16). The abstract rounds these to 83% and 92%. Inference: these denominators matter because the rates are conditional on the 334/926 labels established by the VM tests and manual handling of problem 18, not on all possible Ansible programs.

The paper reports 57 correct programs rejected. Eighteen used unsupported features; 39 used valid alternatives not returned by the single-valued knowledge base. It reports 70 incorrect programs accepted: 68 arose from under-specification, one from ignored shell plugins, and one from an undocumented `lineinfile` behavior. The paper presents these as addressable implementation or testing limitations, but the under-specification cases require a human to inspect reported assumptions and actions. Inference: for agent-written verified Rust, this architecture reduces risk from mismatched implementation behavior when the abstract state and query are reviewed, but it leaves substantial risk in wrong abstractions, incomplete module specifications, and unreviewed assumptions. Inference: the paper’s testing setup is evidence for this Ansible prototype, not evidence that a generic Verus front end will achieve the same rates.

The paper also hand-translates a Bash pipeline and an Arduino state machine into State Calculus and verifies each translation against a hand-written specification (section 7.2, pp. 18–20). These examples show portability of the calculus, but the source translations and specifications are manual. Inference: VL should reuse the separation between intent relation, executable-state model, symbolic exploration, and verifier, while avoiding a claim that those examples constitute automatic verification of arbitrary Rust.

## what VL should take from this paper

Inference: the most reusable design is a user-readable intermediate specification followed by independent checking of generated code. For Verus, the equivalent boundary is a reviewed contract and state view, then executable Rust plus proof functions checked by Verus. Inference: the product should retain an explicit report of extra assumptions and actions, because a passing proof against an under-specified contract does not establish the user’s full intent. The paper’s own limitation is direct: “the task of determining whether p ∈ 𝒰 is one that only the user can solve” (section 3, p. 6). Inference: this is a high threat reduction for semantic mismatches in agent-written code when the contract is sound, but not a complete solution to specification error or trusted dependency behavior.

## techniques for the catalog

- user-checkable formal query — express natural-language intent in a precise, readable DSL and require user approval
- state calculus modeling — represent side-effecting code as symbolic initial/final state transformations
- symbolic interpretation — fork unknown conditions and track unknown attributes and collections over all relevant states
- unification-based verification — match program and query state pairs while reporting extra assumptions and actions
- module description compilation — specify DSL modules’ types and state effects, then compile source tasks into the common calculus
- knowledge-base lowering — resolve high-level descriptions to system-specific package, file, and configuration facts
Checked 2026-10-13: audit record councilman2025llm; paper-study comparison complete; gate executed; experiments not rerun
