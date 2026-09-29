import { useState } from 'react';

import { PinPad } from './PinPad';

/** Asks for a new PIN twice and calls `onDone` when both match. */
export function PinSetup({
  onDone,
  extraAction,
}: {
  onDone: (pin: string) => void | Promise<void>;
  extraAction?: { label: string; onPress: () => void };
}) {
  const [first, setFirst] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const onComplete = async (pin: string) => {
    if (first === null) {
      setFirst(pin);
      setMessage(null);
      setResetKey((k) => k + 1);
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setMessage("PINs didn't match. Start again.");
      setResetKey((k) => k + 1);
      return;
    }
    setBusy(true);
    try {
      await onDone(pin);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PinPad
      prompt={first === null ? 'Choose a 4-digit PIN' : 'Enter it again'}
      message={message}
      onComplete={onComplete}
      resetKey={resetKey}
      busy={busy}
      extraAction={extraAction}
    />
  );
}
