# LodgingBase TypeScript Quickstart

An interactive command-line app that searches for hotel availability, holds a rate, and confirms a
reservation using the [LodgingBase](https://lodgingbase.com) API — end to end, in one file.

Full walkthrough: **[Example Integration (TypeScript)](https://lodgingbase.com/developers/docs/tutorials/getting-started-typescript)**

```
13 properties available
? Pick a rate › Adalya Elite Lara — Standard Room — 978.00 USD
Rate held — confirmed at 978.00 USD
? Book it? yes
Booked 917232643 — CONFIRMED
Confirmation: CONF50264 · Total: 978.00 USD
```

## Run it

Requires **Node.js 20+** and a sandbox token — bookings made with it are simulated, so you can run
this as often as you like.

```bash
npm install

export LB_TOKEN="your-sandbox-token"
npm start
```

The `.npmrc` in this repo already points `@buf/*` at the Buf registry, so `npm install` pulls the
generated SDK straight from the [Buf Schema Registry](https://buf.build/lodgingbase/services) — no
proto compiler and no code generation on your side.

## What it does

| Step | Call | Carries forward |
|------|------|-----------------|
| 1 | `SearchService.Search` | `products[].productCode` |
| 2 | pick a rate | |
| 3 | `BookingService.Prebook` | `prebookId` |
| 4 | `BookingService.Book` | `bookingCode` |

Search is **server-streaming** — suppliers are queried in parallel and each responds at its own pace,
so results are consumed with `for await`. Partial supplier failures arrive in `res.errors` and are not
fatal; the results you already have are still bookable.

`productCode` and `prebookId` are long opaque signed strings. Pass them through untouched — never
parse, shorten, or display them.

## Notes

- **`BookRequest` has no payment fields.** Settlement runs against your contract, not the booking
  call, so there are no card details to collect or store here.
- **BSR versions are pinned exactly.** The registry publishes prerelease-style versions
  (`2.14.0-20260821141746-…`). Installing by name resolves the newest and writes a matching range;
  don't shorten it by hand, because a plain `^2.14.0` matches no prerelease and fails with `ETARGET`.
  Refresh with `npm install @buf/lodgingbase_services.bufbuild_es@latest`.
- `@inquirer/prompts` is only for the interactive menu — the API itself needs just
  `@connectrpc/connect`, `@connectrpc/connect-node`, `@bufbuild/protobuf`, and the SDK.

## License

MIT
