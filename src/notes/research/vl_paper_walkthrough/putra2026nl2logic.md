# NL2LOGIC: AST-Guided Translation of Natural Language into First-Order Logic with Large Language Models
(authored by agents unless marked 🧑)
Tag: `putra2026nl2logic`, [paper](https://www.semanticscholar.org/paper/3e192c20ae5d1fe315b12f2f9da2bfcf66959f1a)

## problem and architecture
NL2LOGIC translates natural-language sentences into first-order logic (FOL) for automated reasoning. The paper identifies free-form generation's syntax and semantic failures and proposes a parser-generator pipeline: an LLM recursively builds a FOL abstract syntax tree (FOLAST), then a deterministic compiler emits Z3 or SMT-LIB code. It reports “99% syntactic accuracy” (Abstract, p. 1) and an average semantic improvement of 30% over GCD baselines.

## technique 1: sentence preprocessing and recursive semantic parsing
What it is. Split documents into reliable sentences with the SaT learned boundary detector, then classify each sentence as atomic, quantified, or logical. Dispatch to the corresponding parser. The parser handles only the outermost construct, rewrites each operand or scope as a standalone sentence, and recursively parses it. This produces a tree whose nodes are predicates, terms, quantifiers, and connectives.

How to do it.
1. Run SaT sentence-boundary detection instead of punctuation-only splitting; the paper notes this avoids abbreviations and numeric-expression fragmentation (Section 4.1).
2. The Parser Selector chooses Atomic, Quantified, or Logical Sentence Parser (Section 4.2).
3. Atomic parsing extracts relation name and arguments. Quantified parsing identifies ∀/∃ and variable, substitutes the variable into the scope, and recurses. Logical parsing identifies an outer ¬, ∧, ∨, or →, splits operands, and recurses.
4. Validate each node's schema and argument arity before attaching it to the parent. The paper's examples parse “All people who regularly drink coffee are dependent on caffeine” as `∀x (Drink(x) → Dependent(x))` and a compound Rina sentence into an Or/And/Not tree.

Verus form (Inference: this is FOL, not Rust). Parse a natural-language contract into a typed intermediate AST containing variables, constants, predicates, quantifiers, and connectives. Recursively lower each node into Verus `requires`/`ensures` expressions and proof lemmas. Keep parsing separate from Rust syntax generation; reject nodes with unknown symbols or wrong arity before emitting code.

Evidence and limits. Syntax correctness is `Ncorrect/Ntotal`; across 13 models on FOLIO and LogicNLI, NL2LOGIC reaches up to 0.99. Error analysis found incomplete JSON or empty required fields in fewer than 5% of sentences, and semantic errors with implicit negation and operator precedence. The paper gives the concrete failure “John is unable to walk” being parsed back and forth as “John is not unable to walk,” causing infinite recursion. It also reports that top-down decomposition can underperform GCD on some complex FOLIO sentences.

## technique 2: two-pass AST-guided code generation
What it is. Compile FOLAST deterministically rather than asking the LLM to emit solver-specific syntax. The first pass collects declarations; the second emits expressions. The paper states: “The first pass registers all constants, variables, and relation signatures, while the second pass assembles the logical expression.” (Section 4.3, p. 5)

How to do it.
1. Traverse AST nodes in preorder. For every variable, constant, and relation, add a declaration to a shared symbol table; connective nodes recurse without emitting code (Algorithm 1).
2. Traverse again. Recursively generate terms, relation calls with correct arity, binary operators, negation, and quantified scopes; bind quantified variables uniquely and respect precedence (Algorithm 2).
3. Emit target-language assertions such as Z3 `s.add(...)`, then invoke the solver for entailment, contradiction, or uncertainty. The solver classification is `Ent.` when p entails h but not ¬h, `Cont.` when it entails ¬h but not h, and `Unc.` otherwise.

Verus form (Inference). Use the AST as an intermediate representation for Rust specifications. First collect variable names, types, function signatures, and mutable-state declarations; reject undeclared or inconsistent symbols. Second generate Verus `requires`, `ensures`, `invariant`, and `assert` forms with explicit scopes, then run `verus!`. Deterministic generation prevents the model from inventing Rust syntax, but semantic validity still requires Verus checking.

Evidence. Logic-LM integration replaces only its FOL translation module and keeps Z3, refinement, and answer selection unchanged. On ProofWriter and FOLIO, NL2LOGIC's executable rate is 0.99 for all 13 models, whereas Logic-LM varies from 0.01 to 0.94. The paper's Table 4 denominator is each dataset/model evaluation set; the text reports 13 models and both datasets. On executable rules, Table 5 reports downstream accuracy gains of about 31% on average, but the paper does not state a single pooled denominator.

## technique 3: structured output and solver feedback
The implementation uses vLLM structured-output JSON schemas and few-shot prompts to constrain parser responses. Invalid or incomplete JSON and empty AST fields are counted explicitly; solver execution supplies NLI labels. The paper cautions that structured generation depends on serving-framework support and that generated rules can mislead if users mistake solver execution for proof of the intended natural-language meaning.

Verus form (Inference). Use schema-constrained JSON for the parser, validate it against a Rust/Verus AST type, compile deterministically, and treat Verus diagnostics as the executable gate. Keep a human or independent specification oracle for semantic faithfulness because successful compilation alone does not show the natural-language requirement was interpreted correctly.

## what remains trusted, and product implications
The LLM parser, SaT segmentation, JSON runtime, deterministic generator, Z3 semantics, dataset labels, and mapping from solver result to NLI class remain trusted. The method proves syntactic well-formedness and evaluates semantic correctness indirectly through NLI, not by proving that every translation preserves the source meaning. The authors note reliance on structured-generation support and possible predicate ambiguity (for example, `father` could encode different conjunctions).

The abstract describes a 30% semantic improvement, while the conclusion and Table 5 describe about 31% average gains; these rounded summaries use different comparisons and are not directly reconciled.

What VL should not redo: generic AST parsing and two-pass solver compilation are already demonstrated; new VL work should evaluate Verus specification semantics and proof obligations.

Inference: for VeruLaw, AST-guided specification generation is a substantial opportunity and threat. It can reduce malformed Rust/Verus syntax by separating semantic parsing from deterministic code emission, but a wrong AST can produce a perfectly verified implementation of the wrong contract. Independent contract review and counterexample tests are still needed.

## techniques for the catalog
- recursive FOLAST parsing — classify each sentence's outer construct and recursively parse operands or quantified scopes
- two-pass deterministic compilation — collect declarations first, then emit solver expressions with checked scope and arity
- structured parser output — constrain LLM responses to JSON schemas and count malformed or incomplete nodes
- solver-backed semantic evaluation — execute generated rules for entailment, contradiction, or uncertainty after syntax checks

Checked 2026-10-15 against the paper by a Codex agent for nl2logic_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
