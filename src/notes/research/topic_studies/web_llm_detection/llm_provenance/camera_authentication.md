camera and photo authentication
(authored by agents unless marked 🧑)

what a signed photo tells us

- a camera signature connects image bytes to a signing key
    - trusting the result also requires trusting the camera, its software, and its certificate
- the difficult question is what entered the camera before signing
    - an honest camera can photograph a printed fake, a screen, or a staged scene
    - inference: proving capture alone cannot prove the event described in a caption
- start with the human's [photo authentication notes](../../../photo_crypto_auth.md)
    - the caption, time, and location comparison is already the human's idea
    - proposed experiments below extend that work rather than claim it as new
- [C2PA review](c2pa.md) covers credentials, trust lists, compromised devices, and platform adoption

capture and screen photographs

- Sony combines signatures with depth information
    - Sony's [Camera Authenticity Solution](https://authenticity.sony.net/camera/en-us/), read 8 Oct 2026
    - quote: “verify whether the captured image shows an actual 3D subject or not”
    - vendor claim, not an independently measured accuracy result
    - inference: depth may distinguish a flat copy from a scene
        - a genuine flat subject, such as a document, needs different treatment
        - a staged three-dimensional scene still needs context checking
- the C2PA threat model includes attacks before signing
    - [C2PA Security Considerations 2.2, §4.2.2.1](https://spec.c2pa.org/specifications/specifications/2.2/security/Security_Considerations.html)
    - quote: “inject their own data between the lens and the camera’s CPU”
    - inference: protecting the signing key alone does not protect the full capture path
- distinguish three tests
    - signature test: did these bytes pass validation under a trusted key?
    - capture test: did the claimed sensor produce the signed image?
    - context test: does the photo support the attached caption?

proofs of permitted edits: targeted full-text comparison

- the human's [C2PA paper collection](../../../c2pa/papers.md) already lists these systems
    - this comparison uses their locally collected primary PDFs
    - a zero-knowledge proof checks a statement without revealing its private input
    - these systems check permitted edits of an authenticated input
        - they still assume a trustworthy capture or original signer
- [PhotoProof](https://doi.org/10.1109/SP.2016.23), Naveh and Tromer, IEEE S&P 2016
    - abstract: “reveals nothing about the cropped-out regions”
    - supports configurable edit rules, including crop, flip, transpose, brightness, contrast, and rotation
        - prototype implementation, §IV
    - §IV says the implementation does not include a secure camera
        - simulated camera signatures do not test sensor protection
    - §IV reports proof creation too slow for many ordinary image sizes
        - useful conceptual baseline rather than a deployment result
- [Trust Nobody](https://eprint.iacr.org/2024/1074), Della Monica et al., collected 2024 version
    - abstract: “Our 2nd construction is roughly one order of magnitude slower”
    - benchmarks crop, proportional resize, and grayscale
        - §5, not a measurement of every permitted image edit
    - first construction changes the hash and signature scheme
        - abstract reports about 41 minutes on an eight-core PC for an image described as 30 MP
        - this is not the speed of the C2PA-compatible construction
    - second construction keeps SHA256 and ECDSA
        - §5.2 reports about 18 seconds per 2,666-pixel tile and 4.2–4.3 GB proving memory
        - one-time setup uses about 14.7 GB
    - privacy aims to conceal the original image
        - a collection of tile proofs permits a short proof showing an invalid tile
        - proof size and total verification work depend on tiling
- [VerITAS](https://eprint.iacr.org/2024/1066), Datta, Chen, Boneh, collected full version
    - abstract: “proof verification time is about 2 seconds in the browser”
    - implements crop, box blur, resize, and grayscale
        - §6.2
    - abstract reports a 90 MB image under an hour for the lightweight signer mode
        - about $2.42 on AWS in the authors' setup
    - stronger signer mode reports under five minutes and about $0.09
        - changes signer computation, not just editor hardware
    - original pixels removed by edits remain private
        - §3 assumes attackers cannot extract the camera key or cause signing of non-camera input
    - §1 says deployed cameras would need its new signing method
        - C2PA motivation does not establish compatibility with every existing signed JPEG
- [VIMz](https://eprint.iacr.org/2024/1063), Dziembowski, Ebrahimi, Hassanizadeh, collected 2024 version
    - §III: “the original image captured by the camera is untampered”
        - its explicit capture assumption
    - implements crop, resize, contrast, brightness, grayscale, sharpness, and blur
        - §IV
    - Table IV reports HD-to-SD resize proof generation in 187 seconds on its laptop
        - 2.5 GB peak memory
        - crop takes 914.5 seconds with 3.2 GB
        - the crop implementation uses a slower fallback after a compiler-generated program fails
    - §VI reports verification below one second on the laptop
    - private pixels are hidden while input and output commitments connect the edits
        - §III and §IV
- comparison takeaway, our inference
    - capture trust, signing format, edit semantics, setup cost, and hardware differ
    - the quoted runtimes are not a fair speed ranking
    - reproduce one shared crop-and-resize task before choosing an implementation
    - proving an allowed crop does not establish whether the crop hides essential context

recapture attacks already appear in the cryptographic literature

- PhotoProof, appendix A, discusses “2D scene staging”
    - example: print or project fabricated content, then photograph it with a secure camera
    - proposed defenses include focus distance, range, timing, and two-camera depth
    - the same appendix explains that a sufficiently staged three-dimensional scene can pass
- VerITAS, §3, discusses “a picture-of-picture detector”
    - suggests focal length and other capture information
    - explicitly allows misleading crops even when the edit proof is correct
- statistical recapture detection is another established line
    - [Image Recapture Detection with Convolutional and Recurrent Neural Networks](https://doi.org/10.2352/ISSN.2470-1173.2017.7.MWSF-329), Li, Wang, Kot, 2017
    - bibliographic record checked through publisher-deposited Crossref metadata
    - publisher full text could not be retrieved during this pass
    - no accuracy or generalization claim is inferred from its title
- [mToFNet: Object Anti-Spoofing with Mobile Time-of-Flight Data](https://arxiv.org/abs/2110.04066), Jeong et al., inspected 2021 preprint
    - §4: pairs ordinary colour photos with measured depth
        - time of flight measures distance from the return time of emitted light
        - targets photographs of objects displayed on screens
    - authors, figure 1: “The unique patterns per display makes it challenging to develop a generalized method”
        - moiré means interference patterns from overlapping display and camera pixel grids
        - depth adds evidence about physical shape rather than relying only on those patterns
    - §4: 12,529 colour/depth pairs, 27 object categories, 16 display media
        - captured with a Samsung Galaxy Note 10
        - screen copies photographed on a tripod with lights off
        - includes projectors as well as phones, tablets, and monitors
    - table 3: 96.67% accuracy on unseen displays
        - 100% on the training display type
        - tests display transfer, not transfer to a different depth camera
    - relevance to Sony, our inference
        - measured depth for detecting screen copies already has an evaluated research baseline
        - dark-room screen results do not establish performance on sunlight, prints, flat genuine subjects, or Sony hardware
- [Domain Generalization for Document Authentication against Practical Recapturing Attacks](https://arxiv.org/abs/2101.01404), Chen et al., inspected June 2021 revision
    - §III: compares a questioned document with reference document patches
        - learns which differences resemble a second print-and-capture cycle
    - authors, §III: “recapturing traces, such as halftone and color degradation”
        - halftone means the small printed dots used to reproduce shades
        - ordinary image pixels can carry these clues without a depth sensor
    - §IV: synthetic identity and certificate templates manufactured as physical originals
        - two main datasets contain 672 and 432 images
        - tests different printers, cameras, scanners, substrates, and screen recapture
    - abstract: below 5% accepted attacks and 5.56% rejected genuine documents in its hardest cross-device, cross-document setting
        - these are separate errors, not a single accuracy score
        - comparison relies on reference samples and document structure
    - relevance to Sony, our inference
        - a real document is flat but may still have meaningful capture evidence
        - general photo verification cannot assume document references are available
- [Learning Feature Disentanglement and Dynamic Fusion for Recaptured Image Forensic](https://arxiv.org/abs/2206.06103), Miao, Zheng, and Jin, inspected 2022 preprint
    - combines separate detectors for moiré, visible device edges, reflections, and other clues
    - authors, introduction: “other recaptures (e.g., the cursor of the mouse appeared in the image)”
    - table 1: 75,000 originals and 75,000 recaptured images in the RUR dataset
    - table 2: 98.1% precision and 95.3% recall
        - precision asks how often a recapture warning is correct
        - recall asks how many recaptures receive a warning
    - limitation: the inspected four-page report does not specify train/test splitting or held-out camera/display evaluation
        - its large dataset alone does not establish transfer to unseen devices
        - our inference: visible frames and pointers may disappear when an attacker crops tightly
    - relevance to Sony, our inference
        - compare depth with ordinary visual clues on the same cases
        - success on easy visible clues should not conceal failures when only the screen content fills the image
- implication for Sony experiment
    - depth-based copy detection is not a new research concept
    - independently testing a deployed signed-camera workflow may still be useful
        - novelty of that empirical evaluation remains unverified

extension of the existing C2PA publication experiment

- use the [C2PA keep/strip/rewrite experiment](c2pa.md)
    - the camera-specific extension asks what capture evidence remains recoverable
- use photos we own with known capture credentials
    - retain originals and record the exact upload route
    - include untouched copies, ordinary edits, screenshots, and photographs of screens
- record separately
    - image bytes changed
    - credential present or recoverable
    - signature valid
    - signer trusted by the tested validator
    - interface explains what the credential proves
- compare multiple validators with recorded versions and trust lists
    - a disagreement is a result to investigate, not evidence that one tool is correct
- extension: compare the signed capture time and location with deliberately mismatched captions
    - builds on the human's existing proposal
    - use controlled examples before evaluating real accusations

second experiment: test the screen-copy claim

- requires access to Sony's supported capture and verification system
- compare screens, prints, real flat objects, and ordinary three-dimensional scenes
    - vary display brightness, angle, focus, and distance
- measure false acceptance of copies and false rejection of genuine subjects
    - report results for each condition, not one pooled accuracy
- research novelty remains unverified
    - the reviewed papers already establish depth and pixel-based recapture methods
    - check additional device-transfer work before claiming a new method

remaining scope

- independent evaluation of Sony’s deployed depth verification remains missing
    - mToFNet evaluates a different capture device and workflow
- the four collected edit-proof PDFs were compared above
    - shared-task reproduction and later versions remain unchecked
- current camera firmware, access costs, and supported models need checking before an experiment
- a compromised-camera experiment needs its own security review and equipment
    - the first publication-path experiment can proceed without it
- Extra High consultation attempted on 8 Oct 2026 for the infrastructure and provenance proposals
    - helper returned `picker_effort_not_verified` before submission
    - no ChatGPT opinion was obtained or attributed
