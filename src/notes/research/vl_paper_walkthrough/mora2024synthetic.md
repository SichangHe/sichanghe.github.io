# Synthetic Programming Elicitation for Text-to-Code in Very Low-Resource Programming and Formal Languages
(authored by agents unless marked 🧑)
Tag: `mora2024synthetic`, [paper](https://arxiv.org/abs/2406.03636)

## what the paper proves or measures

Mora et al. address text-to-code when the target language has too little training data for an LLM to generate it reliably. Synthetic programming elicitation and compilation (SPEAC) chooses a parent language `P` that the model can write, a child subset `C ⊂ P` that can be compiled, and a compiler from `C` to the target very-low-resource language `T`. The prototype, Eudoxus, uses Python as `P`, an object-oriented Python subset as `C`, and UCLID5 as `T`. UCLID5 models transition systems and checks formal specifications. The abstract states, “When LLMs generate code that lies outside of this intermediate language, we use compiler techniques to repair the code into programs in the intermediate language.” (Abstract, p. 1.)

Inference: SPEAC is a generation and repair architecture with a syntax-directed compiler in this prototype. It does not prove that a natural-language description was faithfully translated, nor does it prove semantic correctness of every generated model. Figure 1 gives the boundary explicitly: a UCLID5 output can pass every compiler check and still contain a semantic error, such as declaring an environmental pedestrian input as an internal variable (Section 3, pp. 3–4). The authors' key empirical claim is that the architecture makes syntactically valid output common in a VLPL. Their introduction reports “producing parsable code in UCLID5 84.8% of the time compared to 9.1% by gpt-3.5-turbo fine-tuning and 12.1% by gpt-4-turbo in-context learning.” (§1, p. 2.) Table 1 differs on fine-tuning, as discussed below.

## technique 1: elicit a model-natural parent and compilable child language

what it is: run a small programming study with the target language, direct target prompts, and prompts that describe a hypothetical API in popular host languages. Label recurring generated structures, group labels into concepts and categories, then choose a parent language and a restricted child language whose syntax matches those structures and has a compiler to the target (§5.1, pp. 5–7). This is synthetic programming elicitation: the LLM is the subject, not a human programmer.

when to use it: Inference: use this method for a domain-specific or formal language with sparse public examples, especially when the model can reliably express the domain in a familiar language but cannot emit target syntax. The chosen parent need not be semantically general; it needs a stable idiom that can be translated.

how to do it:

1. Select target language, LLM subjects, and programming tasks (here, regression tests with handwritten natural-language descriptions) (§5.1, p. 6).
2. Prepare independent prompts for direct target generation and for imaginary APIs in candidate parent languages (§5.1, p. 6).
3. Execute every subject on every prompt and collect outputs independently (§5.1, p. 6).
4. Manually code recurring output fragments, group codes into concepts, group concepts into categories, and select `P` and `C` from the resulting categories (§5.1, p. 6).
5. In the UCLID5 case, select the object-oriented category because its methods map directly to UCLID5; define `C` as a Python subset extending an abstract class, including a `next` method for the transition relation (§5.1, pp. 6–7). The overall workflow also requires a compiler from `C` to `T` (§3, p. 4).

In the UCLID5 study, none of 660 direct attempts (10 samples × 33 benchmarks × 2 LLMs) parsed. Python API prompts were more consistent, and object-oriented outputs exposed methods corresponding to UCLID5 transition-system parts. The authors therefore chose Python as `P` and an abstract-class subset as `C` (§5.1, pp. 6–7).

Verus form: Inference: use ordinary Rust as `P` only for syntax the model already handles, then define a child grammar or Rust wrapper API whose operations map to Verus contracts, state-machine transitions, or proof blocks. A compiler can translate child declarations to Verus source, but target semantics still require `requires`, `ensures`, `spec fn`, `proof fn`, and verifier checking. The paper's Python classes and UCLID5 `module`/`procedure` syntax do not carry over.

evidence and limits: the elicitation sample is only two models and 33 tasks (§5.1, p. 6). Inference: it discovers a workable interface, not an optimal one. The authors do not show that a different labeling team would select the same `P` and `C`, and they evaluate only UCLID5 (§6.2, p. 10).

## technique 2: generate in the parent, then repair and compile through holes

what it is: the SPEAC pipeline asks the LLM for code in `C`, receives parent-language code `p`, repairs it into a complete or partial child program, compiles complete child programs with `f : C → T`, and asks the LLM to fill remaining holes (§3, p. 4). A hole is `??` and represents an unresolved fragment. The prompt says, “Fix the following [PARENT LANGUAGE] code by replacing every occurrence of ‘??‘ with the correct code.” (Fig. 4b, p. 7.)

how to do it:

1. Give the task and a description of the child language to the parent-language generation template (§5.2, Fig. 4a, p. 7).
2. Parse the returned parent program and apply formal repair techniques to produce a child program, possibly with holes (§3, p. 4).
3. If no holes remain, run the syntax-directed compiler to emit target code (§3, p. 4).
4. Otherwise, prompt the LLM with the partial child program and task, asking it to replace each `??` (§3, p. 4; §5.2, Fig. 4b, p. 7).
5. Repeat repair and hole filling up to five LLM calls per benchmark in Eudoxus (Table 1 caption, p. 10).

The running traffic-light example shows why the boundary matters. Eudoxus emits UCLID5 declarations, an initialization block, and a `step` transition; the result parses but incorrectly declares `pedestrian` as a controlled variable rather than an input (§3, pp. 3–4). Inference: passing compiler checks is a prerequisite check, not a semantic proof.

Verus form: Inference: have a parent-language agent emit a restricted Rust model with placeholders for contracts or proof bodies, compile the filled child source, and run Verus before accepting it. A hole-filled contract must not silently weaken the intended specification. Keep the original natural-language requirement and child template immutable while allowing repairs only in designated proof regions.

## technique 3: compute the largest consistent subtree with MAX-SMT

what it is: recover as much of a malformed parent AST as possible while satisfying all static checks of `C`. The method has three stages: error-tolerant parsing, recursive pruning of nodes that cannot occur in a child AST, and MAX-SMT selection of the largest satisfiable set of soft clauses (§5.3, pp. 7–8). The paper says, “The third step finds the minimal number of AST nodes that need to be replaced with holes such that all static checks of the language C pass, using the approach of Pavlinovic et al. [32].” (Section 5.3, p. 7.)

how to do it:

1. Parse `p` with an error-tolerant parser into AST `A` (§5.3, p. 7).
2. Starting at the root, recursively prune constructs forbidden by `C` and place holes where a child AST needs a replacement (§5.3, p. 7).
3. For every static check and AST node, emit a set of soft clauses describing the check; let `S` be their union (§5.3, p. 7).
4. Solve MAX-SMT for the largest satisfiable subset `S′`; every clause in `S \ S′` identifies a node to replace with a hole (§5.3, p. 7).
5. In the prototype, weight clauses proportionally to AST depth to favor edits near leaves; uniform weights and one clause per node recover minimal edit count, while depth weights sacrifice that guarantee (§5.3, p. 7).

The UCLID5 example has `var x: bv32;` and `x = 0;`. One clause says `x` is a bitvector and another says it is an integer; one possible MAX-SMT solution drops the bitvector-type assertion and yields `var x: ??;` so later repair can choose a consistent type (§5.3, p. 7). Inference: this repairs static consistency without establishing semantic correctness.

Verus form: Inference: parse generated Rust into an AST, express type, declaration, ownership, and permitted-annotation constraints as a finite set of solver clauses, and replace rejected subtrees with explicit holes before generating Verus. Do not model a `proof fn` call as runtime behavior, and do not use `external_body` to make a hole pass. Verus itself remains the final checker; MAX-SMT only selects a syntactically and statically plausible fragment.

evidence and limits: Inference: the technique depends on encoding the relevant child-language static checks and operating on a finite AST. It can preserve an internally consistent but semantically wrong subtree, as the traffic-light `pedestrian` declaration demonstrates. The authors state, “This ensures that edits are closer to the leafs of the AST but it breaks syntactic minimality guarantees.” (§5.3, p. 7.)

## technique 4: use satisfying models to fill static holes, then ask the LLM only for residual repairs

what it is: after MAX-SMT returns a satisfiable clause set, obtain a satisfying model and substitute model values into holes. For `var x: ??;` constrained by `is_Integer(??)`, the model assigns `integer`, yielding `var x: integer;` (§5.4, p. 8). Holes that cannot be resolved by the model are returned to the LLM through the hole-filling prompt (§3, p. 4; §5.4, p. 8).

how to do it:

1. Construct the satisfiable clause set for the repaired partial AST (§5.4, p. 8).
2. Ask the SMT solver for a model of the unresolved values (§5.4, p. 8).
3. Substitute model assignments into the corresponding AST holes and regenerate source (§5.4, p. 8).
4. For remaining holes, ask the LLM to replace every `??` and complete the original task (§3, p. 4; Fig. 4b, p. 7).
5. Run child static checks again; compile only a hole-free child program (§3, p. 4).

Verus form: Inference: use solver models for finite type and shape choices, then emit concrete Rust annotations or proof skeletons and run Verus. A model assignment is a witness for encoded static constraints, not a proof that an `ensures` clause captures the requirement. Preserve a distinction between solver-generated code and the final Verus proof result.

evidence and limits: Eudoxus is limited to five LLM calls per benchmark (Table 1 caption, p. 10). MAX-SMT is local and faster than model calls: GPT-3.5 runs repair in 0.9 seconds average (SD 0.6) versus 7.2 seconds for LLM calls (SD 4.6); GPT-4 repair averages 1.8 seconds (SD 2.0) versus 35.1 seconds (SD 24.7) for calls (§6.1, p. 10). MAX-SMT queries ran locally on a 2.3 GHz quad-core Intel i7 with 32 GB RAM; LLM calls used the OpenAI Python API (§6, p. 8). Inference: these timings do not establish production latency.

## technique 5: evaluate syntax and semantics separately

what it is: report parse rate as the fraction of outputs passing all compiler checks, then manually score only parsed programs for semantic correctness on a 1–5 scale (§6.1, p. 9). Scores 4 or 5 are treated as useful by the single evaluator. Compare Eudoxus against few-shot prompting with and without chain-of-thought, fine-tuned GPT3t, and self-repair baselines on 33 textbook benchmarks. The models are gpt-3.5-turbo-0125 (GPT3t) and gpt-4-turbo-2024-04-09 (GPT4t) (§6, pp. 8–10).

how to do it:

1. Run each workflow on the same 33 textbook benchmark tasks and record whether compilation succeeds (§6.1, p. 9).
2. For every parsed program, manually reason about behavior and consult handwritten specifications (§6.1, p. 9).
3. Record semantic score 1–5, keeping parse failures out of the semantic denominator (§6.1, p. 9; Table 1, p. 10).
4. Report unique tasks solved across all variants as well as per-variant fractions (§6.1, p. 10).

evidence and limits: Table 1 gives Eudoxus GPT-4 parse 24/33 and GPT-3.5 parse 28/33; fine-tuned GPT-3.5 is 2/33, GPT-4 one-shot with chain-of-thought is 1/33, and self-repair is 0/33 (Table 1, p. 10). Across the two Eudoxus variants, 30/33 unique tasks parse; all baselines together parse only 6/33 unique tasks (§6.1, p. 10). Among Eudoxus outputs that parse, 33/52 score at least 4; the denominator is parsed programs from both variants, not all 66 runs. Every baseline task scoring at least 4 is also solved by Eudoxus, but only four unique baseline tasks reach that threshold (§6.1, p. 10).

The paper contains reporting inconsistencies. The introduction reports “84.8%” for SPEAC and “9.1%” for fine-tuning (§1, p. 2); Table 1 gives 28/33 for Eudoxus GPT3t and 2/33 for fine-tuned GPT3t (p. 10). Inference: these fractions equal approximately 84.8% and 6.1%, respectively. Section 6.1 also says “passing all compiler checks on 78% of benchmarks” (p. 9). Inference: neither individual table fraction equals 78%; the combined fraction is 52/66 ≈ 78.8%. The text does not specify the denominator for 78%, so use the table fractions.

## trusted boundary, contradictions, and scope

Inference: the results depend on the UCLID5 compiler checks, Z3/MAX-SMT, the child-to-target compiler, the selected child-language abstraction, and one author's semantic assessments using manual reasoning and handwritten specifications. Eudoxus's 33 textbook tasks are same-domain examples, not a broad sample of formal models. The limitations are explicit: only one VLPL, only two LLMs, and one semantic evaluator (§6.2, p. 10). Inference: passing compiler checks establishes a useful prerequisite check but not a verified transition-system property; for agent-written verified Rust, the corresponding trusted boundary must end at Verus acceptance of fixed contracts, while contract adequacy, generated model semantics, and external assumptions require separate review.

## techniques for the catalog

- synthetic programming elicitation — study model outputs to choose a familiar parent language and a compilable child subset for a sparse target language
- parent-to-target hole workflow — generate in the parent, formally repair, compile complete child programs, and ask the model only to fill residual holes
- largest consistent subtree — parse an error-tolerant AST, prune unsupported constructs, and use MAX-SMT soft clauses to choose holes; depth weighting sacrifices minimal edit count
- model-based static repair — substitute satisfying solver-model values into holes before invoking another model
- syntax/semantic split — measure compiler parsing separately from manually assessed semantic correctness with explicit denominators
