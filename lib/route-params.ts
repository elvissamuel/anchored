/** Next.js App Router may pass `params` as a Promise or a plain object. */
export async function getRouteId(
  params: Promise<{ id: string }> | { id: string }
): Promise<string | undefined> {
  const resolved = params instanceof Promise ? await params : params;
  const id = resolved?.id;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}
