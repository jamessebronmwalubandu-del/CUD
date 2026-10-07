import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Creates the GET and POST handlers for /api/uploadthing
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
