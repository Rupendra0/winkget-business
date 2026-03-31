"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ShieldCheck, Store, UserRound } from "lucide-react";
import { fetchCurrentUser } from "@/lib/authClient";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

type SubcategoryOption = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: {
    id: string;
    name: string;
  };
};

type VendorFormState = {
  businessName: string;
  ownerName: string;
  personalEmail: string;
  personalPhone: string;
  personalAlternatePhone: string;
  businessEmail: string;
  businessPhone: string;
  businessAlternatePhone: string;
  password: string;
  confirmPassword: string;
  businessCategoryId: string;
  businessSubcategoryId: string;
  businessAddress: string;
  city: string;
  state: string;
  postalCode: string;
  gstNumber: string;
  website: string;
  yearsInBusiness: string;
  businessDescription: string;
  idProofType: string;
  idProofNumber: string;
  idProofDocument: string;
  marketingOptIn: boolean;
};

const STEP_META = [
  {
    number: 1,
    title: "Personal",
    subtitle: "Owner and login details",
    icon: UserRound,
  },
  {
    number: 2,
    title: "Business",
    subtitle: "Address and category",
    icon: Building2,
  },
  {
    number: 3,
    title: "Verification",
    subtitle: "Security and final submit",
    icon: ShieldCheck,
  },
] as const;

const ID_PROOF_OPTIONS = [
  { value: "aadhaar", label: "Aadhaar card" },
  { value: "pan", label: "PAN card" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driver's license" },
  { value: "voter_id", label: "Voter ID" },
  { value: "other", label: "Other" },
] as const;

const POSTAL_REGEX = /^[0-9]{5,10}$/;
const PHONE_REGEX = /^[0-9]{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_DOCUMENT_FILE_SIZE = 3 * 1024 * 1024;

const INITIAL_FORM: VendorFormState = {
  businessName: "",
  ownerName: "",
  personalEmail: "",
  personalPhone: "",
  personalAlternatePhone: "",
  businessEmail: "",
  businessPhone: "",
  businessAlternatePhone: "",
  password: "",
  confirmPassword: "",
  businessCategoryId: "",
  businessSubcategoryId: "",
  businessAddress: "",
  city: "",
  state: "",
  postalCode: "",
  gstNumber: "",
  website: "",
  yearsInBusiness: "",
  businessDescription: "",
  idProofType: "",
  idProofNumber: "",
  idProofDocument: "",
  marketingOptIn: false,
};

const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read selected file"));
    };
    reader.onerror = () => reject(new Error("Failed to read selected file"));
    reader.readAsDataURL(file);
  });

const RequiredMark = () => <span className="text-red-500">*</span>;

