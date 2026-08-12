import {
  useRef,
  useEffect,
  useState,
  useContext,
  type Dispatch,
  type StateUpdater,
} from "preact/hooks";
import { Signal } from '@preact/signals';

import { Throttler } from "rtui";
import { ErrHandlerCtx } from "./err_context.ts";

export default function useRT<T>(opts: {
  realVal: T;
  onNewUserVal: (v: T) => Promise<void>;
  syncBackAfter: undefined | number | Signal<number | undefined>;
}): [T, Dispatch<StateUpdater<T>>] {
  const throttler = useRef(new Throttler());
  const errHandler = useContext(ErrHandlerCtx);

  const { realVal, onNewUserVal, syncBackAfter } = opts;
  const [userVal, setUserVal] = useState(realVal); // initial
  const [userMirrorsReal, setUserMirrorsReal] = useState(true);

  const syncingUserToReal = useRef(true);

  useEffect(() => {
    if (syncingUserToReal.current) {
      // this change came from initialisation or syncUserToReal(), not the user
      syncingUserToReal.current = false;
      return;
    }

    throttler.current.do(
      async () => {
        setUserMirrorsReal(false);
        await onNewUserVal(userVal);
      },
      {
        syncBack: () => setUserMirrorsReal(true),
        syncBackAfter: open_signal(syncBackAfter),
        errHandler: errHandler,
      },
    );
  }, [userVal, open_signal(syncBackAfter)]);

  const syncUserToReal = () => {
    if (userMirrorsReal && userVal !== realVal) {
      syncingUserToReal.current = true;
      setUserVal(realVal);
    }
  };

  useEffect(syncUserToReal, [realVal, userMirrorsReal]);

  return [userVal, setUserVal];
}

function open_signal<T>(v: T | Signal<T>): T {
  if (v instanceof Signal) {
    return v.value;
  }
  return v;
}
