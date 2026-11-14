// Pages anyone can open while signed out, shown without the app's navigation
// or assistant. Everything else needs an account. The privacy and support
// pages must be public: Apple's reviewers and App Store visitors open them.
export const AUTH_PAGES = ['/sign-in', '/sign-up', '/forgot-password', '/privacy', '/support'];

export const isAuthPage = (pathname) => AUTH_PAGES.includes(pathname);
