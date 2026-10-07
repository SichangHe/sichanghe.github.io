# Watermarking AI-generated images, audio and video

(authored by agents unless marked 🧑)

Written 6 Oct 2026. This note covers invisible marks that AI companies stamp into generated pictures, sound and video so that a detector can later say "our model made this". C2PA metadata, text watermarks and labeling rules live in sibling notes; I only touch them where they interact with media watermarks.

## Short answer

- the technology works for ordinary handling: Google says SynthID-Image has marked "over ten billion images and video frames", and the best post-hoc schemes keep ~99% detection at 0.1% false positives under crops, resizes, JPEG, filters
- it does not work against anyone who tries: every public scheme is removed by running the image through a diffusion model, by stamping a second watermark on top, or by a few hundred detector queries; semantic watermarks can also be copied onto real photos
    - Google's own paper says "training a perfectly robust and secure watermarking scheme may be infeasible" and relies on keeping the model secret
- deployment moved fast in 2025-2026: Google, OpenAI (which adopted Google's SynthID), Meta and Adobe all stamp output, and the EU AI Act Article 50 obligation applied from 2 Aug 2026
- but detectors stay closed (Gemini chat, Google's portal for journalists, OpenAI's verify page), so no outsider has measured how many watermarked images exist on the web or how many survive social platforms; I found exactly zero in-the-wild studies of invisible watermarks, and one that shows X strips C2PA on upload
- this measurement gap is the opening for us (ideas at the end)

## How the schemes work

Three families. The first two apply to any media; the third is specific to diffusion models.

1. post-hoc encoder/decoder networks
    - train one network to add a tiny perturbation and another to read bits back, with simulated distortions (JPEG, crop, blur, codec) between them during training
    - this is what every deployed system uses: StegaStamp, TrustMark, InvisMark, Watermark Anything, SynthID-Image, Video Seal, Pixel Seal, AudioSeal
    - [SynthID-Image: Image watermarking at internet scale](https://arxiv.org/abs/2510.09263), Sven Gowal, Rudy Bunel, Florian Stimberg, David Stutz, Guillermo Ortiz-Jimenez, 21 more, Pushmeet Kohli (Google DeepMind), arXiv, Oct 2025
        - the "watermark is applied on top of the AI-generated content using an encoder, not as part of the generation process" (Sec. 2.2); the partner variant "SynthID-O can encode 136-bit payloads within 512×512 pixel images"
        - "we deliberately disentangled watermark detection and payload decoding" (Sec. 5)
        - they combine it with fingerprinting (a database of embeddings of everything generated): "to mitigate forgery attacks, an image must not only contain the correct watermark payload but also match one of the stored embeddings" (Sec. 7)
    - [Watermark Anything with Localized Messages](https://arxiv.org/abs/2411.07231), Tom Sander, Pierre Fernandez, Alain Durmus, Teddy Furon, Matthijs Douze (Meta), ICLR 2025
        - the extractor "segments the received image into watermarked and non-watermarked areas"; survives "inpainting and splicing"; reads "distinct 32-bit messages ... from multiple small regions -- no larger than 10% of the image surface"
    - [TrustMark: Universal Watermarking for Arbitrary Resolution Images](https://arxiv.org/abs/2311.18297), Tu Bui, Shruti Agarwal, John Collomosse (Adobe), arXiv, Nov 2023
        - Adobe's open scheme; ships "TrustMark-RM - a watermark remover method useful for re-watermarking"
    - [InvisMark: Invisible and Robust Watermarking for AI-generated Image Provenance](https://arxiv.org/abs/2411.07795), Rui Xu, Mengya Hu, Deren Lei, Yaxi Li, David Lowe, Alex Gorevski, Mingyu Wang, Emily Ching, Alex Deng (Microsoft), WACV 2025
        - "256-bit watermarks" at "PSNR~51" with "over 97% bit accuracy across various image manipulations"; open source
    - [Pixel Seal: Adversarial-only training for invisible image and video watermarking](https://arxiv.org/abs/2512.16874), Tomáš Souček, Pierre Fernandez, Hady Elsahar, Sylvestre-Alvise Rebuffi, Valeriu Lacatusu, Tuan Tran, Tom Sander, Alexandre Mourachko (Meta), arXiv, Dec 2025
        - drops MSE/LPIPS losses that "fail to mimic human perception and result in visible watermark artifacts"; trains invisibility purely against a discriminator; "JND-based attenuation" for high resolution
    - [Where is the Watermark? Interpretable Watermark Detection at the Block Level](https://arxiv.org/abs/2512.14994), Maria Bulychev, Neil G. Marchant, Benjamin I. P. Rubinstein, WACV 2026
        - classic wavelet-domain block marks with "detection maps"; "robust to cropping up to half the image"
2. fine-tune the generator's decoder so every output carries the mark
    - [The Stable Signature: Rooting Watermarks in Latent Diffusion Models](https://arxiv.org/abs/2303.15435), Pierre Fernandez, Guillaume Couairon, Hervé Jégou, Matthijs Douze, Teddy Furon (Meta), ICCV 2023
        - "fine-tunes the latent decoder of the image generator, conditioned on a binary signature"; detects a crop "to keep 10% of the content, with 90+% accuracy at a false positive rate below 10^-6"
        - weakness: with an open VAE anyone can re-decode the latent and the mark is gone (WAVES, below)
3. "semantic" watermarks hidden in the starting noise of a diffusion model, read back by inverting the diffusion
    - [Tree-Ring Watermarks](https://arxiv.org/abs/2305.20030), Yuxin Wen, John Kirchenbauer, Jonas Geiping, Tom Goldstein, NeurIPS 2023
        - "embeds a pattern into the initial noise vector ... structured in Fourier space so that they are invariant to convolutions, crops, dilations, flips, and rotations"; detected "by inverting the diffusion process to retrieve the noise vector"
    - [Gaussian Shading](https://arxiv.org/abs/2404.04956), Zijin Yang, Kai Zeng, Kejiang Chen, Han Fang, Weiming Zhang, Nenghai Yu, CVPR 2024
        - "map the watermark to latent representations following a standard Gaussian distribution, which is indistinguishable from latent representations obtained from the non-watermarked diffusion model"; so "performance-lossless and training-free"
        - [Gaussian Shading++](https://arxiv.org/abs/2504.15026), same group, arXiv 2025, adds "public key signatures" so third parties can verify, and handles "the complexity of watermark key management, user-defined generation parameters"
    - [An Undetectable Watermark for Generative Image Models](https://arxiv.org/abs/2410.07369) (PRC watermark), Sam Gunn, Xuandong Zhao, Dawn Song, ICLR 2025
        - picks initial latents "using a pseudorandom error-correcting code"; promises "no efficient adversary can distinguish between watermarked and un-watermarked images"; "robustly encode 512 bits"
    - [SEAL: Semantic Aware Image Watermarking](https://arxiv.org/abs/2503.12172), Kasra Arabi, R. Teal Witter, Chinmay Hegde, Niv Cohen, arXiv 2025: ties the noise pattern to a hash of the image's meaning so a copied pattern no longer matches
    - the trade: pixel edits cannot touch these marks because they live in the image's content, but that same fact makes them copyable from one image to another (forgery section)

Audio and video use the same post-hoc idea with modality tricks.

- [Proactive Detection of Voice Cloning with Localized Watermarking](https://arxiv.org/abs/2401.17264) (AudioSeal), Robin San Roman, Pierre Fernandez, Alexandre Défossez, Teddy Furon, Tuan Tran, Hady Elsahar (Meta), ICML 2024
    - "localized watermark detection up to the sample level"; "a fast, single-pass detector ... up to two orders of magnitude faster"; open
- [Video Seal: Open and Efficient Video Watermarking](https://arxiv.org/abs/2412.09492), Pierre Fernandez, Hady Elsahar, I. Zeki Yalniz, Alexandre Mourachko (Meta), arXiv, Dec 2024
    - trains with "video codecs" in the loop; "temporal watermark propagation" so only some frames are embedded; open
- in-generation video marks: [VideoShield](https://arxiv.org/abs/2501.14195), Runyi Hu et al., ICLR 2025 ("maps watermark bits to template bits, which are then used to generate watermarked noise"; also "tamper localization"); [VideoMark](https://arxiv.org/abs/2504.16359), Xuming Hu et al., arXiv 2025 (PRC codes per frame plus edit-distance matching "against temporal attacks, such as frame deletion")

## How well they survive ordinary handling

For compression, resizing, cropping and filters, the modern post-hoc schemes are close to perfect, and the deployed ones were tuned for exactly these.

- SynthID-Image evaluates 30 "basic" transformations chosen by "accessibility and detectability": "Rotations, flips, brightness changes, etc. are all very accessible on every smartphone camera or social media app. This also includes Instagram-like filters ... or overlaying texts and logos" (Sec. 4)
    - result: aggregated worst case "99.72% TPR at 0.1% FPR"; combinations of transforms, "the most challenging setting", "98.06% TPR" (Table 1)
    - they criticize academic evaluations: "none of these works are exhaustive"; "GaussianShading ... misses rotations and flips; StableSignature ... and WAVES ... ignore various noise types"; and evaluating each transform with its own threshold gives "overly optimistic robustness evaluations"
    - cost: a human study found SynthID-O "creates newly visible artifacts in at least 5% of images"; hard cases are "grayscale photographs, sketches or close-to-uniform color images"
- [WAVES: Benchmarking the Robustness of Image Watermarks](https://arxiv.org/abs/2401.08573), Bang An, Mucong Ding, Tahseen Rabbani, Aakriti Agrawal, Yuancheng Xu, Chenghao Deng, Sicheng Zhu, Abdirisak Mohamed, Yuxin Wen, Tom Goldstein, Furong Huang, ICML 2024
    - Tree-Ring, Stable Signature, StegaStamp: "All three watermarks maintain a relative robustness against distortions"
- [Vanishing Watermarks](https://arxiv.org/abs/2602.20680) (below) reports bit accuracy after JPEG quality 50 of 92.5% (StegaStamp), 94.7% (TrustMark), 96.4% (VINE-R)

Screenshots and re-upload to platforms are the weak spot of the evidence, not of the schemes.

- a screenshot is a resize plus re-encode plus possible UI overlay; the deployed schemes train on each piece, but I found no paper that tests actual screenshots of AI watermarks on phones or browsers
    - the one screenshot-specific scheme, [ScreenMark](https://arxiv.org/abs/2409.03487), Xiujian Liang et al., arXiv 2024, targets screen content leakage, not AI provenance, and was tested on "100,000 screenshots from various devices"
    - the classic result that learned marks survive print-and-photograph is [StegaStamp](https://arxiv.org/abs/1904.05343), Matthew Tancik, Ben Mildenhall, Ren Ng, CVPR 2020 ("robust to image perturbations approximating the space of distortions resulting from real printing and photography")
    - Adobe's position piece [Durable Content Credentials](https://contentauthenticity.org/blog/durable-content-credentials), Content Authenticity Initiative, 2024, claims a watermark "can survive rebroadcasting efforts like screenshotting, pictures of pictures, or re-recording of media" but gives no measurement
- re-upload to a social platform is simulated (JPEG, resize) in every benchmark; no paper I found uploaded watermarked images to real platforms and re-downloaded them
    - OpenAI's own guidance hints at the limits: "For images, avoid cropping the image or converting it to another file format" ([Verify OpenAI-generated content](https://openai.com/research/verify/), read via the Wayback Machine capture of May 2026)
- audio is worse: [SoK: How Robust is Audio Watermarking in Generative AI models?](https://arxiv.org/abs/2503.19176), Yizhu Wen, Ashwin Innuganti, Aaron Bien Ramos, Hanqing Guo, Qiben Yan, arXiv, Mar 2025 (22 schemes, 9 reproduced, 22 attack types)
    - "none of the surveyed schemes can withstand all tested distortions"
    - "Key Finding 1: All watermark schemes are vulnerable to pitch shift attacks"; "Key Finding 6: Most watermarks are vulnerable to physical re-recording"; "Key Finding 7: All watermarks are vulnerable to far-distance re-recording"; "Key Finding 10: ... VC models ... bringing the recovery rate down to approximately 50%, comparable to a random guess"

## Attacks

### Removal

The pattern since 2023: anything that re-synthesizes the content from a compressed description (a diffusion model, a VAE, a speech enhancer, a voice converter) wipes marks that live in pixels or samples. Semantic marks resist that but fall to latent-space attacks.

- [Invisible Image Watermarks Are Provably Removable Using Generative AI](https://arxiv.org/abs/2306.01953), Xuandong Zhao, Kexun Zhang, Zihao Su, Saastha Vasan, Ilya Grishchenko, Christopher Kruegel, Giovanni Vigna, Yu-Xiang Wang, Lei Li, NeurIPS 2024
    - the original regeneration attack: "first adds random noise to an image to destroy the watermark and then reconstructs the image"; "pixel-level invisible watermarks are vulnerable"; they recommend "a shift ... from invisible watermarks to semantic-preserving watermarks"
- [Robustness of AI-Image Detectors: Fundamental Limits and Practical Attacks](https://arxiv.org/abs/2310.00076), Mehrdad Saberi, Vinu Sankar Sadasivan, Keivan Rezaei, Aounon Kumar, Atoosa Chegini, Wenxiao Wang, Soheil Feizi, ICLR 2024
    - proves "a fundamental trade-off between the evasion error rate ... and the spoofing error rate ... upon an application of diffusion purification attack" for small-perturbation marks; big-perturbation marks fall to "a model substitution adversarial attack"
- [Leveraging Optimization for Adaptive Attacks on Image Watermarks](https://arxiv.org/abs/2309.16952), Nils Lukas, Abdulrahman Diaa, Lucas Fenaux, Florian Kerschbaum, ICLR 2024
    - the attacker trains its own "surrogate keys that are differentiable"; "break all five surveyed watermarking methods at no visible degradation"; "less than 1 GPU hour to reduce the detection accuracy to 6.3% or less"
- [Watermarks in the Sand: Impossibility of Strong Watermarking for Generative Models](https://arxiv.org/abs/2311.04378), Hanlin Zhang, Benjamin L. Edelman, Danilo Francati, Daniele Venturi, Giuseppe Ateniese, Boaz Barak, ICML 2024
    - theory: given "a 'quality oracle'" and "a 'perturbation oracle'", "strong watermarking is impossible to achieve ... even in the private detection algorithm setting"; "our assumptions will likely only be easier to satisfy over time as models grow in capabilities"
- WAVES (above): regeneration "completely destructive" for Stable Signature; Tree-Ring's "TPR@0.1%FPR can drop to nearly zero" under an adversarial-embedding attack with the public VAE; "watermarking algorithms using publicly available VAEs can have their watermarks effectively removed with minimal image manipulation"
- [The Brittleness of AI-Generated Image Watermarking Techniques ... Visual Paraphrasing Attacks](https://arxiv.org/abs/2408.10446), Niyar R Barman, Krish Sharma, Ashhar Aziz, Shashwat Bajpai, Shwetangshu Biswas, Vasu Sharma, Vinija Jain, Aman Chadha, Amit Sheth, Amitava Das, arXiv 2024
    - caption the image, then image-to-image diffusion guided by the caption; "The resulting image is a visual paraphrase and is free of any watermarks"
- [Vanishing Watermarks: Diffusion-Based Image Editing Undermines Robust Invisible Watermarking](https://arxiv.org/abs/2602.20680), Fan Guo, Jiyu Kang, Qi Ming, Emily Davis, Finn Carter, arXiv, Feb 2026
    - Stable Diffusion 1.5 image-to-image on StegaStamp, TrustMark, VINE-R; guided removal leaves bit accuracy 0.0%, 0.0%, 1.6%; even unguided regeneration 7.4%, 12.8%, 24.5%; output stays close (PSNR 31.8 dB, SSIM 0.95)
    - the plain lesson: ordinary AI photo editing, which users do for fun, erases the marks as a side effect
- [Watermarks Attack Watermarks: Re-Watermarking as a Generic Removal Strategy](https://arxiv.org/abs/2605.16796), Maria Bulychev, Neil G. Marchant, Benjamin I. P. Rubinstein, arXiv, May 2026
    - "simply re-watermarking an already watermarked image reliably suppresses the original signal, without requiring gradients, surrogate models, or detection keys"; a classifier tells which scheme marked an image with accuracy "0.878-0.953"; combined, "reduces bit accuracy by at least 25% and up to 48%"
- [MarkNull: Model-Agnostic Watermark Removal in AI-Generated Images via On-Manifold Latent Manipulation](https://arxiv.org/abs/2608.10166), Jie Cao, Qi Li, Zelin Zhang, Xiaodong Wu, Lingshuang Liu, Xiangman Li, Jianbing Ni, USENIX Security 2026
    - decorrelates the latent from the initial noise; "reduces average bit accuracy to 53.14%, approaching random-guessing (50%), without perceptible image degradation"; amortized version "0.50 s/image"
    - the headline: "our attacks successfully compromise Google's SynthID-Image system while preserving high visual quality and transfer effectively to video watermarking"; I have not checked which SynthID variant and what detector access they had, worth reading
- [Removal Attack and Defense on AI-generated Content Latent-based Watermarking](https://arxiv.org/abs/2509.11745), De Zhang Lee, Han Fang, Hanyi Wang, Ee-Chien Chang, arXiv 2025
    - for PRC-style marks "indistinguishability alone does not necessarily guarantee resistance to adversarial removal"; their attack cuts the needed distortion "by up to a factor of 15×"
- [Cryptanalysis of LDPC-Based Pseudorandom Error-Correcting Codes](https://arxiv.org/abs/2512.17310), Tianrui Wang, Anyu Wang, Tianshuo Cong, Delong Ran, Jinyuan Liu, Xiaoyun Wang, USENIX Security 2026
    - the "undetectable" promise of PRC watermarks fails in practice: "our attacks can detect the presence of a watermark with overwhelming probability at a cost of 2^22 operations"; "PRC-based watermarking schemes still fail to achieve 128-bit security"
- audio
    - [AudioMarkBench](https://arxiv.org/abs/2406.06979), Hongbin Liu, Moyang Guo, Zhengyuan Jiang, Lun Wang, Neil Zhenqiang Gong, NeurIPS 2024 D&B: schemes "can be vulnerable to watermark removal including certain no-box perturbations (e.g., EnCodeC ...), black-box perturbations with sufficient quota for API queries, and white-box perturbations"; also "robustness gaps among biological sex groups (female vs male) and language groups"
    - [The Vulnerability of Neural Audio Watermarks under Speech Enhancement](https://arxiv.org/abs/2609.29040), Xincong Zhong, Shengyao Wang, Lingfeng Yao, Yihang Bao, Jinze Yu, Miao Pan, Jiang Liu, arXiv, Sep 2026: add noise, then denoise with a speech enhancer; "generative SE, which reconstructs the harmonic regions of speech while denoising, is highly destructive to watermarks" (AudioSeal, WavMark, SilentCipher, Timbre, Perth, AlignMark)
    - [How Fragile Is Your Watermark? Training-Free Structural Removal of Neural Audio Watermarks](https://arxiv.org/abs/2608.16566), Likhith Kumara, APSIPA ASC 2026: probe "where a watermark sits in the signal", then one matched attack "erases the payload (WavMark, SilentCipher, audiowmark) or removes the detection flag (AudioSeal) at high objective quality (PESQ >= 3.6)"; latent-domain marks "resist every training-free attack we apply"
- video: [VideoMarkBench](https://arxiv.org/abs/2505.21620), Zhengyuan Jiang, Moyang Guo, Kecen Li, Yuepeng Hu, Yupu Wang, Zhicong Huang, Cheng Hong, Neil Zhenqiang Gong, arXiv 2025
    - "existing video watermarking methods are broken against both watermark removal and forgery attacks in the white-box setting"; in black-box, "vulnerable to adversarial removal perturbations ... with a sufficient number of queries to the detection API and certain common removal perturbations in the no-box setting"

### Forgery (making a real photo look AI-made, or wearing a competitor's mark)

- Saberi et al. (above): "with black-box access to the watermarking method, a watermarked noise image can be generated and added to real images, causing them to be incorrectly classified as watermarked"
- [Black-Box Forgery Attacks on Semantic Watermarks for Diffusion Models](https://arxiv.org/abs/2412.03283), Andreas Müller, Denis Lukovnikov, Jonas Thietke, Asja Fischer, Erwin Quiring, CVPR 2025 oral
    - "imprints a targeted watermark into real images by manipulating the latent representation of an arbitrary image in an unrelated LDM"; works across "UNet vs DiT"; needs "only a single reference image with the target watermark"
    - reproduced on free GPUs by [Forging Tree-Ring](https://arxiv.org/abs/2609.12909), Saifur Rahman Tamim et al., arXiv, Sep 2026: "forged images 5/6, at 325-332 s per attack"
    - defenses so far: [SemBind](https://arxiv.org/abs/2601.20310), Xin Zhang et al., arXiv Jan 2026 (bind the latent code to the prompt's meaning); [Rethinking Forgery Attacks on Semantic Watermarks](https://arxiv.org/abs/2606.29807), Cheng-Yi Lee et al., ICML 2026 (forged latents show "global drift and local deformation", detect them before verification); [Towards Robust Content Watermarking Against Removal and Forgery Attacks](https://arxiv.org/abs/2604.06662), Yifan Zhu, Yihan Wang, Xiao-Shan Gao, CVPR 2026 Findings
- VideoMarkBench: "the perturbations required for forgery attacks are significantly smaller than those needed for removal attacks ... because the watermark encoder and decoder are adversarially trained to resist removal perturbations, but forgery perturbations are largely ignored during training"
- audio: [Yours or Mine? Overwriting Attacks Against Neural Audio Watermarking](https://arxiv.org/abs/2509.05835), Lingfeng Yao et al., AAAI 2026: overwrite with a forged mark so "the original legitimate watermark undetectable", "nearly 100% attack success rate" in white/gray/black-box
- why forgery matters more than removal for provenance: a removed mark means "unknown"; a forged mark means a real photo of a real event gets labeled fake, which is the deepfake defender's nightmare (the "liar's dividend" in reverse)

### Google's threat model, in its own words

- SynthID-Image Sec. 6: threats are "watermark removal (creating a false negative)", "watermark forgery (creating a false positive)", "model extraction ... secret extraction ... payload attacks"
- "Achieving perfect security is impossible; thus, we focused our efforts on making key attacks as difficult and expensive as possible"; deployed in a "proprietary setting, our main goal is to make black-box attacks computationally infeasible"; a "determined white-box adversary" is out of scope
- "Building (adversarially) robust watermarking systems remains an extremely challenging problem"; "training a perfectly robust and secure watermarking scheme may be infeasible"
- "Eventually there will be multiple versions in production ... vulnerability might be 'inherited' between versions" (Sec. 7)
- Sec. 10: "SynthID-Image alone will not solve many of the problems we set out to alleviate, including misinformation, impersonation or copyright tracking ... watermarking in itself does not solve the provenance problem"; wants "public detectability using cryptographic signatures" and better "security, particularly considering white-box threat models" for open models

## What is deployed

- Google: [SynthID](https://deepmind.google/science/synthid/), Google DeepMind
    - "The watermarks are embedded across Google's generative AI consumer products"; images and video "designed to stand up to modifications like cropping, adding filters, changing frame rates, or lossy compression"; audio from Lyria and NotebookLM "can't be altered by common modifications like adding noise, MP3 compression, or changing the speed of the track"
    - verification for the public is through chat: "upload the image, video or audio clip to your chat, and ask if it's been created or altered by Google AI"
    - [SynthID Detector](https://blog.google/technology/ai/google-synthid-ai-content-detector/), Google, May 2025: a portal "to early testers", waitlist for "Journalists, media professionals and researchers"; "Over 10 billion pieces of content have already been watermarked"; NVIDIA Cosmos videos carry SynthID; GetReal Security can detect it
    - the paper: "its corresponding verification service is available to trusted testers"; the SynthID-O model is "available through partnerships"; nothing is open source except the text watermark
- OpenAI adopted SynthID rather than building its own
    - [Verify OpenAI-generated content](https://openai.com/research/verify/), OpenAI, first archived 19 May 2026: "It looks for supported signals, including C2PA metadata and SynthID watermarks"; images and audio; "Detected signals are reliable, and false positives are rare"; a "Content Provenance API" for developers; no-signal cases include "its watermark was degraded, it came from a legacy generation model"
    - [C2PA and SynthID in ChatGPT images](https://help.openai.com/en/articles/8912793-c2pa-in-chatgpt-images), OpenAI help center, 2026 capture: "Supported images generated with ChatGPT, Codex, and the OpenAI API include both signals"; "Supported OpenAI-generated audio include an inaudible watermark"; metadata "can sometimes be removed by platforms, editing tools, or file conversions. Watermarks ... may be more durable through some transformations. However, watermarks generally provide less context than metadata"
    - as of the SynthID-Image paper (Oct 2025) OpenAI's promised DALL-E 3 watermark "has not been released", so this is a 2026 change
    - Sora: [Launching Sora responsibly](https://openai.com/index/launching-sora-responsibly/), OpenAI, Sep 2025: "all outputs carry a visible watermark. All Sora videos also embed C2PA metadata ... and we maintain internal reverse-image and audio search tools that can trace videos back to Sora"; no invisible watermark claimed
        - the visible logo is a measurement confound: [RobustSora](https://arxiv.org/abs/2512.10248), Zhuo Wang, Xiliang Liu, Ligang Sun, arXiv Dec 2025, shows passive AI-video detectors partly learn the logo ("Sora 2 induces drops of -11 to -14 pp" when it is removed)
- Meta: [Labeling AI-Generated Images on Facebook, Instagram and Threads](https://about.fb.com/news/2024/02/labeling-ai-generated-images-on-facebook-instagram-and-threads/), Meta, Feb 2024
    - Meta AI images get "visible markers ... and both invisible watermarks and metadata"; cross-company labels use "the 'AI generated' information in the C2PA and IPTC technical standards"; "there are ways that people can strip out invisible markers"
    - the SynthID-Image paper's view in Oct 2025: Meta has "some open-source models ... but no concrete public-facing verification system yet"; Microsoft "open-sourced an image watermarking model" (InvisMark)
- Adobe: TrustMark plus fingerprints plus C2PA as "durable Content Credentials" (page above); the C2PA spec "specifies measures to make the metadata durable, or able to persist in the face of screenshots and rebroadcast attacks"
- laws pushing this
    - EU AI Act [Article 50](https://artificialintelligenceact.eu/article/50/), "Comes into force 2 August 2026": providers "shall ensure that the outputs of the AI system are marked in a machine-readable format and detectable as artificially generated or manipulated ... effective, interoperable, robust and reliable as far as this is technically feasible"
    - California SB 942, [bill text](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240SB942) (via Wayback): "operative on January 1, 2026"; covered providers (over 1,000,000 monthly users) must "make available an AI detection tool at no cost to the user" and offer manifest and latent disclosures
    - China, [Measures for Labeling AI-Generated Synthetic Content](https://www.chinalawtranslate.com/en/ai-labeling/), translation by China Law Translate, in force 1 Sep 2025: Article 5 requires "implicit labels" in "file metadata", and "Service providers are encouraged to add implicit labels to generated synthetic content in forms such as digital watermarks"; Article 6 makes platforms check metadata and label content, which is the only law I saw that puts duties on the platform side
    - [Watermarks Without Verification: AI Text Watermarking After the EU AI Act](https://arxiv.org/abs/2609.09604), Alexander Nemecek, Vipin Chaudhary, Erman Ayday, arXiv Sep 2026, argues the real failure is that "no public tool can test the deployed systems"; the same holds for images

## Has anyone measured watermarked media in the wild?

Short answer: no, for invisible watermarks. The only in-the-wild numbers are about C2PA metadata and about passive detectors.

- I found no paper, report or blog that ran a watermark detector over a web crawl, a platform sample, or a news corpus; the reason is structural, every production detector is closed (Gemini chat, the Detector portal, OpenAI verify) and rate-limited
- [GPT-Image-2 in the Wild: A Twitter Dataset of Self-Reported AI-Generated Images from the First Week of Deployment](https://arxiv.org/abs/2604.25370), Kidus Zewde, Simiao Ren, Xingyu Shen, Jiaqi Wu, Yuchen Zhou, Tommy Duong, Zikang Zhang, Ethan Traister, Kewen Xie, arXiv, Apr 2026
    - 10,217 images from X in the week after the 21 Apr 2026 release
    - "C2PA content credentials proved infeasible: Twitter's CDN strips all embedded metadata on upload, leaving every image as a bare JPEG with no EXIF, XMP, or C2PA markers"
    - X shows a "Made with AI" badge on "53.7%" of checked posts, so X reads provenance at upload and then throws the file-level signal away; most images are "served at resampled resolutions by Twitter's CDN, consistent with lossy transcoding on upload"
    - they did not test SynthID, even though OpenAI's images carried it by then; this dataset is a ready-made testbed for that
- passive-detector measurements exist and show the scale of what watermarks are supposed to cover
    - [AI-Generated Faces in the Real World: A Large-Scale Case Study of Twitter Profile Images](https://arxiv.org/abs/2404.14244), Jonas Ricker, Dennis Assenmacher, Thorsten Holz, Asja Fischer, Erwin Quiring, RAID 2024: "nearly 15 million Twitter profile pictures shows that 0.052% were artificially generated"
    - [Synthetic Politics](https://arxiv.org/abs/2502.11248), Zhiyi Chen, Jinyi Ye, Beverlyn Tsai, Emilio Ferrara, Luca Luceri, ACM Hypertext 2025: in 2024 US election tweets "approximately 12% of shared images are detected as AI-generated"
- in my opinion, a platform study like the X one, repeated across platforms with watermarked originals we generate ourselves, is the cheapest high-value paper in this area; see ideas below

## Watermark vs C2PA, and whether a watermark is evidence

- [Authenticated Contradictions from Desynchronized Provenance and Watermarking](https://arxiv.org/abs/2603.02378), Alexander Nemecek, Hengzhi He, Guang Cheng, Erman Ayday, CVPR 2026 Workshop APAI
    - "a digital asset carries a cryptographically valid C2PA manifest asserting human authorship while its pixels simultaneously carry a watermark identifying it as AI-generated, with both signals passing their respective verification checks in isolation"; needs "no cryptographic compromise, only the semantic omission of a single assertion field permitted by the current C2PA specification"
    - lab study on 3,500 images; fix is a joint check
- [AI Watermark Evidence Fails Forensic Readiness: An Empirical Evaluation](https://arxiv.org/abs/2607.16010), Saifur Rahman Tamim, Amir Labib Khan, arXiv Jul 2026 (text watermarks, but the framing transfers)
    - laws assume "watermark detection yields evidence reliable enough for courts"; SB 942 wants disclosure "permanent or extraordinarily difficult to remove"; after paraphrase "SynthID fared only slightly better at 98.3%" removal; "None of the three methods satisfy more than two of five Daubert factors"
- [Are Watermarks Bugs for Deepfake Detectors?](https://arxiv.org/abs/2404.17867), Xiaoshuai Wu, Xin Liao, Bo Ou, Yuling Liu, Zheng Qin, IJCAI 2024: watermark perturbations "are prone to overlap with the forgery signals used for detection", so marking an image can change what a passive detector says
- Google's paper agrees that watermarks need company: "we expect watermarking to be deployed alongside a metadata-based standard like C2PA" and fingerprinting, because "similarity search is more prone to false positives rather than false negatives" while watermarks fail the other way

## What remains open

- adversarial robustness: no scheme survives a motivated attacker; the deployed answer is secrecy plus fingerprint databases, which only the company can query
- forgery: semantic marks are copyable; post-hoc marks are forgeable with detector access; defenses are weeks old
- public verifiability: SoK Zhao et al. ask "whether schemes with public attribution and strong robustness can be efficiently instantiated"; Google wants "public detectability using cryptographic signatures"; nothing deployed does it
- open-weight models: a watermark in an open model's decoder is removed by anyone who can fine-tune; Google: "For open models, we need to work on improving security, particularly considering white-box threat models"
- versioning and interoperability: Article 50 says "interoperable", but each vendor's detector reads only its own mark (OpenAI's page: content from "another company's model ... the tool currently does not detect"); OpenAI using SynthID is the first cross-vendor case
- partial content: "detection and handling fractional watermarks" (SynthID-Image Sec. 10) when a marked image is pasted into a collage or a video frame is cropped
- real-world survival: no public data on screenshots, messaging apps (WhatsApp, Telegram, WeChat recompress hard), platform CDNs, or print; all benchmarks simulate
- measurement: nobody knows what fraction of AI images on the web carry a working mark, or how fast marks decay as content gets reshared; and nobody outside the vendors can find out
- fairness: AudioMarkBench found "robustness gaps among biological sex groups ... and language groups"; untested for images across content types beyond Google's "grayscale photographs, sketches" note

## Research we could do

Each idea names the gap, what it builds on, the method, and the main risk. The first three fit our web-measurement background and need no vendor access beyond public verify endpoints.

1. do watermarks survive the real web? a platform-pipeline study
    - gap: every robustness number is simulated; the one real-platform observation (X strips C2PA) came as a side note
    - builds on: GPT-Image-2 Twitter dataset method; SynthID-Image's transformation list; WAVES protocol; Adobe's durability claims
    - method: generate images and audio with Gemini, ChatGPT, Meta AI (all now stamp output); post them through X, Facebook, Instagram, Reddit, TikTok, WhatsApp, Telegram, WeChat, Weibo, email, Slack; re-download; also take phone and browser screenshots; check each result with the public verifiers (Gemini chat, OpenAI verify and its API) and with open detectors (Video Seal, WAM, AudioSeal) for our own re-stamped copies; report survival per platform, per transform chain, over reshare depth
    - also check whether each platform strips, keeps or rewrites C2PA, which extends our C2PA work
    - risk: closed verifiers are rate-limited and may change; mitigate by keeping the sample small (hundreds), logging verifier versions, and using open models for the dense sweep
2. how much of the AI imagery on the web is watermarked, and what fraction is still readable
    - gap: zero in-the-wild numbers; DeGenTWeb measures LLM text share of the web, this is the image counterpart
    - builds on: DeGenTWeb crawl infrastructure; Ricker et al. and Chen et al. passive-detector pipelines; OpenAI Content Provenance API; Google's Detector portal (apply as researchers)
    - method: sample images from Common Crawl or our crawl, from news sites, and from platform feeds; first pass with a passive AI-image detector to find candidates; second pass with every verifier we can reach; estimate the share of AI images that carry (a) C2PA, (b) a readable watermark, (c) nothing; stratify by site type and by time since Article 50
    - risk: verifier access; false negatives of passive detectors bias the denominator; report bounds rather than point estimates
3. the Article 50 natural experiment
    - gap: nobody has checked whether the EU obligation changed what vendors and platforms actually ship
    - builds on: "Watermarks Without Verification" argument; our labeling-rules note; idea 2's pipeline
    - method: snapshot the same generators and platforms before and after 2 Aug 2026 (the Wayback Machine helps for pages, but for media we must generate and test ourselves); record which vendors stamp, which platforms keep C2PA, which detectors exist and their terms
    - risk: the "before" is gone for media; the study becomes a longitudinal one starting now
4. a public, versioned watermark decay benchmark built from the GPT-Image-2 X dataset and its successors
    - gap: benchmarks use synthetic distortions; real reshared copies of known-watermarked images now exist publicly
    - builds on: Zewde et al. dataset (10k OpenAI images, which carried SynthID since 2026); OpenAI verify API
    - method: for each image, query OpenAI verify; follow reposts and quote-tweets; measure how detection decays with each hop; release the per-hop results as a benchmark
    - risk: OpenAI's terms on bulk verification; X API cost
5. forgery in practice: can a real photo be made to "verify" as AI at the public endpoints?
    - gap: Müller et al. and Saberi et al. show forgery against lab detectors; nobody tried against Gemini or OpenAI verify, whose output is a single bit and whose models are secret
    - builds on: Saberi's black-box spoofing (watermarked noise added to real images); re-watermarking paper's observation that generic marks interfere; MarkNull's claim against SynthID
    - method: take SynthID-marked outputs, extract a transferable residual (average of watermarked minus regenerated pairs), add it to real photos, test at the endpoints with few queries; measure the false-positive rate achievable and the visual cost
    - risk: ethics and terms of service; coordinate disclosure with Google and OpenAI; keep query counts low
6. a joint C2PA plus watermark verifier for crawls
    - gap: Nemecek et al. show the two layers contradict; nobody has built the joint check into a measurement pipeline or measured how often contradictions occur in real content
    - builds on: Authenticated Contradictions protocol; our C2PA tooling; idea 2's data
    - method: implement the cross-layer audit; run it on crawled media; report the conflict matrix in the wild
    - risk: needs watermark readers, so it inherits the access problem; can start with open marks (Meta's) and C2PA-only states
7. what do messaging apps do to media? a transformation atlas
    - gap: SynthID-Image lists 30 transforms "readily available on personal computers or smartphones" but nobody has characterized the actual transform chains of popular apps (resize targets, JPEG quality, chroma subsampling, video re-encode settings, audio codecs)
    - builds on: SynthID-Image Sec. 4; Video Seal's codec-in-the-loop training; our measurement habits
    - method: send calibrated test media through each app and platform, infer the transform parameters from the output, publish the atlas; then plug the measured chains into WAVES, AudioMarkBench and VideoMarkBench so benchmarks test real chains
    - risk: low; mostly engineering; apps change, so the atlas needs dating
8. fractional and collage content
    - gap: SynthID-Image names "fractional watermarks" as open; WAM handles 10% regions in the lab; in the wild, AI images appear as thumbnails, memes with captions, and stills inside videos
    - builds on: Watermark Anything; VideoMarkBench aggregation strategies; idea 1's platform data
    - method: build a test set of real collage, meme and screen-recording layouts from platform samples; measure detection as a function of marked-area fraction and scale; propose aggregation rules
    - risk: again needs detectors; open models first

## Gaps in this review

- I could not read full texts for most 2026 attack papers (MarkNull, re-watermarking, speech-enhancement), only abstracts and arXiv HTML greps; numbers quoted come from abstracts unless a section is cited
- I did not find Amazon's Titan image watermark documentation or any Midjourney, Stability or ByteDance statement; those vendors' deployment status is unknown to me
- Google's Gemini image-verification product pages returned 404 or JS-only, so the "ask Gemini" quote comes from the SynthID landing page only
- a ChatGPT (Extra High) consultation was launched for research ideas but had not returned when this note was written; if it returns, its points should be added here, marked as ChatGPT's opinion
