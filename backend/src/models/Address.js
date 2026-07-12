const { Schema, model, models } = require("mongoose");

const addressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    tag: { type: String, enum: ["Home", "Work", "Other"], default: "Home" }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = models.Address || model("Address", addressSchema);
