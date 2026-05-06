import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

/**
 * Next.js 16+ proxy (formerly middleware): Convex Auth JWT refresh, `/api/auth`
 * proxying, and magic-link `?code=` handling.
 *
 * @see https://nextjs.org/docs/messages/middleware-to-proxy
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/login",
  "/api/auth(.*)",
]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (isPublicRoute(request)) {
      return;
    }
    if (!(await convexAuth.isAuthenticated())) {
      return nextjsMiddlewareRedirect(request, "/login");
    }
  },
  {
    cookieConfig: { maxAge: 60 * 60 * 24 * 7 },
    // Set CONVEX_AUTH_VERBOSE=1 to log magic-link / cookie refresh steps in the server console.
    verbose: process.env.CONVEX_AUTH_VERBOSE === "1",
  },
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
