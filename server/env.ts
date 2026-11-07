export interface Env {
  HYPERDRIVE: Hyperdrive;
  PRODUCT_IMAGES: R2Bucket;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  OWNER_EMAIL: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  ORDER_NOTIFICATION_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
  APP_ENV?: string;
}
