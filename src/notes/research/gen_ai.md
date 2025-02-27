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
- [Fast-DetectGPT: Efficient Zero-Shot Detection of
    Machine-Generated Text via Conditional Probability Curvature,
    Guangsheng Bao, Yanbin Zhao, Zhiyang Teng, Linyi Yang, Yue Zhang, ICLR,
    2024](https://arxiv.org/abs/2310.05130)
    - compare perplexity after perturbation; zero-shot
    - improvement in speed and accuracy on
        prior DetectGPT w/ conditional probability curvature sampling
- [Spotting LLMs With Binoculars: Zero-Shot Detection of
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
- [Not all tokens are created equal:
    Perplexity Attention Weighted Networks for
    AI generated text detection](https://arxiv.org/abs/2501.03940),
    Pablo Miralles-González, Javier Huertas-Tato, Alejandro Martín,
    David Camacho, arXiv, 2025
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
- [MOSAIC:
    Multiple Observers Spotting AI
    Content](https://arxiv.org/abs/2409.07615v2), a Robust Approach to
    Machine-Generated Text Detection, Matthieu Dubois, François Yvon,
    Pablo Piantanida, arXiv, 2025
    - use multiple LLM perplexity to automatically choose best
    - rejected by ICLR 2025 bc not consistently better empirically
        - probably bc model need same tokenizer and are similar

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

- [Monitoring AI-Modified Content at Scale: A Case Study on the Impact of
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
