import { createClient } from "@libsql/client";

async function clearProdutos() {
  const url = process.env.TURSO_DATABASE_URL ?? "file:dev.db";
  const client = createClient({ url });
  try {
    await client.execute("DELETE FROM produtos");
    console.log("All products deleted from the 'produtos' table.");
  } catch (error) {
    console.error("Failed to delete products:", error);
  } finally {
    // Close connection if applicable
    if (typeof client.close === "function") {
      await client.close();
    }
  }
}

clearProdutos();
