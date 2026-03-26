const { Schema, model, models } = require("mongoose");

const userSchema = new Schema(
  {
    name: { type: String, trim: true },
    businessName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    phone: { type: String, trim: true, unique: true, sparse: true },
    passwordHash: { type: String },
    image: { type: String },
    provider: { type: String, default: "credentials" },
    role: {
      type: String,
      enum: ["admin", "vendor", "customer"],
      default: "customer",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = models.User || model("User", userSchema);
