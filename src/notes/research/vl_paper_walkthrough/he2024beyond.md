# Beyond Code Generation: Assessing Code LLM Maturity with Postconditions
(authored by agents unless marked 🧑)
Tag: `he2024beyond`, [paper](https://doi.org/10.1109/)

## purpose and benchmark

He, Zhai, and Pan propose evaluating code LLMs by generating formal postconditions from code context and natural-language descriptions. Their claim is that ordinary code-generation benchmarks miss semantic understanding, logical reasoning, and specification writing. The paper says: “Postcondition generation requires LLMs to not only understand the semantics of the code and the accompanying natural language description but also to generate precise and unambiguous postconditions in programming languages.” (Introduction, p. 2). They augment EvalPlus, whose 164 problems include a signature, comments, canonical solution, and legal tests, and generate 1,293 buggy mutants (at least 50 insertion attempts per problem, deduplicated failing mutants; Section 5.1, p. 6).

The benchmark measures correctness and bug-finding, not proof. It defines C@k as the probability that at least one of k sampled responses is correct, CPC as the number of problems with entirely correct postconditions, BCR as the fraction of problems for which generated postconditions identify all bugs, and BDR as the percentage of buggy mutants identified (Section 5.1, pp. 6–7). These denominators must stay separate when using the results for Verus.

## technique 1: postcondition taxonomy and maturity levels

What it is. Table 1 classifies ten postcondition types: Type, NULL, Boundary, Equality, Arithmetic Bounds, Boolean Condition, String Format, Container Element, Container Property, and Other. Table 2 maps these to a five-level maturity model: Level 0 has no reliable generation; Level 1 covers basic type and NULL checks; Level 2 covers boundaries, arithmetic bounds, Boolean conditions, and container properties; Level 3 covers container elements and equality; Level 4 covers all types with complete accuracy.

How to apply it. (1) For each function, identify the return value and relevant inputs. (2) Generate checks for type and NULL first. (3) Add boundary and arithmetic-range checks. (4) Add Boolean, string, and container-property checks where their data types permit. (5) Add element-level and equality checks that encode concrete functional behavior. (6) Report metrics per category and an aggregate level rather than one undifferentiated score. The category applicability rules are in Section 3, p. 3, and the maturity mapping is Table 2, p. 4.

Verus form. Inference: map Type/NULL/Boundary predicates to `requires` or `ensures` over Rust types and option values; map equality, arithmetic, Boolean, string, and container conditions to `ensures` clauses and helper `spec fn`s. A Verus type checker can reject malformed predicates, but category coverage remains an evaluation design choice. Inference: a Level 4 score on this benchmark would not establish complete specifications for stateful or concurrent Rust.

Evidence. Table 4 evaluates Gemma-v1.1-7b-it over 164 problems for Type, NULL, Boundary, and Equality, but only 56 arithmetic-bound problems, 28 Boolean, 30 string, and 50 container problems. Boundary C@5 is 100.00% (164/164), while Equality C@5 is 34.15% (56/164) and Boolean C@1 is 41.43% (22/164). The differing denominators are the paper's #Prob counts, not an inference.

## technique 2: few-shot postcondition prompting

What it is. Section 4.3 constructs a prompt with five components: instruction, guidelines, response format, manually written examples, and the target's natural-language description. The template asks for assertions over input parameters and a hypothetical `return_val`. Appendix A says: “When writing the postconditions, only use the function's input parameters and a hypothetical return value variable, which we will assume is stored in a variable named return_val.”

How to apply it. (1) Provide code context, function stub, and comment. (2) State the desired category or all categories. (3) Include guidelines limiting variables to inputs and `return_val`, allowing only pure external functions, and splitting conjunctions into separate assertions. (4) Include one or three correct examples. (5) Require a parseable fenced list of assertions. (6) Sample five responses per prompt at temperature 0.7, then parse and deduplicate assertions. These are the paper's Section 4.3 and Section 5.1 steps.

Verus form. Inference: replace `return_val` with the Rust result variable in an `ensures` clause, and replace Python pure helpers with `spec fn`s or existing Verus specifications. The prompt's syntactic restrictions are useful because they reduce out-of-scope names, but ownership, borrows, and quantified collections require Rust-specific examples.

Evidence. For Gemma-7b-it, C@1 is 47.44% (117/164) at zero-shot, 98.54% (not a denominator explicitly printed in the table but C@1 over 164 problems) at one-shot, and 99.76% at three-shot; CPC reaches 164 for one- and three-shot (Table 3, p. 7). Inference: these are generated-condition correctness rates against the benchmark's tests, not verifier-checked universal contracts.

## technique 3: category-based decomposition

What it is. Section 4.4 splits generation into category-specific subtasks. Type, NULL, Boundary, and Equality are requested for every program; arithmetic, Boolean, string, and container categories are requested selectively based on variable types. Each specialized prompt retains the five components but uses category-specific guidelines and examples.

How to apply it. (1) Inspect the function signature and context to determine applicable data types. (2) Run a type-specific prompt for every applicable category. (3) Extract expected postconditions in postprocessing. (4) Union the category outputs with few-shot outputs. (5) Evaluate both each category and the union. The paper explicitly says, “For each postcondition category, we use a more specific prompt that explicitly instructs the LLMs to generate postconditions of that particular category.” (Section 4.2, p. 5).

Verus form. Inference: generate separate candidate `ensures` clauses or `spec fn` predicates per category, then ask Verus to prove each clause and review their conjunction for consistency. Category decomposition does not solve underspecification: two individually provable clauses can still omit the required behavior.

Evidence. Table 3 reports category-based BCR from 18.90% to 31.72% and BDR from 60.23% to 77.42% across the three models. The combined three-shot plus category-based approach reaches BCR 34.15% for Gemma-v1.1-7b-it and BDR 77.42% for Mistral-7B-Instruct. BCR's denominator is 164 problems; BDR's denominator is the 1,293 mutants (Section 5.1 and Table 3).

## technique 4: mutation-based completeness evaluation

What it is. The authors generate mutants that fail EvalPlus tests, deduplicate mutants with identical failing test cases, and ask whether generated postconditions expose them. A postcondition “detects” a mutant when the mutant violates it on a valid benchmark input. BCR requires all bugs for a problem; BDR counts all detected mutants.

How to apply it. (1) Start with each canonical EvalPlus solution. (2) Prompt Gemma-7b-it and Mistral-7B-Instruct at temperature 0.9 to insert bugs, for at least 50 iterations per problem. (3) Retain only mutants failing legal tests and deduplicate equivalent failures. (4) Generate postconditions independently. (5) Run each postcondition against canonical and mutant implementations. (6) Compute BCR per problem and BDR over all mutants. This is Section 5.1's method.

Verus form. Inference: mutate Rust implementations while preserving the same `requires` domain, run Verus against candidate `ensures`, and count failed proofs as detected mutants. If a concrete counterexample is needed, pair Verus with a separate test generator; this paper's test harness, not Verus, supplies failing inputs.

Evidence and limits. The 1,293 mutants average approximately eight per problem, but the paper does not establish that they cover all bug classes. Its own limitations state that the taxonomy may miss real-world edge cases, few-shot quality strongly influences results, and only open-source LLMs are evaluated (Limitations, p. 10). Inference: mutation scores can overestimate or underestimate specification quality depending on mutant diversity.

## what is proved, measured, and trusted

The paper measures test-based postcondition correctness, C@k, CPC, BCR, and BDR. It does not prove generated conditions with a sound deductive verifier. Trusted artifacts include EvalPlus canonical solutions and legal tests, the manually written few-shot examples, mutant-generation models, and the deduplication rule. The paper reports a contradiction in wording: it calls 3-shots and category-based generation “at least one correct postcondition for each problem,” while Table 3's C@1 entries are dashes for category-based rows and CPC is the directly printed 164/164 measure. Use the table's denominator and metric names.

## implications for VL

Inference: VL can reuse the taxonomy, category-specific prompting, parseable assertion output, and mutation metrics as a specification-generation benchmark. It should not treat C@k or CPC as proof; Verus acceptance must be a separate gate. Inference: the product threat is high for agent-written Rust if benchmark tests are mistaken for complete contracts: the paper's best BCR is only 34.15% of 164 problems and BDR is at most 77.42% of 1,293 generated mutants. The benchmark is single-function Python and leaves ownership, concurrency, unsafe code, external effects, and specification review outside scope. Existing postcondition-generation work already covers this basic prompt-and-mutation loop; VL should measure Verus-specific gains rather than redo a generic code-LLM benchmark.

## techniques for the catalog

- postcondition taxonomy — classify generated assertions into ten semantic categories and map coverage to maturity levels
- few-shot assertion prompting — provide instruction, rules, format, examples, and code comments, then sample parseable assertions
- category decomposition — run type-specific prompts and union their extracted assertions
- mutation completeness — generate failing mutants and report per-problem all-bug coverage and per-mutant detection
- denominator-separated metrics — keep C@k/CPC, BCR over problems, and BDR over mutants distinct
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
