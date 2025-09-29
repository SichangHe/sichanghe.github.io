# TimescaleDB (TigerDB)

## Compression

- for large text/binary field, Postgres first TOAST, then
    TimescaleDB stupidly compresses the TOAST pointer
- manually change chunk w/ `merge_chunk`, `split_chunk`,
    `convert_to_rowstore`, `convert_to_columnstore`
    - can make job to manually merge/split/compress chunk

check hypertable compression rates (not including TOAST):

```sql
SELECT
  pg_size_pretty(before_compression_total_bytes) as before,
  pg_size_pretty(after_compression_total_bytes) as after
FROM hypertable_columnstore_stats('HYPERTABLE_NAME');
```


check chunk compression rates:

```sql
SELECT
    pg_size_pretty(pg_total_relation_size(chunk_schema||'.'||chunk_name)) AS tot,
    pg_size_pretty(before_compression_total_bytes) AS tot_be4,
    pg_size_pretty(after_compression_total_bytes) AS tot_aft,
    pg_size_pretty(before_compression_table_bytes) AS tab_be4,
    pg_size_pretty(after_compression_table_bytes) AS tab_aft,
    chunk_name, range_start_integer, range_end_integer, is_compressed
FROM chunk_columnstore_stats('HYPERTABLE_NAME')
NATURAL JOIN timescaledb_information.chunks
ORDER BY range_start_integer
```
