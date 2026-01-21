# Monero

- p2pool mining setup using Monero GUI: add below to `Daemon startup flags`
    in node setting (from
    <https://www.reddit.com/r/MoneroMining/comments/19dvhpg/unable_to_set_up_p2pool_node/>)

    ```sh
    --zmq-pub tcp://127.0.0.1:18083
    ```

    - save space by pruning blockchain: `--prune-blockchain`
- "couldn't connect to daemon":
    try directly running
    `/Applications/monero-wallet-gui.app/Contents/MacOS/monerod`
