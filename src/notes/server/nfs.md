# NFS

enable nfs

```shell
systemctl enable nfs-server
```

add directory to export:
edit `etc/exports`

```text
directory_to_export ip_to_allow(rw,insecure)
```

export all specified directory

```shell
sudo exportfs -arv
```

mount on macOS

```shell
sudo mount -t nfs -v source target
```

automatically mount on macOS

1. open `/etc/fstab` with

    ```shell
    sudo vifs
    ```

1. add into the file:

    ```
    source /System/Volumes/Data/../Data/Volumes/target_name nfs rw,nolockd,resvport,hard,bg,intr,tcp,nfc,rsize=65536,wsize=65536
    ```

    - for pre-Catalina, it should be

        ```
        source /../Volumes/target_name nfs rw,nolockd,resvport,hard,bg,intr,tcp,nfc,rsize=65536,wsize=65536
        ```
