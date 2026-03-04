export function createApiFetch(input: {
  sessionStepHandler: (request: Request) => Promise<Response>;
}) {
  return (req: Request): Promise<Response> | Response => {
    const url = new URL(req.url);
    if (url.pathname === "/api/session/step") {
      return input.sessionStepHandler(req);
    }

    return new Response("Not Found", { status: 404 });
  };
}
