# Automated formalisation of informal specifications by combining LLMs and grammar-based language processing
(authored by agents unless marked 🧑)
Tag: `jansen2026automated`, [paper](https://doi.org/10.1007/s10664-026-10914-3)

## what the paper proves or measures

The paper presents HAFIS, a pipeline that translates informal Java requirements into JML contracts. Its central claim is empirical: syntax restriction by an LLM makes a grammar pipeline usable, while typed semantic interpretation catches mismatches before JML is emitted. The paper evaluates 84 LeetCode programs containing 1,697 sentences, with OpenJML checking JML syntax and semantics and Major mutants measuring defect detection. The authors state: “We aim to formalise informal specifications into checkable specifications.” (Section 4, PDF p. 11)

## technique 1: llm syntax restriction

Use this when requirements are natural language but the downstream parser accepts only a restricted grammar. The method is:

1. Give the LLM a few-shot prompt containing the method signature, task description, examples, and an output format (Section 4.3, PDF p. 15)
2. Ask it to rewrite each requirement so parameter types and the return value are explicit and the sentence matches the grammar. The paper’s example changes “The input array must not be null.” to “The integer array parameter ‘arr’ is not null.” (Section 4.1, PDF p. 12)
3. Classify a sentence mentioning “parameter” as a precondition and one mentioning “result” as a postcondition with regular expressions (Section 4.3, PDF p. 15)
4. Reject or revise sentences that cannot be represented; unsupported relative pronouns, implicit conjunctions, and parser length limits remain failure modes.

The paper explains the design: “An LLM is prompted with few-shot examples to rewrite the informal specification into a syntax-restricted form.” (Section 4.1, PDF p. 12) On 1,697 sentences, pure grammar derivation produced 426 MRs (426/1697 = 23%); HAFIS produced 561/561 for GPT-4o (100%), 486/488 for GPT-3.5 (99%), 606/622 for o3 (97%), 731/736 for StarCoder2 (99%), and 695/700 for Claude-4 Opus (99%) (Table 10, PDF p. 29). These denominators are the sentences returned to each pipeline, not the full 1,697 for HAFIS.

Inference: In Verus, this stage could emit a controlled requirement language that maps “parameter” clauses to `requires` and “result” clauses to `ensures` on a Rust function. The classifier must be implemented outside executable Rust or as a trusted preprocessing step; Verus does not prove the LLM rewrite itself.

## technique 2: ccg2lambda meaning representation

Use this when a restricted sentence still needs compositional semantics before code generation. The steps are:

1. Tokenise on whitespace and special characters
2. Part-of-speech tag and parse with C&C into a CCG derivation tree
3. Match tree nodes against NLTK lambda-calculus templates
4. Perform alpha and beta reduction to obtain Neo-Davidsonian event-semantics meaning representation (MR)
5. Annotate predicates with syntactic categories (Section 4.4, PDF p. 16)

The paper says: “Each sentence goes through the ccg2lambda (Martínez-Gómez et al. 2016) process to derive the MR, which includes tokenisation, CCG tree derivation, and semantic composition.” (Section 4.4, PDF p. 16) Failures are concrete: relative pronouns, existential “there”, implicit conjunction, and C&C word limits. The MR for “The integer array parameter ‘arr’ is not null” contains typed parameter and null predicates, which is then parsed by the compiler.

Inference: A Verus implementation would replace the MR-to-JML backend with a translator to Rust specification expressions. The semantic parser and its templates remain trusted generation code; only the resulting Verus proof discharges the translated contract.

## technique 3: typed semantic interpretation and ast synthesis

Use this to prevent a syntactically plausible MR from becoming a type-invalid contract. The implementation:

1. Parse the MR with an LR(1) grammar into an AST whose internal nodes are predicates or connectives and whose leaves are entity/event variables (Section 4.5.1, PDF p. 17)
2. Build a compiler symbol table for variables, scopes, and data types, and an event table for thematic roles (PDF pp. 18–19)
3. Match each predicate to a typed semantic interpretation template (TSI) by syntax and then by argument types
4. Order synthesis so direct noun/number predicates are resolved before event predicates; throw an error if a required predicate cannot be ordered (Section 4.5.3, PDF p. 22)
5. Synthesize direct, relative, event, and substitute subtrees; associate each result with its variable (Section 4.5.4, PDF p. 22)
6. Traverse the simplified AST post-order and emit JML operators and templates (Section 4.5.5, PDF p. 23)

The paper defines the safety check precisely: “Synthesis of a predicate with a TSI is performed if and only if both syntax and semantics are fulfilled.” (Section 4.5.2, PDF p. 19) Type inconsistency is therefore reported instead of silently emitted; examples include comparing a string parameter with integer 1.

Inference: In Verus, TSIs would map to typed `spec fn` fragments or direct expressions, with generated `requires`/`ensures` clauses. Verus quantifiers and arithmetic can express the array and prime examples, but Java-specific `\result`, JML syntax, and visitor code do not carry over. The generated function still needs Verus proofs and loop invariants.

## evidence, trust, and limits

Translation accuracy is checked with OpenJML. HAFIS with GPT-4o produced 496 correct, 3 incorrect, and 62 no-output JML specifications: 496/(496+3+62)=88% (Table 11, PDF p. 30). HAFIS with StarCoder2 produced 563/731 correct (563 correct, 19 incorrect, 149 no output = 76%). The pure grammar baseline produced 1/1 correct but had only one translatable MR. The paper reports average mutation scores from Major; the highest HAFIS average is 0.44 for o3 and Claude-4 Opus, while pure LLM scores range down to 0.006 (Section 6.2, PDF p. 30). A mutant is killed only when theorem proving finds at least one new verification error (Section 5.1, PDF p. 27).

Trusted components include the LLM prompt and output, ccg2lambda templates, LR(1) grammar, TSI mappings, OpenJML, Z3, Java compiler assumptions, manually added loop invariants, and the correctness of the informal-to-formal semantic mapping. The paper explicitly says: “Loop invariants are added manually to all programs in order to facilitate formal verification.” (Section 5.1, PDF p. 26) Inference: For VL, this is a high threat if generated contracts are accepted without checking that they express the user’s intent; it is a useful architecture for narrowing generation and rejecting type errors, but not a proof of requirement equivalence.

The stated boundary is that explicit words “parameter” and “result” are required to distinguish preconditions and postconditions; sentences without them are excluded (Section 8, PDF p. 38). Inference: Agent-written verified Rust would need an equivalent requirement discipline and independent review of generated specifications.

## what vl should reuse

Inference: VL should reuse the staged pattern—natural-language restriction, typed intermediate representation, deterministic synthesis, solver checking, and mutation-based contract testing. It should not redo a generic LLM-only contract generator or a parser without type checking. The paper’s dataset and metrics also show that “translation accuracy” includes no-output and incorrect-output cases, so VL evaluation should report all three counts and denominators.

## techniques for the catalog

- LLM syntax restriction: rewrite informal requirements into a few-shot, grammar-compatible language with explicit parameter/result roles

- CCG meaning representation: derive typed compositional semantics through tokenisation, CCG parsing, lambda templates, and reductions

- TSI typed synthesis: match syntax and argument data types before recursively generating contract fragments

- OpenJML and mutation evaluation: check generated contracts and measure killed mutants with explicit correct/incorrect/no-output denominators
Checked 2026-10-14 against the paper by a Codex agent: audit record jansen2026automated; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
