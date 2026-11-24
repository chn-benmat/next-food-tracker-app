"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AccountAvatar,
  AccountError,
  AccountField,
  AccountFrame,
  AccountGender,
  useAccountSubmission,
} from "@/app/account";
import { supabase } from "@/lib/supabaseClient";

const registerError = "ลงทะเบียนไม่สำเร็จ โปรดลองอีกครั้ง";
const emailError = "อีเมลนี้ลงทะเบียนแล้ว ลองใช้อีเมลอื่นหรือเข้าสู่ระบบ";

export default function Register() {
  const router = useRouter();
  const { pending, error, onSubmit, clearError } = useAccountSubmission(async (fields) => {
    const avatar = fields.get("profileImage");
    const storage = supabase.storage.from("user_bk");
    let avatarPath = "";
    let avatarUrl = "";

    if (avatar instanceof File && avatar.size > 0) {
      avatarPath = `${Date.now()}-${avatar.name}`;
      const { error } = await storage.upload(avatarPath, avatar);
      if (error) return "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ ลองเลือกรูปใหม่แล้วลงทะเบียนอีกครั้ง";
      avatarUrl = storage.getPublicUrl(avatarPath).data.publicUrl;
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullname: fields.get("fullname"),
        email: fields.get("email"),
        password: fields.get("password"),
        gender: fields.get("gender") ?? "",
        user_image_url: avatarUrl,
      }),
    });

    if (!response.ok) {
      if (response.status === 400 && avatarPath) void storage.remove([avatarPath]).catch(() => {});
      const { error } = await response.json().catch(() => ({}));
      return response.status === 400 && /duplicate key.*email/i.test(error ?? "")
        ? emailError
        : registerError;
    }

    router.push("/login?registered=1");
  }, registerError);

  return (
    <AccountFrame title="ลงทะเบียน" description="สร้างบัญชีเพื่อเริ่มบันทึกมื้ออาหารของคุณ" photo>
      <form className="account-form" method="post" onSubmit={onSubmit} onInput={clearError}>
        <fieldset className="account-fields" disabled={pending}>
          <AccountField
            id="name"
            name="fullname"
            label="ชื่อ-นามสกุล"
            type="text"
            autoComplete="name"
            placeholder="กรอกชื่อ-นามสกุล"
            required
          />
          <AccountField
            id="email"
            label="อีเมล"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            invalid={error === emailError}
            required
          />
          <AccountField
            id="password"
            label="รหัสผ่าน"
            type="password"
            autoComplete="new-password"
            placeholder="ตั้งรหัสผ่าน"
            required
          />
          <AccountGender />
          <AccountAvatar />
        </fieldset>
        {error && <AccountError>{error}</AccountError>}
        <button className="button button-primary account-submit" type="submit" disabled={pending}>
          {pending ? "กำลังลงทะเบียน…" : "ลงทะเบียน"}
        </button>
      </form>
      <p className="account-alternative">
        มีบัญชีแล้ว <Link href="/login">เข้าสู่ระบบ</Link>
      </p>
    </AccountFrame>
  );
}
