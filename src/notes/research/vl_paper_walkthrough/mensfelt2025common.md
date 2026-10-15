# Towards a Common Framework for Autoformalization
(authored by agents unless marked 🧑)
Tag: `mensfelt2025common`, [paper](https://doi.org/10.1609/aaai.v40i48.42132)

## scope and proposal

This paper is a survey and framework proposal, not a new autoformalization model. It reviews 81 papers that translate natural language into formal languages used for logical inference or automated reasoning. The authors divide the literature into four subfields: formal mathematics with interactive theorem provers, logical inference and declarative programming, planning, and knowledge representation. They explicitly caution: “While we aimed to cover all relevant work in this area, we do not claim that the review is exhaustive.”

The proposed definition is: “Formalization from informal language Li to formal reasoning language Lf with respect to a semantic equivalence criterion E is the transformation of an expression in a domain-specific subset of Li into a well-formed and valid expression in Lf that is semantically equivalent according to E. Autoformalization is formalization performed automatically by a computing system.” The four parameters are the informal language Li, a domain-specific subset of Li, the formal reasoning language Lf, and semantic-equivalence criterion E. The paper adds a computable validation criterion V as an approximation to E. This separation is the central reusable technique: define the intended correspondence separately from the test that can actually be run.

## technique 1: specify the four-part contract before building a translator

What it is. Treat input scope, target language, intended meaning, and acceptance test as explicit design objects. Li may be ordinary English or a semi-formal mixture; the domain-specific subset limits the task to a coherent subject matter. Lf must have a grammar, formal semantics, and a reasoning apparatus. E states which aspects of the informal meaning must be preserved, while V is the executable or human procedure used to approximate E.

When to use it. Use this decomposition when a project mixes natural-language requirements, generated formal code, and a verifier. Without it, syntax success can be mistaken for faithful formalization. The paper’s definition permits multiple formal outputs for one input and nondeterministic systems, provided each output satisfies E; it says: “Systems for autoformalization need not be deterministic: the same informal input may be mapped to different formal outputs in different runs.”

How to apply it.

1. Define the natural-language domain, including which expressions are in scope (paper §3.1, p. 3)
2. Define the target formal language and its parser, semantics, and inference tools (§3.1)
3. Write E as the behavior or facts that must remain true, allowing for the target language’s lower expressiveness (§3.1)
4. Define V as a computable or reviewable approximation to E (§3.1)
5. Decide whether correspondence is whole-input or sentence/sub-argument level; the paper’s Remark 3 requires fine-grained correspondence to be subsumed by E (§3.1)
6. Record whether multiple valid outputs and nondeterminism are allowed (Remark 1 and Remark 2)

Verus form. Inference: Li is the subset of English specifications VL accepts; Lf is Rust plus Verus specifications and proof code; E is behavioral equivalence between the user requirement and the program contract; V is Verus verification plus independent tests, model checks, or review of the requirement. `requires` and `ensures` express the formal contract, and proof functions establish intermediate facts; none of these prove that English intent was captured. The four fields should be stored with each generated artifact so a passing verifier is not confused with semantic faithfulness.

Evidence and limits. The framework is a conceptual definition supported by literature comparison, not a theorem that E or V can always be automated. The authors write: “Specifying the semantic equivalence criterion can be challenging, as it requires defining conditions related to the meaning of informal language, which is inherently ambiguous.”

## technique 2: distinguish semantic equivalence E from validation V

What it is. E is the ideal statement that the formal result means what the informal input intended. V is a practical test that may be automated, manual, or mixed. The paper says: “E defines what it means for an informal and formal expression to ‘mean the same thing,’ whereas V provides a practical means of verifying whether a given pair of informal and formal expressions satisfies this equivalence.”

How to apply it. (1) state the intended properties in E; (2) choose a V that checks those properties at the target system’s level; (3) report where V is weaker than E; and (4) reject claims of semantic correctness when only surface similarity or a single answer is tested. The survey’s examples show why this matters. In the Isabelle/HOL mathematics case (paper §3.2, pp. 4–5), BLEU measures surface similarity and manual checks inspect examples; a generated theorem can look similar yet omit a mathematical condition. In the Prover9 FOLIO case, the model formalizes “All squares are shapes” from two premises and Prover9 proves the conclusion; obtaining the correct answer still “does not necessarily guarantee semantic equivalence.”

Verus form. Inference: separate V into (a) Verus’s proof of the stated contract, (b) executable tests or model-based checks for behavior, and (c) human or agent review that the contract reflects the requirement. A proof obligation establishes only the formal contract. This is the same trust boundary the paper identifies for every target formalism.

## technique 3: choose a validation procedure matched to the formalism

The case studies provide concrete validation patterns that can be reused.

### theorem-prover mathematics

Wu et al.’s Isabelle/HOL example translates “Prove that there is no function f from the set of non-negative integers into itself such that f(f(n)) = n + 1987 for every n” into a theorem with `fixes`, `assumes`, and `shows False`. E requires all important mathematical details to be present; V combines BLEU and manual evaluation. The formal prover checks the resulting proof, but the survey notes that a reference-similarity score is not direct semantic equivalence.

Inference: in Verus, compare generated `requires` and `ensures` against a reviewed contract and then run the verifier. A proof of `ensures false` under inconsistent assumptions would be formally valid but semantically useless, so assumption consistency belongs in V.

### first-order logical inference

The FOLIO example defines predicates `Square(x)`, `FourSided(x)`, and `Shape(x)`, premises `∀x(Square(x) → FourSided(x))` and `∀x(FourSided(x) → Shape(x))`, and conclusion `∀x(Square(x) → Shape(x))`. Prover9 checks entailment. V is automated answer correctness against the benchmark label, while E requires all relevant properties without spurious properties. The paper’s explicit warning is that a correct answer alone is insufficient.

Inference: a Verus analogue is a finite set of semantic test cases or lemmas that exercise each requirement clause, with the contract and tests reviewed together. This is stronger than comparing generated source text.

### logic programming

The Battle of the Sexes example translates prose into Prolog predicates for payoffs, initial state, legal moves, effects, and abnormal outcomes. Its V queries every action combination and compares generated payoffs with the ground-truth matrix. This is automated and practical but “applies only to a narrow class of problems—bimatrix games—and requires manually implementing a validation procedure for each class of games.”

Inference: for a Verus protocol, enumerate reachable operation sequences where feasible and compare the implementation’s return values and state transitions to a reference model. State-space limits and reference-model correctness remain assumptions.

### planning

The planning case translates a natural-language action into PDDL, aided by an allowed-predicate list. The paper’s example emits `(:action FLY-AIRPLANE ...)` with typed parameters, an `:precondition (at ?airplane ?loc-from)`, and an effect that removes the old location and adds the new one. Validation cross-checks plans in both directions: generate plan sets P and P′ under original and reconstructed domains, validate every plan across the other domain using VAL, and call the domains approximately equivalent only if all cross-validations succeed. The paper stresses that a well-structured action is not enough; “only through validation methods like this can the semantic faithfulness of the model’s output be determined.”

Inference: a Verus state-machine specification can play the role of the PDDL transition model. Generate operation traces from both implementation and model, then check that each accepted trace preserves the model’s transition relation. This is a proposed adaptation, not a procedure evaluated in the paper.

### knowledge representation

The OWL example translates “Anna and Lana are each other’s sisters” into declarations for `:has sister`, individuals Anna and Lana, and two symmetric `ObjPropAssert` statements. E requires all relational information to be captured; V is manual ontology-engineer review, optionally supplemented by consistency and entailment checks with an OWL reasoner such as HermiT. The survey states that ontology development alternates adding axioms and reasoning to assess their impact.

Inference: for Verus, review generated specifications and use the verifier to check consistency and expected consequences. A contradiction or unintended entailment should fail the validation suite even when individual functions verify.

## technique 4: interactive formalization instead of one-shot translation

What it is. Treat ambiguity and missing assumptions as reasons to ask a user clarifying questions before finalizing formal code. The challenges section says: “A more promising direction—and an approach to the problem of semantic verification—involves systems that can engage in dialogue with users, asking clarifying questions about ambiguous terms, implicit assumptions, or intended interpretations.” The proposed loop is: detect ambiguity, formulate a meaningful question, incorporate the answer, and iteratively refine the formalization.

When to use it. Use this when the natural-language requirement omits units, boundary behavior, ownership assumptions, failure semantics, or the intended scope of a term. The paper argues that early feedback prevents the system from pursuing an incorrect interpretation too far.

Verus form. Inference: before generating Rust, have VL ask for unresolved contract choices, then freeze the answers as part of the specification record. Re-run generation and verification after each answer. This reduces semantic drift but adds interaction latency and does not replace formal proof.

## technique 5: select the target language by expressiveness, tractability, and workflow

The paper advises choosing Lf based on who will use the output and which computations must run. The target must represent all relevant domain information and support verification with available tools. It also identifies a fundamental tension: a more expressive language can make automated reasoning difficult or undecidable. For VL, this means using Verus where executable Rust, ownership, and contracts are required, while recognizing that the target’s supported subset constrains the requirements that can be encoded.

Inference: record unsupported assumptions explicitly and reject requirements that cannot be represented or checked. A smaller, checkable contract is not automatically equivalent to the full requirement; E must state the loss.

## cross-domain transfer, scalability, and trust

The survey reports that current systems are domain-specific and calls cross-domain transfer an open challenge. It also says curated benchmarks hide incomplete proofs, proof sketches, and contextual gap-filling required in real practice. For a product, this means benchmark pass rates are evidence about a task distribution, not proof of deployment safety. The paper’s central unresolved problem is semantic verification: “Fully formal and automated verification of semantic equivalence, however, appears impossible even in principle, since natural language and its intended meaning are inherently informal.”

Inference: the threat to an agent-written verified-Rust product is high at the requirement boundary. Verus can prove the generated Rust against its written contract, but the framework’s E/V distinction shows why this leaves the natural-language interpretation trusted. VL should reuse the paper’s explicit contract fields, matched validation, and interactive clarification; it should not redo the survey’s taxonomy as if it were a new verifier.

## techniques for the catalog

- four-part autoformalization contract — define input scope, target formal language, intended semantic equivalence, and an executable validation criterion
- matched semantic validation — choose checks that exercise the target’s behavior, such as entailment, payoff enumeration, plan cross-validation, or ontology reasoning
- interactive formalization — ask clarifying questions about ambiguity and assumptions before committing to formal code
- target-language selection — balance expressiveness, verification tractability, available tools, and workflow needs
Checked 2026-10-15 against paper mensfelt2025common: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
