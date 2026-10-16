# Synthetic Programming Elicitation for Text-to-Code in Very Low-Resource Programming and Formal Languages
(authored by agents unless marked 🧑)
Tag: `mora2024synthetic`, [paper](https://www.semanticscholar.org/paper/9efdb8b18838aacb363095f2594089e0dc2983ae)

## what the paper proves or measures

Mora et al. address text-to-code when the target language has too little training data for an LLM to generate it reliably. Synthetic programming elicitation and compilation (SPEAC) chooses a parent language `P` that the model can write, a child subset `C ⊂ P` that can be compiled, and a compiler from `C` to the target very-low-resource language `T`. The prototype, Eudoxus, uses Python as `P`, an object-oriented Python subset as `C`, and UCLID5 as `T`. UCLID5 models transition systems and checks formal specifications. The abstract states, “When LLMs generate code that lies outside of this intermediate language, we use compiler techniques to repair the code into programs in the intermediate language.” (Abstract, p. 1.)

SPEAC is a syntax-directed generation and repair architecture. It does not prove that a natural-language description was faithfully translated, nor does it prove semantic correctness of every generated model. Figure 1 gives the boundary explicitly: a UCLID5 output can pass every compiler check and still contain a semantic error, such as declaring an environmental pedestrian input as an internal variable (Section 3, pp. 3–4). The authors' key empirical claim is that the architecture makes syntactically valid output common in a VLPL. Their abstract reports 84.8% parse rate for the strongest Eudoxus setting, compared with 9.1% for fine-tuned GPT-3.5 and 12.1% for GPT-4 in-context learning.

## technique 1: elicit a model-natural parent and compilable child language

what it is: run a small programming study with the target language, direct target prompts, and prompts that describe a hypothetical API in popular host languages. Label recurring generated structures, group labels into concepts and categories, then choose a parent language and a restricted child language whose syntax matches those structures and has a compiler to the target (§5.1, pp. 5–7). This is synthetic programming elicitation: the LLM is the subject, not a human programmer.

when to use it: use this method for a domain-specific or formal language with sparse public examples, especially when the model can reliably express the domain in a familiar language but cannot emit target syntax. The chosen parent need not be semantically general; it needs a stable idiom that can be translated.

how to do it:
1. Select target language, LLM subjects, and tasks with natural-language descriptions and expected target programs (§5.1, p. 6).
2. Prepare independent prompts for direct target generation and for imaginary APIs in candidate parent languages (§5.1, p. 6).
3. Execute every subject on every prompt and collect outputs independently (§5.1, p. 6).
4. Manually code recurring output fragments, group codes into concepts, group concepts into categories, and select `P` and `C` from the resulting categories (§5.1, p. 6).
5. Define a compiler from `C` to `T`; retain only child constructs for which translation is straightforward (§5.1, pp. 6–7).

In the UCLID5 study, none of 660 direct attempts (10 samples × 33 benchmarks × 2 LLMs) parsed. Python API prompts were more consistent, and object-oriented outputs exposed methods corresponding to UCLID5 transition-system parts. The authors therefore chose Python as `P` and an abstract-class subset as `C` (§5.1, pp. 6–7).

Verus form: Inference: use ordinary Rust as `P` only for syntax the model already handles, then define a child grammar or Rust wrapper API whose operations map to Verus contracts, state-machine transitions, or proof blocks. A compiler can translate child declarations to Verus source, but target semantics still require `requires`, `ensures`, `spec fn`, `proof fn`, and verifier checking. The paper's Python classes and UCLID5 `module`/`procedure` syntax do not carry over.

evidence and limits: the elicitation sample is only two models and 33 tasks. It discovers a workable interface, not an optimal one. The authors do not show that a different labeling team would select the same `P` and `C`, and they evaluate only UCLID5 (§6.2, p. 10).

## technique 2: generate in the parent, then repair and compile through holes

what it is: the SPEAC pipeline prompts the LLM for `p ∈ P`, repairs it into a complete or partial `p′ ∈ C`, compiles complete `p′` with `f : C → T`, and, when holes remain, prompts the LLM to fill them. Figure 2's loop is explicit: “If `p′` does not contain holes, SPEAC applies `f`, a compiler from `C` to the target language, `T`, and returns the result.” (Section 3, p. 4.) A hole is `??` and represents an unresolved child-language fragment.

how to do it:
1. Give the task and a description of the child language to the parent-language generation template (§5.2, Fig. 4a, p. 7).
2. Parse the returned parent program and apply formal repair techniques to produce a child program, possibly with holes (§3, pp. 4–5).
3. If no holes remain, run the syntax-directed compiler to emit target code (§3, p. 4).
4. Otherwise, prompt the LLM with the partial child program and task, asking it to replace each `??` (§3, Fig. 4b, p. 4; §5.2, p. 7).
5. Repeat repair and hole filling up to five LLM calls per benchmark in Eudoxus (§6, p. 8).

The running traffic-light example shows why the boundary matters. Eudoxus emits UCLID5 declarations, an initialization block, and a `step` transition; the result parses but incorrectly declares `pedestrian` as a controlled variable rather than an input (§3, pp. 3–4). Thus parser success is a syntactic gate, not a semantic proof.

Verus form: Inference: have a parent-language agent emit a restricted Rust model with placeholders for contracts or proof bodies, compile the filled child source, and run Verus before accepting it. A hole-filled contract must not silently weaken the intended specification. Keep the original natural-language requirement and child template immutable while allowing repairs only in designated proof regions.

## technique 3: compute the largest consistent subtree with MAX-SMT

what it is: recover as much of a malformed parent AST as possible while satisfying all static checks of `C`. The method has three stages: error-tolerant parsing, recursive pruning of nodes that cannot occur in a child AST, and MAX-SMT selection of the largest satisfiable set of soft clauses (§5.3, pp. 7–8). The paper says, “The third step finds the minimal number of AST nodes that need to be replaced with holes such that all static checks of the language C pass.” (Section 5.3, p. 7.)

how to do it:
1. Parse `p` with an error-tolerant parser into AST `A` (§5.3, p. 7).
2. Starting at the root, recursively prune constructs forbidden by `C` and place holes where a child AST needs a replacement (§5.3, p. 7).
3. For every static check and AST node, emit a soft clause describing the check; let `S` be their union (§5.3, p. 7).
4. Solve MAX-SMT for the largest satisfiable subset `S′`; every clause in `S \ S′` identifies a node to replace with a hole (§5.3, p. 7).
5. Weight clauses by AST depth when leaf-near edits are preferred; uniform weights and one clause per node recover minimal edit count, while depth weights sacrifice that guarantee (§5.3, p. 8).

The UCLID5 example has `var x: bv32;` and `x = 0;`. One clause says `x` is a bitvector and another says it is an integer; MAX-SMT drops one and yields `var x: ??;` so later repair can choose a consistent type (§5.3, p. 7). This is a concrete static-consistency repair, not a semantic correction.

Verus form: Inference: parse generated Rust into an AST, express type, declaration, ownership, and permitted-annotation constraints as a finite set of solver clauses, and replace rejected subtrees with explicit holes before generating Verus. Do not model a `proof fn` call as runtime behavior, and do not use `external_body` to make a hole pass. Verus itself remains the final checker; MAX-SMT only selects a syntactically and statically plausible fragment.

evidence and limits: the technique depends on a complete enough child-language static checker and a finite AST. It can preserve an internally consistent but semantically wrong subtree, as the traffic-light `pedestrian` declaration demonstrates. Depth weighting intentionally breaks syntactic minimality (§5.3, p. 8).

## technique 4: use satisfying models to fill static holes, then ask the LLM only for residual repairs

what it is: after MAX-SMT returns a satisfiable clause set, obtain a satisfying model and substitute model values into holes. For `var x: ??;` constrained by `is_Integer(??)`, the model assigns `integer`, yielding `var x: integer;` (§5.4, p. 8). Holes that cannot be resolved by the model are returned to the LLM through the hole-filling prompt (§3, p. 4; §5.4, p. 8).

how to do it:
1. Construct the satisfiable clause set for the repaired partial AST (§5.4, p. 8).
2. Ask the SMT solver for a model of the unresolved values (§5.4, p. 8).
3. Substitute model assignments into the corresponding AST holes and regenerate source (§5.4, p. 8).
4. For remaining holes, ask the LLM to replace every `??` while preserving the child-language template and task (§3, Fig. 4b, p. 4).
5. Run child static checks again; compile only a hole-free child program (§3, p. 4).

Verus form: Inference: use solver models for finite type and shape choices, then emit concrete Rust annotations or proof skeletons and run Verus. A model assignment is a witness for encoded static constraints, not a proof that an `ensures` clause captures the requirement. Preserve a distinction between solver-generated code and the final Verus proof result.

evidence and limits: Eudoxus runs up to five repair-loop calls. MAX-SMT is local and faster than model calls: GPT-3.5 runs repair in 0.9 seconds average (SD 0.6) versus 7.2 seconds for LLM calls (SD 4.6); GPT-4 repair averages 1.8 seconds (SD 2.0) versus 35.1 seconds (SD 24.7) for calls (§6.1, p. 10). These times use a 2.3 GHz quad-core Intel i7 with 32 GB RAM and exclude any claim of production latency.

## technique 5: evaluate syntax and semantics separately

what it is: report parse rate as the fraction of outputs passing all compiler checks, then manually score only parsed programs for semantic correctness on a 1–5 scale (§6.1, p. 9). Scores 4 or 5 are treated as useful by the single evaluator. Compare Eudoxus against few-shot, chain-of-thought, fine-tuning, and self-repair baselines on 33 textbook benchmarks (§6, pp. 8–10).

how to do it:
1. Run each workflow on the same 33 benchmark tasks and record whether compilation succeeds (§6, p. 8).
2. For every parsed program, manually reason about behavior and consult handwritten specifications (§6.1, p. 9).
3. Record semantic score 1–5, keeping parse failures out of the semantic denominator (§6.1, Table 1, p. 9).
4. Report unique tasks solved across all variants as well as per-variant fractions (§6.1, p. 10).

evidence and limits: Table 1 gives Eudoxus GPT-4 parse 24/33 and GPT-3.5 parse 28/33; fine-tuned GPT-3.5 is 2/33, GPT-4 one-shot with chain-of-thought is 1/33, and self-repair is 0/33 (Table 1, p. 9). Across the two Eudoxus variants, 30/33 unique tasks parse; all baselines together parse only 6/33 unique tasks (§6.1, p. 10). Among Eudoxus outputs that parse, 33/52 score at least 4; the denominator is parsed programs from both variants, not all 66 runs. Every baseline task scoring at least 4 is also solved by Eudoxus, but only four unique baseline tasks reach that threshold (§6.1, p. 10).

The paper contains a reporting tension: the abstract says SPEAC produces syntactically correct programs 84.8% of the time, which equals GPT-3.5 Eudoxus's 28/33; §6.1 says Eudoxus passes all compiler checks on 78% of benchmarks, while the GPT-4 variant is 24/33 = 72.7% and GPT-3.5 is 84.8%. The text does not identify a denominator that yields exactly 78%. Inference: retain the table fractions rather than treat 78% as a third independent result.

## trusted boundary, contradictions, and scope

The UCLID5 parser/compiler, Z3/MAX-SMT, handwritten semantic specifications, one author's manual semantic scores, the parent-to-child compiler, and the correctness of the selected child-language abstraction are trusted or assumed. Eudoxus's 33 textbook tasks are same-domain examples, not a broad sample of formal models. The limitations are explicit: only one VLPL, only two LLMs, and one semantic evaluator (§6.2, p. 10). Parsing therefore establishes a useful intermediate gate but not a verified transition-system property. Inference: for agent-written verified Rust, the corresponding trusted boundary must end at Verus acceptance of fixed contracts, while contract adequacy, generated model semantics, and external assumptions require separate review.

What VL should not redo: the paper already provides an empirical parent/child-language selection procedure, AST pruning with soft constraints, MAX-SMT model repair, hole-filling prompts, and syntax-versus-semantics denominators for a formal language. Inference: a VeruLaw project should test whether a Verus-specific child API reduces syntax and annotation failures, rather than repeat a generic “ask the LLM for Rust” baseline. The threat to agent-written verified Rust is high for malformed or misplaced proof syntax and moderate for semantic drift: SPEAC can preserve a consistent AST while retaining a wrong state model, so final Verus proofs and requirement review remain essential.

## techniques for the catalog

- synthetic programming elicitation — study model outputs to choose a familiar parent language and a compilable child subset for a sparse target language
- parent-to-target hole workflow — generate in the parent, formally repair, compile complete child programs, and ask the model only to fill residual holes
- largest consistent subtree — parse an error-tolerant AST and use recursive pruning plus MAX-SMT soft clauses to minimize replaced nodes
- model-based static repair — substitute satisfying solver-model values into holes before invoking another model
- syntax/semantic split — measure compiler parsing separately from manually assessed semantic correctness with explicit denominators

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
