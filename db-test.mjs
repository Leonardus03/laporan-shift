import { PrismaClient } from "@prisma/client";
import dns from "node:dns/promises";

function stripChannelBinding(u) {
  const x = new URL(u);
  x.searchParams.delete("channel_binding");
  return x.toString();
}

const variants = [
  ["pooled (apa adanya)", process.env.DATABASE_URL],
  ["direct (apa adanya)", process.env.DIRECT_URL],
  [
    "pooled tanpa channel_binding",
    stripChannelBinding(process.env.DATABASE_URL),
  ],
  ["direct tanpa channel_binding", stripChannelBinding(process.env.DIRECT_URL)],
];

for (const [label, url] of variants) {
  const host = new URL(url).hostname;
  try {
    const addrs = await dns.lookup(host, { all: true });
    console.log(
      `\n== ${label} | alamat: ${addrs.map((a) => "IPv" + a.family).join(", ")}`,
    );
  } catch (e) {
    console.log(`\n== ${label} | DNS gagal: ${e.code}`);
  }

  const prisma = new PrismaClient({ datasourceUrl: url });
  for (let i = 1; i <= 3; i++) {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log(`  percobaan ${i}: OK ${Date.now() - start}ms`);
    } catch (e) {
      const firstLine = String(e.message).split("\n").filter(Boolean).pop();
      console.log(
        `  percobaan ${i}: GAGAL ${Date.now() - start}ms | ${e.code ?? e.name} | ${firstLine}`,
      );
    }
  }
  await prisma.$disconnect();
}
