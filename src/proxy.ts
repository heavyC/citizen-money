import { clerkMiddleware } from "@clerk/nextjs/server";

// Route protection is resource-based (checked per page/route/action) rather
// than path-matched here, per Clerk's current guidance.
export const proxy = clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
