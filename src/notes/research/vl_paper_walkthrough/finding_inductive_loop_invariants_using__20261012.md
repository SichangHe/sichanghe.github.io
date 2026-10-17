# Finding Inductive Loop Invariants using Large Language Models
(authored by agents unless marked 🧑)
Tag: `kamath2023finding`, [paper](https://arxiv.org/abs/2311.07948v1)

Audit: audited 2026-10-13 against the paper; checked all counts (469, 293, 237, 383, 398, 370, 430, 31, the Table 2 rows), Algorithms 1 to 3 step by step, the prompt descriptions, the two quotations on Houdini, the repair-prompt quotation and the Example 1 description, and the Verus forms; changed the Repair success condition (the paper also returns a Houdini subset of the repaired set) and marked three unmarked inferences.

## paper and scope

Kamath et al. build an LLM-plus-verifier pipeline for inductive loop invariants. The LLM proposes candidates; a sound symbolic oracle rejects candidates that are syntactically invalid, non-inductive, or too weak to prove assertions. The paper’s important engineering result is that combining several incomplete LLM outputs and feeding verifier errors back to the LLM works better than asking for one perfect invariant. The dataset and experiments are C/ACSL and Frama-C, so the Verus mapping below is an inference. The paper has no earlier full walkthrough in the research notes.

## technique 1: generate candidates, then accept only oracle-checked proofs (Loopy)

what it is and when to use it

Loopy treats the language model as a proposal generator, never as the authority for correctness. Use it when a verifier can check a proposed invariant but cannot efficiently invent one. A candidate set is correct only when the oracle proves both inductiveness and sufficiency for the program’s assertions.

how to do it

1. Give the model a prompt template M and the complete target program P, including assertions.
2. Sample up to Ns completions at nonzero temperature. Each completion is a set I of loop invariants in the verifier’s syntax.
3. Annotate P with I and call oracle O. If O returns success, stop and return I.
4. Otherwise add I to a union Iu and continue sampling.
5. After sampling, search Iu for an inductive, sufficient subset with Houdini. If that fails, invoke Repair on Iu and the oracle’s diagnostics.

The paper defines the trust boundary directly: “The oracle O checks if a given set of candidate invariants are inductive and sufficient for verifying the program.” It also warns that “If the LLM generates a wrong candidate then the candidate is rejected. But if the checker passes then it has successfully demonstrated the validity of the Hoare triple.”

Verus form (inference)

Replace the C program and ACSL annotation with Rust/Verus code and put candidate `invariant` clauses at loop heads. The LLM can propose arithmetic relations, bounds, and implications; Verus checks them through `requires`, `ensures`, and loop invariants. A driver should compile each candidate in isolation, retain only candidates for which Verus discharges all proof obligations, and feed diagnostics back to the model. The generated text remains untrusted until Verus accepts it. Verus’s checker is the oracle; no semantic claim should be inferred from a candidate that was not checked.

evidence and limits

The pipeline is evaluated on 469 positive one-loop/one-method benchmarks. With GPT-4, prompt M2, and 15 completions, direct Loopy verifies 293 benchmarks. Adding Houdini raises this to 383; adding Repair with Ns=8 and Nr=7 raises the total to 398. These are benchmark counts, not percentages of arbitrary programs. The oracle uses Frama-C WP with Z3, Alt-Ergo, and CVC4, each with a three-second timeout. Inference: a timeout or unsupported reasoning can make a true candidate appear to fail.

## technique 2: union-and-prune with Houdini

what it is and when to use it

Houdini searches a large union of LLM-generated conjuncts without enumerating all subsets. It is useful when separate samples contain pieces of a proof but no single sample contains the complete invariant.

how to do it

1. Start with I=Iu.
2. Ask the oracle about all candidates.
3. If success, return I.
4. If the parser reports a syntax error for candidate i, remove i.
5. Otherwise remove the blamed subset IL reported by the oracle.
6. If IL is empty while the set is still insufficient, return failure; the remaining candidates are inductive but too weak.
7. Repeat until success or I is empty.

The algorithm makes at most |Iu| oracle calls, so it avoids exponential subset enumeration. The authors qualify the blame contract: “There must be at least one such candidate if the candidate set is not collectively inductive.” They also state the soundness direction: “the guarantee that Algorithm 2 returns an inductive set of invariants when it returns true is a valid guarantee.”

Verus form (inference)

Collect candidate `invariant` clauses from multiple model calls, then use a harness that tests the whole conjunction. If Verus diagnostics identify a failing clause, remove it and retry. Rust/Verus diagnostics may not provide the exact minimal blame set that Houdini assumes, so an implementation can conservatively remove one failing clause or use counterexample-guided grouping. A successful compile proves the retained conjunction; a failed search proves only that this pruning policy found nothing.

evidence, assumptions, and failure modes

Houdini’s 383/469 result with M2 and 15 completions demonstrates value from combining ingredients; inference: it does not show that the 383 retained sets were minimal. The method can miss a valid subset if IL is populated imprecisely; the paper says the blame property is needed for optimality, not for the soundness of a successful return. It depends on a verifier that can distinguish syntax failure, non-inductiveness, and insufficiency.

## technique 3: verifier-guided LLM repair

what it is and when to use it

Repair asks the LLM to edit a candidate set using syntax errors and the oracle’s failed-invariant set. Use it after generation and Houdini have extracted useful but incomplete clauses.

how to do it

1. Run O on the current set I and collect IL and SyntaxError.
2. Prompt the model with the annotated program, the error information, and explicit repair rules.
3. The rules distinguish an invariant that is preserved but not established, established but not preserved, neither, or only partially proven. The model adds, removes, or replaces clauses accordingly.
4. Recheck the new set. If it fails, run Houdini on it; repeat for Nr repair attempts.
5. Return success when O accepts the repaired set, or when Houdini finds an inductive, sufficient subset of it (Algorithm 3, lines 7 to 12); after Nr failed attempts return failure.

The supplied repair prompt tells the model to output invariants that hold “(i) before the loop execution, (ii) in every iteration of the loop and (iii) after the loop termination.” The concrete paper example repairs a missing entry condition: an initial candidate described the loop after its first iteration, while the repaired disjunction allows `y` to be unconstrained before entry and still proves `y < 10`.

Verus form (inference)

Pass Verus compiler and verifier messages back to the model with the current Rust function and loop. Classify failures as establishment, preservation, postcondition strength, or syntax/type errors. Ask for only invariant edits, then re-run `verus`. Use `old(...)` or ghost snapshots only when the verifier’s scope permits them; the C prompt’s `\at(x,LoopEntry)` has no direct textual equivalent in every Verus loop. A passing recheck is the evidence; the model’s explanation is not.

evidence and limits

Repair added 15 solved benchmarks over the 383 solved by Houdini alone, reaching 398/469 under the fixed 8-generation/7-repair budget. The authors use a three-second oracle timeout and report that some failures were Frama-C limitations rather than bad invariants. Inference: repair can therefore spend its budget correcting solver artifacts or syntax instead of discovering mathematics.

## technique 4: prompt structure and multiple model samples

The paper’s M1 prompt merely asks for invariants. M2 explains the precondition, loop body, guard, entry/iteration/exit obligations, undeclared-variable restrictions, and ACSL syntax, and asks the model to split conjunctions. Fifteen samples are generated at temperature 0.7 with at most 2,000 tokens each. M2 solves 293 benchmarks directly versus 237 for M1, a difference of 56 benchmarks (about 23% relative to M1’s count, as reported). Multiple completions show diminishing returns after about eight. GPT-4 is strongest, GPT-3.5-Turbo reaches 370 with Houdini, and combining models helps because their solved sets differ.

Verus form (inference)

Prompt with the Rust function, the exact loop guard, mutable variables, pre/postconditions, and the required Verus syntax. Ask for separate invariant clauses and prohibit undeclared names. Sample several completions, because diversity supplies clauses that one completion misses. Keep model and prompt versions in the experiment record; otherwise pass-rate comparisons are not reproducible.

## what is measured, what remains trusted, and threat to VL

The positive dataset contains 469 benchmarks; 44 failed cases require disjunctions, 5 require clauses with at least three variables, 9 require more precise constraints, 3 require floating-point reasoning, and 10 were attributed to Frama-C failures. Ultimate Automizer solves 430/469 while Loopy with Repair solves 398/469; Loopy solves 31 benchmarks Ultimate misses. The negative 86 benchmarks in the original 555 one-loop category are excluded from the positive success denominator because they contain assertion counterexamples.

The measured claim is conditional on Frama-C WP and its three SMT backends. The proof obligation that a passing oracle result establishes the Hoare triple is trusted; model sampling, prompt compliance, and benchmark ground truth are not proofs. The dataset excludes arrays, pointers, ambiguous semantics, and programs over 500 lines, so it does not measure heap-rich Rust or concurrent code.

VL should not redo the generic lesson that a model must be checked by a verifier, nor assume one completion is representative. The directly reusable ideas are unioning candidate invariants, linear blame-based pruning, and diagnostic-guided repair. The missing work is a Verus-native oracle harness and an evaluation on Rust ownership, quantified sequences, nonlinear arithmetic, and concurrency.

Threat to agent-written verified Rust (inference): medium to high for loop-heavy code. An agent can write plausible but weak invariants; Houdini and Repair can turn partial suggestions into checked proofs. The residual risk is specification mismatch: Verus may prove the supplied postcondition while the product requirement is absent or too weak, and this pipeline does not discover missing functional specifications. For concurrent Rust, the paper’s C integer model says little about atomic ordering or ownership interference.

## techniques for the catalog

- verifier-gated invariant generation — sample LLM loop invariants and accept only oracle-checked inductive, sufficient sets
- Houdini union pruning — union candidates across completions and remove syntax or blamed clauses with at most linear oracle calls
- diagnostic-guided repair — ask the LLM to repair establishment, preservation, strength, and syntax failures using verifier feedback
- structured prompt sampling — specify loop obligations and syntax, then use diverse completions to obtain complementary clauses
