"use client";

import Image from "next/image";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Brand } from "@/app/ui";
import "./account.css";

export function AccountFrame({
  title,
  description,
  photo = false,
  headerAction,
  children,
}: {
  title: string;
  description: string;
  photo?: boolean;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="account-header">
        <div className="site-shell">
          <Brand href="/" />
          {headerAction}
        </div>
      </header>
      <main className={photo ? "account-layout account-layout-split site-shell" : "account-layout site-shell"}>
        <div className="account-intro">
          <h1 id="account-title">{title}</h1>
          <p>{description}</p>
          {photo && (
            <div className="account-photo">
              <Image
                src="/foodtracker.jpg"
                alt=""
                fill
                sizes="(min-width: 760px) 360px, 1px"
              />
            </div>
          )}
        </div>
        <section className="account-panel" aria-labelledby="account-title">
          {children}
        </section>
      </main>
    </>
  );
}

export function AccountField({
  id,
  label,
  name = id,
  type,
  autoComplete,
  placeholder,
  defaultValue,
  required,
  hint,
  invalid,
}: {
  id: string;
  label: string;
  name?: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  placeholder: string;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  invalid?: boolean;
}) {
  const isPassword = type === "password";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const hintId = hint && `${id}-hint`;

  return (
    <div className="account-field">
      <label htmlFor={id}>{label}</label>
      <div className="account-input-wrap">
        <input
          id={id}
          name={name}
          className={isPassword ? "account-input account-input-password" : "account-input"}
          type={isPassword && passwordVisible ? "text" : type}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          autoCapitalize={isPassword ? "none" : undefined}
          spellCheck={isPassword ? false : undefined}
          placeholder={placeholder}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "account-error" : hintId || undefined}
        />
        {isPassword && (
          <button
            type="button"
            className="account-password-toggle"
            aria-label={(passwordVisible ? "ซ่อน" : "แสดง") + label}
            aria-controls={id}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {passwordVisible ? (
                <>
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 5.3a11 11 0 0 1 2.1-.2c4.1 0 7.5 2.3 9.5 6.9a13.7 13.7 0 0 1-2.2 3.4M6.3 6.3A14.5 14.5 0 0 0 2.5 12c2 4.6 5.4 6.9 9.5 6.9 1.6 0 3-.3 4.3-.9" />
                </>
              ) : (
                <>
                  <path d="M2.5 12c2-4.6 5.4-6.9 9.5-6.9s7.5 2.3 9.5 6.9c-2 4.6-5.4 6.9-9.5 6.9S4.5 16.6 2.5 12Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>
      {hint && <p id={hintId}>{hint}</p>}
    </div>
  );
}

export function AccountGender({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <fieldset className="account-gender">
      <legend>เพศ</legend>
      <div className="account-options">
        <label>
          <input type="radio" name="gender" value="male" defaultChecked={defaultValue === "male"} />
          ชาย
        </label>
        <label>
          <input type="radio" name="gender" value="female" defaultChecked={defaultValue === "female"} />
          หญิง
        </label>
      </div>
    </fieldset>
  );
}

export function AccountAvatar({ currentImage }: { currentImage?: string | null }) {
  const [selection, setSelection] = useState<{ name: string; url: string } | null>(null);
  const previewUrl = selection?.url;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="account-avatar">
      <div className="account-avatar-preview">
        <Image
          src={previewUrl || currentImage || "/default-profile.png"}
          alt={selection ? "ตัวอย่างรูปโปรไฟล์ที่เลือก" : ""}
          fill
          sizes="68px"
          unoptimized
        />
      </div>
      <div className="account-avatar-control">
        <p id="account-avatar-caption">รูปโปรไฟล์ <span>(ไม่บังคับ)</span></p>
        <input
          id="profileImage"
          name="profileImage"
          type="file"
          accept="image/*"
          aria-describedby="account-avatar-caption"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            setSelection(file ? { name: file.name, url: URL.createObjectURL(file) } : null);
          }}
        />
        <label htmlFor="profileImage">เลือกรูปภาพ</label>
        {selection && <p className="account-avatar-filename">{selection.name}</p>}
      </div>
    </div>
  );
}

export function AccountError({ children }: { children: string }) {
  return (
    <p id="account-error" className="account-notice account-notice-error" role="alert">
      {children}
    </p>
  );
}

export function useAccountSubmission(
  submit: (fields: FormData, form: HTMLFormElement) => Promise<string | void>,
  fallbackError: string,
) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    inFlight.current = true;
    setPending(true);
    setError("");

    let message;
    try {
      message = await submit(fields, form);
    } catch {
      message = fallbackError;
    }

    if (message) {
      setError(message);
      inFlight.current = false;
      setPending(false);
    }
  }

  return {
    pending,
    error,
    onSubmit,
    clearError: () => setError(""),
  };
}
