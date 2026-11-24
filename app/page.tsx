import Image from "next/image";
import Link from "next/link";

import { Brand } from "./ui";
import "./home.css";

export default function Home() {
  return (
    <>
      <header>
        <div className="site-shell home-header">
          <Brand href="/" />
          <nav aria-label="เมนูหลัก">
            <Link href="/login" className="button button-secondary">
              เข้าสู่ระบบ
            </Link>
          </nav>
        </div>
      </header>

      <main className="site-shell home-hero">
        <div className="home-hero-copy">
          <h1>
            วันนี้กิน
            <br />
            อะไรไปบ้าง?
          </h1>
          <p>บันทึกมื้อโปรด แล้วกลับมาดูได้ทุกวัน</p>
          <Link href="/register" className="button button-primary">
            เริ่มจดมื้อแรก
          </Link>
        </div>

        <div className="home-photo">
          {/* Source widths account for the horizontal crop in the photo frame. */}
          <Image
            src="/foodtracker.jpg"
            alt="แพนเค้กกับราสป์เบอร์รีและน้ำเชื่อม"
            fill
            preload
            sizes="(min-width: 1200px) 820px, (min-width: 768px) calc(70vw - 45px), (min-width: 400px) calc(108vw - 10px), calc(114vw - 45px)"
          />
        </div>
      </main>
    </>
  );
}
