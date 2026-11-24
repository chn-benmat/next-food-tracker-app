"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatFoodDate, localFoodDate, mealOptions, normalizeFoodDate } from "@/lib/food-diary";
import { supabase } from "@/lib/supabaseClient";
import "./food-entry.css";

type FoodEntryRow = {
  foodname: string;
  meal: string;
  fooddate_at: string | null;
  food_image_url: string | null;
  user_id: string;
};

type EntryLoad =
  | { status: "loading" | "error" }
  | { status: "ready"; entry: FoodEntryRow };

type Photo = { file: File; preview: string };

export type FoodEntryPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ viewDate?: string | string[] }>;
};

const subscribeToDate = () => () => {};
const serverDate = () => "";

async function removeFoodPhoto(path: string) {
  try {
    const { error } = await supabase.storage.from("food_bk").remove([decodeURIComponent(path)]);
    if (error) console.warn("Could not remove food photo", error.message);
  } catch (error) {
    console.warn("Could not remove food photo", error);
  }
}

export default function FoodEntry({
  id,
  mode,
  viewDate,
}: {
  id: string;
  mode: "add" | "edit";
  viewDate?: string | string[];
}) {
  const router = useRouter();
  const [load, setLoad] = useState<EntryLoad>({ status: "loading" });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const isEdit = mode === "edit";
  const entry = load.status === "ready" ? load.entry : null;
  const userId = isEdit ? entry?.user_id : id;
  const returnDate = typeof viewDate === "string" &&
    (viewDate === "all" || normalizeFoodDate(viewDate) === viewDate) ? viewDate : "";
  const returnQuery = returnDate ? `?date=${returnDate}` : "";
  const dashboardHref = userId ? `/dashboard/${userId}${returnQuery}` : null;

  useEffect(() => {
    if (!isEdit) return;

    const controller = new AbortController();

    async function loadEntry() {
      try {
        const { data, error } = await supabase
          .from("food_td")
          .select("foodname, meal, fooddate_at, food_image_url, user_id")
          .eq("id", id)
          .abortSignal(controller.signal)
          .single();

        if (controller.signal.aborted) return;
        setLoad(error || !data ? { status: "error" } : { status: "ready", entry: data });
      } catch {
        if (!controller.signal.aborted) setLoad({ status: "error" });
      }
    }

    void loadEntry();
    return () => controller.abort();
  }, [id, isEdit, loadAttempt]);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <main className="food-entry-page">
      <header className="food-entry-heading">
        {dashboardHref ? (
          <Link className="button button-secondary food-entry-back" href={dashboardHref}>
            กลับสมุดอาหาร
          </Link>
        ) : (
          <button className="button button-secondary food-entry-back" type="button" onClick={goBack}>
            ย้อนกลับ
          </button>
        )}
        <h1>{isEdit ? "แก้ไขรายการอาหาร" : "เพิ่มรายการอาหาร"}</h1>
      </header>

      {dashboardHref && userId ? (
        <FoodEntryForm id={id} mode={mode} entry={entry} userId={userId} />
      ) : load.status === "error" ? (
        <div className="food-entry-panel food-entry-load-error">
          <p className="food-entry-error" role="alert">เปิดรายการอาหารไม่ได้ ลองโหลดใหม่อีกครั้ง</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              setLoad({ status: "loading" });
              setLoadAttempt((attempt) => attempt + 1);
            }}
          >
            โหลดอีกครั้ง
          </button>
        </div>
      ) : (
        <div className="food-entry-panel food-entry-loading" role="status">
          <p>กำลังโหลดรายการอาหาร…</p>
          <div aria-hidden="true" />
          <div aria-hidden="true" />
          <div aria-hidden="true" />
        </div>
      )}
    </main>
  );
}

