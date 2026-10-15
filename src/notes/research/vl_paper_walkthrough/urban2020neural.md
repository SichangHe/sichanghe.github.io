# First Neural Conjecturing Datasets and Experiments
(authored by agents unless marked 🧑)
Tag: `urban2020neural`, [paper](https://arxiv.org/abs/2005.14664)

## scope and contribution
Urban and Jakubův build datasets from the Mizar Mathematical Library and test GPT-2 for conjecture generation, premise completion, and ATP proving. The abstract states: “We describe several datasets and first experiments with creating conjectures by neural methods.” (Abstract, p. 1). Inference: their pipeline is useful for a verification agent because it separates syntactic generation, type checking, countermodel checking, and proof search.

Inference: the paper does not verify Rust or prove that generated conjectures are true. It supplies a candidate-generation and semantic-filtering workflow that could propose lemmas for Verus and then submit them to Verus as proof obligations.

## technique 1: construct multiple formal-corpus training views

What it is. The authors prepare four views of Mizar, each retaining different context and proof information:

1. Concatenate all Mizar articles (MML version 1147), after stripping comments, giving 78 MB uncompressed
2. Use text from the HTML export, 156 MB, which repeats full variable types, theorem names, and each natural-deduction thesis
3. Use tokenized TPTP proofs for 28,271 Mizar theorems translated by MPTP and proved by E with ENIGMA guidance, 658 MB
4. Use only the Mizar premises selected in those proofs, in prefix notation and E's selection order, 53 MB

The paper lists these four datasets in §2, p. 2 and says the fourth is a shorter summary of an E proof. Its exact description is: “These files always start with the conjecture, and the premises are printed in the order in which E used them in its proof.” (§2, p. 2).

When to use it. Use textual views to generate Mizar-like statements and proof views to learn premise order or premise selection. The authors specifically changed from dataset 3 to dataset 4 because punctuation created redundancy: “The large number of redundant tokens such as brackets and commas led us to produce the fourth dataset that uses the punctuation-free prefix notation and much shorter summary of the E proof (just the premises in their order).” (§3, p. 3).

How to do it. Export the source corpus; strip comments for the article view; export semantic HTML text; translate selected theorems to TPTP with MPTP; run E with ENIGMA to obtain proofs; serialize theorem premises in prefix notation and preserve selection order. The paper gives the ZMODUL01:103 theorem in all four representations (§2, pp. 2–3), including Mizar source, HTML-style text, TPTP, and prefix notation.

Verus form. Inference: make separate training corpora from Verus specifications, proof functions, contracts, and accepted proof traces. Keep executable Rust separate from erased proof code. A source view can train statement or contract completion; a proof-obligation view can train lemma and assertion selection. Mizar's TPTP and prefix formats do not carry directly to Verus's Rust syntax, ownership facts, or solver context, so a Verus exporter would need to preserve types, module visibility, and mutable-state information.

Evidence and limits. The four datasets are engineering artifacts; the paper reports sizes but no generalization guarantee. Inference: dataset format can change what a model learns. A premise-only corpus may hide the code state or the theorem body needed for a Verus proof, while a full source corpus may waste tokens on punctuation and repeated context.

## technique 2: train GPT-2 and sample unconditioned conjectures

What it is. For each dataset, train the 117-million-parameter GPT-2 model on a single NVIDIA GeForce GTX 1080 with 12 GB RAM, and generate random unconditioned samples during training. The paper says: “The basic experiment for each dataset consists of training the smallest (117M parameters) version of GPT-2 on a NVIDIA GeForce GTX 1080 GPU with 12GB RAM, producing random unconditioned samples during the training.” (§3, p. 3).

How to do it. Tokenize one dataset; train GPT-2 for weeks while periodically sampling; inspect generated Mizar text, proofs, or premise lists; publish checkpoints and samples. Training for datasets 1, 2, and 4 continued for several weeks, with performance still slowly improving (§3, p. 3). The paper shows generated theorem-like text, including a valid-looking strengthening and a generated proof (§3, pp. 3–4).

When to use it. Use unconditioned generation for broad theory exploration or to discover statements not tied to one input theorem. Use a proper Mizar environment afterward to guess context and add assumptions, because the authors write: “We imagine that a proper Mizar environment will have to be guessed, some assumptions may be automatically added, etc.” (§3, p. 3).

Verus form. Inference: prompt or sample a Verus `spec fn`, `lemma`, or contract skeleton, then compile it in a fixed module and ask Verus to check syntax, typing, and proof obligations. Generated text must be treated as a candidate. Verus proof functions are erased and cannot be used as runtime code; generated executable Rust still needs ordinary compilation and tests. Context guessing must include trait bounds, ownership, imports, and visible specifications.

Evidence and limits. Generated examples look plausible but can be false. The paper explicitly reports a false conjecture that every differentiable function is increasing (§3.2 and Appendix A.3, pp. 5, 9). Inference: language-model fluency is not evidence of a valid lemma; a checker or counterexample search is mandatory.

## technique 3: conditioned completion with beam search and temperature

What it is. The authors condition GPT-2 on partial theorems or formulas and ask it to complete them. In the first experiment, a model trained on dataset 4 completes 369 CARD-series theorems, producing 10 premise selections per theorem with beam search. In the second, a dataset-2 model completes 462 partial formulas from CARD articles. These counts and settings are reported in §3.1, p. 4.

How to do it. Provide the theorem prefix; decode multiple candidates with beam search; vary temperature and beam parameters; type-check or parse each completion; classify candidates as existing lemmas, new well-typed lemmas, or malformed output. At low temperatures, “practically all conjectured premises are known Mizar theorems”; at higher temperatures GPT-2 produces premises not in Mizar but still well typed; still higher temperatures produce “non-well-typed or even unparsable lemmas.” (§3.1, p. 4).

When to use it. Use low temperature for premise retrieval and high temperature for novel lemma generation. Keep outputs in separate buckets because novelty trades off against typing and parseability.

Verus form. Inference: condition a decoder on a Verus goal and module context, generate several `assert`, lemma-call, or `invariant` candidates, and run Verus on each. Use temperature as a search-diversity control, but preserve only candidates that parse and verify under the same source snapshot. A Verus loop invariant is a declaration on a loop, not a callable function; generated candidates must obey that syntax.

Evidence and limits. The paper gives examples of formula completions, such as `( M = N iff M,N are_equipotent )` and a completion using `ORDINAL3:8` (§3.1, p. 5), but does not report a success denominator for the 462 formulas. Inference: completion quality cannot be compared quantitatively from these examples alone.

## technique 4: semantic ATP evaluation of generated premises and conjectures

What it is. The authors evaluate generated premise lists by converting them to TPTP ATP problems and running E. They train on 28,271 ENIGMA proofs, generate 12 GPT-2 premise predictions for 31,792 theorems (6,639 outside training), yielding 381,432 predictions and 193,320 unique predictions (§3.2, p. 5). Of those, 108,564 problems contained no new conjecture and therefore behaved as premise selection.

How to do it. Generate 12 beam-search predictions per theorem; deduplicate; convert prefix notation back to TPTP; separate existing Mizar premises from new formulas; run E in auto-schedule mode with a six-second limit; record countersatisfiability, proof, and theorem counts. E quickly showed 86,899 problems countersatisfiable; 11,866 were proved within six seconds, producing proofs of 8,105 theorems (§3.2, p. 5). The denominator for each number is the 193,320 unique ATP problems unless the sentence states otherwise.

The paper warns that 4,350 proofs used only one premise, often because GPT-2 proposed the theorem itself (§3.2, p. 5). It then focuses on 44,524 problems using at least one new premise: E found 34,675 countersatisfiable in one second and proved 1,515 (§3.2, p. 6). Across this experiment GPT-2 produced 52,515 syntactically correct new formulas, deduplicating to 33,100, and standard premise selection plus ENIGMA yielded 9,000–10,000 proofs depending on configuration (§3.2, p. 6).

When to use it. Use a fast countermodel or satisfiability pass to discard impossible candidates, then use ATP or Verus for proof search. Remove the target theorem from available premises and enforce chronology, otherwise the evaluation leaks the answer. The authors did not strictly enforce chronology, so their 8,105-proof figure is not a clean measure of novel theorem proving (§3.2, p. 6).

Verus form. Inference: map each generated Verus lemma to a temporary proof obligation and run Verus with a fixed timeout. To avoid premise leakage, hide the target lemma and any later declarations from the generated context. Record parse failures, verification failures, counterexamples where available, and proofs separately. Verus's SMT-backed checking is narrower than E's first-order ATP search, so a generated formula may require explicit ghost state, `requires`, `ensures`, `assert`, and helper `proof fn`s.

Evidence and limits. The paper supplies denominators and time limits for the E runs, but its “9,000-10,000” result varies with premise-selection and E settings (§3.2, p. 6). The generated conjectures include a valid generalization of a finite-group theorem, but also false or unproved statements such as the differentiability conjecture and a functor claim (§3.2, pp. 6, 9). Inference: semantic filtering establishes only the checked theorem under the checked axioms; it does not establish that the conjecture expresses the intended engineering property.

## what is proved, measured, and trusted

The paper measures corpus sizes, model size and hardware, generated-candidate counts, E countersatisfiability, and proof counts under stated time limits. It proves no theorem about GPT-2's reliability. Trusted components include Mizar's existing formalization, MPTP translation, E and ENIGMA, GPT-2 tokenization and decoding, and the conversion from generated text back to TPTP. Inference: for VL, the analogous trusted boundary includes the Verus front end, SMT solver, erased executable output, Rust compiler, and every external-library specification. A generated lemma is useful only after Verus checks it in the actual module.

What VL should not redo. Existing work already demonstrates corpus-view design, beam-search completion, and checker-in-the-loop semantic evaluation. VL should reuse these patterns and measure them on Verus obligations rather than repeat a claim that language-model samples look plausible. Inference: the unsolved product question is whether generated Verus lemmas reduce proof effort without weakening specifications or leaking the target theorem.

Inference: threat to agent-written verified Rust is medium for proof search and high for specification intent. The paper shows that GPT-2 can generate syntactically correct and sometimes useful formulas, but also false conjectures and evaluation leakage. A product that accepts only independently checked Verus proofs limits proof-search risk; it still needs review of contracts and assumptions.

## techniques for the catalog
- corpus views — build source, semantic-export, proof, and premise-order datasets so models can learn both statements and proof context
- unconditioned conjecturing — train a transformer and sample broad candidate lemmas, then type-check and prove or refute them
- conditioned completion — use beam search and temperature to trade known premise retrieval against novel, well-typed lemma generation
- semantic filtering — convert candidates to checker obligations, run bounded ATP or Verus, and report denominators, leakage controls, and proof outcomes
Checked 2026-10-15 against paper urban2020neural: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
