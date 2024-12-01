# Peripheral Literature for C2PA

## C2PA use case

- [Community story:
    Pixelstream](https://contentauthenticity.org/blog/community-story-pixelstream),
    CAI, 2022
    - empower individual journalists to compete w/ established media by
        giving credibility
    - version control: fork image, evolution tree
- [How a voice cloning marketplace is using Content Credentials to
    fight
    misuse](https://contentauthenticity.org/blog/community-story-respeecher),
    CAI, 2024
    - they use GlobalSign as certificate authority (CA)
    - want everything to have C2PA just like HTTPS
- [How we’re increasing transparency for gen AI content with the
    C2PA](https://blog.google/technology/ai/google-gen-ai-content-transparency-c2pa/),
    Google, 2024
    - show C2PA in image search result & ad
- [Partnership on AI Unveils New Case Studies from Supporters of
    Synthetic Media Framework: Meta, Microsoft, Thorn, and
    Truepic](https://partnershiponai.org/nov-2024-synthetic-media-case-studies-announcement/)
    - [*How Truepic used disclosures to
        help authenticate cultural heritage imagery in
        conflict
        zones*](https://partnershiponai.org/truepic-framework-case-study/):
        Project Providence: gather evidence from image of attacks to Ukraine to
        prove war crime
        - rotate certificate daily "for granular invalidation"
            - [ ] how??
        - hardware-backed keystore
        - opt-in for various metadata for creator for privacy & safety
        - importance to stay secure & credible
        - future: election monitoring
        - acknowledge C2PA need to be widely adopted & problem of
            metadata removal
        - polities to come in place to mandate disclosure in AI output
        - need to display info w/o clicking
        - tiered AI content labeling, e.g., AI-generated vs AI-modified
    - [*How Microsoft and LinkedIn gave users detailed context about media on
        the professional networking
        platform*](https://partnershiponai.org/microsoft-framework-case-study/):
        - LinkedIn shows "CR" watermark by images with C2PA
        - use "synthetic media detectors" when C2PA is missing
        - technically not verify, but know signer

## Fake image detection

- [Can people identify original and manipulated photos of
    real-world scenes?](https://pmc.ncbi.nlm.nih.gov/articles/PMC5514174/),
    Springer Cognitive Research, 2017
    - people can hardly tell if and how image manipulated
- [Explaining Why Fake Photos are Fake:
    Does It Work?](https://dl.acm.org/doi/abs/10.1145/3567558), ACM HCI, 2022
    - people cannot tell if image manipulated
    - explaining manipulation does not always help

## Image metadata

- [Secret message sharing using online social
    media](https://ieeexplore.ieee.org/abstract/document/6997500), IEEE CNS,
    2014
    - hide message in pixels, survive image manipulation