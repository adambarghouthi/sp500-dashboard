import { schema } from '@json-render/react'
import { shadcnComponentDefinitions } from '@json-render/shadcn'

// @json-render/react and @json-render/shadcn each bundle their own Zod v4
// instance, causing TypeScript to see incompatible ZodType generics even
// though they are runtime-compatible. We cast through `any` here to keep the
// build green; all type safety is preserved at the component boundary in
// registry.tsx.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const catalog = (schema as any).createCatalog({
  components: shadcnComponentDefinitions,
  actions: {},
}) as ReturnType<typeof schema.createCatalog>
