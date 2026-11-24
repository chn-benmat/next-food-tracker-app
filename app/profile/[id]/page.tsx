"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  AccountAvatar,
  AccountError,
  AccountField,
  AccountFrame,
  AccountGender,
  useAccountSubmission,
} from "@/app/account";
import { normalizeFoodDate } from "@/lib/food-diary";
import { supabase } from "@/lib/supabaseClient";

type ProfileData = {
  fullname: string | null;
  email: string | null;
  gender: string | null;
  user_image_url: string | null;
};

type ProfileState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; profile: ProfileData };

const profileError = "บันทึกโปรไฟล์ไม่สำเร็จ โปรดลองอีกครั้ง";

function EditProfileForm({
  id,
  profile,
  backHref,
  savedHref,
}: {
  id: string;
  profile: ProfileData;
  backHref: string;
  savedHref: string;
}) {
  const router = useRouter();
  const { pending, error, onSubmit, clearError } = useAccountSubmission(async (fields, form) => {
    const avatar = fields.get("profileImage");
    const password = fields.get("password");
    const storage = supabase.storage.from("user_bk");
    let avatarUrl = profile.user_image_url;
    let avatarPath = "";

    if (avatar instanceof File && avatar.size > 0) {
      const extension = avatar.name.includes(".") ? avatar.name.split(".").pop() : "";
      avatarPath = extension ? `${Date.now()}.${extension}` : String(Date.now());
      const { error } = await storage.upload(avatarPath, avatar);
      if (error) return "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ ลองเลือกรูปใหม่แล้วบันทึกอีกครั้ง";
      avatarUrl = storage.getPublicUrl(avatarPath).data.publicUrl;
    }

    if (password) {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });

      if (!response.ok) {
        if (avatarPath) void storage.remove([avatarPath]).catch(() => {});
        return "เปลี่ยนรหัสผ่านไม่สำเร็จ โปรดลองอีกครั้ง";
      }

      const passwordField = form.elements.namedItem("password");
      if (passwordField instanceof HTMLInputElement) passwordField.value = "";
    }

    const { error, status } = await supabase
      .from("user_tb")
      .update({
        fullname: fields.get("fullname"),
        email: fields.get("email"),
        gender: fields.get("gender") ?? profile.gender,
        user_image_url: avatarUrl,
      })
      .eq("id", id);

    if (error) {
      if (avatarPath && status >= 400 && status < 500) {
        void storage.remove([avatarPath]).catch(() => {});
      }
      return password
        ? "เปลี่ยนรหัสผ่านแล้ว แต่บันทึกข้อมูลโปรไฟล์ไม่สำเร็จ ลองบันทึกอีกครั้ง"
        : profileError;
    }

    if (avatarPath && profile.user_image_url) {
      const oldPath = profile.user_image_url.split("/").pop();
      if (oldPath && oldPath !== avatarPath) void storage.remove([oldPath]).catch(() => {});
    }

    router.push(savedHref);
  }, profileError);

  return (
    <form className="account-form" method="post" onSubmit={onSubmit} onInput={clearError}>
      <fieldset className="account-fields" disabled={pending}>
        <AccountAvatar currentImage={profile.user_image_url} />
        <AccountField
          id="name"
          name="fullname"
          label="ชื่อ-นามสกุล"
          type="text"
          autoComplete="name"
          placeholder="กรอกชื่อ-นามสกุล"
          defaultValue={profile.fullname ?? ""}
          required
        />
        <AccountField
          id="email"
          label="อีเมล"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          defaultValue={profile.email ?? ""}
          required
        />
        <AccountField
          id="password"
          label="รหัสผ่านใหม่"
          type="password"
          autoComplete="new-password"
          placeholder="กรอกรหัสผ่านใหม่"
          hint="เว้นว่างหากต้องการใช้รหัสผ่านเดิม"
        />
        <AccountGender defaultValue={profile.gender} />
      </fieldset>
      {error && <AccountError>{error}</AccountError>}
      <div className="account-actions">
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกโปรไฟล์"}
        </button>
        <Link href={backHref} className="button button-secondary">
          ย้อนกลับ
        </Link>
      </div>
    </form>
  );
}

function ProfileLoading() {
  return (
    <div className="account-loading">
      <p role="status">กำลังโหลดโปรไฟล์…</p>
      <div className="account-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function ProfileEditor({ id, viewDate }: { id: string; viewDate: string }) {
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const dashboardPath = "/dashboard/" + id;
  const dateQuery = viewDate ? "date=" + viewDate : "";
  const backHref = dateQuery ? dashboardPath + "?" + dateQuery : dashboardPath;
  const savedHref = dashboardPath + "?saved=profile" + (dateQuery ? "&" + dateQuery : "");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from("user_tb")
          .select("fullname, email, gender, user_image_url")
          .eq("id", id)
          .abortSignal(controller.signal)
          .single();

        if (controller.signal.aborted) return;
        setState(error || !data ? { status: "error" } : { status: "ready", profile: data });
      } catch {
        if (!controller.signal.aborted) setState({ status: "error" });
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, [id, attempt]);

  if (state.status === "loading") return <ProfileLoading />;

  if (state.status === "error") {
    return (
      <div className="account-form">
        <AccountError>โหลดโปรไฟล์ไม่สำเร็จ โปรดลองอีกครั้ง</AccountError>
        <div className="account-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((value) => value + 1);
            }}
          >
            ลองอีกครั้ง
          </button>
          <Link href={backHref} className="button button-secondary">
            ย้อนกลับ
          </Link>
        </div>
      </div>
    );
  }

  return <EditProfileForm id={id} profile={state.profile} backHref={backHref} savedHref={savedHref} />;
}

function ProfileRoute() {
  const { id } = useParams<{ id: string }>();
  const requestedDate = useSearchParams().get("viewDate");
  const viewDate =
    requestedDate === "all" || requestedDate === normalizeFoodDate(requestedDate)
      ? requestedDate
      : "";

  return <ProfileEditor key={id} id={id} viewDate={viewDate} />;
}

export default function Profile() {
  return (
    <AccountFrame
      title="แก้ไขโปรไฟล์"
      description="อัปเดตข้อมูลบัญชีและรูปโปรไฟล์ของคุณ"
      headerAction={
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="button button-secondary">ออกจากระบบ</button>
        </form>
      }
    >
      <Suspense fallback={<ProfileLoading />}>
        <ProfileRoute />
      </Suspense>
    </AccountFrame>
  );
}
