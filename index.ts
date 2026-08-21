import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { confirm, input, select } from "@inquirer/prompts";
import { SearchService } from "@buf/lodgingbase_services.bufbuild_es/ota/v1/search/search_pb.js";
import { BookingService, BookingStatus } from "@buf/lodgingbase_services.bufbuild_es/ota/v1/booking_pb.js";

const transport = createConnectTransport({
  baseUrl: "https://api.lodgingbase.com",
  httpVersion: "1.1",
  interceptors: [
    (next) => (req) => {
      req.header.set("Authorization", `Bearer ${process.env.LB_TOKEN}`);
      return next(req);
    },
  ],
});

const searchClient = createClient(SearchService, transport);
const bookingClient = createClient(BookingService, transport);

const money = (m?: { value: bigint; currency: string }) =>
  m ? `${(Number(m.value) / 100).toFixed(2)} ${m.currency}` : "—";

// 1. Search — server-streaming: results arrive per supplier.
const properties = [];
for await (const res of searchClient.search({
  city: "Antalya",
  country: "TR",
  checkInDate: timestampFromDate(new Date("2026-10-01")),
  checkOutDate: timestampFromDate(new Date("2026-10-05")),
  occupancies: [{ adults: 2 }],
  maxResults: 5,
})) {
  properties.push(...res.propertyAvailabilities);
  res.errors.forEach((e) => console.warn(`! supplier: ${e.message}`));
}
console.log(`${properties.length} properties available`);

// 2. Pick a rate.
const productCode = await select({
  message: "Pick a rate",
  choices: properties.flatMap((p) =>
    p.products.map((product) => ({
      name: `${p.propertyInfo?.propertyName} — ${product.rooms.map((r) => r.roomName).join(" + ")} — ${money(product.totalPrice)}`,
      value: product.productCode,
    })),
  ),
});

// 3. Prebook — holds the rate and re-confirms the price.
const { prebookId, productAvailability } = await bookingClient.prebook({ productCode });
console.log(`Rate held — confirmed at ${money(productAvailability?.totalPrice)}`);
productAvailability?.cancelTerms?.penalties.forEach((p) =>
  console.log(`  within ${p.deadline}h of check-in: ${money(p.money)}`),
);
if (!(await confirm({ message: "Book it?" }))) process.exit(0);

// 4. Book.
const holder = {
  firstName: await input({ message: "First name", default: "John" }),
  lastName: await input({ message: "Last name", default: "Doe" }),
  email: await input({ message: "Email", default: "john@example.com" }),
  phone: await input({ message: "Phone", default: "+1234567890" }),
};
const { booking } = await bookingClient.book({ prebookId, holder, guests: [holder] });
console.log(`Booked ${booking?.bookingCode} — ${BookingStatus[booking!.bookingStatus]}`);
console.log(`Confirmation: ${booking?.confirmationCode} · Total: ${money(booking?.totalPrice)}`);
