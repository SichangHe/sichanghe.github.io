# Security Is Relative: Training-Free Vulnerability Detection via Multi-Agent Behavioral Contract Synthesis
(authored by agents unless marked 🧑)
Tag: `wang2026security`, [paper](https://arxiv.org/abs/2604.19012)

## contract-centered detection
Phoenix reframes vulnerability detection as checking code against an explicit behavioral contract. Its pipeline has three zero-shot agents: Semantic Slicer, Requirement Reverse Engineer, and Contract Judge. The paper describes the key transformation as “from open-ended vulnerability detection (“Is this code vulnerable?”) into closed-form contract verification (“Does this code satisfy these specific security requirements?”)” (Section 3.1, p. 5).

The evaluation uses PrimeVul paired samples: a vulnerable function and its patched counterpart. Agent 2 learns a security contract from the pair; Agent 3 judges each code sample independently against that contract. This pair dependency is an experimental means for contract synthesis, not a requirement that deployment always have a patch (Section 6.3, p. 12).

Verus form. Inference: represent each security contract as a `spec fn` predicate over abstract inputs, memory state, and outputs. State executable Rust behavior with `requires` and `ensures`, and prove compliance with `proof fn` lemmas and loop `invariant`s. Inference: the contract must be reviewed for completeness before trusting a Verus proof; a verifier can establish compliance with a missing condition.

## technique: semantic slicing
Agent 1 receives bad and good code, a CVE description, and a commit message. Its four steps are: identify the diff; consult the textual oracle while giving code differences priority; preserve patched lines plus necessary context; and ruthlessly prune boilerplate, replacing removed regions with placeholders (Section 3.2, p. 6). The paper reports reducing average functions from 5,298 to 911 characters, an 82.8% reduction (Section 3.2, p. 6; denominator is average character volume over the evaluated code pairs).

When to use it: use slicing when irrelevant code consumes context and the vulnerability mechanism is localized. Inference: a VL slicer can retain the Verus contract, ghost state, and any helper definitions needed to prove the obligation; deleting a dependency that changes a proof obligation is unsound. Inference: source slicing must be syntax-aware and followed by compilation, not text replacement alone.

## technique: requirement reverse engineering into Gherkin
Agent 2 analyzes the sliced diff, consults the CVE and commit message, drafts one cohesive Feature, and writes one or more Scenario blocks describing secure behavior (Section 3.3, p. 6). Constraints require exact boundary conditions or checks, secure behavior rather than failure narration, minimality, and a benchmark contract where good code passes and bad code fails.

Steps: (1) identify the rule enforced by the patch; (2) formulate the rule as preconditions, trigger, and expected outcome; (3) encode it in Given/When/Then scenarios; (4) check that the fixed code satisfies and vulnerable code violates it. Inference: for Verus, translate each scenario into a predicate and postcondition, then prove implementation refinement. Gherkin itself is an intermediate representation; it does not replace executable proof.

## technique: strict contract judging
Agent 3 receives a Gherkin specification and one target code sample. It treats the specification as the “Golden Standard,” checks every scenario, and returns a binary verdict (Section 3.4, p. 7). Separating synthesis from judgment prevents the judge from rediscovering the vulnerability definition.

Inference: a VL judge can run Verus on the target function, inspect counterexamples, and classify only a successfully checked contract as compliant. Add adversarial tests for vacuous conditions, because the paper reports that judges often accept a boundary check without noticing that it is logically ineffective (Section 6.3, p. 12).

## technique: structured prompts and format controls
All agents use `[SYSTEM]`, `[USER]` XML inputs, and `[INSTRUCTION]` output constraints. Their thinking section is capped at four sentences; temperature is 0.2 and top-p 0.9 (Section 3.5, p. 7). XML failures removed 8 pairs (0.9%), leaving 859 samples from 427 pairs (Section 4.1, p. 8). Inference: equivalent VL prompts should use machine-parseable sections and reject malformed contracts before verification.

## evidence and failure modes
The full pipeline's best cross-model configuration reaches F1 0.825, precision 0.792, and recall 0.860 on the effective 427-pair set (Table 3, p. 9; F1 is over vulnerable-class labels). Pair-Correct is 275/427 = 64.4% in Table 4 (the table's denominator is Phoenix's 427 usable pairs); baselines use 435 pairs, so their pair counts are not directly denominator-matched. Table 2 shows adding Gherkin improves F1 by 0.09–0.35 over RAW across four judges.

The study reports 97 false positives and 60 false negatives for the best configuration (Section 5.5, p. 10). Seventeen of 97 false positives (18%) identify genuine concerns in developer-patched code, so the benchmark label can disagree with a stricter security contract. Conversely, 44/60 false negatives (73%) occur when the judge confidently accepts vulnerable code; incomplete specifications are the dominant cause (about 25 cases), with surface-level boundary checking and architecture blind spots also reported (Section 6.3, p. 12).

Trusted elements include the paired patch as a specification oracle, CVE descriptions, LLM-generated Gherkin, XML parsing, model behavior, and benchmark labels. The paper itself says, “Our FN analysis reveals that incomplete specifications are the dominant failure mode (∼25 of 60 FN cases).” (Section 6.3, p. 12) Inference: for agent-written verified Rust, Phoenix presents a high threat at the requirements layer and a useful design pattern for contract review. Verus can discharge a complete predicate, but cannot infer omitted security requirements.

## what has already been done
The paper already demonstrates that multi-agent contract synthesis, semantic slicing, and strict contract judgment outperform monolithic classification on this paired benchmark. VL should not redo a generic LLM behavioral-specification proposal without adding a Rust/Verus implementation, sound contract extraction, or a new maintenance experiment. Inference: the open gap is checking contract completeness and linking each scenario to executable Rust states.

## techniques for the catalog
- semantic slicing — retain only diff-relevant code and required context before reasoning
- requirement reverse engineering — synthesize exact Gherkin secure-behavior scenarios from a patch
- contract judging — classify code by strict compliance with an explicit behavioral contract
- structured multi-agent prompting — enforce XML schemas, role separation, and bounded reasoning
- contract completeness auditing — target omitted conditions and vacuous checks as first-class failures
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
