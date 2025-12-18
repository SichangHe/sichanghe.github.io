# Generative AI (GenAI)

## AI-generated text detector

- perplexity: likelihood of sequence of text according to
    specific language model
- bilingual evaluation understudy (BLEU): quality of
    machine translation compared to human translation

commercial:

- [Originality.ai](https://originality.ai/): proprietary paid detector,
    prover (that text is not generated), and fact checker
    - \$1 per 1000 word
- [GPTZero](https://gptzero.me/): \$8.4 per month for 150,000 word
    (\$1 per 18,000 word)
    - ❓ claim to offer free API for researcher
    - [list of paper using GPTZero](https://gptzero.me/technology)
    - [Detecting AI-Generated Writing Using
        GPTZero](https://iscap.us/proceedings/2024/pdf/6184.pdf),
        Karen Paullet, Jamie Pinchot, Evan Kinney, Tyler Stewart, ISCAP, 2024
        - claim to be highly accurate, but paper seem not robust
- [Copyleaks](https://copyleaks.com/ai-content-detector): \$10/month
    - list of junk or misrepresented papers supporting its "best" accuracy:
        [Third-Party Studies Continue to Confirm Copyleaks AI Detector as
        the Most
        Accurate](https://copyleaks.com/blog/ai-detector-continues-top-accuracy-third-party)

paper:

- [Towards Possibilities & Impossibilities of AI-generated Text Detection:
    A Survey](https://arxiv.org/pdf/2310.15264), Soumya Suvra Ghosal,
    Souradip Chakraborty, Jonas Geiping, Furong Huang, Dinesh Manocha,
    Amrit Singh Bedi, arXiv, 2023
    - statistical method: entropy, perplexity, n-gram frequency
    - detecting all model said to be impossible
    - watermark discussion
- [RAID: A Shared Benchmark for Robust Evaluation of
    Machine-Generated Text Detectors](https://arxiv.org/abs/2405.07940),
    Liam Dugan, Alyssa Hwang, Filip Trhlik, Josh Magnus Ludan, Andrew Zhu,
    Hainiu Xu, Daphne Ippolito, Chris Callison-Burch, ACL, 2024
    - [RAID Benchmark Leaderboard](https://raid-bench.xyz/leaderboard):
        list of tested commercial and free detector
        - 💡 can use binoculars
    - domain matter: what type of text
        - 💡 need to limit domain to validate
    - repetitiveness higher for generated text: Self-BLEU
        - 💡 we could check for repetitiveness instead of generation
    - detector type: ML more robust than metric-based
    - high false positive rate; power function of accuracy
    - not robust to adversarial attack like repetition penalty
- [Texygen: A Benchmarking Platform for
    Text Generation Models](https://arxiv.org/abs/1802.01886), Yaoming Zhu,
    Sidi Lu, Lei Zheng, Jiaxian Guo, Weinan Zhang, Jun Wang, Yong Yu,
    ACM SIGIR, 2018
    - propose Self-BLEU for repetitiveness
- [LLM-as-a-Coauthor: Can Mixed Human-Written and
    Machine-Generated Text Be Detected?](https://arxiv.org/abs/2401.05952),
    Qihui Zhang, Chujie Gao, Dongping Chen, Yue Huang, Yixin Huang,
    Zhenyang Sun, Shilin Zhang, Weiye Li, Zhengyan Fu, Yao Wan, Lichao Sun,
    NAACL, 2024
    - dataset of mixed human+machine text
    - GLTR, DetectGPT, etc. classify inconsistently in the middle
        - RADAR best F1 score: 0.88
    - [GitHub](https://github.com/Dongping-Chen/MixSet)
- ⭐️ [Fast-DetectGPT: Efficient Zero-Shot Detection of
    Machine-Generated Text via Conditional Probability Curvature,
    Guangsheng Bao, Yanbin Zhao, Zhiyang Teng, Linyi Yang, Yue Zhang, ICLR,
    2024](https://arxiv.org/abs/2310.05130)
    - compare perplexity after perturbation; zero-shot
    - improvement in speed and accuracy on
        prior DetectGPT w/ conditional probability curvature sampling
- ⭐️ [Spotting LLMs With Binoculars: Zero-Shot Detection of
    Machine-Generated Text](https://arxiv.org/abs/2401.12070), Abhimanyu Hans,
    Avi Schwarzschild, Valeriia Cherepanova, Hamid Kazemi, Aniruddha Saha,
    Micah Goldblum, Jonas Geiping, Tom Goldstein, ICML, 2024
    - model-agnostic
    - perplexity / cross-perplexity between "observer" & "performer" model
    - dedicated prompt can boost perplexity of generation when
        observed w/o the prompt
    - ❗ use Falcon-7B by default—need big GPU (16GB vRAM) and
        slow ~~(7s per input on A100)~~
        - quantization can lower to 6GB, <100ms prefill/autoregression
    - ❗ memorize some training data
        - not any of the training data in my few test
- [The Impact of Prompts on Zero-Shot Detection of
    AI-Generated Text](https://ceur-ws.org/Vol-3856/paper_11.pdf),
    Kouichi Sakurai, Kaito Taguchi, Yujie Gu, IJCAI, 2024
    - not having prompt info cause big detector accuracy drop
    - ran Binoculars w/ Phi1.5 and still got decent result
        - 0.88 accuracy in black-box test; outcompete other
        - ❓ code does not reveal use of Phi for Binoculars
    - best accuracy in black-box setting:
        - Binoculars 0.877
        - FastDetectGPT 0.819
        - FastNPR 0.768
    - propose FastNPR as a faster NPR??
        - but do not claim to have proposed it and do not list formula
- [Not all tokens are created equal:
    Perplexity Attention Weighted Networks for
    AI generated text detection](https://arxiv.org/abs/2501.03940),
    Pablo Miralles-González, Javier Huertas-Tato, Alejandro Martín,
    David Camacho, Information Fusion, Elsevier, 2025
    - Binoculars poor accuracy in MAGE&M4
    - [MAGE: Machine-generated Text Detection in
        the Wild](https://arxiv.org/abs/2305.13242), Yafu Li, Qintong Li,
        Leyang Cui, Wei Bi, Zhilin Wang, Longyue Wang, Linyi Yang, Shuming Shi,
        Yue Zhang, ACL, 2024
        - old human text
        - prompt 27 LLM to generate text: continue story; write on topic;
            write on topic w/ source
        - paraphrase both human&machine text as machine text
            - ❌ paraphrased human text should not be machine text
        - [Hugging Face dataset](https://huggingface.co/datasets/yaful/MAGE)
    - [M4: Multi-generator, Multi-domain, and
        Multi-lingual Black-Box Machine-Generated Text
        Detection](https://arxiv.org/abs/2305.14902), Yuxia Wang,
        Jonibek Mansurov, Petar Ivanov, Jinyan Su, Artem Shelmanov,
        Akim Tsvigun, Chenxi Whitehouse, Osama Mohammed Afzal, Tarek Mahmoud,
        Toru Sasaki, Thomas Arnold, Alham Fikri Aji, Nizar Habash,
        Iryna Gurevych, Preslav Nakov, EACL, 2024
    - [Fighting Fire with Fire:
        Can ChatGPT Detect AI-generated
        Text?](https://dl.acm.org/doi/abs/10.1145/3655103.3655106),
        Amrita Bhattacharjee, Huan Liu, SIGKDD, 2024
        - ChatGPT as detector high FNR
- [MOSAIC:
    Multiple Observers Spotting AI
    Content](https://arxiv.org/abs/2409.07615v2), a Robust Approach to
    Machine-Generated Text Detection, Matthieu Dubois, François Yvon,
    Pablo Piantanida, arXiv, 2025
    - use multiple LLM perplexity to automatically choose best
    - rejected by ICLR 2025 bc not consistently better empirically
        - probably bc model need same tokenizer and are similar
- [MLSDET: Multi-LLM Statistical Deep Ensemble for
    Chinese AI-Generated Text
    Detection](https://ieeexplore.ieee.org/abstract/document/10888686),
    Dianhui Mao, Denghui Zhang, Ao Zhang, Zhihua Zhao, ICASSP, 2025
    - combine multiple statistical property from
        multiple LLM w/ ML classifier
    - ❌ low quality: wrong use of word "MoE";
        plagiarized Binoculars cross-perplexity as LLMs-crossEntropy
- 🖥️ [Detecting AI-Generated Code Assignments Using Perplexity of
    Large Language
    Models](https://ojs.aaai.org/index.php/AAAI/article/view/30361/32410),
    Zhenyu Xu, Victor S. Sheng, AAAI, 2024
    - detect ChatGPT-generated code assignment; 👎 AUC 0.87
- [Learning to Rewrite:
    Generalized LLM-Generated Text
    Detection](https://arxiv.org/abs/2408.04237), Wei Hao, Ran Li,
    Weiliang Zhao, Junfeng Yang, Chengzhi Mao, ACL, 2025
    - finetune Llama to rewrite text, minimizing edit distance for AI text
        - Levenshtein distance
    - generalize better across domain than RAIDAR
    - better 0.90 AUROC than Fast-DetectGPT, but not compared w/ Binoculars
- [Almost AI, Almost Human: The Challenge of
    Detecting AI-Polished Writing](https://arxiv.org/abs/2502.15666),
    Shoumik Saha, Soheil Feizi, ACL Findings, 2025
    - AI-polished text in various degree tend to be classified as AI text
        - small sample size: 15k polished from 300 human text
        - ✅ Binoculars <10% FPR on GPT-4o/DeepSeek-V3 polished text
            - Fast-DetectGPT <20%
            - higher FPR on Llama, but such smaller model unlikely used IRL
    - 😕 poor figure, wrong label: not (\%) but ratio
    - [GitHub](https://github.com/ShoumikSaha/ai-polished-text)
    - related news: [A New Headache for Honest Students:
        Proving They Didn’t Use
        A.I.](https://www.nytimes.com/2025/05/17/style/ai-chatgpt-turnitin-students-cheating.html)
- [Detecting Machine-Generated Texts: Not Just "AI vs Humans" and
    Explainability is Complicated](https://arxiv.org/abs/2406.18259),
    Jiazhou Ji, Ruizhe Li, Shujun Li, Jie Guo, Weidong Qiu, Zheng Huang,
    Chiyu Chen, Xiaoyu Jiang, Xinru Lu, arXiv, 2024
    - there should be an "undecided" category
- [Glimpse: Enabling White-Box Methods to Use Proprietary Models for
    Zero-Shot LLM-Generated Text Detection, Guangsheng Bao, Yanbin Zhao,
    Juncai He, Yue Zhang, ICLR, 2025](https://arxiv.org/pdf/2412.11506)
    - use Fast-DetectGPT w/ proprietary model logit
    - much better performance on proprietary model outputs:
        0.95 AUROC vs 0.79 on Mix3 dataset
- [Enhancing LLM Text Detection with Retrieved Contexts and
    Logits Distribution
    Consistency](https://aclanthology.org/2025.emnlp-main.503/),
    Zhaoheng Huang, Yutao Zhu, Ji-Rong Wen, Zhicheng Dou, EMNLP, 2025

pending review:

- [MAGRET: Machine-generated Text Detection with
    Rewritten Texts](https://aclanthology.org/2025.coling-main.557/),
    Yifei Huang, Jingxin Cao, Hanyu Luo, Xin Guan, Bo Liu, ACL, 2025
- [Analyzing register variation in web texts through
    automatic segmentation](https://aclanthology.org/2025.nlp4dh-1.2.pdf),
    Erik Henriksson, Saara Hellström, Veronika Laippala, ICNLP, 2025
- [Deciphering Textual Authenticity: A Generalized Strategy through
    the Lens of Large Language Semantics for Detecting Human vs.
    Machine-Generated
    Text](https://www.usenix.org/conference/usenixsecurity24/presentation/bethany),
    Mazal Bethany, Brandon Wherry, Emet Bethany, Nishant Vishwamitra,
    Anthony Rios, Peyman Najafirad, USENIX Security, 2024
- [A Comprehensive Survey of Fake Text Detection on Misinformation and
    LM-Generated Texts](https://ieeexplore.ieee.org/document/10870239),
    Soonchan Kwon, Beakcheol Jang, IEEE Access, 2025

testing:

- Binoculars & GPTZero work well on my text & short prompt generation
    - ✅ classify paraphrase as human
    - ❓ classify long prompt generation as human
    - around 15GB × 2, 0.5s per context window (around 300 token) on A6000

## Issues from AI-generated text

- bot account on social media
- fake product review
- academic plagiarism
    - peer review validity

paper on AI-generated text:

- ❗️ [Monitoring AI-Modified Content at Scale: A Case Study on the Impact of
    ChatGPT on AI Conference Peer Reviews](https://arxiv.org/abs/2403.07183),
    Weixin Liang, Zachary Izzo, Yaohui Zhang, Haley Lepp, Hancheng Cao,
    Xuandong Zhao, Lingjiao Chen, Haotian Ye, Sheng Liu, Zhi Huang,
    Daniel A. McFarland, James Y. Zou, ICML, 2024;
    [Mapping the Increasing Use of LLMs in
    Scientific Papers](https://arxiv.org/abs/2404.01268), Weixin Liang,
    Yaohui Zhang, Zhengxuan Wu, Haley Lepp, Wenlong Ji, Xuandong Zhao,
    Hancheng Cao, Sheng Liu, Siyu He, Zhi Huang, Diyi Yang, Christopher Potts,
    Christopher D Manning, James Y. Zou, arXiv, 2024
    - vastly efficient statistical batch detection via MLE of
        adjective appearance, i.e., word choice
        - trained on human & ChatGPT-generated review from paper & prompt
        - ❓ what prompt for us? generalize to other model?
    - somewhat resistant to paraphrasing
    - inference on 40k review from ICLR 2024, NeurIPS 2023, CoRL 2023,
        EMNLP 2023
    - review w/ generation seem rushed, cite (use `et al.`) less
    - ❗ what would set us apart from them?
    - criticism
        - validation unscientific: AI dataset generated same way as
            training data
        - human may learn word from AI
- [The Rise of AI-Generated Content in
    Wikipedia](https://arxiv.org/abs/2410.08044), Creston Brooks,
    Samuel Eggert, Denis Peskoff, EMNLP workshop, 2024
    - use GPTZero & Binoculars w/ Falcon-7B
    - Wikipedia article before & after GPT-3.5
        - Reddit data from Kaggle
    - get lower bound of generation by subtracting previous positive rate
        - ❗ unscientific bc assume paper i.i.d.
    - people likely believe repeated statement
    - did not use Ghostbuster bc need training,
        Fast-DetectGPT bc lower accuracy
- [The AI Review Lottery:
    Widespread AI-Assisted Peer Reviews Boost Paper Scores and
    Acceptance Rates](https://arxiv.org/abs/2405.02150), Giuseppe Russo Latona,
    Manoel Horta Ribeiro, Tim R. Davidson, Veniamin Veselovsky, Robert West,
    arXiv, 2024
    - \> 16% of 28,000 ICLR 2024 review used AI, w/ higher score
        - threat to peer review process
    - use GPTZero
    - 30 word that predict generation by ~70% accuracy
        - can such word use for screening
- [AI models collapse when trained on
    recursively generated
    data](https://www.nature.com/articles/s41586-024-07566-y), Ilia Shumailov,
    Zakhar Shumaylov, Yiren Zhao, Nicolas Papernot, Ross Anderson, Yarin Gal,
    Nature, 2024
    - fine tune Meta's OPT-125m causal LM w/ generated text based on
        wikitext, recursively
    - model collapse: generate gibberish
- [DataComp-LM: In search of the next generation of training sets for
    language
    models](https://proceedings.neurips.cc/paper_files/paper/2024/file/19e4ea30dded58259665db375885e412-Paper-Datasets_and_Benchmarks_Track.pdf),
    Jeffrey Li, Alex Fang, Georgios Smyrnis, Maor Ivgi, et al., Achal Dave,
    Ludwig Schmidt, Vaishaal Shankar, NeurIPS, 2024
    - mentioning of synthetic data literature
- [Prevalence, Sharing Patterns, and Spreaders of
    Multimodal AI-Generated Content on
    X during the 2024 U.S. Presidential
    Election](https://arxiv.org/abs/2502.11248), Zhiyi Chen, Jinyi Ye,
    Emilio Ferrara, Luca Luceri, arXiv, 2025
    - ❌ lack literature review: claim there exist "scarce" studies on AI text
    - 3 months of 24.7M tweet before election
    - 12% AI image by GPT-4o
    - 1.4% AI text by fine-tuned RoBERTa
        - ❌ but only 0.96 F1 score in testing, so could just be error
    - a few radical "superspreader" account for most AI content
- [Extended: Navigating Today, Shaping Tomorrow: Studying the Role of LLMs on
    Wikipedia](https://openreview.net/pdf?id=R2bp8xLLao), Manoel Horta Ribeiro,
    Andrés Monroy-Hernandez, Wikimedia Research Fund Research Proposal, 2025
    - propose to analyze use & user impact of LLM content on Wikipedia
    - methods unclear
    - has Binoculars in reference list w/o citing it
- ⭐️ Preprint: Do Spammers Dream of Electric Sheep?
    Characterizing the Prevalence of LLM-Generated Malicious Emails, Wei Hao,
    Van Tran, Vincent Rideout, Zixi Wang, AnMei Dasbach-Prisk, M. H. Afifi,
    Junfeng Yang, Ethan Katz-Bassett, Grant Ho, Asaf Cidon, IMC, 2025
    - \~240k×2 Baracuda flagged spam/business email compromise (BEC)
        - replace link w/ `[link]`, filter <250 character
    - used RoBERTa, Fast-DetectGPT, DAIDAR, very different results
        - train/test on pre-GPT + self-generated sample
        - RoBERTa very low FPR/FNR on testing
    - clear increase trend
    - Latent Dirichlet Allocation (LDA) topic modeling; linguistic analysis
    - case study: many similar email w/ different wording

news:

- [Some of
    Substack’s Biggest Newsletters Rely On AI Writing Tools |
    WIRED](https://www.wired.com/story/substacks-writers-use-ai-chatgpt/)
    - 10% of 25 Substack sample seem generated, even by prominent author
        - GPTZero paid to view article
        - ❗ really small sample size
    - some author claim to use LLM to polish not create
    - predict that badge asserting human-made will be common
- [AI Slop Is Flooding Medium |
    WIRED](https://www.wired.com/story/ai-generated-medium-posts-content-moderation/)
    - 40% of $2.7 × 10^5$ post seem generated
        - done by Pangram & Originality separately
        - ❓ how do we compete w/ company
    - ∃ misinformation tracking company, e.g.
        NewsGuard, that scan for generated text
    - Medium CEO claim most generated post was hardly being read
        - argue generated post are bad writing
    - mention of YouTube get-rich-quick tutorial on generating post/book

### research ideas

- emphasize data in the wild different from benchmark
    - noisy nature: non-prose
    - low
        %LLM text cause pathetic theoretical max accuracy skill score (MASS)
        compared to trivial detector
- set-level detection applications: Reddit users, OpenReview,
    student cheating, Amazon reviewers
- collect advanced prompts from Reddit for adversarial benchmark dataset
- push-pull fine-tune LLM for logit-based detection
- manually check misclassified text to find patterns
- mash various metrics together randomly by brute force to see what work well

## Human detection of AI-generated content

- [A Representative Study on Human Detection of
    Artificially Generated Media Across
    Countries](https://ieeexplore.ieee.org/abstract/document/10646666),
    Joel Frank, Franziska Herbert, Jonas Ricker, Lea Schönherr,
    Thorsten Eisenhofer, Asja Fischer, IEEE S&P, 2024
    - human in
        USA&Germany&China cannot distinguish generated audio&image&text
- [Blind and Low-Vision Individuals' Detection of
    Audio Deepfakes](https://dl.acm.org/doi/abs/10.1145/3658644.3690305),
    Filipo Sharevski, Aziz Zeidieh, Jennifer Vander Loop, Peter Jachim,
    ACM CCS, 2024
    - low-vision/blind people cannot detect audio deepfake
- [The Turing Test Is More Relevant Than
    Ever](https://arxiv.org/pdf/2505.02558), Avraham Rahimov, Orel Zamler,
    Amos Azaria, arXiv, 2025
    - TODO: not gone through this yet
    - mention "Human or Not" website's human 60% accuracy detecting AI in
        chat
        - criticism: instruction unclear; interaction too short

## Browser extension/add-on

display info on search result/ webpage itself

extension to automatically detect AI-generated text:

- [Hive AI
    Detector](https://chromewebstore.google.com/detail/hive-ai-detector/cmeikcgfecnhojcbfapbmpbjgllklcbi):
    free
- [Originality.ai](https://chromewebstore.google.com/detail/ai-detector-and-human-wri/kdngfaamkbbkdbemejnlkmjfpmndjdmb)
- [Winston
    AI](https://addons.mozilla.org/en-US/firefox/addon/ai-detector-winston-ai/):
    need account

why extension for human to vote DNE:

- user privacy
    - but can be solved like [have I been
        pwned?](https://www.troyhunt.com/ive-just-launched-pwned-passwords-version-2/#cloudflareprivacyandkanonymity)
        using hash
- scale and cost
    - peer-to-peer?
- adversarial attack like click farm
    - can require voter to verify & pass CAPTCHA
    - solution from crowdsourcing platform: moderator on Reddit, VIP on
        SponsorBlock
- voting is subjective
    - specific tagging instead, e.g., "Ad", "AI", "Scam"
- (abandoned) similar project
    [Dissenter browser](https://github.com/gab-ai-inc/gab-dissenter-extension)
    let user comment on any webpage

# Benchmark paper

- [MAVIS: Mathematical Visual Instruction Tuning with
    An Automatic Data Engine](https://arxiv.org/pdf/2407.08739), Renrui Zhang,
    Xinyu Wei, Dongzhi Jiang, Ziyu Guo, Shicheng Li, Yichi Zhang,
    Chengzhuo Tong, Jiaming Liu, Aojun Zhou, Bin Wei, Shanghang Zhang,
    Peng Gao, Chunyuan Li, Hongsheng Li, ICLR, 2025
