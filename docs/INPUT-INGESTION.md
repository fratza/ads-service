# Advertisement input ingestion

Advertisement requests enter through a single normalization and validation pipeline. The
canonical request shape is `AdvertisementRequestInput`; source-specific fields do not leak
into rendering or persistence logic.

## Supported sources

- **Form** — the Angular intake submits an ingestion envelope with `source: "form"`.
- **Import** — CSV and JSON files are previewed and normalized before batch creation.
  Valid records are created immediately. Incomplete records are prefilled into the form for
  review.
- **API** — trusted systems submit the same ingestion envelope with `source: "api"` and an
  `x-api-key` header.

Every newly created request records its source, receipt time, optional provider/external ID,
and idempotency key under `ingestion`.

## API submission

Set `ADVERTISEMENT_INGESTION_API_KEY` on the server, then submit:

```http
POST /api/advertisement-requests
Content-Type: application/json
x-api-key: <configured key>
```

```json
{
    "input": {
        "dealerNumber": "515SSD",
        "dealerEmail": "dealer@example.com",
        "businessName": "Example Dealer",
        "generalAdLength": 20,
        "hasLogo": true,
        "likesCurrentWebsite": true,
        "highlights": "",
        "fileShareLink": "",
        "contactInformation": {
            "website": "https://example.com",
            "phone": "",
            "address": "",
            "socialMedia": "",
            "generateQrCode": false,
            "included": ["website"]
        },
        "outsideAd": {
            "enabled": false,
            "length": null,
            "contactOptions": [],
            "messages": []
        },
        "insideAd": {
            "enabled": false,
            "length": null,
            "contactOptions": [],
            "messages": []
        },
        "verticalAds": {
            "enabled": false,
            "quantity": 0,
            "contactOptions": [],
            "variations": []
        },
        "assets": [],
        "status": "ready"
    },
    "context": {
        "source": "api",
        "provider": "crm",
        "externalId": "CRM-1042"
    },
    "idempotencyKey": "crm:CRM-1042:v1"
}
```

Repeating a successful request with the same idempotency key returns the existing request
with `"duplicate": true`.

## Import endpoints

- `POST /api/advertisement-requests/imports/preview` accepts `{ "records": [...] }` and
  returns normalized records plus field-level issues.
- `POST /api/advertisement-requests/imports` accepts up to 100 records and returns a result
  per record. Mixed-success batches use HTTP `207`.

CSV headers may use readable names such as `Dealer Number`, `Dealer Email`,
`Business Name`, and `Outside Messages`. Multiple messages in one CSV cell can be separated
with `|`, semicolons, or new lines. JSON imports may contain a single record, an array, or a
`{ "records": [...] }` envelope.