export default function VendorRegisterPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [categoryLoadError, setCategoryLoadError] = useState<string | null>(null);
  const [subcategoryLoadError, setSubcategoryLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<VendorFormState>(INITIAL_FORM);
  const [selectedDocumentName, setSelectedDocumentName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const user = await fetchCurrentUser();
      if (!active) return;

      if (user) {
        if (user.role === "vendor") {
          router.replace("/vendor");
        } else {
          router.replace("/");
        }
        return;
      }

      setCheckingSession(false);
    };

    void checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      setLoadingCategories(true);
      setCategoryLoadError(null);

      try {
        const response = await fetch(`${BACKEND_URL}/api/categories`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          throw new Error(payload.message || "Failed to load categories");
        }

        if (!active) return;

        const nextCategories = Array.isArray(payload.categories) ? payload.categories : [];
        setCategories(nextCategories);

        if (nextCategories.length > 0) {
          setForm((current) => {
            if (current.businessCategoryId) return current;
            return { ...current, businessCategoryId: nextCategories[0].id };
          });
        }
      } catch (loadError) {
        if (!active) return;
        const message = loadError instanceof Error ? loadError.message : "Failed to load categories";
        setCategoryLoadError(message);
      } finally {
        if (!active) return;
        setLoadingCategories(false);
      }
    };

    void loadCategories();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadSubcategories = async () => {
      if (!form.businessCategoryId) {
        setSubcategories([]);
        setSubcategoryLoadError(null);
        return;
      }

      setLoadingSubcategories(true);
      setSubcategoryLoadError(null);

      try {
        const response = await fetch(
          `${BACKEND_URL}/api/subcategories?categoryId=${encodeURIComponent(form.businessCategoryId)}`,
          {
            cache: "no-store",
          }
        );
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          throw new Error(payload.message || "Failed to load subcategories");
        }

        if (!active) return;

        const nextSubcategories = Array.isArray(payload.subcategories) ? payload.subcategories : [];
        setSubcategories(nextSubcategories);
        setForm((current) => {
          if (!current.businessSubcategoryId) return current;
          const exists = nextSubcategories.some((item: SubcategoryOption) => item.id === current.businessSubcategoryId);
          if (exists) return current;
          return { ...current, businessSubcategoryId: "" };
        });
      } catch (loadError) {
        if (!active) return;
        const message = loadError instanceof Error ? loadError.message : "Failed to load subcategories";
        setSubcategoryLoadError(message);
        setSubcategories([]);
      } finally {
        if (!active) return;
        setLoadingSubcategories(false);
      }
    };

    void loadSubcategories();

    return () => {
      active = false;
    };
  }, [form.businessCategoryId]);

  const updateField = <K extends keyof VendorFormState>(field: K, value: VendorFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const currentStepMeta = useMemo(() => STEP_META.find((item) => item.number === step) ?? STEP_META[0], [step]);

  const validateStepOne = () => {
    if (!form.ownerName.trim()) return "Owner name is required";
    if (!form.personalEmail.trim()) return "Personal email is required";
    if (!EMAIL_REGEX.test(form.personalEmail.trim().toLowerCase())) return "Personal email format is invalid";
    if (!PHONE_REGEX.test(form.personalPhone.trim())) return "Personal phone must be exactly 10 digits";
    if (form.personalAlternatePhone.trim() && !PHONE_REGEX.test(form.personalAlternatePhone.trim())) {
      return "Personal alternate phone must be exactly 10 digits";
    }
    if (!form.businessEmail.trim()) return "Business email is required";
    if (!EMAIL_REGEX.test(form.businessEmail.trim().toLowerCase())) return "Business email format is invalid";
    if (!PHONE_REGEX.test(form.businessPhone.trim())) return "Business phone must be exactly 10 digits";
    if (form.businessAlternatePhone.trim() && !PHONE_REGEX.test(form.businessAlternatePhone.trim())) {
      return "Business alternate phone must be exactly 10 digits";
    }
    if (!form.password || form.password.length < 6) return "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) return "Password and confirm password do not match";
    return null;
  };

  const validateStepTwo = () => {
    if (!form.businessName.trim()) return "Business name is required";
    if (!form.businessCategoryId) return "Please select a business category";
    if (!form.businessAddress.trim()) return "Business address is required";
    if (!form.city.trim()) return "City is required";
    if (!form.state.trim()) return "State is required";
    if (!form.postalCode.trim()) return "Postal code is required";
    if (!POSTAL_REGEX.test(form.postalCode.trim())) return "Postal code must be 5 to 10 digits";

    if (form.yearsInBusiness.trim()) {
      const years = Number(form.yearsInBusiness);
      if (Number.isNaN(years) || years < 0 || years > 80) {
        return "Years in business must be a valid number between 0 and 80";
      }
    }

    return null;
  };

  const validateStepThree = () => {
    if (!form.idProofType) return "Please select an ID proof type";
    if (!form.idProofNumber.trim()) return "ID proof number is required";
    if (!form.idProofDocument.trim()) return "Please upload an ID proof document image";
    return null;
  };

  const handleProofDocumentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      updateField("idProofDocument", "");
      setSelectedDocumentName("");
      return;
    }

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("ID proof document must be PNG, JPG, JPEG or WEBP image");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_DOCUMENT_FILE_SIZE) {
      setError("ID proof document must be 3MB or smaller");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await toDataUrl(file);
      updateField("idProofDocument", dataUrl);
      setSelectedDocumentName(file.name);
      setError(null);
    } catch (fileError) {
      const message = fileError instanceof Error ? fileError.message : "Failed to read selected document";
      setError(message);
      event.target.value = "";
    }
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      const stepError = validateStepOne();
      if (stepError) {
        setError(stepError);
        return;
      }
    }

    if (step === 2) {
      const stepError = validateStepTwo();
      if (stepError) {
        setError(stepError);
        return;
      }
    }

    setStep((current) => Math.min(3, current + 1));
  };

  const handlePrevious = () => {
    setError(null);
    setStep((current) => Math.max(1, current - 1));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const firstError = validateStepOne();
    if (firstError) {
      setStep(1);
      setError(firstError);
      return;
    }

    const secondError = validateStepTwo();
    if (secondError) {
      setStep(2);
      setError(secondError);
      return;
    }

    const thirdError = validateStepThree();
    if (thirdError) {
      setStep(3);
      setError(thirdError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/vendor/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          ownerName: form.ownerName.trim(),
          personalEmail: form.personalEmail.trim().toLowerCase(),
          personalPhone: form.personalPhone.trim(),
          personalAlternatePhone: form.personalAlternatePhone.trim(),
          businessEmail: form.businessEmail.trim().toLowerCase(),
          businessPhone: form.businessPhone.trim(),
          businessAlternatePhone: form.businessAlternatePhone.trim(),
          password: form.password,
          businessCategoryId: form.businessCategoryId,
          businessSubcategoryId: form.businessSubcategoryId || undefined,
          businessAddress: form.businessAddress.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          gstNumber: form.gstNumber.trim(),
          website: form.website.trim(),
          yearsInBusiness: form.yearsInBusiness.trim() ? Number(form.yearsInBusiness.trim()) : undefined,
          businessDescription: form.businessDescription.trim(),
          idProofType: form.idProofType,
          idProofNumber: form.idProofNumber.trim(),
          idProofDocument: form.idProofDocument,
          marketingOptIn: form.marketingOptIn,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Vendor registration failed");
      }

      setSubmitted(true);
      setForm({
        ...INITIAL_FORM,
        businessCategoryId: categories[0]?.id || "",
      });
      setSelectedDocumentName("");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Vendor registration failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="min-h-[calc(100vh-80px)] px-4 py-8 sm:px-6 lg:px-8 flex items-center justify-center">
        <section className="w-full max-w-4xl rounded-3xl border border-white/80 bg-white/85 p-6 shadow-2xl sm:p-8">
          <div className="h-4 w-64 rounded bg-slate-200 animate-pulse" />
          <div className="mt-4 h-8 w-80 rounded bg-slate-200 animate-pulse" />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="h-20 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-20 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-20 rounded-xl bg-slate-200 animate-pulse" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
      <section className="w-full max-w-5xl rounded-3xl bg-white/85 border border-white/80 shadow-2xl p-6 sm:p-8 card-hover">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-800">
          <Store size={14} /> Vendor / Shopkeeper Registration
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900">Register your business on Winkget</h1>
        <p className="mt-2 text-sm text-slate-600">
          Complete all three steps. Admin will review your profile before account activation.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {STEP_META.map((item) => {
            const Icon = item.icon;
            const isActive = item.number === step;
            const isComplete = item.number < step;
            return (
              <article
                key={item.number}
                className={`rounded-2xl border px-4 py-3 text-left ${
                  isActive
                    ? "border-orange-300 bg-orange-50"
                    : isComplete
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      isActive
                        ? "bg-orange-500 text-white"
                        : isComplete
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {item.number}
                  </span>
                  <Icon size={16} className="text-slate-700" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.subtitle}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {submitted ? (
          <>
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Registration submitted successfully. Your account is now pending admin approval.
            </div>
            <button
              type="button"
              onClick={() => router.push("/vendor-login")}
              className="mt-4 w-full rounded-xl border border-blue-200 bg-blue-50 text-blue-800 py-3 text-sm font-semibold hover:bg-blue-100 btn-hover"
            >
              Go to Vendor Login
            </button>
          </>
        ) : (
          <form className="mt-6" onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Step {step} of 3</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{currentStepMeta.title}</h2>
              <p className="text-sm text-slate-500">{currentStepMeta.subtitle}</p>

              {step === 1 ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Owner full name <RequiredMark />
                    </span>
                    <input
                      type="text"
                      value={form.ownerName}
                      onChange={(event) => updateField("ownerName", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Enter owner full name"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Personal phone <RequiredMark />
                    </span>
                    <input
                      type="tel"
                      value={form.personalPhone}
                      onChange={(event) => updateField("personalPhone", normalizePhone(event.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Personal alternate phone</span>
                    <input
                      type="tel"
                      value={form.personalAlternatePhone}
                      onChange={(event) => updateField("personalAlternatePhone", normalizePhone(event.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Optional"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Personal email <RequiredMark />
                    </span>
                    <input
                      type="email"
                      value={form.personalEmail}
                      onChange={(event) => updateField("personalEmail", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="owner@email.com"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Business email <RequiredMark />
                    </span>
                    <input
                      type="email"
                      value={form.businessEmail}
                      onChange={(event) => updateField("businessEmail", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="store@business.com"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Business phone <RequiredMark />
                    </span>
                    <input
                      type="tel"
                      value={form.businessPhone}
                      onChange={(event) => updateField("businessPhone", normalizePhone(event.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="10-digit store phone"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Business alternate phone</span>
                    <input
                      type="tel"
                      value={form.businessAlternatePhone}
                      onChange={(event) => updateField("businessAlternatePhone", normalizePhone(event.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Optional"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Create password <RequiredMark />
                    </span>
                    <input
                      type="password"
                      minLength={6}
                      value={form.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Minimum 6 characters"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Confirm password <RequiredMark />
                    </span>
                    <input
                      type="password"
                      minLength={6}
                      value={form.confirmPassword}
                      onChange={(event) => updateField("confirmPassword", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Re-enter password"
                      required
                    />
                  </label>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Business name <RequiredMark />
                    </span>
                    <input
                      type="text"
                      value={form.businessName}
                      onChange={(event) => updateField("businessName", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Enter legal business name"
                      required
                    />
                  </label>

                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Business category <RequiredMark />
                    </span>
                    <select
                      value={form.businessCategoryId}
                      onChange={(event) => {
                        updateField("businessCategoryId", event.target.value);
                        updateField("businessSubcategoryId", "");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                      disabled={loadingCategories || categories.length === 0}
                      required
                    >
                      {loadingCategories ? <option value="">Loading categories...</option> : null}
                      {!loadingCategories && categories.length === 0 ? (
                        <option value="">No categories available</option>
                      ) : null}
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {categoryLoadError ? <p className="mt-1 text-xs text-red-600">{categoryLoadError}</p> : null}
                  </label>

                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Business subcategory</span>
                    <select
                      value={form.businessSubcategoryId}
                      onChange={(event) => updateField("businessSubcategoryId", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                      disabled={!form.businessCategoryId || loadingSubcategories || subcategories.length === 0}
                    >
                      <option value="">Select subcategory (optional)</option>
                      {subcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </option>
                      ))}
                    </select>
                    {loadingSubcategories ? <p className="mt-1 text-xs text-slate-500">Loading subcategories...</p> : null}
                    {subcategoryLoadError ? <p className="mt-1 text-xs text-red-600">{subcategoryLoadError}</p> : null}
                  </label>

                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Business address <RequiredMark />
                    </span>
                    <textarea
                      value={form.businessAddress}
                      onChange={(event) => updateField("businessAddress", event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Street, area, landmark"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      City <RequiredMark />
                    </span>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(event) => updateField("city", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      State <RequiredMark />
                    </span>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(event) => updateField("state", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Postal code <RequiredMark />
                    </span>
                    <input
                      type="text"
                      value={form.postalCode}
                      onChange={(event) => updateField("postalCode", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">GST number</span>
                    <input
                      type="text"
                      value={form.gstNumber}
                      onChange={(event) => updateField("gstNumber", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Optional"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Website</span>
                    <input
                      type="url"
                      value={form.website}
                      onChange={(event) => updateField("website", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="https://example.com"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Years in business</span>
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={form.yearsInBusiness}
                      onChange={(event) => updateField("yearsInBusiness", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Optional"
                    />
                  </label>

                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Business description</span>
                    <textarea
                      value={form.businessDescription}
                      onChange={(event) => updateField("businessDescription", event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Describe your products and service area"
                    />
                  </label>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      ID proof type <RequiredMark />
                    </span>
                    <select
                      value={form.idProofType}
                      onChange={(event) => updateField("idProofType", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-orange-400"
                      required
                    >
                      <option value="">Select proof type</option>
                      {ID_PROOF_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      ID proof number <RequiredMark />
                    </span>
                    <input
                      type="text"
                      value={form.idProofNumber}
                      onChange={(event) => updateField("idProofNumber", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-500 outline-none focus:border-orange-400"
                      placeholder="Enter ID number"
                      required
                    />
                  </label>

                  <label className="sm:col-span-2 block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Upload ID proof document <RequiredMark />
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleProofDocumentChange}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-orange-800"
                      required={!form.idProofDocument}
                    />
                    <p className="mt-1 text-xs text-slate-500">Accepted: PNG, JPG, JPEG, WEBP up to 3MB.</p>
                    {selectedDocumentName ? <p className="mt-1 text-xs text-emerald-700">Selected: {selectedDocumentName}</p> : null}
                  </label>

                  <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.marketingOptIn}
                      onChange={(event) => updateField("marketingOptIn", event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    I agree to receive platform updates and marketing communication.
                  </label>

                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700">Review summary</p>
                    <p className="mt-1">Owner: {form.ownerName || "-"}</p>
                    <p>Business: {form.businessName || "-"}</p>
                    <p>Personal contact: {form.personalEmail || "-"} / {form.personalPhone || "-"}</p>
                    <p>Business contact: {form.businessEmail || "-"} / {form.businessPhone || "-"}</p>
                    <p>
                      Category: {categories.find((item) => item.id === form.businessCategoryId)?.name || "Not selected"}
                    </p>
                    <p>Subcategory: {subcategories.find((item) => item.id === form.businessSubcategoryId)?.name || "Not selected"}</p>
                    <p>Location: {[form.city, form.state].filter(Boolean).join(", ") || "-"}</p>
                    <p>Document: {selectedDocumentName || "Not uploaded"}</p>
                  </div>
                </div>
              ) : null}

              {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div> : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={handlePrevious}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Previous
                </button>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => router.push("/vendor-login")}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                  >
                    Already a vendor? Login
                  </button>

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600"
                    >
                      Next step
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? "Submitting..." : "Submit registration"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
