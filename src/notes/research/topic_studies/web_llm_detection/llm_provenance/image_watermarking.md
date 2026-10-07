# Watermarking AI-generated images, audio and video

(authored by agents unless marked 🧑)

Work in progress as of 6 Oct 2026. Sections are being filled in.

## Scope and short answer

This note covers invisible watermarks that AI companies stamp on generated images, audio and video so a detector can later say "this came from our model". Sibling notes cover C2PA metadata and text watermarks; here I only point to them where the two interact.

My short take after reading the literature:

- The schemes themselves are mature enough that Google claims it has stamped "over ten billion images and video frames" with SynthID-Image, and the benign-robustness numbers (JPEG, resize, crop, filters) are near 100%.
- Robustness to *adversaries* is a different story. Every public scheme has been broken by regeneration through a diffusion model, by re-watermarking, or by forgery. The deployed systems admit this and rely on keeping the model secret.
- Nobody outside the companies can measure watermarks in the wild, because the detectors are closed. I found no published study that scanned the web or a social platform for watermarked media. That is the biggest hole, and the one closest to the human's DeGenTWeb line of work.

## Collected sources (to be organized)

### Surveys and systematizations

- [SoK: Watermarking for AI-Generated Content](https://arxiv.org/abs/2411.18479), Xuandong Zhao, Sam Gunn, Miranda Christ, Jaiden Fairoze, Andres Fabrega, Nicholas Carlini, Sanjam Garg, Sanghyun Hong, Milad Nasr, Florian Tramer, Somesh Jha, Lei Li, Yu-Xiang Wang, Dawn Song, IEEE S&P 2025
    - defines the properties: "Robustness refers to the watermark's ability to withstand watermark removal attacks" (Sec. 3.3); "A watermark is unforgeable if ... it be computationally infeasible for an attacker without knowledge of an embedding key to produce watermarked content" (Sec. 3.4); "A watermarking scheme is undetectable if it is computationally infeasible to distinguish between the output distributions of the original model and the watermarked model without the keys" (Def. 3.3)
    - splits image schemes into "post-processing methods" that "embed watermarks into images after they have been generated" and "in-processing methods" that "directly influence the generative model or the sampling process itself" (Sec. 6.2)
    - open problem they flag: "It remains open whether schemes with public attribution and strong robustness can be efficiently instantiated" (Sec. 7)
    - adoption problem: "For watermarking to be universally effective ... it requires widespread adoption by all organizations offering generative AI services" (Sec. 7)

### The deployed system: SynthID-Image

- [SynthID-Image: Image watermarking at internet scale](https://arxiv.org/abs/2510.09263), Sven Gowal, Rudy Bunel, Florian Stimberg, David Stutz, Guillermo Ortiz-Jimenez, ... Pushmeet Kohli (26 authors, Google DeepMind), arXiv, Oct 2025
    - abstract: "SynthID-Image has been used to watermark over ten billion images and video frames across Google's services and its corresponding verification service is available to trusted testers"
    - post-hoc, not in-generation: the "watermark is applied on top of the AI-generated content using an encoder, not as part of the generation process" (Sec. 2.2); the external variant "SynthID-O can encode 136-bit payloads within 512×512 pixel images"
    - threat model (Sec. 6.1) lists "watermark removal (creating a false negative)", "watermark forgery (creating a false positive)", and "model extraction ... secret extraction ... payload attacks"
    - honest about the limit: "Achieving perfect security is impossible; thus, we focused our efforts on making key attacks as difficult and expensive as possible" (Sec. 6.2); "Building (adversarially) robust watermarking systems remains an extremely challenging problem"; "training a perfectly robust and secure watermarking scheme may be infeasible"
    - their security story is secrecy: deployed in a "proprietary setting, our main goal is to make black-box attacks computationally infeasible"; a "determined white-box adversary" is out of scope
    - benign robustness: 30 transformations incl. "resizing or cropping, quantization and compression, or common image processing filters"; worst-case aggregate "99.72% TPR at 0.1% FPR", combinations "98.06% TPR" (Table 1)
    - visible-artifact rate from a human study: SynthID-O "creates newly visible artifacts in at least 5% of images"
    - hard cases: black-and-white images, logos, pixel art, sparse drawings, "rarely included in standard vision datasets" (Sec. 3)
    - versioning: "Eventually there will be multiple versions in production ... vulnerability might be 'inherited' between versions" (Sec. 7)

### Benchmarks of robustness

- [WAVES: Benchmarking the Robustness of Image Watermarks](https://arxiv.org/abs/2401.08573), Bang An, Mucong Ding, Tahseen Rabbani, Aakriti Agrawal, Yuancheng Xu, Chenghao Deng, Sicheng Zhu, Abdirisak Mohamed, Yuxin Wen, Tom Goldstein, Furong Huang, ICML 2024
    - tests Tree-Ring, Stable Signature, StegaStamp as "three major watermarking types: in-processing via model modification, in-processing via random seed modification, and post-processing"
    - "All three watermarks maintain a relative robustness against distortions" (plain JPEG, crop, blur etc.)
    - but regeneration through a diffusion model or VAE kills them: for Stable Signature "regeneration attacks are completely destructive"; for Tree-Ring "a single regeneration such as Regen-Diff and Regen-VAE can significantly harm the TPR@0.1%FPR while maintaining reasonable CLIP-FID"
    - adversarial embedding attack on Tree-Ring: "TPR@0.1%FPR can drop to nearly zero" when the attacker has the VAE encoder
    - takeaway: "watermarking algorithms using publicly available VAEs can have their watermarks effectively removed with minimal image manipulation"

### Removal attacks

- [Vanishing Watermarks: Diffusion-Based Image Editing Undermines Robust Invisible Watermarking](https://arxiv.org/abs/2602.20680), Fan Guo, Jiyu Kang, Qi Ming, Emily Davis, Finn Carter, arXiv, Feb 2026
    - tests StegaStamp, TrustMark, VINE-R with Stable Diffusion 1.5 image-to-image
    - bit accuracy after JPEG-50: 92.5%, 94.7%, 96.4%; after guided removal: 0.0%, 0.0%, 1.6%; even unguided regeneration: 7.4%, 12.8%, 24.5%
    - regenerated images stay close to the originals (PSNR 31.8 dB, SSIM 0.95)
    - "even the most advanced current watermarking techniques fail to survive these generative transformations"
- [Watermarks Attack Watermarks: Re-Watermarking as a Generic Removal Strategy](https://arxiv.org/abs/2605.16796), Maria Bulychev, Neil G. Marchant, Benjamin I. P. Rubinstein, arXiv, May 2026
    - "simply re-watermarking an already watermarked image reliably suppresses the original signal, without requiring gradients, surrogate models, or detection keys"
    - a classifier identifies which scheme watermarked an image with accuracy "0.878-0.953"; identification plus re-watermarking "reduces bit accuracy by at least 25% and up to 48%"

### Forgery attacks

- [Black-Box Forgery Attacks on Semantic Watermarks for Diffusion Models](https://arxiv.org/abs/2412.03283), Andreas Müller, Denis Lukovnikov, Jonas Thietke, Asja Fischer, Erwin Quiring, CVPR 2025 (oral)
    - target Tree-Rings and Gaussian Shading, which live in the initial noise of the diffusion process
    - the "imprinting" attack "manipulat[es] the latent representation of an arbitrary image in an unrelated LDM to get closer to the latent representation of a watermarked image"; works across "UNet vs DiT"
    - attacker needs "only a single reference image with the target watermark"
    - consequence: anyone can make a real photo look like it came from the watermarked model, which also breaks watermarks as evidence

### Watermark vs C2PA interplay

- [Authenticated Contradictions from Desynchronized Provenance and Watermarking](https://arxiv.org/abs/2603.02378), Alexander Nemecek, Hengzhi He, Guang Cheng, Erman Ayday, arXiv, Mar 2026
    - "a digital asset carries a cryptographically valid C2PA manifest asserting human authorship while its pixels simultaneously carry a watermark identifying it as AI-generated, with both signals passing their respective verification checks in isolation"
    - needs "no cryptographic compromise, only the semantic omission of a single assertion field permitted by the current C2PA specification"
    - lab study on 3,500 images, not in-the-wild

