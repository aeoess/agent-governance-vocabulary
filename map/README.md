# map/

Records behind `docs/generated/systems-map.md`. Prototype, proposed, non-normative.

- `capabilities.yaml` lists roles: concrete jobs with inputs and outputs. Identifiers are local to this map.
- `projects/<id>.yaml` is owned by that project's maintainer. A description written by anyone else says so in `description_source` and stays unconfirmed until the maintainer links a confirmation.
- `edges/<id>.yaml` records one connection: both sides, the artifact, pins, limits, and what it does not establish.
- `evidence/<id>.yaml` records one run: who ran it, what the runner authored, which claims it is independent for, and any review by the map editors.
- `journeys/<id>.yaml` traces one concrete action across roles and names each gap.

Nobody edits the generated page. Change a record, then run:

    npm ci
    npm run build:map
    npm run check:map

`check:map` rejects broken references, duplicate identifiers, independence without authorship, evidence without a pin, a confirmation without a link, an edge cited for a role it does not exercise, an end-to-end result that is not an end-to-end run covering every pin on the journey, and a stale page. It does not check that any claim is true.
