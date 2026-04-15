module.exports = {
  extends: ["next/core-web-vitals"],
  rules: {
    // App Router-only project: this rule expects a /pages directory.
    "@next/next/no-html-link-for-pages": "off",
  },
}
