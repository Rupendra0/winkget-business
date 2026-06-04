require("dotenv").config();
const { connectDatabase } = require("./config/db");
const VendorProduct = require("./models/VendorProduct");

async function main() {
  await connectDatabase();
  console.log("Connected to DB");
  const products = await VendorProduct.find({}).lean();
  console.log("Found products count:", products.length);
  for (const product of products) {
    console.log({
      id: product._id,
      vendor: product.vendor,
      productName: product.productName,
      price: product.price,
      storePlacement: product.storePlacement,
      status: product.status
    });
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
