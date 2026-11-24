"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Brand } from "@/app/ui";
import { formatFoodDate, localFoodDate, mealOptions, normalizeFoodDate } from "@/lib/food-diary";
import { supabase } from "@/lib/supabaseClient";
import "./diary.css";

type Food = {
  id: string;
  foodname: string;
  meal: string;
  fooddate_at: string | null;
  food_image_url: string | null;
};

type Person = { fullname: string; user_image_url: string | null };

const shortDate = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function Plus() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
}

function Bowl() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18c-.7 4-4.2 7-9 7s-8.3-3-9-7ZM9 21h6M9 7c-1-1-.5-2 .5-3M13 8c-1.3-1.4-.7-2.7.5-4M17 8c-.8-.9-.5-1.9.1-2.6" /></svg>;
}

function foodImageSource(value: string | null) {
  if (!value) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const source = new URL(value);
    const storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return source.origin === storage.origin ? value : "";
  } catch {
    return "";
  }
}

function MealImage({ source }: { source: string | null }) {
  const [broken, setBroken] = useState("");
  const image = foodImageSource(source);

  return (
    <div className="meal-image">
      {image && broken !== image ? (
        <Image src={image} alt="" fill sizes="64px" onError={() => setBroken(image)} />
      ) : (
        <Bowl />
      )}
    </div>
  );
}

function DateNavigation({
  base,
  selected,
  today,
}: {
  base: string;
  selected: string;
  today: string;
}) {
  const dates = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(today + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() - index);
    return date.toISOString().slice(0, 10);
  });
  if (selected !== "all" && !dates.includes(selected)) {
    dates[dates.length - 1] = selected;
  }

  return (
    <nav className="diary-dates" aria-label="เลือกวันที่บันทึก">
      <h2>เลือกวัน</h2>
      <div className="diary-date-links">
        {dates.map((date) => {
          const formatted = formatFoodDate(date);
          return (
            <Link
              key={date}
              href={date === today ? base : base + "?date=" + date}
              replace
              scroll={false}
              aria-current={selected === date ? "page" : undefined}
              aria-label={date === today ? "วันนี้ " + formatted : formatted}
            >
              {date === today ? "วันนี้" : shortDate.format(new Date(date + "T00:00:00Z"))}
            </Link>
          );
        })}
        <Link href={base + "?date=all"} replace scroll={false} aria-current={selected === "all" ? "page" : undefined}>
          ทั้งหมด
        </Link>
      </div>
    </nav>
  );
}

