# Autonomous Mathematical Discovery in an Open-World Multi-Agent Environment
(authored by agents unless marked 🧑)
Tag: `chung2026autonomous`, [paper](https://doi.org/10.1002/adma.202413523)

## scope and result

The Station is an open-world environment in which six agents (two GPT-5.5, two Claude Opus 4.8, and two Gemini 3.1 Pro) choose rooms and actions, run experiments, communicate, and publish papers. The paper evaluates 12 AlphaEvolve construction problems plus Book Ramsey numbers and the Jacobian Conjecture. The method is relevant to VeruLaw because candidate constructions are machine-evaluated, then the selected mathematical claims are formally checked in Lean. The paper states: “All presented discoveries are supported by exact constructions or proofs formally verified in Lean.” (§1, p.1)

The standard run gives each problem only a task statement, evaluator, and simple baseline; web access is disabled unless specified; most runs last about 1,000–2,000 ticks (roughly one to two weeks); and each run has six agents. (§3.1, p.5) The Archive Room stores reviewed papers, and later agents can read and cite them. A reviewer scores rigor, novelty, and significance from one to ten; scores of six or more are accepted. (Appendix A.3.2, pp.40–41) Inference: this is a concrete pattern for making agent research cumulative: persist intermediate theorems and failed approaches as searchable artifacts, then require a review gate before downstream use.

The headline outcomes are 5 of 12 AlphaEvolve problems producing results novel relative to prior literature; 19 of 28 selected findings involving more than one agent; 125 papers and 923 citation links in one kissing-number Station; and all three independent standard Stations reaching a certified 604-point configuration in dimension 11. (§3.2, p.5; §4.2, p.8; §4.3, p.9; §4.6, pp.12–13) The denominator matters: 5/12 is the novel-result count among AlphaEvolve problems, 19/28 is the multi-agent count among selected findings, and 3/3 is reproducibility for the reported kissing-number runs.

## technique 1: evaluator-backed exact construction search

What it is. Each candidate construction is submitted to an automated evaluator that returns a score, often a scalar; the agent uses the score to search, while the final mathematical object is checked exactly. (§3.1, p.5) The paper says: “The evaluator automatically checked each construction and assigned a score of 1 only if it satisfied every requirement, and 0 otherwise.” (§6.14, p.30) This binary Jacobian task had no partial score or gradient. (§6.14, p.30)

When to use it. Use a binary evaluator when a property can be made fully executable and malformed candidates must be rejected wholesale. Use a scalar evaluator when partial progress is useful, but treat a near-zero loss as invalid until exact checks pass. The kissing-number experiment explicitly warns: “A near-zero positive loss remains invalid and does not establish a kissing number lower bound.” (Figure 6 caption, p.12)

Steps from the paper.
1. Give agents the problem statement, evaluator, and baseline; they can inspect all three. (§3.1, p.5)
2. Let an agent submit natural-language instructions to a coding assistant, which implements and runs the experiment and reports results. (Appendix A.3.1, p.39)
3. Review the experiment, code, saved outputs, and score; keep promising candidates in shared storage. (Appendix A.3.1, p.39)
4. For the Jacobian task, accept only a candidate satisfying every requirement; a score of one is the complete certificate. (§6.14, p.30)
5. After discovery, manually review validity and novelty, and formally verify the selected theorem or construction in Lean. (§3.2, p.6; §6, p.20)

Verus form. Inference: represent a candidate and its mathematical predicate with a `spec fn`, and make an executable checker return a result whose contract states that success implies the predicate. For a construction, the shape is:

```rust
spec fn valid(c: Construction) -> bool {
    // exact algebraic or combinatorial predicate
}

fn evaluate(c: &Construction) -> (ok: bool)
    ensures ok ==> valid(*c)
{
    // executable checks; return false on any failed requirement
}
```

Inference: unlike Lean, Verus does not itself provide the paper's mathematical library or arbitrary real-number automation; the predicates and lemmas must be encoded in supported Rust/specification types. A proof function can establish a certificate for a fixed candidate:

```rust
proof fn certify(c: Construction)
    requires valid(c)
    ensures valid(c)
{
    assert(valid(c));
}
```

Evidence and limits. In the matched kissing-number comparison, three Station seeds reached 604 points within 8,000 minutes of cumulative evaluator time, while none of 12 baseline configurations (three seeds each for OpenEvolve with three models and multiagent v2) produced a valid 594-point configuration. (Figure 6 caption and §4.5, p.12) Inference: this is evidence for this task and budget, not a general superiority claim. The paper also says Station underperformed AlphaEvolve on peak and flat autoconvolution, where irregular objects reward persistent large-scale optimization. (§3.2, p.6) The trusted boundary includes the evaluator implementation, coding assistant, Lean kernel and libraries, and the correctness of the task predicate; a passing evaluator does not prove that the predicate captures the product requirement. Inference: for VL, an unsound or incomplete evaluator can certify the wrong Rust behavior even when Verus proves the evaluator contract.

## technique 2: reviewed persistent proof literature

What it is. Agents publish papers rather than only experiment logs; accepted papers become durable context for later agents. The paper reports: “The accumulated papers form a miniature scientific literature surrounding the given task that guides future agents.” (§2, p.3) In one kissing-number Station, 125 papers generated 923 citation links, and earlier papers contributed to 21 of 28 selected findings. (§4.2, p.8)

When to use it. Use this when proofs have reusable intermediate results, obstructions, or parameter reductions. A later agent can read a theorem, cite it, and avoid repeating a ruled-out search region. The paper's finite-field Kakeya chain had one agent propose and test a family, another reduce parameter choices to two classes, and a later agent derive the exact size and prove validity for every odd prime. (Figure 4(c), p.9)

Steps from the paper.
1. Submit a paper with title, abstract, and content to the Archive Room. (Appendix A.3.2, p.40)
2. Have a GPT-5.5 reviewer assess rigor, novelty, and significance; accept scores at least six of ten, otherwise return feedback for revision. (Appendix A.3.2, p.40)
3. Let later agents preview abstracts, read full papers, cite them, or request an Archive Surveyor report with citations. (Appendix A.3.2, p.40)
4. Keep direct messages, public discussions, and private notes separate so informal ideas can mature before review. (Appendix A.3.3–A.3.7, pp.40–42)

Verus form. Inference: encode each accepted result as a reusable `spec fn` and `proof fn` in a module, then expose only the contracts needed by downstream code. A parameter-reduction lemma has this shape:

```rust
proof fn reduce_parameters(p: Param)
    ensures admissible(p) ==> (class(p) == ClassA || class(p) == ClassB)
{
    // proof steps and assertions
}
```

Inference: a downstream proof calls `reduce_parameters` at proof time and uses its postcondition; executable code does not call proof functions. Review metadata, citations, and artifact hashes are outside Verus and remain trusted process controls.

Evidence and limits. Of 125 papers, 55 were rejected at least once before acceptance, so 70 were accepted at the point of the reported analysis. (§4.2, p.8) The paper attributes 21/28 selected findings to earlier papers and reports 19/28 involving more than one agent. (§4.2–§4.3, pp.8–9) The ablation removed the Archive Room or used six Claude agents; neither ablation produced a valid 594-point configuration in three seeds, while all three standard seeds reached 604. (§4.5, p.12) Inference: the result supports persistent reviewed knowledge and model diversity for this benchmark, but the ablations confound several behavioral changes and do not isolate a particular review prompt. The archive can still preserve a wrong lemma if the reviewer misses an error; Verus downstream proofs only establish consequences of the encoded contracts.

## technique 3: theory-guided search followed by formal certification

What it is. Agents turn numerical near-misses into mathematical structure, then replace search with an explicit family or theorem. The paper reports that in dimension 11 agents reduced the kissing task to “a finite compatibility search over lines around a structured integer core,” then derived an algebraic construction requiring no computer search. (§3.2, p.6) For the Jacobian problem, an agent tested five smooth-conic direction templates, replaced them with a cuspidal cubic, solved compatibility equations, and obtained a degree-seven map with constant Jacobian and three rational preimages. (§6.14, p.30)

When to use it. Use it when evaluator runs are expensive or when an interpretable proof is more valuable than a high-scoring opaque artifact. Apply it after collecting near-misses: inspect repeated coordinates, symmetries, or algebraic invariants; formulate a parameterized family; prove its validity for all parameters; then evaluate only the family.

Steps from the paper.
1. Search candidate structures under a per-evaluation cap of 15–30 minutes. (§3.2, p.6)
2. Analyze near-miss configurations and identify an exact core or direction field. (§3.2, p.6; §6.14, p.30)
3. Replace the finite search with a symbolic construction and derive its invariant (for example, constant Jacobian). (§6.14, p.30)
4. Produce exact certificates and have them formally checked in Lean. (§6, p.20)

Verus form. Inference: encode the family as a pure `spec fn`, prove its invariant in a `proof fn`, and make the executable constructor return values satisfying the invariant. A constant-Jacobian style contract can be represented abstractly:

```rust
spec fn jacobian(f: Map) -> int { /* encoded determinant */ }

proof fn jacobian_constant(f: Map)
    ensures jacobian(f) == -6
{
    // algebraic identities and assertions
}

fn construct() -> (f: Map)
    ensures jacobian(f) == -6
{
    // executable coefficients
}
```

Inference: Verus integer arithmetic is appropriate for exact certificates; real or finite-field mathematics needs an explicit encoding and supporting lemmas. The paper's Lean proofs, formulas, and external libraries do not automatically transfer to Verus.

Evidence and limits. The paper's Jacobian certificate gives determinant −6 and three distinct rational points mapping to `(1, 7/3, 0)`; it says these identities are a complete counterexample certificate. (§6.14, p.30) The finite-field Kakeya result gives, for primes `p ≡ 3 (mod 4)`, a set of size `(2p^3 + 7p^2 + 3)/8`, and a 53-point set in `F_53` improving the prior bound of 63. (§3.2, p.5; §6.1, pp.20–21) Inference: these are exact mathematical claims, but the product threat is the translation burden: a Rust/Verus encoding can prove an implementation of the certificate while omitting a domain condition, overflow condition, or evaluator requirement.

## technique 4: deliberate exploration and recovery from stagnation

What it is. Station v2 inserts mechanisms that interrupt local optimization: holidays, compulsory meta-reflection, a stagnation protocol, and multistart. Appendix A.4 says holidays occur every ninth and tenth tick; agents cannot run experiments or submit papers and receive prompts for broader reflection. Meta-reflection occurs at least once every 25 ticks for mature agents. After 320 ticks without frontier improvement, lanes named exploration, exploitation, revival, understanding, and strategy are assigned. Multistart runs eight independent 40-tick rollouts and continues the branch with greatest scientific value. (Appendix A.4, pp.42–43)

When to use it. Use these controls when agents repeatedly optimize the same local family, or when the objective's evaluator hides a theorem outside the score. They are process techniques, not proof rules.

Verus form. Inference: model each phase as an explicit state machine whose transition contract preserves a phase invariant; use `requires` and `ensures` on transition functions and `invariant` clauses on loops. The reflection prompts and branch-selection policy remain executable orchestration code, while Verus can verify that no transition skips required certificate checks.

Evidence and limits. The paper does not provide a separate causal ablation for each mechanism. It reports that 13/28 selected findings emerged after tick 1,000 and that the Book Ramsey conference-graph family appeared at tick 3,727. (§4.2, p.8) Inference: late findings show that long-running exploration can matter, but they do not measure which mechanism caused each discovery. Inference: for VL, a recovery protocol may improve search completeness but increases cost and state-management complexity; it cannot replace proof obligations.

## what is proved, measured, and trusted

The paper proves or reports exact constructions, theorem proofs, evaluator scores, and Lean verification for selected theoretical findings. It measures novelty counts, collaboration counts, paper/citation counts, acceptance and rejection, baseline compute time, and reproducibility. It does not prove that all generated papers are correct, that all 125 papers are useful, that reviewer scores predict theorem validity, or that Lean verification covers the entire Station implementation.

Trusted components include the task statement, evaluator code, coding assistant, model implementations, Station orchestration, reviewer and surveyor prompts, Lean kernel/libraries, and the human novelty review. Inference: a product using agent-written verified Rust inherits analogous trust in its specification, Verus toolchain, solver assumptions, Rust compiler, external libraries, and runtime environment. The paper's evidence is therefore a threat signal for VL's generation pipeline: agents can discover and explain proof-relevant structure, but unchecked evaluators, reviewer acceptance, and translation from mathematical proof to Rust contracts remain failure points.

## what VL should reuse and what it should not redo

Inference: VL should reuse exact executable evaluators, persistent reviewed artifacts, theorem-level parameter reduction, near-miss analysis, diversity across model families, and explicit recovery from stagnation. Inference: VL should not redo the paper's demonstration that a reviewed archive can accumulate citations, or its 604-point benchmark, unless it needs a direct Rust/Verus comparison. Inference: the missing experiment for VL is an end-to-end benchmark in which agents generate Rust, Verus contracts, proof lemmas, and executable tests, with denominator-separated results for accepted proofs, evaluator failures, repair time, and specification defects.

## techniques for the catalog

- evaluator-backed exact construction search — submit candidates to binary or scalar checks, reject near-misses, and formally certify the surviving object
- reviewed persistent proof literature — store agent papers behind a review threshold so later agents can cite reusable theorems and obstructions
- theory-guided search and certification — turn numerical near-misses into parameterized mathematical families and prove their invariants
- exploration and stagnation recovery — use scheduled reflection, diverse strategy lanes, and multistart branches to escape local search
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
