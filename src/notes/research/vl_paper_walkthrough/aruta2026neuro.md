# A Neuro-Symbolic Approach to Strategy Synthesis for Strategic Logics
(authored by agents unless marked 🧑)
Tag: `aruta2026neuro`, [paper](https://doi.org/10.1016/J.ARTINT.2019.103170)

## what the paper does

Aruta, Malvone, Murano, Parente, and Rizzuti combine an LLM strategy generator with a NatATL model checker. NatATL restricts strategies to bounded, interpretable guarded rules. The LLM proposes a candidate; parsing and schema checks reject malformed candidates; VITAMIN checks admissibility, the complexity bound, and the temporal objective. The abstract states: “generated strategies are accepted only when certified by the verifier” (Abstract, p.1). This is a generate-and-certify search architecture, not an LLM proof of strategy correctness.

## technique 1: bounded natural-strategy representation

what it is: represent a memoryless strategy for each coalition agent as an ordered list of guarded actions plus a default rule. At a state, the first guard that holds chooses its action; the default makes the strategy total (Sections 2 and 4, pp.4, 9). The NatATL verifier then evaluates all outcomes induced by the joint strategy against the objective.

when to use: use when strategic policies must be simple, interpretable, and bounded by a rule-count/complexity limit. The bound is part of the formal problem: reducing it can make a previously feasible natural strategy infeasible, while increasing it preserves feasibility when a strategy existed at the smaller bound (Section 3.2, p.8).

how to do it (Section 4, pp.9–11):
1. serialize the finite concurrent game: states, agents, actions, transitions, initial state, labels, coalition, formula, and complexity bound
2. ask the LLM for JSON containing ordered guarded actions for each coalition agent and a default rule
3. parse JSON and reject unknown agents/states/propositions/actions, malformed guards, missing defaults, or wrong schema
4. submit a valid candidate to VITAMIN
5. let VITAMIN check admissible actions, the bound, well-formedness, and NatATL satisfaction
6. return the strategy only if the checker certifies it; otherwise use its diagnostic for a retry

Verus form (Inference): encode a policy as a Rust data structure and prove a `spec fn` describing the selected action and totality; use `requires` for a valid state/model and `ensures` for the action admissibility and objective-preservation contract. Use `assert` and `invariant` statements for finite-state transition reasoning. Verus can certify the encoded policy's properties, but NatATL temporal semantics and strategy enumeration would need a model-specific encoding; the paper does not provide a Verus translation.

## technique 2: verifier-guided generate-and-certify loop

what it is: use formal feedback as a repair signal. A candidate rejected by VITAMIN is not accepted because it looks plausible; its diagnostic is appended to a retry prompt. Successful candidates are certified witnesses. The paper emphasizes that “The soundness guarantee of the framework concerns accepted positive answers” (Section 4, p.11).

steps (Algorithm 1, p.12):
1. query Q.ask(M,φ)
2. if no valid candidate appears, run ATL as a feasibility check
3. if ATL is false, return true negative; if ATL is true, retry with “A strategy may exist; generate a valid JSON strategy.”
4. for a valid candidate, run ATL and NatATL verification
5. if NatATL is true, return true positive and strategy
6. if NatATL is false and ATL is false, halt as false-positive; if ATL is true, append verifier diagnostics and retry
7. classify an unsuccessful second attempt as false negative

The ATL pre-filter is deliberately one-sided. A negative ATL result rules out NatATL satisfiability, but positive ATL only says an unconstrained ATL strategy may exist; it does not establish a bounded natural strategy (Section 4, pp.11–12). Inference: this is analogous to using a cheap Rust static check to avoid expensive Verus proving while retaining Verus as the acceptance gate.

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

The authors found Qwen2.5-32B-4bit unstable on schema-conforming JSON even with fine-tuning, switched to Qwen3-32B-4bit reasoning mode, and used one-shot prompting. Prompt development used 200 development instances and approximately six refinement iterations covering malformed JSON, wrong objective interpretation, missing defaults, bound violations, and rejected strategies (Section 4, pp.10–11). Converting long JSON into compact Markdown improved development accuracy by approximately 3 percentage points (p.11). The final system uses Qwen3-32B-bnb-4bit, 12 CPU cores, 64 GB RAM, and an NVIDIA Quadro RTX A5000 GPU (p.11).

## measurements, assumptions, and failures

The evaluated split has 1,411 instances: 41 false positives and 72 false negatives, described as 92% accuracy (Section 5, p.13). The paper excludes 51 ParsingError samples caused by the 8,192-token cap; these do not contribute to the metrics (p.14). Thus the 92% denominator is the 1,411 retained samples, not all 4,211 dataset objects. The time distribution fits a Gamma(shape=1.53, loc=32.23, scale=101.72) model (p.13). Table 3 reports NatSTV runtimes of approximately 0.8 s (6 states, coalition 2, k=6), 12.4 s (8,2,8), 95.7 s (10,3,8), 312.5 s (12,3,10), and timeout at 14 states (p.15). The tool reports approximately 70 s (6 states, coalition 2, k=3), 80 s (10,2,5), 120 s (20,5,10), and 200 s (50,11,100). These are configurations, not averages over the dataset.

Inference: every accepted positive is backed by a checker proof of the encoded NatATL instance, but the LLM, parser, prompt, ATL pre-filter, and retry policy remain outside that proof. The paper does not claim that a candidate strategy is optimal, that rejected candidates are impossible under larger bounds, or that the natural-strategy encoding covers all implementable policies. Token limits, GPU memory, and model serialization constrain scale (Conclusion, p.16). Inference: for agent-written verified Rust, the main product threat is a plausible but semantically wrong policy specification; a Verus proof only establishes the formalized contract, so the model and objective need independent review. The generate-and-certify pattern is reusable; VL should not redo unbounded candidate enumeration when a verifier can certify generated witnesses.

## techniques for the catalog

- bounded guarded strategy encoding — represent each agent policy as ordered guarded actions plus a total default under a complexity bound
- schema then semantic certification — reject malformed candidates before model checking, then accept only NatATL-certified witnesses
- ATL feasibility pre-filter — use cheap unconstrained ATL negatives to stop impossible cases before bounded NatATL checking
- verifier-feedback retry — translate checker diagnostics into a bounded second synthesis attempt
- coverage-controlled benchmark augmentation — mutate expert seeds while preserving family-level splits and checker-balanced outcomes
- compact model serialization — convert verbose JSON game descriptions to structured Markdown to improve LLM synthesis
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
