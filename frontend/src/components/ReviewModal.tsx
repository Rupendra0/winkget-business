"use client";

import React, { useState } from "react";
import { Star, X } from "lucide-react";
import { submitBusinessReview } from "@/lib/reviewStore";

type ReviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  product: {
    productId: string;
    name: string;
    image: string;
  };
  onSuccess: (newReview: any) => void;
};

export default function ReviewModal({
  isOpen,
  onClose,
  order,
  product,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("Please write a comment for your review.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const businessKey = `product:${product.productId.trim().replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 96)}`;

    try {
      const result = await submitBusinessReview({
        businessId: businessKey,
        rating,
        comment: title.trim() ? `${title.trim()}\n\n${comment.trim()}` : comment.trim(),
      });

      if (result.ok) {
        // Map backend BusinessReview to expected structure
        const mappedReview = {
          id: result.review.id,
          userName: result.review.author || "Verified Buyer",
          rating: result.review.rating,
          title: title.trim(),
          comment: comment.trim(),
          createdAt: result.review.createdAt,
          isVerifiedPurchase: true,
        };
        onSuccess(mappedReview);
        onClose();
      } else {
        setError(result.message || "Failed to submit review. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[500px] rounded-[28px] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">Write a Review</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Product Info */}
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl">
            <img
              src={product.image}
              alt={product.name}
              className="w-16 h-16 object-contain rounded-xl bg-white border border-slate-200 p-1"
            />
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-800 truncate">{product.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">Order ID: {order?.id?.slice(-8) || "N/A"}</p>
            </div>
          </div>

          {/* Rating Stars */}
          <div className="space-y-2 text-center py-2 bg-blue-50/40 rounded-2xl">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Overall Rating</label>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      size={32}
                      className={active ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 text-xs font-medium rounded-xl border border-rose-100">
              {error}
            </div>
          )}

          {/* Title input */}
          <div className="space-y-1.5">
            <label htmlFor="review-title" className="text-xs font-bold text-slate-600 uppercase tracking-wide">Review Title (Optional)</label>
            <input
              id="review-title"
              type="text"
              placeholder="Summarize your experience"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 text-slate-700"
            />
          </div>

          {/* Comment input */}
          <div className="space-y-1.5">
            <label htmlFor="review-comment" className="text-xs font-bold text-slate-600 uppercase tracking-wide">Review Details</label>
            <textarea
              id="review-comment"
              rows={4}
              placeholder="What did you like or dislike about this product?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 text-slate-700 resize-none"
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl transition flex items-center justify-center text-sm shadow-md shadow-blue-200"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
