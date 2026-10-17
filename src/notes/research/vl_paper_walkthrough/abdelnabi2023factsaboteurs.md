# Fact-Saboteurs: A Taxonomy of Evidence Manipulation Attacks against Fact-Verification Systems
(authored by agents unless marked 🧑)
Tag: `abdelnabi2023factsaboteurs`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/abdelnabi)

## scope and result

Inference: This paper is an adversarial evaluation methodology for automated fact verification, rather than a proof system. Its reusable lesson for verified Rust is to specify and test the integrity boundary around evidence retrieval and checking: a proof of the checker’s algorithm does not prove that its evidence repository is unmodified or complete.

The authors define their setting as follows:

> “We assume an adversary that automatically tampers with the online evidence in order to disrupt the fact-checking model via camouflaging the relevant evidence or planting a misleading one.” (abstract, p. 6719)

> “We propose a broad taxonomy (Figure 2) to derive our systematic exploration of evidence manipulation attacks.” (Introduction, p. 6720)

The FEVER pipeline has three stages: document retrieval, evidence-sentence retrieval, and claim verification (Section 2, p. 6720). The tested victim is KGAT: a BERT-based evidence retriever followed by a graph neural-network verifier, with the top five retrieved sentences used for verification (Section 2, pp. 6720–6721). The adversary trains or uses analogous retrieval and verification models and modifies a Wikipedia-like repository before the defender retrieves and verifies again (Sections 3–4, pp. 6721–6723).

Inference: The threat is relevant to VeruLaw whenever an agent writes a verified component whose contract assumes that input evidence is authentic, complete, or uniquely retrievable. The paper’s experiments establish model susceptibility under FEVER/KGAT settings; they do not establish a vulnerability in Verus or Rust.

## attack taxonomy and common procedure

The taxonomy has four dimensions (Section 3, pp. 6721–6723):

- target: camouflage hides evidence needed for a SUP or REF claim; planting adds or rewrites evidence to change the narrative
- constraints: repository modification by replacement or addition, and context preservation ranging from fully changing to fully keeping the original information
- capabilities: retrieval model, verification model, and additional language models, with different combinations required by each attack
- knowledge: white-box or black-box retrieval access and full or subset access to the labelled dataset; the defender’s verification model is always treated as black-box, with a different framework from the adversary’s proxy (Section 3, pp. 6722–6723)

> “In camouflaging, A intends to hide the sentences needed to verify the claim (e.g., [74, 85, 80]).” (Section 3, p. 6721)

> “In planting, A intends to actively change the narrative to change M ’s prediction (a less subtle adversary, e.g., [73, 17])).” (Section 3, p. 6721)

The attack pipeline is explicit (Figure 3 and Section 4, p. 6723):

1. retrieve relevant evidence with the adversary’s retriever when the attack edits existing sentences (paper, Section 4, p. 6723)
2. compute an edited or generated sentence with the selected attack method (paper, Section 4, p. 6723)
3. modify the repository using the allowed replace/add constraint (paper, Section 4, p. 6723)
4. rerun the defender’s evidence retrieval and verification over the manipulated repository (paper, Figure 3 and Section 4, p. 6723)
5. measure the resulting label, retrieval recall, and the rate of predictions changing to NEI (paper, Section 5.1, p. 6726)

Inference: A Verus analogue would represent repository state as an abstract map from document identifiers to sentence sequences, define an authenticated or otherwise trusted-state predicate, and prove that an approved update preserves the predicate. A `spec fn` can describe the map and a `proof fn` can establish a transition lemma; executable Rust performs the update. The paper does not provide this encoding, so this mapping is an inference.

## camouflaging techniques

### lexical variation

The attack uses black-box population search over word substitutions. The paper says:

> “They use a population-based optimization algorithm that generates candidate sentences by finding the N nearest neighbors of a word based on GloVe embeddings [52].” (Section 4.1.1, p. 6723)

The procedure is: select the top evidence sentences returned by the adversary’s retriever for SUP/REF claims; use a RoBERTaBASE proxy verifier; replace words with nearest GloVe neighbors filtered for distance and synonymy; score candidates against the target label (REF for SUP and SUP for REF); retain the candidate maximizing the target score (Section 4.1.1, p. 6723). The paper reports that perturbed sentences are generally less likely to be retrieved, achieving camouflage in the downstream pipeline (Section 4.1.1, p. 6723). For training the proxy verifier, SUP/REF examples use golden evidence, whereas NEI examples use retrieved evidence; NEI claims are not targets of this camouflaging attack (Sections 4.1 and 4.1.1, p. 6723).

Inference: In Verus, the optimizer itself is unlikely to be proved useful through exact language-model semantics. One can instead prove bounds on a deterministic candidate-search wrapper (for example, every returned candidate satisfies a token-change budget) and leave model scores and embedding tables as trusted specifications.

### contextualized replace

