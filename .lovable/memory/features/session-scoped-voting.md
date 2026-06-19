---
name: Session-Scoped Voting
description: Voting is tied to pelada_occurrences (daily sessions), not the recurring pelada entity. Each session has independent voting.
type: feature
---
Matches are linked to occurrences via `occurrence_id` FK on `matches` table.
When "Encerrar Pelada de Hoje" is clicked:
- An occurrence is created/upserted for today
- voting_open=true is set on ALL matches of that occurrence
- Finalize-voting groups matches by occurrence_id for aggregation
Matches without occurrence_id (legacy) are finalized individually.
Award results are stored against the first match in the session (anchor).
