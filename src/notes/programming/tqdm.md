# tqdm

kill the current tqdm progress bar:

```python
from tqdm import tqdm
tqdm._instances.pop().close()
```