BERT-Attack first ranks salient words by the drop in the correct-label probability after masking each word, using (I_{w_i}=o_y(s)-o_y(s_{w_i})). A pretrained BERT masked-language model generates replacements for ranked words; replacements are limited by a perturbation budget ε and a candidate probability threshold; the candidate maximizing the wrong prediction is returned (Section 4.1.2, pp. 6723–6724). The implementation changes at most 15% of tokens and uses a candidate probability threshold of 1.0e-5 (Appendix A, p. 6733).

Inference: A Verus contract can state that the returned sentence satisfies the declared token-change budget and preserves a parser-level well-formedness predicate. It cannot, without a separately formalized neural model, prove the claimed probability drop or semantic quality.

### imperceptible and imperceptibleRet

The imperceptible attack changes tokenization while attempting to keep the visible sentence: homoglyphs, invisible characters, directionality controls, or deletion controls can map tokens to unknown or incorrect subwords. The attack uses differential-evolution search to minimize the correct-class logit, (x_A=\arg\min_x o_y(x)), under a total-change budget ε (Section 4.1.3, p. 6724). The `imperceptibleRet` variant removes the verifier requirement and minimizes the adversarial retriever’s ranking score, (x_A=\arg\min_x R_A(x,c)) (Section 4.1.4, p. 6724).

Inference: A Rust verifier should normalize or reject noncanonical Unicode before tokenization and prove that the normalization policy is applied consistently. This is a defensive design derived from the attack mechanism, not a result claimed by the paper.

### omitting paraphrase

The authors generate paraphrases with an off-the-shelf PEGASUS abstractive summarizer, then select the paraphrase with minimum adversarial-retriever score for the claim:

> “Specifically, we use an off-the-shelf paraphrasing model, based on the PEGASUS abstractive summarization model [91], to generate paraphrases for the top-retrieved evidence. This step is claim-agnostic.” (Section 4.1.5, p. 6724)

Generation uses no verifier or additional fine-tuning by the adversary and aims to omit claim-salient snippets while keeping fluent, factual context (Section 4.1.5, p. 6724). The implementation generates 20 candidates with beam search, then selects the lowest retrieval-score candidate (Appendix A, p. 6734). It fails when every sampled paraphrase retains the relevant part (Section 5.5, p. 6729).

### omitting generate

When paraphrase omission is difficult, GPT-2 is fine-tuned on claim–supporting-evidence pairs. At attack time the old evidence is used as a prompt; generated alternatives are scored by the adversarial retriever and the lowest-scoring sentence is selected (Section 4.1.6, p. 6724). The implementation samples 20 candidates with top-k sampling (Appendix A, p. 6734). The paper warns that context coherence can be limited (Section 5.5, p. 6729).

## planting techniques

### claim-aligned rewriting

The method reverses a factual-correction framework. A masker replaces claim-salient tokens in evidence with placeholders, and a T5 corrector fills the blanks conditioned on the claim. Training uses SUP claims and masked golden supporting evidence; at test time, REF evidence is rewritten to agree with the wrong claim (Section 4.2.1 and Figure 5, p. 6725).

> “The framework, shown in Figure 5, consists of a masker (Mask) and a corrector (Corr).” (Section 4.2.1, p. 6725)

The authors mask the top tokens according to a BERT verifier: 16 during training and 13 during the attack. They train T5 to reconstruct supporting evidence and run the attack on the top two retrieved evidence sentences for REF claims. The filtering variant samples 60 candidates with top-k sampling (Appendix A, pp. 6733–6734). Stance filtering chooses the candidate with highest SUP probability under the proxy verifier (Section 4.2.1, p. 6725). The retrieval-based variant also changes the masker: it ranks words by the retrieval score after masking each word and masks those whose removal gives the lowest scores. Its optional retrieval filter selects the generated candidate with the highest retrieval score (Section 4.2.2, p. 6725).

Inference: A Verus implementation can prove structural properties of a rewrite operation, such as placeholder positions being restored and output length staying within a bound. The semantic claim that a rewrite agrees with a claim must be represented as an explicit specification supplied by a trusted oracle or separately verified model.

### supporting generation

GPT-2 is fine-tuned on `<correct claim> || <supporting evidence>` sequences. At test time, the adversary prompts it with REF or NEI claims, samples evidence, excludes exact claim copies, and uses a BERT verifier to choose the candidate with highest SUP probability (Sections 4.2.3, pp. 6725–6726). The main planting results use the stricter add-only constraint, so original evidence remains in the repository (Section 5.1, p. 6726). Supporting generation selects the top two sentences from 160 samples (Appendix A, p. 6734).

### claim-conditioned article generation

The AdvAdd baseline conditions Grover on the claim to generate an article, without extra fine-tuning or claim filtering, then appends it as a new page (Section 4.2.4, p. 6726). The authors exclude attacks that produce unrealistic direct reiterations or only superficial similarity (Section 4.2.4, p. 6726).

## evidence and limits