function FoodDiary({ id }: { id: string }) {
  const search = useSearchParams();
  const [today, setToday] = useState("");
  const [foods, setFoods] = useState<Food[] | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [brokenAvatar, setBrokenAvatar] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [target, setTarget] = useState<Food | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<{ kind: "success" | "error"; message: string }>();
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const addLink = useRef<HTMLAnchorElement>(null);
  const base = "/dashboard/" + id;
  const dateParam = search.get("date");
  const viewDate = dateParam === "all" ? "all" : normalizeFoodDate(dateParam);
  const viewQuery = viewDate ? "?viewDate=" + viewDate : "";
  const add = "/addfood/" + id + viewQuery;

  useEffect(() => {
    setToday(localFoodDate());
    const updateToday = () => {
      if (!document.hidden) setToday(localFoodDate());
    };
    document.addEventListener("visibilitychange", updateToday);
    return () => document.removeEventListener("visibilitychange", updateToday);
  }, []);

  useEffect(() => {
    const request = new AbortController();

    async function loadDiary() {
      const { data, error } = await supabase
        .from("food_td")
        .select("id, foodname, meal, fooddate_at, food_image_url")
        .eq("user_id", id)
        .abortSignal(request.signal);

      if (request.signal.aborted) return;
      if (error) {
        setLoadError(true);
      } else {
        setFoods(data ?? []);
      }
    }

    void loadDiary();
    return () => request.abort();
  }, [id, retry]);

  useEffect(() => {
    const request = new AbortController();

    async function loadPerson() {
      const { data } = await supabase
        .from("user_tb")
        .select("fullname, user_image_url")
        .eq("id", id)
        .abortSignal(request.signal);

      if (!request.signal.aborted) setPerson(data?.[0] ?? null);
    }

    void loadPerson();
    return () => request.abort();
  }, [id]);

  async function deleteFood(food: Food) {
    confirmDialog.current?.close();
    setDeleting(true);
    setDeleteNotice(undefined);

    try {
      const { error } = await supabase
        .from("food_td")
        .delete()
        .eq("id", food.id)
        .eq("user_id", id);
      if (error) {
        setDeleteNotice({ kind: "error", message: "ลบรายการไม่สำเร็จ ลองอีกครั้งได้เลย" });
        return;
      }

      if (document.activeElement === document.body || document.activeElement?.closest(".meal-row")) {
        addLink.current?.focus();
      }
      setFoods((items) => items?.filter((item) => item.id !== food.id) ?? []);

      const image = foodImageSource(food.food_image_url);
      const storagePath = /^https?:\/\/[^/]+\/storage\/v1\/object\/public\/(food_bk|task_bk)\/([^?]+)$/.exec(image);
      if (storagePath) {
        const { error: imageError } = await supabase.storage
          .from(storagePath[1])
          .remove([decodeURIComponent(storagePath[2])]);
        if (imageError) {
          setDeleteNotice({ kind: "error", message: "ลบรายการแล้ว แต่ลบรูปอาหารไม่สำเร็จ" });
          return;
        }
      }
      setDeleteNotice({ kind: "success", message: "ลบรายการแล้ว" });
    } catch {
      setDeleteNotice({ kind: "error", message: "ดำเนินการไม่สำเร็จ ลองโหลดบันทึกอีกครั้ง" });
    } finally {
      setDeleting(false);
    }
  }

  const selected = viewDate || today;
  const allDays = selected === "all";
  const groups = new Map<string, Food[]>();
  for (const food of foods ?? []) {
    const day = normalizeFoodDate(food.fooddate_at);
    if (!allDays && day !== selected) continue;
    const group = groups.get(day);
    if (group) {
      group.push(food);
    } else {
      groups.set(day, [food]);
    }
  }
  const sortedGroups = Array.from(groups).sort(([a], [b]) => b.localeCompare(a));
  const count = allDays ? foods?.length : groups.get(selected)?.length ?? 0;
  const saved = search.get("saved");
  const savedMessage = saved === "added" ? "บันทึกอาหารแล้ว" :
    saved === "updated" ? "บันทึกการแก้ไขแล้ว" :
    saved === "profile" ? "บันทึกโปรไฟล์แล้ว" : "";
  const heading = allDays ? "ประวัติทั้งหมด" : selected === today ? "มื้ออาหารวันนี้" : "มื้ออาหาร";
  const selectedDate = selected && !allDays ? formatFoodDate(selected) : "";
  const avatar = brokenAvatar ? "/default-profile.png" : foodImageSource(person?.user_image_url ?? null) || "/default-profile.png";

  return (
    <>
      <header className="diary-header">
        <div className="site-shell diary-header-inner">
          <Brand href={base} />
          <Link href={"/profile/" + id + viewQuery} className="diary-account" aria-label="แก้ไขโปรไฟล์">
            <span>{person?.fullname || "โปรไฟล์"}</span>
            <Image src={avatar} alt="" width={36} height={36} onError={() => setBrokenAvatar(true)} />
          </Link>
        </div>
      </header>

      <main className="site-shell diary-main">
        <div className="diary-cover">
          <div>
            <h1>บันทึกอาหาร</h1>
            <p>ย้อนดูมื้อที่บันทึกไว้ได้ทุกวัน</p>
          </div>
          <Link ref={addLink} href={add} className="button button-primary diary-add">
            <Plus /> เพิ่มอาหาร
          </Link>
        </div>

        {(savedMessage || deleteNotice) && (
          <p className="diary-notice" data-kind={deleteNotice?.kind} role={deleteNotice?.kind === "error" ? "alert" : "status"}>
            {deleteNotice?.message ?? savedMessage}
          </p>
        )}

        <div className="diary-layout">
          {today && <DateNavigation base={base} selected={selected} today={today} />}
          <section className="diary-content" aria-labelledby="meal-heading" aria-busy={!loadError && (!foods || !today)}>
            <div className="diary-section-head">
              <div>
                <h2 id="meal-heading">{heading}</h2>
                {selectedDate && <p>{selectedDate}</p>}
              </div>
              {foods && today && <span className="diary-count">{count} รายการ</span>}
            </div>

            {loadError ? (
              <div className="diary-empty">
                <p role="alert">โหลดบันทึกอาหารไม่สำเร็จ</p>
                <button type="button" className="button button-secondary" onClick={() => { setLoadError(false); setRetry((attempt) => attempt + 1); }}>
                  โหลดอีกครั้ง
                </button>
              </div>
            ) : !foods || !today ? (
              <div className="diary-loading" role="status">กำลังโหลดรายการอาหาร</div>
            ) : sortedGroups.length === 0 ? (
              <div className="diary-empty">
                <div className="diary-empty-icon"><Bowl /></div>
                <p>{allDays ? "ยังไม่มีบันทึกอาหาร" : selected === today ? "วันนี้ยังไม่มีรายการ" : "วันที่เลือกยังไม่มีรายการ"}</p>
              </div>
            ) : (
              sortedGroups.map(([day, entries]) => (
                <div className="diary-day-group" key={day}>
                  {allDays && (
                    <h3>
                      {day ? (
                        <Link href={base + "?date=" + day} replace scroll={false}>{formatFoodDate(day)}</Link>
                      ) : "ไม่ระบุวันที่"}
                    </h3>
                  )}
                  <ul className="meal-list">
                    {entries.map((food) => (
                      <li className="meal-row" key={food.id}>
                        <MealImage source={food.food_image_url} />
                        <div className="meal-description">
                          <p>{food.foodname}</p>
                          <span>{mealOptions.find((option) => option.value === food.meal)?.label ?? food.meal}</span>
                        </div>
                        <div className="meal-actions">
                          <Link className="meal-action" href={"/updatefood/" + food.id + viewQuery} aria-label={"แก้ไข " + food.foodname}>
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5 4 4M4 20l4-.8L20 7.2a1.4 1.4 0 0 0 0-2l-1.2-1.2a1.4 1.4 0 0 0-2 0L4.8 16 4 20Z" /></svg>
                            <span>แก้ไข</span>
                          </Link>
                          <button type="button" className="meal-action meal-delete" disabled={deleting} aria-label={"ลบ " + food.foodname} onClick={() => { setTarget(food); confirmDialog.current?.showModal(); }}>
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v5m4-5v5" /></svg>
                            <span>ลบ</span>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
        </div>
      </main>

      <dialog ref={confirmDialog} className="diary-dialog" aria-labelledby="delete-heading">
        <h2 id="delete-heading">ลบรายการอาหารนี้ไหม?</h2>
        {target && <p>{target.foodname}</p>}
        <div className="diary-dialog-actions">
          <button type="button" className="button button-secondary" autoFocus onClick={() => confirmDialog.current?.close()}>
            ยกเลิก
          </button>
          <button type="button" className="button button-danger" onClick={() => target && void deleteFood(target)}>
            ลบรายการ
          </button>
        </div>
      </dialog>
    </>
  );
}

function DashboardRoute() {
  const { id } = useParams<{ id: string }>();
  return <FoodDiary key={id} id={id} />;
}

export default function Dashboard() {
  return (
    <Suspense fallback={<main className="site-shell diary-loading" role="status">กำลังโหลดบันทึกอาหาร</main>}>
      <DashboardRoute />
    </Suspense>
  );
}
