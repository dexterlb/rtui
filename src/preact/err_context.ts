import { createContext } from "preact";

import type { ErrHandler } from "rtui";

export const ErrHandlerCtx = createContext<ErrHandler>(dummyErrHandler);

function dummyErrHandler(err: any) {
  console.error("UI action failed: ", err);
}