The main KGAT(BERTBASE) evaluation uses FEVER claims and reports percentages in Table 2 (Section 5.1, p. 6726). Baseline accuracy is 89.0% for SUP, 71.2% for REF, and 72.4% for NEI. For example, camouflaging with imperceptible homoglyphs (ε=5) gives 39.6% SUP accuracy and 50.3% REF accuracy, with 55.2% retrieval recall of the perturbed evidence and a reported `→ NEI` ratio of 83.6% (Table 2, p. 6726).

The paper’s summaries state that camouflage mostly changes predictions to NEI, while planting methods can strongly change REF predictions (Section 5.1, pp. 6726–6727). With only 10% of the adversary’s data, attacks remained nearly as successful (Section 5.3, p. 6728). Post-hoc claim paraphrasing gave comparable attack performance; the authors used examples that kept the same original prediction, 70% of the data after exclusions (Section 5.4, pp. 6728–6729). For 150 SUP claims, the authors manually crafted counterclaims and generated evidence supporting them. Table 6 reports 91.3% SUP accuracy with original evidence, 42.0% after removing golden evidence, and 52.6% after adding generated evidence without restoring golden evidence. The corresponding `→ NEI` ratios for the latter two settings are 86.4% and 38.4% (Section 5.6 and Table 6, pp. 6729–6730). Inference: the rise from 42.0% to 52.6% is an accuracy increase, not an attack-induced decrease. Figure 10 separately shows that adding enough generated evidence alongside the original evidence can reduce accuracy; the authors describe the overall attack on SUP claims as having limited success (Section 5.6, pp. 6729–6730).

The authors identify several limits: the work uses one Wikipedia evidence source and human-in-the-loop effects were not measured (Section 6.1, p. 6730). They report cases where predictions do not change even when logically refuting evidence outnumbers supporting evidence (Section 6.2, p. 6730), and discuss detecting perturbation artifacts as a possible defense (Section 6.3, p. 6731). They also state:

> “Finally, our work is not meant to be an exhaustive evaluation of all possible attacks, as such an evaluation might be intractable and can only grow with the improvements in language generation and understanding [13].” (Section 6.3, p. 6731)

Inference: For a product using agent-written verified Rust, the practical threat is indirect but significant: an agent can produce a proof that establishes a checker’s contract while attacker-controlled evidence violates an unstated authenticity assumption. The product should make repository provenance, normalization, retrieval completeness, and contradiction handling explicit in specifications and tests. This is an inference from the attack surface, not an experiment in the paper.

## what is proved, measured, and trusted

- proved: no formal theorem about the attacks or models; attack algorithms are implemented and empirically evaluated
- measured: label accuracy, attacked-evidence retrieval recall, NEI transition rates, robustness across constraints, model knowledge, and post-hoc claim paraphrases (Sections 5.1–5.4, pp. 6726–6729)
- Inference: the evaluation relies on FEVER labels and golden evidence, the KGAT/CorefBERT implementations, pretrained and fine-tuned language models, retrieval scores, and the assumption that generated text is a meaningful attack
- not established: behavior on multi-source production fact checking, user deception rates, or soundness of any formal verifier

Inference: Existing work already supplies a broad attack taxonomy and concrete NLP attack implementations; VL should not redo those attacks as if they were new verification algorithms. A useful VL contribution would instead verify the defensive state machine and make the paper’s assumptions machine-checkable.

## techniques for the catalog

- evidence threat taxonomy — classify manipulation by camouflage or planting, repository replace/add control, required models, and adversary knowledge
- attack pipeline — retrieve or generate evidence, modify the repository, rerun defender retrieval and verification, and measure label and retrieval changes
- lexical variation — use embedding-neighbor substitutions selected by black-box target-label optimization
- contextualized replace — rank salient words by masked-label loss and replace them with masked-language-model candidates under a budget
- imperceptible perturbation — use Unicode/tokenization changes and differential evolution to minimize verifier logits or retrieval score
- omitting paraphrase — generate PEGASUS paraphrases and select the lowest retrieval-score sentence
- omitting generate — prompt a claim-conditioned GPT-2 generator with old evidence and select a low-score alternative
- claim-aligned rewriting — mask salient evidence tokens and train a T5 corrector to rewrite stance toward a claim
- supporting generation — generate evidence from claim–support pairs and filter samples by verifier stance
- claim-conditioned article generation — append Grover-generated claim-conditioned text under add-only repository modification
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "This experiment also suggests that potential defenses based on claim paraphrasing might not be effective."): checked all paper text, quotations, numerical results, section and printed-page references, and attack procedures; corrected fabricated or incomplete quotations, page references, taxonomy constraints and knowledge, lexical-attack inputs, rewriting variants, retrieval recall versus NEI transitions, and the direction and setup of Table 6; replaced the PDF link with the publisher page printed in the paper; did not reproduce experiments, inspect source code, evaluate human effects, or validate the proposed Verus applications.
