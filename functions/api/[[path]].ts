import { app } from "../../server/api";
import type { Env } from "../../server/env";
export const onRequest: PagesFunction<Env> = (context) =>
  app.fetch(context.request, context.env);
