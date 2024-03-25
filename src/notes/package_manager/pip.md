<!-- toc -->
# pip

always use `python3 -m pip` instead of `pip`

- make sure using the same pip as python
- use `python -m pip` on Windows

upgrade pip3

```
python3 -m pip install --upgrade pip
```

update all

```
python3 -m pip list --outdated --format=json \
| python3 -c "import json, sys
print('\n'.join([x['name'] for x in json.load(sys.stdin)]))" \
| grep -v '^\-e' \
| cut -d = -f 1 \
| xargs -n1 python3 -m pip install -U
```

check version

```
python3 -m pip -V
```

remove cache

```
python3 -m pip cache purge
```
