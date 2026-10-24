import { Router } from "express";
import { adminRouter } from "./admin.js";
import { favoritesRouter } from "./favorites.js";
import { inquiriesRouter } from "./inquiries.js";
import { meRouter } from "./me.js";
import { propertiesRouter } from "./properties.js";
import { savedSearchesRouter } from "./savedSearches.js";

/** Router de /api/v1. Los módulos se montan aquí por etapa (ver docs/API.md). */
export const apiRouter = Router();

apiRouter.use("/me", meRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/properties", propertiesRouter); // público
apiRouter.use("/favorites", favoritesRouter);
apiRouter.use("/inquiries", inquiriesRouter);
apiRouter.use("/saved-searches", savedSearchesRouter);
