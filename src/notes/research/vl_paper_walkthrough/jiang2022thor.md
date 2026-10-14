# Thor: Wielding Hammers to Integrate Language Models and Automated Theorem Provers
(authored by agents unless marked 🧑)
Tag: `jiang2022thor`, [paper](https://doi.org/10.48550/arxiv.2205.10893)

## scope and result

Jiang et al. combine a language model with an automated theorem prover through a “hammer”: a trusted interactive prover invokes an external ATP to select useful premises, then reconstructs the proof in its own kernel. The paper's motivation is that language models struggle to choose among very large formal libraries. Its abstract reports that Thor raises PISA success from 39% to 57% and solves 8.2% of problems that neither component solves alone; on MiniF2F it reaches 29.9% test success (Abstract and Tables 1 and 3, pp. 1, 6, 8).

The central division of labor is explicit: “In Thor, a class of methods called hammers that leverage the power of automated theorem provers are used for premise selection, while all other tasks are designated to language models.” (Abstract, p. 1). Inference: for Verus, this suggests using a solver or lemma-retrieval subsystem to choose facts and leaving proof-state navigation and source generation to a model, while Verus itself checks the resulting Rust proof.

## technique: hammer-backed training labels

When to use it: use this technique when an interactive prover has a hammer that can decide whether the current proof state is solvable and can produce a kernel-checkable proof. It removes premise selection from the model's output vocabulary.

Steps from Algorithm 1 and Section 3 (pp. 4–5):

1. for each training proof-state record `s`, invoke hammer method `h(s)`
2. if the hammer succeeds, replace the original proof-step target with the special sequence `<hammer> <EOS>`; otherwise keep the original output
3. train the language model on the resulting `(input, output)` pairs, including the current proof state and optional recent proof context
4. during evaluation, sample proof steps from the model; when it emits `<hammer> <EOS>`, call the hammer on the live proof state instead of treating the token as an ordinary tactic
5. apply the returned proof inside the ITP and continue sampling until all goals are discharged or the budget ends

The paper's concrete example replaces `by (smt (z3) even_power oddE) <EOS>` with `<hammer> <EOS>` after Sledgehammer proves the state (Section 3, p. 4). For Isabelle, Sledgehammer translates the goal and hundreds of candidate premises to SMT-LIB or TPTP, runs external ATPs, extracts useful premises, and reconstructs the proof in the Isabelle kernel (Section 2.3, p. 3). External ATPs are relevance filters rather than trusted oracles because the kernel checks the reconstructed proof.

Verus form: Inference: define a model token such as `<verus_hammer>` that requests a bounded lemma-and-fact search for the current Verus obligation. A bridge can gather in-scope lemmas, trigger Verus's supported automation or an external SMT query, then emit an ordinary Verus proof block and submit it to Verus. The final acceptance condition must be a successful Verus check. Do not treat an external solver answer as a proof, and do not use unsupported Verus syntax; generated proof functions and lemmas must be checked in the actual module context.

Evidence and limits: Thor's preprocessing is a one-time cost. The authors estimate 7,400 CPU hours per year for one large proof corpus if every state is submitted to the hammer; existing trace keywords such as Isabelle `metis`, `meson`, and `smt` can reduce this cost (Section 3, p. 5). The method requires a hammer that directly generates valid ITP proof steps; premise rankers that only return documents are outside the current protocol (Section 6, p. 9).

## technique: skeptical external automation and premise filtering

The hammer protocol is itself a reusable verification technique. Sledgehammer sends a goal plus candidate premises to one or more ATPs, accepts only a reconstructed proof, and lets the kernel reject malformed or unsound output. The paper states, “external ATPs serve as relevance filters of premises rather than trusted oracles.” (Section 2.3, p. 3).

Steps:

1. expose the current goal and a large candidate library to the hammer
2. translate them into an ATP language such as SMT-LIB or TPTP
3. run ATPs under a timeout
4. inspect returned proofs to identify premises actually used
5. reconstruct the proof with primitive ITP inference and ask the kernel to check it

Verus form: Inference: an analogous subsystem can rank `requires` facts, lemmas, quantified facts, and imported specifications, then generate a candidate `assert`/lemma proof. Keep the solver outside the trusted base and require Verus to check the reconstructed Rust proof. A failed reconstruction is a normal negative training example. Inference: because Verus contexts include ownership, integer domains, and module visibility, premise serialization must preserve types and assumptions rather than flattening everything to text.

## technique: proof-state context and model search

The language model input is a text sequence containing optional context and the current proof state; its output is a proof step. At test time the system samples a step, applies it to the ITP, and repeats, often with best-first search over nodes scored by accumulated log likelihood (Section 2.2, p. 3). Thor uses the most recent proof step as context. Removing this context reduces PISA/test success from 57.0% to 53.6%; reducing sampling temperature from 1.2 to 1.0 reduces it to 55.7% (Table 2, p. 7).

Verus form: Inference: include the current diagnostic, function signature, local assumptions, recently attempted proof action, and relevant module imports in the model context. Search nodes should retain complete source snapshots so that each candidate is checked under the same ownership and visibility conditions. Sample multiple candidates, but report pass@k with its exact k and verifier timeout.

## measured results and what remains trusted

On PISA/test, the language model alone proves 39.0% of problems, Sledgehammer alone 25.7%, their union 48.8%, and Thor 57.0%; 8.2% are solved only by the combined system (Table 1 and Section 4.3, pp. 6–7). On MiniF2F, Thor obtains 28.3% on validation and 29.9% on test, compared with 25.0% and 24.2% for the language model, and 9.9% and 10.4% for Sledgehammer (Table 3, p. 8). The test sets have 244 problems in MiniF2F (Section 4.2, p. 6); PISA/test has 1,000 evaluated problems in the ensemble experiment (Section 4.3, p. 7). Thor evaluation for those 1,000 PISA problems takes approximately 50 TPU hours. These denominators distinguish theorem success rates from proof-step rates.

The paper's ablation “Learning how to select premises” invokes Sledgehammer whenever the model emits a Sledgehammer keyword instead of training the dedicated special token. It reaches 55.4% on PISA/test, 1.6 percentage points below base Thor (Table 2, p. 7). The authors infer that the model should learn when to invoke the hammer while the hammer learns how to select premises. Inference: this separation is likely useful for Verus because the model should focus on constructing compilable proof scripts while a dedicated subsystem handles expensive fact selection.

What is trusted in the paper is the ITP kernel and its small inference base, not the external ATP or language model. What remains trusted includes Isabelle's implementation, the formal libraries, the specification, and the reconstruction code. Inference: in VL, Verus's verifier, Rust compiler, solver, imported library contracts, and the correctness of the generated specification remain trusted boundaries. A passing generated proof does not establish that the contract expresses the product requirement.

## threat to VL and prior work to avoid repeating

Inference: Thor is a substantial threat to VL's proof-authoring workflow because premise selection is a central source of model failure, and a Verus-aware hammer could search large lemma libraries before generation. It is less threatening to the verifier itself: the paper's safety depends on kernel reconstruction, exactly the role Verus can play. Thor does not solve contract discovery, ownership design, loop invariants, or solver instability. The paper already establishes special-token hammer invocation, skeptical ATP filtering, recent-step context, temperature ablations, and hybrid-versus-union measurements on Isabelle. VL should measure transfer to Rust/Verus contexts, proof repair under changing imports, and the fraction of candidates accepted after actual Verus checking instead of repeating these generic results.

## techniques for the catalog

- special-token hammer invocation: label hammer-solvable proof states during preprocessing and call the hammer when the model emits a dedicated token
- skeptical ATP filtering: use external provers to rank premises, then reconstruct and kernel-check the proof
- context-conditioned proof search: include recent proof actions and full current state when sampling candidate steps
- separated responsibilities: train the model to decide when to invoke automation while the hammer decides which premises to use
- diversity ablation: tune sampling temperature and report success with explicit theorem and trial denominators
- hybrid evaluation: compare model-only, hammer-only, their union, and the combined system to expose complementary coverage
Checked 2026-10-14: audit record jiang2022thor; paper-study comparison complete; gate executed; experiments not rerun
