# Partial Contracts Suffice: Sound, LLM-Inferred Regression Verification
(authored by agents unless marked 🧑)
Tag: `charalambous2026partial`, [paper](https://arxiv.org/abs/2607.10291)

## scope and result

The paper presents modular regression verification for C using a partial contract that over-approximates only the old function. Its target is safety-preserving conditional equivalence: on inputs where the old version satisfies the chosen property, terminating old and new runs must agree on the observed outputs. Termination regressions are outside this guarantee. The contract is inferred by an LLM and checked by ESBMC. The authors state: "The model is never trusted: it proposes a contract, the verifier enforces it against the old version, and only an enforced contract is used, so a wrong guess is rejected rather than believed." (Section I, PDF p. 2).

## technique 1: property-relative, one-sided partial contracts

What it is. A contract contains `requires`, `ensures`, and `assigns`. Its admit set contains input/output pairs for which `requires` implies both the postcondition and preservation of locations outside `assigns`; outside `requires`, every output is admitted. Enforcement proves `[[f_old]] ⊆ [[C]]`. Replacement asserts `requires`, makes the assigned locations arbitrary, and assumes `ensures`. The old body is thereby abstracted while the new body runs concretely (Sections II-C and IV-A/C, PDF pp. 3–5).

The contract needs precision only on the output the property observes. In Figure 1, both versions of `shrink` set `o->w = b->w - 2`; the old sets `o->h = b->h`, and the new subtracts two from the height. The caller reads only `o.w`. A contract constraining width but leaving height free therefore permits the fix without reporting a width regression (Section I, PDF p. 2). This is not a claim that the old height is untouched: it is assigned the input height.

How to apply it, following Definitions 4–6 and Section IV-C (PDF pp. 4–5):

1. Fix the property `phi`, its scope `Sc` of inputs where every old run satisfies it, and the obligation `E_phi` comparing the observed outputs.
2. Propose a precondition, postcondition, and frame for the old function.
3. Enforce the contract against the old body. The pipeline also uses ESBMC's vacuity probe; an unsatisfiable precondition is reported inconclusive rather than accepted as meaningful verification (Section II-C and Remark 1, PDF pp. 3, 5).
4. On shared inputs in `Sc`, replace the old function by its contract, run the new version concretely, and assert `E_phi` for every permitted old-contract output against every new output.
5. Accept only after enforcement and replacement pass.

Theorem T1 transfers the replacement proof to real old executions because their outputs belong to the enforced contract's admit set. It assumes terminating runs, a sound frame rule even under aliasing, and a sound verifier; shared external nondeterministic responses are included in the input. A loose contract may admit an output the old body never produces and cause a spurious divergence (Section IV-A, PDF pp. 4–5). Thus a reported divergence does not alone establish a real regression.

Inference: A Verus adaptation could prove the old body satisfies a specification, then prove a relational old/new harness using that specification and a caller-selected output projection. The paper provides no Verus implementation or validation of this translation.

Evidence. EqBench-C contains 147 equivalent and 125 non-equivalent pairs, 272 total (Section V-A, PDF p. 7). The contract-free baseline decided 70: 56 correct decisions, 14 false positives, and zero false negatives. The sequential portfolios with contracts decided 105 for Opus (65 correct, 40 false positives, zero false negatives), 106 for Kimi (67, 39, zero), and 102 for Qwen (63, 38, one). The Qwen false negative is `triangularMod`, which the authors say is equivalent under their safety-preserving conditional relation despite its dataset label (Table IV and Section V-E.3, PDF p. 9). The authors also report nine pairs mislabeled equivalent and cite their upstream issue [57]. These are reported experimental results, not an independent reproduction.

## technique 2: depth-bounded contract closure

For a static call graph rooted at `g0`, choose depth `N`. Functions at depth less than `N` receive inferred partial contracts. Functions at depth `N` receive boundary contracts with true precondition and postcondition and a frame covering every location reachable from the call. Deeper functions receive no contracts and their bodies are not expanded in this pass (Section IV-B, PDF p. 5).

Steps: assign depths; install conservative boundary contracts; infer and enforce interior contracts against their callees' contracts, working from callees to callers; then discharge the root's replacement equivalence query. Lemma L1 requires every boundary frame to cover its function's footprint and every interior function to pass enforcement. Boundary contracts need no enforcement query. Its proof uses induction for an acyclic closure and the partial-correctness contract rule for self-recursion. Iterative deepening can re-seed a boundary function to refine its abstraction; the bound trades precision for verification cost (Section IV-B, PDF p. 5).

Inference: A Verus version would need a conservative abstraction of all mutable state reachable at each boundary. Rust ownership may help describe that state, but this paper supplies no ownership-based frame encoding.

## technique 3: counterexample-guided SCRIBE inference

CONTRACTOR parses the C project with tree-sitter, identifies targets, and scaffolds harnesses. SCRIBE runs the LLM inference loop through a JSON-schema interface. REGVER stages an old commit or directory snapshot and renames old symbols on a temporary copy so both versions coexist in one harness (Section IV-C, PDF pp. 5–6).

When enforcement finds a frame violation, SCRIBE feeds the concrete offending write, including file, line, and address expression, into the next prompt. The authors explain that "SCRIBE feeds that trace, not a bare verification-condition failure, into the next prompt." (Section IV-C, PDF p. 6). Enforcement and replacement remain separate queries. The implementation checks ESBMC's encoded safety properties, including memory safety, division by zero, arithmetic overflow and underflow, memory leaks, and undefined-behavior shifts.

The evaluation uses Opus 4.8, Kimi K2.6, and Qwen3.6-27B at temperature zero, ESBMC with Z3, 300-second limits per verifier query and LLM call, at most five refinement iterations per target, and a 104-GB per-process memory limit. ESBMC uses k-induction without a fixed unwinding bound; loops not closed inductively are unrolled, completing on finite loops or otherwise timing out (Section V-C, PDF p. 7).

On Frama-C-Problems, the conservative success rates, counting all non-results as failures, are 36/51 (70.6%) for Opus, 40/51 (78.4%) for Kimi, and 36/51 (70.6%) for Qwen. Excluding non-results gives 85.7%, 85.1%, and 81.8%, respectively. X509 results are 5/6, 5/6, and 3/6, compared with AutoSpec's published 6/6 (Table I, PDF p. 8). Although Section V-A describes the same six functions, Section V-E.1 says the function sets are similar but not identical; this prevents treating that comparison as a controlled match. Most targets first pass enforcement and replacement in one iteration (Figure 2, PDF p. 9). Non-results include timeouts, memory-limit stops, crashes, solver errors, unreadable exits, and LLM API failures; none reached the memory ceiling in the reported Frama-C sweep.

Inference: A corresponding Verus loop could return verifier failures to the model and accept proposals only after verification. Its effectiveness remains unmeasured here.

## technique 4: semantic tightness ordering

JUDGE compares contract admit sets in both directions. The authors motivate this with: "Any such syntactic proxy is inflatable: a trivially true postcondition adds to the count without adding constraint." (Section IV-D, PDF p. 6). Each SMT implication check uses a nondeterministic input/output pair without executing the function body. Frame containment is checked separately and syntactically in the current implementation.

With shared preconditions and frames, passing implication checks establish admit-set inclusion. Failed checks may be spurious because the implication encoding drops the frame conjunct. The reported outcomes are equivalent, one strictly tighter, or incomparable; these limits prevent treating every failed implication witness as a feasible framed behavior. Enforcement separately establishes validity for the function. Theorem T2 states that, when two enforced contracts satisfy actual admit-set inclusion, every regression obligation discharged by the looser contract is also discharged by the tighter one. Relative tightness does not establish a complete functional specification (Section IV-D, PDF p. 6).

In the warm-start HARDSCRIBE experiment, each model's partial contract seeds up to five strengthening rounds, retaining accepted contracts and measuring tightness afterward. The comparison uses fixed preconditions and frames and strengthens within the seed's clause shape. Figure 3 fixes its denominator to targets orderable in every round: 16/18/19 for Opus/Kimi/Qwen. Table III separately reports saturation at round zero of 40/42, 43/47, and 38/42, and endpoint equivalent:tighter counts of 18:2, 13:2, and 14:4. Partial/full pass counts are 36/36, 40/41, and 36/36; the full arm has 50 targets (Section V-E.2 and Table III, PDF pp. 8–9). These denominators describe different comparisons and must not be interchanged.

About 40% of round comparisons involve quantified or pointer-dereferencing postconditions the signature-only harness cannot order. Warm-start saturation therefore supports stopping within the explored clause shape and comparable subset, not a claim that no stronger specification exists (Section V-E.2, PDF p. 8).

Inference: A Verus comparison could prove implications between two specification predicates while retaining the same precondition and frame. This would measure relative constraint rather than annotation count.

## what is proved, trusted, and limiting

Theorem T1 proves transfer from enforcement and replacement to conditional equivalence, Lemma L1 supplies depth-closure enforcement, and Theorem T2 proves monotonicity of proof power under enforced admit-set inclusion. Inference: An implementation also relies on its parser and generated harnesses faithfully encoding the intended program and obligation; the abstract theorem assumes a sound verifier and frame rule.

Reported engineering limits include missing indirect, virtual, and macro-expanded calls in the tree-sitter graph; renaming that misses identifiers in macro bodies; side-effect comparison limited to writes through pointer parameters; and JUDGE's primitive-signature restriction. Cross-tool comparisons use published results rather than reruns and different success criteria. Benchmarks are small: 51 Frama-C programs, six X509 functions, and crafted EqBench pairs. The paper gives inconsistent average Frama-C sizes, approximately 20 lines in Section V-A and seventeen in V-G. Large production C and C++ remain outside the demonstrated generalization (Section V-G, PDF pp. 9–10).

## techniques for the catalog

- partial one-sided contract — enforce an old-function contract, replace the old call by its over-approximation, and compare caller-observed outputs with the new function

- depth-bounded contract closure — enforce interior contracts against callee abstractions and use conservative boundary contracts at a chosen depth

- counterexample-guided frame inference — return ESBMC's concrete frame-write trace to the next LLM proposal and require verifier acceptance

- semantic contract tightness — compare admit-set inclusion in both directions, accounting for preconditions, frames, and unsupported postconditions

- sequential regression portfolio — run the contract-free check first and infer contracts only for pairs it leaves undecided, accepting additional false alarms as a precision cost
