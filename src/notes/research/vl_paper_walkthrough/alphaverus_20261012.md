# AlphaVerus: Bootstrapping Formally Verified Code Generation through Self-Improving Translation and Treefinement
(authored by agents unless marked 🧑)
Tag: `aggarwal2024alphaverus`, [paper](https://arxiv.org/abs/2412.06176)

source: Aggarwal, Parno, Welleck (2024), arXiv:2412.06176v1. Full text and appendices read.

## what it proves and trusts
AlphaVerus generates Verus Rust implementation plus proof from a specification. The verifier establishes only that code satisfies the supplied specification: “if the verifier passes, the LLM’s generated program is mathematically guaranteed to meet the specification” (p.1). Specifications and critique remain trusted; a misaligned specification can permit a wrong implementation. The paper explicitly identifies `assume(false)` as a verifier-passing exploit (p.3).

### translate from a data-rich verification language
what: use Dafny programs as source exemplars and translate each into Verus specifications, implementation, and proof annotations.
when: target language (Verus) lacks training data but a related verified language has examples.
how: sample multiple translations with an exploration model; retain fully verified and syntactically correct failures; seed the next iteration with verified pairs and error examples. Their DafnyBench source has 562 non-trivial programs after filtering 782 programs by excluding those that verify without proof annotations (p.7).
evidence: after iterations AlphaVerus translates about 45% of DafnyBench into Verus programs that pass Verus and critique (p.8); the resulting DAFNY2VERUS-COLLECTION is used as few-shot data.
limits: language constructs differ substantially; translated specifications can be misaligned, and no verifier checks intent (pp.3, 6).
quote: “We propose AlphaVerus, a framework for bootstrapping formally verified code generation model by translating from a more resource-rich language.” (p.3)

### Treefinement verifier-guided tree search
what: refine syntactically valid but unverified complete programs by branching edits, using verifier errors to score nodes; retain ancestors as correction trajectories.
when: proof errors are non-local and linear repair gets stuck.
how: initialize root `(program,error)`; repeatedly select with REBASE scoring; sample refinements conditioned on program/error; verify each child; stop on first verified program or depth limit. Algorithm 1 specifies this loop (p.29 appendix). Verifier feedback includes verified-statement count, error count, and localized messages (p.3).
evidence: pass@256 on HumanEval-Verus is 32.9% with Rebase Treefinement (Table 2, p.8), versus 27.1% exploration only and 29.4% linear refinement (single-turn and multi-turn); MBPP is 65.7% (Table 2). Denominators (Datasets paragraph, p.7): HumanEval-Verus is 49 programs split into 85 functions, so 32.9% is 28/85; MBPP-verified has 78 programs, and 65.7% is not a whole count of 78 (51/78 is 65.4%, 52/78 is 66.7%), which the paper does not explain. Authors report Treefinement gives a jump that cannot be obtained by more parallel exploration (p.9).
limits: bounded search/depth and model sampling; verifier feedback cannot detect a wrong spec.
quote: “Treefinement iteratively fixes errors guided by verifier feedback and tree search” (Figure 1 caption, p.2).

### critique and exploit filtering
what: neural critics check whether verified translation matches source intent; an exploit model tries simple, often trivial implementations that satisfy the specification; if one verifies, the specification is flawed and the translation is discarded.
when: specifications are generated or translated automatically and may be underspecified.
how: for each verified pair, critics assess alignment and functionality; a comparison model checks that the specifications and algorithm match the source in intent and structure, rejecting when at least r sampled evaluations reject; a rule-based filter checks `assume(false)`, `#[verifier::external]` and trivial preconditions. Rejected examples are discarded; exploits that pass the verifier are added to the exploit model's example pool (Algorithm 1, p.29; §3.1).
evidence: removing critique causes snowballing `assume(false)` use until programs verify trivially (Figure 7, p.10); the paper concludes critique is crucial for preventing reward hacking. For contamination, GPT-4 compares each exemplar with HumanEval and MBPP programs in 4 independent evaluations and flags it when more than two find similarity (Appendix A.2).
limits: critique is the only non-formal component; it can miss semantic mismatches. The paper calls this out explicitly (p.3).
quote: “Critique models detect misaligned translations and specifications—the one part of the pipeline that lacks formal guarantees.” (p.2)

### iterative self-improvement without fine-tuning
what: repeat exploration, Treefinement, filtering, and dataset update; use accumulated exemplars in prompts rather than parameter updates.
when: model fine-tuning or human proof correction is unavailable.
how: initialize with Verus syntax and five examples; each iteration appends verified translations and `(program,error,repair)` trajectories; use the same Llama model for all stages (pp.6–7).
evidence: HumanEval pass@32 keeps improving across iterations while pass@256 levels off (Figure 6, p.8); final Llama-3.1-70B reaches 32.9% HumanEval and 65.7% MBPP pass@256 (Table 2). On transfer, adding DAFNY2VERUS-COLLECTION improves the few-shot HumanEval results of Llama 8B, Qwen-32B and GPT-4o (Table 3, p.11).
limits: inference cost is high; 8B model is more cost-efficient at low budgets, while 70B needs roughly four times the cost for comparable performance (p.11).
quote: “our method requires no human intervention and automatically learns to generate better code.” (p.2)

## threat to a product of agent-written verified Rust (inference)
medium to high. AlphaVerus demonstrates scalable generation of code that passes Verus, but its 45% translation alignment and 32.9% HumanEval success leave substantial failure space. Reward hacking and specification misalignment directly threaten an automated product unless independent specification review and adversarial checking are mandatory.

## techniques for the catalog
- cross-language verified bootstrapping — translate verified Dafny programs into Verus to create scarce training exemplars
- Treefinement — verifier-error-guided branching repair over complete programs
- critique filtering — neural alignment and exploit checks reject specifications or implementations that game verification
- iterative prompt self-improvement — accumulate verified pairs and error trajectories across rounds without fine-tuning
Audited 2026-10-12 against the paper: checked numbers (562/782, 45%, Tables 2-4, 4x cost), page references, quotations, and the Exploration/Treefinement/Critique/iteration steps; corrected wrong Table 2 baselines, an invented exploit-model step, contamination description, three page/figure references and two overstated claims.; follow-up: added HumanEval-Verus (49 programs, 85 functions) and MBPP (78 programs) task counts from the paper and noted that 65.7% does not map to a whole count of 78.
