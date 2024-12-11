# C2PA Camera Apps Investigation

"Click" and "Capture Cam" in [Peripheral Literature for
C2PA](peripheral_literature.html#c2pa-implementation).

| Photo taken w/ Click | Photo taken w/ Capture Cam                                        |
| -------------------- | ----------------------------------------------------------------- |
| [1733499304.jpg]     | [bafybeiaq7b5fyime2l3lb6niajrmksfipe26r2rycxius3twog7vcarjma.jpg] |

## Signers and public key

<details><summary>
Click issued a certificate through ContentSign for me, presumably by
adding a reference on the blockchain.
</summary>

```sh
$ c2patool --certs 1733499304.jpg | openssl x509 -text -noout
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 7991087401548139538 (0x6ee60ba732604c12)
        Signature Algorithm: ecdsa-with-SHA256
        Issuer: CN=Click Camera, O=ContentSign by Nodle
        Validity
            Not Before: Dec  6 15:31:26 2024 GMT
            Not After : Dec  6 15:31:26 2025 GMT
        Subject: CN=0xF0Ed23507BC598b1eA0FdB7c31517B26538829F9, O=Click Camera
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (256 bit)
                pub:
                    04:ad:da:20:bd:92:b7:95:e9:7c:82:0f:51:b6:79:
                    6b:35:4c:44:27:d1:04:83:f8:fa:10:84:40:8c:b1:
                    73:35:75:f8:59:1b:d9:f6:7a:ab:be:7d:90:21:4d:
                    c0:98:40:fd:5c:3a:ab:bf:48:5b:08:7d:2b:f7:3e:
                    87:3a:7b:f2:63
                ASN1 OID: prime256v1
                NIST CURVE: P-256
        X509v3 extensions:
            X509v3 Basic Constraints: 
                CA:FALSE
            X509v3 Key Usage: critical
                Digital Signature, Key Encipherment
            X509v3 Extended Key Usage: 
                TLS Web Client Authentication, E-mail Protection
            X509v3 Subject Key Identifier: 
                13:5D:2D:9D:71:F0:A5:D5:17:41:0E:79:29:C5:2C:35:13:1F:46:DC
            X509v3 Authority Key Identifier: 
                keyid:4C:F9:B3:FD:D5:E6:6B:C3:0D:EB:2C:0E:53:AF:2B:22:30:B5:DA:0F
                DirName:/O=Click App/CN=Click App ContentSign CA 1
                serial:8C:DF:B9:CC:33:D1:F8:58:97:28:5C:95:14:C5:38:2D:CF:80:63
    Signature Algorithm: ecdsa-with-SHA256
    Signature Value:
        30:46:02:21:00:8a:72:fe:22:a4:67:84:20:b8:90:e7:b9:2a:
        36:b2:4a:bf:5d:f8:1a:56:f8:89:30:82:b8:0f:ab:6a:4a:ae:
        c2:02:21:00:92:e4:ef:6f:2f:41:a0:54:81:19:f9:89:f1:3c:
        ea:02:ef:11:4f:4b:0d:02:a6:68:6e:e3:72:14:63:fe:6e:81
```

</details>

- must have how changed C2PA verify works

<details><summary>
Capture Cam seems to reuse its own pubkey w/ certificate issued by DigiCert.
</summary>

```sh
$ c2patool --certs bafybeiaq7b5fyime2l3lb6niajrmksfipe26r2rycxius3twog7vcarjma.jpg | openssl x509 -text -noout
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            0c:59:4a:96:f5:77:2e:e9:55:f3:02:4b:21:98:82:86
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: C=US, O=DigiCert Inc, OU=www.digicert.com, CN=DigiCert Assured ID Client CA G2
        Validity
            Not Before: Feb 26 00:00:00 2024 GMT
            Not After : Feb 26 23:59:59 2025 GMT
        Subject: organizationIdentifier=NTRTW-82885990, C=TW, ST=Taipei City, O=Numbers Co., Ltd., SN=Chen, GN=Bofu, CN=Bofu Chen
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (384 bit)
                pub:
                    04:c2:4e:fc:1a:84:99:0c:4e:43:03:40:87:ed:86:
                    96:a6:ed:14:22:99:dd:b6:86:e5:98:a1:30:6f:e0:
                    25:7d:71:08:78:86:ff:7e:68:d3:1d:a3:ac:43:67:
                    90:3e:dd:de:49:d1:5f:64:0e:92:7e:48:17:d2:ce:
                    cb:f2:a2:b1:e8:fd:08:81:78:6e:49:2c:b6:45:0b:
                    e5:a7:16:d4:87:ef:39:fd:e0:c3:1b:de:61:73:7b:
                    81:58:ec:bc:f5:d6:65
                ASN1 OID: secp384r1
                NIST CURVE: P-384
        X509v3 extensions:
            X509v3 Authority Key Identifier: 
                A5:62:20:50:DC:BB:5B:57:97:AD:23:8F:35:E2:54:6C:A9:7E:F9:4E
            X509v3 Subject Key Identifier: 
                93:E5:50:21:D4:38:61:0C:C0:15:E3:17:BF:19:52:F6:96:FE:7F:D8
            X509v3 Subject Alternative Name: 
                email:hi@numbersprotocol.io
            X509v3 Certificate Policies: 
                Policy: 2.23.140.1.5.3.1
            X509v3 Key Usage: critical
                Digital Signature, Key Agreement
            X509v3 Extended Key Usage: 
                E-mail Protection
            X509v3 CRL Distribution Points: 
                Full Name:
                  URI:http://crl3.digicert.com/DigiCertAssuredIDClientCAG2.crl
                Full Name:
                  URI:http://crl4.digicert.com/DigiCertAssuredIDClientCAG2.crl
            Authority Information Access: 
                OCSP - URI:http://ocsp.digicert.com
                CA Issuers - URI:http://cacerts.digicert.com/DigiCertAssuredIDClientCAG2.crt
    Signature Algorithm: sha256WithRSAEncryption
    Signature Value:
        84:f6:67:53:cf:04:ee:05:8c:78:26:e1:2a:b4:66:39:e5:86:
        60:0e:b8:dc:61:a3:83:86:2f:37:c1:39:26:df:3c:27:69:f0:
        73:e2:0b:14:18:9c:16:78:58:75:10:c2:1e:71:2a:e1:41:73:
        5c:04:2f:65:ec:a8:d7:d6:d5:7e:42:fa:9b:07:0a:5e:df:06:
        14:50:52:8e:73:6f:12:58:ea:e9:10:2d:3c:93:ca:dd:2d:a7:
        36:ff:1d:1a:4a:ab:01:98:97:de:37:a8:e4:58:78:d6:ea:77:
        be:9f:00:92:1b:da:4d:e6:1e:c5:88:72:5e:9b:61:26:10:3f:
        3d:67:26:35:4f:10:ef:e4:29:3d:5a:e2:72:d1:74:17:b3:a4:
        21:b7:a9:87:79:1c:c8:cb:a2:7c:f4:2c:43:45:fe:67:f3:06:
        a2:66:1d:c0:72:1f:2e:88:90:f2:5d:a8:29:73:9b:04:57:a4:
        b3:5d:ba:da:f1:ea:5d:cb:99:28:8b:72:22:5c:93:8f:f3:18:
        a5:09:5d:1a:06:2f:47:cb:c9:4d:b7:70:b2:98:6a:92:19:6c:
        94:27:24:10:c7:1a:a1:ff:93:e8:f3:73:75:09:24:bc:98:41:
        f7:c1:85:d1:76:45:fc:71:1e:bd:0e:3f:fa:32:0e:c6:b8:b5:
        9e:fc:b2:cb
```

</details>

- probably sign after upload, same as Photoshop
- single point of failure

## Verify

"Verify" page is happy w/ both photo

`c2patool` by default is happy w/ both photo

`c2patool` not happy w/ Click photo after supplying
[Verify known certificate trust
list](https://github.com/contentauth/c2pa-rs/blob/main/cli/docs/usage.md#using-the-verify-known-certificate-list),
but happy w/ Capture Cam photo

<details><summary>Command output w/ my fork w/ select extra logging.</summary>

```sh
$ export C2PATOOL_TRUST_ANCHORS='https://contentcredentials.org/trust/anchors.pem'
$ export C2PATOOL_ALLOWED_LIST='https://contentcredentials.org/trust/allowed.sha256.txt'
$ export C2PATOOL_TRUST_CONFIG='https://contentcredentials.org/trust/store.cfg'

$ RUST_LOG=trace cargo r -- 1733499304.jpg trust
[2024-12-10T23:33:09Z DEBUG c2patool] Using trust anchors from Url(Url { scheme: "https", cannot_be_a_base: false, username: "", password: None, host: Some(Domain("contentcredentials.org")), port: None, path: "/trust/anchors.pem", query: None, fragment: None })
[2024-12-10T23:33:09Z DEBUG c2patool] Using allowed list from Url(Url { scheme: "https", cannot_be_a_base: false, username: "", password: None, host: Some(Domain("contentcredentials.org")), port: None, path: "/trust/allowed.sha256.txt", query: None, fragment: None })
[2024-12-10T23:33:09Z DEBUG c2patool] Using trust config from Url(Url { scheme: "https", cannot_be_a_base: false, username: "", password: None, host: Some(Domain("contentcredentials.org")), port: None, path: "/trust/store.cfg", query: None, fragment: None })
[2024-12-10T23:33:09Z TRACE c2pa::cose_validator] verify_cose: cert_check=true
[2024-12-10T23:33:09Z TRACE c2pa::cose_validator] check_cert: Extended key usage=ExtendedKeyUsage { any: false, server_auth: false, client_auth: true, code_signing: false, email_protection: true, time_stamping: false, ocsp_signing: false, other: [] }
[2024-12-10T23:33:09Z TRACE c2pa::cose_validator] check_trust: signing_time_epoc=Some(1733499285)
[2024-12-10T23:33:09Z TRACE c2pa::openssl::openssl_trust_handler] verify_trust: allowed_list={"igPZ4cQ+ElHb3Jagyp4o4LMVwkBicDWpm+oVuT9ctx0=", "QyrjnZlBhV+F2xAeNsb30KgVqD4QAQ+00rUtIfdXIzo=", "Z2O9JqjrmFVXI61XVcNlsodMzG1466HYQVyf+BkfWD8=", "5Obdx/KBgUxCpnrN1FVKm8TxKCGVUeJaFN7jh09SnOA=", "xXs/IWgBBAatf7AEbsXZNwgiV2zViVZFqbtqFgc0uXA=", "9heOFnvHjLz/iSNA37kqvnA40LDfSnr0UnyqZUECx7w=", "ad8hM2xz531vByVp8Hovpqv78qY0zV9zrLnRTYYdxB0=", "K9mtOEK4IaaomtzodP9jNUKxeWXb/VmZnYg7wCGG7r0=", "9qobPTVKRcOkldyUHSqN47xQN/V8tWrnW15DlUEco14=", "MFcAt2slSc/tA2sbjMNYRu26khsUmjqZ4xaQ+pfw4eI=", "SwJmKrvd0a561mMCdmrEhSGIj9tda8HjaTsTy8CCjRo=", "U2h3hfYy4GRIk7KCpu819C3nLko6A/NRn5xND2jYIng=", "vLyqdFQcIV1wOdjZvMD9rAQnvcrtOgjRRjxOF7HcyIw=", "fPAhO8QbeH8RUyk2673iIIoNFor6tZi8Fsshu07ieHI=", "AVVAhHuItD0yCby1WTAOFQOGPwiXwsgvTVbc/vlpSK0=", "rAnk74zT9+yxSkgHRFbaMC7mi/FprjBvnaeFGAroSac=", "o6uXNf1TKvSiNUL15CTvrGpfKEjCxpYrawNpYrfpkxc=", "J3TPotkZdPCd2iOdX4wmkudA821oz621eT/CAT2Zasc=", "UkQdwe7X8cO+Pj1Sb+VXxqkozHwXgC5YEqeiM42eA9w=", "czGRID6tAPpW8H+BtsxRZ38Y1cSRqebzg+MCjpBT1f4=", "OVkKb9nszYa6YpVdVfOEv481CrHaeaRnTbXM7zQC5KA=", "mfYmsZ1px3Bo+ZUvcttATyzVa9Pj8nNtHzsj99JgLwE=", "jko53/VSR3DMMb1nWmNx2+C+eh4U6CMV3BCw6tOgEVE=", "Jcv4yjJRVoH3zT76I7PzNY4cGDsT+jKNfRwu+mDLrpA=", "r8Ozpwn+U+j6fjWGiikhChvVXhGFZuMjyxgJq2S53EM=", "h72o9aSy/NjDN4dD8xdtlX28dm4c0ERupBgVuKCCltw=", "qskM23c5D9ZOelxRn8ZHfBPJVMPcpDmp53TAXUTGlVY=", "En07oVKGfm1psGJNDXqzHouLz3sjQ22uehYhHfLztQc=", "RYiv7AH1j4iSgkRM0m9CyFnvXPDZQbUTQW5C2RWlX7k=", "CaJnmoY4M0Rc4VO/v/v5diZCx/JlohwsDLm9RHOG6JI=", "28qM81MvRsS8Il4OhoYfzSQ1dnSIgepF9/553j2+MTc=", "eS7xBJoBUu4SJmCjg3gY4h1mlzwNGECqcBkaAMmlAGc=", "6wtSrm8Zm4xkIqkI9GB1lMhW90dzJVZPhOdSUL4lRTk=", "XCYKS7pr8jrDLX7NeUXrldi1pAsDm6aqovGCO4iPY0Q=", "opQNg+Qgg7MwDSY7PEcBCMpP5V9qJkF3BZp97MENFcQ=", "lVK0M1Sn1rq0KUvDqIo8/Py5MWBpb6t/T0SWgUWyWHE=", "xay/SRpiM24PoQ0V12PB8NmSdFt0X78ummtUmiUca7E=", "oAhDShFP/R0lcjRXxIaZLfLd9FrSLCmBe76XCbfssjE=", "9xnJg+oMcadqQCUtdEhBAt22rBInCbqyaaK3V3jaJmc=", "ONSIhEwHVB2K7a9RcPnBdcw2l+h4QHQLCA1OlSd7zFQ=", "QSa4RsH9d5KTNMx0WlXh+VHj5NAhcj6tHtluLmNySdM=", "I7jqB0noPFAMx3l69LFaThD+G2/WVivV8N4Z6EW/NFM="}
[2024-12-10T23:33:09Z TRACE c2pa::openssl::openssl_trust_handler] verify_trust: chain=[X509 { serial_number: "6EE60BA732604C12", signature_algorithm: ecdsa-with-SHA256, issuer: [commonName = "Click Camera", organizationName = "ContentSign by Nodle"], subject: [commonName = "0xF0Ed23507BC598b1eA0FdB7c31517B26538829F9", organizationName = "Click Camera"], not_before: Dec  6 15:31:26 2024 GMT, not_after: Dec  6 15:31:26 2025 GMT, public_key: PKey { algorithm: "EC" } }, X509 { serial_number: "8CDFB9CC33D1F85897285C9514C5382DCF8063", signature_algorithm: ecdsa-with-SHA256, issuer: [organizationName = "Click App", commonName = "Click App ContentSign CA 1"], subject: [countryName = "US", stateOrProvinceName = "California", organizationName = "ContentSign by Nodle"], not_before: Nov  7 19:26:02 2024 GMT, not_after: Nov  6 19:26:01 2029 GMT, public_key: PKey { algorithm: "EC" } }, X509 { serial_number: "A1B561309558D8ACD67233A634D6C610E18C4A", signature_algorithm: ecdsa-with-SHA384, issuer: [organizationName = "ContentSign by Nodle", commonName = "ContentSign Root CA"], subject: [organizationName = "Click App", commonName = "Click App ContentSign CA 1"], not_before: Mar  8 23:59:51 2024 GMT, not_after: Nov 17 23:23:31 2033 GMT, public_key: PKey { algorithm: "EC" } }, X509 { serial_number: "1241A148F08412DA61BDB3A67C94491AFFDFDD", signature_algorithm: ecdsa-with-SHA384, issuer: [organizationName = "ContentSign by Nodle", commonName = "ContentSign Root CA"], subject: [organizationName = "ContentSign by Nodle", commonName = "ContentSign Root CA"], not_before: Nov 20 23:23:32 2023 GMT, not_after: Nov 17 23:23:31 2033 GMT, public_key: PKey { algorithm: "EC" } }]
{
  "active_manifest": "intergalactic network inc:urn:uuid:cc50e95f-5031-44b6-917b-7c51172e67e3",
  "manifests": {
    "intergalactic network inc:urn:uuid:cc50e95f-5031-44b6-917b-7c51172e67e3": {
      "claim_generator": "Click App c2pa-rs/0.28.5",
      "claim_generator_info": [
        {
          "name": "c2pa-mini-rs",
          "version": "0.1.0"
        }
      ],
      "title": "Authentic Content",
      "format": "image/jpeg",
      "instance_id": "xmp:iid:62f2721e-af32-4b92-95e5-366032f779b3",
      "ingredients": [],
      "assertions": [
        {
          "label": "stds.schema-org.CreativeWork",
          "data": {
            "@context": "http://schema.org/",
            "@type": "CreativeWork",
            "author": [
              {
                "@type": "Person",
                "name": "0xF0Ed23507BC598b1eA0FdB7c31517B26538829F9"
              },
              {
                "@id": "https://clickapp.com/zk/account/0xF0Ed23507BC598b1eA0FdB7c31517B26538829F9",
                "@type": "Person",
                "name": "Click"
              },
              {
                "@id": "https://era.zksync.network/address/0xF0Ed23507BC598b1eA0FdB7c31517B26538829F9",
                "@type": "Person",
                "name": "Blockchain Record"
              }
            ]
          },
          "kind": "Json"
        },
        {
          "label": "com.nodle.chain",
          "data": {
            "address": "0xF0Ed23507BC598b1eA0FdB7c31517B26538829F9",
            "block_header": "0x7eff56d6f32e1dcb2e62702705e5f632fe37a2515d2265dcc80549b129796ac0"
          }
        },
        {
          "label": "stds.exif",
          "data": {
            "@context": {
              "dc": "http://purl.org/dc/elements/1.1/",
              "exif": "http://ns.adobe.com/exif/1.0/",
              "exifEX": "http://cipa.jp/exif/2.32/",
              "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
              "tiff": "http://ns.adobe.com/tiff/1.0/",
              "xmp": "http://ns.adobe.com/xap/1.0/"
            },
            "exif:GPSLatitude": "33 deg 59' 21.47 N",
            "exif:ApertureValue": "1.6",
            "exif:GPSLongitude": "118 deg 21' 16.58 W",
            "tiff:Make": "Apple",
            "exif:GPSAltitude": "0.00",
            "exif:GPSRadius": "approximate",
            "exif:FileType": "JPEG",
            "exif:DateTimeOriginal": "2024-12-06T07:34:45.0-08:00",
            "exif:FocalLength": "5.1",
            "exifEX:LensMake": "Apple",
            "exif:FileSize": "1.31 MB",
            "exif:ImageSize": "4032 x 3024",
            "exif:ExposureTime": "1/60",
            "exif:Megapixels": 12.2,
            "exif:ExposureBiasValue": "0",
            "exifEX:LensModel": "iPhone 13 mini back camera 5.1mm f/1.6",
            "tiff:Model": "iPhone 13 mini",
            "exif:ExposureProgram": 2.0
          },
          "kind": "Json"
        }
      ],
      "signature_info": {
        "alg": "Es256",
        "issuer": "Click Camera",
        "cert_serial_number": "7991087401548139538",
        "time": "2024-12-06T15:34:45+00:00"
      },
      "label": "intergalactic network inc:urn:uuid:cc50e95f-5031-44b6-917b-7c51172e67e3"
    }
  },
  "validation_status": [
    {
      "code": "signingCredential.untrusted",
      "url": "Cose_Sign1",
      "explanation": "signing certificate untrusted"
    },
    {
      "code": "general.error",
      "url": "self#jumbf=/c2pa/intergalactic network inc:urn:uuid:cc50e95f-5031-44b6-917b-7c51172e67e3/c2pa.signature",
      "explanation": "claim signature is not valid"
    }
  ]
}

$ RUST_LOG=trace cargo r -- bafybeiaq7b5fyime2l3lb6niajrmksfipe26r2rycxius3twog7vcarjma.jpg trust
[2024-12-10T23:33:26Z DEBUG c2patool] Using trust anchors from Url(Url { scheme: "https", cannot_be_a_base: false, username: "", password: None, host: Some(Domain("contentcredentials.org")), port: None, path: "/trust/anchors.pem", query: None, fragment: None })
[2024-12-10T23:33:26Z DEBUG c2patool] Using allowed list from Url(Url { scheme: "https", cannot_be_a_base: false, username: "", password: None, host: Some(Domain("contentcredentials.org")), port: None, path: "/trust/allowed.sha256.txt", query: None, fragment: None })
[2024-12-10T23:33:26Z DEBUG c2patool] Using trust config from Url(Url { scheme: "https", cannot_be_a_base: false, username: "", password: None, host: Some(Domain("contentcredentials.org")), port: None, path: "/trust/store.cfg", query: None, fragment: None })
[2024-12-10T23:33:26Z TRACE c2pa::cose_validator] verify_cose: cert_check=true
[2024-12-10T23:33:26Z TRACE c2pa::cose_validator] check_cert: Extended key usage=ExtendedKeyUsage { any: false, server_auth: false, client_auth: false, code_signing: false, email_protection: true, time_stamping: false, ocsp_signing: false, other: [] }
[2024-12-10T23:33:26Z TRACE c2pa::cose_validator] check_trust: signing_time_epoc=Some(1733680070)
[2024-12-10T23:33:26Z TRACE c2pa::openssl::openssl_trust_handler] verify_trust: allowed_list={"RYiv7AH1j4iSgkRM0m9CyFnvXPDZQbUTQW5C2RWlX7k=", "h72o9aSy/NjDN4dD8xdtlX28dm4c0ERupBgVuKCCltw=", "AVVAhHuItD0yCby1WTAOFQOGPwiXwsgvTVbc/vlpSK0=", "En07oVKGfm1psGJNDXqzHouLz3sjQ22uehYhHfLztQc=", "K9mtOEK4IaaomtzodP9jNUKxeWXb/VmZnYg7wCGG7r0=", "igPZ4cQ+ElHb3Jagyp4o4LMVwkBicDWpm+oVuT9ctx0=", "jko53/VSR3DMMb1nWmNx2+C+eh4U6CMV3BCw6tOgEVE=", "I7jqB0noPFAMx3l69LFaThD+G2/WVivV8N4Z6EW/NFM=", "MFcAt2slSc/tA2sbjMNYRu26khsUmjqZ4xaQ+pfw4eI=", "r8Ozpwn+U+j6fjWGiikhChvVXhGFZuMjyxgJq2S53EM=", "o6uXNf1TKvSiNUL15CTvrGpfKEjCxpYrawNpYrfpkxc=", "9qobPTVKRcOkldyUHSqN47xQN/V8tWrnW15DlUEco14=", "5Obdx/KBgUxCpnrN1FVKm8TxKCGVUeJaFN7jh09SnOA=", "ONSIhEwHVB2K7a9RcPnBdcw2l+h4QHQLCA1OlSd7zFQ=", "6wtSrm8Zm4xkIqkI9GB1lMhW90dzJVZPhOdSUL4lRTk=", "OVkKb9nszYa6YpVdVfOEv481CrHaeaRnTbXM7zQC5KA=", "QyrjnZlBhV+F2xAeNsb30KgVqD4QAQ+00rUtIfdXIzo=", "xay/SRpiM24PoQ0V12PB8NmSdFt0X78ummtUmiUca7E=", "U2h3hfYy4GRIk7KCpu819C3nLko6A/NRn5xND2jYIng=", "QSa4RsH9d5KTNMx0WlXh+VHj5NAhcj6tHtluLmNySdM=", "9xnJg+oMcadqQCUtdEhBAt22rBInCbqyaaK3V3jaJmc=", "eS7xBJoBUu4SJmCjg3gY4h1mlzwNGECqcBkaAMmlAGc=", "Z2O9JqjrmFVXI61XVcNlsodMzG1466HYQVyf+BkfWD8=", "xXs/IWgBBAatf7AEbsXZNwgiV2zViVZFqbtqFgc0uXA=", "9heOFnvHjLz/iSNA37kqvnA40LDfSnr0UnyqZUECx7w=", "Jcv4yjJRVoH3zT76I7PzNY4cGDsT+jKNfRwu+mDLrpA=", "rAnk74zT9+yxSkgHRFbaMC7mi/FprjBvnaeFGAroSac=", "CaJnmoY4M0Rc4VO/v/v5diZCx/JlohwsDLm9RHOG6JI=", "28qM81MvRsS8Il4OhoYfzSQ1dnSIgepF9/553j2+MTc=", "lVK0M1Sn1rq0KUvDqIo8/Py5MWBpb6t/T0SWgUWyWHE=", "fPAhO8QbeH8RUyk2673iIIoNFor6tZi8Fsshu07ieHI=", "vLyqdFQcIV1wOdjZvMD9rAQnvcrtOgjRRjxOF7HcyIw=", "UkQdwe7X8cO+Pj1Sb+VXxqkozHwXgC5YEqeiM42eA9w=", "XCYKS7pr8jrDLX7NeUXrldi1pAsDm6aqovGCO4iPY0Q=", "opQNg+Qgg7MwDSY7PEcBCMpP5V9qJkF3BZp97MENFcQ=", "J3TPotkZdPCd2iOdX4wmkudA821oz621eT/CAT2Zasc=", "ad8hM2xz531vByVp8Hovpqv78qY0zV9zrLnRTYYdxB0=", "SwJmKrvd0a561mMCdmrEhSGIj9tda8HjaTsTy8CCjRo=", "czGRID6tAPpW8H+BtsxRZ38Y1cSRqebzg+MCjpBT1f4=", "oAhDShFP/R0lcjRXxIaZLfLd9FrSLCmBe76XCbfssjE=", "mfYmsZ1px3Bo+ZUvcttATyzVa9Pj8nNtHzsj99JgLwE=", "qskM23c5D9ZOelxRn8ZHfBPJVMPcpDmp53TAXUTGlVY="}
[2024-12-10T23:33:26Z TRACE c2pa::openssl::openssl_trust_handler] verify_trust: allowed_list contains cert RYiv7AH1j4iSgkRM0m9CyFnvXPDZQbUTQW5C2RWlX7k=
{
  "active_manifest": "numbersprotocol:urn:uuid:92583583-b457-4c09-bb89-756ee7951cc8",
  "manifests": {
    "numbersprotocol:urn:uuid:92583583-b457-4c09-bb89-756ee7951cc8": {
      "claim_generator": "Numbers_Protocol c2patool/0.9.9 c2pa-rs/0.35.1",
      "title": "bafybeicbxmbnzynhvoxr3x5mfly4ptc3rpeqbm7qokm4s3rbjpq6cmijsm",
      "format": "image/jpeg",
      "instance_id": "xmp:iid:bca14d74-857d-45f0-9c64-a01996492e43",
      "thumbnail": {
        "format": "image/jpeg",
        "identifier": "self#jumbf=/c2pa/numbersprotocol:urn:uuid:92583583-b457-4c09-bb89-756ee7951cc8/c2pa.assertions/c2pa.thumbnail.claim.jpeg"
      },
      "ingredients": [],
      "assertions": [
        {
          "label": "stds.schema-org.CreativeWork",
          "data": {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            "author": [
              {
                "@type": "Person",
                "name": "ra25"
              }
            ],
            "identifier": "bafybeicbxmbnzynhvoxr3x5mfly4ptc3rpeqbm7qokm4s3rbjpq6cmijsm",
            "url": "https://verify.numbersprotocol.io/asset-profile/bafybeicbxmbnzynhvoxr3x5mfly4ptc3rpeqbm7qokm4s3rbjpq6cmijsm",
            "locationCreated": "34.021771068073, -118.290588268337",
            "dateCreated": "2024-12-08T17:46:21Z"
          },
          "kind": "Json"
        },
        {
          "label": "c2pa.actions",
          "data": {
            "actions": [
              {
                "action": "c2pa.opened",
                "digitalSourceType": "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture"
              }
            ]
          }
        },
        {
          "label": "numbers.assetTree",
          "data": {
            "assetTreeCid": "bafkreifitnkbzucemuguagkc4zxg3ywvenaqbheqo4joepwxonc35ckphe",
            "assetTreeSha256": "a89b541cd044650d401942e66e6de2d52341009c907712e23ed77345be894f39",
            "assetTreeSignature": "0xb95262c7947c87b5de6b26d4233eb66ca325634dec7df4729e758172231ad21b303c64c2d9073fbc1b4960a23dda9f7600ecab7b66d91548a99622e3c631c6331b",
            "committer": "0x51130dB91B91377A24d6Ebeb2a5fC02748b53ce1"
          }
        },
        {
          "label": "numbers.integrity.json",
          "data": {
            "nid": "bafybeicbxmbnzynhvoxr3x5mfly4ptc3rpeqbm7qokm4s3rbjpq6cmijsm",
            "publicKey": "ra25",
            "mediaHash": "f05977bbc4454dc596d9a1bb6b83261992fa545e26dde1716ccbcae39c85c007",
            "captureTimestamp": 1733679964
          }
        },
        {
          "label": "stds.exif",
          "data": {
            "@context": {
              "EXIF": "http://ns.adobe.com/EXIF/1.0/",
              "EXIFEX": "http://cipa.jp/EXIF/2.32/",
              "dc": "http://purl.org/dc/elements/1.1/",
              "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
              "tiff": "http://ns.adobe.com/tiff/1.0/",
              "xmp": "http://ns.adobe.com/xap/1.0/"
            },
            "EXIF:DateTimeOriginal": "2024-12-08T17:46:04Z",
            "EXIF:GPSTimeStamp": "2024-12-08T17:46:04Z",
            "EXIF:GPSLongitude": "-118.290588268337",
            "EXIF:GPSLatitude": "34.021771068073"
          },
          "kind": "Json"
        }
      ],
      "signature_info": {
        "alg": "Es384",
        "issuer": "Numbers Co., Ltd.",
        "cert_serial_number": "16414363228331548608953470346493198982",
        "time": "2024-12-08T17:47:50+00:00"
      },
      "label": "numbersprotocol:urn:uuid:92583583-b457-4c09-bb89-756ee7951cc8"
    }
  }
}
```

</details>

[1733499304.jpg]: https://github.com/user-attachments/assets/d9504a4b-8b46-4b66-bb09-9518305a341d
[bafybeiaq7b5fyime2l3lb6niajrmksfipe26r2rycxius3twog7vcarjma.jpg]: https://github.com/user-attachments/assets/0a561df7-272d-40ab-9990-17cd620b4752
