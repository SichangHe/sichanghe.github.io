# Integrating Symbolic Execution with LLMs for Automated Generation of Program Specifications
(authored by agents unless marked 🧑)
Tag: `yang2025integrating`, [paper](https://doi.org/10.1145/)

## scope and result

Yang et al. present SESpec, which combines path-sensitive symbolic execution, invariant templates, an LLM, and Frama-C verification. The abstract states: “Our method first employs symbolic execution to derive precise strongest postconditions for loop-free code segments.” It then uses those states and generated templates to guide loop-invariant synthesis. The goal is full specifications—preconditions, postconditions, and loop invariants—without requiring an externally supplied verification goal.

The evaluation uses 395 programs across SyGuS, OOPSLA, SV-COMP, NLA, numer-S, Frama-C, pIp, and list-S. Frama-C 29.0 WP uses Z3, a typed-memory model, and a three-second timeout per query (section 6.1, p. 17). SESpec verifies 354/395 programs (nearly 90%), but the denominator includes all eight benchmark sets and all program categories (section 6.2, p. 18).

## technique 1: symbolic execution as a strongest-specification oracle

when to use it

Use symbolic execution for loop-free segments and around calls/loops to supply exact path conditions and stores. It is most useful when an LLM otherwise has to infer dataflow or aliasing from source text.

steps from the paper

1. Flatten memory so each atomic memory unit has a symbolic value and track aliases explicitly (sections 2.1 and 3.1, pp. 3, 10)
2. Represent each path by a path condition `PC` and symbolic store `σ` (section 3.1, p. 10)
3. Start at the function entry with initial symbolic values and propagate states through branches (section 3.1, p. 10)
4. On a call, pause the caller, recursively generate a callee specification, then resume with the callee summary (section 2.1 and Algorithm 1, pp. 3, 11)
5. For a loop-free segment, disjoin reachable symbolic states at the end into the strongest postcondition; derive the corresponding weakest precondition (section 3.1, p. 10)
6. Translate symbolic states into an LLM-readable description; never expose the internal QCP representation directly (section 5.1, p. 16)

The paper defines the strongest postcondition as “the logical formula describing the disjunction of all symbolic states ... reachable at p_end from p_start.” (section 3.1, p. 10)

Verus form

Inference: model the state relation as `spec fn` predicates over immutable mathematical values, then attach resulting pre/postconditions with `requires` and `ensures`. For mutable Rust, Verus specifications must respect ownership and supported memory models; the paper's flattened C memory model does not carry over directly. A `proof fn` can prove a summary lemma used by callers, but it is erased and cannot implement the symbolic executor at runtime.

Evidence and limits

The method is strongest on linear and loop-free code. Table 1 reports 197/204 linear-loop programs and 56/58 iteration-free programs solved (section 6.2, p. 18). It does not yet cover recursive functions, library functions, or system calls; the authors report 0/3 external/recursive-call programs solved (Table 1, p. 18).

## technique 2: symbolic-execution-derived invariant templates

when to use it

Use templates at loop boundaries to constrain an LLM to fill missing relationships instead of inventing a complete invariant from scratch. This is designed for loops with conditional entry, unchanged variables, inductive variables, and nested control flow.

steps from the paper

1. At loop entry, symbolically execute the pre-loop path and determine whether the loop-entry condition is established (section 2.1, p. 3)
2. Run `LoopAnalysis` to identify unchanged and non-inductive variables and recursively process inner loops (Algorithm 3, section 4.2, p. 14)
3. Generate parameterized ACSL skeletons, including conditional templates for loop entry and equality constraints for each variable (sections 2.1 and 4.3, pp. 3, 15)
4. Ask the LLM to fill the placeholders using the symbolic states and code context (Algorithm 2, section 4.1, p. 13)
5. Verify Base, Preservation, and the verification goal; pass the diagnostics to refinement (section 3.2, p. 12)

A motivating template is quoted in the paper: “loop invariant (0 < \\at(pIp, Pre)->len) ==> PLACE_HOLDER_for_i;” (section 2.1, p. 3)

Verus form

Inference: emit Rust loop `invariant` clauses from the same symbolic relations. Equality and bounds become mathematical expressions over sequence lengths or array indices; conditional loop-entry facts become implications in an invariant. Verus requires invariants strong enough for initialization and preservation, and a separate `ensures` proof for the postcondition. ACSL syntax, `\at`, and flattened pointer cells must be translated rather than copied.

Evidence and limits

The ablation uses 100 random programs (70 loop-related, 30 function-related) and caps refinement at three iterations (section 6.4, p. 21). For loop-invariant generation, Only-LLM has 37.50% validity and 28.75% accuracy, LLM+SE 62.86% and 60.00%, and LLM+SE+REFINE 95.71% and 87.21% (Figure 5, p. 21). The denominator is the 70 loop cases; the second function-specification block uses 30 cases and reaches 86.67% validity and accuracy with SE+REFINE. These are ablation settings, not the 395-program headline result.

## technique 3: error-directed invariant refinement

what it is and when to use it

Refinement classifies verifier failures and changes only the affected invariant. Use it after a candidate is syntactically valid but fails Base, Preservation, Termination, or the postcondition.

steps from the paper

1. Associate each verifier error with its candidate invariant (Algorithm 4, section 4.4, p. 15)
2. If Base or Preservation fails, weaken or adjust the invariant; if it is too weak to imply the postcondition, strengthen it (section 4.4, p. 15)
3. Regenerate a replacement through the LLM using the error and template context (section 4.4, p. 15)
4. Re-run formal verification and repeat until success or an iteration limit; eliminate consistently invalid invariants at the end (section 4.4, p. 15)

The authors explain: “The generated invariants by the LLM are not always valid (able to pass formal verification) or sufficiently strong to guarantee the verification goal.” (section 4.4, p. 15)

Verus form

Inference: feed Verus diagnostics back to a generator, but retain executable Rust and regenerate only `requires`, `ensures`, `invariant`, or proof lemmas. Use `assert` and small `proof fn` lemmas for local obligations. Do not place `external_body` on the function being verified; that would remove the very obligation refinement is meant to discharge.

Evidence and limits

On the same 100-case ablation, adding refinement raises loop validity from 62.86% to 95.71% and accuracy from 60.00% to 87.21%; for function specifications it raises validity from 50.00% to 86.67% and accuracy from 46.67% to 86.67% (Figure 5, p. 21). The authors report marginal gains from Pass@3 to Pass@5 on NLA, numer-S, and pIp (section 6.3, p. 19), suggesting convergence in those settings but not a guarantee for harder nested loops.

## what is proved, trusted, and already done

Frama-C WP and Z3 prove the generated ACSL obligations under the typed-memory model and timeout. QCP contributes symbolic states and Coq-verified postconditions, but its own limitations include manual annotations for loops and callees (section 5.1, p. 16). The final proof still trusts the specification, the C model, solver behavior, and any unmodeled calls. The authors explicitly avoid fine-tuning, retrieval, synthesized datasets, and few-shot prompts to reduce leakage (section 7, pp. 23–24), though model pretraining and benchmark choice remain validity concerns.

Inference: threat to agent-written verified Rust is high where loops, pointers, or calls require invariants. SESpec's strongest transferable lesson is to derive semantic context mechanically before asking an agent for a proof. VL should not redo a generic guess-and-repair loop without measuring Rust ownership, library contracts, and nested-loop limits. The paper's 354/395 result is C/ACSL evidence, not Verus evidence.

## techniques for the catalog

- strongest-postcondition guidance: symbolically execute path conditions and stores so loop-free behavior constrains generated contracts
- invariant skeleton completion: generate equality and entry-condition templates, then have an LLM fill only the unknown relations
- error-directed refinement: classify verifier failures, weaken or strengthen the affected invariant, and retry up to a fixed limit
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
