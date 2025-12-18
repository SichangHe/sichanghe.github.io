# PostgreSQL

## Query optimization

- need to write query in certain ways sometimes, cannot rely on
    Postgres being smart
- source of truth: replace placeholders w/ real value, prepend `EXPLAIN`,
    run, see query plan
    - given query + plan to LLM, ask to optimize

avoid join after getting max per group:

```sql
SELECT DISCINT ON (group_key) group_key, other_columns
FROM table_name
ORDER BY group_key, column_sorted_on DESC
```
