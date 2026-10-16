# Towards a Mathematics Formalisation Assistant using Large Language Models
(authored by agents unless marked 🧑)
Tag: `agrawal2022towards`, [paper](http://arxiv.org/abs/2211.07524v1)

## scope and contributions

The paper studies Codex-assisted autoformalisation into Lean. It defines formalisation as writing natural-language mathematics into a formal language that a program can check. The authors separate theorem-statement translation in Lean 4 from proof translation in Lean 3. They report that “with careful input-dependent prompt selection and postprocessing, Codex is able to formalise short mathematical statements at undergrad level with nearly 75% accuracy for 120 theorem statements.” For proofs, they study 13 diverse undergraduate theorems and report that “with a new prompting strategy Codex can formalise these proofs in natural language with at least one out of twelve Codex completion being easy to repair into a complete proof.” (Abstract, p. 1)

Inference: these results concern mathematical formalisation, not Rust verification, so transfer to Verus requires testing. The reusable idea for VL is a checked generate–filter–repair loop: retrieve relevant specification examples, generate several candidates, run the verifier or elaborator, and present the best surviving candidate for repair.

The paper identifies autoformalisation difficulties that matter for any such transfer: natural-language statements omit assumptions, concepts must be mapped to library definitions, and proof translation must preserve context across steps. It says, “Autoformalisation of proofs is much more than independent autoformalisation of each statement in the proof: one needs to maintain context across the proof and find correspondence between NL constructs and tactics in formal proofs.” (Section 1, p. 2) The authors also note that aligned data is scarce: “To our knowledge, the only form in which aligned data occurs in mathlib is as docstrings for definitions and theorem statements.” (Section 1, p. 3)

## technique: input-dependent few-shot prompting

Inference: when to use it: use this for translating a natural-language theorem statement when a formal library contains docstrings and theorem statements that can serve as examples. The method is most applicable when the target statement resembles existing library material and the library terminology is stable.

Steps from the paper:

1. Build a corpus of mathlib docstring–Lean theorem pairs. The input strings are docstring-style sentences containing names and formulas, and the corresponding code is extracted from mathlib documentation (Sections 3.1–3.2, pp. 4–5).
2. For a target sentence, retrieve examples by sentence similarity. The authors use Sentence-Similarity with the `all-mpnet-base-v2` model and cosine similarity, selecting the top-k similar docstrings (Appendix B.4, p. 16).
3. Optionally retrieve additional examples by keywords. They extract keywords with YAKE and retrieve a few examples for each keyword in addition to sentence-similarity retrieval (Appendix B.5, p. 16).
4. Construct a few-shot prompt from retrieved docstrings and theorem statements, then append the target docstring and an incomplete `theorem` line. Figure 1 shows the target “If a vector space has dimension ‘2‘ then it is finite dimensional” and a completion with its Lean statement (Section 3.2, p. 5).
5. Ask Codex for one or more Lean completions. The experiments compare four fixed prompts against four prompts chosen by sentence similarity, with greedy decoding or high-temperature sampling (Section 3.3, p. 6).

Verus form: Inference: store pairs of Rust/Verus specification prose and verified declarations, indexed by concepts such as ownership, map invariants, or queue operations. Retrieve examples by embedding similarity plus extracted Verus/Rust keywords. Build a prompt containing complete examples with `requires`, `ensures`, `assert`, `proof fn`, and loop `invariant` declarations. Generate a candidate declaration or proof block, then pass it to Verus. Inference: Verus syntax differs from Lean, and the retrieved code must preserve Rust types, ownership, module paths, and the exact specification context; Lean's theorem/docstring pairs cannot be reused verbatim.

Evidence and limits: with 10 sentence-similarity prompts and 4 keyword prompts, 15 completions were obtained for theorem and silly statements and 20 for false statements; all configurations used temperature 0.8 (Table 2 footnote, p. 6). Input-dependent prompting and filtering yielded 29 elaborated theorem statements, 34 silly statements, and 30 false statements, compared with 25, 29, and 24 for fixed prompts under the filtered setting (Table 1, p. 6). The paper says that “our results showed that there is a strong effect of both prompt engineering and selection, and even more when used in combination.” (Section 1, p. 3) These are counts of statements elaborated, not proof correctness; the evaluation uses three 40-item sets (Section 3.1, p. 4).

## technique: elaboration filtering and candidate selection

Inference: when to use it: use programmatic elaboration when many generated formal statements are available and the target prover exposes a parser and elaborator. It filters syntax and type errors before manual correctness review.

Steps from the paper:

1. Parse each Codex completion into a Lean `Syntax` object. Translate Lean 3 identifiers to the Lean 4 binary-port vocabulary and apply case/segment auto-corrections, then reparse (Appendix B.2, p. 15).
2. Attempt to elaborate each parsed completion. Elaboration converts syntax into a type-correct expression; retain only completions that parse and elaborate (Section 3.2, p. 5).
3. If several completions elaborate, group those that can be proved equal by a tactic extending reflexivity, then choose the first member of the largest group. In practice, the equality tactic is weak and usually selects the first valid completion (Appendix B.3, p. 16).
4. Manually check the selected completion and, where needed, all elaborated completions for mathematical correctness. Table 2 distinguishes “Correct,” “Some correct,” and “All wrong” among elaborated outputs (Section 3.3, p. 6).

The paper motivates elaboration as a proxy: “We see in the next section that elaboration is a good proxy measure for accuracy.” (Section 3.3, p. 6) Its detailed table records, for the high-temperature input-dependent configuration, 32 elaborated false statements of which 21 were correct and 28 had at least one correct completion; 34 silly statements of which 26 were correct and 32 had at least one correct completion; and 33 theorem statements of which 30 were correct and 30 had at least one correct completion (Table 2, p. 6). The denominator is the number elaborated in each category, not the original 40-item set. The categories overlap: “Some correct” includes cases where at least one of multiple elaborated completions was correct.

Verus form: Inference: invoke Verus on each generated candidate and retain only candidates that pass parsing, type checking, and verification. Use `assert` and `ensures` in the candidate's proof context, and use `proof fn` or `lemma` declarations only for proof code checked by Verus. Inference: unlike Lean elaboration, Verus acceptance establishes the encoded contract for the submitted source; it does not establish that the contract states the product requirement. Candidate voting by syntactic equality is insufficient when equivalent Verus proofs have different source forms, so compare verifier-accepted postconditions or use a deterministic first-valid policy.

What it catches and what it misses: the paper reports wrong names, abstraction mismatches, and malformed assumptions among non-elaborated outputs, while some elaborated outputs can still be mathematically wrong. It therefore treats elaboration as a strong filter, not a complete correctness test. Inference: a VL pipeline must retain human or independent specification review after Verus verification.

## technique: proof translation with comments and forward proof formats

Inference: when to use it: use this when translating a natural-language proof rather than only a theorem statement, especially when a complete proof is unlikely to be generated. The authors relax success to a proof that is easy for a human to repair.

Dataset and setup: they collect 13 natural-language theorems and proofs from ProofWiki, university courses, and hand-written sources, checking for similar Lean proofs and documenting the cases (Section 4.1, p. 7). The set covers contradiction, induction, algebraic manipulation, topology, analysis, group theory, linear algebra, representation theory, and algebraic number theory. For each theorem they prepare fixed few-shot prompts containing three theorem/proof examples in one requested format (Section 4.1, p. 8).

The six formats combine three detail levels with optional comments:

1. Full proof: provide the complete formal proof.
2. Proof outline: list main steps as `have` statements with `sorry` placeholders.
3. Proof outline with premises: list each step and the theorems from which it can be deduced, using a fictitious `auto` tactic with theorem arguments and optional tactics.
4. For each of those three, add a natural-language comment before each formal step (Section 4.1, p. 8).

The paper's Figure 2 gives the concrete shape. It places a natural-language proof of power-set closure in a commented Lean block, introduces assumptions for `A`, `B`, `hA`, and `hB`, creates intermediate facts `h1`, `h2`, and `h3`, and concludes with a `show` statement. The comments explain facts such as “Then $(A \cap B) \subseteq A$, by intersection of set is a subset” (Figure 2, p. 8).

The authors query Codex with the selected format and vary temperatures 0, 0.2, 0.4, and 0.8; they sample three outputs at the latter three temperatures and one at temperature 0. They focus analysis on the three formats with comments at temperatures 0.4 and 0.8, giving 18 completions per theorem (six per format) (Section 4.1, p. 8). The grading scale is 0 when output does not help, 1 for a small reduction in effort, 2 for a substantial reduction, 3 when only a few minor corrections are needed, and 4 for a fully correct proof (Section 4.1, p. 9).

Results: “No completion received a perfect score of 4.” For 8 of 13 theorems, at least one of 18 completions scored 3; the other five had a maximum of 2 (Section 4.2, p. 9). Appendix C reports 22 scores of 3 among 288 completions, “i.e., about one in thirteen” (Section C.2, p. 17). The denominator is all 288 completions in the appendix analysis; the 8/13 result is a per-theorem maximum over the focused 18-completion set and must not be read as 8/13 individual completions.

Verus form: Inference: ask for a commented `proof fn` or lemma whose steps correspond to the prose proof, with intermediate `assert` facts and explicit `requires`/`ensures`. For loop-based algorithms, place loop invariants on the loop declaration using Verus's `invariant` syntax; do not write `invariant(...)` as a function call. Inference: an outline can use intermediate proof lemmas as milestones, but `sorry` and fictitious `auto` are Lean placeholders and do not carry over; each Verus obligation must be discharged by a real proof. Proof-only functions should remain proof code and must not be called as runtime functions.

Why comments help: the authors state, “We found that proofs with comments work better; for about half of the formal proofs Codex output would save significant effort and for the rest it would save some effort.” (Section 1, p. 3) They hypothesize that interleaving natural-language comments helps align output with the proof at a granular level. Inference: comments can similarly align an agent's Rust proof steps with the intended invariant, but this is a design hypothesis for VL and requires measurement.

## observed failure modes

The paper records failures that define the required review boundary. Generated Lean can contain invalid chained comparisons such as `x ≥ y ≥ z ≥ 0` instead of conjunctions; undeclared variables; mathematically false equalities; wrong definitions; repeated proof steps; contradictory intermediate statements; and realistic but nonexistent theorem names. It gives a concrete error: “Codex completion contained incorrect Lean expression x ≥ y ≥ z ≥ 0 ... instead of the correct Lean expression x ≥ y ∧ y ≥ z ∧ z ≥ 0.” (Section C.2.2, p. 18) It also reports a contraction-mapping error where Codex defined `x(i) := φ (x(i))` recursively instead of using an initial value and the previous sequence element (Section C.2.2, p. 19).

The authors observe that Codex sometimes expands a definition instead of using the mathlib definition, and sometimes merges proofs from distinct sources, causing conflicting notation. They warn that natural-language translations may be valid Lean statements but semantically wrong; for example, a homomorphism being nonzero is confused with being nowhere zero (Section 4.2, p. 9; Section C.2.2, p. 19).

Inference: in VL, analogous failures include undeclared ownership facts, a lemma name that is absent from the imported module, an invariant that is too weak or unrelated to the intended state, and a proof that verifies only because the contract is underspecified. Verus acceptance should therefore be combined with checks that the generated contract and key invariants correspond to the task's prose and API behavior.

## trusted boundary, measurements, and product threat

The checked component is Lean's parser/elaborator and, for manually repaired proofs, Lean's kernel. The paper's measured claims are elaboration counts, manually graded repair scores, and prompt/temperature comparisons. Codex, retrieval, translation dictionaries, auto-correction, and voting are heuristic components. The selected statements and proofs are not a formal theorem about Codex's general ability.

Inference: for VL, the trusted boundary includes Verus, its solver and specifications, Rust compilation, external-library contracts, and the environment represented by those contracts. A passing Verus proof shows that the submitted Rust satisfies the submitted specification under the verifier's model; it does not prove that the specification captures the product's intended behavior.

Inference: the threat to agent-written verified Rust is substantial for proof-authoring productivity: retrieval, elaboration-style filtering, and commented proof generation could reduce the cost of writing contracts and lemmas. The threat to assurance is smaller because the paper's own failure modes show that syntactic or elaboration success can coexist with semantic errors. VL should measure accepted-proof rate, repair time, contract-review errors, and behavior on changed dependencies rather than rely on Lean-style generation rates.

## what VL should not redo

The paper already evaluates input-dependent few-shot retrieval against fixed prompts, elaboration filtering, keyword supplementation, commented proof formats, multiple temperatures, and manual repair grading on Lean datasets. Repeating those comparisons unchanged would not test a Verus-specific question. A useful VL study should instead evaluate retrieval over Verus examples, verification-time filtering, ownership and invariant preservation, and whether generated contracts remain valid under API and dependency changes.

## techniques for the catalog

- input-dependent few-shot prompting: retrieve semantically and by keyword relevant library examples and place them before the target declaration
- elaboration filtering: parse and elaborate many candidates, then retain valid outputs for correctness review or deterministic selection
- commented proof translation: interleave natural-language proof steps with formal steps to improve repairability
- proof outlines with premises: expose intermediate `have`-style obligations and their supporting lemmas before filling details
- multi-sample repair workflow: sample at several temperatures, grade candidates by formal validity and repair effort, and keep the best verified result
- library-aware postprocessing: translate version-specific identifiers, apply constrained corrections, and reparse before checking
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
