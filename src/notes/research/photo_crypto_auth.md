# Photo Crypto Auth

- cameras will sign photo cryptographically
- influencer have posted genuine photo but for irrelevant event
- may build system to authenticate photo

problem:

- ~~what about photo without signature?~~ don't care

steps:

1. What in photo from C2PA camera?
1. Post-processing on social media site preserve signature?
    - X remove C2PA
    - [LinkedIn display C2PA
        info](https://www.linkedin.com/help/linkedin/answer/a6282984)
1. Extract info from posts' text

## literature

### *P3: Toward Privacy-Preserving Photo Sharing*, Moo-Ryong Ra, Ramesh Govindan, Antonio Ortega, NSDI 13

split photo into public and private part, encrypt private part

### *Mitigating Image-based Misinformation Campaigns*, Calvin Ardi, Harsha V. Madhyastha

proposal:
compare photo crypto metadata time+location w/ social media post text before
manipulative post go viral. good for news. need to balance privacy

## C2PA

- nesting: manifest (metadata) > claim (wrapper) > assertion (statement)
    ![Example C2PA Manifest of a
    Photograph](https://c2pa.org/specifications/specifications/2.1/specs/_images/Photo_Manifest.svg)
- claim generator: create & sign claim
- manifest consumer, e.g., C2PA validator
- public key encryption (ECDSA/EdDSA/RSA) to sign claim; SHA-2 hash for
    hard binding of manifest & content
- modifying image invalidate previous signature, need new one: [10.3.3.2.
    Multiple Claims | Content Credentials : C2PA Technical Specification ::
    C2PA
    Specifications](https://c2pa.org/specifications/specifications/2.1/specs/C2PA_Specification.html#_multiple_claims)
    - PhotoShop seem to keep private key on cloud, see
        [Content credentials in
        Photoshop](https://helpx.adobe.com/photoshop/using/content-credentials.html)
- attack: see [Threat | C2PA Security Considerations :: C2PA
    Specifications](https://c2pa.org/specifications/specifications/1.0/security/Security_Considerations.html#_threat_spoofing_signed_c2pa_metadata_via_stolen_key)
    onward
    - steal private key/ trick claim generator/ make key → penetrate
    - security guidance: "best practice"
        - hardware security module (HSM); revoke
    - Canon signing key leak from 2010: [Analyst Finds Flaws in
        Canon Image Verification System |
        PCWorld](https://www.pcworld.com/article/499056/article-2356.html)
    - no transitive trust; probably whack-a-mole security patching
    - could add any author name during editing:
        [blog](https://hackerfactor.com/blog/index.php?/archives/1044-From-VIDA-to-SEAL.html)
- how actually done
    - [x] check out C2PA editing software
        - few options.
        - Adobe is biggest
        - PixelStream seems vaporware. blog from CAI: [Community story:
            Pixelstream](https://contentauthenticity.org/blog/community-story-pixelstream).
            but dead GitHub and website; cannot register
        - Photo Mechanic is for camera
        - Cloudinary is for content delivery
            - [x] Try after sign up: only preserve existing, do not add new;
                need to [join beta program](https://cloudinary.com/contact)
        - Microsoft Designer is not advertised
    - [x] check out C2PA image
        - [generated cat picture signed
            later](https://fotoforensics.com/analysis.php?id=b2d0ed23d2bdf3170d8a7a8ac06617569665a2b1.5429555&fmt=orig)
    - [ ] Check out C2PA SDK
- [ ] Note down potential issues
    - Removing metadata rids hard binding. Soft binding improvements?
    - Camera private key leak
    - Editing software lose track
    - Taking photo of photo
        - [ ] ❗Literatures? Difference between photo of photo and photo
            - Bad search term.
                Only found paper on distinguishing manipulated photo.
    - PKI: long term verification support?
        - [ ] ❗Literatures? Trusting signed document long term
            - [ ] Check out signed digest standard
- use case: prove my photo is real
    - news, social media
    - legal, forensic
    - artwork
    - research proof
- [ ] figure out concrete use case

## idea

- get something then reach out to C2PA people
- RGBD camera to combat taking photo of photo
