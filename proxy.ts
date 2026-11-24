import { NextResponse, type NextRequest } from "next/server";
import { readSession, sessionCookieName } from "@/lib/session";

export function proxy(request: NextRequest) {
  const userId = readSession(request.cookies.get(sessionCookieName)?.value);
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const [, page, routeId] = request.nextUrl.pathname.split("/");
  if (page !== "updatefood" && routeId !== encodeURIComponent(userId)) {
    return NextResponse.redirect(new URL("/dashboard/" + encodeURIComponent(userId), request.url));
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/dashboard/:id", "/profile/:id", "/addfood/:id", "/updatefood/:id"],
};
