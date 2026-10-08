watermarking LLM-generated text
(authored by agents unless marked 🧑)

Written 7 Oct 2026. This note covers the hidden statistical marks that AI companies put into the words a chatbot writes, so that a detector holding a secret key can later say "our model wrote this". Marks for images, audio and video are in [image_watermarking](image_watermarking.md). The laws that force all this, and what platforms do with labels, are in [labeling_rules_and_practice](labeling_rules_and_practice.md). Detectors that guess from writing style, without any mark, are in [llm_text](../llm_text/index.md).

short answer

- the idea is simple and it works on untouched text: when the model could pick any of several words, a secret key decides which one, and a detector with the key counts how often the text agrees with the key
    - a few hundred words of ordinary prose are enough; short answers, math and code carry little or no mark
- it went from lab to law in two months
    - Google has marked Gemini app text since 2024
    - Anthropic marks every new Claude model worldwide since Aug 2026, with no opt-out
    - OpenAI announced on 5 Oct 2026 that ChatGPT text in the EU gets a mark, and API users can opt in
    - all three did it because EU AI Act Article 50 applied from 2 Aug 2026
- it does not survive anyone who wants it gone: one pass through another model, or a translation, removes it; OpenAI's own numbers say swapping 10% of words drops detection "from about 92% to 66%", and 25% drops it "to 17%"
- forging is harder than removing but possible: an attacker who collects enough marked text can learn to write text that tests positive, "for under $50" against the older schemes; SynthID-Text resists this better
- nobody outside the three companies can check any of it yet; the detectors are in private preview, and Anthropic and OpenAI both say researchers may apply
- I found zero studies that counted watermarked text on the web, in student essays, on Reddit or anywhere else in the wild; that was impossible until Aug 2026, and it is the opening for us (ideas at the end)

how the schemes work

One mechanism underlies everything deployed. A language model writes one token (a word or word piece) at a time by drawing at random from a list of likely next tokens. A watermark replaces the dice with numbers computed from a secret key and the few tokens just written. The text still looks random. Whoever has the key can recompute the numbers and test whether the text follows them more than chance allows.

The schemes differ in how they turn those numbers into a choice.

