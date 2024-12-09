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

[1733499304.jpg]: https://github.com/user-attachments/assets/d9504a4b-8b46-4b66-bb09-9518305a341d
[bafybeiaq7b5fyime2l3lb6niajrmksfipe26r2rycxius3twog7vcarjma.jpg]: https://github.com/user-attachments/assets/0a561df7-272d-40ab-9990-17cd620b4752
