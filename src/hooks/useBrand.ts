import { useEffect } from "react";
import {
  brandVariables,
  appearanceSchema,
  type Appearance,
} from "../../shared/appearance";
export function useBrand(appearance?: Appearance) {
  useEffect(() => {
    const variables = brandVariables(appearanceSchema.parse(appearance ?? {}));
    for (const [name, value] of Object.entries(variables))
      document.documentElement.style.setProperty(name, value);
    return () => {
      for (const name of Object.keys(variables))
        document.documentElement.style.removeProperty(name);
    };
  }, [appearance]);
}
