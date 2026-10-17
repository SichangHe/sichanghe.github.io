# DeepMath - Deep Sequence Models for Premise Selection
(authored by agents unless marked 🧑)
Tag: `alemi2016deepmath`, [paper](https://arxiv.org/abs/1606.04442)

## problem and pipeline

DeepMath ranks library facts for an automated theorem prover. Given premises P, an ATP A and conjecture C, it predicts a small subset likely to produce a proof. The paper defines the task as: “Given a large set of premises P, an ATP system A with given resource limits, and a new conjecture C, predict those premises from P that will most likely lead to an automatically constructed proof of C by A.” (section 3, page 2). It uses Mizar translated to first-order logic by MPTP and E prover 1.9.

The full subset problem is reduced to pairwise relevance: embed a conjecture and one axiom separately, concatenate the vectors, and classify whether the axiom is useful. The authors state: “We simplify from subset selection to pairwise relevance by predicting the probability that a given axiom is useful for proving a given conjecture.” (section 5, page 4). At inference, score all chronologically preceding statements, sort by score, and pass the top k to E.

Inference: for Verus, the candidate set can be existing lemmas, quantified facts, or trusted API contracts; the conjecture is a current verification obligation. A ranker may choose facts to expose to the SMT solver, but Verus's checker remains the acceptance oracle. Pairwise scores do not prove that the selected set is jointly sufficient.

## technique: two-stage character and word embeddings

Use this when formulas are long, symbols are rare, and manually engineered features do not scale.

1. stage 1 encodes each formula as an 80-dimensional one-hot character sequence. Train separate axiom and conjecture encoders (LSTM, GRU, CNN, or recurrent-CNN), concatenate their fixed-length embeddings, and feed them to a classifier with two fully connected layers (one hidden layer of size 1024) and logistic loss, trained jointly with the two encoders (sections 5, 5.1 and 6.3, pages 4 and 6).
2. cache axiom and conjecture embeddings so each candidate pair reuses the shared computation (section 5.1, page 4).
3. stage 2 tokenizes formulas with a trivial lexer. For each defined symbol, use the stage-1 embedding of its defining statement as the token vector; map brackets/operators to fixed pseudo-random vectors. Run the same sequence architectures over word tokens (section 5.2, page 5).
4. optionally iterate stages; the paper reports no measurable gain from repeating the stronger embeddings beyond the two stages (section 5.2, page 5).

The semantic reason for definition embeddings is explicit: “A method of semantic-aware “definition”-embeddings for function symbols that improves the generalization of formulas with symbols occurring infrequently.” (section 1, contributions list, page 2). A fully recursive expansion was rejected because definition chains can be deep and expensive (section 5.2, page 5).

Inference: a Verus ranker can embed a goal and candidate lemma signatures, then use a lemma's defining specification as its semantic token. Rust macro expansion and trait resolution make a trivial lexer inadequate; use parsed syntax or normalized verifier terms. This adaptation is an inference.

## technique: hard-negative mining

Use this when true premises are sparse and ranking quality at small cutoffs matters. During training, continuously score many conjecture/axiom pairs; for each conjecture select low-scoring statements that still outrank its lowest-scoring true positive; maintain a queue of these mined negatives and mix about 25% mined with randomly sampled premises (section 6.4, page 6).

The paper reports a concrete ablation: at top-16, hard-negative mining doubled the number of proved test theorems. Across the union of all cutoffs, successful proofs rose from 61.3% to 66.4% for the best neural model (section 6.4, page 6). The paper words it as “For the union of proof attempts over all cutoff thresholds” and states neither a denominator nor a raw count for these percentages. Inference: 66.4% equals the def-CNN k=1024 entry in Table 1 (1822), so the test set is probably the same one.

Inference: mine near-miss Verus facts that the solver frequently considers but cannot use, while retaining genuinely irrelevant facts as random negatives. A failed verification is not itself a semantic label: classify negatives by whether adding the fact changes a checked proof search outcome. This protocol is a proposed transfer, not evaluated by DeepMath.

## technique: rank-and-check with resource cutoffs

Use this to turn a relevance model into a bounded proof attempt. The paper uses the 32,524 of 57,917 Mizar theorems with known ATP proofs for training and evaluation (section 6.1, page 5; section 3, page 3), then evaluates each ranked list at k = 16, 32, 64, 128, 256, 512 and 1024. Invoke E with auto strategy, 90-second soft limit, 120-second hard limit, 4 GB memory and 500,000 processed clauses (section 6.5, page 7). Table 1 counts theorems “proved with a cutoff value at most the k in the leftmost column”; E is run on the top-k premises for increasing k “until a proof is found or k = 1024 fails.”

The split is 3,124 held-out statements (10%); 400 are used for monitoring/checkpoint selection and 2,724 for final evaluation (section 6.1, page 5). Table 1 is internally inconsistent: its caption says “a test set of 2,742 theorems,” while section 6.1 says 2,724 and the printed percentages fit 2,742, not 2,724. This is an inconsistency in the paper that must not be silently resolved. For example, the def+char-CNN row at k=1024 reports 1,862 (67.9%), and 1,862/2,742 = 67.9% while 1,862/2,724 = 68.4%; likewise 2,218 (80.9%) and 2,151 (78.4%) fit 2,742. Inference: the printed percentages therefore use 2,742, and one of the two numbers is probably a typo.

With the table's 2,742 denominator, the union of def-CNN and char-CNN proves 69.8%, def-CNN plus k-NN 74.25%, all methods 2,218 (80.9%), and neural models alone 2,151 (78.4%) (table 1, page 7). The paper also reports 823 additional theorems among statements not previously proved automatically (section 6.5, page 7), but gives no denominator for that subset.

Inference: a Verus product should use identical bounded loops: rank candidates, expose top-k facts, run Verus, and retain the first passing proof. Record timeout and solver resource settings with every result; changing them changes what “proved” means.

## technique: aMRR diagnostic

Use average maximum relative rank (aMRR) when full ATP replay is too expensive. For each conjecture, rank every true dependency among available premises and take the maximum relative rank; average over conjectures. The paper approximates this on 400 holdout conjectures using all true dependencies and 128 fixed random false dependencies (section 6.2, page 5). Lower is better; the best possible value in this sampled setting is 0.051. Reported sustained values are char-CNN 0.0585, word-CNN 0.0600, def-CNN-LSTM 0.0605 and def-CNN 0.0575 (panel (d) of the four-panel results figure, page 8; the figure number is not printed in the extracted text, and Figure 4 is the embedder specification).

Inference: for Verus, aMRR can diagnose whether a failed proof's needed lemmas were ranked low, without claiming that ranking alone proves anything. The sampled-negative denominator and 400-conjecture holdout must accompany the metric.

## what was measured and what remains trusted

The Mizar corpus contains 57,917 proved theorems in 1,147 articles, plus 88,783 other formulas; 32,524 theorems (56.2%) had prior ATP proofs and supplied training labels (section 3, page 3). The models are shallow and the authors conclude they cannot capture high-level mathematical properties (section 7, page 8). Inference: the ATP, premise translation, solver limits, training/test split, and theorem statements remain trusted or externally supplied; neural scores are heuristics.

Inference: threat to agent-written verified Rust is moderate and localized. Premise selection can reduce solver context and proof-search latency, especially for large libraries, but it cannot repair missing specifications, invent a correct invariant, or validate unsafe/external behavior. Existing VL work should not redo pairwise ranking and hard-negative mining as if they were new; the open work is a Verus-specific corpus, jointly sufficient fact selection, and sound integration with solver diagnostics.

## techniques for the catalog

- pairwise premise relevance — score each conjecture/fact pair and rank facts before ATP or verifier search
- definition-aware embeddings — represent rare symbols by embeddings of their defining formulas
- hard-negative mining — train on low-scoring near-miss premises to improve small-cutoff retrieval
- bounded rank-and-check — try increasing top-k premise sets under recorded prover resource limits
- aMRR evaluation — measure the worst true-dependency rank with an explicit sampled-negative denominator
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Negative mining was crucial for good quality: at the top-16 cutoff, the number of proved theorems on the test set has doubled."): read the whole paper text and checked every quotation, number, section and page reference and technique step against it, and recomputed the Table 1 percentages against 2,742 and 2,724; changed the page numbers for caching and stage 1 (page 4), the section 3 corpus counts (page 3) and the aMRR table (page 8), the definition-embedding quote (now complete), the false claim that the table counts match 2,724 (they fit 2,742), the classifier description, the unsupported denominator remark for 61.3%/66.4%, and marked one unlabelled conclusion as Inference; did not check the cited references, the figure images or the 69.8% and 74.25% union figures (the paper gives no counts), and the tag link was kept as the arXiv page given in the paper header (arXiv:1606.04442).
