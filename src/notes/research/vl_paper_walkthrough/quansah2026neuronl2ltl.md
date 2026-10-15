# NeuroNL2LTL: A Neurosymbolic Framework for Natural Language Translation of Linear Temporal Logic
(authored by agents unless marked 🧑)
Tag: `quansah2026neuronl2ltl`, [paper](https://www.semanticscholar.org/paper/23e270f91d773fc2516f6566ec6529f454608d1d)

## what is proved or measured
NeuroNL2LTL translates a natural-language requirement plus domain definitions into Linear Temporal Logic (LTL). It separates a learned natural-language-to-Intermediate Technical Language (ITL) step from a deterministic ITL-to-LTL parser, then checks generated formulas with Spot. The abstract states, “Generated specifications undergo satisfiability and non-triviality checking; a minimal-edit repair mechanism corrects near-miss outputs before they reach downstream tools.” (Abstract, p.1). The symbolic checks establish syntactic validity, satisfiability, and non-triviality; they do not establish that a formula captures the requirement’s intended meaning.

## technique 1: structure-preserving Intermediate Technical Language
what it is: a human-readable grammar mirrors LTL’s abstract syntax tree. The mapping `T` recursively renders propositions and operators such as “always”, “eventually”, “until”, and “releases”; `T^-1` parses the string back.

how to apply it:
1. define atomic propositions from a context map `C : AP → Descriptions`
2. train or prompt a neural encoder to emit ITL rather than raw LTL
3. parse ITL into an AST with the unambiguous grammar
4. emit the corresponding LTL string by traversing that AST (Sections 2.4 and 3.1, pp.4–6)
5. reject malformed strings; only the deterministic conversion continues to verification

The paper gives the formal guarantee: “For any LTL formula φ: T −1 (T (φ)) ≡ φ.” (Proposition 1, p.5). Its proof sketch is structural induction; it establishes round-trip preservation of formulas, not semantic correctness of the neural translation. Inference: the same design can mediate natural-language requirements and Verus contracts by using a typed, human-readable contract language whose parser deterministically emits Rust/Verus syntax. The parser can preserve structure, but only Verus can check the resulting contract against code.

## technique 2: context-conditioned neural encoding and grammar-constrained decoding
what it is: a sequence-to-sequence model receives the requirement, a domain label, and natural-language definitions of atomic propositions, then emits ITL while restricting each next token to the grammar’s valid set.

how to apply it:
1. continue-pretrain Flan-T5-XL on technical documents, then supervised-fine-tune on paired NL–ITL examples (Section 3.1, p.6)
2. supply requirement `r`, domain label `d`, and context map `C` at inference
3. at each token position, assign zero probability to grammar-invalid next tokens (Section 3.1)
4. send the generated ITL to parsing and verification; let repair handle remaining failures

The paper says, “This constraint reduces but does not eliminate syntactic errors; the repair module handles cases where constrained decoding fails.” (Section 3.1, p.6). Removing domain context reduces semantic equivalence from 27.8% to 19.3% on the test set (Table 6, p.14); the denominator is the VERIFY test set described in Section 4.1, with 10% of each complexity stratum reserved for testing.

Verus form: Inference: have an agent emit a restricted contract grammar covering function signatures, `requires`, `ensures`, `assert`, and loop `invariant` declarations. Grammar constraints reduce parse errors but cannot ensure that a contract expresses the requirement or that the Rust body satisfies it; run Verus after parsing.

## technique 3: deterministic parser and Spot checks
what it is: Lark performs lexical and syntactic analysis, creates an AST, and emits Spot-format LTL. Spot converts formulas to Büchi automata and checks satisfiability, validity (through unsatisfiability of the negation), non-triviality, and equivalence.

how to apply it:
1. tokenize ITL keywords and proposition identifiers
2. construct the unique AST and emit LTL (Section 3.1, p.6)
3. check satisfiability by testing whether the Büchi automaton accepts an infinite word
4. check non-triviality by requiring satisfiability and rejecting valid formulas; validity is tested by checking whether `¬φ` is unsatisfiable (Section 3.1, pp.6–7)
5. for semantic equivalence to a reference, check both `φ1 ∧ ¬φ2` and `¬φ1 ∧ φ2` for unsatisfiability (Section 3.1, p.7)
6. emit only formulas passing the required checks; route failures to repair

The paper reports an empirical parser round trip over 15,000,000 unique formulas, all passing its equivalence test (Section 3.1, p.6). It also explicitly limits the guarantee: “A generated ITL string that passes verification is guaranteed to be satisfiable and non-trivial, but it is not guaranteed to capture the intended meaning of the input requirement.” (Section 3.3, p.8).

Verus form: Inference: this is analogous to parsing generated Rust/Verus and invoking Verus as the semantic checker. A parser can prove only syntax and structural translation properties; the final check must run Verus on the complete executable/specification pair. Spot’s LTL completeness does not transfer to Verus’s richer Rust semantics.

## technique 4: two-layer minimal-edit repair
what it is: repair first tries ranked single edits for predictable syntax failures, then a graph neural network edits a partial AST for structural failures. Repaired output re-enters parsing and verification.

how to apply it:
1. classify a failure as parse, unsatisfiable, or trivial
2. for parse errors, try parenthesis insertion/deletion, operator insertion, and keyword normalization; reparse after each edit and accept the first parseable result (Section 3.1, p.7)
3. if no heuristic succeeds within the fixed budget `m`, pass the partial AST to the GNN
4. let the GNN predict node relabeling, edge redirection, subtree deletion, or subtree insertion
5. reparse, reverify, and reject if both layers fail; use edit count as a training signal (Section 3.1)

The paper reports that 10.5% of outputs require repair and 87.3% of those are recovered overall (Table 5, p.13); this denominator is all test outputs requiring parse or verification repair. Heuristic repair succeeds on 71.4% of initial parse failures and 62.3% of initial verification failures; GNN repair succeeds on 68.2% and 54.8% of the remaining cases (Table 5).

Verus form: Inference: repair generated Rust/Verus syntax or proof annotations through bounded edits, re-run the parser/compiler, then Verus. A repaired artifact is accepted only if the complete code verifies; passing a syntax check alone is insufficient. Keep the edit trace so later training can penalize fragile repairs.

## technique 5: verifier-in-the-loop reinforcement learning
what it is: use parser success, Spot satisfiability/non-triviality, and repair cost as a reward for the neural encoder, optimized with Group Relative Policy Optimization (GRPO).

how to apply it:
1. treat the encoder as policy `πθ(r,C)` over ITL strings
2. sample multiple candidates for each requirement/context pair
3. compute `R(s) = α·1[parse succeeds] + β·1[sat ∧ nontriv] − γ·repair_cost(s)` (Section 3.2, p.8)
4. compute advantages relative to the group of candidates for the same input and update with GRPO
5. repeat so the model increases probability of outputs that parse, verify, and need few edits

The paper’s ablation reports semantic equivalence 27.8% for the full system versus 18.2% without verifier-in-the-loop training (Table 6, p.14; a 9.6 percentage-point difference on the same test set). Inference: the reward teaches logical coherence, not intent understanding, because the reward does not compare the formula with the informal requirement.

Verus form: Inference: define a reward from successful Verus verification, reduced diagnostic count, and repair size; optimize candidate contract/proof generation with a verifiable-reward policy update. Keep the generated Rust and its specification under independent Verus checking; a reward model must not be trusted as a proof.

## evidence, trusted boundary, and product threat
On the VERIFY test set, the full system reports 27.8% semantic equivalence and 93.7% syntactic correctness (Table 2, p.11). Of syntactically correct outputs, 96.8% are satisfiable and, of those, 95.4% are non-trivial, yielding an unconditional pass rate of 86.2% (Section 4.2, p.11; the paper defines these conditional denominators explicitly). The filter catches 28.4% of the 72.2% semantically incorrect outputs: 8.7% at parsing, 12.3% as unsatisfiable, and 7.4% as trivial; the remaining 71.6% are satisfiable, non-trivial, and wrong (Table 3, p.12). These fractions sum to 100% of errors, while 28.4% of all errors is the caught subset.

The trusted symbolic boundary includes the ITL parser and Spot’s decision procedures; the neural encoder has no formal guarantee (Section 3.3). Inference: the intended meaning of a natural-language requirement, proposition definitions, training labels, and deployment environment remain assumptions. For agent-written verified Rust, NeuroNL2LTL’s strongest reusable ideas are typed intermediate representations, runtime sanity checks, bounded repair, and verifier-derived rewards. Its 28% semantic-equivalence result also shows the product threat: a contract can be satisfiable and non-trivial yet semantically wrong, so Verus acceptance alone cannot validate requirement intent. The paper already addresses this verifier-in-the-loop pattern; VL should measure intent agreement and specification review rather than repeat only satisfiability checks.

## techniques for the catalog
- structure-preserving intermediate representation — translate through a grammar whose deterministic inverse preserves logical structure
- grammar-constrained decoding — restrict generated tokens to the valid intermediate-language grammar
- satisfiability and non-triviality filtering — use a symbolic backend to reject contradictory, vacuous, or malformed specifications
- bounded two-layer repair — try ranked local edits, then learned AST edits, rechecking after each repair
- verifier-in-the-loop reward — optimize neural generation with parser, verifier, and repair-cost feedback

Checked 2026-10-15 against the paper by a Codex agent for neuronl2ltl_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