function FoodEntryForm({
  id,
  mode,
  entry,
  userId,
}: {
  id: string;
  mode: "add" | "edit";
  entry: FoodEntryRow | null;
  userId: string;
}) {
  const router = useRouter();
  const today = useSyncExternalStore(subscribeToDate, localFoodDate, serverDate);
  const [foodName, setFoodName] = useState(entry?.foodname ?? "");
  const [meal, setMeal] = useState(entry?.meal ?? "");
  const [chosenDate, setChosenDate] = useState(() => entry ? normalizeFoodDate(entry.fooddate_at) : undefined);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const date = chosenDate ?? today;
  const preview = photo?.preview || entry?.food_image_url;

  useEffect(() => {
    if (photo) return () => URL.revokeObjectURL(photo.preview);
  }, [photo]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;

    const trimmedName = foodName.trim();
    if (!trimmedName) {
      setNameError(true);
      nameInput.current?.focus();
      return;
    }

    submitting.current = true;
    setSaving(true);
    setError("");

    const bucket = supabase.storage.from("food_bk");
    let uploadedPath = "";
    let imageUrl = "";
    let saved = false;

    try {
      if (photo) {
        const extension = photo.file.name.split(".").pop()?.toLowerCase();
        const photoId = Array.from(
          crypto.getRandomValues(new Uint32Array(4)),
          (part) => part.toString(16).padStart(8, "0"),
        ).join("");
        uploadedPath = `${photoId}${extension && /^[a-z0-9]+$/.test(extension) ? `.${extension}` : ""}`;
        const { error: uploadError } = await bucket.upload(uploadedPath, photo.file);

        if (uploadError) {
          setError("อัปโหลดรูปอาหารไม่สำเร็จ ลองอีกครั้งหรือเอารูปออกก่อนบันทึก");
          return;
        }

        imageUrl = bucket.getPublicUrl(uploadedPath).data.publicUrl;
      }

      const values = { foodname: trimmedName, meal, fooddate_at: date };
      const table = supabase.from("food_td");
      const update = mode === "edit"
        ? table.update({
          ...values,
          ...(imageUrl ? { food_image_url: imageUrl } : {}),
          updated_at: new Date().toISOString(),
        }).eq("id", id)
        : null;
      const result = update
        ? await (imageUrl ? update.select("id").single() : update)
        : await table.insert({ ...values, food_image_url: imageUrl, user_id: userId });

      if (result.error) {
        if (uploadedPath && result.status >= 400 && result.status < 500) {
          void removeFoodPhoto(uploadedPath);
        }
        setError("บันทึกรายการอาหารไม่สำเร็จ ลองบันทึกอีกครั้ง");
        return;
      }

      if (imageUrl && entry?.food_image_url) {
        const bucketUrl = bucket.getPublicUrl("").data.publicUrl;
        const oldPath = entry.food_image_url.startsWith(bucketUrl)
          ? entry.food_image_url.slice(bucketUrl.length)
          : "";
        if (oldPath && oldPath !== uploadedPath && !/[?#]/.test(oldPath)) void removeFoodPhoto(oldPath);
      }

      const search = new URLSearchParams({ saved: mode === "edit" ? "updated" : "added", date });
      router.push(`/dashboard/${userId}?${search}`);
      saved = true;
    } catch {
      setError("บันทึกรายการอาหารไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง");
    } finally {
      if (!saved) {
        submitting.current = false;
        setSaving(false);
      }
    }
  }

  return (
    <form className="food-entry-panel food-entry-form" onSubmit={handleSubmit}>
      <fieldset className="food-entry-fields" disabled={saving}>
        <div className="food-entry-field">
          <label htmlFor="foodName">ชื่ออาหาร <span>จำเป็น</span></label>
          <input
            ref={nameInput}
            className="food-entry-input"
            id="foodName"
            name="foodname"
            type="text"
            value={foodName}
            placeholder="เช่น ข้าวผัดกะเพรา"
            aria-invalid={nameError || undefined}
            aria-describedby={nameError ? "foodName-error" : undefined}
            onChange={(event) => {
              setFoodName(event.target.value);
              if (nameError && event.target.value.trim()) setNameError(false);
            }}
            required
          />
          {nameError && <p id="foodName-error" className="food-entry-field-error" role="alert">กรอกชื่ออาหารเพื่อบันทึก</p>}
        </div>

        <fieldset className="food-entry-meals" id="mealType">
          <legend>มื้ออาหาร <span>จำเป็น</span></legend>
          <div className="food-entry-meal-options">
            {mealOptions.map(({ value, label }) => (
              <label className="food-entry-meal" htmlFor={`mealType-${value}`} key={value}>
                <input
                  id={`mealType-${value}`}
                  className="sr-only"
                  name="meal"
                  type="radio"
                  value={value}
                  checked={meal === value}
                  onChange={() => setMeal(value)}
                  required
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="food-entry-field">
          <label htmlFor="date">วันที่{date && <span>{formatFoodDate(date)}</span>}</label>
          <input
            className="food-entry-input"
            id="date"
            name="fooddate_at"
            type="date"
            value={date}
            onChange={(event) => setChosenDate(event.target.value)}
            required
          />
        </div>

        <div className="food-entry-field">
          <p id="foodImage-label">รูปอาหาร <span>เลือกได้</span></p>
          <div className="food-entry-photo">
            {preview && (
              <Image
                className="food-entry-preview"
                src={preview}
                alt="ตัวอย่างรูปอาหาร"
                width={80}
                height={64}
                unoptimized={Boolean(photo)}
              />
            )}
            <div className="food-entry-photo-actions">
              <input
                ref={fileInput}
                className="sr-only food-entry-file"
                id="foodImage"
                name="foodImage"
                type="file"
                accept="image/*"
                aria-describedby="foodImage-label"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setPhoto({ file, preview: URL.createObjectURL(file) });
                }}
              />
              <label className="button button-secondary food-entry-photo-button" htmlFor="foodImage">
                {preview ? "เปลี่ยนรูป" : "เพิ่มรูปอาหาร"}
              </label>
              {photo && (
                <button
                  className="button button-secondary food-entry-photo-button"
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                >
                  เอารูปที่เลือกออก
                </button>
              )}
            </div>
          </div>
        </div>
      </fieldset>

      {error && <p className="food-entry-error" role="alert">{error}</p>}
      <button className="button button-primary food-entry-submit" type="submit" disabled={saving}>
        {saving ? "กำลังบันทึก…" : "บันทึก"}
      </button>
      <span className="sr-only" role="status">{saving && "กำลังบันทึกรายการอาหาร"}</span>
    </form>
  );
}