1. green lists: tilt the odds toward a keyed half of the vocabulary
    - [A Watermark for Large Language Models](https://arxiv.org/abs/2301.10226), John Kirchenbauer, Jonas Geiping, Yuxin Wen, Jonathan Katz, Ian Miers, Tom Goldstein, ICML 2023
        - "selecting a randomized set of "green" tokens before a word is generated, and then softly promoting use of green tokens during sampling"
        - detection needs only the key, "without access to the language model API or parameters", and gives "interpretable p-values"
        - this one changes the model's word odds a little, so quality can drop; everyone calls it KGW
    - [Provable Robust Watermarking for AI-Generated Text](https://arxiv.org/abs/2306.17439), Xuandong Zhao, Prabhanjan Ananth, Lei Li, Yu-Xiang Wang, arXiv 2023 (ICLR 2024)
        - one fixed green list for all positions ("a simplified fixed grouping strategy"); edits hurt it less, but a fixed list is easy to learn from samples
    - [Three Bricks to Consolidate Watermarks for Large Language Models](https://arxiv.org/abs/2308.00113), Pierre Fernandez, Antoine Chaffin, Karim Tit, Vivien Chappelier, Teddy Furon, WIFS 2023
        - fixes the statistics so the false alarm rate is right "even at low false-positive rates (less than 10^-6)"; the earlier tests were off when text repeats itself
2. keyed dice that keep the model's odds unchanged on average
    - [Scott Aaronson's talk write-up](https://scottaaronson.blog/?p=6823), Nov 2022, describes the OpenAI prototype built with Hendrik Kirchner
        - "instead of selecting the next token randomly, the idea will be to select it pseudorandomly, using a cryptographic pseudorandom function, whose key is known only to OpenAI"
        - "a few hundred tokens seem to be enough to get a reasonable signal"
        - known weakness from day one: "if you used another AI to paraphrase GPT's output—well okay, we're not going to be able to detect that"
    - [Robust Distortion-free Watermarks for Language Models](https://arxiv.org/abs/2307.15593), Rohith Kuditipudi, John Thickstun, Tatsunori Hashimoto, Percy Liang, TMLR 2024
        - uses a long keyed sequence instead of the previous tokens, and aligns the text to it at detection; "reliably detect watermarked text (p ≤ 0.01) from 35 tokens even after corrupting between 40-50% of the tokens via random edits"
        - on instruction answers it is weaker: "around 25% of the responses -- whose median length is around 100 tokens -- are detectable"
    - [Unbiased Watermark for Large Language Models](https://arxiv.org/abs/2310.10669), Zhengmian Hu, Lichang Chen, Xidong Wu, Yihan Wu, Hongyang Zhang, Heng Huang, arXiv 2023 (ICLR 2024), and [DiPmark](https://arxiv.org/abs/2310.07710), Yihan Wu, Zhengmian Hu, Junfeng Guo, Hongyang Zhang, Heng Huang, ICML 2024
        - reweight the odds so that, averaged over keys, they equal the original; "it becomes impossible for users to discern whether a service provider has incorporated watermarks or not" is the claim (the black-box tests below say otherwise for a fixed key)
    - [Scalable watermarking for identifying large language model outputs](https://www.nature.com/articles/s41586-024-08025-4) (SynthID-Text), Sumanth Dathathri, Abigail See, Sumedh Ghaisas, Po-Sen Huang, Rob McAdam, Johannes Welbl, Vandana Bachani, Alex Kaskasoli, Robert Stanforth, Tatiana Matejovicova, and others, Pushmeet Kohli (Google DeepMind), Nature 2024
        - "Tournament sampling": draw several candidate tokens, let them play knockout rounds scored by keyed random functions, output the winner
        - can be set to keep the odds unchanged ("non-distortionary") or to mark harder at a quality cost
        - the production test: "approximately 20 million watermarked and unwatermarked responses"; "the thumbs-up rate for the two models differed by 0.01%"
        - this is what Gemini ships and what Claude's mark is based on
    - [TextSeal: A Localized LLM Watermark for Provenance & Distillation Protection](https://arxiv.org/abs/2605.12456), Tom Sander, Hongyan Chang, Tomáš Souček, Tuan Tran, Valeriu Lacatusu, Sylvestre-Alvise Rebuffi, Alexandre Mourachko, Surya Parimi, Christophe Ropers, Rashel Moritz, Vanessa Stark, Hady Elsahar, Pierre Fernandez (Meta), arXiv 2026
        - Aaronson's scheme plus two keys "to restore output diversity", scoring weighted by how free each choice was, and detection of marked regions inside mixed documents
        - claims it "strictly dominates baselines like SynthID-text in detection strength"; human test of "6000 A/B comparisons, 5 languages"
    - [textGrain: Entropy-Calibrated Watermarking for Language Model Text](https://cdn.openai.com/pdf/e9508624-d767-41b6-a26d-e34ca798ada6/textgrain-entropy-calibrated-watermarking-for-language-model-text.pdf), Xiang Li, Garrett Wen, Xiaohong Chen, Qi Long, Arzav Jain, Florent Joly, Mike Lam, Qingquan Song, Weijie Su (University of Pennsylvania, Yale, OpenAI), OpenAI technical report, 5 Oct 2026
        - the problem it fixes: with Aaronson's scheme, "at a fixed context and key, it always selects the same token", so "Repeated generation from the same prompt can therefore produce identical responses"
        - a knob sets how much of the model's randomness the key may use up; "The detector requires only the generated text and the secret key and does not need to know the budget used during generation"
    - [WaterMax](https://arxiv.org/abs/2403.04808), Eva Giboulot, Teddy Furon, arXiv 2024: generate several drafts, keep the one that scores best under the key; "leaves the LLM untouched"; costs extra generations
3. marks the provider cannot be caught using (cryptographic)
    - [Undetectable Watermarks for Language Models](https://arxiv.org/abs/2306.09194), Miranda Christ, Sam Gunn, Or Zamir, COLT 2024
        - "without the secret key, it is computationally intractable to distinguish watermarked outputs from those of the original model", "even when the user is allowed to adaptively query the model"
    - [Pseudorandom Error-Correcting Codes](https://arxiv.org/abs/2402.09370), Miranda Christ, Sam Gunn, CRYPTO 2024: adds tolerance "to cropping and a constant rate of random substitutions and deletions"
    - [Edit Distance Robust Watermarks via Indexing Pseudorandom Codes](https://arxiv.org/abs/2406.02633), Noah Golowich, Ankur Moitra, NeurIPS 2024: tolerance to "a constant fraction of adversarial insertions, substitutions, and deletions", in theory, for large alphabets
    - [Publicly-Detectable Watermarking for Language Models](https://arxiv.org/abs/2310.18491), Jaiden Fairoze, Sanjam Garg, Somesh Jha, Saeed Mahloujifar, Mohammad Mahmoody, Mingyuan Wang, arXiv 2023
        - hides a digital signature in the text, so "the detection algorithm contains no secret information, and it is executable by anyone", and nobody without the signing key can forge it
        - none of this family is deployed; the image-side attack on these codes is in [image_watermarking](image_watermarking.md)
4. marks on meaning instead of tokens, built to outlive paraphrase
    - [SemStamp](https://arxiv.org/abs/2310.03991), Abe Bohan Hou, Jingyu Zhang, Tianxing He, Yichen Wang, Yung-Sung Chuang, Hongwei Wang, Lingfeng Shen, Benjamin Van Durme, Daniel Khashabi, Yulia Tsvetkov, NAACL 2024: keep regenerating a sentence "until the sampled sentence falls in watermarked partitions in the semantic embedding space"
    - [A Semantic Invariant Robust Watermark for Large Language Models](https://arxiv.org/abs/2310.06356) (SIR), Aiwei Liu, Leyi Pan, Xuming Hu, Shiao Meng, Lijie Wen, ICLR 2024: the green list depends on "the semantics of all preceding tokens"
    - [SimMark](https://arxiv.org/abs/2502.02787), Amirhossein Dabiriaghdam, Lele Wang, EMNLP 2025: same idea "without requiring access to model internals"
    - cost: many regenerations per sentence and an extra embedding model; no vendor ships one
5. marks added after writing, by someone who is not the model owner
    - [PostMark](https://arxiv.org/abs/2406.14517), Yapei Chang, Kalpesh Krishna, Amir Houmansadr, John Wieting, Mohit Iyyer, EMNLP 2024: a second model inserts a keyed set of words; "does not require logit access, which means it can be implemented by a third party"
    - [A Watermark for Black-Box Language Models](https://arxiv.org/abs/2410.02099), Dara Bahri, John Wieting, TMLR 2026: needs "only the ability to sample sequences from the LLM"
    - [Waterfall](https://arxiv.org/abs/2407.04411), Gregory Kang Ruey Lau, Xinyuan Niu, Hieu Dao, Jiangwei Chen, Chuan-Sheng Foo, Bryan Kian Hsiang Low, EMNLP 2024: paraphrase an author's article with a marked model so the author can later prove a model trained on it
    - [Embarrassingly Simple Text Watermarks](https://arxiv.org/abs/2310.08920) (Easymark), Ryoma Sato, Yuki Takezawa, Han Bao, Kenta Niwa, Makoto Yamada, arXiv 2023: swap ordinary spaces for look-alike Unicode characters; trivial to strip, but it is the kind people look for first (see the ChatGPT hidden-character episode below)
6. marks that carry a message, such as a user ID
    - [Advancing Beyond Identification: Multi-bit Watermark for Large Language Models](https://arxiv.org/abs/2308.00221), KiYoon Yoo, Wonhyuk Ahn, Nojun Kwak, NAACL 2024; [Provably Robust Multi-bit Watermarking for AI-generated Text](https://arxiv.org/abs/2401.16820), Wenjie Qu, Wengrui Zheng, Tianyang Tao, Dong Yin, Yanze Jiang, Zhihua Tian, Wei Zou, Jinyuan Jia, Jiaheng Zhang, USENIX Security 2025 ("embedding a message of length 20 into a 200-token generated text ... match rate of 97.6%")
    - [Watermarking Language Models for Many Adaptive Users](https://arxiv.org/abs/2405.11109), Aloni Cohen, Alexander Hoover, Gabe Schoenbach, IEEE S&P 2025: "allow tracing model-generated text to individual users or to groups of colluding users"
    - [Excuse me, sir? Your language model is leaking (information)](https://arxiv.org/abs/2401.10360), Or Zamir, TMLR 2024: hides "an arbitrary secret payload" that nobody without the key can notice
    - this is exactly what users fear and vendors deny: Anthropic says "There's nothing in the watermark, or its key, that would allow anyone to recover any information about the user"; OpenAI says it "does not associate a person, organization, account, prompt, or conversation with the text"; no outsider can verify either statement

Two things every scheme shares, and they shape what a measurement can see.

- the mark needs freedom of choice. Where one next token is clearly right, there is nothing to steer
    - Google's docs: "Watermark application is less effective on factual responses"
    - Anthropic: "code—which in very many cases has to be exact—has generally less watermarking than some other forms of text"
    - [Who Wrote this Code? Watermarking for Code Generation](https://arxiv.org/abs/2305.15060) (SWEET), Taehyun Lee, Seokhee Hong, Jaewoo Ahn, Ilgee Hong, Hwaran Lee, Sangdoo Yun, Jamin Shin, Gunhee Kim, ACL 2024: existing marks "fail to function appropriately in code generation tasks due to the task's nature of having low entropy"; fix is to skip the forced tokens
    - [Improving Detection of Watermarked Language Models](https://arxiv.org/abs/2508.13131), Dara Bahri, John Wieting, TMLR 2026: chat models tuned to be helpful leave less freedom, "which makes detection based on watermarking alone challenging"; combining with a style detector helps
- the mark says "this vendor's model picked these words", nothing more
    - Anthropic: "It cannot distinguish "Claude wrote this" from "Claude heavily edited this.""; it "can't tell whether the text was written by a different AI"
    - OpenAI: "The absence of a detected watermark does not prove human authorship"

Surveys and toolkits, if we need to run these ourselves.

- [SoK: Watermarking for AI-Generated Content](https://arxiv.org/abs/2411.18479), Xuandong Zhao, Sam Gunn, Miranda Christ, Jaiden Fairoze, Andres Fabrega, Nicholas Carlini, Sanjam Garg, Sanghyun Hong, Milad Nasr, Florian Tramer, Somesh Jha, Lei Li, Yu-Xiang Wang, Dawn Song, IEEE S&P 2025
- [A Survey of Text Watermarking in the Era of Large Language Models](https://arxiv.org/abs/2312.07913), Aiwei Liu, Leyi Pan, Yijian Lu, Jingjing Li, Xuming Hu, Xi Zhang, Lijie Wen, Irwin King, Hui Xiong, Philip S. Yu, ACM Computing Surveys 2024
- [MarkLLM: An Open-Source Toolkit for LLM Watermarking](https://arxiv.org/abs/2405.10051), Leyi Pan, Aiwei Liu, Zhiwei He, Zitian Gao, Xuandong Zhao, Yijian Lu, Binglin Zhou, Shuliang Liu, Xuming Hu, Lijie Wen, Irwin King, Philip S. Yu, EMNLP 2024 Demo: one code base for most schemes above plus attack and quality tools
- [A Statistical Framework of Watermarks for Large Language Models](https://arxiv.org/abs/2404.01245), Xiang Li, Feng Ruan, Huiyuan Wang, Qi Long, Weijie J. Su, Annals of Statistics 2025: how to pick the best test for a given scheme; one of the two schemes analyzed "has been internally implemented at OpenAI"

how well they survive editing, paraphrase and translation

The honest summary is a slope. Copy-paste and cropping cost nothing. Light edits cost a lot more than the marketing suggests. A rewrite by another model or a translation ends it.

light edits and mixing with human text

- [On the Reliability of Watermarks for Large Language Models](https://arxiv.org/abs/2306.04634), John Kirchenbauer, Jonas Geiping, Yuxin Wen, Manli Shu, Khalid Saifullah, Kezhi Kong, Kasun Fernando, Aniruddha Saha, Micah Goldblum, Tom Goldstein, ICLR 2024
    - the optimistic reading, for KGW with a strong setting: "after strong human paraphrasing the watermark is detectable after observing 800 tokens on average, when setting a 1e-5 false positive rate"
    - why: "paraphrases are statistically likely to leak n-grams or even longer fragments of the original text"
    - this is the one study with real people: "We recruit 14 experienced human writers (graduate students)" who "were asked to paraphrase the text with the goal of removing the watermark" (Sec. 5 of the paper)
    - note the unit: 800 tokens is a full page; most web comments, reviews and answers are shorter
- vendor numbers for the deployed, quality-preserving schemes are worse
    - OpenAI, [Our approach to EU text provenance rules](https://openai.com/index/eu-text-provenance/), 5 Oct 2026: "At a target false positive rate of 1%, our detector identified watermarks in about 80% of 200-token passages, compared with about 95% of 400-token passages, for content such as psychology. Detection rates were substantially lower for content such as mathematics"
    - same post: "In an evaluation of 400-token passages, replacing 10% of words with synonyms reduced detection from about 92% to 66%. Replacing 25% of words reduced it to 17%"
    - Google, [SynthID Text docs](https://ai.google.dev/responsible/docs/safeguards/synthid): "robust to some transformations—cropping pieces of text, modifying a few words, or mild paraphrasing"; but "Detector confidence scores can be greatly reduced when an AI-generated text is thoroughly rewritten, or translated to another language"
    - Anthropic, [How Claude's text watermark works](https://www.anthropic.com/news/claude-text-watermark), 14 Aug 2026: "Light editing probably won't remove the watermark completely; a complete rewrite where every word is replaced will"; no numbers published
- better tests recover part of the loss
    - [Robust Detection of Watermarks for Large Language Models Under Human Edits](https://arxiv.org/abs/2411.13868), Xiang Li, Feng Ruan, Huiyuan Wang, Qi Long, Weijie J. Su, JRSS-B (to appear): treat edited text as a mix of marked and unmarked tokens; simple sum tests "fail to achieve optimal robustness"
    - [WaterSeeker](https://arxiv.org/abs/2409.05112), Leyi Pan, Aiwei Liu, Yijian Lu, Zitian Gao, Yichen Di, Shiyu Huang, Lijie Wen, Irwin King, Philip S. Yu, NAACL 2025 Findings: find the marked paragraph inside a long human document
    - TextSeal (above) puts one marked 400-token answer into Wikipedia text: whole-document tests fail "beyond T=4000" tokens, its region search still detects "even at T=12,000 (a 30× dilution)"; but when the 400 tokens are split into 5 pieces of about 80 tokens, the pieces "become too small" (Sec. 5 of the paper)
        - for web pages this is the relevant case: one AI paragraph inside a long human page is findable, scattered AI sentences are not
- apart from those 14 writers, who were trying to remove the mark, all edit studies I found use synthetic edits (random swaps, synonym tools, another model); I found no study where real people edited marked text the way they edit a draft before posting it

paraphrase by another model

- [Paraphrasing evades detectors of AI-generated text, but retrieval is an effective defense](https://arxiv.org/abs/2303.13408), Kalpesh Krishna, Yixiao Song, Marzena Karpinska, John Wieting, Mohit Iyyer, NeurIPS 2023
    - their paraphraser DIPPER "successfully evades several detectors, including watermarking"
    - the defense is a database of everything the provider ever generated, searched by meaning: it "can detect 80% to 97% of paraphrased generations ... while only classifying 1% of human-written sequences as AI-generated"; only the provider can run it
- [Can AI-Generated Text be Reliably Detected?](https://arxiv.org/abs/2303.11156), Vinu Sankar Sadasivan, Aounon Kumar, Sriram Balasubramanian, Wenxiao Wang, Soheil Feizi, TMLR: paraphrase repeatedly; it "can significantly reduce detection rates, it only slightly degrades text quality in many cases"
- [AI Watermark Evidence Fails Forensic Readiness: An Empirical Evaluation](https://arxiv.org/abs/2607.16010), Saifur Rahman Tamim, Amir Labib Khan, arXiv 2026
    - "Out of 846 valid paraphrase runs ... every single initially-detected KGW and Unigram text lost its watermark after paraphrasing ... SynthID fared only slightly better at 98.3%"
    - before any attack, misses were already "70% for KGW, 83% for Unigram, 80% for SynthID" in their setup, which I read as weak settings on small open models and not as the deployed rates
- [Watermark under Fire: A Robustness Evaluation of LLM Watermarking](https://arxiv.org/abs/2411.13425) (WaterPark), Jiacheng Liang, Zian Wang, Lauren Hong, Shouling Ji, Ting Wang, EMNLP 2025: "10 state-of-the-art watermarkers and 12 representative attacks" on one platform
    - Tamim and Khan summarize its SynthID result as "TPR dropping to 0.498 under DP-40 paraphrase and 0.232 under translation"; I did not open the tables myself
- [Robustness Assessment and Enhancement of Text Watermarking for Google's SynthID](https://arxiv.org/abs/2508.20228), Xia Han, Qi Li, Jianbing Ni, Mohammad Zulkernine, TrustCom 2025: SynthID-Text "is vulnerable to meaning-preserving attacks, such as paraphrasing, copy-paste modifications, and back-translation"
- [Vaporizer: Breaking Watermarking Schemes for Large Language Model Outputs](https://arxiv.org/abs/2605.07481), Jonathan Hong Jin Ng, Anh Tu Ngo, Anupam Chattopadhyay, arXiv 2026: word swaps, machine translation and neural paraphrase; "it is possible to remove the watermark with reasonable effort"
- the semantic schemes (family 4) were built for this, and they do better against a blind paraphraser, but an attacker who can sample the marked model beats them too: [Revisiting the Robustness of Watermarking to Paraphrasing Attacks](https://arxiv.org/abs/2411.05277), Saksham Rastogi, Danish Pruthi, EMNLP 2024, "with access to only a limited number of generations from a black-box watermarked model, we can drastically increase the effectiveness of paraphrasing attacks"

translation

- [Can Watermarks Survive Translation? On the Cross-lingual Consistency of Text Watermark for Large Language Models](https://arxiv.org/abs/2402.14007), Zhiwei He, Binglin Zhou, Hongkun Hao, Aiwei Liu, Xing Wang, Zhaopeng Tu, Zhuosheng Zhang, Rui Wang, ACL 2024
    - ask the model in another language, then translate the answer: this "can effectively remove watermarks, decreasing the AUCs to a random-guessing level without performance loss"
    - their defense X-SIR groups words that mean the same across languages
- [Is Multilingual LLM Watermarking Truly Multilingual?](https://arxiv.org/abs/2510.18019), Asim Mohamed, Martin Gubri, arXiv 2025 (ICML 2026 per the ICML site): the cross-language defenses "fail to remain robust under translation attacks in medium- and low-resource languages"; their fix translates the suspect text back into many candidate languages at detection time
- [Evaluating the Robustness and Accuracy of Text Watermarking Under Real-World Cross-Lingual Manipulations](https://arxiv.org/abs/2502.16699), Mansour Al Ghanim, Jiaqi Xue, Rochana Prih Hastuti, Mengxin Zheng, Yan Solihin, Qian Lou, EMNLP 2025 Findings: four schemes, four languages
- [BanglaLorica](https://arxiv.org/abs/2601.04534), Amit Bin Tariqul and 5 others, arXiv 2026: after a round trip through another language, "detection accuracy to collapse to 9-13%"
- even without any attack, the mark is uneven across languages
    - SynthID-Text paper: it "performs consistently across different languages"
    - OpenAI [help page](https://help.openai.com/en/articles/8912793-provenance-signals-in-openai-generated-content), Oct 2026: across "all 24 official EU languages ... At 1% false-positive rate, Spanish has the highest detection rate (69.0%), while Romanian has the lowest (42.2%)"; they turn the strength up for weak languages
    - [Auditing Cross-Lingual Fairness in Language Model Watermarking](https://arxiv.org/abs/2608.20047), Alexander Nemecek, Osama Zafar, Debargha Ganguly, Vikash Singh, Vipin Chaudhary, Erman Ayday, arXiv 2026: six schemes, three open models, "eleven languages spanning four scripts"; the gaps follow language families, "structural to language properties rather than idiosyncratic to particular languages"
    - [Who Gets Flagged? The Pluralistic Evaluation Gap in AI Content Watermarking](https://arxiv.org/abs/2604.13776), Alexander Nemecek, Osama Zafar, Yuqiao Xu, Wenbiao Li, Erman Ayday, CVPR 2026 MAPS Workshop: of the major benchmarks, "with one exception, none report performance across languages, cultural content types, or population groups"
- Anthropic's translation statement is about a different case: "A translation produced by Claude carries a watermark, because in this case every word is chosen by Claude". Text written by Claude and then translated by DeepL or Google Translate keeps nothing

code

- [Is The Watermarking Of LLM-Generated Code Robust?](https://arxiv.org/abs/2403.17983), Tarun Suresh, Shubham Ugare, Gagandeep Singh, Sasa Misailovic, arXiv 2024: "variable renaming and dead code insertion, can effectively erase watermarks"; detection drops "below 50% in many cases"
- [Mark My Words](https://arxiv.org/abs/2312.00273), Julien Piet, Chawin Sitawarin, Vivian Fang, Norman Mu, David Wagner, SaTML 2025: KGW on prose is fine ("detected with fewer than 100 tokens"), but schemes "struggle to efficiently watermark code generations"
- [Watermarks Without Verification](https://arxiv.org/abs/2609.09604), Alexander Nemecek, Vipin Chaudhary, Erman Ayday, arXiv 2026, ran open SynthID-Text on two open models: "On code, the cost is three points of correctness on one model and below measurement on the other, while detection remains near chance"
- so the loud complaint in Aug 2026 that the mark ruins code has it backwards: on code the mark is mostly absent

does the mark hurt the text?

- the old green-list schemes do: [Downstream Trade-offs of a Family of Text Watermarks](https://arxiv.org/abs/2311.09816), Anirudh Ajith, Sameer Singh, Danish Pruthi, EMNLP Findings 2024, "drops of 10 to 20% in CLS tasks in the average case"; [New Evaluation Metrics Capture Quality Degradation due to LLM Watermarking](https://arxiv.org/abs/2312.02382), Karanpartap Singh, James Zou, arXiv 2023, "current watermarking methods are detectable by even simple classifiers"; [WaterBench](https://arxiv.org/abs/2311.07138), Shangqing Tu, Yuliang Sun, Yushi Bai, Jifan Yu, Lei Hou, Juanzi Li, ACL 2024
- the deployed family does not, as far as vendors and one outside test show: Google's 20 million responses; OpenAI's benchmark table (for example "Terminal-Bench 4.0 53.90%" without and "56.06%" with); Nemecek et al.: "On prose, the measured effect of the watermark does not exceed that of changing the sampling seed"

attacks

finding out that a model is marked

- [Black-Box Detection of Language Model Watermarks](https://arxiv.org/abs/2405.20777), Thibaud Gloaguen, Nikola Jovanović, Robin Staab, Martin Vechev, ICLR 2025
    - tests that reveal a mark, and estimate its settings, "using only a limited number of black-box queries"; "current watermarking schemes are more detectable than previously believed"
    - this is a ready audit tool: it answers "does this API mark its output?" without any key
- [Can Watermarked LLMs be Identified by Users via Crafted Prompts?](https://arxiv.org/abs/2410.03168), Aiwei Liu, Sheng Guan, Yiming Liu, Leyi Pan, Yifei Zhang, Liancheng Fang, Lijie Wen, Philip S. Yu, Xuming Hu, ICLR 2025: "almost all mainstream watermarking algorithms are easily identified with our well-designed prompts"
- [Probing Google DeepMind's SynthID-Text Watermark](https://www.sri.inf.ethz.ch/blog/probingsynthid), Nikola Jovanović, Thibaud Gloaguen, Martin Vechev, ETH SRI Lab blog, Dec 2024
    - "the presence of SynthID-Text can be easily detected using black-box queries"
    - "we found no reliable evidence of a watermark on the Gemini 1.5 API. This matches the official claims, stating that the watermark is only present in the Gemini App and Web"
    - they tested a local copy, because the app is "not suitable for querying with thousands of similar prompts"

removal (scrubbing)

Paraphrase is the baseline and it already works (section above). The research adds cheaper and more targeted ways.

- [Watermark Stealing in Large Language Models](https://arxiv.org/abs/2402.19361), Nikola Jovanović, Robin Staab, Martin Vechev, ICML 2024
    - query the marked model, learn roughly which words the key favors after which context, then steer a paraphraser away from them
    - "for under $50 an attacker can both spoof and scrub state-of-the-art schemes previously considered safe, with average success rate of over 80%"
- [Bypassing LLM Watermarks with Color-Aware Substitutions](https://arxiv.org/abs/2403.14719), Qilong Wu, Varun Chandrasekaran, arXiv 2024: ask the marked model itself questions that reveal which words are green, then swap only those
- [Large Language Model Watermark Stealing With Mixed Integer Programming](https://arxiv.org/abs/2405.19677), Zhaoxi Zhang and 7 others, arXiv 2024: recovers the green list with no detector access
- [Watermark Smoothing Attacks against Language Models](https://arxiv.org/abs/2407.14206), Hongyan Chang, Hamed Hassani, Reza Shokri, arXiv 2024: uses a weaker local model to undo the tilt; tested on "10 different watermarks"
- [Optimizing Adaptive Attacks against Watermarks for Language Models](https://arxiv.org/abs/2410.02440), Abdulrahman Diaa, Toluwani Aremu, Nils Lukas, ICML 2025: train a small paraphraser against a known scheme; "adaptive attacks evade detection against all surveyed watermarks", and one trained on one scheme "succeeds in evading unseen watermarks"
- [No Free Lunch in LLM Watermarking](https://arxiv.org/abs/2402.16187), Qi Pang, Shengyuan Hu, Wenting Zheng, Virginia Smith, NeurIPS 2024: each nice property opens an attack; in particular "public watermark detection APIs can be exploited by attackers to launch both watermark-removal and spoofing attacks"
- [Lost in Overlap: Exploring Logit-based Watermark Collision in LLMs](https://arxiv.org/abs/2403.10020), Yiyang Luo, Ke Lin, Chao Gu, Jiahui Hou, Lijie Wen, Ping Luo, NAACL 2025 Findings: when a second marked model rewrites marked text, the two marks collide and the first weakens; this is now the normal case, since Gemini, Claude and ChatGPT all mark
- SynthID-Text specifically
    - ETH blog (above): "it is easier to scrub than other SOTA schemes even for naive adversaries"
    - [On Google's SynthID-Text LLM Watermarking System: Theoretical Analysis and Empirical Validation](https://arxiv.org/abs/2603.03410), Romina Omidi, Yun Dong, Binghui Wang, arXiv 2026: "the mean score is inherently vulnerable to increased tournament layers, and design a layer inflation attack to break SynthID-Text"
- theory says this cannot be fixed: [Watermarks in the Sand](https://arxiv.org/abs/2311.04378), Hanlin Zhang, Benjamin L. Edelman, Danilo Francati, Daniele Venturi, Giuseppe Ateniese, Boaz Barak, ICML 2024 (details in [image_watermarking](image_watermarking.md)); anyone who can judge quality and make small rewrites can walk the text away from the mark
- a sober 2026 check: [MarkSec: Capability-Aware Evaluation of Adversarial Attacks Against LLM Watermarks](https://arxiv.org/abs/2609.16681), Kairong Li, Zhikun Zhang, Xiao Ren, Yunjun Gao, arXiv 2026
    - "attacks that appear strongest by watermark removal alone can fall behind general rewriting when success also requires acceptable text quality"; "general rewriting remains a strong baseline across watermark families"
    - plain meaning: the fancy attacks are not needed, asking another model to rewrite is as good
- what happened in practice in Aug 2026, per Nemecek et al.: "A tool posted on GitHub that claimed to remove the watermark collected more than ten thousand stars ... within a week of the announcement, although no evidence of its effectiveness had been published"

forgery (spoofing)

Forgery means writing text, or taking a human's text, so that it tests positive for a vendor's mark. It can frame a person ("you used Claude") or a vendor ("Claude wrote this hate speech").

- Sadasivan et al. (above) showed it first: "an attacker can infer hidden AI text signatures without white-box access to the detection method"
- Jovanović et al. watermark stealing (above): over 80% success on KGW-type schemes
- by training on marked output
    - [On the Learnability of Watermarks for Language Models](https://arxiv.org/abs/2312.04469), Chenchen Gu, Xiang Lisa Li, Percy Liang, Tatsunori Hashimoto, ICLR 2024: a model trained on marked text learns "to generate watermarked text with high detectability"
    - [DITTO: A Spoofing Attack Framework on Watermarked LLMs via Knowledge Distillation](https://arxiv.org/abs/2510.10987), Hyeseon An, Shinwoo Park, Suyeon Woo, Yo-Sub Han, EACL 2026: "allows an attacker to steal and replicate the watermarking signal of the victim model"
    - [Unified attacks to large language model watermarks: spoofing and scrubbing in unauthorized knowledge distillation](https://arxiv.org/abs/2504.17480), Xin Yi, Yue Li, Shunfan Zheng, Linlin Wang, Xiaoling Wang, Liang He, arXiv 2025: one distilled model for removal, another for forgery
- the cheapest forgery needs no learning: take marked text and change a few words so the meaning flips; the mark survives light edits by design. Pang et al. call this a "piggyback spoofing attack" that "makes watermarked text toxic or inaccurate through small modifications"
- SynthID-Text holds up better: ETH blog measured forgery success of "4%" with 30k queries and "15%" with 90k, against "above 80%" for older schemes
- forgeries can be caught afterwards: [Discovering Spoofing Attempts on Language Model Watermarks](https://arxiv.org/abs/2410.02693), Thibaud Gloaguen, Nikola Jovanović, Robin Staab, Martin Vechev, ICML 2025, "all current learning-based spoofing methods consistently leave observable artifacts"
- the public-key signature scheme of Fairoze et al. (family 3) is "unforgeable" by proof; I expect it tolerates edits worse than the statistical marks, but have not checked its numbers

the mark leaks into models trained on marked text

- [Watermarking Makes Language Models Radioactive](https://arxiv.org/abs/2402.14904), Tom Sander, Pierre Fernandez, Alain Durmus, Matthijs Douze, Teddy Furon, NeurIPS 2024
    - a model fine-tuned on marked text shows the mark in its own output; detectable "even when as little as 5% of training text is watermarked"
    - vendors want this to catch competitors who train on their output; TextSeal advertises it
- it can be dodged: [Can LLM Watermarks Robustly Prevent Unauthorized Knowledge Distillation?](https://arxiv.org/abs/2502.11598), Leyi Pan, Aiwei Liu, Shiyu Huang, Yijian Lu, Xuming Hu, Lijie Wen, Irwin King, Philip S. Yu, ACL 2025: paraphrase the training data first, or cancel the mark at inference
- same trick, used by data owners: [Ward: Provable RAG Dataset Inference via LLM Watermarks](https://arxiv.org/abs/2410.03537), Nikola Jovanović, Robin Staab, Maximilian Baader, Martin Vechev, ICLR 2025: mark your own documents to prove a retrieval system uses them
- for the web this matters in a new way: from Aug 2026 a large share of new web text carries one of three marks, and the next models will train on it

open-weight models

- anyone who runs the model controls the dice, so a mark applied at sampling time is optional
- [Towards Watermarking of Open-Source LLMs](https://arxiv.org/abs/2502.10525), Thibaud Gloaguen, Nikola Jovanović, Robin Staab, Martin Vechev, arXiv 2025: marks baked into weights must survive "model merging, quantization, or finetuning"; "existing methods ... are not durable"
- [Provably Robust Watermarks for Open-Source Language Models](https://arxiv.org/abs/2410.18861), Miranda Christ, Sam Gunn, Tal Malkin, Mariana Raykova, arXiv 2024: a first scheme "modifying the parameters of the model", tested on small OPT models only
- Gu et al. (above): a learned mark fades "under fine-tuning on normal text"
- so the content farms that DeGenTWeb finds, if they run local open models, will never carry a mark

what is deployed

As of 7 Oct 2026, three vendors mark text. All detectors are closed.

- Google
    - SynthID-Text "has been productionized in the user-facing Gemini and Gemini Advanced chatbots", Nature paper, Oct 2024
    - scope is narrow: [SynthID](https://deepmind.google/models/synthid/) says "text generated by the Gemini app and web experience"; the ETH probe found no mark on the Gemini API
    - the scheme is open source, with a detector you train yourself
    - detector: the [SynthID Detector announcement](https://blog.google/technology/ai/google-synthid-ai-content-detector/), May 2025, promised text ("Video and text watermark detection will be rolled out in the coming weeks"); the SynthID page today says "Just upload an image, video or audio file" and lists a waitlist for "journalists and media professionals". I could not confirm that outsiders can check text
- Anthropic
    - [How Claude's text watermark works](https://www.anthropic.com/news/claude-text-watermark), 14 Aug 2026: "Claude's text watermark is a version of the SynthID-Text approach"; applied "globally at launch because we don't yet have a durable way to scope it by region"
    - [How Claude marks AI-generated content](https://support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content), help center: "Claude models launched in the EU on or after August 2, 2026 will support machine-readable marking at launch"; covers "Claude Platform (API), Claude, Claude Code, Claude Cowork, and Claude Tag", and AWS, Google Cloud, Microsoft Foundry; a per-model table shows older models being added
    - so unlike Gemini and ChatGPT, every app built on the Claude API emits marked text
    - detector: "Watermark detection is currently available to eligible organizations as required under EU law (such as regulators, law enforcement, media, fact-checkers, independent researchers, educational organizations, and EU civil society groups)"; there is a "Claude Watermark Detector Access Request Form"
- OpenAI
    - had a working mark since 2022 and held it back; its Aug 2024 note in [Understanding the source of what we see and hear online](https://openai.com/index/understanding-the-source-of-what-we-see-and-hear-online/) said it was "highly accurate and even effective against localized tampering, such as paraphrasing", but "less robust against globalized tampering; like using translation systems, rewording with another generative model, or asking the model to insert a special character in between every word and then deleting that character", and that it "could stigmatize use of AI as a useful writing tool for non-native English speakers"
    - 5 Oct 2026, [Our approach to EU text provenance rules](https://openai.com/index/eu-text-provenance/): "Over the coming weeks, we will add an invisible watermark to eligible ChatGPT and Codex text output in the European Union"; "API customers globally will be able to opt in ... Text watermarking will remain off by default in the API"; "We are not making text watermarking a global default at launch"
    - scheme is its own, textGrain; "We also plan to make the technology available in open source"
    - detector: "Access will initially be limited to approved researchers and expert organizations"; "Given the risk of missed watermarks and false positives, we are not making it publicly available at launch"; the help page names first partners: John Thickstun (Cornell), Martin Vechev (ETH Zurich, INSAIT), and the Kempelen Institute (KInIT)
- Meta published TextSeal in May 2026; I found no statement that Meta AI output carries it
- nothing deployed carries a user ID, according to the vendors
- no third party can read any of these marks: as of late Aug 2026 a consumer guide noted that Turnitin, GPTZero and Pangram cannot (I saw this only in a search summary of findskill.ai, not a primary source); Anthropic's page says detection companies "don't have our key"
- public reaction to Claude's mark, as a data point on incentives: [TechCrunch, 5 Oct 2026](https://techcrunch.com/2026/10/05/openai-will-start-watermarking-chatgpts-text-in-the-eu/) says it "drew backlash from some Claude users", and recalls that OpenAI held off in 2024 "partly over concerns that users would switch to rivals that didn't watermark"
    - [Position: LLM Watermarking Should Align Stakeholders' Incentives for Practical Adoption](https://arxiv.org/abs/2510.18333), Yepeng Liu, Xuandong Zhao, Dawn Song, Gregory W. Wornell, Yuheng Bu, ACL 2026, predicted this a year earlier: the barriers are "competitive risk, detection-tool governance, and attribution issues"; the law removed the first by binding everyone at once
    - [SoK: Are Watermarks in LLMs Ready for Deployment?](https://arxiv.org/abs/2506.05594), Kieu Dang, Phung Lai, NhatHai Phan, Yelong Shen, Ruoming Jin, Abdallah Khreishah, My T. Thai, arXiv 2025, said no, because of "unfavorable impacts on model utility"; that was measured on the older schemes
- the legal side (Article 50, the Code of Practice, the short-text exemption) is in [labeling_rules_and_practice](labeling_rules_and_practice.md)

Three deployment facts matter for any measurement.

- coverage has holes by design: ChatGPT outside the EU, the Gemini API, the OpenAI API by default, older models, every open-weight model, and every other vendor
- the three marks are separate. A page must be sent to three detectors with three access agreements. Article 50 asks for "interoperable"; nothing is
- the vendor chooses the threshold and can change keys or settings without notice; Nemecek et al.: "evidence about a watermark family is not evidence about a deployment"

has anyone measured watermarked text in the wild?

No. I searched for any study that ran a text watermark detector over web pages, social posts, reviews, homework, papers or code repositories, and found none.

- the reason is access, and timing
    - before Aug 2026 only Gemini app text was marked, and Google gave no outsider a text detector that I could confirm
    - Claude's detector entered private preview in Aug to Sep 2026; OpenAI's opened for applications two days before this note
- what exists instead
    - vendor numbers on their own traffic: Google's 20 million response quality test; OpenAI's "Prior tests in ChatGPT also showed no change in thumbs-down rates"; neither says how much marked text is out there or how much survives
    - black-box audits of whether an API marks at all: Gloaguen et al. on "real-world APIs", and the ETH Gemini probe
    - lab runs of the open SynthID-Text code on small open models (Nemecek et al.; Tamim and Khan; Han et al.)
    - counts of AI text on the web made with style detectors, such as the Pew and Pangram numbers in this folder's [index](index.md) and in [llm_text](../llm_text/index.md); none has ground truth
- a near miss worth knowing: in 2025 people found invisible Unicode characters in ChatGPT output and took them for a watermark. Nemecek et al.: "invisible Unicode characters were discovered in ChatGPT output, which OpenAI attributed to a byproduct of training". The remover that got famous in Aug 2026 strips such characters and file metadata, and for the statistical mark it only asks another model to rewrite: [implicator.ai, Aug 2026](https://www.implicator.ai/github-tool-targets-claude-watermarks/) says "Its scripts can verify the removal of file metadata and hidden Unicode characters. It cannot show that a rewrite defeats Claude's undisclosed text watermark"
- a shared task now exists: [Overview of PAN 2026](https://arxiv.org/abs/2602.09147), Janek Bevendorff and 11 others, arXiv 2026, added "Text Watermarking, a new task that aims to find new and benchmark the robustness of existing text watermarking schemes"; it is a lab benchmark, not a field measurement

I think this is the most open question in the whole area, and it lines up with what DeGenTWeb already does.

what remains open

- how much marked text reaches the public web, and how much of it is still readable after people edit, translate and reformat it; unknown
- false alarms at scale: OpenAI in 2024, "applying it to large volumes of text would lead to a large number of total false positives"; at a 1% target, a crawl of a billion human pages flags ten million. No deployed detector has published its rate on real human text by language and genre
- who gets hurt by errors: [LLM Watermarking as Big Data Provenance: A Deployment-Oriented Systematization](https://arxiv.org/abs/2607.10103), Huy Phan and 6 others, arXiv 2026, "false positives accumulate at scale"; Nemecek et al. note "no deployment reports disaggregated results" across languages and user groups
- "assisted" versus "written by": all three vendors say the mark cannot tell them apart; a non-native speaker who has Claude polish an essay may or may not test positive, and nobody has measured where the line falls
- short text: reviews, comments, tweets and search snippets are under the 200 to 400 tokens the detectors need; the EU code relaxes its rule for text under about 200 tokens (see the labeling note)
- robustness with quality kept: no scheme both leaves the model's odds unchanged and survives a rewrite; the semantic schemes are slow and still fall to an informed attacker
- public checking without forgery: publishing the key lets anyone forge and scrub; keeping it secret means trusting the vendor. The signature schemes solve forgery, and I think they pay for it in tolerance to edits. [Watermarking Without Standards Is Not AI Governance](https://arxiv.org/abs/2505.23814), Alexander Nemecek, Yuzhou Jiang, Erman Ayday, arXiv 2025, asks for "technical standards, audit infrastructure, and enforcement mechanisms"
- detector APIs are attack tools: Pang et al. show that query access helps both removal and forgery; vendors answer with vetting and, I assume, rate limits and coarse answers, none documented
- several marks at once: collisions between Gemini, Claude and ChatGPT marks when one model edits another's text are studied only for green-list schemes
- open-weight models: no durable mark exists
- the mark in training data: what happens to detectors and to new models when a large share of crawled text carries three vendors' marks is unstudied outside small fine-tuning runs
- evidence value: Tamim and Khan argue no method meets court standards ("None of the three methods satisfy more than two of five Daubert factors")

research we could do

I ordered these by how well they fit a web-measurement group that already has a crawler and a pipeline for finding LLM-generated sites. The first step for almost all of them is the same and should happen this week: apply for detector access at Anthropic and OpenAI as independent researchers, and join Google's waitlist. OpenAI names "academic and research organizations studying text provenance, detection reliability, or how people understand provenance results" as a qualifying use.

1. the first count of watermarked text on the web
    - gap: zero in-the-wild numbers; every "share of the web that is AI" figure rests on style detectors with no ground truth
    - builds on: DeGenTWeb's crawl and site classification; the Pew and Pangram Common Crawl samples; the detector previews
    - method: sample pages by month from Common Crawl and our own crawl; send main text to each vendor's detector; report the share marked per vendor, per site type, per language, over time
    - built-in control: text published before a model's marking date cannot carry its mark. Pages from before Aug 2026 give Claude's real false alarm rate on real web text, and pages from before 2024 give Gemini's. No lab study has that
    - what it gives DeGenTWeb: a subset of pages with near-certain labels, to calibrate our own detector and Pangram's against
    - risks: access terms may forbid bulk use or publication; quotas; the count is a lower bound because of the coverage holes, and we must say so
2. where does the mark die between the chatbot and the web page?
    - gap: all robustness numbers use synthetic edits; nobody followed marked text through real publishing tools
    - builds on: Kirchenbauer et al. reliability study; OpenAI's 10% and 25% word swap numbers; the labeling note's idea 3 for media
    - method: generate marked text with Claude and with the OpenAI API (opt-in); push it through what site owners really use: WordPress and page builders, Markdown to HTML, Grammarly and Word's rewrite, DeepL and Google Translate, SEO "spinners", summarizers, "humanizer" services; re-extract the text the way a crawler would; test at the detectors; report survival per tool and per chain
    - extra: boilerplate removal and text extraction themselves cut and reorder text; measure what our own crawler's extraction does to the mark
    - risk: low; needs only modest detector quota because we control the inputs
3. do the removal tools work? a census of the "humanizer" market after Aug 2026
    - gap: Nemecek et al.: a remover with "more than ten thousand stars" and "no evidence of its effectiveness"; MarkSec says plain rewriting is the strong baseline
    - builds on: MarkSec's quality-aware success metric; Diaa et al. adaptive paraphrasers; our web_user notes on SEO tooling
    - method: collect GitHub removers and paid humanizers; run fixed marked samples through each; measure removal, meaning kept, and whether style detectors still flag the result; track the market over time
    - why it matters: tells regulators whether "robust" in Article 50 means anything against tools a student already uses
    - risk: terms of the detector previews may bar attack research; frame it as robustness evaluation and disclose to vendors first
4. who really marks? a black-box compliance audit across vendors, products and regions
    - gap: vendors' coverage statements are unaudited; OpenAI marks ChatGPT only in the EU, which is a geographic difference we can observe from vantage points
    - builds on: Gloaguen et al. black-box tests and Liu et al. Water-Probe (need no key); the ETH Gemini probe; Rijsbosch et al.'s audit of image generators in the labeling note
    - method: run the key-free presence tests against chat apps and APIs from EU and non-EU vantage points, across models, cloud resellers (AWS, Google Cloud, Microsoft Foundry) and third-party apps built on these APIs; repeat monthly through the 2 Dec 2026 end of the transition period
    - output: a table of who marks what, where, since when; the text counterpart of the Article 50 before-and-after idea in the sibling notes
    - risk: consumer apps limit query volume; the tests need many similar prompts
5. false alarms on real human text
    - gap: OpenAI's own worry; no published rate by language or genre; the 1% target is a lab number
    - builds on: Fernandez et al. on getting false alarm rates right; Phan et al.; the pre-deployment control from idea 1
    - method: assemble dated human text across the 24 EU languages and genres that stress the test: legal boilerplate, templates, lists, poetry, quoted chatbot answers inside human articles; measure flags per detector
    - also: text marked by one vendor sent to another vendor's detector, to measure cross-vendor confusion
    - risk: needs large quota; start with a few thousand documents per stratum
6. assisted or authored? measuring the gray zone
    - gap: vendors admit the mark cannot separate "wrote" from "edited"; DeGenTWeb asks whether a site is "mostly" LLM-generated, which needs a per-passage answer
    - builds on: WaterSeeker; TextSeal's region detection; Li et al. on human edits
    - method: build documents with known mixes (human draft polished by Claude at several strengths; Claude draft edited by people; human text with pasted AI paragraphs); record detector output as a function of the mix; then apply to web pages and report how much of each page is marked, if the API returns spans or scores
    - a small user study here would be new: let real writers edit marked drafts the way they normally would, with no aim of removing anything, and see what survives (Kirchenbauer et al. only tested 14 people who were trying to remove it)
    - risk: detectors may return only yes or no
7. is the marked web feeding the next models?
    - gap: radioactivity is shown only in fine-tuning experiments; from Aug 2026 the crawl itself is marked
    - builds on: Sander et al.; Pan et al. on evasion; TextSeal's distillation claim
    - method: track the marked share in Common Crawl snapshots (idea 1 gives it); sample output of new open-weight models and send it to the vendor detectors; a model that learned from Claude output should test positive more often than chance in aggregate
    - risk: the effect may be far below what a yes-or-no API can show; needs scores, or many samples
8. marked code and developer text on GitHub
    - gap: Claude Code and Codex output is marked "where there is an arbitrary choice", such as comments; nobody knows how much signal a commit carries
    - builds on: SWEET; Suresh et al.; Nemecek et al.'s code result
    - method: generate known Claude Code sessions, test code, comments, commit messages and pull request text separately; then sample public repositories before and after Aug 2026
    - my guess is that prose around code (pull request descriptions, READMEs, issues) is where the signal is, and code itself tests near chance
    - risk: short texts; may end as a negative result, which is still useful to the people angry about code marking
9. detector access as an attack surface
    - gap: Pang et al. and Jovanović et al. assume open query access; the real previews have vetting, quotas and unknown answer formats
    - builds on: watermark stealing; Discovering Spoofing Attempts
    - method: document what each preview API returns and how fast; estimate from published attacks how many queries removal and forgery would need under those limits; test on our own open-source deployment configured the same way, never on the vendor's
    - risk: must stay within access terms; this is an analysis paper more than an attack paper

If I had to pick two, I would do idea 1 and idea 2 together. Idea 2 tells us how to read idea 1's lower bound, and both reuse the DeGenTWeb pipeline.

gaps in this review

- I read abstracts for most papers and full text only for the SynthID-Text paper's main sections, the textGrain report's opening, the Nemecek et al. 2026 paper, parts of Kirchenbauer et al. 2024, TextSeal and Pang et al., and the vendor pages; numbers come from abstracts unless I name a section or page
- SynthID-Text's own paraphrase numbers are in its supplement (section C.6), which I did not open; the ETH blog cites it as "AUC reduced to 0.7 for texts of 1000 tokens"
- I could not open OpenAI's June 2026 provenance post (HTTP 403) or the Wall Street Journal's 2024 report; both are cited through others
- I did not check the EU Code of Practice text for the exact rules on text marks and detector access; see the labeling note
- no ChatGPT opinion is included: I asked once at Extra High on 7 Oct 2026 and the helper failed (`chatgpt_helper_failure_redacted`)
- some venue labels are from my memory, not from a page I opened: ICLR 2024 for Zhao et al. and Hu et al.; CRYPTO 2024 for Christ and Gunn; IEEE S&P 2025 for Cohen et al.; ICML 2025 for Gloaguen et al. on spoofing
