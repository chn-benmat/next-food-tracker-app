"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AccountError, AccountField, AccountFrame, useAccountSubmission } from "@/app/account";

const credentialsError = "อีเมลหรือรหัสผ่านไม่ถูกต้อง ลองตรวจสอบแล้วเข้าสู่ระบบอีกครั้ง";
const loginError = "เข้าสู่ระบบไม่สำเร็จ โปรดลองอีกครั้ง";

function RegistrationNotice() {
  const searchParams = useSearchParams();
  return searchParams.get("registered") === "1" && (
    <p className="account-notice account-notice-success" role="status">
      ลงทะเบียนสำเร็จ เข้าสู่ระบบด้วยอีเมลและรหัสผ่านของคุณได้เลย
    </p>
  );
}

export default function Login() {
  const router = useRouter();
  const { pending, error, onSubmit, clearError } = useAccountSubmission(async (fields) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fields.get("email"),
        password: fields.get("password"),
      }),
    });

    if (response.status === 401) return credentialsError;
    if (!response.ok) return loginError;

    const result = await response.json();
    router.push("/dashboard/" + result.user.id);
  }, loginError);

  return (
    <AccountFrame title="เข้าสู่ระบบ" description="กลับไปดูบันทึกมื้ออาหารของคุณ" photo>
      <Suspense fallback={null}>
        <RegistrationNotice />
      </Suspense>
      <form className="account-form" method="post" onSubmit={onSubmit} onInput={clearError}>
        <fieldset className="account-fields" disabled={pending}>
          <AccountField
            id="email"
            label="อีเมล"
            type="email"
            autoComplete="username"
            placeholder="name@example.com"
            invalid={error === credentialsError}
            required
          />
          <AccountField
            id="password"
            label="รหัสผ่าน"
            type="password"
            autoComplete="current-password"
            placeholder="กรอกรหัสผ่าน"
            invalid={error === credentialsError}
            required
          />
        </fieldset>
        {error && <AccountError>{error}</AccountError>}
        <button className="button button-primary account-submit" type="submit" disabled={pending}>
          {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
      </form>
      <p className="account-alternative">
        ยังไม่มีบัญชี <Link href="/register">ลงทะเบียน</Link>
      </p>
    </AccountFrame>
  );
}
