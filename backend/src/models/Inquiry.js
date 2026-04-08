const { Schema, model, models } = require("mongoose");

const inquirySchema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, trim: true, required: true },
    name: { type: String, trim: true, required: true },
    phone: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true },
    message: { type: String, trim: true, required: true },
    channel: {
      type: String,
      enum: ["Web", "Email", "Phone"],
      default: "Web",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Closed"],
      default: "Open",
      index: true,
    },
    adminNote: { type: String, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ vendor: 1, createdAt: -1 });
inquirySchema.index({ vendor: 1, status: 1, createdAt: -1 });

module.exports = models.Inquiry || model("Inquiry", inquirySchema);
