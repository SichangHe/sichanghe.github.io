# A Neuro-Symbolic Approach to Strategy Synthesis for Strategic Logics
(authored by agents unless marked 🧑)
Tag: `aruta2026neuro`, [paper](https://arxiv.org/abs/2606.17962)

## what the paper does

Aruta, Malvone, Murano, Parente, and Rizzuti combine an LLM strategy generator with a NatATL model checker. NatATL restricts strategies to bounded, interpretable guarded rules. The LLM proposes a candidate; parsing and schema checks reject malformed candidates; VITAMIN checks admissibility, the complexity bound, and the temporal objective. The abstract states: “generated strategies are accepted only when certified by the verifier” (Abstract, p.1). This is a generate-and-certify search architecture, not an LLM proof of strategy correctness.

## technique 1: bounded natural-strategy representation

what it is: represent a memoryless strategy for each coalition agent as an ordered list of guarded actions plus a default rule. At a state, the first guard that holds chooses its action; the default makes the strategy total (Sections 2 and 4, pp.4, 9). The NatATL verifier then evaluates all outcomes induced by the joint strategy against the objective.

when to use (Inference): use when strategic policies must be interpretable and bounded in the syntactic size of their guards. Section 2 defines the coalition bound: “A collective strategy is admissible if the sum of the complexities of its component strategies does not exceed a given bound k” (p.4). Reducing the bound can make a previously feasible natural strategy infeasible, while increasing it preserves feasibility when a strategy existed at the smaller bound (Section 3.2, p.8).

how to do it (Section 4, pp.9–11):
1. serialize the finite concurrent game: states, agents, actions, transitions, initial state, labels, coalition, formula, and complexity bound
2. ask the LLM for JSON containing ordered guarded actions for each coalition agent and a default rule
3. parse JSON and reject unknown agents/states/propositions/actions, malformed guards, missing defaults, or wrong schema
4. submit a valid candidate to VITAMIN
5. let VITAMIN check admissible actions, the bound, well-formedness, and NatATL satisfaction
6. return the strategy only if the checker certifies it; otherwise use feedback for a retry when allowed by the retry budget and ATL feasibility check

Verus form (Inference): encode a policy as a Rust data structure and prove a `spec fn` describing the selected action and totality; use `requires` for a valid state/model and `ensures` for the action admissibility and objective-preservation contract. Use `assert` and `invariant` statements for finite-state transition reasoning. Verus can certify the encoded policy's properties, but NatATL temporal semantics and strategy enumeration would need a model-specific encoding; the paper does not provide a Verus translation.

## technique 2: verifier-guided generate-and-certify loop

what it is: use formal feedback as a repair signal. A rejected candidate's diagnostic can be appended to a retry prompt. Successful candidates are certified witnesses. The paper states: “The soundness guarantee of the framework concerns accepted positive answers: a strategy is returned as successful only if it has been certified by the NatATL verifier” (Section 4, p.11).

steps (Algorithm 1, p.12):
1. query Q.ask(M,φ)
2. if no valid candidate appears, run ATL as a feasibility check
3. if ATL is false, return true negative; if ATL is true, retry with “A strategy may exist; generate a valid JSON strategy.”
4. for a valid candidate, run ATL and NatATL verification
5. if NatATL is true, return true positive and strategy
6. if NatATL is false and ATL is false, halt as false-positive; if ATL is true, append verifier diagnostics and retry
7. after the diagnostic retry, return true positive for a verified winning candidate, false positive for a valid but rejected candidate, or false negative if no valid candidate appears; likewise, if the initial missing-candidate retry still produces no valid candidate, return false negative

The ATL pre-filter is one-sided: “a negative ATL result rules out NatATL satisfiability, whereas a positive ATL result only indicates that a winning strategy may exist before imposing the NatATL natural-strategy bound” (Section 4, p.11). Inference: a positive ATL result therefore cannot establish that a bounded natural strategy exists, so the reported false-negative label does not necessarily mean a NatATL solution was missed. An analogous Rust/Verus prerequisite check would need the same implication: failure must rule out the target property before it can justify skipping the prover.

## technique 3: dataset construction with formal coverage control

what it is: construct reusable synthesis data from expert seeds, semantics-preserving renamings, controlled formula/model mutations, and verifier-guided balancing. The final benchmark has 4,211 instances (Section 3, pp.6–9).

steps from the paper:
1. use LLM ideation only to suggest domains; five experts filter use cases and manually model finite concurrent games
2. validate transitions, action membership, declared states/agents, initial state, labels, and formula propositions
3. augment with (a) renaming states/agents/actions/propositions, (b) bound/formula transformations, and (c) labels/transitions/trap/adversarial-agent changes
4. re-parse formulas and reject invalid bounds; require bound ≥1 for non-empty coalitions
5. run the NatATL pipeline to find underrepresented satisfiable/borderline outcomes
6. apply a conservative second augmentation only with transformations preserving or relaxing the winning pattern
7. split by augmentation family, keeping parent and child variants in one split to prevent leakage

Verus form (Inference): this suggests generating Rust/Verus training tasks from seed specifications, then mutating syntax while re-running Verus and keeping family-level splits. The paper's expert validation and checker-based filtering are data-quality controls; they do not prove that an LLM generalizes beyond the finite schema.

## technique 4: compact serialization and prompt refinement

The authors found Qwen2.5-32B-4bit unstable on schema-conforming JSON even with fine-tuning, switched to Qwen3-32B-4bit reasoning mode, and used one-shot prompting. Prompt development used 200 development instances and approximately six refinement iterations covering malformed JSON, wrong objective interpretation, missing defaults, bound violations, and rejected strategies (Section 4, p.10). Converting JSON into compact Markdown “improved accuracy by approximately 3 percentage points” in development experiments (p.10). The final system uses unsloth/Qwen3-32B-bnb-4bit with reasoning mode enabled, 12 CPU cores, 64 GB RAM, and an NVIDIA Quadro RTX A5000 GPU (pp.10–11).

## measurements, assumptions, and failures

The Results paragraph reports “41 instances over 1411 are marked as false positive and 72 as false negative” and 92% accuracy (Section 5, p.13). The paper excludes 51 ParsingError samples caused by truncated output under the 8,192-token cap: “Those cases are marked as ParsingError and do not contribute to the performance metrics” (p.14). Inference: the reported accuracy uses the 1,411 retained samples, rather than all 4,211 benchmark instances; (1411 − 41 − 72)/1411 is approximately 92%. The reported time distribution fits a Gamma(shape=1.53, loc=32.23, scale=101.72) model (p.13). Table 3 reports NatSTV runtimes of approximately 0.8 s (6 states, coalition 2, k=6), 12.4 s (8,2,8), 95.7 s (10,3,8), 312.5 s (12,3,10), and timeout (14,3,10) (p.15). The tool reports approximately 70 s (6 states, coalition 2, k=3), 80 s (10,2,5), 120 s (20,5,10), and 200 s (50,11,100). Inference: these rows compare different configurations and do not establish a matched-configuration speedup across the table.

The conclusion states that “every accepted positive result is backed by verifier certification” and identifies context length and GPU memory as limits (Section 6, p.16). Inference: this certifies the encoded NatATL objective, not the fidelity of that objective to an intended real-world policy. For verified Rust, the analogous concern is whether the formalized contract captures the intended policy; independently reviewing the model and objective would address that concern. The paper provides no Verus implementation or translation.

## techniques for the catalog

- bounded guarded strategy encoding — represent each agent policy as ordered guarded actions plus a total default under a complexity bound
- schema then semantic certification — reject malformed candidates before model checking, then accept only NatATL-certified witnesses
- ATL feasibility pre-filter — use cheap unconstrained ATL negatives to stop impossible cases before bounded NatATL checking
- verifier-feedback retry — translate checker diagnostics into a bounded second synthesis attempt
- coverage-controlled benchmark augmentation — mutate expert seeds, use verifier outcomes to improve coverage, and keep augmentation families within one split
- compact model serialization — convert verbose JSON game descriptions to structured Markdown to improve LLM synthesis
