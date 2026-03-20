"use client";

import React, { useMemo, useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Share2,
  Star,
  CalendarCheck,
  Send,
  Store,
} from "lucide-react";
import type { ListingProfile } from "@/data/listingData";
import Footer from "@/components/Footer";

const ratingLabel = (rating: number) => rating.toFixed(1);

const tabList = ["Overview", "Reviews", "Photos"] as const;

type ProfileTab = (typeof tabList)[number];

export default function ListingProfilePage({ profile }: { profile: ListingProfile }) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("Overview");
  const [reviews, setReviews] = useState(profile.reviewsList);
  const [newAuthor, setNewAuthor] = useState("");
  const [newRating, setNewRating] = useState("5");
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return profile.rating;
    const total = reviews.reduce((sum, item) => sum + item.rating, 0);
    return total / reviews.length;
  }, [profile.rating, reviews]);

  const handleAddReview = () => {
    if (!newAuthor.trim() || !newComment.trim()) return;
    const ratingValue = Math.min(5, Math.max(1, Number(newRating)));
    const newReview = {
      id: `rev-${Date.now()}`,
      author: newAuthor.trim(),
      rating: ratingValue,
      date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      comment: newComment.trim(),
    };
    setReviews((prev) => [newReview, ...prev]);
    setNewAuthor("");
    setNewRating("5");
    setNewComment("");
  };

  const handleDeleteReview = (id: string) => {
    setReviews((prev) => prev.filter((review) => review.id !== id));
  };

  const handleStartEdit = (id: string, comment: string) => {
    setEditingId(id);
    setEditingComment(comment);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setReviews((prev) =>
      prev.map((review) =>
        review.id === editingId ? { ...review, comment: editingComment.trim() } : review
      )
    );
    setEditingId(null);
    setEditingComment("");
  };

  return (
    <main className="px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto space-y-10">
        <section className="rounded-3xl overflow-hidden bg-white/70 border border-white/80 shadow-lg">
          <div className="relative h-72 sm:h-80">
            <img
              src={profile.coverImage}
              alt={profile.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div className="absolute bottom-6 left-6 flex items-center gap-4">
              <div className="h-20 w-20 rounded-full border-4 border-white overflow-hidden shadow-lg">
                <img
                  src={profile.logoImage}
                  alt={`${profile.name} logo`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-white">
                <div className="text-3xl font-bold">{profile.name}</div>
                <div className="text-sm text-white/80">{profile.category}</div>
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-8 py-6 bg-white">
            <div className="flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-600 text-white text-sm font-semibold hover:bg-amber-500">
                <CalendarCheck size={16} />
                {profile.ctaLabel}
              </button>
              <button className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800">
                <Store size={16} />
                My Store
              </button>
              <button className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-amber-400 text-amber-800 text-sm font-semibold">
                <Phone size={16} />
                Call
              </button>
              <button className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-amber-400 text-amber-800 text-sm font-semibold">
                <Mail size={16} />
                Email
              </button>
              <button className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-amber-400 text-amber-800 text-sm font-semibold">
                <MessageCircle size={16} />
                Whatsapp
              </button>
              <button className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-amber-400 text-amber-800 text-sm font-semibold">
                <MapPin size={16} />
                Direction
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.9fr] gap-8">
          <div className="space-y-6">
            <div className="rounded-3xl bg-white/80 border border-white/80 shadow-lg p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-amber-700 font-semibold">
                    {profile.category}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{profile.name}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                    <MapPin size={14} />
                    {profile.address}, {profile.city}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 text-amber-600">
                    <Star size={18} className="fill-amber-400" />
                    <span className="text-lg font-semibold text-gray-900">
                      {ratingLabel(averageRating)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">{reviews.length} Reviews</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {profile.badges.map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1 rounded-full text-[11px] uppercase tracking-wide bg-amber-100 text-amber-800 font-semibold"
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-700">
                  {profile.priceRange}
                </span>
                {profile.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-white text-xs text-slate-700">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-4">{profile.description}</p>
            </div>

            <div className="rounded-3xl bg-white/80 border border-white/80 shadow-lg p-6">
              <div className="flex flex-wrap gap-2">
                {tabList.map((tab) => (
                  <button
                    key={tab}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      activeTab === tab
                        ? "bg-amber-600 text-white"
                        : "bg-amber-50 text-amber-700"
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "Overview" && (
                <div className="mt-6 space-y-6">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Highlights</div>
                    <ul className="mt-3 grid gap-2 text-sm text-gray-600">
                      {profile.highlights.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Services</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {profile.services.map((item) => (
                        <span key={item} className="px-3 py-1 rounded-full bg-white text-xs text-slate-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Amenities</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {profile.amenities.map((item) => (
                        <span key={item} className="px-3 py-1 rounded-full bg-white text-xs text-slate-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Reviews" && (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
                    <div className="text-xl font-bold text-gray-900">
                      {ratingLabel(averageRating)}
                    </div>
                    <div className="text-xs text-gray-600">Based on {reviews.length} reviews</div>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/90 p-4 space-y-3">
                    <div className="text-sm font-semibold text-gray-900">Write a review</div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                      <input
                        type="text"
                        placeholder="Your name"
                        className="w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400"
                        value={newAuthor}
                        onChange={(event) => setNewAuthor(event.target.value)}
                      />
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-2 text-sm text-slate-700"
                        value={newRating}
                        onChange={(event) => setNewRating(event.target.value)}
                      >
                        {[5, 4, 3, 2, 1].map((value) => (
                          <option key={value} value={value}>
                            {value} Star
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      placeholder="Share your experience"
                      className="w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400"
                      rows={3}
                      value={newComment}
                      onChange={(event) => setNewComment(event.target.value)}
                    />
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold"
                      onClick={handleAddReview}
                    >
                      Submit review
                    </button>
                  </div>
                  <div className="space-y-3">
                    {reviews.length > 0 ? (
                      reviews.map((review) => (
                        <div
                          key={review.id}
                          className="rounded-2xl border border-white/80 bg-white/90 p-4"
                        >
                          <div className="flex items-center justify-between text-sm">
                            <div className="font-semibold text-gray-900">{review.author}</div>
                            <div className="text-xs text-gray-500">{review.date}</div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-amber-700 mt-2">
                            <Star size={14} className="fill-amber-400" />
                            {ratingLabel(review.rating)}
                          </div>
                          {editingId === review.id ? (
                            <div className="mt-3 space-y-3">
                              <textarea
                                className="w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400"
                                rows={3}
                                value={editingComment}
                                onChange={(event) => setEditingComment(event.target.value)}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold"
                                  onClick={handleSaveEdit}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
                          )}
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              className="text-xs font-semibold text-amber-700"
                              onClick={() => handleStartEdit(review.id, review.comment)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="text-xs font-semibold text-red-600"
                              onClick={() => handleDeleteReview(review.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">No reviews yet.</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "Photos" && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.gallery.map((photo) => (
                    <div
                      key={photo}
                      className="rounded-2xl overflow-hidden border border-white/80 bg-white"
                    >
                      <img src={photo} alt="Gallery" className="h-48 w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white/80 border border-white/80 shadow-lg p-6">
              <div className="text-sm font-semibold text-gray-800">Business Info</div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                {profile.hours.map((item) => (
                  <div key={item.day} className="flex items-center gap-2">
                    <CalendarCheck size={14} className="text-amber-600" />
                    {item.day}: {item.time}
                  </div>
                ))}
              </div>
              {profile.menuImage && (
                <div className="mt-6 rounded-2xl overflow-hidden border border-white/80">
                  <img src={profile.menuImage} alt="Menu" className="h-56 w-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl bg-white/90 border border-white/80 shadow-lg p-6 space-y-4">
              <div className="text-lg font-semibold text-gray-900">Raise an enquiry</div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Mobile number"
                  className="w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400"
                />
                <textarea
                  placeholder="Your enquiry (optional)"
                  className="w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400"
                  rows={4}
                />
              </div>
              <button className="w-full px-4 py-2 rounded-xl bg-blue-900 text-white text-sm font-semibold flex items-center justify-center gap-2">
                Send Enquiry <Send size={14} />
              </button>
            </div>

            <div className="rounded-3xl bg-white/90 border border-white/80 shadow-lg p-6 space-y-4">
              <div className="text-sm font-semibold text-gray-800">Contact</div>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone size={14} /> {profile.phone}
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} /> {profile.email}
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle size={14} /> {profile.whatsapp}
                </div>
                <div className="flex items-center gap-2">
                  <Share2 size={14} /> Share business profile
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-white/80">
                <img src={profile.mapImage} alt="Map" className="h-44 w-full object-cover" />
              </div>
            </div>

            <div className="rounded-3xl bg-white/90 border border-white/80 shadow-lg p-6">
              <div className="text-sm font-semibold text-gray-800">{profile.suggestionTitle}</div>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                {profile.suggestions.length > 0 ? (
                  profile.suggestions.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.detail}</div>
                      </div>
                      <button className="text-xs font-semibold text-amber-700">View</button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500">More suggestions coming soon.</div>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
      <Footer />
    </main>
  );
}
