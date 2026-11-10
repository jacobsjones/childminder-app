// Pages anyone can open while signed out. Everything else needs an account.
export const AUTH_PAGES = ['/sign-in', '/sign-up', '/forgot-password'];

export const isAuthPage = (pathname) => AUTH_PAGES.includes(pathname);
