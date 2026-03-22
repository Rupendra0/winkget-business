"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
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
  UtensilsCrossed,
  ShoppingCart,
  Heart,
  X,
} from "lucide-react";
import type { ListingProfile } from "@/data/listingData";
import Footer from "@/components/Footer";

const ratingLabel = (rating: number) => rating.toFixed(1);

const tabList = ["Overview", "Reviews", "Photos"] as const;

type ProfileTab = (typeof tabList)[number];

export default function ListingProfilePage({ profile }: { profile: ListingProfile }) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("Overview");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [reviews, setReviews] = useState(profile.reviewsList);
  const [newAuthor, setNewAuthor] = useState("");
  const [newRating, setNewRating] = useState("5");
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const [selectedMenuItem, setSelectedMenuItem] = useState<
    ListingProfile["menuItems"][number] | null
  >(null);

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

  const getMenuOriginalPrice = (value: string) => {
    const numeric = Number(value.replace(/[^0-9]/g, ""));
    if (!numeric) return null;
    return `₹${numeric + 30}`;
  };

  return (
    <main className="px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto space-y-10">
        <section className="rounded-3xl overflow-hidden bg-white/70 border border-white/80 shadow-lg card-hover">
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
              <button className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-600 text-white text-sm font-semibold hover:bg-amber-500 btn-hover">
                <CalendarCheck size={16} />
                {profile.ctaLabel}
              </button>
              {profile.category === "Restaurant" && profile.menuItems?.length ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-orange-500 text-white text-sm font-semibold shadow-sm hover:bg-orange-400 btn-hover"
                  onClick={() => setIsMenuOpen(true)}
                >
                  <UtensilsCrossed size={16} />
                  Menu
                </button>
              ) : null}
              <Link
                href={`/store/${profile.storeId ?? profile.id}`}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 btn-hover"
              >
                <Store size={16} />
                My Store
              </Link>
              <button className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-amber-400 text-amber-800 text-sm font-semibold btn-hover">
                <Phone size={16} />
                Call
              </button>
              <button className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-amber-400 text-amber-800 text-sm font-semibold btn-hover">
                <Mail size={16} />
                Email
              </button>
              <button className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-amber-400 text-amber-800 text-sm font-semibold btn-hover">
                <MessageCircle size={16} />
                Whatsapp
              </button>
              <button className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-amber-400 text-amber-800 text-sm font-semibold btn-hover">
                <MapPin size={16} />
                Direction
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.9fr] gap-8">
          <div className="space-y-6">
            <div className="rounded-3xl bg-white/80 border border-white/80 shadow-lg p-6 card-hover">
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

            <div className="rounded-3xl bg-white/80 border border-white/80 shadow-lg p-6 card-hover">
              <div className="flex flex-wrap gap-2">
                {tabList.map((tab) => (
                  <button
                    key={tab}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all btn-hover ${
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
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 card-hover">
                    <div className="text-xl font-bold text-gray-900">
                      {ratingLabel(averageRating)}
                    </div>
                    <div className="text-xs text-gray-600">Based on {reviews.length} reviews</div>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/90 p-4 space-y-3 card-hover">
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
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold btn-hover"
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
                          className="rounded-2xl border border-white/80 bg-white/90 p-4 card-hover"
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
                                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold btn-hover"
                                  onClick={handleSaveEdit}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold btn-hover"
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
                              className="text-xs font-semibold text-amber-700 btn-hover"
                              onClick={() => handleStartEdit(review.id, review.comment)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="text-xs font-semibold text-red-600 btn-hover"
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
                      className="rounded-2xl overflow-hidden border border-white/80 bg-white card-hover"
                    >
                      <img src={photo} alt="Gallery" className="h-48 w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white/80 border border-white/80 shadow-lg p-6 card-hover">
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
            <div className="rounded-3xl bg-white/90 border border-white/80 shadow-lg p-6 space-y-4 card-hover">
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
              <button className="w-full px-4 py-2 rounded-xl bg-blue-900 text-white text-sm font-semibold flex items-center justify-center gap-2 btn-hover">
                Send Enquiry <Send size={14} />
              </button>
            </div>

            <div className="rounded-3xl bg-white/90 border border-white/80 shadow-lg p-6 space-y-4 card-hover">
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

            <div className="rounded-3xl bg-white/90 border border-white/80 shadow-lg p-6 card-hover">
              <div className="text-sm font-semibold text-gray-800">{profile.suggestionTitle}</div>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                {profile.suggestions.length > 0 ? (
                  profile.suggestions.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.detail}</div>
                      </div>
                      <button className="text-xs font-semibold text-amber-700 btn-hover">View</button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500">More suggestions coming soon.</div>
                )}
              </div>
            </div>
          </aside>
        </section>

        {profile.category === "Restaurant" && profile.menuItems?.length ? (
          <section className="rounded-3xl bg-white/80 border border-white/80 shadow-lg p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">Full Menu</div>
                <div className="text-xs text-gray-500">{profile.menuItems.length} items</div>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-amber-700 btn-hover"
                onClick={() => setIsMenuOpen(true)}
              >
                View all
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {profile.menuItems.map((item) => (
                <div
                  key={item.id}
                      className="rounded-2xl border border-orange-100 bg-orange-50/60 shadow-sm overflow-hidden card-hover cursor-pointer"
                      onClick={() => setSelectedMenuItem(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          setSelectedMenuItem(item);
                        }
                      }}
                >
                  <div className="relative h-32 bg-orange-100/60">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                    {item.badge && (
                      <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-amber-700">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                      {item.name}
                    </div>
                    <div className="text-sm font-semibold text-orange-700">{item.price}</div>
                    <div className="text-xs text-orange-700/70">{item.category}</div>
                    <button className="w-full mt-2 h-9 rounded-xl bg-orange-500 text-white text-xs font-semibold btn-hover">
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <Footer />
      {isMenuOpen && profile.category === "Restaurant" && profile.menuItems?.length ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl border border-slate-200 p-6 max-h-[80vh] overflow-y-auto card-hover">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xl font-bold text-gray-900">Full Menu</div>
                  <div className="text-xs text-gray-500">
                    {profile.menuItems.length} items
                  </div>
                </div>
                <button
                  type="button"
                  className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center btn-hover"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {profile.menuItems.map((item) => (
                  <div
                    key={`modal-${item.id}`}
                    className="rounded-2xl border border-orange-100 bg-orange-50/60 shadow-sm overflow-hidden card-hover cursor-pointer"
                    onClick={() => setSelectedMenuItem(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedMenuItem(item);
                      }
                    }}
                  >
                    <div className="relative h-36 bg-orange-100/60">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                      {item.badge && (
                        <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-amber-700">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                        {item.name}
                      </div>
                      <div className="text-sm font-semibold text-orange-700">{item.price}</div>
                      <div className="text-xs text-orange-700/70">{item.category}</div>
                      <button className="w-full mt-2 h-9 rounded-xl bg-orange-500 text-white text-xs font-semibold btn-hover">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {selectedMenuItem ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedMenuItem(null)}
          />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 p-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1fr] gap-6">
                <div className="rounded-2xl overflow-hidden bg-slate-50">
                  <img
                    src={selectedMenuItem.imageUrl}
                    alt={selectedMenuItem.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedMenuItem.name}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-semibold">
                        <Star size={12} className="fill-emerald-500 text-emerald-500" />
                        4.3
                      </div>
                    </div>
                    <button
                      type="button"
                      className="h-9 w-9 rounded-full bg-orange-500 text-white flex items-center justify-center btn-hover"
                      onClick={() => setSelectedMenuItem(null)}
                      aria-label="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 line-through text-sm">
                      {getMenuOriginalPrice(selectedMenuItem.price)}
                    </span>
                    <span className="text-2xl font-bold text-orange-600">
                      {selectedMenuItem.price}
                    </span>
                    {selectedMenuItem.badge ? (
                      <span className="rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold">
                        {selectedMenuItem.badge}
                      </span>
                    ) : null}
                  </div>

                  <div className="text-sm text-gray-700">
                    <div className="font-semibold text-gray-900">Description</div>
                    <p className="mt-1 text-sm text-gray-600">
                      Freshly prepared {selectedMenuItem.name} with rich flavors and
                      premium ingredients. Perfect for a quick meal or combo pairing.
                    </p>
                  </div>

                  <button className="w-full h-12 rounded-2xl bg-orange-500 text-white font-semibold flex items-center justify-center gap-2 btn-hover">
                    <ShoppingCart size={18} /> Add to Cart {selectedMenuItem.price}
                  </button>
                  <button className="w-full h-11 rounded-2xl border border-slate-200 text-slate-700 font-semibold flex items-center justify-center gap-2 btn-hover">
                    <Heart size={18} /> Save
                  </button>

                  <div className="pt-2 text-sm text-gray-600 border-t border-slate-100">
                    <div className="font-semibold text-gray-800">
                      Category: {selectedMenuItem.category}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
