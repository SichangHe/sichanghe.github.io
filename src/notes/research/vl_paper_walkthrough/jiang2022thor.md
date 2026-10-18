# Thor: Wielding Hammers to Integrate Language Models and Automated Theorem Provers
(authored by agents unless marked 🧑)
Tag: `jiang2022thor`, [paper](https://arxiv.org/abs/2205.10893)

## scope and result

Jiang et al. combine a language model with an automated theorem prover through a “hammer”: a trusted interactive prover invokes an external ATP to select useful premises, then reconstructs the proof in its own kernel. The paper's motivation is that language models struggle to choose among very large formal libraries. Its abstract reports that Thor raises PISA success from 39% to 57% and solves 8.2% of problems that neither language models nor automated theorem provers solve on their own (Abstract, p. 1; Table 1, p. 6). On MiniF2F it reaches 29.9% test success (Section 1, p. 2; Table 3, p. 8). On the step level, the paper observes that 1.9% of language-model steps involving premise selection advance the proof, against 28.2% for steps with no premises (Section 2.2, p. 3).

The central division of labor is explicit: “In Thor, a class of methods called hammers that leverage the power of automated theorem provers are used for premise selection, while all other tasks are designated to language models.” (Abstract, p. 1). Inference: for Verus, this suggests using a solver or lemma-retrieval subsystem to choose facts and leaving proof-state navigation and source generation to a model, while Verus itself checks the resulting Rust proof.

## technique: hammer-backed training labels

When to use it: use this technique when an interactive prover has a hammer that can be applied to a proof state and produces a proof the ITP accepts. In hammer-solvable states, the model no longer has to write out premises; it only emits the special token.

Steps from Algorithm 1 and Section 3 (pp. 4–5):

1. for each training proof-state record `s`, invoke hammer method `h(s)`
2. if the hammer succeeds, replace the original proof-step target with the special sequence `<hammer> <EOS>`; otherwise keep the original output
3. train the language model on the resulting `(input, output)` pairs; the input holds the proof state and optional context, which in the paper's experiments is the most recent proof step (Sections 2.2 and 4.1, pp. 3, 5)
4. during evaluation, sample proof steps from the model; when it emits `<hammer> <EOS>`, call the hammer on the live proof state instead of treating the token as an ordinary tactic
5. continue the best-first search; the paper stops when a valid proof is found, the model has been queried 300 times, a 500 s wallclock timeout is reached, or the queue is empty (Section 4.1, p. 6). Applying the hammer's returned proof inside the ITP follows from the hammer description in Section 2.3 rather than being spelled out as a separate step

The paper's concrete example replaces `by (smt (z3) even_power oddE) <EOS>` with `<hammer> <EOS>` after Sledgehammer proves the state (Section 3, p. 4). For Isabelle, Sledgehammer translates the goal and hundreds of candidate premises to SMT-LIB or TPTP, runs external ATPs, extracts useful premises, and reconstructs the proof in the Isabelle kernel (Section 2.3, pp. 3–4). The paper says external ATPs are used skeptically: only a handful of axioms and inference rules are trusted, and a proof found by an ATP is reconstructed within the kernel.

Verus form: Inference: define a model token such as `<verus_hammer>` that requests a bounded lemma-and-fact search for the current Verus obligation. A bridge can gather in-scope lemmas, trigger Verus's supported automation or an external SMT query, then emit an ordinary Verus proof block and submit it to Verus. The final acceptance condition must be a successful Verus check. Do not treat an external solver answer as a proof, and do not use unsupported Verus syntax; generated proof functions and lemmas must be checked in the actual module context.

Evidence and limits: Thor's preprocessing is a one-time cost. The authors obtain 7,400 CPU hours per year by multiplying the hammer time limit by the average number of problems submitted to the Archive of Formal Proofs in one year, for one of the largest proof corpora; where the hammer leaves a trace (Coq `sauto`; Isabelle `metis`, `meson`, `smt`), finding hammer-solvable steps costs much less (Section 3, p. 5). The method only admits automated provers that directly generate valid proof steps in the ITP via the hammer; the paper names SErAPIS, a semantic search over the Isabelle library, as a premise-selection aid Thor cannot use (Section 6, pp. 9–10). The paper tests Thor only on Isabelle (Section 6, p. 10).

## technique: skeptical external automation and premise filtering

The hammer protocol is itself a reusable verification technique. Sledgehammer sends a goal plus candidate premises to one or more ATPs, accepts only a reconstructed proof, and lets the kernel reject malformed or unsound output. The paper states, “Here, external ATPs serve as relevance filters of premises rather than trusted oracles.” (Section 2.3, p. 4).

Steps:

1. expose the current goal and a large candidate library to the hammer
2. translate them into an ATP language such as SMT-LIB or TPTP
3. run ATPs under a timeout (the paper's Sledgehammer default is 30 s, Section 4.1, p. 6)
4. inspect returned proofs to identify premises actually used
5. reconstruct the proof with primitive ITP inference and ask the kernel to check it

Verus form: Inference: an analogous subsystem can rank `requires` facts, lemmas, quantified facts, and imported specifications, then generate a candidate `assert`/lemma proof. Keep the solver outside the trusted base and require Verus to check the reconstructed Rust proof. Inference: a failed reconstruction could be logged as a negative example; Thor itself trains on no such examples. Inference: because Verus contexts include ownership, integer domains, and module visibility, premise serialization must preserve types and assumptions rather than flattening everything to text.

## technique: proof-state context and model search

The language model input is a text sequence containing optional context and the current proof state; its output is a proof step. At test time the system samples a step, applies it to the ITP, and repeats, often with best-first search over nodes scored by accumulated log likelihood (Section 2.2, p. 3). Thor uses the most recent proof step as context (Section 4.1, p. 5). Removing this context reduces PISA/test success from 57.0% to 53.6%; reducing sampling temperature from 1.2 to 1.0 reduces it to 55.7% (Table 2, p. 8; Sections 4.5 and 4.6, p. 8).

Verus form: Inference: include the current diagnostic, function signature, local assumptions, recently attempted proof action, and relevant module imports in the model context. Search nodes should retain complete source snapshots so that each candidate is checked under the same ownership and visibility conditions. Sample multiple candidates, but report pass@k with its exact k and verifier timeout.

## measured results and what remains trusted

On PISA/test, the language model alone proves 39.0% of problems, Sledgehammer alone 25.7%, their union 48.8%, and Thor 57.0%; 8.2% are solved only by the combined system (Table 1 and Section 4.3, pp. 6–7). On MiniF2F, Thor obtains 28.3% on validation and 29.9% on test, compared with 25.0% and 24.2% for the language model, and 9.9% and 10.4% for Sledgehammer (Table 3, p. 8). The MiniF2F validation and test splits each have 244 problems (Section 4.2, p. 6). PISA/test is 3,000 theorems randomly selected from the AFP test split (Section 4.2, p. 6); the paper gives evaluation cost per 1,000 problems (about 50 TPU hours for Thor, Section 4.3, p. 7; about 60 TPU hours for the language model alone, Section 4.1, p. 6) and does not state a separate count for the Table 1 runs. Inference: the PISA/test denominator for Table 1 is therefore not stated unambiguously in the paper. The 8.2% figure is the difference between 57.0% and 48.8% (Section 4.3, p. 7).

The paper's ablation “Learning how to select premises” invokes Sledgehammer whenever the model emits a Sledgehammer keyword instead of training the dedicated special token. It reaches 55.4% on PISA/test, which the paper calls “1.6% lower than the base version of Thor” (Section 4.4, p. 7; Table 2, p. 8). The authors conclude that “since finding how to do premise selection is entrusted to the hammer method, the language model should focus on learning when to invoke the hammer for optimal performance.” (Section 4.4, p. 7). Inference: this separation is likely useful for Verus because the model should focus on constructing compilable proof scripts while a dedicated subsystem handles expensive fact selection.

The paper states that “Isabelle follows a kernel philosophy (i.e., only a handful of axioms and inference rules are trusted), and external ATPs are used skeptically” (Section 2.3, p. 3). Inference: the trusted base is then the Isabelle kernel, the formal libraries, the theorem statements, and the reconstruction code; neither the language model nor the external ATP is trusted. Inference: in VL, Verus's verifier, Rust compiler, solver, imported library contracts, and the correctness of the generated specification remain trusted boundaries. A passing generated proof does not establish that the contract expresses the product requirement.

## threat to VL and prior work to avoid repeating

Inference: Thor is a substantial threat to VL's proof-authoring workflow because premise selection is a central source of model failure, and a Verus-aware hammer could search large lemma libraries before generation. It is less threatening to the verifier itself: the paper's safety depends on kernel reconstruction, exactly the role Verus can play. Inference: Thor does not address contract discovery, ownership design, loop invariants, or solver instability; the paper discusses none of them. The paper already reports special-token hammer invocation, skeptical ATP filtering, recent-step context, temperature ablations, and hybrid-versus-union measurements on Isabelle. Inference: VL should measure transfer to Rust/Verus contexts, proof repair under changing imports, and the fraction of candidates accepted after actual Verus checking instead of repeating these generic results.

## techniques for the catalog

- special-token hammer invocation: label hammer-solvable proof states during preprocessing and call the hammer when the model emits a dedicated token
- skeptical ATP filtering: use external provers to rank premises, then reconstruct and kernel-check the proof
- context-conditioned proof search: include the most recent proof step and the current proof state when sampling candidate steps
- separated responsibilities: train the model to decide when to invoke automation while the hammer decides which premises to use
- diversity ablation: tune sampling temperature (the paper compares 1.2 against 1.0) and report success with explicit denominators
- hybrid evaluation: compare model-only, hammer-only, their union, and the combined system to expose complementary coverage
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Hence, the improvement in proof success rate brought upon the language model by Thor is comparable to that by expert iteration."): read the whole paper text; checked every quotation, number, table and section reference, page number, and the Algorithm 1 and Section 3 steps; changed the Table 2 page (p. 8, not p. 7), the 'relevance filters' quote and page (p. 4, full sentence), the 7,400 CPU-hour derivation, the Section 6 limitation and its pages, the context description (most recent proof step only), the hammer-versus-learning statement in the ablation, the trusted-base paragraph (now quoted, rest marked Inference), and the PISA/test denominator (paper says 3,000 test theorems but costs per 1,000, so it is ambiguous); link switched to arXiv from the paper text. Did not check: the PDF figures (Figure 1, Figure 2), the Appendix case studies, the cited external papers, or the Verus-side inferences beyond their labelling.
