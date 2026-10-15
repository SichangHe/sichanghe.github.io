# Semantic Prefix Oracles for LLM Decoding: Contracts and Differential Validation
(authored by agents unless marked 🧑)
Tag: `kronlunddrouault2026semantic`, [paper](https://www.semanticscholar.org/paper/98f868f0f9264c217efcfa01c0ec1f70d48f319f)

## what is proved or measured

The paper defines semantic grammar specifications: a context-free surface grammar augmented with first-order semantic terms, unification, context membership, scoped effects, and right-bound constraints. Aufbau evaluates these constraints incrementally during Earley parsing; P7 submits each proposed token and receives `Lost`, `Live`, or `Satisfied` (Sections 2–3, pp. 2–6). The main distinction is between safe pruning—never rejecting a prefix with a valid continuation—and dead-end freedom—every retained prefix has a continuation.

The abstract states: "Our implementation enforces safe pruning: it rejects only prefixes whose semantic contradictions cannot be repaired by any continuation." (Abstract, p. 1). The paper proves safe pruning for stable contradictions (Theorem 2.4, p. 3), gives sufficient conditions for dead-end freedom (Theorem 2.6, pp. 3–4), proves tokenizer lifting under a vocabulary-coverage assumption (Lemma 3.1, p. 5), and validates the implementation against `ocamlc` and `cc` by differential testing (Section 4.1, pp. 6–7).

## technique: semantic-prefix grammar and stable-contradiction pruning

what it is and when to use it

Use this oracle when syntax-only masks permit semantically impossible programs, such as an out-of-scope variable or a literal with a fixed incompatible type. A semantic grammar keeps Earley surface branches but annotates them with evidence, type terms, exported context effects, and binding states. It rejects a branch only when every continuation preserves a stable contradiction (Sections 2.1–2.3, pp. 2–4).

how to do it

1. Define nonterminals, terminal recognizers, productions, start symbol, semantic rules, and binding identifiers as a semantic grammar tuple (Definition 2.1, p. 2).
2. Annotate productions with evidence bindings and compile each rule into first-order term operations: ascription, unification, equality, context lookup, scoped extension, and right-bound effects (Sections 2.1–2.2, pp. 2–3).
3. Parse each prefix with Earley items carrying a status (`Exact`, `Prefix`, `Extensible`), type term, exported context effect, and `Resolved`/`Pending` bindings (Section 2.2, p. 3).
4. Build a constraint graph from rule premises and shared holes. Evaluate it as `Satisfied` (closed and consistent), `Lost` (stable contradiction), or `Live` (not closed and not contradicted) (Section 2.3, p. 3).
5. Mask a token only when all compatible branches are `Lost`; retain `Live` branches and continue decoding (Definition 2.3 and Theorem 2.4, p. 3).

The worked minimal grammar has `Var → Id[x]`, `Lam → 'λ' Id[a] ':' Type[t] '.' Expr[e]`, and `App → Expr[l] Expr[r]` with shared type holes (Section 2.1, p. 2). In the worked example, `λx:int. y` becomes `Lost` because `y∉Γ`, while an unfinished body is `Live` and `λx:int. x` is `Satisfied` (Section 2.4, p. 4).

Verus form (inference)

Inference: Represent each prefix state as a Rust struct with an enum verdict and immutable constraint graph. Use `spec fn` predicates for stable contradiction, context lookup, and graph closure; use `requires`/`ensures` to state that `Lost` implies no completion under the specified monotonicity assumptions. A decoding loop can maintain `invariant` clauses for chart consistency and monotone binding state (`Pending` may become `Resolved`, never reverse). Use Verus `seq`/`map`/`set` constructs found in the Verus reference; do not write `invariant(...)` as a call or use unsupported `modifies` syntax. The LLM token sampler remains outside the proof boundary.

evidence, limits, and assumptions

Theorem 2.4's proof relies on stable contradictions: constructor clashes, empty regular intersections, occurs-check failures, and failed lookups in fixed left context remain contradictions under extension (Section 2.3, p. 3). It does not claim that every `Live` prefix is completable. The paper emphasizes: "Dead-end freedom is a property of a grammar in addition to the oracle." (Section 2.3, p. 3). A semantic grammar can therefore safely prune while still allowing a decoding dead end.

## technique: dead-end freedom via productivity, type coverage, and left-to-right flow

what it is and when to use it

Use the three conditions when the decoder must guarantee that every retained branch has some witness, rather than merely avoid false rejection. They are sufficient grammar conditions, not a characterization of all grammars (Section 2.3, pp. 3–4).

how to do it

1. Establish (P) surface productivity: every reachable nonterminal has a finite completion and every reachable regular residual is nonempty (Definition 2.5, p. 4).
2. Establish (T) type coverage: every reachable type demand has a finite closed realizer that preserves the fixed left context (Definition 2.5, p. 4).
3. Establish (F) left-to-right constraint flow: a child's obligations depend only on its parent demand, fixed context, and children to its left (Definition 2.5, p. 4).
4. Complete the leftmost unfinished position repeatedly. (P) closes syntax, (F) makes demands available without lookahead, and (T) supplies a realizer; the construction moves rightward until the parse closes (Theorem 2.6, p. 4).
5. Reject a grammar-wide dead-end claim when any condition is unproved. Plain STLC fails (T) with an unrestricted base-type universe; restricting base types to literals would recover coverage, but the paper did not rerun the STLC generation study on that restriction (Section 2.3, p. 4).

Verus form (inference)

Inference: Encode productivity, type coverage, and flow as explicit predicates over grammar metadata. Prove a witness-construction function with `ensures` that a `Live` prefix has a completion when these predicates hold; use a decreasing measure on unfinished positions for termination. Keep the grammar-class proof separate from the incremental parser proof. A Verus proof can establish dead-end freedom for a finite grammar instance, but cannot infer the conditions automatically without additional verified analysis.

evidence, limits, and assumptions

Finite-lambda, core ML, and C-like fragments satisfy (P), (T), and (F), while the tool DSL lacks a universal inhabitant and receives no dead-end-freedom claim (Section 3.2, pp. 5–6). STLC is safe-prunable but not dead-end-free. These conditions assume decidable first-order unification and productive regular terminals; declared normalization rewrites are outside Proposition 2.2 because they need separate termination and confluence arguments (Section 2.2, p. 3).

## technique: tokenizer lifting

what it is and when to use it

Use tokenizer lifting to carry a character-level witness theorem into token-level decoding. The oracle consumes model tokens, so a valid character continuation must factor exactly into vocabulary spellings and preserve recognizer residuals across token boundaries (Section 3.1, p. 5).

how to do it

1. Let ΣG be the union of terminal alphabets and let ℓ map each ordinary vocabulary token to its exact spelling; define LV as the set of token spellings (Section 3.1, p. 5).
2. Require coverage ΣG ⊆ LV*; closure under concatenation gives ΣG* ⊆ LV* (Section 3.1, p. 5).
3. Feed tokens to the oracle byte-for-byte, carrying a regular recognizer derivative when a token ends inside a terminal segment (Lemma 3.1, p. 5).
4. Factor every character-level witness into a finite token sequence; conclude token-sequence reachability from character-level witness existence (Lemma 3.1, p. 5).

The lemma requires "exact spelling (the oracle consumes, byte-for-byte, the text the model conditions on) and coverage" (Lemma 3.1, p. 5). Control and end-of-sequence tokens follow the completion policy and are not covered by ordinary spelling alone (Section 3.1, p. 5).

Verus form (inference)

Inference: Model token spelling as a verified concatenation function and prove that coverage factors every grammar witness. Use `seq<u8>` or `seq<char>` and `ensures` for derivative composition across token boundaries; maintain a loop `invariant` that the tokenized prefix equals the character prefix consumed by the oracle. Treat tokenizer implementation, Unicode normalization, and special-token policy as assumptions unless separately verified.

evidence, limits, and assumptions

The theorem is conditional on exact spelling and vocabulary coverage. A tokenizer with missing characters or normalization changes can invalidate the lift. The paper does not claim that an arbitrary production tokenizer satisfies coverage; this is a check required for each vocabulary and grammar. P7 keeps stop tokens admissible, so the mask cannot force completion and abandonments remain measurable (Section 3.1, p. 5).

## technique: differential prefix validation

what it is and when to use it

Use differential testing when a semantic oracle has a formal rejection proof but the optimized implementation may contain bugs. Compare every prefix against an independent production compiler that shares no oracle code, checking the direction that matters: no compiler-valid prefix may be marked `Lost` (Section 4.1, pp. 6–7).

how to do it

1. Choose compiler-valid cohorts and an independent compiler (`ocamlc` for ML, `cc -fsyntax-only` for C) (Section 4.1, p. 6).
2. Extend each valid program mechanically, evaluate every prefix with Aufbau, and count false `Lost` verdicts (Section 4.1, p. 6).
3. Probe known boundary cases, including recursion, to expose mismatches between grammar assumptions and compiler behavior (Section 3.2, p. 6; Section 4.1, p. 7).
4. Run invalid programs and compare the point at which semantic and syntax-only oracles detect failure (Section 4.1, p. 7).
5. Report cohort denominators, Wilson intervals, and limitations; finite cohorts validate but do not certify the implementation (Section 4.1, pp. 6–7).

The paper reports: "Across every prefix of 65 compiler-valid programs we observe zero false prunes." (Abstract, p. 1). More precisely, the cohort has 40 ML and 25 C programs, giving 0/40 and 0/25 false prunes with Wilson 95% upper bounds of 8.8% and 13.3% (5.6% pooled) (Section 4.1, p. 7). On 30 invalid programs, semantic pruning catches 25/30 mid-stream (12/17 ML and 13/13 C), while syntax-only catches 0/30 before end of input (Section 4.1, p. 7). A 42-program recursion probe agrees with `ocamlc` in 42/42 cases with Wilson 95% CI [0.92,1.00] (Section 4.1, p. 7).

Verus form (inference)

Inference: Build two independently implemented models of the same prefix verdict and prove or test agreement on generated finite cohorts. In Verus, specify that a compiler-valid witness prefix cannot satisfy `Lost`; use `ensures` for the oracle theorem and a separate executable harness for cross-implementation comparison. Record denominators and confidence calculations as data. Differential testing cannot replace a mechanized proof of parser implementation correctness.

evidence, limits, and assumptions

The paper explicitly says the cohorts are hand-selected and finite, so they "validate rather than certify" (Section 4.1, p. 6). The optimized engine lacks a slow reference evaluator for complete prefix-by-prefix correspondence; adding one is future work (Section 4.1, p. 6). A recursion bug was found by the probe: inference-mode recursive declarations were excluded after false-prune evidence, while checking-mode recursion remained admitted (Section 3.2, p. 6).

## technique: semantic-versus-syntactic constrained decoding ablation

what it is and when to use it

Use a matched ablation to estimate what semantic typing contributes beyond syntax masks. Keep parser, sampler, tokenizer bridge, and surface grammar fixed; compare the semantic oracle with the same grammar after removing typing rules (Section 4.2, pp. 7–9).

how to do it

1. Run twelve open models with full logit access on 52 tasks (33 STLC and 19 other tasks as described in Section 4.2) using greedy decoding, temperature 0, one attempt, and fixed seed (Section 4.2, p. 7).
2. Compare semantic and syntactic-only modes for the nine models that ran both arms; report per-language validity/correctness rather than pooling incompatible metrics (Section 4.2, p. 7).
3. Grade STLC behaviorally with an independent type and β/α-equivalence validator; grade ML and C by both Aufbau and production compiler acceptance; grade tool episodes by executed return values (Section 4.2, pp. 7–8).
4. Report semantic-minus-syntactic point estimates with Wilson 95% intervals and retain caveats about unpaired tool episodes and the pre-return-check C grammar (Section 4.2, pp. 8–9).

The abstract reports "nonnegative observed semantic-minus-syntactic point estimates for every model-language pair" and maxima of +15.2 points on STLC correctness and +14.3 points on ML validity (Abstract, p. 1). The paper cautions that C gains were zero in matched cells and format control alone can explain them (Section 4.2, p. 9). Constrained Qwen3.5-4B-Base completes 8/14 tool episodes (57%) versus 4/18 (22%) unconstrained, but fluent 4B is 69% versus 71%; these are unpaired small cells and direction-only evidence (Section 4.2, pp. 8–9).

Verus form (inference)

Inference: For Verus, compare syntax-only Rust generation against syntax plus verified specification checks with identical model, seed, tokenizer, and task. Grade only machine-checked proofs and report separate behavioral tests. Use paired tasks where possible; preserve denominators and avoid pooling unlike proof obligations. A Verus specification checker can serve as the semantic oracle, but its own soundness must be established.

evidence, limits, and assumptions

Generation uses one greedy attempt per task, small hand-selected validation corpora, and heterogeneous metrics (Section 6, p. 10). The C generation cells predate a return-type check added later; rerunning is future work (Sections 3.2 and 4.2, pp. 5, 9). Semantic masks can reduce token branching and generation cost, but constrained decoding cannot repair a model's semantically wrong final program; the paper states that the mask prunes rather than repairs (Section 3.1, p. 5).

## what remains trusted and product threat (inference)

Inference: The trusted base includes the semantic grammar compiler, Earley implementation, unification engine, tokenizer bridge, production compilers, independent validators, and model/tokenizer behavior. The paper's theorem proves a rejection discipline for the specified IR, while the shipped optimized engine and finite differential cohorts remain implementation evidence. Dead-end freedom is not claimed for STLC or tool DSLs, and no theorem is mechanized in Verus.

Inference: For VeruLaw, semantic-prefix checking is a strong pattern for rejecting impossible proof obligations before expensive generation, provided the specification's constraints are sound and stable. The threat to agent-written verified Rust is moderate to high: an unsound or incomplete semantic oracle can hide valid repairs or steer decoding toward a semantically wrong but verifier-accepted program. Use independent differential checks, explicit trusted-kernel boundaries, and specification adequacy tests before treating oracle verdicts as safety evidence.

## what VL should not redo

The paper already supplies the semantic grammar IR, safe-pruning and dead-end contracts, tokenizer-lifting lemma, P7 loop, finite-lambda/ML/C/tool instances, differential validation, and matched syntax-only ablation. Repeating a generic constrained-decoding implementation would add little. New work should instantiate the contracts for Verus proof states, prove or test tokenizer and parser correspondence, and measure false-prune risk on real Rust specifications.

## techniques for the catalog

- stable-contradiction semantic pruning — retain `Live`/`Satisfied` branches and mask only branches whose semantic contradiction cannot be repaired by continuation
- dead-end freedom conditions — establish surface productivity, type coverage, and left-to-right constraint flow before claiming every retained prefix has a witness
- tokenizer lifting — transfer character-level witness reachability to token sequences under exact spelling and vocabulary coverage
- differential prefix validation — compare every oracle prefix verdict with independent production compilers and report finite-cohort denominators
- semantic-versus-syntactic ablation — isolate the effect of semantic constraints with matched parser, sampler, tokenizer, and surface grammar settings

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
