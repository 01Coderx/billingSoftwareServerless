export function jsonError(error: unknown) {
  console.error(error);
  const err = error as any;
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return Response.json({ message: `${field} already exists` }, { status: 409 });
  }
  if (err?.name === "ValidationError") return Response.json({ message: err.message }, { status: 400 });
  if (err?.name === "CastError") return Response.json({ message: `Invalid ${err.path}` }, { status: 400 });
  return Response.json({ message: err?.message || "Internal server error" }, { status: err?.status || 500 });
}
export function badId(id: string) {
  return Response.json({ message: `Invalid id: ${id}` }, { status: 400 });
}
