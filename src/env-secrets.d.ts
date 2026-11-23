declare namespace Cloudflare {
  interface Env {
    ADMIN_EMAIL?: string
    ADMIN_BOOTSTRAP_TOKEN?: string
    BETTER_AUTH_SECRET?: string
    BETTER_AUTH_URL?: string
  }
}

interface SubtleCrypto {
  timingSafeEqual(a: ArrayBuffer | ArrayBufferView, b: ArrayBuffer | ArrayBufferView): boolean
}
